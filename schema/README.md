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
| Founder (workspace) | `schema/workspace-founder.schema.json`, `schema/founder-idea.schema.json`, `schema/founder-reference.schema.json`, `schema/founder-inspiration.schema.json`, `schema/founder-private.schema.json`, `schema/founders.ts` | defined | `founders/<handle>/`, above every venture: opaque id, ventures by role, profile only the founder confirms, ideas, references (CSL-JSON names), inspirations; name, puzzle and secrets in `_private/` (Torian, 2026-10-31) |
| Venture | `schema/venture.schema.json`, `schema/check-ventures.mjs` | defined | Phase, ambition, form, industry, core product, parent, owner, layers, venture profile, one-way links |
| Product (card) | `schema/product.schema.json` | defined | `products/<id>.json`: market, job, technology, offering, business model, flows |
| Account | `schema/account.schema.json` | defined | Optional. `accounts/<id>/account.json` inside the venture that serves it; relationship client, customer, user, member, partner or other (EE-021) |
| Venture folder layout | `schema/scaffold/defaults.json`, `schema/init-venture.mjs` | defined | Starting layers by phase; pillars and venture profile in every venture |
| Nouns | `docs/ontology.json`, `schema/check-nouns.mjs`, `schema/ontology-gate.ts` | defined | Standards first. Each noun names its function (a department id, or null when the word is shared) and whether it can type a handoff. A scoped noun `name@function` must be owned by that function. `node schema/check-nouns.mjs --package <file> --function <id>` prints one membership verdict; `--record` writes it to the sidecar beside the package. If the schema checker cannot run, or the operating-rules module cannot be read, the command exits 2 and records nothing |
| References | `schema/reference.schema.json`, `<layer>/references/references.json` | defined | Purpose has one so far; filled by `knowledge/skills/find-reference/` |
| Data model | `schema/data-model.json`, `schema/data-model.schema.json`, `schema/check-data-model.mjs` | defined | Every record type, its owning layer and references; no JSON file may sit outside it |
| Record generators | `schema/generators/`, `schema/generators/generate.mjs`, `schema/generators/gaps.json`, `schema/generators/generators-test.mjs` | pilots built | The script beside a schema (EE-099): it describes what to ask and drafts one record that passes the schema, and hands the draft to the write chain without storing it. A record type names its script in `generator` in the data model. Pilots so far are `glossary.mjs`, `reference.mjs` and `bug.mjs`. `check-data-model.mjs` fails a type that names no generator unless `gaps.json` lists it, and fails a listed type that has one |
| SDLC catalog | `schema/sdlc-catalog.schema.json`, `knowledge/sdlc/catalog.json`, `schema/check-sdlc-catalog.ts` | defined | What software work exists, after ISO/IEC/IEEE 12207: processes, activities and tasks with their decision classes, phase and owning role (R-26). No execution detail; MAD routes how. See `knowledge/sdlc/README.md` |
| Layer manifests | `schema/layer.schema.json`, `<layer>/layer.json`, system layer `schema/layer.json` | defined | Each layer's skills, record types it still owns, reads and writes; layer relationships are derived from them (EE-071). Venture packages are `packages/<name>/package.json` |

## Inside a venture, by layer

