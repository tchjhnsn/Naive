// Record generator for a function workflow (EE-099), packages/naive/src/functions/<id>/workflows/<workflow>.json:
// a trigger, steps and done criteria in the handoff's form. The id is a slug of the title unless given.
import { cli, describeFrom, slug, validate } from "./function-common.ts";

export const record = "function-workflow";
export const describe = () => describeFrom(record, { file: "packages/naive/src/functions/<id>/workflows/<workflow>.json" });

type Step = { id: string, do: string, skill?: string, ask?: boolean, writes?: string[], raises?: string[], activity?: string };
type Done = { id: string, kind: "conformance" | "self-proof" | "review", check: string, reviewer?: string };
export function draft(a: { id?: string, function?: string, title?: string, trigger?: { kind: string, cadence?: string, route?: string }, reads?: string[], steps?: Step[], done_criteria?: Done[] }) {
  if (!a.function || !a.title || !a.trigger || !a.steps?.length || !a.done_criteria?.length) return { ok: false, record, errors: ["a workflow needs its function, a title, a trigger, steps and done criteria"] };
  const id = slug(a.id ?? a.title);
  const rec = { id, function: a.function, title: a.title, trigger: a.trigger, ...(a.reads ? { reads: a.reads } : {}), steps: a.steps, done_criteria: a.done_criteria };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `packages/naive/src/functions/${a.function}/workflows/${id}.json`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
