---
type: knowledge
tags: [everything-ecosystem, skills, patterns, gate-backfill, sad-v3]
ai-model: gpt-5.6-sol
created: 2026-07-26
updated: 2026-07-26T07:50:58Z
source: hybrid
name: gate-backfill
description: >
  Shared recovery pattern for SAD gate skills when a project is mid-work and
  required pre-gate assets are missing. Detect → triage → order → freeze → exit.
  Gate skills link here; they keep only skill-specific recovery notes.
---

# Gate-skill backfill pattern

Canonical pattern for **any SAD skill that gates a phase or deliverable** when
the project is already past that gate with missing assets.

**Greenfield:** assets exist before the gated work begins.  
**Backfill:** gated work already started; recover without pretending the gate
never applied, and without halting all useful progress.

Skills that use this pattern: `contract-first`, `articulation-closure`,
`build-roadmap`, `software-product`, `foreshadowing-audit`, `version-identity`,
`ambition-tier`, `triage`, `template-generation`, `hardware-product`,
`metrics-review`, `session-capture`.

---

## Five steps (always)

### 1. Detect

Inventory what the gate requires vs what exists in vault/repo/runtime evidence.
Silent absence is a row — never “assumed covered.” Prefer artifacts and live
behavior over memory.

### 2. Triage

| Class | Meaning | Rule |
|---|---|---|
| **Blocker debt** | Correct next change depends on the missing asset | Backfill before that change |
| **Queued debt** | Existing work may continue; debt is visible | Dated roadmap / inventory line; no *new* gated surface of that kind |
| **Deferred** | Conscious skip | Version or date trigger recorded; not silent |

### 3. Order

Document **reality first**, then align aspirational specs:

1. Capture what shipped or is in flight.
2. Author the missing asset to match reality (or explicitly supersede reality
   via Class N change).
3. Align dependents (types, mocks, UX, tests) to the asset.
4. Only then expand scope.

Do not invent a greenfield fantasy and force a rewrite unless the operator
chooses a deliberate breaking change.

### 4. Freeze

While debt is open:

- Do not open **new** work that the same gate would have blocked.
- Finishing an in-flight slice under a **visible** debt note is allowed when
  triage marked it queued, not blocker.

### 5. Exit

Debt clears when the required asset exists **and** the skill’s verification
bar passes (schema conformance, functional completion condition, gate
checklist, etc.). A markdown checklist alone is not exit.

---

## Where debt lives

- Build roadmap line items (preferred for Phase 2+)
- Articulation closure inventory rows (✗ / — deferred)
- Entity-profile or SESSION_LOG debt notes when no roadmap yet

Tribal knowledge is a process failure.

---

## Anti-patterns

- Blocking all project work because one unrelated gate has debt
- “We’ll add the doc later” with no triage class or trigger
- Rewriting history to match a new aspirational spec without Class N discipline
- Declaring exit because a stub file exists with no content or tests

---

## Skill authoring rule

When adding or editing a gate skill:

1. Link this pattern under **Backfill / missing assets**.
2. Keep only **skill-specific** detect hints, freeze rules, and exit criteria.
3. Do not re-copy the five-step table unless amending this pattern.

Path: `knowledge/skills/_patterns/gate-backfill.md`
