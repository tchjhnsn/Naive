// Record generator for a support case (EE-099; APQC PCF 6.2.2 and 6.2.3, ISO 10002:2018 for complaints). The agent asks
// when and through which channel the customer made contact, what kind of contact it is and what they need. The generator
// derives the id from the opened date and the summary unless one is given, starts the status at new, and leaves
// first_response and resolved null. A refund needs the id of the spend-money decision a person made. The case holds no
// transcript and no contact details. The draft goes to the write chain for support/cases/<id>.json, which only the
// customer service agent (customer-service-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { SupportCase } from "../../records/types/records.d.ts";

export const record = "support-case";
const DERIVED = ["id", "status", "first_response", "resolved"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "the opened date and the summary unless given", status: "new unless given", first_response: "null until a reply", resolved: "null until resolved" } });

export function draft(a: Partial<SupportCase>) {
  if (!a.opened || !a.channel || !a.kind || !a.summary) return { ok: false, record, errors: ["a support case needs when it was opened, the channel, the kind of contact and a summary"] };
  const id = slug(a.id ?? `${a.opened.slice(0, 10)} ${a.summary}`);
  const rec = drop({ id, opened: a.opened, channel: a.channel, kind: a.kind, customer: a.customer, external_id: a.external_id, summary: a.summary,
    reason: a.reason, status: a.status ?? "new", first_response: a.first_response ?? null, resolved: a.resolved ?? null, resolution: a.resolution,
    root_cause: a.root_cause, repeat_of: a.repeat_of, bug: a.bug, refund: a.refund, note: a.note }) as SupportCase;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `support/cases/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
