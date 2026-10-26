---
type: knowledge
source: hybrid
created: 2026-04-19
ai-model: claude
tags: [everything-ecosystem, references]
---
# Documentation Expectations by Pillar and Lifecycle Stage

This reference defines what documentation should exist for each pillar at each lifecycle stage.
It serves two purposes: guiding new entity development (what to produce next) and auditing existing
entities (what's missing). The expectations are cumulative — each stage assumes the previous stage's
documents exist or have been consciously skipped with a recorded reason.

These are expectations, not mandates. An entity may have valid reasons for missing a document.
The point of the audit is to surface the gaps and force a conscious decision: is this gap
intentional, or is it institutional debt?

---

## Product Pillar

### Ideation
**Expected documentation:**
- Problem statement or opportunity description (what is this and why does it matter?)
- Audience or user definition (who is this for?)

**Minimum viable documentation:** A written description of what the product is and who it's for.
This can be a paragraph in an idea dump — it does not need to be a formal document. But it must
exist in writing somewhere. If it only exists in someone's head or in the code, it is undocumented.

### Documentation
**Expected documentation:**
- Product specification or PRD
- Technical architecture (if technical product)
- User flows or interaction model
- Success criteria

**Minimum viable documentation:** A specification that someone could read and understand what to
build without having to reverse-engineer the codebase.

### Implementation
**Expected documentation:**
- Repository README
- Development setup guide
- Implementation plan or roadmap
- Testing strategy

**Minimum viable documentation:** A README that explains what the project is, how to run it, and
what state it's in.

### Production
**Expected documentation:**
- Deployment guide or runbook
- Monitoring setup
- User documentation (if user-facing)
- Maintenance and update process

**Minimum viable documentation:** Enough documentation that someone other than the original
builder could deploy, monitor, and maintain it.

---

## Brand Pillar

### Ideation
**Expected documentation:**
- Brand vision or positioning statement
- Audience profile
- Brand-product relationship definition

**Minimum viable documentation:** A written statement of what the brand should feel like and who
it's for. Even a few sentences counts — but it must be written, not assumed.

### Documentation
**Expected documentation:**
- Brand style guide (visual identity, colors, typography)
- Brand voice and tone guide
- Brand narrative or origin story
- Brand guidelines (do's and don'ts)

**Minimum viable documentation:** A style guide that someone could use to produce on-brand materials
without having to ask the founder what the brand looks like.

### Implementation
**Expected documentation:**
- Brand asset library (logos, icons, templates)
- Social media presence plan or web presence plan
- Marketing collateral templates

**Minimum viable documentation:** A set of usable brand assets and at least one live brand
touchpoint (website, social presence, etc.).

### Production
**Expected documentation:**
- Marketing plan or advertising strategy
- Brand health metrics or perception tracking
- Partnership and sponsorship documentation (if applicable)

**Minimum viable documentation:** A record of how the brand is performing and what the ongoing
brand strategy is.

---

## Business Pillar

### Ideation
**Expected documentation:**
- Revenue model description (how does this capture value?)
- Initial pricing strategy or business model canvas
- Target market definition

**Minimum viable documentation:** A written description of how the entity makes money (or will
make money) and who pays.

### Documentation
**Expected documentation:**
- Financial model or projections
- Pricing documentation
- Legal structure and agreements (terms of service, contracts)
- Business metrics definition

**Minimum viable documentation:** A financial model that shows projected costs, revenue, and
the path to sustainability.

### Implementation
**Expected documentation:**
- Payment infrastructure documentation
- Sales process or playbook
- Customer onboarding documentation
- Partnership agreements (executed)

**Minimum viable documentation:** Documentation of the live payment flow and how customers
actually transact.

### Production
**Expected documentation:**
- Financial reports (P&L, cash flow)
- Metrics dashboard and review cadence
- Growth strategy

**Minimum viable documentation:** Regular financial reporting that shows actual performance
against projections.

---

## Documentation Gap Priority Levels

When auditing documentation gaps, assign one of these priority levels:

**Critical** — The entity is actively operating at a lifecycle stage without the minimum viable
documentation for that stage. Example: a product in implementation with no README, no spec, and
no written description of what it does. The institutional knowledge exists only in the code or
in someone's head. This is a risk — if context is lost (the person leaves, memory fades, the
project goes dormant), the entity becomes opaque.

