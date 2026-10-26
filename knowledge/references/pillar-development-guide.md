---
type: knowledge
source: hybrid
created: 2026-05-31
ai-model: claude
tags: [everything-ecosystem, references]
---
# Pillar Development Guide

This guide provides structured questions, document categories, and tool categories for developing each pillar
at each lifecycle stage. It is not prescriptive about specific tools — it identifies what kinds of tools and
documents are needed and lets the user (with AI recommendation) choose the specifics.

Each pillar has its own lifecycle and can be developed independently. A brand can be in production while the
product is still in ideation. A business model can be documented while the product is being implemented.
There is no required order.

---

## Product Pillar

### Ideation Stage
**Questions to ask:**
- What problem does this product solve? Is it one problem or many?
- Who is the user? Who specifically benefits from this?
- What already exists in this space? What makes this different?
- Is this a technical product (software, hardware) or non-technical (physical, service, content)?
- What is the smallest version of this product that would be valuable?
- Does this product need to integrate with other entities in the ecosystem? How?

**Documents to consider producing:**
- Problem statement / opportunity description
- User personas or audience definition
- Competitive landscape overview
- Initial product vision (can be brief — a few paragraphs)

**Tool categories to consider:**
- Note-taking or documentation tool for capturing ideas
- Research tools for competitive analysis
- Diagramming or sketching tool for early concepts

### Documentation Stage
**Questions to ask:**
- What is the full specification for this product?
- What are the technical requirements (if technical)?
- What is the architecture? What are the components?
- What are the user flows? How does someone actually use this?
- What are the success criteria? How do we know it works?
- For technical products: Is SAD applicable? If so, begin the SAD pipeline.

**Documents to consider producing:**
- Product specification / PRD
- Technical architecture document (if technical)
- **Feature × Implementation matrix** (if technical) — a feature-first inventory mapping each feature to **build vs. buy** and the implementing technology/vendor (e.g., Maps → Mapbox vs. Google Maps). Industry name: a *feature matrix* with a *tech-stack* column. Lives in PRODUCT_SPEC (feature-centric) or IMPL_SPEC (tech-centric).
- **Architecture Decision Records (ADRs)** (if technical) — one record per *contested* technical decision, capturing the options considered (including rejected ones) and a *decision matrix* scoring them against weighted criteria. Uses the `architecture-spec` note type. Write an ADR only when a choice is costly to reverse, spans systems, or will be questioned later — not one per feature.
- User flow diagrams
- Data model / schema design (if applicable)
- API design (if applicable)
- Success criteria / acceptance criteria

**Tool categories to consider:**
- Specification writing tool (markdown, docs)
- Architecture diagramming tool
- Wireframing or prototyping tool
- For technical products: SAD methodology and its associated tooling

### Implementation Stage
**Questions to ask:**
- What is the implementation plan? What gets built first?
- What is the tech stack (if technical)?
- Where does the code live? What repository structure?
- What development environment is needed?
- What testing strategy is appropriate?
- Are there dependencies on other entities in the ecosystem?

**Documents to consider producing:**
- Implementation plan / development roadmap
- Repository README
- Development environment setup guide
- Testing plan

**Tool categories to consider:**
- Version control (Git)
- Development environment / IDE
- CI/CD pipeline
- Testing framework
- Project management tool for tracking implementation

### Production Stage
**Questions to ask:**
- How is the product deployed and delivered to users?
- How do we monitor the product's health and usage?
- How do users provide feedback?
- What is the maintenance and update cadence?
- What metrics define success in production?

**Documents to consider producing:**
- Deployment guide / runbook
- Monitoring and alerting setup
- User feedback collection process
- Maintenance schedule
- Metrics dashboard definition

**Tool categories to consider:**
- Hosting / deployment platform
- Monitoring and observability tools
- Analytics tool
- User feedback collection tool
- Customer support tool (if user-facing)

---

## Brand Pillar

