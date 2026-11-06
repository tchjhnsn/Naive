# Naive

This is Naive's own repository (EE-118), split out of tchjhnsn/everything-ecosystem with its history on 2026-11-05. The text below still uses the ecosystem's older names in places; it is rewritten in step 10 of the layout plan.

**An AI-native venture development framework for builders.** One methodology for developing what a builder builds, from a hobby to a company, with AI agents, in four layers that form a loop, plus two that cut across them. It is a schema: a builder's workspace is an instance of it (EE-002). Private for now (G-035); which parts become public is decided later.

| Layer | Question | Folder | Today |
|---|---|---|---|
| Purpose | Why | `purpose/` | Discovery frameworks (BASED goals), ambition tiers |
| Knowledge | Memory: where every record is stored; the other layers define what they write here (EE-036) | `knowledge/` | storage tooling, the find-reference and industry-awareness skills |
| Operations | How the business runs: team, hiring, handoffs of work to people and agents (EE-038), by department (EE-047) | `operations/` | Department catalog (APQC and the value chain), imported only when needed (EE-048); team design, recruiting and tool-selection skills; handoff v2; founder operating model. MAD, the method for building software, is a separate product |
| Evidence | Did it work | `evidence/` | Evals, design-coverage registry and checks, metrics review |
| Governance (cross-cutting) | Who may decide | `governance/` | Company vault template, roles, decision rights, pillar skills |
| Interface (cross-cutting) | How you work across the layers at once | `interface/` | Agent harnesses (Claude Code, Cursor), operator console |

`docs/design/` holds the ecosystem's own domain and systems design. Each layer has a `tooling/integrations.json` listing the tools it can plug into (Obsidian, Notion, Linear, the Claude and Cursor agent SDKs and so on), checked against `packages/naive/src/records/integration.schema.json`. 
The loop: Purpose is articulated into Knowledge, Operations hands the work to people and agents, and Evidence feeds back into Knowledge and Purpose.

## What Naive is, and who it is for

**A venture's scaffolding is a central data management structure** (EE-085). Everything a venture knows sits in one place, under one set of conventions: its foundation, products, customers, people, money, decisions and evidence, with pointers to the systems that keep the rest (the code repository, the bank, the payments account). The records live in the venture; anything they point to stays in its own system of record, and `sources.json` says where.

**Naive is built for solo founders and small founding teams.** Two reasons:

- **The silos are gone.** Software as a service has become a commodity, so much of what a company would once have kept in separate tools (a CRM, a wiki, a finance app, a project tracker) can now live in one central structure. For one founder, or a few, that is simpler to keep true than a dozen tools, and nothing is lost between them.
- **Agents work better with the whole picture.** An agent that can read the venture's foundation, people, money and decisions in one place has better context, reasons better about each decision, and moves faster. Central data is what makes a venture AI-native rather than AI-assisted.

**Naive is not a software engineering framework.** How software gets built is MAD's job (EE-038). Naive is lightly opinionated about code: it leans toward a monorepo for most software, and otherwise only asks that the code be connected, with a pointer between the knowledge base and the code base. It is opinionated about file conventions: what each record is, where it routes, and how the knowledge base points at the code.

## What kind of thing it is

A **venture development framework** (proposed genus, EE-024), in the same genus as web development frameworks. A web framework gives a developer conventions, a project structure, generators, a test runner and plug-in packages, and calls the developer's code. This one gives a builder the same for a venture:

| Web development framework | Everything Ecosystem |
|---|---|
| Conventions over configuration | One opinionated default per choice, each with references (EE-014) |
| Project structure | Workspace, venture folders, six layers, record types (`packages/naive/src/records/data-model.json`) |
| Generator (`rails new`) | `node packages/naive/src/engine/init-venture.mjs` |
| Test suite | `node test.mjs`: every check, run in CI |
| Packages and plug-ins | Venture packages (`packages/naive/library/packages/<name>/package.json`); a kit is Mentura's enhanced package, kept in Mentura and found through `NAIVE_KITS` (EE-071) |
| Inversion of control | The framework's checks and runners call on the venture's records |

It replaces the earlier description "AI-Native OS for Builders": an operating system or operating model describes how one organization runs, while a framework is reused by many builders to build their own.

## Framework and platform

The system has two sides, the way Next.js and Vercel do (EE-041): the framework is **Naive** and the platform is **Mentura** (EE-043). The framework is the conventions: it works offline, with no account, and names no vendor. The platform hosts, connects and integrates: connectors that reach a vendor, integrations that call outside services, hosting and a template gallery. Mentura lives in another repository (everything-ecosystem) and depends on Naive by version (EE-118). Naive never names a Mentura module: Mentura hands in its tools by configuration (`NAIVE_JUDGE_CMD`, `NAIVE_KITS`, `NAIVE_PLATFORM_ADAPTER`, `registerConnector`), and `node packages/naive/src/checks/check-boundary.mjs` fails on code that names one.

## The Claude Code plugin

This repository, and so the naive-framework npm package, is Naive's Claude Code plugin (EE-084): `.claude-plugin/plugin.json` brings the `naive-create` and `naive-setup` skills and the MCP server. Add it from the public marketplace:

```text
/plugin marketplace add tchjhnsn/naive-plugins
/plugin install naive@naive
```

From a clone, add it by path instead: `/plugin marketplace add /path/to/naive`, which uses `.claude-plugin/marketplace.json` here. `node packages/naive/src/interfaces/plugin-test.mjs` tests the plugin.

## Vault and repo

Docs as code (EE-005): this repo holds the method, its design docs, schemas, skills and templates. Each instance keeps its own notes and decisions in its own ventures. The schema's decisions are in `docs/decisions/decisions.json`, and `packages/naive/src/engine/README.md` indexes every record type.
