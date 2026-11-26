import Naive.Concept

/-
  Org (EE-189). The in-venture decision-maker is open when unknown and named when it resolves to a
  person or a role. An org link is a reports_to that is absent or has both ends, and is not a cycle.
  These theorems hold for every fact record, not a sample. They are the properties in
  packages/naive/src/terms/makers.ts. The label is not a field, so no check can read it.
-/

/-- [D] Facts about one in-venture decision-maker. No label field. -/
structure MakerFacts where
  confirmed : Bool
  unknown   : Bool
  named     : Bool
  resolves  : Bool
  isActor   : Bool
  guessed   : Bool

/-- [D] The maker is unknown, and it was not guessed. -/
def openMaker : Concept MakerFacts := ⟨[
  ("P7 confirmed",     (·.confirmed)),
  ("U1 unknown",       (·.unknown)),
  ("U2 not named",     fun f => !f.named),
  ("U3 not guessed",   fun f => !f.guessed)]⟩

/-- [D] The maker names a person or a role, is not the acting agent, and was not guessed. -/
def namedMaker : Concept MakerFacts := ⟨[
  ("P7 confirmed",     (·.confirmed)),
  ("N1 named",         (·.named)),
  ("N2 resolves",      (·.resolves)),
  ("N3 not the actor", fun f => !f.isActor),
  ("N4 not guessed",   fun f => !f.guessed),
  ("N5 not unknown",   fun f => !f.unknown)]⟩

/-- [D] Facts about one reports_to link. No label field. -/
structure OrgFacts where
  confirmed : Bool
  absent    : Bool
  fromKnown : Bool
  toKnown   : Bool
  cycle     : Bool

/-- [D] reports_to is absent, or both ends are known, and the link is not a cycle. -/
def orgLink : Concept OrgFacts := ⟨[
  ("P7 confirmed",                 (·.confirmed)),
  ("O1 absent or both ends known", fun f => f.absent || (f.fromKnown && f.toKnown)),
  ("O2 not a cycle",               fun f => !f.cycle)]⟩

/-- A guessed maker is not an open maker. -/
theorem guessed_not_open (f : MakerFacts) (h : f.guessed = true) : openMaker.passes f = false := by
  simp [Concept.passes, openMaker, h]

/-- A guessed maker is not a named maker. -/
theorem guessed_not_named (f : MakerFacts) (h : f.guessed = true) : namedMaker.passes f = false := by
  simp [Concept.passes, namedMaker, h]

/-- Nothing is both an open maker and a named maker. -/
theorem open_disjoint_named : Disjoint openMaker namedMaker := by
  intro f ⟨ho, hn⟩
  simp [Concept.passes, openMaker, namedMaker, List.all_cons, List.all_nil, Bool.and_eq_true] at ho hn
  obtain ⟨_, hu, _, _⟩ := ho
  obtain ⟨_, _, _, _, _, hnu⟩ := hn
  simp [hu] at hnu

/-- A cycle is not an org link. -/
theorem cycle_not_org_link (f : OrgFacts) (h : f.cycle = true) : orgLink.passes f = false := by
  simp [Concept.passes, orgLink, h]

/-- [D] Facts about a join date. No name field. -/
structure JoinFacts where
  confirmed : Bool
  unknown   : Bool
  dated     : Bool
  sourced   : Bool
  guessed   : Bool

/-- [D] The date is unknown, or it was supplied with a source, and it was not the run date. -/
def knownJoin : Concept JoinFacts := ⟨[
  ("P7 confirmed",                    (·.confirmed)),
  ("J1 unknown or dated and sourced", fun f => f.unknown || (f.dated && f.sourced)),
  ("J2 not the run date",             fun f => !f.guessed)]⟩

/-- [D] Facts about an observed workspace owner. No name field. -/
structure SeatFacts where
  confirmed : Bool
  unknown   : Bool
  principal : Bool
  subject   : Bool

/-- [D] The owner is unknown or the writing actor's principal, and is not the named subject. -/
def workspaceOwner : Concept SeatFacts := ⟨[
  ("P7 confirmed",            (·.confirmed)),
  ("W1 unknown or principal", fun f => f.unknown || f.principal),
  ("W2 not the subject",      fun f => !f.subject)]⟩

/-- The run date guessed in is not a known join. -/
theorem guessed_not_known_join (f : JoinFacts) (h : f.guessed = true) : knownJoin.passes f = false := by
  simp [Concept.passes, knownJoin, h]

/-- The named subject is not the workspace owner. -/
theorem subject_not_workspace_owner (f : SeatFacts) (h : f.subject = true) : workspaceOwner.passes f = false := by
  simp [Concept.passes, workspaceOwner, h]
