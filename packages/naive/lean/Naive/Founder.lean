import Naive.Concept

/-
  Founder (founders/<handle>/, packages/naive/src/engine/founders.ts). A venture may have several founders; each is a
  founder by these properties, never by the label anyone uses. These theorems hold for every possible
  case, not a sample. They are a hand copy of the properties in packages/naive/src/terms/terms.ts, and
  packages/naive/src/engine/founders.ts does not yet run those properties on founder records (it checks file layout and
  privacy only); tying the two together is follow-up work.
-/

inductive Contribution | idea | secret | ethos | mission | technical | capital | network
  deriving DecidableEq, Repr

/-- [D] Facts about one person's relationship to one venture. No label field. -/
structure FounderFacts where
  confirmed     : Bool                       -- P7: a person confirmed these facts
  human         : Bool                       -- owners are always humans
  joined        : Nat
  firstOutside  : Option Nat                 -- first hire, investment or paying customer
  contributions : List (Contribution × Bool) -- (kind, evidenced in provenance)
  stake         : Bool
  decisions     : Nat
  otherFounders : Nat

def founder : Concept FounderFacts := ⟨[
  ("P7 confirmed",               (·.confirmed)),
  ("F1 a person",                (·.human)),
  ("F2 there at the founding",   fun f => match f.firstOutside with | none => true | some d => decide (f.joined ≤ d)),
  ("F3 evidenced contribution",  fun f => f.contributions.any (·.2)),
  ("F4 stake",                   (·.stake)),
  ("F5 in provenance",           fun f => decide (1 ≤ f.decisions))]⟩

def coFounder : Concept FounderFacts := ⟨founder.props ++ [("CF1 another founder", fun f => decide (1 ≤ f.otherFounders))]⟩

/-- Contention settled for all facts: every co-founder is a founder. -/
theorem coFounder_isA_founder : IsA coFounder founder := refine_isA founder _

/-- Contention settled for all facts: an unconfirmed claim never makes anyone a founder (P7). -/
theorem unconfirmed_not_founder (f : FounderFacts) (h : f.confirmed = false) : founder.passes f = false := by
  simp [Concept.passes, founder, h]

/-- Contention settled for all facts: claiming a contribution without evidence never counts (F3). -/
theorem unevidenced_not_founder (f : FounderFacts) (h : ∀ c ∈ f.contributions, c.2 = false) :
    founder.passes f = false := by
  have : f.contributions.any (·.2) = false := by
    rw [List.any_eq_false]; intro c hc; simp [h c hc]
  simp [Concept.passes, founder, this]

/-- Several founders are allowed: two founders of one venture both pass (a witness, checked by `decide`). -/
def jobs : FounderFacts := ⟨true, true, 0, some 90, [(.mission, true), (.network, true)], true, 5, 1⟩
def woz  : FounderFacts := { jobs with contributions := [(.technical, true)] }
example : coFounder.passes jobs = true ∧ coFounder.passes woz = true := by decide

/-- "Is this person a founder?" for one case: run it, and read why not. -/
def lateJoiner : FounderFacts := { jobs with joined := 200 }
example : founder.failed lateJoiner = ["F2 there at the founding"] := by decide
