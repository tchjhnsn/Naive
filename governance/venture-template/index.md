---
type: venture-template
ai-model: claude
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, methodology, three-pillars, master-reference, 2026-05-14]
canonical-for: "what-a-company-is"
related:
  - "[[governance/venture-template/README]]"
  - "[[governance/venture-template/pillars/product]]"
  - "[[governance/venture-template/pillars/brand]]"
  - "[[governance/venture-template/pillars/business]]"
  - "[[sad/SAD_SKILL_v3]]"
---

# What a company is — the master reference

> **Canonical for:** "what a company is" — the three-pillar reference that the methodology builds toward. This document is the master index; the per-pillar files at `pillars/` and per-role files at `roles/` are the substantive expansions.

A company is **three pillars** working together to **deliver value to a defined audience through one or more products**:

- **[[pillars/product|Product]]** — what the company makes (canonical company products).
- **[[pillars/brand|Brand]]** — how the company shows up (and brand products, when present).
- **[[pillars/business|Business]]** — how the company sustains itself (and business products, when present).

Each pillar has teams, roles, and deliverables. **Each pillar can also have products of its own** — Product holds the canonical company products (required); Brand and Business may have products as optional extensions (podcasts, partnership programs, training certifications, etc.). The product-type taxonomy (software / content / service / hardware / hybrid / partnership / program) is orthogonal to which pillar a product sits under — see §35 in [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap]] for the multi-pillar product shape.

Some teams + concerns sit cleanly under one pillar; others span multiple. The pillar model is reference, not boundary — the cross-pillar overlap zones are where most interesting company work happens.

## The pillars are recursive

Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §36]], the three-pillar structure is not just top-level. **Each pillar's products are themselves companies-in-miniature, with their own three-pillar structure.**

A podcast that lives as a Brand-pillar product of the reference project has its own Product pillar (the show), its own Brand pillar (the show's identity within or distinct from the reference project's parent brand), and its own Business pillar (the show's operations, overhead, revenue model). A partnership program living as a Business-pillar product has its own Product, Brand, and Business sub-pillars.

This recursion is how companies organically birth other companies. A sub-project starts as a pillar product under a parent; develops its own three-pillar structure as it matures; eventually either spins out as an independent entity (flat-promotion) or remains a permanent sub-company nested under the parent.

The methodology applies fractally. Articulation closure, version-identity, deliverable templates, skills, hooks — everything works the same way at every recursion level. The reference project gets the same methodology treatment as its parent; a sub-feature would get the same treatment in turn if it grew enough to warrant a sub-company structure.

## The methodology is fluid

Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §37]], this template (and every methodology template) is **explicit about what to consider but implicit about how to document**. The deliverables listed in each pillar file are recommendations + principles + examples — not rigid shapes that every project must produce identically.

The AI surfaces principles, ideas, and deliverables in conversation based on the specific project's context. Different projects, different ambition tiers, different product types — different shapes of documentation. Same considerations.

Documentation is malleable per project + per recursion level. The methodology supports the operator's judgment about what's worth documenting and in what depth — it doesn't override it.

---

## The three pillars at a glance

### Product

*What the company makes.*

Product is the thing the audience uses, reads, plays with, learns from, or builds with. Software apps, hardware devices, content libraries, services, platforms — all forms of "product." Product owns the product spec stack (vision → version → product → data model → impl → behavioral → verification) and everything that translates into running code or shipped artifacts.

Primary deliverables (Tier 1, every Product pillar produces these): product profile, idea-dumps, research synthesis, vision spec, version spec, product spec, roadmap, audience definition, success metrics framework.

Plus product-type-specific deliverables (Tier 2). For software product: data model spec, impl spec, behavioral spec, verification spec, sitemap, IA, UX flows, microcopy, wireframes, component library, accessibility checklist, deploy workflow. For content product: editorial calendar, production workflow, distribution strategy. For service product: service catalog, engagement model, delivery playbooks. Etc. See [[pillars/product]] for the full breakdown.

Typical teams: Engineering, Design (overlap with Brand), Product Management, QA, Data Engineering, DevRel (overlap with Brand + Business), Security (overlap with Business).

Typical roles: CTO, VP Engineering, Engineering Manager, Tech Lead, Senior Engineer, Staff Engineer, Designer, UX Researcher, PM, Group PM, Data Engineer, ML Engineer, Security Engineer, DevRel Engineer.

### Brand

*How the company shows up.*

Brand is the company's identity — visual, verbal, emotional. Brand is the source of truth for what the company looks like, sounds like, and stands for. Brand is what makes the product recognizable, the marketing trustworthy, and the business memorable.

