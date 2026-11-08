---
type: research-program
tags: [naive, autoresearch, research-program, assets]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Assets and facilities

This is the assets and facilities function's research program, `programs/assets.md` in the venture. It tells the `assets-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/assets/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/assets write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the assets and facilities function owns, listed below.

## What to research

- Which signals about equipment, property and leases predict a cost or a renewal the venture must decide on.
- Whether desk or coworking use over 8 weeks predicts that a renewed space commitment ends up under half used.
- Whether repair frequency and condition predict the next equipment failure better than age alone.
- How long after a headcount plan change a space or equipment need actually arrives.
- How close the realized total cost of ownership comes to the cost modeled in build, buy or lease decisions.
- Signals to watch: lease and contract notice dates, the headcount plan against seats, space use, equipment failures and repair costs, warranty expiries, departed people still holding assets, and local rents.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
