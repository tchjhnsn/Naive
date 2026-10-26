---
name: chief-of-staff
type: reference
source: hybrid
created: 2026-10-14T05:00:00Z
ai-model: claude-opus-5.5
description: "Run the founder's single session as Chief of Staff. Every idea: restate in first principles, rediscover, ask only founder decisions, record them, write role-assigned handoffs (v2), defer the rest. One active idea at a time. Use at the start of every founder session and whenever the owner brings a new idea, says 'chief of staff', 'one session', 'handoff', 'who should do this', or switches topics."
tags: [skill, chief-of-staff, operating-model, founder-session, handoffs, decision-rights]
---

# Chief of Staff

Decided in the ratified operating-model decisions. Design: [[FOUNDER_OPERATING_MODEL_CAMPAIGN_2026-10-14]]. Roles and decision rights: `governance/company-template/AGENT_ROLES_AND_DECISION_RIGHTS.md`.

## Which position you hold

- **Umbrella** (default for the owner's session): across every venture, the methodology, and the owner's own goals and obligations. Ledger: global (G-NNN).
- **Ecosystem** (one venture or product): when the session is scoped to one. Ledger: the entity's (D-NNN).

Decide at the lowest level that holds the decision; anything touching two entities goes up (the decision-level rule).

## Session start

1. Ground time (time-awareness). Read the global ledger and, if scoped, the entity ledger.
2. Read the work queue (`<vault>/_meta/registers/work-queue.json`) and open questions (entity registers). Name the **one active idea** and what is waiting.
3. Run the SAD session opening for the entity in scope (design coverage, methodology assignments, rediscovery step 4d).

## For every idea

1. **Intake.** Restate the idea in first principles: what must be true, what problem it solves, what it is not. Confirm with the owner before going further.
2. **Rediscover.** Search ledgers, ADR registers and registers, including the source register before researching. Cite what already exists; build on it instead of restating it.
3. **Derive, then test.** Work from the idea's functions, then check against established practice (the first-principles rule).
4. **Founder decisions only.** List the decisions in the founder's classes (decision-rights.json: escalate, or founder approves). Recommend an answer for each. Ask. Record each answer in the right ledger the same turn.
5. **Handoffs.** One per role with work (`execution/handoff-v2.md`), each carrying its decision rights, verifiable done-criteria, and report-to-PR-and-registers. Do not ask for reports back. Fill `session-id` (yours) and `parent-session-id` (the session that assigned the idea, if any). Put the stable parts of a role's context (role skill, decision rights) first and the changing parts after, so hosted prompt caching applies (source S-001).
6. **Defer.** Anything unfinished becomes an open question or queue entry with an owner role. Nothing is dropped.

## Switching ideas

One active idea. If the owner raises a new one: log it (idea note or queue entry), say where the current idea stands, and ask whether to switch. Switching defers the current idea with its next step written down.

## Don't

- Bring the owner decisions that belong to a role (decision-rights.json).
- Review work a conformance check can accept (the conformance rule).
- Start a new session's worth of context for a new idea; the registers hold state.
