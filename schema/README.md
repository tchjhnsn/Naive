---
type: index
source: hybrid
created: 2026-10-27T01:15:00Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, schema, index]
description: "Index of the Everything Ecosystem schema: every record type an instance uses, where it is defined, and what is still missing. Independent of any one builder's workspace."
---

# Schema index

The Everything Ecosystem is a schema, version in `VERSION`. An instance is a builder's workspace: a set of ventures, each with its product cards and, where it keeps them, account records (EE-011, EE-021). Personal life is out of scope (EE-009). This index lists every record type, so anyone can build an instance from this repo alone. Its machine form is `schema/data-model.json` (EE-018): every record type, its owning layer, schema, paths and references, checked by `schema/check-data-model.mjs`. There is no single master schema; the data model is the map of all of them. Nouns follow `docs/ontology.md` (EE-014).

Status:
- **defined**: a JSON Schema exists.
- **prose**: the shape is described only in Markdown.
- **missing**: the record type has no definition yet.

## Instance level

| Record | Where | Status | Notes |
|---|---|---|---|
| Workspace | `schema/workspace.schema.json`, `schema/VERSION` | defined | Grouping folders carry no meaning. Always a vault; a code folder of repositories once a venture builds software (EE-020) |
| Venture | `schema/venture.schema.json`, `schema/check-ventures.mjs` | defined | Phase, ambition, form, industry, core product, parent, owner, layers, venture profile, one-way links |
| Product (card) | `schema/product.schema.json` | defined | `products/<id>.json`: market, job, technology, offering, business model, flows |
| Account | `schema/account.schema.json` | defined | Optional. `accounts/<id>/account.json` inside the venture that serves it; relationship client, customer, user, member, partner or other (EE-021) |
| Venture folder layout | `schema/scaffold/defaults.json`, `schema/init-venture.mjs` | defined | Starting layers by phase; pillars and venture profile in every venture |
| Nouns | `docs/ontology.json`, `schema/check-nouns.mjs` | defined | Standards first; retired nouns fail the check |
| References | `schema/reference.schema.json`, `<layer>/references/references.json` | defined | Purpose has one so far; filled by `knowledge/skills/find-reference/` |
| Data model | `schema/data-model.json`, `schema/data-model.schema.json`, `schema/check-data-model.mjs` | defined | Every record type, its owning layer and references; no JSON file may sit outside it |
| Kit manifests | `schema/kit.schema.json`, `<layer>/kit.json`, system kit `schema/kit.json` | defined | Each layer's skills, owned record types, reads and writes; layer relationships are derived from them |

## Inside a venture, by layer

| Layer | Record | Where | Status |
|---|---|---|---|
| Purpose | Core product | `core` in `venture.json` | defined |
| Purpose | Telos (start with the end) | `schema/telos.schema.json` at `<venture>/purpose/telos.json`; `check-telos.mjs` (EE-023) | defined |
| Purpose | Goals and vision | `purpose/frameworks/business-discovery-framework.md` | prose |
| Purpose | Product Anatomy and Succession Matrix | `purpose/frameworks/product-anatomy/` (phases, gates, questions as JSON) | defined, draft |
| Knowledge | Venture profile | the file `venture.json` names in `profile`; older guidance in `knowledge/references/entity-profile-schema.md` (retired name, to be folded in) | prose |
| Knowledge | Decision log | `schema/decision.schema.json`; the schema's own log is `docs/decisions/decisions.json` (EE-NNN) | defined |
| Operations | Methodology catalog, questions, artifact types, assignments | `operations/catalog/_schema/` | defined |
| Operations | MAD record (answers per tier, templates, risk) | MAD repo `schema/record.schema.json` | defined, outside this repo until MAD folds in |
| Execution | Handoff | `schema/handoff.schema.json` at `<venture>/execution/handoffs/<id>.json`, brief beside it; contract prose in `execution/handoff-v2.md`; `check-ready.mjs` (definition of ready, EE-019), `run-handoff.mjs`, `check-execution.mjs` | defined |
| Evidence | Evals and results | `schema/eval-suite.schema.json` for `evidence/evals/*.json`; `schema/evidence.schema.json` at `<venture>/evidence/results/<id>.json` | defined |
| Evidence | Design-documents registry | `evidence/design-documents.registry.json` | self-describing, no schema |
| Governance | Decision rights | `schema/decision-rights.schema.json`; template `governance/venture-template/decision-rights.json`, a venture's own at `<venture>/governance/decision-rights.json` (tightens only); switches on when a venture is formalized | defined |
| Governance | Pillars (product, brand, business) | `governance/venture-template/pillars/`, stubs in each venture's `pillars/` | prose |
| Governance | Ownership and control: cap table, boards, founder agreement, exit | `schema/ownership.schema.json`, `board.schema.json`, `founder-agreement.schema.json`, `exit.schema.json` at `<venture>/governance/`; `check-governance.mjs`, `payouts.mjs` (EE-022) | defined |
| Governance | Roles | `governance/venture-template/roles/agent-roles.json` | shape used, no schema |
| Product | Business models | `schema/vocab/business-models.json` (St. Gallen 55 plus named extras) | defined |
| Every layer | Tool integrations | `schema/integration.schema.json`, `<layer>/tooling/integrations.json`, `check-integrations.mjs` (interfaces reach at least four layers) | defined |

## Open reconciliations

1. **Venture profile guidance.** Fold `knowledge/references/entity-profile-schema.md` (retired name) into the venture profile, mapping its `entity-class` onto phase, ambition and legal form.
2. **MAD's tiers.** EE-013 renames MAD's four layers to tiers; the MAD repo and older method documents still say layers.
3. **Decisions.** The schema keeps its own log (EE-001 to EE-017). Older method documents under `knowledge/method/` and `operations/` still cite workspace ids.
4. **Personal references.** About twelve files still name one person or their paths. They need to be made generic or moved out.
5. **Personal system.** Out of scope (EE-009). Built separately and joined later through links.
