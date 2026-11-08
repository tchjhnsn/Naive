# terms

Up: [src](../README.md)

## What this is

The EE-095 term engine: every term is admitted through one pipeline with a valid test, cross-runs and the Lean theorems it names. Also the ontology (the canonical nouns), the catalog of ontologies and Naive's operating rules. Nothing symbolic bypasses it (`bypass-guard-test.ts`).

## Where things are

| Path | Holds |
|---|---|
| [`admit.ts`](./admit.ts) | Admit every term through the same pipeline (Torian, 2026-10-31. |
| [`admitted.json`](./admitted.json) | The admitted terms, written by `admit.ts`. |
| [`bypass-guard-test.ts`](./bypass-guard-test.ts) | Fails the suite when a symbolic check bypasses the EE-095 term engine and the Lean proofs. Plain checks, such as `check-traces.ts` (hash chains and links) and `check-write-scope.ts` (path prefixes) and `check-detectors.ts` (ledger chains, references and arithmetic) `check-signals.ts` (schema shape, field owners and reducers, content hashes, paths and references) and `check-recipes.ts` (chains, references, budget counts and renders compared again), are registered with a reason. |
| [`catalog-test.ts`](./catalog-test.ts) | Checks the catalog of ontologies (N-050). |
| [`engine-test.ts`](./engine-test.ts) | Tests the term engine. |
| [`engine.ts`](./engine.ts) | The term engine (EE-095; Torian, 2026-10-31). |
| [`fixtures/`](./fixtures) | Fixtures for the membership gate's tests. |
| [`fixtures.ts`](./fixtures.ts) | Real arrangements, run beside the generated cases. |
| [`gen-concepts-test.ts`](./gen-concepts-test.ts) | Regenerates the Lean ontology concepts from small fixtures and checks what packages/naive/src/terms/gen-concepts.ts does. |
| [`gen-concepts.ts`](./gen-concepts.ts) | Writes one Lean `Concept` per noun in packages/naive/src/terms/ontology.json to packages/naive/lean/Naive/Generated/Ontology.lean. |
| [`lean-agreement-test.ts`](./lean-agreement-test.ts) | Fails the suite when the term engine and the Lean proofs disagree about which terms and theorems exist. |
| [`levels.ts`](./levels.ts) | The levels terms are defined at, each with its facts and a seeded case generator. The detector and trial levels hold the signal detection terms. The reception level (one signal arriving at one listener) holds the signal library terms; its signals and listeners come from pools, so one signal reaches many listeners. The experiment, plan and settlement levels hold the autoresearch terms. |
| [`ontology-catalog.json`](./ontology-catalog.json) | The catalog of ontologies, one scope per function (N-050). |
| [`ontology-gate-test.ts`](./ontology-gate-test.ts) | Behavior of the membership gate. |
| [`ontology-gate.ts`](./ontology-gate.ts) | The membership gate (the first gate of the handoff pipeline). |
| [`ontology-metamodel-test.ts`](./ontology-metamodel-test.ts) | Behavior of the ontology metamodel (N-048). |
| [`ontology.json`](./ontology.json) | The canonical nouns (EE-014). The lead agents design proposes `spend register` and `access matrix` (build item 2), status proposed. |
| [`ontology.md`](./ontology.md) | The readable form of `ontology.json`. |
| [`operating-rules-test.ts`](./operating-rules-test.ts) | The operating-rules module. |
| [`operating-rules.json`](./operating-rules.json) | Naive's default operating rules, which a venture can override. |
| [`operating-rules.ts`](./operating-rules.ts) | Naive's operating rules, as a module a venture can override. |
| [`relations.ts`](./relations.ts) | The typed relations an idea record may state (S2-PR9). Every relation name is kebab-case (`builds-on`, `appends-to`, `derives-from`); `packages/naive/src/engine/rename-relations.ts` renames the old snake_case values in existing idea records. |
| [`terms.ts`](./terms.ts) | The admitted and proposed terms. The signal detection terms (detector, trial, hit, miss, false-alarm, correct-rejection) cite the theorems in [`Detection.lean`](../../lean/Naive/Detection.lean). The signal library terms (signal, listener, reception, salient-reception, noise) cite the theorems in [`Signals.lean`](../../lean/Naive/Signals.lean). Signal reads only a signal's facts and listener only a listener's; salient reception and noise read the pair, and `engine-test.ts` shows that no property of a signal alone defines noise: some generated signals are noise at one reception and salient at another. The autoresearch terms (experiment, kept-experiment, discarded-experiment, eval-plan, settled-record) cite the theorems in [`Recipes.lean`](../../lean/Naive/Recipes.lean); settled-record reads no agent claim, and `engine-test.ts` shows that adding agent claims changes no verdict. |
| [`upper-test.ts`](./upper-test.ts) | Checks the upper ontology (N-049) through the EE-095 term engine. |

## Run and test

- `node packages/naive/src/terms/admit.ts` regenerates the admitted terms.
- `node packages/naive/src/terms/engine-test.ts` tests the engine.

The operating-rules loader and the ontology gate check a module or a handoff against its schema with `validateFile` from [`packages/naive/src/records/validate.mjs`](../records/README.md). A checker that cannot run is still a tool error, never a verdict; the tests prove it with a validator that has no schemas (`useValidator`).
