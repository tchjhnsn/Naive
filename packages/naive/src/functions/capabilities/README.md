# capabilities

Up: [functions](../README.md)

## What this is

The business capabilities function (APQC 13.0, Develop and Manage Business Capabilities). Its governance side is process ownership; its operations side is process improvement, knowledge management, quality. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [design-documents.registry.json](./design-documents.registry.json) | A record |
| [handoff-v2.md](./handoff-v2.md) | Handoff v2: the handoff format |
| [skills/design-coverage](./skills/design-coverage) | Skill: Check which design documents (domain, product, experience, interface, systems) exist for any project and flag gaps, using the registry in packages/naive/src/functions/cap |
| [skills/fidelity-ladder-audit](./skills/fidelity-ladder-audit) | Skill: Audit a project's component tree as a set of fidelity ladders: one domain object, many renderings ordered by how much of the object each shows: and produce the field-pr |
| [skills/find-reference](./skills/find-reference) | Skill: Find, confirm and record the source behind a reference in a layer's references/references.json: fill a missing URL from title, authors and year, re-check URLs that may ha |
| [skills/findability](./skills/findability) | Skill: Check whether an entity's documents and decisions can be found (SAD v3.0.16 §NEW.26). |
| [skills/foreshadowing-audit](./skills/foreshadowing-audit) | Skill: Run the V[N] → V[N+1] foreshadowing audit. |
| [skills/industry-awareness](./skills/industry-awareness) | Skill: Map the operator's terminology to industry-standard terminology and surface existing industry solutions BEFORE the operator reinvents the wheel. |
| [templates/glossary.md](./templates/glossary.md) | Template: package glossary |
