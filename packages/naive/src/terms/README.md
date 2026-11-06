# terms

Up: [src](../README.md)

## What this is

The EE-095 term engine: every term is admitted through one pipeline with a valid test, cross-runs and the Lean theorems it names. Also the ontology (the canonical nouns), the catalog of ontologies and Naive's operating rules. Nothing symbolic bypasses it (`bypass-guard-test.ts`).

## Where things are

| Path | Holds |
|---|---|
| [`admit.ts`](./admit.ts) | Admit every term through the same pipeline (Torian, 2026-10-31. |
| [`admitted.json`](./admitted.json) | The admitted terms, written by `admit.ts`. |
| [`bypass-guard-test.ts`](./bypass-guard-test.ts) | Fails the suite when a symbolic check bypasses the EE-095 term engine and the Lean proofs. |
| [`catalog-test.ts`](./catalog-test.ts) | Checks the catalog of ontologies (N-050). |
| [`engine-test.ts`](./engine-test.ts) | Tests the term engine. |
| [`engine.ts`](./engine.ts) | The term engine (EE-095; Torian, 2026-10-31). |
| [`fixtures/`](./fixtures) | Fixtures for the membership gate's tests. |
| [`fixtures.ts`](./fixtures.ts) | Real arrangements, run beside the generated cases. |
| [`gen-concepts-test.ts`](./gen-concepts-test.ts) | Regenerates the Lean ontology concepts from small fixtures and checks what packages/naive/src/terms/gen-concepts.ts does. |
| [`gen-concepts.ts`](./gen-concepts.ts) | Writes one Lean `Concept` per noun in packages/naive/src/terms/ontology.json to packages/naive/lean/Naive/Generated/Ontology.lean. |
| [`lean-agreement-test.ts`](./lean-agreement-test.ts) | Fails the suite when the term engine and the Lean proofs disagree about which terms and theorems exist. |
| [`levels.ts`](./levels.ts) | The levels terms are defined at, each with its facts and a seeded case generator. |
| [`ontology-catalog.json`](./ontology-catalog.json) | The catalog of ontologies, one scope per function (N-050). |
| [`ontology-gate-test.ts`](./ontology-gate-test.ts) | Behavior of the membership gate. |
| [`ontology-gate.ts`](./ontology-gate.ts) | The membership gate (the first gate of the handoff pipeline). |
| [`ontology-metamodel-test.ts`](./ontology-metamodel-test.ts) | Behavior of the ontology metamodel (N-048). |
| [`ontology.json`](./ontology.json) | The canonical nouns (EE-014). |
| [`ontology.md`](./ontology.md) | The readable form of `ontology.json`. |
| [`operating-rules-test.ts`](./operating-rules-test.ts) | The operating-rules module. |
| [`operating-rules.json`](./operating-rules.json) | Naive's default operating rules, which a venture can override. |
| [`operating-rules.ts`](./operating-rules.ts) | Naive's operating rules, as a module a venture can override. |
| [`relations.ts`](./relations.ts) | The typed relations an idea record may state (S2-PR9). |
| [`terms.ts`](./terms.ts) | The admitted and proposed terms. |
| [`upper-test.ts`](./upper-test.ts) | Checks the upper ontology (N-049) through the EE-095 term engine. |

## Run and test

- `node packages/naive/src/terms/admit.ts` regenerates the admitted terms.
- `node packages/naive/src/terms/engine-test.ts` tests the engine.
