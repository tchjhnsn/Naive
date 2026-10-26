---
type: knowledge
tags: [everything-ecosystem, skills, articulation-closure]
ai-model: claude
created: 2026-05-13
source: hybrid
name: articulation-closure
description: >
  Run the SAD Phase 1B-Final · Articulation Closure workflow on a project before
  Phase 2 implementation begins (or to recover when implementation surfaces an
  articulation gap mid-Phase-2). Articulation closure is the named phase where
  the three pillars (product / brand / business) are exhaustively inventoried,
  cross-spec gaps are audited, and every UI / UX / brand / business deliverable
  that the next version requires is either authored or consciously deferred
  with a recorded rationale. Without this phase, Phase 2 implementation begins
  on incomplete articulation and quietly produces work that gets unwound later.
  Trigger this skill at the Phase 1B → Phase 2 boundary, when a project regresses
  from Phase 2 back to Phase 1B-Final, at every version boundary (V1→V2, V2→V3),
  or when a user explicitly asks for an "articulation closure inventory," a
  "deliverables inventory," or a "gap audit" against existing specs.
  MANDATORY TRIGGERS: articulation closure, deliverables inventory, cross-spec
  gap audit, phase 1b-final review, phase regression, version boundary,
  sitemap completeness audit, ready for implementation, gap audit.
---

# Articulation Closure Skill

The methodology workflow for closing Phase 1B-Final before Phase 2 implementation may begin. Authored after a phase regression of 2026-05-12 revealed that SAD v3 was missing the named phase between 1B-Final Review and Phase 2 — and that without it, implementation begins on incomplete articulation. Captured here so the same regression doesn't happen on the next project.

## Why this exists

SAD v3 originally treats the Phase 1B-Final Review as a checkpoint that gets passed through. In practice, Phase 1B-Final is a **phase that must be occupied** until a cross-spec gap audit comes back clean. Implementation that begins on a half-closed articulation produces work that has to be unwound when the gaps surface later. The the reference project project demonstrated this: V1 implementation began with a sitemap that covered 3 of 14 substantive entity classes named in DATA_MODEL_SPEC §1.1; the gap surfaced three weeks into implementation; Phase 2 was paused for a phase regression. Articulation closure as a discrete deliverable phase prevents this.

Methodology rationale captured at `_ideas/build-roadmap-and-html-orchestration-2026-05-12.md` (addendum on articulation closure).

## When to invoke

- **Project crossing Phase 1B → Phase 2 boundary.** Before any code is authored. Mandatory.
- **Project crossing version boundary** (V1 → V2, V2 → V3). New version means new articulation closure for the new version's scope.
- **Project regressing from Phase 2 to Phase 1B-Final.** When implementation surfaces an articulation gap that wasn't caught at the original 1B-Final Review.
- **User explicitly asks** for an articulation closure inventory, a deliverables inventory, a gap audit against specs, or a "are we ready for implementation" check.

## The deliverables

Articulation closure produces a defined set of artifacts. They build on each other in order; skipping ahead produces silent gaps.

### Phase 1B-Final · core articulation deliverables

1. **Articulation closure inventory** (master tracking artifact).
   - Sitemap of all V[N] page surfaces, exhaustively enumerated per entity class.
   - Product pillar deliverables (UX + UI + cross-spec bridge), itemized.
   - Brand pillar deliverables (strategy + visual + voice + asset library + brand-in-practice), itemized.
   - Business pillar deliverables (strategy + commercial + legal + ops + measurement), itemized.
   - Each item: explicit status (✓ shipped / ↺ partial / ✗ missing / — deferred / N/A) with rationale and location.

2. **Sitemap v2** — exhaustive page inventory covering every substantive entity class from DATA_MODEL_SPEC §1, plus functional surfaces, machine endpoints, and V[N+1]+ enumerated routes. URL conventions, robots policy, scope-pending decisions.

3. **Navigation map** — independent of sitemap. The graph of how pages link to each other. Affordance taxonomy. Per-page outgoing edges. Citizen journeys (or user journeys for non-civic products). Orphan + dead-end + cycle audit.

4. **Information architecture doc** — bridges data-model entity partition to user-facing taxonomy. Tier structure. Data-model → user-model mapping with intentional divergences recorded. Mental models. Discovery patterns. Hierarchical vs peer relationships. Faceting strategy.

5. **Audience / persona note** — who the version is for, who it's explicitly not for, working personas (typically 3), audience implications for product decisions, re-evaluation triggers.

6. **Version identities & persona evolution doc** — meta-layer. Brand continuity invariants (across all versions). Three working personas formalized. Sub-persona partitioning rule. Persona evolution paths. One-new-persona-per-version rule. Foreshadowing discipline. Version identity per V[1..N+]. Foreshadowing audit.

