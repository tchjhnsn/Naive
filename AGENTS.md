# AGENTS.md: everything-ecosystem

The map of this repo, loaded by every agent.

## What this is

The Everything Ecosystem methodology, packaged as one private repo (G-035). Five layers (purpose, knowledge, operations, execution, evidence) plus governance and interface. SAD is the knowledge layer; MAD is the operations layer. Vault: `Torian/everything-ecosystem/`.

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
- Governing decisions are cited by id (`G-NNN` workspace, `D-NNN` Polity).
- Torian merges. Agents open draft PRs and do not merge.

## Tooling

Every layer has `<layer>/tooling/integrations.json`: the tools and services it can use, each checked against `schema/integration.schema.json` (status in-use, candidate or rejected; interfaces such as files, MCP, API, SDK; credentials by variable name only). Agent runtimes (Claude Agent SDK, Cursor Agent SDK) are listed under `execution/tooling/`.
