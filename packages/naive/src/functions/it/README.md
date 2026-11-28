# it

Up: [functions](../README.md)

## What this is

The information technology function (APQC 8.0, Manage Information Technology (IT)). Its governance side is tool approval (scored by Jev, EE-042); its operations side is accounts, integrations, devices and access. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The IT agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix. The architect approves a free new dependency (`new-dependency-free`), because the architect holds that grant in the default delegation and product-lead does not |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's systems and access. It reads the source map through `knowledge/knowledge-sources`. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/quarterly-access-review.json](./workflows/quarterly-access-review.json) | Workflow: review access and tools each quarter, reading the source map through `knowledge/knowledge-sources` |
| [skills/access-review](./skills/access-review) | Skill: keep each person's and agent role's access to the least the work needs: MFA, scoped credentials, leavers, rotation and restore tests (CIS Controls v8.1 IG1, OWASP LLM06) |
| [capability-clusters.json](./capability-clusters.json) | The capability cluster catalog (lead agents build plan item 7): the whole-venture monorepo thesis's six clusters, the functions that depend on each and the gap kinds that justify an outside tool. It names no vendor; a venture's connection record (`it/connections/<id>.json`, `packages/naive/src/records/connection.schema.json`) names its own system. Checked by `packages/naive/src/checks/check-connections.ts` |
| [language-rubric.json](./language-rubric.json) | The language rubric (EE-189): eight criteria for judging which programming language fits a system, each with a question, why, a 0 to 4 scale, its sources and a default weight that is an unvalidated prior, and Naive's own choices as worked examples (TypeScript on Effect for the framework, Lean 4 for proofs). `scoreLanguages` in `packages/naive/src/engine/language-rubric.ts` ranks candidates and a person decides; checked by `packages/naive/src/checks/check-language-rubric.ts`. The tool-selection skill says when to use it |
| [visibility-rubric.json](./visibility-rubric.json) | The visibility rubric (EE-222): five criteria for judging how far a tool gives the system visibility of an activity and how far the venture owns the record, each with a question, why, a 0 to 4 scale, its sources and a default weight that is an unvalidated prior a venture replaces under `visibility` in `naive.config.json`; a gate on consent and retention; a blind spot where nothing is recorded; the channels an activity is performed on, read from the words of its statement; and the tool kinds that capture each, named as kinds and never as vendors. `scoreTools` in `packages/naive/src/engine/visibility-rubric.ts` ranks candidates and `naive tools recommend` reads a goal (`packages/naive/src/engine/tool-recommendations.ts`); checked by `packages/naive/src/checks/check-visibility-rubric.ts`. A person decides |
| [skills/tool-selection](./skills/tool-selection) | Skill: Help someone choose the tools for a layer (knowledge, operations, execution, evidence, governance, interface, purpose) by offering situation questions, only when they wan |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/it.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own. The IT workflows also run `node packages/naive/src/checks/check-connections.ts "$NAIVE_VENTURE"` on its connections.

## APQC processes