7. **UX flows** — one flow per PRODUCT_SPEC F-flow, plus supporting flows (disambiguation, error recovery, etc.). Each flow: preconditions, happy path with affordance mapping, error paths, edge cases, surfaces touched, status.

8. **Content models** — per page type. What sections / blocks / fields appear on each entity-class wiki. Required vs optional blocks. Shared blocks vs type-specific.

9. **Wireframes** — low-fi structural layouts per page type. Mid-fi only for contested layouts. Hi-fi typically deferred unless required by version scope.

10. **Component library catalogue** — inventory of every UI component needed across the version's surfaces. Per component: shipped vs missing vs deferred.

11. **Cross-spec bridge artifacts:**
    - Cross-spec gap audit (three-direction: entities→UX surfaces; behavioral-states→UX states; F-flows→UX-flow docs).
    - F-flow × UX-flow mapping table.
    - State-machine × UX-state mapping.
    - Entity × surface coverage matrix.
    - Data-field × UI-element mapping.

12. **Communication contracts (software, networked slices)** — Tier A API-first
    assets per [[../contract-first/SKILL|contract-first]]: OpenAPI and/or
    AsyncAPI and/or MCP schemas, auth model, error/incomplete conventions,
    versioning policy, fixtures, and IMPL_SPEC pointer. Required before Phase 2
    coding of each client–server or client–agent boundary, or recorded as
    deferred with version trigger.

13. **Brand pillar deliverables** specific to the version — identity guidelines, voice guidelines, asset library, brand-in-practice ops.

14. **Business pillar deliverables** specific to the version — legal/compliance docs, operational runbooks, accessibility statement, metrics framework, customer-support model.

### Articulation closure verification (the exit criteria)

Run after all deliverables above are authored. Until every row passes, articulation closure is incomplete.

- Every DATA_MODEL substantive entity has a UX surface or recorded deferral.
- Every DATA_MODEL geographic / temporal entity has a UX surface or recorded deferral.
- Every PRODUCT_SPEC F-flow has a UX flow doc.
- Every BEHAVIORAL_SPEC state machine has a UX surface assignment.
- Every shipped surface has a wireframe.
- Every shipped surface has voice-compliant microcopy.
- Every shipped surface has accessibility-checklist conformance verified.
- Product microcopy is voice-compliant per brand voice guidelines.
- Product visual treatment matches identity guidelines.
- Product affordances respect ToS commitments.
- Brand promise is structurally supported by the implementation.
- Business commitments have backing runbooks.
- Every PRODUCT_SPEC F-flow or capability cluster that crosses a client–server or client–agent boundary has Tier A communication-contract assets (per contract-first skill), or a recorded deferral with version trigger.
- **Every Asset Requirement Set row due by 1B-Final is ✓ authored or — deferred with version trigger** (per [[../asset-requirements/SKILL|asset-requirements]]). If no ARS exists, author one before claiming closure.
- Every ✗ missing item has rationale.
- Every — deferred item names the trigger version.
- Every N/A item names why it doesn't apply.
- Build roadmap reflects every ✗ missing as an authored task.
- **The completion condition is FUNCTIONAL, not structural.** Added 2026-05-13 after a V1-deploy postmortem. A completion condition that names structures ("every route renders," "tsc passes," "every ✗ becomes ✓") passes mechanical verification but admits façades. The completion condition must name *user-facing behavior*: "A citizen types any U.S. zip code, clicks a rep card, and reaches a real article anchored in primary sources." Structural conditions are acceptable only as intermediate gates within the plan; they may not stand alone as the closure bar. The Ralph Wiggum test gets a sub-clause: *Ralph can also confuse "the route renders" with "the user can use this" — if the completion condition lets that confusion through, it is structural and must be rewritten functionally.*

When all verification rows pass, articulation closure is achieved. Phase 2 implementation may begin (or resume).

## Backfill / missing assets (mid-Phase-2 recovery)

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

### Detect

Diff DATA_MODEL entities, PRODUCT F-flows, and BEHAVIORAL state machines against
sitemap, UX flows, wireframes, and communication contracts.

### Triage

| Class | Rule |
|---|---|
| **Phase regression** | Gap blocks correct implementation of an active slice → pause that slice, return to 1B-Final for those rows |
| **Queued debt** | Surface ships with known holes; inventory ✗ / — deferred with version trigger; roadmap lines required |
| **Façade risk** | Structural “done” without functional completion condition → rewrite exit criteria before continuing |

### Order

1. Refresh or author the articulation closure inventory (canonical tracker). Prefer the entity's Asset Requirement Set as the master list of *required* assets; the inventory records their status.
2. Close cross-spec gap audit for the **active version slice** only.
3. Author missing Tier A contracts for networked slices (contract-first backfill)
   in parallel with UX gaps that block the same slice.
