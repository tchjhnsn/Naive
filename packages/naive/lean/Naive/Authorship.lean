import Naive.Concept

/-
  Faithful author (EE-188, packages/naive/src/terms/terms.ts). The process that wrote a record is the author.
  A person or role inside the venture is a subject, and copying that subject in as the author fails.
  These theorems hold for every case, not a sample. They are a hand copy of the properties in
  packages/naive/src/terms/terms.ts.
-/

/-- [D] Facts about one write. No name field. -/
structure AuthorFacts where
  confirmed : Bool
  processPerson : Bool
  processAgent : Bool
  processUnverified : Bool
  writtenPerson : Bool
  writtenAgent : Bool
  writtenUnverified : Bool
  subjectCopied : Bool

/-- [D] Exactly one of the three kinds. -/
def exactlyOne (a b c : Bool) : Bool :=
  (a && !b && !c) || (!a && b && !c) || (!a && !b && c)

/-- The written kind is the process kind, and the subject was not copied in as the author. -/
def faithfulAuthor : Concept AuthorFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("A1 the process is exactly one kind", fun f => exactlyOne f.processPerson f.processAgent f.processUnverified),
  ("A2 the written kind matches", fun f =>
    f.writtenPerson == f.processPerson && f.writtenAgent == f.processAgent && f.writtenUnverified == f.processUnverified),
  ("A3 subjectCopied is false", fun f => !f.subjectCopied)]⟩

/-- Contention settled for all facts: unconfirmed facts never make an author (P7). -/
theorem unconfirmed_not_author (f : AuthorFacts) (h : f.confirmed = false) : faithfulAuthor.passes f = false := by
  simp [Concept.passes, faithfulAuthor, h]

/-- Contention settled for all facts: a subject copied in as the author is not the author (A3). -/
theorem subject_not_author (f : AuthorFacts) (h : f.subjectCopied = true) : faithfulAuthor.passes f = false := by
  simp [Concept.passes, faithfulAuthor, h]
