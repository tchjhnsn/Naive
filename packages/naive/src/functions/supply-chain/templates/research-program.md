---
type: research-program
tags: [naive, autoresearch, research-program, supply-chain]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Supply chain

This is the supply chain function's research program, `programs/supply-chain.md` in the venture. It tells the `supply-chain-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/supply-chain/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/supply-chain write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the supply chain function owns, listed below.

## What to research

- Which signals about suppliers, lead times and prices predict a late or short delivery.
- Whether store sell-through over the last 4 weeks predicts the next 8 weeks of demand better than pre-order counts. An inventory position record type (weeks of supply and sell-through per SKU) is not built, so there is no pattern for it yet.
- Whether a supplier's quote response time and completeness predict its later on-time-in-full rate. Shipment and supplier scorecard record types are not built either.
- At what first-article defect rate later returns for defects exceed what the venture tolerates.
- With what lag and size tariff or freight index changes reach the venture's landed cost.
- Signals to watch: supplier lead time changes and missed order acknowledgments, end-of-life notices, freight indexes, tariff and duty changes, inspection failures per lot, returns tagged as defects, carrier on-time and pick error rates, and exchange rates on supplier currencies.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.

The first patterns for this function would be inventory position, shipments and the supplier scorecard. Their record types are not built, so they are research questions above until they are.
