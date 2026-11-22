# it

Up: [functions](../README.md)

## What this is

The information technology function (APQC 8.0, Manage Information Technology (IT)). Its governance side is tool approval (scored by Jev, EE-042); its operations side is accounts, integrations, devices and access. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The IT agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's systems and access |
| [workflows/quarterly-access-review.json](./workflows/quarterly-access-review.json) | Workflow: review access and tools each quarter |
| [skills/access-review](./skills/access-review) | Skill: keep each person's and agent role's access to the least the work needs: MFA, scoped credentials, leavers, rotation and restore tests (CIS Controls v8.1 IG1, OWASP LLM06) |
| [capability-clusters.json](./capability-clusters.json) | The capability cluster catalog (lead agents build plan item 7): the whole-venture monorepo thesis's six clusters, the functions that depend on each and the gap kinds that justify an outside tool. It names no vendor; a venture's connection record (`it/connections/<id>.json`, `packages/naive/src/records/connection.schema.json`) names its own system. Checked by `packages/naive/src/checks/check-connections.ts` |
| [skills/tool-selection](./skills/tool-selection) | Skill: Help someone choose the tools for a layer (knowledge, operations, execution, evidence, governance, interface, purpose) by offering situation questions, only when they wan |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/it.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
