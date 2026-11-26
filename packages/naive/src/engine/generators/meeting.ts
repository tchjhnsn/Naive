// Record generator for a meeting (EE-200). The agent asks for the title, the goal, the expected outcome, who called it
// and who attends, and either the agenda or the workflow it walks. The generator derives the id from the title unless
// one is given, starts the status at planned and every agenda item at pending, and gives each item an id from its
// title. The draft goes to the write chain for operations/meetings/<id>.json (route operations/meeting/[id]).
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { Meeting } from "../../records/types/records.d.ts";

export const record = "meeting";
const DERIVED = ["id", "status", "opened_at", "closed_at", "minutes", "outcome", "takeaways"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title unless given", status: "planned", agenda: "each item pending, its id from its title unless given" } });

type AgendaIn = Partial<Meeting["agenda"][number]> & { title: string };

export function draft(a: Partial<Omit<Meeting, "agenda">> & { agenda?: AgendaIn[] }) {
  if (!a.title || !a.goal || !a.outcome_expected?.length || !a.called_by || !a.attendees?.length || (!a.agenda?.length && !a.workflow)) {
    return { ok: false, record, errors: ["a meeting needs a title, a goal, the outcome that shows it was reached, who called it, who attends, and an agenda or the workflow it walks"] };
  }
  const id = slug(a.id ?? a.title);
  const agenda = (a.agenda ?? []).map((i) => drop({ ...i, id: slug(i.id ?? i.title), status: i.status ?? "pending" }));
  const rec = drop({ id, title: a.title, goal: a.goal, outcome_expected: a.outcome_expected, workflow: a.workflow, called_by: a.called_by,
    facilitator: a.facilitator, attendees: a.attendees, status: "planned", scheduled_for: a.scheduled_for, agenda,
    recording: a.recording, note: a.note }) as Meeting;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `operations/meeting/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
