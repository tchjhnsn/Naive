---
type: knowledge
tags: [everything-ecosystem, skills, software-product]
ai-model: claude
created: 2026-05-31
source: hybrid
name: software-product
description: >
  Provide context for software product work — the Tier 2 deliverables that
  apply specifically to software products (web app, mobile app, API/SDK, CLI,
  library, platform). Most developed product-type in SAD because the methodology
  was originally authored here. Auto-loads when a project's product-type is
  software (any sub-type). References company-template/pillars/product.md.
  Per SAD v3.3+ amendment §33 + product pillar's Tier 2 inventory.
  MANDATORY TRIGGERS: software product, web app, mobile app, API, SDK, CLI,
  library, platform, code, schema, data model, spec stack, deploy workflow,
  CI/CD, technical implementation, software architecture.
---

# Software Product Skill

The Tier 2 deliverable context for software products. Auto-loads when a project's product-type is software (any sub-type: web app, mobile app, API/SDK, CLI, library, platform).

## What this skill provides

Software is the most-developed product-type in SAD. The Tier 2 deliverable set is substantial:

### Spec stack (Tier 2, applies to every software product)

- **DATA_MODEL_SPEC** — entities, relationships, invariants
- **IMPL_SPEC** — implementation choices (framework, runtime, hosting, data layer)
- **BEHAVIORAL_SPEC** — state machines, error handling, edge cases
- **VERIFICATION_SPEC** — test plan + acceptance criteria
- **API / Communication Contract** — OpenAPI 3.x and/or AsyncAPI and/or MCP tool
  schemas for every client–server or client–agent boundary in the next build
  slice; auth, errors, versioning, fixtures. Industry: API-first / contract-first.
  Mandatory Tier A assets before Phase 2 coding of that slice (or recorded
  deferral). See [[../contract-first/SKILL|contract-first]]. Lives at
  `docs/api/` or `packages/api-contract/` after bootstrap; vault
  `<entity>/product/spec/api/` pre-repo.
- **Feature × Implementation matrix** — feature-first inventory mapping each feature to build-vs-buy + the implementing technology/vendor (industry: a *feature matrix* with a *tech-stack* column). The product-facing cross-cut of IMPL_SPEC §stack/§endpoints; lives in PRODUCT_SPEC or IMPL_SPEC.
- **PHASE_1B_FINAL_REVIEW** — cross-spec consistency review

### Architecture decisions (Tier 2, as contested choices arise)

- **Architecture Decision Records (ADRs)** — one per *contested* technical decision (a choice with multiple viable vendors/approaches that is costly to reverse or will be questioned later). Each ADR states the context, the **options considered (including rejected)**, a **decision matrix** scoring them against weighted criteria, the decision, and consequences. Uses the `architecture-spec` note type; lives at `<entity>/product/spec/adr/ADR-NNN-<slug>.md` and is linked from the matching Feature × Implementation matrix row. Write one only when the choice is genuinely contested — not per feature.

### UX / UI deliverables

- **Sitemap** + URL structure
- **Information architecture** — entity model → user taxonomy
- **UX flows** (one per F-flow named in PRODUCT_SPEC)
- **Microcopy** + states (empty / loading / error)
- **Accessibility checklist**
- **Responsive breakpoints**
- **Wireframes** (per substantive page)
- **Component library catalogue**

### Implementation deliverables

- **Repo code** (the canonical source-of-truth, lives at `<repos>/<repo>/`)
- **Migrations**
- **Tests** (unit / integration / E2E)
- **Deploy workflow** (CI/CD config)
- **Operational runbooks** (deploy, incident, on-call)
- **Code pointer** (`<entity>/product/code/pointer.md`)

### Articulation closure deliverables

- **Articulation closure inventory** (master tracking artifact)
- **Cross-spec gap audit** (three-direction audit per §1C amendment)
- **Verification test plan** (§9-style, functional completion conditions)

## Sub-type specializations

Different software sub-types have additional or different deliverables:

### Web app

- **SEO strategy** — meta tags, sitemap.xml, robots.txt, schema.org markup
- **Analytics + instrumentation** (overlap with Business pillar)
- **OG / share assets** — favicon, OG image, share cards (overlap with Brand)

