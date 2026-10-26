---
type: idea
source: hybrid
created: 2026-03-27
ai-model: claude
tags: [everything-ecosystem, systems]
---
# Idea Dump System

This system manages where ideas live, what states they hold, and what metadata describes each
dump. The idea dump is a transit system — ideas enter, get triaged, and then leave. Implemented
ideas graduate to design/documentation and are tracked by the provenance system from that point
forward. Archived ideas (decided against, deferred indefinitely, regressed) move to the idea
archive. The dump's goal is to reach an empty state.

The idea dump system functions as the nervous system of the methodology — a living, active system
that maintains awareness of the state of ideas across the entire entity hierarchy.

## Idea States

**Active** — still potential, unresolved. The working set. Ideas waiting to be moved into design
and specification, or still being decided on.

**Graduated** — resolved forward. The idea has moved into design and documentation. It no longer
lives in the dump — it lives in its documentation home (a spec, a system skill, a reference
document, etc.). The provenance system tracks the idea from this point forward: how long it sits
in documentation, when it enters implementation, when it ships, and whether it regresses. The
dump records a provenance trail pointing to where the idea went, then clears it.

**Archived** — resolved sideways. Decided against, consciously deferred indefinitely, or
regressed after shipping. Cleared from the active dump to the **idea archive** (a separate
document) because the idea has no other home. The decision not to implement (or to un-implement)
is valuable information. Only ideas that have nowhere else to live go to the archive.

Archiving can happen at any lifecycle stage — from the active dump (decided against before
specs), from design/specs (decided against after speccing), from implementation (abandoned
during build), or from production (regression after shipping). Each carries different provenance.

**Key distinction:** Graduated ideas do NOT go to the archive. They have homes in documentation.
Archived ideas DO go to the archive because they have no other home.

## Dump Structure

The idea dump and the idea archive are **separate documents**. The dump is a transit system —
its purpose is to be emptied as ideas reach their destinations. Graduated ideas leave the dump
and live in their documentation; the provenance system tracks their ongoing lifecycle. Archived
ideas leave the dump and live in the archive because they have no other home.

Each idea dump file follows this structure:

```markdown
# Idea Dump — [Entity Name]

## Metadata
- Created: [date]
- Total ideas processed: [count]
- Active ideas: [count]
- Ideas graduated to documentation (lifetime): [count]
- Ideas archived (lifetime): [count]
- Last idea entry: [date]
- Last idea movement: [date]

## Active Ideas

### Session [N] — [date]
[numbered ideas with statuses and provenance]
```

Each idea archive file follows this structure:

```markdown
# Idea Archive — [Entity Name]

## Metadata
- Created: [date]
- Total archived items: [count]
- Decided against: [count]
- Deferred indefinitely: [count]
- Regressed from production: [count]
- Last archive entry: [date]

## Decided Against
[ideas rejected before or during design, with reasoning]

## Deferred Indefinitely
[ideas shelved with no target date, with reasoning]

## Regressed from Production
[ideas that were shipped and pulled back, with full lifecycle provenance]
```

**Note:** Implemented/graduated ideas do NOT appear in the archive. They live in their
documentation homes and are tracked by the provenance system.

## Idea Entry Format

Each idea carries:
- Sequential number (global to the dump)
- Description (the idea itself)
- Idea status (from extensible vocabulary: observation, suggestion, decision, request, blocked,
  deferred, or any other status that fits)
- Provenance metadata:
  - Date entered
  - Session it entered from
  - When resolved: date implemented/archived
  - Session resolved in
  - Where routed to (for implemented ideas)
- Lineage metadata (when applicable):
  - Prior versions (earlier articulations of the same idea)
  - Matured into (later, more complete articulations)
  - Canonical version indicator (which articulation is the definitive one)

**Example (basic):**
```
42. **Shared authentication across ecosystem products.**
    Status: suggestion
    Entered: Session 4, March 25 2026
    → Routed to: Another project dump, Session 5, March 26 2026
    → Pushed to specs: Session 8
    → Implemented: Session 10
```

**Example (with lineage):**
```
92. **The idea dump is a living queue, not an append-only log.**
    Status: implemented (superseded)
    Entered: Session 4, March 24 2026
    Lineage: → matured into items 104-109 (Session 5, complete idea lifecycle)
    This is the early articulation. Items 104-109 are canonical.

104. **The complete idea lifecycle crosses multiple systems.**
    Status: implemented
    Entered: Session 5, March 25 2026
    Lineage: ← evolved from items 92-98 (Session 4, idea dump lifecycle)
    → Formalized: systems/idea-dump.md, METHODOLOGY_REFERENCE.md §8
    This is the canonical articulation of the idea lifecycle.
```

## Idea Lineage

Ideas mature over time. The same core concept often appears first as a rough observation,
then reappears in a later session as a more complete design, and eventually gets formalized
into a spec or system skill. The lineage mechanism tracks this evolution so that:

- The dump can distinguish between "two separate ideas" and "one idea at different maturity
  levels."
