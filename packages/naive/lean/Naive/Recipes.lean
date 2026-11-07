/-
  Autoresearch over venture records (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md). A recipe
  is the code that makes every record at one route pattern from the signals and facts known as of a time. An
  experiment is one write of a recipe, scored inside the router against a frozen eval plan, and kept or discarded.
  The terms experiment, kept-experiment, discarded-experiment, eval-plan and settled-record
  (packages/naive/src/terms/terms.ts) cite these theorems. They hold for every log, plan and recipe, not a sample:

  * As-of reads have no lookahead. What a record held at transaction time `t`, and the signals observed by `t`, are
    unchanged by anything written or observed after `t`, so a pure recipe run as of `t` renders the same record
    whatever came later (`as_of_no_lookahead`).
  * The windows are purged. Every training point's outcome settles before the first dev point, every dev point's
    before the first holdout point, and every holdout point's before the plan was made (`windows_purged`).
  * The holdout is unread. The researcher reads as of the read cut and never the eval set, so nothing written at
    or after a holdout point changes what it reads (`holdout_unread`).
  * Noise is inert. When the check finds no disagreement, a signal the recipe called noise leaves the record
    byte-identical when it is removed, so its hindsight label is inert under every loss and settled record
    (`noise_inert`).
  * The verdict is deterministic. It is a function of the plan, its rows, the tip and the candidate: the score the
    writer claims, who the writer is and the wall clock never change it (`verdict_deterministic`); a retried write
    returns the logged line and spends nothing (`retry_spends_nothing`); and a failed row discards the experiment
    (`failed_row_discards`).
  * An agent never resolves an outcome. A claim is settled when a person states it or two distinct producers
    confirm it; adding agent statements never changes whether it is settled (`agent_never_resolves`), so agent
    statements alone settle nothing (`agent_alone_settles_nothing`).

  The model is small on purpose. Times, routes, record contents, signal addresses, producers and claims are
  natural numbers, and losses and gains are integers, scaled to whole numbers first where they are rational.

  Core Lean only, no Mathlib, and no `Concept` definition, so the agreement test asks no admitted term of this file.
-/

namespace Recipes

/-! ## As-of reads -/

/-- [D] One provenance line with the bytes it names: the route written, the transaction time and the content. -/
structure Entry where
  route : Nat
  tx : Nat
  content : Nat

/-- [D] The record at `r` as it was at transaction time `t`: the content of the last line for `r` written at or
    before `t`, or nothing. -/
def readAsOf (log : List Entry) (r t : Nat) : Option Nat :=
  log.foldl (fun acc e => if e.route = r ∧ e.tx ≤ t then some e.content else acc) none

/-- [D] A signal as the recipe sees it: its address, its valid time and its transaction time (`observed`). -/
structure Signal where
  id : Nat
  time : Nat
  observed : Nat

/-- [D] The heard signals as of `t`: those observed at or before `t`. -/
def heardAsOf (ss : List Signal) (t : Nat) : List Signal := ss.filter (fun s => decide (s.observed ≤ t))

theorem foldl_later (r t : Nat) (later : List Entry) (h : ∀ e ∈ later, t < e.tx) (acc : Option Nat) :
    later.foldl (fun acc e => if e.route = r ∧ e.tx ≤ t then some e.content else acc) acc = acc := by
  induction later generalizing acc with
  | nil => rfl
  | cons e es ih =>
    have he : ¬ (e.route = r ∧ e.tx ≤ t) := fun hc => Nat.lt_irrefl _ (Nat.lt_of_lt_of_le (h e List.mem_cons_self) hc.2)
    simp only [List.foldl_cons, he, ite_false]
    exact ih (fun x hx => h x (List.mem_cons_of_mem _ hx)) acc

theorem readAsOf_later (log later : List Entry) (r t : Nat) (h : ∀ e ∈ later, t < e.tx) :
    readAsOf (log ++ later) r t = readAsOf log r t := by
  unfold readAsOf
  rw [List.foldl_append]
  exact foldl_later r t later h _

