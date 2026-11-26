/-
  Element state and propagation (EE-190, EE-188; step 8 of docs/design/HOOKS_AND_LOOPS_2026-11-26.md). An element is a
  node of the element graph: a function or an APQC process group, process or activity that a workflow reaches. This
  file models `packages/naive/src/engine/element-state.ts` and proves the twelve properties the design lists for
  step 8, for every state, event and graph, not a sample.

  Correspondence with the TypeScript, function by function:

  * `Cause`, `Event`, `State` are the TypeScript unions `Cause`, `ElementEvent` and `ElementState`, constructor for
    tag. A degraded state's `was` is its own two-value type, so `was` is started or operating by construction.
  * Ids (workflows, records, elements, the person who retires) are natural numbers standing for the TypeScript
    strings, numbered in string order, so ordering ids orders the strings.
  * `Cause.key` is `causeKey`. The TypeScript key is the string `<kind>:<id>`. The four kind prefixes differ before
    the colon, so the string order is the order by kind rank (run-failed 0, run-overdue 1, stale 2, upstream 3) and
    then by id, which is `Key.lt` here. A `cleared` event in the TypeScript takes any string; a string that is no
    cause's key is a key here that no cause has (rank 4 and up), and clears nothing in both.
  * `causeOf`, `clearsOf`, `operates` and `transition` follow the TypeScript functions of the same names line for
    line. `[...kept, cause].sort(byKey)` on a sorted `kept` is `insertKey`.
  * `levelOf` is the number `levelOf` returns. Its sentences are not modelled.
  * Propagation. Elements are `Fin n`, so the TypeScript's sort of the nodes is the order of `Fin n`. The feeds are a
    list of pairs; `upsOf` is the TypeScript `ups` map, the sorted, duplicate-free upstreams of each element with self
    loops dropped. Each round reads only the round before. A round's states are a function of the previous round's
    down kinds (`downOf`), and its levels and roots of the previous round's levels, roots and down kinds, so the model
    iterates that summary (`Summary`: down kind, level and roots per element) with `round`, and derives each
    effective state once from the settled summary with `stateAt`, which is the TypeScript fold of `upstream-down`
    events through `transition`. `round_summary` shows the derived states are a fixpoint of the TypeScript's round
    too. Roots are a membership function rather than a sorted list. `capped_by` is not modelled. The slack is a
    natural number (the TypeScript default is 1). The TypeScript loop stops at the first round that changes nothing,
    and `settles` shows that round comes by `height` and the value stays there, so the model's `propagate`, which
    runs `height + 1` rounds, is the same value.

  Proved: totality and determinism of `transition` (by construction, stated anyway), well-formed results
  (`transition_wf`), retired absorbing (`retired_absorbing`, `retire_retires`), absent leaving only on a write
  (`absent_stays`), cause-bringing events degrading (`brings_degrades`), upstream down inflationary
  (`upstream_inflationary`), clearing (`clear_last`, `clear_absent_key`), the level cap at 3 (`levelOf_le_cap`),
  propagation settling within `height` rounds (`settles`, `propagate_fixpoint`), monotone in own states and levels
  (`propagate_monotone`), an absent, retired or degraded upstream degrading what it feeds with that cause
  (`down_upstream_degrades`), the level bounds (`level_le_own`, `level_le_upstream`, `level_greatest`), the least
  fixpoint (`propagate_least`, `healthy_stays_healthy`), and independence from edge order (`edge_order_irrelevant`).

  Not proved: monotonicity is stated on the summary (down kind, degraded or not, roots, level), not on the full cause
  lists of the effective states; the TypeScript `whatIf` and `reachable` are not modelled; and that the TypeScript
  matches this model is checked on the cases in `Naive/Generated/ElementCases.lean`, which
  `node packages/naive/src/engine/element-cases.ts --check` also runs against the TypeScript, not proved.

  Core Lean only, no Mathlib, and no `Concept` definition, so the agreement test asks no admitted term of this file.
-/

namespace Elements

/-! ## States, events and causes -/

/-- [D] The data category of a record (EE-184). -/
inductive Data where
  | master
  | reference
  | transactional
  | derived
  deriving DecidableEq, Repr

/-- [D] How an upstream element passes harm down. -/
inductive Down where
  | absent
  | degraded
  | retired
  deriving DecidableEq, Repr

/-- [D] The state a degraded element left. -/
inductive Was where
  | started
  | operating
  deriving DecidableEq, Repr

/-- [D] A cause of degradation. -/
inductive Cause where
  | runFailed (workflow : Nat)
  | runOverdue (workflow : Nat)
  | stale (record : Nat)
  | upstream (element : Nat) (as : Down)
  deriving DecidableEq, Repr

/-- [D] A cause key: the kind's rank and the id. -/
structure Key where
  rank : Nat
  id : Nat
  deriving DecidableEq, Repr

/-- [D] The key order, the order of the TypeScript key strings. -/
def Key.lt (a b : Key) : Bool := a.rank < b.rank || (a.rank == b.rank && a.id < b.id)

/-- [D] `causeKey`. -/
def Cause.key : Cause → Key
  | .runFailed w => ⟨0, w⟩
  | .runOverdue w => ⟨1, w⟩
  | .stale r => ⟨2, r⟩
  | .upstream e _ => ⟨3, e⟩

/-- [D] The element state. -/
inductive State where
  | absent
  | started
  | operating
  | degraded (causes : List Cause) (was : Was)
  | retired
  deriving DecidableEq, Repr

def Was.toState : Was → State
  | .started => .started
  | .operating => .operating

/-- [D] The eight events. -/
inductive Event where
  | recordWritten (record : Nat) (data : Option Data)
  | runFinished (workflow : Nat)
  | runFailed (workflow : Nat)
  | runOverdue (workflow : Nat)
  | recordStale (record : Nat)
  | upstreamDown (element : Nat) (as : Down)
  | cleared (cause : Key)
  | retire (by_ : Nat)
  deriving DecidableEq, Repr

/-- [D] The cause an event brings. -/
def causeOf : Event → Option Cause
  | .runFailed w => some (.runFailed w)
  | .runOverdue w => some (.runOverdue w)
  | .recordStale r => some (.stale r)
  | .upstreamDown e d => some (.upstream e d)
  | _ => none

/-- [D] The cause keys an event clears. -/
def clearsOf : Event → List Key
  | .runFinished w => [⟨0, w⟩, ⟨1, w⟩]
  | .recordWritten r _ => [⟨2, r⟩]
  | .cleared k => [k]
  | _ => []

/-- [D] Whether an event is evidence the element operates. -/
def operates : Event → Bool
  | .runFinished _ => true
  | .recordWritten _ (some .transactional) => true
  | _ => false

/-- [D] Insert a cause into a list sorted by key. -/
def insertKey (c : Cause) : List Cause → List Cause
  | [] => [c]
  | d :: ds => if Key.lt c.key d.key then c :: d :: ds else d :: insertKey c ds

