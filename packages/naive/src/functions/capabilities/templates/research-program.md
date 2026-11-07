---
type: research-program
tags: [naive, autoresearch, research-program, capabilities]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Business capabilities

This is the business capabilities function's research program, `programs/capabilities.md` in the venture. It tells the `capabilities-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/capabilities/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/capabilities write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the business capabilities function owns, listed below.

## What to research

- Which signals about the venture's own processes predict work that stalls, repeats or loses quality.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (such as `market/rounds`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