theorem heardAsOf_later (ss later : List Signal) (t : Nat) (h : ∀ s ∈ later, t < s.observed) :
    heardAsOf (ss ++ later) t = heardAsOf ss t := by
  unfold heardAsOf
  rw [List.filter_append]
  have : later.filter (fun s => decide (s.observed ≤ t)) = [] := by
    rw [List.filter_eq_nil_iff]
    intro s hs
    simp only [decide_eq_true_eq]
    exact Nat.not_le_of_lt (h s hs)
  rw [this, List.append_nil]

/-- A pure recipe run as of `t` renders the same record whatever is written or observed after `t`: it reads the
    record at its route and the heard signals, and neither changes. -/
theorem as_of_no_lookahead {α : Type} (recipe : Option Nat → List Signal → α)
    (log later : List Entry) (ss newer : List Signal) (r t : Nat)
    (hlog : ∀ e ∈ later, t < e.tx) (hsig : ∀ s ∈ newer, t < s.observed) :
    recipe (readAsOf (log ++ later) r t) (heardAsOf (ss ++ newer) t) = recipe (readAsOf log r t) (heardAsOf ss t) := by
  rw [readAsOf_later log later r t hlog, heardAsOf_later ss newer t hsig]

/-! ## The eval plan -/

/-- [D] An eval plan: its as-of points, the two cuts between windows, the horizon (at least one), and when it was
    made. The read cut is the first cut. -/
structure Plan where
  points : List Nat
  devStart : Nat
  holdStart : Nat
  horizon : Nat
  made : Nat
  horizon_pos : 0 < horizon
  ordered : devStart ≤ holdStart

/-- [D] Training points: before the first cut. -/
def training (p : Plan) : List Nat := p.points.filter (fun x => decide (x < p.devStart))
/-- [D] Dev points: a horizon after the first cut and before the second. -/
def dev (p : Plan) : List Nat := p.points.filter (fun x => decide (p.devStart + p.horizon ≤ x ∧ x < p.holdStart))
/-- [D] Holdout points: a horizon after the second cut, settled by the time the plan was made. -/
def holdout (p : Plan) : List Nat := p.points.filter (fun x => decide (p.holdStart + p.horizon ≤ x ∧ x + p.horizon ≤ p.made))

/-- The windows are purged: a point's outcome settles a horizon after it, and every training outcome settles
    before the first dev point, every dev outcome before the first holdout point, and every holdout outcome by the
    time the plan was made. -/
theorem windows_purged (p : Plan) :
    (∀ x ∈ training p, ∀ y ∈ dev p, x + p.horizon < y) ∧
    (∀ y ∈ dev p, ∀ z ∈ holdout p, y + p.horizon < z) ∧
    (∀ z ∈ holdout p, z + p.horizon ≤ p.made) := by
  refine ⟨?_, ?_, ?_⟩
  · intro x hx y hy
    simp only [training, dev, List.mem_filter, decide_eq_true_eq] at hx hy
    omega
  · intro y hy z hz
    simp only [dev, holdout, List.mem_filter, decide_eq_true_eq] at hy hz
    omega
  · intro z hz
    simp only [holdout, List.mem_filter, decide_eq_true_eq] at hz
    exact hz.2.2

/-- [D] What the researcher reads: nothing in the eval set, and every other record as of the read cut, whatever
    time it asks for. -/
def researcherRead (p : Plan) (isEval : Nat → Bool) (log : List Entry) (r t : Nat) : Option Nat :=
  if isEval r then none else readAsOf log r (min t p.devStart)

/-- The holdout is unread: the researcher reads nothing in the eval set, and nothing written at or after a holdout
    point changes what it reads. -/
theorem holdout_unread (p : Plan) (isEval : Nat → Bool) (log later : List Entry) (r t : Nat)
    (hlater : ∀ e ∈ later, ∃ z ∈ holdout p, z ≤ e.tx) :
    researcherRead p isEval (log ++ later) r t = researcherRead p isEval log r t ∧
    (isEval r = true → researcherRead p isEval log r t = none) := by
  refine ⟨?_, fun h => by simp [researcherRead, h]⟩
  unfold researcherRead
  cases isEval r
  · simp only [Bool.false_eq_true, ite_false]
    apply readAsOf_later
    intro e he
    obtain ⟨z, hz, hze⟩ := hlater e he
    simp only [holdout, List.mem_filter, decide_eq_true_eq] at hz
    have := p.horizon_pos
    have := p.ordered
    omega
  · rfl

