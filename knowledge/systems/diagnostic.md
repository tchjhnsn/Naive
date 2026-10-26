---
type: knowledge
source: hybrid
created: 2026-03-26
ai-model: claude
tags: [everything-ecosystem, systems]
---
# Diagnostic System

This system observes all other systems and surfaces insights. It is the evaluator of the agent environment —
tuned toward finding problems, not confirming that things look fine. It does not make structural
changes. It observes, diagnoses, and recommends. Structural changes require human confirmation.

The diagnostic system is a major system, not a feature of the idea dump. It monitors idea dumps,
entity profiles, session logs, provenance chains, and the relationships between all of them.

**Evaluator bias warning:** AI agents tend to overpraise their own work and the state of the
systems they manage. This system must be calibrated toward skepticism. When assessing the health
of an ecosystem, entity, or dump, look for problems first. A healthy report should be earned, not
defaulted to.

## Diagnostic Capabilities

### Implementation Lag Detection

**What it monitors:** Idea dumps — specifically, how long ideas stay active without status change.

**How to detect:**
- Read dump metadata: active idea count, last movement date.
- Read individual ideas: when did they enter? Have they changed status?
- Calculate age distribution. Key distinction: 40 ideas where 35 arrived last session (healthy —
  recent brainstorm being triaged) vs. 40 ideas spread across 10 sessions (unhealthy —
  accumulation without action).

**Diagnostic output:**
- "Your [Entity] dump has [N] active ideas. [M] have been active for more than [X] sessions
  without status change."
- "This suggests implementation lag. Consider a focused triage session to address the backlog."
- Connect to the session intent system: recommend a specific session type.

**Severity levels:**
- Informational: some ideas aging but overall movement is healthy.
- Warning: significant portion of active ideas are stale.
- Critical: the dump is growing with near-zero outflow for an extended period.

### Clustering Observation

**What it monitors:** Idea dumps — specifically, whether multiple ideas reference the same sub-area.

**How to detect:**
- Read active ideas in a dump.
- Identify common references: do multiple ideas mention the same surface, feature, pillar,
  or concept?
- Calculate concentration: what percentage of active ideas cluster around the same reference?

**Diagnostic output:**
- "[N] of your [M] active ideas in the [Entity] dump reference [sub-area]."
- "Would it be useful to give [sub-area] its own idea dump?"
- Present as an observation with a question — never as an autonomous structural change.

**Important:** The diagnostic system suggests. The human decides. Never create sub-dumps, new
entity profiles, or structural changes without explicit human confirmation.

### Inactivity Detection

**What it monitors:** Idea dumps and entity profiles — specifically, how long since the last
activity.

**How to detect:**
- Read dump metadata: last entry date, last movement date.
- Read entity profile: last changelog entry date.
- Compare against the activity level of parent and sibling entities.

**Diagnostic output:**
- "The [Entity] idea dump has been inactive for [duration]. The parent ecosystem has been
  active during this period."
- "If you're looking for progress in this area, it could use attention."
- Do not frame inactivity as failure. Some entities are correctly dormant. The diagnostic
  surfaces the pattern; the person interprets it.

### Spec Gap Detection

**What it monitors:** The relationship between implementation and documentation.

**How to detect:**
- Identify entities with implementation artifacts (code, deployed features) but no
  corresponding design/specification documents.
- Check provenance chains: did the idea go through the idea dump → specs → implementation
  path, or did it bypass steps?

**Diagnostic output:**
- "[Feature] was implemented without going through design/specification."
- "This may be fine (rapid prototyping, known patterns) or may indicate a gap worth
  addressing retroactively."
- Surface as a finding, not a punishment.

### Strategic Planning Support

**What it monitors:** Everything — idea dumps, entity profiles, session logs, provenance chains.

**When invoked:** The user asks for help planning their work (daily, weekly, monthly) or wants
to understand what's needed to achieve a stated goal.

**How to operate:**
1. Read all active idea dumps across the ecosystem.
2. Read entity profiles for current lifecycle stages and documentation audits.
3. Read session log for recent activity patterns.
4. Synthesize into actionable insights:
   - What needs to get done (backlog across all entities)
   - What ideas are lacking implementation (active ideas by age and priority)
   - Dependencies between parts (what must be done first to unblock what comes next)
   - Recommended focus areas based on stated goals

**If the person has declared a goal** ("I want another project to have X capabilities by Y date"):
- Map the goal to the entity structure.
- Identify which entities, pillars, and documents are involved.
- Assess current state vs. required state.
- Surface the gap and recommend a sequence of sessions to close it.
- Be honest about timeline feasibility.

**Diagnostic output:**
- Structured as: "Here's where you stand. Here's what your goal requires. Here's the gap.
  Here's a recommended path."
- Include both optimistic and realistic assessments.

## Diagnostic Report Format

When the diagnostic system produces a report (inline or as a document):

```
## Ecosystem Health — [Date]

### Idea Dump Status
[For each active dump: active count, implemented count, archived count, last activity,
any flags (lag, clustering, inactivity)]

### Entity Status
[For each entity: lifecycle stage, documentation completeness, last changelog entry,
any flags]

### Provenance Insights
[Flow patterns: which entities generate ideas, which consume them.
Velocity: average time from idea to implementation.
Bottlenecks: where ideas stall.]

### Recommendations
[Prioritized list of suggested actions, each linked to a specific session type.]
```

## Proactive vs. Requested Diagnostics

**Requested:** The user asks "how's my ecosystem looking?" or "what should I work on?" Run the
full diagnostic suite and present findings.

**Proactive:** During normal session work, if the diagnostic system notices a signal (a dump
the orchestrator opened has stale ideas, an entity hasn't been touched in months), surface it
briefly. Don't interrupt the session's flow — note it and offer to dig deeper. "I notice the
Another project product pillar dump has 15 ideas that have been active for 6 sessions. Want me to
run a diagnostic on that?"

## Handoff Triggers

**→ Session Management:** Diagnostic recommendations that suggest specific session types
("consider a focused triage session") inform session management.

**→ Entity Profiling:** If diagnostics reveal entity-level gaps (missing documentation,
stale profiles), flag for entity profiling review.

**→ Idea Dump System:** If diagnostics identify ideas that should be archived or triaged,
recommend it — but the idea dump system executes the changes, not the diagnostic system.

**→ Orchestrator:** Strategic planning outputs inform how the orchestrator calibrates future
sessions. If the diagnostic identifies that the person's goal requires focused work on a
specific entity, the orchestrator can suggest that at the next session's calibration.
