// Record generator for a phase module's manifest (EE-099, EE-126), packages/naive/src/phases/<id>/phase.json. The
// manifest is framework data, so a draft is a change to the framework (a pull request), not a venture route. Its
// need-now priors are derived, never held here; packages/naive/src/checks/check-phases.ts checks it.
import { cli, describeFrom, validate } from "./function-common.ts";

export const record = "phase-module";
export const describe = () => describeFrom(record, { file: "packages/naive/src/phases/<id>/phase.json" });

type Evidence = { id: string, statement: string, source: string };
type Weight = { weight: number, why: string };
export function draft(a: {
  id?: string, step?: number, name?: string, question?: string, binding_constraint?: string, references?: string[],
  gate?: { name: string, asks: string[], evidence: Evidence[] }, workflows?: string[], weights?: Record<string, Weight>,
}) {
  if (!a.id || !a.step || !a.name || !a.question || !a.gate || !a.workflows?.length || !a.weights) return { ok: false, record, errors: ["a phase manifest needs the phase id, its step, name and question, its gate, its active workflows and the function weights"] };
  const rec = {
    id: a.id, step: a.step, name: a.name, question: a.question,
    ...(a.binding_constraint ? { binding_constraint: a.binding_constraint } : {}),
    references: a.references ?? [], gate: a.gate, workflows: a.workflows,
    weights: { version: "0.1.0", note: "Unvalidated priors, ours: how much each function's open decisions count when decisions are ranked across functions in this phase. They sum to 1.", functions: a.weights },
  };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `packages/naive/src/phases/${a.id}/phase.json`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
