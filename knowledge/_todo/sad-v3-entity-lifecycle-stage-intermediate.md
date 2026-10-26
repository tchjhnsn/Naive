---
type: methodology-todo
ai-model: claude
source: hybrid
created: 2026-05-03
authorship: hybrid (analysis Claude; identified by the owner)
ip-sensitivity: normal
scope: global
target-document: [[SAD_SKILL_v3]]
target-section: PART 5 (lifecycle-stage table) + entity-profile-schema
trigger-context: The reference project session-hygiene audit (2026-05-02). The reference project's `entity-lifecycle-stage` is `scoped` per the current methodology, but the entity has progressed substantially past Phase 0A (Phase 0B confirmed; Phase 0C drafted; Phase 1A informally complete; Phase B/C demo-readiness in progress). The stage label lags actual progress because there is no intermediate stage between `scoped` (Phase 0A complete) and `specced` (Phase 1B complete).
status: deferred (not authored; held for dedicated methodology session)
companion-todos:
  - [[sad-v3-part-5_5-classification-taxonomy]]
  - [[sad-v3-phase-0d-vision-wireframing]]
tags: [methodology-todo, sad-v3, entity-lifecycle-stage, methodology-gap]
---

# Methodology TODO — Entity Lifecycle Stage: Intermediate Stages

## The gap

Per current SAD v3 / vault-CLAUDE.md, entity-lifecycle-stage advances:

```
concept → scoped → specced → prototyping → active → maintenance → archived
```

Where:

- `scoped` = Phase 0A complete (IDEA_MAP exists)
- `specced` = Phase 1B complete (full spec package)

There is **no intermediate stage** for an entity that has:

- Phase 0B complete (RESEARCH_SYNTHESIS confirmed)
- Phase 0C complete (VISION_SPEC drafted, possibly checkpoint-pending)
- Phase 1A complete (VERSION_SPEC_v1 authored)
- Pillar advancement (brand, business, etc.) ahead of product-pillar

The reference project currently sits in this gap. Its lifecycle stage label is `scoped` per the methodology, but the entity has substantively advanced through Phase 0B, Phase 0C (draft), Phase 1A (informal), and parallel pillar work. The label lags actual progress.

## Two candidate resolutions

### Resolution A — Add intermediate stages

Expand the lifecycle-stage taxonomy to include intermediate stages:

```
concept → scoped → researched → visioned → version-scoped → specced → prototyping → active → maintenance → archived
```

Where:

- `researched` = Phase 0B complete (★ 0B passed)
- `visioned` = Phase 0C complete (★ 0C passed; VISION_SPEC canonical)
- `version-scoped` = Phase 1A complete (VERSION_SPEC_v[N] authored, ★ 1A passed)

This makes the stage label accurate to actual progress; downstream queries and Dataview surfaces benefit.

**Pros:** Accurate; informative; queryable; reflects the SAD pipeline phases directly.

**Cons:** More stages to remember; the stage taxonomy becomes detailed; potential confusion about whether to advance partial-progress.

### Resolution B — Add a phase-progress field alongside lifecycle-stage

Keep the lifecycle-stage taxonomy as-is but add a parallel field:

```yaml
entity-lifecycle-stage: scoped
sad-phase-progress: 0B-confirmed  # or 0C-drafted, 1A-informal-complete, etc.
```

The lifecycle-stage answers "what major maturity tier is this entity in?" The sad-phase-progress answers "where in the SAD pipeline is it specifically?"

**Pros:** Lifecycle-stage stays simple; SAD-phase-progress is precise; both are queryable; avoids stage-label proliferation.

**Cons:** Two fields to maintain; some redundancy; risk of fields drifting out of sync.

### Resolution C — Add an "advancement-lag-acceptance" note

Don't change the methodology. Acknowledge that lifecycle-stage labels sometimes lag actual progress and document this as expected behavior. The label advances on milestone events (Phase 0A complete, Phase 1B complete, etc.); intermediate work is captured in entity-profile changelog and SESSION_LOG, not in the stage label.

**Pros:** No methodology change required; minimal complexity.

**Cons:** Lag is real; queries on entity-lifecycle-stage will misclassify entities mid-pipeline. Future readers may not know to check changelog.

## My recommendation (compiler)

**Resolution B** — add `sad-phase-progress` alongside `entity-lifecycle-stage`. Keeps the lifecycle taxonomy clean while providing the precision the SAD pipeline needs.

But this is a methodology decision; defer to dedicated methodology session.

## Pillar-status-non-lockstep observation

A related methodology observation surfaced by the same audit: **pillar statuses do not have to advance in lockstep.** The reference project reached `documentation` for both brand and business pillars while product was still pre-`specced`. Demo-readiness work (marketing, brand identity, App Store listing) can advance brand and business ahead of product when an external-facing milestone requires it.

This belongs in the same methodology TODO group. The methodology should explicitly support non-lockstep pillar advancement. Possibly add to PART 5 or to the entity-pattern documentation in vault-CLAUDE.md.

## Methodology authoring — actual work TBD

This TODO captures the intent. Actual SAD v3 update is a dedicated methodology session — should not interleave with active product work. Should be batched with the other queued methodology TODOs:

1. PART 5.5 — Classification Taxonomy (per [[sad-v3-part-5_5-classification-taxonomy]])
2. PART 5.X — Phase 0D: Vision Wireframing (per [[sad-v3-phase-0d-vision-wireframing]])
3. Lifecycle-stage intermediate stages (per this TODO)
4. Pillar-status-non-lockstep formalization (per this TODO)
5. Update entity-profile-schema to support whichever resolution is chosen
6. Update vault-CLAUDE.md if pillar conventions change

## Cross-references

- The reference project entity-profile changelog showing the lag: A project note — multiple post-`scoped` rows without stage advancement.
- The reference project SESSION_LOG: [[_sessions/SESSION_LOG]] Sessions 24-31 cover post-Phase-0A work without stage advancement.
- [[sad-v3-part-5_5-classification-taxonomy]] — related methodology TODO.
- [[sad-v3-phase-0d-vision-wireframing]] — related methodology TODO.
- [[SAD_SKILL_v3]] — the canonical methodology document this TODO targets.
- [[entity-profile-schema]] — schema document that would need updating.
- [[CLAUDE.md]] — vault constitution; pillar conventions section.
