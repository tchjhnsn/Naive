module

import Mathlib.Analysis.Complex.ExponentialBounds
import Mathlib.Analysis.SpecialFunctions.Log.Deriv
import Mathlib.Tactic.FieldSimp
import Mathlib.Tactic.GCongr
import Mathlib.Tactic.Linarith
import Mathlib.Tactic.NormNum
import Mathlib.Tactic.Positivity
import Mathlib.Tactic.Ring

/-
  Standing-rule learning and unlearning.

  Earning a rule uses the Wilson score lower bound of the agreement share on the rule's whole
  answer history. Losing a rule uses a Wald sequential probability ratio test on recent outcomes,
  reset at 0 in the style of a CUSUM, so earlier successes cannot bank credit.

  The Wilson bound is the usual real expression, so it lives in Mathlib's reals (the square root
  is irrational for a mixed sample). The all-success case simplifies to the rational `n / (n + z^2)`.
  The default `z` is `196 / 100`, the decimal 1.96, and `z^2` is `2401 / 625`.

  The SPRT is stated with `Real.log`. Comparisons of pure failure runs reduce to integer
  comparisons because `log` is strictly increasing and turns products into sums. The decimal
  bounds on `log 6`, `log 19` and `log (14 / 19)` are proved from Mathlib's bounds on `log 2`,
  `log 3` and `log 5`, plus the Taylor estimate `Real.abs_log_sub_add_sum_range_le`. No decimal
  in those theorems is a float.

  Wald's type I and type II error guarantees are not proved here.
-/

noncomputable section

open Finset

/-! ## Wilson lower bound -/

/-- Default Wilson `z`, the decimal 1.96. -/
def wilsonZDefault : ℝ := 196 / 100

/-- `wilsonZDefault ^ 2`. -/
def wilsonZSqDefault : ℝ := 2401 / 625

theorem wilsonZDefault_sq : wilsonZDefault ^ 2 = wilsonZSqDefault := by
  unfold wilsonZDefault wilsonZSqDefault
  norm_num

/-- Wilson lower bound of an all-success sample of size `n`, at `z^2 = c`: `n / (n + c)`. -/
def unanimousLower (c : ℝ) (n : ℕ) : ℝ :=
  (n : ℝ) / ((n : ℝ) + c)

private def wilsonRadicand (c n p : ℝ) : ℝ :=
  c * p * (1 - p) / n + c ^ 2 / (4 * n ^ 2)

private def wilsonNum (c n p : ℝ) : ℝ :=
  p + c / (2 * n) - Real.sqrt (wilsonRadicand c n p)

private def wilsonDen (c n : ℝ) : ℝ :=
  1 + c / n

/-- Wilson score lower bound for `k` agreements in `n` answers, at the given `z` (`z ≥ 0`).

`p = k / n`, `c = z^2`, and the value is
`(p + c / (2n) - sqrt(c * p * (1 - p) / n + c^2 / (4n^2))) / (1 + c / n)`. -/
def wilsonLower (z : ℝ) (n k : ℕ) : ℝ :=
  wilsonNum (z ^ 2) (n : ℝ) ((k : ℝ) / n) / wilsonDen (z ^ 2) (n : ℝ)

private lemma sqrt_radicand_ge {c n p : ℝ} (hc : 0 ≤ c) (hn : 0 < n) (hp0 : 0 ≤ p) (hp1 : p ≤ 1) :
    c / (2 * n) ≤ Real.sqrt (wilsonRadicand c n p) := by
  have hv : 0 ≤ wilsonRadicand c n p := by
    unfold wilsonRadicand
    positivity
  have hc2 : 0 ≤ c / (2 * n) := by positivity
  rw [Real.le_sqrt hc2 hv]
  unfold wilsonRadicand
  have hpow : (c / (2 * n)) ^ 2 = c ^ 2 / (4 * n ^ 2) := by
    field_simp
    ring
  have hrest : 0 ≤ c * p * (1 - p) / n := by positivity
  linarith

