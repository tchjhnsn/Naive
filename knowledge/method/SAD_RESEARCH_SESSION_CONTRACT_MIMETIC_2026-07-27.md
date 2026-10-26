---
type: methodology-research
source: hybrid
created: 2026-07-27
ai-model: composer-2.5
tags: [everything-ecosystem, sad-v3, methodology, research, sessions, changelog, runtime, bitemporal, mimetic]
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
research-unit: sad-session-contract-bitemporal
research-phase: mimetic
canonical: false
research-problem: >
  How should SAD sessions behave at the agent-runtime layer, given:
  (1) session-start includes preliminary review of the last session (and
  sometimes entire project when logs conflict),
  (2) each session must create its own changelog and then review it,
  (3) closure should use bitemporal logic (transactional closure on goals
  complete; valid-time auto-close on idle)?
status: ACTIVE — mimetic shard (indexed candidates)
---

# SAD Research (Mimetic) — Session contract, changelog, bitemporal closure

## Index of mimetic models worth copying (and what function each model serves)

### 1) Decision records & durable rationale logs (changelog-like)

- **ADR (Architecture Decision Record)** practice: capture a decision, context,
  ramifications; mark `proposed → accepted → superseded`; do not edit
  superseded decisions—append a new one instead.
  Reference: [Martin Fowler ADR](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html).

**Function we intend to mime:** immutable, append-only rationale + clear
supersession trail that makes later audit possible.

### 2) Sprint reviews feeding changelog/release notes (capture raw → validate later)

- **Sprint review → changelog translation**: treat sprint review as the raw
  feed where the team captures outcomes and decisions; then translate into a
  stakeholder-facing changelog, validated by a human reviewer.
  Reference: [Doc Holiday sprint review → changelog](https://doc.holiday/blog/turn-sprint-reviews-into-customer-facing-changelogs)

**Function we intend to mime:** insist that the session log captures raw
material first; then review/validation happens as a separate step.

### 3) Event sourcing & the “two timestamps” distinction (transaction time ≠ wall-clock/business time)

- **Event log** as append-only: sequence number orders events independently of
  unreliable clocks; business meaning timestamps are separate from system-record
  timestamps.
  Reference: [Grace Commons Event Log](https://gracecommons.dev/atoms/event-log.html)

**Function we intend to mime:** separate “when recorded” from “when true in the
modeled world,” and rely on an ordered log for replayability.

### 4) Bitemporal data modeling (valid time vs transaction time)

- **Bitemporal relation**: tracks **valid time** (“when a fact is true in the
  real world”) and **transaction time** (“when it was recorded in the system”).
  References:
  - [Temporal database overview](https://en.wikipedia.org/wiki/Temporal_database)
  - [Consensus glossary](https://www2.cs.arizona.edu/~rts/pubs/SIGMODRecordMarch94p52.pdf)
  - [Unification of temporal data models](https://www2.cs.arizona.edu/~rts/pubs/ICDE93.pdf)
  - [TDWI overview](https://tdwi.org/blogs/data-101/2026/05/what-is-temporal-data-modeling.aspx)

**Function we intend to mime:** conceptual split of “real-world duration since
meaningful activity” (valid/experience time) and “work recording order” (transaction time).

### 5) Session windows / idle-gap closure (valid-time auto-close analogue)

- **Session windows** in stream processing close a session after an inactivity
  gap; session boundaries are driven by activity events.
  References:
  - [Apache Kafka KIP-94 session windows](https://cwiki.apache.org/confluence/spaces/KAFKA/pages/66853499/KIP-94+Session+Windows)
  - [Conduktor session windows glossary](https://www.conduktor.io/glossary/session-windows-in-stream-processing)
  - [Kafka streams SessionWindows](https://downloads.apache.org/kafka/3.9.2/javadoc/org/apache/kafka/streams/kstream/SessionWindows.html)

**Function we intend to mime:** “close after inactivity,” with a notion of
grace / late-arrival handling to avoid surprising closure.

### 6) Workflow stop conditions (goal satisfaction vs timeouts)

- **Completion criteria** define when a workflow ends; **timeouts** act as guardrails.
  Reference: [Axon OS stopping conditions](https://docs.axonos.ai/flow/nodes/agentic-ai/completion)
  References on timeouts vs timers:
  - [Temporal: timers vs timeouts](https://temporal.io/blog/timers-timeouts-and-the-art-of-waiting-in-temporal)
  - [Durable Workflow timeouts](https://durable-workflow.com/docs/2.0/features/timeouts/)

**Function we intend to mime:** two independent stop mechanisms:
  - goal satisfaction (transactional closure)
  - time/idle constraint (valid-time auto-close)

## Mimetic mapping to the SAD session contract (candidate skeleton)

We would copy these roles into SAD sessions as:

1. **Session-start:** preliminary review is analogous to “carry forward
   previous state” before running the next workflow step.
2. **Per-session changelog + review:** ADR/sprint-review discipline.
3. **Bitemporal closure:** bitemporal model split + session-window inactivity gap.

## Open mimetic gaps

- SAD needs an explicit mapping from “meaningful interaction” to an activity
  event that advances *valid-time*.
- SAD needs an explicit representation of “idle duration exceeds threshold”
  without trusting wall-clock correctness in distributed/cloud execution.

