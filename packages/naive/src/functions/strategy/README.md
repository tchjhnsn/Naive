# strategy

Up: [functions](../README.md)

## What this is

The strategy function (APQC 1.0, Develop Vision and Strategy). Its governance side is strategic decisions and the link to the telos; its operations side is planning cadence, market research. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The strategy agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/bet-review.json](./workflows/bet-review.json) | Workflow: register a bet, look for evidence against it, and bring the founder the resolution (EE-221). It waits on a `foundation/pre-registration` record (EE-217), because the plan that tests a bet comes before the search. Its steps read the register, write each claim in the fixed form for its kind through the `bet-writing` skill, draft or name the pre-registration that tests it, run the registered method with queries aimed at evidence against, attack the premises with `naive lint premises` and a rival beside each bet (and the agent that ran the search does not run that step), bring the founder the registered claim unchanged with the evidence for and against, and, once bets have resolved, score the odds, which is the step to consider. Only the founder registers, puts odds on or resolves a bet |
| [workflows/competitor-review.json](./workflows/competitor-review.json) | Workflow: review competitors and the customer's alternatives. It waits on a live problem record and ICP (EE-217). Its steps name APQC activities 1.1.1.1, 1.1.1.2 and 1.1.1.3, and four are steps to consider (EE-181) |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's strategy. It is the root of the shipped prerequisite chain and waits on nothing (EE-217), so the first lock can always be opened. Its second step drafts a pre-registration (`foundation/pre-registration/[id]`), before the mission and the vision (EE-220); its telos step drafts the venture goal telos (`foundation/goals/[id]`), which starts in Discovery; the limits step is one to consider from Validation (check-functions.ts). |
| [workflows/strategy-review.json](./workflows/strategy-review.json) | Workflow: review the strategy against the evidence. It waits on the strategy foundation (problem, ICP, goals) and on a meeting that walked `strategy/intake` and closed with its goal reached (EE-217) |
| [features/decisions.feature](./features/decisions.feature) | Gherkin behaviors (EE-050) |
| [features/decisions.steps.mjs](./features/decisions.steps.ts) | Step definitions for the behaviors beside it |
| [features/strategic-foundation.feature](./features/strategic-foundation.feature) | Gherkin behaviors (EE-050) |
| [features/strategic-foundation.steps.mjs](./features/strategic-foundation.steps.ts) | Step definitions for the behaviors beside it |
| [frameworks/business-discovery-framework-amendments-2026-05-20.md](./frameworks/business-discovery-framework-amendments-2026-05-20.md) | Discovery Framework Amendments: 2026-05-20 |
| [frameworks/business-discovery-framework.html](./frameworks/business-discovery-framework.html) | A rendered document |
| [frameworks/business-discovery-framework.md](./frameworks/business-discovery-framework.md) | Business Discovery Framework |
| [frameworks/founder-profile](./frameworks/founder-profile) | A folder |
| [frameworks/idea-map](./frameworks/idea-map) | From an idea dump to next steps: how Naive parses the dump (Jev), structures it as an idea graph, routes each idea to its destination in the framework, and shows the dest |
| [frameworks/onboarding-handoff-framework.md](./frameworks/onboarding-handoff-framework.md) | Onboarding Handoff Framework |
| [frameworks/post-discovery-deliverable-playbook.md](./frameworks/post-discovery-deliverable-playbook.md) | Post-Discovery Deliverable Playbook |
| [kits/validation](./kits/validation) | The validation kit (EE-026) |
| [playbooks/torians-playbook.json](./playbooks/torians-playbook.json) | A record |
| [skills/ambition-tier](./skills/ambition-tier) | Skill: Run Phase 0Δ: the Project Ambition Gate. |
| [skills/bet-writing](./skills/bet-writing) | Skill: write a founder's strategic claims as bets, the way requirements are written, each with what would show it wrong, the premises under it, the rival it is read against, and the line, the date and the odds the founder set (EE-221). It supplies no number and hands off to the pre-registration skill for the test |
| [skills/board-design](./skills/board-design) | Skill: Help a founder decide whether and when to have a board, formal or advisory; its size and seats (founder, investor, independent, observer); who appoints each seat; which m |
| [skills/business-pillar](./skills/business-pillar) | Skill: Provide Business pillar context: teams, roles, Tier 1 deliverables (business model, pricing, ops runbooks, metrics framework, sales collateral, contracts, legal posture) |
| [skills/chief-of-staff](./skills/chief-of-staff) | Skill: Run the founder's single session as Chief of Staff. |
| [skills/cross-pillar-tradeoff](./skills/cross-pillar-tradeoff) | Skill: Surface and frame a cross-pillar tradeoff as a CEO-level (or Chief-of-Staff- surfaced) decision. |
| [skills/competitor-research](./skills/competitor-research) | Skill: research competitors and the customer's alternatives: the questions to ask in order, public sources only, and what is never done (misrepresentation, contact, talk of prices with a competitor). |
| [skills/metrics-review](./skills/metrics-review) | Skill: Run a metrics review against current project / product state: read the metrics framework, evaluate against targets, surface trends, identify outliers, recommend actions. |
| [skills/office-hours-mode](./skills/office-hours-mode) | Skill: Switch AI thought-partnership posture to "office hours mode": sharp critique, evidence-demanding, weakest-claim-first. |
| [skills/strategy-review](./skills/strategy-review) | Skill: Run the fixed-cadence strategy review: test the strategy as diagnosis, guiding policy and coherent actions, check kill criteria and default alive, compare intended with realized strategy, and bring every strategic choice to the founder as a decision |
| [skills/pre-registration](./skills/pre-registration) | Skill: help a founder write down what would have to be true, how it will be looked for, what does not count as evidence, and what the venture does on each answer, before the mission and the vision (EE-220) |
| [skills/telos](./skills/telos) | Skill: Start with the end: help the owner state what the venture is for when it has done its job, how anyone would know (measures), what the owners intend to happen then (hold,  |
| [lean-canvas.json](./lean-canvas.json) | The Lean Canvas (Maurya 2012), the venture's shared kernel (EE-155): nine boxes, each a reference to a record attribute its owning function writes. Strategy owns the canvas and none of the boxes it does not own; `packages/naive/src/engine/lean-canvas.ts` resolves it |
| [venture-anatomy.json](./venture-anatomy.json) | The Venture Anatomy Matrix (EE-157), the venture's architecture description after ISO/IEC/IEEE 42010: eleven sub-matrices, each naming its record types, owning function, the Regulation S-K items it covers, the phase it is expected from and how it nests, plus the lean-canvas, business-model-canvas and s1-outline viewpoints. Strategy owns the matrix; `packages/naive/src/engine/venture-anatomy.ts` resolves it |
| [problem-priority.json](./problem-priority.json) | The customer problem tree's priority definition (EE-219): the standards it follows (Torres's opportunity solution tree, the Logical Framework Approach's problem tree, Jobs to be Done), the weights for the three evidence counts, the statuses the ranking covers, the labels primary, secondary and tertiary, and `requires_target`, the record types that wait for a core problem and a target. The weights are unvalidated priors a venture replaces under `problems` in `naive.config.json`; `packages/naive/src/engine/problems.ts` reads it and `packages/naive/src/checks/check-problems.ts` checks it |
| [strategic-foundation.json](./strategic-foundation.json) | A record |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/strategy.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
| [templates/bet.md](./templates/bet.md) | Template: a bet, with every number in it labelled an example, because Naive ships no line, no date and no probability (EE-221) |
| [templates/pre-registration.md](./templates/pre-registration.md) | Template: a pre-registration, with every number in it labelled an example, because Naive ships no threshold and no sample size (EE-220) |
| [templates/telos-based-smart.md](./templates/telos-based-smart.md) | Template: telos, BASED then SMART |

## APQC processes

Every level 3 process of APQC category 1.0, Develop Vision and Strategy, has one workflow here, named by its hierarchy id and naming it in its `process` field, and every level 2 process group has one skill (EE-226). The APQC names are APQC's own. Each workflow's trigger is `request`: it runs when the strategy lead or the founder hands it off, and it waits on a meeting that walked [workflows/intake.json](./workflows/intake.json) and closed with its goal reached, so process work stays locked until the founder has been through the function's intake. A workflow that writes a foundation record also waits on a live `foundation/pre-registration` record (EE-220).

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| **1.1** | **Define the business concept and long-term vision** | | [skills/define-the-business-concept-and-long-term-vision](./skills/define-the-business-concept-and-long-term-vision) |
| 1.1.1 | Assess the external environment | [workflows/1-1-1-assess-the-external-environment.json](./workflows/1-1-1-assess-the-external-environment.json) | `define-the-business-concept-and-long-term-vision` |
| 1.1.2 | Survey market and determine customer needs and wants | [workflows/1-1-2-survey-market-and-determine-customer-needs-and.json](./workflows/1-1-2-survey-market-and-determine-customer-needs-and.json) | `define-the-business-concept-and-long-term-vision` |
| 1.1.3 | Assess the internal environment | [workflows/1-1-3-assess-the-internal-environment.json](./workflows/1-1-3-assess-the-internal-environment.json) | `define-the-business-concept-and-long-term-vision` |
| 1.1.4 | Establish strategic vision | [workflows/1-1-4-establish-strategic-vision.json](./workflows/1-1-4-establish-strategic-vision.json) | `define-the-business-concept-and-long-term-vision` |
| 1.1.5 | Conduct organization restructuring opportunities | [workflows/1-1-5-conduct-organization-restructuring-opportunities.json](./workflows/1-1-5-conduct-organization-restructuring-opportunities.json) | `define-the-business-concept-and-long-term-vision` |
| **1.2** | **Develop business strategy** | | [skills/develop-business-strategy](./skills/develop-business-strategy) |
| 1.2.1 | Develop overall mission statement | [workflows/1-2-1-develop-overall-mission-statement.json](./workflows/1-2-1-develop-overall-mission-statement.json) | `develop-business-strategy` |
| 1.2.2 | Define and evaluate strategic options to achieve the mission | [workflows/1-2-2-define-and-evaluate-strategic-options-to-achieve.json](./workflows/1-2-2-define-and-evaluate-strategic-options-to-achieve.json) | `develop-business-strategy` |
| 1.2.3 | Set/Develop long-term enterprise strategy | [workflows/1-2-3-set-develop-long-term-enterprise-strategy.json](./workflows/1-2-3-set-develop-long-term-enterprise-strategy.json) | `develop-business-strategy` |
| 1.2.4 | Coordinate and align cross-functional and process strategies | [workflows/1-2-4-coordinate-and-align-cross-functional-and-process.json](./workflows/1-2-4-coordinate-and-align-cross-functional-and-process.json) | `develop-business-strategy` |
| 1.2.5 | Create organizational design | [workflows/1-2-5-create-organizational-design.json](./workflows/1-2-5-create-organizational-design.json) | `develop-business-strategy` |
| 1.2.6 | Develop and set organizational objectives | [workflows/1-2-6-develop-and-set-organizational-objectives.json](./workflows/1-2-6-develop-and-set-organizational-objectives.json) | `develop-business-strategy` |
| 1.2.7 | Formulate business unit strategies | [workflows/1-2-7-formulate-business-unit-strategies.json](./workflows/1-2-7-formulate-business-unit-strategies.json) | `develop-business-strategy` |
| 1.2.8 | Develop customer experience strategy | [workflows/1-2-8-develop-customer-experience-strategy.json](./workflows/1-2-8-develop-customer-experience-strategy.json) | `develop-business-strategy` |
| 1.2.9 | Communicate strategies internally and externally | [workflows/1-2-9-communicate-strategies-internally-and-externally.json](./workflows/1-2-9-communicate-strategies-internally-and-externally.json) | `develop-business-strategy` |
| **1.3** | **Develop and measure strategic initiatives** | | [skills/develop-and-measure-strategic-initiatives](./skills/develop-and-measure-strategic-initiatives) |
| 1.3.1 | Develop strategic initiatives | [workflows/1-3-1-develop-strategic-initiatives.json](./workflows/1-3-1-develop-strategic-initiatives.json) | `develop-and-measure-strategic-initiatives` |
| 1.3.2 | Evaluate strategic initiatives | [workflows/1-3-2-evaluate-strategic-initiatives.json](./workflows/1-3-2-evaluate-strategic-initiatives.json) | `develop-and-measure-strategic-initiatives` |
| 1.3.3 | Select strategic initiatives | [workflows/1-3-3-select-strategic-initiatives.json](./workflows/1-3-3-select-strategic-initiatives.json) | `develop-and-measure-strategic-initiatives` |
| 1.3.4 | Establish high-level measures | [workflows/1-3-4-establish-high-level-measures.json](./workflows/1-3-4-establish-high-level-measures.json) | `develop-and-measure-strategic-initiatives` |
| 1.3.5 | Execute strategic initiatives | [workflows/1-3-5-execute-strategic-initiatives.json](./workflows/1-3-5-execute-strategic-initiatives.json) | `develop-and-measure-strategic-initiatives` |
| 1.3.6 | Review execution of strategic initiatives | [workflows/1-3-6-review-execution-of-strategic-initiatives.json](./workflows/1-3-6-review-execution-of-strategic-initiatives.json) | `develop-and-measure-strategic-initiatives` |
| 1.3.7 | Refine strategic initiatives and project plans as needed | [workflows/1-3-7-refine-strategic-initiatives-and-project-plans-as.json](./workflows/1-3-7-refine-strategic-initiatives-and-project-plans-as.json) | `develop-and-measure-strategic-initiatives` |
| **1.4** | **Develop and maintain business models** | | [skills/develop-and-maintain-business-models](./skills/develop-and-maintain-business-models) |
| 1.4.1 | Develop business models | [workflows/1-4-1-develop-business-models.json](./workflows/1-4-1-develop-business-models.json) | `develop-and-maintain-business-models` |
| 1.4.2 | Maintain business models | [workflows/1-4-2-maintain-business-models.json](./workflows/1-4-2-maintain-business-models.json) | `develop-and-maintain-business-models` |
| 1.4.3 | Establish business model governance | [workflows/1-4-3-establish-business-model-governance.json](./workflows/1-4-3-establish-business-model-governance.json) | `develop-and-maintain-business-models` |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
