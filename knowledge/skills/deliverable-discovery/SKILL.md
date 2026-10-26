---
type: knowledge
tags: [everything-ecosystem, skills, deliverable-discovery]
ai-model: claude
created: 2026-05-15
source: hybrid
name: deliverable-discovery
description: >
  Detect gaps in the standard deliverable templates and generate Tier 3
  (idea-derived) deliverable stubs. The mechanism that grows the template
  inventory from real conversations rather than pre-imagined coverage. Auto-loads
  when a conversation reveals that something should be a deliverable but isn't
  in the standard template (Tier 1 pillar-wide or Tier 2 product-type-specific).
  Routes the new stub to the appropriate pillar + product's deliverables folder
  with a Tier 3 idea-derived tag. Per SAD v3.3+ amendment §33.
  MANDATORY TRIGGERS: deliverable discovery, missing deliverable, gap in template,
  this should be a deliverable, tier 3 deliverable, idea-derived deliverable,
  what else should exist, deliverable gap, what are we missing, this needs a
  doc, this should have a template, /discover-deliverables.
---

# Deliverable Discovery Skill

The closed-loop mechanism that grows the deliverable template inventory from real project conversations. Without this skill, templates only cover what someone pre-imagined; with this skill, templates accumulate from work.

## Why deliverable-discovery exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §33]], the methodology has three layers (pipeline / company template / deliverable templates). Deliverable templates have three tiers:

- **Tier 1 — Pillar-wide:** every pillar instance produces these (e.g., every Brand has identity + voice + assets)
- **Tier 2 — Product-type-specific:** depends on product type (e.g., software product has data model spec; content product has editorial calendar)
- **Tier 3 — Idea-derived:** discovered per project; not in any standard template

