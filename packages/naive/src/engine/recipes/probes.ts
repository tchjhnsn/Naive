// Probes: surfacing a deterministic share of noise anyway, so a recipe can be scored on signals the current one never
// surfaced (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "Noise stored beside the record",
// optional probes, build plan item 10). Pure: no I/O but reading naive.config.json in probeRate.
//
//   probeRate(dir)                          research.probe_rate in naive.config.json, 0 when unset (probes cost attention)
//   probed(consumer, signal, rate)          whether this consumer probes this signal: a draw from sha256, below the rate
//   markProbes(consumer, receptions, rate)  the receptions with probe { rate } on each probed noise reception
//   propensity(reception)                   the chance the signal was surfaced: 1 salient, the rate probed noise, else 0
//   ipwEstimate(logged, surfaces)           a candidate's mean outcome from what was surfaced, by inverse propensity
//
// The draw depends on the consumer (the record's path) and the signal's id only, not on the recipe, so the share a
// consumer probes holds still while recipes change, and two consumers that hear one signal draw apart. Who reads it:
// the pull marks probes when it writes reception files, which is build plan item 9 (not built).
import { createHash } from "node:crypto";
import { rawConfig } from "../naive-config.mjs";

/** What a probed noise reception carries: the rate it was drawn at, which is its propensity. */
export type Probe = { rate: number };
type Reception = { signal: string; kind: string; probe?: Probe };

/** research.probe_rate in the venture's naive.config.json: a share from 0 to 1, and 0 when unset. */
export function probeRate(dir: string): number {
  const rate = (rawConfig(dir) as { research?: { probe_rate?: unknown } }).research?.probe_rate;
  return typeof rate === "number" && rate >= 0 && rate <= 1 ? rate : 0;
}

/** The consumer's draw for a signal: the first 52 bits of sha256("<consumer>\n<signal>") as a share in [0, 1). */
export function draw(consumer: string, signal: string): number {
  const hex = createHash("sha256").update(`${consumer}\n${signal}`).digest("hex").slice(0, 13);
  return parseInt(hex, 16) / 2 ** 52;
}

export const probed = (consumer: string, signal: string, rate: number): boolean => rate > 0 && draw(consumer, signal) < rate;

/** The receptions with probe { rate } added to each noise reception this consumer probes. A salient reception is
 *  surfaced already and is never marked; a reception that carries a probe already keeps it. */
export function markProbes<R extends Reception>(consumer: string, receptions: readonly R[], rate: number): (R & { probe?: Probe })[] {
  return receptions.map((r) => (r.kind === "noise" && !r.probe && probed(consumer, r.signal, rate) ? { ...r, probe: { rate } } : r));
}

/** The chance the signal was surfaced to a person: 1 when salient, the rate when a probed noise reception, else 0. */
export function propensity(r: Reception): number {
  if (r.kind === "salient") return 1;
  return r.probe && r.probe.rate > 0 ? r.probe.rate : 0;
}

/** One logged reception and its outcome: what a person made of the signal once it was surfaced (from 0 to 1), null
 *  when nothing has resolved it yet or it was never surfaced. */
export type Logged = Reception & { outcome: number | null };
export type Estimate = {
  /** Horvitz and Thompson: the sum of outcome over propensity, for surfaced signals the candidate surfaces, over n. */
  estimate: number | null;
  /** Self-normalized: the same sum over the sum of the weights used. Lower variance, slightly biased. */
  normalized: number | null;
  /** Receptions counted: every one but a surfaced one whose outcome is not in yet. */
  n: number;
  /** Surfaced receptions with an outcome that the candidate also surfaces. */
  used: number;
  /** Kish's effective sample size of the weights used. */
  ess: number;
};

/**
 * A candidate recipe's mean outcome, estimated from the receptions a current recipe logged. Only a surfaced signal has
 * an outcome, so each one the candidate would also surface counts with weight 1 over its propensity, and a signal the
 * current recipe left unprobed noise counts as 0 in the mean, as inverse propensity weighting does. With no probes,
 * a candidate that surfaces what the current one called noise is scored on nothing there, which is why probes exist.
 */
export function ipwEstimate(logged: readonly Logged[], surfaces: (_signal: string) => boolean): Estimate {
  let sum = 0, weights = 0, squares = 0, used = 0, n = 0;
  for (const r of logged) {
    const p = propensity(r);
    if (p > 0 && r.outcome === null) continue;
    n++;
    if (p === 0 || r.outcome === null || !surfaces(r.signal)) continue;
    const w = 1 / p;
    sum += w * r.outcome; weights += w; squares += w * w; used++;
  }
  return { estimate: n ? sum / n : null, normalized: weights ? sum / weights : null, n, used, ess: squares ? (weights * weights) / squares : 0 };
}
