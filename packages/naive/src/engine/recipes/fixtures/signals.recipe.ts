// The example recipe from everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md ("The recipe"):
// competitors/[id]/signals.recipe.ts, the one recipe for every competitor's signals record. The sandbox test
// renders it. In a venture its types come from JSON Schema through `naive typegen` (not built); here they are
// declared in the file, and the sandbox erases them before the module runs. No literal here may equal a subject
// id or a signal address.

type Json = null | boolean | number | string | readonly Json[] | { readonly [k: string]: Json };
type JsonObject = { readonly [k: string]: Json };
type Rating = { readonly reliability: "A" | "B" | "C" | "D" | "E" | "F"; readonly credibility: 1 | 2 | 3 | 4 | 5 | 6 };
type SignalView = {
  readonly id: string; readonly type: string; readonly producer: string; readonly subject: string;
  readonly time: number; readonly observed: number; readonly rating: Rating; readonly props: JsonObject;
  readonly withdrawn: boolean;
};
type Input = { readonly route: string; readonly id: string | null; readonly asOf: number; readonly signals: readonly SignalView[]; readonly facts: { readonly markets: readonly string[] | null } };
type Reception = { kind: "salient"; signal: string; fields: string[] } | { kind: "noise"; signal: string; why: string };
type Round = { stage: string; amount: number | null; date: string; signal: string };
type Launch = { name: string; date: string; signal: string; weight: number };
type CompetitorSignals = { funding: Round[]; launches: Launch[]; first_seen: string; last_seen: string; p_raise_90d: number };

export const hears = {
  signals: ["organization@^1", "competitor-funding@^1", "product-launch@^1", "job-posting@^1"],
  facts: { markets: "foundation/icp.json#markets" },
} as const;

export const knobs = { min_rating: "B2", recent_days: 90, launch_weight: 0.25 };

const DAY = 86_400_000;
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const base = (s: SignalView): string => s.type.slice(0, s.type.indexOf("@"));
const atLeast = (r: Rating, min: string): boolean => r.reliability <= min[0] && r.credibility <= Number(min.slice(1));
const prop = (v: Json | undefined, key: string): Json | undefined =>
  v !== null && v !== undefined && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject)[key] : undefined;

function pRaise(lastRoundAt: number | null, recentPosts: number, asOf: number): number {
  const months = lastRoundAt === null ? 24 : (asOf - lastRoundAt) / (30 * DAY);
  const z = -2.4 + 0.08 * Math.min(months, 36) + 0.3 * Math.min(recentPosts, 8);
  return Math.round((1 / (1 + Math.exp(-z))) * 1000) / 1000;
}

export default function render(input: Input, k: typeof knobs): { record: CompetitorSignals | null; receptions: Reception[] } {
  const receptions: Reception[] = [];
  const funding: Round[] = [];
  const launches: Launch[] = [];
  let first: number | null = null, last: number | null = null, lastRoundAt: number | null = null, recentPosts = 0;

  for (const s of input.signals) {
    if (s.withdrawn) { receptions.push({ kind: "noise", signal: s.id, why: "withdrawn as known at as-of" }); continue; }
    const fields: string[] = [];
    switch (base(s)) {
      case "competitor-funding": {
        if (!atLeast(s.rating, k.min_rating)) { receptions.push({ kind: "noise", signal: s.id, why: `rated below ${k.min_rating}` }); continue; }
        const stage = prop(s.props["round"], "stage");
        const amount = prop(s.props["round"], "amount");
        funding.push({ stage: typeof stage === "string" ? stage : "unknown", amount: typeof amount === "number" ? amount : null, date: iso(s.time), signal: s.id });
        lastRoundAt = Math.max(lastRoundAt ?? 0, s.time);
        fields.push("funding", "p_raise_90d");
        break;
      }
      case "product-launch": {
        const market = s.props["market"];
        if (input.facts.markets !== null && typeof market === "string" && !input.facts.markets.includes(market)) {
          receptions.push({ kind: "noise", signal: s.id, why: "launch outside the venture's markets" });
          continue;
        }
        const name = s.props["name"];
        launches.push({ name: typeof name === "string" ? name : "unnamed", date: iso(s.time), signal: s.id, weight: k.launch_weight });
        fields.push("launches");
        break;
      }
      case "job-posting": {
        if (input.asOf - s.time > k.recent_days * DAY) { receptions.push({ kind: "noise", signal: s.id, why: `posted more than ${k.recent_days} days before as-of` }); continue; }
        recentPosts += 1;
        fields.push("p_raise_90d");
        break;
      }
      default:
        break;
    }
    first = first === null ? s.time : Math.min(first, s.time);
    last = last === null ? s.time : Math.max(last, s.time);
    receptions.push({ kind: "salient", signal: s.id, fields: [...fields, "first_seen", "last_seen"] });
  }

  if (first === null || last === null) return { record: null, receptions };
  return { record: { funding, launches, first_seen: iso(first), last_seen: iso(last), p_raise_90d: pRaise(lastRoundAt, recentPosts, input.asOf) }, receptions };
}
