# products

Up: [functions](../README.md)

## What this is

The products and services function (APQC 2.0, Develop and Manage Products and Services). Its governance side is product decision rights; its operations side is specs, roadmaps and the work of building (MAD, for software). This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The products agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's products. It waits on the strategy foundation (problem, ICP, goals) and on a meeting that walked `strategy/intake` and closed with its goal reached (EE-217), so a product card cannot be written before the venture knows who it is for. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). Its summarize step writes decisions, so the decision it raises is the evidence the run proof reads. |
| [workflows/weekly-product-review.json](./workflows/weekly-product-review.json) | Workflow: review discovery, bugs and the next build each week, reading each feature from its report (`naive features`, EE-228). It waits on a live product card (EE-217) |
| [skills/four-risks-review](./skills/four-risks-review) | Skill: check a product or a build for evidence on the four risks (value, usability, feasibility, viability), weekly customer touchpoints and the product-market fit survey |
| [frameworks/product-anatomy](./frameworks/product-anatomy) | Product Anatomy Matrix: fix the venture's core product first, judge every product against it with typed questions (Jev plus a reasoning model), then deduce each product's |
| [sdlc/README.md](./sdlc/README.md) | SDLC catalog |
| [sdlc/catalog.json](./sdlc/catalog.json) | A record |
| [skills/product-pillar](./skills/product-pillar) | Skill: Provide Product pillar context: teams, roles, Tier 1 + Tier 2 deliverables, cross-pillar overlap zones: when working on product-pillar work. |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/products.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

## APQC processes

Every level 3 process of APQC category 2.0 (Develop and Manage Products and Services) has a workflow named by its hierarchy id, which names the process in its `process` field; every level 4 activity under it is a step. These run on request, after a meeting has walked `products/intake` and closed with its goal reached (EE-217). Each process group has one skill, which every step of its workflows names. Coverage is reported by `node packages/naive/src/checks/check-pcf-coverage.ts --function products`.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 2.1.1 | Manage product and service portfolio | [workflows/2-1-1-manage-product-and-service-portfolio.json](./workflows/2-1-1-manage-product-and-service-portfolio.json) | [skills/govern-and-manage-product-service-development](./skills/govern-and-manage-product-service-development) |
| 2.1.2 | Manage product and service life cycle | [workflows/2-1-2-manage-product-and-service-life-cycle.json](./workflows/2-1-2-manage-product-and-service-life-cycle.json) | [skills/govern-and-manage-product-service-development](./skills/govern-and-manage-product-service-development) |
| 2.1.3 | Manage patents, copyrights, and regulatory requirements | [workflows/2-1-3-manage-patents-copyrights-and-regulatory.json](./workflows/2-1-3-manage-patents-copyrights-and-regulatory.json) | [skills/govern-and-manage-product-service-development](./skills/govern-and-manage-product-service-development) |
| 2.1.4 | Manage product and service master data | [workflows/2-1-4-manage-product-and-service-master-data.json](./workflows/2-1-4-manage-product-and-service-master-data.json) | [skills/govern-and-manage-product-service-development](./skills/govern-and-manage-product-service-development) |
| 2.2.1 | Perform discovery research | [workflows/2-2-1-perform-discovery-research.json](./workflows/2-2-1-perform-discovery-research.json) | [skills/generate-and-define-new-product-service-ideas](./skills/generate-and-define-new-product-service-ideas) |
| 2.2.2 | Generate new product/service concepts | [workflows/2-2-2-generate-new-product-service-concepts.json](./workflows/2-2-2-generate-new-product-service-concepts.json) | [skills/generate-and-define-new-product-service-ideas](./skills/generate-and-define-new-product-service-ideas) |
| 2.2.3 | Define product/service development requirements | [workflows/2-2-3-define-product-service-development-requirements.json](./workflows/2-2-3-define-product-service-development-requirements.json) | [skills/generate-and-define-new-product-service-ideas](./skills/generate-and-define-new-product-service-ideas) |
| 2.3.1 | Design and prototype products and services | [workflows/2-3-1-design-and-prototype-products-and-services.json](./workflows/2-3-1-design-and-prototype-products-and-services.json) | [skills/develop-products-and-services](./skills/develop-products-and-services) |
| 2.3.2 | Test market for new or revised products and services | [workflows/2-3-2-test-market-for-new-or-revised-products-and.json](./workflows/2-3-2-test-market-for-new-or-revised-products-and.json) | [skills/develop-products-and-services](./skills/develop-products-and-services) |
| 2.3.3 | Prepare for production/service delivery | [workflows/2-3-3-prepare-for-production-service-delivery.json](./workflows/2-3-3-prepare-for-production-service-delivery.json) | [skills/develop-products-and-services](./skills/develop-products-and-services) |
| 2.3.4 | Define warranty claims | [workflows/2-3-4-define-warranty-claims.json](./workflows/2-3-4-define-warranty-claims.json) | [skills/develop-products-and-services](./skills/develop-products-and-services) |
| 2.3.5 | Develop recall strategy | [workflows/2-3-5-develop-recall-strategy.json](./workflows/2-3-5-develop-recall-strategy.json) | [skills/develop-products-and-services](./skills/develop-products-and-services) |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
