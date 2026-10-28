# Everything Ecosystem

**An AI-native venture development framework for builders.** One methodology for developing what a builder builds, from a hobby to a company, with AI agents, in five layers that form a loop, plus two that cut across them. It is a schema: a builder's workspace is an instance of it (EE-002). Private for now (G-035); which parts become public is decided later.

| Layer | Question | Folder | Today |
|---|---|---|---|
| Purpose | Why | `purpose/` | Discovery frameworks (BASED goals), ambition tiers |
| Knowledge | Memory: where every record is stored; the other layers define what they write here (EE-036) | `knowledge/` | storage tooling, the find-reference and industry-awareness skills |
| Operations (MAD) | How work is run | `operations/` | Methodology catalog, registers, research, methodology-selection; the MAD tool is in its own repo for now |
| Execution | Who or what does the work | `execution/` | Handoff v2, founder operating model |
| Evidence | Did it work | `evidence/` | Evals, design-coverage registry and checks, metrics review |
| Governance (cross-cutting) | Who may decide | `governance/` | Company vault template, roles, decision rights, pillar skills |
| Interface (cross-cutting) | How you work across the layers at once | `interface/` | Agent harnesses (Claude Code, Cursor), operator console |

`docs/design/` holds the ecosystem's own domain and systems design. Each layer has a `tooling/integrations.json` listing the tools it can plug into (Obsidian, Notion, Linear, the Claude and Cursor agent SDKs and so on), checked against `schema/integration.schema.json`. `publish.json` is the allowlist for a future public site.

The loop: Purpose is articulated into Knowledge, Operations picks how the work runs, Execution does it, and Evidence feeds back into Knowledge and Purpose.

## What kind of thing it is

A **venture development framework** (proposed genus, EE-024), in the same genus as web development frameworks. A web framework gives a developer conventions, a project structure, generators, a test runner and plug-in packages, and calls the developer's code. This one gives a builder the same for a venture:

| Web development framework | Everything Ecosystem |
|---|---|
| Conventions over configuration | One opinionated default per choice, each with references (EE-014) |
| Project structure | Workspace, venture folders, seven layers, record types (`schema/data-model.json`) |
| Generator (`rails new`) | `node schema/init-venture.mjs` |
| Test suite | `node test.mjs`: every check, run in CI |
| Packages and plug-ins | Kits, by layer and by operations tier (`<layer>/kit.json`) |
| Inversion of control | The framework's checks and runners call on the venture's records |

It replaces the earlier description "AI-Native OS for Builders": an operating system or operating model describes how one organization runs, while a framework is reused by many builders to build their own.

## Vault and repo

Docs as code (EE-005): this repo holds the method, its design docs, schemas, skills and templates. Each instance keeps its own notes and decisions in its own ventures. The schema's decisions are in `docs/decisions/decisions.json`, and `schema/README.md` indexes every record type.
