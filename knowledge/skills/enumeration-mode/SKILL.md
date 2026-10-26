---
type: knowledge
tags: [everything-ecosystem, skills, enumeration-mode]
ai-model: claude
created: 2026-05-15
source: hybrid
name: enumeration-mode
description: >
  Operate Phase 0A (mind dump) in enumeration mode — systematic, breadth-first,
  ticket-shaped capture of candidate items across a defined space. Distinct from
  free-form mind-dump mode (loose, associative, exploratory). Enumeration mode
  produces categorized rows with tier annotations and version-routing decisions
  rather than narrative idea-dumps. Both are valid 0A outputs; enumeration is
  the right mode when the operator is canvassing a defined space rather than
  discovering what's there. Per SAD v3.3+ amendment §27.
  MANDATORY TRIGGERS: enumerate, enumeration, breadth-first, list all, exhaustive
  list, systematic capture, canvass, what are all the, categorize, every possible,
  enumeration mode, 0A enumeration, full enumeration, list every.
---

# Enumeration Mode Skill

The Phase 0A operating mode for systematic, breadth-first capture. Distinct from free-form mind-dumping.

## Why enumeration mode exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §27]], earlier amendments (§22-§23) drifted toward treating "enumeration" as a sub-phase of 0A. Reconsidered: enumeration is a *mode* of 0A, not a phase. An enumerated list is a structured form of the idea map — not a different artifact class.

Mind-dumping operates in (at least) two complementary modes:

- **Free-form mode.** Loose, associative, exploratory. Produces narrative idea-dumps, thematic clusters, conceptual provocations.
- **Enumeration mode.** Systematic, breadth-first, ticket-shaped. Produces categorized rows with tier annotations and version-routing decisions.

Both feed Phase 0A. Both inform the eventual `IDEA_MAP.md`. The thought-partner AI selects the mode based on the operator's posture.

## When to invoke enumeration mode

Enumeration mode is the right mode when:

- The operator is **canvassing a defined space** (e.g., "what are all the V1 enhancements we should consider?") rather than discovering what's possible.
- A previous mind-dump produced narrative threads that now need to be **made enumerable** for triage.
- The operator wants **breadth coverage** — "let's make sure we don't miss anything" — rather than depth on any single idea.
- The operator is preparing a backlog for triage (per [[../triage/SKILL|triage skill]]).

Enumeration mode is NOT the right mode when:

- The operator is discovering what they think (use free-form mind-dump posture).
- The operator is in convergence mode (use [[../office-hours-mode/SKILL|office-hours-mode]]).
- The operator is articulating a single deep idea (use free-form posture).

## What enumeration produces

An enumeration artifact has a known shape:

### Frontmatter

```yaml
---
type: enumeration
phase: 0A
mode: enumeration
scope-entity: [[<entity>]]
scope-version: V[N]
created: <date>
authorship: hybrid
tags: [enumeration, mind-dump, 0A, <entity>, V[N]]
---
```

### Structure

```
# <Entity> · V[N] Enumeration

## A. <First category>

A-01. <Idea>           [status: OPEN]  [tier: FIX/DEEPEN/NEW/PULL/OPS]  [version: V1/V2/V3+]
A-02. <Idea>           ...
...

## B. <Second category>
...
```

### Row anatomy

Every row carries:

- **ID** (e.g., `A-01`) — stable identifier; survives across triage / sprints
- **One-line description** of the idea
- **Status** (per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§24]] status semantics) — OPEN by default; transitions as work proceeds
- **Tier** annotation — FIX (bug) / DEEPEN (existing-thing-needs-more) / NEW (new capability) / PULL (was-V2-pulled-to-V1) / OPS (operational)
- **Version** routing — V1 / V1-forward-compat / V2 / V3 / V4+ / DECISION-PENDING
- **Optional notes** — when something needs unpacking

### Categories

Categories emerge from the space being canvassed. For one past V1-next scope, categories were:

- A: Multi-level government coverage
- B: Visitor experience & session
- C: Navigation & discovery (including search)
- D: Editorial deepening
- E: Performance & voting metrics
- ...etc.

For a different entity, categories would be different. The AI's job in enumeration mode is to help surface + name the categories that exhaustively cover the space.

## How to run enumeration mode

When this skill is loaded, the AI should:

1. **Confirm the space being canvassed.** Don't enumerate without bounds. "What space are we canvassing? V1 enhancements? V2 ideas? All possible Brand-pillar products?"
2. **Propose initial categories.** Surface 5-10 candidate categories that cover the space. Let the operator confirm / refine.
3. **Walk each category.** Within each category, generate candidate rows. Aim for breadth over depth — many rows, each one-line.
4. **Avoid solving as you go.** Enumeration mode captures; it doesn't specify. Resist the urge to expand a single row into a sub-section. Keep rows one-line.
5. **Cross-cut where needed.** If a row touches multiple categories, place it primary + note the cross-cut.
6. **Track gaps.** When the operator says "what else might be here?" the AI surfaces adjacent possibilities, then categorizes.
7. **Close cleanly.** Enumeration produces an enumeration artifact. Save it (the orchestration HTML or a per-project enumeration doc); add status `OPEN` to every row; surface to triage.

## Friend vs. office-hours mode interaction

Enumeration mode is **mode-neutral** — it can run in either friend mode or office-hours mode depending on the phase:

- **Friend-mode enumeration** (typical 0A): expansive. "What else could be here?" Help the operator broaden.
- **Office-hours-mode enumeration** (rare 0A; typical 1A revisit): pressing. "Why is this on the list? Should it be cut?"

Default is friend-mode enumeration during 0A. Office-hours-mode enumeration is unusual — typically the operator switches to office-hours-mode for triage rather than for enumeration itself.

## Relationship to triage

Enumeration produces a list with `status: OPEN` rows. Triage (per [[../triage/SKILL|triage skill]]) is what comes next — it organizes the enumerated list into a research-ready structure: per-pillar categorization, prioritization, research-driving questions, row-level status transitions.

Enumeration → Triage → Research is the methodology flow. Enumeration without triage is a backlog. Triage without enumeration is improv.

## Status

- **2026-05-14:** Initial authoring per §27 amendment.
