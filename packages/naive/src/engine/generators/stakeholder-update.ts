// Record generator for a stakeholder update (EE-099): one investor or board update in the common investor update
// format (headline, metrics with sources, highlights, lowlights, at most three asks). The agent gathers the period, the
// audience, the headline, the metrics and the three lists. The generator derives the id from the period unless one is
// given and always starts the status at draft: a person approves and sends it (public-commitment). The draft goes to
// the write chain for investor-relations/updates/<id>.json, which only the external-relationships agent or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { StakeholderUpdate } from "../../records/types/records.d.ts";

export const record = "stakeholder-update";
const DERIVED = ["id", "status", "approved_by", "sent_on"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the period unless given", status: "always draft: a person approves and sends it" } });

export function draft(a: Partial<StakeholderUpdate>) {
  if (!a.period || !a.audience || !a.headline || !a.metrics) {
    return { ok: false, record, errors: ["an update needs a period, an audience, a headline and its metrics"] };
  }
  const id = slug(a.id ?? a.period);
  const rec = drop({ id, period: a.period, audience: a.audience, status: "draft", headline: a.headline, metrics: a.metrics,
    highlights: a.highlights ?? [], lowlights: a.lowlights ?? [], asks: a.asks ?? [], runway_months: a.runway_months, note: a.note }) as StakeholderUpdate;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `investor-relations/updates/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
