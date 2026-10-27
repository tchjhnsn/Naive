---
type: methodology-amendment-proposal
ai-model: claude
spec-layer: methodology
version: 3.3-proposed
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[SAD_SKILL_v3]]"
predecessor-idea: "[[build-roadmap-and-html-orchestration-2026-05-12]]"
status: PROPOSED — awaiting convergence + ratification
change-class: 3
sections-affected:
  - PART 0 — skill-and-wiki framing (refined)
  - PART 1 — dual-mode activities (refined)
  - PART 3 — Campaign / Session / Checkpoint (refined with sprint anatomy formalization)
  - PART 5 — episodic phases (substantial additions: 0A enumeration mode, Triage as 0A→0B bridge, 0Δ ambition gate, 0B per-pillar multi-mode two-pass, 1C articulation closure)
  - PART 8 — capability-skills (expanded: 20+ new skills authored)
  - PART 11 — supporting patterns (recursive pillars, fluidity, role-and-candidate-authoring)
  - PART 12 — known failure modes (new entries: wrong-mode posture, schema-without-template, etc.)
  - PART 14 — critical reminders (new entries for §27–§39)
  - NEW PART — three-layer formalization (methodology / company template / deliverable templates)
  - NEW PART — orchestration trajectory (HTML → software)
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-06_spec-colocation]]"
tags: [methodology, sad-v3, amendment-proposal, class-3, methodology-evolution, three-layer, recursion, fluidity, 2026-05-14]
---

# SAD v3.3 Methodology Evolution Amendment Proposal

**Status:** PROPOSED. Class 3 change. Pending convergence pass + the owner ratification before merging into `SAD_SKILL_v3.md`. Bundles 13 amendments (§27–§39) from the [[build-roadmap-and-html-orchestration-2026-05-12|build-roadmap idea-dump]] into a single coherent v3.3 release.

**Source idea-dump:** [[build-roadmap-and-html-orchestration-2026-05-12]] §27 through §39 (all authored same day during the 2026-05-14 methodology formalization sprint).

**One-paragraph summary:** SAD v3 evolved substantially during the reference project V1-next triage exercise. The methodology gained: a formalized three-layer separation (methodology / company template / deliverable templates / glue), a fractal-recursive pillar pattern, an explicit fluidity discipline distinguishing what-to-consider from how-to-document, named AI thought-partnership modes (friend / office-hours), three distinct interaction surfaces (skills / hooks / commands), an orchestration HTML pattern for solo-operator + AI use, and a role-and-candidate-authoring discipline as the bridge to multi-person teams.

---

## 1. Provenance

This amendment is motivated by a multi-thread session 2026-05-14:

- **The trigger.** The owner asked to triage the reference project's V1-next enumeration. The triage surfaced methodology gaps: enumeration vs free-form mind-dump as modes (not phases); per-pillar research with calibrated depth; mode-aware AI thought-partnership; pillar products that need their own three-pillar treatment; the operational gap between methodology-as-document and methodology-as-runnable-system.

- **The structural moves.** The session formalized SAD into three layers (the methodology pipeline, the company template, the deliverable templates) with skills + hooks + selective slash commands as the glue. Per-project orchestration HTML emerged as the canonical surface integrating all three layers.

- **The application.** The reference project immediately consumed the methodology evolution to articulate V1.5 (ant-generated wiki + real-time content). The application demonstrated the methodology against real work; the work shaped the methodology in turn.

Cross-reference: see also v3.0.1 ([[SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol|phase-closure-protocol]]) and v3.0.2 ([[SAD_SKILL_v3_AMENDMENT_2026-05-06_spec-colocation|spec-colocation]]) — both single-concern amendments. This v3.3 amendment is multi-concern (13 amendments bundled) because they were all authored in the same session and depend on each other structurally.

---

## 2. The 13 amendments

Each amendment is fully authored in [[build-roadmap-and-html-orchestration-2026-05-12]] (the idea-dump). This document summarizes + sequences them for ratification.

### §27 — Enumeration as a mode of idea-dumping (not a sub-phase)

Phase 0A operates in (at least) two complementary modes: free-form (loose, associative, exploratory) and enumeration (systematic, breadth-first, ticket-shaped). Both produce valid 0A outputs. The enumeration artifact is a structured form of the idea map, not a successor phase artifact.

