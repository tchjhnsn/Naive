// Record generator for a detector (EE-099; docs/design/SIGNAL_DETECTION_2026-11-07.md). The agent asks for the
// id, the impact tier, the question, the sensor and its scale, the criterion, the resolver and time_to_detect. The
// generator fills the tier's costs unless a person gave others (low: 1 for each outcome; costly: a miss costs 3, the
// rest 1) and a base rate read from the ledger unless one is stated. A one_way_door detector gets no costs and the
// criterion route person: every call goes to a person. It never derives a criterion line: a line is given and names
// who set it. The draft goes to the write chain for governance/detectors/<id>.json.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Detector } from "../../records/types/records.d.ts";

export const record = "detector";
const DERIVED = ["costs", "base_rate"];
type Tier = Detector["tier"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { costs: "the tier's unless given; none at one_way_door", base_rate: "from the ledger unless stated", criterion: "route person at one_way_door" } });

/** The costs each tier starts with. low: a miss and a false alarm cost the same. costly: a miss costs three times a
 * false alarm. one_way_door: none, because no line is drawn and every call goes to a person. */
export const TIER_COSTS: Record<Tier, Detector["costs"]> = {
  low: { hit: 1, miss: 1, false_alarm: 1, correct_rejection: 1, set_by: "tier" },
  costly: { hit: 1, miss: 3, false_alarm: 1, correct_rejection: 1, set_by: "tier" },
  one_way_door: undefined,
};

export function draft(a: Partial<Detector>) {
  const door = a.tier === "one_way_door";
  if (!a.id || !a.tier || !a.question || !a.evidence || !(a.criterion || door) || !a.resolution) {
    return { ok: false, record, errors: ["a detector needs an id, a tier, a question, evidence, a criterion (except at one_way_door) and a resolution"] };
  }
  const id = slug(a.id);
  const rec = drop({ id, title: a.title, description: a.description, call_site: a.call_site, tier: a.tier, question: a.question, evidence: a.evidence,
    criterion: door ? { route: "person" } : a.criterion, costs: door ? undefined : a.costs ?? TIER_COSTS[a.tier], base_rate: a.base_rate ?? { source: "ledger" },
    resolution: a.resolution, note: a.note }) as Detector;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `governance/detector/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