| Layer | Record | Where | Status |
|---|---|---|---|
| Purpose | Core product | `core` in `venture.json` | defined |
| Purpose | Telos (start with the end) | `schema/telos.schema.json` at `<venture>/purpose/telos.json`; `check-telos.mjs` (EE-023) | defined |
| System | Venture config (`naive.config.json`: the gate's rules, owners, check settings, thresholds, System 1 questions, pinned packages, acting) | `schema/naive-config.schema.json` at `<venture>/naive.config.json`; `schema/naive-config.mjs` (defaults), `schema/check-config.mjs`, the gate `schema/gate.mjs` and held drafts `schema/gate-drafts.mjs` (EE-073) | defined |
| Governance | Publication policy (the publication gate) | `schema/publication-policy.schema.json` at `<venture>/governance/publication-policy.json`; `check-publication.mjs` (EE-025) | defined |
| Purpose | Validation package: problem record, shared evidence item, GRADE-adapted grading | `schema/validation-problem.schema.json` and `schema/validation-evidence.schema.json` at `<venture>/purpose/validation/`; `check-validation.mjs`; package at `packages/validation/` (templates and skills still under `purpose/kits/validation/`, EE-026, EE-071) | problem built; six sub-scores to build |
| Purpose | Goals and vision | `purpose/frameworks/business-discovery-framework.md` | prose |
| Purpose | Product Anatomy and Succession Matrix | `purpose/frameworks/product-anatomy/` (phases, gates, questions as JSON) | defined, draft |
| Knowledge | Venture profile | the file `venture.json` names in `profile` | prose |
| Knowledge | Decision log | `schema/decision.schema.json`; the schema's own log is `docs/decisions/decisions.json` (EE-NNN) | defined |
| Operations | Handoff | `schema/handoff.schema.json` at `<venture>/operations/handoffs/<id>.json`, brief beside it; contract prose in `operations/handoff-v2.md` (execution folded into operations, EE-038); `check-ready.mjs` (definition of ready, EE-019), `run-handoff.mjs`, `check-execution.mjs`. The optional `ontology` block is the package's type, terms, touches and facts. The membership verdict is not stored on the handoff; `node schema/check-provenance.mjs --package <file>` checks the sidecar `<id>.provenance.jsonl`. A rejection's disposition is copied from the operating-rules module | defined |
| Operations | Operating rules | `schema/operating-rules.schema.json`, `operations/operating-rules.json`, `schema/operating-rules.ts`, `schema/operating-rules-test.ts` | defined | The default module of Naive's operating rules. A venture's `operating-rules.json` (at the venture root, or `meta/operating-rules.json` when the layout is structured) merges over it. The membership gate reads the retry rule. Parent-only edits, self-fix approval, gates before a design, the Jev layer, the design-diff verb set, question routing, pattern learning and standing-rule decay are declared for later pull requests. min_answers, wilson_lower_bound, decay_window and decay_floor are provisional placeholders, TBD |
| Evidence | Evals and results | `schema/eval-suite.schema.json` for `evidence/evals/*.json`; `schema/evidence.schema.json` at `<venture>/evidence/results/<id>.json` | defined |
| Evidence | Design-documents registry | `evidence/design-documents.registry.json` | self-describing, no schema |
| Governance | Decision rights | `schema/decision-rights.schema.json`; template `governance/venture-template/decision-rights.json`, a venture's own at `<venture>/governance/decision-rights.json` (tightens only); switches on when a venture is formalized | defined |
| Governance | Pillars (product, brand, business) | `governance/venture-template/pillars/`, stubs in each venture's `pillars/` | prose |
| Governance | Ownership and control: cap table, boards, founder agreement, exit | `schema/ownership.schema.json`, `board.schema.json`, `founder-agreement.schema.json`, `exit.schema.json` at `<venture>/governance/`; `check-governance.mjs`, `payouts.mjs` (EE-022) | defined |
| Governance | Roles | `governance/venture-template/roles/agent-roles.json` | shape used, no schema |
| Product | Business models | `schema/vocab/business-models.json` (St. Gallen 55 plus named extras) | defined |
| Every layer | Tool integrations | `schema/integration.schema.json`, `<layer>/tooling/integrations.json`, `check-integrations.mjs` (interfaces reach at least four layers) | defined |

## Docs next to the code

Every README in this repo, this one included, and every playbook under `packages/*/playbooks/` is checked by `schema/check-docs-claims.mjs`: the paths, commands and routes it names must exist and its relative Markdown links, inline or reference-style, must resolve (HTML `href` and `src` are not checked). A pull request that changes code here, meaning any file that is not `.md` or `.mdx` and not under a `playbooks/` folder, owes this README an update, or a line in its body that starts with `No docs change: ` and gives a real reason (`.github/workflows/docs-required.yml`). New READMEs follow `docs/readme-template.md`.

## Open reconciliations

1. **Venture profile guidance.** The profile has no guidance of its own since the SAD documents were removed (EE-036); write a short template when a venture first needs one.
2. **MAD's tiers.** EE-013 renames MAD's four layers to tiers; the MAD repo and older method documents still say layers.
3. **Decisions.** The schema keeps its own log (EE-001 to EE-017). Older documents under `operations/` still cite workspace ids.
4. **Personal references.** About twelve files still name one person or their paths. They need to be made generic or moved out.
5. **Personal system.** Out of scope (EE-009). Built separately and joined later through links.
