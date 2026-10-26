---
type: knowledge
source: hybrid
created: 2026-03-26
ai-model: claude
tags: [everything-ecosystem, systems]
---
# Session Management System

This system handles session logging, return session recaps, and session history tracking. It
maintains the `SESSION_LOG.md` — a rolling document that accumulates entries over time, like the
idea dump but for session history.

The session log is the handoff note you'd write to yourself at the end of a workday. It is not
the idea dump (doesn't capture raw ideas), not the changelog (doesn't track entity-level changes),
and not the provenance chain (doesn't trace individual ideas). It captures what happened during
the work at the session level.

## Session Log Structure

The session log lives at the ecosystem level (or per person profile for person-level work):
`SESSION_LOG.md` in the ecosystem root.

```markdown
# Session Log — [Ecosystem or Person Name]

## Session [N] — [Date]
**Intent:** [declared intent or "undirected"]
**Entities/Pillars Touched:** [list]
**Artifacts Produced/Modified:** [list with brief descriptions]
**Sub-Session Transitions:** [if multi-modal, note type shifts]
**Recommended Next Session:** [what would be most valuable to work on next]
```

## Operations

### Drafting a Session Log Entry

At session end, the framework drafts an entry based on what happened during the session:

1. **Gather data from the session:**
   - What was the declared intent? Did it shift?
   - Which entities and pillars were touched?
   - What files were created or modified?
   - Were there sub-session type transitions?
   - What's the most valuable next step?

2. **Draft the entry** using the format above.

3. **Present to the person for confirmation.** The person may edit, add context, or adjust the
   recommended next session. Do not finalize without confirmation.

4. **Append the confirmed entry** to `SESSION_LOG.md`.

This ties into the orchestrator's completion value articulation — "here's what you accomplished
today" simultaneously produces the session log entry.

### Delivering "Previously On..." Recaps

When a return session starts:

1. Read the most recent session log entry (or entries, if the person has been away for multiple
   sessions).

2. Deliver the recap in a fun format. The "Previously on..." framing makes the return feel
   human instead of clinical:

   > "Last time on Dragon Ball Z... The owner stress-tested the Everything Ecosystem framework
   > against another project, uncovered six structural gaps, and created the foundational structural
   > analysis methodology document. Will our hero continue the documentation saga, or will a
   > new mind dump change everything? Find out today..."

3. The show name can rotate, be random, or be set by the person as a preference. Some options:
   Dragon Ball Z, The Young and the Restless, Avatar: The Last Airbender, Breaking Bad, or
   whatever fits the person's taste.

4. After the recap, transition to session calibration — "So, what are we working on today?"

### Tracking Sub-Session Transitions

In multi-modal sessions, capture when the session type shifts:

- "Started as capture session → transitioned to focused entity profiling for another project →
  circled back to framework design → ended with ecosystem-level routing discussion."

These transitions are useful for reviewing working patterns over time. They also help the
diagnostic system understand how the person naturally works.

### Reviewing Session History

When the user asks about past sessions or working patterns:

1. Read `SESSION_LOG.md` (recent entries or all, depending on the question).
2. Summarize patterns: what entities get the most attention, what's been neglected, how often
   sessions shift types, whether recommended next sessions get followed up on.
3. This is diagnostic-adjacent but session-focused rather than entity-focused.

## Handoff Triggers

**→ Orchestrator:** The session log entry informs the orchestrator's completion value articulation.
The recommended next session informs future session calibration.

**→ Diagnostic System:** Session history patterns (frequency of work on each entity, session type
distribution, follow-through on recommendations) are useful diagnostic data.

**→ Entity Profiling:** If the session log reveals that an entity hasn't been worked on in many
sessions despite recommendations, this is a flag for the diagnostic system to surface during the
next relevant session.
