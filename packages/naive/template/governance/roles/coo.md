---
type: venture-template-role
ai-model: claude
role: coo
primary-pillar: business
secondary-pillars: [product, brand]
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, role, coo, executive, business-pillar-lead, 2026-05-14]
canonical-for: "coo-role-reference"
related:
  - "[[packages/naive/template/governance/index]]"
  - "[[packages/naive/template/governance/pillars/business]]"
  - "[[packages/naive/template/governance/roles/ceo]]"
---

# COO — Chief Operating Officer

> **Purpose:** Business pillar lead. Owns the commercial + operational machinery that keeps the company running — operations, finance (often), sales coordination, people, legal posture, vendor management, internal tooling. The most variable C-level role; scope depends heavily on what other C-level roles exist (CFO, CRO, CPO, GC).

---

## Primary pillar + secondary pillars

- **Primary pillar:** Business. The COO is the Business pillar's executive owner.
- **Secondary pillars:** Product (analytics + customer success + trust & safety overlap zones), Brand (sales collateral + PR-for-business overlap zones).

The COO's scope is the widest of any single-pillar lead because Business itself is the widest pillar in scope.

---

## Typical responsibilities

### Operations
- Internal tooling (CRM, ATS, finance tools, security, IT)
- Vendor management + procurement
- Office / remote operations
- Cross-functional process design (planning cycle, OKR cadence, all-hands cadence)
- Operational risk management (continuity, escalation paths, vendor SLAs)

### People (when no CPO)
- Hiring processes + ATS administration
- Onboarding + orientation
- Performance management cycle
- Compensation strategy (with CFO partnership)
- Culture programs

### Finance (when no CFO)
- Bookkeeping + financial reporting
- Budgeting + forecasting
- Vendor + payroll + tax administration
- Fundraising operational support (data room, diligence response)

### Commercial / Sales (when no CRO)
- Sales motion oversight (with VP Sales running day-to-day)
- Sales operations (CRM, pipeline review, forecast)
- Pricing strategy (with CEO + CFO partnership)
- Partnership / BD oversight

### Legal posture (when no GC)
- Contract review (often outsourced to outside counsel)
- IP + trademark + privacy + ToS
- Regulatory compliance posture
- Employment law posture

### Customer Success (often)
- Customer success ops (with VP CS running day-to-day)
- Retention + expansion programs
- Support runbook ownership

### Trust & Safety policy (often)
- Policy authoring (with Product owning tooling + Brand owning community standards)
- Escalation paths for T&S incidents

---

## Typical deliverables

The COO sponsors a very wide range of deliverables. Direct authorship is uncommon; review + sponsorship is constant.

- **Operating plan** — annual + quarterly plan covering org cadences, planning cycles, OKRs
- **Financial model** (when no CFO) — revenue forecast, burn, runway
- **Sales playbooks** (when no CRO) — per-segment + per-stage sales motion
- **People processes** (when no CPO) — hiring rubric, onboarding, performance, comp
- **Operational runbooks** — every recurring ops task (deploy, incident, on-call, escalation, vendor management)
- **Vendor inventory + SLAs**
- **Legal posture document** — ToS, privacy policy, IP policy, employment policy
- **Trust & Safety policy** — community standards + enforcement procedures (with Brand on standards, Product on tooling)
- **Board materials** (with CEO) — board deck + financial supplements
- **Investor reporting** — monthly / quarterly update emails to investors
- **Customer success programs** — onboarding flows + support runbooks (with VP CS)
- **Business-pillar product specs** — for any Business-pillar products (partnership programs, training certifications, etc.)
- **Metrics framework** — what the company measures + how (with Product on instrumentation)

---

## Reporting + collaboration patterns

### Reports to
- [[ceo|CEO]]

### Reports to the COO
- VP Operations
- Head of People (when no CPO)
- Head of Finance / Controller (when no CFO)
- VP Sales (when no CRO)
- VP BD
- Head of Customer Success
- Head of Trust & Safety
- General Counsel may report to COO or directly to CEO (varies)
- Office Manager / Ops Coordinator

### Collaborates with
- **[[cto|CTO]] / Product pillar lead** — security, customer success, trust & safety, analytics + metrics infra
- **[[cmo|CMO]] / Brand pillar lead** — sales collateral, partnership materials, PR-for-business, T&S community standards
- **CEO** — strategic planning, board governance, fundraising
- **Board** — financial reporting, operational review (especially with CFO present)
- **External counsel** — contracts, regulatory, IP

---

## Stage variations

### Pre-product / founder stage
- "COO" usually doesn't exist as a title; a founder plays operations + finance + sales + legal + everything
- The work is "keep the company alive" — pay bills, register the entity, sign contracts, hire the first people
- Operations are extremely lightweight; most processes are ad-hoc

### Early-stage (post-launch, pre-PMF)
- First operational hires (often a founder's first non-product hire)
- Title may be "Head of Operations" or "Chief of Staff" before formal COO
- Light ops runbooks; financial reporting is basic; legal is outsourced
- First customer success + first sales hires
- Major work: building the operational foundation that will support growth

### Growth-stage (post-PMF, scaling)
- Formal COO hire is typical here when operational scope exceeds founder + light-ops bandwidth
- Specialized C-level roles (CFO, CRO, CPO, GC) start emerging — each carving out a slice of what COO used to own
- COO's scope narrows as specialists are hired but remains the broadest single role
- Process discipline solidifies (planning cycle, OKR cadence, board rhythms)

### Mature-stage
- COO is mostly strategic + executive + cross-functional
- Functional VPs run their domains (Sales, People, Finance, Legal, Ops)
- COO's biggest leverage: cross-functional coordination, operational risk, M&A execution
- Significant time on company-wide operational health + scaling-bottleneck identification

---

## Methodology mechanisms that touch the COO role

### Skills
- **`coo-role` skill** (to author) — auto-loads on operational planning, vendor decisions, cross-functional process work.
- **`business-pillar` skill** (to author) — auto-loads on Business-pillar work; COO is the pillar lead.
- **`metrics-review` skill** ([[../../skills/build-roadmap/SKILL|see also build-roadmap]] for overlap) — invoked at metrics review cycles.

### Hooks
- **`pre-deploy` hook** — gates on Business deliverables that are deploy-blocking (ToS, privacy policy, app-store listing readiness).
- **`pre-commit` hook** — surfaces business-load-bearing files (legal docs, contracts) for explicit confirmation.

### Selective slash commands
- **`/coo-review`** (candidate) — reads this file + the project's business-pillar deliverables; produces a COO-perspective review (operational readiness, legal posture, commercial readiness).
- **`/metrics-review`** (candidate) — runs metrics review against current state.
- **`/stakeholder-update`** (candidate) — composes a stakeholder update from project state.

---

## What the COO is NOT responsible for

- **Product direction.** That's CEO + CTO. COO contributes operational + commercial constraints.
- **Technical architecture.** That's CTO.
- **Brand identity.** That's CMO. COO consumes brand assets via marketing + sales collateral; doesn't define them.
- **Engineering execution.** That's CTO + VP Eng.
- **Marketing execution.** That's CMO + VP Marketing.
- **The product itself.** That's Product pillar.

The COO's job is to make everything *else* work so the pillars can focus on their primary work.

---

## Status

- **2026-05-14:** Initial authoring. Skills + commands listed as candidates but not yet authored.
