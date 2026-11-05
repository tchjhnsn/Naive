import Naive.Concept
import Naive.Layer

/-
  The upper ontology (N-049): Naive's top categories, each mapped to a class of BFO, and every noun reaching
  exactly one of them through broader (docs/ontology.json, `top_categories` and each noun's `broader`). The code
  runs the term top-category (schema/terms/terms.ts) on the real hierarchy in schema/terms/upper-test.ts. Its
  properties are U1 no cycle, U2 a top category has nothing broader, U3 no orphan, U4 no category reaches two
  top categories. These theorems hold for every hierarchy, not a sample:

  * U1 (as a rank that every broader link climbs) rules out a cycle (`upper_no_cycle`).
  * U2 makes a top category reach only itself (`upper_top_only_itself`).
  * U1 and U3 give every category at least one top category (`upper_reaches_top`).
  * A category assignment `cat` that each top category keeps and each broader link preserves makes the top
    category a category reaches unique (`upper_top_unique`), so U1, U3 and `cat` give exactly one
    (`upper_one_top`). Under U2 and U4, "the top category a category reaches" is such a `cat`: a top category
    reaches only itself, and the narrower end of a link reaches every top category its broader end reaches.
    That last step is argued here, not proved.
  * When each broader link is an is_a between two concepts, a noun's concept is_a its top category's
    (`upper_isA_top`). This is the term engine's hook: where both ends of a link name admitted terms, the
    relation read off their pass sets must be is_a or equal.

  Core Lean only, no Mathlib.
-/

/-- [D] Category `a` reaches category `b` through zero or more broader links (`broader a b`: b is broader). -/
inductive Below {α : Type} (broader : α → α → Prop) : α → α → Prop
  | refl (a : α) : Below broader a a
  | step {a b c : α} : broader a b → Below broader b c → Below broader a c

/-- U1: if every broader link climbs a rank, no category is broader than itself through others. -/
theorem upper_no_cycle {α : Type} {broader : α → α → Prop} {rank : α → Nat}
    (climbs : PointsDown broader rank) (a : α) : ¬ Reaches broader a a :=
  downward_order_no_cycle climbs a

/-- U2: a top category with nothing broader reaches only itself. -/
theorem upper_top_only_itself {α : Type} {broader : α → α → Prop} {top : α → Prop}
    (topmost : ∀ t b, top t → ¬ broader t b) {t u : α} (ht : top t) (r : Below broader t u) : u = t := by
  cases r with
  | refl => rfl
  | step h _ => exact absurd h (topmost _ _ ht)

/-- U1 and U3: when broader climbs a rank and every category that is not a top category has something broader,
    every category reaches a top category. -/
theorem upper_reaches_top {α : Type} {broader : α → α → Prop} {top : α → Prop} {rank : α → Nat}
    (climbs : PointsDown broader rank) (noOrphan : ∀ a, ¬ top a → ∃ b, broader a b) (a : α) :
    ∃ t, top t ∧ Below broader a t := by
  have key : ∀ n a, rank a < n → ∃ t, top t ∧ Below broader a t := by
    intro n
    induction n with
    | zero => intro a h; exact absurd h (Nat.not_lt_zero _)
    | succ n ih =>
      intro a h
      rcases Classical.em (top a) with ht | ht
      · exact ⟨a, ht, .refl a⟩
      · obtain ⟨b, hb⟩ := noOrphan a ht
        obtain ⟨t, htop, hbt⟩ := ih b (Nat.lt_of_lt_of_le (climbs a b hb) (Nat.le_of_lt_succ h))
        exact ⟨t, htop, .step hb hbt⟩
  exact key (rank a + 1) a (Nat.lt_succ_self _)

/-- If each top category is its own category and each broader link keeps the category, a top category that `a`
    reaches is `a`'s category: there is no second one. -/
theorem upper_top_unique {α : Type} {broader : α → α → Prop} {top : α → Prop} (cat : α → α)
    (own : ∀ t, top t → cat t = t) (keeps : ∀ a b, broader a b → cat a = cat b)
    {a t : α} (ht : top t) (r : Below broader a t) : t = cat a := by
  induction r with
  | refl x => exact (own x ht).symm
  | step hab _ ih => rw [keeps _ _ hab]; exact ih ht

/-- Every category reaches exactly one top category. -/
theorem upper_one_top {α : Type} {broader : α → α → Prop} {top : α → Prop} {rank : α → Nat}
    (climbs : PointsDown broader rank) (noOrphan : ∀ a, ¬ top a → ∃ b, broader a b) (cat : α → α)
    (own : ∀ t, top t → cat t = t) (keeps : ∀ a b, broader a b → cat a = cat b) (a : α) :
    ∃ t, top t ∧ Below broader a t ∧ ∀ u, top u → Below broader a u → u = t := by
  obtain ⟨t, ht, r⟩ := upper_reaches_top climbs noOrphan a
  refine ⟨t, ht, r, fun u hu ru => ?_⟩
  rw [upper_top_unique cat own keeps hu ru, upper_top_unique cat own keeps ht r]

/-- When every broader link is an is_a between the concepts of its ends, a category is_a every category it
    reaches, its top category included. -/
theorem upper_isA_top {α : Type} {β : Type} {broader : α → α → Prop} (concept : α → Concept β)
    (linkIsA : ∀ a b, broader a b → IsA (concept a) (concept b)) {a t : α} (r : Below broader a t) :
    IsA (concept a) (concept t) := by
  induction r with
  | refl => exact fun _ h => h
  | step hab _ ih => exact fun x h => ih x (linkIsA _ _ hab x h)

/-- A link built by refinement is such an is_a: adding properties to a broader concept gives a narrower one. -/
example {β : Type} (c : Concept β) (extra : List (String × (β → Bool))) : IsA ⟨c.props ++ extra⟩ c :=
  refine_isA c extra