### Ideation Stage
**Questions to ask:**
- What do we want people to feel when they interact with this entity?
- What is the personality of this brand? (If it were a person, how would it speak and behave?)
- Who is the audience? What do they care about? What aesthetic resonates with them?
- Does the brand precede the product, follow the product, or develop alongside it?
- Is there an existing perception we need to work with or reshape?
- How does this brand relate to the parent brand (if any)? Should users know the connection, or not?
- What brands (in any industry) do we admire or want to feel adjacent to?

**Documents to consider producing:**
- Brand vision statement (brief — what do we want to be?)
- Audience profile
- Mood board or inspiration collection
- Brand-product relationship definition

**Tool categories to consider:**
- Visual inspiration tool (Pinterest, mood boards, design references)
- Writing tool for articulating brand voice
- Research tool for studying admired brands

### Documentation Stage
**Questions to ask:**
- What is the brand name? Is it final?
- What is the visual identity? (Colors, typography, imagery style, logo)
- What is the brand voice? (How does it write, speak, communicate?)
- What are the brand guidelines? (What is and isn't on-brand?)
- Does the brand need its own operations documentation? (events, merch, campaigns)

**Documents to consider producing:**
- Brand style guide (visual identity, typography, color palette, logo usage)
- Brand voice and tone guide
- Brand narrative / origin story
- Brand guidelines (do's and don'ts)
- If brand has operations: event planning docs, merchandise catalog, campaign briefs

**Tool categories to consider:**
- Design tool for visual identity
- Typography selection tool
- Color palette tool
- Writing tool for brand narrative and guidelines

### Implementation Stage
**Questions to ask:**
- Where does the brand appear? (Website, social media, packaging, communications)
- Is the visual identity being applied consistently across all touchpoints?
- Are brand materials being produced? (Social media content, marketing collateral, merchandise)
- Is the brand voice being used consistently in all communications?
- Does the brand need a website? What does it look like?

**Documents to consider producing:**
- Brand asset library (logos, icons, templates)
- Social media presence plan
- Website design / brand application to web
- Marketing collateral templates
- If applicable: merchandise design files

**Tool categories to consider:**
- Design tool for producing brand assets
- Social media management tool
- Website builder or CMS
- Print / merchandise production tool (if applicable)
- Email marketing tool (if applicable)

### Production Stage
**Questions to ask:**
- Is the brand being perceived as intended? How do we know?
- What marketing and advertising is active?
- Are there brand partnerships? Sponsorships? Collaborations?
- Is the brand hosting events or producing content?
- How is brand health measured?
- Is the brand evolving, or has it stagnated?

**Documents to consider producing:**
- Marketing plan / advertising strategy
- Partnership and sponsorship documentation
- Event planning and execution docs
- Brand health metrics / perception tracking
- Brand evolution roadmap

**Tool categories to consider:**
- Advertising platform
- Analytics tool for brand perception
- Event management tool
- PR / media relations tool
- Partnership management tool

---

## Business Pillar

### Ideation Stage
**Questions to ask:**
- How does this entity capture value? Who pays, and for what?
- What is the revenue model? (Subscription, one-time purchase, advertising, licensing, freemium, etc.)
- What are the unit economics? (Cost to serve one user vs. revenue per user)
- Is this business model proven in the market, or novel?
- Can this business sustain itself independently, or will it need to be subsidized initially?
- What business products does this entity need? (Pricing tiers, enterprise plans, contracts)
- Who are the potential partners, customers, or channels?

**Documents to consider producing:**
- Business model canvas or one-pager
- Revenue model description
- Initial pricing strategy
- Target customer / market definition
- Competitive business analysis (how do others in this space make money?)

**Tool categories to consider:**
- Spreadsheet tool for financial modeling
- Business model canvas tool
- Market research tool
- Note-taking tool for capturing business ideas

### Documentation Stage
**Questions to ask:**
- What is the detailed financial model? (Revenue projections, cost structure, break-even analysis)
- What are the pricing tiers and how were they determined?
- What legal structures are needed? (Business entity, contracts, terms of service)
- What partnerships are needed, and what do those agreements look like?
- What are the business metrics that matter? (CAC, LTV, churn, conversion, etc.)

**Documents to consider producing:**
- Financial model / projections
- Pricing documentation
- Terms of service / legal agreements
- Partnership proposal templates
- Business metrics definition and tracking plan
- Business plan (if seeking investment)

**Tool categories to consider:**
- Spreadsheet tool for detailed financial modeling
- Legal document tool / templates
- Accounting tool (even if basic at this stage)
- CRM tool for tracking potential partnerships and customers

### Implementation Stage
**Questions to ask:**
- Is the payment infrastructure set up? How do users pay?
- Are contracts and legal agreements in place?
- Is there a sales process? Who sells, and how?
- Are partnerships being activated?
- Is the pricing live and visible to customers?

**Documents to consider producing:**
- Payment integration documentation
- Sales playbook / process
- Partnership agreements (executed)
- Customer onboarding documentation
- Invoice and billing templates

**Tool categories to consider:**
- Payment processing tool
- Invoicing / billing tool
- CRM for managing customer relationships
- Contract management tool
- Accounting / bookkeeping tool

### Production Stage
**Questions to ask:**
- Is the business profitable or on a clear path to profitability?
- What are the actual metrics vs. projections?
- Are there expansion opportunities? New markets, new pricing tiers, new business products?
- Is the business being subsidized by another entity? Is that intentional and time-bound?
- What is the growth strategy?
- Are there strategic acquisitions or vertical integrations that the business should pursue?

**Documents to consider producing:**
- Financial reports (P&L, cash flow, balance sheet)
- Metrics dashboard and regular review cadence
- Growth strategy document
- Expansion / new market analysis
- Acquisition target list (if applicable)

**Tool categories to consider:**
- Accounting and financial reporting tool
- Business intelligence / analytics tool
- Tax and compliance tool
- Strategic planning tool
- Investor relations tool (if applicable)

---

## Identity Boundaries Between Pillars

Identity — visual system, voice, tone, logo, typography, color tokens, narrative — is authored in exactly one place. For a **parent ecosystem**, that place is the parent's `brand/`. Nested suite products **import** parent identity; they do not grow a second brand tree by default (`brand-scope: parent`). Only spin-outs (`brand-scope: own`) author identity locally.

**Org-structure reading (2026-08-10):** `brand/` and `business/` at the parent are **org functions** (departments/roles responsible for many products). Recursive brand/business skeletons on every child are retired as the default — see vault `CLAUDE.md` §*Org functions vs product portfolio*.

**Brand owns:** identity.md (tokens), voice.md (tone, microcopy), narrative, asset library, brand guidelines, brand-level campaigns, and **roles/accountability** (which brand responsibilities cover which products).

**Product.design owns:** UX flows, wireframes, information architecture, component library (applying brand tokens), accessibility specs, interaction design. Lives at `product/design/` on the offering. A component library references `[[<parent-or-self>/brand/identity]]` for tokens rather than redefining them.

**Business owns:** pitch decks, sales collateral, investor materials, pricing docs, partnership memos, contracts, and **roles/accountability** (commercial ownership of products). Lives at parent `business/` for the suite. Apps do **not** carry `business-scope`; platforms and the parent ecosystem may.

**The one-place-authoring rule:** If a brand asset appears to exist in two places, one of them is wrong. Consolidate at the owning brand scope and replace the other with a wikilink. Same discipline as the idea lifecycle's canonical-location rule.

---

## Platform Entities — Product Pillar Internal Structure

Platform entities (entities with `entity-class: platform` — underlying engines whose output is consumed by other entities) decompose their product pillar into five internal layers. The separation prevents concept-level beliefs from being confused with architectural decisions or running implementations, so each can evolve on its own cadence.

```
platforms/<platform>/product/
├── profile.md
├── thesis/                         ← concept-level beliefs (rarely changes)
├── research/                       ← open questions, evaluations
├── architecture/                   ← adopted structural decisions (SAD-style specs)
├── models/                         ← deliverable model archetypes (each is its own entity)
└── packages/                       ← shipped code modules the surfaces consume
```

**thesis/** — What the platform *is* and *believes*. Conceptual papers, philosophical framings, the "why does this exist" layer. Rarely changes. Use `type: thesis` in frontmatter.

**research/** — What the platform is currently investigating. Open questions, evaluations, hypotheses, technology comparisons. Evolves with every discovery. Use `type: research` in frontmatter.

**architecture/** — What the platform has adopted as its structural form. Each adopted architectural primitive gets its own folder with a SAD-style spec package (VISION → VERSION → PRODUCT → DATA_MODEL → IMPL → BEHAVIORAL → VERIFICATION). Use `type: architecture-spec` in frontmatter on the top-level doc of each architecture folder.

**models/** — Deliverable model archetypes. Each model is a sub-entity with its own profile, spec, and code-pointer. Examples: a web-trained foundation model, a blank-slate per-user model.

**packages/** — Shipped code modules surfaces consume. Each package has its own `profile.md` and `code/pointer.md`.

The reason for the split: changing storage technology (a `research/storage-tech-evaluation.md` result) shouldn't invalidate thesis. Adopting a new architectural primitive shouldn't invalidate models already running on the old primitive. Each layer moves at its own pace with explicit links to the layer above.

---

## Surface and App Entities — Product Pillar Internal Structure (2026-08-10)

The platform decomposition above has existed for some time. Surfaces and apps had none, which is how one entity accumulated four folders that all accepted architecture documents with no rule distinguishing them.

```
<entity>/product/
├── profile.md
├── IDEA_MAP.md
├── RESEARCH_SYNTHESIS.md
├── spec/                           ← normative, binding contracts
├── subsystems/                     ← ownership charters for durable owned units
├── research/                       ← investigation carrying no binding force
├── planning/                       ← time-bound sequencing
├── marketing/                      ← public copy for this entity
├── design/                         ← UX/UI work product
├── implementation/<effort>/        ← per-campaign artifacts
├── code/pointer.md
└── SESSION_LOG.md
```

The test for each of the four that compete:

| Folder | Ask |
|---|---|
| `spec/` | Would violating this be a defect? |
| `subsystems/` | Does it name a boundary that outlives any one effort? |
| `planning/` | Does it expire when the work ships? |
| `research/` | May a later document contradict it without a supersession? |

**The authority gate.** A document at `authority: architectural` or higher may not live in `research/` or `planning/`. Those hold non-binding and time-bound material by definition, so a binding document in either is misfiled by construction. **Elevation implies relocation** — raising a document's `authority:` and moving it are one edit.

Note the asymmetry with platforms: a platform's `research/` sits beside `thesis/` and `architecture/`, where the binding material has somewhere else to go. A surface has no `thesis/`, so `research/` is the folder most likely to accumulate documents that have quietly become load-bearing. That is the case the gate exists to catch.

## Product.design vs. Product.spec

For technical products at implementation stage, `product/` gains two sibling subfolders that serve different purposes:

**product/spec/** — SAD specification layers (VISION_SPEC.md, VERSION_SPEC_v[N].md, PRODUCT_SPEC.md, DATA_MODEL_SPEC.md, IMPL_SPEC.md, BEHAVIORAL_SPEC.md, VERIFICATION_SPEC.md). These describe the product as it is specified to exist.

**product/design/** — UX/UI work product. Wireframes, user flows, information architecture, component library, accessibility specs, interaction design. These describe how the product is experienced.

The two folders are complementary. Specs encode *what* the product does and *how* it behaves under every condition. Design encodes *what it feels like to use*. A well-specced product without design is functionally correct but unfeeling; a well-designed product without specs is beautiful but unreliable. Both are required for a production-grade surface.
