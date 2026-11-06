---
type: knowledge
tags: [everything-ecosystem, skills, operations, team, agents, human-in-the-loop]
ai-model: claude-opus-5.5
created: 2026-10-27T20:45:13Z
source: hybrid
name: team-design
description: >
  Decide who the venture needs, agent or person, and when: which roles agents
  fill, what authority each gets, where a human stays in the loop, and which
  person roles to recruit. Records operations/team-plan.json against the agent
  capability register and decision rights; packages/naive/src/checks/check-team.mjs checks it (EE-029).
  MANDATORY TRIGGERS: team design, who do we need, hire or agent, can an agent
  do this, human in the loop, delegate to agents, agent roles, org design,
  what authority should the agent have, when do we need a person.
---

# Team design

Operations layer, governance tier (EE-029). Writes `operations/team-plan.json`; `node packages/naive/src/checks/check-team.mjs <dir>` checks it.

## Push agents to their limit, and find the loops that need a person

1. **List the work** the current and next phase need, from the need-now score (`node packages/naive/src/engine/need-now.mjs <venture>`) and the validation team record's skills.
2. **Look up each task** in the capability register (`evidence/capabilities/agent-capabilities.json`):
   - `can`: an agent role does it.
   - `can-with-review`: an agent does it; name the person who reviews (`human_loop`).
   - `cannot` or `not-allowed`: an agent prepares; a person does or decides it.
   - `unknown`: a person stays in the loop, and the task becomes an eval. Record the result in the register.
   - Not in the register: add it as `unknown` with what you know.
3. **Delegate authority** by decision class. An agent role may hold only classes that decision rights give to it, never an escalate class.
4. **Open person roles** needed by the current phase are recruited now (`recruiting` skill). Roles for later phases stay `planned`, not recruited early.

## Don't overbuild the team

A role is added when the work exists, not when an org chart would have one. Re-run at each phase gate.
