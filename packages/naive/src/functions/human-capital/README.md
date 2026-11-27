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
| [workflows/](./workflows) | One further workflow per APQC level 3 process of category 7.0, named by its hierarchy id, and one skill per level 2 process group in [skills/](./skills): see APQC processes below |
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

## APQC processes

Each level 3 process of APQC category 7.0, Develop and Manage Human Resources, has one workflow named by its hierarchy id, with that id in its `process` field, run on request after the founder has walked the intake in a meeting. Each process group has one skill, which every step of its workflows names.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 7.1.1 | Develop human resources strategy | [7-1-1-develop-human-resources-strategy.json](./workflows/7-1-1-develop-human-resources-strategy.json) | [develop-and-manage-human-resources-hr-planning](./skills/develop-and-manage-human-resources-hr-planning/SKILL.md) |
| 7.1.2 | Develop and implement workforce planning, policies, and strategies | [7-1-2-develop-and-implement-workforce-planning-policies.json](./workflows/7-1-2-develop-and-implement-workforce-planning-policies.json) | [develop-and-manage-human-resources-hr-planning](./skills/develop-and-manage-human-resources-hr-planning/SKILL.md) |
| 7.1.3 | Monitor and update HR strategies, plans, and policies | [7-1-3-monitor-and-update-hr-strategies-plans-and.json](./workflows/7-1-3-monitor-and-update-hr-strategies-plans-and.json) | [develop-and-manage-human-resources-hr-planning](./skills/develop-and-manage-human-resources-hr-planning/SKILL.md) |
| 7.1.4 | Develop competency management models | [7-1-4-develop-competency-management-models.json](./workflows/7-1-4-develop-competency-management-models.json) | [develop-and-manage-human-resources-hr-planning](./skills/develop-and-manage-human-resources-hr-planning/SKILL.md) |
| 7.2.1 | Manage employee requisitions | [7-2-1-manage-employee-requisitions.json](./workflows/7-2-1-manage-employee-requisitions.json) | [recruit-source-and-select-employees](./skills/recruit-source-and-select-employees/SKILL.md) |
| 7.2.2 | Recruit/Source candidates | [7-2-2-recruit-source-candidates.json](./workflows/7-2-2-recruit-source-candidates.json) | [recruit-source-and-select-employees](./skills/recruit-source-and-select-employees/SKILL.md) |
| 7.2.3 | Screen and select candidates | [7-2-3-screen-and-select-candidates.json](./workflows/7-2-3-screen-and-select-candidates.json) | [recruit-source-and-select-employees](./skills/recruit-source-and-select-employees/SKILL.md) |
| 7.2.4 | Manage new hire/re-hire | [7-2-4-manage-new-hire-re-hire.json](./workflows/7-2-4-manage-new-hire-re-hire.json) | [recruit-source-and-select-employees](./skills/recruit-source-and-select-employees/SKILL.md) |
| 7.2.5 | Manage applicant information | [7-2-5-manage-applicant-information.json](./workflows/7-2-5-manage-applicant-information.json) | [recruit-source-and-select-employees](./skills/recruit-source-and-select-employees/SKILL.md) |
| 7.3.1 | Manage employee onboarding | [7-3-1-manage-employee-onboarding.json](./workflows/7-3-1-manage-employee-onboarding.json) | [manage-employee-onboarding-training-and](./skills/manage-employee-onboarding-training-and/SKILL.md) |
| 7.3.2 | Manage employee performance | [7-3-2-manage-employee-performance.json](./workflows/7-3-2-manage-employee-performance.json) | [manage-employee-onboarding-training-and](./skills/manage-employee-onboarding-training-and/SKILL.md) |
| 7.3.3 | Manage employee career development | [7-3-3-manage-employee-career-development.json](./workflows/7-3-3-manage-employee-career-development.json) | [manage-employee-onboarding-training-and](./skills/manage-employee-onboarding-training-and/SKILL.md) |
| 7.3.4 | Develop and train employees | [7-3-4-develop-and-train-employees.json](./workflows/7-3-4-develop-and-train-employees.json) | [manage-employee-onboarding-training-and](./skills/manage-employee-onboarding-training-and/SKILL.md) |
| 7.4.1 | Manage labor relations | [7-4-1-manage-labor-relations.json](./workflows/7-4-1-manage-labor-relations.json) | [manage-employee-relations](./skills/manage-employee-relations/SKILL.md) |
| 7.4.2 | Manage collective bargaining process | [7-4-2-manage-collective-bargaining-process.json](./workflows/7-4-2-manage-collective-bargaining-process.json) | [manage-employee-relations](./skills/manage-employee-relations/SKILL.md) |
| 7.4.3 | Manage labor management partnerships | [7-4-3-manage-labor-management-partnerships.json](./workflows/7-4-3-manage-labor-management-partnerships.json) | [manage-employee-relations](./skills/manage-employee-relations/SKILL.md) |
| 7.4.4 | Manage employee grievances | [7-4-4-manage-employee-grievances.json](./workflows/7-4-4-manage-employee-grievances.json) | [manage-employee-relations](./skills/manage-employee-relations/SKILL.md) |
| 7.4.5 | Monitor legal and regulatory environment | [7-4-5-monitor-legal-and-regulatory-environment.json](./workflows/7-4-5-monitor-legal-and-regulatory-environment.json) | [manage-employee-relations](./skills/manage-employee-relations/SKILL.md) |
| 7.5.1 | Develop and manage reward, recognition, and motivation programs | [7-5-1-develop-and-manage-reward-recognition-and.json](./workflows/7-5-1-develop-and-manage-reward-recognition-and.json) | [reward-and-retain-employees](./skills/reward-and-retain-employees/SKILL.md) |
| 7.5.2 | Manage and administer benefits | [7-5-2-manage-and-administer-benefits.json](./workflows/7-5-2-manage-and-administer-benefits.json) | [reward-and-retain-employees](./skills/reward-and-retain-employees/SKILL.md) |
| 7.5.3 | Manage employee assistance and retention | [7-5-3-manage-employee-assistance-and-retention.json](./workflows/7-5-3-manage-employee-assistance-and-retention.json) | [reward-and-retain-employees](./skills/reward-and-retain-employees/SKILL.md) |
| 7.5.4 | Administer payroll | [7-5-4-administer-payroll.json](./workflows/7-5-4-administer-payroll.json) | [reward-and-retain-employees](./skills/reward-and-retain-employees/SKILL.md) |
| 7.5.5 | Manage/Collect employee suggestions and perform employee research | [7-5-5-manage-collect-employee-suggestions-and-perform.json](./workflows/7-5-5-manage-collect-employee-suggestions-and-perform.json) | [reward-and-retain-employees](./skills/reward-and-retain-employees/SKILL.md) |
| 7.6.1 | Manage promotion and demotion process | [7-6-1-manage-promotion-and-demotion-process.json](./workflows/7-6-1-manage-promotion-and-demotion-process.json) | [redeploy-and-retire-employees](./skills/redeploy-and-retire-employees/SKILL.md) |
| 7.6.2 | Manage separation | [7-6-2-manage-separation.json](./workflows/7-6-2-manage-separation.json) | [redeploy-and-retire-employees](./skills/redeploy-and-retire-employees/SKILL.md) |
| 7.6.3 | Relocate employees and manage assignments | [7-6-3-relocate-employees-and-manage-assignments.json](./workflows/7-6-3-relocate-employees-and-manage-assignments.json) | [redeploy-and-retire-employees](./skills/redeploy-and-retire-employees/SKILL.md) |
| 7.7.1 | Manage reporting processes | [7-7-1-manage-reporting-processes.json](./workflows/7-7-1-manage-reporting-processes.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.2 | Manage employee inquiry process | [7-7-2-manage-employee-inquiry-process.json](./workflows/7-7-2-manage-employee-inquiry-process.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.3 | Manage and maintain employee data | [7-7-3-manage-and-maintain-employee-data.json](./workflows/7-7-3-manage-and-maintain-employee-data.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.4 | Manage human resource information systems | [7-7-4-manage-human-resource-information-systems.json](./workflows/7-7-4-manage-human-resource-information-systems.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.5 | Develop and manage employee measures | [7-7-5-develop-and-manage-employee-measures.json](./workflows/7-7-5-develop-and-manage-employee-measures.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.6 | Develop and manage time and attendance systems | [7-7-6-develop-and-manage-time-and-attendance-systems.json](./workflows/7-7-6-develop-and-manage-time-and-attendance-systems.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.7 | Develop workforce analytics | [7-7-7-develop-workforce-analytics.json](./workflows/7-7-7-develop-workforce-analytics.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.8 | Implement workforce analytics | [7-7-8-implement-workforce-analytics.json](./workflows/7-7-8-implement-workforce-analytics.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.7.9 | Manage/Collect employee suggestions and perform employee research | [7-7-9-manage-collect-employee-suggestions-and-perform.json](./workflows/7-7-9-manage-collect-employee-suggestions-and-perform.json) | [manage-employee-information-and-analytics](./skills/manage-employee-information-and-analytics/SKILL.md) |
| 7.8.1 | Develop employee communication plan | [7-8-1-develop-employee-communication-plan.json](./workflows/7-8-1-develop-employee-communication-plan.json) | [manage-employee-communication](./skills/manage-employee-communication/SKILL.md) |
| 7.8.2 | Conduct employee engagement surveys | [7-8-2-conduct-employee-engagement-surveys.json](./workflows/7-8-2-conduct-employee-engagement-surveys.json) | [manage-employee-communication](./skills/manage-employee-communication/SKILL.md) |
| 7.8.3 | Deliver employee communications | [7-8-3-deliver-employee-communications.json](./workflows/7-8-3-deliver-employee-communications.json) | [manage-employee-communication](./skills/manage-employee-communication/SKILL.md) |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
