---
type: company-template-role
ai-model: claude-opus-5
role: department-head
primary-pillar: company-wide
secondary-pillars: []
source: hybrid
created: 2026-08-10
last-reviewed: 2026-08-10
authorship: hybrid
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [company-template, role, department-head, pattern, stub]
canonical-for: "department-head-role-pattern"
related:
  - "[[governance/company-template/roles/README]]"
  - "[[position-schema]]"
status: STUB
---

# Department Head (pattern)

> **Purpose:** Pattern template for a seat that owns a **named department or team** — not a specific title. Instantiate as “Head of X” / “Director of Y” position instances with concrete assignments.

## How to use

1. Copy pattern into a more specific role file **or** create a position instance with `role-template` pointing here and `title` set to the real name.
2. Set `org-function` to product / brand / business / company-wide.
3. Fill **assignments** (teams, projects, portfolio entities) on the position instance.
4. Set `staffing-posture` — people-managers with direct reports are usually `human-required`.

## Typical responsibilities (pattern)

- Goals and priorities for the department
- Direct-report coaching and performance
- Cross-department interfaces
- Budget for the department when granted

## What this is NOT

- Not a substitute for C-suite pillar leads (CTO/CMO/COO) when the “department” is the whole pillar
- Not an entity-root folder named `departments/` — departments are seats + teams under org functions

## Status

Stub / pattern 2026-08-10.
