/-
  Definitions settled by proof, not by asking (Torian, 2026-10-31). Core Lean only, no Mathlib.

  The engine: a concept is a list of necessary properties, each a decidable check over facts.
  When anyone contests whether x is a T, `decide` answers for that x; when anyone contests how
  two concepts relate, a theorem answers for EVERY x, not a sample. The label someone uses is not
  a field of the facts, so no check can read it (R2 holds by construction).
-/

/-- [D] A concept: named necessary properties, each a decidable check over facts `α`. -/
structure Concept (α : Type) where
  props : List (String × (α → Bool))

/-- [D] x passes a concept iff every property holds. -/
def Concept.passes {α} (c : Concept α) (x : α) : Bool := c.props.all (fun p => p.2 x)

/-- [D] The properties x fails: the answer to "why not?". -/
def Concept.failed {α} (c : Concept α) (x : α) : List String := (c.props.filter (fun p => !p.2 x)).map (·.1)

/-- [D] is_a: every x that passes `a` passes `b`. -/
def IsA {α} (a b : Concept α) : Prop := ∀ x, a.passes x = true → b.passes x = true

/-- [D] Disjoint: nothing passes both. -/
def Disjoint {α} (a b : Concept α) : Prop := ∀ x, ¬ (a.passes x = true ∧ b.passes x = true)

/-- Adding properties narrows a concept: a refinement is_a its parent (shared parent duties, R5). -/
theorem refine_isA {α} (c : Concept α) (extra : List (String × (α → Bool))) :
    IsA ⟨c.props ++ extra⟩ c := by
  intro x h
  simp only [Concept.passes, List.all_append, Bool.and_eq_true] at h ⊢
  exact h.1
