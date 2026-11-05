---
type: venture-template-pillar
ai-model: claude
pillar: business
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, pillar, business, methodology, 2026-05-14]
canonical-for: "business-pillar-reference"
related:
  - "[[governance/venture-template/index]]"
  - "[[governance/venture-template/pillars/product]]"
  - "[[governance/venture-template/pillars/brand]]"
---

# Business pillar

> **Purpose:** *How the company sustains itself.* The commercial + operational surface — money, people, contracts, partnerships, day-to-day machinery of being a going concern.

---

## Business pillar products (optional)

Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §35]], the Business pillar **may** have products of its own — commercial or operational offerings that are themselves "products" rather than supporting artifacts for the Product pillar.

Common Business-pillar products:

- **Partnership programs** — formal partner offerings with tier structures, partner benefits, joint go-to-market
- **Training programs + certifications** — for users, developers, partners; sold or freely offered
- **Sales kits / partner enablement bundles** — productized as deliverables to partners
- **Services + service tiers** — when service is sold by Business as a standalone offering, distinct from a Product-pillar service product
- **Enterprise consulting / professional services** — accompanies the main product but is itself a productized offering
- **Investor relations products** — annual reports, board package as a recurring product
- **Affiliate / referral programs** — productized growth mechanisms
- **Marketplace operations** — when the company runs a marketplace as a Business-pillar product (e.g., the marketplace UX is Product, but the operational marketplace product — listings, ranking, dispute resolution, take-rate management — is Business)

Business-pillar products carry their own articulation closure inventory, roadmap, and life-cycle through the four lanes. Their product-type (partnership / program / service / etc.) determines which Tier 2 deliverable templates apply.

Most early-stage companies do NOT have Business-pillar products. They have Business-pillar deliverables (business model, pricing, ops runbooks) that *support* the Product-pillar product. Business-pillar products emerge when the company has growing commercial reach and the operational offerings themselves become significant enough to manage as products.

**Business-pillar products are themselves recursive.** Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|§36]], a Business-pillar product (say, a partnership program) has its own three-pillar structure: its own Product (the program offering), its own Brand (often distinct from parent — "the reference project for Educators" has its own positioning), and its own Business (revenue model, partner ops, legal structure, possibly its own P&L). The methodology applies fractally — a partnership program is its own sub-company with the same three-pillar treatment.

---

## What the Business pillar owns

The Business pillar owns everything that isn't the product (Product) or the identity (Brand) but is necessary for the company to function as a going concern. This is the broadest pillar in scope and the one that varies most by company stage.

Concretely, Business owns:

- **Commercial.** Business model, pricing, revenue strategy, sales motion, partnerships, BD, contracts.
- **People.** Hiring, onboarding, performance management, compensation, culture, all-hands.
- **Operations.** Internal tooling, vendor management, procurement, office/remote ops.
- **Finance.** Bookkeeping, fundraising, runway management, financial reporting.
- **Legal.** Contracts, IP, ToS, privacy, regulatory compliance, employment law.
- **Customer Success.** Onboarding, support, retention, expansion (overlap with Product).
- **Trust & Safety.** Policy, enforcement, escalation (overlap with Product + Brand).
- **Strategy & Planning.** Annual planning, OKRs, board materials, investor relations.

Business **does not** own:
- The product itself — that's Product. Business may shape the product through commercial constraints (pricing, target market) but doesn't author specs.
- Identity — that's Brand. Business uses brand assets but doesn't define them.

---

## Typical teams

- **Operations.** General ops, internal tooling, vendor management. Often where the most cross-pillar coordination happens.
- **Finance.** Accounting, FP&A, fundraising support. Small team but high-leverage.
- **Sales.** Inbound, outbound, account management. Sits under Business when commercial; sometimes under Brand when growth-led / marketing-led.
- **Business Development.** Partnerships, channel deals, ecosystem relationships. Distinct from Sales — BD signs partners, Sales signs customers.
- **People** (sometimes called HR / People Ops). Hiring, performance, comp, culture.
- **Legal.** General counsel, contract review, IP, regulatory. Often outside counsel + small in-house team early; in-house team grows with scale.
- **Customer Success** (overlap with Product). Owns post-sale customer relationship. CS feedback loops back to Product; CS commercial expansion sits squarely under Business.
- **Trust & Safety** (overlap with Brand + Product). Policy lives under Business; community standards under Brand; tooling under Product. Coordination across all three required.

