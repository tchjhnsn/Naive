---
type: knowledge
tags: [everything-ecosystem, skills, operations, recruiting, cofounder, hiring, investors]
ai-model: claude-opus-5.5
created: 2026-10-27T20:45:13Z
source: hybrid
name: recruiting
description: >
  Recruit the people the team plan says the venture needs now (cofounders,
  hires, contractors, advisors, investors): write a brief that says what the
  role is for and why a person, find and screen candidates with an agent's help,
  and leave contact and the decision to a person (EE-029).
  MANDATORY TRIGGERS: recruit, hire, hiring, find a cofounder, cofounder search,
  job description, recruiting brief, contractor, find investors, advisor search.
---

# Recruiting

Operations layer, governance tier (EE-029). Reads `operations/team-plan.json`; writes a brief per open role from `packages/naive/src/functions/human-capital/templates/recruiting-brief.md` and the plan's `recruiting` entry.

## Steps

1. **Only roles needed now.** `check-team.mjs` lists them ("recruit now"). A role for a later phase waits.
2. **Write the brief.** It says why a person is needed (the capability register), what they bring (the validation team record's gaps), and what they get (ownership and the option pool).
3. **Agent's part:** search public profiles and communities, draft outreach, schedule, screen against the must-haves, and keep notes. The register lists sourcing candidates as `unknown`, so a person reviews every shortlist.
4. **Person's part:** contact, interviews, the decision, and any offer. Offers of equity are `ownership-or-control`; offers of pay are `spend-money`. Both escalate.
5. **Cofounders** go on to the governance kit's `cofounder-structure` skill before anyone commits. Investors go to `financing-and-investor-rights`.

## Guardrails

- Candidates' personal data stays out of public repositories.
- No automated outreach in a person's name without their approval of the message (`public-commitment`).
