# supply-chain

Up: [functions](../README.md)

## What this is

The supply chain function (APQC 4.0, Manage Supply Chain for Physical Products). Its governance side is supplier approval; its operations side is sourcing, production, inventory and shipping. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The supply chain agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's suppliers and orders. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/monthly-supply-review.json](./workflows/monthly-supply-review.json) | Workflow: review suppliers, orders and supply risk each month |
| [workflows/](./workflows) | One workflow per APQC level 3 process of category 4.0, named by its hierarchy id. See the table below |
| [skills/supplier-and-purchasing](./skills/supplier-and-purchasing) | Skill: keep the approved supplier list and purchase orders: supplier evaluation, Kraljic risk classes and single sources, Incoterms 2020, landed cost and reorder points |
| [skills/plan-for-and-align-supply-chain-resources](./skills/plan-for-and-align-supply-chain-resources) | Skill: process group 4.1, planning the supply side (production strategy, demand, materials, schedule, distribution, quality standards) |
| [skills/procure-materials-and-services](./skills/procure-materials-and-services) | Skill: process group 4.2, buying (sourcing governance, category plans, suppliers and contracts, orders, supplier performance) |
| [skills/produce-assemble-test-product](./skills/produce-assemble-test-product) | Skill: process group 4.3, making (scheduling and releasing a build, running it, testing a lot, lot traceability) |
| [skills/manage-logistics-and-warehousing](./skills/manage-logistics-and-warehousing) | Skill: process group 4.4, moving and holding goods (logistics governance, inbound, warehousing, outbound, last mile) |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/supply-chain.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

## APQC processes

Every level 3 process of APQC category 4.0 (Manage Supply Chain for Physical Products) has one workflow here, named by its hierarchy id and carrying that id in its `process` field, and each process group has one skill, named by every step of its workflows (`process_group` in the skill's frontmatter). `node packages/naive/src/checks/check-pcf-coverage.ts --function supply-chain --gaps` reports what is covered. Each one runs on request, after the founder has walked [workflows/intake.json](./workflows/intake.json) in a meeting.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 4.1.1 | Develop production and materials strategies | [4-1-1-develop-production-and-materials-strategies.json](./workflows/4-1-1-develop-production-and-materials-strategies.json) | plan-for-and-align-supply-chain-resources |
| 4.1.2 | Manage demand for products | [4-1-2-manage-demand-for-products.json](./workflows/4-1-2-manage-demand-for-products.json) | plan-for-and-align-supply-chain-resources |
| 4.1.3 | Create materials plan | [4-1-3-create-materials-plan.json](./workflows/4-1-3-create-materials-plan.json) | plan-for-and-align-supply-chain-resources |
| 4.1.4 | Create and manage master production schedule | [4-1-4-create-and-manage-master-production-schedule.json](./workflows/4-1-4-create-and-manage-master-production-schedule.json) | plan-for-and-align-supply-chain-resources |
| 4.1.5 | Plan distribution requirements | [4-1-5-plan-distribution-requirements.json](./workflows/4-1-5-plan-distribution-requirements.json) | plan-for-and-align-supply-chain-resources |
| 4.1.6 | Establish distribution planning constraints | [4-1-6-establish-distribution-planning-constraints.json](./workflows/4-1-6-establish-distribution-planning-constraints.json) | plan-for-and-align-supply-chain-resources |
| 4.1.7 | Review distribution planning policies | [4-1-7-review-distribution-planning-policies.json](./workflows/4-1-7-review-distribution-planning-policies.json) | plan-for-and-align-supply-chain-resources |
| 4.1.8 | Develop quality standards and procedures | [4-1-8-develop-quality-standards-and-procedures.json](./workflows/4-1-8-develop-quality-standards-and-procedures.json) | plan-for-and-align-supply-chain-resources |
| 4.2.1 | Provide sourcing governance | [4-2-1-provide-sourcing-governance.json](./workflows/4-2-1-provide-sourcing-governance.json) | procure-materials-and-services |
| 4.2.2 | Develop category plan | [4-2-2-develop-category-plan.json](./workflows/4-2-2-develop-category-plan.json) | procure-materials-and-services |
| 4.2.3 | Select suppliers and develop/maintain contracts | [4-2-3-select-suppliers-and-develop-maintain-contracts.json](./workflows/4-2-3-select-suppliers-and-develop-maintain-contracts.json) | procure-materials-and-services |
| 4.2.4 | Order materials and services | [4-2-4-order-materials-and-services.json](./workflows/4-2-4-order-materials-and-services.json) | procure-materials-and-services |
| 4.2.5 | Manage suppliers | [4-2-5-manage-suppliers.json](./workflows/4-2-5-manage-suppliers.json) | procure-materials-and-services |
| 4.3.1 | Schedule production | [4-3-1-schedule-production.json](./workflows/4-3-1-schedule-production.json) | produce-assemble-test-product |
| 4.3.2 | Produce/Assemble product | [4-3-2-produce-assemble-product.json](./workflows/4-3-2-produce-assemble-product.json) | produce-assemble-test-product |
| 4.3.3 | Perform quality testing | [4-3-3-perform-quality-testing.json](./workflows/4-3-3-perform-quality-testing.json) | produce-assemble-test-product |
| 4.3.4 | Maintain production records and manage lot traceability | [4-3-4-maintain-production-records-and-manage-lot.json](./workflows/4-3-4-maintain-production-records-and-manage-lot.json) | produce-assemble-test-product |
| 4.4.1 | Provide logistics governance | [4-4-1-provide-logistics-governance.json](./workflows/4-4-1-provide-logistics-governance.json) | manage-logistics-and-warehousing |
| 4.4.2 | Plan and manage inbound material flow | [4-4-2-plan-and-manage-inbound-material-flow.json](./workflows/4-4-2-plan-and-manage-inbound-material-flow.json) | manage-logistics-and-warehousing |
| 4.4.3 | Operate warehousing | [4-4-3-operate-warehousing.json](./workflows/4-4-3-operate-warehousing.json) | manage-logistics-and-warehousing |
| 4.4.4 | Operate outbound transportation | [4-4-4-operate-outbound-transportation.json](./workflows/4-4-4-operate-outbound-transportation.json) | manage-logistics-and-warehousing |
| 4.4.5 | Deliver last mile delivery services | [4-4-5-deliver-last-mile-delivery-services.json](./workflows/4-4-5-deliver-last-mile-delivery-services.json) | manage-logistics-and-warehousing |

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
