// Signal detection arithmetic for one detector's resolved trials (design: docs/design/SIGNAL_DETECTION_2026-11-07.md,
// build item 3). Pure: no I/O and no records. A caller reads the ledger and passes plain trials in.
//
// A trial is a score, the call made at the time, and the outcome it resolved to. The call is yes when the score is
// at or above the criterion. From the calls: hit rate and false alarm rate with Wilson intervals, and d', c and beta
// under the equal-variance Gaussian model. From the scores: the empirical ROC curve, its area, the expected cost at
// any criterion and the empirical best criterion. From the payoffs and a base rate: the optimal likelihood ratio
// beta*.

export type Call = "yes" | "no";
export type Outcome = "signal" | "noise";
export type Trial = { score: number; call: Call; outcome: Outcome };

/** Magnitudes, all at least 0: the value of a hit and of a correct rejection, the cost of a miss and of a false alarm. */
export type Payoffs = { hit: number; correct_rejection: number; miss: number; false_alarm: number };

export type Counts = { hits: number; misses: number; false_alarms: number; correct_rejections: number };
export type Interval = { estimate: number; low: number; high: number };
export type RocPoint = { criterion: number; hit_rate: number; false_alarm_rate: number; hits: number; false_alarms: number };

// Acklam's rational approximation to the inverse normal CDF, relative error below 1.15e-9 on (0, 1).
const A = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
const B = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
const C = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
const D = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
const P_LOW = 0.02425;

const tail = (q: number): number =>
  (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);

