---
type: knowledge
source: hybrid
ai-model: claude-opus-5
created: 2026-08-10
updated: 2026-08-10
authority: architectural
decision-status: in-force
governed-by:
  - "[[SAD_SKILL_v3]]"
  - "[[CLAUDE]]"
status: ACTIVE
description: "Position schema — organizational seats distinct from persons and entities. Occupancy may be human, agent, vacant, or hybrid (human and agent concurrently — e.g. human CEO + CEO agent). Assignments link seats to teams, projects, and portfolio entities. Completes idea-073."
tags: [everything-ecosystem, systems, position-schema, org-structure, roles, agent-staffing, sad]
related:
  - "[[person-profile]]"
  - "[[entity-profile-schema]]"
  - "[[venture-template/roles/README]]"
  - "[[executive-roles]]"
  - "[[role-and-candidate-authoring]]"
  - "[[idea-073-position-schema-separate-from-person]]"
---

# Position Schema

A **position** is a structural seat in an organization. It exists whether or not anyone occupies it. Positions are separate from [[person-profile|person profiles]] (who) and [[entity-profile-schema|entity profiles]] (what company / product). Completes [[idea-073-position-schema-separate-from-person]].

This is an **everything-ecosystem / SAD** feature: org design, hiring, and agent staffing use the same seat model.

## Three linked objects

| Object | Lives | Answers |
|---|---|---|
| **Role template** | `governance/venture-template/roles/<slug>.md` | What is a CTO / HR manager / FDE *in general*? |
| **Position instance** | `<entity>/business/org/positions/` (default); brand- or product-scoped seats may live under `brand/org/` or `product/org/` when the seat belongs to that org function | Which seats exist *here*, reporting lines, scope |
| **Occupancy** | Frontmatter on the position | Who or what fills the seat right now |
| **Assignments** | Body / frontmatter on the position | Teams, projects, portfolio entities this seat owns |

Role templates are **not** the org chart ([executive-roles](../skills/executive-roles/SKILL.md) already says this). Position instances **are** the org chart (or its machine-readable form).

```
Role template  →  Position instance  →  Occupancy (human | agent | vacant | hybrid)
                                  ↘  Assignments (teams / projects / entities)
```

## Note type

```yaml
type: position
entity: "a project note"                 # owning entity
role-template: "[[cto]]"             # optional link into venture-template/roles
org-function: product | brand | business | company-wide
title: "Chief Technology Officer"
reports-to: "a project note"         # other position instance, optional
occupancy: human | agent | vacant | hybrid
staffing-posture: human-required | agent-capable | agent-preferred | undecided
occupied-by-person: "[[<person-profile>]]"   # when human or hybrid
occupied-by-agent: "<agent-id-or-wikilink>" # when agent or hybrid
```

Template: `_meta/templates/tpl-position.md`.

## Schema fields (instance)

### Identity
- **Title** — formal seat name
- **Entity** — which company / ecosystem this seat belongs to
- **Org function** — `product` · `brand` · `business` · `company-wide` (maps to parent pillar homes without requiring recursive brand/business on every child product)
- **Role template** — optional wikilink to venture-template role file

### Authority
- **Scope of authority** — what the seat can decide
- **Responsibilities** — what the seat must do
- **Budget authority** — financial control, if any
- **Term / tenure** — at-will, fixed term, elected, etc.

### Structure
- **Reports to** — other position instance(s)
- **Direct reports** — other position instance(s)
- **Institutional relationships** — peer seats, committees, external orgs

### Occupancy
- **`occupancy`:** `human` · `agent` · `vacant` · `hybrid`
- **`occupied-by-person`** / **`occupied-by-agent`** as applicable (both set when hybrid)
- Start date / end date when filled

**Dual occupancy is first-class.** `hybrid` means a **human and an agent both occupy the same seat at once** — not “either/or,” and not “agent until a human is hired.” A CEO agent does **not** imply there is no human CEO; the common pattern is human accountability + agent amplification of the same role (drafting, triage, monitoring, prep), with the position naming which duties sit with which occupant. Staffing-posture answers *what is allowed*; occupancy answers *who/what is actually in the seat now*.

