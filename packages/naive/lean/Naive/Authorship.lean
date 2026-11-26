import Naive.Concept

/-
  Faithful author (EE-187). The actor who writes a record is the process that wrote it. The
  people and roles inside the venture are subjects. A faithful author has exactly one process
  kind, writes that same kind, and leaves the subject out of the author. These theorems hold
  for every possible case, not a sample. They are a hand copy of the properties the term
  faithful-author carries.
-/

/-- [D] Facts about one write. No label field. -/
structure AuthorFacts where
  confirmed         : Bool
  processPerson     : Bool
  processAgent      : Bool
  processUnverified : Bool
  writtenPerson     : Bool
  writtenAgent      : Bool
  writtenUnverified : Bool
  subjectCopied     : Bool

def faithfulAuthor : Concept AuthorFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("A1 exactly one of the three process flags", fun f =>
    (f.processPerson && !f.processAgent && !f.processUnverified) ||
    (!f.processPerson && f.processAgent && !f.processUnverified) ||
    (!f.processPerson && !f.processAgent && f.processUnverified)),
  ("A2 written flags equal the process flags", fun f =>
    (f.writtenPerson == f.processPerson) &&
    (f.writtenAgent == f.processAgent) &&
    (f.writtenUnverified == f.processUnverified)),
  ("A3 subjectCopied is false", fun f => !f.subjectCopied)]⟩

/-- Contention settled for all facts: an unconfirmed claim never makes a faithful author (P7). -/
theorem unconfirmed_not_author (f : AuthorFacts) (h : f.confirmed = false) :
    faithfulAuthor.passes f = false := by
  simp [Concept.passes, faithfulAuthor, h]

/-- Contention settled for all facts: copying the subject in as the author never counts (A3). -/
theorem subject_not_author (f : AuthorFacts) (h : f.subjectCopied = true) :
    faithfulAuthor.passes f = false := by
  simp [Concept.passes, faithfulAuthor, h]

/-- A person and an agent, each written as its own process, both pass. A witness, checked by `decide`. -/
def personWrote : AuthorFacts :=
  ⟨true, true, false, false, true, false, false, false⟩

def agentWrote : AuthorFacts :=
  ⟨true, false, true, false, false, true, false, false⟩

example : faithfulAuthor.passes personWrote = true ∧ faithfulAuthor.passes agentWrote = true := by decide