**Important** — The entity has minimum viable documentation but is missing expected documents
that would significantly improve its operability or transferability. Example: a product in
production with a README but no deployment guide or monitoring setup. It works, but it's fragile.

**Recommended** — The entity is reasonably well-documented but is missing documents that would
strengthen its pillar development. Example: a brand in production with a style guide but no
formal brand health metrics. The brand works, but there's no systematic way to know if it's
working well.

---

## Documentation Build Order Principles

When multiple documentation gaps exist across an ecosystem, sequence the remediation by:

1. **Capture what's at risk of being lost.** If a product exists as code with no documentation,
   the first priority is writing down what it does — before the person who built it forgets,
   before the context window of institutional memory closes. This is documentation as preservation.

2. **Unblock the current lifecycle stage.** If an entity is in implementation but has no spec,
   writing the spec retroactively (from the code) unblocks the ability to onboard collaborators,
   make informed product decisions, and evaluate completeness. Meet the entity where it is.

3. **Enable the next lifecycle transition.** If a product is approaching production, the deployment
   guide and monitoring setup should be produced before the transition, not after. Documentation
   for the next stage should be completed during the current stage.

4. **Strengthen what's already working.** Once critical and important gaps are addressed, fill in
   the recommended documentation to make existing entities more robust.

5. **Don't document what doesn't exist yet.** If a pillar is intentionally absent (e.g., no
   business model for an open source tool), don't create empty documentation for it. Document
   the intentional absence in the entity profile and move on.

---

## Cross-Pillar Documents

Some documents are not specific to a single pillar — they span the entity as a whole. These
documents belong to the entity itself, not to any one pillar.

### Required Cross-Pillar Documents

**Entity Profile**
- **When required:** Always. Every entity in the ecosystem must have an entity profile. The entity
  profile is the atomic unit of the framework — without it, the entity is invisible to the
  methodology. An entity that has code, a brand, and revenue but no entity profile is operating
  without structural awareness.
- **What it contains:** Identity, classification, pillar assessment, mission alignment, relationships,
  visibility, child entities, lifecycle status, documentation audit, and changelog. See
  `entity-profile-schema.md` for the complete schema.
- **Priority when missing:** Critical at every lifecycle stage. The entity profile should be the
  first document produced for any entity — or the first document produced retroactively for entities
  that predate the framework.
- **Relationship to other documents:** The entity profile is the root document for the entity.
  All other documents belong to the entity and are referenced from within the entity profile
  (typically in the Key Artifacts lists under each pillar and in the Documentation Audit section).
  The entity profile does not replace those documents — it provides the structural map that makes
  sense of what they all mean together.

### Recommended Cross-Pillar Documents

**Idea Dump / Mind Dump**
- **When recommended:** When the entity is in its early stages (ideation, early documentation) or
  when the founder/creator is still actively exploring what the entity should become. Also recommended
  as an ongoing practice for capturing raw ideas, observations, and strategic thinking that hasn't
  yet been formalized into other documents.
- **What it contains:** Unstructured or semi-structured notes capturing the creator's thinking about
  the entity. May include vision, inspiration, competitive observations, rejected ideas, open
  questions, and future possibilities. Does not need to follow a schema — its value is in preserving
  raw thinking before it gets filtered through formal documentation.
- **Priority when missing:** Recommended, not critical. Many entities will be well-served by having
  their thinking go directly into specifications and entity profiles. But for entities where the
  vision is complex, evolving, or distributed across many conversations, an idea dump serves as a
  knowledge preservation mechanism. It captures what the entity profile cannot: the reasoning that
  wasn't yet ready to become a decision, the ideas that were considered and deferred, the creative
  leaps that might otherwise be lost.
