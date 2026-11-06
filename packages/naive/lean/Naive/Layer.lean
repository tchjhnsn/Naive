/-
  Layer (packages/naive/src/terms/terms.ts, level arrangement). In the technical sense a layer is a part of an
  arrangement in which each part depends only on the parts beneath it. These theorems hold for every
  arrangement, not a sample: an order that every dependency points down rules out a cycle, so an
  arrangement with a loop has no such order. EE-001's five looping groupings are one.
-/

/-- [D] Part `a` reaches part `b` through one or more dependencies. -/
inductive Reaches {α : Type} (dep : α → α → Prop) : α → α → Prop
  | step {a b : α} : dep a b → Reaches dep a b
  | trans {a b c : α} : dep a b → Reaches dep b c → Reaches dep a c

/-- [D] Every dependency points down the order `rank`: each part depends only on parts beneath it. -/
def PointsDown {α : Type} (dep : α → α → Prop) (rank : α → Nat) : Prop := ∀ a b, dep a b → rank b < rank a

/-- Following dependencies only ever goes down. -/
theorem reaches_lowers_rank {α : Type} {dep : α → α → Prop} {rank : α → Nat} (h : PointsDown dep rank)
    {a b : α} (r : Reaches dep a b) : rank b < rank a := by
  induction r with
  | step d => exact h _ _ d
  | trans d _ ih => exact Nat.lt_trans ih (h _ _ d)

/-- If every dependency points down an order, no part depends on itself through others: there is no cycle. -/
theorem downward_order_no_cycle {α : Type} {dep : α → α → Prop} {rank : α → Nat} (h : PointsDown dep rank)
    (a : α) : ¬ Reaches dep a a :=
  fun r => Nat.lt_irrefl _ (reaches_lowers_rank h r)

/-- A cycle rules out every downward order: no ranking puts each part above what it depends on. -/
theorem cycle_no_downward_order {α : Type} {dep : α → α → Prop} {a : α} (c : Reaches dep a a) :
    ¬ ∃ rank, PointsDown dep rank :=
  fun ⟨_, h⟩ => downward_order_no_cycle h a c

/-- [D] EE-001's loop over Purpose (0), Knowledge (1), Operations (2), Execution (3) and Evidence (4):
    each takes from the one before, and Purpose takes from Evidence. -/
abbrev ee001Loop (a b : Fin 5) : Prop := a.val = (b.val + 1) % 5

/-- EE-001's five groupings have no order in which each depends only on those beneath it. -/
theorem ee001_loop_no_downward_order : ¬ ∃ rank : Fin 5 → Nat, PointsDown ee001Loop rank :=
  cycle_no_downward_order (a := 0)
    (.trans (b := 4) (by decide) (.trans (b := 3) (by decide) (.trans (b := 2) (by decide)
      (.trans (b := 1) (by decide) (.step (by decide))))))

/-- [D] The ontology's three: the upper ontology (1) follows the metamodel (0), the catalog (2) the upper ontology. -/
def ontologyThree (a b : Fin 3) : Prop := a.val = b.val + 1

/-- The ontology's three have such an order (a witness: each part's own number). -/
example : PointsDown ontologyThree Fin.val := fun _ _ h => by unfold ontologyThree at h; omega