---

## Typical roles

**Pillar lead:**
- *To author:* [[../roles/coo|COO]] — Chief Operating Officer. Pillar lead for Business in most modern companies. (Some companies split Business into multiple C-level roles; COO most often owns the broadest scope.)

**Cross-cutting C-level:**
- **CFO** — Chief Financial Officer. Owns Finance; reports to CEO; sits under Business but has independent board reporting.
- **General Counsel** — heads Legal; reports to CEO; often considered C-level in companies with legal complexity.
- **CRO** — Chief Revenue Officer. Owns Sales + sometimes BD. C-level in revenue-driven companies.
- **CPO** — Chief People Officer. Owns People; C-level in companies that have scaled past ~150 people.

**VP-level + management roles:**
- VP Sales — runs Sales day-to-day; reports to CRO (or CEO if no CRO)
- VP Operations — runs Ops
- VP BD — runs Business Development
- Head of People — runs People (pre-CPO scale)
- Head of Customer Success — runs CS
- VP Legal — runs Legal (under GC or directly to CEO)

**Specialist IC + lead roles:**
- Customer Success Lead — runs a CS pod or customer segment
- Sales Engineer — technical sales support
- BD Manager — owns specific partner relationships
- Recruiter — sources + closes candidates
- Accountant / Controller — owns books + reporting
- Office Manager / Operations Coordinator — handles day-to-day ops

---

## Tier 1 deliverables — every Business pillar produces these

1. **Business profile** (`<entity>/business/profile.md`) — sub-profile describing what Business is for this entity.
2. **Business idea-dumps** (`<entity>/business/_ideas/`) — raw business thinking, commercial hypotheses, partnership ideas.
3. **Market thesis** — who the customer is, what the market looks like, why this entity should exist commercially.
4. **Business model** — how the entity makes money (or, for non-commercial entities, how it sustains itself).
5. **Pricing** — explicit pricing strategy + tiers. (Even free / pre-revenue entities should declare "currently free + the path to monetization.")
6. **Sales collateral** — pitch decks, one-pagers, battle cards (overlap with Brand).
7. **Partnership memos** — for each major partner, a memo describing the relationship + terms.
8. **Operational runbooks** — for each recurring ops task (deploy, incident, on-call, etc.), a runbook.
9. **Metrics framework** — what metrics the company tracks, definitions, dashboards (overlap with Product on Analytics).
10. **Marketing collateral** — landing pages, email sequences, ads (overlap with Brand on voice).
11. **Anti-scraping / ToS clauses** — legal posture for product data + IP (overlap with Product on enforcement).
12. **App store listings** (for app-distribution products) — store metadata, copy, screenshots, preview videos (overlap with Brand).
13. **Pitch deck** — investor / partner pitch (overlap with Brand on narrative).
14. **Investor materials** — board decks, update emails, financial reports.
15. **Contracts** — customer agreements, vendor agreements, NDAs, employment agreements.
16. **Hiring rubric** — what we hire for, by role + by level (overlap with company-wide).

---

## Tier 2 deliverables — per-company-stage

Business pillar varies most by company stage. The typical splits:

### Pre-revenue / pre-product

- Business hypothesis (lightweight model)
- One-pager describing the entity
- Founder bios / why-this-team narrative
- Initial market scan
- Pre-product fundraising deck (if applicable)
- Defer most operational deliverables until product is in users' hands

### Early-stage (post-launch, pre-PMF)

