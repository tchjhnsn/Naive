# AGENTS.md: everything-ecosystem

The map of this repo, loaded by every agent.

## What this is

The Everything Ecosystem methodology, packaged as one private repo (EE-001). Proposed genus: a venture development framework, in the same genus as web development frameworks (EE-024). Four layers (purpose, knowledge, operations, evidence) plus governance and interface. Knowledge is the memory layer where every record is stored, and the other layers define the records they write to it; SAD is no longer part of the system (EE-036). Operations is business operations (team, hiring, handoffs); execution folded into it, and MAD, the method for building software, left to be its own product (EE-038).

## Where things are

| Path | Holds |
|---|---|
| `purpose/` | Frameworks and skills for articulating why |
| `knowledge/` | The memory layer: `kit.json`, storage `tooling/`, and two skills (`find-reference`, `industry-awareness`) |
| `operations/` | Business operations: team-design, recruiting and tool-selection skills, handoff v2, founder operating model (EE-038) |
| `evidence/` | `evals/`, design-documents registry, audit and review skills |
| `governance/` | Company vault template, roles, decision rights, pillar skills |
| `interface/` | Interfaces: the router (`router.mjs`) and the CLI, MCP server and HTTP API over it; the install skill; agent harnesses and the operator console |
| `platform/` | The platform side (EE-041): connectors that reach a vendor (GitHub so far) and, later, hosting, integrations that call outside services and the template gallery. Everything else is framework; framework code never imports from here (`node schema/check-boundary.mjs`). See `platform/README.md` |
| `site/` | Developer docs: a Nextra site on Next.js, unpublished (EE-034); see `site/AGENTS.md` |
| `docs/reference/` | Generated reference: `ROUTES.md`, every route a venture has |
| `docs/design/` | The ecosystem's own domain and systems design |

## Build and test

- `node test.mjs` runs every test and check below and reports each one; CI runs it on every pull request (`.github/workflows/test.yml`). It needs python3 with `jsonschema` for `schema/validate.py`.
- `node evidence/skills/design-coverage/check.mjs --entity <dir>` checks design coverage for an entity.
- `node schema/check-ventures.mjs <dir>`, `node schema/check-nouns.mjs`, `node schema/check-integrations.mjs` check the schema's cross-file rules.
- `node schema/check-data-model.mjs` checks the data model and kit manifests (every JSON file has a record type, every skill one kit); `--md` prints the layer relationships derived from the kits (EE-018).
- `node schema/check-ready.mjs <venture dir> <handoff id>` checks a handoff is ready before anyone executes it (EE-019); `--record --by <who>` records it.
- `node schema/check-governance.mjs <dir>` checks ownership, boards, founder agreements and exits; `node schema/payouts.mjs <venture dir> [value]` computes who gets what in a sale (EE-022).
- `node schema/check-telos.mjs <dir>` checks each venture's telos (start with the end: every phase exit criterion traces to a measure).
- `node schema/check-publication.mjs <dir>` checks each venture's publication policy and every handoff that publishes: a named channel and content rule, and a person approving (EE-025).
- `node schema/check-validation.mjs <dir> [--json]` grades each venture's validation records from their cited evidence (high to very low, adapted from GRADE). A layer may hold more kits under `<layer>/kits/` (EE-026).
- `node schema/check-execution.mjs <venture dir>` checks handoffs, evidence and decision rights; `node schema/run-handoff.mjs <venture dir> <handoff id>` runs a handoff's done-criteria and writes evidence (EE-017).
- `node interface/cli/mentura.mjs <route> <action> --venture <id>` reads, writes, checks or runs one route; `node interface/mcp/server.mjs` is the MCP server and `node interface/api/server.mjs` the local API, all over `interface/router.mjs` (EE-030). Routes follow the Next.js App Router (EE-032): `[id]` collection items, nested ventures by path, layout, view, not-found, loading and error, route groups by phase, the `system/overview` slots and team-plan robots; see `docs/reference/ROUTES.md`. `node interface/test.mjs` tests them. Records are read and written through connectors for the venture's sources (`knowledge/connectors/`, EE-037); `node knowledge/connectors/eval.mjs` runs the framework's (filesystem) and `node platform/connectors/eval.mjs` the platform's (GitHub), both against `knowledge/connectors/suite.mjs`. Every write through them appends to the venture's provenance log, `provenance.jsonl` (EE-031); `node schema/check-provenance.mjs <dir>` checks its hash chain, and `mentura baseline --venture <id>` adopts records written before the log. `node schema/need-now.mjs <venture dir>` says what a venture needs now (EE-028); `node schema/time-to-ready.mjs <venture dir>` measures time to running and ready; `node schema/check-team.mjs <dir>` checks team plans against the agent capability register (EE-029).
- `node purpose/frameworks/product-anatomy/test.mjs` tests the Product Anatomy runner's role rules.
- `node schema/test.mjs` tests the checkers on broken copies; `python3 schema/validate.py` validates every record against its schema.

## Rules

- Never read or print `.env*` files.
- Schema decisions are logged in `docs/decisions/decisions.json` and cited by id (`EE-NNN`). The schema never cites a decision from any instance.
- Torian merges. Agents open draft PRs and do not merge.

## Tooling

Every layer has `<layer>/tooling/integrations.json`: the tools and services it can use, each checked against `schema/integration.schema.json` (status in-use, candidate or rejected; interfaces such as files, MCP, API, SDK; credentials by variable name only). Agent runtimes (Claude Agent SDK, Cursor Agent SDK) are listed under `execution/tooling/`. The interface layer is narrower: an interface lets a person, with agents, work across at least three of the five other layers in one session. Agent harnesses (Claude Code, Cursor, Codex) are the default kind; the operator console is a custom one. A tool serving one or two layers (Obsidian, Linear) is an integration of those layers. `node schema/check-integrations.mjs` enforces this.

Choosing tools is opt-in: when someone wants help, `operations/skills/tool-selection/SKILL.md` gives the principles for the questions and the scoring (Jev plus a reasoning model), and each layer's `tooling/questions.md` gives its dimensions and example questions. Knowledge has one so far.

## Ventures

The ecosystem is a schema; a workspace is an instance made of ventures (EE-002, EE-011). A venture is anything a builder undertakes, at a phase from Discovery to Platform (EE-012); personal life is out of scope (EE-009). Each venture has a `venture.json` (`schema/venture.schema.json`), product cards in `products/`, account records in `accounts/` where it keeps them (EE-021), and the three pillars. Create one with `node schema/init-venture.mjs`; check a workspace with `node schema/check-ventures.mjs <dir>`. Work in a venture runs as handoffs (`execution/handoffs/`), proved by evidence (`evidence/results/`), under its decision rights (`governance/decision-rights.json`). The repo's own first venture is `instance/ventures/everything-ecosystem/`. Every record type is indexed in `schema/README.md` and listed, with its owning layer, in `schema/data-model.json`. Each layer's kit (skills, owned records, reads and writes) is in `<layer>/kit.json`; see `docs/design/LAYERS_AND_KITS_2026-10-27.md`. Design: `docs/design/VENTURES_2026-10-27.md`.

## Nouns and references

Standards first (EE-014): use an established term with its standard meaning, and coin one only when none exists. `docs/ontology.json` is canonical for nouns (`docs/ontology.md` is its readable form); `node schema/check-nouns.mjs` fails when a retired noun reappears. Each layer keeps the sources behind its defaults in `<layer>/references/references.json`; `knowledge/skills/find-reference/` fills and re-checks them.
