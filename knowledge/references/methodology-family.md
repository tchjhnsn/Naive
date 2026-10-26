---
type: reference
ai-model: claude
source: hybrid
created: 2026-04-23
updated: 2026-04-23
last-reviewed: 2026-04-23
authorship: sole
ip-sensitivity: normal
scope: global
tags: [reference, methodology, family, roadmap, sad]
---

# Methodology Family — Roadmap

SAD v3 is one variant of a planned family of domain-specific methodologies. Each variant shares a core process (externalize → stress-test → unconstrained vision → subtractive scope → full specification → implementation → verification → evolution → completion) while adapting its artifact set to the pillar and product type it operates on.

This document names the family structure and tracks which variants are live, drafted, or deferred. It prevents two mistakes: applying SAD v3 to work it wasn't designed for (e.g., Brand or Business pillars), and prematurely generalizing before enough variants exist to reveal what's actually shared vs. domain-specific.

## The two axes

A methodology in this family is defined by two dimensions:

- **Pillar** — which pillar of an entity the methodology operates on: Product, Brand, or Business. (Other pillars are possible but not currently planned.)
- **Product type** (relevant only when the pillar is Product) — what kind of product the methodology produces: software, physical, service, content, or other.

Each cell of the matrix is a potential variant. Most cells will never be authored; only the variants that real work demands will become live documents.

## Status matrix (2026-04-23)

| Pillar | Product type | Variant | Status | Notes |
|---|---|---|---|---|
| Product | software | [[SAD_SKILL_v3]] | **live** | Current canonical. Covers web apps, CLI tools, libraries, APIs, open-source projects. |
| Product | physical | — | someday | Physical goods, hardware. Implementation is manufacturing, not code. |
| Product | service | — | someday | Services delivered to customers (consulting, support, training). Implementation is operations. |
| Product | content | — | someday | Content products (publications, courses, media). Implementation is authorship + distribution. |
| Brand | n/a | — | someday | Brand identity, voice, visual system. Implementation is design files + applied assets + brand guidelines. |
| Business | n/a | — | someday | Business model, pricing, go-to-market, financial model. Implementation is commercial operations. |
| (other pillar) | n/a | — | open | Reserved for pillars not currently named in the Everything Ecosystem. |

## Why the generalization is deferred

SAD v3 has been authored and partially exercised, but it has not yet been stress-tested against a second concrete instance in a different domain. Generalizing from a single instance is premature: it would encode the assumption that the shared process is what matters and the domain-specific artifacts are incidental, when we don't actually know that yet.

The family becomes real when two or three variants exist. At that point, the shared process can be extracted into a parent document ("The Disambiguation Pipeline" or similar) and each variant can reference it rather than restate it. Until then, each variant is authored full-length for its domain, and this roadmap document is the only cross-cutting artifact.

## When to author a new variant

A new variant gets authored when:

1. **A real project in that domain demands formal methodology.** Someone is building a brand system, or a business model, or a physical product, and wants the discipline SAD provides.
2. **The project has enough scope to justify the overhead.** Small one-off work doesn't warrant authoring a methodology variant.
3. **The author is willing to sit with the variant long enough to discover what's genuinely different from SAD v3.** This is authorship work, not translation.

Variants should not be authored speculatively. The roadmap is intentionally passive.

## Naming convention (reserved)

The naming convention for future variants is not yet settled. Candidates:

- `SAD-Software` (current, implicit), `SAD-Physical`, `SAD-Brand`, `SAD-Business`
- `SAD.Software`, `SAD.Brand` (dotted subdivision)
- Distinct acronyms per pillar (`BAD` for Brand-Anchored Development, etc.)

The decision will be made when the first non-software variant is authored. Until then, SAD stands alone unqualified.

## Cross-references

- [[SAD_SKILL_v3]] — the live Product-pillar / software-type variant.
- [[entity-profile-schema]] — entity profiles carry `pillar-product-status`, `pillar-brand-status`, `pillar-business-status` fields tracking which pillars are active per entity.
- [[CLAUDE]] — the vault constitution; defines the pillar pattern that these variants operate on.

## Changelog

| Date | Change | Trigger |
|------|--------|---------|
| 2026-04-23 | Created. | SAD v3 scope-narrowing decision during Gauntlet-application prep Session. |
