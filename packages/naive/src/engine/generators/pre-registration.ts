// Record generator for a pre-registration (EE-220). The agent asks for the thesis and what would falsify it, the
// assumptions under it with how critical and how uncertain each is, the method, the measures with the venture's own
// thresholds and the dates they are judged by, what does not count as evidence, and the action on a pass and on a
// fail. It derives the id from the title or the thesis unless one is given, gives each assumption, measure and
// exclusion an id from its statement, and starts the status at draft: a person registers it, never the generator
// (naive prereg register <id> --by <person>). The draft goes to the write chain for
// foundation/pre-registration/<id>.json (route foundation/pre-registration/[id]).
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import { registrationGaps } from "../pre-registration.ts";
import type { PreRegistration } from "../../records/types/records.d.ts";

export const record = "pre-registration";
const DERIVED = ["id", "status", "registered_at", "registered_by", "deviations", "results", "verdict", "superseded_by"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title, else the thesis, unless given", status: "draft, until a person registers it",
    assumptions: "each id from its statement unless given", measures: "each id from its statement unless given" } });

type AssumptionIn = Partial<NonNullable<PreRegistration["assumptions"]>[number]> & { statement: string };
type MeasureIn = Partial<NonNullable<PreRegistration["measures"]>[number]> & { statement: string };

export function draft(a: Partial<Omit<PreRegistration, "assumptions" | "measures">> & { assumptions?: AssumptionIn[]; measures?: MeasureIn[] }) {
  // A draft asks only for the claim and what would falsify it. The rest is filled in as the founder answers, because
  // a generator that insisted on a threshold would get one it invented, and a threshold is the venture's own.
  if (!a.thesis?.statement || !a.thesis?.falsified_if) {
    return { ok: false, record, errors: ["a pre-registration starts from a thesis and what would falsify it: a claim with no state that would show it wrong is not a thesis"] };
  }
  const id = slug(a.id ?? a.title ?? a.thesis.statement);
  const assumptions = (a.assumptions ?? []).map((x) => drop({ ...x, id: slug(x.id ?? x.statement) })) as PreRegistration["assumptions"];
  const measures = (a.measures ?? []).map((m) => drop({ ...m, id: slug(m.id ?? m.statement) })) as PreRegistration["measures"];
  const rec = drop({ id, venture: a.venture, title: a.title, status: "draft", thesis: a.thesis, assumptions, method: a.method,
    measures, exclusions: a.exclusions, on_pass: a.on_pass, on_fail: a.on_fail, supersedes: a.supersedes,
    supersede_reason: a.supersede_reason, decision: a.decision, note: a.note }) as PreRegistration;
  const v = validate(record, rec);
  // What is still missing before a person could register it, so the agent knows what to ask for next and nobody is
  // surprised at registration. These are not errors: a draft is allowed to have them.
  const gaps = registrationGaps(rec);
  return { ok: v.ok, record, route: `foundation/pre-registration/${id}`, draft: rec, errors: v.errors, ...(gaps.length ? { gaps } : {}) };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
