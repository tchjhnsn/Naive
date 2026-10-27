# Everything Ecosystem

**The AI-Native OS for Builders.** One methodology for running what a builder builds, from a hobby to a company, with AI agents, in five layers that form a loop, plus two that cut across them. It is a schema: a builder's workspace is an instance of it (EE-002). Private for now (G-035); which parts become public is decided later.

| Layer | Question | Folder | Today |
|---|---|---|---|
| Purpose | Why | `purpose/` | Discovery frameworks (BASED goals), ambition tiers |
| Knowledge (SAD) | What is known and intended | `knowledge/` | SAD v3 and amendments, references, systems, templates, skills |
| Operations (MAD) | How work is run | `operations/` | Methodology catalog, registers, research, methodology-selection; the MAD tool is in its own repo for now |
| Execution | Who or what does the work | `execution/` | Handoff v2, founder operating model |
| Evidence | Did it work | `evidence/` | Evals, design-coverage registry and checks, metrics review |
| Governance (cross-cutting) | Who may decide | `governance/` | Company vault template, roles, decision rights, pillar skills |
| Interface (cross-cutting) | How you work across the layers at once | `interface/` | Agent harnesses (Claude Code, Cursor), operator console |

`docs/design/` holds the ecosystem's own domain and systems design. Each layer has a `tooling/integrations.json` listing the tools it can plug into (Obsidian, Notion, Linear, the Claude and Cursor agent SDKs and so on), checked against `schema/integration.schema.json`. `publish.json` is the allowlist for a future public site.

The loop: Purpose is articulated into Knowledge, Operations picks how the work runs, Execution does it, and Evidence feeds back into Knowledge and Purpose.

## Vault and repo

Docs as code (EE-005): this repo holds the method, its design docs, schemas, skills and templates. Each instance keeps its own notes and decisions in its own ventures. The schema's decisions are in `docs/decisions/decisions.json`, and `schema/README.md` indexes every record type.
