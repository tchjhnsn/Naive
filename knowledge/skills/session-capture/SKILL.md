---
type: knowledge
tags: [everything-ecosystem, skills, session-capture]
ai-model: claude
created: 2026-07-23
source: hybrid
name: session-capture
description: >
  Auto-capture predecessor Cowork/Claude-Code session tails to `_sessions/raw/`
  at session-start, and draft compiled session-log entries to
  `_sessions/SESSION_LOG.md` at session-end. Trigger automatically at every
  session boundary in any vault where SAD v3 is active. Also trigger on user
  prompts like "wrap this session," "close out the session," "what session
  came before this," "capture the predecessor," "log this session." This skill
  operationalizes SAD v3's Campaign → Session → Checkpoint hierarchy by
  producing the raw-and-compiled session trail that lets future sessions
  reconstruct any Campaign without loss. MANDATORY TRIGGERS: session-start,
  session-end, predecessor, successor, capture, session log, wrap up,
  close session, campaign, transcript.
---

# Session-Capture Skill

The skill that operationalizes SAD v3's Campaign → Session → Checkpoint hierarchy. Produces the raw-and-compiled session trail that lets a future session (or future archaeologist) reconstruct any Campaign from its source material.

## Why this exists

SAD v3 requires every Session to know what came before and what comes after. Without that chain, the Campaign view is reconstructed manually each time someone remembers; with it, the chain becomes default and queryable. This skill makes the rituals at session-start and session-end automatic rather than discretionary.

The skill also operationalizes the two-layer data model for sessions specifically: the raw transcript (immutable, in `_sessions/raw/`) plus the compiled log entry (re-buildable, in `_sessions/SESSION_LOG.md`).

## Two triggers

### Trigger 1 — Session-start (auto)

Fires at the start of every Cowork session, immediately after the [[skills/time-awareness/SKILL|time-awareness]] skill has stamped `session-start-time`.

Procedure:

1. Call `mcp__session_info__list_sessions` to enumerate recent sessions.
2. Identify the most likely predecessor by:
   - Title-proximity (does the title match the current Campaign?).
   - Temporal proximity (within the last few days for active Campaigns).
   - Explicit predecessor declared by the user or in CLAUDE.md.
3. If ambiguous, surface a one-line confirmation: "Predecessor candidate: `<session-id>` titled `<title>` from `<date>`. Proceed with capture? (yes / different / skip)"
4. Call `mcp__session_info__read_transcript` for the chosen predecessor.
5. Decide capture mode:
   - `tail-only` — default. Capture only the closing exchange that explains the handoff. Sufficient for most session-to-session continuity.
   - `full` — when the tail is not self-sufficient (e.g., the predecessor ended mid-decision).
   - `excerpt` — when only a specific passage matters (rare).
6. Write `_sessions/raw/<YYYY-MM-DD>-<slug>.md` with the frontmatter schema below.
7. Note in the current session's TodoList or scratchpad: "Predecessor captured at `<path>`."

### Trigger 2 — Session-end (on close intent)

Fires when the user signals the Session is wrapping up — "wrap this," "close out," "log this session," or when the Session's TodoList is fully drained and the scope is complete.

Procedure:

