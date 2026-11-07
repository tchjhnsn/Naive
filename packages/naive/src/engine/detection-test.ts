// Tests the signal detection arithmetic (packages/naive/src/engine/detection.ts) against worked examples from
// Macmillan and Creelman's Detection Theory, known normal quantiles, and properties that must hold on any ledger.
//
//   node packages/naive/src/engine/detection-test.ts

import { bestCriterion, beta, count, criterionC, dPrime, expectedCost, logLinear, optimalBeta, roc, rocArea, summarize, twoAfc, wilson, z } from "./detection.ts";
import type { Payoffs, Trial } from "./detection.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const near = (a: number | null | undefined, b: number, tol = 1e-6): boolean => typeof a === "number" && Math.abs(a - b) <= tol;
const throws = (f: () => unknown): boolean => { try { f(); return false; } catch { return true; } };
const trial = (score: number, outcome: Trial["outcome"], call: Trial["call"] = "no"): Trial => ({ score, call, outcome });
const equal: Payoffs = { hit: 1, correct_rejection: 1, miss: 1, false_alarm: 1 };

const quantiles: [number, number][] = [
  [1e-10, -6.361340902], [0.001, -3.090232306], [0.01, -2.326347874], [0.025, -1.959963985],
  [0.1, -1.281551566], [0.31, -0.495850347], [0.5, 0], [0.69, 0.495850347], [0.8, 0.841621234], [0.975, 1.959963985], [0.999, 3.090232306],
];
for (const [p, q] of quantiles) expect(`z(${p}) = ${q}`, near(z(p), q, 1e-7 * Math.max(1, Math.abs(q))), String(z(p)));
expect("z(0) is -Infinity and z(1) is Infinity", z(0) === -Infinity && z(1) === Infinity);
expect("z refuses a probability outside [0, 1] and NaN", throws(() => z(-0.1)) && throws(() => z(1.1)) && throws(() => z(NaN)));
expect("z is symmetric about 0.5", near(z(0.3) + z(0.7), 0, 1e-12) && near(z(0.01) + z(0.99), 0, 1e-12));

// Macmillan and Creelman, chapter 1: H = .69, F = .31 gives d' near 1; H = .8, F = .2 gives 1.68; neutral criterion.
expect("M&C: H .69, F .31 gives d' 0.99", near(dPrime(0.69, 0.31), 0.99, 0.005), String(dPrime(0.69, 0.31)));
expect("M&C: H .69, F .31 is unbiased, c 0 and beta 1", near(criterionC(0.69, 0.31), 0, 1e-12) && near(beta(0.69, 0.31), 1, 1e-12));
expect("M&C: H .8, F .2 gives d' 1.68", near(dPrime(0.8, 0.2), 1.68, 0.005), String(dPrime(0.8, 0.2)));
expect("M&C: H .9, F .1 gives d' 2.56", near(dPrime(0.9, 0.1), 2.56, 0.005), String(dPrime(0.9, 0.1)));
// Chapter 2: H .8, F .4 is a liberal observer, c = -0.29 and ln beta = c * d'.
expect("M&C: H .8, F .4 gives c -0.29", near(criterionC(0.8, 0.4), -0.294, 0.001), String(criterionC(0.8, 0.4)));
expect("ln beta = (z(F)^2 - z(H)^2) / 2", near(Math.log(beta(0.8, 0.4)), (z(0.4) ** 2 - z(0.8) ** 2) / 2, 1e-12));
expect("a conservative observer (H .6, F .1) has c > 0 and beta > 1", criterionC(0.6, 0.1) > 0 && beta(0.6, 0.1) > 1);
expect("raw rates of 1 and 0 give an infinite d'", dPrime(1, 0) === Infinity);

