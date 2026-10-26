---
type: methodology-reference
ai-model: claude
pillar: methodology
source: hybrid
created: 2026-05-21T07:41:34Z
last-updated: 2026-05-21T21:53:02Z
status: drafted-v1
tags: [methodology, reference, four-rings, four-threads, anatomy, substrate-invariance, systems-thinking, teaching-frame]
references:
  - "a project note"
  - "a project note"
  - "a project note"
  - "[[everything-ecosystem]]"
  - "[[methodology-starter]]"
  - "[[business-discovery-framework]]"
revision-cadence: revise when a new thread is named, a new ring debated, or a new sub-practice surfaces
---

# methodology-partition — The anatomy of the methodology

> The methodology is not a tool stack. It is a four-ring weave of cognitive layers, each running through four cross-cutting disciplines. This document is the canonical reference for that anatomy.

---

## Why this document exists

The methodology has many layers — practice, memory, abstraction, agent — and many disciplines that thread through every layer — relational awareness, versioning, ritual, pillar decomposition. When the layers and the disciplines get conflated, the methodology becomes hard to explain and harder to teach.

This document partitions them.

It is referenced by:
- `a project note` — the consultancy's vision narrative
- `a project note` — the consultancy's operational plan
- The Tier 1 (Practice Engagement) teaching frame
- The Tier 2 (Implementation Engagement) install plan
- Future industry-template authoring

It is *not* the SAD methodology. SAD describes the operational lanes (Articulate, Build, Ship, Operate). This document describes the anatomical layers (rings) and the cross-cutting disciplines (threads). The two are orthogonal — every SAD lane uses every ring, and every ring honors every thread.

---

## The four rings

Vertical structure. Where things live.

### Ring 1 — Practice

The cognitive disciplines that make every other ring possible. Systems thinking is the umbrella practice; underneath it sit several recognizable sub-practices:

- **Composition awareness** — systems contain subsystems and are contained by supersystems
- **Coupling awareness** — components affect each other (the thread we call relational awareness)
- **Boundary awareness** — knowing where one system ends and another begins
- **Substrate-invariance awareness** — function persists across substrate changes (paper-and-train letter → email → SMS; the function is "send a written message," the substrate keeps changing)
- **Tradeoff awareness** — seeing the cost-benefit of options at each decision point; recognizing that every decision has consequences in adjacent decisions
- **Abstraction-layer awareness** — knowing which layer a decision belongs at; recognizing when conversations conflate layers (e.g., debating tooling when the real disagreement is about the underlying practice)

The Practice ring is *cognitive*. It runs in the operator's head. Every other ring depends on it.

### Ring 2 — Memory

Externalized memory. Moving the practice off the operator's brain and onto a substrate that survives them.

The Memory ring has structure:
- A **schema** — every note declares its type, its date, its tags, its links
- A **relational layer** — wikilinks (or footnotes, citations, red string on a corkboard)
- A **hierarchy** — folders, filing cabinets, shelves

The substrate can be paper, a whiteboard, Notion, Google Drive, or a vault of plain-text files. The schema and the relations are the constants; the medium is the variable.

The most important property of Ring 2 is *the relationship layer*. A spec without its coupling-to-other-specs is dead weight. The true memory is not the cards but the cards plus the strings between them.

### Ring 3 — Abstraction

Tools that render the memory legible and operable.

Obsidian is one such tool. Dataview, Templater, Mermaid — also abstraction-ring tools. The SAD Command Center is an abstraction-ring tool under active development. Eventually, owned substrate software may sit at this ring.

Ring 3 is *instrumental*. It does not constitute the methodology; it operates on the memory layer. Swap Obsidian for VS Code + grep tomorrow and the methodology survives.

### Ring 4 — Agent

Whoever acts. Human, team of humans, AI, hybrid.

A solo founder is Ring 4. A team of three humans is Ring 4. Claude Code is Ring 4. An owned model-agnostic agent harness is Ring 4. The agent ring consumes Rings 1-3 and produces action.

This ring is *operational*. It is the only ring that can be replaced wholesale (a different person or AI) without affecting the lower rings.

---

## The four threads

Horizontal structure. Disciplines that run through every ring.

Each thread expresses itself differently at each ring, but the underlying discipline is constant.

### Thread 1 — Relational awareness

The discipline of naming couplings. When decision A constrains decision B, the coupling itself is a first-class artifact, not an implicit assumption. Tradeoffs notes, supersession links, lineage chains — all are relational-awareness artifacts.

### Thread 2 — Versioning discipline

The discipline of distinguishing ambition (BASED) from scope (SMART), and tracking the evolution of versions (V1 → V1.5 → V2 → V∞). VISION_SPEC + VERSION_SPEC; baseline/mainline/frontier/future/legacy framing.

### Thread 3 — Ritual discipline

The discipline of opening and closing every cycle. Session-start and session-end protocols. Gate-firing at phase transitions. Articulation closure before implementation.

### Thread 4 — Pillar discipline

