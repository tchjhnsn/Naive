---
type: research-program
tags: [naive, autoresearch, research-program, human-capital]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Human capital (HR)

This is the human capital (HR) function's research program, `programs/human-capital.md` in the venture. It tells the `human-capital-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/human-capital/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/human-capital write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the human capital (HR) function owns, listed below.

## What to research

- Which signals about candidates and roles predict a hire who stays and does well, without profiling any person on traits they did not choose to share.
- For agent roles, which measures (review rejections, rework, founder overrides) predict that a role should move to a person within a quarter.
- Whether the queue of work waiting for review predicts founder overload better than reported hours.
- How often capability register entries older than six months are wrong when checked again, and what interval keeps errors low.
- Which contractor pattern (hours per week, months engaged, share of core work) predicts a later need to reclassify.
- Signals to watch: capability register changes, agent task failures per role, founder hours on work the team plan gives agents, how long each role stays open, offer decline reasons, departures, employment law changes and market pay data.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
