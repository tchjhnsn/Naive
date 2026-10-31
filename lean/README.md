# lean/

Proofs that settle Naive's definitions. When a term is contested (is this person a founder? is every co-founder a founder?), the answer comes from running a check or a proof, not from asking someone how it was defined.

- `Naive/Concept.lean`: the engine. A concept is a list of named, decidable properties; `passes`, `failed` (why not), `IsA`, `Disjoint`, and `refine_isA` (adding properties narrows a concept).
- `Naive/Founder.lean`: founder (P7, F1 to F5) and co-founder. Proves every co-founder is a founder, unconfirmed facts never make a founder, and an unevidenced contribution never counts. `decide` settles single cases.

Build: `cd lean && lake build` (toolchain pinned in `lean-toolchain`; install with elan). Core Lean only: no Mathlib until a result needs it.

Conventions follow spct-lean: every property is a check that can fail; the facts carry no label field, so no check can read one.
