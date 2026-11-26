import Naive.Concept

/-
  Eval items (EE-198). A held-out item's split is held-out, and its id is in no exemplar and no prompt fixture.
  A label is non-null only when a person set it. The faithful-author term is not on main, so personLabel states
  that rule here. The label text and the item id are not facts. These theorems hold for every fact, not a sample.
  They are a hand copy of the properties in packages/naive/src/terms/terms.ts.
-/

/-- [D] Facts for one eval item judged as held-out. No label field, and no id field. -/
structure HeldOutFacts where
  splitHeldOut    : Bool
  inExemplar      : Bool
  inPromptFixture : Bool

/-- [D] Held-out item: the split is held-out, and the id is in no exemplar and no prompt fixture. -/
def heldOutItem : Concept HeldOutFacts := ⟨[
  ("H1 split is held-out", (·.splitHeldOut)),
  ("H2 id in no exemplar", fun f => !f.inExemplar),
  ("H3 id in no prompt fixture", fun f => !f.inPromptFixture)]⟩

/-- An id that appears in an exemplar is not a held-out item. -/
theorem held_out_disjoint_exemplar (f : HeldOutFacts) (h : f.inExemplar = true) :
    heldOutItem.passes f = false := by
  cases hs : f.splitHeldOut <;> cases hp : f.inPromptFixture <;>
    simp [Concept.passes, heldOutItem, h, hs, hp]

/-- [D] Facts for one eval item's label. No label text. byPerson is whether labelled_by names a person. -/
structure PersonLabelFacts where
  labelSet : Bool
  byPerson : Bool

/-- [D] Person label: the label is null, or labelled_by names a person. -/
def personLabel : Concept PersonLabelFacts := ⟨[
  ("P1 null, or a person", fun f => !f.labelSet || f.byPerson)]⟩

/-- A label an agent set does not pass. labelSet with byPerson false is that case. -/
theorem agent_label_never_passes (f : PersonLabelFacts)
    (hs : f.labelSet = true) (hp : f.byPerson = false) : personLabel.passes f = false := by
  simp [Concept.passes, personLabel, hs, hp]
