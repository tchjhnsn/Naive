---
type: knowledge
tags: [everything-ecosystem, skills, build-roadmap]
ai-model: claude
created: 2026-05-13
source: hybrid
name: build-roadmap
description: >
  Author or maintain a Build Roadmap deliverable for a project at the Phase
  1B-Final → Phase 2 boundary. The build roadmap is a single HTML artifact that
  decomposes every spec commitment into an itemized build plan with explicit
  ordering (sync / async / parallel), tracks per-line status (✓ done / ↺ partial
  / ⏸ paused / ◐ in progress / pending) with timestamps, and serves as the
  single orchestration surface the operator works against during implementation.
  Per the methodology insight at `_ideas/build-roadmap-and-html-orchestration-2026-05-12.md`,
  the build roadmap is what makes incompleteness visible before dependents
  accumulate. It is also the surface the LLM updates line-by-line during
  sessions as work ships. Trigger this skill when authoring an initial roadmap,
  when a deliverable ships and the roadmap needs an update, when a phase
  boundary is reached, or when a user asks for a "build roadmap," "roadmap doc,"
  "what's left," or "what ships next." MANDATORY TRIGGERS: build roadmap,
  roadmap, what's left, what ships next, what's done, status check, phase
  boundary, line item, deliverables ordering.
---

# Build Roadmap Skill

The methodology skill for authoring and maintaining the Build Roadmap deliverable that bridges Phase 1B-Final · Articulation Closure and Phase 2 · Implementation. Captured here so the discipline transfers to every project that uses SAD.

## Why this exists

SAD v3 specifies the spec stack (Phase 0 → 1A → 1B) and the implementation phase (Phase 2). What was missing between them is a deliverable that decomposes the spec commitments into an ordered, status-tracked, single-surface build plan. Without it, implementation begins with a pile of specs and no shared understanding of order, parallelizability, or progress. The build roadmap is that bridge.

It's also the **orchestration surface** the operator works against during implementation. Per the methodology addendum: a continuously-updated HTML roadmap that the LLM edits in place during sessions, viewed in a browser by the operator, is functionally equivalent to (and simpler than) the agent-orchestration-OS frameworks proliferating in AI tooling. The roadmap is artifact AND orchestration layer in one document.

## The four-axis structure

Every build roadmap line item answers four questions:

1. **What.** What's the deliverable — bounded, named, attributable to a spec section.
2. **Order.** What precedes it; what depends on it. Some work has hard sequence (schema before seed before page); some doesn't.
3. **Sync vs. async.** Some deliverables block the next one in the session (sync — e.g., typecheck after a schema change). Some don't (async — e.g., authoring an operational runbook in parallel with implementing a feature).
4. **Parallelizable.** Can this run on a separate agent / branch / workstream without contention with the operator's primary track?

The four-axis structure is what distinguishes a build roadmap from an unordered task list. Without it, "roadmap" tends to mean "a list of things to do" and the operator drifts.

## When to invoke

- **At Phase 1B-Final → Phase 2 boundary.** Mandatory. The articulation closure inventory feeds into the build roadmap; ✗ missing items become roadmap line items.
- **When a deliverable ships.** Update the roadmap line to ✓ done with a timestamp + location pointer. Update the status callout if the change is material.
- **When scope surfaces during a session.** Add a new line item rather than mentally tracking it.
- **At every phase boundary.** Roadmap reflects current state at every boundary; stale roadmap = drift signal.
- **When the user asks "what's left?"** or "what ships next?" The roadmap answers.

## Structure

A build roadmap HTML doc has these sections, in order:

1. **Frontispiece** — project name, "Strategic Roadmap" title, authored date, single-operator note, owner.

2. **Status callout** — the most recent meaningful update. Rewritten when something material ships. Tells a reader landing fresh "here's what's true right now." Typically 3–5 sentences. Replaced wholesale on updates, not appended.

3. **Phase regression callout** (when applicable) — if the project is in phase regression (e.g., paused Phase 2 to return to articulation closure), an explicit red-bordered callout names the regression, why, what's paused, what's active.