The discipline of decomposing every entity into Product, Brand, and Business pillars (recursively, where applicable). The three lenses through which every entity is examined.

---

## The 4×4 weave

The methodology is the matrix produced when rings and threads cross.

| Thread × Ring | Practice (think) | Memory (document) | Abstraction (tool) | Agent (operate) |
|---|---|---|---|---|
| **Relational awareness** | systems thinking | wikilinks + tradeoffs notes | graph view, Dataview | follow citations to resolve coupling |
| **Versioning discipline** | BASED for ambition, SMART for scope | VISION_SPEC + VERSION_SPEC, V1/V1.5 notation | version-identity skill | use BASED for vision-drafts, SMART for ticket-writes |
| **Ritual discipline** | open/close cycles, gate thinking | session-log entries, raw captures | session-capture skill, hooks | run the gates; humans honor them too |
| **Pillar discipline** | three lenses on every entity | product/brand/business folder triplet | template-generation for pillar profiles | agent or human produces the three profiles |

Read across a row to see how one discipline expresses itself across all rings. Read down a column to see what disciplines a single ring honors.

The cells are not exhaustive. They are examples. The matrix is the framing; the cells get richer as the methodology matures.

---

## Substrate-invariance as a sub-practice

Substrate-invariance awareness deserves separate treatment because it is the sub-practice that makes the methodology consultancy possible.

A function persists across substrate changes. The function "send a written message to a remote person" has been carried by paper-and-train, paper-and-truck, paper-and-plane, telegraph, telephone, email, SMS, web-comment, and chat-app. A systems thinker sees the invariant — "remote written communication." A non-systems-thinker sees only the current substrate — "we use email."

This sub-practice has structural consequences:

- **The methodology runs on any substrate** — paper, whiteboard, Notion, vault-plus-agent. The Ring 2 (Memory) medium is replaceable.
- **The methodology survives every tooling shift** — Obsidian replaced tomorrow, Claude replaced tomorrow, the agent layer redesigned wholesale. The Practice and the Memory schema persist.
- **A consultancy can sell the methodology separately from the implementation** — Tier 1 teaches the substrate-invariant Practice; Tier 2 installs the current best Abstraction + Agent.

Substrate-invariance is also the most powerful diagnostic for prospective clients. The question *"describe your business as if computers didn't exist"* reveals whether the prospect has the sub-practice. If they can describe their business in terms of function, they have it. If they can only describe it in terms of current tooling, they have conflated function with substrate — and that is the first thing to correct.

---

## Systems thinking as the central coaching modality

The methodology consultancy coaches operators in systems thinking. That is the central modality.

Every Tier 1 session is a systems-thinking session expressed against the operator's actual life-domain. The six sub-practices — composition, coupling, boundary, substrate-invariance, tradeoff, abstraction-layer — are not separate offerings. They are the *modes* the coaching takes as the operator's particular situation requires.

When the operator is choosing between two implementations, tradeoff awareness is in the foreground. When the operator is debating tooling but the real disagreement is about practice, abstraction-layer awareness is in the foreground. When the operator can't see how decisions in one area constrain decisions in another, coupling awareness is in the foreground. The coaching adapts; the underlying discipline is constant.

This has two consequences for how Tier 1 engagements are structured:

- **The coach doesn't pick a sub-practice in advance.** The sub-practice surfaces from the operator's situation. The coach's job is to recognize which sub-practice is needed and bring it into focus.
- **A session isn't "about" a sub-practice.** It's about the operator's actual decisions, with sub-practices in the background making the decisions legible.

This is what differentiates this consultancy from generic systems-thinking education. We do not teach systems thinking as abstract content. We coach the operator's systems thinking as applied to their real life-domain.

---

## The pre-software methodology

The methodology existed before computers. It still works without them.

UPS ran systems thinking + relational memory + versioning discipline + ritual discipline + pillar decomposition long before computers. Brown trucks, stickers, conveyor belts, loading manifests — these are all *abstractions* over the practice of "deliver this thing from A to B with accountability." Today UPS has barcode scanners, route optimization, predictive ETAs. Replace every computer at UPS tomorrow with paper and clerks and the practice survives. Slower, more expensive, but coherent.

A team of three humans, sharing a Notion or a Google Doc, running daily standups, doing systems thinking + version-discipline + ritual-discipline + pillar-decomposition — is doing this methodology. Their substrate is digital but not AI-augmented.

A solo operator with a paper notebook, a wall of index cards with red string between them, and the discipline to open and close every working day with a written ritual — is doing this methodology. The substrate is fully analog.

The AI-augmented version is *one valid configuration* of the methodology. It is the most efficient configuration available in 2026. It is not the methodology itself.

---

## Implications for teaching

The 4×4 weave gives the methodology two natural teaching slices.

### Vertical slice — one thread across all rings

Pick a single thread. Walk it from Ring 1 through Ring 4.

Example with relational awareness: "Think of a thing as a system." → "Write it down with explicit links." → "Render it as a graph." → "An agent (human or AI) follows the links to reason." That single vertical slice demonstrates the whole methodology with one consistent concept.

