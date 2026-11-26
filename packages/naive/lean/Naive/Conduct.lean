import Naive.Concept

/-
  Modeled venture and run venture (EE-187). `modeled` means agents are modeling the venture.
  `run` means a person is running it on Naive. The two are disjoint. Absence of the field is
  neither fact here: an old record is not read as `run`. These theorems hold for every possible
  case, not a sample. They are a hand copy of the properties the terms modeled-venture and
  run-venture carry.
-/

/-- [D] Facts about how a venture is being carried. No label field. -/
structure ConductFacts where
  confirmed : Bool
  modeled   : Bool
  run       : Bool

def modeledVenture : Concept ConductFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("C1 modeled", (·.modeled)),
  ("C2 not run", fun f => !f.run)]⟩

def runVenture : Concept ConductFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("D1 run", (·.run)),
  ("D2 not modeled", fun f => !f.modeled)]⟩

/-- Contention settled for all facts: a venture that is run is not a modeled venture (C2). -/
theorem modeled_not_run (f : ConductFacts) (h : f.run = true) : modeledVenture.passes f = false := by
  simp [Concept.passes, modeledVenture, h]

/-- Contention settled for all facts: a venture that is modeled is not a run venture (D2). -/
theorem run_not_modeled (f : ConductFacts) (h : f.modeled = true) : runVenture.passes f = false := by
  simp [Concept.passes, runVenture, h]

/-- Contention settled for all facts: nothing passes both a modeled venture and a run venture. -/
theorem modeled_disjoint_run : Disjoint modeledVenture runVenture := by
  intro x ⟨hm, hr⟩
  simp [Concept.passes, modeledVenture, runVenture] at hm hr
  have hmodeled : x.modeled = true := hm.2.1
  have hnot : x.modeled = false := hr.2.2
  rw [hmodeled] at hnot
  contradiction

/-- Modeled and not run passes modeled venture; run and not modeled passes run venture. -/
def modeledNotRun : ConductFacts := ⟨true, true, false⟩
def runNotModeled : ConductFacts := ⟨true, false, true⟩

example :
    modeledVenture.passes modeledNotRun = true ∧ runVenture.passes runNotModeled = true := by
  decide