const w = wilson(8, 10);
expect("Wilson 8 of 10 at 95% is (0.490, 0.943)", near(w?.low, 0.4902, 1e-4) && near(w?.high, 0.9433, 1e-4) && w?.estimate === 0.8, JSON.stringify(w));
const w0 = wilson(0, 20), wn = wilson(20, 20);
expect("Wilson 0 of 20 starts at 0 and stays above 0 on top", w0?.low === 0 && near(w0?.high, 0.1611, 1e-4), JSON.stringify(w0));
expect("Wilson 20 of 20 ends at 1", wn?.high === 1 && near(wn?.low, 0.8389, 1e-4), JSON.stringify(wn));
expect("Wilson of no trials is null", wilson(0, 0) === null);

const ll = logLinear({ hits: 10, misses: 0, false_alarms: 0, correct_rejections: 10 });
expect("log-linear: 10 of 10 hits is 10.5 / 11, 0 of 10 false alarms is 0.5 / 11", near(ll.hit_rate, 10.5 / 11, 1e-12) && near(ll.false_alarm_rate, 0.5 / 11, 1e-12));
const perfect = summarize([...Array.from({ length: 10 }, () => trial(0.9, "signal", "yes")), ...Array.from({ length: 10 }, () => trial(0.1, "noise", "no"))]);
expect("a perfect ledger gives a finite d', named as log-linear", Number.isFinite(perfect.gaussian.d_prime) && perfect.gaussian.correction === "log-linear" && near(perfect.gaussian.d_prime, 2 * z(10.5 / 11), 1e-12), JSON.stringify(perfect.gaussian));
expect("a perfect ledger has ROC area 1", perfect.roc_area === 1);

const ledger: Trial[] = [
  trial(0.9, "signal", "yes"), trial(0.8, "signal", "yes"), trial(0.7, "noise", "yes"), trial(0.6, "signal", "no"),
  trial(0.6, "noise", "no"), trial(0.4, "noise", "no"), trial(0.3, "signal", "no"), trial(0.2, "noise", "no"),
];
expect("counts come from the calls", JSON.stringify(count(ledger)) === JSON.stringify({ hits: 2, misses: 2, false_alarms: 1, correct_rejections: 3 }));
const s = summarize(ledger);
expect("summary: H 0.5, F 0.25 with intervals", s.hit_rate?.estimate === 0.5 && s.false_alarm_rate?.estimate === 0.25 && (s.hit_rate?.low ?? 1) < 0.5 && s.trials === 8);
expect("summary: no noise trials gives a null false alarm rate and ROC area", summarize([trial(1, "signal", "yes")]).false_alarm_rate === null && summarize([trial(1, "signal", "yes")]).roc_area === null);

const pts = roc(ledger) ?? [];
expect("ROC starts at (0, 0) at Infinity and ends at (1, 1)", pts[0].criterion === Infinity && pts[0].hit_rate === 0 && pts.at(-1)?.hit_rate === 1 && pts.at(-1)?.false_alarm_rate === 1);
expect("ROC has one point per distinct score plus the origin", pts.length === 8, String(pts.length));
expect("ROC: raising the criterion never raises H or F (roc_monotone)", pts.every((p, i) => i === 0 || (p.hit_rate >= pts[i - 1].hit_rate && p.false_alarm_rate >= pts[i - 1].false_alarm_rate)));
expect("ROC of one class is null", roc([trial(1, "noise")]) === null && rocArea([]) === null && twoAfc([]) === null);

const ties: Trial[] = [trial(3, "signal"), trial(2, "signal"), trial(2, "signal"), trial(2, "noise"), trial(1, "noise")];
expect("ties count half: 2AFC on the hand example is 5/6", near(twoAfc(ties), 5 / 6, 1e-12), String(twoAfc(ties)));
expect("trapezoid ROC area equals 2AFC with ties (auc_eq_2afc)", near(rocArea(ties), 5 / 6, 1e-12), String(rocArea(ties)));
expect("all scores equal gives area 0.5", rocArea([trial(1, "signal"), trial(1, "noise")]) === 0.5);
expect("reversed scores give area 0", rocArea([trial(0, "signal"), trial(1, "noise")]) === 0);
expect("a NaN score is refused", throws(() => roc([trial(NaN, "signal"), trial(1, "noise")])));