/-! ## Noise -/

/-- [D] The signals without one of them. -/
def ablate (ss : List Nat) (s : Nat) : List Nat := ss.filter (fun x => x != s)

/-- [D] The check's disagreements: signals the recipe called noise whose removal changes the record. -/
def disagreements {α : Type} [DecidableEq α] (render : List Nat → α) (calledNoise : Nat → Bool) (ss : List Nat) :
    List Nat :=
  ss.filter (fun s => calledNoise s && decide (render (ablate ss s) ≠ render ss))

/-- [D] A hindsight label. -/
inductive Label where
  | helpful
  | inert
  | harmful
  deriving DecidableEq

/-- [D] The hindsight label of a signal: compare the loss of the record without it with the loss with it, against
    the settled record. Lower without is harmful, equal is inert, higher is helpful. -/
def hindsight {α : Type} (render : List Nat → α) (loss : α → α → Int) (settled : α) (ss : List Nat) (s : Nat) : Label :=
  let without := loss (render (ablate ss s)) settled
  let with_ := loss (render ss) settled
  if without < with_ then .harmful else if without = with_ then .inert else .helpful

/-- When the check finds no disagreement, every signal the recipe called noise leaves the record byte-identical
    when removed, so its hindsight label is inert under every loss and every settled record. -/
theorem noise_inert {α : Type} [DecidableEq α] (render : List Nat → α) (calledNoise : Nat → Bool) (ss : List Nat)
    (hcheck : disagreements render calledNoise ss = []) (s : Nat) (hs : s ∈ ss) (hn : calledNoise s = true)
    (loss : α → α → Int) (settled : α) :
    render (ablate ss s) = render ss ∧ hindsight render loss settled ss s = .inert := by
  have same : render (ablate ss s) = render ss := by
    unfold disagreements at hcheck
    rw [List.filter_eq_nil_iff] at hcheck
    have := hcheck s hs
    simp only [hn, Bool.true_and, decide_eq_true_eq, Classical.not_not] at this
    exact this
  refine ⟨same, ?_⟩
  simp [hindsight, same]

/-! ## The verdict -/

/-- [D] One paired row: whether both recipes ran, the tip's loss and the candidate's. -/
structure Row where
  ok : Bool
  tipLoss : Int
  candLoss : Int

/-- [D] What the write carries besides the source: the score the writer claims, who wrote and the wall clock. None
    of it enters the verdict. -/
structure Writer where
  claimed : Option Int
  isAgent : Bool
  now : Nat

/-- [D] The dev gain: the tip's total loss minus the candidate's. Positive is better. -/
def gain (rows : List Row) : Int := (rows.map (fun r => r.tipLoss - r.candLoss)).foldl (· + ·) 0

/-- [D] Keep or discard. Every row must run. The candidate is kept when its gain beats the margin, or when it is no
    worse and strictly smaller. The margin is `max(min_gain, 2 x standard error)`, with the error a function of the
    rows and the plan's sha (a seeded block bootstrap). -/
def verdict (sha : Nat) (minGain : Int) (se : Nat → List Row → Int) (rows : List Row) (smaller : Bool)
    (_w : Writer) : Bool :=
  rows.all (·.ok) && (decide (max minGain (2 * se sha rows) < gain rows) || (smaller && decide (0 ≤ gain rows)))

/-- The verdict is a function of the plan's sha and floor, its rows and the two recipes: two runs agree, whatever
    score the writer claims, whoever wrote and whenever it ran. -/
theorem verdict_deterministic (sha : Nat) (minGain : Int) (se : Nat → List Row → Int) (rows : List Row)
    (smaller : Bool) (w₁ w₂ : Writer) :
    verdict sha minGain se rows smaller w₁ = verdict sha minGain se rows smaller w₂ := rfl

