---
type: methodology
source: hybrid
created: 2026-10-09
ai-model: claude-opus-5.5
spec-layer: methodology
scope: global
scope-entity: "[[everything-ecosystem]]"
canonical-for: "domain-design-and-systems-design"
authority: constitutional
decision-status: in-force
status: ACTIVE
adopted: 2026-10-09
last-reviewed: 2026-10-25
governed-by:
  - "[[SAD_SKILL_v3]]"
related:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-10-25_design-schema-across-file-systems]]"
  - "[[ASSET_REQUIREMENTS_METHOD]]"
  - "[[CANONICAL_ASSET_REGISTRY]]"
  - "[[skills/design-coverage/SKILL|design-coverage]]"
  - "[[../../operations/skills/contract-first/SKILL|contract-first]]"
tags: [methodology, sad-v3, domain-design, systems-design, registry, typesafe, design-coverage]
description: "Defines domain design and systems design, how they relate, when systems design starts, the stages and document families of each, where each layer lives across the vault and the code repo, and how a machine-readable registry (design-documents.registry.json) plus a TypeSafe checker (design-coverage) determine which documents exist for any scope. Extends the Asset Requirements Method; questions informed by the Fanout system design curriculum."
---

# Domain design and systems design

> **Canonical for:** what these two terms mean in this vault, when each happens, which documents each produces, which questions each document must answer, and how we check coverage.
> **Machine-readable companion:** [`design-documents.registry.json`](design-documents.registry.json) (56 documents, 237 questions, registry v1.2.0).
> **Where the files live:** §4a. Registry IDs are not folders.
> **Checker:** [[skills/design-coverage/SKILL|design-coverage]] (TypeSafe).

## 1. Definitions

**Domain design** is designing **what the system means**: the actors, concepts, rules, invariants, lifecycles and policies of the problem it serves, independent of any technology. It answers *what is true, what is allowed, what must never happen*. Its documents are `DD-*`.

**Systems design** is designing **how a running system implements the domain under real constraints**: requirements and measurable promises, components and their boundaries, data storage, interfaces, behaviour under concurrency and failure, identity and security, operations, testing and cost. It answers *what runs where, how it talks, how it stays correct and available, and what it costs*. Its documents are `SD-*`.

**When the owner says "domain design"**, produce or review `DD-*` documents for the named scope. **When the owner says "systems design"**, first check the scope's domain readiness (§3), then produce or review `SD-*` documents for the named scope and phase, starting from the registry's questions. In either case, say which layer the work is in and how it relates to the other.

## 2. How they relate

```
Domain design (DD)                          Systems design (SD)
─────────────────────                       ──────────────────────────────
D1 Frame     goals, actors, operations  ──► S1 Requirements  brief, NFRs, capacity, cost
D2 Model     language, model, rules,    ──► S2 Architecture  context, containers, components
             lifecycles, policies       ──► S3 Data          logical and physical data model
D3 Vary      variation points           ──► S4 Interfaces    contracts, ingestion
D4 Prove     examples, acceptance tests ──► S5 Behaviour     concurrency, async, read path
D5 Ratify    binding decisions          ──► S6 Trust         identity, threats, privacy enforcement
                                            S7 Operations    reliability, observability, deployment, tenancy
                                            S8 Plan          testing, ADRs, traceability, build slices
```

1. **Domain comes first and constrains the system.** Every system choice must preserve the domain's invariants and be traceable to a domain concept (SD-22).
2. **The system may reveal domain gaps.** Fix them by amending the domain documents, never by working around them in code.
3. **The conceptual model is not the schema.** DD-04 says what things exist and how they relate; SD-07 decides tables, keys, indexes and history.
4. **Policies cross the line in two halves.** A domain policy says *what* must hold (DD-07: every fact carries provenance; records are retained by schedule). Systems design says *how* it's enforced (SD-15: where data lives, how retention and deletion run).
5. **Product, brand and business are separate pillars.** Their assets stay in the [[CANONICAL_ASSET_REGISTRY]]; this method covers the design layers of the product pillar only.

## 3. When systems design starts

