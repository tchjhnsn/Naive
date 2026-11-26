import Naive.Concept

/-
  Open maker, named maker and org link (EE-187). The in-venture decision maker is unknown, or
  it names a person or a role that resolves and is not the acting agent. An org link is absent,
  or both ends exist, and it is not a cycle. A guess fails either maker. These theorems hold
  for every possible case, not a sample. They are a hand copy of the properties the terms
  open-maker, named-maker and org-link carry.
-/

/-- [D] Facts about who decides inside the venture. No label field. -/
structure MakerFacts where
  confirmed : Bool
  unknown   : Bool
  named     : Bool
  resolves  : Bool
  isActor   : Bool
  guessed   : Bool

/-- [D] Facts about one reports-to link. No label field. -/
structure OrgFacts where
  confirmed : Bool
  absent    : Bool
  fromKnown : Bool
  toKnown   : Bool
  cycle     : Bool

def openMaker : Concept MakerFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("U1 unknown", (·.unknown)),
  ("U2 not named", fun f => !f.named),
  ("U3 not guessed", fun f => !f.guessed)]⟩

def namedMaker : Concept MakerFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("N1 named", (·.named)),
  ("N2 resolves", (·.resolves)),
  ("N3 not the actor", fun f => !f.isActor),
  ("N4 not guessed", fun f => !f.guessed),
  ("N5 not unknown", fun f => !f.unknown)]⟩

def orgLink : Concept OrgFacts := ⟨[
  ("P7 confirmed", (·.confirmed)),
  ("O1 absent or (fromKnown and toKnown)", fun f => f.absent || (f.fromKnown && f.toKnown)),
  ("O2 not a cycle", fun f => !f.cycle)]⟩

/-- Contention settled for all facts: a guessed maker is not an open maker (U3). -/
theorem guessed_not_open (f : MakerFacts) (h : f.guessed = true) : openMaker.passes f = false := by
  simp [Concept.passes, openMaker, h]

/-- Contention settled for all facts: a guessed maker is not a named maker (N4). -/
theorem guessed_not_named (f : MakerFacts) (h : f.guessed = true) : namedMaker.passes f = false := by
  simp [Concept.passes, namedMaker, h]

/-- Contention settled for all facts: nothing passes both an open maker and a named maker. -/
theorem open_disjoint_named : Disjoint openMaker namedMaker := by
  intro x ⟨ho, hn⟩
  simp [Concept.passes, openMaker, namedMaker] at ho hn
  have hnamed : x.named = true := hn.2.1
  have hnot : x.named = false := ho.2.2.1
  rw [hnamed] at hnot
  contradiction

/-- Contention settled for all facts: a cycle is not an org link (O2). -/
theorem cycle_not_org_link (f : OrgFacts) (h : f.cycle = true) : orgLink.passes f = false := by
  simp [Concept.passes, orgLink, h]

/-- One passing fact of each concept: an unknown maker, a named maker, and an absent org link. -/
def openCase : MakerFacts := ⟨true, true, false, false, false, false⟩
def namedCase : MakerFacts := ⟨true, false, true, true, false, false⟩
def absentLink : OrgFacts := ⟨true, true, false, false, false⟩

example :
    openMaker.passes openCase = true ∧
    namedMaker.passes namedCase = true ∧
    orgLink.passes absentLink = true := by
  decide
