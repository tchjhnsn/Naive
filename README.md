# Everything Ecosystem

An agent-native operating model: one methodology for running a person's or a company's work with AI agents, in five layers that form a loop, plus two that cut across them. Private for now (G-035); which parts become public is decided later.

| Layer | Question | Folder | Today |
|---|---|---|---|
| Purpose | Why | `purpose/` | Discovery frameworks (BASED goals), ambition tiers |
| Knowledge (SAD) | What is known and intended | `knowledge/` | SAD v3 and amendments, references, systems, templates, skills |
| Operations (MAD) | How work is run | `operations/` | Methodology catalog, registers, research, methodology-selection; the MAD tool is in its own repo for now |
| Execution | Who or what does the work | `execution/` | Handoff v2, founder operating model |
| Evidence | Did it work | `evidence/` | Evals, design-coverage registry and checks, metrics review |
| Governance (cross-cutting) | Who may decide | `governance/` | Company vault template, roles, decision rights, pillar skills |
| Interface (cross-cutting) | How you see it | `interface/` | Operator console |

`docs/design/` holds the ecosystem's own domain and systems design. Each layer has a `tooling/integrations.json` listing the tools it can plug into (Obsidian, Notion, Linear, the Claude and Cursor agent SDKs and so on), checked against `schema/integration.schema.json`. `publish.json` is the allowlist for a future public site.

The loop: Purpose is articulated into Knowledge, Operations picks how the work runs, Execution does it, and Evidence feeds back into Knowledge and Purpose.

## Vault and repo

Docs as code (G-020): this repo holds the method, its design docs, schemas, skills and templates. The vault holds philosophy, guiding principles, business documents and ideas: `vault/Torian/everything-ecosystem/` (the entity, its philosophy and ideas), `vault/sad/` and `vault/mad/` (principles and pointers).
