// Record generator for an approved supplier list entry (ISO 9001:2015 clause 8.4; APQC PCF 4.2.2). The agent asks for
// the supplier's name and what it may supply. The generator derives the id from the name unless one is given and starts
// the status at candidate with no approver: approval is a person's, so an agent's draft never arrives approved. The
// draft goes to the write chain for supply-chain/suppliers/<id>.json, which only the supply-chain agent
// (supply-chain-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Supplier } from "../../records/types/records.d.ts";

export const record = "supplier";
const DERIVED = ["id", "status", "approved_on", "approved_by"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the name unless given", status: "candidate unless given", approved_on: "null until a person approves", approved_by: "null until a person approves" } });

export function draft(a: Partial<Supplier>) {
  if (!a.name || !a.supplies?.length) return { ok: false, record, errors: ["a supplier needs a name and at least one thing it may supply"] };
  const id = slug(a.id ?? a.name);
  const status = a.status ?? "candidate";
  const rec = drop({ id, name: a.name, supplies: a.supplies, kind: a.kind, status,
    approved_on: status === "candidate" ? null : a.approved_on ?? null, approved_by: status === "candidate" ? null : a.approved_by ?? null,
    review_due: a.review_due, risk_class: a.risk_class, single_source: a.single_source, country: a.country, certifications: a.certifications,
    lead_time_days: a.lead_time_days, moq: a.moq, note: a.note }) as Supplier;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `supply-chain/suppliers/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
