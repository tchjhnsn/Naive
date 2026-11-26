# capabilities

Up: [functions](../README.md)

## What this is

The business capabilities function (APQC 13.0, Develop and Manage Business Capabilities). Its governance side is process ownership; its operations side is process improvement, knowledge management, quality. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The capabilities agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn how the venture works. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/postmortem.json](./workflows/postmortem.json) | Workflow: write a postmortem when work fails |
| [workflows/weekly-process-review.json](./workflows/weekly-process-review.json) | Workflow: review process health each week |
| [design-documents.registry.json](./design-documents.registry.json) | A record |
| [handoff-v2.md](./handoff-v2.md) | Handoff v2: the handoff format |
| [skills/design-coverage](./skills/design-coverage) | Skill: Check which design documents (domain, product, experience, interface, systems) exist for any project and flag gaps, using the registry in packages/naive/src/functions/cap |
| [skills/fidelity-ladder-audit](./skills/fidelity-ladder-audit) | Skill: Audit a project's component tree as a set of fidelity ladders: one domain object, many renderings ordered by how much of the object each shows: and produce the field-pr |
| [skills/find-reference](./skills/find-reference) | Skill: Find, confirm and record the source behind a reference in a layer's references/references.json: fill a missing URL from title, authors and year, re-check URLs that may ha |
| [skills/findability](./skills/findability) | Skill: Check whether an entity's documents and decisions can be found (SAD v3.0.16 §NEW.26). |
| [skills/foreshadowing-audit](./skills/foreshadowing-audit) | Skill: Run the V[N] → V[N+1] foreshadowing audit. |
| [skills/industry-awareness](./skills/industry-awareness) | Skill: Map the operator's terminology to industry-standard terminology and surface existing industry solutions BEFORE the operator reinvents the wheel. |
| [skills/postmortem](./skills/postmortem) | Skill: Draft a blameless postmortem when a trigger set in advance fires: timeline, contributing causes as process conditions, corrective and preventive actions with owners, and lessons |
| [skills/working-procedure](./skills/working-procedure) | Skill: Turn recurring work into a process record: one owner, SIPOC, steps with control points, and cycle time, rework rate and first-pass yield |
| [templates/glossary.md](./templates/glossary.md) | Template: package glossary |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/capabilities.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
