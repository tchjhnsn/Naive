#!/usr/bin/env node
// Bets end to end (EE-221, docs/design/BETS_2026-11-26.md): a proposed bet is written freely, a person registers
// it, puts odds on it and resolves it, and from then on the claim does not change, for a person either. An agent
// drafts the bet and gathers evidence for and against it, and is refused outright when it tries to put odds on one,
// resolve one or move one on. A pre-registration that names the bet freezes the claim when a person registers the
// plan, and the check reads the registered version out of the blob store the write put it in.
//
//   node packages/naive/src/interfaces/tests/bets-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { confidence, register, resolve, score, show } from "../../router/orchestration/bets.ts";
import { register as registerPlan } from "../../router/orchestration/pre-registration.ts";
import { call } from "../../router/router.ts";
import type { Bet, PreRegistration } from "../../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 500)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "bets-"));
const dir = join(ws, "v");
const ROUTE = "foundation/bets/small-teams";
const CHECK = new URL("../../checks/check-bets.ts", import.meta.url).pathname;

/** The bet a founder and the agent arrive at: complete enough to register once a person puts odds on it. */
const bet = (over: Partial<Bet> = {}): Bet => ({
  id: "small-teams", kind: "forecast", status: "proposed", owner: "Torian",
  statement: "Small teams will reach a million in revenue more often than they do today.",
  claim: { population: "software companies founded in or after 2024", measure: "the share that reached a million in annual revenue with five or fewer people",
    comparator: ">=", threshold: { value: 10, unit: "%", set_by: "Torian" }, resolves_by: "2027-06-30", source: "the company's own statement or a filing" },
  falsified_by: "Under 10 % of them did, as of 2027-06-30.",
  ...over,
} as Bet);

const plan = (over: Partial<PreRegistration> = {}): PreRegistration => ({
  id: "count-the-filings", status: "draft", tests: ["small-teams"],
  thesis: { statement: "The share can be counted from filings", falsified_if: "Fewer than half the companies file anything readable" },
  assumptions: [{ id: "filings-say", statement: "A filing says the headcount", criticality: "high", uncertainty: "high" }],
  method: { who: "companies founded in or after 2024", how_many: 200, recruitment: "every company in the sample frame, no selection", asked_or_observed: "the revenue and the headcount at the time it was reached" },
  measures: [{ id: "share", statement: "the share that reached a million with five or fewer people", threshold: { operator: ">=", value: 10, unit: "%", set_by: "Torian" }, judged_by: "2027-06-30" }],
  exclusions: [{ statement: "a company's own blog post with no filing behind it", why: "nobody checked it" }],
  on_pass: { action: "persevere", what: "write the mission from this bet" },
  on_fail: { action: "pivot", what: "narrow the claim to one industry" },
  ...over,
} as PreRegistration);

const write = (input: unknown, o: { person?: boolean; route?: string } = {}) =>
  call({ venture: "v", workspace: ws, route: o.route ?? ROUTE, action: "write", ...(o.person === false ? { actor_id: "strategy-agent" } : { actor: "person" as const }), input });
