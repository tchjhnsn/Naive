---
type: venture-template-pillar
ai-model: claude
pillar: product
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, pillar, product, methodology, 2026-05-14]
canonical-for: "product-pillar-reference"
related:
  - "[[governance/venture-template/index]]"
  - "[[governance/venture-template/pillars/brand]]"
  - "[[governance/venture-template/pillars/business]]"
  - "[[sad/SAD_SKILL_v3]]"
---

# Product pillar

> **Purpose:** *What the company makes.* The product itself + everything required to specify it, build it, ship it, and operate it.

---

## Product pillar products

Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §35]], each pillar can have products. Product pillar holds the **canonical company products** — the thing(s) the audience uses, reads, plays with, learns from, or builds with.

A company may have one Product-pillar product (the simple case) or many (e.g., the reference project's seven surfaces: The reference project, the reference project News, the reference project SDK, the reference project Forum, etc.). Each Product-pillar product carries its own:

- Spec stack (vision → version → product → data model → impl → behavioral → verification)
- Audience definition + success metrics
- Roadmap
- Articulation closure inventory
- Build → ship → operate lane traversal

Multi-product Product pillars share some company-wide deliverables (the entity's overarching mission, the cross-product strategic plan) but most product-specific deliverables are per-product.

**Product-pillar products are themselves recursive.** Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|§36]], each Product-pillar product is itself a company-in-miniature with its own three-pillar structure: its own Product sub-pillar (the product itself + any sub-products), its own Brand sub-pillar (the product's identity within or distinct from parent), and its own Business sub-pillar (the product's commercial / operational concerns specific to its scope). The reference project's seven surfaces are the canonical example — each surface is itself a sub-company. The methodology applies fractally; articulation closure, version-identity, deliverable templates all work the same way at every recursion level.

---

## What the Product pillar owns

The Product pillar owns the **product spec stack** and everything downstream of it that's specific to the product as a thing-the-audience-uses. This is the pillar where SAD v3 lives — the methodology is Product-pillar-focused, software-product-type-focused at its current state of development.

Concretely, Product owns:

- The product's vision, version scoping, and full spec stack
- The product's data model, architecture, and implementation
- The product's user experience, information architecture, and accessibility
- The product's verification — does it do what we said it would?
- The codebase (or content library, or service offering — whatever the product type implies)
- The deploy/distribute workflow that gets the product to the audience
- The product's internal observability + performance instrumentation (often co-owned with Business via the Analytics overlap zone)

Product **does not** own:
- Brand identity (visual + verbal) — that's Brand. Product *imports* brand into its UI + microcopy.
- Marketing copy or commercial positioning — that's Business or Brand depending on the artifact.
- Pricing — that's Business (with Product input via the Pricing-as-Product overlap zone).

---

## Typical teams

Teams under Product (primary pillar). Overlap teams are noted explicitly.

- **Engineering.** Backend, frontend, infrastructure, mobile. The team that writes code.
- **Design** (overlap with Brand). Product design (UX, IA, interaction). Sits under Product when the work is "how the product behaves"; sits under Brand when the work is "how the company visually shows up." Most companies need both kinds of design and the boundary is a frequent source of friction. The methodology convention: product designers sit under Product; brand designers sit under Brand; the design system itself is a Product × Brand overlap.
- **Product Management.** PMs, group PMs, technical PMs. Owns the product-spec authoring + version scoping work.
- **QA / Quality.** Test engineering, automation, manual QA. Owns the verification → ship gate.
- **Data Engineering.** Pipelines, warehousing, data platform. Sits under Product when the data is the product (analytics product, dataset product) or when data infra is product-critical.
- **DevRel** (overlap with Brand + Business). Developer relations sits cross-pillar: code samples + SDK docs are Product; developer-facing voice + content is Brand; developer partnerships + community programs are Business.
- **Security** (overlap with Business). Product security (vuln management, threat modeling) is Product; corporate security + compliance + legal posture is Business.

---

