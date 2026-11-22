# customer-service

Up: [functions](../README.md)

## What this is

The customer service function (APQC 6.0, Manage Customer Service). Its governance side is support policies and refunds authority; its operations side is support channels, help content, customer feedback. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The customer service agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn how the venture supports its customers |
| [workflows/case-triage.json](./workflows/case-triage.json) | Workflow: triage each new support case |
| [workflows/weekly-contact-review.json](./workflows/weekly-contact-review.json) | Workflow: review contact reasons and response times each week |
| [skills/support-triage](./skills/support-triage) | Skill: classify a contact (ISO 10002 for complaints), escalate what a person must decide, draft the reply, and count contact reasons so causes are removed |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/customer-service.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
