---
type: methodology-todo
ai-model: claude
source: hybrid
created: 2026-05-03
authorship: hybrid (analysis Claude; decisions the owner)
ip-sensitivity: normal
scope: global
target-document: [[SAD_SKILL_v3]]
target-section: "PART 5 (proposed addition between Phase 0C and Phase 1A) — Phase 0D: Vision Wireframing"
trigger-context: The reference project Phase 0D experimental pilots (2026-04-28 minimum-orientation flow + 2026-05-02 brand identity from Claude design). Twice-piloted; pattern functions iteratively. Sufficient evidence to formalize Phase 0D as a real SAD v3 phase.
status: graduated
progress: "Graduated 2026-10-11 into UI-02 (wireframes and vision sketches) by SAD v3.0.14; see [[SAD_SKILL_v3_AMENDMENT_2026-10-11_experience-and-interface-design]]. The phase-ordering parts of this to-do (PART 5 placement) are superseded by the five-layer order."
companion-todo: [[sad-v3-part-5_5-classification-taxonomy]]
tags: [methodology-todo, sad-v3, phase-0d, vision-wireframing, design-spec-feedback-loop]
---

# Methodology TODO — SAD v3 Phase 0D: Vision Wireframing

**Origin:** The reference project V1 demo-readiness work (2026-04-28 through 2026-05-02). Two pilot artifacts produced; pattern functions iteratively.

## The phase pattern proposed

Add **Phase 0D — Vision Wireframing** as a new optional phase between Phase 0C (Unconstrained Vision Documentation) and Phase 1A (Version Scoping). The phase produces vision-level wireframes for Tier-A surfaces — never scoped down — that test the unconstrained Vision Spec by visualization.

### Purpose

Visual artifacts have cognitive affordances text doesn't. Spatial relationships, information hierarchy, interaction flows, and emotional tone are surfaced *natively* by wireframes and only *inferred* through prose. Phase 0D externalizes the visual integration burden that text-only specs leave to the spec-reader's mental model.