const live = (id = "small-teams"): Bet => JSON.parse(readFileSync(join(dir, `foundation/bets/${id}.json`), "utf8"));
const checkRun = () => { const r = spawnSync(process.execPath, [CHECK, dir, "--json"], { encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };

try {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", departments: ["strategy"] }));

  // The plan comes first. bet-review requires a pre-registration (EE-217, EE-220), so until one is live the bets
  // route is locked for a person too: the claim a search is written against cannot be written after the search.
  const locked = await write(bet());
  expect("the bets route is locked until a pre-registration is live", !locked.ok && /no record is live at foundation\/pre-registration/.test(locked.error ?? ""), locked);
  const planned = await write(plan(), { route: "foundation/pre-registration/count-the-filings" });
  expect("the plan that tests the bet is written, and the lock opens", planned.ok, planned);

  // The agent drafts the bet. Drafting a claim is not a judgment, so the gate holds it for a person rather than
  // refusing it: a bet is strategy-or-constitution, so an agent's write of one waits.
  const drafted = await write(bet(), { person: false });
  expect("an agent's bet is held as a draft for a person", drafted.ok && (drafted.result as { draft?: boolean }).draft === true, drafted);
  const odds = await write(bet({ confidence: [{ p: 0.3, set_by: "strategy-agent", at: "2026-11-26T00:00:00Z", data_seen: "after-analysis" }] }), { person: false });
  expect("an agent putting odds on a bet is refused outright, not held, and the person's command is named",
    !odds.ok && /only a person writes confidence/.test(odds.error ?? "") && /naive bets confidence/.test(odds.error ?? ""), odds);
  const verdict = await write(bet({ status: "refuted", registered_at: "2026-11-26T10:00:00.000Z", registered_by: "Torian", resolution: { outcome: "did-not-happen", at: "2027-07-01T00:00:00.000Z", by: "strategy-agent" } }), { person: false });
  expect("an agent resolving a bet is refused and told to raise a decision instead", !verdict.ok && /continue-or-stop/.test(verdict.error ?? ""), verdict);

  // The person writes the claim they confirmed, with the evidence against it the agent found.
  const first = await write(bet({ evidence: [{ ref: "evidence/two-filings", supports: false, note: "two of the three named companies had more than five people" }] }));
  expect("a person writes the bet live", first.ok && (first.result as { draft?: boolean }).draft === false && live().evidence!.length === 1, first);

  // Registering is a person's, and it is refused while the bet has a hole in it.
  const early = await register(dir, "small-teams", { by: "Torian" });
  expect("registering a bet nobody put odds on is refused, and says what is missing", !early.ok && (early.errors ?? []).some((e) => /put odds on it/.test(e)), early);
  // An agent running the command is caught by the environment it runs in, not by the name it passes.
  process.env.MENTURA_ACTOR_ID = "strategy-agent";
  const byAgent = await confidence(dir, "small-teams", { p: "0.3", by: "Torian", dataSeen: "after-analysis" });
  const resolveByAgent = await resolve(dir, "small-teams", "happened", { by: "Torian" });
  const registerByAgent = await register(dir, "small-teams", { by: "Torian" });
  delete process.env.MENTURA_ACTOR_ID;
  expect("naive bets confidence refuses an acting agent", !byAgent.ok && /an agent \(strategy-agent\) is acting/.test(byAgent.error ?? ""), byAgent);
  expect("naive bets resolve refuses an acting agent", !resolveByAgent.ok && /is acting/.test(resolveByAgent.error ?? ""), resolveByAgent);
  expect("naive bets register refuses an acting agent", !registerByAgent.ok && /is acting/.test(registerByAgent.error ?? ""), registerByAgent);
  const noSeen = await confidence(dir, "small-teams", { p: "0.3", by: "Torian" });
  expect("odds with no answer about what had been seen are refused", !noSeen.ok && /--data-seen/.test(noSeen.error ?? ""), noSeen);
  const prior = await confidence(dir, "small-teams", { p: "0.3", by: "Torian", dataSeen: "after-analysis", why: "two examples prompted the bet", now: "2026-11-26T00:00:00.000Z" });
  expect("a person puts the prior on it, and it says how much had been seen", prior.ok && live().confidence![0].p === 0.3 && live().confidence![0].data_seen === "after-analysis", prior);

  const reg = await register(dir, "small-teams", { by: "Torian", now: "2026-11-26T10:00:00.000Z" });
  expect("a person registers it, and the record says who and when", reg.ok && live().status === "registered" && live().registered_by === "Torian", reg);
  expect("registering reads back the fixed form of the claim", /^By 2027-06-30, among software companies/.test(String((reg.result as { form?: string }).form ?? "")), reg.result);

  // The freeze, for a person and for the agent.
  const lower = await write({ ...live(), claim: { ...live().claim, threshold: { value: 2, unit: "%", set_by: "Torian" } } });
  expect("a person lowering the registered line is refused, and told the way on",
    !lower.ok && /claim does not change/.test(lower.error ?? "") && /supersedes/.test(lower.error ?? ""), lower);
  expect("the refused write left the record as it was", live().claim!.threshold!.value === 10);
  const reword = await write({ ...live(), statement: "Something will happen to somebody." }, { person: false });
  expect("the agent rewording a registered claim is refused outright, not held as a draft", !reword.ok && /statement does not change/.test(reword.error ?? ""), reword);
  const update = await confidence(dir, "small-teams", { p: "0.45", by: "Torian", dataSeen: "after-analysis", why: "the first filings read better than expected", now: "2026-12-01T00:00:00.000Z" });
  expect("a later probability is appended beside the prior, never over it", update.ok && live().confidence!.length === 2 && live().confidence![0].p === 0.3, update);
  const edit = await write({ ...live(), confidence: [{ p: 0.9, set_by: "Torian", at: "2026-11-26T00:00:00.000Z", data_seen: "before-data-exists" }, live().confidence![1]] });
  expect("rewriting the prior is refused: the entries are append-only", !edit.ok && /append-only/.test(edit.error ?? ""), edit);

  // The plan written at the start freezes the claim once a person registers it.
  const second = await write(bet({ id: "later-teams", statement: "Later on, the same holds for teams of ten." }), { route: "foundation/bets/later-teams" });
  expect("a second bet is written freely while nothing tests it", second.ok, second);
  const planReg = await registerPlan(dir, "count-the-filings", { by: "Torian", now: "2026-11-26T11:00:00.000Z" });
  expect("a person registers the plan", planReg.ok, planReg);
  const repoint = await write({ ...JSON.parse(readFileSync(join(dir, "foundation/pre-registration/count-the-filings.json"), "utf8")), tests: ["later-teams"] }, { route: "foundation/pre-registration/count-the-filings" });
  expect("a registered plan cannot be pointed at another bet afterwards", !repoint.ok && /tests does not change/.test(repoint.error ?? ""), repoint);

  // Resolving is a person's, once, and the outcome is kept apart from the verdict.
  const noOutcome = await resolve(dir, "small-teams", "it-worked-out", { by: "Torian" });
  expect("an outcome is what was observed, not what it means", !noOutcome.ok && /happened, did-not-happen/.test(noOutcome.error ?? ""), noOutcome);
  const got = await resolve(dir, "small-teams", "did-not-happen", { by: "Torian", observed: "4", evidence: ["evidence/two-filings"], why: "four per cent of the sample", now: "2027-07-01T00:00:00.000Z" });
  expect("a person records what happened, and the bet is refuted by it", got.ok && live().status === "refuted" && live().resolution!.outcome === "did-not-happen", got);
  expect("the forecast is scored on the prior, not on the later update", Math.abs(((got.result as { score?: { brier: number } }).score?.brier ?? 0) - 0.09) < 1e-9, got.result);
  const twice = await resolve(dir, "small-teams", "happened", { by: "Torian" });
  expect("an outcome is written once", !twice.ok && /written once/.test(twice.error ?? ""), twice);

  const scored = await score(dir);
  const set = scored.result as { scored: unknown[]; brier: number | null; unscored: { bet: string }[] };
  expect("score gives the mean over the resolved bets and says why each other is left out",
    scored.ok && set.scored.length === 1 && Math.abs((set.brier ?? 0) - 0.09) < 1e-9 && set.unscored.some((u) => u.bet === "later-teams"), set);
  const listed = await show(dir);
  expect("show lists every bet", listed.ok && listed.result.length === 2, listed);

  // A selection rule is a value: no odds on it, and no verdict from evidence.
  const value = await write({ id: "who-to-back", kind: "selection-rule", status: "proposed", owner: "Torian",
    statement: "We back founders who ship and not founders who only talk.",
    rule: { back: "a founder with something running a stranger can use", do_not_back: "a founder with nothing running after a year", observable_test: "a working thing a stranger can reach" } },
    { route: "foundation/bets/who-to-back" });
  expect("a selection rule is written", value.ok, value);
  const rated = await confidence(dir, "who-to-back", { p: "0.8", by: "Torian", dataSeen: "before-access" });
  expect("there are no odds on a value", !rated.ok && /selection rule/.test(rated.error ?? ""), rated);
  const judged = await resolve(dir, "who-to-back", "happened", { by: "Torian" });
  expect("a value is never resolved by evidence", !judged.ok && /never shown right by evidence/.test(judged.error ?? ""), judged);

  // And the check agrees, reading the registered version out of the blob store this run wrote.
  const ok = checkRun();
  expect("check-bets passes over the venture", ok.status === 0 && JSON.parse(ok.out).unverifiable.length === 0, ok);
  const rec = live();
  writeFileSync(join(dir, "foundation/bets/small-teams.json"), JSON.stringify({ ...rec, falsified_by: "Nothing would." }, null, 2) + "\n");
  const edited = checkRun();
  expect("a hand edit that never went through the router is caught by the check", edited.status === 1 && /falsified_by differs/.test(edited.out), edited);
  writeFileSync(join(dir, "foundation/bets/small-teams.json"), JSON.stringify(rec, null, 2) + "\n");

  // Two registered lines that cannot both hold, and a premise chain that comes back to itself.
  const rival = bet({ id: "few-teams", status: "registered", registered_at: "2026-11-26T10:00:00.000Z", registered_by: "Torian",
    statement: "Hardly any small team will reach a million.", falsified_by: "At least 5 % of them do.",
    confidence: [{ p: 0.4, set_by: "Torian", at: "2026-11-26T00:00:00.000Z", data_seen: "before-access" }],
    claim: { ...bet().claim, comparator: "<", threshold: { value: 5, unit: "%", set_by: "Torian" } } });
  writeFileSync(join(dir, "foundation/bets/few-teams.json"), JSON.stringify(rival, null, 2) + "\n");
  const conflict = checkRun();
  expect("two registered lines over the same population, measure and date that cannot both hold is an error",
    conflict.status === 1 && /cannot both hold/.test(conflict.out), conflict);
  rmSync(join(dir, "foundation/bets/few-teams.json"));

  writeFileSync(join(dir, "foundation/bets/loop-a.json"), JSON.stringify({ id: "loop-a", kind: "premise", statement: "A holds.", premises: ["loop-b"] }, null, 2) + "\n");
  writeFileSync(join(dir, "foundation/bets/loop-b.json"), JSON.stringify({ id: "loop-b", kind: "premise", statement: "B holds.", premises: ["loop-a"] }, null, 2) + "\n");
  const looped = checkRun();
  expect("a premise chain that comes back to its own claim is an error", looped.status === 1 && /rests, through/.test(looped.out), looped);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("bets: all passed");