Every level 3 process of APQC category 8.0, Manage Information Technology (IT), has one workflow in `workflows/`, named by its hierarchy id and naming that id in its field `process`, and every level 4 activity under it is one step of that workflow (`node packages/naive/src/checks/check-pcf-coverage.ts --function it`). Each workflow runs on request, after the founder has walked [workflows/intake.json](./workflows/intake.json) in a meeting, and its steps load the skill for its process group. The two hand-written workflows above, the intake and the quarterly access review, keep their own triggers and are not process workflows.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 8.1.1 | Understand IT customer needs | `workflows/8-1-1-understand-it-customer-needs.json` | `develop-and-manage-it-customer-relationships` |
| 8.1.2 | Identify IT customer transformation needs | `workflows/8-1-2-identify-it-customer-transformation-needs.json` | `develop-and-manage-it-customer-relationships` |
| 8.1.3 | Plan and communicate IT services | `workflows/8-1-3-plan-and-communicate-it-services.json` | `develop-and-manage-it-customer-relationships` |
| 8.1.4 | Provide IT transformation guidance | `workflows/8-1-4-provide-it-transformation-guidance.json` | `develop-and-manage-it-customer-relationships` |
| 8.1.5 | Develop and manage IT service levels | `workflows/8-1-5-develop-and-manage-it-service-levels.json` | `develop-and-manage-it-customer-relationships` |
| 8.1.6 | Manage IT customer relationships | `workflows/8-1-6-manage-it-customer-relationships.json` | `develop-and-manage-it-customer-relationships` |
| 8.1.7 | Analyze service performance | `workflows/8-1-7-analyze-service-performance.json` | `develop-and-manage-it-customer-relationships` |
| 8.2.1 | Define business technology and governance strategy | `workflows/8-2-1-define-business-technology-and-governance-strategy.json` | `develop-and-manage-it-business-strategy` |
| 8.2.2 | Manage IT portfolio strategy | `workflows/8-2-2-manage-it-portfolio-strategy.json` | `develop-and-manage-it-business-strategy` |
| 8.2.3 | Define and maintain enterprise architecture | `workflows/8-2-3-define-and-maintain-enterprise-architecture.json` | `develop-and-manage-it-business-strategy` |
| 8.2.4 | Define IT service management strategy | `workflows/8-2-4-define-it-service-management-strategy.json` | `develop-and-manage-it-business-strategy` |
| 8.2.5 | Control IT management system | `workflows/8-2-5-control-it-management-system.json` | `develop-and-manage-it-business-strategy` |
| 8.2.6 | Manage IT value portfolio | `workflows/8-2-6-manage-it-value-portfolio.json` | `develop-and-manage-it-business-strategy` |
| 8.2.7 | Define and manage technology innovation | `workflows/8-2-7-define-and-manage-technology-innovation.json` | `develop-and-manage-it-business-strategy` |
| 8.3.1 | Develop IT compliance, risk, and security strategy | `workflows/8-3-1-develop-it-compliance-risk-and-security-strategy.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.3.2 | Develop IT resilience strategy | `workflows/8-3-2-develop-it-resilience-strategy.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.3.3 | Control IT risk, compliance, and security | `workflows/8-3-3-control-it-risk-compliance-and-security.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.3.4 | Plan and manage IT continuity | `workflows/8-3-4-plan-and-manage-it-continuity.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.3.5 | Develop and manage IT security, privacy, and data protection | `workflows/8-3-5-develop-and-manage-it-security-privacy-and-data.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.3.6 | Conduct and analyze IT compliance assessments | `workflows/8-3-6-conduct-and-analyze-it-compliance-assessments.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.3.7 | Develop and execute IT resilience and continuity operations | `workflows/8-3-7-develop-and-execute-it-resilience-and-continuity.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.3.8 | Manage IT user identity and authorization | `workflows/8-3-8-manage-it-user-identity-and-authorization.json` | `develop-and-manage-it-resilience-and-risk` |
| 8.4.1 | Define business information and analytics strategy | `workflows/8-4-1-define-business-information-and-analytics-strategy.json` | `manage-information` |
| 8.4.2 | Define and maintain business information architecture | `workflows/8-4-2-define-and-maintain-business-information.json` | `manage-information` |
| 8.4.3 | Define and execute business information lifecycle planning and control | `workflows/8-4-3-define-and-execute-business-information-lifecycle.json` | `manage-information` |
| 8.4.4 | Manage business information | `workflows/8-4-4-manage-business-information.json` | `manage-information` |
| 8.5.1 | Develop service/solution and integration strategy | `workflows/8-5-1-develop-service-solution-and-integration-strategy.json` | `develop-and-manage-services-solutions` |
| 8.5.2 | Manage service/solution lifecycle planning | `workflows/8-5-2-manage-service-solution-lifecycle-planning.json` | `develop-and-manage-services-solutions` |
| 8.5.3 | Develop and manage service/solution architecture | `workflows/8-5-3-develop-and-manage-service-solution-architecture.json` | `develop-and-manage-services-solutions` |
| 8.5.4 | Execute IT service/solution creation and testing | `workflows/8-5-4-execute-it-service-solution-creation-and-testing.json` | `develop-and-manage-services-solutions` |
| 8.5.5 | Perform service/solution maintenance and testing | `workflows/8-5-5-perform-service-solution-maintenance-and-testing.json` | `develop-and-manage-services-solutions` |
| 8.6.1 | Develop and manage service/solution deployment strategy | `workflows/8-6-1-develop-and-manage-service-solution-deployment.json` | `deploy-services-solutions` |
| 8.6.2 | Plan service and solution implementation | `workflows/8-6-2-plan-service-and-solution-implementation.json` | `deploy-services-solutions` |
| 8.6.3 | Manage change deployment control | `workflows/8-6-3-manage-change-deployment-control.json` | `deploy-services-solutions` |
| 8.6.4 | Implement technology solutions | `workflows/8-6-4-implement-technology-solutions.json` | `deploy-services-solutions` |
| 8.6.5 | Perform service and solution rollout | `workflows/8-6-5-perform-service-and-solution-rollout.json` | `deploy-services-solutions` |
| 8.7.1 | Define and establish service delivery strategy | `workflows/8-7-1-define-and-establish-service-delivery-strategy.json` | `create-and-manage-support-services-solutions` |
| 8.7.2 | Define and develop service support strategy | `workflows/8-7-2-define-and-develop-service-support-strategy.json` | `create-and-manage-support-services-solutions` |
| 8.7.3 | Plan and manage service delivery control | `workflows/8-7-3-plan-and-manage-service-delivery-control.json` | `create-and-manage-support-services-solutions` |
| 8.7.4 | Develop and manage infrastructure resource planning | `workflows/8-7-4-develop-and-manage-infrastructure-resource.json` | `create-and-manage-support-services-solutions` |
| 8.7.5 | Define service support planning | `workflows/8-7-5-define-service-support-planning.json` | `create-and-manage-support-services-solutions` |
| 8.7.6 | Develop and manage service delivery operations | `workflows/8-7-6-develop-and-manage-service-delivery-operations.json` | `create-and-manage-support-services-solutions` |
| 8.7.7 | Manage infrastructure resource administration | `workflows/8-7-7-manage-infrastructure-resource-administration.json` | `create-and-manage-support-services-solutions` |
| 8.7.8 | Operate IT user support | `workflows/8-7-8-operate-it-user-support.json` | `create-and-manage-support-services-solutions` |

The 8.3.8 workflow reads `operations/workers`, the venture's digital workers (EE-235), so the user directory it keeps lists every person, every agent role and every digital worker on each system.

The seven process group skills sit in `skills/`, one per level 2 group: [develop-and-manage-it-customer-relationships](./skills/develop-and-manage-it-customer-relationships) (8.1), [develop-and-manage-it-business-strategy](./skills/develop-and-manage-it-business-strategy) (8.2) and [develop-and-manage-it-resilience-and-risk](./skills/develop-and-manage-it-resilience-and-risk) (8.3) for the relationship, strategy and risk side, and `manage-information` (8.4), `develop-and-manage-services-solutions` (8.5), `deploy-services-solutions` (8.6) and `create-and-manage-support-services-solutions` (8.7) for information, building, deploying and supporting. A process workflow writes only what the function's write reach allows, `it/connections/[id]` and `decisions/[id]`, and records everything else on the handoff as evidence; the records these processes would otherwise want (an IT service catalog entry, a risk register row, a control test result, a continuity plan, an incident) are not built, and each group's skill says so in its own Records section.