## Typical roles

Roles under Product. Per-role files exist for those that get methodology mechanisms; others are listed here for reference.

**Pillar lead:**
- [[../roles/cto|CTO]] — Chief Technology Officer. Sets Product pillar's technical direction.

**Senior IC + management roles:**
- VP Engineering — runs the engineering organization day-to-day
- Engineering Manager (EM) — manages a team of engineers
- Tech Lead — sets technical direction within a team
- Staff / Principal / Distinguished Engineer — senior IC roles
- Senior Engineer — experienced IC
- Software Engineer — IC

**Specialist IC roles:**
- Designer — product designer (UX + interaction)
- UX Researcher — user research, usability testing
- Data Engineer — pipelines, warehousing
- ML Engineer — machine learning systems
- Security Engineer — application + infrastructure security
- DevRel Engineer — developer relations
- Site Reliability Engineer (SRE) — infra reliability + observability

**Product Management:**
- VP Product — runs the product organization
- Group PM — manages a group of PMs
- Product Manager (PM) — owns one or more product areas
- Technical PM — PM for technical / API / infra products

---

## Tier 1 deliverables — every Product pillar produces these

Universal Product-pillar deliverables, regardless of product type:

1. **Product profile** (`<entity>/product/profile.md`) — sub-profile under the entity profile; describes what the Product pillar is for this entity.
2. **Idea-dumps** (`<entity>/product/_ideas/`) — raw idea capture, per the two-layer data model.
3. **Research synthesis** (`<entity>/product/RESEARCH_SYNTHESIS.md`) — compiled from `_sources/`; produced in Phase 0B.
4. **Idea map** (`<entity>/product/IDEA_MAP.md`) — compiled from `_ideas/`; produced in Phase 0A.
5. **Vision spec** (`<entity>/product/spec/VISION_SPEC.md`) — permanent unconstrained vision; produced in Phase 0C.
6. **Version spec** (`<entity>/product/spec/VERSION_SPEC_v[N].md`) — subtractive cut of vision for version N; produced in Phase 1A.
7. **Product spec** (`<entity>/product/spec/PRODUCT_SPEC.md`) — intent, scope, user taxonomy; produced in Phase 1B.
8. **Roadmap** (`<entity>/product/roadmap-*.html` or `.md`) — engineering + content + brand + ops deliverables, ordered for build.
9. **Audience definition** — who this version is for; what they want; what they don't.
10. **Success metrics framework** — what "working" looks like, measured (overlap with Business).
11. **Session log** (`<entity>/product/SESSION_LOG.md`) — institutional memory across all phases.
12. **Code pointer** (`<entity>/product/code/pointer.md`) — frontmatter pointing to the repo at `<repos>/<repo>/`.

---

## Tier 2 deliverables — per-product-type

Additional deliverables depending on what kind of product. The methodology assumes "default = software product" because SAD v3 was authored for software; other product types have their own deliverable shapes and are queued for variant authoring.

### Software product

The most fully-developed product-type. Tier 2 deliverables:

- Data model spec (`DATA_MODEL_SPEC.md`)
- Implementation spec (`IMPL_SPEC.md`)
- Behavioral spec (`BEHAVIORAL_SPEC.md`)
- Verification spec (`VERIFICATION_SPEC.md`)
- Phase 1B-Final cross-spec review (`PHASE_1B_FINAL_REVIEW.md`)
- Sitemap + URL structure
- Information architecture doc
- UX flows (per F-flow in PRODUCT_SPEC)
- Microcopy + states (empty / loading / error)
- Accessibility checklist
- Responsive breakpoints
- Wireframes (per page)
- Component library catalogue
- Articulation closure inventory
- Deploy workflow (CI/CD config)
- Operational runbooks
- Tests (unit / integration / E2E)
- Verification test plan (§9-style)

#### Software sub-types (further specialization)

