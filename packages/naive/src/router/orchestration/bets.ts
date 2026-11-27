#!/usr/bin/env node
// `naive bets` (EE-221, docs/design/BETS_2026-11-26.md): read a venture's bets, register one, put odds on one,
// resolve one, and score the ones that resolved. Every write goes through the router, so the freeze
// (packages/naive/src/router/bets.ts), the gate and the provenance line all apply, and the version this command
// registered is in the blob store for packages/naive/src/checks/check-bets.ts to compare with.
//
//   node packages/naive/src/router/orchestration/bets.ts <venture dir> show [<id>] [--json]
//   node packages/naive/src/router/orchestration/bets.ts <venture dir> register <id> --by <person>
//   node packages/naive/src/router/orchestration/bets.ts <venture dir> confidence <id> --p <0..1> --by <person> --data-seen <answer> [--why <text>]
//   node packages/naive/src/router/orchestration/bets.ts <venture dir> resolve <id> <outcome> --by <person> [--observed <value>] [--evidence <ref>]... [--why <text>]
//   node packages/naive/src/router/orchestration/bets.ts <venture dir> score [--json]
//
// register, confidence and resolve are a person's: each refuses an acting agent, because the wording a person
// confirmed, the odds they put on it and the outcome they read are the three judgments the register exists to hold
// them to. None of them supplies a number. register refuses a bet with a hole in it (no line, no date, no source,
// nothing that would falsify it, no prior, no owner), because those are what a registration fixes.
//
// resolve writes what was observed and, from it, where the bet now stands: happened makes it supported,
// did-not-happen refuted, and mixed weakened. A selection rule is never resolved: it is a value, and `naive bets
// resolve` says so rather than scoring it.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { actingAgent } from "../../core/provenance.ts";
import { brierOf, calibration, registrationGaps, statementForm, statusOf } from "../../engine/bets.ts";
import { call } from "../router.ts";
import type { Bet } from "../../records/types/records.d.ts";
import { nowIso } from "../../core/clock.ts";

/** What one command answers with. ok false carries why; a write carries the route it landed on. */
export type BetAnswer = { ok: boolean; error?: string; errors?: string[]; result?: unknown };
/** What show answers with: the records themselves, so a caller reads them without a cast. */
export type BetList = { ok: false; error: string } | { ok: true; result: Bet[] };

/** The outcome a person records, and where the bet stands once they have. mixed weakens a bet; unresolvable leaves it registered. */
export const AFTER: Readonly<Record<string, Bet["status"]>> = Object.freeze({
  happened: "supported", "did-not-happen": "refuted", mixed: "weakened", unresolvable: "registered",
});
/** How much of the evidence had been seen when a probability was set, in the OSF template's order. */
export const DATA_SEEN = ["before-data-exists", "before-any-observation", "before-access", "before-analysis", "after-analysis"] as const;

const ROUTE = "foundation/bets";
const route = (id: string) => `${ROUTE}/${id}`;
const errorOf = (a: { ok: boolean; error?: string }) => a.error ?? "the router refused it";
/** The venture's id, so the router finds its folder with the folder itself as the workspace. */
const idOf = (dir: string): string => (JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { id: string }).id;
const isAgent = (by: string | undefined, act: string): string | null => {
  if (!by) return `${act} is a person's: name them with --by <person>`;
  const agent = actingAgent(by);
  return agent ? `an agent (${agent}) is acting: ${act} is a person's, because nobody else can be held to it` : null;
};

/** Every bet the venture has, or the one named, read through the router. */
export async function show(dir: string, id?: string): Promise<BetList> {
  const answer = await call({ venture: idOf(dir), workspace: dir, route: id ? route(id) : ROUTE, action: "read" });
  if (!answer.ok) return { ok: false, error: errorOf(answer) };
  const list = id ? (answer.result ? [answer.result as Bet] : []) : Object.values((answer.result ?? {}) as Record<string, Bet>);
  return { ok: true, result: list };
}

