---
type: artifact
ai-model: claude
source: hybrid
created: 2026-04-23
updated: 2026-04-23
last-reviewed: 2026-04-23
authorship: sole
ip-sensitivity: normal
scope: global
audience: external — companion to the architecture figure
tags: [artifact, sad, methodology, walkthrough, architecture, gauntlet, share]
---

# SAD v3 Workflow — Extended Walk-Through

Companion to [[sad-v3-architecture]] (figure) and [[sad-v3-onepager]] (summary). Walks the lifecycle from idea to production, naming what each phase *eliminates* and what discipline carries clarity from one phase to the next.

## Scope

SAD v3 is specifically for the **Product pillar, software product type** — work that results in software artifacts (web apps, CLI tools, libraries, APIs, open-source projects). Variants for other pillars (Brand, Business) and other product types (physical, service, content) are planned as separate, domain-specific methodologies that share the process and adapt the artifacts. SAD v3 should not be applied directly to non-software or non-product work; authoring the equivalent variant is the right move when that work warrants formal methodology. See [[methodology-family]] for the roadmap.

## The through-line

**Compounding clarity collapses compounding error.** Over 50+ iterative steps with an AI coding agent, even a 1% per-step error rate becomes catastrophic. Ambiguity in specs doesn't lower that rate — it *expands what "correct" can mean*. SAD's opinion: narrow "correct" before any line of code, and preserve that narrowness through every downstream step.

Karpathy's point on LLM auto-research sharpens this: an evaluation suite requires ground truth *outside* the implementation. Without specs, "ground truth" is whatever the implementation happens to be — which makes evaluation circular. Specs give evaluation something to measure against. SAD threads this observation throughout, not just at the verification step.

## The phases, each reducing one specific kind of ambiguity

### Phase 0A — Externalize & Gather

**Eliminates:** the invisible. What the human hasn't said out loud yet. Implicit assumptions. Unnamed contradictions.

**Conduct:** two co-occurring activities:

1. *Externalize.* The human thinks out loud; the AI reflects structure back and asks open questions. The session continues until the human feels the idea is fully externalized — not refined, just named. The standard: *"I've said everything I know about this, including the parts I'm unsure about."*
2. *Gather.* External sources that ground or inform the idea are deposited into `_sources/` — research papers, podcasts, conversations, screenshots, prior art, book excerpts, whatever's relevant. 0A produces the IDEA_MAP *and* this accompanying raw-source trail.

**Output:** `IDEA_MAP.md` (Core Tension, Full Scope, Assumptions, Open Contradictions, What This Is Not, Questions That Need Answering) *plus* a set of `_sources/` deposits cited by the Idea Map.

**Gate ★ 0A:** is the Core Tension correctly named? Does the Full Scope reflect what was described, including the expansive parts? Are the Open Contradictions real? Is the "What This Is Not" list correct? Have the supporting sources been gathered (or explicitly noted as "none yet, research-light idea")?

### Phase 0B — Stress-Test

**Eliminates:** gaps in the research foundation. Two cases:

- *If 0A produced research-rich grounding:* 0B stress-tests what's there — is it comprehensive? Biased? Missing perspectives? What's the gap?
- *If 0A produced thin grounding:* 0B exposes the idea as underbaked. You can't specify against an idea that hasn't been informed. The phase's job in this case is to make the research gap visible before proceeding.

**Conduct:** stress-test across the five sub-types — market analysis, historical analysis, technical research, domain research, user research. The AI synthesizes and *critiques*, not merely reports. Findings get explicitly connected back to Idea Map items. Gaps get named.

**Output:** `RESEARCH_SYNTHESIS.md` organized by sub-type with a closing "So What" synthesis that states what the research *changed* about the Idea Map — and what research is still missing.

**Gate ★ 0B:** did research change the idea? A Research Synthesis that doesn't move the Idea Map at all signals research wasn't probing enough — this is a named failure mode. If research substantially revises the idea, 0A may need to be revisited before proceeding. Are remaining research gaps explicitly named rather than hidden?

### Phase 0C — Articulate the Unconstrained Vision

