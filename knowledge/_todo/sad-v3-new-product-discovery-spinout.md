---
type: methodology-todo
ai-model: claude
source: hybrid
created: 2026-05-03
authorship: hybrid (analysis Claude; trigger the owner)
ip-sensitivity: normal
scope: global
target-document: [[SAD_SKILL_v3]]
target-section: PART 5 (Phase 0A / Phase 1A entity-discovery protocol) + entity-pattern documentation
trigger-context: The reference project Session 32 (2026-05-03). The "Your <product>" surface deep-dive surfaced the developer-driven civic-institution platform as a major architectural addition. The platform is operationally distinct from the citizen-facing app (different customers, different sales cycle, different value proposition, different revenue stream) but shares brand identity, data substrate, and backend infrastructure. This raises a methodology question — when a project's mind-dump introduces a new product, what's the protocol for spinning out a sibling entity vs. nesting it under the original?
status: deferred (not authored; held for dedicated methodology session)
companion-todos:
  - [[sad-v3-part-5_5-classification-taxonomy]]
  - [[sad-v3-phase-0d-vision-wireframing]]
  - [[sad-v3-entity-lifecycle-stage-intermediate]]
tags: [methodology-todo, sad-v3, entity-discovery, sibling-spinout, multi-product]
---

# Methodology TODO — New-Product-Discovery Spinout Protocol

**Origin:** The reference project Session 32 (2026-05-03). The developer-driven civic-institution platform was discovered as a major architectural addition during the "Your <product>" surface deep-dive — but it is operationally distinct enough from the reference project that nesting it inside the reference project feels structurally wrong. The same question arose earlier in an earlier flat-promotion decision (2026-04-23 vault restructure) but for already-known surfaces.

This TODO captures the methodology question: **what's the protocol for handling new-product discovery within an existing entity's mind-dump conversations?**

## The pattern

While doing scoping work on entity X, a mind-dump surfaces a new product Y that is:

- Operationally distinct from X (different customers, different sales cycle, different revenue stream, different value proposition)
- Tightly coupled to X technically (shared data substrate, shared backend, shared brand identity)
- Strategically important (closes a gap X has, or creates a moat X needs, or both)

The architectural question: should Y be modeled as:

- **Option A — Nested feature within X**: Y lives as a sub-section of X's product pillar (`projects/X/product/Y/`). One entity, multiple internal capabilities.
- **Option B — Nested platform within X**: If X is a parent ecosystem, Y becomes one of X's platforms (`projects/X/platforms/Y/`). One entity with internal platform/surface decomposition.
- **Option C — Sibling entity, flat-promoted**: Y becomes a separate top-level entity (`projects/Y/`) with `surfaces-of: [[X]]` or similar relationship. Two entities, related via frontmatter.
- **Option D — Sibling entity, nested under X's parent**: If X has a parent ecosystem, Y becomes a sibling under that parent (`projects/X-parent/Y/`). Two entities under shared umbrella.

Each option has tradeoffs. The current methodology (CLAUDE.md vault constitution) describes the surface vs. platform vs. flat-promotion choice for *known* sub-entities of a parent ecosystem, but doesn't describe the protocol for *discovery* — when do you stop adding to an existing entity and spin out a new one?

## The reference project's specific instance

The developer-driven civic-institution platform discovered in Session 32 has these properties:

- **Customers:** civic institutions (cities, counties, special districts, school boards) — distinct from the reference project's citizen customers.
- **Sales cycle:** institutional / B2G — distinct from the reference project's consumer-app launch.
- **Revenue stream:** institutional licensing / SaaS — distinct from the reference project's V1 advertising-default.
- **Brand identity:** likely shared with the reference project (the parent business carries both).
- **Data substrate:** definitely shared (the platform's institutional data feeds the citizen app's coverage).
- **Backend infrastructure:** probably shared (auth, storage, APIs).

This profile fits **Option C (sibling entity, flat-promoted)** most cleanly:

- It mirrors the reference project's own flat-promotion (the reference project is `surfaces-of: A project note`; the new platform would be `platforms-of: A project note` or similar).
- It expresses the operational independence in the folder structure.
- It expresses the technical coupling in frontmatter rather than nesting.
- It supports independent lifecycle progression (the platform's Phase 0A could happen on its own timeline).

But this is a project-specific judgment. The methodology should articulate the **general protocol** for the discovery moment — what triggers a spinout decision, what factors to weigh, how to capture the decision auditably.

## Proposed methodology additions

Two complementary additions to SAD v3:

### 1. New-Product-Discovery Trigger Recognition (during Phase 0A or 1A)

When a mind-dump for entity X surfaces a candidate-new-product Y, the AI compiler should recognize the trigger pattern explicitly:

- Capture Y as an idea-dump (immutable, raw — already what we do).
- **Flag the candidate-new-product status** in the compiler annotations.
- Surface the spinout question to the human author within the next reflection.
- Do NOT silently proceed with mind-dump-Y inside entity-X's scope.

### 2. Spinout Decision Protocol

When the spinout question arises, walk through a decision protocol:

- Step 1: Apply the operational-independence test (different customers / sales cycle / revenue / value proposition?).
- Step 2: Apply the technical-coupling test (shared data / backend / brand?).
- Step 3: Apply the lifecycle-independence test (does Y need its own Phase 0A → 1B pipeline or can it advance with X?).
- Step 4: Choose Option A / B / C / D per the four-option taxonomy above.
- Step 5: If Option C or D (spinout), author Y's entity-profile.md with proper frontmatter, advance Y's lifecycle stage to `concept` or `scoped` per substrate available.
- Step 6: Capture the spinout decision in both X's and Y's changelogs.

## Methodology authoring — actual work TBD

This TODO captures the intent. Actual SAD v3 update is a dedicated methodology session — should not interleave with active product work. Should be batched with:

1. PART 5.5 — Classification Taxonomy ([[sad-v3-part-5_5-classification-taxonomy]])
2. PART 5.X — Phase 0D: Vision Wireframing ([[sad-v3-phase-0d-vision-wireframing]])
3. Lifecycle-stage intermediate stages ([[sad-v3-entity-lifecycle-stage-intermediate]])
4. New-Product-Discovery Spinout Protocol (this TODO)

Four queued methodology TODOs. Worth a dedicated SAD v3 update session covering all four together rather than interleaving with active product work.

## Cross-references

- A project note — the trigger.
- A project note — the V1 architectural artifact that surfaces the long-term-fragmentation-solution dependence on the developer platform.
- [[CLAUDE.md]] — vault constitution; surface vs. platform vs. flat-promotion conventions (which describe known sub-entities, not discovery).
- [[SAD_SKILL_v3]] — the canonical methodology document this TODO targets.
