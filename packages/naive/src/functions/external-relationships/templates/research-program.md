---
type: research-program
tags: [naive, autoresearch, research-program, external-relationships]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: External relationships

This is the external relationships function's research program, `programs/external-relationships.md` in the venture. It tells the `external-relationships-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/external-relationships/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/external-relationships write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the external relationships function owns, listed below.

## What to research

- Which signals about investors, partners and the press predict a conversation worth having now.
- Whether monthly investor updates with asks shorten the next raise compared with irregular updates.
- Which update fields (metric changes, lowlights, asks) predict replies and introductions.
- How many months of runway at the start of a raise predicts one that closes without a bridge.
- Which public regulatory signals come before a rule that affects the venture, and how long before.
- Signals to watch: runway below a set number of months, days since the last investor update, public drafts by agents (the publication policy), investor and fund activity at the venture's stage, competitor funding (`competitor-signals`), journalists covering the topic, and media mentions.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
