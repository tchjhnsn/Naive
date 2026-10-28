# Everything Ecosystem

**An AI-native venture development framework for builders.** One methodology for developing what a builder builds, from a hobby to a company, with AI agents, in four layers that form a loop, plus two that cut across them. It is a schema: a builder's workspace is an instance of it (EE-002). Private for now (G-035); which parts become public is decided later.

| Layer | Question | Folder | Today |
|---|---|---|---|
| Purpose | Why | `purpose/` | Discovery frameworks (BASED goals), ambition tiers |
| Knowledge | Memory: where every record is stored; the other layers define what they write here (EE-036) | `knowledge/` | storage tooling, the find-reference and industry-awareness skills |
| Operations | How the business runs: team, hiring, handoffs of work to people and agents (EE-038) | `operations/` | Team design, recruiting and tool-selection skills; handoff v2; founder operating model. MAD, the method for building software, is a separate product |
| Evidence | Did it work | `evidence/` | Evals, design-coverage registry and checks, metrics review |
| Governance (cross-cutting) | Who may decide | `governance/` | Company vault template, roles, decision rights, pillar skills |
| Interface (cross-cutting) | How you work across the layers at once | `interface/` | Agent harnesses (Claude Code, Cursor), operator console |

`docs/design/` holds the ecosystem's own domain and systems design. Each layer has a `tooling/integrations.json` listing the tools it can plug into (Obsidian, Notion, Linear, the Claude and Cursor agent SDKs and so on), checked against `schema/integration.schema.json`. 
The loop: Purpose is articulated into Knowledge, Operations hands the work to people and agents, and Evidence feeds back into Knowledge and Purpose.

## What kind of thing it is

A **venture development framework** (proposed genus, EE-024), in the same genus as web development frameworks. A web framework gives a developer conventions, a project structure, generators, a test runner and plug-in packages, and calls the developer's code. This one gives a builder the same for a venture:

| Web development framework | Everything Ecosystem |
|---|---|
| Conventions over configuration | One opinionated default per choice, each with references (EE-014) |
| Project structure | Workspace, venture folders, six layers, record types (`schema/data-model.json`) |
| Generator (`rails new`) | `node schema/init-venture.mjs` |
| Test suite | `node test.mjs`: every check, run in CI |
| Packages and plug-ins | Kits, by layer (`<layer>/kit.json`) |
| Inversion of control | The framework's checks and runners call on the venture's records |

It replaces the earlier description "AI-Native OS for Builders": an operating system or operating model describes how one organization runs, while a framework is reused by many builders to build their own.

## Framework and platform

Mentura has two sides, the way Next.js and Vercel do (EE-041). The framework is the conventions: it works offline, with no account, and names no vendor. The platform hosts, connects and integrates: connectors that reach a vendor, integrations that call outside services, hosting and a template gallery. Both live in this repository. The platform is in `platform/`, and framework code never imports from it (`node schema/check-boundary.mjs`). See `platform/README.md`.

## Vault and repo

Docs as code (EE-005): this repo holds the method, its design docs, schemas, skills and templates. Each instance keeps its own notes and decisions in its own ventures. The schema's decisions are in `docs/decisions/decisions.json`, and `schema/README.md` indexes every record type.
