/-
  Signal detection (docs/design/SIGNAL_DETECTION_2026-11-07.md). A detector makes yes or no calls on evidence: a
  sensor turns each case into a score, and the call is yes when the score is at or above the criterion. A resolved
  call is a hit (yes, and the answer was yes), a miss (no, and the answer was yes), a false alarm (yes, and the
  answer was no) or a correct rejection (no, and the answer was no). The terms detector, trial, hit, miss,
  false-alarm and correct-rejection (packages/naive/src/terms/terms.ts) cite these theorems. They hold for every
  ledger, not a sample:

  * The optimal criterion rises with the noise base rate and with the false alarm cost, and falls with the miss
    cost (`criterion_monotone`). It is stated on the expected value rule itself: say yes when
    `P(signal) * f(x | signal) * (V(hit) + C(miss)) >= P(noise) * f(x | noise) * (V(correct rejection) + C(false alarm))`,
    which is the likelihood ratio at or above `beta*`. A higher criterion means fewer cases get a yes.
  * Moving the criterion up never raises the hit count or the false alarm count (`roc_monotone`). The rates divide
    these counts by the fixed numbers of signal and noise trials, so the same holds for the rates.
  * At every criterion, the signal trials split into hits and misses, and the noise trials into false alarms and
    correct rejections (`outcomes_partition_signal`, `outcomes_partition_noise`).
  * The trapezoid area under the empirical ROC curve equals the two-alternative proportion correct on the same
    scores, counting a tie as half (`auc_eq_2afc`). Both are kept as whole numbers scaled by `2 * |S| * |N|`.
  * For every criterion, either one of the ledger's observed scores makes the same calls on every trial, and so
    has the same empirical cost, or every call at that criterion is no (`best_criterion_observed`). So the empirical
    best criterion is found by trying the observed scores and the line above them all.

  Scores are integers and likelihoods and costs are natural numbers. A rational score or likelihood is scaled to a
  whole number by a common denominator first, which changes no comparison.

  Core Lean only, no Mathlib, and no `Concept` definition, so the agreement test asks no admitted term of this file.
-/

namespace Detection

/-! ## Calls and counts -/

/-- [D] The call at criterion `c`: yes when the score is at or above the line. -/
def says (c x : Int) : Bool := decide (c ≤ x)

/-- [D] How many scores in `xs` get a yes at criterion `c`. On signal scores this is the hit count, and on noise
    scores the false alarm count. -/
def yesCount (c : Int) : List Int → Nat
  | [] => 0
  | x :: xs => (if c ≤ x then 1 else 0) + yesCount c xs

/-- [D] How many scores in `xs` get a no at criterion `c`. On signal scores this is the miss count, and on noise
    scores the correct rejection count. -/
def noCount (c : Int) : List Int → Nat
  | [] => 0
  | x :: xs => (if c ≤ x then 0 else 1) + noCount c xs

/-- [D] Hits: signal trials called yes. -/
def hits (c : Int) (signal : List Int) : Nat := yesCount c signal
/-- [D] Misses: signal trials called no. -/
def misses (c : Int) (signal : List Int) : Nat := noCount c signal
/-- [D] False alarms: noise trials called yes. -/
def falseAlarms (c : Int) (noise : List Int) : Nat := yesCount c noise
/-- [D] Correct rejections: noise trials called no. -/
def correctRejections (c : Int) (noise : List Int) : Nat := noCount c noise

theorem yes_add_no (c : Int) (xs : List Int) : yesCount c xs + noCount c xs = xs.length := by
  induction xs with
  | nil => rfl
  | cons x xs ih =>
    simp only [yesCount, noCount, List.length_cons]
    by_cases h : c ≤ x <;> simp [h] <;> omega

/-- Every signal trial is a hit or a miss, and never both. -/
theorem outcomes_partition_signal (c : Int) (signal : List Int) :
    hits c signal + misses c signal = signal.length :=
  yes_add_no c signal

/-- Every noise trial is a false alarm or a correct rejection, and never both. -/
theorem outcomes_partition_noise (c : Int) (noise : List Int) :
    falseAlarms c noise + correctRejections c noise = noise.length :=
  yes_add_no c noise

