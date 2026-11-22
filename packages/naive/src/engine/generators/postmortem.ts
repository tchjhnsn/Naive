// Record generator for a postmortem (EE-099): one blameless postmortem (Google SRE book, ch. 15; ISO 9001:2015
// clause 10.2). The agent asks for the title, the date, the trigger, a summary and at least one contributing cause.
// The generator derives the id from the date and title unless one is given, starts actions empty and the status at
// draft, so a person reviews it before it closes. The draft goes to the write chain for
// capabilities/postmortems/<id>.json, which only the capabilities agent (capabilities-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { Postmortem } from "../../records/types/records.d.ts";

export const record = "postmortem";
const DERIVED = ["id", "status", "reviewed_by"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the date and title unless given", status: "draft unless given", actions: "empty unless given" } });

export function draft(a: Partial<Postmortem>) {
  if (!a.title || !a.date || !a.trigger || !a.summary || !a.contributing_causes?.length) {
    return { ok: false, record, errors: ["a postmortem needs a title, a date, its trigger, a summary and at least one contributing cause"] };
  }
  const id = slug(a.id ?? `${a.date}-${a.title}`);
  const rec = drop({ id, title: a.title, date: a.date, trigger: a.trigger, process: a.process, summary: a.summary, impact: a.impact,
    timeline: a.timeline, contributing_causes: a.contributing_causes, actions: a.actions ?? [], lessons: a.lessons,
    status: a.status ?? "draft", note: a.note }) as Postmortem;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `capabilities/postmortems/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