### Horizontal slice — one ring with all threads

Pick a single ring. Show how each thread expresses itself at that ring.

Example with Memory (Ring 2): "Wikilinks express relational awareness. VISION_SPEC + VERSION_SPEC express versioning. Session logs express ritual. Pillar triplets express pillar decomposition." That horizontal slice shows what the Memory ring is *doing* — it is the substrate where every discipline becomes legible.

Both slicing strategies are pedagogically valid. The vertical slice is better for first-time teaching (one concept, full depth). The horizontal slice is better for filling in a ring the operator has already encountered.

---

## Implications for the methodology consultancy

The 4×4 weave maps cleanly to the consultancy's offering tiers (see `a project note`).

- **Tier 1 (Practice Engagement)** primarily teaches Ring 1 (Practice), with all four threads expressed at Practice-level. The customer leaves with the methodology in their head, not in their tools.
- **Tier 2 (Implementation)** installs Rings 2, 3, and 4 (Memory, Abstraction, Agent). The threads now express themselves in the customer's vault, in their Obsidian setup, in their Claude Code configuration.
- **Tier 3 (Operator Support)** maintains the integrity of the weave over time. Some threads drift faster than others — ritual discipline drifts especially fast (sessions get skipped, gates get bypassed). Tier 3's quarterly cadence re-engages the threads.

The substrate-invariance sub-practice is what allows Tier 1 and Tier 2 to be unbundled. Without it, the consultancy collapses into "we sell an Obsidian + Claude install" — which is a much weaker offering.

---

## Relationship to SAD methodology

This partition is *orthogonal* to the SAD methodology lanes (Articulate, Build, Ship, Operate).

SAD describes *operational lanes* — what the operator is doing right now (articulating, building, shipping, operating). The four rings describe *anatomical layers* — what the methodology contains. Every SAD lane uses every ring.

Example: a SAD Articulate session (Phase 0A through 1C) uses:
- Ring 1 (Practice) — the operator's systems thinking is doing the articulation
- Ring 2 (Memory) — the spec files getting authored
- Ring 3 (Abstraction) — Obsidian rendering the wikilinks, Dataview running queries
- Ring 4 (Agent) — Claude Code or the human doing the writing

And it honors:
- Relational awareness — the spec stack's wikilinks
- Versioning discipline — VISION_SPEC → VERSION_SPEC → BEHAVIORAL_SPEC etc.
- Ritual discipline — session-start protocol, articulation closure
- Pillar discipline — product/brand/business as the entity's lenses

The two views compose. The four rings tell you *what* the methodology contains. The SAD lanes tell you *when* the methodology is being run. The threads tell you *what disciplines* run through all of it.

---

## Open questions

Things this document does not yet resolve.

- **Are these the right four threads, or are there more?** The current four — relational, versioning, ritual, pillar — emerged from the work done so far. Articulation-before-actuation might be a fifth thread, or it might be the meta-thread that makes the other four possible. Feedback (every layer feeds back to refine the layer above it) might be another candidate.
- **Where do pipeline gates live?** Gates (0Δ, 1B.F, 1C, 2.F, 3.1) might be best modeled as the intersection of ritual thread × abstraction ring — a *cell* in the matrix, not a residence in any single ring. Worth firming up.
- **Are there sub-practices of systems thinking we haven't named?** Six named so far: composition, coupling, boundary, substrate-invariance, tradeoff, abstraction-layer. There may be more — analogy-awareness was proposed but not yet folded in. Each new sub-practice should be testable against real coaching sessions before being canonized.
- **How does the agent ring handle hybrid composition?** A solo founder with one AI cofounder is a 1+1 agent. A team of three humans with shared Claude Code access is 3+1. The methodology should be neutral to agent composition, but the operational consequences (who does what when) need a clearer framing.
- **What is the *unit* of the methodology?** Is it the entity? The session? The version? The thread-cell? Different units would lead to different teaching frames.

These will be resolved through use, not through theorizing.

---

## Status

- **Phase:** N/A — this is a methodology reference doc, not a SAD spec
- **Drafted:** 2026-05-21
- **Authored alongside:** the Methodology Consultancy VISION_SPEC and strategy doc
- **Revision cadence:** as the methodology evolves, this doc evolves. Expect revisions whenever a new thread is named, a new ring is debated, or a new sub-practice surfaces.

---

## References

- `a project note` — the entity that consumes this partition as its core offering
- `a project note` — uses the four-ring weave in the "factory" section
- `a project note` — uses the partition to structure Tier 1 vs Tier 2 offering
- `[[everything-ecosystem]]` — the parent methodology this document belongs to
- `[[methodology-starter]]` — the entry-point methodology doc
- `[[business-discovery-framework]]` — uses the substrate-invariance diagnostic
- SAD methodology (the operational lanes; orthogonal to this partition)

---

*The methodology is a weave. The threads are constants. The substrate adapts.*