private lemma wilsonNum_nonneg {c n p : ℝ} (hc : 0 ≤ c) (hn : 0 < n) (hp0 : 0 ≤ p) (hp1 : p ≤ 1) :
    0 ≤ wilsonNum c n p := by
  unfold wilsonNum
  have hA : 0 ≤ p + c / (2 * n) := by positivity
  have hv : 0 ≤ wilsonRadicand c n p := by
    unfold wilsonRadicand
    positivity
  have hsq : wilsonRadicand c n p ≤ (p + c / (2 * n)) ^ 2 := by
    unfold wilsonRadicand
    have hid :
        (p + c / (2 * n)) ^ 2 - (c * p * (1 - p) / n + c ^ 2 / (4 * n ^ 2)) =
          p ^ 2 * (1 + c / n) := by
      field_simp
      ring
    have hnn : 0 ≤ p ^ 2 * (1 + c / n) := by positivity
    linarith
  have hs : Real.sqrt (wilsonRadicand c n p) ≤ p + c / (2 * n) :=
    (Real.sqrt_le_iff).2 ⟨hA, hsq⟩
  linarith

private lemma wilsonDen_pos {c n : ℝ} (hc : 0 ≤ c) (hn : 0 < n) : 0 < wilsonDen c n := by
  unfold wilsonDen
  positivity

private lemma wilsonAt_le_share {c n p : ℝ} (hc : 0 < c) (hn : 0 < n) (hp0 : 0 ≤ p) (hp1 : p ≤ 1) :
    wilsonNum c n p / wilsonDen c n ≤ p := by
  have hden : 0 < wilsonDen c n := wilsonDen_pos (le_of_lt hc) hn
  rw [div_le_iff₀ hden]
  unfold wilsonNum wilsonDen
  have hleft : (c / n) * (1 / 2 - p) = c / (2 * n) - p * (c / n) := by
    field_simp
  have hscale : p * (1 + c / n) = p + p * (c / n) := by
    ring
  rw [hscale]
  suffices (c / n) * (1 / 2 - p) ≤ Real.sqrt (wilsonRadicand c n p) by linarith
  by_cases hhalf : 1 / 2 ≤ p
  · have hnonpos : (c / n) * (1 / 2 - p) ≤ 0 := by
      have hcn : 0 < c / n := by positivity
      nlinarith
    exact hnonpos.trans (Real.sqrt_nonneg _)
  · push Not at hhalf
    have hleft_nonneg : 0 ≤ (c / n) * (1 / 2 - p) := by
      have hcn : 0 < c / n := by positivity
      nlinarith
    have hv : 0 ≤ wilsonRadicand c n p := by
      unfold wilsonRadicand
      positivity
    rw [Real.le_sqrt hleft_nonneg hv]
    unfold wilsonRadicand
    have hid :
        (c * p * (1 - p) / n + c ^ 2 / (4 * n ^ 2)) - ((c / n) * (1 / 2 - p)) ^ 2 =
          c * p * (1 - p) * (n + c) / n ^ 2 := by
      field_simp
      ring
    have hnn : 0 ≤ c * p * (1 - p) * (n + c) / n ^ 2 := by positivity
    linarith

