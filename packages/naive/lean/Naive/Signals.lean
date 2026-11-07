/-
  Signal library (everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md). A signal is an immutable, dated,
  rated statement that something happened outside the venture, an element of one signal type. A listener joins a
  signal type to one consumer and carries that consumer's criterion. When a listener hears a signal, the reception
  is salient when the criterion holds and noise when it fails. Noise is the outcome of one signal at one listener,
  never a field of the signal. The terms signal, listener, reception, salient-reception and noise
  (packages/naive/src/terms/terms.ts) cite these theorems. They hold for every signal and listener, not a sample:

  * Noise belongs to the pair. Every signal is salient at some listener and noise at another under the same facts
    (`noise_relative`), so no property of the signal alone tells noise from salient (`noise_undefinable`). The same
    signal at the same listener can also turn from salient to noise when a fact its criterion reads changes
    (`noise_relative_facts`).
  * A listener that hears a signal finds it salient or noise, never both, and one that does not hear it finds
    neither (`noise_salient_partition`). Over a list of signals the heard ones split into the salient ones and the
    noise (`noise_salient_count`).
  * Withdrawal only grows. A signal withdrawn by a log stays withdrawn when more signals are appended
    (`withdraw_monotone`), so a signal live in the longer log was live in the shorter one (`live_shrinks`). A
    retraction or a supersession counts only from the signal's own producer or from a person in the local library.
  * Reconciling is idempotent. After a commit of the rendered records the diff is empty, so a second pull writes
    nothing (`reconcile_idempotent`), committing twice is committing once (`commit_idempotent`), and when the diff
    is empty the commit changes no record (`unchanged_not_rewritten`). The projector never deletes: a record the
    render leaves out keeps what it holds.
  * A listener for a part's type hears every composite that has that part (`part_heard`), and a listener hears a
    signal exactly when it names the signal's type or one of its parts' types (`heard_iff`).

  The model is small on purpose. Types, producers, ids and record contents are natural numbers. An Admiralty rating
  is two ranks, 0 to 5, lower being better: reliability A to F and credibility 1 to 6. A listener's criterion is its
  rating bounds and a list of predicates over the venture's facts and the signal. Accepted producer prefixes and an
  edge listener's age bound are predicates in this model: each reads the signal, and the age bound reads the clock
  as a fact, so both join the list. The facts are one value per field a predicate reads through the router.

  Core Lean only, no Mathlib, and no `Concept` definition, so the agreement test asks no admitted term of this file.
-/

namespace Signals

/-! ## Signals, listeners and receptions -/

/-- [D] An Admiralty rating (NATO STANAG 2511) as two ranks, lower being better: source reliability A to F is 0 to 5,
    and information credibility 1 to 6 is 0 to 5. -/
structure Rating where
  reliability : Nat
  credibility : Nat

/-- [D] A signal: its content address, its type, the types of the parts it composes, its producer, when the thing
    happened, its rating, its props, and the signal it retracts or supersedes, if any. -/
structure Signal where
  id : Nat
  type : Nat
  parts : List Nat
  producer : Nat
  time : Nat
  rating : Rating
  props : Nat → Int
  withdraws : Option Nat

/-- [D] The venture's facts a criterion may read: one value per field of one record, read through the router. -/
abbrev Facts := Nat → Int

/-- [D] A listener: the type it hears, the worst reliability and credibility it accepts, and its predicates. -/
structure Listener where
  hears : Nat
  reliability : Nat
  credibility : Nat
  criterion : List (Facts → Signal → Bool)

/-- [D] The listener hears the signal: it names the signal's type or the type of one of its parts. -/
def heard (l : Listener) (s : Signal) : Bool := decide (l.hears = s.type ∨ l.hears ∈ s.parts)

/-- [D] The criterion holds: the rating is within the listener's bounds and every predicate holds. -/
def admits (f : Facts) (l : Listener) (s : Signal) : Bool :=
  decide (s.rating.reliability ≤ l.reliability) && decide (s.rating.credibility ≤ l.credibility) &&
    l.criterion.all (fun p => p f s)

/-- [D] The two outcomes of a reception. -/
inductive Outcome where
  | salient
  | noise
  deriving DecidableEq

/-- [D] One signal at one listener: nothing when the listener does not hear it, otherwise salient when the
    criterion holds and noise when it fails. -/
def receive (f : Facts) (l : Listener) (s : Signal) : Option Outcome :=
  if heard l s then some (if admits f l s then .salient else .noise) else none