/** The record as the router holds it, or null when the route has none. */
async function read(dir: string, id: string): Promise<Bet | null> {
  const answer = await call({ venture: idOf(dir), workspace: dir, route: route(id), action: "read" });
  return answer.ok && answer.result ? answer.result as Bet : null;
}

const write = async (dir: string, id: string, next: Bet, note: string): Promise<BetAnswer> => {
  const answer = await call({ venture: idOf(dir), workspace: dir, route: route(id), action: "write", actor: "person", input: next, provenance: { note } });
  return answer.ok ? { ok: true, result: { written: route(id), status: statusOf(next) } } : { ok: false, error: errorOf(answer) };
};

/**
 * A person registers one bet: status registered, with the time and the person who did it. From then on its kind,
 * statement, claim, rule, premises and what would falsify it never change, and the router refuses a write that
 * moves one.
 */
export async function register(dir: string, id: string, o: { by?: string; now?: string } = {}): Promise<BetAnswer> {
  const refused = isAgent(o.by, "registering a bet");
  if (refused) return { ok: false, error: refused };
  const bet = await read(dir, id);
  if (!bet) return { ok: false, error: `no bet ${id} in ${ROUTE}` };
  if (statusOf(bet) !== "proposed") return { ok: false, error: `${id} is ${statusOf(bet)}, and only a proposed bet is registered` };
  const gaps = registrationGaps(bet);
  if (gaps.length) return { ok: false, error: `${id} is not ready to register`, errors: gaps };
  const at = o.now ?? nowIso();
  const next: Bet = { ...bet, status: "registered", status_by: o.by as string, status_at: at, registered_at: at, registered_by: o.by as string };
  const answer = await write(dir, id, next, `naive bets register: ${o.by} fixed the claim of ${id}`);
  return answer.ok ? { ok: true, result: { registered: route(id), at, by: o.by, form: statementForm(next) } } : answer;
}

/**
 * A person puts odds on a bet. The entry is appended, never rewritten, and it says how much of the evidence had
 * been seen when the number was set, so a prior drawn from an example the founder already read is readable as that.
 * The first entry is the prior, and it is the one the Brier score uses.
 */
export async function confidence(dir: string, id: string, o: { p?: string; by?: string; dataSeen?: string; why?: string; now?: string } = {}): Promise<BetAnswer> {
  const refused = isAgent(o.by, "putting odds on a bet");
  if (refused) return { ok: false, error: refused };
  const p = Number(o.p);
  if (o.p === undefined || !Number.isFinite(p) || p < 0 || p > 1) return { ok: false, error: "a probability is a number from 0 to 1: --p <0..1>. Naive ships none, because the odds are the venture's own" };
  const seen = o.dataSeen;
  if (!seen || !(DATA_SEEN as readonly string[]).includes(seen)) return { ok: false, error: `--data-seen says how much of the evidence had been seen when the number was set: one of ${DATA_SEEN.join(", ")}` };
  const bet = await read(dir, id);
  if (!bet) return { ok: false, error: `no bet ${id} in ${ROUTE}` };
  if (bet.kind === "selection-rule") return { ok: false, error: `${id} is a selection rule, so there are no odds on it: a rule about whom to back is a value, and what can be tested is its observable test and the bets under it` };
  const at = o.now ?? nowIso();
  const entry = { p, set_by: o.by as string, at, data_seen: seen as NonNullable<Bet["confidence"]>[number]["data_seen"], ...(o.why ? { why: o.why } : {}) };
  const prior = !(bet.confidence ?? []).length;
  const next: Bet = { ...bet, confidence: [...(bet.confidence ?? []), entry] };
  const answer = await write(dir, id, next, `naive bets confidence: ${o.by} put ${p} on ${id}, ${seen}`);
  return answer.ok ? { ok: true, result: { ...(answer.result as object), p, prior, data_seen: seen } } : answer;
}

/**
 * A person records what happened, which is written once, and with it where the bet now stands. The outcome and the
 * verdict are kept apart on purpose: a forecast given low odds that did not happen is a bet refuted and a forecast
 * well made, and the score says so.
 */
