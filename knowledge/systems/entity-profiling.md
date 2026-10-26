---
type: knowledge
source: hybrid
created: 2026-04-19
ai-model: claude
tags: [everything-ecosystem, systems]
---
# Entity Profiling System

This system handles the five modes of operation for creating, analyzing, reviewing, developing,
and making decisions about entities. It reads and writes entity profiles — the atomic unit of the
Everything Ecosystem framework.

**Structural primitives are defined in the orchestrator.** This system references them but does
not redefine them.

## Modes of Operation

### Mode 1: Discovery
**When to use:** The user has a new idea, product, or project and wants to determine what it is
and where it fits.
**Process:** Read `references/discovery-mode.md` and follow the guided interview process. When
the entity exists primarily as a codebase without documentation, analyze the code directly as
described in the discovery mode's codebase analysis section. Adapt the interview to the user's
engagement mode.
**Output:** A completed entity profile in markdown, plus a documentation audit showing what
documentation exists, what's expected, and what should be produced next.

### Mode 2: Analysis
**When to use:** The user wants to map the structure of an existing company, ecosystem, or set
of entities.
**Process:** Read `references/analysis-mode.md` and follow the analytical process. For entities
that exist as codebases without documentation, analyze the code directly.
**Output:** Entity profiles for each entity identified, plus a relationship map, ecosystem
overview, and documentation audit across the ecosystem.

### Mode 3: Review & Update
**When to use:** The user wants to revisit an existing entity profile because something has
changed — a new product launched, a pivot occurred, code changed, a brand decision was made,
or time has passed.
**Process:** Read the existing entity profile, then walk through each section asking what has
changed. Focus on sections most likely affected by the trigger event. If the trigger was a code
change, focus on the product pillar. If a brand event, focus on brand. If nothing changed, say
so and move on.
**Output:** An updated entity profile with a changelog entry noting what changed and when.

### Mode 4: Pillar Development
**When to use:** The user has classified an entity and wants to develop a specific pillar through
its lifecycle stages.
**Process:** Read `references/pillar-development-guide.md` and guide the user through the
relevant pillar at the relevant lifecycle stage. Respect engagement mode granularity.
**Output:** Documentation, decisions, and action items for the pillar being developed.

### Mode 5: Decision
**When to use:** The user faces a strategic question — what to build next, whether an idea belongs
in the ecosystem, how to sequence, whether to expand horizontally or vertically.
**Process:** Read `references/decision-framework.md` and guide the user through the relevant
decision type.
**Output:** A recommendation with reasoning, grounded in entity profiles and ecosystem structure.

## The Entity Profile Schema

Read `references/entity-profile-schema.md` for the complete schema. The profile contains:

1. **Identity** — name, description, type, parent entity
2. **Classification** — spectrum position, confidence level, potential trajectory
3. **Pillar Assessment** — product, brand, business (each with lifecycle stage). Product includes
   orientation and composition.
4. **Mission Alignment** — what mission this entity serves and how
5. **Relationships** — type, strength, directionality for each related entity
6. **Visibility** — per-asset decisions (public, private, open source, internal)
7. **Child Entities** — references to nested entity profiles
8. **Lifecycle & Archival** — active, archived, discontinued with history
9. **Documentation Audit** — what exists vs. what should exist, with gap analysis
10. **Changelog** — record of changes over time

## Operational Behaviors

**Always ask before classifying.** Present assessment and reasoning, then confirm. Classification
has downstream consequences.

**Preserve the idea dump.** Ideas without classification go to the idea dump as unplaced ideas,
not discarded or prematurely classified.

**Acknowledge ambiguity.** When relationships, statuses, or classifications are debatable, name
the ambiguity. The framework accommodates uncertainty.

**Archival, not deletion.** Entity profiles are never deleted. Archived with records of when,
why, and what replaced them.

**Always produce output, even when asking questions.** Produce a preliminary profile based on
what's known. Flag uncertainties. Ask clarifying questions alongside output, not instead of it.

**Analyze code directly when documentation is absent.** Read the codebase: directory structure,
manifests, models, routes, components, configs, tests. Form a preliminary understanding and state
it.

**Surface documentation gaps as findings.** Compare what exists against
`references/documentation-expectations.md`. Flag gaps with priority levels and recommend next
steps.

**Pause when evidence is insufficient.** Produce partial profile with everything determined
confidently. Present gap report with only the questions blocking forward progress right now.

**Use uncertainty language honestly.** Assert what evidence supports, acknowledge what it's silent
on, name what would resolve the silence.

**Trigger documentation audit after every document creation or modification.** The entity profile's
Documentation Audit must reflect current state at all times. A document creation that does not
update the audit is incomplete.

