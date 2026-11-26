import Naive.Concept

/-
  Data labels (EE-191). A record is sourced, estimated, synthetic or gold from its facts.
  The label anyone writes on the record is not a fact, so no check reads it.
  These theorems hold for every fact, not a sample. They are a hand copy of the properties
  in packages/naive/src/terms/terms.ts.
-/

/-- [D] Facts a data label is judged from. No label field. -/
structure LabelFacts where
  hasSource    : Bool
  hasMethod    : Bool
  generated    : Bool
  accepted     : Bool
  ownVenture   : Bool
  underVenture : Bool

/-- [D] Gold: a person accepted it, it comes from one of our own ventures, and it was not generated. -/
def goldRecord : Concept LabelFacts := ⟨[
  ("G1 a person accepted it", (·.accepted)),
  ("G2 one of our own ventures", (·.ownVenture)),
  ("G3 not generated", fun f => !f.generated)]⟩

/-- [D] Sourced: a source, no method, not generated, and not an accepted record from one of our own ventures. -/
def sourcedRecord : Concept LabelFacts := ⟨[
  ("S1 a source", (·.hasSource)),
  ("S2 no method", fun f => !f.hasMethod),
  ("S3 not generated", fun f => !f.generated),
  ("S4 not accepted from our own venture", fun f => !(f.accepted && f.ownVenture))]⟩

/-- [D] Estimated: a source, a method, not generated, and not an accepted record from one of our own ventures. -/
def estimatedRecord : Concept LabelFacts := ⟨[
  ("E1 a source", (·.hasSource)),
  ("E2 a method", (·.hasMethod)),
  ("E3 not generated", fun f => !f.generated),
  ("E4 not accepted from our own venture", fun f => !(f.accepted && f.ownVenture))]⟩

/-- [D] Synthetic: generated, and under no venture. -/
def syntheticRecord : Concept LabelFacts := ⟨[
  ("N1 generated", (·.generated)),
  ("N2 under no venture", fun f => !f.underVenture)]⟩

/-- A record that sits under a venture is not synthetic. -/
theorem synthetic_not_under_venture (f : LabelFacts) (h : f.underVenture = true) :
    syntheticRecord.passes f = false := by
  cases hg : f.generated <;>
    simp [Concept.passes, syntheticRecord, h, hg]

/-- Gold does not pass unless a person accepted it and it comes from one of our own ventures. -/
theorem gold_needs_accepted_own (f : LabelFacts)
    (h : f.accepted = false ∨ f.ownVenture = false) : goldRecord.passes f = false := by
  cases h with
  | inl ha =>
    cases ho : f.ownVenture <;> cases hg : f.generated <;>
      simp [Concept.passes, goldRecord, ha, ho, hg]
  | inr ho =>
    cases ha : f.accepted <;> cases hg : f.generated <;>
      simp [Concept.passes, goldRecord, ha, ho, hg]

/-- Nothing is both sourced and estimated. -/
theorem sourced_disjoint_estimated : Disjoint sourcedRecord estimatedRecord := by
  intro f h
  cases hm : f.hasMethod <;>
    simp [Concept.passes, sourcedRecord, estimatedRecord, hm] at h

/-- Nothing is both sourced and synthetic. -/
theorem sourced_disjoint_synthetic : Disjoint sourcedRecord syntheticRecord := by
  intro f h
  cases hg : f.generated <;>
    simp [Concept.passes, sourcedRecord, syntheticRecord, hg] at h

/-- Nothing is both sourced and gold. -/
theorem sourced_disjoint_gold : Disjoint sourcedRecord goldRecord := by
  intro f h
  cases ha : f.accepted <;> cases ho : f.ownVenture <;> cases hg : f.generated <;>
    simp [Concept.passes, sourcedRecord, goldRecord, ha, ho, hg] at h

/-- Nothing is both estimated and synthetic. -/
theorem estimated_disjoint_synthetic : Disjoint estimatedRecord syntheticRecord := by
  intro f h
  cases hg : f.generated <;>
    simp [Concept.passes, estimatedRecord, syntheticRecord, hg] at h

/-- Nothing is both estimated and gold. -/
theorem estimated_disjoint_gold : Disjoint estimatedRecord goldRecord := by
  intro f h
  cases ha : f.accepted <;> cases ho : f.ownVenture <;> cases hg : f.generated <;>
    simp [Concept.passes, estimatedRecord, goldRecord, ha, ho, hg] at h

/-- Nothing is both synthetic and gold. -/
theorem synthetic_disjoint_gold : Disjoint syntheticRecord goldRecord := by
  intro f h
  cases hg : f.generated <;>
    simp [Concept.passes, syntheticRecord, goldRecord, hg] at h
