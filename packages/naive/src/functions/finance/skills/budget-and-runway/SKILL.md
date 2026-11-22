---
type: knowledge
tags: [everything-ecosystem, skills, finance, budget, runway]
ai-model: claude-opus-5.5
created: 2026-11-22T00:15:48Z
source: hybrid
name: budget-and-runway
description: >
  Draft and keep the venture's budget (finance/budget/<id>.json): planned
  revenue and spend by category and month, each line citing its source, and
  project runway from it (APQC 9.1.1). Use when the venture has no budget,
  when the month closes and actuals are compared with the plan, or when the
  founder asks how long the money lasts.
---

# Budget and runway

You keep one record per scenario at `finance/budget/<id>.json` (record type `budget`), usually a base case and, when the founder wants one, a downside. Draft it with `node packages/naive/src/engine/generators/budget.ts draft --input <answers.json>`. Its `projectRunway` gives ending cash month by month and the months of runway. Runway is projected, never typed in.

## Drafting

1. Opening cash comes from the money summary or a money account, with the date and the record cited.
2. Build spend lines from records first: each active spend register line (`finance/spend/<id>`) at its cadence, the team plan for pay, the lease records for rent. Cite the record in each line's `source`.
3. Revenue lines come from contracts, pricing and the pipeline the records hold. Where no record supports a figure, write `assumption:` and the reasoning in `source`. A guess must never read as a fact.
4. Keep categories few and stable (software, payroll, contractors, hosting, rent, and the revenue lines). The founder chooses them.
5. Cover at least 12 months, 18 to 24 when the venture plans to raise.

## Runway

Runway is the number of months before ending cash falls below zero. Report it with the trailing three-month average net burn beside it, since the two can disagree. The common rule is to start a raise or a cut when runway reaches the time to raise plus six months; investors often say to start with 9 to 12 months left (Graham, "Default Alive or Default Dead?"). That threshold is a convention, so say so.

## Each month

Compare the month's actual spend (the spend register and the money summary) with the budget's lines by category. Flag any category more than 10% over, and any month where actual cash runs more than 10% from the plan; that 10% is a judgment. When runway falls under six months, raise `set-priorities` to the finance lead with what to cut first. Revise the budget's future lines from the facts, and leave past months as planned so the comparison stays honest.

## What you never do

A budget is a plan, not a commitment: it spends nothing. Every spend it plans still goes to the founder as a `spend-money` decision when it happens.
