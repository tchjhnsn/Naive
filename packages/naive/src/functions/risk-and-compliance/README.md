# risk-and-compliance

Up: [functions](../README.md)

## What this is

The legal, risk and compliance function (APQC 11.0, Manage Enterprise Risk, Compliance, Remediation, and Resiliency). Its governance side is policies, the risk register, contract approval; its operations side is filings, contract work, privacy requests. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The function's manifest: purpose, intake workflow, measures and capability clusters |
| [agent.md](./agent.md) | The risk and compliance agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's legal duties and risks |
| [workflows/weekly-compliance-check.json](./workflows/weekly-compliance-check.json) | Workflow: check the compliance calendar each week |
| [workflows/quarterly-risk-review.json](./workflows/quarterly-risk-review.json) | Workflow: review the risk register each quarter |
| [skills/compliance-calendar](./skills/compliance-calendar) | Skill: keep the obligations register (`legal/obligations/[id]`), raise each duty in time and record its evidence |
| [skills/risk-register](./skills/risk-register) | Skill: keep the risk register (`legal/risks/[id]`) short, owned and ranked by expected loss |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/risk-and-compliance.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
