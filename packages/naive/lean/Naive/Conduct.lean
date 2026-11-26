import Naive.Concept

/-
  Conduct (EE-187, docs/design/MODELED_VENTURES_2026-11-26.md). A venture is modeled when agents are
  modeling it, and run when a person is running it. The two are disjoint. These theorems hold for every
  fact, not a sample. They are a hand copy of the properties in packages/naive/src/terms/terms.ts.
  A missing field is not a fact here. The check reads absence as unknown and does not read it as run.
-/

/-- [D] Facts about whether a venture is modeled or run. No label field. -/
structure ConductFacts where
  confirmed : Bool
  modeled   : Bool
  run       : Bool

/-- [D] Modeled venture: confirmed, modeled, and not run. -/
def modeledVenture : Concept ConductFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("C1 modeled",   (·.modeled)),
  ("C2 not run",   fun f => !f.run)]⟩

/-- [D] Run venture: confirmed, run, and not modeled. -/
def runVenture : Concept ConductFacts := ⟨[
  ("P7 confirmed",  (·.confirmed)),
  ("D1 run",        (·.run)),
  ("D2 not modeled", fun f => !f.modeled)]⟩

/-- A venture that is run does not pass modeled. -/
theorem modeled_not_run (f : ConductFacts) (h : f.run = true) : modeledVenture.passes f = false := by
  cases hm : f.modeled <;> cases hc : f.confirmed <;>
    simp [Concept.passes, modeledVenture, h, hm, hc]

/-- A venture that is modeled does not pass run. -/
theorem run_not_modeled (f : ConductFacts) (h : f.modeled = true) : runVenture.passes f = false := by
  cases hr : f.run <;> cases hc : f.confirmed <;>
    simp [Concept.passes, runVenture, h, hr, hc]

/-- Nothing passes both. -/
theorem modeled_disjoint_run : Disjoint modeledVenture runVenture := by
  intro f h
  cases hr : f.run <;> cases hm : f.modeled <;> cases hc : f.confirmed <;>
    simp [Concept.passes, modeledVenture, runVenture, hr, hm, hc] at h