1. Invoke [[skills/time-awareness/SKILL]] to get `session-end-time`.
2. Optionally write a raw capture of the current session's tail to `_sessions/raw/<date>-<slug>.md` (same schema as predecessor capture).
3. Draft a compiled session-log entry per the format in [[SAD_SKILL_v3#PART 10]] and append it to the **correct** log (v3.0.12): entity-scoped work goes to `projects/<entity>/product/SESSION_LOG.md`; cross-entity work goes to the vault-root `_sessions/SESSION_LOG.md`. For most project work the entity-level log is the live one and the vault-root log is months stale — writing to the root by reflex loses the entry where the next session will look for it.
4. Surface the draft to the user for confirmation: "Session-log entry drafted. Review before commit?"
5. On confirmation, the entry is final. The next session's session-capture trigger will read this Session as its predecessor.

## Frontmatter schema for raw captures

Written to `_sessions/raw/<date>-<slug>.md`:

```yaml
---
type: raw-source
raw-source-type: conversation-log
source: human                                  # or hybrid if Claude actively contributed in the captured tail
ai-model: <capturing-model>                    # SAD v3.0.7 — model that WROTE this capture file, e.g. claude-opus-4.8
llm-provider: anthropic
llm-model: <model-name>                        # model INSIDE the captured transcript, e.g. claude-opus-4-7
interface: cowork | claude-code | api
session-id: <captured-session-id>
session-title: "<captured-session-title>"
predecessor-session: <its-predecessor-id-or-null>
successor-session: <captured-session's-successor-id>
capture-mode: tail-only | full | excerpt | backfill
captured-at: <ISO-8601 UTC from time-awareness>
captured-by: <current-session-id>
captured-via: mcp__session_info__read_transcript
participants: [<names>]
scope: "<one-line on what the captured session was about>"
campaign: <campaign-name>                       # if known
created: <captured session's actual start date>
ingested: <today, ISO-8601>
authorship: hybrid
ip-sensitivity: normal
tags: [raw-source, conversation-log, predecessor]
---

# Captured Session Tail — "<session-title>"

<brief explanation of what's captured and why>

## The handoff moment

### User turn
> <verbatim user message>

### Assistant response (verbatim)
> <verbatim assistant response>

## Why this handoff matters

<1-3 paragraphs explaining what the capture establishes for the current session>

## Successor

The successor session is the current session: `<current-session-id>`.
```

## Frontmatter schema for compiled session-log entries

Appended to `_sessions/SESSION_LOG.md`:

See [[SAD_SKILL_v3#PART 10]] for the full format. The compiled entry's structure:

```markdown
## Session N — <date(s)> (scope-bounded, ~<duration>)
**Campaign:** <campaign-name>
**Session IDs:**
- Predecessor: <session-id> ([[_sessions/raw/<date>-<slug>|raw capture]])
- This session: <session-id>
- Successor: <TBD>
**Intent:** <paragraph>
**Entities/Pillars Touched:** <bullets>
**Artifacts Produced/Modified:** <bullets with wikilinks>
**Checkpoints Achieved:** <numbered>
**Sub-Session Transitions:** <prose>
**Key Decisions:** <bullets>
**Open / Deferred Work:** <bullets>
**Recommended Next Session:** [[<next-proposal>]]
```

## Edge cases

### No predecessor (fresh Campaign start)

When `list_sessions` returns no plausible predecessor (or the user explicitly states this is a fresh Campaign), skip the predecessor capture. Note in the current session's scratchpad: "Fresh Campaign start; no predecessor to capture."

### Multiple plausible predecessors

When two or more recent sessions could be the predecessor, surface a multiple-choice to the user rather than guessing:

```
Multiple predecessor candidates:
  A) <id-1> "<title-1>" from <date-1>
  B) <id-2> "<title-2>" from <date-2>
  C) None — this is a fresh Campaign

Pick A / B / C / different.
```

### User opts out

If the user says "don't capture this" or has set a vault-level convention to disable auto-capture (e.g., a `session-capture: disabled` line in the vault `CLAUDE.md`), skip the trigger. Note the opt-out in the session's scratchpad so the next session doesn't try to capture this one as its predecessor.

### Backfill mode (manual invocation)

Used for the historical backfill session ([[session-proposal-backfill-cowork-sessions]]). Same procedure as Trigger 1, but invoked manually for each historical session in turn, with `capture-mode: backfill` in the frontmatter.

### MCP tooling unavailable

If `mcp__session_info__*` is not available (e.g., a non-Cowork environment, or the tooling has been disabled):

1. Don't attempt to fabricate a capture.
2. Note in the session's scratchpad: "Predecessor capture skipped — session_info MCP not available."
3. The Campaign chain has a gap; the next session that has access can backfill if the predecessor is still retrievable.

## What this skill does NOT do

- It does not interpret the captured raw — that's a compile pass executed deliberately when needed.
- It does not load full transcripts into active context. `tail-only` is the default for a reason.
- It does not produce Campaign-level rollups. Those are a separate compile pass that reads multiple session-log entries and writes a `CAMPAIGN_LOG.md` (TBD in a future session).
- It does not replace the human's session-end review. The compiled session-log entry is *drafted* by this skill; the human confirms before it's final.

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

1. **Detect** — SESSION_LOG gaps vs Cowork/agent transcripts for open Campaigns.
2. **Triage** — capture raw tails that still affect open Campaigns first.
3. **Order** — raw capture before compiled entry; never invent decisions.
4. **Freeze** — no successor Campaign charter on “remembered” prior work without
   a log line or raw pointer.
5. **Exit** — open Campaigns reconstructible; remaining history marked deferred.

(Historical backfill invocation is also named in eval cases below.)

## Eval cases

### Should fire — positive

1. **Cowork session opens.** A new Cowork conversation starts. Trigger 1 fires automatically: list sessions, find predecessor, capture tail.
2. **User says "let's wrap up."** Trigger 2 fires: stamp end-time, draft session-log entry, surface for review.
3. **Backfill invocation.** User runs the historical backfill session; trigger 1 logic is invoked manually per historical session.

### Should NOT fire — negative

1. **Mid-session conversational ping.** "What's the time?" — that's [[skills/time-awareness/SKILL]], not session-capture.
2. **User asks "what was decided in session 7?"** — that's a read against `_sessions/SESSION_LOG.md`, not a capture.

## Reference example

The first raw capture produced under this skill's pattern (created manually before the skill existed):

[[_sessions/raw/2026-04-20-sad-gap-handoff]] — captures predecessor session `local_086dfb61-2aae-431f-8580-cf696cb3314b` for the SAD v3 Campaign. Validates that the schema and the MCP tooling work together.

## Cross-references

- [[SAD_SKILL_v3]] — names this skill at session-start and session-end rituals.
- [[skills/time-awareness/SKILL]] — invoked by this skill for all timestamps.
- [[raw-source-taxonomy#conversation-log]] — defines the conversation-log subtype this skill produces.

## Changelog

| Date | Change | Trigger |
|------|--------|---------|
| 2026-04-22 | Created. | SAD v3 bundle session ([[session-proposal-author-sad-skill-v3]]) |
| 2026-07-08 | Added `ai-model` (capturing model) to the raw-capture frontmatter schema; clarified it vs. `llm-model` (model inside the transcript). | SAD v3.0.7 ([[SAD_SKILL_v3_AMENDMENT_2026-07-08_ai-model-provenance]]) |