**Eliminates:** self-censorship. The reflex to constrain the vision by what seems feasible before the vision has been fully named — producing a document that is really a Version Spec wearing a Vision Spec label.

**Conduct:** write as if all constraints will eventually be resolved. Present tense. Expansive. Include capabilities that seem distant or difficult — they belong here. Name the Version Lattice: a pre-mapping of which capabilities belong to which version tier.

**Output:** `VISION_SPEC.md` — Problem Statement, Full Vision, Who This Is For (full), Version Lattice (V1 / V2 / V3+ tiers), *What This Will Never Be* (guards against scope creep in wrong directions), Success at Full Realization, Open Vision Questions.

**Gate ★ 0C** (the most important checkpoint in Phase 0): is the vision expansive enough, including the ambitious parts? Is the Version Lattice a reasonable pre-mapping? Is "What This Will Never Be" specific enough to reject a genuinely wrong feature request?

### Phase 1A — Scope

**Eliminates:** "is X in this version or a later one?" Boundary ambiguity about what V1 is.

**Conduct:** subtractive cut from the Vision Spec. Every capability in V1 must trace to a Vision Spec capability. Every included and deferred capability gets a justification.

**Output:** `VERSION_SPEC_v1.md` — Version Objective, Included Capabilities (with rationale), Deferred Capabilities (with rationale and any forward dependencies), Version Constraints, Vision Compatibility Check (explicit verification that no V1 decision forecloses a Vision capability), Success Criteria for this Version.

**Gate ★ 1A:** is V1 the right scope? Do deferrals close off anything the vision requires? Is every rationale defensible?

### Phase 1B — Specify

**Eliminates:** the big one — interpretive space the AI operates in during implementation. This is where the methodology does its heaviest work.

Seven spec documents, each derived from the one above. The derivation rule: *every downstream document derives from the one directly above it; parent wins on conflict*. The hierarchy:

```
VISION_SPEC
  └── VERSION_SPEC
        └── PRODUCT_SPEC
              ├── DATA_MODEL_SPEC
              ├── IMPL_SPEC
              ├── BEHAVIORAL_SPEC
              └── VERIFICATION_SPEC
```

Each spec has specific writing conventions (declarative sentences, present tense, every domain term glossaried, constraints as predicates not prose), specific required sections, and specific quality criteria (can a Version Spec close off a Vision capability? Are all entities named? Are all rules predicates?).

**Spec Convergence Loop** runs before each human checkpoint:

1. Draft the spec document.
2. Generate N adversarial scenarios against the spec (N ≥ 50 for critical layers, ≥ 20 for others).
3. For each scenario: does the spec produce exactly one correct implementation decision, or is there valid interpretation ambiguity?
4. Score the ambiguity rate. Iterate until the rate is below threshold (< 10% for critical, < 20% for others).
5. Produce a Convergence Report: scenarios run, ambiguities found, resolutions made, remaining open questions.

**Ambiguity catalog:** ambiguities surfaced by the loop that are not immediately resolved become *priority test scenarios* in the Verification Spec. This catalog is the bridge between Phase 1B and Phase 3.

**Gate ★ 1B Final:** cross-spec consistency verified; open questions resolved or explicitly deferred; ambiguity catalog transferred into the Verification Spec.

### The Documentation → Implementation boundary

Between Phase 1B and Phase 2 is the single biggest physical transition in the methodology.

- **Before the boundary** — everything lives in the vault at `<vault>/projects/<entity>/`. Specs, ideas, research, session logs. Vault-only work.
- **After the boundary** — implementation work lives at `<repos>/<repo>/`. Code, tests, build config, deployment scripts. The spec package in the vault remains the source of truth; the repo accumulates verified implementation against it.
- **The handoff** — a `code-pointer` note at `<entity>/product/code/pointer.md` in the vault declares the bridge: `repo-path`, `repo-remote`, `primary-language`, deployment metadata.
- **Session opening changes too** — from Phase 2 on, sessions read the repo's `SESSION_LOG.md` and `CLAUDE.md` *in addition to* the vault-side context. The Global CLAUDE.md inherits first; the repo CLAUDE.md adds project-specific conventions on top.

