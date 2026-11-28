# risk-and-compliance

Up: [functions](../README.md)

## What this is

The legal, risk and compliance function (APQC 11.0, Manage Enterprise Risk, Compliance, Remediation, and Resiliency). Its governance side is policies, the risk register, contract approval; its operations side is filings, contract work, privacy requests. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The function's manifest: purpose, intake workflow, measures and capability clusters |
| [agent.md](./agent.md) | The risk and compliance agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's legal duties and risks. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). Its summarize step writes decisions, so the decision it raises is the evidence the run proof reads. |
| [workflows/weekly-compliance-check.json](./workflows/weekly-compliance-check.json) | Workflow: check the compliance calendar each week |
| [workflows/quarterly-risk-review.json](./workflows/quarterly-risk-review.json) | Workflow: review the risk register each quarter |
| [skills/compliance-calendar](./skills/compliance-calendar) | Skill: keep the obligations register (`legal/obligations/[id]`), raise each duty in time and record its evidence |
| [skills/risk-register](./skills/risk-register) | Skill: keep the risk register (`legal/risks/[id]`) short, owned and ranked by expected loss |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/risk-and-compliance.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

## APQC processes

Every level 3 process of APQC category 11.0 has one workflow, named by its hierarchy id and naming that id in its `process` field, and every level 2 process group has one skill, naming its id in the skill's `process_group` frontmatter (EE-226). These workflows are triggered on request and are locked until a meeting has walked [workflows/intake.json](./workflows/intake.json), so process work never starts before the founder has been asked. The three hand-written workflows above keep their own triggers.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 11.1.1 | Establish the enterprise risk framework and policies | [workflows/11-1-1-establish-the-enterprise-risk-framework-and.json](./workflows/11-1-1-establish-the-enterprise-risk-framework-and.json) | [skills/manage-enterprise-risk](./skills/manage-enterprise-risk) |
| 11.1.2 | Oversee and coordinate enterprise risk management activities | [workflows/11-1-2-oversee-and-coordinate-enterprise-risk-management.json](./workflows/11-1-2-oversee-and-coordinate-enterprise-risk-management.json) | [skills/manage-enterprise-risk](./skills/manage-enterprise-risk) |
| 11.1.3 | Manage business unit and function risk | [workflows/11-1-3-manage-business-unit-and-function-risk.json](./workflows/11-1-3-manage-business-unit-and-function-risk.json) | [skills/manage-enterprise-risk](./skills/manage-enterprise-risk) |
| 11.2.1 | Establish compliance framework and policies | [workflows/11-2-1-establish-compliance-framework-and-policies.json](./workflows/11-2-1-establish-compliance-framework-and-policies.json) | [skills/manage-compliance](./skills/manage-compliance) |
| 11.2.2 | Manage regulatory compliance | [workflows/11-2-2-manage-regulatory-compliance.json](./workflows/11-2-2-manage-regulatory-compliance.json) | [skills/manage-compliance](./skills/manage-compliance) |
| 11.3.1 | Create remediation plans | [workflows/11-3-1-create-remediation-plans.json](./workflows/11-3-1-create-remediation-plans.json) | [skills/manage-remediation-efforts](./skills/manage-remediation-efforts) |
| 11.3.2 | Contact and confer with experts | [workflows/11-3-2-contact-and-confer-with-experts.json](./workflows/11-3-2-contact-and-confer-with-experts.json) | [skills/manage-remediation-efforts](./skills/manage-remediation-efforts) |
| 11.3.3 | Identify/dedicate resources | [workflows/11-3-3-identify-dedicate-resources.json](./workflows/11-3-3-identify-dedicate-resources.json) | [skills/manage-remediation-efforts](./skills/manage-remediation-efforts) |
| 11.3.4 | Investigate legal aspects | [workflows/11-3-4-investigate-legal-aspects.json](./workflows/11-3-4-investigate-legal-aspects.json) | [skills/manage-remediation-efforts](./skills/manage-remediation-efforts) |
| 11.3.5 | Investigate damage cause | [workflows/11-3-5-investigate-damage-cause.json](./workflows/11-3-5-investigate-damage-cause.json) | [skills/manage-remediation-efforts](./skills/manage-remediation-efforts) |
| 11.3.6 | Amend or create policy | [workflows/11-3-6-amend-or-create-policy.json](./workflows/11-3-6-amend-or-create-policy.json) | [skills/manage-remediation-efforts](./skills/manage-remediation-efforts) |
| 11.4.1 | Develop the business resilience strategy | [workflows/11-4-1-develop-the-business-resilience-strategy.json](./workflows/11-4-1-develop-the-business-resilience-strategy.json) | [skills/manage-business-resiliency](./skills/manage-business-resiliency) |
| 11.4.2 | Perform continuous business operations planning | [workflows/11-4-2-perform-continuous-business-operations-planning.json](./workflows/11-4-2-perform-continuous-business-operations-planning.json) | [skills/manage-business-resiliency](./skills/manage-business-resiliency) |
| 11.4.3 | Test continuous business operations | [workflows/11-4-3-test-continuous-business-operations.json](./workflows/11-4-3-test-continuous-business-operations.json) | [skills/manage-business-resiliency](./skills/manage-business-resiliency) |
| 11.4.4 | Maintain continuous business operations | [workflows/11-4-4-maintain-continuous-business-operations.json](./workflows/11-4-4-maintain-continuous-business-operations.json) | [skills/manage-business-resiliency](./skills/manage-business-resiliency) |
| 11.4.5 | Share knowledge of specific risks across other parts of the organization | [workflows/11-4-5-share-knowledge-of-specific-risks-across-other.json](./workflows/11-4-5-share-knowledge-of-specific-risks-across-other.json) | [skills/manage-business-resiliency](./skills/manage-business-resiliency) |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
