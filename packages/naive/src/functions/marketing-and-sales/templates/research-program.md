---
type: research-program
tags: [naive, autoresearch, research-program, marketing-and-sales]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Marketing and sales

This is the marketing and sales function's research program, `programs/marketing-and-sales.md` in the venture. It tells the `marketing-and-sales-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/marketing-and-sales/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/marketing-and-sales write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the marketing and sales function owns, listed below.

## What to research

- Which signals about audiences, campaigns and the pipeline predict a deal that closes.
- Which public signals about the market should change what the site says, and which are noise.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (such as `market/rounds`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
