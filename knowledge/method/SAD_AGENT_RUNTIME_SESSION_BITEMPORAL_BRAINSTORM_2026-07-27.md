---
type: methodology
source: hybrid
created: 2026-07-27
ai-model: composer-2.5
tags: [everything-ecosystem, methodology, sad-v3, runtime, sessions, bitemporal]
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
status: ACTIVE — brainstorming note for agent runtime session contract
description: "Brainstorm: session prelim review + per-session changelog + changelog review; bitemporal session model with closure semantics."
---

# SAD agent runtime — session contract (brainstorm)

This is an idea-dump / design note for how SAD sessions should behave at the
runtime layer (what must happen at session-start and session-end).
It is not a ratified methodology instruction yet.

## A. Session opening ritual (mandatory)

Every session begins with one of:

1. **Preliminary review of the last session**  
   - Read the predecessor session log tail.
   - Check for unresolved decisions, missing artifacts, or stale invariants.

2. **Full project review (only if needed)**  
   - If the session log contains discrepancies, missing linkage, or
     contradictions with previously ratified artifacts, review the entire
     project’s relevant session log history before proceeding.

## B. Per-session changelog requirement

Every session produces:

- Its own changelog entry (not merely an incremental note).
- A review step where the session checks its changelog against what actually
  happened during the session.

This turns “what we changed” into an explicit runtime artifact that later
sessions can audit.

## C. Bitemporal session model (transaction time vs valid time)

Consider conceptualizing sessions as having two clocks:

1. **Transactional time**  
   - When work and interactions happen in the execution timeline.
   - A session only fully closes when its goals are completed.

2. **Valid time**  
   - How much “real world time” passes without meaningful interaction.
   - If too much valid time elapses with no interactions (no meaningful
     tool use / edits / decisions), close the session.

## D. Closure semantics proposal

Define closure rules as:

- **Transactional closure:** `close` only when goals are complete.
- **Valid-time auto-close:** `close` if idle duration exceeds a threshold,
  even if transactional goals are not finished, unless the session
  is explicitly marked as “needs continued work” by an operator.

## E. Representation in session metadata (open questions)

Brainstorm fields to represent this cleanly:

- `session-start-valid-at` and `session-end-valid-at`
- `session-start-tx-at` and `session-end-tx-at`
- `last-interaction-tx-at`
- `closure-reason` in `{goals_complete, valid_time_idle, operator_deferred}`
- how to incorporate these into:
  - staleness markers (`last-reviewed`, `last-compiled`)
  - the “no silent drift” discipline

## F. How this ties into existing SAD concepts

This note is intended to interface with:

- Session logs (human confirmation + linkage)
- Convergence loop discipline (do not close with unresolved spec gaps)
- Backfill mode (historical session behavior must be consistent)

