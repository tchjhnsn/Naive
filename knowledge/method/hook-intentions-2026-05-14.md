---
type: methodology-hook-intentions
ai-model: claude
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [methodology, hooks, lifecycle-automation, claude-code, cowork, graceful-degradation, 2026-05-14]
canonical-for: "methodology-hook-intentions"
related:
  - "[[sad/SAD_SKILL_v3]]"
  - "[[sad/pipeline-canonical-view-2026-05-14]]"
  - "[[_ideas/build-roadmap-and-html-orchestration-2026-05-12]]"
---

# Methodology Hook Intentions

> **Canonical for:** the methodology's lifecycle hook intentions. This document describes what the methodology *wants* the hook layer to do, mapped per-environment, with graceful degradation when the environment doesn't support hooks natively.

---

## Why hooks exist

Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §34]], the methodology has three interaction surfaces — skills (context-triggered), hooks (event-triggered), and slash commands (explicitly invoked). Hooks are reserved for the rituals that should happen *mechanically* at specific lifecycle moments — the things attention shouldn't be required for.

Examples:

- Stamping `last-reviewed` timestamps when a compiled artifact is edited
- Reading SESSION_LOG before any code work in a project
- Running the articulation-closure verification gate before any deploy
- Pairing lockfile changes with package.json changes in pre-commit
- Surfacing brand-load-bearing files for explicit confirmation in pre-commit

Without hooks, these rituals depend on the operator (or AI) remembering them. With hooks, the rituals run regardless of memory.

---

## Hook inventory

The methodology wants the following hooks. Each is described with its trigger, behavior, and graceful-degradation path for environments where the hook can't fire.

### `session-start` hook

**Trigger:** Beginning of a Claude session for any project.

**Behavior:**

1. Invoke the time-awareness skill — record `session-start-time` (UTC ISO-8601)
2. Invoke the session-capture skill — capture predecessor session tail to `_sessions/raw/`
3. Read the relevant compiled context:
   - Vault `CLAUDE.md` (always)
   - Repo `CLAUDE.md` if working on code
   - Most-recent SESSION_LOG.md entry
   - Entity profile + relevant specs for the Session's scope
4. Prompt the operator to declare the sprint type, idea-state, goal, gate, and dependencies (per §23)

**Graceful degradation in Cowork:** The session-start ritual runs as the operator's first interaction with the AI. The AI itself should treat conversation start as a session-start moment and run the ritual via the [[../skills/time-awareness/SKILL|time-awareness]] + [[../skills/session-capture/SKILL|session-capture]] skills.

### `session-end` hook

**Trigger:** End of a Claude session.

**Behavior:**

1. Invoke time-awareness — record `session-end-time`
2. Invoke session-capture — write the session's raw `_sessions/raw/<date>-<slug>.md`
3. Append a compiled entry to `_sessions/SESSION_LOG.md` per the PART 10 format
4. Graduate any session-proposals that were executed; spawn new ones for follow-on work
5. Update status columns on enumeration / backlog rows touched this sprint (per §24)
6. Update the per-project orchestration HTML to reflect current state (per §32)

**Graceful degradation in Cowork:** The session-end ritual runs when the operator signals end-of-session (e.g., "let's wrap up" / "save progress"). The AI prompts for the ritual elements.

### `pre-commit` hook

**Trigger:** Before `git commit` runs.

**Behavior:**

1. Run `git diff --stat HEAD` and walk every staged file
2. For each file not from the current session, surface it explicitly: "this file from session X is also in the diff — should it ship?" (per §13)
3. Brand-load-bearing files (logos, fonts, color tokens, voice copy) get an additional review prompt (per §14)
4. If `package.json` is staged, lockfile must also be staged (per §16)
5. Only then proceed with the commit

**Graceful degradation in Cowork:** Cowork doesn't run git commits directly; the operator does. The pre-commit hook lives as a `~/.claude/settings.json` or repo `.claude/settings.json` entry for Claude Code users. In Cowork mode, the AI proactively prompts the pre-commit ritual when it detects the operator is about to commit (via conversation context).

### `pre-deploy` hook

**Trigger:** Before any deploy command runs.

**Behavior:**

1. Run the articulation closure verification table against current state
2. If any row is ✗ (missing) or ↺ (partial), block the deploy with a list of incomplete articulation items
3. If brand-load-bearing assets are missing from code (per §14 — fonts must be explicitly loaded), block the deploy
4. If lockfile is out of sync with package.json (per §16), block the deploy
5. If the deploy is shipping new functionality, ensure the verification spec §9 test plan has passed
6. Functional completion conditions, not structural (per §12) — block if the user-facing behavior the version commits to isn't verifiable

**Graceful degradation in Cowork:** Cowork doesn't run deploys directly. The pre-deploy hook lives in Claude Code settings or as a CI workflow check (e.g., GitHub Actions step that gates on articulation closure verification). In Cowork, the AI prompts the pre-deploy ritual when it detects a deploy is imminent.

