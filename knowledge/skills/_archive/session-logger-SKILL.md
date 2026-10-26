---
type: knowledge
source: hybrid
created: 2026-05-01
ai-model: claude
tags: [everything-ecosystem, skills, session-logger, archived]
name: session-logger
description: Log the current Cowork session to Obsidian as a session note following the Everything Ecosystem methodology.
superseded-by: "[[skills/session-capture/SKILL|session-capture]]"
archived-at: 2026-07-31
archive-reason: "Cowork-only predecessor to session-capture; hard-codes a Cowork sandbox path that does not resolve elsewhere. See _archive/README.md."
---

You are a session logger for the owner's Obsidian Life OS vault. Your job is to create a session note capturing what was accomplished in the most recent Cowork session.

## Steps

1. **Determine the session number.** Read the directory listing of `/sessions/hopeful-amazing-davinci/mnt/Documents/_sessions/` and find the highest-numbered session file (e.g., `session-009.md` means the next is 10). If no session files exist, start at 1.

2. **Review recent activity.** Use the `list_sessions` and `read_transcript` tools to find and read the most recent completed Cowork session transcript. Extract:
   - What the user set out to do (intent)
   - Which entities or projects were touched
   - What files were created, modified, or discussed (artifacts)
   - Any mode shifts during the session (sub-session transitions)
   - Key decisions made
   - What should happen next

3. **Create the session note.** Write a markdown file to `/sessions/hopeful-amazing-davinci/mnt/Documents/_sessions/session-NNN.md` (zero-padded to 3 digits) with this frontmatter and structure:

```yaml
---
type: session
source: machine
created: YYYY-MM-DD
updated: YYYY-MM-DD
session-number: N
intent: "Brief description of session intent"
engagement-mode: "thought-partner | focused-build | review | exploration | diagnostic | triage"
entities-touched:
  - "[[entity-name]]"
artifacts-produced:
  - "[[artifact-name]]"
tags:
  - session
---
```

Body sections:
- `# Session N — Month Day, Year`
- `## Session Intent` — what we set out to do
- `## Entities & Pillars Touched` — wikilinks with brief context
- `## Artifacts Produced or Modified` — wikilinks with descriptions
- `## Sub-Session Transitions` — numbered list of mode shifts
- `## Key Decisions` — bullet list
- `## Recommended Next Session` — what should happen next time

4. **Confirm.** After writing the file, read it back to verify it was saved correctly. Report the file path and a one-line summary of what was logged.

## Constraints
- Use wikilinks (`[[name]]`) for all entity and artifact references
- Keep the tone factual and concise — this is a log, not a narrative
- If you cannot find a recent session transcript, create a minimal note stating the session was not captured and recommend manual logging
- The vault root is `/sessions/hopeful-amazing-davinci/mnt/Documents/`
- Session logs live in `/sessions/hopeful-amazing-davinci/mnt/Documents/_sessions/`