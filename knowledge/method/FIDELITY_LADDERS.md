---
type: knowledge
source: hybrid
created: 2026-09-09
ai-model: claude-opus-5
authority: architectural
decision-status: proposed
status: PROPOSED
governed-by:
  - "[[SAD_SKILL_v3]]"
  - "[[CLAUDE]]"
related:
  - "[[skills/fidelity-ladder-audit/SKILL|fidelity-ladder-audit]]"
  - "SURFACE_AND_ROLE_CONTRACT_2026-08-18 (tchjhnsn/polity: docs/specs/SURFACE_AND_ROLE_CONTRACT_2026-08-18.md)"
tags: [everything-ecosystem, methodology, design-system, fidelity-ladders, ooux]
description: "A design-system method that keys components to domain objects and fidelity tiers rather than to widget kinds, so that every rendering of an object is derivable from the data model and gaps are mechanically findable."
---

# Fidelity Ladders

A method for organizing a design system around **what an object is** rather than **what a widget looks like**.

## 1 · The problem it solves

Component libraries are conventionally catalogued by widget kind: buttons, cards, modals, tables. This is how the components are *built*, and it is a poor index of how they are *used*. Under a widget-keyed catalogue, no one can answer the two questions that actually come up:

- *Show me every place an Officeholder appears.*
- *When we add a field to Officeholder, which components must change?*

Both questions are answerable only by grep and memory. The result is predictable and was observed in both audits behind this document: the same object gets rendered by two components that disagree about its fields, and neither team knows the other exists.

## 2 · The three axes

Every rendering in a product is located by three coordinates.

| Axis | Question it answers | Example |
|---|---|---|
| **Object** | Which domain noun is this? | Officeholder, Bill, District |
| **Fidelity** | How much of it is shown? | page · panel · card · row · glyph |
| **Context** | Who is looking, from where? | guest / citizen / admin; web / embed / share |

A **fidelity ladder** is the complete set of renderings of one object, ordered by fidelity. The ladder is the unit of design, review, and ownership. Adding a surface adds a rung; adding a field adds a row to the ladder's matrix.

**Do not call these surfaces.** In this vault *surface* already means a composition layer inside a product (vault constitution), and inside the reference project it additionally means a depth level in the token system (`SURFACE_AND_ROLE_CONTRACT_2026-08-18`). A third meaning would make all three unusable.

## 3 · The kernel

The **kernel** of an object is the set of fields present in *every* rung of its ladder. It is the minimum that still reads as this specific instance rather than a generic one.

Kernels are small. In the Luma audit that produced this method, the Event kernel was three fields — title, start time, cover image — across seven renderings. A kernel discovered late is a kernel discovered as a bug; the method requires naming it before the compact rungs are designed, because the kernel is the constraint that generates them.

**Rule K1.** Every ladder declares its kernel. Every rung renders the whole kernel. A rung that drops a kernel field is either a defect or proof the kernel was drawn too wide.

## 4 · The projection matrix

The ladder's working artifact is a matrix: object fields down the side, rungs across the top, and in each cell what happens to that field at that fidelity.

Four cell values, and the third is the one teams miss:

| Value | Meaning |
|---|---|
| **full** | Rendered completely |
| **reduced** | Truncated, clamped, abbreviated, or reformatted |
| **promoted** | Rendered in a *richer* encoding than at lower fidelity |
| **absent** | Not rendered |

*Promoted* exists because fidelity is not one dial. Luma's event page shows guests as an avatar stack *and* a named prose sentence; the extra budget buys a different encoding, not more of the same one. A matrix with only full / reduced / absent cannot express that, and a design system that cannot express it will flatten the richest rendering to a longer version of the poorest.

**Rule K2.** A field's row is read left to right as a degradation sequence. If a field is *absent* at a high rung and *full* at a low one, that is an inversion and must be justified in the matrix or fixed.

## 5 · Containers absorb fields

A rung is not obliged to render a field its container already establishes. Luma's agenda cards omit the date because the timeline groups by day and prints the date in the group header; the field does not vanish, it *relocates* to a cheaper carrier.

**Rule K3.** Before adding a field to a compact rung, check whether the container can carry it for the whole list. Repetition inside a sorted or filtered list is the most common source of card bloat.

## 6 · Machine renderings are rungs

Structured data — JSON-LD, Open Graph, API responses, embed fragments — renders the same object at a fidelity, for a non-human reader. It belongs in the same matrix as the visual rungs.

This is not bookkeeping. In the Luma audit the structured record carried geo coordinates and event status that no visual rendering exposed, and dropped the cover image that every visual rendering treated as kernel. Divergence between what a person sees and what an API returns is invisible unless both are columns in one table.

**Rule K4.** Every ladder includes its machine rungs. A product with a public API or embed surface that omits them has audited half its system.

## 7 · Relationship to existing method

**Prior art, honestly.** This is not a novel invention. It fuses two established lineages that do not currently talk to each other: Sophia Prater's Object-Oriented UX supplies the object axis and the argument that consistency is meaningless without object identity; CMS entity display modes (Drupal view modes, Contentful, Salesforce Lightning record pages) supply the field-projection mechanism as shipped production machinery. What is unclaimed — and what this document contributes — is the fusion, plus the kernel, the promotion cell, and the container-absorption rule.

**Against SAD.** Ladders are a Phase 1B artifact. The object axis comes from `DATA_MODEL_SPEC`; the ladder matrix belongs beside `PRODUCT_SPEC` and binds the design work that follows. A ladder authored before the data model is speculation.

**Against token contracts.** Ladders are orthogonal to color and depth systems and compose with them cleanly. A token contract governs what a call site may say about *appearance*; a ladder governs what it must say about *identity and fidelity*. Neither substitutes for the other, and a project may adopt one without the other.

## 8 · Conformance

A project conforms when:

1. Every domain object has a named ladder, or an explicit note that it has exactly one rendering.
2. Every ladder declares a kernel, and every rung renders it.
3. Every rung's component name states its object and its fidelity.
4. Machine renderings appear as rungs.
5. No object is rendered at the same tier by two components that disagree about its fields.

Item 5 is the one that finds real defects. Items 1–4 are hygiene; item 5 is where forked components hide.

## 9 · Auditing

Run [[skills/fidelity-ladder-audit/SKILL|fidelity-ladder-audit]]. The census script proposes ladders mechanically from component names and prop shapes; the matrix is always hand-built, because no script can see what a component actually renders.
