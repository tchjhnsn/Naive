// Outcomes: what is settled about a subject, and what a recipe sees, at one as-of point (everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The metric", build plan item 5). Pure: every input is an argument.
//
// Only people and producers resolve outcomes, so no agent can label its own work:
//   - a person: a signal in the venture's local library whose provenance line is a person's (by "person"), including
//     one that supersedes another;
//   - a producer: a signal in a library the venture reads (by "producer"), which counts once a second producer reports
//     the same claim, or a person states it;
//   - anything else (a local signal an agent wrote, or one with no provenance line: by "other") resolves nothing.
//
//   settledSignals(known, t, horizon)       the signals that count at point t: settled by t + horizon
//   settledRecord(known, types, pattern, subject, t, horizon)   the reference fold of the settled claims with valid
//                                            time at or before t, as the signal types' own projections fold them
//   forecastOutcome(known, ranges, subject, t, window, horizon)   1 when a settled signal of those types about the
//                                            subject has a valid time in (t, t + window], else 0
//   baselineRecord(known, types, pattern, subject, t)   the plain fold of every signal observed by t: the baseline
//   recipeInput(known, ranges, pattern, subject, t, facts)   what a recipe is given: the heard signals observed by t,
//                                            in (time, id) order, with withdrawn as known at t
import { canonicalJson } from "../../core/signal-id.ts";
import { fill, render, resolveType, satisfies, splitRange, timeThenId, withdraw } from "../signals.ts";
import type { Listener, Signal, SignalType } from "../../records/types/records.d.ts";

export type Author = "person" | "producer" | "other";
/** A signal in the frozen index: its library (`local` for the venture's own raw/signals/) and who stands behind it. */
export type Known = { readonly signal: Signal; readonly library: string; readonly by: Author };
type Obj = Record<string, unknown>;

/** A signal time in milliseconds: a date is midnight UTC. */
export const timeMs = (t: string): number => Date.parse(t.length === 10 ? `${t}T00:00:00Z` : t);

/** Whether a signal is of a type one of the ranges names. */
export function inRanges(signal: Signal, ranges: readonly string[]): boolean {
  const [id, version] = splitRange(signal.type);
  return ranges.some((r) => { const [rid, range] = splitRange(r); return rid === id && satisfies(version, range); });
}

const read = (o: unknown, path: string): unknown => path.split(".").reduce<unknown>((n, k) => (n !== null && typeof n === "object" && !Array.isArray(n) ? (n as Obj)[k] : undefined), o);

/** What a signal claims, so two producers' reports of one thing match: its type, subject and the values its type's
 *  first append fold is unique by, or its whole props when the type has none. */
export function claimKey(signal: Signal, types: readonly SignalType[]): string {
  const [id, version] = splitRange(signal.type);
  const type = resolveType(types, id, version);
  const unique = type?.projects.flatMap((p) => Object.values(p.fields)).find((f) => f.reducer === "append" && f.unique_by?.length)?.unique_by;
  const view = { subject: signal.subject, props: signal.props };
  return canonicalJson([id, signal.subject, unique ? unique.map((p) => read(view, p)) : signal.props]);
}

/**
 * The signals that count at point t: observed by t + horizon, from a person or a producer, and for a producer's claim,
 * reported by a second producer or stated by a person by then. A producer's retraction counts (it adds no claim; the
 * fold lets a producer withdraw only its own signal). A local signal nobody can show a person wrote counts for nothing.
 */
export function settledSignals(known: readonly Known[], types: readonly SignalType[], t: number, horizon: number): Known[] {
  const cut = t + horizon;
  const pool = known.filter((k) => k.by !== "other" && timeMs(k.signal.observed) <= cut);
  const claims = new Map<string, { producers: Set<string>; person: boolean }>();
  for (const k of pool) {
    if (k.signal.retracts) continue;
    const key = claimKey(k.signal, types);
    const c = claims.get(key) ?? { producers: new Set<string>(), person: false };
    if (k.by === "person") c.person = true;
    else c.producers.add(k.signal.producer);
    claims.set(key, c);
  }
  return pool.filter((k) => {
    if (k.by === "person" || k.signal.retracts) return true;
    const c = claims.get(claimKey(k.signal, types));
    return c !== undefined && (c.person || c.producers.size >= 2);
  });
}

