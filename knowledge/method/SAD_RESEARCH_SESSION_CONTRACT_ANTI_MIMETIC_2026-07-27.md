---
type: methodology-research
source: hybrid
created: 2026-07-27
ai-model: composer-2.5
tags: [everything-ecosystem, sad-v3, methodology, research, sessions, changelog, runtime, bitemporal, anti-mimetic]
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
research-unit: sad-session-contract-bitemporal
research-phase: anti-mimetic
canonical: false
research-problem: >
  Identify failure modes and first-principles gaps where blindly mimicking
  external processes (bitemporal modeling, event sourcing, ADR/changelogs,
  session windows) would harm SAD’s goals: compounding-error prevention,
  auditability, and stable continuity across sessions.
status: ACTIVE — anti-mimetic shard (anomalies & what breaks)
---

# SAD Research (Anti-Mimetic) — where mimetic borrowing could fail

## A. What can go wrong with changelog discipline (anti-mimesis target: “bureaucracy collapse”)

1. **Overhead drift:** per-session changelog + review can become busywork.
   Failure: the changelog stops reflecting meaningful decisions and becomes a
   transcription of unrelated notes.
   Counter-pattern: ensure changelog captures only session outputs that
   affect downstream artifacts (handoffs, spec deltas, key decisions).

2. **Review theater:** teams may “review changelog” without verifying it against reality.
   Failure: the review step stops being a validation gate.
   Counter-pattern: treat review as a check against required artifacts and
   recorded deltas.

3. **Mixing clocks and meanings:** a changelog often uses wall-clock times but
   does not separately represent “when it was true” vs “when it was recorded.”
   Failure: time-based staleness judgments become wrong.
   Counter-pattern: explicitly model transaction time vs valid/experience time.

## B. What can go wrong with bitemporal modeling (anti-mimesis target: “complexity without payoff”)

1. **Over-implementation risk:** fully operational bitemporal data requires
   specialized storage/query semantics.
   Failure mode: the system becomes hard to use and slows day-to-day work.
   Anti-mimetic response: adopt bitemporal *concepts* as metadata + closure gates,
   not necessarily full bitemporal database machinery.

2. **Wall-clock conflation in closure logic:**
   - If the “valid-time” clock depends on naive wall-clock ordering, distributed delays
     can cause the “idle threshold” to close incorrectly.
   - This can be particularly damaging if “meaningful interaction” is sparse.

   Reference for warning about wall-clock correctness:
   [Why wall-clock time betrays distributed systems](https://saassystemscanon.com/layer-0/why-wall-clock-time-betrays-distributed-systems/)

3. **Idle-close vs deep work contradiction:**
   - Some work requires long silent stretches (coding, analysis).
   - A strict idle threshold could prematurely close sessions and force
     unnecessary churn.

   Anti-mimetic requirement: the “meaningful interaction” definition must
   include non-interaction work (or allow operator override to keep the session open).

## C. What can go wrong with session-window inactivity gap (anti-mimesis target: “session boundary surprises”)

1. Session windows in stream processing use inactivity gaps based on event time.
   In distributed/out-of-order systems, session boundaries may shift with late events.
   Failure: “aggressive close” yields surprising merges/splits.

   Reference: Kafka Streams caution about boundary surprise:
   [SessionWindows Javadoc](https://downloads.apache.org/kafka/3.9.2/javadoc/org/apache/kafka/streams/kstream/SessionWindows.html)

2. Analogy trap: SAD sessions are not merely grouped events; they are human+AI
   workflows with spec correctness constraints.
   Anti-mimetic requirement: closure must be tied to explicit goals and recorded gates,
   not just inactivity.

## D. Positive vs negative anti-mimesis (naming this explicitly)

- **Negative anti-mimesis** would mean: only oppose the model for identity/stance,
  without serving the epistemic goal (prevent compounding error, maintain auditability).
- **Positive anti-mimesis** is constructive: identify where the external model fails
  the SAD constraints, then alter it with first principles.

This research shard does the positive anti-mimetic work: it lists failure modes and
extracts constraints SAD must satisfy.

## E. Resulting anti-mimetic constraints (what must be true for SAD adoption)

1. Changelog must be *validated against artifacts*, not vibes.
2. Closure must not trust naive wall-clock; “valid-time idle” must derive from
   a definition of meaningful interaction and/or an operator override.
3. Adopt bitemporal as *metadata + closure gating* unless full bitemporal query/storage
   is demonstrably necessary.
4. Inactivity gap must have grace/override semantics to prevent session boundary churn.

