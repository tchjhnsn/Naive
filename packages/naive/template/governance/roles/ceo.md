---
type: venture-template-role
ai-model: claude
role: ceo
primary-pillar: company-wide
secondary-pillars: [product, brand, business]
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, role, ceo, executive, cross-pillar, 2026-05-14]
canonical-for: "ceo-role-reference"
related:
  - "[[packages/naive/template/governance/index]]"
  - "[[packages/naive/template/governance/roles/README]]"
---

# CEO — Chief Executive

> **Purpose:** Cross-pillar lead. Sets direction across Product, Brand, and Business; makes the highest-stakes calls; hires + manages the pillar leads; represents the company externally.

---

## Primary pillar + secondary pillars

- **Primary pillar:** Company-wide. The CEO doesn't sit under any one pillar; the CEO orchestrates across all three.
- **Secondary pillars:** Product, Brand, Business (all of them — the CEO has equity in each).

This is structurally distinct from pillar leads (CTO, CMO, COO), who sit *under* their pillar. The CEO sits *above*.

---

## Typical responsibilities

### Strategy + direction
- Sets the company's mission, vision, and values
- Decides which versions to ship, in what order
- Makes the cross-pillar tradeoff calls (e.g., "we're slowing Product to invest in Brand for this quarter")
- Owns the annual planning cycle + OKRs
- Owns the strategic narrative the company tells itself and the world

### People
- Hires the pillar leads (CTO, CMO, COO, etc.)
- Manages pillar leads' performance + compensation
- Owns the cultural tone of the company
- Final escalation for any cross-pillar people issue

### External
- Primary face to investors + board
- Primary face to press + analysts (for substantive moments)
- Primary face to top-tier partners + customers
- Owns the company's external narrative (often in partnership with CMO / Brand pillar)

### Capital
- Owns fundraising (with CFO support)
- Owns the relationship with investors + board
- Sets capital allocation across pillars

### Crisis
- Final escalation for incident response (when the incident is company-existential)
- Final escalation for legal + regulatory crises
- Decision-maker for company-existential pivots, sunsets, or sales

---

## Typical deliverables

The CEO sponsors many deliverables that other roles author. The CEO is the *accountable owner*, even when not the author.

- **Mission, Vision, Values** — often in a `company/mvv.md` or equivalent
- **Strategic plan** — annual, often quarterly-updated
- **OKRs** — company-level OKRs cascading to pillar OKRs
- **Board materials** — board decks, update emails, in-person presentations
- **All-hands narrative** — the story the CEO tells the company every all-hands
- **Fundraising materials** — pitch deck, data room, investor narrative (with CFO + CMO support)
- **Press + analyst briefings** — major narrative arcs the CEO personally delivers
- **Cross-pillar tradeoff decisions** — captured as decision memos when the call is large enough
- **Hiring rubric** — for the company overall + for executive roles
- **Compensation philosophy** — overlap with CPO when present; CEO owns when not

---

## Reporting + collaboration patterns

### Reports to
- **The board** — the CEO's only formal reporting line in most companies
- (Pre-board) the cap table / lead investors

### Reports to the CEO
- All pillar leads (CTO, CMO, COO, CFO, GC, CRO, CPO, etc.)
- Chief of Staff (where present)
- Direct ICs the CEO works closely with (executive assistant, sometimes a strategy lead)

### Collaborates with
- **Co-founders** — peer relationship, not reporting. Often the most important collaboration.
- **Investors / board members** — outside formal reporting, deep collaboration
- **Advisors** — domain-specific guidance
- **Customer / partner executives** — peer-to-peer external relationships

---

## Stage variations

### Pre-product / founder stage
- "CEO" is often a courtesy title — the founder plays CEO + CTO + CMO + COO simultaneously
- Deliverables are minimal; the work is product + capital
- The CEO role is mostly external (raising, recruiting, narrative-building)

### Early-stage (post-launch, pre-PMF)
- CEO actively hiring pillar leads (CTO first, often; then either CMO or COO depending on the company)
- Still doing significant pillar-lead work directly
- Board forming (or formed); board meetings start
- Strategic plan starts to take real shape

### Growth-stage (post-PMF, scaling)
- CEO has formal pillar leads in place
- CEO's job shifts from doing pillar work to orchestrating pillar leads
- Significant time on fundraising + investor relations
- Significant time on company-wide processes (planning, comp, hiring)

### Mature-stage
- CEO is mostly external + capital + strategic
- Pillar leads run their pillars with high autonomy
- CEO's biggest leverage points are pillar-lead hiring + cross-pillar tradeoffs
- Significant time on board governance + (potentially) IPO / M&A readiness

---

## Methodology mechanisms that touch the CEO role

### Skills
- **`ceo-role` skill** (to author) — auto-loads on cross-pillar decisions, strategic-plan work, board-materials authoring. Provides context on what a CEO is responsible for + how to think about cross-pillar tradeoffs.
- **`cross-pillar-tradeoff` skill** (to author) — auto-loads when the conversation surfaces a cross-pillar tradeoff. Frames it as a CEO-level decision.

### Hooks
- **None specific to CEO role.** CEO-level decisions are conversation-driven; no lifecycle event triggers them.

### Selective slash commands
- **`/ceo-review`** (candidate) — gstack-parallel command. Reads this file as context; reviews current project state from a CEO perspective (mission/strategy alignment, cross-pillar coordination, capital allocation, external readiness). Best surfaced as a button in the per-project orchestration HTML.
- **`/strategic-plan`** (candidate) — drafts or updates a company strategic plan based on current state.

---

## What the CEO is NOT responsible for

The CEO role is broad but not unlimited. To preserve the pillar lead model:

- **Day-to-day Product execution.** That's the CTO's job. The CEO sets direction and reviews progress; the CTO runs the team.
- **Day-to-day Brand execution.** That's the CMO's job.
- **Day-to-day Business operations.** That's the COO's (or CFO/CRO/CPO's, depending on split).
- **Technical architecture decisions.** Even if the CEO is technical, architecture decisions are the CTO's domain. The CEO sets product direction; the CTO decides how to build.

When a CEO *does* directly own pillar-lead work (early-stage; pillar lead vacancy), that's a temporary state — the CEO is filling a role until the pillar lead is hired.

---

## Status

- **2026-05-14:** Initial authoring. Skills + commands listed as candidates but not yet authored. Will refine as methodology mechanisms accumulate.
