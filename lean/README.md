# lean/

Proofs that settle Naive's definitions. When a term is contested (is this person a founder? is every co-founder a founder?), the answer comes from running a check or a proof, not from asking someone how it was defined.

- `Naive/Concept.lean`: the engine. A concept is a list of named, decidable properties; `passes`, `failed` (why not), `IsA`, `Disjoint`, and `refine_isA` (adding properties narrows a concept).
- `Naive/Terms.lean`: the relation is total (R3); every phase gate is a threshold guardian; admitting a term keeps term ids unique, and by induction any sequence of admissions does (§23).
- `Naive/Founder.lean`: founder (P7, F1 to F5) and co-founder. Proves every co-founder is a founder, unconfirmed facts never make a founder, and an unevidenced contribution never counts. `decide` settles single cases.
- `Naive/Layer.lean`: layer in the technical sense. An order that every dependency points down rules out a cycle (`downward_order_no_cycle`), so a cycle rules out every such order (`cycle_no_downward_order`), and EE-001's five looping groupings have none (`ee001_loop_no_downward_order`). A witness shows the ontology's three have one.
- [`Naive/StandingRules.lean`](./Naive/StandingRules.lean): Wilson lower bound for earning a standing rule, and the floored Wald SPRT for losing one. Each theorem is stated in plain language in [`STANDING_RULE_LEARNING_2026-11-02.md`](../docs/design/STANDING_RULE_LEARNING_2026-11-02.md).

Build: `cd lean && lake exe cache get && lake build` (toolchain pinned in `lean-toolchain`; install with elan). [`Naive/StandingRules.lean`](./Naive/StandingRules.lean) uses Mathlib for real square roots and logarithms, and `lakefile.toml` builds it as its own root (`Naive.StandingRules`) so Mathlib is not imported beside `Naive.Concept`. The other files stay in core Lean. `lake exe cache get` downloads Mathlib's build cache. CI does that and then `lake build`. The cache lives under `lean/.lake`, which `eslint.config.mjs` ignores.

Conventions follow spct-lean: every property is a check that can fail; the facts carry no label field, so no check can read one.