| Occupancy | Meaning |
|---|---|
| `human` | Only a person fills the seat |
| `agent` | Only an agent fills the seat |
| `vacant` | Seat exists; nobody fills it |
| `hybrid` | Person **and** agent fill the seat concurrently (both links required) |

### Staffing posture (design-time)
Declared when the seat is designed — *before* fill — to decide what fill patterns are allowed:

| Value | Meaning | Examples |
|---|---|---|
| `human-required` | Trust, liability, or judgment that must stay with a human (an agent may still assist → often lands as `occupancy: hybrid`) | Forward-deployed engineer, people manager with direct reports, legal signer, CEO |
| `agent-capable` | May be filled by an agent alone, a human alone, or both | Triage, draft, research coordination, many ops checklists |
| `agent-preferred` | Prefer agent; escalate to human on exception | Routine monitoring, first-pass sorting |
| `undecided` | Not yet classified — force a decision before hire/automation |

One-line **staffing-rationale** required whenever posture is set.

**Fill path:**
- Human (or human side of hybrid) → [[role-and-candidate-authoring]]
- Agent (or agent side of hybrid) → agent-role taxonomy / assertion bounds (CANONICAL_ASSET_REGISTRY A-C05-01 and successors) — **do not** collapse agent roles into org positions; link them
- Hybrid → run **both** paths; keep duty split explicit on the position

### Assignments
What this seat is responsible for *in this company*:

| Kind | Examples |
|---|---|
| **Teams** | named teams or squads |
| **Projects** | vault entities, campaigns, SAD projects |
| **Portfolio entities** | apps / platforms under a parent (ownership, not “business-scope on the app”) |

Assignments are how org design absorbs product-map churn: update who owns what; don’t grow mini-company trees on every product.

## Person ↔ position

When a person fills a position:
- Link person-profile ↔ position; start date; current yes/no
- Keep **person-capacity** vs **position-capacity** action attribution (see former person-profile section — still authoritative for attribution rules)

Person attributes do **not** merge into the position.

## Agent ↔ position

When an agent fills a position (alone or alongside a human):
- Link agent identity / skill pack / authority bounds
- Agent occupancy never exceeds the seat’s scope of authority — and never silently replaces a human who still holds the seat
- **`occupancy: hybrid`** seats name which duties are human vs agent; presence of the agent does not vacate the human
- Do not invent a second “CEO position” just because a CEO agent exists — same position, dual occupancy, duty split
- Prior-art rhyme: Block’s [[buzz-xyz-sad-prior-art-2026-08-11|Buzz]] treats agents as channel **members** with their own keys (authorization ≠ authorship) — same idea at the workspace layer

## Relation to pillars / org functions

Parent `brand/` · `business/` · `product/` are **org-function homes** (vault CLAUDE.md §Org functions vs product portfolio). Positions *belong under* those functions (CMO → brand, HR → business, CTO/FDE → product). They are **not** product-coverage tables and **not** a reason to recurse brand/business folders onto every child app.

Default instance path: `<entity>/business/org/positions/` (company org lives under the business org-function). Seats whose primary org-function is brand or product may instead live under `brand/org/positions/` or `product/org/positions/` when that keeps ownership obvious.

## SAD invocation points

| Moment | Use |
|---|---|
| Org design | Create vacant positions + staffing-posture before hiring or automating |
| Hiring | Position + `human-required` / human occupancy → role-and-candidate-authoring |
| Agent staffing | Position + `agent-capable` / `agent-preferred` → agent role bounds |
| Portfolio churn | Update **assignments**, not entity folder shape |
| Exec context | executive-roles loads **templates**; position instances answer “who holds the seat *here*” |

## Index note (optional)

An entity may keep `business/org/README.md` (or `org-index.md` with `type: org-chart`) listing position wikilinks. Do not invent entity-root `departments/` or `hr/` folders — departments are **positions and teams under org functions**.

## Non-goals

- Full fantasy headcount for every entity
- Merging person into position
- Unifying agent-role taxonomy with org positions
- Treating venture-template role files as filled seats
