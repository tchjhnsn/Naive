---
type: research-program
tags: [naive, autoresearch, research-program, service-delivery]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Service delivery

This is the service delivery function's research program, `programs/service-delivery.md` in the venture. It tells the `service-delivery-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/service-delivery/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/service-delivery write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the service delivery function owns, listed below.

## What to research

- Which signals about engagements predict one that slips, grows or ends early.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (such as `market/rounds`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
