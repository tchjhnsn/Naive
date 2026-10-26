---
type: methodology-amendment
spec-layer: methodology
version: 3.0.14
source: hybrid
ai-model: claude-opus-5.5
created: 2026-10-11
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
authority: constitutional
decision-status: in-force
status: APPLIED
progress: "Founder direction 2026-10-11; formal ratification welcome."
change-class: 2
governed-by:
  - "[[SAD_SKILL_v3]]"
sections-affected:
  - "[[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]]: five layers; experience (XD-*) and interface (UI-*) design; order and triggers"
  - "design-documents.registry.json: v1.2.0 (XD-01..10, UI-01..08; SD-08 depends on UI-06)"
  - "[[skills/design-coverage/SKILL]]: layer gating keys experience-design and interface-design; candidates require a strong signal"
  - "[[entity-profile-schema]]: design-profile keys experience-design, interface-design"
  - "Phase 0D (vision wireframing): graduates from _todo into UI-02"
  - vault CLAUDE.md: Methodology bullet
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-10-10_capability-maps-and-design-coverage]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-07-26_contract-first-pre-build]]"
tags: [methodology, sad-v3, amendment, experience-design, interface-design, ux, ui, design-coverage, front-end-contract]
description: "SAD v3.0.14: every project designs how people use it, in two layers between product architecture and systems design. Experience design (XD-01..10) states who uses it, their jobs, words, journeys, objects, states, language, accessibility and how the experience is proved. Interface design (UI-01..08) chooses the interface method, explores by wireframe and prototype on real data, then fixes fidelity ladders, the design system, the front-end contract (consumer-driven; the back-end API answers it), journey scenarios and verification. The design-coverage registry and checker gain both layers, and the checker stops counting weak matches as candidates."
---

# SAD v3.0.14: Experience and interface design

## Why

The reference system observer reached a working back end (Phase 2 engine) with ratified domain design, product architecture and a full systems-design package, and the design-coverage check reported no gaps. Yet nothing defined how a clerk would use it: no users and jobs, no journeys, no states as a person sees them, no interface and no contract between front end and back end. The founder caught it (2026-10-11).

The cause was structural. The registry had three layers (domain, product, systems), so no check could report a missing experience. The methodology held UX material ([[UX_UNIVERSAL_KNOWLEDGE_AND_ASSETS]], the [[templates/ux-ui-deliverables-inventory|UX/UI deliverables inventory]], [[FIDELITY_LADDERS]], the Phase 0D to-do, the contract-first skill) but none of it was ordered, gated or checked. A second cause: the quick check counted any document sharing a frontmatter type and a few common words as a candidate, which hid gaps (the first run counted 12 of 18 new documents as candidates; all were false).

## §NEW.14 Five design layers, in order

```
Domain (DD) → Product (PA) → Experience (XD) → Interface (UI) → Systems (SD)
```

- **Experience design** answers *what must a person be able to do and understand, and how will we know they can*. It comes from the domain (actors, language, lifecycles, policies) and the product structure (who uses which part). It is technology-free.
- **Interface design** answers *what does the person see and touch, and what must the system provide for it*.
- **Systems design implements the domain for the interface.** The back-end API (SD-08) answers the front-end contract (UI-06), consumer first. An interface that adapts to whatever the back end happens to expose is a defect of order.
- Later layers may reveal gaps in earlier ones; fix the earlier document.

A back end may be built before the interface (as the reference project observer was) when it proves the domain. It is then an **engine**, not a product, and is described as such in phase status.

## §NEW.15 Experience documents (XD-01..10)

| ID | Document | Stage |
|---|---|---|
| XD-01 | Users, contexts and jobs | X1 Understand |
| XD-02 | User research plan and evidence | X1 |
| XD-03 | Users' vocabulary and mental models | X1 |
| XD-04 | Key journeys and service blueprint | X2 Structure |
| XD-05 | Object model and information architecture | X2 |
| XD-06 | State, feedback and trust semantics | X3 Behave |
| XD-07 | Content and language rules | X3 |
| XD-08 | Accessibility and inclusion commitments | X3 |
| XD-09 | Experience acceptance test | X4 Prove |
| XD-10 | Experience decision record | X4 |

Questions, sources and done-when tests are in the registry.

**Full-coverage rule (founder, 2026-10-11).** A suite serves whole jobs, not the parts that are convenient to build. XD-01 measures each user group's job from evidence (job descriptions, duty statements), splits it into components, and gives every component a home: **built** (a capability category owns it), **integrated** (its acts or data are captured into the record and the user reaches it from the product) or **excluded** with a reason. A component with no home is a gap in the domain design, and goes back to the capability map (DD-12). First application: A project note, which found elections missing from the reference project's capability map. Every claim about users is marked **evidenced** or **assumed**; assumptions carry how and when they will be checked. When contact with users is constrained, research proceeds from secondary sources and the constraint is recorded, not hidden.

## §NEW.16 Interface documents (UI-01..08) and the method for the interface

| ID | Document | Stage |
|---|---|---|
| UI-01 | Interface method decision | U1 Method |
| UI-02 | Wireframes and vision sketches (Phase 0D) | U2 Explore |
| UI-03 | Interactive prototype on real data | U2 |
| UI-04 | Fidelity ladders for core objects | U3 Systematize |
| UI-05 | Design system: tokens and components | U3 |
| UI-06 | Front-end contract | U4 Contract |
| UI-07 | Executable journey scenarios | U4 |
| UI-08 | Interface verification | U4 |

**Explore, then anchor.** The methodology catalog marks spec-as-source and test-driven development unfit while interaction is being discovered. So the interface is explored first (UI-02 wireframes, UI-03 a prototype over real data), and only what exploration settles is fixed: object renderings as fidelity ladders (UI-04), the design system with tokens imported from brand (UI-05), the front-end contract written consumer-driven (UI-06), and the journeys as executable Given/When/Then scenarios (UI-07). UI-01 records which method governs which part of the interface and which artifact is its source of truth.

**Phase 0D graduates.** Vision wireframing, piloted twice on the reference project and held as a to-do since 2026-05-03, becomes UI-02. Its convergence loop applies: sketches that surface ambiguity revise the experience or domain documents; sketches set aside are kept with `status: set-aside`.

**Trigger.** Interface design starts when XD-01, XD-04, XD-05 and XD-06 exist.

## §NEW.17 Coverage

- The registry (v1.2.0) holds both layers; SD-08 depends on UI-06.
- `design-profile` gains `experience-design` and `interface-design` (`active` · `not-started` · `n/a`). Both default to **active**, so gaps show; `n/a` only for entities with no human users (for example a pure library), with the reason stated.
- The checker counts a document as a candidate only on a strong signal (a title pattern in its file name or title, a heading naming the document's ID, or a path match). Headings and shared question words alone are no longer enough.

## Applied

- [[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]] §3b; registry v1.2.0; checker; entity-profile schema; vault CLAUDE.md.
- First application: the reference system, starting with XD-01 (a project note).
