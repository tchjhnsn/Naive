# human-capital

Up: [functions](../README.md)

## What this is

The human capital (hr) function (APQC 7.0, Develop and Manage Human Resources, element 10007). Its governance side is hR policies, the handbook, hiring decision rights; its operations side is recruiting, onboarding, payroll runs. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The human capital agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn who works on the venture, and propose the team plan to the founder as a decision (only a person writes the plan) |
| [workflows/quarterly-team-review.json](./workflows/quarterly-team-review.json) | Workflow: review the team plan each quarter, and propose any change to the founder as a decision |
| [FOUNDER_OPERATING_MODEL_CAMPAIGN_2026-10-14.md](./FOUNDER_OPERATING_MODEL_CAMPAIGN_2026-10-14.md) | Operating model campaign (stub) |
| [capabilities/agent-capabilities.json](./capabilities/agent-capabilities.json) | A record |
| [skills/agent-capabilities](./skills/agent-capabilities) | Skill: Keep the agent capability register current: what agents can, cannot, may not, or are not yet known to do, task by task, with sources and dates. |
| [skills/cofounder-structure](./skills/cofounder-structure) | Skill: Help a founder decide whether to have cofounders, who, in what roles, how to split founder equity, how it vests, and what happens if someone leaves; then record it as hol |
| [skills/executive-roles](./skills/executive-roles) | Skill: Provide context for executive-level work: CEO, Founder, Chief of Staff, and pillar leads (CTO, CMO, COO). |
| [skills/recruiting](./skills/recruiting) | Skill: Recruit the people the team plan says the venture needs now (cofounders, hires, contractors, advisors, investors): write a brief that says what the role is for and why a  |
| [skills/role-and-candidate-authoring](./skills/role-and-candidate-authoring) | Skill: Author the three role-filling artifacts when an operator (CEO, founder, or pillar lead) is hiring for a role, assigning a project, or filling an operational responsibilit |
| [skills/team-design](./skills/team-design) | Skill: Decide who the venture needs, agent or person, and when: which roles agents fill, what authority each gets, where a human stays in the loop, and which person roles to rec |
| [templates/recruiting-brief.md](./templates/recruiting-brief.md) | Template: recruiting brief |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/human-capital.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
