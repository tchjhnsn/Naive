---
publish: false
type: design-note
source: hybrid
created: 2026-11-02T00:00:00Z
ai-model: grok-4.7
authority: advisory
status: DRAFT
tags: [everything-ecosystem, standing-rules, wilson, sprt]
description: "Plain-language list of the Lean theorems for earning and losing a standing rule, and the defaults each one backs."
---

> Copied from everything-ecosystem (docs/design/, main at 2026-11-05) when Naive moved to its own repository (EE-118). This copy is Naive's from now on. Paths it names under site/, platform/, console/ or instance/ stay in everything-ecosystem.

# Standing-rule learning: what the proofs say

The proofs are in [`lean/Naive/StandingRules.lean`](../../lean/Naive/StandingRules.lean). A config module that sets these defaults can cite the theorem names below. This note does not change that module.

Earning a standing rule uses the Wilson score lower bound of the agreement share on the rule's whole answer history. Losing one uses a Wald sequential probability ratio test on recent outcomes, with the running sum floored at 0 after every outcome, so earlier successes cannot bank credit.

The default Wilson `z` is `196/100` (the decimal 1.96). Its square is `2401/625`. The default SPRT uses failure rates `p0 = 1/20` and `p1 = 3/10`, and `alpha = beta = 1/20`.

## How the numbers are proved

The Wilson bound is the usual real formula, including the square root. On an all-success sample the square root cancels and the bound is the rational `n / (n + z^2)`. The bars `0.8` and `0.9` are compared to that rational exactly.

The SPRT is stated with the real logarithm. A run of failures reaches the suspend line exactly when `6^k ≥ 19`, because the logarithm is strictly increasing and turns a product into a sum. The three decimal ranges below are proved interval bounds (Taylor remainder for the logarithm, plus Mathlib's bounds on `log 2`, `log 3` and `log 5`). They are not floats.

Wald's theorem that the test's error rates stay under `alpha` and `beta` is not proved here. The boundary formulas are.

## Earning: Wilson lower bound

For `z > 0`, a sample size `n > 0`, and `k` agreements with `k ≤ n`:

| Theorem | What it says | Default it backs |
|---|---|---|
| `wilsonLower_nonneg` | The lower bound is at least 0. | A share cannot produce a negative score. |
| `wilsonLower_le_share` | The lower bound is at most the agreement share `k/n`. | The score never sits above the observed share. |
| `wilsonLower_mono_successes` | For fixed `n`, more agreements do not lower the bound. | One more agreement cannot make a rule less eligible. |
| `wilsonLower_unanimous` | If every answer agrees, the bound equals `n / (n + z^2)`. | The unanimous case the thresholds use. |
| `unanimousLower_strictMono` | That rational increases as `n` increases, for any `z^2 > 0`. | A longer unanimous history is a stronger score. |
| `unanimous_reaches_low_iff` | At `z = 1.96`, `n` unanimous answers reach `0.8` exactly when `n ≥ 16`. | Low tier: earn at `0.8`. |
| `unanimous_reaches_costly_iff` | At `z = 1.96`, `n` unanimous answers reach `0.9` exactly when `n ≥ 35`. | Costly tier: earn at `0.9`. |
| `ten_unanimous_eq` | Ten unanimous answers score exactly `6250/8651`. | The value the brief prints as `0.722`. |
| `ten_unanimous_below_costly` | `6250/8651 < 0.9`. | Ten unanimous answers do not earn the costly tier. |

`unanimous_reaches_low_iff` and `unanimous_reaches_costly_iff` hold for every natural number `n`, including 0. A sample of size 0 scores 0, so it reaches neither bar.

## Losing: floored SPRT

A failure adds `log (p1/p0)`. A success adds `log ((1-p1)/(1-p0))`. The sum is replaced by 0 whenever it would go negative. The rule suspends when the sum reaches `log ((1-beta)/alpha)`.

| Theorem | What it says | Default it backs |
|---|---|---|
| `failureLogDefault_eq` | The failure step is `log 6`. | `p1/p0 = 6`. |
| `successLogDefault_eq` | The success step is `log (14/19)`. | `(1-p1)/(1-p0) = 14/19`. |
| `suspendThresholdDefault_eq` | The suspend line is `log 19`. | `(1-beta)/alpha = 19`. |
| `sprtCusum_nonneg`, `cusumDefault_nonneg` | After every history the statistic is at least 0. | The floor. |
| `sprtCusum_append_failure` | For any `0 < p0 < p1`, appending a failure adds exactly `log (p1/p0)`. | The floor does not shrink a failure. |
| `cusumDefault_append_failure` | The same fact at the defaults: the addend is `failureLogDefault`. | One failure always costs `log 6`. |
| `pure_failures_reach_iff` | `k` failures from 0 reach the suspend line exactly when `6^k ≥ 19`. | How many pure failures suspend. |
| `one_failure_below_threshold` | One failure from 0 stays below the suspend line. | One failure does not suspend. `6 < 19`. |
| `two_failures_reach_threshold` | Two failures from 0 reach the suspend line. | Two failures in a row suspend. `36 ≥ 19`. |
| `failureLog_bounds` | `log 6` lies in `(1.791, 1.792)`. | The brief's `+1.79`, rounded to two decimals. |
| `suspendThreshold_bounds` | `log 19` lies in `(2.944, 2.945)`. | The brief's `2.94`, rounded to two decimals. |
| `successLog_bounds` | `log (14/19)` lies in `(-0.3054, -0.3053)`. | The brief's `-0.31`, rounded to two decimals. |
| `wald_bounds_reciprocal` | For `0 < alpha < 1`, `log (alpha/(1-alpha)) = -log ((1-alpha)/alpha)`. | The two Wald boundaries are negatives when `alpha = beta`. |
| `wald_upper_pos_of_lt_half` | For `0 < alpha < 1/2`, the upper boundary is positive. | The suspend line sits above 0. |
| `waldLower_eq_neg_upper` | At the defaults, the lower Wald boundary is the negative of the suspend line. | `log (1/19) = -log 19`. |

## What was checked in the research brief

The brief's decision numbers match these proofs. `0.9` needs 35 unanimous answers, `0.8` needs 16, and 10 unanimous answers stay under `0.9`. One failure from 0 does not suspend, and two do. The printed steps `+1.79`, `-0.31` and `2.94` are the proved values rounded to two decimals.

Two figures in the brief are checked outside Lean and are not theorems here. The Wilson table, printed to three decimals, matches a direct evaluation of the same formula. The claim that one dissent reaches `0.9` at 53 answers also matches that evaluation (52 does not, 53 does).
