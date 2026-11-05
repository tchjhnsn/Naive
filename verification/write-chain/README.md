# Write chain statechart

What happens when a person or an agent saves a record in Naive, generated from the architecture record. Step names are the record's plain labels (`plain`, `plain_fail` on each step), written with pstack's bro and technical-writing skills. Every state and arrow comes from `flows.write` in the record; nothing in the model is typed by hand.

- **Source record:** a draft architecture record (sha256 `133c4e1b824c`) kept outside this repo while Naive's architecture is rebuilt system by system (`docs/design/NAIVE_SYSTEMS_2026-11-01.md`). This chart covers one mechanism, saving a record. It is not Naive's architecture; it will be regenerated from the rebuilt record.
- **Generator:** `gen-statechart.py`, a prototype outside this repo; it moves in with the rebuilt record.
- **Code the steps are anchored in:** `interface/router.mjs` and `interface/writes.mjs` at everything-ecosystem main `2507d1a` (check A12, `flow-check.ts`: 13/13 anchors found in order).

## Rules

| Rule | TLC |
|---|---|
| SchemaBeforeStore: nothing is stored unless the schema check passed | PASS |
| ProvenanceForEveryWrite: every answered write has a provenance line | PASS |
| RefusedTouchesNothing: a refused write stores nothing | PASS |
| AgentNeverStoresGatedRecord: an agent's write to a gated route is stored only as a draft | PASS |
| StoredTypeExists: nothing is stored for a record type that does not exist yet; a new type exists only after a person admits it (EE-100, designed) | PASS |
| TypeOK, NoDeadlock | PASS |

TLC reached 88 states and 122 steps; the chart draws 17 states and 26 arrows. The research branch from the first step is designed, not built (EE-100) and hides the `Done` step (an end state that changes nothing).

## What this proves and what it does not

It proves the design in the record is consistent: no ordering of the record's steps breaks the four rules. It does not prove the code branches the same way. A12 shows each step's anchor is in the code in order; replaying each arrow against the router as a test is still to do. Two modelling choices are mine, from the step descriptions: a draft at steps 7 to 10 goes straight to store, and steps 3, 7, 9 and 10 act only on an agent's write.

## Regenerate

```sh
cd verification/write-chain
TLA2TOOLS=<tla2tools.jar 1.7.4, sha256 936a262061c9...> JAVA=java \
  <pstack>/skills/statechart/scripts/statechart WriteChain.tla --config WriteChain.cfg --view view.mjs --out out
```

`out/chart.png` and `out/chart.svg` were rendered with Mermaid 11.4.1 (Pele was not available in the cloud session).