4. **Table of contents** — anchor links to every phase section.

5. **Status checkpoint** — "what's complete," "what's paused or partial," "what's been authored in the broader ecosystem." This is the project's snapshot. Updated as the phase progresses.

6. **One section per phase**, each with engineering / content / brand / operations / polish sub-sections. Status badges on each phase: Active, Paused, Next, Future. Phase-status colors are consistent across the project's roadmaps.

7. **Per-line item styling:**
   - `class="done"` → green check mark, struck-through or muted, with timestamp + location
   - `class="inprogress"` → ◐ glyph, active session highlight
   - `class="paused"` → ⏸ glyph, muted
   - default (pending) → no class, neutral
   - `class="missing"` → red, "blocker" framing if blocking the phase

8. **How to use this roadmap** section at the bottom — five-ish guidance points on how the operator should read + update the document during sessions. Includes a status legend.

9. **Orchestration pattern callout** — names that this document IS the orchestration surface. References the build-roadmap-and-html-orchestration idea-dump.

## How to maintain the roadmap during a session

1. **At session-start**, read the roadmap. Note current phase status, the active items, paused items, the topmost ✗ missing items.

2. **When work begins on a line item**, flip it to `class="inprogress"` (◐). Add a "started [timestamp]" note in the delv-meta.

3. **When work ships**, flip it to `class="done"` (✓). Add the timestamp + location pointer in the delv-meta. Move the line into the right phase's done-set if the structure has done/pending sub-divisions.

4. **When scope surfaces**, add a new line item to the right phase + sub-section. Mark it as pending. If it's a blocker for current work, mark it `class="missing"`.

5. **When something material ships**, rewrite the status callout. Don't append; rewrite. The callout should reflect "what's true right now," not the project's history.

6. **At session-end**, save the file. The next session reads it; that's the cross-session handoff.

7. **At phase boundary**, the roadmap is the artifact that proves the phase is complete. Every phase has explicit exit criteria; the roadmap reflects whether they're met.

## Discipline rules

These are what distinguish a working roadmap from a stale document.

1. **Update in place, not append.** Status callouts get rewritten when state changes. Don't accumulate an audit trail in the callout — that lives in the per-line timestamps.

2. **No silent line items.** Every line is explicitly done / partial / paused / in-progress / pending. If a line is in an ambiguous state, that's a discipline failure.

3. **One file per project.** Multiple roadmap files = drift. The single roadmap is canonical.

4. **HTML, not markdown.** Markdown works for prose; HTML renders status visually + lets the operator scan at a glance. Use both inline classes + visual treatment.

5. **The roadmap is the orchestration surface.** Treat it as such. The operator reads it between sessions; the LLM updates it during sessions; the team (if any) syncs to it.

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

1. **Detect** — active branches, SESSION_LOG open work, articulation ✗ rows, and every `✗ missing` / `↺ partial` row on the entity's Asset Requirement Set.
2. **Author a roadmap from reality** — done from git/history; blockers in red;
   do not invent a greenfield plan that ignores shipping code.
3. **Freeze** — no new parallel workstreams until the roadmap names them.
4. **Exit** — operator can answer “what's left / what blocks next” from the file.
5. Gate-skill debt (contracts, articulation, smoke, ARS obligation rows) must be
   explicit roadmap lines, not tribal knowledge.

## Relationship to other skills

- **articulation-closure** — produces the inventory that feeds the roadmap. Articulation closure exit criteria are roadmap inputs.
- **asset-requirements** — every `✗ missing` ARS row becomes a roadmap line item; obligation-mandated rows are blockers.
- **session-capture** — session-end ritual includes a roadmap-sync check.
- **time-awareness** — used for every timestamp on the roadmap.
- **SAD_SKILL_v3** — parent methodology.

## Methodology amendment queued

Per `_ideas/build-roadmap-and-html-orchestration-2026-05-12.md`, the build roadmap should become a required Phase 1B-Final deliverable in the next SAD revision, with the four-axis structure formalized and the HTML-as-orchestration-surface pattern documented.
