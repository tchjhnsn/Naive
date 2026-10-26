---
type: knowledge
tags: [everything-ecosystem, methodology]
ai-model: claude
created: 2026-04-22
source: hybrid
status: archived
superseded-by: [[SAD_SKILL_v3]]
archived: 2026-04-22
archive-reason: "Superseded by SAD v3, authored 2026-04-22 in the bundle session. v3 is additive — every load-bearing v2 invention (phase pipeline, spec documents, Convergence Layer, Decision Boundary, Spec Change Classes, staleness/reconciliation discipline) carries forward unchanged. v3 adds the LLM Wiki/Skill framing, dual-mode activities, two-layer data model, raw-source taxonomy, Campaign/Session/Checkpoint, time-awareness and session-capture skills, lifecycle-regression, reference-without-inherit, two-tier VISION_SPEC, and authorship discipline. See SAD_SKILL_v3 DELTA LOG for the full diff. This file is preserved as historical reference; new sessions should use v3."
name: specification-anchored-development-v2-archived
description: >
  ARCHIVED. Use [[SAD_SKILL_v3]] instead. Original v2 description follows.
  Specification-Anchored Development (SAD) is the mandatory methodology for all
  multi-session AI-assisted software projects. Trigger on ANY task involving
  building, architecting, implementing, or significantly modifying a codebase
  across multiple sessions. Also trigger when the user says "new project,"
  "start building," "I have an idea," "help me think through," "spec this out,"
  "let's architect," "what should I build," or references another project, the reference project, or any
  other product under active development. This skill defines how the entire
  development process works end-to-end — from raw idea through verified
  implementation — and must be consulted whenever starting a project, beginning
  a session, encountering a decision boundary, or updating a specification.
  MANDATORY TRIGGERS: new project, idea, mind dump, research, vision, spec,
  version, implement, architecture, session start, decision, data model, API,
  checkpoint, CLAUDE.md, convention, verification, spec change, evolution,
  reconcile, convergence.
---

# Specification-Anchored Development (SAD)
## AI Reference Document — Complete Methodology v2.0

> **Core principle**: Compounding error is the defining failure mode of iterative
> AI development. Even a 1% per-step error rate becomes catastrophic over 50+
> steps. SAD addresses this by narrowing the space of "correct" behavior through
> formal specification before any implementation begins. A precise spec doesn't
> improve the per-step success rate — it collapses what "incorrect" can even mean.
>
> **Extended principle**: Premature specification is its own failure mode. Specs
> written before the idea is fully understood encode misunderstanding at the
> source. The pipeline begins with exploratory phases that establish what is
> worth specifying before any specification is attempted.

---

## DOCUMENT HIERARCHY

```
VISION_SPEC.md          ← permanent, unconstrained, never scoped down
  └── VERSION_SPEC_v[N].md    ← subtractive cut of vision for this version
        └── PRODUCT_SPEC.md         ← intent, scope, user taxonomy (per version)
              └── DATA_MODEL_SPEC.md
              └── IMPL_SPEC.md
              └── BEHAVIORAL_SPEC.md
              └── VERIFICATION_SPEC.md

SESSION_LOG.md          ← reads across all phases, all versions
CLAUDE.md               ← reads at start of every implementation session
IDEA_MAP.md             ← produced in Phase 0A, feeds Phase 0B and 0C
RESEARCH_SYNTHESIS.md   ← produced in Phase 0B, feeds Phase 0C
```

**Derivation rule**: Every downstream document derives from the document
directly above it. Product Spec derives from Version Spec, not Vision Spec.
Version Spec derives from Vision Spec. If a downstream document contradicts
its parent, the parent wins — unless a spec change protocol is initiated.

**Vision Spec is never scoped down.** Versions are scoped down from it.
The Vision Spec describes what the product would be with no constraints.
Every Version Spec is an explicit subset of that vision.

---

## DOCUMENT LOCATIONS IN THE VAULT

SAD documents live inside the entity's product pillar in the Everything
Ecosystem vault:

```
<entity>/product/IDEA_MAP.md            ← Phase 0A output
<entity>/product/RESEARCH_SYNTHESIS.md  ← Phase 0B output
<entity>/product/spec/VISION_SPEC.md    ← Phase 0C output
<entity>/product/spec/VERSION_SPEC_v[N].md
<entity>/product/spec/PRODUCT_SPEC.md
<entity>/product/spec/DATA_MODEL_SPEC.md
<entity>/product/spec/IMPL_SPEC.md
<entity>/product/spec/BEHAVIORAL_SPEC.md
<entity>/product/spec/VERIFICATION_SPEC.md
<entity>/product/SESSION_LOG.md
<entity>/product/code/pointer.md        ← references the repo at <repos>/<repo>/
```

Two CLAUDE.md files exist and serve different purposes:

- **Vault CLAUDE.md** at `<vault>/CLAUDE.md` — governs the vault session
  context (Everything Ecosystem conventions, note types, vault structure).
  Read at the start of vault-side work.
- **Repo CLAUDE.md** at `<repos>/<repo>/CLAUDE.md` — governs the code session
  context (project conventions, session protocol, SAD Layer 4). Read second
  in every implementation session, immediately after SESSION_LOG.md per the
  Session Opening Protocol.

Code lives outside the vault by convention. The vault-side `code/pointer.md`
is a frontmatter-driven reference; the canonical code artifacts (including
the repo-level CLAUDE.md and SESSION_LOG.md) live in `<repos>/<repo>/`.

### Lifecycle-Stage ↔ SAD Phase Mapping

The vault's `entity-lifecycle-stage` frontmatter field parallels SAD phases.
A single field on the entity's profile communicates how far into SAD the
entity has progressed:

| `entity-lifecycle-stage` | SAD Phase State |
|--------------------------|-----------------|
| `concept`                | Before Phase 0A. Only name + one-sentence description exists. |
| `scoped`                 | Phase 0A complete. IDEA_MAP.md exists. |
| `specced`                | Phase 1B complete. Full spec package exists. |
| `prototyping`            | Phase 2 in progress. Implementation active; SESSION_LOG.md in use. |
| `active`                 | Post Phase 5 for at least one version; ongoing operation. |
| `maintenance`            | Post Phase 5; minimal active development. |
| `archived`               | Project stopped or superseded. Lives under `projects/_archive/`. |

An entity at `specced` with `open-source-ready: true` and
`community-buildable: true` represents a distinct SAD outcome worth naming:
**spec-first open release**. The deliverable is the Phase-1B spec package
itself — implementation is delegated to the community, and the repository
contains specs rather than code. This is a legitimate terminal state for
entities that should exist but shouldn't be built by the authoring team.

