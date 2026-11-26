import Naive.Concept

/-
  An APQC citation (EE-199). A citation passes when its element id is in the PCF, the cited name
  is that element's name, and the cited version is the PCF's version. The words of the citation
  are not facts. This is a hand copy of pcf-citation in packages/naive/src/terms/terms.ts.
-/

/-- [D] Facts one APQC citation is judged from. -/
structure CitationFacts where
  elementKnown    : Bool
  nameMatches     : Bool
  versionMatches  : Bool

/-- [D] A citation of one element of the Process Classification Framework. -/
def pcfCitation : Concept CitationFacts := ⟨[
  ("C1 the element id is in the PCF", (·.elementKnown)),
  ("C2 the cited name is that element's name", (·.nameMatches)),
  ("C3 the cited version is the PCF's version", (·.versionMatches))]⟩

/-- A citation whose element id is not in the PCF does not pass. -/
theorem citation_needs_element (f : CitationFacts) (h : f.elementKnown = false) :
    pcfCitation.passes f = false := by
  cases hn : f.nameMatches <;> cases hv : f.versionMatches <;>
    simp [Concept.passes, pcfCitation, h, hn, hv]
