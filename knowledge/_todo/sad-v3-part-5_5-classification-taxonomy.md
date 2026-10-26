---
type: methodology-todo
ai-model: claude
source: hybrid
created: 2026-05-01
authorship: sole
ip-sensitivity: normal
scope: global
target-document: [[SAD_SKILL_v3]]
target-section: PART 5.5 (proposed) — Classification Taxonomy
trigger-context: The reference project V1 scoping conversation (2026-05-01) — the owner requested a classification of V1 capabilities by tier (first-class / second-class / third-class / utility) and noted the surface / feature / utility distinction. The taxonomy was proposed and applied to V1; speaker explicitly noted this should become part of SAD methodology.
status: deferred (not authored; held for dedicated methodology session)
tags: [methodology-todo, sad-v3, classification-taxonomy, version-scoping]
---

# Methodology TODO — SAD v3 Classification Taxonomy

**Origin:** The reference project V1 scoping conversation, 2026-05-01. The owner requested classification of V1 capabilities by tier and noted the framework should be promoted to methodology.

## Proposed addition to SAD v3

Add **PART 5.5 — Classification Taxonomy** between PART 5 (The Complete Pipeline) and PART 6 (Specification Document Structures). The taxonomy belongs in Phase 1A (Version Scoping) as a required step — once a version has been subtractively cut from the Vision, classify each scoped capability so that engineering, design, and demo-readiness work can prioritize correctly.

## Surface vs. feature vs. utility — the type-distinction

**Surface.** A discoverable, navigable destination in the product. Has its own visual identity, route/URL, and citizen mental model as "a place I go." Examples: Home, Wiki entity page, Settings page (yes — even Settings has a surface).

**Feature.** A capability or function — what citizens *do*. May appear inside one surface or across many. Has affordances but isn't itself a destination. Examples: search, compile-and-share, bracketing agent, framework-application.

**Utility.** Infrastructure citizens don't think about. Required to make the system function but not where product value lives. Examples: authentication backend, settings storage, notifications scaffold, account export pipeline.

These are not mutually exclusive — Search is a feature *and* has a surface (the search-results page). Settings is a utility *and* has a surface (the settings page). The classification depends on the *primary identity* of the thing — what citizens are fundamentally engaging with.

## Tier criteria — the priority-distinction

**First-class.** Mission-critical to the product's purpose. Product identity rests on it. Citizens cannot meaningfully use the product without it, or the product loses its distinctive value if absent. Quality, polish, and engineering investment reflect product positioning. Visible in primary navigation. *If you removed it, the product would not be itself.*

**Second-class.** Important but not constitutive of identity. Citizens can use the product without it, but the experience is meaningfully diminished. Should be present and functional. Reasonable engineering investment. May not be in primary navigation but is reachable in 1–2 clicks. *If you removed it, the product would still be itself but weaker.*

**Third-class.** Useful but optional. Niche use cases. Can ship in basic form initially. Lower engineering investment. May be deferred if scope slips. Often nested inside surfaces or accessed through deeper navigation. *If you removed it, most users would not notice.*

**Utility tier (orthogonal to the priority tiers).** Required infrastructure. Citizens shouldn't have to think about it. Minimal visual footprint. Should "just work." Reliability matters more than polish. *If you removed it, the system would break — but its absence isn't where product value comes from.*

The first three tiers (first / second / third) describe priority *within* product-value. The utility tier is orthogonal — it sits outside the value-priority axis and gets its own infrastructure-grade treatment.

## Required Phase 1A output

Each `VERSION_SPEC_v[N].md` should carry a Classification Manifest: every capability scoped for the version, classified by type (surface / feature / utility) and tier (first / second / third / utility-tier). This becomes input to:

- **Engineering prioritization** — first-class capabilities get priority engineering; third-class can ship in minimum-viable form.
- **Design prioritization** — first-class surfaces get full design treatment; utility-tier elements get standard treatment.
- **Demo-readiness sequencing** — first-class surfaces are demo-required; second-class are demo-helpful; third-class are demo-optional.
- **Frontmatter schema** — a `classification-tier` field per scoped capability, queryable across the version's spec package.

## Methodology authoring — actual work TBD

This TODO captures the intent. Actual SAD v3 update is a dedicated methodology session — should not interleave with active product work. Ordering:

1. Author the PART 5.5 prose for SAD v3.
2. Update the entity-profile-schema to support `classification-tier` frontmatter on capabilities.
3. Update the SAD v3 raw-source-taxonomy if classification-related raw-source types are needed.
4. Test against an additional product entity (another project, Reflect, or another) to confirm the taxonomy generalizes.
5. Publish to the sad-methodology open-source repo.

## Cross-references

- The reference project V1 application of the taxonomy: [[brand/profile.md]] §9 implicitly (pillar-status) and the Phase 1A scoping conversation captured in [[entity-profile]] changelog (2026-05-01 row).
- [[SAD_SKILL_v3]] — the canonical methodology document this TODO targets.
- [[entity-profile-schema]] — schema document that may need updating for `classification-tier`.
