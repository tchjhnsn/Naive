---
type: knowledge
tags: [naive, skills, assets, apqc-10-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:50Z
source: hybrid
name: maintain-assets
process_group: "10.3"
description: >
  Keep the venture's equipment working: an approach per class of asset, a next
  service date on each item, jobs that are scheduled, resourced, checked and
  recorded, and faults that are either fixed or in front of the founder with
  their cost. Load it for the 10.3 workflows and when the founder asks "when is
  this due", "should we repair it or replace it", "is the warranty still good"
  or "why does this keep breaking".
---

# maintain-assets

You plan the maintenance, book it, check it and record it. The founder decides what is worth spending on a repair, what targets matter, and when an item should be replaced instead of maintained. You never commit money and never do work that needs a licence.

The question behind this whole group is what a day without the item costs the venture. Where that is nothing, running an item until it fails is the right policy and writing a service plan for it is waste. Where it is a day of delivery, a customer commitment or a lost recording, the service is cheap by comparison. Say which case each class of asset is in, and the rest of the work follows.

## The processes

### 10.3.1 Plan asset maintenance

Runs `workflows/10-3-1-plan-asset-maintenance.json`.

Go class by class, not item by item, and write the approach with its reason: run to failure, service on a calendar, or replace on a cycle. This is reliability-centered maintenance in its small form, which starts from what the loss of function costs rather than from a list of tasks a manual suggests.

Then predict from the register: age, use, warranty end, useful life and repair history give you the items likely to need work in the next twelve months. Put each service on a date that costs the work least and record the next service date in the item's note, because a plan that is not on a record is a plan that will be missed. Policies, resource planning and written work plans are steps to consider, and they earn their keep once the venture has equipment beyond computers and phones, or once someone other than the person who wrote the task will do it. The trap is a plan nobody has the hours, the parts or the budget for; check it against `finance/budget` before you call it a plan, and recommend to the finance lead what to drop.

### 10.3.2 Manage asset maintenance

Runs `workflows/10-3-2-manage-asset-maintenance.json`.

Group jobs that one visit can cover, and tell each custodian when their item goes away and what they use instead; a service nobody warned them about is a day of lost work. Before you book anything, check whether a warranty, a lease or a service plan already covers it, because paying for covered work is the commonest small waste in this process.

Check each finished job against its work plan and send it back when the check fails rather than closing it. Then update the item: status back to in-use, the date, the cost, the parts fitted and the next due date in its note, with the invoice named as evidence on the handoff. Targets are the founder's to set, so you bring the two or three worth measuring (days out of use, repeat failures on one item, cost per item per year) with the current figure from the records and ask. Where a supplier holds a service contract, report what it promised against what it delivered before the contract renews, which is the only moment that report is worth anything.

### 10.3.3 Perform asset maintenance

Runs `workflows/10-3-3-perform-asset-maintenance.json`.

Preventative work is what the plan said is due: for a computer the updates, the backup check and the battery health; for equipment the filters, belts, lubrication and calibration. Record the date, the result and the next due date on the item. Routine work (cleaning, consumables, checks) is recorded once per item for the period, because a separate job record for each wipe-down buries the real history.

Corrective and unplanned work is where the founder gets involved. Set the item's status to in-repair while it is away, record the cause, the cost and the days lost, and when a repair approaches about half of what a replacement costs, bring repair against replace as a `spend-money` decision and say that the half is a rule of thumb, not a law. When a fault stops work now and the item cannot be fixed or replaced quickly, tell the founder the same day so they can choose a way around it; silence is the failure mode here, not the fault.

Anything that is not safe for an untrained person (mains electrical work, lithium batteries, pressure or gas, work above head height, anything needing a licence) goes to a qualified supplier, and who did each job is recorded.

## Records

Read: `venture`, `assets/register`, `assets/leases`, `finance/budget`, `finance/spend`, `people`, `supply-chain/suppliers`, `decisions`.

Write: `assets/register/[id]` (status, custodian, cost, warranty end, useful life, and the next due date and job history in its note), `decisions/[id]`, and `operations/handoff/[id]` for the work plans, job records and evidence.

Not built: Naive has no record for a maintenance policy, a work order, a job history, a service contract or a maintenance target. Each lives on the handoff as evidence and, for anything the founder must settle, in the decision; the asset record carries the next due date and a short history in its note, which is what the schema allows.

## Standards

- ISO 55000 for asset management over an asset's whole life.
- Reliability-centered maintenance, which chooses a maintenance policy from the consequence of a function being lost rather than from the equipment's age alone.
- ASC 842 and IFRS 16 where a service plan comes bundled with a lease, so that the lease record and the maintenance plan agree.
- APQC Process Classification Framework 8.0, process group 10.3, for the order of this work.

## What the person decides

- Whether a repair is worth its cost, or the item should be replaced.
- Any maintenance spending, before it is committed.
- Which maintenance targets to set, and at what level.
- Whether to keep, renegotiate or cancel a service contract.
- Which open faults to fix now when there is not time or money for all of them.
