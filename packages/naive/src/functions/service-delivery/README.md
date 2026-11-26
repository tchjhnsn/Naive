# service-delivery

Up: [functions](../README.md)

## What this is

The service delivery function (APQC 5.0, Deliver Services). Its governance side is service standards; its operations side is delivery runbooks and engagements. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The service delivery agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's services and engagements. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/weekly-engagement-review.json](./workflows/weekly-engagement-review.json) | Workflow: review every engagement each week |
| [skills/engagement-delivery](./skills/engagement-delivery) | Skill: run a client engagement from statement of work to close: acceptance criteria, change requests, margin and capacity, close review and productizing |
| [checklists/vault-and-tooling-consultancy-setup.md](./checklists/vault-and-tooling-consultancy-setup.md) | Vault + Tooling Consultancy Setup Checklist |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/service-delivery.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
