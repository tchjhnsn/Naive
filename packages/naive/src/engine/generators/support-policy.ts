// Record generator for the support policy (EE-099; APQC PCF 6.1.3 to 6.1.5, ISO 10002:2018). The agent asks which
// channels customers use and when they are answered, the response targets, the refund rule and what sends a case to a
// person. The generator fills a starting escalation list (complaints, legal threats, safety, refunds above the limit and
// data requests) when none is given, and never changes one a person gave. The draft goes to the write chain for
// support/policy.json; it is a public-commitment record, so an agent's write is held for a person to accept.
import { cli, drop, questions, schemaOf, validate } from "./generate.ts";
import type { SupportPolicy } from "../../records/types/records.d.ts";

export const record = "support-policy";
const STARTING_ESCALATIONS: SupportPolicy["escalate_when"] = ["complaint", "legal-threat", "safety", "refund-above-limit", "data-request"];
export const describe = () => ({ record, ask: questions(schemaOf(record)), derived: { escalate_when: `${STARTING_ESCALATIONS.join(", ")} unless given` } });

export function draft(a: Partial<SupportPolicy>) {
  if (!a.channels?.length || !a.targets?.length || !a.refunds) return { ok: false, record, errors: ["a support policy needs at least one channel, at least one response target and a refund rule"] };
  const rec = drop({ channels: a.channels, targets: a.targets, refunds: a.refunds, escalate_when: a.escalate_when?.length ? a.escalate_when : STARTING_ESCALATIONS,
    reasons: a.reasons, reviewed: a.reviewed, note: a.note }) as SupportPolicy;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: "support/policy", draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
