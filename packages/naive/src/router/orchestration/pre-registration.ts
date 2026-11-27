#!/usr/bin/env node
// `naive prereg` (EE-220, docs/design/PRE_REGISTRATION_2026-11-26.md): read a venture's pre-registrations, register
// one, and record what was observed for a measure. Every write goes through the router, so the freeze
// (packages/naive/src/router/pre-registration.ts), the gate and the provenance line all apply, and the version this
// command registered is in the blob store for packages/naive/src/checks/check-pre-registration.ts to compare with.
//
//   node packages/naive/src/router/orchestration/pre-registration.ts <venture dir> show [<id>] [--json]
//   node packages/naive/src/router/orchestration/pre-registration.ts <venture dir> register <id> --by <person>
//   node packages/naive/src/router/orchestration/pre-registration.ts <venture dir> result <id> --measure <m>=<value> [--evidence <ref>]... [--by <person>]
//
// register is a person's: it refuses an acting agent, and it refuses a record with a hole in it (a measure with no
// threshold or no date, no exclusion, a missing action), because those are what a registration fixes. It never
// invents a threshold: Naive ships none, and a measure's line is the venture's own.
//
// result computes one measure's pass or fail from its registered threshold, which is arithmetic. The verdict over
// the whole test is a person's and is written through the route, not here.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { actingAgent } from "../../core/provenance.ts";
import { measureVerdict, registrationGaps } from "../../engine/pre-registration.ts";
import { call } from "../router.ts";
import type { PreRegistration } from "../../records/types/records.d.ts";
import { nowIso } from "../../core/clock.ts";

/** What one command answers with. ok false carries why; a write carries the route it landed on. */
export type PreRegAnswer = { ok: boolean; error?: string; errors?: string[]; result?: unknown };

/** What show answers with: the records themselves, so a caller reads them without a cast. */
export type PreRegList = { ok: false; error: string } | { ok: true; result: PreRegistration[] };

const ROUTE = "foundation/pre-registration";
const route = (id: string) => `${ROUTE}/${id}`;
const errorOf = (a: { ok: boolean; error?: string }) => a.error ?? "the router refused it";
/** The venture's id, so the router finds its folder with the folder itself as the workspace. */
const idOf = (dir: string): string => (JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { id: string }).id;

/** Every pre-registration the venture has, or the one named, read through the router. */
export async function show(dir: string, id?: string): Promise<PreRegList> {
  const answer = await call({ venture: idOf(dir), workspace: dir, route: id ? route(id) : ROUTE, action: "read" });
  if (!answer.ok) return { ok: false, error: errorOf(answer) };
  const list = id ? (answer.result ? [answer.result as PreRegistration] : [])
    : Object.values((answer.result ?? {}) as Record<string, PreRegistration>);
  return { ok: true, result: list };
}

/** The record as the router holds it, or null when the route has none. */
async function read(dir: string, id: string): Promise<PreRegistration | null> {
  const answer = await call({ venture: idOf(dir), workspace: dir, route: route(id), action: "read" });
  return answer.ok && answer.result ? answer.result as PreRegistration : null;
}

/**
 * A person registers one pre-registration: status registered, with the time and the person who did it. From then on
 * its thesis, assumptions, method, measures, thresholds, dates, exclusions and decision rules never change, and the
 * router refuses a write that moves one.
 */
export async function register(dir: string, id: string, o: { by?: string; now?: string } = {}): Promise<PreRegAnswer> {
  if (!o.by) return { ok: false, error: "a pre-registration is registered by a person: name them with --by <person>" };
  const agent = actingAgent(o.by);
  if (agent) return { ok: false, error: `an agent (${agent}) is acting: a person registers a pre-registration, because registering it fixes the standard of proof` };
  const rec = await read(dir, id);
  if (!rec) return { ok: false, error: `no pre-registration ${id} in ${ROUTE}` };
  if (rec.status !== "draft") return { ok: false, error: `${id} is ${rec.status}, and only a draft is registered` };
  const gaps = registrationGaps(rec);
  if (gaps.length) return { ok: false, error: `${id} is not ready to register`, errors: gaps };
  const at = o.now ?? nowIso();
  const next = { ...rec, status: "registered", registered_at: at, registered_by: o.by };
  const answer = await call({ venture: idOf(dir), workspace: dir, route: route(id), action: "write", actor: "person", input: next,
    provenance: { note: `naive prereg register: ${o.by} fixed the plan for ${id}` } });
  return answer.ok ? { ok: true, result: { registered: route(id), at, by: o.by } } : { ok: false, error: errorOf(answer) };
}

/**
 * Records what was observed for one measure of a registered pre-registration, with its pass or fail against the
 * registered threshold. Appended to results; nothing already written changes.
 */
