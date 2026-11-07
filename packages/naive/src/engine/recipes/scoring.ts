// Scoring a recipe (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The metric" and "The eval
// plan", build plan item 5). Pure: no I/O, no clock, no Math.random. Every number here is a function of its
// arguments, and the bootstrap draws from a generator seeded by the plan's sha, so the same rows give the same
// verdict on every run.
//
//   fieldLoss(loss, predicted, settled)     one field's loss from the closed catalog: exact, set-jaccard, abs-scaled
//   brier(p, outcome)                        a forecast's Brier score; a missing forecast counts as 0
//   rowLoss(settles, predicted, settled, o)  one (record, as-of point) row: the weighted mean of its fields' losses;
//                                            a null prediction of a settled record loses every field (1)
//   settledLoss(rows)                        the weighted mean over rows
//   seeded(sha)                              a deterministic generator in [0, 1) from a hex sha (sfc32)
//   blockBootstrap(diffs, blockMs, n, sha)   the standard error of a weighted mean difference, resampling blocks of
//                                            consecutive as-of points
//   verdict(candidate, against, plan, size)  keep (better or smaller), or discard
import { canonicalJson } from "../../core/signal-id.ts";

export type LossFn = "exact" | "set-jaccard" | "abs-scaled";
export type FieldLossSpec = { readonly fn: LossFn; readonly scale?: number; readonly weight?: number };
export type ForecastSpec = { readonly resolved_by: { readonly signals?: readonly string[]; readonly decision?: string }; readonly window: number | string };
export type Settles = {
  readonly horizon: number | string;
  readonly cadence: number | string;
  readonly loss: Readonly<Record<string, FieldLossSpec>>;
  readonly forecasts?: Readonly<Record<string, ForecastSpec>>;
  readonly min_counts: { readonly training: number; readonly dev: number; readonly holdout: number };
};
export type Outcomes = Readonly<Record<string, 0 | 1 | null>>;
/** One scored row: its key (subject and as-of point), the point in milliseconds, its weight and its loss. */
export type RowScore = { readonly key: string; readonly point: number; readonly weight: number; readonly loss: number };

type Obj = Readonly<Record<string, unknown>>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);

/** A duration in milliseconds: seconds as a number, or a number and s, m, h, d or w. */
export function durationMs(d: number | string): number {
  if (typeof d === "number") return d * 1000;
  const m = /^([0-9]+)(s|m|h|d|w)$/.exec(d);
  return m ? Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2] as "s" | "m" | "h" | "d" | "w"] * 1000 : Number.NaN;
}

/** The members of a value taken as a set: a list's entries, one value, or nothing, each as its canonical JSON. An
 *  entry's signal field is left out, so an entry is matched by what it says, not by which of the signals that said
 *  it the fold happened to name (the reference fold names the earliest settled one, which a recipe at t may not
 *  have seen yet). */
function members(v: unknown): Set<string> {
  const list = v === undefined || v === null ? [] : Array.isArray(v) ? v : [v];
  return new Set(list.map((e) => (isObj(e) ? canonicalJson(Object.fromEntries(Object.entries(e).filter(([k]) => k !== "signal"))) : canonicalJson(e))));
}

/**
 * One field's loss, from 0 (right) to 1 (wrong). exact: 0 when the canonical JSON is equal (both missing is equal).
 * set-jaccard: 1 minus the Jaccard index of the two values taken as sets (two empty sets are equal). abs-scaled: the
 * absolute difference over the scale, capped at 1, for two numbers; both missing is 0, anything else 1.
 */
export function fieldLoss(spec: FieldLossSpec, predicted: unknown, settled: unknown): number {
  if (spec.fn === "exact") return canonicalJson(predicted ?? null) === canonicalJson(settled ?? null) ? 0 : 1;
  if (spec.fn === "set-jaccard") {
    const [a, b] = [members(predicted), members(settled)];
    const union = new Set([...a, ...b]);
    if (union.size === 0) return 0;
    let both = 0;
    for (const x of a) if (b.has(x)) both++;
    return 1 - both / union.size;
  }
  if (typeof predicted === "number" && typeof settled === "number" && spec.scale && spec.scale > 0) return Math.min(1, Math.abs(predicted - settled) / spec.scale);
  return (predicted === undefined || predicted === null) && (settled === undefined || settled === null) ? 0 : 1;
}

/** A forecast's Brier score against the outcome. A forecast that is missing or not a probability counts as 0, so a
 *  recipe that says nothing pays for every event that arrived. */
export const brier = (p: unknown, outcome: 0 | 1): number => {
  const q = typeof p === "number" && p >= 0 && p <= 1 ? p : 0;
  return (q - outcome) * (q - outcome);
};

/**
 * One row's loss: the weighted mean of each loss field's loss and each forecast's Brier score (weight 1). A forecast
 * whose outcome is null (not resolvable here) is left out. A null prediction of a record that settled loses every
 * field: 1. A null prediction where nothing settled is right on every field and pays only for its forecasts.
 */
export function rowLoss(settles: Settles, predicted: Obj | null, settled: Obj | null, outcomes: Outcomes = {}): number {
  if (predicted === null && settled !== null) return 1;
  predicted ??= {};
  let sum = 0, weight = 0;
  for (const [field, spec] of Object.entries(settles.loss)) {
    const w = spec.weight ?? 1;
    sum += w * fieldLoss(spec, predicted[field], settled?.[field]);
    weight += w;
  }
  for (const field of Object.keys(settles.forecasts ?? {})) {
    const o = outcomes[field];
    if (o === 0 || o === 1) { sum += brier(predicted[field], o); weight += 1; }
  }
  return weight > 0 ? sum / weight : 0;
}