**Spec change:** PART 5 Phase 0A description gains "modes" paragraph + cross-reference to [[enumeration-mode]] skill.

### §28 — Triage as the bridge between 0A and 0B

Triage's primary purpose is to organize the outputs of the mind-dump into a structure clean enough that organized research can proceed: per-pillar categorization, prioritization, research-driving questions, row-level status assignment. Backlog discipline is a byproduct, not the goal.

**Spec change:** PART 5 gains explicit "0A→0B bridge: Triage" sub-section + cross-reference to [[triage]] skill.

### §29 — Project Ambition Gate (Phase 0Δ) before research

Before Phase 0B (Research) begins, declare the project's ambition tier (hobby / side-project / open-source-tool / venture / enterprise). The tier determines the depth and breadth of research. Tier is stored in the entity profile.

**Spec change:** PART 5 gains new Phase 0Δ between Triage and 0B. Entity profile schema gains `ambition-tier` field. [[ambition-tier]] skill authored.

### §30 — Research per-pillar, multi-mode, two-pass

Phase 0B decomposes per-pillar (product / brand / business research synthesis), in two modes (friend / office-hours), and in two passes (0B-initial pre-vision; 0B-validate post-version-scoping). Mode is declared per sprint.

**Spec change:** PART 5 Phase 0B substantially expanded. New Phase 0B′ (validate) added after Phase 1A.

### §31 — AI thought-partnership modes (friend / office-hours)

AI thought-partnership has two declared modes. Friend = sympathetic expansion (0A, 0B-initial, 0C). Office-hours = sharp critique à la Gary Tan (1A, 0B-validate, 1B reviews). Mode declared at sprint start. Wrong-mode runs are a methodology failure mode.

**Spec change:** PART 3 sprint declaration ritual gains AI-posture field. New PART entry on thought-partnership modes. [[friend-mode]] + [[office-hours-mode]] skills authored.

### §32 — Per-project orchestration HTML

Every project carries a canonical orchestration HTML at the project root that integrates (by reference) every artifact across all three pillars and all four lanes. Templated; every project receives the same shape.

**Spec change:** New supporting pattern in PART 11. Template at [[per-entity-orchestration-template]]. First instance at a project note.

### §33 — Three-layer formalization

The methodology is formalized as three separable layers: (1) the methodology itself (four-lane pipeline + rituals), (2) the company template (three pillars + teams + roles), (3) deliverable templates (per-pillar, per-product-type, plus idea-discovered Tier 3). Skills + hooks + selective slash commands glue the layers together.

**Spec change:** New top-level PART introducing the three-layer formalization. Company template at `governance/venture-template/`. Tier 1/2/3 deliverable schema in each pillar file.

### §34 — Three interaction surfaces (skills / hooks / commands)

Methodology mechanisms are implemented at the appropriate interaction surface: skills (primary always-on context layer), hooks (lifecycle event automation), slash commands (selective explicit invocation, often as buttons in the orchestration HTML). The default surface for any new mechanism is skills. The discoverability principle: if a user has to memorize commands to use the methodology correctly, the methodology has failed.

**Spec change:** New PART on interaction surfaces. Hook intentions doc at [[hook-intentions-2026-05-14]]. Reference hooks config at [[reference-hooks-config.json]].

### §35 — Each pillar can have products (multi-pillar product shape)

Every pillar can have products. Product pillar holds canonical company products (required); Brand and Business pillars may also have products (optional). Tier 2 deliverable templates apply per product, not per pillar, indexed by product-type taxonomy (software / content / service / hardware / hybrid / partnership / program).

**Spec change:** Per-pillar files in company template gain "Pillar products (optional)" section. Methodology mechanisms operate per-product.

### §36 — Pillar recursion (companies birth companies, fractally)

The three-pillar company template is recursive. Pillar products are themselves companies-in-miniature, each with their own product, brand, and business pillar. Methodology mechanisms apply fractally — articulation closure runs per sub-company; version-identity discipline applies at every recursion level.

**Spec change:** New supporting pattern in PART 11 (recursive entities). Surface nesting patterns from existing PART 5 extended to recursion levels. Orchestration HTML surfaces sub-entity cross-links.

### §37 — Implicit-vs-explicit template fluidity