The figure shows this boundary as a horizontal amber band between the two zones. Everything above is documentation-phase work in the vault; everything below is implementation-phase work in the code folder.

### Phase 2 — Implement

**Eliminates:** drift from spec, caught at Decision Boundaries. During implementation, the AI encounters decisions the spec doesn't fully pin down. Under SAD, these don't get "just figured out" in the moment.

**Decision Boundary protocol** — when a decision isn't fully specified:

```
CHECKPOINT
────────────────────────────────────────
Decision: [one declarative sentence]

Options:
  A) [description] — Tradeoffs: [...]
  B) [description] — Tradeoffs: [...]

My proposal: Option [X] because [rationale]

Spec reference: [Document] § [Section]
Convergence catalog: [yes/no — cataloged ambiguity?]

Respond with:
  CONFIRM    — proceed with my proposal
  REDIRECT   — proceed with [alternative]
  ESCALATE   — spec update required before proceeding
────────────────────────────────────────
```

ESCALATE triggers Phase 4 (Spec Evolution) before any code is written against the unspecified behavior.

Every session writes a Session Log entry with decisions made, checkpoints triggered, spec ambiguities discovered, and any staleness markers produced.

### Phase 3 — Verify

**Eliminates:** silent compliance failure. An implementation that technically works but misses what the spec intended. Goodhart's Law is the named failure mode: if compliance metrics become the target, the loop will find ways to pass that don't correspond to correct behavior.

**Implementation Convergence Loop:**

1. Load the Verification Spec (acceptance criteria, invariant catalog).
2. Load the ambiguity catalog from Phase 1B — these are *priority* scenarios.
3. Generate test scenarios covering happy paths, cataloged ambiguities, boundary conditions, concurrency cases, dependency failure modes.
4. For each scenario: does implementation produce the behavior the spec requires?
5. Iterate on failures until compliance rate ≥ 95% on generated scenarios and 100% on cataloged scenarios.
6. Produce an Implementation Convergence Report.

**Gate ★ 3:** are failures real or test-generation artifacts? Are spec gaps genuine (trigger Phase 4) or misreadings? Is the compliance rate acceptable to proceed?

This phase is where the Karpathy point becomes operational: the Verification Spec *is* the ground truth. Every cataloged ambiguity becomes a required measurement. Evaluation stops being circular.

### Phase 4 — Spec Evolution (feedback)

**Trigger:** verified gap between implementation and spec (surfaced by Phase 3) *or* an ESCALATE from a Phase 2 Decision Boundary.

**Rule:** the spec changes, not the code patches around the spec.

**Change Protocol:**

1. Classify the change — Class 0 (Vision) / 1 (Scope) / 2 (Structural) / 3 (Behavioral) / 4 (Convention).
2. Draft in isolation — update the originating layer only.
3. Run Spec Convergence on the revised section.
4. Propagate downstream — produce a diff for each affected layer.
5. Reconcile the implementation — produce a reconciliation plan before modifying code.
6. Log the change in the Session Log.

**Staleness markers + reconciliation sprints:** after any Class 0, 1, or 2 change, the next implementation session begins with a reconciliation sprint before any new work on affected modules. No new features on modules carrying unresolved staleness markers.

### Phase 5 — Completion

**Eliminates:** drift at milestone boundaries. The moment a version closes is also the moment to verify the methodology held.

**Actions:** full spec audit comparing current implementation against every spec layer; Vision Spec compatibility check (did V1 close off any Vision capability?); version archival — all spec layers versioned and archived alongside the code; CLAUDE.md and SESSION_LOG carry forward to the next version, not reset.

**Gate ★ 5:** every discrepancy classified (spec ahead of code → planned future work; code ahead of spec → spec update needed; code contradicts spec → defect).

### Production — the ongoing state

Phase 5 closes a version; it does not close the methodology. Once code is in production, several loops continue running:

