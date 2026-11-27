---
type: knowledge
tags: [naive, skills, finance, apqc-9-5]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: process-payroll
description: >
  Prepare what the venture owes the people who work for it, for the finance
  agent: the hours, the agreed earnings and deductions, the pay run the founder
  approves and pays, and the payroll taxes with their deadlines. Load it for the
  three workflows of APQC 9.5 and whenever the founder asks "what does my first
  hire cost", "what do I owe in payroll tax" or "is this person an employee or a
  contractor".
process_group: "9.5"
---

# process-payroll

You collect hours, keep earnings and deductions current, prepare the pay run and the tax calendar, and show every calculation. The founder approves and makes every payment, agrees everyone's terms, and files every return. You never pay anyone, never change a person's terms and never contact a tax authority.

Most of this work does not exist for a venture with one founder and no payroll, so almost every step is one to consider. When the venture pays nobody for their time, say so on the handoff and run nothing.

## The processes

### 9.5.1 Report time

Runs `workflows/9-5-1-report-time.json`.

Hours come from the person who worked them or from the tool that recorded them, never from an estimate, because an estimated hour becomes a real payment. Collect first, then separate regular from overtime, then leave, then utilization, so each figure rests on the collected total. Report leave owed as well as leave taken: unused leave already earned is money the venture owes. Good evidence is a period where every person's total names its source and the missing ones are listed by name. The trap is quietly rounding a gap in a timesheet; list the gap instead and let the founder settle it.

The rules for recording time are the founder's to confirm, and so is every disputed hour.

### 9.5.2 Manage pay

Runs `workflows/9-5-2-manage-pay.json`.

Work in the order the figures depend on each other: hours into the run, then earnings from the signed agreement, then deductions, then the run itself. Show gross, each deduction and net separately for every person, and reconcile the run's total against what will actually leave the account in `money/[id]`. An off-cycle payment skips the checks the normal run does, so give it its own calculation and its own reason. Good evidence is a pay run where each net figure can be rebuilt from the hours, the rate and the deductions on record. The trap is a pay run prepared from last period's figures: a rate change, a new deduction or a leaver turns that into an overpayment that is hard to recover.

The founder approves the run, makes the payment, and answers anything about a person's own terms. You record what was paid once the statement shows it.

### 9.5.3 Manage and process payroll taxes

Runs `workflows/9-5-3-manage-and-process-payroll-taxes.json`.

List the taxes before the first payment, with the rate, the payee, the deadline and the form, and mark the ones the venture is not yet registered for, because registration usually takes longer than the first deadline allows. Put each deadline's amount into its month in `finance/budget/[id]` so the cash is there when the date comes. Amounts withheld from someone's pay are not the venture's money, and the clearest way to keep that true is to show the withheld total separately from the venture's own cash in every report. Good evidence is a calendar where each entry carries the form, the amount and the record the amount came from. The trap is spending withheld tax during a tight month; it is the single most expensive mistake available to a small venture.

The founder pays every tax, issues every annual statement, and files and signs every return.

## Records

Read: `people/team`, `people/founders`, `service-delivery/engagements`, `finance/budget/[id]`, `finance/spend/[id]`, `money/[id]`, `purpose/money/summary`, `legal/obligations`, `it/connections`.

Write: `money/[id]` for the balance after a pay run the statement shows, `finance/spend/[id]` for the pay and employer-tax cost of the period, `finance/budget/[id]` for the tax amount due in each month, `decisions/[id]` to raise a question, and `operations/handoff/[id]` for the hours, the pay run, the calculations and the returns.

Not built: Naive has no record for a timesheet, a pay run, a payslip, a person's earnings or deductions, a payroll tax filing or an employment agreement. The hours, the run and the tax workings all go on the handoff as evidence, and the people records the work reads are `people/team` and `people/founders`, which the human capital function owns.

## Standards

- Worker classification: whether someone is an employee or an independent contractor follows from how the work is controlled and not from what the agreement is called, and getting it wrong is assessed afterwards with back tax and penalties. In the United States the test is the Internal Revenue Service's and the Department of Labor's; the founder decides this with counsel or an accountant, never the agent.
- In the United States, the Fair Labor Standards Act (FLSA) sets minimum wage, overtime and record-keeping duties for covered non-exempt employees, which is why regular and overtime hours are separated.
- Amounts withheld from pay are held for a tax authority rather than owned by the venture. In the United States these are trust fund taxes, and failing to remit them carries a personal penalty for the responsible person.
- United States payroll forms a small venture meets first: Form W-4 for an employee's withholding, Form W-2 as the employee's annual statement, Form 1099-NEC for a contractor, and Form 941 as the quarterly federal payroll tax return. Which forms and deadlines apply depends on the jurisdiction, and the founder's accountant confirms them.
- Segregation of duties: the person who prepares a payment is not the person who approves it, which here is the agent preparing and the founder approving.

## What the person decides

- Whether to pay anyone at all, on what terms, and whether they are an employee or a contractor.
- Each person's rate, salary, bonus, commission and leave entitlement, and any change to them.
- The rules for recording time, and how a disputed or missing hour is settled.
- Whether to approve and pay each pay run and each off-cycle payment.
- Which payroll taxes to register for, and the payment and filing of every one.
