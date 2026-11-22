---
name: supplier-and-purchasing
description: >
  Keep the approved supplier list and purchase orders for a venture that makes,
  buys or ships physical goods: supplier evaluation and re-evaluation, Kraljic
  risk classes and single sources, Incoterms 2020 on every cross-border order,
  landed cost per unit and reorder points. Use in the supply chain intake and
  the monthly supply review whenever a supplier or purchase order is written.
---

# Supplier and purchasing

Use this when a workflow step writes a supplier (`supply-chain/suppliers/[id]`) or a purchase order (`supply-chain/purchase-orders/[id]`). It follows APQC PCF 4.2 (procure materials and services) and ISO 9001:2015 clause 8.4 (control of externally provided processes, products and services). You draft and compute; a person approves suppliers, agrees terms and places orders.

## 1. Suppliers

- Draft every new supplier with status `candidate`, `approved_on` and `approved_by` null. Only a person approves, and approving one is a legal-or-terms decision because it usually comes with a quality agreement or terms of supply.
- Record the evidence a person needs to approve: what it may supply, certifications (such as ISO 9001:2015), quoted lead time, minimum order quantity and country.
- Set `review_due` a year after approval by default (ISO 9001 8.4.1 asks for re-evaluation). In the monthly review, a supplier that is due, or that was late or defective, gets a keep, conditional or suspend proposal.

## 2. Risk class and single sources

Put each supplier's main item in a Kraljic quadrant (Kraljic, HBR 1983) by profit impact and supply risk:

| | Low supply risk | High supply risk |
|---|---|---|
| High profit impact | leverage | strategic |
| Low profit impact | routine | bottleneck |

A bottleneck or strategic item with `single_source` true needs a recorded decision: a second source, buffer stock, or accepting the risk. For each, compare the time to recover a lost source with the time the venture survives without it (Sheffi, The Resilient Enterprise); where survival is shorter, say so first. Critics note the matrix ignores a supplier's power over a small buyer, which is a startup's normal case; mention it when it matters.

## 3. Purchase orders

- Fill the lines, currency and the total (quantity times unit price, before freight and duty). Start at `draft`. The router holds an agent's write as a draft, and placing it is a spend-money decision; sending it to the supplier is a public-commitment decision.
- Every cross-border order names one of the eleven Incoterms 2020 rules and its named place. Point out that EXW leaves export clearance and every leg to the buyer, which a small importer without a forwarder at origin should avoid.
- Before the first production order at the supplier's minimum, ask the founder what share of it paid pre-orders or binding orders must cover, and say whether that share is met. This rule is contested; present it as an option.
- Negotiate deposit and balance terms before unit price, because cash tied up before the first sale is the constraint for most small hardware ventures (cash conversion cycle; inference).

## 4. Landed cost

Unit cost is never the bill of materials alone (Hackaday, "Your BOM is not your COGS"). Compute and show:

landed unit cost = parts + assembly + yield loss + packaging + freight in + duty + brokerage + fulfillment

Name each part that is unknown. Do not let a price be set from a cost that leaves any part out.

## 5. Reorders

Reorder point = expected demand over the lead time + safety stock, where safety stock = z times the standard deviation of demand over the lead time (APICS and ASCM practice). With under 12 weeks of sales history, use a minimum and maximum the founder sets and mark it unproven. Order no more often or in bigger batches than demand needs: order swings larger than sales swings amplify demand upstream (Lee, Padmanabhan and Whang, "The Bullwhip Effect in Supply Chains", 1997).
