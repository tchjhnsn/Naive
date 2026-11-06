import Naive.Concept

/-
  Terms admitted through packages/naive/src/terms/admit.ts. The TypeScript engine runs each term on records and
  cross-runs it over sampled cases; the theorems here hold for every case.
-/

/-- [D] The relations the engine reads off two pass sets. -/
inductive Relation | equal | isA | hasAKind | overlap | disjoint | inconclusive
  deriving DecidableEq, Repr

/-- [D] The relation from the sizes of two sets and of their intersection (mirrors engine.ts relation). -/
def relationOf (a b inter : Nat) : Relation :=
  if a = 0 ∨ b = 0 then .inconclusive
  else if inter = 0 then .disjoint
  else if inter = a ∧ inter = b then .equal
  else if inter = a then .isA
  else if inter = b then .hasAKind
  else .overlap

/-- Every value of relationOf is one of the six relations. This holds for any function into Relation, so it says
    nothing about the engine: that the TypeScript relation and this relationOf agree is not checked yet. -/
theorem relationOf_total (a b i : Nat) :
    relationOf a b i ∈ [Relation.equal, .isA, .hasAKind, .overlap, .disjoint, .inconclusive] := by
  unfold relationOf
  split <;> (try split) <;> (try split) <;> (try split) <;> (try split) <;> simp

/-- [D] The facts of one encounter or crossing. No label field. -/
structure Encounter where
  confirmed : Bool
  atCrossing : Bool
  phaseExit : Bool
  resists : Bool
  helpsOutright : Bool
  opposesJourney : Bool
  passable : Bool
  endsAfterCrossing : Bool
  person : Bool

def confirmedProp : String × (Encounter → Bool) := ("P7 confirmed", (·.confirmed))

def thresholdGuardian : Concept Encounter := ⟨[
  confirmedProp,
  ("G1 at a crossing", (·.atCrossing)),
  ("G2 tests or blocks", fun f => f.resists && !f.helpsOutright),
  ("G3 not the main opponent", fun f => !f.opposesJourney),
  ("G4 passable without destruction", (·.passable)),
  ("G5 ends once crossed", (·.endsAfterCrossing))]⟩

def phaseGate : Concept Encounter := ⟨thresholdGuardian.props ++ [
  ("PG1 a phase exit", (·.phaseExit)),
  ("PG2 not a person", fun f => !f.person)]⟩

/-- Every phase gate is a threshold guardian, for every possible crossing. -/
theorem phaseGate_isA_thresholdGuardian : IsA phaseGate thresholdGuardian := refine_isA thresholdGuardian _

/-- A guardian need not be a person: a witness. -/
example : thresholdGuardian.passes ⟨true, true, true, true, false, false, true, true, false⟩ = true := by decide

/-! Admission (§23): admitting a term keeps the vocabulary's invariant. Here the invariant is that
    term ids are unique; admit refuses an id already taken. -/

/-- [D] Admit an id into a vocabulary: refused (unchanged) if the id is taken. -/
def admit (vocab : List String) (id : String) : List String :=
  if id ∈ vocab then vocab else id :: vocab

/-- If the vocabulary's ids are unique, they stay unique after any admission. -/
theorem admit_preserves_nodup (vocab : List String) (id : String) (h : vocab.Nodup) :
    (admit vocab id).Nodup := by
  unfold admit
  split
  · exact h
  · next hn => exact List.nodup_cons.mpr ⟨hn, h⟩

/-- By induction, any sequence of admissions from an empty vocabulary keeps ids unique. -/
theorem admitAll_nodup (ids : List String) : (ids.foldl admit []).Nodup := by
  suffices ∀ v : List String, v.Nodup → (ids.foldl admit v).Nodup from this [] List.nodup_nil
  induction ids with
  | nil => intro v h; exact h
  | cons x xs ih => intro v h; exact ih _ (admit_preserves_nodup v x h)

/-! Term labels (N-051 to N-055, S2-PR8): the designation and origin a term carries, mirroring the `Labels` union in
    packages/naive/src/terms/terms.ts. Scope and grade constrain nothing here, so they are left out. -/

/-- [D] Designation per ISO 1087:2019. Symbol is reserved, so it has no constructor. -/
inductive Designation | term | properName | appellation
  deriving DecidableEq, Repr

/-- [D] Origin. Adopted carries the source's definition, quoted and not empty (N-054). -/
inductive Origin
  | adopted (quote : String) (quoted : quote ≠ "")
  | adapted | narrowed | broadened | borrowed | operationallyCoined

/-- [D] The quote an origin carries, if any. -/
def Origin.quote? : Origin → Option String
  | .adopted q _ => some q
  | _ => none

