---
type: knowledge
tags: [naive, skills, finance, apqc-9-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: perform-planning-and-management-accounting
process_group: "9.1"
description: >
  Plan, budget, forecast and cost the venture's money for the finance agent:
  what the money must pay for, what the next twelve months look like by category
  and month, what it costs to serve one customer, which costs are worth keeping,
  and which customers and products actually pay. Load it for the five workflows
  of APQC 9.1 and whenever the founder asks "how long does the money last", "what
  does a customer cost us", "can we afford this" or "which product makes money".
---

# perform-planning-and-management-accounting

You read the records, build the numbers and say where each one came from. The founder decides what the venture spends, what it charges, what it sells and whether to take outside money. A number you cannot trace to a record is an assumption, and you mark it one.

## The processes

### 9.1.1 Develop and manage financial resources strategy

Runs `workflows/9-1-1-develop-and-manage-financial-resources-strategy.json`.

Start at the end, not at the money: read the telos and the goals first and write what the money has to pay for over the next four quarters, with the date each goal needs it. Only then state the position from the records, and rewrite `purpose/money/summary` so cash, burn, revenue and runway are current. Lay the funding routes side by side on the same four columns, cost, commitment, time to land and effect on runway, so they can be compared at all. Good evidence here is a position where every figure names the account or spend entry behind it and a route list where the time to land comes from something that has happened, not from hope. The trap is writing a strategy that is really a wish list: a plan with no stated position is a plan nobody can act on.

The last step goes to the founder. Taking debt, taking equity or giving up control is a commitment nobody else can make, so you bring the options and the recommendation and they choose. `financing-and-investor-rights` and `equity-and-share-classes` carry the detail on what each kind of money costs in rights.

### 9.1.2 Perform planning/budgeting/forecasting

Runs `workflows/9-1-2-perform-planning-budgeting-forecasting.json`.

Write the rules before the numbers: the categories, the record each line must cite, the revision cadence and the amount above which a cost needs approval. Then build the budget from the bottom, one line per category and month, costs from `finance/spend/[id]` and revenue from `deals/[id]` and `validation/pricing`. Keep the budget and the forecast apart in your head: the budget is what the venture intends, the forecast is what it now expects, and the forecast is the one that is rebuilt every period and drives runway in `purpose/money/summary`. Revise future months from the facts and leave past months as they were planned, or the variance disappears and with it the only signal that the plan was wrong. Good evidence is a line that cites its record and an assumption that says what would show it wrong. The trap is a budget built from a percentage of last period: it carries forward every cost nobody has questioned.

The founder sets the approval amount in the first step and decides every cut the variance step turns up. You never cancel or downgrade anything yourself.

### 9.1.3 Perform cost accounting and control

Runs `workflows/9-1-3-perform-cost-accounting-and-control.json`.

Work from the spend register outward. Separate the costs that exist only because of a product or a customer from the ones the venture would pay anyway, and state the basis on which you split anything shared, because an unstated basis makes every downstream figure unarguable. Cost of sales comes before product costing and product costing before margin, so each figure rests on the one before it. Compare periods at the end, not at the start, and explain each move of more than ten percent by the entries that caused it. Good evidence is a cost per customer that can be added back up to the total in the register. The trap is counting a founder's own unpaid time as free: say that labour is unpriced rather than implying the cost is zero.

Inventory and profit-centre accounting are steps to consider, because a venture with no stock and one product has neither. The founder decides what to do about a negative margin; you only report it.

### 9.1.4 Perform cost management

Runs `workflows/9-1-4-perform-cost-management.json`.

A cost you cannot attach to a driver is a cost nobody controls, so name the driver first, one per entry in `finance/spend/[id]`, and mark the fixed ones as fixed. Measure each driver from a source outside the invoice where you can, the connection in `it/connections` or a usage report, and record the rate per unit on the spend entry so the next run can compare it. Read `operations/activity-briefing/finance` beside the register to tell the activities a live goal depends on from the ones that only continue out of habit. Good evidence is a measured rate with its source and date. The trap is cutting the cheapest costs because they are easiest: rank by what the saving does to runway, not by the size of the bill.

Every cancellation, downgrade and payment-method change is the founder's, raised as a decision with the saving and the evidence. You do not cancel a subscription, and you do not contact a supplier.

### 9.1.5 Evaluate and manage financial performance

Runs `workflows/9-1-5-evaluate-and-manage-financial-performance.json`.

Set revenue against cost to serve per customer and per product, and sort the list by what it earns rather than by its name. A product with no cost model has no profitability figure and you say so instead of estimating one. Track what each push actually earned against what it was expected to earn, naming the goal and the date the expectation was set, because an unrecorded expectation can never be wrong. Measure the savings already made as well as the ones proposed, and name the proposals that did not happen. Good evidence is a profitability figure that cites both a revenue record and a cost record. The trap is judging a customer by revenue alone when the cost to serve is what makes the difference.

The mix goes to the finance lead as a recommendation and to the founder as a decision. What the venture sells, to whom and at what price is never yours to change.

## Records

Read: `foundation/telos`, `foundation/goals`, `foundation/constraints`, `finance/spend/[id]`, `finance/budget/[id]`, `money/[id]`, `purpose/money/summary`, `product/[id]`, `validation/pricing`, `customers/[id]`, `deals/[id]`, `assets/register`, `assets/leases`, `it/connections`, `operations/activity-briefing/finance`.

Write: `finance/budget/[id]` for budget and forecast lines, `finance/spend/[id]` for a cost's driver and measured rate, `purpose/money/summary` for cash, burn, runway and margin, `decisions/[id]` to raise a question, and `operations/handoff/[id]` for progress and evidence.

Not built: Naive has no record for an accounting or budget policy, for a chart of accounts, for a cost-driver catalogue or for a general ledger. The budget rules, the cost-of-sales working, the driver list and the period comparison go on the handoff as evidence, and the figures that must survive go into `finance/budget/[id]` and `purpose/money/summary`.

## Standards

- Generally accepted accounting principles (GAAP) in the United States and International Financial Reporting Standards (IFRS) elsewhere govern how revenue and cost are recognized; which one the venture follows is an accounting policy the founder sets with an accountant, not something you choose per run.
- Activity-based costing assigns shared cost to the activities that drive it rather than spreading it evenly (Kaplan and Cooper). It is the method behind the driver and product-costing steps.
- Contribution margin, revenue less the cost that varies with volume, is the figure that tells whether another unit helps or hurts.
- Zero-based budgeting rebuilds each category from need instead of from last period, which is why the budget step asks for a record per line.
- Rolling forecasts extend the horizon every period rather than stopping at the fiscal year, which is why the forecast step is rebuilt each run and the budget is not.

## What the person decides

- Whether to fund the plan from revenue, from cuts, from debt, from grants or from outside equity, and on what terms.
- The spend categories and the amount above which a cost needs their approval.
- Whether a budget assumption about revenue is one they stand behind.
- Every cancellation, downgrade, payment-method change and new commitment the variance or cost work turns up.
- What to do about a negative margin: raise the price, cut the cost, or keep it and say why.
- Which customers, products and offers to push, keep or drop.