/-- [D] The `was` after an event. -/
def wasAfter (op : Bool) (e : Event) : Was := if op || operates e then .operating else .started

/-- [D] Add a brought cause to the kept causes, unless one with its key is there. -/
def addCause : Option Cause → List Cause → List Cause
  | some c, kept => if kept.any (fun d => d.key == c.key) then kept else insertKey c kept
  | none, kept => kept

/-- [D] The causes a degraded state keeps after an event: those it does not clear. -/
def keep (e : Event) (cs : List Cause) : List Cause := cs.filter (fun c => !(clearsOf e).contains c.key)

/-- [D] A degraded state after an event, the last branch of `transition`. -/
def stepDegraded (cs : List Cause) (w : Was) (e : Event) : State :=
  let causes := addCause (causeOf e) (keep e cs)
  let w' := wasAfter (w == .operating) e
  if causes.isEmpty then w'.toState else .degraded causes w'

/-- [D] The statechart, `transition` in the TypeScript. Total by construction. -/
def transition : State → Event → State
  | .retired, _ => .retired
  | _, .retire _ => .retired
  | .absent, e@(.recordWritten _ _) => if operates e then .operating else .started
  | .absent, _ => .absent
  | .started, e =>
    match causeOf e with
    | some c => .degraded [c] (wasAfter false e)
    | none => (wasAfter false e).toState
  | .operating, e =>
    match causeOf e with
    | some c => .degraded [c] (wasAfter true e)
    | none => (wasAfter true e).toState
  | .degraded cs w, e => stepDegraded cs w e

/-- [D] `downOf`: whether a state passes harm downstream, and as what. -/
def downOf : State → Option Down
  | .absent => some .absent
  | .retired => some .retired
  | .degraded _ _ => some .degraded
  | _ => none

/-- [D] Sorted by key, strictly, so keys are unique. -/
def Sorted (cs : List Cause) : Prop := cs.Pairwise (fun a b => Key.lt a.key b.key = true)

/-- [D] Well formed: a degraded state has a non-empty, sorted, duplicate-free cause list. -/
def WF : State → Prop
  | .degraded cs _ => cs ≠ [] ∧ Sorted cs
  | _ => True

/-- [D] The cause keys of a state, empty unless degraded. -/
def keys : State → List Key
  | .degraded cs _ => cs.map Cause.key
  | _ => []

/-! ## The transition function -/

theorem Key.lt_trans {a b c : Key} (h₁ : Key.lt a b = true) (h₂ : Key.lt b c = true) : Key.lt a c = true := by
  simp only [Key.lt, Bool.or_eq_true, Bool.and_eq_true, beq_iff_eq, decide_eq_true_eq] at *
  omega

theorem Key.lt_total {a b : Key} (h₁ : Key.lt a b = false) (h₂ : a ≠ b) : Key.lt b a = true := by
  cases a; cases b
  simp only [Key.lt, Bool.or_eq_false_iff, Bool.and_eq_false_imp, beq_iff_eq, decide_eq_false_iff_not,
    Bool.or_eq_true, Bool.and_eq_true, decide_eq_true_eq, ne_eq, Key.mk.injEq] at *
  omega

theorem mem_insertKey {c x : Cause} {l : List Cause} : x ∈ insertKey c l ↔ x = c ∨ x ∈ l := by
  induction l with
  | nil => simp [insertKey]
  | cons d ds ih =>
    unfold insertKey
    split <;> simp_all [or_left_comm]

theorem insertKey_sorted {c : Cause} {l : List Cause} (hs : Sorted l) (hn : ∀ d ∈ l, d.key ≠ c.key) :
    Sorted (insertKey c l) := by
  induction l with
  | nil => simp [insertKey, Sorted]
  | cons d ds ih =>
    simp only [Sorted, List.pairwise_cons] at hs
    unfold insertKey
    split
    · rename_i hlt
      refine List.pairwise_cons.2 ⟨?_, List.pairwise_cons.2 hs⟩
      intro x hx
      rcases List.mem_cons.1 hx with rfl | hx
      · exact hlt
      · exact Key.lt_trans hlt (hs.1 x hx)
    · rename_i hlt
      refine List.pairwise_cons.2 ⟨?_, ih hs.2 (fun x hx => hn x (List.mem_cons_of_mem _ hx))⟩
      intro x hx
      rcases mem_insertKey.1 hx with rfl | hx
      · exact Key.lt_total (by simpa using hlt) (fun h => hn d (List.mem_cons_self) h.symm)
      · exact hs.1 x hx

theorem insertKey_ne_nil (c : Cause) (l : List Cause) : insertKey c l ≠ [] := by
  cases l <;> simp [insertKey] <;> split <;> simp

theorem addCause_sorted (o : Option Cause) {l : List Cause} (hs : Sorted l) : Sorted (addCause o l) := by
  cases o with
  | none => exact hs
  | some c =>
    simp only [addCause]
    split
    · exact hs
    · rename_i hany
      apply insertKey_sorted hs
      intro d hd heq
      exact hany (List.any_eq_true.2 ⟨d, hd, by simp [heq]⟩)

theorem mem_addCause {o : Option Cause} {l : List Cause} {x : Cause} (h : x ∈ l) : x ∈ addCause o l := by
  cases o with
  | none => exact h
  | some c => simp only [addCause]; split; exact h; exact mem_insertKey.2 (Or.inr h)

theorem key_mem_addCause (c : Cause) (l : List Cause) : c.key ∈ (addCause (some c) l).map Cause.key := by
  simp only [addCause]
  split
  · rename_i hany
    obtain ⟨d, hd, hk⟩ := List.any_eq_true.1 hany
    exact List.mem_map.2 ⟨d, hd, by simpa using hk⟩
  · exact List.mem_map.2 ⟨c, mem_insertKey.2 (Or.inl rfl), rfl⟩

theorem addCause_some_ne_nil (c : Cause) (l : List Cause) : addCause (some c) l ≠ [] := by
  simp only [addCause]
  split
  · rename_i hany; intro h; simp [h] at hany
  · exact insertKey_ne_nil c l

/-- Determinism: `transition` is a function, so one state and event give one state. -/
theorem transition_deterministic {s : State} {e : Event} {t u : State}
    (ht : transition s e = t) (hu : transition s e = u) : t = u := ht ▸ hu

theorem wf_toState (w : Was) : WF w.toState := by cases w <;> trivial

/-- Totality: every state and event give a state, and a well-formed state gives a well-formed one. -/
theorem transition_wf (s : State) (e : Event) (hs : WF s) : WF (transition s e) := by
  cases s with
  | retired => trivial
  | absent => cases e <;> simp only [transition] <;> (try split) <;> trivial
  | started =>
    cases e <;> simp only [transition, causeOf] <;> (try split) <;> first | exact wf_toState _ | simp [WF, Sorted]
  | operating =>
    cases e <;> simp only [transition, causeOf] <;> (try split) <;> first | exact wf_toState _ | simp [WF, Sorted]
  | degraded cs w =>
    cases e with
    | retire _ => trivial
    | _ =>
      simp only [transition, stepDegraded]
      split
      · exact wf_toState _
      · rename_i hne
        exact ⟨by simpa using hne, addCause_sorted _ (hs.2.filter _)⟩

