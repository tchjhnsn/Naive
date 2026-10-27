---
type: index
source: hybrid
created: 2026-10-27T01:15:00Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, schema, index]
description: "Index of the Everything Ecosystem schema: every record type an instance uses, where it is defined, and what is still missing. Independent of any one person's workspace."
---

# Schema index

The Everything Ecosystem is a schema, version in `VERSION`. An instance is a builder's workspace, a set of spheres: ventures and the clients inside them (EE-008, EE-009). Personal life is out of scope. This index lists every record type, so anyone can build an instance from this repo alone, without reference to an existing workspace.

Status:
- **defined**: a JSON Schema exists.
- **prose**: the shape is described only in Markdown.
- **missing**: the record type has no definition yet.

## Instance level

| Record | Where | Status | Notes |
|---|---|---|---|
| Workspace (one person's set of spheres, and which schema version it follows) | `schema/workspace.schema.json`, `schema/VERSION` | defined | Grouping folders carry no meaning |
| Sphere | `schema/sphere.schema.json`, `schema/check-spheres.mjs` | defined | Kinds (venture, client), venture stage (hobby, venture, company), legal form, parent, owner, layers, profile, one-way links |
| Sphere folder layout (what an empty sphere contains) | `schema/scaffold/defaults.json`, `schema/init-sphere.mjs` | defined | Starting layers by kind and venture stage; the three pillars for every venture |

## Inside a sphere, by layer

| Layer | Record | Where | Status |
|---|---|---|---|
| Purpose | Pillars (product, brand, business) | `governance/company-template/pillars/`, copied into each venture | prose |
| Purpose | Goals and vision | `purpose/frameworks/business-discovery-framework.md` | prose |
| Purpose | Product card and Succession Matrix | `purpose/frameworks/product-anatomy/` | defined (questions and phases as JSON), draft |
| Knowledge | Entity profile | `knowledge/references/entity-profile-schema.md` | prose; overlaps with `sphere.json` (see below) |
| Knowledge | Decision log | `schema/decision.schema.json`; the schema's own log is `docs/decisions/decisions.json` (EE-NNN) | defined |
| Operations | Methodology catalog, questions, artifact types, assignments | `operations/catalog/_schema/` | defined |
| Operations | MAD record (answers, templates, risk) | MAD repo `schema/record.schema.json` | defined, outside this repo until MAD folds in |
| Execution | Handoff | `execution/handoff-v2.md` | prose |
| Evidence | Evals | `evidence/evals/*.json` | shape used, no schema |
| Evidence | Design-documents registry | `evidence/design-documents.registry.json` | self-describing, no schema |
| Governance | Decision rights and roles | `governance/company-template/decision-rights.json` | shape used, no schema; applies from the company stage |
| Every layer | Tool integrations | `schema/integration.schema.json`, `<layer>/tooling/integrations.json` | defined |

## Open reconciliations

1. **Entity versus sphere.** Decided (EE-008): the sphere is the unit, `sphere.json` holds the machine fields and the profile is its human-readable companion. Still to do: fold the entity profile schema's `entity-class` into sphere kind and stage. Products and systems inside a venture are product cards, not spheres.
2. **Company template versus venture sphere.** Decided (EE-010): the template is the venture template; the pillars go into every venture, governance from the company stage.
3. **Decisions this schema rests on.** Done: the schema keeps its own log (EE-001 to EE-010), and the schema files cite only those. Older method documents under `knowledge/method/` and `operations/` still cite workspace ids.
4. **Personal references.** Twelve files still name one person or their paths. They need to be made generic or moved out.
5. **Personal system.** Out of scope (EE-009). It will be built separately and joined later through links.
