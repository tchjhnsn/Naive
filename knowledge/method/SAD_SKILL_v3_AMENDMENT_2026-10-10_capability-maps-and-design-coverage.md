---
type: methodology-amendment
spec-layer: methodology
version: 3.0.13
source: hybrid
ai-model: claude-opus-5.5
created: 2026-10-10
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
authority: constitutional
decision-status: in-force
status: APPLIED — founder direction 2026-10-10; formal ratification welcome
change-class: 2
governed-by:
  - "[[SAD_SKILL_v3]]"
sections-affected:
  - PART 4 — Session Opening Protocol (new step 4b; design coverage)
  - "[[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]] — capability map (DD-12), product layer (PA-*), entity mode, quick and deep checks"
  - "design-documents.registry.json — v1.1.0"
  - "[[ASSET_REQUIREMENTS_METHOD]] — characteristic C-19"
  - "[[entity-profile-schema]] — design-profile frontmatter block"
  - "[[skills/design-coverage/SKILL]] — entity mode, quick mode, vault scan"
  - vault CLAUDE.md — Methodology bullet
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-07-26_asset-requirements-method]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-08-07_governance-precedence-and-universal-session-opening]]"
tags: [methodology, sad-v3, amendment, class-2, capability-map, subdomains, product-architecture, design-coverage, session-protocol, gaps]
description: "SAD v3.0.13. Every project keeps a capability map (DD-12): categories by job, sorted core, supporting or generic, ordered by dependency, each with an owner and a success measure. Projects with several roles or offerings add a product layer (PA-01 structure and naming; PA-02 packaging and buyer mapping; PA-03 competitive landscape by category). Every entity declares a design-profile, and every session opens with a quick design-coverage check that flags missing documents."
---

# SAD v3.0.13: capability maps and design coverage in every project

## Why

Two failures prompted this, both from the reference system work of 2026-10-09/10:

1. **Features were being listed, not mapped.** Without categories there was no principled way to decide what to build versus integrate, who owns what, what order things come in, or what the product competes with. Categories were first proposed as a marketing device; from first principles they are architecture and investment decisions first, and marketing follows.
2. **Gaps were found late and by hand.** The design-coverage checker existed, but it ran only when someone remembered and typed each project's characteristics into the command. Projects other than the reference project had never been checked.

## §NEW.10 The capability map (DD-12): required for every project

Every project, software or not (a city-development venture has capabilities too), keeps a **capability map**:

| Property | Rule |
|---|---|
| **Category** | One job, its own vocabulary, the facts it mainly changes (a bounded context) |
| **Type** | **Core** (differentiating: build) · **supporting** (necessary: build simply) · **generic** (solved: buy or integrate) |
| **Build or integrate** | Follows from the type, stated explicitly |
| **Depends on** | Which categories must exist first; this orders the roadmap |
| **Success measure** | One per category |
| **Owner** | Now, and as the team grows |
| **Exclusions** | What is deliberately not a category; adding one is a decision |

The map is **domain design** (stage D2), so it lives with the domain documents, not with marketing. Purposes, in order: architecture boundaries; investment; completeness; ownership and sequencing; buyer mapping; comparison and marketing.

**Common mistake:** letting buyers' existing categories define the architecture. Incumbent categories are often the silos a product exists to replace. Define categories internally by job; map them outward to how buyers buy; decide deliberately whether to position a category as new.

## §NEW.11 The product layer (PA-*): for projects with several roles or offerings

A new registry layer between domain and systems design:

| ID | Document | Required when |
|---|---|---|
| PA-01 | Product structure and naming (levels such as platform, edition, suite; who uses which part; permission basis; what is never sold as a product) | Characteristic **C-19** (multi-role or multi-offering) |
| PA-02 | Packaging and buyer mapping (unit bought; buyer versus user; each category's budget line; expansion path) | `entity-class: business` or `hybrid` |
| PA-03 | Competitive landscape by category (alternatives including doing nothing; verifiable dimensions; sourced and dated claims; where we're weaker; positioning) | `entity-class: business` or `hybrid` |

## §NEW.12 Every entity declares a design profile

Each `entity-profile.md` carries a `design-profile:` block (schema in [[entity-profile-schema]]):

```yaml
design-profile:
  characteristics: [C-01, C-06]        # ARS characteristics (C-19 added by this amendment)
  obligations: [O-01, O-02]            # ARS obligations
  roots: ["<repos>/<repo>"]             # extra roots (code repos), optional
  include: "<regex>"                   # narrow the scope, optional (e.g. one programme inside a parent entity)
  systems-design: active | not-started | n/a
  declared: "<date>, <by whom>; confirm"
```

`systems-design` follows the method's trigger: `active` only once a phase's systems package has started; `n/a` for ventures without software. A missing design profile is itself reported as a gap.

## §NEW.13 Design coverage at every session opening

PART 4 gains step **4b**:

> **4b. Check design coverage.** Run `design-coverage --entity <entity> --quick` (no model calls, no cost). Read the entity's `_meta/design-coverage/latest-quick.md`. State the required documents with no candidate (✗) that bear on the task. If the task would create or change a document the registry tracks, name its ID. Don't start design work that depends on a missing document without either writing it first or recording why not.

**Deep checks** (TypeSafe, a few cents) run at phase boundaries, before ratification, and when a quick check shows candidates for documents the task depends on. The **vault scan** (`scan.mjs`) regenerates `_meta/design-coverage/STATUS.md` across all live entities; run it at least at each campaign start.

## What did not change

The domain-first rule, the systems-design trigger, the registry's status vocabulary, and the ARS promotion paths.
