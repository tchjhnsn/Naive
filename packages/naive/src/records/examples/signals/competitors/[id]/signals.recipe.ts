// competitors/[id]/signals.recipe.ts: the example venture's recipe for every competitor's signals record
// (autoresearch design, everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The recipe"). It folds
// each competitor-funding signal rated at least min_rating into funding, keeps first_seen and last_seen, and forecasts
// p_raise_90d from the months since the last round. Its types are declared here because naive typegen does not yet
// generate them from JSON Schema; the sandbox erases them before the module runs. No literal here may equal a
// subject id or a signal address.

type Json = null | boolean | number | string | readonly Json[] | { readonly [k: string]: Json };
type JsonObject = { readonly [k: string]: Json };
type Rating = { readonly reliability: string; readonly credibility: number };
type SignalView = {
  readonly id: string; readonly type: string; readonly producer: string; readonly subject: string;
  readonly time: number; readonly observed: number; readonly rating: Rating; readonly props: JsonObject;
  readonly withdrawn: boolean;
};
type Input = { readonly route: string; readonly id: string | null; readonly asOf: number; readonly signals: readonly SignalView[] };
type Entry = { series: string; amount: number | null; currency: string | null; signal: string; support: "supported" | "withdrawn" };
type Reception = { kind: "salient"; signal: string; fields: string[] } | { kind: "noise"; signal: string; why: string };
type CompetitorSignals = { competitor: string; first_seen: string; last_seen: string; funding: Entry[]; p_raise_90d: number };

export const hears = { signals: ["competitor-funding@^1"] } as const;

export const knobs = { min_rating: "B2", raise_base: 0.05, raise_per_month: 0.02 };

const MONTH = 30 * 86_400_000;
const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const atLeast = (r: Rating, min: string): boolean => r.reliability <= min[0] && r.credibility <= Number(min.slice(1));
const field = (v: Json | undefined, key: string): Json | undefined =>
  v !== null && v !== undefined && typeof v === "object" && !Array.isArray(v) ? (v as JsonObject)[key] : undefined;

export default function render(input: Input, k: typeof knobs): { record: CompetitorSignals | null; receptions: Reception[] } {
  const receptions: Reception[] = [];
  const funding: Entry[] = [];
  let first: number | null = null, last: number | null = null;
  for (const s of input.signals) {
    if (!atLeast(s.rating, k.min_rating)) { receptions.push({ kind: "noise", signal: s.id, why: `rated below ${k.min_rating}` }); continue; }
    const series = field(s.props["round"], "series"), amount = field(s.props["round"], "amount"), currency = field(s.props["round"], "currency");
    funding.push({ series: typeof series === "string" ? series : "unknown", amount: typeof amount === "number" ? amount : null,
      currency: typeof currency === "string" ? currency : null, signal: s.id, support: s.withdrawn ? "withdrawn" : "supported" });
    if (!s.withdrawn) {
      first = first === null ? s.time : Math.min(first, s.time);
      last = last === null ? s.time : Math.max(last, s.time);
    }
    receptions.push({ kind: "salient", signal: s.id, fields: ["funding", "first_seen", "last_seen", "p_raise_90d"] });
  }
  if (first === null || last === null || input.id === null) return { record: null, receptions };
  const months = (input.asOf - last) / MONTH;
  const p = Math.min(1, Math.max(0, k.raise_base + k.raise_per_month * months));
  return { record: { competitor: input.id, first_seen: day(first), last_seen: day(last), funding, p_raise_90d: Math.round(p * 1000) / 1000 }, receptions };
}
