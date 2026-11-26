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
| [workflows/competitor-review.json](./workflows/competitor-review.json) | Workflow: review competitors and the customer's alternatives. Its steps name APQC activities 1.1.1.1, 1.1.1.2 and 1.1.1.3, and four are steps to consider (EE-181) |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's strategy |
| [workflows/strategy-review.json](./workflows/strategy-review.json) | Workflow: review the strategy against the evidence |
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
| [skills/board-design](./skills/board-design) | Skill: Help a founder decide whether and when to have a board, formal or advisory; its size and seats (founder, investor, independent, observer); who appoints each seat; which m |
| [skills/business-pillar](./skills/business-pillar) | Skill: Provide Business pillar context: teams, roles, Tier 1 deliverables (business model, pricing, ops runbooks, metrics framework, sales collateral, contracts, legal posture) |
| [skills/chief-of-staff](./skills/chief-of-staff) | Skill: Run the founder's single session as Chief of Staff. |
| [skills/cross-pillar-tradeoff](./skills/cross-pillar-tradeoff) | Skill: Surface and frame a cross-pillar tradeoff as a CEO-level (or Chief-of-Staff- surfaced) decision. |
| [skills/competitor-research](./skills/competitor-research) | Skill: research competitors and the customer's alternatives: the questions to ask in order, public sources only, and what is never done (misrepresentation, contact, talk of prices with a competitor). |
| [skills/metrics-review](./skills/metrics-review) | Skill: Run a metrics review against current project / product state: read the metrics framework, evaluate against targets, surface trends, identify outliers, recommend actions. |
| [skills/office-hours-mode](./skills/office-hours-mode) | Skill: Switch AI thought-partnership posture to "office hours mode": sharp critique, evidence-demanding, weakest-claim-first. |
| [skills/strategy-review](./skills/strategy-review) | Skill: Run the fixed-cadence strategy review: test the strategy as diagnosis, guiding policy and coherent actions, check kill criteria and default alive, compare intended with realized strategy, and bring every strategic choice to the founder as a decision |
| [skills/telos](./skills/telos) | Skill: Start with the end: help the owner state what the venture is for when it has done its job, how anyone would know (measures), what the owners intend to happen then (hold,  |
| [lean-canvas.json](./lean-canvas.json) | The Lean Canvas (Maurya 2012), the venture's shared kernel (EE-155): nine boxes, each a reference to a record attribute its owning function writes. Strategy owns the canvas and none of the boxes it does not own; `packages/naive/src/engine/lean-canvas.ts` resolves it |
| [venture-anatomy.json](./venture-anatomy.json) | The Venture Anatomy Matrix (EE-157), the venture's architecture description after ISO/IEC/IEEE 42010: eleven sub-matrices, each naming its record types, owning function, the Regulation S-K items it covers, the phase it is expected from and how it nests, plus the lean-canvas, business-model-canvas and s1-outline viewpoints. Strategy owns the matrix; `packages/naive/src/engine/venture-anatomy.ts` resolves it |
| [strategic-foundation.json](./strategic-foundation.json) | A record |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/strategy.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
| [templates/telos-based-smart.md](./templates/telos-based-smart.md) | Template: telos, BASED then SMART |
