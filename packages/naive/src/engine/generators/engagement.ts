// Record generator for a client engagement (APQC PCF 5.3). The agent asks for the client by its customer record id, a
// title and the deliverables, each with the test the client applies to accept it. The generator derives the id from
// the client and title unless one is given, starts the status at proposed and each deliverable at planned, and refuses
// a deliverable without acceptance criteria, since no work starts without one. The draft goes to the write chain for
// service-delivery/engagements/<id>.json, which only the service-delivery agent (service-delivery-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Engagement } from "../../records/types/records.d.ts";

export const record = "engagement";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the client and title unless given", status: "proposed unless given", "deliverables[].status": "planned unless given" } });

export function draft(a: Partial<Engagement>) {
  if (!a.client || !a.title || !a.deliverables?.length) return { ok: false, record, errors: ["an engagement needs a client record id, a title and at least one deliverable"] };
  const missing = a.deliverables.filter((d) => !d.acceptance).map((d) => d.id);
  if (missing.length) return { ok: false, record, errors: [`deliverables ${missing.join(", ")} have no acceptance criteria; no work starts without one`] };
  const id = slug(a.id ?? `${a.client}-${a.title}`);
  const rec = drop({ id, client: a.client, offer: a.offer, title: a.title, sow_signed: a.sow_signed ?? null, start: a.start, end: a.end,
    deliverables: a.deliverables.map((d) => ({ ...d, status: d.status ?? "planned" })), changes: a.changes, price_model: a.price_model,
    budget: a.budget, currency: a.currency, handoffs: a.handoffs, status: a.status ?? "proposed", review: a.review, note: a.note }) as Engagement;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `service-delivery/engagements/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