- Triage can identify which version is canonical and mark earlier versions as superseded.
- The provenance chain extends beyond routing (where an idea moved) to include maturation
  (how an idea evolved).

### Lineage Fields

**← evolved from [items]** — this idea is a more mature version of earlier items. Lists the
prior articulations with their session and a brief description of what they captured.

**→ matured into [items]** — this idea was later articulated more completely. Lists the
mature versions. When an idea has a "matured into" reference, it is no longer the canonical
version.

**Canonical version** — the most complete and current articulation of a concept. When
multiple items express the same idea, only the canonical version remains active. Earlier
versions are marked as "implemented (superseded)" with lineage pointing to the canonical
version. The canonical version carries lineage pointing back to the earlier articulations.

### Lineage Detection

During triage, the idea dump system should actively look for lineage patterns:

- **Keyword overlap:** Multiple items across sessions using the same key terms or referencing
  the same system, concept, or entity in similar ways.
- **Conceptual containment:** A later item that fully contains the thinking of an earlier
  item plus additional depth, detail, or design.
- **Explicit refinement:** Language like "building on," "expanding," "refining," or "as
  discussed" that signals the person is revisiting an earlier concept.
- **Session progression:** The same theme appearing across consecutive sessions, each time
  with more specificity.

When lineage is detected, the system should:
1. Link the items bidirectionally (earlier → later, later ← earlier).
2. Determine which is canonical (the most complete articulation).
3. Mark non-canonical versions as "implemented (superseded)" with lineage provenance.
4. Preserve the text of all versions — lineage is a relationship, not a deletion.

### Lineage vs. Routing vs. Provenance

These three mechanisms serve different purposes and can coexist on the same idea:

- **Provenance** tracks where an idea moved (which dump, which spec, which document).
- **Routing** tracks transportation between dumps (ecosystem dump → entity dump).
- **Lineage** tracks maturation within a dump (early version → refined version → canonical
  version). Lineage is about the idea becoming itself more fully, not about the idea
  going somewhere else.

An idea can have all three: it was first captured in Session 2 (provenance), matured in
Session 5 (lineage), and then routed to an entity dump (routing) before being pushed to
specs (provenance).

## Operations

### Capturing Ideas
When the user is externalizing ideas (especially during capture sessions):
- Number each idea sequentially
- Assign an initial idea status based on how the person frames it
- Record the session and date as provenance
- Do not push toward classification or routing during pure capture — preserve first
- Organize ideas under session headers for readability

### Triaging Ideas
When reviewing an existing dump:
- Walk through active ideas, updating statuses as needed
- Identify ideas ready to move forward (push to specs, route to another dump)
- Identify ideas to archive (decided against, superseded, no longer relevant)
- Detect lineage: look for ideas that express the same concept at different maturity levels.
  Link them, determine which is canonical, and mark earlier versions as superseded.
- For each state change, record the provenance (date, session, reason)
- For each lineage link, record both directions (earlier → later, later ← earlier)

### Graduating Ideas to Documentation
When an idea has been formalized into a spec, system skill, or other document:
- Clear it from the active dump
- Record the provenance trail on the idea before clearing: where it went, when, which session
- The idea now lives in its documentation home — NOT in the archive
- The provenance system picks up tracking from here (time in documentation, implementation
  status, production status, regression monitoring)
- Update dump metadata (active count decreases, graduated count increases)

### Archiving Ideas
When an idea is decided against, deferred indefinitely, or regressed from production:
- Move it from the active dump to the **idea archive** document (appropriate subsection
  based on why it's being archived)
- Record reason for archival, date, session
- For regression archives: include the full lifecycle provenance (when it was specced,
  implemented, shipped, and why it was pulled back)
- Update both dump metadata and archive metadata
- Note: only ideas with no other home go to the archive. If it was implemented and lives
  in documentation, it is NOT archived — it graduated

### Updating Metadata
After any operation that changes the dump state (new ideas, state changes, routing in/out),
update the metadata block at the top of the file. This feeds the diagnostic system.

## Handoff Triggers

**→ Routing System:** After capturing ideas that may belong in other dumps, flag them for the
routing system. During batch routing mode, accumulate these flags and present them at session
end. During immediate routing mode, flag each as it's captured.

**→ Entity Profiling:** After ideas are implemented (pushed to specs or documents), the entity
profile's documentation audit needs updating. Signal the orchestrator to trigger entity profiling.

**→ Diagnostic System:** Dump metadata changes feed the diagnostic system's monitoring. The
diagnostic system reads metadata; the idea dump system writes it.

## Recursive Dumps

Sub-entities (pillars, surfaces, platform capabilities) can have their own idea dumps when
complexity warrants. A sub-dump follows the same structure and rules as any other dump. The
routing system handles transportation between parent and child dumps.

Creating a sub-dump is a human decision. The diagnostic system may observe clustering and
suggest it, but the idea dump system does not autonomously create sub-dumps.
