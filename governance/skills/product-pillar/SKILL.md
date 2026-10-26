---
type: knowledge
tags: [everything-ecosystem, skills, product-pillar]
ai-model: claude
created: 2026-05-15
source: hybrid
name: product-pillar
description: >
  Provide Product pillar context — teams, roles, Tier 1 + Tier 2 deliverables,
  cross-pillar overlap zones — when working on product-pillar work. Auto-loads
  when the conversation involves product spec authoring, technical architecture,
  engineering work, UX / design, or any other Product-pillar concern.
  References the canonical Product pillar file at company-template/pillars/product.md.
  Per SAD v3.3+ amendment §33.
  MANDATORY TRIGGERS: product pillar, product work, product spec, engineering,
  CTO, technical architecture, UX, design, sitemap, IA, wireframes, component
  library, code, software product, content product, service product, hardware
  product, spec stack, VISION_SPEC, VERSION_SPEC, PRODUCT_SPEC, DATA_MODEL_SPEC,
  IMPL_SPEC, BEHAVIORAL_SPEC, VERIFICATION_SPEC.
---

# Product Pillar Skill

The context-providing skill for Product-pillar work. Auto-loads when product-pillar concerns surface in conversation.

## What this skill provides

When loaded, this skill makes available:

- **Product pillar reference** — see [[../../company-template/pillars/product|company-template/pillars/product.md]] for the canonical Product pillar description
- **CTO role context** — see [[../../company-template/roles/cto|company-template/roles/cto.md]]
- **Per-product-type guidance** — Tier 2 deliverables vary by product type (software / content / service / hardware / hybrid)
- **Cross-pillar overlap awareness** — Product × Brand (design system, DevEx) and Product × Business (analytics, customer success, pricing-as-product, trust & safety)

## When to invoke

Auto-loads when:

- Product spec work is happening (any of VISION → VERIFICATION specs)
- Engineering / technical architecture work is happening
- UX / IA / design / wireframe work is happening
- Code is being authored, reviewed, or deployed
- Product-pillar deliverables are being inventoried (e.g., during articulation closure)
- The conversation surfaces Product-pillar concerns (technical risk, code quality, schema design, etc.)

## What this skill emphasizes

When loaded, the AI should keep in mind:

1. **Product is the pillar where SAD lives most fully.** Spec stack discipline, articulation closure, the Phase 0A → 5 pipeline — all of this was authored for Product pillar / software product type. The methodology is most mature here.

2. **Brand is imported, not duplicated.** When product work touches identity (colors, typography, logo, voice), the right move is wikilink to Brand, not copy. Watch for design system drift.

3. **Per-product-type Tier 2 deliverables matter.** Software product has a deeply-developed Tier 2 deliverable set; content product, service product, hardware product have lighter sets (and need authoring). Don't apply software-product Tier 2 to a content product.

4. **Multi-product Product pillars share some deliverables.** When the entity has multiple Product-pillar products (e.g., a product with seven surfaces), some deliverables are per-product (spec stack) and some are entity-wide (cross-product strategy). Don't conflate.

5. **CTO is the pillar lead.** Product-pillar sign-offs map to CTO authority. When articulation closure verification is gating, that's CTO-domain.

## Cross-pillar overlap behavior

When work crosses pillars:

- **Design system** (Product × Brand) — both pillars' skills should load. Brand owns visual tokens + voice; Product owns interaction patterns + component behavior.
- **Developer experience** (Product × Brand) — Product owns SDK / API docs; Brand owns dev portal voice.
- **Analytics** (Product × Business) — Product owns instrumentation + event taxonomy; Business owns metric definitions + dashboards.
- **Customer success** (Product × Business) — Product owns in-product onboarding + feedback; Business owns support runbooks + CS ops.
- **Pricing-as-product** (Product × Business) — Product owns paywall + plan-gate UX; Business owns pricing strategy.
- **Trust & safety** (Product × Brand × Business) — Product owns tooling; Brand owns community standards; Business owns legal posture.

## Related skills

- [[../articulation-closure/SKILL|articulation-closure]] — most active in Product pillar
- [[../build-roadmap/SKILL|build-roadmap]] — Product-pillar artifact
- [[../version-identity/SKILL|version-identity]] — Brand-led but Product-consumed
- [[../brand-pillar/SKILL|brand-pillar]] — companion pillar skill; loads when Brand work surfaces
- [[../business-pillar/SKILL|business-pillar]] — companion pillar skill; loads when Business work surfaces

## Status

- **2026-05-14:** Initial authoring. References company-template/pillars/product.md as the canonical Product pillar reference.