/-- Any row that did not run discards the experiment. -/
theorem failed_row_discards (sha : Nat) (minGain : Int) (se : Nat → List Row → Int) (rows : List Row)
    (smaller : Bool) (w : Writer) (r : Row) (hr : r ∈ rows) (hok : r.ok = false) :
    verdict sha minGain se rows smaller w = false := by
  unfold verdict
  have : rows.all (·.ok) = false := by
    rw [Bool.eq_false_iff]
    intro h
    rw [List.all_eq_true] at h
    rw [h r hr] at hok
    cases hok
  rw [this, Bool.false_and]

/-- [D] One experiment line: the plan's sha, the base it was edited from, the candidate's sha and the verdict. -/
structure Line where
  plan : Nat
  base : Nat
  cand : Nat
  kept : Bool

/-- [D] Evaluate a write: a write already in the log returns its line and spends nothing; a new one is scored and
    appended. The result is the line and the log after it. -/
def evaluate (log : List Line) (plan base cand : Nat) (score : Bool) : Line × List Line :=
  match log.find? (fun l => l.plan == plan && l.base == base && l.cand == cand) with
  | some l => (l, log)
  | none => let l : Line := ⟨plan, base, cand, score⟩; (l, log ++ [l])

/-- A retried write returns the logged line and leaves the log, and so the budget counted from it, unchanged. -/
theorem retry_spends_nothing (log : List Line) (plan base cand : Nat) (score score' : Bool) :
    let first := evaluate log plan base cand score
    evaluate first.2 plan base cand score' = first := by
  simp only [evaluate]
  cases h : log.find? (fun l => l.plan == plan && l.base == base && l.cand == cand) with
  | some l => simp [h]
  | none =>
    simp only
    rw [List.find?_append, h, Option.none_or]
    simp

/-! ## Outcomes -/

/-- [D] Who made a statement: a person, a producer (by id) or an agent. -/
inductive Kind where
  | person
  | producer (id : Nat)
  | agent
  deriving DecidableEq

/-- [D] A statement that a claim held. -/
structure Statement where
  claim : Nat
  by_ : Kind

/-- [D] A person stated the claim. -/
def personStates (ss : List Statement) (c : Nat) : Bool := ss.any (fun s => decide (s.claim = c ∧ s.by_ = .person))

/-- [D] The producers that confirmed the claim. -/
def producersOf (ss : List Statement) (c : Nat) : List Nat :=
  ss.filterMap (fun s => if s.claim = c then match s.by_ with | .producer p => some p | _ => none else none)

/-- [D] The claim is settled: a person stated it, or two distinct producers confirmed it. -/
def settled (ss : List Statement) (c : Nat) : Bool :=
  personStates ss c || decide (∃ p ∈ producersOf ss c, ∃ q ∈ producersOf ss c, p ≠ q)

/-- Adding agent statements never changes whether a claim is settled, so no agent can label its own work. -/
theorem agent_never_resolves (ss more : List Statement) (c : Nat) (h : ∀ s ∈ more, s.by_ = .agent) :
    settled (ss ++ more) c = settled ss c := by
  have hp : personStates more c = false := by
    unfold personStates
    rw [Bool.eq_false_iff]
    intro hc
    rw [List.any_eq_true] at hc
    obtain ⟨s, hs, hd⟩ := hc
    simp only [decide_eq_true_eq] at hd
    rw [h s hs] at hd
    cases hd.2
  have hq : producersOf more c = [] := by
    unfold producersOf
    rw [List.filterMap_eq_nil_iff]
    intro s hs
    simp [h s hs]
  unfold settled
  rw [show personStates (ss ++ more) c = (personStates ss c || personStates more c) from List.any_append,
    show producersOf (ss ++ more) c = producersOf ss c ++ producersOf more c from List.filterMap_append, hp, hq,
    Bool.or_false, List.append_nil]

/-- Agent statements alone settle nothing. -/
theorem agent_alone_settles_nothing (ss : List Statement) (c : Nat) (h : ∀ s ∈ ss, s.by_ = .agent) :
    settled ss c = false := by
  have := agent_never_resolves [] ss c h
  rw [List.nil_append] at this
  rw [this]
  simp [settled, personStates, producersOf]

end Recipes