/-- An origin that carries a quote carries a non-empty one: no adopted origin can be built without a quote. -/
theorem origin_quote_nonempty (o : Origin) (q : String) (h : o.quote? = some q) : q ≠ "" := by
  cases o with
  | adopted q' hq => simp [Origin.quote?] at h; exact h ▸ hq
  | _ => simp [Origin.quote?] at h

/-- [D] The labels the cap reads. -/
structure Labeled where
  designation : Designation
  origin : Origin

/-- [D] Counts toward the 10 percent cap: a term (not a proper name or appellation) that is operationally coined
    or borrowed (N-055; mirrors capShare in terms.ts). -/
def countsTowardCap : Labeled → Bool
  | ⟨.term, .operationallyCoined⟩ | ⟨.term, .borrowed⟩ => true
  | _ => false

/-- [D] Inside the cap: designation term. The share is counted over these. -/
def inCap (t : Labeled) : Bool := t.designation == .term

/-- [D] The cap holds when at most a tenth of the terms inside it count toward it (`10 * counted ≤ of`). -/
def underCap (ts : List Labeled) : Bool := 10 * (ts.filter countsTowardCap).length ≤ (ts.filter inCap).length

/-- A proper name never counts toward the cap, whatever its origin (N-052, N-055). -/
theorem properName_not_counted (o : Origin) : countsTowardCap ⟨.properName, o⟩ = false := by
  cases o <;> rfl

/-- An appellation never counts toward the cap, whatever its origin (N-053). -/
theorem appellation_not_counted (o : Origin) : countsTowardCap ⟨.appellation, o⟩ = false := by
  cases o <;> rfl

/-- Adding a proper name or an appellation never changes the cap's verdict: it is neither counted nor counted
    against, so naming more products and ventures cannot make room for coined terms. -/
theorem name_leaves_cap (t : Labeled) (ts : List Labeled) (h : t.designation ≠ .term) :
    underCap (t :: ts) = underCap ts := by
  obtain ⟨d, o⟩ := t
  have hc : countsTowardCap ⟨d, o⟩ = false := by cases d <;> cases o <;> simp_all [countsTowardCap]
  have hi : inCap ⟨d, o⟩ = false := by cases d <;> simp_all [inCap]
  simp [underCap, hc, hi]

/-- Only a term inside the cap can count toward it, so the counted share never exceeds the whole. -/
theorem counted_le_inCap (ts : List Labeled) : (ts.filter countsTowardCap).length ≤ (ts.filter inCap).length := by
  induction ts with
  | nil => simp
  | cons t ts ih =>
    obtain ⟨d, o⟩ := t
    cases d <;> cases o <;> simp [List.filter_cons, countsTowardCap, inCap] <;> omega

/-! Typed links (S2-PR9): the relations an idea may state toward another idea, from packages/naive/src/terms/relations.ts.
    The term typed-link reads a link whose type is not its order backwards, so a narrower b counts as b broader a
    when it looks for a cycle. These theorems show the table keeps that sound. That this table and the TypeScript
    one name the same relations is checked by packages/naive/src/functions/strategy/frameworks/idea-map/test.mjs. -/

/-- [D] The relations between two ideas. -/
inductive IdeaRelation | broader | narrower | related | partOf | derivedFrom | buildsOn | supports | contradicts
  deriving DecidableEq, Repr

/-- [D] The relation a link implies in the other direction, when it implies one. -/
def IdeaRelation.inverse : IdeaRelation → Option IdeaRelation
  | .broader => some .narrower
  | .narrower => some .broader
  | .related => some .related
  | _ => none

/-- [D] The order a relation belongs to, named by the relation read forward. No cycle may run through one order. -/
def IdeaRelation.order : IdeaRelation → Option IdeaRelation
  | .broader => some .broader
  | .narrower => some .broader
  | .partOf => some .partOf
  | .buildsOn => some .buildsOn
  | _ => none

/-- Inverses come in pairs: reading a link backwards and back again gives the relation it started as. -/
theorem idea_inverse_involutive (r s : IdeaRelation) (h : r.inverse = some s) : s.inverse = some r := by
  cases r <;> simp [IdeaRelation.inverse] at h <;> subst h <;> rfl

/-- A relation and its inverse belong to the same order, so a cycle stated through broader and narrower together
    is still one cycle in one order. -/
theorem idea_inverse_same_order (r s : IdeaRelation) (h : r.inverse = some s) : r.order = s.order := by
  cases r <;> simp [IdeaRelation.inverse] at h <;> subst h <;> rfl

/-- An order is named by a relation that belongs to it, so a link whose type equals its order reads forward. -/
theorem idea_order_canonical (r k : IdeaRelation) (h : r.order = some k) : k.order = some k := by
  cases r <;> simp [IdeaRelation.order] at h <;> subst h <;> rfl
