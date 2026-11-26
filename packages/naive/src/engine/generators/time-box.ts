// Record generator for a time box (EE-186): one campaign or sprint. The agent asks for the kind, the title, the goal,
// the start and the end, and the functions or workflows it covers. The generator derives the id from the title unless
// one is given, starts the status at active, and refuses an end that is not after the start. The draft goes to the
// write chain for operations/time-boxes/<id>.json (route operations/time-box/[id]), which only a person writes.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { TimeBox } from "../../records/types/records.d.ts";

export const record = "time-box";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title unless given", status: "active unless given" } });

export function draft(a: Partial<TimeBox>) {
  if (!a.kind || !a.title || !a.goal || !a.starts || !a.ends || (!a.functions?.length && !a.workflows?.length)) {
    return { ok: false, record, errors: ["a time box needs its kind (campaign or sprint), a title, a goal, when it starts and ends, and the functions or workflows it covers"] };
  }
  if (Date.parse(a.ends) <= Date.parse(a.starts)) return { ok: false, record, errors: [`a time box must end after it starts: ${a.ends} is not after ${a.starts}`] };
  const id = slug(a.id ?? a.title);
  const rec = drop({ id, kind: a.kind, title: a.title, goal: a.goal, starts: a.starts, ends: a.ends, status: a.status ?? "active",
    functions: a.functions, workflows: a.workflows, loop_mode: a.loop_mode, set_by: a.set_by, owner: a.owner, note: a.note }) as TimeBox;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `operations/time-box/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
