// Record generator for a compliance obligation (EE-099; ISO 37301:2021 clause 4.5; APQC 11.2.2.2). The agent asks
// what the duty is, its kind, who imposes it and on what basis, how often it recurs, the next due date, the days it
// takes to prepare and who files, signs or pays. The generator derives the id from the title unless one is given and
// starts the status at upcoming. alertDate gives the day the calendar raises it: twice its preparation time before the
// due date. The draft goes to the write chain for legal/obligations/<id>.json, which only the risk-and-compliance agent
// (risk-and-compliance-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Obligation } from "../../records/types/records.d.ts";

export const record = "obligation";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title unless given", status: "upcoming unless given" } });

export function draft(a: Partial<Obligation>) {
  if (!a.title || !a.kind || !a.authority || !a.basis || !a.recurrence || !a.due_date || a.prep_days === undefined || !a.owner) {
    return { ok: false, record, errors: ["an obligation needs a title, a kind, the authority and basis, its recurrence, the next due date, its preparation days and an owner"] };
  }
  const id = slug(a.id ?? a.title);
  const rec = drop({ id, title: a.title, kind: a.kind, authority: a.authority, basis: a.basis, recurrence: a.recurrence,
    due_date: a.due_date, prep_days: a.prep_days, owner: a.owner, fee: a.fee, cure: a.cure, status: a.status ?? "upcoming",
    last_met: a.last_met, evidence: a.evidence, note: a.note }) as Obligation;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `legal/obligations/${id}`, draft: rec, errors: v.errors };
}

/** The day the calendar raises the obligation: twice its preparation days before the due date. */
export function alertDate(o: Obligation): string {
  const d = new Date(`${o.due_date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 2 * o.prep_days);
  return d.toISOString().slice(0, 10);
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
