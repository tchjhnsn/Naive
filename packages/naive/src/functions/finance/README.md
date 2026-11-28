# finance

Up: [functions](../README.md)

## What this is

The finance and accounting function (APQC 9.0, Manage Financial Resources). Its governance side is spending authority, controls and audit; its operations side is books, invoices, budgets and tax. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The finance agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn the venture's money. Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). Every step that writes the money summary sets `source` to `records` and `as_of`, and leaves `synced_at` out, which only a sync sets. |
| [workflows/monthly-spend-review.json](./workflows/monthly-spend-review.json) | Workflow: review spend against the budget and runway each month |
| [skills/budget-and-runway](./skills/budget-and-runway) | Skill: draft and keep the budget (`finance/budget/[id]`), each line citing its source, and project runway from it |
| [skills/equity-and-share-classes](./skills/equity-and-share-classes) | Skill: Help a founder decide how ownership is counted and which share types to have, and when: common, preferred, super-voting (dual-class), non-voting, LLC units, the employee  |
| [skills/exit-planning](./skills/exit-planning) | Skill: Help a founder decide which ways the venture might end it should keep open (acquisition, IPO, secondary sales, merger, management buyout, wind-down, or hold) and see what |
| [skills/financing-and-investor-rights](./skills/financing-and-investor-rights) | Skill: Help a founder decide whether and how to take outside money and what rights investors get in return: bootstrapping, grants, debt, SAFEs, convertible notes and priced roun |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/finance.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.

## APQC processes

Every level 3 process of APQC category 9.0, Manage Financial Resources, has one workflow named by its hierarchy id, which the workflow carries in its `process` field, and every level 2 process group has one skill that the group's workflows name in their steps (`node packages/naive/src/checks/check-pcf-coverage.ts --function finance`). Each of these workflows is triggered on request and requires the finance intake to have been walked in a meeting first.

