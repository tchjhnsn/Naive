---
type: knowledge
tags: [naive, skills, supply-chain, apqc-4-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:52:02Z
source: hybrid
name: procure-materials-and-services
process_group: "4.2"
description: >
  Buy materials and services for a venture that makes, buys or ships physical
  goods: the procurement plan and spend profile, category cost targets, choosing
  and contracting suppliers, raising and reconciling purchase orders, and scoring
  the suppliers on what actually arrived. Load it in the five workflows of APQC
  process group 4.2, and when the founder asks "who should we buy this from",
  "what are we really spending", "where is my order" or "is this invoice right".
---

# procure-materials-and-services

You prepare and record every purchase: the requirement, the quotes, the comparison, the order, what arrived and what it cost. The founder approves the spend, chooses the supplier, agrees the terms and sends anything that leaves the venture. A purchase order the agent writes is a draft until a person approves it, and sending one is a commitment to an outside party.

The mechanics of a supplier record and a purchase order, status fields, Kraljic classes, Incoterms 2020, landed cost and reorder points, are in [supplier-and-purchasing](../supplier-and-purchasing/SKILL.md). This skill is the order of the work across the five processes.

## The processes

### 4.2.1 Provide sourcing governance

Runs `workflows/4-2-1-provide-sourcing-governance.json`.

Governance here means three things written down: what will be bought in the next period and under whose approval, what the venture does if a supply stops, and where the money is actually going. Do the spend profile before proposing any saving: group `finance/spend` by supplier and by category, and the few lines carrying most of the money are where the only savings worth the founder's attention live. A contingency is not a sentence about resilience; it names the alternative supplier, the weeks to switch, the buffer stock that would cover the gap and the cost per unit of the switch. The trap is chasing a ten per cent saving on a line that is two per cent of spend while a single supplier holds half of it.

To the person: the approval limit for an order, the choice of which saving to take first, and any conversation with a supplier about future volume.

### 4.2.2 Develop category plan

Runs `workflows/4-2-2-develop-category-plan.json`.

Group bought items into a handful of categories, electronics, enclosure, packaging, freight, and give each one its spend to date, its supplier count, the price trend you can evidence and the share of product cost it carries. Then work backwards from the selling price in `validation/pricing` to the cost each category must stay under. The arithmetic is yours; the margin is not. The trap is inventing a category target from a benchmark: without the venture's own price and volume, a cost target per category is a number with no claim behind it.

To the person (`ask`): the margin the venture will live on, and therefore each category's cost target.

### 4.2.3 Select suppliers and develop/maintain contracts

Runs `workflows/4-2-3-select-suppliers-and-develop-maintain-contracts.json`.

Compare candidates at the quantity the venture will actually buy, not at the quantity that gives the best headline price, and compare the whole set: unit price, minimum order, lead time, certifications with their expiry, country and what the venture would lose if that supplier stopped. Validate before approving, with a sample or first article checked against the acceptance standard, the business registration and the certifications read rather than claimed; ISO 9001:2015 clause 8.4 is the standard that asks a buyer to evaluate, select and re-evaluate its external providers on defined criteria. Negotiate the deposit and balance split before the unit price, because cash tied up before the first sale is the binding constraint for most small hardware ventures. Then keep the agreement alive: price validity, renewal and expiry dates, and any minimum the venture has committed to with how much of it is used. The trap is approving a supplier on a quote and a good conversation, with no sample and no certification read.

To the person: the choice of supplier, the terms, and the signature. You prepare the comparison, the evidence and the walk-away point.

### 4.2.4 Order materials and services

Runs `workflows/4-2-4-order-materials-and-services.json`.

The order of work is fixed: a requisition is checked against open orders before anything new is raised, a person approves it, the same request for quotation goes to every supplier so the replies can be compared, the purchase order is drafted with its lines, currency, Incoterms rule and named place, payment terms and required date, and the founder sends it. After that the work is chasing and matching. Reconcile with the three-way match, order against receipt against invoice, line by line on quantity and price, and record received quantities as they land rather than at the end. An exception needs its cause and its amount, since that is what a claim or a credit note rests on. The trap is a quotation sent with a looser specification to one supplier than another, which makes the prices incomparable and is only discovered when the cheap one is wrong.

To the person: the approval of every requisition, the sending of every request for quotation and purchase order, and any exception the venture will claim money for.

### 4.2.5 Manage suppliers

Runs `workflows/4-2-5-manage-suppliers.json`.

Score from closed orders only: the share delivered on time and in full, the average days late, the defect rate of what arrived and the gap between the price quoted and the price invoiced, with the orders the score was computed from named on the record. Pull field evidence in from `product/bugs` and `support/cases` and attribute a defect to its supplier and lot where it can be traced; without lot traceability say that it cannot. A supplier whose performance has slipped gets a prepared keep, condition or suspend decision with what switching would cost in weeks and money, never an agent's verdict. The trap is a score from one bad order: say how many orders are behind it, and a score from fewer than three says more about the sample than the supplier.

To the person: whether to keep, condition or suspend a supplier, and any message that tells a supplier it is on notice.

## Records

These workflows read `supply-chain/suppliers`, `supply-chain/purchase-orders`, `product`, `product/bugs`, `support/cases`, `finance/spend`, `finance/budget`, `money`, `validation/pricing`, `markets`, `legal/obligations`, `legal/risks`, `governance/decision-rights` and `decisions/*`, and they write `supply-chain/suppliers/[id]`, `supply-chain/purchase-orders/[id]` and `decisions/*`.

Naive has no record type for a requisition, a request for quotation, a received quote, a procurement or category plan, or a supplier scorecard: not built. A quote and a score go on the supplier record as the figures with the date they were given; a requisition, a plan and a comparison go on the handoff (`operations/handoff/*`) as the run's evidence, and the money itself is recorded by the finance function in `finance/spend`, which this function reads and never writes.

## Standards

- APQC Process Classification Framework 8.0, category 4.0, process group 4.2, which names these five processes.
- ISO 9001:2015 clause 8.4, control of externally provided processes, products and services: define the criteria for evaluating, selecting, monitoring and re-evaluating a supplier, and keep the records of it.
- Incoterms 2020 (International Chamber of Commerce): every cross-border order names one of the eleven rules and its named place.
- The three-way match, purchase order against goods received against supplier invoice, as the control before a payment is proposed.
- On-time in-full delivery as the delivery measure, and price variance between quote and invoice as the price measure.
- Kraljic's purchasing portfolio matrix (Kraljic, *Harvard Business Review*, 1983) for deciding how much attention a category is worth.

## What the person decides

- Every requisition, and the limit below which a purchase needs no separate approval.
- Which supplier is chosen, and whether it is approved after validation.
- The terms: price breaks, deposit and balance, Incoterms rule and place, lead time and the remedy for a late or failing lot.
- Sending anything to a supplier: a request for quotation, a purchase order, a chase, a claim or a notice.
- The margin the venture will live on, and so each category's cost target.
- Whether to keep, condition or suspend a supplier whose performance has slipped.
- Whether to pay a disputed carrier or supplier invoice line.
