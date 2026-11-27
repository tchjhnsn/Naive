---
type: knowledge
tags: [naive, skills, assets, apqc-10-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:50Z
source: hybrid
name: design-and-construct-assets
process_group: "10.2"
description: >
  Plan, pay for and run the work that builds or fits out an asset: one list of
  planned purchases with the goal behind each, a specification and the
  permissions it needs, a schedule built on real lead times, and a register
  entry for every asset the work leaves behind. Load it for the 10.2 workflows
  and when the founder asks "what equipment do we need this year", "can we
  afford to build this", "do we need a permit" or "is this finished".
---

# design-and-construct-assets

You plan, cost, schedule, inspect and record. The founder approves the plan, places every order, signs every permission and makes the final payment. Nothing is bought or built on your say.

Most ventures that use this group are not building a factory. They are fitting out a studio, wiring a workshop, assembling a rig or buying a year of equipment in order. The value of the group at that size is the same as at any size: the cost is known before the work starts, the permissions are in hand, and the thing that was built ends up on the register instead of in somebody's memory.

## The processes

### 10.2.1 Manage capital program for assets

Runs `workflows/10-2-1-manage-capital-program-for-assets.json`.

Build one list, not a list per conversation. Each line names what it is, what it costs, the month it is needed and the goal in `foundation/goals` it serves. A line that serves no live goal does not belong in the plan, and saying so is most of the work. Take the replacement candidates from the register itself (useful life passed, warranty ended, repair history) rather than from whoever complained most recently.

Monitoring the plan means comparing it with `finance/spend` line by line, so good evidence is a figure traced to a spend record, never a recollection. Where a line costs more than the cash the budget leaves, put cash, equipment finance, a lease, buying used, renting and deferring side by side with their total cost and what each commits the venture to; equipment finance often asks a founder to guarantee it, which makes it a `legal-or-terms` decision as well as a `spend-money` one. Ordering the plan when runway is short is a `set-priorities` recommendation for the finance lead.

### 10.2.2 Design and plan asset construction

Runs `workflows/10-2-2-design-and-plan-asset-construction.json`.

Order matters here: strategy, then how progress will be judged, then permissions, then the specification, then resources. Setting the milestones and their tests before the work starts is what keeps a build from being judged only when it is too late to change, and it is why payment should follow milestones rather than dates.

Permissions are the step that most often stops a small venture mid-build: the landlord's written consent, a building or electrical permit, an inspection, an insurance endorsement. List each one with what it takes and how long it usually takes, draft the applications, and hand every signature to the founder. On the specification, name every assumption a licensed professional has to check before anyone builds to it; you are not an engineer, and writing a load, a circuit or a ventilation figure as if you were is the trap. Lead times are the other one: a build is usually late because of one long lead time nobody checked.

### 10.2.3 Schedule and perform construction work

Runs `workflows/10-2-3-schedule-and-perform-construction-work.json`.

Schedule against what cannot move (access hours, inspection slots, delivery dates) and keep the dates current as pieces finish, so the schedule stays a tool instead of becoming a record of what was hoped. Orders go to the supply chain function as a handoff with the part, the quantity and the date needed, and every purchase waits for the founder.

The recording discipline is the point of this process. A new asset gets its own register entry with cost, date, useful life and where its documents are kept. Work that extends an asset the venture already has is added to that item's record, never as a second entry for the same machine, and whether the spend is capitalized is finance's answer, not yours. A replacement closes the old item with its disposal, and a device that holds data is wiped only after the founder has decided, because the data does not come back.

### 10.2.4 Manage asset construction

Runs `workflows/10-2-4-manage-asset-construction.json`.

Compare at each milestone, not at the end, and flag work nobody approved the moment you see it. Quality control means a defect list with a location, a breach and an owner for each line, and the final payment question stays with the founder until that list is closed.

Commissioning is what separates built from working: schedule the checks that prove the asset does what the specification says, record each result with its date and witness, and set the item's status to in-use only when they pass. Site safety and access while work runs (who may be there, what they must hold, who has the keys) goes to risk and compliance as a handoff where the lease or the insurer requires something the venture does not have.

## Records

Read: `venture`, `assets/register`, `assets/leases`, `finance/budget`, `finance/spend`, `foundation/goals`, `people`, `people/team-plan`, `product`, `legal/risks`, `supply-chain/suppliers`, `supply-chain/purchase-orders`, `decisions`.

Write: `assets/register/[id]` for every asset the work creates, extends or replaces, `decisions/[id]`, and `operations/handoff/[id]` for progress and evidence.

Not built: Naive has no record for a capital plan, a construction schedule, a work order, a milestone, a defect list, a permission or a commissioning result. Each of those goes on the handoff as evidence and into the decision it serves, and the asset record carries only what its schema holds (cost, dates, warranty, useful life, status and a note). Purchase orders belong to the supply chain function, so an order is a handoff to it rather than a record you write.

## Standards

- ISO 55000 for judging an asset over its whole life rather than at its purchase price.
- ASC 842 and IFRS 16 where the equipment is financed or leased rather than bought.
- APQC Process Classification Framework 8.0, process group 10.2, for the order of this work.

## What the person decides

- The asset purchase plan, and which lines survive when runway is short.
- How any purchase or build larger than available cash is paid for, including financing a founder must guarantee.
- Every order, before it is placed, and the final payment.
- Every permission, consent and insurance endorsement that must be signed or filed.
- Any change that takes the work past its approved cost.
- The wipe of a device that holds data when an asset is replaced.
