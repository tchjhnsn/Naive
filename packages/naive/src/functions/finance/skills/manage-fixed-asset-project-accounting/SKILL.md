---
type: knowledge
tags: [naive, skills, finance, apqc-9-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: manage-fixed-asset-project-accounting
process_group: "9.4"
description: >
  Decide and account for the venture's larger one-off spends for the finance
  agent: the rule that tells an investment from a cost, the case for each
  proposed project, its own budget category, and what it actually cost against
  what was approved. Load it for the two workflows of APQC 9.4 and whenever the
  founder asks "can we afford this", "how long until this pays for itself" or
  "what did that project really cost".
---

# manage-fixed-asset-project-accounting

You build the case, keep the project's costs apart from the running costs and measure the payback afterwards. The founder approves every project and every purchase, because it is their cash and their commitment. You never commit money, place an order or sign anything.

## The processes

### 9.4.1 Perform capital planning and project approval

Runs `workflows/9-4-1-perform-capital-planning-and-project-approval.json`.

Write the rule before the first proposal: the amount, the minimum useful life, the evidence a proposal must carry and the payback the venture will accept. Then cost each project in full, not just the purchase price, and include what it will cost to run, support and eventually replace. Put the investment lines in `finance/budget/[id]` as their own category so they never hide inside the month's running costs, and always show what runway looks like with and without the project. Name the one assumption that carries the case, because that is the thing a reviewer should attack. Good evidence is a payback figure built from amounts that already appear in `finance/spend/[id]` or a quoted price, not from a percentage. The trap is comparing a project only against doing it: waiting and doing nothing are both options, and the case has to beat them.

Approving a project is the founder's alone. The agent prepares the case, records the decision and stops there.

### 9.4.2 Perform capital project accounting

Runs `workflows/9-4-2-perform-capital-project-accounting.json`.

Give the project its own category in `finance/spend/[id]` the day it is approved, so its costs can be totalled later. Record commitments as well as invoices, because an ordered but unbilled amount is already spent for the purpose of knowing how much is left. Watch the remaining amount against the remaining work, not against the calendar: a project half spent and a tenth done is already over. On close, separate the part that became an asset from the part that was a cost of the period, and prepare the entry rather than writing the asset register yourself. Good evidence is a project total that equals the sum of its documents. The trap is never closing a project, which leaves it absorbing costs that belong to the running business.

The founder decides what to do about a project heading past its approved amount: stop, fund more or change the scope. Every step here is one to consider, because a venture with no approved project has nothing to account for.

## Records

Read: `finance/budget/[id]`, `finance/spend/[id]`, `money/[id]`, `purpose/money/summary`, `assets/register`, `assets/leases`, `supply-chain/purchase-orders`, `product/[id]`, `foundation/goals`.

Write: `finance/budget/[id]` for the investment lines, `finance/spend/[id]` for each project's category and the costs charged to it, `decisions/[id]` to put a project or an overrun in front of the founder, and `operations/handoff/[id]` for the investment rule, each project's case and the close-out and payback workings.

Not built: Naive has no record for a capital project, a project approval or a project's cost-to-date, and the finance agent does not write `assets/register`, which the assets function owns. A project lives as its own spend category plus the case and the close-out on the handoff, and the entry that capitalizes it is prepared for the founder or the bookkeeper to post.

## Standards

- Capital budgeting appraisal: payback period, net present value (NPV) and internal rate of return (IRR). For a venture whose cash is short, payback and the effect on runway decide more than NPV does, and the discount rate NPV needs is a judgment the founder makes.
- Discounted cash flow, the method behind NPV, which requires a stated rate and stated cash flows rather than a single figure.
- Whole-life or life-cycle cost, which counts acquisition, operation, support and disposal rather than purchase price alone.
- Sunk cost: money already spent is never a reason to continue, which is the test to apply to a project heading past its amount.
- An asset is capitalized and begins to depreciate when it is placed in service, which is why the close step separates the asset from the period cost.

## What the person decides

- The amount, the minimum life and the payback the venture will accept before a purchase counts as an investment.
- Whether each proposed project or asset purchase goes ahead, waits or is refused.
- Whether to stop, fund more or change the scope of a project heading past its approved amount.
- When a project is finished, and whether what it produced is an asset the venture keeps.