---

## QUICK REFERENCE

### Complete Phase Map

| Phase | Name | Produces | Gate |
|-------|------|----------|------|
| 0A | Mind Dump + Thought Partnership | `IDEA_MAP.md` | ★ 0A: Idea Map Review |
| 0B | Research | `RESEARCH_SYNTHESIS.md` | ★ 0B: Research Review |
| 0C | Unconstrained Vision Documentation | `VISION_SPEC.md` | ★ 0C: Vision Approval |
| 1A | Version Scoping | `VERSION_SPEC_v1.md` | ★ 1A: Version Scope Review |
| 1B | Specification | All spec layers | ★ 1B: Full Spec Package Review |
| 2 | Implementation | Working code | ★ 2.x: Decision Boundary |
| 3 | Verification (Convergence B) | Compliance report | ★ 3: Verification Review |
| 4 | Spec Evolution | Updated specs | (triggers from 2 or 3) |
| 5 | Completion | Archived spec package | ★ 5: Milestone Review |

### The Nine Specification Layers

| Priority | Layer | Document | Addresses | Read When |
|----------|-------|----------|-----------|-----------|
| 1st | — | `SESSION_LOG.md` | Institutional memory, decisions | Every session, FIRST |
| 2nd | — | `CLAUDE.md` | Conventions, session protocol | Every session, SECOND |
| 3rd | Vision | `VISION_SPEC.md` | Unconstrained full product vision | Version scoping, major decisions |
| 4th | Version | `VERSION_SPEC_v[N].md` | Scope cut for this version | Scoping features, resolving tradeoffs |
| 5th | 1 | `PRODUCT_SPEC.md` | Intent, taxonomy, core flows | Scoping features |
| 6th | 2 | `DATA_MODEL_SPEC.md` | Entities, relationships, constraints | Any data-touching work |
| 7th | 3 | `IMPL_SPEC.md` | Architecture, APIs, build pipeline | Crossing service boundaries |
| 8th | 5 | `BEHAVIORAL_SPEC.md` | Edge cases, error conditions | Implementing validation/errors |
| 9th | 6 | `VERIFICATION_SPEC.md` | Acceptance criteria, invariants | Verifying implementation |

### Human Checkpoint Summary

| Checkpoint | When Triggered | Minimum Engagement |
|------------|---------------|-------------------|
| ★ 0A: Idea Map Review | After AI produces Idea Map | Confirm scope, tensions, and what-this-is-not |
| ★ 0B: Research Review | After Research Synthesis produced | Confirm findings feed back into Idea Map correctly |
| ★ 0C: Vision Approval | After Vision Spec drafted | Full read — is this the real vision? 30–60 min |
| ★ 1A: Version Scope Review | After Version Spec drafted | Is V1 the right cut? What's rightly deferred? |
| ★ 1B: Full Spec Package | Before implementation begins | Cross-spec consistency — 60–90 min |
| ★ 2.x: Decision Boundary | Mid-session, per AI proposal | Confirm / Redirect / Escalate |
| ★ 3: Verification Review | After each implementation unit | Review convergence report |
| ★ 5: Milestone Review | At completion | Full spec audit, discrepancy report |

### Spec Change Classes

| Class | What Changed | Propagates To |
|-------|-------------|---------------|
| Class 0 — Vision | Fundamental understanding of the problem | Vision Spec → all downstream |
| Class 1 — Scope | Version scope (in/out list) | Version Spec → Product Spec → all downstream |
| Class 2 — Structural | Entity, relationship, or property | Data Model → Impl → Behavioral → Verification |
| Class 3 — Behavioral | Rule, constraint, or error response | Behavioral → Verification |
| Class 4 — Convention | Naming or style rule | CLAUDE.md only + retroactive normalization |

---

## PART 1: SESSION OPENING PROTOCOL

**Mandatory at the start of every implementation session.**

