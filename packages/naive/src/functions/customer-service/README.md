# customer-service

Up: [functions](../README.md)

## What this is

The customer service function (APQC 6.0, Manage Customer Service). Its governance side is support policies and refunds authority; its operations side is support channels, help content, customer feedback. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The customer service agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn how the venture supports its customers. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/case-triage.json](./workflows/case-triage.json) | Workflow: triage each new support case |
| [workflows/weekly-contact-review.json](./workflows/weekly-contact-review.json) | Workflow: review contact reasons and response times each week |
| [skills/support-triage](./skills/support-triage) | Skill: classify a contact (ISO 10002 for complaints), escalate what a person must decide, draft the reply, and count contact reasons so causes are removed |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/customer-service.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.

## APQC processes

Every level 3 process of APQC category 6.0, Manage Customer Service, has one workflow named by its hierarchy id, which names the process in its `process` field and runs on request once the founder has walked [the intake](./workflows/intake.json) in a meeting. Each process group has one skill, which every step of its workflows loads.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| **6.1** | **Develop customer service strategy** | | [develop-customer-service-strategy](./skills/develop-customer-service-strategy) |
| 6.1.1 | Define customer service requirements across the enterprise | [6-1-1-define-customer-service-requirements-across-the.json](./workflows/6-1-1-define-customer-service-requirements-across-the.json) | `develop-customer-service-strategy` |
| 6.1.2 | Define customer service experience | [6-1-2-define-customer-service-experience.json](./workflows/6-1-2-define-customer-service-experience.json) | `develop-customer-service-strategy` |
| 6.1.3 | Define and manage customer service channel strategy | [6-1-3-define-and-manage-customer-service-channel.json](./workflows/6-1-3-define-and-manage-customer-service-channel.json) | `develop-customer-service-strategy` |
| 6.1.4 | Define customer service policies and procedures | [6-1-4-define-customer-service-policies-and-procedures.json](./workflows/6-1-4-define-customer-service-policies-and-procedures.json) | `develop-customer-service-strategy` |
| 6.1.5 | Establish target service level for each customer segment | [6-1-5-establish-target-service-level-for-each-customer.json](./workflows/6-1-5-establish-target-service-level-for-each-customer.json) | `develop-customer-service-strategy` |
| 6.1.6 | Identify and define customer service strategy integrations | [6-1-6-identify-and-define-customer-service-strategy.json](./workflows/6-1-6-identify-and-define-customer-service-strategy.json) | `develop-customer-service-strategy` |
| **6.2** | **Plan and manage customer service contacts** | | [plan-and-manage-customer-service-contacts](./skills/plan-and-manage-customer-service-contacts) |
| 6.2.1 | Plan and manage customer service work force | [6-2-1-plan-and-manage-customer-service-work-force.json](./workflows/6-2-1-plan-and-manage-customer-service-work-force.json) | `plan-and-manage-customer-service-contacts` |
| 6.2.2 | Manage customer service problems, requests, and inquiries | [6-2-2-manage-customer-service-problems-requests-and.json](./workflows/6-2-2-manage-customer-service-problems-requests-and.json) | `plan-and-manage-customer-service-contacts` |
| 6.2.3 | Manage customer complaints | [6-2-3-manage-customer-complaints.json](./workflows/6-2-3-manage-customer-complaints.json) | `plan-and-manage-customer-service-contacts` |
| 6.2.4 | Process returns | [6-2-4-process-returns.json](./workflows/6-2-4-process-returns.json) | `plan-and-manage-customer-service-contacts` |
| 6.2.5 | Report incidents and risks to regulatory bodies | [6-2-5-report-incidents-and-risks-to-regulatory-bodies.json](./workflows/6-2-5-report-incidents-and-risks-to-regulatory-bodies.json) | `plan-and-manage-customer-service-contacts` |
| **6.3** | **Service products after sales** | | [service-products-after-sales](./skills/service-products-after-sales) |
| 6.3.1 | Register products | [6-3-1-register-products.json](./workflows/6-3-1-register-products.json) | `service-products-after-sales` |
| 6.3.2 | Process warranty claims | [6-3-2-process-warranty-claims.json](./workflows/6-3-2-process-warranty-claims.json) | `service-products-after-sales` |
| 6.3.3 | Manage supplier recovery | [6-3-3-manage-supplier-recovery.json](./workflows/6-3-3-manage-supplier-recovery.json) | `service-products-after-sales` |
| 6.3.4 | Service products | [6-3-4-service-products.json](./workflows/6-3-4-service-products.json) | `service-products-after-sales` |
| **6.4** | **Manage product recalls and regulatory audits** | | [manage-product-recalls-and-regulatory-audits](./skills/manage-product-recalls-and-regulatory-audits) |
| 6.4.1 | Initiate recall | [6-4-1-initiate-recall.json](./workflows/6-4-1-initiate-recall.json) | `manage-product-recalls-and-regulatory-audits` |
| 6.4.2 | Assess the likelihood and consequences of occurrence of any hazards | [6-4-2-assess-the-likelihood-and-consequences-of.json](./workflows/6-4-2-assess-the-likelihood-and-consequences-of.json) | `manage-product-recalls-and-regulatory-audits` |
| 6.4.3 | Manage recall related communications | [6-4-3-manage-recall-related-communications.json](./workflows/6-4-3-manage-recall-related-communications.json) | `manage-product-recalls-and-regulatory-audits` |
| 6.4.4 | Submit regulatory reports | [6-4-4-submit-regulatory-reports.json](./workflows/6-4-4-submit-regulatory-reports.json) | `manage-product-recalls-and-regulatory-audits` |
| 6.4.5 | Monitor and audit recall effectiveness | [6-4-5-monitor-and-audit-recall-effectiveness.json](./workflows/6-4-5-monitor-and-audit-recall-effectiveness.json) | `manage-product-recalls-and-regulatory-audits` |
| 6.4.6 | Manage recall termination | [6-4-6-manage-recall-termination.json](./workflows/6-4-6-manage-recall-termination.json) | `manage-product-recalls-and-regulatory-audits` |
| **6.5** | **Evaluate customer service operations and customer satisfaction** | | [evaluate-customer-service-operations-and-customer](./skills/evaluate-customer-service-operations-and-customer) |
| 6.5.1 | Measure customer satisfaction with customer problems, requests, and inquiries handling | [6-5-1-measure-customer-satisfaction-with-customer.json](./workflows/6-5-1-measure-customer-satisfaction-with-customer.json) | `evaluate-customer-service-operations-and-customer` |
| 6.5.2 | Measure customer satisfaction with customer- complaint handling and resolution | [6-5-2-measure-customer-satisfaction-with-customer.json](./workflows/6-5-2-measure-customer-satisfaction-with-customer.json) | `evaluate-customer-service-operations-and-customer` |
| 6.5.3 | Measure customer satisfaction with products and services | [6-5-3-measure-customer-satisfaction-with-products-and.json](./workflows/6-5-3-measure-customer-satisfaction-with-products-and.json) | `evaluate-customer-service-operations-and-customer` |
| 6.5.4 | Evaluate and manage warranty performance | [6-5-4-evaluate-and-manage-warranty-performance.json](./workflows/6-5-4-evaluate-and-manage-warranty-performance.json) | `evaluate-customer-service-operations-and-customer` |
| 6.5.5 | Evaluate recall performance | [6-5-5-evaluate-recall-performance.json](./workflows/6-5-5-evaluate-recall-performance.json) | `evaluate-customer-service-operations-and-customer` |