The methodology distinguishes explicit recommendations (what to consider — principles, recommended tools, recommended sources, examples) from implicit documentation shape (per project, per AI conversation, per context). Templates encode the explicit layer. The AI surfaces the implicit layer in conversation. Documentation is fluid and malleable per project.

**Spec change:** New PART on fluidity discipline. All template-style methodology docs gain framing notes per §37.

### §38 — Role + candidate authoring as methodology output

The methodology produces three artifacts for any role-filling moment: (1) role description, (2) ideal candidate qualities, (3) explicit recommendations for finding and evaluating candidates. Applies to predefined roles (using venture-template/roles/) and to custom roles (synthesized from pillar / lane / responsibilities). Sub-projects in the recursive structure each can produce their own role-filling artifacts.

**Spec change:** New supporting pattern in PART 11. [[role-and-candidate-authoring]] skill authored. Bridge from solo-operator to multi-person team methodology.

### §39 — Orchestration trajectory (HTML now, software later)

The orchestration layer has a trajectory: HTML for solo-operator + AI use; real software for multi-person + enterprise use. The HTML is designed to make the eventual port clean — structured state (JSON), component-shaped layout, clear data/presentation separation. The methodology website is a separate concern (publishing + onboarding + community) from the orchestration software (work management).

**Spec change:** New PART on orchestration trajectory. Companion artifact: [[everything-ecosystem/harness/README|harness]] folder (paused; resume when V1.5 has more shape).

---

## 3. Skills authored (20 new)

Per §34 (skills as primary surface), the methodology formalization authored 20 new skills in `sad/skills/`. The full inventory:

**Postures (per §31):** [[friend-mode]], [[office-hours-mode]]

**Phases (per §27, §28, §29):** [[enumeration-mode]], [[triage]], [[ambition-tier]]

**Disciplines (per §25, §26, §33):** [[deliverable-discovery]], [[template-generation]], [[canonicalize]], [[idea-archive]]

**Per-pillar context (per §33):** [[product-pillar]], [[brand-pillar]], [[business-pillar]]

**Roles (per §38):** [[executive-roles]], [[role-and-candidate-authoring]]

**Workflows:** [[foreshadowing-audit]], [[metrics-review]], [[cross-pillar-tradeoff]], [[stakeholder-update]]

**Per-product-type (per §35):** [[software-product]], [[content-product]], [[service-product]], [[hardware-product]]

---

## 4. Company template authored

Per §33, the new Layer 2 of the methodology stack. Lives at `governance/venture-template/`:

- [[venture-template/README|README]] — folder overview
- [[venture-template/index|index]] — master reference for what a company is
- Pillars: [[venture-template/pillars/product|product]], [[venture-template/pillars/brand|brand]], [[venture-template/pillars/business|business]]
- Roles: [[venture-template/roles/ceo|CEO]], [[venture-template/roles/cto|CTO]], [[venture-template/roles/cmo|CMO]], [[venture-template/roles/coo|COO]], [[venture-template/roles/founder|Founder]], [[venture-template/roles/chief-of-staff|Chief of Staff]]

---

## 5. Ratification path

This amendment is PROPOSED, not yet ratified. Ratification requires:

1. **Convergence pass.** Walk each §27–§39 against the existing `SAD_SKILL_v3.md` to check for contradiction or redundancy. Resolve ambiguities.
2. **The owner sign-off.** Per the methodology's own discipline, methodology amendments are operator-ratified before merging.
3. **Merge into `SAD_SKILL_v3.md`.** Update DELTA LOG; insert new PARTs; revise affected sections.
4. **Bump version to v3.3.0.** First non-patch SAD release since v3.0.

Until ratification, `SAD_SKILL_v3.md` remains the canonical methodology document. §27–§39 are queued amendments; agents + operators should treat them as authoritative for proposed-direction guidance but not yet baked into the canonical reference.

---

## 6. Implications for downstream work

- **The reference project V1.5 articulation** operates on §27–§39 directly (see [[v1.5-generative-wiki-articulation-2026-05-14]] decision-tracking).
- **Future projects entering Phase 0A** should use the §27–§31 phase model from the start.
- **The harness website** (when development resumes) implements §32 + §34 + §39 directly.
- **Multi-person team support** depends on §38 (role + candidate authoring) + §39 (real software).

---

## 7. Status

- **2026-05-14:** Initial authoring as bundled amendment proposal. PROPOSED; awaiting ratification.
