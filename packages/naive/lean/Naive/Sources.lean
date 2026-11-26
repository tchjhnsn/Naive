import Naive.Concept

/-
  Allowed source (EE-192). A source may be kept when its host is not denied and the fetch was logged off.
  The declared label is not a fact. These theorems hold for every fact, not a sample. They are a hand copy
  of the properties in packages/naive/src/terms/terms.ts.
-/

/-- [D] Facts for one source write. No label field. hostDenied is the closed deny list. -/
structure SourceFacts where
  hostDenied : Bool
  loggedOff  : Bool

/-- [D] Allowed source: the host is not denied, and the fetch was logged off. -/
def allowedSource : Concept SourceFacts := ⟨[
  ("A1 host not denied", fun f => !f.hostDenied),
  ("A2 logged off", (·.loggedOff))]⟩

/-- A denied host is never an allowed source. -/
theorem denied_host_never_allowed (f : SourceFacts) (h : f.hostDenied = true) :
    allowedSource.passes f = false := by
  cases hl : f.loggedOff <;>
    simp [Concept.passes, allowedSource, h, hl]