/** z(p): the inverse of the standard normal CDF. 0 gives -Infinity and 1 gives Infinity. */
export function z(p: number): number {
  if (!(p >= 0 && p <= 1)) throw new RangeError(`z: probability ${p} is outside [0, 1]`);
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  if (p < P_LOW) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - P_LOW) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5, r = q * q;
  return (((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q /
    (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
}

/** Wilson score interval for k successes in n trials; null when n is 0. */
export function wilson(k: number, n: number, zCrit = 1.959963984540054): Interval | null {
  if (n === 0) return null;
  const p = k / n, z2 = zCrit * zCrit;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (zCrit / (1 + z2 / n)) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return { estimate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

/** d' = z(H) - z(F). */
export const dPrime = (h: number, f: number): number => z(h) - z(f);
/** c = -(z(H) + z(F)) / 2. Positive is conservative (fewer yes calls). */
export const criterionC = (h: number, f: number): number => -(z(h) + z(f)) / 2;
/** beta, the likelihood ratio at the criterion: ln beta = c * d'. */
export const beta = (h: number, f: number): number => Math.exp(criterionC(h, f) * dPrime(h, f));

/**
 * The log-linear correction (Hautus 1995): add 0.5 to the hits and false alarms and 1 to the signal and noise
 * totals. It is applied to every cell, extreme or not, so an estimate does not jump when a cell first reaches 0,
 * and it keeps H and F strictly inside (0, 1) so d', c and beta are finite.
 */
export function logLinear(counts: Counts): { hit_rate: number; false_alarm_rate: number } {
  return {
    hit_rate: (counts.hits + 0.5) / (counts.hits + counts.misses + 1),
    false_alarm_rate: (counts.false_alarms + 0.5) / (counts.false_alarms + counts.correct_rejections + 1),
  };
}

export function count(trials: readonly Trial[]): Counts {
  const n: Counts = { hits: 0, misses: 0, false_alarms: 0, correct_rejections: 0 };
  for (const t of trials) {
    if (t.outcome === "signal") { if (t.call === "yes") n.hits++; else n.misses++; }
    else if (t.call === "yes") n.false_alarms++;
    else n.correct_rejections++;
  }
  return n;
}

function validPayoffs(p: Payoffs): void {
  for (const [k, v] of Object.entries(p)) if (!(Number.isFinite(v) && v >= 0)) throw new RangeError(`payoff ${k} must be a finite number at least 0, got ${v}`);
}

/**
 * The optimal likelihood ratio: say yes when the evidence's likelihood ratio is at least
 * beta* = P(noise) / P(signal) * (V_CR + C_FA) / (V_H + C_M). With all four payoffs equal it is the odds of noise.
 */
export function optimalBeta(baseRate: number, p: Payoffs): number {
  if (!(baseRate > 0 && baseRate < 1)) throw new RangeError(`base rate ${baseRate} must be strictly between 0 and 1`);
  validPayoffs(p);
  if (p.hit + p.miss === 0) throw new RangeError("the value of a hit plus the cost of a miss must be above 0");
  return ((1 - baseRate) / baseRate) * ((p.correct_rejection + p.false_alarm) / (p.hit + p.miss));
}

const scored = (trials: readonly Trial[]): Trial[] => {
  for (const t of trials) if (Number.isNaN(t.score)) throw new RangeError("a trial's score is NaN");
  return [...trials].sort((a, b) => b.score - a.score);
};

/**
 * The empirical ROC curve: one point per distinct observed score, taken as the criterion (yes when score >= it),
 * from (0, 0) at Infinity to (1, 1) at the lowest score. Null when either class has no trials.
 */
export function roc(trials: readonly Trial[]): RocPoint[] | null {
  const sorted = scored(trials);
  const nS = sorted.filter((t) => t.outcome === "signal").length, nN = sorted.length - nS;
  if (nS === 0 || nN === 0) return null;
  const points: RocPoint[] = [{ criterion: Infinity, hit_rate: 0, false_alarm_rate: 0, hits: 0, false_alarms: 0 }];
  let hits = 0, fas = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].outcome === "signal") hits++; else fas++;
    if (i + 1 < sorted.length && sorted[i + 1].score === sorted[i].score) continue;
    points.push({ criterion: sorted[i].score, hit_rate: hits / nS, false_alarm_rate: fas / nN, hits, false_alarms: fas });
  }
  return points;
}

/** ROC area by the trapezoid rule over the empirical points. Null when either class has no trials. */
export function rocArea(trials: readonly Trial[]): number | null {
  const pts = roc(trials);
  if (!pts) return null;
  let area = 0;
  for (let i = 1; i < pts.length; i++) area += (pts[i].false_alarm_rate - pts[i - 1].false_alarm_rate) * (pts[i].hit_rate + pts[i - 1].hit_rate) / 2;
  return area;
}

/**
 * Two-alternative proportion correct: over every signal and noise pair, 1 when the signal scored higher, 0.5 on a
 * tie. It equals the trapezoid ROC area on the same scores (Green and Swets 1966).
 */
export function twoAfc(trials: readonly Trial[]): number | null {
  const s = trials.filter((t) => t.outcome === "signal").map((t) => t.score);
  const n = trials.filter((t) => t.outcome === "noise").map((t) => t.score);
  if (s.length === 0 || n.length === 0) return null;
  let wins = 0;
  for (const a of s) for (const b of n) wins += a > b ? 1 : a === b ? 0.5 : 0;
  return wins / (s.length * n.length);
}

const meanCost = (c: Counts, p: Payoffs, total: number): number =>
  (c.misses * p.miss + c.false_alarms * p.false_alarm - c.hits * p.hit - c.correct_rejections * p.correct_rejection) / total;

/** Mean cost per trial if every trial were called at this criterion: costs of errors less values of correct calls. */
export function expectedCost(trials: readonly Trial[], criterion: number, p: Payoffs): number | null {
  validPayoffs(p);
  if (trials.length === 0) return null;
  const recalled = trials.map((t) => ({ ...t, call: (t.score >= criterion ? "yes" : "no") as Call }));
  return meanCost(count(recalled), p, trials.length);
}

/**
 * The criterion with the lowest expected cost on these trials. The cost only changes at an observed score, so the
 * search is over the observed scores and Infinity (every call no); the lowest observed score already makes every
 * call yes, so -Infinity adds nothing. This is the Lean theorem best_criterion_observed. Ties go to the higher
 * criterion, which makes fewer yes calls. Null when there are no trials.
 */
export function bestCriterion(trials: readonly Trial[], p: Payoffs): { criterion: number; cost: number } | null {
  validPayoffs(p);
  if (trials.length === 0) return null;
  const sorted = scored(trials);
  const nS = sorted.filter((t) => t.outcome === "signal").length, nN = sorted.length - nS;
  const at = (hits: number, fas: number): number =>
    meanCost({ hits, misses: nS - hits, false_alarms: fas, correct_rejections: nN - fas }, p, sorted.length);
  let best = { criterion: Infinity, cost: at(0, 0) };
  let hits = 0, fas = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].outcome === "signal") hits++; else fas++;
    if (i + 1 < sorted.length && sorted[i + 1].score === sorted[i].score) continue;
    const cost = at(hits, fas);
    if (cost < best.cost) best = { criterion: sorted[i].score, cost };
  }
  return best;
}

export type Summary = {
  trials: number;
  counts: Counts;
  hit_rate: Interval | null;
  false_alarm_rate: Interval | null;
  gaussian: { correction: "log-linear"; hit_rate: number; false_alarm_rate: number; d_prime: number; c: number; beta: number };
  roc_area: number | null;
};

/** Everything that needs no payoffs: rates with Wilson intervals, the corrected Gaussian measures, and ROC area. */
export function summarize(trials: readonly Trial[], zCrit?: number): Summary {
  const counts = count(trials);
  const adj = logLinear(counts);
  return {
    trials: trials.length,
    counts,
    hit_rate: wilson(counts.hits, counts.hits + counts.misses, zCrit),
    false_alarm_rate: wilson(counts.false_alarms, counts.false_alarms + counts.correct_rejections, zCrit),
    gaussian: {
      correction: "log-linear",
      hit_rate: adj.hit_rate,
      false_alarm_rate: adj.false_alarm_rate,
      d_prime: dPrime(adj.hit_rate, adj.false_alarm_rate),
      c: criterionC(adj.hit_rate, adj.false_alarm_rate),
      beta: beta(adj.hit_rate, adj.false_alarm_rate),
    },
    roc_area: rocArea(trials),
  };
}