/-- Retired is absorbing: no event leaves it. -/
theorem retired_absorbing (e : Event) : transition .retired e = .retired := rfl

/-- A retirement retires every state. -/
theorem retire_retires (s : State) (p : Nat) : transition s (.retire p) = .retired := by
  cases s <;> rfl

/-- Absent leaves only on a record written or a retirement. -/
theorem absent_stays (e : Event) (hw : ∀ r d, e ≠ .recordWritten r d) (hr : ∀ p, e ≠ .retire p) :
    transition .absent e = .absent := by
  cases e with
  | recordWritten r d => exact absurd rfl (hw r d)
  | retire p => exact absurd rfl (hr p)
  | _ => rfl

/-- A started, operating or degraded state is live. -/
def live : State → Bool
  | .started | .operating | .degraded _ _ => true
  | _ => false

/-- Adding a cause to a degraded state, by an event that clears nothing: the cause is there after and no cause is
    lost. -/
theorem degraded_add (cs : List Cause) (w : Was) (e : Event) (c : Cause) (hc : causeOf e = some c)
    (hcl : clearsOf e = []) :
    ∃ cs' w', transition (.degraded cs w) e = .degraded cs' w' ∧ c.key ∈ cs'.map Cause.key ∧
      ∀ k ∈ cs.map Cause.key, k ∈ cs'.map Cause.key := by
  have hf : keep e cs = cs := List.filter_eq_self.2 (by simp [hcl])
  have hd : transition (.degraded cs w) e = stepDegraded cs w e := by
    cases e <;> simp_all [causeOf, transition]
  rw [hd]
  simp only [stepDegraded, hf, hc]
  rw [ite_eq_right_of_eq_false _ _ (by simpa using addCause_some_ne_nil c cs)]
  exact ⟨_, _, rfl, key_mem_addCause c cs, fun k hk => by
    obtain ⟨x, hx, rfl⟩ := List.mem_map.1 hk
    exact List.mem_map.2 ⟨x, mem_addCause hx, rfl⟩⟩

/-- A failed run, an overdue run, a stale record or a down upstream degrades a live state, with that cause. -/
theorem brings_degrades (s : State) (e : Event) (c : Cause) (hl : live s = true) (hc : causeOf e = some c) :
    ∃ cs w, transition s e = .degraded cs w ∧ c.key ∈ cs.map Cause.key := by
  have hcl : clearsOf e = [] := by cases e <;> simp_all [causeOf, clearsOf]
  cases s with
  | absent | retired => simp [live] at hl
  | started => cases e <;> simp_all [transition, causeOf]
  | operating => cases e <;> simp_all [transition, causeOf]
  | degraded cs w =>
    obtain ⟨cs', w', h, hk, -⟩ := degraded_add cs w e c hc hcl
    exact ⟨cs', w', h, hk⟩

/-- Upstream down is inflationary: no cause is lost and a live state ends degraded. -/
theorem upstream_inflationary (s : State) (a : Nat) (d : Down) (hl : live s = true) :
    ∃ cs w, transition s (.upstreamDown a d) = .degraded cs w ∧ ∀ k ∈ keys s, k ∈ cs.map Cause.key := by
  cases s with
  | absent | retired => simp [live] at hl
  | started => exact ⟨_, _, rfl, by simp [keys]⟩
  | operating => exact ⟨_, _, rfl, by simp [keys]⟩
  | degraded cs w =>
    obtain ⟨cs', w', h, -, hk⟩ := degraded_add cs w (.upstreamDown a d) (.upstream a d) rfl rfl
    exact ⟨cs', w', h, hk⟩

/-- Clearing the last cause returns the state the element left. -/
theorem clear_last (cs : List Cause) (w : Was) (k : Key) (h : ∀ c ∈ cs, c.key = k) :
    transition (.degraded cs w) (.cleared k) = w.toState := by
  have : keep (.cleared k) cs = [] := by
    rw [keep, List.filter_eq_nil_iff]; intro c hc; simp [clearsOf, h c hc]
  simp only [transition, stepDegraded, causeOf, addCause, this, List.isEmpty_nil, ite_true]
  cases w <;> rfl

/-- Clearing a key the state does not have changes nothing. -/
theorem clear_absent_key (cs : List Cause) (w : Was) (k : Key) (hne : cs ≠ []) (h : ∀ c ∈ cs, c.key ≠ k) :
    transition (.degraded cs w) (.cleared k) = .degraded cs w := by
  have : keep (.cleared k) cs = cs := by
    rw [keep, List.filter_eq_self]; intro c hc; simp [clearsOf, h c hc]
  simp only [transition, stepDegraded, causeOf, addCause, this]
  rw [ite_eq_right_of_eq_false _ _ (by simpa using hne)]
  cases w <;> rfl

/-! ## Capability level -/

/-- [P] The highest level Naive evidences, and the runs levels 2 and 3 ask for (unvalidated priors). -/
def CAP : Nat := 3
def managedRuns : Nat := 2
def establishedRuns : Nat := 3

/-- [D] `levelOf`: the capability level from evidence. -/
def levelOf (s : State) (performed : Bool) (finished : Nat) (recentFailure : Bool) : Nat :=
  match s with
  | .absent | .retired => 0
  | .degraded _ _ => if performed then 1 else 0
  | _ =>
    if !performed then 0
    else if finished < managedRuns then 1
    else if finished < establishedRuns || recentFailure then 2
    else 3

