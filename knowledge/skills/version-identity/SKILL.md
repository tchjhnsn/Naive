---
type: knowledge
tags: [everything-ecosystem, skills, version-identity]
ai-model: claude
created: 2026-05-13
source: hybrid
name: version-identity
description: >
  Author or refresh the Version Identity doc for a project at any version
  boundary. The version identity doc names: (a) the brand continuity invariants
  that must hold across ALL versions, (b) the three working personas the
  product serves across all versions, (c) the sub-persona partitioning rule
  that prevents persona-scope creep, (d) the one-new-persona-per-version rule
  that anchors continuity, (e) the foreshadowing discipline that prevents
  brand discontinuity between versions, and (f) the per-version identity
  (theme, target persona, new affordances, what it foreshadows, what it must
  hold). Authored once at V1, then refreshed at every version boundary. Without
  this doc, version evolution drifts toward feature accretion rather than
  identity continuity. Trigger this skill at the V[N] → V[N+1] boundary, when
  starting Phase 1A for a new version, when an unplanned-evolution moment
  surfaces a brand question, or when a user asks for a "version identity,"
  "brand invariants," "persona evolution," or "how does this version differ."
  MANDATORY TRIGGERS: version identity, brand invariants, persona evolution,
  foreshadowing audit, new persona, version theme, one-per-version rule,
  what should this version do.
---

# Version Identity Skill

The methodology skill for authoring the Version Identity doc — the strategic meta-layer that governs how a SAD-authored product evolves across versions. Captured here after a first project established the discipline 2026-05-12.

## Why this exists

Most product methodology assumes a single version. SAD v3 does not. Products authored under SAD evolve across V1 → V2 → V3 → V4+. Without a doc that names what must hold across versions and what evolves between them, the product drifts: V3 ships a feature that contradicts V1's brand identity; V2 introduces a persona that wasn't foreshadowed; V4 lands on a surface that doesn't fit the established voice. Each of these is a brand discontinuity. The version-identity doc is the prevention.

It's also how a product develops a *soul* across versions. Twitter at 2006 was not Twitter at 2016; the product drifted. A product at V1 should be recognizably the same product at V4+, even though the surface expands dramatically.

## What the doc captures

A version-identity doc has these sections:

### 1. Brand continuity invariants (I1, I2, … I[N])

What must NEVER change across versions. An illustrative set of nine invariants:

- I1 · Founded on primary sources (citation discipline)
- I2 · Built for a named audience (audience definition)
- I3 · Anonymous-first (open door)
- I4 · Data handling is explicit, minimal, controllable (not "never store" — "always disclose + minimize + offer control")
- I5 · Editorial integrity (no advocacy)
- I6 · A consistent voice register
- I7 · A consistent visual identity
- I8 · A fixed relationship between the brand and its subject
- I9 · A fixed ecosystem boundary

Every project's invariants are project-specific. Count varies; the discipline doesn't.

A version-change proposal that would violate any invariant requires a brand-level decision, not a product-level one. Such a decision retroactively reinterprets every prior version. Invariants are the soul of the product across time.

### 2. The three (or N) working personas

Formalized once. Each persona is a *role a person plays in encountering the product*, not a demographic category. The same person can shift between roles within a session.

Per the partitioning rule: every new persona that emerges through real-user behavior or planned evolution must be partitioned as a sub-persona under exactly one of the working personas. If a candidate doesn't fit, either it's audience-drift or a rare brand-level conversation about expanding the working persona set.

### 3. The one-new-persona-per-version rule

Every new version introduces exactly one new sub-persona as its primary design target. The new sub-persona must be one that was *already there* as an existing-but-unserved sub-persona of one of the working personas. We are not inventing the sub-persona at version-design time; we are recognizing that this sub-persona was already in our audience and that this version is when their experience gets the dedicated work.

The rule prevents per-version scope creep. Without it, each version tries to serve "everyone who might want X" and the product fragments.

### 4. The persona evolution model

A single user moves between personas over months and years. The platform should facilitate this. Example: curious visitor → reads sources → becomes a source-anchored reader → discovers a new affordance → becomes a contributor. The platform did not push this evolution; it made the next role discoverable from the current one.

The evolution model names example paths between personas. It does NOT name the platform as gamified or progress-tracked — the evolution is discovery-led, never engagement-led.

### 5. The foreshadowing discipline

Anything that will exist in a future version must be foreshadowed in the version that ships first. Foreshadowing means: a visible, voice-correct affordance that hints at the future capability without committing the platform to a fixed timeline.

Foreshadowing forms:
- **UI affordance.** A button, link, or label that names a future capability (e.g., "Citizens · Coming in V2" footer link before accounts exist).
- **Schema slot.** A DB column or table that exists at V[N] but isn't populated until V[N+M].
- **Voice register.** Copy that uses a term that will become load-bearing later.
- **Empty section with affordance.** A blank surface that names what will fill it.
- **Public documentation.** Roadmap doc + /about page describe the versioning plan.

