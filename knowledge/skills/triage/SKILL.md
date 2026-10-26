---
type: knowledge
tags: [everything-ecosystem, skills, triage]
ai-model: claude
created: 2026-05-15
source: hybrid
name: triage
description: >
  Run the triage phase that bridges Phase 0A (mind dump / enumeration) and
  Phase 0B (research). Triage organizes the outputs of 0A (idea-dumps +
  enumeration artifacts) into a structure clean enough that organized research
  can proceed: per-pillar categorization, prioritization, research-driving
  questions, row-level status assignment. Triage is the gate at the end of 0A;
  not a separate Articulate sub-phase. Per SAD v3.3+ amendment §28.
  MANDATORY TRIGGERS: triage, triage phase, organize ideas, organize for
  research, per-pillar routing, prioritize ideas, research-driving questions,
  status semantics, 0A to 0B bridge, /triage, OPEN to TRIAGED, ready for
  research.
---

# Triage Skill

The methodology workflow for bridging Phase 0A (mind dump / enumeration) and Phase 0B (research). Triage organizes raw idea capture into a research-ready structure.

## Why triage exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §28]], triage's primary purpose is **not** backlog management. Triage is the methodology bridge that prepares ideas for organized research:

> Organize the ideas from the enumerated list and the idea map into a clean enough structure that organized research can proceed against it.

Backlog discipline (status semantics on every row per §24) is a byproduct of triage's primary purpose, not its goal.

Without triage, the operator either skips research (proceeds straight from mind-dump to spec, missing critical context) or research drifts (researches whatever's top-of-mind rather than what the project actually needs to know).

## When to invoke triage

Triage runs when:

- Phase 0A (mind dump / enumeration) has produced a sprawl that needs organization
- An enumeration artifact exists with `status: OPEN` rows that need to be sorted
- The operator wants to move from "we've captured ideas" to "we know what to research"
- A user explicitly asks to "triage" or "organize" a list of ideas

Triage runs BEFORE Phase 0B research begins. It also runs AFTER 0B if research surfaces new questions that need to be triaged into the next research pass.

## What triage produces

Triage outputs a research-ready structure. Four required outputs:

### 1. Per-pillar categorization

Every idea routed to a primary pillar (`product` / `brand` / `business`) with optional secondary-pillar tags for cross-pillar concerns. The cleanest convention: **primary-pillar tag + secondary-pillar tag in frontmatter or row metadata**.

This routing is load-bearing: per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§30]], research runs per-pillar. Without pillar routing, research can't be scoped.

### 2. Prioritization within each pillar

Not every idea needs research equal-priority. Within each pillar, triage establishes:

- **High-priority for research** (high-impact + high-uncertainty)
- **Medium-priority for research** (worth knowing about but not blocking)
- **Low-priority** (capture-and-defer; revisit later)

Prioritization is a triage decision, not a value judgment. A "low-priority" row may be the most important idea for V[N+1] — but if it doesn't need 0B research to inform V[N], it stays low-priority for now.

### 3. Research-driving questions

Each high-priority idea surfaces one or more research questions. These become 0B's inputs.

Examples (V1-next):
- Idea: "Summary of activity on profile pages" → Research questions: "What's the data source? How fresh? Categorization taxonomy?"
- Idea: "Search across wiki" → Research questions: "What search tech? Web-search allowlist scope? Concentric-rings application?"

The research questions are the *output of triage* and the *input of research*. Without them, research drifts.

### 4. Row-level status

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§24]], every row gets a status:

- **OPEN** → captured but not triaged (default after enumeration)
- **TRIAGED** → decision made on tier + version + pillar
- **IN-SPRINT** → pulled into an active or imminent sprint
- **SHIPPED** → deployed + verified
- **DEFERRED-V[N]** → pushed to a named later version with reason
- **DECISION-PENDING** → active dispute, awaiting operator decision
- **ARCHIVED** → tried + rolled back, or decided against (moves to idea-archive per [[../idea-archive/SKILL|idea-archive skill]])

Triage transitions rows from OPEN → TRIAGED (or directly to DEFERRED / DECISION-PENDING / ARCHIVED for rows that don't need research).

## Triage's gate

Triage is **complete** when:

- Every row in the enumeration artifact has a status (no OPEN rows remain in scope)
- Every TRIAGED row has a primary-pillar tag
- Every high-priority TRIAGED row has at least one research-driving question
- The operator can answer "what do we need to learn before we can write a vision" from triage outputs alone

If those conditions don't hold, triage isn't done — keep going. Don't move to 0B research until triage's gate closes.

## Friend vs. office-hours mode

Triage runs in **office-hours mode** by default. The work is converging: cutting, prioritizing, deferring. Sharp framing is appropriate.

Mode switches:

- **If triage surfaces a row that needs vision-expansion** (e.g., "we have no idea what this means"), briefly switch to friend mode to flesh it out, then return to office-hours.
- **If the operator is fragile from over-cutting**, friend mode briefly, then return.

## How to run triage

When this skill is loaded, the AI should:

1. **Confirm what's being triaged.** Identify the source (enumeration artifact at `<path>`, or set of `_ideas/` files, or recent mind-dump session).
2. **Identify the pillar dimension.** What pillars are in play? (Most projects are tri-pillar; some are mono-pillar.)
3. **Walk each row.** For each row:
   - Assign primary pillar
   - Assess priority (high / medium / low for research)
   - Surface research-driving questions for high-priority rows
   - Transition status from OPEN → TRIAGED (or to DEFERRED / DECISION-PENDING / ARCHIVED)
4. **Cluster by pillar.** Surface per-pillar summaries: "Product pillar has 23 TRIAGED rows; 8 high-priority. Brand pillar has 11 TRIAGED rows; 3 high-priority." Etc.
5. **Surface the research agenda.** From the high-priority rows + their questions, draft the per-pillar research agenda for 0B.
6. **Identify gaps.** If a pillar has zero high-priority rows but the project clearly needs research there, surface the gap.
7. **Close the gate.** Confirm all OPEN rows are resolved; surface the research agenda; move to 0B.

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

1. **Detect** — OPEN / untagged enumeration rows while 0B+ has started.
2. **Triage now** — close or DEFER every OPEN row before expanding research.
3. **Freeze** — no new 0B workstreams until the triage gate checklist holds.
4. **Exit** — gate complete; research agenda regenerated.

## Triage produces (or updates) the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], the per-project orchestration HTML surfaces triage outputs as a visible state. After triage:

- Status columns on every enumeration row are populated
- Per-pillar summaries are visible
- Research agenda is linked
- The next step ("0Δ — Project Ambition Gate") is queued

## Relationship to other skills

- [[../enumeration-mode/SKILL|enumeration-mode]] produces the input to triage
- [[../ambition-tier/SKILL|ambition-tier]] runs immediately after triage (0Δ — declare ambition before research begins)
- [[../office-hours-mode/SKILL|office-hours-mode]] is the typical posture during triage
- [[../canonicalize/SKILL|canonicalize]] runs on triage artifacts that need to become canonical for their concern
- [[../idea-archive/SKILL|idea-archive]] is invoked when triage routes a row to ARCHIVED

## Status

- **2026-05-14:** Initial authoring per §28 amendment.
