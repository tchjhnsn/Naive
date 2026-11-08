---
type: research-program
tags: [naive, autoresearch, research-program, it]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Information technology

This is the information technology function's research program, `programs/it.md` in the venture. It tells the `it-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/it/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/it write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the information technology function owns, listed below.

## What to research

- Which signals about accounts, integrations and access predict an outage, a breach or a tool the venture no longer uses.
- Which ratio of granted to used scopes per agent credential predicts a later scope incident, and the smallest scope set that keeps task success unchanged.
- Whether the lag between a team plan change and the matching access change predicts access incidents, and what lag is safe.
- Which inactivity window (14, 30 or 60 days) best predicts that a software seat stays unused.
- For a small team, whether change fail rate or error budget burn warns earlier of an outage customers see.
- Signals to watch: new OAuth grants and API keys, credentials near expiry, agent actions denied by scope, accounts without MFA, leavers not revoked after 24 hours, vendor advisories and known exploited vulnerabilities, and vendor breaches or terms changes.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