- Refined business model (post-first-customer-conversations)
- Pricing v1 + first-customer pricing
- Light ops runbooks (deploy, incident)
- Initial metrics framework (vanity metrics tolerated; deep cohorts not yet)
- Fundraising materials (seed → Series A)
- First sales collateral (often founder-led sales)

### Growth-stage (post-PMF, scaling)

- Full ops runbooks (incident, on-call, escalation, vendor management)
- Full metrics framework (cohort analysis, retention, unit economics, growth accounting)
- Sales playbooks (per segment + per stage)
- People processes (hiring, onboarding, performance management, comp)
- Partnership program (formal partner tier structure)
- Legal compliance program (privacy, security, regulatory)
- Investor reporting cadence
- Customer success program

### Mature-stage

- All of the above + board governance, strategic planning cycle, M&A capability, IPO readiness (if applicable)

---

## Tier 2 deliverables — per-business-model

Different business models have different Tier 2 deliverables.

### Subscription (SaaS, content subscription, membership)

- Pricing tiers + feature gating matrix
- Churn analysis + retention dashboards
- Upgrade/downgrade flows (overlap with Product)
- Annual contract vs. monthly mix model

### Transactional (e-commerce, marketplace)

- Transaction fee structure
- Take-rate analysis
- Buyer + seller acquisition costs
- Refund + dispute policies

### Advertising-supported

- Ad inventory pricing
- Audience segmentation
- Advertiser relationships
- Privacy + data policy (heavy overlap with Legal)

### Open-source + commercial

- OSS license decision
- Commercial license / SaaS offering structure
- Community → customer conversion model
- Contributor agreements

### Free / non-commercial

- Sustainability model (grants, donations, sponsorships, founder-funded, etc.)
- Sustainability cadence + runway
- Optional "what would make this commercial" deferred plan

---

## Tier 3 deliverables — idea-derived

Examples from the reference project:

- "Privacy positioning" — captured in marketing/privacy-positioning.md
- "App store preview briefs" — Tier 2-ish for app-distribution products, but the specific brief format was Tier 3 for the reference project
- "Concentric-rings allowlist governance" — V1 search policy, lives at the Product × Business overlap
- "Anti-scraping plan" — V1 IP protection posture, lives at the Product × Business overlap

---

## Cross-pillar overlap zones (Business side)

How Business participates in overlap zones with Product and Brand:

- **Business × Product → Analytics + Instrumentation.** Product owns instrumentation; Business owns metric definitions + dashboards.
- **Business × Product → Customer Success.** Product owns in-product onboarding + feedback; Business owns support runbooks + CS ops.
- **Business × Product → Pricing-as-Product.** Business owns pricing strategy + tiers; Product owns paywall implementation + plan-gate UX.
- **Business × Brand → Sales Collateral.** Brand owns voice + identity; Business owns commercial framing + sales playbooks.
- **Business × Brand → Partnership Materials.** Brand owns assets + voice; Business owns terms + relationship management.
- **Business × Brand → PR Strategy.** Brand owns narrative; Business owns analyst + investor + press relationships.
- **Business × Product + Brand → Trust & Safety.** Business owns policy + legal posture; Product owns moderation tooling; Brand owns community standards.

---

## Methodology mechanisms that touch Business

- **Skills:** `business-pillar` (auto-loads on Business work), `metrics-review` (overlap with Product on analytics), `articulation-closure` (Business-pillar deliverable matrix's gating), `deliverable-discovery`.
- **Hooks:** `pre-deploy` (gates on Business deliverables that are deploy-blocking — e.g., ToS, privacy policy, app-store listing readiness).
- **Selective slash commands:** `/metrics-review`, `/stakeholder-update` (composes a stakeholder update from project state).

---

## Related per-role files

- *To author:* [[../roles/coo|COO]] — Business pillar lead
- *To author:* CFO, GC, CRO, CPO as methodology mechanisms need them

---

## Status

- **2026-05-14:** Initial authoring. Tier 1 surfaced; Tier 2 split by stage + business-model; Tier 3 illustrated from the reference project. COO role file queued.
