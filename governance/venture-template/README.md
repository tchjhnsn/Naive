---
type: venture-template-readme
ai-model: claude
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [venture-template, methodology, three-pillars, reference, 2026-05-14]
related:
  - "[[sad/SAD_SKILL_v3]]"
  - "[[_ideas/build-roadmap-and-html-orchestration-2026-05-12]]"
  - "[[sad/pipeline-canonical-view-2026-05-14]]"
---

# `venture-template/` — what this folder is

The **Company Template** is the reference description of what a company *is*. It is **outside the methodology** but the methodology references it.

The methodology (the four-lane pipeline at `methodology/`) describes *how work moves*. The company template describes *what the work is building toward*. The two compose: the methodology brings the company template to life, version by version.

## The three-layer formalization

Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap idea-dump §33]]:

1. **Layer 1 — The methodology** (`everything-ecosystem/methodology/`). The four-lane pipeline + rituals.
2. **Layer 2 — The company template** (this folder). What a company is — three pillars + teams + roles + overlap zones.
3. **Layer 3 — Deliverable templates** (`everything-ecosystem/deliverables/`, to be authored). Per-pillar, per-product-type, plus Tier 3 idea-discovered.

Glue: skills (auto-running) + hooks (lifecycle events) + selective slash commands (often as buttons in the per-project orchestration HTML).

## Folder contents

```
venture-template/
├── README.md                   ← This file
├── index.md                    ← Master reference — what a company is
├── pillars/
│   ├── product.md              ← Product pillar reference
│   ├── brand.md                ← Brand pillar reference
│   └── business.md             ← Business pillar reference
└── roles/
    ├── README.md               ← Index of role files + status
    ├── ceo.md                  ← Chief Executive — cross-pillar lead
    ├── (cto.md — Product lead — to-author)
    ├── (cmo.md — Brand lead — to-author)
    ├── (coo.md — Business lead — to-author)
    └── (founder.md, chief-of-staff.md, etc. — to-author)
```

## How the methodology references this template

- **Articulate lane** populates the template per V[N]. The end of Articulate is "the company template is fully populated for this version" — every Tier 1 + Tier 2 deliverable in [[index]] has at least a draft.
- **Build lane** translates the populated template into running reality — code (Product), assets shipped (Brand), operational surfaces online (Business).
- **Ship lane** makes the template's commitments verifiable in production.
- **Operate lane** maintains and evolves the template, amending the methodology when the template proves insufficient.

## What this template is NOT

- **Not a one-size-fits-all prescription.** Not every project needs every pillar; not every pillar needs every team. The template is reference material, not a compliance checklist.
- **Not an org chart.** Roles describe *responsibilities*, not headcount. A solo operator may play multiple roles; an established company may split one role across many people.
- **Not entity-class specific (yet).** The current template assumes a default modern tech company. Variants for other entity-classes (open-source-tool, hobby, content-company, service-company) are queued for authoring as those project shapes accumulate enough reference material to generalize from.
- **Not the methodology.** The methodology lives at `methodology/`. This template is what the methodology *fills*.

## Status

- **2026-05-14:** Initial scaffold. index + 3 pillars + 1 role (CEO) authored. Other roles + product-type-specific variants queued.

## Where ideas about this template go

Idea-dumps about the company template structure go to `vault/Torian/everything-ecosystem/_ideas/` with frontmatter `scope-entity: [[everything-ecosystem]]` and tag `venture-template`. The dump at [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap]] §33–§34 currently holds the structural thinking that produced this folder.