expect("beta*: equal payoffs at base rate 0.5 is 1", optimalBeta(0.5, equal) === 1);
expect("beta*: equal payoffs at base rate 0.2 is the noise odds, 4", near(optimalBeta(0.2, equal), 4, 1e-12));
expect("beta*: a costlier miss lowers it, a costlier false alarm raises it (criterion_monotone)",
  optimalBeta(0.5, { ...equal, miss: 3 }) < 1 && optimalBeta(0.5, { ...equal, false_alarm: 3 }) > 1 && optimalBeta(0.1, equal) > optimalBeta(0.3, equal));
expect("beta*: correct rejections and false alarms worth three times hits and misses, at even odds, is 3", near(optimalBeta(0.5, { hit: 1, miss: 1, correct_rejection: 3, false_alarm: 3 }), 3, 1e-12));
expect("beta* refuses a base rate of 0 or 1, a negative payoff, and zero hit value plus miss cost",
  throws(() => optimalBeta(0, equal)) && throws(() => optimalBeta(1, equal)) && throws(() => optimalBeta(0.5, { ...equal, miss: -1 })) && throws(() => optimalBeta(0.5, { ...equal, hit: 0, miss: 0 })));

expect("expected cost at 0.65 on the ledger: 2 hits, 2 misses, 1 FA, 3 CR is -0.25", near(expectedCost(ledger, 0.65, equal), (2 + 1 - 2 - 3) / 8, 1e-12));
expect("expected cost re-calls by score, not by the recorded call", near(expectedCost(ledger, Infinity, equal), (4 - 4) / 8, 1e-12));
expect("expected cost of no trials is null", expectedCost([], 0.5, equal) === null);
const b = bestCriterion(ledger, equal);
expect("best criterion on the ledger is 0.8 with cost -0.5", b?.criterion === 0.8 && near(b?.cost, -0.5, 1e-12), JSON.stringify(b));
const costlyMiss = bestCriterion(ledger, { ...equal, miss: 10 });
expect("a costly miss moves the best criterion down to the lowest signal score", costlyMiss?.criterion === 0.3, JSON.stringify(costlyMiss));
expect("all-noise ledger: best is Infinity, say no to everything", bestCriterion([trial(0.5, "noise"), trial(0.9, "noise")], equal)?.criterion === Infinity);
expect("best criterion of no trials is null", bestCriterion([], equal) === null);

let seed = 7;
const rand = (): number => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let auc = true, observed = true, cheapest = true;
for (let run = 0; run < 200; run++) {
  const n = 2 + Math.floor(rand() * 40);
  const ts: Trial[] = Array.from({ length: n }, () => {
    const outcome = rand() < 0.4 ? "signal" : "noise";
    return trial(Math.round((rand() + (outcome === "signal" ? 0.4 : 0)) * 10) / 10, outcome);
  });
  const area = rocArea(ts), pc = twoAfc(ts);
  if (!((area === null && pc === null) || near(area, pc ?? NaN, 1e-12))) auc = false;
  const p: Payoffs = { hit: rand() * 3, correct_rejection: rand() * 3, miss: rand() * 3 + 0.01, false_alarm: rand() * 3 };
  const best = bestCriterion(ts, p);
  if (!best || !(best.criterion === Infinity || ts.some((t) => t.score === best.criterion))) observed = false;
  for (const c of [-Infinity, -1, 0, 0.05, 0.25, 0.55, 0.75, 1.05, 1.4, 2, Infinity, ...ts.map((t) => t.score)]) {
    const cost = expectedCost(ts, c, p);
    if (best && cost !== null && cost < best.cost - 1e-12) cheapest = false;
  }
  if (best && !near(expectedCost(ts, best.criterion, p), best.cost, 1e-12)) cheapest = false;
}
expect("200 random ledgers with ties: trapezoid ROC area equals 2AFC", auc);
expect("200 random ledgers: the best criterion is an observed score or Infinity (best_criterion_observed)", observed);
expect("200 random ledgers: no criterion is cheaper than the best one", cheapest);

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("detection: all passed");
