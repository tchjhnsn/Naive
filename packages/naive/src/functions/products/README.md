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
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's products. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/weekly-product-review.json](./workflows/weekly-product-review.json) | Workflow: review discovery, bugs and the next build each week |
| [skills/four-risks-review](./skills/four-risks-review) | Skill: check a product or a build for evidence on the four risks (value, usability, feasibility, viability), weekly customer touchpoints and the product-market fit survey |
| [frameworks/product-anatomy](./frameworks/product-anatomy) | Product Anatomy Matrix: fix the venture's core product first, judge every product against it with typed questions (Jev plus a reasoning model), then deduce each product's |
| [sdlc/README.md](./sdlc/README.md) | SDLC catalog |
| [sdlc/catalog.json](./sdlc/catalog.json) | A record |
| [skills/product-pillar](./skills/product-pillar) | Skill: Provide Product pillar context: teams, roles, Tier 1 + Tier 2 deliverables, cross-pillar overlap zones: when working on product-pillar work. |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/products.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