/** One project listener per signal type that projects to the pattern, hearing the type's major with no criterion:
 *  the plain fold, as the types' own projections write it. */
export function plainListeners(types: readonly SignalType[], pattern: string): Listener[] {
  const seen = new Map<string, Listener>();
  for (const t of types) {
    if (!t.projects.some((p) => p.route === pattern)) continue;
    const hears = `${t.id}@^${t.version.split(".")[0]}`;
    if (!seen.has(hears)) seen.set(hears, { id: `plain-${t.id}-${t.version.split(".")[0]}`, hears, consumer: { route: pattern }, then: "project" });
  }
  return [...seen.values()];
}

/** The plain fold of these signals for one subject at the pattern, or null when nothing folds into it. */
export function foldFor(signals: readonly Known[], types: readonly SignalType[], pattern: string, subject: string): Obj | null {
  const r = render({ signals: signals.filter((k) => k.signal.subject === subject).map((k) => ({ signal: k.signal, library: k.library })), types, listeners: plainListeners(types, pattern) });
  if (r.status !== "rendered") return null;
  return r.records.find((x) => x.route === fill(pattern, subject))?.record ?? null;
}

/** The settled record at point t: the plain fold of the settled claims with valid time at or before t, and every
 *  settled retraction or supersession observed by t + horizon. */
export function settledRecord(known: readonly Known[], types: readonly SignalType[], pattern: string, subject: string, t: number, horizon: number): Obj | null {
  const settled = settledSignals(known.filter((k) => k.signal.subject === subject), types, t, horizon)
    .filter((k) => k.signal.retracts || timeMs(k.signal.time) <= t);
  return foldFor(settled, types, pattern, subject);
}

/** 1 when a settled signal of the resolving types about the subject has a valid time in (t, t + window]; else 0. It
 *  is settled as of t plus the longer of the window and the horizon. */
export function forecastOutcome(known: readonly Known[], types: readonly SignalType[], ranges: readonly string[], subject: string, t: number, window: number, horizon: number): 0 | 1 {
  const settled = settledSignals(known.filter((k) => k.signal.subject === subject && inRanges(k.signal, ranges)), types, t, Math.max(window, horizon));
  const withdrawn = withdraw(settled.map((k) => ({ signal: k.signal, library: k.library }))).withdrawn;
  return settled.some((k) => !k.signal.retracts && !withdrawn.has(k.signal.id) && timeMs(k.signal.time) > t && timeMs(k.signal.time) <= t + window) ? 1 : 0;
}

/** The baseline at point t: the plain fold of every signal about the subject observed by t, whoever wrote it. */
export function baselineRecord(known: readonly Known[], types: readonly SignalType[], pattern: string, subject: string, t: number): Obj | null {
  return foldFor(known.filter((k) => timeMs(k.signal.observed) <= t), types, pattern, subject);
}

/** A signal as a recipe sees it: times in milliseconds, and whether it is withdrawn as known at the as-of point. */
export type SignalView = { id: string; type: string; producer: string; subject: string; time: number; observed: number; rating: Signal["rating"]; props: Obj; withdrawn: boolean };
export type RecipeInput = { route: string; id: string; asOf: number; signals: SignalView[]; facts: Record<string, unknown> };

/** What a recipe is given at point t: every heard signal about the subject observed by t (a retraction only withdraws
 *  and is not passed), in (time, id) order, with withdrawn as known at t, and the named facts as of t. */
export function recipeInput(known: readonly Known[], ranges: readonly string[], pattern: string, subject: string, t: number, facts: Record<string, unknown> = {}): RecipeInput {
  const seen = known.filter((k) => k.signal.subject === subject && timeMs(k.signal.observed) <= t);
  const withdrawn = withdraw(seen.map((k) => ({ signal: k.signal, library: k.library }))).withdrawn;
  const signals = seen.filter((k) => !k.signal.retracts && inRanges(k.signal, ranges)).map((k) => k.signal).sort(timeThenId).map((s) => ({
    id: s.id, type: s.type, producer: s.producer, subject: s.subject, time: timeMs(s.time), observed: timeMs(s.observed), rating: s.rating, props: s.props as Obj, withdrawn: withdrawn.has(s.id),
  }));
  return { route: pattern, id: subject, asOf: t, signals, facts };
}