| Process | APQC name | Workflow | Skill |
|---|---|---|---|
| 9.1.1 | Develop and manage financial resources strategy | [9-1-1-develop-and-manage-financial-resources-strategy.json](./workflows/9-1-1-develop-and-manage-financial-resources-strategy.json) | [perform-planning-and-management-accounting](./skills/perform-planning-and-management-accounting) |
| 9.1.2 | Perform planning/budgeting/forecasting | [9-1-2-perform-planning-budgeting-forecasting.json](./workflows/9-1-2-perform-planning-budgeting-forecasting.json) | [perform-planning-and-management-accounting](./skills/perform-planning-and-management-accounting) |
| 9.1.3 | Perform cost accounting and control | [9-1-3-perform-cost-accounting-and-control.json](./workflows/9-1-3-perform-cost-accounting-and-control.json) | [perform-planning-and-management-accounting](./skills/perform-planning-and-management-accounting) |
| 9.1.4 | Perform cost management | [9-1-4-perform-cost-management.json](./workflows/9-1-4-perform-cost-management.json) | [perform-planning-and-management-accounting](./skills/perform-planning-and-management-accounting) |
| 9.1.5 | Evaluate and manage financial performance | [9-1-5-evaluate-and-manage-financial-performance.json](./workflows/9-1-5-evaluate-and-manage-financial-performance.json) | [perform-planning-and-management-accounting](./skills/perform-planning-and-management-accounting) |
| 9.2.1 | Process customer credit | [9-2-1-process-customer-credit.json](./workflows/9-2-1-process-customer-credit.json) | [perform-revenue-accounting](./skills/perform-revenue-accounting) |
| 9.2.2 | Invoice customer | [9-2-2-invoice-customer.json](./workflows/9-2-2-invoice-customer.json) | [perform-revenue-accounting](./skills/perform-revenue-accounting) |
| 9.2.3 | Process accounts receivable (AR) | [9-2-3-process-accounts-receivable-ar.json](./workflows/9-2-3-process-accounts-receivable-ar.json) | [perform-revenue-accounting](./skills/perform-revenue-accounting) |
| 9.2.4 | Manage and process collections | [9-2-4-manage-and-process-collections.json](./workflows/9-2-4-manage-and-process-collections.json) | [perform-revenue-accounting](./skills/perform-revenue-accounting) |
| 9.2.5 | Manage and process adjustments/deductions | [9-2-5-manage-and-process-adjustments-deductions.json](./workflows/9-2-5-manage-and-process-adjustments-deductions.json) | [perform-revenue-accounting](./skills/perform-revenue-accounting) |
| 9.3.1 | Manage financial policies and procedures | [9-3-1-manage-financial-policies-and-procedures.json](./workflows/9-3-1-manage-financial-policies-and-procedures.json) | [perform-general-accounting-and-reporting](./skills/perform-general-accounting-and-reporting) |
| 9.3.2 | Perform general accounting | [9-3-2-perform-general-accounting.json](./workflows/9-3-2-perform-general-accounting.json) | [perform-general-accounting-and-reporting](./skills/perform-general-accounting-and-reporting) |
| 9.3.3 | Perform fixed-asset accounting | [9-3-3-perform-fixed-asset-accounting.json](./workflows/9-3-3-perform-fixed-asset-accounting.json) | [perform-general-accounting-and-reporting](./skills/perform-general-accounting-and-reporting) |
| 9.3.4 | Perform financial reporting | [9-3-4-perform-financial-reporting.json](./workflows/9-3-4-perform-financial-reporting.json) | [perform-general-accounting-and-reporting](./skills/perform-general-accounting-and-reporting) |
| 9.4.1 | Perform capital planning and project approval | [9-4-1-perform-capital-planning-and-project-approval.json](./workflows/9-4-1-perform-capital-planning-and-project-approval.json) | [manage-fixed-asset-project-accounting](./skills/manage-fixed-asset-project-accounting) |
| 9.4.2 | Perform capital project accounting | [9-4-2-perform-capital-project-accounting.json](./workflows/9-4-2-perform-capital-project-accounting.json) | [manage-fixed-asset-project-accounting](./skills/manage-fixed-asset-project-accounting) |
| 9.5.1 | Report time | [9-5-1-report-time.json](./workflows/9-5-1-report-time.json) | [process-payroll](./skills/process-payroll) |
| 9.5.2 | Manage pay | [9-5-2-manage-pay.json](./workflows/9-5-2-manage-pay.json) | [process-payroll](./skills/process-payroll) |
| 9.5.3 | Manage and process payroll taxes | [9-5-3-manage-and-process-payroll-taxes.json](./workflows/9-5-3-manage-and-process-payroll-taxes.json) | [process-payroll](./skills/process-payroll) |
| 9.6.1 | Process accounts payable (AP) | [9-6-1-process-accounts-payable-ap.json](./workflows/9-6-1-process-accounts-payable-ap.json) | [process-accounts-payable-and-expense](./skills/process-accounts-payable-and-expense) |
| 9.6.2 | Process expense reimbursements | [9-6-2-process-expense-reimbursements.json](./workflows/9-6-2-process-expense-reimbursements.json) | [process-accounts-payable-and-expense](./skills/process-accounts-payable-and-expense) |
| 9.6.3 | Manage corporate credit cards | [9-6-3-manage-corporate-credit-cards.json](./workflows/9-6-3-manage-corporate-credit-cards.json) | [process-accounts-payable-and-expense](./skills/process-accounts-payable-and-expense) |
| 9.7.1 | Manage treasury policies and procedures | [9-7-1-manage-treasury-policies-and-procedures.json](./workflows/9-7-1-manage-treasury-policies-and-procedures.json) | [manage-treasury-operations](./skills/manage-treasury-operations) |
| 9.7.2 | Manage cash | [9-7-2-manage-cash.json](./workflows/9-7-2-manage-cash.json) | [manage-treasury-operations](./skills/manage-treasury-operations) |
| 9.7.3 | Manage in-house bank accounts | [9-7-3-manage-in-house-bank-accounts.json](./workflows/9-7-3-manage-in-house-bank-accounts.json) | [manage-treasury-operations](./skills/manage-treasury-operations) |
| 9.7.4 | Manage debt and investment | [9-7-4-manage-debt-and-investment.json](./workflows/9-7-4-manage-debt-and-investment.json) | [manage-treasury-operations](./skills/manage-treasury-operations) |
| 9.7.5 | Monitor and execute risk and hedging transactions | [9-7-5-monitor-and-execute-risk-and-hedging-transactions.json](./workflows/9-7-5-monitor-and-execute-risk-and-hedging-transactions.json) | [manage-treasury-operations](./skills/manage-treasury-operations) |
| 9.7.6 | Manage financial fraud/dispute cases | [9-7-6-manage-financial-fraud-dispute-cases.json](./workflows/9-7-6-manage-financial-fraud-dispute-cases.json) | [manage-treasury-operations](./skills/manage-treasury-operations) |
| 9.8.1 | Establish internal controls, policies, and procedures | [9-8-1-establish-internal-controls-policies-and.json](./workflows/9-8-1-establish-internal-controls-policies-and.json) | [manage-internal-controls](./skills/manage-internal-controls) |
| 9.8.2 | Operate controls and monitor compliance with internal controls policies and procedures | [9-8-2-operate-controls-and-monitor-compliance-with.json](./workflows/9-8-2-operate-controls-and-monitor-compliance-with.json) | [manage-internal-controls](./skills/manage-internal-controls) |
| 9.8.3 | Report on internal controls compliance | [9-8-3-report-on-internal-controls-compliance.json](./workflows/9-8-3-report-on-internal-controls-compliance.json) | [manage-internal-controls](./skills/manage-internal-controls) |
| 9.9.1 | Develop tax strategy and plan | [9-9-1-develop-tax-strategy-and-plan.json](./workflows/9-9-1-develop-tax-strategy-and-plan.json) | [manage-taxes](./skills/manage-taxes) |
| 9.9.2 | Process taxes | [9-9-2-process-taxes.json](./workflows/9-9-2-process-taxes.json) | [manage-taxes](./skills/manage-taxes) |
| 9.10.1 | Monitor international rates | [9-10-1-monitor-international-rates.json](./workflows/9-10-1-monitor-international-rates.json) | [manage-international-funds-consolidation](./skills/manage-international-funds-consolidation) |
| 9.10.2 | Manage transactions | [9-10-2-manage-transactions.json](./workflows/9-10-2-manage-transactions.json) | [manage-international-funds-consolidation](./skills/manage-international-funds-consolidation) |
| 9.10.3 | Monitor currency exposure/hedge currency | [9-10-3-monitor-currency-exposure-hedge-currency.json](./workflows/9-10-3-monitor-currency-exposure-hedge-currency.json) | [manage-international-funds-consolidation](./skills/manage-international-funds-consolidation) |
| 9.10.4 | Report results | [9-10-4-report-results.json](./workflows/9-10-4-report-results.json) | [manage-international-funds-consolidation](./skills/manage-international-funds-consolidation) |
| 9.11.1 | Screen sanctioned party list | [9-11-1-screen-sanctioned-party-list.json](./workflows/9-11-1-screen-sanctioned-party-list.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.2 | Control exports and imports | [9-11-2-control-exports-and-imports.json](./workflows/9-11-2-control-exports-and-imports.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.3 | Classify products | [9-11-3-classify-products.json](./workflows/9-11-3-classify-products.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.4 | Perform currency conversion | [9-11-4-perform-currency-conversion.json](./workflows/9-11-4-perform-currency-conversion.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.5 | Calculate duty | [9-11-5-calculate-duty.json](./workflows/9-11-5-calculate-duty.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.6 | Communicate with customs | [9-11-6-communicate-with-customs.json](./workflows/9-11-6-communicate-with-customs.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.7 | Document trade | [9-11-7-document-trade.json](./workflows/9-11-7-document-trade.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.8 | Process trade preferences | [9-11-8-process-trade-preferences.json](./workflows/9-11-8-process-trade-preferences.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.9 | Handle restitution | [9-11-9-handle-restitution.json](./workflows/9-11-9-handle-restitution.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
| 9.11.10 | Prepare letter of credit | [9-11-10-prepare-letter-of-credit.json](./workflows/9-11-10-prepare-letter-of-credit.json) | [perform-global-trade-services](./skills/perform-global-trade-services) |
