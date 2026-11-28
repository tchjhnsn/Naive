// Record generator for the specification gates (EE-099, EE-236), packages/naive/src/phases/spec-gates.json. The gates
// are framework data, so a draft is a change to the framework (a pull request), not a venture route. A draft takes the
// gates and the staffing gate, checks them against the schema, and refuses an answer naming a record type the data
// model lacks or one with no venture paths, a staffing gate after a gate that is not there, and a repeated id.
import { readDataModel, venturePaths } from "../../records/index.ts";
import { cli, describeFrom, validate } from "./function-common.ts";
import type { SpecGates } from "../../records/types/records.d.ts";

export const record = "spec-gates";
const file = "packages/naive/src/phases/spec-gates.json";
export const describe = () => describeFrom(record, { file });

const repeated = (ids: readonly string[]): string[] => [...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))];

/** What the schema cannot say: the record types an answer names, the gate the staffing gate follows, and unique ids. */
export function crossErrors(a: Pick<SpecGates, "gates" | "staffing">): string[] {
  const types = new Map(readDataModel().records.map((r) => [r.id, venturePaths(r).length]));
  const errors = repeated(a.gates.map((g) => g.id)).map((id) => `gate ${id} is listed twice`);
  for (const g of a.gates) {
    errors.push(...repeated(g.questions.map((q) => q.id)).map((id) => `gate ${g.id} lists question ${id} twice`));
    for (const q of g.questions) for (const x of q.answers ?? []) {
      if (!types.has(x.record)) errors.push(`${g.id}/${q.id}: ${x.record} is not a record type in the data model`);
      else if (!types.get(x.record)) errors.push(`${g.id}/${q.id}: ${x.record} has no venture paths, so no venture record answers it`);
    }
  }
  if (!a.gates.some((g) => g.id === a.staffing.after)) errors.push(`the staffing gate follows ${a.staffing.after}, which is not a gate`);
  errors.push(...repeated(a.staffing.candidates.map((c) => c.id)).map((id) => `staffing candidate ${id} is listed twice`));
  return errors;
}

export function draft(a: Partial<Omit<SpecGates, "version">>) {
  if (!a.gates?.length || !a.staffing) return { ok: false, record, errors: ["the spec gates need their gates, each with its questions, and the staffing gate"] };
  const rec = { version: "0.1.0", ...a } as SpecGates;
  const v = validate(record, rec);
  const errors = [...v.errors, ...(v.ok ? crossErrors(rec) : [])];
  return { ok: !errors.length, record, file, draft: rec, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
