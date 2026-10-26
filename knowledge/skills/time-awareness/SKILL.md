---
type: knowledge
tags: [everything-ecosystem, skills, time-awareness]
ai-model: claude
created: 2026-07-23
source: hybrid
name: time-awareness
description: >
  Ground the current session in real-world time via a bash `date` call. Trigger
  at session-start, at session-end, at any checkpoint, and any time a frontmatter
  field requires a real timestamp (`created`, `ingested`, `captured-at`,
  `last-compiled`, `last-reviewed`, `session-start-time`, `session-end-time`,
  `lifecycle-regression-date`, etc.). Also trigger on user prompts like "what's
  today's date," "timestamp this," "before we start," "how long have we been at
  this," or "when was that last touched." This skill exists because LLMs have a
  training-data cutoff and no intrinsic wall clock; without an explicit grounding
  step, sessions silently operate on stale temporal assumptions and produce
  incorrect timestamps in vault frontmatter. MANDATORY TRIGGERS: date, time,
  timestamp, today, now, when, session-start, session-end, checkpoint,
  last-compiled, last-reviewed, ingested, captured-at.
---

# Time-Awareness Skill

A small, narrowly-scoped skill that gives every Cowork / Claude-Code session a reliable way to know what day and time it is, and to stamp vault frontmatter with correct values.

## Why this exists

LLMs have a training-data cutoff and no intrinsic wall clock. Without an explicit grounding step, a session can silently operate on stale temporal assumptions — misdating artifacts, producing wrong `created:` frontmatter, drawing wrong conclusions about what's "recent," or breaking the session-linkage chain between predecessor and successor.

SAD v3 treats time as load-bearing: session boundaries, raw-source `ingested` timestamps, supersession chains, and the `last-compiled` / `last-reviewed` decay signals all depend on correct real-world dates. This skill is the single point where that grounding happens.

## Canonical invocation

The canonical bash command:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

Output format: ISO-8601 UTC, e.g. `2026-04-22T18:37:17Z`. Use this verbatim in any frontmatter field that accepts an ISO-8601 timestamp (`captured-at`, `session-start-time`, `session-end-time`, `ingested` when sub-day precision matters).

For date-only fields (`created`, `updated`, `last-compiled`, `last-reviewed`):

```bash
date -u +"%Y-%m-%d"
```

Output: `2026-04-22`. Use for any field that takes a `<date>` value.

For the local-time variant when the result will be displayed to the user (rare in vault frontmatter; common in narrative prose):

```bash
date +"%Y-%m-%d %H:%M %Z"
```

## When to invoke

### Always

- **Session-start** (first meaningful tool use). Stash the result as `session-start-time` for use in the eventual session-end log entry.
- **Session-end** (closing the session, writing the session log). Stash as `session-end-time`.
- **Any new note authored.** When writing a `created:` or `ingested:` field on a fresh file, invoke once and use the result. Stamp the `ai-model:` provenance field in the same pass (SAD v3.0.7 — [[SAD_SKILL_v3_AMENDMENT_2026-07-08_ai-model-provenance]]): record the AI model that wrote the note's content, or `none` if the content is human-authored. `ai-model` needs no bash call — it's the model you are — but it belongs to the same "stamp the note's provenance fields" moment as the timestamps.
- **Compile passes.** When stamping `last-compiled:` after regenerating a compiled artifact.
- **Staleness reviews.** When stamping `last-reviewed:` after scanning a compiled artifact.
- **Lifecycle-stage regression.** When stamping `lifecycle-regression-date:`.
- **Raw-source captures.** When stamping `captured-at:` on a `conversation-log` raw source.

### On user prompt

Trigger on prompts that imply a time question:

- "What's today's date?"
- "What time is it?"
- "Timestamp this."
- "Before we start, what's the date?"
- "How long have we been at this?"
- "When was X last touched / compiled / reviewed?"

### On host-injected date discrepancy

Many Cowork environments inject a `Today's date:` string into the system context. Trust the host's date *only as a hint*. If a session's bash `date` result disagrees with the host-injected date, the bash result wins for any frontmatter Claude authors. If the disagreement matters (e.g., the host says one day and bash says another), surface the discrepancy to the user in a one-line note.

## When NOT to invoke

- Routine conversational responses that don't touch dated artifacts.
- Trivial computations or quick factual questions unrelated to time.
- When the user has just provided an explicit date and wants Claude to use *that* date verbatim (e.g., "use 2026-04-15 as the compile date").

## Output protocol

After invoking, produce the timestamp in the exact format needed by the consumer:

- For frontmatter: emit only the date or ISO-8601 string, no surrounding commentary in the file.
- For prose response to the user: include a brief human-readable form ("Today is Wednesday, April 22, 2026 — 18:37 UTC") only if the user asked.

Stash the value in working memory or the session's TodoList notes so subsequent invocations within the same Session can reuse it without another bash call (one bash call per session at minimum, more if the session crosses a day boundary).

## Fallback when bash is unavailable

If `bash` is not callable (e.g., a pure read-only context):

1. Look for an explicit `Today's date:` line in the system context or recent user messages.
2. If found, use it but flag uncertainty: "(host-provided, not bash-verified)".
3. If not found, ask the user: "I don't have shell access in this session — what is today's date?"
4. Never invent a date.

## Cross-session reuse

The result of a single `date` invocation is valid only for the moment of the call. A long Session may cross a UTC day boundary; if the Session's planned duration exceeds 12 hours, re-invoke at major checkpoints rather than reusing the session-start value indefinitely.

## Eval cases

### Should fire (positive)

1. **User opens a new note.** They say "create a session-proposal for the design-review session." Claude should invoke `date -u +"%Y-%m-%d"` to populate `created:` before writing the file.
2. **Compile pass.** Claude is regenerating `RESEARCH_SYNTHESIS.md` for an entity. Should invoke before stamping `last-compiled:`.
3. **Session-start with handoff.** Claude opens a session and the session-capture skill is also invoked. Time-awareness fires first to provide `captured-at:` for the predecessor capture.

### Should NOT fire (negative)

1. **User asks "what is the capital of France?"** No time context. Don't invoke.
2. **User asks "explain how Karpathy's LLM Wiki works."** Pure knowledge question. Don't invoke.
3. **User says "use the date 2026-04-15."** They've provided the date explicitly; honor it without invoking.

## Cross-references

- [[SAD_SKILL_v3]] — names this skill at session-start, session-end, and on any timestamp authoring.
- [[skills/session-capture/SKILL]] — invokes this skill for `captured-at:` and `session-start-time:` / `session-end-time:` on raw captures and compiled session-log entries.
- [[raw-source-taxonomy]] — defines the timestamp fields per raw-source-type.

## Changelog

| Date | Change | Trigger |
|------|--------|---------|
| 2026-04-22 | Created. | SAD v3 bundle session ([[session-proposal-author-sad-skill-v3]]) |
| 2026-07-08 | Noted that `ai-model` provenance is stamped in the same pass as timestamps when authoring a new note. | SAD v3.0.7 ([[SAD_SKILL_v3_AMENDMENT_2026-07-08_ai-model-provenance]]) |