**The entity profile is always the last file touched.** After any workflow that produces or
modifies documents for an entity, update the entity profile last — reflecting changes in the
audit, key artifacts, pillar assessments, or changelog.

## Relationship Types

When mapping relationships between entities:

- **Horizontal adjacency** — same level, complementary markets. Each independently viable.
- **Vertical integration** — different levels of same value chain. Sovereignty over supply chain.
- **Diagonal movement** — horizontal expansion creates vertical opportunity. Cannot be fully
  predicted.
- **Radial** — core and surfaces within product composition. Improvements propagate.
- **Loose affiliation** — shared parent and mission, minimal operational integration.
- **External dependency** — relied upon but not owned. Note strategic implications.

Categories can blur. Note ambiguity rather than forcing a category.

## Documentation Expectations

Read `references/documentation-expectations.md` for the full specification of:
- What documentation each pillar should have at each lifecycle stage
- Cross-pillar documents (entity profile, idea dump)
- Document relationships (entity profile as root, flow directions, consistency rules)

## Structural Frontmatter (Required on Every Profile)

Entity profiles live in the vault as markdown files and must declare structural frontmatter so Dataview queries and AI agents can reason about the ecosystem. Read `references/entity-profile-schema.md` § "Vault Frontmatter" for the complete field list. The minimum set every profile declares:

- `type` — one of `entity-profile`, `platform-profile`, `app-profile`
- `entity-class` — `business | hobby | platform | app | hybrid | standalone`
- `product-orientation` — `offering | operational-capability | enabling-infrastructure` (required 2026-08-10; do not invent `product-kind:`)
- `brand-scope` — `parent | own | none` (required on nested **apps**; org-structure 2026-08-10)
- `business-scope` — `parent | own | none` (**parent ecosystem + platforms only** — never on apps/products)
- `entity-lifecycle-stage` — `concept | scoped | specced | prototyping | active | maintenance | archived`
- `source` — `human | machine | hybrid`
- `created`, `tags` — standard vault-wide frontmatter

### Choosing the Profile Type

- **Plain `entity-profile`** — for entities that are neither platforms nor apps: standalone businesses, hobbies, research projects, legacy entities. Use when `entity-class` is `business`, `hobby`, or `standalone`.
- **`platform-profile`** — for entities with `entity-class: platform`. The type alerts queries and agents that this entity exposes capabilities consumed by other entities. Platform profiles additionally require `platforms-provided` and optionally `consumed-by-surfaces` (legacy key; means consuming apps). Nested platforms default to product-only trees (`brand-scope: none` or `parent`) and **may** carry `business-scope`.
- **`app-profile`** — for entities with `entity-class: app`. App profiles additionally require `platforms-used` and `surfaces-of` (legacy key; means parent ecosystem). Nested suite apps default `brand-scope: parent`, do **not** carry `business-scope`, and do **not** require child brand/business pillar docs.

Hybrid entities (both platform and app) typically use `app-profile` and additionally declare `platforms-provided` — they are apps first, platforms secondarily.

### Lifecycle-Stage Assignment

Assign `entity-lifecycle-stage` when creating or reviewing a profile. It parallels SAD phases and determines the folder shape expected for the entity (see `CLAUDE.md` at the vault root for the stage-to-folder-shape mapping). Common transitions:

- New idea becomes its own entity → `concept`
- SAD Phase 0A (IDEA_MAP.md) complete → advance to `scoped`
- SAD Phase 1B (full spec package) complete → advance to `specced`
- Implementation begins → advance to `prototyping`
- Shipped or near-shipped → advance to `active`
- Stable with minimal dev → advance to `maintenance`
- Stopped or superseded → advance to `archived` and move the folder to `projects/_archive/`

A profile's `entity-lifecycle-stage` should always be the current reality. If implementation is active but the profile still says `scoped`, the profile is stale and a Mode 3 (Review & Update) pass is overdue.

### Declaring Relationships

When profiling an entity that is part of a parent ecosystem, declare the relationship in frontmatter on both sides:

```yaml
# On the app
surfaces-of: [[<parent-ecosystem>]]   # legacy key name
platforms-used: [[<platform>]] ...
product-orientation: offering

# On the platform
platforms-provided: [[<feature-or-engine>]] ...
consumed-by-surfaces: [[<app>]] ...   # legacy key name
product-orientation: enabling-infrastructure

# On the parent ecosystem
# (no explicit "owns" field — children point upward via surfaces-of; parent lists them in Child Entities section)
```

These are additive to the human-readable Relationships section of the profile. Frontmatter carries the machine-queryable structure; the Relationships section carries the narrative (strength, direction, trajectory, tensions).