Tier 3 is the growth surface. Without a mechanism to discover + capture Tier 3 deliverables, the methodology stays stuck at the level of imagined coverage. With deliverable-discovery, every project that surfaces a new kind of deliverable contributes it back to the pool, where it eventually graduates to Tier 2 (when it appears across enough projects to be reusable) or stays Tier 3 (when it's genuinely one-off).

Examples of Tier 3 deliverables:

- "Concentric-rings source classification" — surfaced during 1B; not in any standard template; codified as a project-specific deliverable
- "Foreshadowing audit" — V[N] → V[N+1] persona evolution check; surfaced during Articulation Closure
- "Version-identities document" — meta-layer; surfaced during 1A
- "Anti-scraping plan" — Twitter-posture for civic data; surfaced during business pillar work
- "District-map SVG strategy" — surfaced when wireframes needed a specific shape

Each of these was a Tier 3 discovery the first time. Several have become candidates for Tier 2 promotion (foreshadowing, version-identities) once they appeared in multiple projects.

## When to invoke

This skill should auto-load when:

- The conversation references something that "should be a doc" or "should have its own deliverable" but isn't in any standard template
- A spec stack review surfaces a missing artifact category
- An articulation closure inventory has a row with no matching deliverable in the standard inventory
- The user explicitly asks "what are we missing?" or "what other deliverables should exist?"
- A pattern recurs across project work (e.g., "we keep needing to write a [X] for these projects") that suggests a missing template

## How to run deliverable discovery

When this skill is loaded, the AI should:

### Step 1 — Detect the gap

Surface the gap explicitly:

> "This conversation is referencing a [type of artifact] that doesn't exist in the standard deliverable templates for the [pillar] pillar. Specifically:
> - It serves the purpose of: ___
> - It would be produced during phase: ___
> - It would be owned by role: ___
> - It would integrate with existing deliverables: ___"

If the gap doesn't pass this articulation test, the AI may be hallucinating a deliverable. Confirm with the operator before proceeding.

### Step 2 — Classify the gap

Determine whether this is:

- **Tier 1 candidate** — applies to every pillar instance. Promote to standard Tier 1 if discovered across multiple projects. (Rare for genuinely new discoveries; more common as a refinement of an existing Tier 1.)
- **Tier 2 candidate** — applies to a specific product type. Promote when the same gap recurs across multiple projects of the same product type.
- **Tier 3 — idea-derived** — project-specific. Capture per-project; no template promotion (yet).

Most discoveries are Tier 3 initially. Tier 2 promotion happens when the AI notices the same Tier 3 deliverable across 3+ projects of the same product type.

### Step 3 — Generate the stub

For Tier 3 deliverables, generate a stub at the appropriate location:

```
projects/<entity>/<pillar>/deliverables/<deliverable-name>.md
```

Stub structure:

```yaml
---
type: deliverable
tier: 3-idea-derived
pillar: <pillar>
product: <product-name-or-pillar-wide>
phase: <phase-where-this-belongs>
source: hybrid
created: <date>
authorship: hybrid
tags: [deliverable, tier-3, <entity>, <pillar>, <phase>]
status: stub
---

# <Deliverable name>

## Purpose
<one paragraph on what this deliverable is for>

## Why it surfaced
<the conversation / phase that revealed this needed to exist>

## Content shape
<what this deliverable should contain — outline, not body>

## Related deliverables
<links to adjacent deliverables this complements>

## Status
- <date>: Stub generated by deliverable-discovery skill
```

### Step 4 — Update the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], the per-project orchestration HTML surfaces deliverable status. Add the new Tier 3 deliverable to the appropriate pillar's deliverable inventory with `status: stub`.

### Step 5 — Track for promotion (paths P1–P5)

Promotion into [[../../CANONICAL_ASSET_REGISTRY|CANONICAL_ASSET_REGISTRY]] follows the paths in [[../../ASSET_REQUIREMENTS_METHOD|ASSET_REQUIREMENTS_METHOD]] §9. **Do not wait for three projects when the asset is already mandatory:**

| Path | Promote when… |
|---|---|
| **P1 Standard-mandated** | an industry standard requires it (e.g. OpenAPI for a public HTTP API) |
| **P2 Obligation-mandated** | law, regulation, or risk posture requires it |
| **P3 Characteristic-implied** | a declared characteristic cannot be operated without it |
| **P4 Failure-derived** | its absence already caused a material failure |
| **P5 Recurrence-derived** | the same Tier 3 asset appears across 3+ projects |

P1–P4 enter the registry (or the project's ARS via [[../asset-requirements/SKILL|asset-requirements]]) immediately. Only P5 remains the empirical recurrence path. Flag the path and originating project when surfacing a promotion to the operator.

### Step 6 — Author or defer

The stub is the starting point. Authoring the full deliverable can happen now (if the conversation is ready) or be deferred (if the operator has other priorities). The stub stays in the deliverable inventory with `status: stub` until authored. If the discovery is characteristic-implied or obligation-mandated, also update the entity's Asset Requirement Set.

## What deliverable-discovery is NOT

- **Not a brainstorm-everything skill.** Don't suggest deliverables that haven't surfaced from real work. The skill detects gaps; it doesn't invent them.
- **Not a replacement for standard templates.** Tier 1 and Tier 2 templates exist for a reason; discovery handles the cases standard templates miss.
- **Not always Tier 3.** When a gap is genuinely common (recurring across projects), the right move is Tier 2 promotion — not infinite Tier 3 sprawl.

## Relationship to other skills

- [[../template-generation/SKILL|template-generation]] (to author) — generates Tier 1 + Tier 2 stubs at project start; deliverable-discovery handles the Tier 3 case
- [[../asset-requirements/SKILL|asset-requirements]] — derives the full required set from characteristics; discovery feeds new entries into the registry
- [[../articulation-closure/SKILL|articulation-closure]] — articulation closure verification often surfaces Tier 3 candidates (rows in the inventory with no matching deliverable category)
- [[../canonicalize/SKILL|canonicalize]] — when a Tier 3 deliverable becomes canonical for its concern, canonicalize establishes the cross-references

## Status

- **2026-05-14:** Initial authoring per §33 amendment.
- **2026-07-26:** Promotion paths P1–P5 replace recurrence-only default (SAD amendment 2026-07-26 asset-requirements-method).
