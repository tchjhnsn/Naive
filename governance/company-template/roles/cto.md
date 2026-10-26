---
type: company-template-role
ai-model: claude
role: cto
primary-pillar: product
secondary-pillars: [business]
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [company-template, role, cto, executive, product-pillar-lead, 2026-05-14]
canonical-for: "cto-role-reference"
related:
  - "[[governance/company-template/index]]"
  - "[[governance/company-template/pillars/product]]"
  - "[[governance/company-template/roles/ceo]]"
---

# CTO — Chief Technology Officer

> **Purpose:** Product pillar lead. Sets technical direction for the company's product(s); hires + manages the engineering organization; owns the architecture and the technical risk posture.

---

## Primary pillar + secondary pillars

- **Primary pillar:** Product. The CTO is the Product pillar's executive owner.
- **Secondary pillars:** Business (technical due diligence in fundraising; tech-side of partnerships; security + compliance posture).

---

## Typical responsibilities

### Technical direction
- Sets the technical vision for the product(s)
- Chooses the major technology stack decisions (language, framework, hosting, data, AI)
- Owns the architectural review of significant changes
- Reviews + ratifies spec stack at Phase 1B-Final + Articulation Closure
- Final escalation for technical decisions across the engineering organization

### Engineering organization
- Hires VP Engineering, Tech Leads, senior engineers, key specialists
- Sets the engineering culture (code review norms, testing posture, on-call expectations)
- Owns the engineering roadmap (in partnership with PM organization)
- Owns the engineering team's compensation + leveling structure
- Resolves cross-team technical conflicts

### Risk + reliability
- Owns the technical risk posture (what we can ship; what we can't)
- Reviews incident response postmortems for systemic issues
- Sets the reliability targets (SLO, error budgets)
- Owns the security posture (in partnership with Security Engineer / VP Security when present)

### External
- Often the public face of the engineering organization (blog posts, conferences, hiring brand)
- Technical interface with key partners + customers
- Technical due diligence partner in fundraising

---

## Typical deliverables

The CTO sponsors many deliverables that the engineering organization authors. Direct authorship is rare; review + sponsorship is constant.

- **Technical strategy document** — multi-year technical direction; updated annually
- **Architecture decision records (ADRs)** — for significant architectural choices
- **Spec stack reviews** — sign-off on VISION_SPEC, VERSION_SPEC, PRODUCT_SPEC, DATA_MODEL_SPEC, IMPL_SPEC, BEHAVIORAL_SPEC, VERIFICATION_SPEC
- **Articulation closure reviews** — sign-off that articulation is closed before Phase 2 begins
- **Engineering org plan** — team structure, headcount, reporting lines
- **On-call + incident response runbooks** — sponsored, often authored by SRE / VP Eng
- **Security policy** — application security + data handling posture
- **Tech-debt + reliability prioritization** — quarterly review of what gets prioritized vs. deferred
- **Open-source policy** — what code can be open-sourced, under what licenses, with what review

---

## Reporting + collaboration patterns

### Reports to
- [[ceo|CEO]]

### Reports to the CTO
- VP Engineering (most often)
- Direct reports may include: senior managers, principal/distinguished engineers, security lead, SRE lead
- The shape varies enormously by company size

### Collaborates with
- **PM organization** — joint ownership of roadmap (CTO: technical feasibility + sequence; PM: product priority)
- **Design organization** — joint ownership of product surfaces (CTO: what's buildable; Design: what should be built)
- **CMO / Brand pillar lead** — when product changes affect brand surfaces (developer portal, dev docs)
- **COO / Business pillar lead** — security, compliance, ops + procurement decisions
- **Co-founders + CEO** — strategic technical direction
- **Board** — technical due diligence, especially in fundraising or M&A

---

## Stage variations

### Pre-product / founder stage
- The technical co-founder IS the CTO + VP Eng + Senior Engineer + DevOps + SRE
- No formal org; the work is "build the prototype"
- Title is often "Co-Founder, CTO" or "Co-Founder & Engineering"
- Strategic decisions are de facto unanimous between founders

### Early-stage (post-launch, pre-PMF)
- CTO actively hiring first engineers
- Still doing significant IC work
- First hires often: senior generalist eng, then specialists (frontend, infra)
- Spec stack may be lightweight; full spec discipline matures as the team grows
- Articulation closure discipline starts here — V1 ship's clean articulation is the foundation for V2

### Growth-stage (post-PMF, scaling)
- CTO hires VP Engineering; shifts from individual contribution to organizational leadership
- Engineering org structures into teams (per product area, per platform, per function)
- Spec stack is mature; SAD-style methodology (or equivalent) is in place
- Articulation closure is a non-negotiable phase per [[../../skills/articulation-closure/SKILL]]

### Mature-stage
- CTO is mostly strategic + external + capital
- Engineering runs through VP Eng + EMs
- CTO's biggest leverage points: VP-level hiring, architectural calls, security posture
- Significant time on company-wide infrastructure decisions, M&A technical diligence

---

## Methodology mechanisms that touch the CTO role

### Skills
- **`cto-role` skill** (to author) — auto-loads on technical leadership work, spec stack reviews, articulation closure sign-offs. Provides context on CTO responsibilities + decision authority.
- **`product-pillar` skill** (to author) — auto-loads on Product-pillar work; CTO is the pillar lead so this skill's guidance speaks to CTO concerns by default.
- **`articulation-closure` skill** ([[../../skills/articulation-closure/SKILL|existing]]) — invoked at Phase 1B-Final boundary; CTO sign-off is implicit in the closure gate.

### Hooks
- **`pre-deploy` hook** — gates on articulation closure verification table being green; in many orgs this maps to "CTO has signed off."
- **`post-incident` hook** (to author) — triggers postmortem template authoring after significant incidents; CTO reviews systemic patterns.

### Selective slash commands
- **`/cto-review`** (candidate) — gstack-parallel command. Reads this file + the project's spec stack + articulation closure inventory; produces a CTO-perspective review (technical risk, architectural concerns, spec stack consistency, articulation closure readiness).

---

## What the CTO is NOT responsible for

- **Product strategy / vision.** That's CEO (with PM organization input). CTO contributes technical feasibility and architectural framing but doesn't own product direction.
- **Brand identity.** That's CMO / Brand pillar lead. CTO consumes Brand identity via the design system import discipline; doesn't define it.
- **Business model + pricing.** That's COO / CFO. CTO contributes commercial-technical inputs (infrastructure cost model, scaling cost curves) but doesn't own pricing.
- **Day-to-day code review.** That's the team's senior engineers + tech leads. CTO reviews architectural changes; not every PR.
- **People management of every engineer.** That's the EM cascade. CTO manages direct reports + sets organizational culture; not every IC.

---

## Status

- **2026-05-14:** Initial authoring. Skills + commands listed as candidates but not yet authored. Will refine as methodology mechanisms accumulate.
