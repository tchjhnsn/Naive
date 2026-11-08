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
├── detectors/              ← Naive's default detectors, one per threshold (below)
└── roles/
    ├── README.md               ← Index of role files + status
    ├── ceo.md                  ← Chief Executive — cross-pillar lead
    ├── (cto.md — Product lead — to-author)
    ├── (cmo.md — Brand lead — to-author)
    ├── (coo.md — Business lead — to-author)
    └── (founder.md, chief-of-staff.md, etc. — to-author)
```

## Default detectors

`detectors/<id>.json` holds one detector record (`packages/naive/src/records/detector.schema.json`) for each yes or no threshold Naive already had, with today's constant as its line, `set_by: "default"`. A call site reads its line through `packages/naive/src/engine/detectors.mjs`: the venture's own `governance/detectors/<id>.json` first, then the default here, then the constant in the code. A venture moves a line by keeping its own copy with the person who set it. `init-venture.mjs` does not copy these files, so a venture without its own copy follows Naive's default.

`delegation.json` is the default delegation that `node packages/naive/src/checks/check-delegation.mjs` checks. The spend register's classes, `spend-register-upkeep` and `cancel-or-downgrade`, go from the founder straight to the finance agent (`founder-to-finance-agent`, scope `finance/`), because both are never re-delegated (lead agents design, build item 2).

| Detector | Line | yes when | Read at |
|---|---|---|---|
| `gate-confidence` | 0.7 | below (strict) | the gate's `confidence_below`, through `configFor` in `naive-config.mjs`; `naive.config.json` `thresholds.confidence` and a number in the rule still win |
| `feedback-accept` | 0.95 | at or above | `feedback-route.mjs` `route`; an `accept` option still wins |
| `idea-map-tag` | 0.8 | at or above | the idea map's tag threshold, through `configFor`; `naive.config.json` `thresholds.idea-map` still wins |
| `decision-index-note` | 0.25 | at or above | the `threshold` the decision index records |
| `validation-recommend` | 0.6 | at or above | `check-validation.mjs --score` |
| `noul-judgment` | yes 0.7, no 0.3 | at or above | not read yet (`operating-rules.json` `jev` is record-only) |
| `standing-earn-low`, `standing-earn-costly` | 0.8, 0.9 | at or above | not read yet (`operating-rules.json` `questions.standing` is not enforced) |
| `standing-loss` | log 19 | at or above | not read yet (`operating-rules.json` `questions.loss` is not enforced) |

Model steps have no detector here: each step's line is its own `threshold` in the step record, and a step's question is its own, so one detector cannot stand for them.

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
