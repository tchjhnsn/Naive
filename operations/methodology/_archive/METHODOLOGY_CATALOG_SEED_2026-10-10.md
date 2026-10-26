---
superseded-by: "[[catalog/INDEX|catalog/INDEX]]"
archived-at: 2026-10-10
type: reference
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
authority: exploratory
status: DRAFT
governed-by:
  - "[[EVERYTHING_ECOSYSTEM_DOMAIN_DESIGN_2026-10-10]]"
lineage-from:
  - "[[sdd-cousins-pros-cons-api-first-2026-08-11]]"
  - "[[methodology-family]]"
tags: [methodology-catalog, spec-driven-development, tdd, bdd, contract-first, mbse]
description: "Seed of the methodology catalog: each entry answers the methodology decision questions (M1-M11) and marks answers tested or assumed. Software entries are seeded from the 2026-08-11 SDD cousins research; physical and business entries are candidates only."
---

# Methodology catalog (seed)

Decision questions are defined in [[EVERYTHING_ECOSYSTEM_DOMAIN_DESIGN_2026-10-10#Decision questions]]. This catalog guides choice; it does not limit it (I7). Every answer below is **assumed** unless marked **tested**: no assignment has yet recorded evidence (M11) under this scheme.

Fit columns: **M2** knowability (K = knowable before building, D = discovered by building), **M4** cost of error it suits, **M5** how correctness is checked.

## Software

| Methodology | Family | M1 Source of truth | M2 | M3 Requirements | M4 | M5 Verified by | M7 Builder fit | M10 Switch when | Unfit when |
|---|---|---|---|---|---|---|---|---|---|
| Spike / prototype | Exploratory | Running experiment + learning note | D | Unknown | Low | Use | Agents work well on tiny briefs | Survives 2–3 sessions or gains a second consumer → extract tests or contract | Public surface, custody or identity risk |
| Small change | Maintenance | Existing tests, contract or code | K | Stable | Low | Existing tests | Any | Change grows into new behaviour | New module or public endpoint |
| Spec-first | Spec-driven | Change spec (expires at merge) | K | Stable for the change | Medium | Review + tests | Good for one agent session | Spec must stay true for months → spec-anchored | Tiny changes; long-lived intent |
| Spec-anchored (SAD) | Spec-driven | Living spec beside code | K | Evolving, coherent | Medium–high | Only as good as its checks | Agents ignore long prose specs | Spec can be made executable → contract or tests become the anchor | Spec is unverified prose |
| Spec-as-source | Spec-driven | Spec; code generated | K | Stable, formalisable | Medium | Regeneration gated by tests or formal checks | High if gated; dangerous if not | Spec cannot be made precise → spec-anchored | Exploratory, UI-heavy, repository-scale prose |
| Test-driven (TDD) | Test-first | Tests | K | Known behaviour | Medium–high | Test runner | Excellent loop for agents | — | Unknown product shape; visual work |
| Behaviour-driven (BDD) | Test-first | Automated scenarios | K | A few primary use cases | Medium | Scenario runner | Agents pad scenarios; cap their number | Scenarios multiply unread → product decision first | Internal libraries; wire details |
| Design by contract | Contract | Pre/postconditions, invariants | K | Stable invariants | High | Assertions, types | Precise constraints | Types + tests do it cheaper | Culture or language lacks support |
| Contract-first / API-first | Contract | Machine-readable contract (OpenAPI, AsyncAPI) | K at the boundary | Boundary stable | High | Contract checks in CI | Enables parallel agents | — | Solo spike, no second consumer yet |
| Consumer-driven contracts | Contract | Each consumer's expectations | K | Multiple known consumers | High | Contract tests per consumer | Medium | — | One consumer; unknown public consumers |
| Model-driven (MDD) | Model-driven | Model; code generated | K | Narrow domain | Medium | Generator + tests | Narrow use (codegen from OpenAPI) | — | General product development |

## Physical (candidates, not yet researched)

| Methodology | Notes to research |
|---|---|
| Model-based systems engineering (SysML) | Model as source of truth for hardware; nearest parallel to spec-as-source |
| V-model | Requirements paired with verification at each level; common in regulated hardware |
| Set-based concurrent engineering | Keep design options open until evidence narrows them; suits high M2-uncertainty physical work |
| Building information modelling (BIM) | Model as source of truth for buildings; relevant to another project |
| Urban planning methods | Comprehensive plans, form-based codes; to survey for another project. Draws on bodies of knowledge such as Sommer, *Personal Space* |

## Business (candidates, not yet researched)

| Methodology | Notes to research |
|---|---|
| Customer development / lean experimentation | Discovery-first; the business analogue of spike / prototype |
| Process modelling (BPMN-led) | Process model as source of truth; can be executed by process engines |

## Adding an entry

A choice outside this catalog is allowed. Record it as a candidate row, answer M1–M11 as far as possible, and mark what is assumed. Review for promotion once an assignment has produced evidence.
