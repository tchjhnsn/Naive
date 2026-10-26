---
type: knowledge
tags: [everything-ecosystem, skills, cross-pillar-tradeoff]
ai-model: claude
created: 2026-05-15
source: hybrid
name: cross-pillar-tradeoff
description: >
  Surface and frame a cross-pillar tradeoff as a CEO-level (or Chief-of-Staff-
  surfaced) decision. When work in one pillar creates pressure on another
  pillar's priorities (e.g., shipping a Product feature requires Brand
  reconciliation; commercial pricing changes require Product paywall work;
  legal posture changes affect both Product implementation and Brand voice),
  the tradeoff needs explicit framing rather than per-pillar resolution.
  Per CEO + Chief of Staff role responsibilities.
  MANDATORY TRIGGERS: cross-pillar tradeoff, executive decision, CEO decision,
  pillar conflict, prioritization across pillars, what should we cut, where
  should resources go, pillar lead disagreement, strategic call, /tradeoff.
---

# Cross-Pillar Tradeoff Skill

The CEO-level decision framing skill for tradeoffs that span pillars. Surfaces what's at stake; frames the decision; documents the call.

## Why cross-pillar-tradeoff exists

Per [[../../company-template/roles/ceo|CEO role]] + [[../../company-template/roles/chief-of-staff|Chief of Staff role]], the CEO owns cross-pillar tradeoffs and the Chief of Staff often surfaces them. Without an explicit skill for this, tradeoffs get resolved inside individual pillars based on the pillar lead's view — which often produces local optimums but cross-pillar suboptimality.

The discipline: when a decision affects multiple pillars, it gets escalated and framed as a cross-pillar tradeoff explicitly, not resolved silently within one pillar's scope.

## When to invoke

- A Product-pillar decision requires Brand reconciliation (e.g., a new feature needs new visual identity)
- A Business-pillar decision requires Product implementation (e.g., a pricing change needs paywall UX work)
- A Brand-pillar decision affects commercial positioning (e.g., a brand evolution shifts target audience)
- Two pillar leads disagree on prioritization
- Resource allocation is being decided across pillars
- A version-spec scope decision requires cross-pillar buy-in
- The user explicitly asks "what should we prioritize?" or "this affects multiple pillars"

## What cross-pillar-tradeoff produces

A tradeoff framing produces a decision memo with these elements:

### 1. The decision being made

One sentence stating the call:

> "Should we ship V[N] with the current Product scope (accepting Brand reconciliation in V[N].x) or delay V[N] by 4 weeks to complete Brand reconciliation first?"

### 2. The pillar impacts

For each pillar, what's at stake:

```
| Pillar | Impact under Option A | Impact under Option B |
|---|---|---|
| Product | Ships on time; some friction with brand inconsistency in V[N] | Delays 4 weeks; ships brand-consistent |
| Brand | Identity drift in V[N]; V[N].x patch required | Identity intact; foreshadowing audit clean |
| Business | Earlier revenue; some marketing-effectiveness loss | Delayed revenue; cleaner narrative arc |
```

### 3. The principle in play

What does this decision express about how the company prioritizes? Examples:

- "Speed beats polish, because we're pre-PMF and need user signal"
- "Brand integrity beats time-to-market, because trust is the moat"
- "Commercial trajectory beats both, because runway is the binding constraint"

The principle informs future decisions of similar shape. Document it.

### 4. The decision + rationale

The CEO's (or CEO-by-extension's) call, with the rationale:

> "We're shipping on time. Rationale: at pre-PMF stage, user signal is the binding constraint. V[N].x brand reconciliation is acceptable cost. The principle: speed beats polish until we have PMF."

### 5. The follow-ups

What does the chosen option require?

- Per-pillar follow-ups (e.g., "Brand pillar: author V[N].x reconciliation plan within 2 weeks")
- Foreshadowing implications (e.g., "Update V[N] roadmap to mention the upcoming reconciliation so the audience isn't surprised")
- Decision review date (e.g., "Revisit this principle at V[N+1] articulation")

## How to run a tradeoff framing

When this skill is loaded, the AI should:

### Step 1 — Confirm the tradeoff is genuinely cross-pillar

Probe: "Is this actually cross-pillar, or is it a within-pillar decision that just feels big? If only one pillar's deliverables change, it's not cross-pillar."

If within-pillar, route to the appropriate pillar skill instead.

### Step 2 — Identify the pillars in play

For each affected pillar:
- What changes under each option?
- Who's the pillar lead's perspective?
- What's the cost of each option from this pillar's view?

### Step 3 — Identify the principle

Step back: what does this tradeoff teach us about how the company prioritizes? If there's no principle (it's just an arbitrary call), surface that — arbitrary calls are fine but should be marked as such for future reference.

### Step 4 — Frame the decision

Author the decision memo using the structure above. Surface it to the operator (CEO or Chief of Staff role).

### Step 5 — Record the call

Once the decision is made, document it. Save to:

```
projects/<entity>/decisions/<date>-<short-name>.md
```

Or append to the entity's decision log (some projects use a single decisions file rather than per-decision files).

Frontmatter:

```yaml
---
type: decision
decision-type: cross-pillar-tradeoff
phase: <current-phase>
pillars-affected: [product, brand, business]
decision-maker: CEO   # or whichever role owned the call
recorded-by: chief-of-staff   # or operator
date: <date>
tags: [decision, cross-pillar, <entity>]
---
```

### Step 6 — Surface to the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], the per-project orchestration HTML lists cross-pillar decisions visibly. Update with the new decision + principle.

### Step 7 — Schedule the follow-ups

Each follow-up action gets:
- An owner (typically the affected pillar lead)
- A due date
- A status tracking (per [[../triage/SKILL|triage]] status semantics — OPEN until the follow-up is complete)

## Posture

Cross-pillar-tradeoff runs in **office-hours mode**. Sharp framing on what's at stake. The decision-maker (CEO) needs the most rigorous version of each option's case.

Exception: if the tradeoff has emotional valence for the operator (e.g., killing a beloved feature), briefly shift to friend mode for the surfacing, then return to office-hours for the decision itself.

## What cross-pillar-tradeoff is NOT

- **Not consensus-building.** The skill frames + documents the tradeoff. The decision is one person's call (typically the CEO). Pillar leads provide input; one person decides.
- **Not a substitute for pillar-lead delegation.** Most decisions stay within pillars. Cross-pillar is reserved for actual cross-pillar tradeoffs.
- **Not a one-shot.** Decisions get revisited. The principle informs future calls; revisit the principle when context shifts.

## Relationship to other skills

- [[../office-hours-mode/SKILL|office-hours-mode]] — the right posture
- [[../canonicalize/SKILL|canonicalize]] — decision memos for major calls often become canonical for their concern
- [[../idea-archive/SKILL|idea-archive]] — when a tradeoff results in killing an idea, that idea moves to the archive

## Status

- **2026-05-14:** Initial authoring.