theorem yesCount_antitone {c c' : Int} (h : c ≤ c') (xs : List Int) : yesCount c' xs ≤ yesCount c xs := by
  induction xs with
  | nil => exact Nat.le_refl 0
  | cons x xs ih =>
    simp only [yesCount]
    by_cases h1 : c' ≤ x
    · have h2 : c ≤ x := Int.le_trans h h1
      simp [h1, h2]; omega
    · by_cases h2 : c ≤ x <;> simp [h1, h2] <;> omega

/-- Moving the criterion up never raises the hit count or the false alarm count. -/
theorem roc_monotone {c c' : Int} (h : c ≤ c') (signal noise : List Int) :
    hits c' signal ≤ hits c signal ∧ falseAlarms c' noise ≤ falseAlarms c noise :=
  ⟨yesCount_antitone h signal, yesCount_antitone h noise⟩

/-! ## The optimal criterion -/

/-- [D] What each outcome is worth: the value of a hit and of a correct rejection, the cost of a miss and of a
    false alarm. -/
structure Values where
  hit : Nat
  correctRejection : Nat
  miss : Nat
  falseAlarm : Nat

/-- [D] The expected value rule at evidence whose likelihood is `fs` under signal and `fn` under noise, with base
    rates `ps` (signal) and `pn` (noise): yes is worth it when its expected gain is at least that of no. This is the
    likelihood ratio `fs / fn` at or above `beta* = (pn / ps) * (V(cr) + C(fa)) / (V(hit) + C(miss))`, with the
    division multiplied out. -/
def yesWorthIt (v : Values) (ps pn fs fn : Nat) : Prop :=
  pn * fn * (v.correctRejection + v.falseAlarm) ≤ ps * fs * (v.hit + v.miss)

/-- The optimal criterion rises with the noise base rate and with the false alarm cost, and falls with the miss
    cost: raising the noise base rate or the false alarm cost only takes yes calls away, and raising the miss cost
    only adds them. -/