/** Each field's loss in one row, for feedback: the loss fields, then each forecast with its outcome. */
export function fieldLosses(settles: Settles, predicted: Obj | null, settled: Obj | null, outcomes: Outcomes = {}): Record<string, number> {
  const out: Record<string, number> = {};
  const lost = predicted === null && settled !== null;
  for (const [field, spec] of Object.entries(settles.loss)) out[field] = lost ? 1 : fieldLoss(spec, predicted?.[field], settled?.[field]);
  for (const field of Object.keys(settles.forecasts ?? {})) {
    const o = outcomes[field];
    if (o === 0 || o === 1) out[field] = lost ? 1 : brier(predicted?.[field], o);
  }
  return out;
}

/** The weighted mean of the rows' losses (0 with no rows). */
export function settledLoss(rows: readonly { readonly loss: number; readonly weight: number }[]): number {
  let sum = 0, weight = 0;
  for (const r of rows) { sum += r.weight * r.loss; weight += r.weight; }
  return weight > 0 ? sum / weight : 0;
}

/** A deterministic generator in [0, 1), sfc32 seeded by the first 32 hex characters of a sha. */
export function seeded(sha: string): () => number {
  const hex = (sha.replace(/[^0-9a-f]/gi, "") + "0".repeat(32)).slice(0, 32);
  let [a, b, c, d] = [0, 8, 16, 24].map((i) => parseInt(hex.slice(i, i + 8), 16) >>> 0);
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  return next;
}

/**
 * The standard error of the weighted mean of paired differences, by a block bootstrap: rows fall into blocks of
 * consecutive as-of points (each block spans blockMs from the first point), and each resample draws as many blocks as
 * there are, with replacement, from a generator seeded by the sha. One block gives 0.
 */
export function blockBootstrap(diffs: readonly { readonly point: number; readonly value: number; readonly weight: number }[], blockMs: number, resamples: number, sha: string): number {
  if (diffs.length === 0) return 0;
  const start = Math.min(...diffs.map((d) => d.point));
  const blocks = new Map<number, { sum: number; weight: number }>();
  for (const d of diffs) {
    const k = Math.floor((d.point - start) / blockMs);
    const b = blocks.get(k) ?? { sum: 0, weight: 0 };
    b.sum += d.weight * d.value; b.weight += d.weight;
    blocks.set(k, b);
  }
  const list = [...blocks.entries()].sort(([x], [y]) => x - y).map(([, b]) => b);
  if (list.length < 2) return 0;
  const rand = seeded(sha);
  const means: number[] = [];
  for (let i = 0; i < resamples; i++) {
    let sum = 0, weight = 0;
    for (let j = 0; j < list.length; j++) { const b = list[Math.floor(rand() * list.length)]; sum += b.sum; weight += b.weight; }
    means.push(weight > 0 ? sum / weight : 0);
  }
  const mean = means.reduce((x, y) => x + y, 0) / means.length;
  return Math.sqrt(means.reduce((x, y) => x + (y - mean) * (y - mean), 0) / means.length);
}

export type PlanForVerdict = { readonly sha: string; readonly min_gain: number; readonly bootstrap?: { readonly block: number | string; readonly resamples: number } };
export type Verdict = {
  readonly verdict: "keep" | "discard";
  readonly kept_as?: "better" | "smaller";
  /** tip_score is null when the candidate was scored against the plain fold (a recipe's first write). */
  readonly dev: { readonly score: number; readonly stderr: number; readonly tip_score: number | null; readonly margin: number; readonly rows: number };
  readonly reason: string;
};
/** The bootstrap a plan without one uses: four-week blocks, a thousand resamples. */
export const DEFAULT_BOOTSTRAP = Object.freeze({ block: "28d", resamples: 1000 });
const round = (x: number) => Math.round(x * 1e9) / 1e9;

/**
 * The dev verdict on paired rows. The gain is the weighted mean of (against minus candidate) over the rows both
 * scored; the margin is the larger of min_gain and twice the bootstrap standard error. keep, better: the gain is
 * above the margin. keep, smaller: the candidate is strictly smaller (fewer tokens) and no worse (gain at least 0).
 * Otherwise discard. `against` is the tip, or the baseline (the plain fold) for a recipe's first write.
 */
export function verdict(candidate: readonly RowScore[], against: readonly RowScore[], plan: PlanForVerdict, size: { readonly candidate: number; readonly against: number }): Verdict {
  const tip = new Map(against.map((r) => [r.key, r]));
  const paired = candidate.filter((r) => tip.has(r.key));
  const diffs = paired.map((r) => ({ point: r.point, weight: r.weight, value: (tip.get(r.key) as RowScore).loss - r.loss }));
  const score = settledLoss(paired), tipScore = settledLoss(paired.map((r) => tip.get(r.key) as RowScore));
  const gain = settledLoss(diffs.map((d) => ({ loss: d.value, weight: d.weight })));
  const boot = plan.bootstrap ?? DEFAULT_BOOTSTRAP;
  const stderr = blockBootstrap(diffs, durationMs(boot.block), boot.resamples, plan.sha);
  const margin = Math.max(plan.min_gain, 2 * stderr);
  const dev = { score: round(score), stderr: round(stderr), tip_score: round(tipScore), margin: round(margin), rows: paired.length };
  if (gain > margin) return { verdict: "keep", kept_as: "better", dev, reason: `beats it by ${round(gain)}, above the margin ${round(margin)}` };
  if (size.candidate < size.against && gain >= 0) return { verdict: "keep", kept_as: "smaller", dev, reason: `smaller (${size.candidate} tokens against ${size.against}) and no worse` };
  return { verdict: "discard", dev, reason: gain > 0 ? `beats it by ${round(gain)}, not above the margin ${round(margin)}` : `no better (gain ${round(gain)})` };
}
