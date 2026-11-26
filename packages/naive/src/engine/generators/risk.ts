// Record generator for a risk register entry (EE-099; ISO 31000:2018 clauses 6.4 to 6.6). The agent asks for the
// event, its cause and consequence, a category, the person who owns it, likelihood and impact as 90% ranges, the
// treatment and the review date. The impact cites a source or is marked an estimate with its basis and who made it
// (EE-212). The generator derives the id from the title unless one is given and starts the status at open.
// expectedLoss gives the range of expected loss (likelihood times impact), carrying the impact's source or estimate,
// so risks are ranked by money, not by ordinal scores (Hubbard), and no money figure is unsourced. The draft goes to
// the write chain for legal/risks/<id>.json, which only the risk-and-compliance agent (risk-and-compliance-agent) or a
// person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { Risk } from "../../records/types/records.d.ts";

export const record = "risk";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title unless given", status: "open unless given" } });

export function draft(a: Partial<Risk>) {
  if (!a.title || !a.cause || !a.consequence || !a.category || !a.owner || !a.likelihood || !a.impact || !a.treatment || !a.review_date) {
    return { ok: false, record, errors: ["a risk needs a title, a cause, a consequence, a category, an owner, likelihood and impact ranges, a treatment and a review date"] };
  }
  const id = slug(a.id ?? a.title);
  const rec = drop({ id, title: a.title, cause: a.cause, consequence: a.consequence, category: a.category, owner: a.owner,
    likelihood: a.likelihood, impact: a.impact, treatment: a.treatment, treatment_plan: a.treatment_plan, status: a.status ?? "open",
    review_date: a.review_date, related: a.related, note: a.note }) as Risk;
  const v = validate(record, rec);
  const labels = ["source" in rec.impact, "estimate" in rec.impact].filter(Boolean).length;
  const more = [rec.likelihood.low > rec.likelihood.high ? "likelihood low is above high" : null, rec.impact.low > rec.impact.high ? "impact low is above high" : null,
    labels !== 1 ? "impact needs exactly one of source (a record route or reference id) or estimate (its basis and who estimated it)" : null].filter((x): x is string => !!x);
  return { ok: v.ok && !more.length, record, route: `legal/risks/${id}`, draft: rec, errors: [...v.errors, ...more] };
}

/** Expected loss over the next 12 months as a range: the low ends multiplied and the high ends multiplied. It carries
 *  the impact's label, its source or its estimate, so a figure computed from a guess still reads as one (EE-212). */
export const expectedLoss = (r: Risk) => {
  const { low, high, currency, ...label } = r.impact;
  return { low: r.likelihood.low * low, high: r.likelihood.high * high, currency, ...label };
};

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
