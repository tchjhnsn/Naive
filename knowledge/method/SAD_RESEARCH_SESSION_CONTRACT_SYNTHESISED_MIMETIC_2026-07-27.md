---
type: methodology-research
source: hybrid
created: 2026-07-27
ai-model: composer-2.5
tags: [everything-ecosystem, sad-v3, methodology, research, sessions, changelog, runtime, bitemporal, synthesised]
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
research-unit: sad-session-contract-bitemporal
research-phase: synthesised-mimetic
canonical: true
research-problem: >
  Produce a canonical SAD research conclusion about how to implement the agent-runtime
  session contract ideas: session-start preliminary review, per-session changelog + review,
  and bitemporal session closure semantics (transactional goals complete; valid-time idle auto-close).
status: ACTIVE — canonical standing synthesis
---

# SAD Research (Synthesised-Mimetic Canonical) — Session contract

## Adopt (state-of-the-art mimetic models that fit SAD constraints)

1. **Append-only, replayable log discipline**
   - Adopt the *event log* role: sequence-ordered, immutable record.
   - Adopt the separation of “recorded/order time” from “business/meaning time.”
   - Reference: [Grace Commons Event Log](https://gracecommons.dev/atoms/event-log.html)

2. **Bitemporal time split as metadata + gate inputs**
   - Adopt valid-time vs transaction-time conceptual split.
   - References:
     - [Temporal database (valid vs transaction time)](https://en.wikipedia.org/wiki/Temporal_database)
     - [Consensus glossary](https://www2.cs.arizona.edu/~rts/pubs/SIGMODRecordMarch94p52.pdf)

3. **Dual stop logic: goal satisfaction + idle/time guardrail**
   - Adopt the separation of “completion criteria” from “timeout/guardrail”
     so SAD can close:
     - transactionally when goals are met
     - otherwise via valid-time idle threshold (with override)
   - Reference: [Axon OS completion/stop conditions](https://docs.axonos.ai/flow/nodes/agentic-ai/completion)

4. **Idle-gap as session grouping / auto-close**
   - Adopt “inactivity gap closes session” as an analogy for valid-time idle auto-close.
   - Reference: Kafka/Kafka-streams session windows and caution:
     - [Kafka KIP-94 session windows](https://cwiki.apache.org/confluence/spaces/KAFKA/pages/66853499/KIP-94+Session+Windows)
     - [Kafka Streams SessionWindows Javadoc (caution)](https://downloads.apache.org/kafka/3.9.2/javadoc/org/apache/kafka/streams/kstream/SessionWindows.html)

5. **Changelog as validation pipeline output**
   - Adopt “capture raw in-place, then validate separately” discipline.
   - Reference: [sprint review → changelog translation](https://doc.holiday/blog/turn-sprint-reviews-into-customer-facing-changelogs)

## Reject (what to not mime because it conflicts with SAD goals)

1. Reject “bitemporal everything” full database/query complexity.
   - SAD needs bitemporal concepts for session gating, not full temporal-query
     expressivity across all wiki/data services.

2. Reject wall-clock-only closure correctness.
   - Do not allow the valid-time idle threshold to depend on naive timestamps
     without a definition of “meaningful interaction.”
   - Reference warning: [wall-clock time betrays distributed systems](https://saassystemscanon.com/layer-0/why-wall-clock-time-betrays-distributed-systems/)

3. Reject changelog-as-vibes.
   - “Every session has a changelog” is required, but “changelog is reviewed”
     must be tied to artifact truth (what changed, what’s linked, what gates passed).

## Transform (how SAD should adapt the mimetic models)

### Transform 1: Define “meaningful interaction” for valid-time idle

SAD should define “interaction” as any event that changes the
spec-relevant knowledge state, such as:

- tool outputs that update artifacts
- edits/compilations that affect raw/compiled layers
- explicit decisions written into the session log/proposal
- key merges across phases (spec changes, convergence passed, verification gates)

Then valid-time auto-close uses `last-meaningful-interaction-valid-at`,
not wall-clock activity broadly.

### Transform 2: Represent bitemporal session closure minimally

Store two clocks in session metadata:

- **Transactional time**: timestamps for session start/end, and ordered evidence of work performed.
  (The “session log” is inherently transaction-ordered.)

- **Valid time**: derived idle duration / last meaningful interaction time used for auto-close.

This is bitemporal semantics without requiring a bitemporal database.

### Transform 3: Closure priority

Close only when either:

1. **Transactional closure**: goals complete (SAD deliverables produced / gates passed).
2. **Valid-time auto-close**: idle threshold exceeded *and* session is not
   marked for continuation (operator override).

### Transform 4: Changelog lifecycle is two-step

Each session:

1. **Creates** a per-session changelog entry (diff-like, artifact-linked).
2. **Reviews** it against actual session events and required invariants,
   and records the review status.

## Open (what still needs a policy-level decision)

1. Exact idle threshold duration for valid-time auto-close (and whether it is per-project or per-session type).
2. Formal definition of “goals complete” for session closure in SAD terms:
   - Are goals the ★ checkpoint passes?
   - Is it “session produced all required output artifacts”?
3. Operator override semantics:
   - how to mark “continue work” and how it changes valid-time closure.

## Decision: state-of-the-art mimetic model vs first principles

We treat the state-of-the-art mimetic sources as providing **shape**:
- bitemporal conceptual separation
- completion-vs-timeout duality
- inactivity gap session boundaries
- immutable log discipline

We *do not* adopt the full underlying systems (full bitemporal DB, naive wall-clock
closure), because SAD’s first principles (fail-closed gating, compounding-error prevention,
artifact truth) require a minimal and definition-driven adaptation.

Therefore:
- Yes, we mime the conceptual model.
- No, we do not mime the full implementation complexity.
- The “reason not to mime” is: SAD needs closure gates tied to spec correctness
  and artifact truth, not temporal query expressivity or wall-clock assumptions.