4. Resume Phase 2 only for slices whose verification rows pass.

### Freeze / exit

Do not open **new** entity classes, F-flows, or client–server surfaces while
their articulation rows are ✗ missing. Exit when the slice shows ✓ or —
deferred (with trigger) and the functional completion condition still names
user behavior.

## How to run the workflow

When this skill is invoked, follow this sequence:

### Step 1 — Establish or read the existing articulation closure inventory

If the project already has an articulation closure inventory (e.g., `articulation-closure-inventory-[date].md` at the project root), read it. Establish current state of every line item. If not, author one fresh, modeled on a prior project's inventory at a project file.

The inventory is the master tracking artifact. Update it as deliverables ship. Keep both markdown + HTML renderings (the markdown is the working doc; the HTML is the viewable artifact).

### Step 2 — Audit the current state against the DATA_MODEL_SPEC entity registry

Read `docs/specs/DATA_MODEL_SPEC.md` (or equivalent). For every entity class in §1.1 (substantive) and §1.2 (geographic) and §1.4a (temporal), confirm there is a corresponding sitemap entry. Any entity without a sitemap entry is either:
- A real V[N]-in gap that needs to be authored as ✗ missing on the inventory; or
- A consciously-deferred entity that gets — deferred with a trigger version.

There is no third category. Silent absence is the failure mode.

### Step 3 — Author the deliverables in order

The order matters because each deliverable builds on the prior. Do not skip ahead.

1. Articulation closure inventory (initial / refresh).
2. Sitemap v2.
3. Navigation map.
4. Information architecture doc.
5. Audience / persona note.
6. Version identities & persona evolution doc (if not already authored for the project).
7. UX flows (one batched doc covering all F-flows is often the most efficient format).
8. Content models per page type (one batched doc).
9. Wireframes (one batched doc covering all surfaces).
10. Component library catalogue.
11. Cross-spec bridge artifacts.
12. Brand pillar deliverables.
13. Business pillar deliverables.

Each deliverable is authored as an HTML doc in `product/design/` (or equivalent). Style is consistent with prior project artifacts — each project uses its own brand. The HTML format is preferred over markdown because it renders in a browser and uses visual structure to make status legible.

Each deliverable, once shipped, is marked ✓ shipped on the articulation closure inventory with a location pointer.

### Step 4 — Run the verification

After all deliverables are authored, run the verification table from the inventory's Section 5 (or equivalent). Every row must pass. If any row fails, return to Step 3 and close the gap.

### Step 5 — Author or update the build roadmap

The build roadmap (per the companion `build-roadmap` discipline at `_ideas/build-roadmap-and-html-orchestration-2026-05-12.md`) reflects every ✗ missing item that remains as a work-to-author task with explicit ordering (sync / async / parallel) before Phase 2 implementation may begin.

### Step 6 — Declare phase closure

When verification passes and the build roadmap is complete, declare Phase 1B-Final · Articulation Closure complete. Phase 2 implementation may begin (or resume).

### Step 7 — Hand off to the execution layer

Phase 2 may be executed by a human in the loop, by a human with agent-assist, or fully autonomously. The autonomous-execution layer is **adopted from the community**, not authored by this methodology. See the Ralph methodology survey (`_ideas/ralph-methodology-survey-2026-05-13.md`) for the recorded decision and rationale. Specifically:

- **Anthropic's `ralph-wiggum` plugin** (in claude-code) is the canonical execution primitive. Stop hook intercepts session exits and re-feeds the prompt while preserving file modifications + git history between iterations.
  - Repository: <https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum>
  - Plugins listing: <https://claude.com/plugins/ralph-loop>
- **awesomeclaude.ai's Ralph Wiggum entry** is the operational reference for how to invoke, what prompts work, what completion conditions look like.
  - <https://awesomeclaude.ai/ralph-wiggum>
- **claudefa.st's overnight-autonomy walkthrough** is the operational reference for longer-running autonomous sessions.
  - <https://claudefa.st/>
- **Snarktank/ralph and Geoffrey Huntley's "everything is a ralph loop"** are the upstream community tradition; cite for talks + context.
  - <https://github.com/snarktank/ralph>

The articulation-closure inventory's verification table (with functional completion conditions per the 2026-05-13 update) is the substrate the executor measures against. The composition is: articulation closure here → completion condition (functional) → community Ralph executor → autonomous Phase 2.

## Discipline rules

These rules are load-bearing. Violating any one of them re-opens articulation closure.

1. **No silent absence.** Every item is explicitly shipped, partial, missing, deferred, or N/A. A deliverable that simply doesn't appear in the inventory is a violation.

2. **Every deferral names a trigger version.** "Deferred to V1.x" or "Deferred to V2" — never just "deferred."

