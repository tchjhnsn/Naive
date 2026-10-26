---
type: knowledge
tags: [everything-ecosystem, skills, template-generation]
ai-model: claude
created: 2026-05-15
source: hybrid
name: template-generation
description: >
  Generate Tier 1 (pillar-wide) + Tier 2 (product-type-specific) deliverable
  template stubs for a project at the appropriate phase. Given an idea + a
  product type + a pillar, scaffolds the relevant deliverable files with
  frontmatter + headings + status: stub. Runs at the end of Triage / start of
  Phase 0B research, or whenever a new product (Brand-pillar or Business-pillar)
  is being added to an existing entity. Companion to deliverable-discovery
  (which handles Tier 3 gap detection). Per SAD v3.3+ amendment §33.
  MANDATORY TRIGGERS: template generation, scaffold deliverables, generate
  templates, stub deliverables, project template, new product templates, tier 1
  templates, tier 2 templates, what deliverables does this need, /generate-templates.
---

# Template Generation Skill

The skill that scaffolds Tier 1 + Tier 2 deliverable stubs for a project, given its pillar(s), product type(s), and ambition tier.

## Why template-generation exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §33]], the methodology has three layers and the deliverable templates (Layer 3) have three tiers. Tier 1 + Tier 2 templates are the *known coverage* — the things every project of a given shape should have.

Without template-generation, the operator authors deliverables one-at-a-time as they surface. With template-generation, the deliverable inventory is scaffolded at project start, and the operator works through the inventory rather than discovering it ad-hoc. Discovery is what [[../deliverable-discovery/SKILL|deliverable-discovery]] is for (Tier 3 gaps); template-generation handles the known.

## When to invoke

- **End of Triage / start of Phase 0B research.** Once ambition tier is declared (per [[../ambition-tier/SKILL|ambition-tier]]) and per-pillar routing exists, scaffold the deliverable inventory.
- **New product addition.** When an existing entity adds a Brand-pillar product or Business-pillar product, generate its deliverable stubs.
- **New version boundary.** When V[N+1] articulation begins, scaffold any new deliverables V[N+1] requires (and reference V[N]'s as predecessors).
- **Project import / migration.** When an existing project is being brought into the methodology, scaffold the deliverables it's missing.

## What template-generation produces

Given inputs `pillar`, `product-type`, `ambition-tier`, and `entity-path`, the skill produces a directory of stub files. Each stub has:

- Frontmatter (`type: deliverable`, `tier`, `pillar`, `product`, `phase`, `status: stub`, `created`, `authors`, etc.)
- A one-paragraph purpose statement
- An outline of expected content
- Cross-references to related deliverables in the same project
- A "Status" section noting it's a stub awaiting authoring

The stubs are not the deliverables; they're the inventory + scaffolding the operator will populate.

## How to run template-generation

When this skill is loaded, the AI should:

### Step 1 — Confirm inputs

Read the entity profile to confirm:
- `pillar(s)` — which pillars are active
- `product-type(s)` — for each Product-pillar product (and any Brand-pillar / Business-pillar products)
- `ambition-tier` — calibrates which Tier 2 deliverables apply
- `entity-path` — where the stubs will land

If any input is missing, surface to the operator before scaffolding.

### Step 2 — Walk the known inventory (including characteristic packs)

1. Declare or refresh the system profile (characteristics C-01…C-18) per [[../asset-requirements/SKILL|asset-requirements]].
2. For each active pillar, look up the Tier 1 deliverable list from the company template ([[../../company-template/pillars/product|product]] / [[../../company-template/pillars/brand|brand]] / [[../../company-template/pillars/business|business]]).
3. For each product, look up Tier 2 deliverables from the product-type-specific skill:
   - Software product → [[../software-product/SKILL|software-product skill]]
   - Content product → [[../content-product/SKILL|content-product skill]]
   - Service product → [[../service-product/SKILL|service-product skill]]
   - Hardware product → [[../hardware-product/SKILL|hardware-product skill]]
4. Union every characteristic and obligation pack triggered by the system profile from [[../../CANONICAL_ASSET_REGISTRY|CANONICAL_ASSET_REGISTRY]].

Do not scaffold only the Tier 1/2 defaults when characteristics imply more. The Asset Requirement Set is the authoritative inventory; this skill scaffolds stubs for its missing rows.

### Step 3 — Calibrate by ambition tier

Per [[../ambition-tier/SKILL|ambition-tier]], some deliverables only apply at higher tiers:
- **Hobby** → minimal Tier 1; skip most Tier 2
- **Side project** → light Tier 1; light Tier 2
- **Open-source tool** → Tier 1 + Tier 2 + license + governance + community
- **Venture** → full Tier 1 + full Tier 2 + Business pillar substantively populated
- **Enterprise** → everything in Venture + enterprise-readiness deliverables

The skill skips deliverables that don't apply at the project's declared ambition tier.

### Step 4 — Generate stubs

For each deliverable that applies, generate a stub at the canonical location. Standard structure:

```yaml
---
type: deliverable
tier: 1 | 2 | 3-idea-derived
pillar: product | brand | business
product: <product-name-or-pillar-wide>
phase: 0A | 0B | 0C | 1A | 1B | 1C | 2.x | 3.x | 4.x
deliverable-name: <name>
status: stub
created: <date>
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: project
scope-entity: [[<entity>]]
tags: [deliverable, tier-<N>, <entity>, <pillar>, <phase>, stub]
---

# <Deliverable name>

## Purpose
<one paragraph from the template>

## Expected content
<outline from the template>

## Related deliverables
<wikilinks to adjacent deliverables>

## Status
- <date>: Stub generated by template-generation skill. Awaiting authoring.
```

### Step 5 — Update the per-project orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], add every new stub to the orchestration HTML's deliverable inventory with `status: stub`. The orchestration HTML shows the operator what's authored vs what's still a stub.

### Step 6 — Report

Surface to the operator:
- N stubs generated (Tier 1: X, Tier 2: Y)
- Where they live
- Which ones are highest-priority based on phase
- Reminder: stubs are inventory; authoring is the work

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

1. **Detect** — Tier 1/2 inventory vs vault/repo (present / stub / missing).
2. **Generate missing stubs only** — never overwrite authored docs.
3. **Triage** — which stubs block the current phase vs can stay stub.
4. **Freeze** — do not invent ad-hoc doc names that duplicate a template slot.
5. **Exit** — inventory complete for the ambition tier; orchestration shows
   stub vs authored.

## What template-generation is NOT

- **Not the author of the deliverables.** It creates inventory; the operator (or AI in a separate sprint) authors content.
- **Not exhaustive of every possible deliverable.** Tier 3 idea-derived deliverables surface from real work via [[../deliverable-discovery/SKILL|deliverable-discovery]].
- **Not destructive.** If a stub already exists, don't overwrite. Surface the existing file; skip generation for that deliverable.

## Relationship to other skills

- [[../triage/SKILL|triage]] precedes template-generation (triage organizes ideas → ambition-tier declares scale → template-generation scaffolds)
- [[../ambition-tier/SKILL|ambition-tier]] provides the calibration input
- [[../deliverable-discovery/SKILL|deliverable-discovery]] handles Tier 3 (idea-derived) gaps; template-generation handles Tier 1 + Tier 2 (known)
- [[../articulation-closure/SKILL|articulation-closure]] reads the stub inventory at 1C to verify everything has been authored (or consciously deferred)

## Status

- **2026-05-14:** Initial authoring per §33 amendment.