Foreshadowing is descriptive, not promotional. No "coming soon!" badges. No countdown timers. No teasers.

### 6. Per-version identity (one card per V[N])

Each version gets a card naming:
- **Theme** — one sentence summary of what this version IS.
- **Identity** — paragraph naming the version's product shape.
- **Target persona** — the one new sub-persona for this version.
- **New affordances** — what this version adds that V[N-1] didn't have.
- **What V[N] foreshadows** about V[N+1] and beyond.
- **What V[N] must hold** from prior versions.
- **What V[N] explicitly does NOT do** — the scope-out list.
- **Ship target** — when this version is expected to land.

### 7. Foreshadowing audit V[1] → V[N+]

A grid: each cell names a future-version capability and whether it's currently foreshadowed. Green cells = foreshadowed; red cells = gap that must be closed before V[N] ships.

The audit happens at every version boundary. A red cell in the audit is a V[N] articulation-closure deliverable.

### 8. Predicted vs unplanned evolution

We can plan some directions. Others will surprise us. The version-identity doc names what we predict (so the foreshadowing works) and acknowledges what we can't (so we hedge generously). Concrete unplanned-evolution scenarios are listed: things we hope happen, things we fear could happen, what the response would be in each.

The Twitter example (became a political town square emergent-not-planned) is the canonical reminder.

### 9. Persona tracking mechanism

How the platform observes persona evolution. Privacy-respecting, user-facing, version-bounded. Example pattern: aggregate-only at V1; user-facing opt-in profile at V2; editorial-internal aggregation at V3.

### 10. Methodology implications

What this doc adds to the broader SAD methodology. The disciplines established here (one-per-version, foreshadowing, invariants) become candidate methodology amendments for the next SAD revision.

## When to invoke

- **At V1 spec authoring** (Phase 1B). Authoring the version-identity doc is part of articulation closure.
- **At V[N] → V[N+1] boundary.** Refresh the doc. Add V[N+1]'s identity card. Run the foreshadowing audit. Confirm invariants still hold.
- **When an unplanned-evolution moment surfaces.** A behavior we didn't predict shows up. The doc is the place to record the brand response.
- **When the user asks** "what should V[N] do?" "how does this version differ from the last?" "what holds across versions?"

## How to author / refresh

1. **Read the existing doc** (if it exists).

2. **Audit invariants.** Has any V[N-1] surface drifted from an invariant? If yes, the brand has shifted; declare it explicitly rather than letting it drift.

3. **Audit personas.** Has any sub-persona emerged from V[N-1] usage that wasn't foreshadowed? Partition it under one of the working personas; add to the relevant card.

4. **Author V[N]'s identity card.** Theme, identity paragraph, target sub-persona, new affordances, what it foreshadows, what it holds, what it explicitly doesn't do, ship target.

5. **Run the foreshadowing audit.** Every V[N+1] capability gets a row. Each row is green or red. Red rows become V[N] articulation-closure deliverables (a foreshadowing affordance to add to V[N] before it ships).

6. **Update the unplanned-evolution list.** What's surfaced since the last version? What's the brand response?

7. **Sync to the build roadmap.** Any new deliverables (foreshadowing affordances, invariant work) get roadmap line items.

## Discipline rules

1. **Invariants are non-negotiable across versions.** A version-change proposal that violates an invariant is a brand-level conversation.

2. **One new persona per version.** Period.

3. **Every future capability must be foreshadowed in the version that ships first.** Else it's a brand discontinuity.

4. **Sub-personas roll up under one working persona.** A candidate that doesn't fit reveals either audience-drift or a working-persona gap.

5. **The doc is refreshed at every version boundary.** Stale version-identity = brand discontinuity.

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

1. **Detect** — shipped and in-flight versions from VERSION_SPEC / PRODUCT / roadmap.
2. **Author from reality** — invariants and persona cards that match what shipped.
3. **Run foreshadowing-audit** backfill next.
4. **Freeze** — no new version identity card until the current version is documented.
5. **Exit** — doc covers shipped versions + next version card; roadmap links it.

## Relationship to other skills

- **articulation-closure** — version-identity is one of the articulation closure deliverables.
- **build-roadmap** — version-identity deliverables become roadmap line items.
- **session-capture** — at version boundary, the session-capture ritual includes a version-identity refresh.
- **SAD_SKILL_v3** — parent methodology.

## Methodology amendment queued

The version-identity doc, the one-new-persona-per-version rule, and the foreshadowing discipline should be formalized in the next SAD revision as version-boundary deliverables.
