---
type: knowledge
tags: [naive, skills, supply-chain, apqc-4-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:52:02Z
source: hybrid
name: plan-for-and-align-supply-chain-resources
process_group: "4.1"
description: >
  Plan the supply side of a venture that makes, buys or ships physical goods:
  how each product is made, what demand is expected, which materials and builds
  are scheduled, where finished goods are held and what quality is accepted.
  Load it in the eight workflows of APQC process group 4.1, and when the founder
  asks "can we make this many", "when must I order", "how much stock should I
  hold" or "what counts as a good unit".
---

# plan-for-and-align-supply-chain-resources

You turn the product and the sales picture into numbers the venture can order and build against: capacity, lead times, order dates, stock levels and an acceptance standard. The founder decides the ends and the commitments, how many units to aim for, what margin to live on, who the venture buys from and what it promises a customer. You never send anything to a supplier and you never approve a spend.

Work in the order the processes are listed. Each one takes the previous one's output: a strategy with no capacity figure gives a forecast nothing can be built against, and a schedule with no materials plan is a wish. A step marked `consider` is optional; run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not.

## The processes

### 4.1.1 Develop production and materials strategies

Runs `workflows/4-1-1-develop-production-and-materials-strategies.json`.

Start from the product cards and `foundation/telos`, and write the strategy as four numbers per product: units per month, landed cost per unit, defect rate and lead time from order to the customer. Then make the make-or-buy choice step by step rather than for the whole product at once: for each step of making it, give the cost per unit and the lead time both ways, and say what the venture stops learning if it buys. Capacity is the figure most often wrong: separate what a supplier claims from what the venture has observed, and include the founder's own hours, since on a one-person venture those cap output long before a factory does. Good evidence is a quote, a confirmation or an observed build, each with its date. The trap is writing a strategy out of ambition: a capacity number with no supplier confirmation behind it makes every later plan wrong in the same direction.

To the person: the four target numbers (`ask`), because they are ends; the make-or-buy choice; and any tooling the venture would pay for, because tooling a supplier owns can hold the venture to that supplier.

### 4.1.2 Manage demand for products

Runs `workflows/4-1-2-manage-demand-for-products.json`.

Build the baseline from what exists, orders and pre-orders in `deals` and the pipeline in `sales/opportunities`, before asking anyone for an opinion. Then reconcile three sources into one number per product per month, your baseline, any customer commitment and the founder's plan, which is what sales and operations planning does; record which of the three the agreed number came from. Available to promise is stock on hand plus confirmed incoming quantities, less what is already sold, so it needs the purchase order dates to be current. Measure error as a run of monthly figures rather than one average, and name the direction of the bias. The trap is dressing the founder's plan as a forecast: with no sales history, say so and mark the figure unproven, because safety stock computed from a made-up error is worse than no safety stock.

To the person: the consensus number (`ask`), and any question that must be put to a named buyer, which the founder asks, not you.

### 4.1.3 Create materials plan

Runs `workflows/4-1-3-create-materials-plan.json`.

Explode the bill of materials against the forecast first and ignore supplier limits, because the unconstrained plan is what shows which limit actually binds. Then put the suppliers' real lead times, minimums and capacity back in and give the founder the order dates week by week. Classify critical parts with the Kraljic matrix (Kraljic, *Harvard Business Review*, 1983) by profit impact and supply risk, and record single sources on the supplier record. Watch specifications: a supplier's quiet change of revision, datasheet or material is what breaks a build that worked last time. Good evidence is a supplier's written lead time with its date; the trap is carrying a lead time from an old quote, since quoted lead times move faster than prices.

To the person: anything sent to a supplier, including the questions about lead time and capacity; and every option for a part that cannot arrive in time, since expediting and second sourcing both cost money.

### 4.1.4 Create and manage master production schedule

Runs `workflows/4-1-4-create-and-manage-master-production-schedule.json`.

One schedule, week by week, each line a product, a quantity, a start and a finish, and under each line the materials that are on order with a confirmed date against those that are not. Keep it by reworking it when something slips, and record each change with its cause and the days gained or lost, because that record is the only honest evidence of the venture's real lead time. The trap is a schedule kept beside the records in someone's head: once a build is scheduled against materials nobody confirmed, the first slip is found by a customer.

To the person: every schedule change that puts a customer promise at risk, which is a decision about what to tell the customer, not a replanning exercise.

### 4.1.5 Plan distribution requirements

Runs `workflows/4-1-5-plan-distribution-requirements.json`.

Begin with the master data the arithmetic needs, packed dimensions, units per carton and per pallet, weight, origin, destination and the Harmonized System code, because freight, duty and storage all price off it. Then work destination by destination: required stock, space, arrival quantities per week, consolidation at the source where it is cheaper, and the cost to put one unit in the customer's hands. Carriers price on weight or volume, whichever is greater, so the packing decides the bill. Good evidence is a quote against the venture's real packed dimensions; the trap is quoting cost per unit from the bill of materials and freight alone, leaving out duty, brokerage, storage and pick and pack, which is how a product gets priced below its own cost to deliver.

To the person: any replenishment plan agreed with a partner, and the choice of where to hold stock, since both commit money.

### 4.1.6 Establish distribution planning constraints

Runs `workflows/4-1-6-establish-distribution-planning-constraints.json`.

Constraints are numbers, not intentions: floor area, stacking height, door and lift size, the most cash the venture will hold in stock, the maximum weeks of cover, shelf life, carrier minimums, the dangerous goods or battery rules the product triggers and the customs documents each lane needs. Name the one that caps monthly volume first. The trap is treating a preference as a constraint; mark each rule as coming from the product, from the law or from the founder's choice, because only the last is negotiable.

To the person (`ask`): the cash limit on stock, which is a judgment about the venture's runway and nobody else's to make.

### 4.1.7 Review distribution planning policies

Runs `workflows/4-1-7-review-distribution-planning-policies.json`.

Lay the network out hop by hop with the cost per unit and the days of each, then name the most expensive hop and the slowest, which are rarely the same one. A proposed change is only worth reading with its alternative costed in the same units. The trap is comparing a new arrangement on price alone when it also changes the lead time and who holds the stock.

To the person: every sourcing relationship, because opening or renewing one is a conversation with another business and usually ends in terms. You prepare what to ask for and the walk-away point; the founder speaks and signs.

### 4.1.8 Develop quality standards and procedures

Runs `workflows/4-1-8-develop-quality-standards-and-procedures.json`.

Write the acceptance standard as numbers, dimensions with tolerances, the functions that must pass, which cosmetic faults are allowed and the share of a lot that may fail before the lot is rejected, drawn from the product card and from real faults in `product/bugs` and `support/cases`. Sampling by attributes against an acceptance quality limit is standardised in ISO 2859-1, and naming a sample size there is better than testing the units that look suspect. A procedure is good when two people testing the same lot reach the same verdict; that is the test to apply before sending it anywhere. The trap is a standard written after the first bad lot arrives, when the venture has no agreed line to hold the supplier to.

To the person: the line between accept and reject (`ask`), and sending the specification pack, which is both a message to a supplier and usually part of the terms.

## Records

These workflows read `product`, `foundation/telos`, `foundation/goals`, `foundation/constraints`, `foundation/icp`, `deals`, `sales/opportunities`, `customers`, `finance/spend`, `finance/budget`, `assets/leases`, `legal/obligations`, `product/bugs`, `support/cases` and `decisions/*`, and they write `supply-chain/suppliers/[id]`, `supply-chain/purchase-orders/[id]` and `decisions/*`.

Naive has no record type for a bill of materials, a demand forecast, a master production schedule, a distribution or materials plan, an acceptance standard or a test procedure: not built. Until there is one, each of those lives on the handoff (`operations/handoff/*`) as the run's evidence, and the figures a later run depends on, a confirmed lead time, a capacity, a minimum order quantity, go on the supplier record where the router keeps them.

## Standards

- APQC Process Classification Framework 8.0, category 4.0, process group 4.1, which names these eight processes.
- Kraljic's purchasing portfolio matrix (Kraljic, *Harvard Business Review*, 1983) for classifying a critical part by profit impact and supply risk.
- Sales and operations planning, the practice of reconciling demand and supply into one agreed plan, which 4.1.2 and 4.1.4 follow.
- Material requirements planning: a bill of materials exploded against a demand plan, netted against stock and offset by lead time, which is the arithmetic of 4.1.3.
- Incoterms 2020 (International Chamber of Commerce), the eleven rules, one of which every cross-border order names with its place.
- Harmonized System codes (World Customs Organization) for duty and customs paperwork.
- ISO 2859-1, sampling procedures for inspection by attributes, for the sample size and acceptance quality limit in a test procedure.
- The bullwhip effect (Lee, Padmanabhan and Whang, 1997): ordering in swings larger than sales amplifies demand upstream, which is why the plan sets an order rule rather than ordering when it feels right.

## What the person decides

- The manufacturing targets: units per month, landed cost per unit, defect rate and lead time to the customer.
- Make or buy for each step of production, and whether the venture pays for tooling it will not own.
- The one demand number per product per month the venture buys and builds against.
- The most cash the venture will hold in stock at once, and the maximum weeks of cover.
- Where finished goods are held, and whether a third party holds them.
- Every message, specification pack or plan that goes to a supplier or a partner, and every term agreed with one.
- The line between an acceptable unit and a rejected one, and what the venture does with a lot that fails it.
- What to tell a customer when the schedule can no longer meet a promise.
