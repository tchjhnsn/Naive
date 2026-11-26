import Naive.Concept

/-
  Conduct (EE-193, docs/design/OBSERVED_VENTURES_2026-11-26.md). A venture is observed when it is an
  outside-in model of a company built from public information, and run when a person is running it. The two are disjoint. These theorems hold for every
  fact, not a sample. They are a hand copy of the properties in packages/naive/src/terms/terms.ts.
  A missing field is not a fact here. The check reads absence as unknown and does not read it as run.
-/

/-- [D] Facts about whether a venture is observed or run. No label field. -/
structure ConductFacts where
  confirmed : Bool
  observed   : Bool
  run       : Bool

/-- [D] Observed venture: confirmed, observed, and not run. -/
def observedVenture : Concept ConductFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("C1 observed",   (·.observed)),
  ("C2 not run",   fun f => !f.run)]⟩

/-- [D] Run venture: confirmed, run, and not observed. -/
def runVenture : Concept ConductFacts := ⟨[
  ("P7 confirmed",  (·.confirmed)),
  ("D1 run",        (·.run)),
  ("D2 not observed", fun f => !f.observed)]⟩

/-- A venture that is run does not pass observed. -/
theorem observed_not_run (f : ConductFacts) (h : f.run = true) : observedVenture.passes f = false := by
  cases hm : f.observed <;> cases hc : f.confirmed <;>
    simp [Concept.passes, observedVenture, h, hm, hc]

/-- A venture that is observed does not pass run. -/
theorem run_not_observed (f : ConductFacts) (h : f.observed = true) : runVenture.passes f = false := by
  cases hr : f.run <;> cases hc : f.confirmed <;>
    simp [Concept.passes, runVenture, h, hr, hc]

/-- Nothing passes both. -/
theorem observed_disjoint_run : Disjoint observedVenture runVenture := by
  intro f h
  cases hr : f.run <;> cases hm : f.observed <;> cases hc : f.confirmed <;>
    simp [Concept.passes, observedVenture, runVenture, hr, hm, hc] at h