The phase tests whether vision-level decisions hold up under visualization. Sketching at vision-spec stage demonstrably surfaces ambiguity prose review missed (per the reference project pilots: rights-curation principle, non-citizen-path multiplicity, structural-novelty visual primitives that don't have established UI conventions, brand-pillar gaps).

### AI role in this phase

- Either author wireframes inline (low-fidelity, fast iteration, immediate spec-conversation feedback)
- Or hand off to AI design tools (Claude design or similar) for higher fidelity
- Or both in sequence — sketch low-fidelity inline first, then high-fidelity via AI design tools

### Output

Wireframes saved to `product/design/vision/`. Conventions:

- Each wireframe accompanied by a companion `*-notes.md` capturing decisions locked, ambiguity surfaced, and methodology evidence collected.
- Wireframes are pilot artifacts — they are NOT production specs. Production design happens later (post Phase 1B, into Phase 2 implementation prep). Phase 0D wireframes earn their keep by surfacing ambiguity, not by shipping.
- When superseded or set-aside, mark with `status: set-aside` and `set-aside-reason` in frontmatter; do not delete (preserve methodology-evidence record).

### ★ Checkpoint 0D

Reviewing whether wireframes surface ambiguity that returns to spec. If they do, the spec-revision cycle re-engages (Phase 0C-revision or even Phase 0A-supplemental for substrate-level changes). If they don't, Phase 0D contributed only confirmation; that's also a useful outcome.

The checkpoint criterion is essentially: *did sketching surface a question the spec didn't answer? If yes, update the spec; if no, proceed to Phase 1A.*

## Twice-piloted evidence (the reference project)

**Pilot 1 — Minimum-orientation flow (2026-04-28).** Surfaced new Open Vision Questions: rights-curation principle (Q-15) and non-citizen-path symmetry (Q-16). Plus brand-pillar gap (the wireframe forced "what does the fireworks visual look like?" before brand-pillar work had started). Plus the Vault-introduction-via-accumulation structural decision (referenced before introduced). Demonstrated that sketching surfaces ambiguity prose review missed.

**Pilot 2 — Brand identity from Claude design (2026-05-02).** Tested the design ↔ spec feedback loop iteration — does updating the design with a refreshed brief produce a refreshed wireframe that surfaces a new round of ambiguity? Result: in concept yes (the owner flagged red/blue conflation immediately). Awaiting v2 to fully confirm.

## Phase C complement — Visual Identity Codification

Adjacent to Phase 0D but distinct: **Phase C — Visual Identity Codification.** Authors `brand/identity.md` from accumulated visual-aesthetic substrate (typically: v0 wireframes from Phase 0D pilots; brand profile from Phase A; marketing copy from Phase B). Codifies color palette, typography system, spacing system, components, texture rules, accessibility commitments, dark-mode treatment.

Phase C is a brand-pillar phase, not a SAD-pipeline phase. It runs in parallel with the SAD product pipeline. But it has token-budget-as-iteration-cost dynamics (per the reference project Pilot 2) that Phase 0D shares — when AI design tools are involved, bundling corrections for single-batch application is the efficient pattern.

## Methodology observations to fold in

These are observations from the reference project pilots that should be promoted to methodology principles:

### 1. Pillar-status-non-lockstep

The three pillars (product / brand / business) do not have to advance through their lifecycle stages in lockstep. The reference project reached `documentation` for both brand and business pillars while product was still `in-progress` pre-`specced`. Demo-readiness work can advance brand and business ahead of product when an external-facing milestone (launch, demo, fundraising) requires it. The methodology should explicitly support this rather than implying lockstep advancement.

### 2. Token-budget-as-iteration-cost

When AI design tools (Claude design, similar) are part of the workflow, iteration with the tool costs tokens and the citizen-author has finite budget per session. The efficient pattern is to **bundle corrections / requests into single-batch instructions** rather than iterating one-correction-at-a-time. Methodology should note this as a Phase 0D / Phase C workflow finding and recommend the bundling pattern.

### 3. Design ↔ spec feedback loop iteration

Phase 0D is iterative by design. v1 wireframes surface ambiguity → spec updates → v2 wireframes surface new ambiguity → spec updates again. The loop terminates when either (a) wireframes stop surfacing new ambiguity (spec is stable enough) or (b) the citizen-author judges further iteration is not worth the cost. Methodology should describe this as the **vision-wireframe convergence loop** parallel to the existing **spec convergence loop** in PART 7.

### 4. Set-aside as a first-class lifecycle state for design artifacts

Design artifacts (wireframes, mockups, brand-identity revisions) can be `set-aside` — neither archived nor active. Set-aside artifacts:
- Served their purpose at the time they were authored
- Did not become production specs
- Are preserved (not deleted) for methodology-evidence record
- Should be marked clearly in frontmatter (`status: set-aside`, `set-aside-reason`)

This is distinct from `archived` (entity wholesale moved to `_archive/`) or `superseded` (replaced by a successor). Set-aside is a softer state appropriate to pilot / experimental work that informed but did not ship.

## Methodology authoring — actual work TBD

This TODO captures the intent. Actual SAD v3 update is a dedicated methodology session — should not interleave with active product work. Ordering:

1. Author the PART 5.5 (Classification Taxonomy) section per the prior TODO.
2. Author the PART 5.X Phase 0D section per this TODO.
3. Update PART 7 to mention the vision-wireframe convergence loop alongside the spec convergence loop.
4. Update the entity-profile-schema to support `set-aside` status on design artifacts (and possibly other artifact types).
5. Update the raw-source-taxonomy if Phase 0D surfaces new raw-source types (design-corrections, design-handoffs, design-briefs).
6. Test against another product entity (another project, Reflect) to confirm Phase 0D generalizes.
7. Publish to the sad-methodology open-source repo.

## Cross-references

- The reference project Phase 0D Pilot 1: A project note (status: set-aside).
- The reference project Phase 0D Pilot 2: A project note + a project note.
- [[sad-v3-part-5_5-classification-taxonomy]] — companion methodology TODO.
- [[SAD_SKILL_v3]] — the canonical methodology document this TODO targets.