### `post-tool-use` hook (selective)

**Trigger:** After certain tool uses, specifically file writes to compiled artifacts.

**Behavior:**

1. If the tool wrote to a compiled artifact (spec, entity profile, methodology doc), prompt to update `last-reviewed` timestamp
2. If the tool wrote to a canonical document, flag for periodic review queue (per [[../skills/canonicalize/SKILL|canonicalize skill]])
3. If the tool wrote to an enumeration document, surface status semantics check (per §24)

**Graceful degradation in Cowork:** Implement as a behavioral pattern in the AI rather than a true hook. The AI proactively offers the post-tool-use ritual when it has just edited a compiled artifact.

### `pre-tool-use` hook (selective)

**Trigger:** Before certain tool uses, specifically:

- Writing to a canonical document
- Editing an enumeration document
- Running a deploy command
- Modifying brand-load-bearing files

**Behavior:**

1. For canonical document edits: confirm the edit doesn't violate the canonical-doc discipline (no contradiction with the canonical's claims)
2. For enumeration edits: confirm status semantics will remain consistent
3. For deploys: trigger the pre-deploy hook above
4. For brand-load-bearing files: surface the file's brand-relevance for explicit operator awareness

**Graceful degradation in Cowork:** AI behavior; proactive surfacing in conversation.

### `user-prompt-submit` hook (advisory)

**Trigger:** When the user submits a prompt.

**Behavior:**

1. If the prompt references methodology phases (e.g., "let's do articulation closure," "run triage"), confirm the relevant skill has loaded
2. If the prompt references a phase + sprint declaration, capture sprint metadata (type, goal, gate, dependencies)
3. If the prompt has a clear lifecycle-event signal (e.g., "let's wrap up" → session-end; "let's commit this" → pre-commit), trigger the appropriate hook

**Graceful degradation in Cowork:** AI behavior; recognize lifecycle signals in conversation and trigger appropriate rituals.

---

## Environment matrix

| Hook | Claude Code | Cowork mode | API direct |
|---|---|---|---|
| session-start | First-class (settings.json) | AI-behavior (proactive ritual) | AI-behavior (system prompt) |
| session-end | First-class | AI-behavior | AI-behavior |
| pre-commit | First-class | AI-behavior (proactive prompt) | N/A (no git surface) |
| pre-deploy | First-class + CI workflow | AI-behavior + CI workflow | N/A (no deploy surface) |
| post-tool-use | First-class | AI-behavior | AI-behavior |
| pre-tool-use | First-class | AI-behavior | AI-behavior |
| user-prompt-submit | First-class | AI-behavior | AI-behavior |

The pattern: **hooks are first-class in Claude Code; in other environments they degrade to AI-behavior conventions documented in skills**. Skills compensate for the environment's lack of hook infrastructure.

---

## How to implement hooks in Claude Code

Hooks live in `~/.claude/settings.json` (global) or repo `.claude/settings.json` (project). The schema is environment-specific to Claude Code — see the Claude Code documentation for the canonical reference. The methodology should provide reference hook configurations as part of the formalization deliverables.

**TO-AUTHOR:** A reference `.claude/settings.json` hook configuration that implements the methodology hooks above. Lives at `knowledge/method/reference-hooks-config.json` (or equivalent).

---

## How AI-behavior compensation works

When the environment doesn't support hooks natively, the methodology compensates via skill behavior. Specifically:

- **Skills incorporate hook-equivalent behaviors.** The [[../skills/time-awareness/SKILL|time-awareness skill]] knows it should fire at session-start; when the skill loads and detects a session-start context, it runs the ritual itself.
- **The orchestration HTML surfaces hook status.** Per [[../skills/canonicalize/SKILL|canonicalize]] + §32, the per-project orchestration HTML can show when each hook last fired (or would have fired); operators see the state.
- **Conversation-context signals trigger rituals.** "Let's wrap up" / "let's commit this" / "let's deploy" are AI-readable signals that trigger the appropriate hook-equivalent behavior.

The graceful-degradation principle: **the methodology runs the same rituals regardless of environment; only the implementation surface differs**. Skills carry the methodology when hooks can't.

---

## Authoring queue

The hook configuration itself is queued for authoring. This document is the design intent; the implementation is:

1. **`.claude/settings.json` reference configuration** — Claude Code hook implementation
2. **Per-skill hook-compensation patterns** — already implicit in the Tier 1 skills authored 2026-05-14
3. **CI workflow hook implementation** — for deploy-time hooks (GitHub Actions checks that gate on articulation closure)
4. **Orchestration HTML hook-status surfacing** — once the orchestration HTML template is authored (per §32 task #174)

---

## Status

- **2026-05-14:** Initial authoring. Hook intents named + per-environment mapped + graceful degradation path documented. Implementation queued.