theorem criterion_monotone (v : Values) (ps fs fn : Nat) :
    (∀ pn pn', pn ≤ pn' → yesWorthIt v ps pn' fs fn → yesWorthIt v ps pn fs fn) ∧
    (∀ pn fa', v.falseAlarm ≤ fa' → yesWorthIt { v with falseAlarm := fa' } ps pn fs fn → yesWorthIt v ps pn fs fn) ∧
    (∀ pn miss', v.miss ≤ miss' → yesWorthIt v ps pn fs fn → yesWorthIt { v with miss := miss' } ps pn fs fn) := by
  refine ⟨?_, ?_, ?_⟩
  · intro pn pn' hp hy
    unfold yesWorthIt at *
    exact Nat.le_trans (Nat.mul_le_mul_right _ (Nat.mul_le_mul_right _ hp)) hy
  · intro pn fa' hf hy
    unfold yesWorthIt at *
    exact Nat.le_trans (Nat.mul_le_mul_left _ (Nat.add_le_add_left hf _)) hy
  · intro pn miss' hm hy
    unfold yesWorthIt at *
    exact Nat.le_trans hy (Nat.mul_le_mul_left _ (Nat.add_le_add_left hm _))

/-! ## ROC area and two-alternative proportion correct -/

/-- [D] A two-alternative trial pairs one signal score `s` with one noise score `n`; picking the higher one is
    correct. Scaled by 2: 2 when `s > n`, 1 for a tie (a guess), 0 otherwise. -/
def pairScore (s n : Int) : Nat := if n < s then 2 else if n = s then 1 else 0

/-- [D] Twice the number of two-alternative trials won by `n` against every signal score. -/
def wins (signal : List Int) (n : Int) : Nat := (signal.map (fun s => pairScore s n)).sum

/-- [D] Twice the two-alternative proportion correct, times `|S| * |N|`: every signal score against every noise
    score. -/
def pc2 (signal noise : List Int) : Nat := (noise.map (wins signal)).sum

/-- [D] The criteria strictly descend from `a`: each is below the one before. -/
def Descending (a : Int) : List Int → Prop
  | [] => True
  | b :: rest => b < a ∧ Descending b rest

/-- [D] Twice the trapezoid area under the empirical ROC curve, times `|S| * |N|`. The curve starts at the
    criterion `a`, above every score (no yes calls, the point (0, 0)), and moves down through the criteria `ts`.
    Each step from `a` to `b` adds a trapezoid of width `FA(b) - FA(a)` and heights `H(a)` and `H(b)`. -/
def rocArea2 (signal noise : List Int) (a : Int) : List Int → Nat
  | [] => 0
  | b :: rest => (falseAlarms b noise - falseAlarms a noise) * (hits b signal + hits a signal)
      + rocArea2 signal noise b rest

/-- [D] Twice the two-alternative wins of the noise scores below `a`. -/
def winsBelow (signal : List Int) (a : Int) : List Int → Nat
  | [] => 0
  | n :: ns => (if n < a then wins signal n else 0) + winsBelow signal a ns

/-- [D] How many noise scores lie in `[b, a)`. -/
def between (b a : Int) : List Int → Nat
  | [] => 0
  | n :: ns => (if b ≤ n ∧ n < a then 1 else 0) + between b a ns

theorem descending_lt {a : Int} {ts : List Int} (h : Descending a ts) {x : Int} (hx : x ∈ ts) : x < a := by
  induction ts generalizing a with
  | nil => cases hx
  | cons b rest ih =>
    obtain ⟨hb, hr⟩ := h
    cases hx with
    | head => exact hb
    | tail _ hx => exact Int.lt_trans (ih hr hx) hb

theorem yesCount_split {b a : Int} (hba : b ≤ a) (ns : List Int) :
    yesCount b ns = yesCount a ns + between b a ns := by
  induction ns with
  | nil => rfl
  | cons n ns ih =>
    simp only [yesCount, between]
    by_cases h1 : a ≤ n
    · have h2 : b ≤ n := by omega
      have h3 : ¬ (b ≤ n ∧ n < a) := by omega
      rw [ite_eq_left h1, ite_eq_left h2, ite_eq_right h3]; omega
    · by_cases h2 : b ≤ n
      · have h3 : b ≤ n ∧ n < a := by omega
        rw [ite_eq_right h1, ite_eq_left h2, ite_eq_left h3]; omega
      · have h3 : ¬ (b ≤ n ∧ n < a) := by omega
        rw [ite_eq_right h1, ite_eq_right h2, ite_eq_right h3]; omega

/-- With no signal score strictly between `b` and `a`, the two heights of a trapezoid add up to what a noise score
    at `b` wins. -/
theorem heights_eq_wins {b a : Int} (hba : b < a) (signal : List Int)
    (gap : ∀ s ∈ signal, b < s → a ≤ s) : yesCount b signal + yesCount a signal = wins signal b := by
  induction signal with
  | nil => rfl
  | cons s ss ih =>
    have ih' := ih (fun x hx => gap x (List.mem_cons_of_mem _ hx))
    have hw : wins (s :: ss) b = pairScore s b + wins ss b := by
      simp only [wins, List.map_cons, List.sum_cons]
    rw [hw, ← ih']
    simp only [yesCount, pairScore]
    by_cases h1 : b < s
    · have h2 : a ≤ s := gap s List.mem_cons_self h1
      have h3 : b ≤ s := by omega
      rw [ite_eq_left h3, ite_eq_left h2, ite_eq_left h1]; omega
    · by_cases h4 : b = s
      · have h3 : b ≤ s := by omega
        have h5 : ¬ a ≤ s := by omega
        rw [ite_eq_left h3, ite_eq_right h5, ite_eq_right h1, ite_eq_left h4]; omega
      · have h6 : ¬ b ≤ s := by omega
        have h7 : ¬ a ≤ s := by omega
        rw [ite_eq_right h6, ite_eq_right h7, ite_eq_right h1, ite_eq_right h4]; omega

/-- One step of the sweep: the trapezoid from `a` down to `b` holds exactly the wins of the noise scores in
    `[b, a)`, when every such noise score is `b` itself. -/
theorem step_eq {b a : Int} (hba : b < a) (signal : List Int) (gap : ∀ s ∈ signal, b < s → a ≤ s)
    (noise : List Int) (only : ∀ n ∈ noise, b ≤ n → n < a → n = b) :
    between b a noise * (yesCount b signal + yesCount a signal) + winsBelow signal b noise
      = winsBelow signal a noise := by
  rw [heights_eq_wins hba signal gap]
  induction noise with
  | nil => simp [between, winsBelow]
  | cons n ns ih =>
    have ih' := ih (fun x hx => only x (List.mem_cons_of_mem _ hx))
    simp only [between, winsBelow]
    rw [Nat.add_mul, ← ih']
    by_cases h1 : n < b
    · have h2 : n < a := by omega
      have h3 : ¬ (b ≤ n ∧ n < a) := by omega
      rw [ite_eq_right h3, ite_eq_left h1, ite_eq_left h2]; omega
    · by_cases h2 : n < a
      · have hn : n = b := only n List.mem_cons_self (by omega) h2
        have h3 : b ≤ n ∧ n < a := ⟨by omega, h2⟩
        rw [ite_eq_left h3, ite_eq_right h1, ite_eq_left h2, hn]; omega
      · have h3 : ¬ (b ≤ n ∧ n < a) := by omega
        rw [ite_eq_right h3, ite_eq_right h1, ite_eq_right h2]; omega

theorem area_eq_winsBelow (signal noise : List Int) :
    ∀ (ts : List Int) (a : Int), Descending a ts → (∀ x, (x ∈ signal ∨ x ∈ noise) → x < a → x ∈ ts) →
      rocArea2 signal noise a ts = winsBelow signal a noise := by
  intro ts
  induction ts with
  | nil =>
    intro a _ cover
    show 0 = winsBelow signal a noise
    have : ∀ ns : List Int, (∀ n ∈ ns, n ∈ noise) → winsBelow signal a ns = 0 := by
      intro ns
      induction ns with
      | nil => intro _; rfl
      | cons n ns ih =>
        intro hsub
        have hn : ¬ n < a := fun h => by
          have := cover n (Or.inr (hsub n List.mem_cons_self)) h
          cases this
        simp only [winsBelow, hn, ite_false, Nat.zero_add]
        exact ih (fun x hx => hsub x (List.mem_cons_of_mem _ hx))
    exact (this noise (fun _ h => h)).symm
  | cons b rest ih =>
    intro a desc cover
    obtain ⟨hba, hrest⟩ := desc
    have below_b : ∀ x ∈ rest, x < b := fun x hx => descending_lt hrest hx
    have cover' : ∀ x, (x ∈ signal ∨ x ∈ noise) → x < b → x ∈ rest := by
      intro x hx hxb
      have hx' := cover x hx (Int.lt_trans hxb hba)
      cases hx' with
      | head => exact absurd hxb (Int.lt_irrefl _)
      | tail _ h => exact h
    have gap : ∀ s ∈ signal, b < s → a ≤ s := by
      intro s hs hbs
      refine Int.not_lt.mp (fun hsa => ?_)
      have := cover s (Or.inl hs) hsa
      cases this with
      | head => exact Int.lt_irrefl _ hbs
      | tail _ h => exact Int.lt_irrefl _ (Int.lt_trans hbs (below_b s h))
    have only : ∀ n ∈ noise, b ≤ n → n < a → n = b := by
      intro n hn hbn hna
      have := cover n (Or.inr hn) hna
      cases this with
      | head => rfl
      | tail _ h => exact absurd (Int.lt_of_lt_of_le (below_b n h) hbn) (Int.lt_irrefl _)
    simp only [rocArea2, falseAlarms, hits]
    rw [yesCount_split (Int.le_of_lt hba) noise, Nat.add_sub_cancel_left, ih b hrest cover']
    exact step_eq hba signal gap noise only

/-- The trapezoid area under the empirical ROC curve equals the two-alternative proportion correct on the same
    scores. The curve starts above every score and moves down through criteria `ts` that strictly descend and
    include every observed score (the distinct observed scores in descending order do). Both sides are scaled by
    `2 * |S| * |N|`. -/
theorem auc_eq_2afc (signal noise ts : List Int) (top : Int)
    (above : ∀ x, (x ∈ signal ∨ x ∈ noise) → x < top) (desc : Descending top ts)
    (cover : ∀ x, (x ∈ signal ∨ x ∈ noise) → x ∈ ts) :
    rocArea2 signal noise top ts = pc2 signal noise := by
  rw [area_eq_winsBelow signal noise ts top desc (fun x hx _ => cover x hx)]
  have : ∀ ns : List Int, (∀ n ∈ ns, n ∈ noise) → winsBelow signal top ns = (ns.map (wins signal)).sum := by
    intro ns
    induction ns with
    | nil => intro _; rfl
    | cons n ns ih =>
      intro hsub
      have hn : n < top := above n (Or.inr (hsub n List.mem_cons_self))
      simp only [winsBelow, hn, ite_true, List.map_cons, List.sum_cons]
      rw [ih (fun x hx => hsub x (List.mem_cons_of_mem _ hx))]
  exact this noise (fun _ h => h)

/-! ## The best criterion on a ledger -/

/-- [D] One resolved trial: the sensor's score and whether the true answer was yes. -/
structure Trial where
  score : Int
  signal : Bool

/-- [D] The cost of one trial's outcome at criterion `c`, from the four outcome costs (a value is a negative cost,
    so costs here are what each outcome loses). -/
def trialCost (k : Values) (c : Int) (t : Trial) : Nat :=
  match t.signal, says c t.score with
  | true, true => k.hit
  | true, false => k.miss
  | false, true => k.falseAlarm
  | false, false => k.correctRejection

/-- [D] The empirical cost of a criterion on a ledger. -/
def cost (k : Values) (c : Int) (ledger : List Trial) : Nat := (ledger.map (trialCost k c)).sum

theorem cost_congr (k : Values) {c d : Int} (ledger : List Trial)
    (same : ∀ t ∈ ledger, (c ≤ t.score ↔ d ≤ t.score)) : cost k c ledger = cost k d ledger := by
  induction ledger with
  | nil => rfl
  | cons t ts ih =>
    have ht : says c t.score = says d t.score := by
      unfold says; exact decide_eq_decide.mpr (same t List.mem_cons_self)
    simp only [cost, List.map_cons, List.sum_cons] at ih ⊢
    rw [ih (fun x hx => same x (List.mem_cons_of_mem _ hx))]
    simp only [trialCost, ht]

/-- Either every score is below `c`, or a score at or above `c` is the least such score. -/
theorem least_above (c : Int) (xs : List Int) :
    (∀ x ∈ xs, x < c) ∨ ∃ d ∈ xs, c ≤ d ∧ ∀ x ∈ xs, c ≤ x → d ≤ x := by
  induction xs with
  | nil => exact Or.inl (fun _ h => by cases h)
  | cons y ys ih =>
    cases ih with
    | inl hall =>
      by_cases hy : c ≤ y
      · refine Or.inr ⟨y, List.mem_cons_self, hy, ?_⟩
        intro x hx hcx
        cases hx with
        | head => exact Int.le_refl _
        | tail _ h => exact absurd (hall x h) (by omega)
      · refine Or.inl ?_
        intro x hx
        cases hx with
        | head => exact by omega
        | tail _ h => exact hall x h
    | inr hex =>
      obtain ⟨d, hd, hcd, hmin⟩ := hex
      by_cases hy : c ≤ y ∧ y < d
      · refine Or.inr ⟨y, List.mem_cons_self, hy.1, ?_⟩
        intro x hx hcx
        cases hx with
        | head => exact Int.le_refl _
        | tail _ h => exact Int.le_trans (Int.le_of_lt hy.2) (hmin x h hcx)
      · refine Or.inr ⟨d, List.mem_cons_of_mem _ hd, hcd, ?_⟩
        intro x hx hcx
        cases hx with
        | head => exact by omega
        | tail _ h => exact hmin x h hcx

/-- The empirical best criterion on a ledger is one of its observed scores: for every criterion, either an observed
    score has exactly the same empirical cost, or every call at that criterion is no. -/
theorem best_criterion_observed (k : Values) (ledger : List Trial) (c : Int) :
    (∃ d ∈ ledger.map (·.score), cost k d ledger = cost k c ledger) ∨ (∀ t ∈ ledger, t.score < c) := by
  cases least_above c (ledger.map (·.score)) with
  | inl hall =>
    exact Or.inr (fun t ht => hall t.score (List.mem_map_of_mem ht))
  | inr hex =>
    obtain ⟨d, hd, hcd, hmin⟩ := hex
    refine Or.inl ⟨d, hd, (cost_congr k ledger ?_).symm⟩
    intro t ht
    have hs : t.score ∈ ledger.map (·.score) := List.mem_map_of_mem ht
    exact ⟨fun h => hmin t.score hs h, fun h => Int.le_trans hcd h⟩

end Detection