- **Relationship to other documents:** The idea dump feeds the entity profile and all other documents.
  It is upstream of everything — raw material that gets refined into structured documentation. When
  updating an entity profile or writing a spec, the idea dump should be consulted to ensure that
  important thinking hasn't been lost in the formalization process.

---

## Document Relationships

Documents within an entity are not isolated files — they form a graph with the entity profile at
the center. Understanding these relationships prevents duplication, ensures consistency, and makes
clear which documents depend on which.

**The entity profile is the root.** Every other document in the entity's documentation set is
referenced from the entity profile. The profile doesn't duplicate the content of those documents —
it provides the structural context that explains what they all mean together.

**Direction of flow:**
- **Idea dump → Entity profile:** Raw thinking is formalized into structured fields.
- **Entity profile → Pillar documents:** The entity profile identifies what exists and what's
  missing per pillar. Each pillar's documents elaborate on what the profile summarizes.
- **Entity profile → Documentation audit:** The entity profile's Section 9 lists what documents
  exist, what's expected, and what's missing. This is the self-referential feedback loop that
  keeps the entity's documentation honest.
- **Pillar documents → Entity profile updates:** When a spec is written, a brand guide is created,
  or a business model is documented, the entity profile's pillar assessment, key artifacts, and
  documentation audit should be updated to reflect the new state.

**Consistency rule:** When a fact appears in both the entity profile and a pillar-specific document,
the pillar-specific document is the source of truth for detail, and the entity profile is the
source of truth for structural context. If they contradict, the pillar document's detail wins
for the specific fact, but the entity profile's structural framing (classification, lifecycle
stage, relationships) governs. Contradictions should be resolved, not tolerated.

**Cross-entity document relationships:** When documents in different entities reference each other
(e.g., a parent ecosystem's mission statement is referenced by a child entity's mission alignment
section), the relationship should be noted in both entity profiles. This makes the dependency
visible and ensures that changes to one propagate awareness to the other.

---

## Note Types

Every note in the vault declares a `type` in frontmatter. The type determines which template the note was produced from, which queries find it, and which conventions apply to it. Types used across the ecosystem:

| `type:` | Purpose | Typical home (surface/app entities) | Required frontmatter |
|---------|---------|-------------------------------------|----------------------|
| `idea` | A single idea with provenance, lineage, tier, and routing | `<entity>/_ideas/` | `type`, `source`, `created`, `tags`, `idea-status`, `destination-entity` |
| `entity-profile` | Full entity profile | `<entity>/entity-profile.md` | `type`, `source`, `created`, `tags`, `entity-class`, `entity-lifecycle-stage`, `product-orientation`, `sector` (if `entity-class: business`); nested apps also `brand-scope`; parent/platforms may carry `business-scope` |
| `platform-profile` | Entity profile for `entity-class: platform` | same | Same as `entity-profile` plus `platforms-provided`; may include `consumed-by-surfaces` and `business-scope` |
| `app-profile` | Entity profile for `entity-class: app` (renamed from `surface-profile` 2026-08-10) | same | Same as `entity-profile` plus `platforms-used` and `surfaces-of`; nested apps: `brand-scope` only (**no** `business-scope`) |
| `entity-product` | Product portfolio / made-thing sub-profile | `product/profile.md` | `type`, `source`, `created`, `tags` |
| `entity-brand` | Brand org-function sub-profile (usually **parent**) | `brand/profile.md` | Same — not required on nested children with `brand-scope: parent` |
| `entity-business` | Business org-function sub-profile (usually **parent**) | `business/profile.md` | Same — apps do not carry `business-scope`; commercial lives here / on platforms |
| `code-pointer` | Frontmatter-driven reference to a code repo outside the vault | `product/code/pointer.md` | `type`, `source`, `created`, `tags`, `repo-path`, `primary-language`; `production-url`, `deployment-platform`, `deployment-status`, `last-deployed` required if deployed |
| `thesis` | Concept-level research doc (what we believe) — primarily in platform entities | `product/thesis/` (platforms) | Standard |
| `research` | Open-question research doc (what we're investigating) | `product/research/` | Standard; **must not** carry `authority: architectural` or higher — elevate ⇒ relocate (vault `CLAUDE.md` §Document placement) |
| `architecture-spec` | Adopted architectural decision | `product/spec/` (surfaces/apps) or `product/architecture/` (platforms) | Standard; typically accompanied by a full SAD-style spec sub-package |
| `planning-note` | Time-bound sequencing | `product/planning/` | Standard; **must not** carry `authority: architectural` or higher |
| `spec` | Normative binding contract | `product/spec/` | Standard; often `authority: architectural` or `implementation` |
| `session` / `session-log` | Session log entry or entity session digest | `_sessions/` or `product/SESSION_LOG.md` | `type`, `source`, `created`, `tags`; session entries also `session-date`, `entities-touched` |
| `person-profile` | Person schema (identity, capacities, relationships) | per entity convention | Standard |
| `position-schema` | *(retired as note type)* use `type: position` for instances; system doc is [[position-schema]] | — | — |
| `position` | Organizational seat instance (exists vacant or filled; human or agent occupancy) | `<entity>/business/org/positions/` (or brand/product `org/`) | `type`, `source`, `created`, `tags`, `entity`, `title`, `occupancy`, `staffing-posture`; see [[position-schema]] |
| `diagnostic` | Ecosystem health snapshot | `everything-ecosystem/` | Standard |
| `reflection` | Personal journal entry | `<owner-folder>/reflections/` | Standard |
| `knowledge` | PKB / curriculum note | `<owner-folder>/curriculum/` or methodology refs | Standard |
| `publication` | Public output | `<owner-folder>/publications/` | Standard |
| `sad-project` | SAD methodology tracking for a project | entity product pillar | Standard |
| `migration-plan` | Structural-change plan (vault restructures, entity moves, convention rollouts) | `_meta/migrations/` | `type`, `source`, `created`, `tags`, `migration-status` or `status`, `affects` optional |
| `idea-dump` | Raw multi-idea capture (immutable until sealed/decomposed) | `<entity>/_ideas/` | `type`, `source`, `created`, `raw-status` |

"Standard" in this table means the universal minimum: `type`, `source`, `created`, `tags`. Additional required fields are listed where they apply.

### Placement rule (2026-08-10)

`type:` names *what kind of note* a document is. **Folder placement** answers a different question — whether the content is binding, time-bound, or investigative — and for surface/app entities is governed by vault `CLAUDE.md` §*Document placement within `product/`*. The authority gate applies regardless of `type:`: elevating a research note to architectural authority requires moving it out of `research/`, not leaving it there with a higher frontmatter tier.

### Note-type selection rules

- A profile for an entity with `entity-class: platform` uses `type: platform-profile`, not plain `entity-profile`. The distinction enables Dataview queries like `FROM "projects" WHERE type = "platform-profile"` to return the ecosystem's platform inventory.
- A profile for an entity with `entity-class: app` uses `type: app-profile`, not plain `entity-profile`. (`surface-profile` / `entity-class: surface` retired 2026-08-10.)
- A hybrid entity (`entity-class: hybrid`) uses `type: app-profile` and additionally declares `platforms-provided` — it is an app with a platform face.
- Concept-level belief documents inside a platform's `product/thesis/` folder use `type: thesis`. Research docs in `product/research/` use `type: research`. Architecture specs in `product/architecture/` use `type: architecture-spec`.
- A code-pointer note at `product/code/pointer.md` uses `type: code-pointer`. These should exist for every entity at `prototyping` or later.
- A migration plan at `_meta/migrations/<name>.md` uses `type: migration-plan`.
