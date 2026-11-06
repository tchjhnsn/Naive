// The telos framework's adapter: reads an unmigrated telos.json (the fallback) and renders the telos view
// of a migrated venture from canonical goals and exit criteria (views, not copies). Only this adapter,
// the telos-to-goals migration and the telos's own check read telos.json (packages/naive/src/engine/check-frameworks.mjs).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../../packages/naive/src/core/venture-paths.mjs";

const load = (f) => JSON.parse(readFileSync(f, "utf8"));
export const TELOS_FILES = ["foundation/telos.json", "purpose/telos.json"];
export const telosFile = (dir) => TELOS_FILES.find((t) => existsSync(ventureFile(dir, t))) ?? null;
export const PHASE_IDS = ["discovery", "validation", "beachhead", "scale", "platform"];

/** An unmigrated telos's exit criteria for a phase: { file, record (the telos), criteria } or null. */
export function telosExitCriteria(dir, phase) {
  const f = telosFile(dir);
  if (!f) return null;
  const t = load(ventureFile(dir, f));
  const p = t.phases?.find((x) => x.phase === phase);
  return { file: f, record: t, criteria: p?.exit_criteria ?? [] };
}

/** Telos -> canonical: { goals: [{file, rec}], exit: [{file, rec}] }. Pure.
 * @param {*} t @param {{ venture?: string }} [opts] */
export function split(t, { venture } = {}) {
  const base = venture ? { venture } : {};
  /** @type {{ file: string, rec: Record<string, unknown> }[]} */
  const goals = [{
    file: "foundation/goals/telos.json",
    rec: { id: "telos", ...base, statement: t.statement, kind: "venture", ...(t.horizon !== undefined ? { horizon: t.horizon } : {}),
      ...(t.end_state ? { end_state: t.end_state } : {}),
      measures: (t.measures ?? []).map((m) => ({ id: m.id, statement: m.statement, ...(m.target !== undefined ? { target: m.target } : {}), ...(m.primary ? { primary: true } : {}), ...(m.kind ? { kind: m.kind } : {}) })),
      framework: "telos" },
  }];
  if (t.owner_outcome) goals.push({ file: "foundation/goals/owner-outcome.json", rec: { id: "owner-outcome", ...base, statement: `The owners intend ${t.owner_outcome.path} once the end is reached`, kind: "owner", value: t.owner_outcome.path, ...(t.owner_outcome.why ? { why: t.owner_outcome.why } : {}), framework: "telos" } });
  const exit = (t.phases ?? []).map((p) => ({ file: `foundation/exit-criteria/${p.phase}.json`, rec: { phase: p.phase, ...base,
    criteria: p.exit_criteria.map((c) => ({ id: c.id, statement: c.statement, ...(c.serves ? { serves: c.serves } : {}), ...(c.evidence ? { evidence: c.evidence } : {}), met: c.met ?? null })), framework: "telos" } }));
  return { goals, exit, steering: t.steering ?? null };
}

/** Canonical -> telos (the view a migrated venture's foundation/telos route renders), or null when there is nothing to render. */
export function telosView(dir) {
  if (!dir) return null;
  const read = (rel) => { const d = ventureFile(dir, rel); return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => load(join(d, f))) : []; };
  const goals = read("foundation/goals"), exit = read("foundation/exit-criteria");
  const end = goals.find((g) => g.kind === "venture");
  if (!end && !exit.length) return null;
  const owner = goals.find((g) => g.kind === "owner");
  return {
    statement: end?.statement ?? null, end_state: end?.end_state ?? null, ...(end?.horizon !== undefined ? { horizon: end.horizon } : {}),
    measures: (end?.measures ?? []).map((m) => ({ id: m.id, statement: m.statement, ...(m.target !== undefined ? { target: String(m.target) } : {}), ...(m.kind ? { kind: m.kind } : {}), ...(m.primary ? { primary: true } : {}) })),
    owner_outcome: owner ? { path: owner.value, ...(owner.why ? { why: owner.why } : {}) } : null,
    phases: PHASE_IDS.map((ph) => exit.find((e) => e.phase === ph)).filter(Boolean).map((e) => ({ phase: e.phase, exit_criteria: e.criteria.map((c) => ({ id: c.id, statement: c.statement, serves: c.serves ?? [], ...(c.evidence ? { evidence: c.evidence } : {}), ...(c.met ? { met: c.met } : {}) })) })),
  };
}
