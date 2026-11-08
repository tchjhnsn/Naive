---
type: research-program
tags: [naive, autoresearch, research-program, products]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Products and services

This is the products and services function's research program, `programs/products.md` in the venture. It tells the `products-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/products/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/products write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the products and services function owns, listed below.

## What to research

- Which signals about users, usage and requests should move a product card or a roadmap item.
- How to tell a request many accounts share from one loud account.
- Which activation event in the first 7 days best predicts 90 day retention, and whether it holds across cohorts.
- How many distinct ICP accounts must ask for a capability before shipping it measurably raises their retention or expansion, resolved by how the accounts that asked use it after release. A feature-request register that counts distinct ICP accounts per request would hold this; its record type is not built, so there is no pattern for it yet.
- Whether the product-market fit survey leads retention changes, and by how many weeks.
- Which features of a shaped pitch predict that it ships within its cycle.
- Signals to watch: activation and cohort retention, open P0 and P1 bugs (`naive bugs`), deals lost for a missing capability, interview cadence, delivery metrics, competitor launches (strategy's `competitor-signals`), and platform or dependency changes.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.

The first pattern for this function would be the feature-request register counted by distinct ICP accounts. Its record type is not built, so it is a research question above until it is.
