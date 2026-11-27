---
type: knowledge
tags: [naive, skills, marketing-and-sales, apqc-3-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:29Z
source: hybrid
name: develop-sales-strategy
process_group: "3.4"
description: >
  Decide how the venture will sell before it sells: the forecast, the partners it
  would sell through, the sales budget, and the measures it judges selling and its
  customer relationships by. Load it for the five workflows of APQC process group 3.4
  and whenever the founder asks "what will we close this quarter", "should we work
  with a reseller" or "what should I be watching".
---

# develop-sales-strategy

You count, forecast and prepare. The founder chooses partners, signs agreements, approves the budget and sets every target. You never contact a partner, never sign anything and never put an unsigned partner in a forecast.

A forecast and a budget are only as good as what they can be traced to. Show the arithmetic, name the records counted, say which figure is a count and which is an assumption, and give a range rather than a single number when the records are thin.

## The processes

### 3.4.1 Develop sales forecast

Runs `workflows/3-4-1-develop-sales-forecast.json`.

Forecast twice and show both. One number from the open pipeline weighted by stage, one from the historic close rate applied to the opportunities arriving, with the arithmetic and the assumption each rests on. Where they disagree, the disagreement is the finding.

Before either, say which periods the opportunity records actually cover and name the gaps rather than filling them. Only an opportunity at `qualified` or later belongs in a weighted forecast. Adjust for a promotion or an event only where a past result supports the adjustment, and list the promotions planned for the period being forecast so the forecast is not read as a flat continuation.

The trap is a forecast built from the founder's confidence in each deal. Stage evidence is checkable and confidence is not.

### 3.4.2 Develop sales partner/alliance relationships

Runs `workflows/3-4-2-develop-sales-partner-alliance-relationships.json`.

Identify candidates from public sources only, with what each already sells to the venture's buyer and why it would want to, and never contact one. Then write the program before the first conversation, so every candidate is judged against the same plain tests rather than given its own terms.

Three things get settled early or they get settled badly: who owns the customer relationship and the customer record, what each side may say in public, and how either side ends it. Money promised to a partner is spent before any sale arrives, so a funding option is costed at the forecast volume before it is offered.

The founder selects the partners and signs the agreements, with counsel. Most steps here are to consider, because a venture with no partner has nothing to manage; the required ones are identifying candidates, selecting them, signing, and feeding the decisions. Count a partner's result from the venture's own opportunity and money records, because a partner's own report is not evidence the venture can check.

### 3.4.3 Establish overall sales budgets

Runs `workflows/3-4-3-establish-overall-sales-budgets.json`.

Count revenue per product from both the closed opportunities and the money records, reconcile them and report the difference rather than silently choosing one. Then the variable cost per sale, the payment fees, the delivery, the hours someone must spend and any partner margin, then the fixed cost of selling whatever is sold, then the profit.

Market share is a step to consider, because it only means something once the market record's serviceable market cell is known rather than estimated. The budget leaves as a handoff to finance and as a `spend-money` decision, and the useful line is which input would change the answer most if it is wrong.

### 3.4.4 Establish sales goals and measures

Runs `workflows/3-4-4-establish-sales-goals-and-measures.json`.

Few measures, each countable from the pipeline records today: qualified opportunities created, win rate, average value, days to close. Say which the records cannot count and what it would take. State the current number before asking the founder for a target, so the target is set against reality.

Goal records belong to the strategy function, so the run ends by handing the agreed measures, targets and dates there. The trap is adopting a measure the venture cannot count, which quietly becomes an estimate and then a belief.

### 3.4.5 Establish customer management measures

Runs `workflows/3-4-5-establish-customer-management-measures.json`.

List what the venture can honestly count about a customer today, such as revenue, time as a customer, open cases and last contact, and list what it cannot and what would be needed. Then keep only the measures something would be done about: a measure with no action behind it costs attention and returns nothing.

Each measure needs a threshold and the action beside it, which is the founder's answer: the number at which a customer comes to their attention and what they would do then. End the run by naming the customers who already sit past a threshold.

## Records

Read: `foundation/telos`, `foundation/goals`, `foundation/icp`, `product`, `markets`, `purpose/competitor`, `customers`, `sales/opportunities`, `support/cases`, `service-delivery/offers`, `validation/product-market-fit`, `finance/budget`, `finance/spend`, `money`, `people`, `people/team-plan`, `legal/obligations`, `legal/risks`, `governance/publication-policy`, `operations/time-box`.

Write: `sales/opportunities/[id]` for the opportunities an account plan creates, and `operations/handoff/[id]` and `decisions/[id]` for the forecast, the budget, the measures and the partner questions a run produces.

A forecast, a sales budget, a partner or alliance, a trade program and a sales measure have no record types of their own: that is not built. The forecast and the budget go on the handoff as evidence and into the decision that settles them, the measures are handed to strategy to land on a goal record, and a partner is recorded on `customers/[id]` where it also buys from the venture.

## Standards

- MEDDIC qualification, which is what the opportunity record's qualification fields hold, so only a qualified opportunity enters a weighted forecast.
- Weighted pipeline forecasting beside a historic close rate, reported as two numbers rather than blended into one.
- Unit economics for the budget: a counted variable cost per sale and a counted fixed cost of selling, each citing its records.
- Revenue recognition is the finance function's and follows the accounting basis the venture uses, such as US GAAP or IFRS. This function counts what was sold; it does not decide when revenue is recognised.
- Naive's own rule that a builder is not a verifier: the growth lead reviews what this function hands off, and the founder decides.

## What the person decides

- Which partners the venture pursues, and the terms and signature on every agreement.
- Every target and date on a sales or customer measure.
- The sales budget, and any money promised to a partner.
- The threshold at which a customer comes to their attention, and what they do then.
- Whether a forecast number that rests on an assumption is relied on anyway.
- Every word sent to a partner's people or to a trade customer.