private lemma wilsonNum_mono {c n p p' : ℝ} (hc : 0 < c) (hn : 0 < n) (hp0 : 0 ≤ p) (hp : p ≤ p')
    (hp1 : p' ≤ 1) : wilsonNum c n p ≤ wilsonNum c n p' := by
  set v := wilsonRadicand c n p
  set v' := wilsonRadicand c n p'
  set s := Real.sqrt v
  set s' := Real.sqrt v'
  have hp0' : 0 ≤ p' := le_trans hp0 hp
  have hp1p : p ≤ 1 := le_trans hp hp1
  have hs : c / (2 * n) ≤ s := sqrt_radicand_ge (le_of_lt hc) hn hp0 hp1p
  have hs' : c / (2 * n) ≤ s' := sqrt_radicand_ge (le_of_lt hc) hn hp0' hp1
  have hdiff : v' - v = (c / n) * (p' - p) * (1 - p - p') := by
    unfold v v' wilsonRadicand
    field_simp
    ring
  have hv : 0 ≤ v := by
    unfold v wilsonRadicand
    positivity
  have hv' : 0 ≤ v' := by
    unfold v' wilsonRadicand
    positivity
  have hsv : s ^ 2 = v := Real.sq_sqrt hv
  have hsv' : s' ^ 2 = v' := Real.sq_sqrt hv'
  have hprod : (s' - s) * (s' + s) = v' - v := by
    nlinarith [hsv, hsv']
  by_cases hcase : 1 - p - p' ≤ 0
  · have hcn : 0 ≤ c / n := by positivity
    have hδ : 0 ≤ p' - p := by linarith
    have hvle : v' - v ≤ 0 := by
      rw [hdiff]
      exact mul_nonpos_of_nonneg_of_nonpos (mul_nonneg hcn hδ) hcase
    have hsle : s' ≤ s := Real.sqrt_le_sqrt (by linarith)
    unfold wilsonNum
    linarith
  · push Not at hcase
    have hcoef : 0 ≤ (c / n) * (p' - p) := by positivity
    have hfac : 1 - p - p' ≤ 1 := by linarith
    have h1 : (c / n) * (p' - p) * (1 - p - p') ≤ (c / n) * (p' - p) := by
      simpa [mul_one] using mul_le_mul_of_nonneg_left hfac hcoef
    have hsum : c / n ≤ s' + s := by
      have hhalf : c / (2 * n) + c / (2 * n) = c / n := by
        field_simp
        ring
      linarith
    have hδ : 0 ≤ p' - p := by linarith
    have h2 : (c / n) * (p' - p) ≤ (s' + s) * (p' - p) :=
      mul_le_mul_of_nonneg_right hsum hδ
    have hmul : (s' - s) * (s' + s) ≤ (p' - p) * (s' + s) := by
      rw [hprod, hdiff]
      calc
        (c / n) * (p' - p) * (1 - p - p') ≤ (c / n) * (p' - p) := h1
        _ ≤ (s' + s) * (p' - p) := h2
        _ = (p' - p) * (s' + s) := by ring
    have hpos : 0 < s' + s := by
      have hc2 : 0 < c / (2 * n) := by positivity
      linarith
    have hstep : s' - s ≤ p' - p := le_of_mul_le_mul_right hmul hpos
    unfold wilsonNum
    linarith

/-- The Wilson lower bound is at least 0. -/
theorem wilsonLower_nonneg (z : ℝ) (n k : ℕ) (hz : 0 < z) (hn : 0 < n) (hk : k ≤ n) :
    0 ≤ wilsonLower z n k := by
  unfold wilsonLower
  have hc : 0 ≤ z ^ 2 := by positivity
  have hn' : (0 : ℝ) < n := by exact_mod_cast hn
  have hp0 : 0 ≤ (k : ℝ) / n := by positivity
  have hp1 : (k : ℝ) / n ≤ 1 := by
    rw [div_le_one₀ hn']
    exact_mod_cast hk
  have hden : 0 < wilsonDen (z ^ 2) (n : ℝ) := wilsonDen_pos hc hn'
  exact div_nonneg (wilsonNum_nonneg hc hn' hp0 hp1) hden.le

/-- The Wilson lower bound is at most the agreement share `k / n`. -/
theorem wilsonLower_le_share (z : ℝ) (n k : ℕ) (hz : 0 < z) (hn : 0 < n) (hk : k ≤ n) :
    wilsonLower z n k ≤ (k : ℝ) / n := by
  unfold wilsonLower
  have hc : 0 < z ^ 2 := by positivity
  have hn' : (0 : ℝ) < n := by exact_mod_cast hn
  have hp0 : 0 ≤ (k : ℝ) / n := by positivity
  have hp1 : (k : ℝ) / n ≤ 1 := by
    rw [div_le_one₀ hn']
    exact_mod_cast hk
  exact wilsonAt_le_share hc hn' hp0 hp1

/-- For a fixed sample size, the Wilson lower bound does not decrease as agreements increase. -/
theorem wilsonLower_mono_successes (z : ℝ) (n k k' : ℕ) (hz : 0 < z) (hn : 0 < n) (hk : k ≤ k')
    (hk' : k' ≤ n) : wilsonLower z n k ≤ wilsonLower z n k' := by
  unfold wilsonLower
  have hc : 0 < z ^ 2 := by positivity
  have hn' : (0 : ℝ) < n := by exact_mod_cast hn
  have hp0 : 0 ≤ (k : ℝ) / n := by positivity
  have hp : (k : ℝ) / n ≤ (k' : ℝ) / n := by
    gcongr
  have hp1 : (k' : ℝ) / n ≤ 1 := by
    rw [div_le_one₀ hn']
    exact_mod_cast hk'
  have hden : 0 < wilsonDen (z ^ 2) (n : ℝ) := wilsonDen_pos (le_of_lt hc) hn'
  exact (div_le_div_iff_of_pos_right hden).2
    (wilsonNum_mono hc hn' hp0 hp hp1)

/-- On an all-success sample the Wilson lower bound is the rational `n / (n + z^2)`. -/
theorem wilsonLower_unanimous (z : ℝ) (n : ℕ) (hz : 0 ≤ z) (hn : 0 < n) :
    wilsonLower z n n = unanimousLower (z ^ 2) n := by
  unfold wilsonLower unanimousLower wilsonNum wilsonDen wilsonRadicand
  have hn' : (0 : ℝ) < n := by exact_mod_cast hn
  have hc : 0 ≤ z ^ 2 := by
    have := hz
    exact sq_nonneg z
  have hrad : z ^ 2 * ((n : ℝ) / n) * (1 - (n : ℝ) / n) / n + (z ^ 2) ^ 2 / (4 * (n : ℝ) ^ 2) =
      (z ^ 2 / (2 * n)) ^ 2 := by
    field_simp
    ring
  rw [hrad, Real.sqrt_sq (div_nonneg hc (by positivity : (0 : ℝ) ≤ 2 * n))]
  field_simp
  ring

/-- The all-success lower bound increases with the sample size. -/
theorem unanimousLower_strictMono {c : ℝ} (hc : 0 < c) {n m : ℕ} (hnm : n < m) :
    unanimousLower c n < unanimousLower c m := by
  unfold unanimousLower
  have hn : (0 : ℝ) < (n : ℝ) + c := by positivity
  have hm : (0 : ℝ) < (m : ℝ) + c := by positivity
  rw [div_lt_div_iff₀ hn hm]
  have hnm' : (n : ℝ) < m := by exact_mod_cast hnm
  nlinarith

private lemma reaches_iff (n : ℕ) {t c : ℝ} (_ht0 : 0 < t) (ht1 : t < 1) (hc : 0 < c) :
    t ≤ unanimousLower c n ↔ t / (1 - t) * c ≤ (n : ℝ) := by
  unfold unanimousLower
  have hden : (0 : ℝ) < (n : ℝ) + c := by positivity
  have h1t : 0 < 1 - t := by linarith
  rw [le_div_iff₀ hden]
  have hcomm : t / (1 - t) * c = t * c / (1 - t) := by ring
  rw [hcomm, div_le_iff₀ h1t]
  constructor <;> intro h <;> linarith

private lemma nat_ge_21609 (n : ℕ) : (21609 : ℝ) / 625 ≤ (n : ℝ) ↔ 35 ≤ n := by
  constructor
  · intro h
    by_contra hn
    have hn34 : n ≤ 34 := by omega
    have hn34' : (n : ℝ) ≤ 34 := by exact_mod_cast hn34
    have h34 : (34 : ℝ) < 21609 / 625 := by norm_num
    exact (not_le.mpr (lt_of_le_of_lt hn34' h34)) h
  · intro h
    have h35 : (21609 : ℝ) / 625 ≤ 35 := by norm_num
    have hn35 : (35 : ℝ) ≤ n := by exact_mod_cast h
    exact le_trans h35 hn35

private lemma nat_ge_9604 (n : ℕ) : (9604 : ℝ) / 625 ≤ (n : ℝ) ↔ 16 ≤ n := by
  constructor
  · intro h
    by_contra hn
    have hn15 : n ≤ 15 := by omega
    have hn15' : (n : ℝ) ≤ 15 := by exact_mod_cast hn15
    have h15 : (15 : ℝ) < 9604 / 625 := by norm_num
    exact (not_le.mpr (lt_of_le_of_lt hn15' h15)) h
  · intro h
    have h16 : (9604 : ℝ) / 625 ≤ 16 := by norm_num
    have hn16 : (16 : ℝ) ≤ n := by exact_mod_cast h
    exact le_trans h16 hn16

/-- At `z = 1.96`, `n` unanimous answers reach the costly bar `0.9` exactly when `n ≥ 35`. -/
theorem unanimous_reaches_costly_iff (n : ℕ) :
    (9 / 10 : ℝ) ≤ unanimousLower wilsonZSqDefault n ↔ 35 ≤ n := by
  have ht0 : (0 : ℝ) < 9 / 10 := by norm_num
  have ht1 : (9 / 10 : ℝ) < 1 := by norm_num
  have hc : (0 : ℝ) < wilsonZSqDefault := by unfold wilsonZSqDefault; norm_num
  rw [reaches_iff n ht0 ht1 hc]
  have hcut : (9 / 10 : ℝ) / (1 - 9 / 10) * wilsonZSqDefault = 21609 / 625 := by
    unfold wilsonZSqDefault
    norm_num
  rw [hcut]
  exact nat_ge_21609 n

/-- At `z = 1.96`, `n` unanimous answers reach the low bar `0.8` exactly when `n ≥ 16`. -/
theorem unanimous_reaches_low_iff (n : ℕ) :
    (4 / 5 : ℝ) ≤ unanimousLower wilsonZSqDefault n ↔ 16 ≤ n := by
  have ht0 : (0 : ℝ) < 4 / 5 := by norm_num
  have ht1 : (4 / 5 : ℝ) < 1 := by norm_num
  have hc : (0 : ℝ) < wilsonZSqDefault := by unfold wilsonZSqDefault; norm_num
  rw [reaches_iff n ht0 ht1 hc]
  have hcut : (4 / 5 : ℝ) / (1 - 4 / 5) * wilsonZSqDefault = 9604 / 625 := by
    unfold wilsonZSqDefault
    norm_num
  rw [hcut]
  exact nat_ge_9604 n

/-- Ten unanimous answers, exactly: `10 / (10 + 2401/625) = 6250/8651`. -/
theorem ten_unanimous_eq : unanimousLower wilsonZSqDefault 10 = 6250 / 8651 := by
  unfold unanimousLower wilsonZSqDefault
  norm_num

/-- Ten unanimous answers stay under the costly bar: `6250/8651 < 0.9`. -/
theorem ten_unanimous_below_costly :
    unanimousLower wilsonZSqDefault 10 < 9 / 10 := by
  rw [ten_unanimous_eq]
  norm_num

/-! ## Wald SPRT, floored at 0 -/

/-- One outcome of a standing rule: the founder agreed (`success`) or the rule failed (`failure`). -/
inductive SprtOutcome
  | success
  | failure
  deriving DecidableEq, Repr

/-- `H0` failure rate, `0.05`. -/
def sprtP0Default : ℝ := 1 / 20

/-- `H1` failure rate, `0.30`. -/
def sprtP1Default : ℝ := 3 / 10

/-- Type I bound `α = 0.05`. -/
def sprtAlphaDefault : ℝ := 1 / 20

/-- Type II bound `β = 0.05`. -/
def sprtBetaDefault : ℝ := 1 / 20

/-- A failure adds `log (p1 / p0)`. A success adds `log ((1 - p1) / (1 - p0))`. -/
def sprtStep (p0 p1 : ℝ) : SprtOutcome → ℝ
  | .failure => Real.log (p1 / p0)
  | .success => Real.log ((1 - p1) / (1 - p0))

/-- Running sum, floored at 0 after every outcome. -/
def sprtCusum (p0 p1 : ℝ) (hist : List SprtOutcome) : ℝ :=
  hist.foldl (fun s o => max 0 (s + sprtStep p0 p1 o)) 0

/-- Default failure increment, `log 6`. -/
def failureLogDefault : ℝ := sprtStep sprtP0Default sprtP1Default .failure

/-- Default success increment, `log (14 / 19)`. -/
def successLogDefault : ℝ := sprtStep sprtP0Default sprtP1Default .success

/-- Suspend when the floored sum reaches `log ((1 - β) / α) = log 19`. -/
def suspendThresholdDefault : ℝ :=
  Real.log ((1 - sprtBetaDefault) / sprtAlphaDefault)

/-- The default SPRT statistic. -/
def cusumDefault (hist : List SprtOutcome) : ℝ :=
  sprtCusum sprtP0Default sprtP1Default hist

theorem failureLogDefault_eq : failureLogDefault = Real.log 6 := by
  unfold failureLogDefault sprtStep sprtP0Default sprtP1Default
  have h : ((3 : ℝ) / 10) / (1 / 20) = 6 := by norm_num
  rw [h]

theorem successLogDefault_eq : successLogDefault = Real.log (14 / 19) := by
  unfold successLogDefault sprtStep sprtP0Default sprtP1Default
  have h : (1 - (3 : ℝ) / 10) / (1 - 1 / 20) = 14 / 19 := by norm_num
  rw [h]

theorem suspendThresholdDefault_eq : suspendThresholdDefault = Real.log 19 := by
  unfold suspendThresholdDefault sprtAlphaDefault sprtBetaDefault
  have h : (1 - (1 : ℝ) / 20) / (1 / 20) = 19 := by norm_num
  rw [h]

/-- The floored statistic is nonnegative after every history. -/
theorem sprtCusum_nonneg (p0 p1 : ℝ) (hist : List SprtOutcome) : 0 ≤ sprtCusum p0 p1 hist := by
  unfold sprtCusum
  suffices ∀ s, 0 ≤ s → 0 ≤ hist.foldl (fun acc o => max 0 (acc + sprtStep p0 p1 o)) s from
    this 0 le_rfl
  intro s hs
  induction hist generalizing s with
  | nil => simpa using hs
  | cons _ os ih =>
    simp only [List.foldl]
    exact ih _ (le_max_left _ _)

theorem cusumDefault_nonneg (hist : List SprtOutcome) : 0 ≤ cusumDefault hist :=
  sprtCusum_nonneg _ _ hist

/-- A failure moves the floored statistic up by exactly `log (p1 / p0)`. The floor does not clip it,
because that increment is positive and the statistic is already nonnegative. -/
theorem sprtCusum_append_failure {p0 p1 : ℝ} (hp0 : 0 < p0) (hp : p0 < p1)
    (hist : List SprtOutcome) :
    sprtCusum p0 p1 (hist ++ [.failure]) = sprtCusum p0 p1 hist + Real.log (p1 / p0) := by
  have hstep : 0 < Real.log (p1 / p0) := Real.log_pos (by
    rw [one_lt_div hp0]
    exact hp)
  have hnn := sprtCusum_nonneg p0 p1 hist
  unfold sprtCusum at hnn ⊢
  rw [List.foldl_append]
  simp only [List.foldl]
  have hstep_eq : sprtStep p0 p1 .failure = Real.log (p1 / p0) := rfl
  rw [hstep_eq]
  refine max_eq_right ?_
  linarith

theorem cusumDefault_append_failure (hist : List SprtOutcome) :
    cusumDefault (hist ++ [.failure]) = cusumDefault hist + failureLogDefault :=
  sprtCusum_append_failure (by unfold sprtP0Default; norm_num)
    (by unfold sprtP0Default sprtP1Default; norm_num) hist

theorem cusum_failures (k : ℕ) :
    cusumDefault (List.replicate k .failure) = (k : ℝ) * failureLogDefault := by
  unfold cusumDefault sprtCusum
  suffices ∀ s : ℝ, 0 ≤ s →
      (List.replicate k SprtOutcome.failure).foldl
        (fun acc o => max 0 (acc + sprtStep sprtP0Default sprtP1Default o)) s =
        s + (k : ℝ) * failureLogDefault from by
    simpa [zero_add] using this 0 le_rfl
  intro s hs
  induction k generalizing s with
  | zero => simp
  | succ k ih =>
    simp only [List.replicate_succ, List.foldl]
    have hstep : sprtStep sprtP0Default sprtP1Default .failure = failureLogDefault := by
      rfl
    rw [hstep]
    have hpos : 0 < failureLogDefault := by
      rw [failureLogDefault_eq]
      exact Real.log_pos (by norm_num)
    have hnn : 0 ≤ s + failureLogDefault := by linarith
    rw [max_eq_right hnn, ih _ hnn, Nat.cast_add, Nat.cast_one]
    ring

/-- `k` failures from 0 reach the suspend threshold exactly when `6^k ≥ 19`. -/
theorem pure_failures_reach_iff (k : ℕ) :
    suspendThresholdDefault ≤ cusumDefault (List.replicate k .failure) ↔ (19 : ℝ) ≤ 6 ^ k := by
  rw [cusum_failures, failureLogDefault_eq, suspendThresholdDefault_eq, ← Real.log_pow]
  rw [Real.log_le_log_iff (by norm_num) (by positivity)]

/-- One failure from 0 does not suspend. -/
theorem one_failure_below_threshold :
    cusumDefault [.failure] < suspendThresholdDefault := by
  have hlist : [.failure] = List.replicate 1 SprtOutcome.failure := by
    simp [List.replicate_succ]
  rw [hlist]
  refine lt_of_not_ge ?_
  intro h
  have := (pure_failures_reach_iff 1).1 h
  norm_num at this

/-- Two consecutive failures from 0 do suspend. -/
theorem two_failures_reach_threshold :
    suspendThresholdDefault ≤ cusumDefault [.failure, .failure] := by
  have hlist : [.failure, .failure] = List.replicate 2 SprtOutcome.failure := by
    simp [List.replicate_succ]
  rw [hlist]
  exact (pure_failures_reach_iff 2).2 (by norm_num)

/-! ## Decimal bounds on the three logarithms

`log 6 = log 2 + log 3` uses Mathlib's nine-decimal bounds. `log 19` and `log (14 / 19)` reduce to
those, to the bound on `log 5`, and to the Taylor remainder for `log (1 - x)`. -/

private lemma log_one_sub_series {x : ℝ} {n : ℕ} (hx : 0 < x) (hx1 : x < 1) {s t : ℝ}
    (hs : ∑ i ∈ range n, x ^ (i + 1) / (i + 1) = s) (ht : x ^ (n + 1) / (1 - x) = t) :
    -t - s ≤ Real.log (1 - x) ∧ Real.log (1 - x) ≤ t - s := by
  have h := Real.abs_log_sub_add_sum_range_le (x := x) (by rwa [abs_of_pos hx]) n
  rw [abs_of_pos hx, hs, ht] at h
  rcases abs_le.mp h with ⟨hlo, hhi⟩
  constructor <;> linarith

private lemma log_nineteen_split : Real.log 19 = 2 * Real.log 2 + Real.log 5 + Real.log (1 - 1 / 20) := by
  have h19 : (19 : ℝ) = 2 ^ 2 * 5 * (19 / 20) := by norm_num
  have h20 : (19 : ℝ) / 20 = 1 - 1 / 20 := by norm_num
  rw [h19, Real.log_mul (by norm_num) (by norm_num), Real.log_mul (by norm_num) (by norm_num),
    Real.log_pow, h20]
  ring

private lemma success_split :
    Real.log (14 / 19) =
      2 * Real.log 2 + Real.log (1 - 1 / 8) - Real.log 5 - Real.log (1 - 1 / 20) := by
  have hdiv : Real.log ((14 : ℝ) / 19) = Real.log 14 - Real.log 19 :=
    Real.log_div (by norm_num) (by norm_num)
  have h14 : Real.log 14 = Real.log 2 + Real.log 7 := by
    have : (14 : ℝ) = 2 * 7 := by norm_num
    rw [this, Real.log_mul (by norm_num) (by norm_num)]
  have h7 : Real.log 7 = 3 * Real.log 2 + Real.log ((7 : ℝ) / 8) := by
    have : (7 : ℝ) = 2 ^ 3 * (7 / 8) := by norm_num
    rw [this, Real.log_mul (by norm_num) (by norm_num), Real.log_pow]
    norm_num
  have h78 : (7 : ℝ) / 8 = 1 - 1 / 8 := by norm_num
  rw [hdiv, h14, h7, h78, log_nineteen_split]
  ring

/-- `log 6` lies in `(1.791, 1.792)`. The brief's `+1.79` is this value rounded to two decimals. -/
theorem failureLog_bounds :
    (1791 : ℝ) / 1000 < failureLogDefault ∧ failureLogDefault < 1792 / 1000 := by
  rw [failureLogDefault_eq]
  have h6 : Real.log 6 = Real.log 2 + Real.log 3 := by
    have : (6 : ℝ) = 2 * 3 := by norm_num
    rw [this, Real.log_mul (by norm_num) (by norm_num)]
  rw [h6]
  have hlo : (1791 : ℝ) / 1000 < 0.6931471803 + 1.0986122885 := by norm_num
  have hhi : 0.6931471808 + 1.0986122888 < (1792 : ℝ) / 1000 := by norm_num
  constructor
  · linarith [Real.log_two_gt_d9, Real.log_three_gt_d9, hlo]
  · linarith [Real.log_two_lt_d9, Real.log_three_lt_d9, hhi]

/-- `log 19` lies in `(2.944, 2.945)`. The brief's `2.94` is this value rounded to two decimals. -/
theorem suspendThreshold_bounds :
    (2944 : ℝ) / 1000 < suspendThresholdDefault ∧ suspendThresholdDefault < 2945 / 1000 := by
  rw [suspendThresholdDefault_eq, log_nineteen_split]
  have hs : (∑ i ∈ range 6, (1 / 20 : ℝ) ^ (i + 1) / (i + 1)) = 157573 / 3072000 := by
    norm_num [Finset.sum_range_succ]
  have ht : (1 / 20 : ℝ) ^ (6 + 1) / (1 - 1 / 20) = 1 / 1216000000 := by norm_num
  have hb := log_one_sub_series (x := 1 / 20) (n := 6) (by norm_num) (by norm_num) hs ht
  have hlo : (2944 : ℝ) / 1000 <
      2 * 0.6931471803 + 1.6094379123 + (-(1 / 1216000000) - 157573 / 3072000) := by norm_num
  have hhi : 2 * 0.6931471808 + 1.6094379126 + (1 / 1216000000 - 157573 / 3072000) <
      (2945 : ℝ) / 1000 := by norm_num
  constructor
  · linarith [Real.log_two_gt_d9, Real.log_five_gt_d9, hb.1, hlo]
  · linarith [Real.log_two_lt_d9, Real.log_five_lt_d9, hb.2, hhi]

/-- `log (14 / 19)` lies in `(-0.3054, -0.3053)`. The brief's `-0.31` is this value rounded to
two decimals. -/
theorem successLog_bounds :
    (-3054 : ℝ) / 10000 < successLogDefault ∧ successLogDefault < (-3053 : ℝ) / 10000 := by
  rw [successLogDefault_eq, success_split]
  have hs20 : (∑ i ∈ range 6, (1 / 20 : ℝ) ^ (i + 1) / (i + 1)) = 157573 / 3072000 := by
    norm_num [Finset.sum_range_succ]
  have ht20 : (1 / 20 : ℝ) ^ (6 + 1) / (1 - 1 / 20) = 1 / 1216000000 := by norm_num
  have hb20 := log_one_sub_series (x := 1 / 20) (n := 6) (by norm_num) (by norm_num) hs20 ht20
  have hs8 : (∑ i ∈ range 6, (1 / 8 : ℝ) ^ (i + 1) / (i + 1)) = 1050133 / 7864320 := by
    norm_num [Finset.sum_range_succ]
  have ht8 : (1 / 8 : ℝ) ^ (6 + 1) / (1 - 1 / 8) = 1 / 1835008 := by norm_num
  have hb8 := log_one_sub_series (x := 1 / 8) (n := 6) (by norm_num) (by norm_num) hs8 ht8
  have hlo : (-3054 : ℝ) / 10000 <
      2 * 0.6931471803 + (-(1 / 1835008) - 1050133 / 7864320) - 1.6094379126 -
        (1 / 1216000000 - 157573 / 3072000) := by norm_num
  have hhi : 2 * 0.6931471808 + (1 / 1835008 - 1050133 / 7864320) - 1.6094379123 -
      (-(1 / 1216000000) - 157573 / 3072000) < (-3053 : ℝ) / 10000 := by norm_num
  constructor
  · linarith [Real.log_two_gt_d9, Real.log_five_lt_d9, hb8.1, hb20.2, hlo]
  · linarith [Real.log_two_lt_d9, Real.log_five_gt_d9, hb8.2, hb20.1, hhi]

/-! ## The Wald boundaries as formulas

When `α = β`, the lower boundary `log (α / (1 - α))` is the negative of the upper boundary
`log ((1 - α) / α)`. For the default `α = β = 1/20 < 1/2`, the upper boundary is positive.
The guarantee that the test's error rates stay under `α` and `β` is not proved here. -/

/-- For `0 < α < 1`, the two Wald boundaries are negatives of each other. -/
theorem wald_bounds_reciprocal {α : ℝ} (h0 : 0 < α) (h1 : α < 1) :
    Real.log (α / (1 - α)) = -Real.log ((1 - α) / α) := by
  have hinv : α / (1 - α) = ((1 - α) / α)⁻¹ := by
    field_simp
  rw [hinv, Real.log_inv]

/-- For `0 < α < 1/2` the upper Wald boundary is positive, so the lower one is negative. -/
theorem wald_upper_pos_of_lt_half {α : ℝ} (h0 : 0 < α) (h1 : α < 1 / 2) :
    0 < Real.log ((1 - α) / α) := by
  refine Real.log_pos ?_
  rw [one_lt_div h0]
  linarith

theorem waldLower_eq_neg_upper :
    Real.log (sprtBetaDefault / (1 - sprtAlphaDefault)) = -suspendThresholdDefault := by
  rw [suspendThresholdDefault_eq]
  simp only [sprtBetaDefault, sprtAlphaDefault]
  have h : ((1 : ℝ) / 20) / (1 - 1 / 20) = 19⁻¹ := by norm_num
  rw [h, Real.log_inv]

end
