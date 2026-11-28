/-
  Digital workers (EE-235; docs/design/ROLES_AS_AGENTS_2026-11-28.md, step 7). A digital worker is one role deployed
  as a running agent, recorded at `operations/workers/<id>.json`. This file models the statechart in
  `packages/naive/src/engine/agents/worker-state.ts` and proves its properties for every phase, event, actor and
  trace, not a sample.

  Correspondence with the TypeScript:

  * `Phase`, `Event` and `Actor` are the TypeScript unions of the same names, constructor for string. The TypeScript
    event `end` is `finish` here, because `end` is a Lean keyword.
  * `transition` is the TypeScript `transition`'s `to`, the `MOVES` table read in the same order. The TypeScript also
    returns a reason when it leaves the phase as it was; the reason is not modelled.
  * `reach` is the TypeScript `reachOf`. Write globs are natural numbers standing for the TypeScript strings, and a
    glob is inside another only when they are equal. The TypeScript `within` also lets `a/x` sit inside `a/*`; that
    glob containment is not modelled.
  * `propose` is the record a deployment writes: its writes are the asked globs that the bound (the role's reach and
    the deployer's) holds, which `narrowWrites` in `packages/naive/src/engine/agents/reach.ts` computes.

  Proved: ended is absorbing (`ended_absorbing`); only a person moves a worker into active, by activate or resume
  (`only_person_activates`), so along any trace from absent an active worker had a person's event
  (`active_needs_person`); an agent's event never activates (`agent_never_activates`); a step never changes the
  writes (`step_writes`), so writes never widen (`writes_never_widen`), and along a whole trace either
  (`run_writes_never_widen`); what a worker may write is inside its writes (`reach_sub`) and empty unless it is active
  (`reach_inactive`); a proposed worker's writes are inside the bound it was proposed under (`propose_within`); and
  every non-ended phase reaches ended by an expiry (`expire_ends`).

  Core Lean only, no Mathlib, and no `Concept` definition, so the agreement test asks no admitted term of this file.
  The generated cases in `Naive/Generated/WorkerCases.lean` check the TypeScript table against this one.
-/

namespace Workers

/-- [D] The phase of a worker: absent before it is proposed, then one of its four statuses. -/
inductive Phase where
  | absent
  | proposed
  | active
  | suspended
  | ended
  deriving DecidableEq, Repr

/-- [D] The six events. `finish` is the TypeScript `end`. -/
inductive Event where
  | propose
  | activate
  | suspend
  | resume
  | finish
  | expire
  deriving DecidableEq, Repr

/-- [D] Who causes an event. -/
inductive Actor where
  | person
  | agent
  deriving DecidableEq, Repr

/-- [D] `transition` in worker-state.ts: the `MOVES` table, and the phase unchanged for every move it lacks. -/
def transition : Phase → Event → Actor → Phase
  | .absent, .propose, _ => .proposed
  | .proposed, .activate, .person => .active
  | .proposed, .finish, _ => .ended
  | .proposed, .expire, _ => .ended
  | .active, .suspend, _ => .suspended
  | .active, .finish, _ => .ended
  | .active, .expire, _ => .ended
  | .suspended, .resume, .person => .active
  | .suspended, .finish, _ => .ended
  | .suspended, .expire, _ => .ended
  | p, _, _ => p

/-- [D] A worker as the router reads it: its phase and its write globs. -/
structure Worker where
  phase : Phase
  writes : List Nat
  deriving DecidableEq, Repr

/-- [D] One event applied to a worker: the phase moves and the writes stay. -/
def step (w : Worker) (e : Event) (a : Actor) : Worker := { w with phase := transition w.phase e a }

/-- [D] A trace of events applied in order. -/
def run : Worker → List (Event × Actor) → Worker
  | w, [] => w
  | w, (e, a) :: es => run (step w e a) es

/-- [D] `reachOf`: what the worker may write, its writes while active and nothing otherwise. -/
def reach (w : Worker) : List Nat := if w.phase = .active then w.writes else []

/-- [D] The worker a deployment writes: proposed, with the asked globs that the bound holds. -/
def propose (asked bound : List Nat) : Worker :=
  { phase := .proposed, writes := asked.filter (fun g => decide (g ∈ bound)) }

/-- [S] Ended is absorbing: no event by anyone leaves it. False if any move left ended. -/
theorem ended_absorbing (e : Event) (a : Actor) : transition .ended e a = .ended := by
  cases e <;> cases a <;> rfl

/-- [S] Only a person moves a worker into active. False if an agent's activate or resume were allowed. -/
theorem only_person_activates (p : Phase) (e : Event) (a : Actor) (hp : p ≠ .active)
    (h : transition p e a = .active) : a = .person := by
  cases p <;> cases e <;> cases a <;> first | rfl | exact absurd rfl hp | exact absurd h (by decide)

/-- [S] An agent's event never moves a worker into active. -/
theorem agent_never_activates (p : Phase) (e : Event) (hp : p ≠ .active) : transition p e .agent ≠ .active := by
  intro h
  exact absurd (only_person_activates p e .agent hp h) (by decide)

/-- [S] Along a trace, a worker that ends active either started active or met an event a person caused. -/
theorem run_active (es : List (Event × Actor)) (w : Worker) (h : (run w es).phase = .active) :
    w.phase = .active ∨ ∃ x ∈ es, x.2 = .person := by
  induction es generalizing w with
  | nil => exact Or.inl h
  | cons x es ih =>
    obtain ⟨e, a⟩ := x
    have h' : (run (step w e a) es).phase = .active := h
    cases ih (step w e a) h' with
    | inl hs =>
      by_cases hw : w.phase = .active
      · exact Or.inl hw
      · exact Or.inr ⟨(e, a), List.Mem.head _, only_person_activates w.phase e a hw hs⟩
    | inr hx =>
      obtain ⟨y, hy, hy2⟩ := hx
      exact Or.inr ⟨y, List.Mem.tail _ hy, hy2⟩

/-- [S] A worker proposed and then moved by any trace is active only if a person caused one of the events. -/
theorem active_needs_person (asked bound : List Nat) (es : List (Event × Actor))
    (h : (run (propose asked bound) es).phase = .active) : ∃ x ∈ es, x.2 = .person := by
  cases run_active es (propose asked bound) h with
  | inl hp =>
    have hq : (propose asked bound).phase = .proposed := rfl
    rw [hq] at hp
    exact absurd hp (by decide)
  | inr hx => exact hx

/-- [S] A step leaves the writes as they were. -/
theorem step_writes (w : Worker) (e : Event) (a : Actor) : (step w e a).writes = w.writes := rfl

/-- [S] Writes never widen: after any event, every write glob was a write glob before. -/
theorem writes_never_widen (w : Worker) (e : Event) (a : Actor) (g : Nat) (h : g ∈ (step w e a).writes) :
    g ∈ w.writes := by
  rw [step_writes] at h
  exact h

/-- [S] Along a whole trace the writes never widen either. -/
theorem run_writes (es : List (Event × Actor)) (w : Worker) : (run w es).writes = w.writes := by
  induction es generalizing w with
  | nil => rfl
  | cons x es ih =>
    obtain ⟨e, a⟩ := x
    exact (ih (step w e a)).trans (step_writes w e a)

/-- [S] Along a whole trace, every write glob was a write glob at the start. -/
theorem run_writes_never_widen (es : List (Event × Actor)) (w : Worker) (g : Nat) (h : g ∈ (run w es).writes) :
    g ∈ w.writes := by
  rw [run_writes] at h
  exact h

/-- [S] What a worker may write is inside its writes. -/
theorem reach_sub (w : Worker) (g : Nat) (h : g ∈ reach w) : g ∈ w.writes := by
  unfold reach at h
  by_cases hp : w.phase = .active
  · rw [if_pos hp] at h
    exact h
  · rw [if_neg hp] at h
    cases h

/-- [S] A worker that is not active may write nothing. False if a proposed, suspended or ended worker kept reach. -/
theorem reach_inactive (w : Worker) (hp : w.phase ≠ .active) : reach w = [] := by
  unfold reach
  rw [if_neg hp]

/-- [S] A proposed worker's writes are inside the bound: the role's reach and the deployer's. -/
theorem propose_within (asked bound : List Nat) (g : Nat) (h : g ∈ (propose asked bound).writes) : g ∈ bound := by
  have h2 : g ∈ asked.filter (fun g => decide (g ∈ bound)) := h
  exact of_decide_eq_true (List.mem_filter.mp h2).2

/-- [S] Every phase but absent is ended after an expiry, whoever causes it. -/
theorem expire_ends (p : Phase) (a : Actor) (h₁ : p ≠ .absent) : transition p .expire a = .ended := by
  cases p <;> cases a <;> first | rfl | exact absurd rfl h₁

end Workers
