# service-delivery

Up: [functions](../README.md)

## What this is

The service delivery function (APQC 5.0, Deliver Services). Its governance side is service standards; its operations side is delivery runbooks and engagements. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The service delivery agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's services and engagements. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/weekly-engagement-review.json](./workflows/weekly-engagement-review.json) | Workflow: review every engagement each week |
| [skills/engagement-delivery](./skills/engagement-delivery) | Skill: run a client engagement from statement of work to close: acceptance criteria, change requests, margin and capacity, close review and productizing |
| [checklists/vault-and-tooling-consultancy-setup.md](./checklists/vault-and-tooling-consultancy-setup.md) | Vault + Tooling Consultancy Setup Checklist |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/service-delivery.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

## APQC processes

Every level 3 process of APQC category 5.0 (Deliver Services) has one workflow, named by its hierarchy id and carrying it in the workflow's `process` field, and every level 2 process group has one skill, named by its steps and carrying the group id in its frontmatter `process_group`. The names are APQC's own (PCF 8.0). Each of these workflows runs on request, after the founder has walked [workflows/intake.json](./workflows/intake.json) in a meeting.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 5.1.1 | Establish service delivery governance | [5-1-1-establish-service-delivery-governance.json](./workflows/5-1-1-establish-service-delivery-governance.json) | [establish-service-delivery-governance-and](./skills/establish-service-delivery-governance-and) |
| 5.1.2 | Develop service delivery strategies | [5-1-2-develop-service-delivery-strategies.json](./workflows/5-1-2-develop-service-delivery-strategies.json) | [establish-service-delivery-governance-and](./skills/establish-service-delivery-governance-and) |
| 5.2.1 | Manage service delivery resource demand | [5-2-1-manage-service-delivery-resource-demand.json](./workflows/5-2-1-manage-service-delivery-resource-demand.json) | [manage-service-delivery-resources](./skills/manage-service-delivery-resources) |
| 5.2.2 | Create and manage resource plan | [5-2-2-create-and-manage-resource-plan.json](./workflows/5-2-2-create-and-manage-resource-plan.json) | [manage-service-delivery-resources](./skills/manage-service-delivery-resources) |
| 5.2.3 | Enable service delivery resources | [5-2-3-enable-service-delivery-resources.json](./workflows/5-2-3-enable-service-delivery-resources.json) | [manage-service-delivery-resources](./skills/manage-service-delivery-resources) |
| 5.3.1 | Perform service delivery system planning | [5-3-1-perform-service-delivery-system-planning.json](./workflows/5-3-1-perform-service-delivery-system-planning.json) | [manage-and-operate-service-delivery-system](./skills/manage-and-operate-service-delivery-system) |
| 5.3.2 | Perform service delivery system startup | [5-3-2-perform-service-delivery-system-startup.json](./workflows/5-3-2-perform-service-delivery-system-startup.json) | [manage-and-operate-service-delivery-system](./skills/manage-and-operate-service-delivery-system) |
| 5.3.3 | Operate service delivery system | [5-3-3-operate-service-delivery-system.json](./workflows/5-3-3-operate-service-delivery-system.json) | [manage-and-operate-service-delivery-system](./skills/manage-and-operate-service-delivery-system) |
| 5.3.4 | Assure service delivery system service | [5-3-4-assure-service-delivery-system-service.json](./workflows/5-3-4-assure-service-delivery-system-service.json) | [manage-and-operate-service-delivery-system](./skills/manage-and-operate-service-delivery-system) |
| 5.4.1 | Initiate service delivery | [5-4-1-initiate-service-delivery.json](./workflows/5-4-1-initiate-service-delivery.json) | [deliver-service-to-customer](./skills/deliver-service-to-customer) |
| 5.4.2 | Execute service delivery | [5-4-2-execute-service-delivery.json](./workflows/5-4-2-execute-service-delivery.json) | [deliver-service-to-customer](./skills/deliver-service-to-customer) |
| 5.4.3 | Complete service delivery | [5-4-3-complete-service-delivery.json](./workflows/5-4-3-complete-service-delivery.json) | [deliver-service-to-customer](./skills/deliver-service-to-customer) |

A step of one of these workflows names the APQC level 4 activity it performs in its `activity` field. A step a venture in Discovery or Validation would not do carries a `consider` block with why and when, so it is optional; 5.2.3 is mostly such steps while the founder delivers alone.

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
