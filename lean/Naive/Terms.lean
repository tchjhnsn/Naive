import Naive.Concept

/-
  Terms admitted through schema/terms/admit.ts. The TypeScript engine runs each term on records and
  cross-runs it over sampled cases; the theorems here hold for every case.
-/

/-- [D] The relations the engine reads off two pass sets. -/
inductive Relation | equal | isA | hasAKind | overlap | disjoint | inconclusive
  deriving DecidableEq, Repr

/-- [D] The relation from the sizes of two sets and of their intersection (mirrors engine.ts relation). -/
def relationOf (a b inter : Nat) : Relation :=
  if a = 0 ∨ b = 0 then .inconclusive
  else if inter = 0 then .disjoint
  else if inter = a ∧ inter = b then .equal
  else if inter = a then .isA
  else if inter = b then .hasAKind
  else .overlap

/-- Every value of relationOf is one of the six relations. This holds for any function into Relation, so it says
    nothing about the engine: that the TypeScript relation and this relationOf agree is not checked yet. -/
theorem relationOf_total (a b i : Nat) :
    relationOf a b i ∈ [Relation.equal, .isA, .hasAKind, .overlap, .disjoint, .inconclusive] := by
  unfold relationOf
  split <;> (try split) <;> (try split) <;> (try split) <;> (try split) <;> simp

/-- [D] The facts of one encounter or crossing. No label field. -/
structure Encounter where
  confirmed : Bool
  atCrossing : Bool
  phaseExit : Bool
  resists : Bool
  helpsOutright : Bool
  opposesJourney : Bool
  passable : Bool
  endsAfterCrossing : Bool
  person : Bool

def confirmedProp : String × (Encounter → Bool) := ("P7 confirmed", (·.confirmed))

def thresholdGuardian : Concept Encounter := ⟨[
  confirmedProp,
  ("G1 at a crossing", (·.atCrossing)),
  ("G2 tests or blocks", fun f => f.resists && !f.helpsOutright),
  ("G3 not the main opponent", fun f => !f.opposesJourney),
  ("G4 passable without destruction", (·.passable)),
  ("G5 ends once crossed", (·.endsAfterCrossing))]⟩

def phaseGate : Concept Encounter := ⟨thresholdGuardian.props ++ [
  ("PG1 a phase exit", (·.phaseExit)),
  ("PG2 not a person", fun f => !f.person)]⟩

/-- Every phase gate is a threshold guardian, for every possible crossing. -/
theorem phaseGate_isA_thresholdGuardian : IsA phaseGate thresholdGuardian := refine_isA thresholdGuardian _

/-- A guardian need not be a person: a witness. -/
example : thresholdGuardian.passes ⟨true, true, true, true, false, false, true, true, false⟩ = true := by decide

/-! Admission (§23): admitting a term keeps the vocabulary's invariant. Here the invariant is that
    term ids are unique; admit refuses an id already taken. -/

/-- [D] Admit an id into a vocabulary: refused (unchanged) if the id is taken. -/
def admit (vocab : List String) (id : String) : List String :=
  if id ∈ vocab then vocab else id :: vocab

/-- If the vocabulary's ids are unique, they stay unique after any admission. -/
theorem admit_preserves_nodup (vocab : List String) (id : String) (h : vocab.Nodup) :
    (admit vocab id).Nodup := by
  unfold admit
  split
  · exact h
  · next hn => exact List.nodup_cons.mpr ⟨hn, h⟩

/-- By induction, any sequence of admissions from an empty vocabulary keeps ids unique. -/
theorem admitAll_nodup (ids : List String) : (ids.foldl admit []).Nodup := by
  suffices ∀ v : List String, v.Nodup → (ids.foldl admit v).Nodup from this [] List.nodup_nil
  induction ids with
  | nil => intro v h; exact h
  | cons x xs ih => intro v h; exact ih _ (admit_preserves_nodup v x h)