/-- No evidence Naive keeps raises a level above 3. -/
theorem levelOf_le_cap (s : State) (p : Bool) (f : Nat) (r : Bool) : levelOf s p f r ≤ CAP := by
  unfold levelOf CAP; split <;> (repeat' split) <;> decide

/-! ## Propagation over the feeds edges -/

section Propagation

variable {n : Nat}

/-- [D] The upstreams of each element, the TypeScript `ups`: sorted (the order of `Fin n`), without duplicates, self
    loops dropped. -/
def upsOf (feeds : List (Fin n × Fin n)) (i : Fin n) : List (Fin n) :=
  (List.finRange n).filter (fun j => j != i && feeds.contains (j, i))

/-- [D] What a round reads from the round before, per element: the down kind (`downOf` of its state), its level and
    its roots (as membership). -/
structure Summary (n : Nat) where
  kind : Fin n → Option Down
  level : Fin n → Nat
  roots : Fin n → Fin n → Bool

/-- [D] A propagation problem: each element's own state and level, its upstreams, and the slack. -/
structure Net (n : Nat) where
  own : Fin n → State
  ownLevel : Fin n → Nat
  ups : Fin n → List (Fin n)
  slack : Nat

/-- [D] The problem the TypeScript `propagate(own, feeds, slack)` solves. -/
def netOf (own : Fin n → State) (ownLevel : Fin n → Nat) (feeds : List (Fin n × Fin n)) (slack : Nat) : Net n :=
  ⟨own, ownLevel, upsOf feeds, slack⟩

/-- [D] One `upstream-down` event for an upstream that is down, nothing for one that is not. -/
def upd (s : Summary n) (st : State) (u : Fin n) : State :=
  match s.kind u with
  | some d => transition st (.upstreamDown u.val d)
  | none => st

/-- [D] An element's state in a round: its own state with `upstream-down` applied for each down upstream, in order. -/
def stateAt (N : Net n) (s : Summary n) (i : Fin n) : State := (N.ups i).foldl (upd s) (N.own i)

def isDeg : State → Bool
  | .degraded _ _ => true
  | _ => false

/-- [D] An element's level in a round: its own level capped at each upstream's level plus the slack. -/
def levelAt (N : Net n) (s : Summary n) (i : Fin n) : Nat :=
  (N.ups i).foldl (fun m u => min m (s.level u + N.slack)) (N.ownLevel i)

/-- [D] Whether some upstream is down. -/
def anyDown (N : Net n) (s : Summary n) (i : Fin n) : Bool := (N.ups i).any (fun u => (s.kind u).isSome)

/-- [D] One round. Roots: itself when its own state is down, and the roots of every down upstream when it is
    degraded. -/
def round (N : Net n) (s : Summary n) : Summary n where
  kind i := downOf (stateAt N s i)
  level i := levelAt N s i
  roots i r := (r == i && (downOf (N.own i)).isSome) ||
    (isDeg (stateAt N s i) && (N.ups i).any (fun u => (s.kind u).isSome && s.roots u r))

/-- [D] Where the TypeScript starts: each element's own state and level. -/
def start (N : Net n) : Summary n where
  kind i := downOf (N.own i)
  level i := N.ownLevel i
  roots i r := r == i && (downOf (N.own i)).isSome

/-- [D] The summary after `k` rounds. -/
def iter (N : Net n) : Nat → Summary n
  | 0 => start N
  | k + 1 => round N (iter N k)

/-- [D] A sum over a list. -/
def lsum {α : Type} (l : List α) (f : α → Nat) : Nat := l.foldr (fun x acc => f x + acc) 0

/-- [D] A sum over the elements. -/
def sumOver (f : Fin n → Nat) : Nat := lsum (List.finRange n) f

/-- [D] The height of the lattice the rounds climb: a down flag and `n` roots per element, and its own level. -/
def height (N : Net n) : Nat := n * (1 + n) + sumOver N.ownLevel

/-- [D] `propagate`: the summary after `height + 1` rounds, by which the rounds have settled (`settles`). -/
def propagate (N : Net n) : Summary n := iter N (height N + 1)

/-- [D] An element's effective state, the `state` the TypeScript returns. -/
def effState (N : Net n) (i : Fin n) : State := stateAt N (propagate N) i

/-! ### What one round does to a state -/

/-- [D] The down kind after `upstream-down` events, from the state before and whether any upstream is down. -/
def kindCF : State → Bool → Option Down
  | .absent, _ => some .absent
  | .retired, _ => some .retired
  | .degraded _ _, _ => some .degraded
  | _, b => if b then some .degraded else none

/-- [D] Whether the state is degraded after `upstream-down` events. -/
def degCF : State → Bool → Bool
  | .degraded _ _, _ => true
  | .started, b | .operating, b => b
  | _, _ => false

theorem upd_spec (s : Summary n) (st : State) (u : Fin n) (b : Bool) :
    kindCF (upd s st u) b = kindCF st ((s.kind u).isSome || b) ∧
      degCF (upd s st u) b = degCF st ((s.kind u).isSome || b) := by
  unfold upd
  cases hk : s.kind u with
  | none => simp
  | some d =>
    cases st with
    | absent | retired => simp [transition, kindCF, degCF]
    | started | operating => simp [transition, causeOf, kindCF, degCF]
    | degraded cs w =>
      obtain ⟨cs', w', h, -⟩ := upstream_inflationary (.degraded cs w) u.val d rfl
      simp [h, kindCF, degCF]

theorem foldl_upd_spec (s : Summary n) (L : List (Fin n)) (st : State) :
    downOf (L.foldl (upd s) st) = kindCF st (L.any (fun u => (s.kind u).isSome)) ∧
      isDeg (L.foldl (upd s) st) = degCF st (L.any (fun u => (s.kind u).isSome)) := by
  induction L generalizing st with
  | nil => cases st <;> simp [kindCF, degCF, downOf, isDeg]
  | cons x xs ih =>
    simp only [List.foldl_cons, List.any_cons]
    rw [(ih _).1, (ih _).2]
    exact upd_spec s st x _

theorem kind_stateAt (N : Net n) (s : Summary n) (i : Fin n) :
    downOf (stateAt N s i) = kindCF (N.own i) (anyDown N s i) := (foldl_upd_spec s _ _).1

theorem deg_stateAt (N : Net n) (s : Summary n) (i : Fin n) :
    isDeg (stateAt N s i) = degCF (N.own i) (anyDown N s i) := (foldl_upd_spec s _ _).2

theorem foldl_upd_none (s : Summary n) (L : List (Fin n)) (st : State)
    (h : L.any (fun u => (s.kind u).isSome) = false) : L.foldl (upd s) st = st := by
  induction L generalizing st with
  | nil => rfl
  | cons x xs ih =>
    simp only [List.any_cons, Bool.or_eq_false_iff] at h
    simp only [List.foldl_cons]
    have : upd s st x = st := by
      unfold upd; cases hk : s.kind x with
      | none => rfl
      | some _ => simp [hk] at h
    rw [this]; exact ih _ h.2

/-! ### The harm order and monotonicity -/

/-- [D] The down kind order: not down is below every kind, and a kind is only below itself. -/
def kle : Option Down → Option Down → Prop
  | none, _ => True
  | some a, b => b = some a

/-- [D] `Le s t`: `t` is at least as harmed as `s`, element by element: down at least as `s` is and as the same kind,
    no higher level, and every root of `s`. -/
def Le (s t : Summary n) : Prop :=
  ∀ i, kle (s.kind i) (t.kind i) ∧ t.level i ≤ s.level i ∧ ∀ r, s.roots i r = true → t.roots i r = true

theorem Le.refl (s : Summary n) : Le s s := by
  intro i; refine ⟨?_, Nat.le_refl _, fun _ h => h⟩
  cases s.kind i <;> simp [kle]

theorem Le.trans {s t u : Summary n} (h₁ : Le s t) (h₂ : Le t u) : Le s u := by
  intro i
  obtain ⟨k₁, l₁, r₁⟩ := h₁ i
  obtain ⟨k₂, l₂, r₂⟩ := h₂ i
  refine ⟨?_, Nat.le_trans l₂ l₁, fun r h => r₂ r (r₁ r h)⟩
  cases hs : s.kind i <;> simp [kle] at * <;> simp_all

/-- [D] An own state at least as harmed: down as the same kind when the other is down, and live when it is live. So
    absent and retired are fixed, and a started or operating element may become degraded. -/
def OwnLe (b a : State) : Prop := (∀ d, downOf b = some d → downOf a = some d) ∧ (live b = true → live a = true)

/-- [D] Net `A` is at least as harmed as net `B`: the same upstreams and slack, own states at least as harmed and own
    levels no higher. -/
def NetLe (B A : Net n) : Prop :=
  B.ups = A.ups ∧ B.slack = A.slack ∧ ∀ i, OwnLe (B.own i) (A.own i) ∧ A.ownLevel i ≤ B.ownLevel i

theorem NetLe.refl (N : Net n) : NetLe N N := ⟨rfl, rfl, fun _ => ⟨⟨fun _ h => h, fun h => h⟩, Nat.le_refl _⟩⟩

theorem foldl_min_le_init {α : Type} (f : α → Nat) (L : List α) (a : Nat) :
    L.foldl (fun m u => min m (f u)) a ≤ a := by
  induction L generalizing a with
  | nil => exact Nat.le_refl _
  | cons x xs ih => exact Nat.le_trans (ih _) (Nat.min_le_left _ _)

theorem foldl_min_le_mem {α : Type} (f : α → Nat) (L : List α) (a : Nat) (u : α) (hu : u ∈ L) :
    L.foldl (fun m u => min m (f u)) a ≤ f u := by
  induction L generalizing a with
  | nil => simp at hu
  | cons x xs ih =>
    rcases List.mem_cons.1 hu with rfl | hu
    · exact Nat.le_trans (foldl_min_le_init f xs _) (Nat.min_le_right _ _)
    · exact ih _ hu

theorem foldl_min_greatest {α : Type} (f : α → Nat) (L : List α) (a l : Nat) (ha : l ≤ a)
    (hf : ∀ u ∈ L, l ≤ f u) : l ≤ L.foldl (fun m u => min m (f u)) a := by
  induction L generalizing a with
  | nil => exact ha
  | cons x xs ih =>
    exact ih _ (Nat.le_min.2 ⟨ha, hf x List.mem_cons_self⟩) (fun u hu => hf u (List.mem_cons_of_mem _ hu))

theorem foldl_min_mono {α : Type} (f g : α → Nat) (L : List α) (a b : Nat) (hab : a ≤ b)
    (hfg : ∀ u ∈ L, f u ≤ g u) : L.foldl (fun m u => min m (f u)) a ≤ L.foldl (fun m u => min m (g u)) b := by
  apply foldl_min_greatest _ _ _ _ (Nat.le_trans (foldl_min_le_init _ _ _) hab)
  intro u hu
  exact Nat.le_trans (foldl_min_le_mem _ _ _ _ hu) (hfg u hu)

theorem anyDown_mono {B A : Net n} {s t : Summary n} (hN : NetLe B A) (h : Le s t) (i : Fin n)
    (hb : anyDown B s i = true) : anyDown A t i = true := by
  unfold anyDown at *
  rw [← hN.1]
  obtain ⟨u, hu, hs⟩ := List.any_eq_true.1 hb
  refine List.any_eq_true.2 ⟨u, hu, ?_⟩
  have hk := (h u).1
  cases hsk : s.kind u with
  | none => simp [hsk] at hs
  | some d => simp [hsk, kle] at hk; simp [hk]

theorem kindCF_mono {b a : State} {x y : Bool} (ho : OwnLe b a) (hxy : x = true → y = true) :
    kle (kindCF b x) (kindCF a y) := by
  obtain ⟨hd, hl⟩ := ho
  cases b <;> cases a <;> simp_all [kindCF, kle, downOf, live] <;> cases x <;> cases y <;> simp_all

theorem degCF_mono {b a : State} {x y : Bool} (ho : OwnLe b a) (hxy : x = true → y = true) :
    degCF b x = true → degCF a y = true := by
  obtain ⟨hd, hl⟩ := ho
  cases b <;> cases a <;> simp_all [degCF, downOf, live]

/-- One round is monotone in the summary and in the net. -/
theorem round_mono {B A : Net n} {s t : Summary n} (hN : NetLe B A) (h : Le s t) : Le (round B s) (round A t) := by
  intro i
  obtain ⟨hups, hsl, hown⟩ := hN
  have hany := anyDown_mono ⟨hups, hsl, hown⟩ h i
  refine ⟨?_, ?_, ?_⟩
  · simp only [round, kind_stateAt]
    exact kindCF_mono (hown i).1 hany
  · simp only [round, levelAt]
    rw [← hups, ← hsl]
    exact foldl_min_mono _ _ _ _ _ (hown i).2 (fun u _ => Nat.add_le_add_right ((h u).2.1) _)
  · intro r hr
    simp only [round, Bool.or_eq_true, Bool.and_eq_true, beq_iff_eq, deg_stateAt] at hr ⊢
    rcases hr with ⟨hri, hd⟩ | ⟨hdeg, hup⟩
    · left
      refine ⟨hri, ?_⟩
      cases hb : downOf (B.own i) with
      | none => simp [hb] at hd
      | some d => simp [(hown i).1.1 d hb]
    · right
      refine ⟨degCF_mono (hown i).1 hany hdeg, ?_⟩
      rw [← hups]
      obtain ⟨u, hu, hp⟩ := List.any_eq_true.1 hup
      simp only [Bool.and_eq_true] at hp
      obtain ⟨hk, hro⟩ := hp
      refine List.any_eq_true.2 ⟨u, hu, ?_⟩
      have hku := (h u).1
      cases hsk : s.kind u with
      | none => simp [hsk] at hk
      | some d => simp [hsk, kle] at hku; simp [hku, (h u).2.2 r hro]

theorem start_mono {B A : Net n} (hN : NetLe B A) : Le (start B) (start A) := by
  intro i
  obtain ⟨-, -, hown⟩ := hN
  refine ⟨?_, (hown i).2, ?_⟩
  · simp only [start]
    cases hb : downOf (B.own i) with
    | none => simp [kle]
    | some d => simp [kle, (hown i).1.1 d hb]
  · intro r hr
    simp only [start, Bool.and_eq_true, beq_iff_eq] at hr ⊢
    refine ⟨hr.1, ?_⟩
    cases hb : downOf (B.own i) with
    | none => simp [hb] at hr
    | some d => simp [(hown i).1.1 d hb]

/-- Every round is at least as harmed as the start. -/
theorem start_le_round (N : Net n) (s : Summary n) : Le (start N) (round N s) := by
  intro i
  refine ⟨?_, foldl_min_le_init _ _ _, ?_⟩
  · simp only [start, round, kind_stateAt]
    cases N.own i <;> simp [kindCF, kle, downOf]
  · intro r hr
    simp only [start, round, Bool.or_eq_true] at hr ⊢
    exact Or.inl hr

theorem iter_le_succ (N : Net n) (k : Nat) : Le (iter N k) (iter N (k + 1)) := by
  induction k with
  | zero => exact start_le_round N _
  | succ k ih => exact round_mono (NetLe.refl N) ih

theorem iter_level_le (N : Net n) (k : Nat) (i : Fin n) : (iter N k).level i ≤ N.ownLevel i := by
  cases k with
  | zero => exact Nat.le_refl _
  | succ k => exact foldl_min_le_init _ _ _

/-! ### Termination -/

theorem lsum_le {α : Type} (l : List α) (f g : α → Nat) (h : ∀ x ∈ l, f x ≤ g x) : lsum l f ≤ lsum l g := by
  induction l with
  | nil => exact Nat.le_refl _
  | cons x xs ih =>
    simp only [lsum, List.foldr_cons] at *
    exact Nat.add_le_add (h x List.mem_cons_self) (ih fun y hy => h y (List.mem_cons_of_mem _ hy))

theorem lsum_lt {α : Type} (l : List α) (f g : α → Nat) (h : ∀ x ∈ l, f x ≤ g x) (x : α) (hx : x ∈ l)
    (hlt : f x < g x) : lsum l f < lsum l g := by
  induction l with
  | nil => simp at hx
  | cons y ys ih =>
    simp only [lsum, List.foldr_cons] at *
    have hle := lsum_le ys f g (fun z hz => h z (List.mem_cons_of_mem _ hz))
    simp only [lsum] at hle
    rcases List.mem_cons.1 hx with rfl | hx
    · exact Nat.add_lt_add_of_lt_of_le hlt hle
    · exact Nat.add_lt_add_of_le_of_lt (h y List.mem_cons_self)
        (ih (fun z hz => h z (List.mem_cons_of_mem _ hz)) hx)

theorem lsum_add {α : Type} (l : List α) (f g : α → Nat) : lsum l (fun x => f x + g x) = lsum l f + lsum l g := by
  induction l with
  | nil => rfl
  | cons x xs ih => simp only [lsum, List.foldr_cons] at *; rw [ih]; omega

theorem lsum_const {α : Type} (l : List α) (c : Nat) : lsum l (fun _ => c) = l.length * c := by
  induction l with
  | nil => simp [lsum]
  | cons x xs ih => simp only [lsum, List.foldr_cons, List.length_cons] at *; rw [ih, Nat.succ_mul]; omega

def b2n (b : Bool) : Nat := if b then 1 else 0

theorem b2n_le {a b : Bool} (h : a = true → b = true) : b2n a ≤ b2n b := by
  cases a <;> cases b <;> simp_all [b2n]

theorem b2n_lt {a b : Bool} (ha : a = false) (hb : b = true) : b2n a < b2n b := by
  subst ha; subst hb; decide

/-- [D] The measure each round raises: down flags, roots, and levels lost. -/
def measure (N : Net n) (s : Summary n) : Nat :=
  sumOver (fun i => b2n (s.kind i).isSome + sumOver (fun r => b2n (s.roots i r)) + (N.ownLevel i - s.level i))

theorem measure_le_height (N : Net n) (s : Summary n) : measure N s ≤ height N := by
  unfold measure height sumOver
  have hc : ∀ i : Fin n, lsum (List.finRange n) (fun r => b2n (s.roots i r)) ≤ n := by
    intro i
    have := lsum_le (List.finRange n) (fun r => b2n (s.roots i r)) (fun _ => 1)
      (fun r _ => by unfold b2n; split <;> omega)
    rwa [lsum_const, List.length_finRange, Nat.mul_one] at this
  calc _ ≤ lsum (List.finRange n) (fun i => (1 + n) + N.ownLevel i) := by
          apply lsum_le; intro i _
          have := hc i
          have : b2n (s.kind i).isSome ≤ 1 := by unfold b2n; split <;> omega
          omega
    _ = _ := by rw [lsum_add, lsum_const, List.length_finRange]

theorem Summary.ext' {s t : Summary n} (hk : ∀ i, s.kind i = t.kind i) (hl : ∀ i, s.level i = t.level i)
    (hr : ∀ i r, s.roots i r = t.roots i r) : s = t := by
  cases s; cases t
  simp only [Summary.mk.injEq]
  exact ⟨funext hk, funext hl, funext fun i => funext (hr i)⟩

theorem measure_lt (N : Net n) {s t : Summary n} (h : Le s t) (hne : s ≠ t)
    (hs : ∀ i, s.level i ≤ N.ownLevel i) : measure N s < measure N t := by
  have hkind : ∀ i, (s.kind i).isSome = true → (t.kind i).isSome = true := by
    intro i hsk
    have hk := (h i).1
    cases hk' : s.kind i with
    | none => simp [hk'] at hsk
    | some d => simp [hk', kle] at hk; simp [hk]
  have hcell : ∀ i, b2n (s.kind i).isSome ≤ b2n (t.kind i).isSome ∧
      sumOver (fun r => b2n (s.roots i r)) ≤ sumOver (fun r => b2n (t.roots i r)) ∧
      N.ownLevel i - s.level i ≤ N.ownLevel i - t.level i := by
    intro i
    obtain ⟨-, hl, hr⟩ := h i
    exact ⟨b2n_le (hkind i), lsum_le _ _ _ (fun r _ => b2n_le (hr r)), by omega⟩
  have hdiff : ∃ i, s.kind i ≠ t.kind i ∨ (∃ r, s.roots i r ≠ t.roots i r) ∨ s.level i ≠ t.level i := by
    apply Classical.byContradiction
    intro hno
    apply hne
    apply Summary.ext'
    · intro i; exact Classical.byContradiction fun hc => hno ⟨i, Or.inl hc⟩
    · intro i; exact Classical.byContradiction fun hc => hno ⟨i, Or.inr (Or.inr hc)⟩
    · intro i r; exact Classical.byContradiction fun hc => hno ⟨i, Or.inr (Or.inl ⟨r, hc⟩)⟩
  obtain ⟨i, hi⟩ := hdiff
  unfold measure
  apply lsum_lt _ _ _ (fun j _ => by have := hcell j; omega) i (List.mem_finRange i)
  have hc := hcell i
  obtain ⟨hk, hl, hr⟩ := h i
  rcases hi with hi | ⟨r, hr'⟩ | hi
  · have : b2n (s.kind i).isSome < b2n (t.kind i).isSome := by
      cases hsk : s.kind i with
      | none =>
        cases htk : t.kind i with
        | none => simp [hsk, htk] at hi
        | some _ => exact b2n_lt rfl rfl
      | some d => simp [hsk, kle] at hk; simp [hsk, hk] at hi
    omega
  · have : sumOver (fun r => b2n (s.roots i r)) < sumOver (fun r => b2n (t.roots i r)) := by
      apply lsum_lt _ _ _ (fun r _ => b2n_le (hr r)) r (List.mem_finRange r)
      cases hsr : s.roots i r with
      | true => simp [hsr, hr r hsr] at hr'
      | false =>
        cases htr : t.roots i r with
        | false => simp [hsr, htr] at hr'
        | true => exact b2n_lt rfl rfl
    omega
  · have := hs i
    omega

theorem iter_fixed_stays (N : Net n) (k : Nat) (h : round N (iter N k) = iter N k) (m : Nat) :
    iter N (k + m) = iter N k := by
  induction m with
  | zero => rfl
  | succ m ih => show round N (iter N (k + m)) = _; rw [ih, h]

theorem iter_progress (N : Net n) (k : Nat) : round N (iter N k) = iter N k ∨ k ≤ measure N (iter N k) := by
  induction k with
  | zero => exact Or.inr (Nat.zero_le _)
  | succ k ih =>
    by_cases hf : round N (iter N k) = iter N k
    · left; show round N (round N (iter N k)) = round N (iter N k); rw [hf, hf]
    · right
      have hlt := measure_lt N (iter_le_succ N k) (Ne.symm hf) (iter_level_le N k)
      rcases ih with h | h
      · exact absurd h hf
      · exact Nat.le_trans (Nat.succ_le_succ h) hlt

/-- Propagation settles: after `height` rounds a round changes nothing. With levels 0 to 5 that is within the
    TypeScript's bound `n * (2n + 6) + 1` (`height_le_ts_bound`). -/
theorem settles (N : Net n) : round N (iter N (height N)) = iter N (height N) := by
  rcases iter_progress N (height N) with h | h
  · exact h
  · apply Classical.byContradiction
    intro hf
    have hlt := measure_lt N (iter_le_succ N _) (Ne.symm hf) (iter_level_le N _)
    have := measure_le_height N (iter N (height N + 1))
    omega

theorem height_le_ts_bound (N : Net n) (h5 : ∀ i, N.ownLevel i ≤ 5) : height N ≤ n * (2 * n + 6) + 1 := by
  unfold height sumOver
  have hs : lsum (List.finRange n) N.ownLevel ≤ n * 5 := by
    have := lsum_le (List.finRange n) N.ownLevel (fun _ => 5) (fun i _ => h5 i)
    rwa [lsum_const, List.length_finRange] at this
  have : n * (1 + n) + n * 5 ≤ n * (2 * n + 6) := by
    rw [← Nat.mul_add]; exact Nat.mul_le_mul_left n (by omega)
  omega

theorem propagate_eq_iter (N : Net n) (m : Nat) (hm : height N ≤ m) : propagate N = iter N m := by
  obtain ⟨d, rfl⟩ := Nat.exists_eq_add_of_le hm
  unfold propagate
  rw [iter_fixed_stays N _ (settles N) 1, iter_fixed_stays N _ (settles N) d]

/-- The TypeScript loop returns the first round that changes nothing; every such round is `propagate`. -/
theorem ts_loop_agrees (N : Net n) (k : Nat) (h : round N (iter N k) = iter N k) : propagate N = iter N k := by
  rcases Nat.le_total k (height N) with hk | hk
  · obtain ⟨d, hd⟩ := Nat.exists_eq_add_of_le hk
    rw [propagate_eq_iter N (height N) (Nat.le_refl _), hd, iter_fixed_stays N k h d]
  · exact propagate_eq_iter N k hk

/-- Propagation reaches a fixpoint of one round. -/
theorem propagate_fixpoint (N : Net n) : round N (propagate N) = propagate N := by
  rw [propagate_eq_iter N _ (Nat.le_refl _)]; exact settles N

/-- The effective states are a fixpoint of the TypeScript's round too: each effective state's down kind is the one
    the settled summary carries. -/
theorem round_summary (N : Net n) (i : Fin n) : downOf (effState N i) = (propagate N).kind i := by
  have := congrArg (fun s => s.kind i) (propagate_fixpoint N)
  exact this

/-! ### Monotone, least, and independent of edge order -/

/-- Propagation is monotone: a net whose own states are at least as harmed and own levels no higher gives, element by
    element, down kinds at least as down, no higher levels and every root. -/
theorem propagate_monotone {B A : Net n} (hN : NetLe B A) : Le (propagate B) (propagate A) := by
  have hk : ∀ k, Le (iter B k) (iter A k) := by
    intro k; induction k with
    | zero => exact start_mono hN
    | succ k ih => exact round_mono hN ih
  rw [propagate_eq_iter B (height B + height A) (Nat.le_add_right _ _),
    propagate_eq_iter A (height B + height A) (Nat.le_add_left _ _)]
  exact hk _

/-- The least fixpoint: every fixpoint of a round is at least as harmed as the result. -/
theorem propagate_least (N : Net n) (t : Summary n) (ht : round N t = t) : Le (propagate N) t := by
  have hk : ∀ k, Le (iter N k) t := by
    intro k; induction k with
    | zero => rw [← ht]; exact start_le_round N t
    | succ k ih => rw [← ht]; exact round_mono (NetLe.refl N) ih
  exact hk _

/-- With no element down in its own state, no element ends down or degraded. -/
theorem healthy_stays_healthy (N : Net n) (h : ∀ i, downOf (N.own i) = none) (i : Fin n) :
    (propagate N).kind i = none ∧ isDeg (effState N i) = false := by
  have hk : ∀ k j, (iter N k).kind j = none := by
    intro k; induction k with
    | zero => intro j; exact h j
    | succ k ih =>
      intro j
      show downOf (stateAt N (iter N k) j) = none
      rw [stateAt, foldl_upd_none _ _ _ (by simp [ih])]
      exact h j
  refine ⟨hk _ i, ?_⟩
  unfold effState stateAt
  rw [foldl_upd_none _ _ _ (by simp [propagate, hk])]
  have := h i
  cases hs : N.own i <;> simp_all [downOf, isDeg]

/-- The result depends on the edges only as a set: two edge lists with the same members, in any order and with any
    repeats, give the same result. -/
theorem edge_order_irrelevant (own : Fin n → State) (ownLevel : Fin n → Nat) (f₁ f₂ : List (Fin n × Fin n))
    (slack : Nat) (h : ∀ e, e ∈ f₁ ↔ e ∈ f₂) :
    propagate (netOf own ownLevel f₁ slack) = propagate (netOf own ownLevel f₂ slack) := by
  have : upsOf f₁ = upsOf f₂ := by
    funext i
    unfold upsOf
    congr 1
    funext j
    have : f₁.contains (j, i) = f₂.contains (j, i) := by
      cases h₁ : f₁.contains (j, i) <;> cases h₂ : f₂.contains (j, i) <;> simp_all
    rw [this]
  unfold netOf
  rw [this]

/-! ### What an upstream does to what it feeds -/

theorem live_upd (s : Summary n) (st : State) (u : Fin n) (hl : live st = true) : live (upd s st u) = true := by
  unfold upd
  cases hk : s.kind u with
  | none => exact hl
  | some d =>
    obtain ⟨cs, w, h, -⟩ := upstream_inflationary st u.val d hl
    simp only [h]; rfl

theorem foldl_upd_keeps (s : Summary n) (L : List (Fin n)) (cs : List Cause) (w : Was) (k : Key)
    (hk : k ∈ cs.map Cause.key) :
    ∃ cs' w', L.foldl (upd s) (.degraded cs w) = .degraded cs' w' ∧ k ∈ cs'.map Cause.key := by
  induction L generalizing cs w with
  | nil => exact ⟨cs, w, rfl, hk⟩
  | cons x xs ih =>
    simp only [List.foldl_cons]
    cases hx : s.kind x with
    | none =>
      have : upd s (.degraded cs w) x = .degraded cs w := by unfold upd; rw [hx]
      rw [this]; exact ih cs w hk
    | some d =>
      obtain ⟨cs₁, w₁, h, hsub⟩ := upstream_inflationary (.degraded cs w) x.val d rfl
      have : upd s (.degraded cs w) x = .degraded cs₁ w₁ := by unfold upd; rw [hx]; exact h
      rw [this]
      exact ih cs₁ w₁ (hsub k (by simpa [keys] using hk))

theorem foldl_upd_names (s : Summary n) (L : List (Fin n)) (st : State) (u : Fin n) (hu : u ∈ L)
    (hd : (s.kind u).isSome = true) (hl : live st = true) :
    ∃ cs w, L.foldl (upd s) st = .degraded cs w ∧ (⟨3, u.val⟩ : Key) ∈ cs.map Cause.key := by
  induction L generalizing st with
  | nil => simp at hu
  | cons x xs ih =>
    simp only [List.foldl_cons]
    by_cases hxu : x = u
    · subst hxu
      cases hk : s.kind x with
      | none => simp [hk] at hd
      | some d =>
        obtain ⟨cs, w, h, hc⟩ := brings_degrades st (.upstreamDown x.val d) (.upstream x.val d) hl rfl
        have : upd s st x = .degraded cs w := by unfold upd; rw [hk]; exact h
        rw [this]
        exact foldl_upd_keeps s xs cs w _ hc
    · have hu' : u ∈ xs := by
        rcases List.mem_cons.1 hu with h | h
        · exact absurd h.symm hxu
        · exact h
      exact ih _ hu' (live_upd s st x hl)

/-- An absent, retired or degraded upstream degrades every started, operating or degraded element it feeds, and names
    it as the cause `upstream:<it>`. -/
theorem down_upstream_degrades (N : Net n) (u i : Fin n) (hu : u ∈ N.ups i)
    (hd : (downOf (effState N u)).isSome = true) (hl : live (N.own i) = true) :
    ∃ cs w, effState N i = .degraded cs w ∧ (⟨3, u.val⟩ : Key) ∈ cs.map Cause.key := by
  rw [round_summary] at hd
  exact foldl_upd_names _ _ _ u hu hd hl

theorem upsOf_mem {feeds : List (Fin n × Fin n)} {u i : Fin n} (h : (u, i) ∈ feeds) (hne : u ≠ i) :
    u ∈ upsOf feeds i := by
  unfold upsOf
  simp [List.mem_filter, List.mem_finRange, hne, h]

/-- The same, stated on a feeds edge `u → i` of the TypeScript input. -/
theorem feeds_down_degrades (own : Fin n → State) (ownLevel : Fin n → Nat) (feeds : List (Fin n × Fin n))
    (slack : Nat) (u i : Fin n) (he : (u, i) ∈ feeds) (hne : u ≠ i)
    (hd : (downOf (effState (netOf own ownLevel feeds slack) u)).isSome = true) (hl : live (own i) = true) :
    ∃ cs w, effState (netOf own ownLevel feeds slack) i = .degraded cs w ∧
      (⟨3, u.val⟩ : Key) ∈ cs.map Cause.key :=
  down_upstream_degrades _ u i (upsOf_mem he hne) hd hl

/-- An element's level is at most its own level. -/
theorem level_le_own (N : Net n) (i : Fin n) : (propagate N).level i ≤ N.ownLevel i := by
  rw [← propagate_fixpoint]; exact foldl_min_le_init _ _ _

/-- The level cap: an element's level is at most each upstream's level plus the slack. -/
theorem level_le_upstream (N : Net n) (u i : Fin n) (hu : u ∈ N.ups i) :
    (propagate N).level i ≤ (propagate N).level u + N.slack := by
  conv => lhs; rw [← propagate_fixpoint]
  exact foldl_min_le_mem _ _ _ _ hu

/-- And it is the largest level with both bounds. -/
theorem level_greatest (N : Net n) (i : Fin n) (l : Nat) (ho : l ≤ N.ownLevel i)
    (hu : ∀ u ∈ N.ups i, l ≤ (propagate N).level u + N.slack) : l ≤ (propagate N).level i := by
  rw [← propagate_fixpoint]
  exact foldl_min_greatest _ _ _ _ ho hu

/-! ### Checking cases -/

/-- [D] Whether two summaries agree on every element, a check `decide` can run. -/
def sameOn (s t : Summary n) : Bool :=
  (List.finRange n).all fun i => s.kind i == t.kind i && s.level i == t.level i &&
    (List.finRange n).all fun r => s.roots i r == t.roots i r

theorem sameOn_eq {s t : Summary n} (h : sameOn s t = true) : s = t := by
  simp only [sameOn, List.all_eq_true, Bool.and_eq_true, beq_iff_eq] at h
  exact Summary.ext' (fun i => (h i (List.mem_finRange i)).1.1) (fun i => (h i (List.mem_finRange i)).1.2)
    (fun i r => (h i (List.mem_finRange i)).2 r (List.mem_finRange r))

/-- [D] What the TypeScript `propagate` returns, element by element: the effective state, the level and the roots. -/
def effectsOf (N : Net n) : List (State × Nat × List (Fin n)) :=
  (List.finRange n).map fun i => (effState N i, (propagate N).level i, (List.finRange n).filter ((propagate N).roots i))

/-- [D] The same after `k` rounds. -/
def effectsAt (N : Net n) (k : Nat) : List (State × Nat × List (Fin n)) :=
  (List.finRange n).map fun i =>
    (stateAt N (iter N k) i, (iter N k).level i, (List.finRange n).filter ((iter N k).roots i))

/-- Once a round changes nothing after `k` rounds, the result is what `k` rounds give. The cases in
    `Naive/Generated/ElementCases.lean` use it, so `decide` runs a few rounds rather than `height + 1`. -/
theorem effectsOf_eq (N : Net n) (k : Nat) (h : sameOn (round N (iter N k)) (iter N k) = true) :
    effectsOf N = effectsAt N k := by
  unfold effectsOf effectsAt effState
  rw [ts_loop_agrees N k (sameOn_eq h)]

/-- [D] A net from lists, as the generated cases write it. -/
def netL (n : Nat) (own : List State) (lv : List Nat) (feeds : List (Fin n × Fin n)) (slack : Nat) : Net n :=
  netOf (fun i => own.getD i.val .absent) (fun i => lv.getD i.val 0) feeds slack

end Propagation

end Elements