Brand is **imported by the other two pillars, never duplicated**. Product.design wikilinks to brand identity for tokens; business wikilinks to brand voice for marketing copy. If Brand changes, the others reconcile — not the other way around.

Primary deliverables (Tier 1): brand profile, brand identity (colors, typography, logo, imagery style), brand voice + tone + narrative, asset library (wordmark, mark, favicon, OG image), foreshadowing discipline + invariants, version-identities (when persona evolves across product versions).

Typical teams: Marketing, Content, Community, Design (overlap with Product), Communications, Creative Studio.

Typical roles: CMO, VP Marketing, Brand Director, Creative Director, Copywriter, Content Lead, Community Manager, Social Media Manager, PR Lead, Brand Designer.

### Business

*How the company sustains itself.*

Business is the commercial + operational surface — the part of the company that handles money, people, contracts, and the everyday machinery of being a going concern. Business doesn't make the product (that's Product) and doesn't define the identity (that's Brand) — it does everything else that keeps the company running.

Primary deliverables (Tier 1): business profile, market thesis, business model, pricing, sales collateral, ops runbooks, metrics framework, partnership memos, anti-scraping / ToS clauses, app store listing, pitch decks, investor materials, contracts.

Typical teams: Operations, Finance, Sales, Business Development, People, Legal, Customer Success (overlap with Product), Trust & Safety (overlap with Brand + Product).

Typical roles: COO, CFO, CRO / VP Sales, VP BD, Head of People, Head of Ops, General Counsel, Customer Success Lead, Sales Engineer, BD Manager.

---

## Cross-pillar overlap zones

The pillars are reference categories; reality has overlap. The cleanest convention: **primary-pillar tag + secondary-pillar tag in frontmatter**, with overlap zones surfaced explicitly when both pillars contribute substantively.

| Overlap zone | Primary pillar | Secondary pillar | Example deliverables |
|---|---|---|---|
| Design System | Product | Brand | Component library, design tokens, visual system docs |
| Marketing Site | Brand | Business | Landing pages, about page, conversion surfaces |
| Developer Experience | Product | Brand | SDK docs, API reference, dev portal, code samples |
| Sales Collateral | Brand | Business | Pitch deck, one-pagers, battle cards |
| Partnership Materials | Brand | Business | Partner brief, co-marketing assets, joint case studies |
| PR Strategy | Brand | Business | Press kit, narrative arcs, exec briefing docs |
| Analytics + Instrumentation | Product | Business | Event taxonomy, metric definitions, dashboards |
| Customer Success | Business | Product | Onboarding flows, support runbooks, feedback loops |
| Pricing-as-Product | Business | Product | Pricing tiers, paywalls, plan-gate UX |
| Trust & Safety | Product | Brand + Business | Moderation tooling, community standards, legal posture |
| All three (company-wide) | — | — | Mission, Vision, Values, Hiring Rubric, All-Hands, Strategic Plan |

## Company-wide roles (not pillar-specific)

Some roles orchestrate across all three pillars rather than sitting under one. They have their own files at `roles/`:

- **[[roles/ceo|CEO]]** — Chief Executive. Cross-pillar lead; sets direction, hires pillar leads, makes the highest-stakes calls.
- **Founder** — pre-CEO state for early-stage companies; often plays multiple pillar-lead roles simultaneously. *(to author)*
- **Chief of Staff** — cross-pillar orchestrator; the CEO's force multiplier. *(to author)*
- **Board / Advisors** — external governance + counsel. *(to author)*

---

## The methodology's relationship to this template

Per [[sad/pipeline-canonical-view-2026-05-14|the canonical pipeline view]]:

- **Articulate** (0A → 1C): populate the company template for V[N]. Every Tier 1 + Tier 2 deliverable has at least a draft by the end of 1C Articulation Closure.
- **Build** (2.1 → 2.Final): translate the populated template into running reality.
- **Ship** (3.1 → 3.4): make the template's commitments verifiable in production.
- **Operate** (4.1 → 4.4): maintain + evolve + amend.

The methodology doesn't replace the template; it activates it.

---

## What this template is NOT

- **Not an org chart.** Roles describe responsibilities, not headcount.
- **Not a compliance checklist.** Not every project needs every pillar or every team.
- **Not entity-class specific (yet).** Current template assumes default modern tech company. Variants for hobby projects, open-source tools, content companies, service companies, hardware companies, and other shapes are queued for authoring.
- **Not exhaustive of all possible roles.** The per-role files cover the roles most worth formalizing (CEO + pillar leads). Other roles can be added when methodology mechanisms (skills, hooks, commands) need them as context.

## Status

- **2026-05-14:** Initial authoring. Index + 3 pillars + CEO role. Subsequent roles and entity-class variants queued.
