---
type: venture-template-role
ai-model: claude
role: chief-of-staff
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
tags: [venture-template, role, chief-of-staff, cross-pillar-orchestrator, 2026-05-14]
canonical-for: "chief-of-staff-role-reference"
related:
  - "[[governance/venture-template/index]]"
  - "[[governance/venture-template/roles/ceo]]"
---

# Chief of Staff

> **Purpose:** The CEO's force multiplier. A cross-pillar orchestrator who handles the work the CEO would do if they had more bandwidth — strategic projects, executive operations, cross-functional coordination, sensitive communications.

---

## Primary pillar + secondary pillars

- **Primary pillar:** Company-wide. The Chief of Staff doesn't sit under any pillar; like the CEO, they orchestrate across all three.
- **Secondary pillars:** Whatever the CEO is most focused on at the moment — often all three, with rotating emphasis.

---

## Typical responsibilities

The Chief of Staff role is highly variable; the responsibilities depend on what the CEO most needs amplified. Common patterns:

### Executive operations
- Owning the CEO's planning cadence (annual, quarterly, weekly)
- Running staff meetings / executive operations
- Owning OKR rollout + tracking
- Preparing CEO for board meetings, all-hands, major customer calls
- Managing the CEO's calendar strategy (not booking — strategic prioritization)

### Cross-functional projects
- Owning projects that span pillars and don't have a natural owner
- Driving initiatives the CEO sponsors but doesn't have time to run personally
- Coordinating across executive team members on cross-pillar tradeoffs
- Often: M&A diligence, strategic partnerships, major hiring sprints

### Communications + narrative
- Drafting CEO communications (internal + external)
- Owning the all-hands cadence + format
- Coordinating exec team comms
- Internal narrative consistency

### Information flow
- Ensuring the CEO has the information they need to make decisions
- Synthesizing reports from pillar leads
- Surfacing patterns + issues that aren't visible to any single pillar lead
- "Translator" between exec team members when communication is sub-optimal

### Special projects
- Whatever the CEO needs done that isn't covered by an existing role

---

## Typical deliverables

Chief of Staff deliverables vary, but common ones:

- **Operating cadence document** — how the company runs (meeting schedules, OKR cadence, planning cycle)
- **Executive team operating model** — how the exec team works together
- **Board meeting prep package** — the materials the board needs for each meeting
- **All-hands deck + script** — recurring authoring
- **OKR rollout + tracking** — quarterly OKR cycle outputs
- **Strategic project plans** — for whatever cross-pillar projects the role is currently running
- **Decision memos** — capturing significant CEO decisions for the record
- **Synthesis reports** — pulling insights across pillars for CEO consumption

---

## Reporting + collaboration patterns

### Reports to
- [[ceo|CEO]] (the role exists to serve the CEO directly)

### Reports to the Chief of Staff
- Often no direct reports
- Sometimes: executive assistant, internal comms manager, OKR program manager
- Occasionally: a small "office of the CEO" team

### Collaborates with
- **CEO** (most important — daily collaboration)
- **All pillar leads** (peer-ish; the role has CEO authority by extension but no formal authority over pillar leads)
- **Board** (often the primary information conduit between board + CEO between meetings)
- **Senior leadership team** (across all pillars)

---

## Stage variations

### Pre-CoS-role
- Most companies don't have a Chief of Staff until at least Series B / 50-100 person scale
- Before then: the CEO does CoS work directly OR a senior leader plays CoS-flavored work part-time

### Early CoS role
- Often the role is "Special Projects" or "Strategy" before "Chief of Staff" formalizes
- Scope is narrow: one or two cross-pillar projects + meeting prep
- Title may be "Director of Strategy + Operations" or "Senior Manager, CEO Office"

### Mature CoS role
- Full Chief of Staff scope: exec ops, cross-functional projects, comms, info flow
- Often pre-pillar-lead role for ambitious operators (CoS → COO or CoS → BU GM is a common path)
- Direct reports may grow into a small team

### Post-CoS transition
- The role often has a 2-3 year tenure expectation
- Path forward: pillar lead role internally (most common), or COO / GM elsewhere
- Some CoS roles are perpetual; depends on company size and CEO preference

---

## Methodology mechanisms that touch the Chief of Staff role

### Skills
- **`chief-of-staff` skill** (to author) — auto-loads on cross-functional project planning, executive ops, CEO comms drafting.
- **`stakeholder-update` skill** (to author / exists in some form) — invoked when drafting executive communications.
- **`cross-pillar-tradeoff` skill** (to author) — invoked when surfacing tradeoffs that need CEO resolution.

### Hooks
- None specific. CoS work is conversation-driven.

### Selective slash commands
- **`/all-hands-prep`** (candidate) — composes all-hands materials from project state.
- **`/board-prep`** (candidate) — composes board meeting prep package.
- **`/synthesis`** (candidate) — synthesizes pillar-lead reports into a CEO-consumable summary.

---

## What the Chief of Staff is NOT

- **A second CEO.** The CoS has CEO authority by extension on specific delegated work; the CoS does not have CEO authority generally. Pillar leads report to the CEO, not the CoS.
- **A pillar lead.** The CoS works across pillars but doesn't own one. (When a CoS transitions to a pillar lead role, that's a different role.)
- **A note-taker.** Some CEOs misuse the CoS role as glorified executive assistant. The CoS is a senior strategic role.
- **A backchannel.** Some companies misuse the CoS role as a way to circumvent direct CEO-to-team conversation. This creates dysfunction. The CoS amplifies CEO bandwidth; doesn't replace direct CEO conversation.

---

## Status

- **2026-05-14:** Initial authoring. The role is highly variable across companies; this template captures the most common patterns.