theorem heard_of_receive {f : Facts} {l : Listener} {s : Signal} {o : Outcome} (h : receive f l s = some o) :
    heard l s = true := by
  unfold receive at h
  cases hh : heard l s
  · simp [hh] at h
  · rfl

/-! ## Noise belongs to the pair -/

/-- Every signal is salient at one listener and noise at another, under the same facts. Both listeners hear the
    signal's type and accept its rating; the second has one predicate that fails. -/
theorem noise_relative (f : Facts) (s : Signal) :
    ∃ l₁ l₂ : Listener, receive f l₁ s = some .salient ∧ receive f l₂ s = some .noise := by
  refine ⟨⟨s.type, s.rating.reliability, s.rating.credibility, []⟩,
    ⟨s.type, s.rating.reliability, s.rating.credibility, [fun _ _ => false]⟩, ?_, ?_⟩ <;>
    simp [receive, heard, admits]

/-- No property of the signal alone defines noise: there is no test over the signal's facts that, at every
    listener hearing it, says noise exactly when the reception is noise. -/
theorem noise_undefinable (f : Facts) :
    ¬ ∃ P : Signal → Bool, ∀ (l : Listener) (s : Signal), heard l s = true →
      (receive f l s = some .noise ↔ P s = true) := by
  intro ⟨P, hP⟩
  let s : Signal := ⟨0, 0, [], 0, 0, ⟨0, 0⟩, fun _ => 0, none⟩
  obtain ⟨l₁, l₂, h₁, h₂⟩ := noise_relative f s
  have yes : P s = true := (hP l₂ s (heard_of_receive h₂)).mp h₂
  have no := (hP l₁ s (heard_of_receive h₁)).mpr yes
  rw [h₁] at no
  cases no

