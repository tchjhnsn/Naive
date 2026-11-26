# finance

Up: [functions](../README.md)

## What this is

The finance and accounting function (APQC 9.0, Manage Financial Resources). Its governance side is spending authority, controls and audit; its operations side is books, invoices, budgets and tax. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The finance agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's money. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/monthly-spend-review.json](./workflows/monthly-spend-review.json) | Workflow: review spend against the budget and runway each month |
| [skills/budget-and-runway](./skills/budget-and-runway) | Skill: draft and keep the budget (`finance/budget/[id]`), each line citing its source, and project runway from it |
| [skills/equity-and-share-classes](./skills/equity-and-share-classes) | Skill: Help a founder decide how ownership is counted and which share types to have, and when: common, preferred, super-voting (dual-class), non-voting, LLC units, the employee  |
| [skills/exit-planning](./skills/exit-planning) | Skill: Help a founder decide which ways the venture might end it should keep open (acquisition, IPO, secondary sales, merger, management buyout, wind-down, or hold) and see what |
| [skills/financing-and-investor-rights](./skills/financing-and-investor-rights) | Skill: Help a founder decide whether and how to take outside money and what rights investors get in return: bootstrapping, grants, debt, SAFEs, convertible notes and priced roun |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/finance.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
