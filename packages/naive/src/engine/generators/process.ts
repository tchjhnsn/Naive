// Record generator for a process (EE-099): one entry in the venture's process catalog (APQC PCF 13.1, SIPOC). The
// agent asks for the name, the purpose, the one owner and the trigger. The generator derives the id from the name
// unless one is given and starts the status at draft, so the owner approves the procedure before it is active. The
// draft goes to the write chain for capabilities/processes/<id>.json, which only the capabilities agent
// (capabilities-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Process } from "../../records/types/records.d.ts";

export const record = "process";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the name unless given", status: "draft unless given" } });

export function draft(a: Partial<Process>) {
  if (!a.name || !a.purpose || !a.owner || !a.trigger) {
    return { ok: false, record, errors: ["a process needs a name, a purpose, one owner and a trigger"] };
  }
  const id = slug(a.id ?? a.name);
  const rec = drop({ id, name: a.name, purpose: a.purpose, owner: a.owner, trigger: a.trigger, functions: a.functions,
    suppliers: a.suppliers, inputs: a.inputs, outputs: a.outputs, customers: a.customers, steps: a.steps, measures: a.measures,
    status: a.status ?? "draft", last_reviewed: a.last_reviewed, note: a.note }) as Process;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `capabilities/processes/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