export async function result(dir: string, id: string, o: { measure?: string; value?: string; evidence?: string[]; by?: string; note?: string; now?: string } = {}): Promise<PreRegAnswer> {
  if (!o.measure || o.value === undefined) return { ok: false, error: "a result names a measure and what was observed: --measure <measure id>=<value>" };
  const rec = await read(dir, id);
  if (!rec) return { ok: false, error: `no pre-registration ${id} in ${ROUTE}` };
  const m = (rec.measures ?? []).find((x) => x.id === o.measure);
  if (!m) return { ok: false, error: `${id} has no measure ${o.measure}: it measures ${(rec.measures ?? []).map((x) => x.id).join(", ") || "nothing"}` };
  const n = Number(o.value);
  const observed: number | string = o.value.trim() !== "" && Number.isFinite(n) ? n : o.value;
  if (!m.threshold) return { ok: false, error: `measure ${m.id} has no threshold, so nothing says whether an observation passes it: a threshold is chosen before the test runs, and this one was not` };
  const verdict = measureVerdict(m.threshold, observed);
  if (!verdict) return { ok: false, error: `${o.measure} cannot be judged here: ${JSON.stringify(observed)} against the threshold ${m.threshold.operator} ${JSON.stringify(m.threshold.value)} is not arithmetic, so a person writes the result through ${route(id)} with the verdict stated` };
  const at = o.now ?? nowIso();
  const entry = { measure: m.id, observed, verdict, at, ...(o.evidence?.length ? { evidence: o.evidence } : {}), ...(o.by ? { by: o.by } : {}), ...(o.note ? { note: o.note } : {}) };
  const next = { ...rec, results: [...(rec.results ?? []), entry] };
  const answer = await call({ venture: idOf(dir), workspace: dir, route: route(id), action: "write", ...(o.by ? { actor: "person" as const } : {}), input: next,
    provenance: { note: `naive prereg result: ${m.id} observed ${String(observed)}, a ${verdict} against its registered threshold` } });
  return answer.ok ? { ok: true, result: { recorded: route(id), measure: m.id, observed, verdict, draft: (answer.result as { draft?: boolean } | undefined)?.draft } } : { ok: false, error: errorOf(answer) };
}

/** One line per pre-registration: its status, how its measures stand, and what it said it would do. */
function print(what: string, a: PreRegAnswer): void {
  if (!a.ok) { console.error(`FAIL  ${a.error}`); for (const e of a.errors ?? []) console.error(`      ${e}`); return; }
  if (what === "show") {
    const list = (a.result ?? []) as PreRegistration[];
    if (!list.length) { console.log("no pre-registration yet: naive <route> template foundation/pre-registration/[id] gives the shape, and a person registers it"); return; }
    for (const rec of list) {
      console.log(`${rec.id}  ${rec.status}${rec.registered_by ? ` (registered by ${rec.registered_by} at ${rec.registered_at})` : ""}`);
      console.log(`  thesis     ${rec.thesis?.statement ?? ""}`);
      console.log(`  falsified  ${rec.thesis?.falsified_if ?? ""}`);
      for (const m of rec.measures ?? []) {
        const got = (rec.results ?? []).filter((x) => x.measure === m.id).at(-1);
        const line = m.threshold ? `${m.threshold.operator} ${String(m.threshold.value)}${m.threshold.unit ? ` ${m.threshold.unit}` : ""}` : "no threshold yet, which the venture chooses";
        console.log(`  measure    ${m.id}: ${line} by ${m.judged_by ?? "no date yet"}${got ? ` -> observed ${String(got.observed)}, ${got.verdict}` : ""}`);
      }
      for (const x of rec.exclusions ?? []) console.log(`  not proof  ${x.statement}`);
      console.log(`  on pass    ${rec.on_pass?.action}: ${rec.on_pass?.what}`);
      console.log(`  on fail    ${rec.on_fail?.action}: ${rec.on_fail?.what}`);
      for (const d of rec.deviations ?? []) console.log(`  deviation  ${d.at} ${d.by}: ${d.what} (${d.why})`);
      if (rec.verdict) console.log(`  verdict    ${rec.verdict.outcome}, ${rec.verdict.action_taken} by ${rec.verdict.by}`);
    }
    return;
  }
  const r = a.result as Record<string, unknown>;
  if (what === "register") console.log(`registered ${String(r.registered)} at ${String(r.at)} by ${String(r.by)}: its thesis, assumptions, method, measures, thresholds, dates, exclusions and decision rules are now fixed`);
  if (what === "result") console.log(`${String(r.measure)}: observed ${String(r.observed)}, a ${String(r.verdict)} against its registered threshold${r.draft ? " (held as a draft for a person to accept)" : ""}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, ...a] = process.argv.slice(2);
  const opt = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const all = (n: string) => a.flatMap((x, i) => (x === `--${n}` ? [a[i + 1]] : []));
  const json = a.includes("--json");
  const usage = "usage: node packages/naive/src/router/orchestration/pre-registration.ts <venture dir> show [<id>] | register <id> --by <person> | result <id> --measure <measure>=<value> [--evidence <ref>] [--by <person>]";
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error(usage); process.exit(2); }
  const [what = "show", id] = a.filter((x, i) => !x.startsWith("--") && !a[i - 1]?.startsWith("--"));
  const now = opt("now");
  let r: PreRegAnswer;
  if (what === "show") r = await show(dir, id);
  else if (what === "register") { if (!id) { console.error(usage); process.exit(2); } r = await register(dir, id, { by: opt("by"), now }); }
  else if (what === "result") {
    if (!id) { console.error(usage); process.exit(2); }
    const [measure, ...value] = (opt("measure") ?? "").split("=");
    r = await result(dir, id, { measure: measure || undefined, value: value.length ? value.join("=") : undefined, evidence: all("evidence"), by: opt("by"), note: opt("note"), now });
  } else { console.error(usage); process.exit(2); }
  if (json) console.log(JSON.stringify(r, null, 2)); else print(what, r);
  process.exit(r.ok ? 0 : 1);
}
