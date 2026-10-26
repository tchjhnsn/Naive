---
type: methodology-amendment-proposal
ai-model: composer-2.5
spec-layer: methodology
version: 3.0.11-proposed
source: hybrid
created: 2026-07-27
last-reviewed: 2026-07-27
authorship: hybrid
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
status: PROPOSED — pending brownfield convergence/ratification
change-class: 3
sections-affected:
  - PART 3 — Session protocol (opening/closing ritual)
  - PART 1 — episodic phases boundary semantics (idle vs goals)
  - PART 14 — critical reminders for AI (closure discipline)
tags: [methodology, sad-v3, amendment-proposal, class-3, sessions, changelog, bitemporal]
---

# SAD v3 Amendment Proposal — Agent-runtime session contract (bitemporal + changelog)

## Summary

Add a runtime-layer session contract to SAD:

1. **Session-start** must begin with a preliminary review of the last session
   (and/or full project review when the session log shows discrepancies).
2. **Every session** must write its own **per-session changelog** and then
   perform a **changelog review** step.
3. **Session closure** uses bitemporal semantics:
   - transactional time closes only when goals are complete
   - valid time auto-closes when idle duration exceeds a threshold (with
     explicit operator override semantics).

## Canonical research

`knowledge/method/SAD_RESEARCH_SESSION_CONTRACT_SYNTHESISED_MIMETIC_2026-07-27.md`

## Proposed integration points (wording-level intent)

### A) Session-opening protocol (PART 3)

Add a mandatory Step after session-start ritual:

- **Step: Predecessor review**
  - Read predecessor session log tail.
  - If discrepancies exist (missing artifacts, unresolved decisions,
    mismatched invariants), escalate to full project relevant log review.

### B) Session-end protocol (PART 3)

Add two mandatory ritual steps:

- **Step: Per-session changelog update**
  - Produce a session-local changelog that links changed artifacts.
- **Step: Changelog review**
  - Validate the changelog against the actual session events and gates passed;
    record pass/fail (or “needs correction”).

### C) Closure semantics (PART 1 + PART 14)

Define closure predicates:

- **Transactional closure** (primary): close only when session goals are complete.
- **Valid-time auto-close**: close when idle duration exceeds threshold.
  Valid time is derived from last meaningful interaction, not naive wall-clock.
- **Operator override**: session can be marked “continue work,” disabling or
  extending valid-time auto-close for a bounded window.

## Open parameters (requires ratification)

- Idle threshold default(s).
- Formal definition of “goals complete” in SAD checkpoint language.
- Override semantics (how it is marked and for how long).

