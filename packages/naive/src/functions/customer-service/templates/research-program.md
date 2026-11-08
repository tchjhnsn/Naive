---
type: research-program
tags: [naive, autoresearch, research-program, customer-service]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Customer service

This is the customer service function's research program, `programs/customer-service.md` in the venture. It tells the `customer-service-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/customer-service/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/customer-service write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the customer service function owns, listed below.

## What to research

- Which signals in support channels and feedback predict a customer who leaves or a problem many share.
- Whether help-center searches with no result on a topic come before a spike in contacts on it, and by how many days.
- Whether Customer Effort Score predicts renewal or repeat purchase better than CSAT or NPS for this venture.
- Which contact reasons have the highest 7 day repeat rate, and whether fixing their articles lowers it.
- Whether contacts an agent answers differ from a person's in reopen rate and satisfaction, by contact type.
- Whether a refund resolved in the first contact lowers later chargebacks and cancellations.
- Signals to watch: contacts per active customer by reason, refunds and chargebacks, cancellation reasons, public reviews, error-rate alarms, legal or safety words in a contact (escalated to a person at once), and backlog age against target.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