export async function resolve(dir: string, id: string, outcome: string, o: { by?: string; observed?: string; evidence?: string[]; why?: string; now?: string } = {}): Promise<BetAnswer> {
  const refused = isAgent(o.by, "resolving a bet");
  if (refused) return { ok: false, error: refused };
  if (!(outcome in AFTER)) return { ok: false, error: `an outcome is one of ${Object.keys(AFTER).join(", ")}: what was observed, not what it means` };
  const bet = await read(dir, id);
  if (!bet) return { ok: false, error: `no bet ${id} in ${ROUTE}` };
  if (bet.kind === "selection-rule") return { ok: false, error: `${id} is a selection rule, so it is not resolved: a value is withdrawn or superseded, never shown right by evidence` };
  if (!["registered", "supported", "weakened", "refuted"].includes(statusOf(bet))) return { ok: false, error: `${id} is ${statusOf(bet)}: a bet is registered before it is resolved, or the outcome was measured against nothing (naive bets register ${id} --by <person>)` };
  if (bet.resolution) return { ok: false, error: `${id} was resolved by ${bet.resolution.by} at ${bet.resolution.at}, and an outcome is written once: write a new bet that supersedes this one if the claim has to change` };
  const at = o.now ?? nowIso();
  const n = Number(o.observed);
  const observed = o.observed === undefined ? undefined : o.observed.trim() !== "" && Number.isFinite(n) ? n : o.observed;
  const status = AFTER[outcome];
  const next: Bet = {
    ...bet, status, status_by: o.by as string, status_at: at,
    resolution: { outcome: outcome as NonNullable<Bet["resolution"]>["outcome"], at, by: o.by as string,
      ...(observed === undefined ? {} : { observed }), ...(o.evidence?.length ? { evidence: o.evidence } : {}), ...(o.why ? { why: o.why } : {}) },
  };
  const answer = await write(dir, id, next, `naive bets resolve: ${o.by} recorded ${outcome} on ${id}`);
  return answer.ok ? { ok: true, result: { ...(answer.result as object), outcome, score: brierOf(next) } } : answer;
}

/** The Brier score of each bet that resolved, and the mean. Reads only. */
export async function score(dir: string): Promise<BetAnswer> {
  const list = await show(dir);
  if (!list.ok) return list;
  return { ok: true, result: calibration(list.result) };
}

