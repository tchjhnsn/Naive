---
type: knowledge
source: hybrid
created: 2026-03-24
ai-model: claude
tags: [everything-ecosystem, references]
---
# Analysis Mode — Mapping an Existing Entity or Ecosystem

This mode is for analyzing something that already exists — a company, an ecosystem, a set of projects, or a
competitor. The AI examines available information (files, repos, websites, public knowledge, user context) and
produces entity profiles and a relationship map.

Analysis mode uses the exact same schema as Discovery Mode. The difference is directionality: Discovery starts
with an idea and builds toward classification. Analysis starts with an existing reality and reverse-engineers
the classification from what's already there.

---

## Phase 1: Scope the Analysis

Determine what the user wants to analyze and at what depth.

**Questions to establish scope:**
- What are we analyzing? (A single entity? An entire ecosystem? A set of projects in a folder?)
- How deep should we go? (Top-level overview? Full entity profiles for every sub-entity?)
- Is this an external analysis (analyzing another company like Google or Tesla) or internal (analyzing the user's own projects)?
- What's the purpose of this analysis? (Audit, competitive intelligence, restructuring, learning)

**For internal analysis (user's own projects):**
- Where are the projects? (File paths, repos, folders)
- Do any of these already have entity profiles or specifications?
- Are there existing documents (specs, READMEs, master documents) that describe what these things are?

**For external analysis (analyzing another company):**
- Use publicly available information, the user's knowledge, and web research if available.
- Acknowledge when information is incomplete or speculative. External analysis is inherently less precise than internal.

---

## Phase 2: Entity Inventory

Create a list of all entities within the scope. Don't classify yet — just inventory.

**For internal analysis:**
- Scan the relevant directories and repos
- Read READMEs, specs, and any existing documentation
- **When documentation is absent or sparse:** Analyze the codebase directly. Read directory structures,
  dependency manifests (package.json, Cargo.toml, requirements.txt, etc.), data models, route
  definitions, component trees, configuration files, and any test files. The code is a valid source
  of truth — infer the entity's purpose, scope, and stage from what exists in the code itself.
- List every distinct project, product, tool, or resource found
- Note which ones have active code, which are stubs, and which are just ideas
- **Flag documentation status for each entity.** Note whether each entity has: no documentation,
  outdated documentation, partial documentation, or complete documentation. This feeds into the
  documentation audit in Phase 6.

**For external analysis:**
- List all known products, services, subsidiaries, tools, and platforms
- Include open source projects, acquired companies, internal divisions
- Note which entities have their own brand identity and which operate under the parent's brand

**Present the inventory to the user before proceeding.** "I've identified [N] entities within [scope]. Here's
the list: [list]. Are there any I'm missing, or any that shouldn't be on this list?"

---

## Phase 3: Classification Pass

For each entity in the inventory, apply the classification framework.

Work through entities in a logical order — start with the parent/top-level entity, then work down to children.
For each entity:

1. State what the entity appears to be based on available evidence
2. Run the independence test (own product? own brand? own business? separate operations?)
3. Propose a classification with reasoning
4. Flag any ambiguities or entities that could be classified multiple ways

**Group entities by classification after the pass:**
- Subsidiaries
- Products within the company
- Open source tools
- Internal tools
- Shared infrastructure
- Unplaced ideas / unclear classification

Present the full classification to the user for review and correction.

---

## Phase 4: Pillar Assessment (per entity)

For each classified entity, assess the three pillars. In analysis mode, focus on what evidence exists for each
pillar rather than asking the user to describe each one from scratch.

**Product pillar evidence:**
- Does a product exist? Is it shipped? Is it in development?
- What is the product orientation? Is this an offering (for external users), operational capability
  (enabling other entities), or enabling infrastructure (shared foundation)?
- What artifacts exist? (codebase, spec, prototype, deployed product, facilities, factories)
- What stage is it in based on the evidence?
- Does the product have internal composition? If the product contains what feel like other products,
  identify the core, variants, surfaces, and platform capabilities. Note any components that have
  developed enough independence to warrant their own entity profiles.

**Brand pillar evidence:**
- Does the entity have its own name, visual identity, website?
- Is the brand being shaped intentionally? (marketing materials, brand guidelines, public presence)
- Or is it unintentional? (people may know the name, but no deliberate brand work has been done)
- Does the brand have its own operations? (events, merchandise, social media presence)

**Business pillar evidence:**
- Does the entity generate revenue? How?
- Does it have its own pricing, contracts, or business products?
- Is it financially independent or subsidized by another entity?
- Are there business documents? (financial models, pricing pages, partnership agreements)

For internal analysis of the user's own projects, many entities may have a product (code exists) but lack
brand and business pillars entirely. This is common in early-stage development. Note it without judgment —
the purpose of analysis is clarity about current state, not criticism.

---

## Phase 5: Mission and Relationship Mapping

### Mission
- What is the ecosystem's mission? (If analyzing the user's own ecosystem, ask them. If analyzing an external
  company, infer from public information and present for confirmation.)
- For each entity, assess how it serves the mission.
- Flag any entities that don't clearly align — they may be misclassified, or they may be in the wrong ecosystem.

### Relationships
Map relationships between entities. For each pair that has a meaningful relationship:
- What type? (horizontal, vertical, diagonal, radial, loose affiliation, external dependency)
- How strong? What evidence supports the relationship?
- Can each entity succeed independently?
- Are there potential diagonal movements?
- Are there external dependencies — entities outside the ecosystem that are relied upon but not owned?
  Note the dependency and its strategic implications (risk, sovereignty gap, potential for vertical integration).

**For complex ecosystems, present the relationship map as a structured list or table.** For very complex
ecosystems (10+ entities), consider grouping relationships by type or by cluster.

---

## Phase 6: Produce the Analysis Output

The output of analysis mode is:

1. **Ecosystem Overview** — A summary document describing the ecosystem as a whole: its mission, its
   structure, the number and types of entities, key relationships, and notable observations.

2. **Entity Profiles** — A completed entity profile for each entity identified, using the standard schema.

3. **Relationship Map** — A structured representation of how entities relate to each other.

4. **Documentation Audit** — For each entity, a comparison of what documentation exists against what
   documentation should exist given its pillar lifecycle stages. Use the documentation expectations
   defined in `references/documentation-expectations.md` to perform this audit. The audit should produce:
   - A per-entity documentation status (what exists vs. what's expected)
   - A list of documentation gaps with priority (critical, important, recommended)
   - A recommended documentation build order across the ecosystem, sequenced by: (a) what unblocks
     the most progress, (b) what captures institutional knowledge at risk of being lost, and
     (c) what the current lifecycle stage demands

   For entities where the codebase was the primary source of truth (no docs existed), the first
   documentation priority is always a product description or spec that captures what the code
   already does — this crystallizes the undocumented knowledge before it degrades.

5. **Observations and Recommendations** — What's working well? What's missing? Where are the gaps in
   pillar development? Which entities are misclassified? Where are there opportunities for diagonal movement?
   What might the ecosystem need to build next based on mission alignment and sequencing principles?

For internal analysis, the observations should be actionable — specific things the user can do to improve
the structure, classification, or development of their ecosystem.

For external analysis, the observations are analytical — insights about the company's structure that
illuminate the Everything Ecosystem principles in practice.
