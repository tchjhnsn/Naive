---
type: knowledge
tags: [everything-ecosystem, skills, business-pillar]
ai-model: claude
created: 2026-05-15
source: hybrid
name: business-pillar
description: >
  Provide Business pillar context — teams, roles, Tier 1 deliverables (business
  model, pricing, ops runbooks, metrics framework, sales collateral, contracts,
  legal posture), per-stage and per-business-model Tier 2 splits, and cross-
  pillar overlap zones. Auto-loads when working on commercial / operational /
  legal / financial / sales / partnership / customer success / trust & safety
  concerns. References venture-template/pillars/business.md as the canonical
  reference. Per SAD v3.3+ amendment §33.
  MANDATORY TRIGGERS: business pillar, business work, business model, pricing,
  sales, COO, CFO, GC, legal, contracts, ops, operations, runbooks, metrics,
  partnership, customer success, trust & safety, anti-scraping, ToS, privacy
  policy, app store listing, pitch deck, investor, board, fundraising, finance,
  hiring, people, procurement, vendor.
---

# Business Pillar Skill

The context-providing skill for Business-pillar work. Auto-loads when business-pillar concerns surface in conversation.

## What this skill provides

- **Business pillar reference** — [[../../venture-template/pillars/business|venture-template/pillars/business.md]] for the canonical Business pillar description
- **COO role context** — [[../../venture-template/roles/coo|venture-template/roles/coo.md]]
- **Per-stage Tier 2 awareness** — pre-revenue / early / growth / mature companies have different Business-pillar deliverable sets
- **Per-business-model Tier 2 awareness** — subscription / transactional / advertising / OSS+commercial / free models have different deliverable sets
- **Optional Business-pillar products** — when present (partnership programs, training certifications, sales kits, services tiers, etc.)

## When to invoke

Auto-loads when:

- Business model / pricing work is happening
- Commercial decisions are being made (sales motion, partnerships, BD)
- Operational runbooks are being authored (deploy, incident, on-call, vendor management)
- Legal posture work surfaces (ToS, privacy policy, contracts, IP, regulatory)
- Financial / fundraising work surfaces (financial model, board deck, investor update)
- Metrics framework / analytics work surfaces (overlap with Product)
- Customer success / trust & safety work surfaces
- Anti-scraping / IP protection work surfaces
- App store listings, partnership materials, or PR strategy work surfaces

## What this skill emphasizes

When loaded, the AI should keep in mind:

1. **Business is the widest pillar in scope.** It covers commercial, operational, financial, legal, people, customer success, T&S, partnerships, and more. The scope varies dramatically by company stage.

2. **COO is the pillar lead** in most companies, but Business has more specialized C-level roles than the other pillars. CFO owns Finance; CRO owns Sales; CPO owns People; GC owns Legal. COO scope is "whatever's left" — which is still substantial.

3. **Stage matters more than for other pillars.** A pre-revenue Business pillar looks nothing like a growth-stage one. Don't apply mature-stage Tier 2 deliverables to an early-stage project.

4. **Business model matters too.** Subscription / transactional / advertising / OSS+commercial / free models have different operational shapes. Pricing strategy, metric definitions, sales motion all vary.

5. **Brand assets are imported, not duplicated.** When business work uses identity (sales decks, app store listings, partnership materials), wikilink to Brand. Don't redefine brand locally.

6. **Business-pillar products are optional** but common as companies scale. Partnership programs, training certifications, professional services — these are products in their own right, distinct from supporting the canonical Product-pillar product.

## Business authoring posture

Business work tends to land in office-hours mode by default:

- **Pricing decisions** — office-hours; ruthless about what the market will pay
- **Sales motion design** — office-hours; press on conversion + economics
- **Legal posture** — office-hours; specificity required
- **Investor materials** — office-hours initially; friend mode for narrative shape, office-hours for numbers
- **Ops runbook authoring** — typically friend mode (building the runbook is generative); office-hours when reviewing it

## Cross-pillar overlap behavior

When work crosses pillars:

- **Analytics + instrumentation** (Business × Product) — Business owns metric definitions + dashboards; Product owns instrumentation
- **Customer success** (Business × Product) — Business owns CS ops; Product owns in-product onboarding
- **Pricing-as-product** (Business × Product) — Business owns pricing strategy; Product owns paywall UX
- **Sales collateral** (Business × Brand) — Business owns commercial framing; Brand owns voice + identity
- **Partnership materials** (Business × Brand) — Business owns terms; Brand owns assets + voice
- **PR strategy** (Business × Brand) — Business owns analyst / investor relations; Brand owns narrative
- **Trust & safety** (Business × Product × Brand) — Business owns legal posture; Product owns tooling; Brand owns community standards

## Related skills

- [[../articulation-closure/SKILL|articulation-closure]] — Business-pillar deliverables in the closure inventory
- [[../friend-mode/SKILL|friend-mode]] / [[../office-hours-mode/SKILL|office-hours-mode]] — posture skills for Business work
- [[../product-pillar/SKILL|product-pillar]] — companion pillar; analytics + CS + pricing overlap zones
- [[../brand-pillar/SKILL|brand-pillar]] — companion pillar; sales collateral + PR overlap zones

## Status

- **2026-05-14:** Initial authoring. References venture-template/pillars/business.md as the canonical Business pillar reference.
