# assets

Up: [functions](../README.md)

## What this is

The assets and facilities function (APQC 10.0, Acquire, Construct, and Manage Assets). Its governance side is purchase approval; its operations side is equipment, property and leases. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The function's manifest: purpose, intake workflow, measures and capability clusters |
| [agent.md](./agent.md) | The assets agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's equipment and space. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/monthly-asset-review.json](./workflows/monthly-asset-review.json) | Workflow: review equipment custody and lease dates each month |
| [skills/asset-register](./skills/asset-register) | Skill: keep the asset register (`assets/register/[id]`): what to register, custody and disposal |
| [skills/lease-review](./skills/lease-review) | Skill: abstract a lease into `assets/leases/[id]`, flag hard-to-exit terms and raise notice dates in time |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/assets.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.

## APQC processes

One workflow per APQC level 3 process of this function's category (10.0, Acquire, Construct, and Manage Assets), named by its hierarchy id and carrying that id in its `process` field, and one skill per level 2 process group, which every step of that group's workflows names. They run on request, after the founder has walked [intake](./workflows/intake.json) in a meeting. APQC names are verbatim from the Process Classification Framework 8.0 (`packages/naive/src/functions/pcf.json`).

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 10.1.1 | Develop property strategy and long term vision | [10-1-1-develop-property-strategy-and-long-term-vision.json](./workflows/10-1-1-develop-property-strategy-and-long-term-vision.json) | [plan-and-acquire-assets](./skills/plan-and-acquire-assets) |
| 10.1.2 | Plan facility | [10-1-2-plan-facility.json](./workflows/10-1-2-plan-facility.json) | [plan-and-acquire-assets](./skills/plan-and-acquire-assets) |
| 10.1.3 | Provide workspace and facilities | [10-1-3-provide-workspace-and-facilities.json](./workflows/10-1-3-provide-workspace-and-facilities.json) | [plan-and-acquire-assets](./skills/plan-and-acquire-assets) |
| 10.1.4 | Manage facilities operations | [10-1-4-manage-facilities-operations.json](./workflows/10-1-4-manage-facilities-operations.json) | [plan-and-acquire-assets](./skills/plan-and-acquire-assets) |
| 10.2.1 | Manage capital program for assets | [10-2-1-manage-capital-program-for-assets.json](./workflows/10-2-1-manage-capital-program-for-assets.json) | [design-and-construct-assets](./skills/design-and-construct-assets) |
| 10.2.2 | Design and plan asset construction | [10-2-2-design-and-plan-asset-construction.json](./workflows/10-2-2-design-and-plan-asset-construction.json) | [design-and-construct-assets](./skills/design-and-construct-assets) |
| 10.2.3 | Schedule and perform construction work | [10-2-3-schedule-and-perform-construction-work.json](./workflows/10-2-3-schedule-and-perform-construction-work.json) | [design-and-construct-assets](./skills/design-and-construct-assets) |
| 10.2.4 | Manage asset construction | [10-2-4-manage-asset-construction.json](./workflows/10-2-4-manage-asset-construction.json) | [design-and-construct-assets](./skills/design-and-construct-assets) |
| 10.3.1 | Plan asset maintenance | [10-3-1-plan-asset-maintenance.json](./workflows/10-3-1-plan-asset-maintenance.json) | [maintain-assets](./skills/maintain-assets) |
| 10.3.2 | Manage asset maintenance | [10-3-2-manage-asset-maintenance.json](./workflows/10-3-2-manage-asset-maintenance.json) | [maintain-assets](./skills/maintain-assets) |
| 10.3.3 | Perform asset maintenance | [10-3-3-perform-asset-maintenance.json](./workflows/10-3-3-perform-asset-maintenance.json) | [maintain-assets](./skills/maintain-assets) |
| 10.4.1 | Develop exit strategy | [10-4-1-develop-exit-strategy.json](./workflows/10-4-1-develop-exit-strategy.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.2 | Decommission productive assets | [10-4-2-decommission-productive-assets.json](./workflows/10-4-2-decommission-productive-assets.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.3 | Perform sale or trade | [10-4-3-perform-sale-or-trade.json](./workflows/10-4-3-perform-sale-or-trade.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.4 | Manage take-back centers | [10-4-4-manage-take-back-centers.json](./workflows/10-4-4-manage-take-back-centers.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.5 | Dismantle assets | [10-4-5-dismantle-assets.json](./workflows/10-4-5-dismantle-assets.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.6 | Track parts | [10-4-6-track-parts.json](./workflows/10-4-6-track-parts.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.7 | Recycle parts | [10-4-7-recycle-parts.json](./workflows/10-4-7-recycle-parts.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.8 | Ship hazardous material | [10-4-8-ship-hazardous-material.json](./workflows/10-4-8-ship-hazardous-material.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.9 | Provide government reporting | [10-4-9-provide-government-reporting.json](./workflows/10-4-9-provide-government-reporting.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.10 | Perform abandonment | [10-4-10-perform-abandonment.json](./workflows/10-4-10-perform-abandonment.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
| 10.4.11 | Perform waste and hazardous goods management | [10-4-11-perform-waste-and-hazardous-goods-management.json](./workflows/10-4-11-perform-waste-and-hazardous-goods-management.json) | [manage-asset-end-of-life](./skills/manage-asset-end-of-life) |
