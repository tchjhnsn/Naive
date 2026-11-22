// Record generator for a lease (EE-099; ASC 842 and IFRS 16; APQC 10.1.3). The agent abstracts the signed or offered
// document: the kind, the counterparty, start and end dates, rent, auto-renewal, notice days and whether a founder
// guarantees it. The generator derives the id from the counterparty unless one is given and starts the status at
// proposed, since signing is the founder's decision. noticeDate gives the last day notice can be given. The draft goes
// to the write chain for assets/leases/<id>.json, which only the assets agent (assets-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { Lease } from "../../records/types/records.d.ts";

export const record = "lease";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the counterparty unless given", status: "proposed unless given" } });

export function draft(a: Partial<Lease>) {
  if (!a.kind || !a.counterparty || !a.start || a.end === undefined || !a.rent || a.auto_renews === undefined || a.notice_days === undefined || a.personal_guarantee === undefined) {
    return { ok: false, record, errors: ["a lease needs its kind, counterparty, start and end (null for month-to-month), rent, whether it auto-renews, its notice days and whether a founder guarantees it"] };
  }
  const id = slug(a.id ?? a.counterparty);
  const rec = drop({ id, kind: a.kind, counterparty: a.counterparty, start: a.start, end: a.end, rent: a.rent, deposit: a.deposit,
    auto_renews: a.auto_renews, notice_days: a.notice_days, break_clause: a.break_clause, personal_guarantee: a.personal_guarantee,
    insurance_required: a.insurance_required, spend: a.spend, document: a.document, status: a.status ?? "proposed", note: a.note }) as Lease;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `assets/leases/${id}`, draft: rec, errors: v.errors };
}

/** The last day the venture can give notice to end the lease at the end of its term: end less notice_days, or null for
 *  month-to-month. */
export function noticeDate(l: Lease): string | null {
  if (!l.end) return null;
  const d = new Date(`${l.end}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - l.notice_days);
  return d.toISOString().slice(0, 10);
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