- **CI/CD deployment.** Continuous integration and deployment pipelines ship verified code from the repo. Monitoring detects runtime issues.
- **Phase 4 continues firing.** Whenever production reality reveals a spec gap (a behavior the spec didn't anticipate, an edge case the Verification Spec missed), Phase 4 Spec Evolution triggers and the relevant spec layer gets updated. This is the dashed amber arrow in the figure looping back from Production to the spec package.
- **Version transitions.** A `v1 → v2` transition is a Phase 5 closure followed by a Phase 1A reopening. Each new version is a subtractive cut of the *same* permanent Vision Spec. SESSION_LOG and CLAUDE.md carry across versions without reset.

The software in production remains *specified, verified, versioned, and eval-anchored* as long as the methodology is followed. Compounding clarity is preserved across time, not just across a single pipeline run.

## The two bridges the figure makes visible

- **Document derivation tree** (inside Phase 1B). The strict parent-wins derivation rule is what prevents the spec package from developing internal contradictions during authoring.
- **Ambiguity catalog bridge** (from Phase 1B to Phase 3). Unresolved ambiguities from Spec Convergence become required scenarios in Implementation Convergence. This is the mechanism that ties spec clarity to eval clarity mechanically rather than aspirationally.

## A side effect of the Convergence thresholds — shareability

When ambiguity drops below the Convergence thresholds (< 10% for critical specs; ≥ 95% compliance at implementation), a secondary property emerges: the artifact becomes **handoff-ready**. Someone not in the authoring conversation can read the spec package and produce a faithful implementation, or read an earlier-phase artifact and understand what's being specified, without further explanation from the author. This is not a separate goal and not a separate ritual — it is the direct consequence of the same disambiguation the Convergence thresholds measure. Cultural practices like "always be ready to demo" are therefore achievable from SAD's own mechanics; the methodology doesn't need a demo-readiness discipline on top because passing Convergence already produces the condition. Spec-first open release is the strongest form of this property: the spec package is handed to a community, and the community implements. Every SAD 1B should be at least that shareable, whether or not it ever actually goes open.

## Cross-cutting disciplines

These apply at every phase, not just specific ones:

- **Two-layer data model** — Raw (immutable cold storage: `_ideas/`, `_sources/`, `_sessions/raw/`) vs. Compiled (re-buildable from raw: specs, session logs, entity profiles). Context survives AI compaction because compiled artifacts can be regenerated; raw is never edited, only added.
- **Scope levels** — Global / Project / Local, mapping directly to Claude Code's memory hierarchy. Declared at session-start so every session knows which scope it operates at.
- **Session-opening protocol** — mandatory read of SESSION_LOG + CLAUDE.md + relevant spec layer *before* any code.
- **Capability-skills** — `time-awareness` (grounds real-world time via bash `date`) and `session-capture` (auto-captures predecessor session tail at session-start, drafts compiled session-log entry at session-end).
- **Human ★ checkpoint at every phase gate** — the pressure tests are automated; the approvals are human.

## What SAD claims

SAD claims three things:

1. **Each phase reduces one specific kind of ambiguity.** The phases are not arbitrary; each one targets a failure mode that would otherwise carry forward.
2. **Clarity compounds.** Phase N's output is sharper than its input, and Phase N+1 inherits a sharper starting point. The compounding runs against the direction of compounding error.
3. **Evaluation is only possible when specs exist.** Specs are the ground truth evaluation measures against. Without them, evaluation is circular. With them, evaluation is the mechanism that validates the specs themselves — which is why SAD's Convergence Layer runs both *at spec-time* and *at implementation-time*.

## Cross-references

- [[sad-v3-architecture|Architecture figure]] — the visual companion to this document.
- [[sad-v3-onepager|One-pager]] — shorter reader-friendly summary.
- [[SAD_SKILL_v3]] — the canonical full skill document (vault-internal).
- [[raw-source-taxonomy]] — the 21 raw-source-type subtypes that feed the raw layer.
- [[entity-profile-schema]] — the frontmatter schema for entity profiles.
- [[github-ownership-heuristic]] — where code lives on GitHub per SAD conventions.
