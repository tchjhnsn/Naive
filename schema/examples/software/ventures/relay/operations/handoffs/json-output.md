---
type: planning
source: hybrid
created: 2026-11-05T00:00:00Z
ai-model: claude-opus-5.5
authority: implementation
tags: [handoff, example]
description: "Brief for handoff json-output: the machine half is json-output.json beside it."
---

# Relay CLI JSON output: handoff to builder

The machine half, with decision rights, done-criteria and status, is `json-output.json`.

## Outcome

The CLI prints its report as JSON with --json, naming ids rather than display text.

## Work

1. Add --json to the report command.
2. Document the shape in the README.
3. Test that the JSON and the text report agree.

## Escalate only for

The classes in the handoff file's `decision_classes` are the builder's. Anything else goes to the architect.
