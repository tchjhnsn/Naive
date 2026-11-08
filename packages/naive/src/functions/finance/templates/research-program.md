---
type: research-program
tags: [naive, autoresearch, research-program, finance]
ai-model: claude-opus-5.5
created: 2026-11-07T16:45:59Z
source: hybrid
---

# Research program: Finance and accounting

This is the finance and accounting function's research program, `programs/finance.md` in the venture. It tells the `finance-researcher` role what to research and how. Naive copied it in from its starter (`packages/naive/src/functions/finance/templates/research-program.md`) because the venture lists this function and had no program; it is yours now, and Naive never copies over it.

Only a person edits this file. Naive refuses every agent's write to it, the researcher's included. A person writes it whole with `mentura operations/research-program/finance write --venture <id> --as person --input <file.json>`, where the file holds `{ "text": "..." }`.

## How the researcher works

- It follows Naive's research skill (`packages/naive/src/interfaces/skills/research/SKILL.md`): read this program, change one recipe at a time, read the experiment log, and stop at the budget.
- It reads the venture only as of the eval plan's read cut, and never sees the dev or holdout outcomes.
- It works only the patterns the finance and accounting function owns, listed below.

## What to research

- Which signals about spend, invoices and revenue predict a month that misses its budget.
- Whether a 13 week cash forecast from bank and processor signals beats a trailing burn average at predicting runway 90 days out.
- Which inactivity threshold best separates seats later cancelled from seats later used again.
- Whether an agent's categorization of ledger transactions reaches an error rate a person accepts after a month of corrections.
- How many days before a due date a filing reminder must fire for the founder to finish on time, by filing type.
- Signals to watch: bank balance against forecast, new recurring card charges, invoices past due, failed customer payments, runway thresholds, tax dates within 30 days, equity grants (the 30 day clock for an 83(b) election), and revenue concentration.

Say here what matters most to you, what the researcher must never trade away, and when to stop early.

## Patterns

None yet. No record this function owns is projected from signals today, so there is no recipe to improve. When one is, add a section here named for its route pattern (as strategy's program has for `competitors/[id]/signals`), saying what the record is for, what a better recipe would do, and anything the researcher must not change.
