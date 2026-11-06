---
type: planning
source: hybrid
created: 2026-11-05T00:00:00Z
ai-model: claude-opus-5.5
authority: implementation
tags: [handoff, example]
description: "Brief for handoff flag-fixes: the machine half is flag-fixes.json beside it."
---

# Relay CLI flag fixes: handoff to builder

The machine half, with decision rights, done-criteria and status, is `flag-fixes.json`.

## Outcome

The CLI reads every flag in one parser, and an unknown flag is refused with a usage line.

## Work

1. Move flag parsing into one module.
2. Refuse unknown flags.
3. Add tests for both.

## Escalate only for

The classes in the handoff file's `decision_classes` are the builder's. Anything else goes to the architect.