- **Web app** — sitemap is primary; SEO, analytics, OG/share assets matter.
- **Mobile app** — store-listing copy + screenshots primary; platform-specific UX patterns.
- **API / SDK** — auth model + reference docs primary; backwards-compat policy.
- **CLI tool** — install/uninstall + help text primary; package manager strategy.
- **Library** — semantic versioning policy; example apps; contributor docs.
- **Platform** (multi-tenant) — governance + isolation model; tenancy boundary docs.

### Content product

Additional deliverables when the product is content (newsletter, podcast, book, course, documentary):

- Editorial calendar
- Content production workflow
- Distribution strategy (channels, cadence)
- Audience growth plan
- Editorial guidelines (separate from brand voice — content-specific)
- Episode / issue / chapter template

### Service product

Additional deliverables when the product is a service (consulting, agency, coaching):

- Service catalog
- Engagement model (proposal → SOW → delivery → handoff)
- Delivery playbooks per service offering
- Pricing tiers (overlap with Business)
- Case study template

### Hardware product

Additional deliverables when the product is hardware (consumer device, industrial):

- Bill of materials (BOM)
- Manufacturing plan
- Supplier qualification
- Certification roadmap (FCC, CE, UL, etc.)
- Field service / warranty model
- Unboxing + setup experience design

### Hybrid

Real products are often hybrid (software + content; software + service; hardware + software companion app). Hybrid products produce the union of relevant Tier 2 deliverables.

---

## Tier 3 deliverables — idea-derived

Discovered per-project; not in any standard template. Surfaced by the deliverable-discovery skill (per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap idea-dump §33–§34]]).

Examples from the reference project:

- Concentric-rings source classification
- Foreshadowing audit (V[N] foreshadows V[N+1] audience)
- Version-identities document (one-persona-per-version discipline)
- Anti-scraping plan (Twitter-posture for civic data)
- District-map SVG strategy
- Portrait standards

Tier 3 deliverables originate from conversation; they get added to the deliverable templates inventory as they accumulate across projects and start to feel reusable.

---

## Cross-pillar overlap zones (Product side)

How Product participates in overlap zones with Brand and Business:

- **Product × Brand → Design System.** Product owns interaction patterns + component behavior; Brand owns visual tokens + voice; the design system is the shared artifact.
- **Product × Brand → Developer Experience.** Product owns SDK + API docs; Brand owns the developer-facing voice + dev portal aesthetic.
- **Product × Business → Analytics.** Product owns instrumentation + event taxonomy; Business owns metric definitions + dashboards.
- **Product × Business → Customer Success.** Product owns onboarding flows + in-product feedback; Business owns support runbooks + customer success ops.
- **Product × Business → Pricing-as-Product.** Product owns paywalls + plan-gate UX; Business owns pricing tiers + commercial strategy.
- **Product × Brand + Business → Trust & Safety.** Product owns moderation tooling; Brand owns community standards; Business owns legal posture.

---

## Methodology mechanisms that touch Product

- **Skills:** `product-pillar` (auto-loads on Product work), `software-product` / `content-product` / `service-product` / `hardware-product` (per-type guidance), `articulation-closure` (the Product-pillar deliverable matrix's gating), `build-roadmap`, `version-identity`.
- **Hooks:** `pre-deploy` (gates on articulation-closure verification), `post-tool-use` (timestamp on compiled-artifact edits), `session-start` (read SESSION_LOG before any code work).
- **Selective slash commands:** `/articulation-close` (runs the closure gate), `/discover-deliverables` (gap discovery for Tier 3 candidates), `/spec` (begins spec stack authoring).

---

## Related per-role files

- [[../roles/ceo|CEO]] — cross-pillar lead who sets Product direction
- *To author:* [[../roles/cto|CTO]] — Product pillar lead
- *To author:* VP Engineering, Designer, PM, QA roles as methodology mechanisms need them as context

---

## Status

- **2026-05-14:** Initial authoring. Software product type developed; other product types listed but Tier 2 deliverables not yet detailed exhaustively. CTO role file queued.