1. Read `SESSION_LOG.md` (full — don't skim)
2. Read `CLAUDE.md` (full)
3. Read the spec layer(s) relevant to the current task
4. State: (a) the precise task, (b) which spec section(s) it maps to, (c) anticipated decision points
5. Check for unresolved staleness markers in the Session Log
6. **Do not write a single line of implementation code until steps 1–5 are complete**

> **Staleness rule**: If there are unresolved staleness markers on the module
> you're about to work on, run a reconciliation sprint first. No new features
> on modules with unresolved markers.

---

## PART 2: THE COMPLETE PIPELINE

---

### Phase 0A: Mind Dump + Thought Partnership

**Purpose**: Help the human see the full shape of what they're imagining before
anything is filtered, scoped, or constrained. This is not interrogation —
that comes in Phase 1B. This is exploratory dialogue.

**AI role in this phase**:
- Reflect back structure from what the human is saying
- Identify tensions and contradictions without resolving them prematurely
- Push on assumptions by asking "what would have to be true for this to work?"
- Surface the full scope — expand before contracting
- Never apply technical constraints at this stage
- Never suggest implementation approaches
- Never narrow the idea to what seems feasible

**What this phase is not**:
- Not an interrogation (that's Phase 1B)
- Not research (that's Phase 0B)
- Not scoping (that's Phase 1A)
- Not a requirements session

**How the conversation runs**:
The human thinks out loud. The AI asks open questions, reflects structure,
and names what it's hearing. The session continues until the human feels the
idea is fully externalized — not refined, just externalized. The standard
is: "I've said everything I know about this, including the parts I'm unsure
about."

**Output**: `IDEA_MAP.md`

The AI produces this at the end of the mind dump session. It is a structured
summary, not a transcript. See template in Part 6.

**★ Checkpoint 0A: Idea Map Review**
Human reads the Idea Map. Confirms or corrects:
- Is the Core Tension accurately named?
- Does the Full Scope reflect what was described, including the expansive parts?
- Are the Open Contradictions real, or did the AI misread something?
- Is the "What This Is Not" list correct?

This checkpoint is the gate to Phase 0B. Do not begin research until the
Idea Map is confirmed — research that precedes a clear idea tends to anchor
the idea to the first things researched.

---

### Phase 0B: Research

**Purpose**: Inform the idea with external knowledge. Research feeds back into
the idea — it refines, expands, or redirects it.

**Research sub-types** (use whichever are relevant; they may iterate):

| Sub-type | Questions It Answers |
|----------|---------------------|
| Market analysis | Who else is building this? What have they gotten right? What gaps remain? |
| Historical analysis | How has this problem been approached before? What worked? What failed and why? |
| Technical research | What technologies are relevant? What are their actual constraints? |
| Domain research | What does the existing knowledge base say about this domain? |
| User research | Who would use this? What are their current workarounds? What do they actually want? |

**AI role in this phase**:
- Execute research across relevant sub-types
- Synthesize, not just report — raw findings are not the output
- Explicitly connect findings back to the Idea Map
- Surface findings that challenge the idea as prominently as findings that support it
- Flag assumptions in the Idea Map that research has updated

**Research may trigger iteration with Phase 0A**. If research substantially
changes the shape of the idea, return to Phase 0A for a revised mind dump
before proceeding. This is normal and expected. Research that doesn't change
the idea at all is a signal that the research wasn't probing enough.

**Output**: `RESEARCH_SYNTHESIS.md`

Organized by sub-type with a "So What" synthesis at the end. See template
in Part 6.

**★ Checkpoint 0B: Research Review**
Human reads the Research Synthesis. Confirms or corrects:
- Do the findings accurately represent what was researched?
- Does the "So What" synthesis draw the right conclusions?
- Are there research gaps that need to be filled before proceeding?
- Has the Idea Map changed as a result? If so, update it before proceeding.

Gate to Phase 0C: the Idea Map and Research Synthesis are both confirmed,
and any revisions to the Idea Map triggered by research have been made.

---

### Phase 0C: Unconstrained Vision Documentation

**Purpose**: Document the full unconstrained vision before any versioning or
scoping occurs. This is the permanent north star document.

**Critical properties of the Vision Spec**:
- Describes what the product would be with **no constraints** — no time, no budget, no technical difficulty
- Is written as if all constraints will eventually be resolved
- **Never gets scoped down** — versions get scoped down from it
- Serves as the permanent check against version specs: "does this version close off any future capabilities that the vision requires?"
- Is updated only when the **fundamental understanding of the problem changes**, not when implementation learnings accumulate

**AI role in this phase**:
- Draft the Vision Spec from the confirmed Idea Map and Research Synthesis
- Write expansively — this is not a product requirements document
- Include capabilities that seem distant or difficult — they belong here
- Name the Version Lattice: a pre-mapping of which capabilities belong to which version tier

**Output**: `VISION_SPEC.md`

See template in Part 6.

**★ Checkpoint 0C: Vision Approval**
This is the most important checkpoint in Phase 0. The Vision Spec is the
document everything else derives from — errors here propagate everywhere.

Human reads the full Vision Spec. Confirms:
- Does this describe the actual vision, including the ambitious parts?
- Is the Version Lattice a reasonable pre-mapping of capability tiers?
- Are there capabilities missing that belong in the full vision?
- Is the "What This Will Never Be" section accurate? (This prevents future scope creep into genuinely wrong directions.)

Estimated time: 30–60 minutes for a non-trivial project.

---

### Phase 1A: Version Scoping

**Purpose**: Define Version 1 as a subtractive cut of the Vision Spec.
The Version Spec is a scope decision document, not a product requirements
document — those come in Phase 1B.

**The subtractive principle**: Version Specs are always defined by subtraction
from the vision, not by addition from scratch. Every capability in V1 must be
traceable to the Vision Spec. If a capability appears in V1 that is not in
the Vision Spec, the Vision Spec is incomplete — update it first.

**AI role in this phase**:
- Draft the Version Spec as a subtractive cut of the Vision Spec
- Propose what is included in V1, with rationale
- Propose what is deferred to V2/V3/later, with rationale
- Flag any V1 decisions that would close off future Vision Spec capabilities
- Flag any V1 decisions that contradict the "What This Will Never Be" section

**Output**: `VERSION_SPEC_v1.md`

See template in Part 6.

**★ Checkpoint 1A: Version Scope Review**
Human reviews the Version Spec. Confirms:
- Is V1 the right scope? Not too ambitious, not too narrow?
- Are the deferral decisions correct? Is anything wrongly deferred?
- Does V1 avoid closing off any capabilities the Vision Spec requires?
- Is the rationale for each inclusion/deferral defensible?

Gate to Phase 1B: the Version Spec is approved. All downstream specs derive
from the Version Spec, not the Vision Spec.

---

### Phase 1B: Specification

**All spec documents derive from the approved Version Spec.**
Nothing is built in this phase. The entire phase produces documents.

The existing specification phase now begins with the Version Spec already
approved. The Product Spec's scope is defined by the Version Spec — it does
not re-litigate scope decisions.

#### Step 1B.1 — Idea Interrogation
With the Version Spec as the frame, conduct a precise interrogation to surface
anything the mind dump and research phases didn't resolve. Questions:
1. For each capability in V1: what does success look like precisely?
2. Who are the specific user types and what do they need the system to provide?
3. What are the non-negotiable constraints for this version?
4. What are the explicit error cases this version must handle?

Output: interrogation transcript (not a spec — raw material for spec drafting).

**★ Checkpoint 1B.0: Interrogation Review**
Human marks surprises. Surprises carry into the Product Spec explicitly.

#### Step 1B.2 — Spec Convergence Loop (Phase A)
**Before drafting each spec document, run Spec Convergence.**

The Convergence Layer is an automated adversarial pressure-testing loop that
runs before each human spec checkpoint. It does not replace human review —
it ensures human review is of a spec that has already survived automated
adversarial probing.

**How Spec Convergence runs**:
1. Draft the spec document
2. Generate N adversarial scenarios against the spec (N ≥ 50 for critical layers, ≥ 20 for others)
3. For each scenario: does the spec produce exactly one correct implementation decision, or is there a valid interpretation ambiguity?
4. Score: ambiguity rate = (ambiguous scenarios) / N
5. For each ambiguous scenario: either resolve it in the spec, or explicitly add it to the Open Questions section
6. Repeat until ambiguity rate < 10% (critical layers) or < 20% (others)
7. Produce a Convergence Report: scenarios run, ambiguities found, resolutions made, remaining open questions

**Convergence thresholds**:

| Spec Layer | Scenarios (N) | Converged When |
|------------|--------------|----------------|
| Vision Spec | 30 | < 15% ambiguity |
| Version Spec | 20 | < 15% ambiguity |
| Product Spec | 50 | < 10% ambiguity |
| Data Model Spec | 50 | < 10% ambiguity |
| Impl Spec | 40 | < 10% ambiguity |
| Behavioral Spec | 60 | < 10% ambiguity |
| Verification Spec | 30 | < 10% ambiguity |

**What counts as an adversarial scenario**:
- A user action the spec doesn't clearly specify how to handle
- An edge case at the boundary of two defined behaviors
- A conflict between two spec sections
- A term used in two different ways
- A constraint that produces an impossible state

**The ambiguity catalog**: Every ambiguity the Convergence Loop surfaces that
is not immediately resolved becomes a seed for the Implementation Convergence
Loop in Phase 3. These are transferred to the Verification Spec as required
test scenarios.

**★ Checkpoint 1B.1–1B.5: Per-Spec Review**
Human reviews each spec after Convergence Loop runs. The checkpoint now
includes reviewing the Convergence Report:
- Did the loop find real ambiguities or false positives?
- Are the resolutions correct?
- Are the remaining Open Questions genuinely open, or should they be resolved now?

**★ Checkpoint 1B.Final: Full Spec Package Review** (GATE — nothing proceeds without this)
All specs drafted and converged. Human reviews the full package for:
- Cross-spec consistency (contradictions between layers)
- Unresolved Open Questions that should be resolved before building
- Verification Spec specific enough to know when implementation is done
- Ambiguity catalog transferred from Spec Convergence to Verification Spec

Estimated time: 60–90 minutes for a complex project.

---

### Phase 2: Implementation

#### Session Protocol (repeat every session)
Run Session Opening Protocol (Part 1). Then execute Steps 2.1–2.4.

#### Step 2.1 — Task Scoping
One-paragraph declaration: precise task + Version Spec and Product Spec
reference + anticipated decision boundaries. Do not proceed without this.

#### Step 2.2 — Decision-Boundary Checkpoints
Trigger a checkpoint when:
- A decision is not fully specified in the current spec
- Multiple valid interpretations exist
- The decision would have downstream consequences in other parts of the system
- An ambiguity from the Convergence Loop's ambiguity catalog is encountered

**Checkpoint format**:
```
CHECKPOINT
────────────────────────────────────────────
Decision: [one declarative sentence]

Options:
  A) [description] — Tradeoffs: [pros/cons]
  B) [description] — Tradeoffs: [pros/cons]

My proposal: Option [X] because [specific rationale]

Spec reference: [Document] § [Section]
Convergence catalog: [yes/no — is this a cataloged ambiguity?]

Respond with:
  CONFIRM    — proceed with my proposal
  REDIRECT   — proceed with [alternative]
  ESCALATE   — this requires a spec update before proceeding
────────────────────────────────────────────
```

**On ESCALATE**: Pause implementation. Initiate Phase 4 (Spec Evolution).
Do not implement until spec is updated and checkpoint is re-issued.

#### Step 2.3 — Implementation
Build against spec. Every output must be traceable to a specific Version Spec
and Product Spec section.

#### Step 2.4 — Session Log Entry
**Mandatory at end of every session**:
```markdown
---
Date: YYYY-MM-DD
Session type: [Phase 0A / 0B / 0C / 1A / 1B / Implementation / Verification / Evolution]

DECISIONS MADE:
  1. Decision: [...]
     Rationale: [...]
     Alternatives rejected: [...]
     Spec impact: [Layer | Section | Change type]

CHECKPOINTS TRIGGERED:
  1. [What triggered it]
     Resolution: [Confirmed / Redirected / Escalated]

SPEC AMBIGUITIES DISCOVERED:
  1. [The ambiguity]
     Resolution: [Resolved as X / Still open / Added to convergence catalog]

STALENESS MARKERS:
  1. [Module/section] — reason: [spec changed while module not yet updated]

PROPOSED SPEC REVISIONS:
  1. [Layer] [Section]: [What should change]
---
```

---

### Phase 3: Verification (Implementation Convergence Loop)

Runs after every significant implementation unit — feature, module, data layer.
Not end-of-project only.

#### Step 3.1 — Implementation Convergence Loop
The second phase of the Convergence Layer. Applies the autoresearch pattern
to verification: instead of manually checking invariants, generate test
scenarios and iterate until convergence.

**How Implementation Convergence runs**:
1. Load the Verification Spec (acceptance criteria, invariant catalog)
2. Load the ambiguity catalog from Spec Convergence (these are priority scenarios)
3. Generate test scenarios covering: happy paths, ambiguity catalog items, boundary conditions, concurrency cases, dependency failure modes
4. For each scenario: does the implementation produce the behavior the spec requires?
5. Score: compliance rate = (passing scenarios) / (total scenarios)
6. Surface all failures with: scenario description, expected behavior (per spec), actual behavior, spec section violated
7. Repeat on fixed failures until compliance rate = 100% on cataloged scenarios and ≥ 95% on generated scenarios
8. Produce Implementation Convergence Report

**What "converged" means for implementation**:
- All invariants in the Invariant Catalog hold
- All acceptance criteria produce deterministic pass/fail
- All ambiguity catalog scenarios from Spec Convergence are explicitly handled
- No generated edge case exposes an unspecified behavior that maps to an Open Question
- Compliance rate ≥ 95% on generated scenarios

**The feedback loop**: If Implementation Convergence surfaces a scenario that
the spec doesn't cover and that isn't in the Open Questions — this is a spec
gap, not an implementation bug. Trigger Phase 4 (Spec Evolution) before
continuing.

**★ Checkpoint 3: Verification Review**
Human reviews the Implementation Convergence Report:
- Are the failures real, or are they test generation artifacts?
- Are the spec gaps genuine gaps, or misreadings?
- Is the compliance rate acceptable to proceed?

All failures prioritized and resolved before new features are added.

---

### Phase 4: Spec Evolution

Triggered any time a spec change is required. Never silent.

#### The Change Protocol
1. **Classify the change** (Class 0–4, see Quick Reference)
2. **Draft in isolation** — update originating layer only, confirm before propagating
3. **Run Spec Convergence on the revised section** — re-converge before propagating downstream
4. **Propagate downstream** — produce a diff for each affected layer, review each
5. **Reconcile the implementation** — produce reconciliation plan before modifying code
6. **Log the change** — Session Log entry: change, classification, layers affected, rationale

**Class 0 changes (Vision)**: Changes to the Vision Spec require human
approval before any downstream propagation. A Vision Spec change is a
statement that the fundamental understanding of the problem has changed —
not that implementation was harder than expected.

**When Vision Spec changes are appropriate**:
- New understanding of the problem space (not new understanding of this version's constraints)
- Discovery that the vision as written is internally contradictory
- Significant market or domain shift that changes what the product should ultimately be

**When Vision Spec changes are not appropriate**:
- Implementation learnings that are version-specific
- Scope reductions driven by time or resource constraints (these update the Version Spec, not the Vision Spec)
- Technical constraints of the current stack (these update the Impl Spec)

#### Staleness Prevention
When a spec section changes, mark all code sections referencing it as
"pending review" in the Session Log. Check markers at session start.
No new features on modules with unresolved staleness markers.

#### Reconciliation Sprints
After any Class 0, 1, or 2 spec change: the next implementation session
begins with a reconciliation sprint before any new work. Mandatory.

#### When Specs Diverge from Reality
When implementation reveals a spec is factually wrong (not ambiguous — wrong):
1. Stop implementation immediately
2. Document: what spec says, what reality requires, why incompatible
3. Revise spec — **never patch code around a spec you intend to keep**
4. Run Spec Convergence on the revised section
5. Run full Change Protocol for the appropriate class

---

### Phase 5: Completion

#### Step 5.1 — Full Spec Audit
Compare current implementation against every spec layer. Classify discrepancies:
- Spec ahead of implementation → planned future work (check against Version Lattice)
- Implementation ahead of spec → spec update needed
- Implementation contradicts spec → defect

#### Step 5.2 — Vision Spec Check
Before closing a version milestone, verify:
- Does anything in V1's implementation close off a capability the Vision Spec requires?
- Does anything in V1 contradict the "What This Will Never Be" section?
If yes, this is a design defect — not a scope issue — and must be resolved.

#### Step 5.3 — Version Transition
When V1 is complete and V2 begins:
1. Archive the full V1 spec package (all layers, versioned)
2. Record V1 spec version in Session Log alongside the deployment record
3. Create `VERSION_SPEC_v2.md` as a new subtractive cut of the Vision Spec
4. V2's Product Spec, Data Model, etc. are fresh documents that derive from `VERSION_SPEC_v2.md`
5. Session Log carries forward — it is not reset between versions
6. CLAUDE.md carries forward with updates — it is not reset between versions

**Vision Spec between versions**: Review but do not automatically update.
Ask: did V1 implementation change our fundamental understanding of the problem?
If yes: initiate a Class 0 change. If no: leave it unchanged.

#### Step 5.4 — Spec Archival
All spec documents versioned and archived with the code. Spec version at
each deployment recorded in Session Log.

---

## PART 3: SPECIFICATION DOCUMENT STRUCTURES

### What Makes a Spec "Good Enough to Build Against"

A spec is buildable when it satisfies all four:

- **Completeness**: Every entity, behavior, and constraint is named. Not necessarily fully elaborated — named. Unnamed things don't exist in implementation.
- **Unambiguity**: Every statement has exactly one interpretation. Scope qualifiers ("most," "some," "typically") are red flags. Implicit assumptions are red flags.
- **Consistency**: No statement contradicts another. Data model and product spec describe the same entities. Impl spec and convention doc use the same naming.
- **Operationalizability**: Every requirement can be tested. "Users can reset their password" is operationalizable. "The system should be user-friendly" is not.

The Spec Convergence Loop is the primary mechanism for verifying these
properties before a human checkpoint is triggered.

---

### Vision Spec (`VISION_SPEC.md`)

**Role**: Permanent, unconstrained description of the full product vision.
Never scoped down. Updated only on Class 0 changes (fundamental understanding
of the problem changes).

**Writing convention**: Write as if all constraints will eventually be
resolved. Present tense. Expansive. Include capabilities that seem distant.
Do not include implementation details — this is about what, not how.

**Required sections**:

```
# VISION SPEC
# Project: [name]
# Status: ACTIVE | SUPERSEDED
# Last revised: YYYY-MM-DD
# Revision reason: [blank until first revision]

## 1. PROBLEM STATEMENT
[The fundamental problem this product solves, at its deepest level.
Not the V1 problem — the full problem as it exists in the world.]

## 2. FULL VISION
[What the product would be with no constraints. Written expansively.
Multiple paragraphs. Include capabilities that seem far off.]

## 3. WHO THIS IS FOR (FULL)
[All user types the full vision serves, including those not in V1.
Goals, needs, and what the product ultimately provides them.]

## 4. VERSION LATTICE
[Pre-mapping of which capabilities belong to which version tier.
Not a roadmap — a capability taxonomy.]

  V1 tier (foundational):
    - [capability]
    - [capability]

  V2 tier (expansion):
    - [capability]
    - [capability]

  V3+ tier (full vision):
    - [capability]
    - [capability]

## 5. WHAT THIS WILL NEVER BE
[Capabilities, directions, or use cases that are explicitly outside
the full vision. This prevents scope creep into genuinely wrong
directions across all versions.]

## 6. SUCCESS AT FULL REALIZATION
[What the world looks like when this product is fully realized.
Specific and observable, not marketing language.]

## 7. OPEN VISION QUESTIONS
[Unresolved questions about the fundamental problem or vision.
Not version-specific questions — those go in the Version Spec.]
```

**Quality criteria**:
- Can you check any Version Spec against this and determine whether it closes off future capabilities?
- Does the Version Lattice provide enough structure to make V1 scoping decisions?
- Is the "What This Will Never Be" section specific enough to reject a genuinely wrong feature request?

---

### Version Spec (`VERSION_SPEC_v[N].md`)

**Role**: Subtractive cut of the Vision Spec for a specific version. Defines
what is included, what is deferred, and what is permanently excluded from
this version. All downstream specs derive from this document.

**Writing convention**: Every inclusion and deferral must be justified.
Justifications reference the Vision Lattice and the current constraints.
This is a decision document, not a description document.

**Required sections**:

```
# VERSION SPEC — v[N]
# Project: [name]
# Vision Spec version: [date/version]
# Status: DRAFT | APPROVED | SUPERSEDED
# Last revised: YYYY-MM-DD

## 1. VERSION OBJECTIVE
[One paragraph: what does this version accomplish, and why is this
the right scope for this version?]

## 2. INCLUDED CAPABILITIES
[Each capability from the Vision Lattice included in this version.]

  Capability: [name]
  Vision Lattice tier: [V1 / V2 / V3+]
  Inclusion rationale: [why now]
  Scope within this version: [what exactly is included, what is not]

## 3. DEFERRED CAPABILITIES
[Each capability from the Vision Lattice not in this version.]

  Capability: [name]
  Deferred to: [V2 / V3 / later / undecided]
  Deferral rationale: [why not now]
  Dependency: [does V[N+1] depend on anything in this version?]

## 4. VERSION CONSTRAINTS
[Constraints specific to this version: time, resources, technical,
team. These are not permanent — they are version-scoped.]

## 5. VISION COMPATIBILITY CHECK
[Explicit verification that no V[N] decision closes off a capability
required by the Vision Spec. For each inclusion: "Does this
implementation approach foreclose future Vision capabilities?"]

## 6. SUCCESS CRITERIA FOR THIS VERSION
[Specific, observable criteria for this version being complete.
Not the same as the Vision's success criteria.]

## 7. OPEN VERSION QUESTIONS
[Unresolved questions specific to this version's scope.]
```

---

### Layer 0: Session Log (`SESSION_LOG.md`)

**Role**: Institutional memory. Solves AI context loss between sessions.
Read FIRST, every session. Carries across all versions — never reset.

See Session Log Entry format in Phase 2, Step 2.4.

---

### Layer 1: Product Spec (`PRODUCT_SPEC.md`)

**Role**: Resolves ambiguity at the intent level for this version.
Derives from Version Spec. Does not re-litigate scope decisions.

**Writing convention**: Declarative sentences. "The system does X." Present
tense. Every domain term in the Glossary.

**Required sections**:

```
# PRODUCT SPEC
# Project: [name] — v[N]
# Version Spec reference: VERSION_SPEC_v[N].md
# Status: DRAFT | APPROVED | SUPERSEDED
# Last revised: YYYY-MM-DD

## 1. VISION STATEMENT (VERSION-SCOPED)
[One paragraph: what does this version do, for whom, and why.
Traceable to Version Spec § 1.]

## 2. SCOPE BOUNDARY
### In Scope (this version)
- [capability — references Version Spec § 2]
### Out of Scope (this version)
- [deferred capability — references Version Spec § 3]
### Permanently Out of Scope
- [references Vision Spec "What This Will Never Be"]

## 3. USER TAXONOMY
### [User Type Name]
  Goals: [...]
  Capabilities: [...]
  Constraints: [...]

## 4. CORE FLOWS
### Flow: [Name]
  Preconditions: [...]
  Happy path: [numbered steps]
  Error path: [at least one, with specific error]

## 5. EDITORIAL RULES
[...]

## 6. NON-NEGOTIABLE CONSTRAINTS
[...]

## 7. GLOSSARY
  [Term]: [Definition in one sentence]

## 8. OPEN QUESTIONS
  Q1: [Question] — Owner: [name] — Due: [date]
```

---

### Layer 2: Data Model Spec (`DATA_MODEL_SPEC.md`)

**Role**: Formal definitions of every entity, relationship, constraint,
temporal rule for this version. Derives from Product Spec.

**Required sections**:

```
1. ENTITY REGISTRY
   Table: name | description | PK type | creation rule |
          deletion rule | product spec reference

2. PROPERTY TABLES (per entity)
   Table: property | type | nullable | default | constraint | derivation
   Constraints are PREDICATES. "length ≤ 255" not "reasonable length."

3. RELATIONSHIP MAP
   Table: entity A | relationship | entity B | cardinality |
          required? | cascade behavior
   Both directions.

4. CONSTRAINT CATALOG
   Per entry: name | predicate | entities spanned | error message

5. TEMPORAL RULES
   Audit fields, state machines with legal transitions, archival rules.

6. INDEX AND QUERY PLAN
   Per major query: access pattern | data volume | required performance
```

**Entity entry template**:
```markdown
## Entity: [EntityName]
Description: [One sentence]
Product spec reference: [Section]
Primary key: [type]
Creation rule: [who/what/when]
Deletion rule: hard | soft | forbidden

### Properties
| Property   | Type     | Nullable | Default | Constraint   | Derivation |
|------------|----------|----------|---------|--------------|------------|
| id         | UUID     | NO       | auto    | unique       |            |
| created_at | DateTime | NO       | now()   |              |            |

### Relationships
| Relates to | Relationship | Cardinality | Required | Cascade  |
|------------|-------------|-------------|----------|----------|
| [EntityB]  | [verb]      | 1:N         | YES      | restrict |
```

---

### Layer 3: Implementation Spec (`IMPL_SPEC.md`)

**Role**: Technical architecture, service boundaries, API contracts, build
pipeline for this version. Derives from Product Spec and Data Model.

**Required sections**:

```
1. TECHNOLOGY STACK
   Every technology: choice | version | rationale
   Version pins required.

2. SYSTEM ARCHITECTURE
   Per unit: responsibility (one sentence) | inputs | outputs | dependencies
   Expressed as directed graph.

3. API CONTRACTS (per endpoint)
   method | path | request shape | response shape |
   error responses (all of them) | auth requirements

4. FILE SYSTEM TOPOLOGY
   Rules, not listing. New contributor places any file correctly.

5. BUILD PIPELINE
   Per step: what it does | requires | produces | failure looks like

6. SECURITY MODEL
   Auth mechanism | authorization model | data classification | compliance

7. PERFORMANCE BUDGET
   Per critical operation: operation | required latency | measurement method
```

---

### Layer 4: Convention Document (`CLAUDE.md`)

**Role**: Repo-resident rulebook. Read second, every session. Carries
forward across versions with updates. Never reset.

**Required sections**:

```
# CLAUDE.md

## PROJECT CONTEXT
[What this project is. Current version. Technology stack. Non-obvious decisions.]

## SESSION PROTOCOL
1. Read SESSION_LOG.md
2. Read this document
3. Read spec layers relevant to current task
4. State: task + spec reference + anticipated decision points
5. Do not proceed until above is complete

## NAMING CONVENTIONS
[Exhaustive. One rule per category. Example correct + incorrect for each.]

## FILE ORGANIZATION
[Decision tree. Not a listing.]

## FORBIDDEN PATTERNS
- [Never do X because Y]

## CHECKPOINT PROTOCOL
[Trigger conditions and format — reference Phase 2, Step 2.2]

## TESTING RULES
[What must be tested, where tests live, required patterns]
```

---

### Layer 5: Behavioral Spec (`BEHAVIORAL_SPEC.md`)

**Role**: System behavior under edge cases, error conditions, boundary inputs.
The layer most commonly omitted. Derives from Product Spec and Data Model.

**Required sections**:

```
1. VALIDATION RULES
   Per entity/operation: input | predicate | error response on failure

2. STATE TRANSITION RULES
   Per stateful entity: states | legal transitions | trigger conditions
   State machine format, not prose.

3. ERROR TAXONOMY
   Per type: code | user-facing message policy | logging requirement
   Categories: validation | authorization | not-found | server | dependency

4. CONCURRENCY AND IDEMPOTENCY RULES
   Per write operation: duplicate behavior | concurrent behavior |
   idempotency requirement | how achieved

5. DEPENDENCY FAILURE MODES
   Per external dependency: unavailable behavior | fallback | hard failure?
```

---

### Layer 6: Verification Spec (`VERIFICATION_SPEC.md`)

**Role**: Defines what a passing implementation looks like. The source
document for the Implementation Convergence Loop in Phase 3.
Receives the ambiguity catalog from Spec Convergence as required test scenarios.

**Required sections**:

```
1. TEST COVERAGE REQUIREMENTS
   Per category (unit/integration/e2e): what must be tested

2. ACCEPTANCE CRITERIA
   Per Core Flow: specific observable outcomes = correct behavior
   Directly translatable to automated or manual tests.

3. INVARIANT CATALOG
   Per invariant: statement | entities spanned | test that verifies it

4. AMBIGUITY CATALOG (from Spec Convergence)
   Per item: original ambiguity | resolution | required test scenario
   These are priority items for Implementation Convergence.

5. SPEC COMPLIANCE CHECKLIST
   Questions AI answers before declaring a task complete.
   Example: "Is every entity traceable to the Data Model Spec?"
```

---

## PART 4: THE CONVERGENCE LAYER

The Convergence Layer is the automated pressure-testing system embedded
in the SAD workflow at the two highest-risk moments: after specification
(Spec Convergence, Phase 1B) and after implementation (Implementation
Convergence, Phase 3).

### Design Principles

**Volume over precision**: The value of the loop comes from running many
scenarios, not from the perfect judgment of any individual scenario. 200
adversarial probes with noisy individual judgments produce more reliable
signal than 5 carefully considered reviews.

**Human as judge of convergence, not executor of pressure-testing**: The
loop does the exhaustive probing. The human decides whether the loop found
everything important. This is the right division of labor.

**Ambiguity catalog bridges the two phases**: Spec ambiguities that the
Spec Convergence loop surfaces but doesn't resolve become required test
scenarios in Implementation Convergence. The two loops are linked.

### What "Converged" Means

**Spec Convergence converged**:
- Ambiguity rate below threshold (see table in Phase 1B)
- All remaining ambiguities are explicit Open Questions
- Convergence Report produced and reviewed

**Implementation Convergence converged**:
- All invariants hold
- All acceptance criteria produce deterministic pass/fail
- All ambiguity catalog scenarios explicitly handled
- No generated edge case exposes unspecified behavior that should be specified
- Compliance rate ≥ 95% on generated scenarios

### The Feedback Loop

```
Spec Convergence (Phase 1B)
  → produces ambiguity catalog
    → ambiguity catalog feeds Verification Spec
      → Verification Spec drives Implementation Convergence (Phase 3)
        → Implementation Convergence surfaces spec gaps
          → spec gaps trigger Phase 4 (Spec Evolution)
            → revised specs re-run Spec Convergence
```

### Convergence Report Format

```markdown
## CONVERGENCE REPORT
Type: Spec Convergence | Implementation Convergence
Document/Phase: [which spec or which implementation unit]
Date: YYYY-MM-DD
Scenarios run: [N]
Ambiguities/failures found: [M]
Resolved in spec/code: [K]
Added to open questions/ambiguity catalog: [J]
Compliance/convergence rate: [%]

### Resolved Ambiguities
1. Scenario: [description]
   Ambiguity: [what was unclear]
   Resolution: [what was added/changed in the spec]
   Spec section updated: [reference]

### Open Questions Added
1. [Question] — added to [document] § [section]

### Priority Scenarios for Implementation Convergence
[populated only in Spec Convergence reports]
1. [scenario description] — tests: [what behavior]
```

---

## PART 5: KNOWN FAILURE MODES

### Pre-Specification Failures (new in v2)

**Anchoring too early**: Research that precedes a clear idea anchors the
idea to the first things researched. This is why Phase 0A must complete
before Phase 0B begins. If the Idea Map isn't confirmed, research will
systematically distort the vision.

**Conflating vision and version**: The most common error in Phase 0C is
writing a Vision Spec that is actually a Version Spec — constrained by
what seems feasible rather than by what is ultimately desired. A Vision
Spec that doesn't include anything that seems difficult has been self-censored
into a Version Spec. Push back on this in the ★ 0C checkpoint.

**Orphaned vision**: A Vision Spec that is approved and never consulted
again serves no purpose. The Version Lattice is the mechanism that keeps
the Vision Spec relevant — every Version Spec must check capabilities
against it.

### Specification Failures

**Spec staleness** (most predictable failure): Under time pressure,
developers update code rather than specs. The staleness marker system +
reconciliation sprint requirement prevent this. No new features on modules
with unresolved staleness markers.

**Hidden ambiguity**: Specs that sound precise but aren't. The Spec
Convergence Loop is the primary mitigation — it surfaces ambiguity at
machine speed before human review.

**Checkpoint fatigue**: A rubber-stamped checkpoint creates a false record
of validation and is worse than no checkpoint. Minimum viable engagement:
read the Convergence Report, review the resolutions, and either confirm
or redirect.

### Implementation Failures

**AI context loss**: The Session Log is the primary mitigation. Must be
genuinely maintained — not as a formality.

**Goodhart's Law in Implementation Convergence**: If the compliance metric
becomes the target, the loop will find ways to pass that don't correspond
to correct behavior. The human's role at ★ Checkpoint 3 is specifically to
watch for this — test scenarios that pass technically but miss the point.

---

## PART 6: TEMPLATES

### Idea Map (`IDEA_MAP.md`)
```markdown
# IDEA MAP
# Project: [working name]
# Produced: YYYY-MM-DD
# Status: DRAFT | CONFIRMED

## 1. CORE TENSION
[The fundamental problem or opportunity. One or two sentences.
What is the thing that doesn't work in the world right now, or the
capability that doesn't exist?]

## 2. FULL SCOPE AS IMAGINED
[Everything the human described, including the expansive parts.
No filtering. No feasibility judgment. If they said it, it's here.]

## 3. ASSUMPTIONS BEING MADE
[Beliefs the human is holding that are not yet validated. Stated as
assumptions, not facts. "We are assuming that X is true."]

## 4. OPEN CONTRADICTIONS
[Places where what was said doesn't fully cohere. Not problems to
solve yet — tensions to hold and explore.]

## 5. WHAT THIS IS NOT
[Directions that were explicitly excluded, or that are clearly outside
what was described. Prevents future scope confusion.]

## 6. QUESTIONS THAT NEED ANSWERING
[What would need to be true, known, or resolved before this idea
could be fully specified? Feeds the research agenda for Phase 0B.]
```

### Research Synthesis (`RESEARCH_SYNTHESIS.md`)
```markdown
# RESEARCH SYNTHESIS
# Project: [name]
# Produced: YYYY-MM-DD
# Status: DRAFT | CONFIRMED

## 1. MARKET ANALYSIS
[Findings. Organized as: who exists, what they've gotten right,
what gaps remain. Not a list of competitors — a structural analysis.]

## 2. HISTORICAL ANALYSIS
[How has this problem been approached before? What worked?
What failed and specifically why?]

## 3. TECHNICAL RESEARCH
[What technologies are relevant? What are their actual constraints
(not marketing claims)? What are the build tradeoffs?]

## 4. DOMAIN RESEARCH
[What does the existing knowledge base say? What are the established
frameworks, debates, or unresolved questions in this domain?]

## 5. USER RESEARCH
[Who would use this? What are their current workarounds?
What do they actually want, vs. what they say they want?]

## 6. SO WHAT — SYNTHESIS
[The findings that matter. What does this research change about the
Idea Map? What does it confirm? What does it challenge?
This section explicitly feeds back into Phase 0A if significant
enough to warrant an Idea Map revision.]

## 7. RESEARCH GAPS
[What wasn't researched that should have been? What would change
the analysis if it were known?]
```

### Vision Spec Header
```markdown
# VISION SPEC
# Project: [name]
# Status: ACTIVE
# Last revised: YYYY-MM-DD
# Revision reason: [blank]

## 1. PROBLEM STATEMENT
[The fundamental problem. Not version-scoped.]

## 2. FULL VISION
[Unconstrained. Expansive. No feasibility filtering.]

## 3. WHO THIS IS FOR (FULL)
[All user types across the full vision.]

## 4. VERSION LATTICE
  V1 tier (foundational): [capabilities]
  V2 tier (expansion): [capabilities]
  V3+ tier (full vision): [capabilities]

## 5. WHAT THIS WILL NEVER BE
[Explicit exclusions at the vision level.]

## 6. SUCCESS AT FULL REALIZATION
[Observable, specific, not marketing.]

## 7. OPEN VISION QUESTIONS
[Unresolved fundamental questions.]
```

### Version Spec Header
```markdown
# VERSION SPEC — v[N]
# Project: [name]
# Vision Spec reference: YYYY-MM-DD version
# Status: DRAFT | APPROVED

## 1. VERSION OBJECTIVE
[What this version accomplishes and why this scope.]

## 2. INCLUDED CAPABILITIES
  [capability]: included because [rationale]
  Scope within this version: [what exactly]

## 3. DEFERRED CAPABILITIES
  [capability]: deferred to v[N+1] because [rationale]
  Dependency: [what V[N+1] needs from this version]

## 4. VERSION CONSTRAINTS
[Time, resources, technical constraints — version-scoped only.]

## 5. VISION COMPATIBILITY CHECK
[For each inclusion: does this foreclose future Vision capabilities?]

## 6. SUCCESS CRITERIA FOR THIS VERSION
[Specific and observable.]
```

### Decision-Boundary Checkpoint
```
CHECKPOINT
────────────────────────────────────────────
Decision: [one declarative sentence]

Options:
  A) [description] — Tradeoffs: [pros/cons]
  B) [description] — Tradeoffs: [pros/cons]

My proposal: Option [X] because [specific rationale]

Spec reference: [Document] § [Section]
Convergence catalog: [yes/no — cataloged ambiguity?]

Respond with:
  CONFIRM    — proceed with my proposal
  REDIRECT   — proceed with [alternative]
  ESCALATE   — spec update required before proceeding
────────────────────────────────────────────
```

### Session Log Entry
```markdown
---
Date: YYYY-MM-DD
Session type: Phase 0A | 0B | 0C | 1A | 1B | Implementation | Verification | Evolution

DECISIONS MADE:
  1. Decision: [...]
     Rationale: [...]
     Alternatives rejected: [...]
     Spec impact: [Layer | Section | Change type]

CHECKPOINTS TRIGGERED:
  1. [What triggered it]
     Resolution: Confirmed | Redirected | Escalated

SPEC AMBIGUITIES DISCOVERED:
  1. [The ambiguity]
     Resolution: [Resolved as X / Still open / Added to convergence catalog]

STALENESS MARKERS:
  1. [Module/section] — reason: [...]

PROPOSED SPEC REVISIONS:
  1. [Layer] [Section]: [What should change]
---
```

---

## PART 7: CRITICAL REMINDERS FOR AI

1. **Pipeline order is mandatory**: Phase 0A before 0B before 0C before 1A before 1B. Never attempt to spec before the vision is documented. Never implement before specs are converged.

2. **Vision vs. Version distinction**: The Vision Spec describes the full unconstrained product. The Version Spec describes this version's scope cut. Never conflate them. When in doubt about which document a decision belongs in, ask: "Is this about what the product ultimately is, or about what this version includes?"

3. **Spec authority**: When reality conflicts with spec, the spec changes — not the policy. Never patch code around a spec you intend to keep.

4. **Convergence Loop discipline**: Run Spec Convergence before every human spec checkpoint. Run Implementation Convergence before every human verification checkpoint. These are not optional. The human reviews convergence reports, not first drafts.

5. **Escalate on spec gaps**: If a checkpoint or Convergence Loop reveals a genuine spec gap, escalate — do not improvise and proceed. Pause and update the spec first, re-converge, then continue.

6. **Session Log first, always**: Every session reads the Session Log before anything else. If the Session Log is missing, note that context may be incomplete and request it.

7. **Ambiguity catalog continuity**: Ambiguities surfaced in Spec Convergence that are not immediately resolved must be transferred to the Verification Spec's Ambiguity Catalog. They must appear as priority scenarios in Implementation Convergence. Do not let them disappear between phases.

8. **Staleness before new features**: If staleness markers exist on a module, run a reconciliation sprint before adding new features to it. This is not optional.

9. **Naming consistency**: If a term appears in the Glossary, use it exactly as defined everywhere. Synonym drift is the most insidious spec inconsistency.

10. **No silent drift**: Every spec change is logged. Every propagation is traced. Every reconciliation is noted. Silence is the enemy.

---

*Specification-Anchored Development — Version 2.0 — March 2026*
*Developed by the owner and Claude*