3. **Every N/A names a reason.** N/A items are decisions, not absences. The reason gets recorded so future re-evaluators understand the call.

4. **No deliverable ships without its predecessor.** Wireframes do not ship before content models. Content models do not ship before IA. IA does not ship before sitemap. The order is structural.

5. **One-new-persona-per-version.** Per the discipline established in `version-identities-persona-evolution-2026-05-12.html`. Every new version targets exactly one new sub-persona, partitioned under one of the working personas.

6. **Foreshadowing is required for everything that comes later.** Per the foreshadowing discipline. If V[N+1] will add X, V[N] must foreshadow X — either via a UI affordance, a schema slot, a voice register, or an explicit roadmap reference.

7. **Brand continuity invariants are non-negotiable.** Per version-identities §01. Any version change that violates an invariant requires a brand-level decision, not a product-level one.

8. **The articulation closure inventory is the source of truth.** Other docs reference it. When in doubt about what's shipped vs missing, the inventory is canonical.

## Related skills + methodology

- **build-roadmap** — companion skill for authoring the build roadmap deliverable that articulation closure produces.
- **version-identity** — companion skill for authoring the version identity doc (one per version).
- **SAD_SKILL_v3** — the parent methodology this skill fits within.
- **session-capture** — invoked at session boundaries during articulation closure work.
- **time-awareness** — invoked for any timestamp during articulation closure work.

## Adopted from the community (not authored here)

Per the recorded decision 2026-05-13 in `_ideas/ralph-methodology-survey-2026-05-13.md`: the autonomous-execution layer is adopted from the community, not authored by this methodology. This skill produces the precondition; the executor below runs against it.

- **`ralph-wiggum` Claude Code plugin (Anthropic, first-party).** The canonical execution loop. Install in the operator's local Claude Code environment before running autonomous Phase-2 work. <https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum> · <https://claude.com/plugins/ralph-loop>
- **awesomeclaude.ai · Ralph Wiggum** — operational reference for invocation patterns. <https://awesomeclaude.ai/ralph-wiggum>
- **claudefa.st · Run autonomously overnight** — operational reference for longer-running autonomous sessions. <https://claudefa.st/>
- **snarktank/ralph + Geoffrey Huntley's "everything is a ralph loop"** — upstream community tradition; cite for talks + context.

This skill does not author its own loop. If a future Claude Code version supersedes the `ralph-wiggum` plugin (e.g., `/goal` integration), the executor changes — the articulation discipline does not.

## Methodology amendments queued

This skill captures a discipline that should be formalized in the next SAD revision. Pending amendments per `_ideas/build-roadmap-and-html-orchestration-2026-05-12.md`:

1. SAD adds a named phase: **Phase 1B-Final · Articulation Closure**, with the deliverables and exit criteria above.
2. SAD adds **phase regression protocol** — what happens when Phase 2 surfaces a gap and the project needs to return to articulation closure.
3. SAD adds **UI / UX deliverables decomposition** to the deliverables-inventory template (UI vs UX vs cross-spec bridge).
4. SAD adds **cross-spec gap audit** as a Phase 1B-Final deliverable.
5. SAD adds the **one-new-persona-per-version rule** as a versioning discipline.
6. SAD adds the **foreshadowing discipline** as a versioning rule.
7. **(Added 2026-05-13 from the V1-deploy postmortem.)** SAD adds the **functional completion condition rule** — final completion conditions name user behavior, not code structure. Structural conditions admit façades; functional conditions don't. See the build-roadmap idea-dump §12 for the encoded amendment.
8. **(Added 2026-05-13 from the V1-deploy postmortem.)** SAD adds **bundled-commit hygiene** — every file in a staged diff is surfaced and reviewed before the commit message is drafted. See build-roadmap idea-dump §13.
9. **(Added 2026-05-13 from the V1-deploy postmortem.)** SAD adds the **brand-load-bearing assets must be explicitly loaded** rule — system cascade is fallback only; identity-defining assets (fonts, color, logos) must be loaded explicitly. See build-roadmap idea-dump §14.

Each becomes a formal proposal at the methodology layer once a project has shipped V1 + V2 and the discipline has been proven across multiple versions.

## Related artifacts (2026-05-13)

- **Session debrief / failure postmortem template:** `_sessions/2026-05-13-v1-deploy-postmortem.md` is the first failure postmortem in the vault and the template for future ones. When this skill encounters an articulation gap that surfaces post-implementation, author a postmortem of that shape.
- **Ralph methodology survey:** `_ideas/ralph-methodology-survey-2026-05-13.md` documents the adopt-vs-author split with the community Ralph loop work. The execution layer (loop) is adopted from Anthropic's `ralph-wiggum` plugin and the community tradition; the articulation layer (this skill) is the SAD contribution.
