# AGENTS.md: everything-ecosystem

The map of this repo, loaded by every agent.

## What this is

The Everything Ecosystem methodology, packaged as one private repo (EE-001). Five layers (purpose, knowledge, operations, execution, evidence) plus governance and interface. SAD is the knowledge layer; MAD is the operations layer.

## Where things are

| Path | Holds |
|---|---|
| `purpose/` | Frameworks and skills for articulating why |
| `knowledge/` | SAD: `method/SAD_SKILL_v3.md` and amendments, `references/`, `systems/`, `templates/`, `skills/` |
| `operations/` | MAD concepts: `catalog/`, `methodology/`, `register/`, `research/`, `skills/methodology-selection/` |
| `execution/` | Handoff v2, founder operating model |
| `evidence/` | `evals/`, design-documents registry, audit and review skills |
| `governance/` | Company vault template, roles, decision rights, pillar skills |
| `interface/` | Operator console |
| `docs/design/` | The ecosystem's own domain and systems design |

## Build and test

- `node operations/skills/methodology-selection/ee.mjs validate` checks the methodology catalog.
- `node evidence/skills/design-coverage/check.mjs --entity <dir>` checks design coverage for an entity.

## Rules

- Never read or print `.env*` files.
- Schema decisions are logged in `docs/decisions/decisions.json` and cited by id (`EE-NNN`). The schema never cites a decision from any instance.
- Torian merges. Agents open draft PRs and do not merge.

## Tooling

Every layer has `<layer>/tooling/integrations.json`: the tools and services it can use, each checked against `schema/integration.schema.json` (status in-use, candidate or rejected; interfaces such as files, MCP, API, SDK; credentials by variable name only). Agent runtimes (Claude Agent SDK, Cursor Agent SDK) are listed under `execution/tooling/`.

Choosing tools is opt-in: when someone wants help, `operations/skills/tool-selection/SKILL.md` gives the principles for the questions and the scoring (Jev plus a reasoning model), and each layer's `tooling/questions.md` gives its dimensions and example questions. Knowledge has one so far.

## Spheres

The ecosystem is a schema; a workspace is an instance made of spheres (EE-002, EE-004, EE-008 to EE-010). A sphere is a venture (hobby, venture or company stage) or a client inside one; personal life is out of scope. Each has a `sphere.json` checked by `schema/sphere.schema.json` and `node schema/check-spheres.mjs <dir>`; create one with `node schema/init-sphere.mjs`, which also gives every venture the three pillars. Every record type is indexed in `schema/README.md`. Design: `docs/design/SPHERES_2026-10-27.md`.
