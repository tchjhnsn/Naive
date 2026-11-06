import Naive.Concept
import Naive.Layer

/-
  The upper ontology (N-049): Naive's top categories, each mapped to a class of BFO, and every noun reaching
  exactly one of them through broader (packages/naive/src/terms/ontology.json, `top_categories` and each noun's `broader`). The code
  runs the term top-category (packages/naive/src/terms/terms.ts) on the real hierarchy in packages/naive/src/terms/upper-test.ts. Its
  properties are U1 no cycle, U2 a top category has nothing broader, U3 no orphan, U4 no category reaches two
  top categories. These theorems hold for every hierarchy, not a sample:

  * A rank that every broader link lowers rules out a cycle (`upper_no_cycle`). The converse is what the code
    needs, since U1 checks for a cycle, not a rank: a finite hierarchy with no cycle has such a rank, the number
    of categories above each one (`upper_rank_of_no_cycle`).
  * U2 makes a top category reach only itself (`upper_top_only_itself`).
  * U1 (as a rank) and U3 give every category at least one top category (`upper_reaches_top`).
  * A category assignment `cat` that each top category keeps and each broader link preserves makes the top
    category a category reaches unique (`upper_top_unique`), so U1, U3 and `cat` give exactly one
    (`upper_one_top`).
  * U1 (as a rank), U3 and U4 give such a `cat`, the top category a category reaches (`upper_cat_of_u4`), so
    they give exactly one top category (`upper_one_top_of_u4`). U2 is not needed for this.
  * Together: on a finite hierarchy, no cycle (U1), no orphan (U3) and no category reaching two top categories
    (U4) give every category exactly one top category (`upper_one_top_of_checks`).
  * When each broader link is an is_a between two concepts, a noun's concept is_a its top category's
    (`upper_isA_top`). This is the term engine's hook: where both ends of a link name admitted terms, the
    relation read off their pass sets must be is_a or equal.

  What is proved is that these hypotheses give exactly one top category. That the code's checks in
  packages/naive/src/terms/terms.ts state the same hypotheses is read off the code, not proved: U1 is `below` with no
  category reaching itself (Lean's `Reaches`), U3 is a top category or a broader link, and U4 counts the top
  categories a category reaches through zero or more links (Lean's `Below`).

  Core Lean only, no Mathlib.
-/

/-- [D] Category `a` reaches category `b` through zero or more broader links (`broader a b`: b is broader). -/
inductive Below {α : Type} (broader : α → α → Prop) : α → α → Prop
  | refl (a : α) : Below broader a a
  | step {a b c : α} : broader a b → Below broader b c → Below broader a c

/-- U1: if every broader link lowers a rank, no category is broader than itself through others. -/
theorem upper_no_cycle {α : Type} {broader : α → α → Prop} {rank : α → Nat}
    (climbs : PointsDown broader rank) (a : α) : ¬ Reaches broader a a :=
  downward_order_no_cycle climbs a

/-- U2: a top category with nothing broader reaches only itself. -/
theorem upper_top_only_itself {α : Type} {broader : α → α → Prop} {top : α → Prop}
    (topmost : ∀ t b, top t → ¬ broader t b) {t u : α} (ht : top t) (r : Below broader t u) : u = t := by
  cases r with
  | refl => rfl
  | step h _ => exact absurd h (topmost _ _ ht)

/-- U1 and U3: when every broader link lowers a rank and every category that is not a top category has
    something broader, every category reaches a top category. -/
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

/-- Filtering by a weaker test keeps no more entries than filtering by a stronger one. -/
private theorem filter_length_le {α : Type} (f g : α → Bool) (sub : ∀ x, f x = true → g x = true) :
    ∀ l : List α, (l.filter f).length ≤ (l.filter g).length
  | [] => Nat.le_refl _
  | x :: xs => by
    have ih := filter_length_le f g sub xs
    cases hf : f x <;> cases hg : g x <;> simp [List.filter, hf, hg]
    · exact ih
    · exact Nat.le_succ_of_le ih
    · exact absurd (sub x hf) (by simp [hg])
    · exact ih

/-- And strictly fewer when some entry passes the stronger test and fails the weaker one. -/
private theorem filter_length_lt {α : Type} (f g : α → Bool) (sub : ∀ x, f x = true → g x = true) {y : α}
    (gy : g y = true) (fy : f y = false) : ∀ {l : List α}, y ∈ l → (l.filter f).length < (l.filter g).length
  | x :: xs, hy => by
    cases hy with
    | head => simp [List.filter, gy, fy]; exact Nat.lt_succ_of_le (filter_length_le f g sub xs)
    | tail _ h =>
      have ih := filter_length_lt f g sub gy fy h
      cases hf : f x <;> cases hg : g x <;> simp [List.filter, hf, hg]
      · exact ih
      · exact Nat.lt_succ_of_lt ih
      · exact absurd (sub x hf) (by simp [hg])
      · exact ih

section
attribute [local instance] Classical.propDecidable

/-- U1 as the code checks it: in a finite hierarchy with no cycle, counting the categories above each one is a
    rank that every broader link lowers. A broader link from `a` to `b` puts `b` above `a`, everything above `b`
    above `a`, and `b` not above itself. -/
theorem upper_rank_of_no_cycle {α : Type} {broader : α → α → Prop} (all : List α) (every : ∀ a, a ∈ all)
    (acyclic : ∀ a, ¬ Reaches broader a a) : ∃ rank : α → Nat, PointsDown broader rank :=
  ⟨fun a => (all.filter fun x => decide (Reaches broader a x)).length, fun a b hab =>
    filter_length_lt (fun x => decide (Reaches broader b x)) (fun x => decide (Reaches broader a x))
      (fun _ h => decide_eq_true (.trans hab (of_decide_eq_true h)))
      (decide_eq_true (.step hab)) (decide_eq_false (acyclic b)) (every b)⟩

end

/-- [D] U4 as the code checks it: no category reaches two top categories (reaching through zero or more broader
    links, so a top category reaches itself). -/
def U4 {α : Type} (broader : α → α → Prop) (top : α → Prop) : Prop :=
  ∀ a t u, top t → top u → Below broader a t → Below broader a u → t = u

/-- U1 (as a rank), U3 and U4 give the category assignment that `upper_top_unique` takes: the top category a
    category reaches. A top category keeps itself, and a broader link keeps the category, because the narrower
    end reaches every top category the broader end reaches. -/
theorem upper_cat_of_u4 {α : Type} {broader : α → α → Prop} {top : α → Prop} {rank : α → Nat}
    (climbs : PointsDown broader rank) (noOrphan : ∀ a, ¬ top a → ∃ b, broader a b) (u4 : U4 broader top) :
    ∃ cat : α → α, (∀ t, top t → cat t = t) ∧ (∀ a b, broader a b → cat a = cat b) := by
  refine ⟨fun a => Classical.choose (upper_reaches_top climbs noOrphan a), ?_, ?_⟩
  · intro t ht
    have h := Classical.choose_spec (upper_reaches_top climbs noOrphan t)
    exact u4 t _ t h.1 ht h.2 (.refl t)
  · intro a b hab
    have ha := Classical.choose_spec (upper_reaches_top climbs noOrphan a)
    have hb := Classical.choose_spec (upper_reaches_top climbs noOrphan b)
    exact u4 a _ _ ha.1 hb.1 ha.2 (.step hab hb.2)

/-- U1 (as a rank), U3 and U4 give every category exactly one top category. -/
theorem upper_one_top_of_u4 {α : Type} {broader : α → α → Prop} {top : α → Prop} {rank : α → Nat}
    (climbs : PointsDown broader rank) (noOrphan : ∀ a, ¬ top a → ∃ b, broader a b) (u4 : U4 broader top)
    (a : α) : ∃ t, top t ∧ Below broader a t ∧ ∀ u, top u → Below broader a u → u = t := by
  obtain ⟨cat, own, keeps⟩ := upper_cat_of_u4 climbs noOrphan u4
  exact upper_one_top climbs noOrphan cat own keeps a

/-- The four checks as the code runs them on a finite hierarchy (U1 as no cycle, U3, U4; U2 is not needed)
    give every category exactly one top category. -/
theorem upper_one_top_of_checks {α : Type} {broader : α → α → Prop} {top : α → Prop} (all : List α)
    (every : ∀ a, a ∈ all) (acyclic : ∀ a, ¬ Reaches broader a a)
    (noOrphan : ∀ a, ¬ top a → ∃ b, broader a b) (u4 : U4 broader top) (a : α) :
    ∃ t, top t ∧ Below broader a t ∧ ∀ u, top u → Below broader a u → u = t := by
  obtain ⟨_, climbs⟩ := upper_rank_of_no_cycle all every acyclic
  exact upper_one_top_of_u4 climbs noOrphan u4 a
