---
type: venture-template-role
ai-model: claude
role: cmo
primary-pillar: brand
secondary-pillars: [business]
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, role, cmo, executive, brand-pillar-lead, 2026-05-14]
canonical-for: "cmo-role-reference"
related:
  - "[[packages/naive/template/governance/index]]"
  - "[[packages/naive/template/governance/pillars/brand]]"
  - "[[packages/naive/template/governance/roles/ceo]]"
---

# CMO — Chief Marketing Officer

> **Purpose:** Brand pillar lead. Owns the company's identity, narrative, and how the company shows up in the world. Sponsors the brand expressions (marketing, content, community, PR, brand-led products) that connect the company to its audience.

Some companies use "Chief Brand Officer," "Chief Creative Officer," or simply "Head of Marketing" for what is structurally the CMO role. The title varies; the responsibility is consistent: own how the company shows up.

---

## Primary pillar + secondary pillars

- **Primary pillar:** Brand. The CMO is the Brand pillar's executive owner.
- **Secondary pillars:** Business (marketing as commercial growth; sales collateral; partnership-marketing; PR-for-business).

---

## Typical responsibilities

### Brand direction
- Owns brand identity (in partnership with creative direction): visual + verbal identity, narrative, voice
- Owns brand evolution across product versions (foreshadowing discipline, version-identities)
- Owns brand consistency across surfaces (web, app, marketing, PR, partner materials)
- Final escalation for brand decisions

### Marketing organization
- Hires VP Marketing, Brand Director, Content Lead, Community Lead, PR Lead
- Sets marketing strategy (positioning, segmentation, channels)
- Owns the marketing budget allocation
- Owns the marketing org's compensation + structure

### External narrative
- Primary owner of the company's external narrative (with CEO partnership)
- Owns major narrative arcs (launch narratives, repositioning, milestone framing)
- Owns press strategy (with CEO partnership for substantive interviews)
- Owns analyst relations (when applicable)

### Audience + market
- Owns audience definition + segmentation
- Owns market positioning (where the company sits in its competitive landscape)
- Owns customer / audience research (often shared with Product)
- Owns the company's relationship with its community + earliest adopters

---

## Typical deliverables

The CMO sponsors many deliverables; direct authorship varies by company size.

- **Brand strategy document** — multi-year brand direction; positioning, audience, voice; updated annually
- **Brand guidelines** — visual + verbal identity rules; exportable to partners + vendors
- **Brand identity** ([[../pillars/brand|see Brand pillar Tier 1]]) — canonical for visual identity
- **Brand voice** — canonical for verbal identity
- **Marketing plan** — annual + quarterly marketing strategy
- **Campaign briefs** — for major brand campaigns
- **Narrative arc documents** — launch narratives, milestone framing
- **Press strategy** — annual press calendar + reactive playbook
- **Foreshadowing audit** (per [[../../skills/version-identity/SKILL|version-identity skill]]) — V[N] → V[N+1] persona evolution
- **Community programs** — when community is brand-led
- **Brand-pillar product specs** — for any Brand-pillar products (podcast, events, etc.)

---

## Reporting + collaboration patterns

### Reports to
- [[ceo|CEO]]

### Reports to the CMO
- VP Marketing (most often)
- Brand Director
- Creative Director
- Content Lead / VP Content
- Communications Director
- Community Lead / VP Community
- PR Lead

### Collaborates with
- **[[cto|CTO]] / Product pillar lead** — design system imports (Brand → Product); developer-facing brand consistency
- **[[coo|COO]] / Business pillar lead** — sales collateral; partnership marketing; commercial campaign coordination
- **CEO** — strategic narrative + major external moments
- **PM organization** — product launches, messaging, value-prop alignment
- **Design organization** — brand designers report up through Marketing; product designers report up through Product; design system is the shared artifact

---

## Stage variations

### Pre-product / founder stage
- "CMO" usually doesn't exist as a title; a founder plays the marketing role
- Brand identity is hypothesis-level (one logo, one voice sample)
- The work is positioning + initial narrative
- Major decisions: name, primary brand colors, voice register hypothesis

### Early-stage (post-launch, pre-PMF)
- First marketing hires (often a single Marketing Lead or VP Marketing before formal CMO)
- Brand identity solidifies; first published brand guidelines
- Launch campaigns; first PR
- Audience definition gets sharpened by real-customer feedback

### Growth-stage (post-PMF, scaling)
- CMO hire is typical here (when marketing scope outgrows founder bandwidth)
- Marketing org structures (acquisition, content, brand, community, PR)
- Brand becomes load-bearing: V[N] → V[N+1] foreshadowing discipline kicks in
- First Brand-pillar products may emerge (newsletter, podcast, conference)

### Mature-stage
- CMO is mostly strategic + external + executive
- Marketing runs through VP Marketing + functional leads
- CMO's biggest leverage points: major narrative arcs, brand-pillar product strategy, executive comms
- Significant time on long-arc brand evolution (5+ year horizons)

---

## Methodology mechanisms that touch the CMO role

### Skills
- **`cmo-role` skill** (to author) — auto-loads on brand strategy work, narrative authoring, foreshadowing audits.
- **`brand-pillar` skill** (to author) — auto-loads on Brand-pillar work; CMO is the pillar lead.
- **`version-identity` skill** ([[../../skills/version-identity/SKILL|existing]]) — invoked when authoring version-identities for a new version's persona; CMO is the natural sponsor.
- **`foreshadowing-audit` skill** (to author) — V[N] → V[N+1] persona-evolution check; CMO-sponsored.

### Hooks
- **`pre-commit` hook** — brand-load-bearing files (wordmark, brand tokens, voice copy) surfaced for explicit confirmation. CMO awareness when brand-load-bearing files ship.
- **`pre-deploy` hook** — gates on brand assets being present + correctly loaded (per the v3.2 amendment about explicit font loading).

### Selective slash commands
- **`/cmo-review`** (candidate) — reads this file + the project's brand identity + voice + foreshadowing inventory; produces a CMO-perspective review.
- **`/foreshadowing-audit`** (candidate) — runs the V[N] → V[N+1] check on demand.

---

## What the CMO is NOT responsible for

- **Product direction.** That's CEO + CTO + PM organization. CMO contributes positioning + audience input; doesn't own what to build.
- **Sales execution.** That's the CRO / VP Sales. CMO provides collateral + positioning; doesn't run the sales motion day-to-day.
- **Pricing strategy.** That's COO / CFO + CEO. CMO contributes positioning input (what the brand can charge for); doesn't own pricing.
- **Engineering execution.** That's CTO. CMO consumes Product surfaces via brand consistency review; doesn't build them.
- **Day-to-day social posts.** That's the team's social media manager. CMO sets voice + strategy; not every post.

---

## Status

- **2026-05-14:** Initial authoring. Skills + commands listed as candidates but not yet authored.
