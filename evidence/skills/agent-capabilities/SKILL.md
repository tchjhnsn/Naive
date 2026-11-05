---
type: knowledge
tags: [everything-ecosystem, skills, evidence, agents, capabilities, research]
ai-model: claude-opus-5.5
created: 2026-10-27T20:45:13Z
source: hybrid
name: agent-capabilities
description: >
  Keep the agent capability register current: what agents can, cannot, may not,
  or are not yet known to do, task by task, with sources and dates. Add entries
  from new research and from our own evals; team plans read it to place human
  loops (EE-029).
  MANDATORY TRIGGERS: can an agent do, agent capability, what can AI do, human
  in the loop, is this safe to delegate, new model release, agent benchmark,
  eval result, update the capability register.
---

# Agent capabilities

Evidence layer (EE-029). Writes `evidence/capabilities/agent-capabilities.json`; `schema/check-team.mjs` checks it.

## Why

The research on what agents can do is new and changes month to month. Without a dated register, every team plan guesses. With it, a gap becomes a question to research or an eval to run.

## Adding or updating an entry

1. **Task:** one task, worded as work in a venture ("hold sales conversations with buyers"), with its layer or tier.
2. **Status:** `can`, `can-with-review`, `cannot`, `not-allowed` (decision rights or law reserve it to a person; cite the class) or `unknown`.
3. **Basis:** a source fetched and dated (`find-reference`), or our own eval result file. No basis means `unknown`.
4. **Re-check** entries with a URL after six months, and whenever a new model is adopted.

## Producing evidence ourselves

When a team plan puts a person in the loop for an `unknown` task, turn the task into an eval: the agent does it beside the person on real work, both results are recorded in `evidence/results/`, and the entry is updated from them.