Start a systems-design package for a scope when **both** hold:

1. **The domain core is ready:** DD-04 (model), DD-05 (rules) and DD-06 (lifecycles) exist, and DD-10 (acceptance test on real data) or DD-11 (ratification) shows they hold up.
2. **The next phase's outcome requires running software.**

Then write:

| Phase | Systems-design depth |
|---|---|
| **The next phase to be built** | **Full package:** every applicable `SD-*` document |
| The phase after | **Outline:** SD-04 (context), SD-05 (containers), SD-21 (ADRs for hard-to-reverse choices) |
| Later phases | Nothing beyond roadmap entries |

**Exception:** a domain decision with irreversible system consequences (for example, an append-only act log) is recorded as an ADR (SD-21) during domain design.

**Anti-patterns:** designing systems for all phases at once (it goes stale and misses lessons); starting systems design on an untested domain (rework); skipping domain design because "the schema will show it" (the schema hides meaning).

## 3a. The capability map and the product layer (v3.0.13)

**Capability map (DD-12), every project.** Capabilities grouped into categories by job (one job, its vocabulary, the facts it changes), each sorted **core** (build), **supporting** (build simply) or **generic** (buy or integrate), with dependencies, an owner and a success measure. It is domain design (stage D2): it draws architecture boundaries and decides investment before it informs packaging or marketing. Define categories internally by job; map them outward to how buyers buy; don't let incumbent categories define the architecture.

**Product layer (PA-01..03)** sits between domain and systems design: product structure and naming (when the project serves several roles or offerings, C-19); packaging and buyer mapping, and the competitive landscape by category (for businesses). See [[SAD_SKILL_v3_AMENDMENT_2026-10-10_capability-maps-and-design-coverage]].

## 3b. Experience and interface design (v3.0.14)

Two layers sit between the product layer and systems design: **experience design (XD-01..10)**, what a person must be able to do and understand, and **interface design (UI-01..08)**, what they see and touch and what the system must provide for it. Order: domain → product → experience → interface → systems. The back-end API (SD-08) answers the front-end contract (UI-06), consumer first. The interface is explored before it is fixed (wireframes and a prototype on real data, then fidelity ladders, design system, front-end contract and journey scenarios). A back end built before its interface is an engine, not a product. See [[SAD_SKILL_v3_AMENDMENT_2026-10-11_experience-and-interface-design]].

## 4. The registry

Each entry in `design-documents.registry.json` has:

| Field | Meaning |
|---|---|
| `id`, `layer`, `stage` | e.g. `SD-07`, `system`, `S3 Data` |
| `name`, `aliases`, `purpose` | What the document is and why it exists |
| `required_when` | `always`, `characteristics:C-03`, `obligations:O-01`, `entity-class:business\|hybrid`, or a stated condition (characteristics and obligations from the [[ASSET_REQUIREMENTS_METHOD]], declared per entity in its `design-profile`) |
| `depends_on` | Documents that must exist first |
| `questions` | The questions the document must answer, each with an id and, where it comes from the Fanout curriculum, its lesson |
| `evidence` | Hints for finding candidates: frontmatter types, title patterns, path globs |
| `done_when` | Completion rule |

Status vocabulary matches the ARS: **exists** (✓), **partial** (↺), **null** (✗), **deferred** (—, with trigger), **not_applicable** (N/A, with reason).

## 4a. Placement across file systems

The registry is the list of questions. It is not a directory layout. One scope keeps one set of files, on two file systems, and an index on each side says which file answers which ID. Several IDs share a file. That is the layout, and a coverage check reads the indexes.

Order of layers: domain → product → experience → interface → systems (§3a, §3b).

