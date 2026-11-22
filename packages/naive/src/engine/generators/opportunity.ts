// Record generator for a sales opportunity (EE-099; APQC PCF 3.5.1, MEDDIC qualification, win-loss analysis). The agent
// asks what is being sold to whom, how the interest arrived and when. The generator derives the id from the title unless
// one is given, starts the pipeline stage at lead, and leaves first_response null until someone replies. A closed opportunity
// (won or lost) needs an outcome with its reason and who gave it. The buyer is an account or customer record id, never
// contact details. The draft goes to the write chain for sales/opportunities/<id>.json, which only the marketing and
// sales agent (marketing-and-sales-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { Opportunity } from "../../records/types/records.d.ts";

export const record = "opportunity";
const DERIVED = ["id", "pipeline_stage", "first_response"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title unless given", pipeline_stage: "lead unless given", first_response: "null until someone replies" } });

export function draft(a: Partial<Opportunity>) {
  if (!a.title || !a.source || !a.created) return { ok: false, record, errors: ["an opportunity needs a title, a source and when the interest was first recorded"] };
  const stage = a.pipeline_stage ?? "lead";
  if ((stage === "won" || stage === "lost") && !a.outcome) return { ok: false, record, errors: ["a won or lost opportunity needs an outcome: the reason and whether the buyer or the seller gave it"] };
  const id = slug(a.id ?? a.title);
  const rec = drop({ id, title: a.title, account: a.account, customer: a.customer, icp: a.icp, pipeline_stage: stage, source: a.source, channel: a.channel,
    created: a.created, first_response: a.first_response ?? null, value: a.value, expected_close: a.expected_close, qualification: a.qualification,
    next_step: a.next_step, outcome: a.outcome, owner: a.owner, note: a.note }) as Opportunity;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `sales/opportunities/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
