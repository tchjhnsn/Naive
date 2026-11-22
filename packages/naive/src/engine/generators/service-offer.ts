// Record generator for a service catalogue entry (ITIL 4 service catalogue management; APQC PCF 5.1.2). The agent asks
// for the offer's name, the outcome the client has at the end, what it includes and how it is priced. The generator
// derives the id from the name unless one is given and starts the status at draft: an offer is offered only once a
// person approves it. The draft goes to the write chain for service-delivery/offers/<id>.json, which only the
// service-delivery agent (service-delivery-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { ServiceOffer } from "../../records/types/records.d.ts";

export const record = "service-offer";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the name unless given", status: "draft unless given" } });

export function draft(a: Partial<ServiceOffer>) {
  if (!a.name || !a.outcome || !a.includes?.length || !a.price_model) return { ok: false, record, errors: ["a service offer needs a name, an outcome, what it includes and a price model"] };
  const id = slug(a.id ?? a.name);
  const rec = drop({ id, name: a.name, outcome: a.outcome, includes: a.includes, excludes: a.excludes, price_model: a.price_model, price: a.price,
    currency: a.currency, duration_days: a.duration_days, prerequisites: a.prerequisites, runbook: a.runbook, product: a.product,
    status: a.status ?? "draft", note: a.note }) as ServiceOffer;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `service-delivery/offers/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