/** One line per bet: where it stands, the fixed form of its claim, the odds and the outcome. */
function print(what: string, a: BetAnswer): void {
  if (!a.ok) { console.error(`FAIL  ${a.error}`); for (const e of a.errors ?? []) console.error(`      ${e}`); return; }
  if (what === "show") {
    const list = (a.result ?? []) as Bet[];
    if (!list.length) { console.log("no bets yet: naive <route> template foundation/bets/[id] gives the shape, and a person registers one"); return; }
    for (const bet of list) {
      console.log(`${bet.id}  ${statusOf(bet)}  [${bet.kind}]${bet.owner ? ` owner ${bet.owner}` : ""}`);
      console.log(`  says       ${bet.statement}`);
      const form = statementForm(bet);
      console.log(`  form       ${form ?? `not in the fixed form yet: ${registrationGaps(bet).join("; ")}`}`);
      if (bet.falsified_by) console.log(`  wrong if   ${bet.falsified_by}`);
      for (const p of bet.premises ?? []) console.log(`  rests on   ${p}`);
      for (const r of bet.rivals ?? []) console.log(`  rival      ${r.statement}${r.separates ? ` (told apart by ${r.separates})` : ""}`);
      const against = (bet.evidence ?? []).filter((e) => !e.supports).length;
      if ((bet.evidence ?? []).length) console.log(`  evidence   ${(bet.evidence ?? []).length - against} for, ${against} against`);
      for (const c of bet.confidence ?? []) console.log(`  odds       ${c.p} by ${c.set_by} at ${c.at} (${c.data_seen})${c.why ? `: ${c.why}` : ""}`);
      if (bet.intends_to_cause) console.log(`  note       the venture is working to make this true, so it is read apart from the rest and never as foresight`);
      if (bet.resolution) console.log(`  outcome    ${bet.resolution.outcome} by ${bet.resolution.by} at ${bet.resolution.at}${bet.resolution.observed === undefined ? "" : `, observed ${String(bet.resolution.observed)}`}`);
      const s = brierOf(bet);
      if (s) console.log(`  brier      ${s.brier.toFixed(4)} on the prior ${s.p} against ${s.outcome}`);
    }
    return;
  }
  if (what === "score") {
    const c = a.result as ReturnType<typeof calibration>;
    for (const s of c.scored) console.log(`${s.bet.padEnd(28)} prior ${s.p}  outcome ${s.outcome}  brier ${s.brier.toFixed(4)}`);
    console.log(c.brier === null ? "no bet has both a prior and an outcome yet, so there is nothing to score" : `mean Brier over ${c.scored.length} resolved bet(s): ${c.brier.toFixed(4)} (0 is perfect, lower is better)`);
    if (c.caused.length) {
      for (const s of c.caused) console.log(`${s.bet.padEnd(28)} prior ${s.p}  outcome ${s.outcome}  brier ${s.brier.toFixed(4)}  (the venture worked to make it true)`);
      console.log(`mean Brier over the ${c.caused.length} the venture worked to make true: ${(c.caused_brier ?? 0).toFixed(4)}. Kept apart, and never read as foresight`);
    }
    for (const u of c.unscored) console.log(`not scored  ${u.bet}: ${u.why}`);
    return;
  }
  const r = a.result as Record<string, unknown>;
  if (what === "register") console.log(`registered ${String(r.registered)} at ${String(r.at)} by ${String(r.by)}: its claim is now fixed\n  form ${String(r.form ?? "")}`);
  if (what === "confidence") console.log(`${String(r.written)}: ${r.prior ? "prior" : "updated"} ${String(r.p)}, ${String(r.data_seen)}`);
  if (what === "resolve") {
    const s = r.score as ReturnType<typeof brierOf>;
    console.log(`${String(r.written)}: ${String(r.outcome)}, so the bet is ${String(r.status)}${s ? `. Brier ${s.brier.toFixed(4)} on the prior ${s.p}` : ""}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, ...a] = process.argv.slice(2);
  const opt = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const all = (n: string) => a.flatMap((x, i) => (x === `--${n}` ? [a[i + 1]] : []));
  const json = a.includes("--json");
  const usage = "usage: node packages/naive/src/router/orchestration/bets.ts <venture dir> show [<id>] | register <id> --by <person> | confidence <id> --p <0..1> --by <person> --data-seen <answer> [--why <text>] | resolve <id> <happened|did-not-happen|mixed|unresolvable> --by <person> [--observed <value>] [--evidence <ref>] [--why <text>] | score";
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error(usage); process.exit(2); }
  const [what = "show", id, outcome] = a.filter((x, i) => !x.startsWith("--") && !a[i - 1]?.startsWith("--"));
  const now = opt("now");
  let r: BetAnswer;
  if (what === "show") r = await show(dir, id);
  else if (what === "score") r = await score(dir);
  else if (!id) { console.error(usage); process.exit(2); }
  else if (what === "register") r = await register(dir, id, { by: opt("by"), now });
  else if (what === "confidence") r = await confidence(dir, id, { p: opt("p"), by: opt("by"), dataSeen: opt("data-seen"), why: opt("why"), now });
  else if (what === "resolve") r = await resolve(dir, id, outcome ?? "", { by: opt("by"), observed: opt("observed"), evidence: all("evidence"), why: opt("why"), now });
  else { console.error(usage); process.exit(2); }
  if (json) console.log(JSON.stringify(r, null, 2)); else print(what, r);
  process.exit(r.ok ? 0 : 1);
}