/-- The same signal at the same listener is salient under one set of facts and noise under another: changing a fact
    its criterion reads (the ICP's markets, say) changes the reception. -/
theorem noise_relative_facts (s : Signal) :
    ∃ (l : Listener) (f₁ f₂ : Facts), receive f₁ l s = some .salient ∧ receive f₂ l s = some .noise := by
  refine ⟨⟨s.type, s.rating.reliability, s.rating.credibility, [fun f _ => f 0 == 0]⟩,
    fun _ => 0, fun _ => 1, ?_, ?_⟩ <;> simp [receive, heard, admits]

/-- A listener that hears a signal finds it salient or noise, and never both; one that does not hear it finds
    neither. -/
theorem noise_salient_partition (f : Facts) (l : Listener) (s : Signal) :
    (heard l s = true ↔ (receive f l s = some .salient ∨ receive f l s = some .noise)) ∧
    ¬ (receive f l s = some .salient ∧ receive f l s = some .noise) := by
  refine ⟨⟨fun hh => ?_, fun h => ?_⟩, fun ⟨h₁, h₂⟩ => ?_⟩
  · unfold receive
    simp only [hh, ite_true]
    cases admits f l s <;> simp
  · cases h with
    | inl h => exact heard_of_receive h
    | inr h => exact heard_of_receive h
  · rw [h₁] at h₂
    cases h₂

/-- [D] How many signals in a list pass `p`. -/
def count (p : Signal → Bool) : List Signal → Nat
  | [] => 0
  | s :: ss => (if p s then 1 else 0) + count p ss

/-- [D] The reception is salient. -/
def salientAt (f : Facts) (l : Listener) (s : Signal) : Bool := receive f l s == some .salient

/-- [D] The reception is noise. -/
def noiseAt (f : Facts) (l : Listener) (s : Signal) : Bool := receive f l s == some .noise

/-- Over any list of signals, the ones a listener hears split into the salient ones and the noise. -/
theorem noise_salient_count (f : Facts) (l : Listener) (ss : List Signal) :
    count (heard l) ss = count (salientAt f l) ss + count (noiseAt f l) ss := by
  induction ss with
  | nil => rfl
  | cons s ss ih =>
    simp only [count]
    rw [ih]
    cases hh : heard l s
    · simp [salientAt, noiseAt, receive, hh]
    · cases ha : admits f l s <;> simp [salientAt, noiseAt, receive, hh, ha] <;> omega

/-! ## Withdrawal -/

/-- [D] The producer a person in the venture's local library writes as. -/
def person : Nat := 0

/-- [D] Signal `w` withdraws signal `t`: it retracts or supersedes `t`'s address, and comes from `t`'s own producer or
    from a person in the local library. -/
def withdraws (w t : Signal) : Bool := w.withdraws == some t.id && (w.producer == t.producer || w.producer == person)

/-- [D] Some signal in the log withdraws `t`. -/
def withdrawn (log : List Signal) (t : Signal) : Bool := log.any (fun w => withdraws w t)

/-- [D] The signals of the log that nothing in it withdraws: what the render folds. -/
def live (log : List Signal) : List Signal := log.filter (fun t => !withdrawn log t)

/-- A signal withdrawn by a log stays withdrawn when more signals are appended. -/
theorem withdraw_monotone (log more : List Signal) (t : Signal) (h : withdrawn log t = true) :
    withdrawn (log ++ more) t = true := by
  unfold withdrawn at *
  rw [List.any_append, h]
  rfl

/-- Appending signals never brings one back: a signal live in the longer log, and in the shorter one, was live in
    the shorter one. -/
theorem live_shrinks (log more : List Signal) (t : Signal) (hlive : t ∈ live (log ++ more)) (hin : t ∈ log) :
    t ∈ live log := by
  unfold live at *
  rw [List.mem_filter] at hlive ⊢
  refine ⟨hin, ?_⟩
  cases hw : withdrawn log t
  · rfl
  · have := withdraw_monotone log more t hw
    rw [this] at hlive
    cases hlive.2

/-! ## Reconciling -/

/-- [D] Records by id: what each record holds, or nothing. -/
abbrev Records := Nat → Option Nat

/-- [D] The diff of the rendered records `d` against the venture `v` over the touched ids: every id the render
    holds a record for whose content differs in the venture. -/
def diff (v d : Records) (ids : List Nat) : List Nat := ids.filter (fun i => (d i).isSome && v i != d i)

/-- [D] Commit: each touched id the render holds a record for takes the rendered content. Every other record keeps
    what it holds, so the projector deletes nothing. -/
def commit (v d : Records) (ids : List Nat) : Records :=
  fun i => if i ∈ ids ∧ (d i).isSome = true then d i else v i

theorem filter_nil_of {p : Nat → Bool} {l : List Nat} (h : ∀ x ∈ l, p x = false) : l.filter p = [] := by
  induction l with
  | nil => rfl
  | cons x xs ih =>
    rw [List.filter_cons, h x List.mem_cons_self]
    exact ih (fun y hy => h y (List.mem_cons_of_mem _ hy))

theorem false_of_filter_nil {p : Nat → Bool} {l : List Nat} (h : l.filter p = []) : ∀ x ∈ l, p x = false := by
  induction l with
  | nil => intro x hx; cases hx
  | cons y ys ih =>
    intro x hx
    rw [List.filter_cons] at h
    cases hp : p y
    · rw [hp] at h
      cases hx with
      | head => exact hp
      | tail _ hx => exact ih h x hx
    · rw [hp] at h
      cases h

/-- After a commit of the rendered records, the diff is empty, so a second pull writes nothing. -/
theorem reconcile_idempotent (v d : Records) (ids : List Nat) : diff (commit v d ids) d ids = [] := by
  unfold diff
  apply filter_nil_of
  intro i hi
  cases hs : (d i).isSome
  · rfl
  · simp [commit, hi, hs]

/-- Committing the same render twice is committing it once. -/
theorem commit_idempotent (v d : Records) (ids : List Nat) : commit (commit v d ids) d ids = commit v d ids := by
  funext i
  unfold commit
  by_cases h : i ∈ ids ∧ (d i).isSome = true <;> simp [h]

/-- When the diff is empty, the commit changes no record: an unchanged record is verified, not rewritten. -/
theorem unchanged_not_rewritten (v d : Records) (ids : List Nat) (h : diff v d ids = []) : commit v d ids = v := by
  funext i
  unfold commit
  by_cases hc : i ∈ ids ∧ (d i).isSome = true
  · have := false_of_filter_nil h i hc.1
    simp [hc.2] at this
    simp [hc, this]
  · simp [hc]

/-! ## Parts -/

/-- A listener hears a signal exactly when it names the signal's type or the type of one of its parts. -/
theorem heard_iff (l : Listener) (s : Signal) : heard l s = true ↔ (l.hears = s.type ∨ l.hears ∈ s.parts) := by
  simp [heard]

/-- A listener for a part's type hears every composite that has that part: a listener for `organization@1` hears
    the `org` part of every `competitor-funding` signal. -/
theorem part_heard (l : Listener) (s : Signal) (h : l.hears ∈ s.parts) : heard l s = true :=
  (heard_iff l s).mpr (Or.inr h)

end Signals
