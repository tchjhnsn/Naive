---
type: knowledge
source: hybrid
created: 2026-03-26
ai-model: claude
tags: [everything-ecosystem, systems]
---
# Routing System

This system handles transportation — moving ideas between dumps across the entity hierarchy.
It is separate from the idea dump system because location (where ideas live) and transportation
(moving ideas between locations) are different concerns with different logic.

The idea dump is the warehouse. The routing system is the logistics network.

## Eight Core Routing Principles

**1. Dump-to-dump only.** Ideas route from one idea dump to another, never directly to
implementation documents. An ecosystem idea about another project goes: ecosystem dump → another project
dump. Implementation happens from the destination dump. This separates placement (where does
this belong?) from action (what do we do with it?). These are two different decisions, made at
two different times, possibly by two different people.

**2. Bidirectional flow.** Ideas flow up and down the entity hierarchy. Working in a child entity
and recognizing an ecosystem-level pattern routes the insight upward to the parent dump. Ideas
are not just task assignments flowing down — they're observations flowing in both directions.
Idea dumps are observation surfaces, not just task queues.

**3. Provenance chains track full routing history.** Every routing movement is recorded with
timestamps and session references. The provenance chain is multi-hop — an idea may route through
several dumps before finding its home.

**4. Routing timing is user-configurable.** Per session, changeable mid-session:
- **Immediate:** ideas move as recognized during the session.
- **Batch:** ideas queue up, presented for routing at session end.
- **Visible queue:** the person can see queued items at any time during the session.
- **Mid-session switch:** "hold routing for now" or "show me the queue, let me decide."
The orchestrator declares the default routing mode based on session type (capture defaults to
batch; focused defaults to immediate for out-of-scope ideas; parallel defaults to immediate).

**5. Multi-entity ideas stay at highest common parent.** When an idea is relevant to multiple
entities at the same level, it stays at the parent. When routing down, it gets re-articulated
in the language and context of each child entity. The parent idea is marked as implemented
("routed to children"); each child articulation becomes its own active idea with its own
lifecycle. Provenance links them.

**6. Recursive dumps emerge by human decision.** The framework observes clustering patterns and
asks whether a sub-dump would help. It does not autonomously create sub-dumps or structural
changes.

**7. Dump size triggers active diagnostics.** When a dump grows beyond a reasonable threshold,
the diagnostic system evaluates causes (implementation lag, clustering) and presents findings.
No autonomous structural changes.

**8. No theoretical depth limit.** If the mind can imagine the complexity, the framework captures
it. Depth is self-limiting because each recursion level adds cognitive overhead.

## Routing Operations

### Determining Route Targets

To route an idea, the routing system needs to know the entity hierarchy. It reads this from:
- Entity profiles (parent entity, child entities, relationships)
- Existing idea dump locations (which entities have their own dumps)

The routing map is the set of all entity profiles and their structural relationships. The
profiles themselves provide the intelligence for routing — no separate routing configuration
needed.

### Routing a Single Idea

1. Read the idea and its context.
2. Determine the target entity based on the idea's content and the entity hierarchy.
3. If the target entity has its own idea dump, route there.
4. If the target entity doesn't have an idea dump, route to the nearest ancestor that does.
5. Re-articulate the idea in the target dump's context if needed.
6. Record provenance in both source and target dumps:
   - Source: idea marked as implemented ("routed to [target]"), with date and session.
   - Target: idea entered with full provenance chain showing origin.
7. Update metadata in both dumps.

### Routing Upward (Child → Parent)

When working in a child entity and recognizing a parent-level or ecosystem-level insight:
1. Capture the idea in the current dump first (it was observed here).
2. Route a copy upward to the parent dump with appropriate re-articulation.
3. The source dump records: "Also routed to [parent] — ecosystem-level observation."
4. The parent dump records the idea with provenance showing it originated in the child.

### Batch Routing

During batch mode:
1. Accumulate routing candidates as a queue during the session.
2. At session end (or when the user requests), present the queue:
   "You have [N] ideas queued for routing: [summary by target]."
3. For each idea, propose the target and let the user confirm, redirect, or hold.
4. Execute confirmed routes. Hold unconfirmed ideas in the source dump as active.

### Multi-Entity Re-Articulation

When an idea at a parent level needs to route to multiple children:
1. Identify all target entities.
2. For each target, re-articulate the idea in that entity's language and context.
   - "Shared authentication infrastructure" → "integrate with ecosystem SSO" (Entity A)
   - "Shared authentication infrastructure" → "expose auth API for partners" (Entity B)
3. Route each articulation as a separate idea to its target dump.
4. Mark the parent idea as implemented ("routed to: [Entity A], [Entity B]").
5. All child ideas carry provenance linking back to the parent idea.

## Routing Queue Format

When visible to the user, the queue presents:
```
Routing Queue — [N] ideas pending
1. [Idea summary] → suggested target: [Entity Name] dump
2. [Idea summary] → suggested target: [Entity Name] dump
3. [Idea summary] → unplaced (no clear target entity)
```

Unplaced ideas are flagged — they may indicate a gap in the entity structure (something exists
that doesn't have an entity yet) or may just need more context.

## Handoff Triggers

**→ Idea Dump System:** After routing completes, both source and target dumps need metadata
updates.

**→ Entity Profiling:** If routing reveals an unplaced idea that may warrant a new entity, flag
this for the entity profiling system (discovery mode).

**→ Diagnostic System:** Routing patterns (which entities generate ideas, which consume them,
how long ideas sit before routing) are useful diagnostic data. The diagnostic system reads this
from provenance chains.