| Layer | File system | Path | How the IDs show up |
|---|---|---|---|
| **Domain** DD-01–DD-12 | Vault | `<entity>/product/spec/` | One design index maps each ID to the spec that answers it. Specs are named for the concept (act, office, glossary), not for the ID |
| **Product** PA-01–PA-03 | Vault | `<entity>/product/spec/` for structure and packaging. A competitive landscape may sit beside it or under the business pillar, and the architecture note cites it | Headings inside the architecture note, not a `PA-*` folder |
| **Experience** XD-01–XD-10 and **interface** UI-01–UI-08 | Vault | `<entity>/product/design/<scope>/` | The filename carries the ID (`XD01`, `UI01`). A file may be a pointer into the code repo |
| **Systems** SD-01–SD-23 | Code repo of the scope being built | `<repo>/docs/design/` and `<repo>/docs/adrs/` | Numbered files group several IDs. `00_INDEX.md` is the map. The vault keeps a spec-pointer at `<entity>/product/spec/` |

Variation inside the domain (a level of government, a jurisdiction catalog) stays in DD-08. It does not get its own tree on either file system. A second product package on the same system is a product-layer difference (PA-01), still one domain and one systems package.

**Reference layout (Polity OS, 2026-10-25).** Vault `Documents/companies/polity/`:

- Domain index and specs: `product/spec/POLITY_OS_DOMAIN_DESIGN_INDEX_2026-10-09.md` and the `POLITY_OS_*` specs beside it
- Product: `product/spec/POLITY_OS_PRODUCT_ARCHITECTURE_2026-10-10.md`
- Experience and interface: `product/design/polity-os/POLITY_OS_XD*` and `POLITY_OS_UI*`
- Systems pointer: `product/spec/POLITY_OS_PROTOTYPE_DESIGN_POINTER.md` → `~/workspace/code/companies/polity/polity-os-prototype/docs/design/00_INDEX.md`

See [[SAD_SKILL_v3_AMENDMENT_2026-10-25_design-schema-across-file-systems]].

## 5. Checking coverage with TypeSafe

[[skills/design-coverage/SKILL|design-coverage]] runs over any scope:

1. Collects candidate documents under the given roots (filename, title, headings, frontmatter type).
2. For each registry entry that applies (given the declared characteristics and obligations), asks TypeSafe, per question, whether the best candidates answer it specifically.
3. Reports each document as exists, partial, null or not applicable, with unanswered questions and the candidate files.

**First run (the reference system, 2026-10-09, about $0.006):** domain 4 exist, 6 partial, 1 null (glossary); systems 0 exist, 8 partial, 15 null. Report: A project file.

**Known limit:** when one concept is spread over several documents, the checker may report *partial* for something covered elsewhere; widen the roots or add a design index that links the parts.

### Entity mode, quick and deep (v3.0.13)

- **Entity mode:** `check.mjs --entity <entity folder>` reads the entity profile's `design-profile` (characteristics, obligations, extra roots, include pattern, `systems-design`) and the `entity-class`; nested child entities are their own scopes. Reports go to `<entity>/_meta/design-coverage/latest(-quick).{md,json}`.
- **Quick** (`--quick`): no model calls; reports `candidate` or `null` per required document. Run at every session opening (SAD PART 4 step 4b).
- **Deep** (default): TypeSafe judges each question. Run at phase boundaries and before ratification.
- **Vault scan:** `scan.mjs` runs the quick check on every live entity and writes `_meta/design-coverage/STATUS.md`.

## 6. Questions this method borrows from the Fanout curriculum

Module 01 (Foundations) supplies the opening of every systems design: requirements clarification (roles, operations, assumptions, invariants, authoritative data, freshness, synchronous vs deferred work, numbers for scale, retention, reliability, privacy, scope, and a failure check), logical design (responsibility owners, boundary result contracts, testing through boundaries, avoiding ceremony), non-functional requirements, trade-offs, capacity planning, cost-aware architecture, and *when not to add infrastructure*. Later modules (APIs, data modeling, coordination, async work, caching and search, reliability and operations) supply the questions for S3–S7. Lesson numbers are cited per question in the registry.

## 7. Amendment

Promote new documents or questions into the registry by the [[ASSET_REQUIREMENTS_METHOD]] promotion paths (P1–P5). Version the registry (`version`) on every change. Placement of the layers across the vault and the code repo is §4a ([[SAD_SKILL_v3_AMENDMENT_2026-10-25_design-schema-across-file-systems]]).