### Mobile app

- **App store metadata** — copy, screenshots, preview videos (overlap with Brand + Business)
- **Platform-specific UX patterns** (iOS Human Interface Guidelines / Material Design)
- **Push notification strategy**
- **App store review compliance**

### API / SDK

- **Authentication model** + API key management
- **API reference documentation** (developer-facing)
- **SDK packaging** + versioning
- **Backwards compatibility policy**
- **Rate limiting + quota policy**
- **Example apps** demonstrating usage
- **Developer portal** (overlap with Brand on DevEx aesthetic)

### CLI tool

- **Install + uninstall flows**
- **Package manager strategy** (npm, brew, apt, etc.)
- **Help text / man page**
- **Shell completion scripts**

### Library

- **Semantic versioning policy**
- **Contributor docs** + CONTRIBUTING.md
- **Example apps** demonstrating consumption
- **License decision**

### Platform (multi-tenant)

- **Governance + isolation model** — tenant boundaries
- **Tenancy + admin docs**
- **Plan / tier structure** (overlap with Business)
- **Migration / onboarding flows**

## What this skill emphasizes

When loaded, the AI should keep in mind:

1. **The spec stack is non-optional for software at venture or enterprise ambition tier.** Hobby + side-project tiers can skip parts; the spec stack is the discipline.
2. **Articulation closure is non-optional before Phase 2 begins.** Per [[../articulation-closure/SKILL|articulation-closure skill]], the closure inventory + cross-spec gap audit gate Phase 2.
3. **Communication contracts are non-optional for networked slices.** Per [[../contract-first/SKILL|contract-first]], Tier A OpenAPI/AsyncAPI/MCP assets (or recorded deferrals) gate Phase 2 coding of client–server boundaries. Backend-leading implementation is fine; backend-without-contract is not. Mid-build projects use [[../_patterns/gate-backfill|gate-backfill]] via contract-first.
4. **The deploy workflow is bootstrap-phase (Phase 2.1), not afterthought.** Per the v3.0.1 amendment (real-run discipline + local-dev-parity-by-bootstrap), the deploy workflow + local preview environment go up at bootstrap, not at first deploy. If preview/smoke is missing mid-project, backfill before the next external-integration change (see phase-closure amendment).
5. **Brand assets are imported, not duplicated.** Design system imports from Brand pillar. Watch for drift.
6. **Missing Tier 2 assets mid-build** — inventory against this skill's list *and* the entity's Asset Requirement Set; apply [[../_patterns/gate-backfill|gate-backfill]]; put lines on the build roadmap; do not silently expand scope while foundational stubs are absent.
7. **Characteristic packs are part of software Tier 2.** A software product that declares C-03 (data platform), C-05 (agents), C-06 (private records), C-09 (directory), C-10 (action routing), or C-12 (high-trust) inherits those packs from [[../../CANONICAL_ASSET_REGISTRY|CANONICAL_ASSET_REGISTRY]]. Derive via [[../asset-requirements/SKILL|asset-requirements]]; do not invent a parallel list.

## Relationship to other skills

- [[../product-pillar/SKILL|product-pillar]] — auto-loads alongside this skill
- [[../articulation-closure/SKILL|articulation-closure]] — software products run articulation closure rigorously
- [[../contract-first/SKILL|contract-first]] — API/communication contracts before networked slice coding
- [[../asset-requirements/SKILL|asset-requirements]] — derives the full required set from system characteristics
- [[../_patterns/gate-backfill|gate-backfill]] — shared mid-build recovery pattern for gate skills
- [[../build-roadmap/SKILL|build-roadmap]] — software's build roadmap is the most-developed pattern
- [[../template-generation/SKILL|template-generation]] — generates software-product Tier 2 stubs at project start

## Status

- **2026-05-14:** Initial authoring.
- **2026-07-26:** API / Communication Contract + contract-first gate added (SAD amendment 2026-07-26). Mid-build missing-asset / backfill pointer added.
- **2026-07-26:** Characteristic packs + asset-requirements linked (SAD amendment 2026-07-26 asset-requirements-method).