---
type: knowledge
tags: [naive, skills, supply-chain, apqc-4-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:52:02Z
source: hybrid
name: manage-logistics-and-warehousing
process_group: "4.4"
description: >
  Move and hold goods for a venture that ships physical products: the delivery
  promise and the network behind it, inbound shipments and returns, stock counts
  and picking, outbound carriers and their invoices, and delivery the venture
  performs itself. Load it in the five workflows of APQC process group 4.4, and
  when the founder asks "what can I promise on delivery", "how many do we have",
  "where is this shipment" or "is this freight bill right".
---

# manage-logistics-and-warehousing

You plan the movement, record every arrival, count the stock and check the freight bills. The founder approves what the venture promises customers publicly, chooses the carriers and partners, and pays. You never publish a delivery promise and you never settle an invoice.

Two numbers hold this group together: how many units can be sold today, and what it costs to put one unit in the customer's hands. Every process here either produces one of them or spends against it.

## The processes

### 4.4.1 Provide logistics governance

Runs `workflows/4-4-1-provide-logistics-governance.json`.

Start from the customer, reading `customers`, `foundation/icp` and the complaints in `support/cases`, and turn expectations into requirements with numbers: the delivery window, the share of orders that must hit it, the tracking the customer sees, what packaging must survive. Then cost the ways of meeting them, direct from the maker, from the founder's own stock, or through a fulfilment partner, each with cost per order and delivery time. Write the returns rule at the same time as the delivery promise, because who pays return freight is part of the price. Define measures you can actually compute, and say which measure nothing records yet rather than listing it as if it were live. The trap is publishing a delivery promise before anyone has costed keeping it, which is a commitment to customers made on an estimate.

To the person: the published delivery promise and the returns rule, both public commitments; the choice of carrier or fulfilment partner; and every brief that goes out to one.

### 4.4.2 Plan and manage inbound material flow

Runs `workflows/4-4-2-plan-and-manage-inbound-material-flow.json`.

Build a receiving calendar from the open purchase orders before shipments start arriving, and say which week has more arriving than there is room for. Track each shipment through dispatch, carrier, customs and the door, and record the date it actually arrived against the date confirmed, because that difference is the supplier's real lead time and it feeds the supplier score. Keep returns physically apart from sellable stock until they are judged, then send each unit one way, back to stock, to rework or refurbishment, to salvage for parts, or to scrap, and count the reasons so the pattern reaches the product records. The trap is leaving returns unjudged in a corner: they are counted as stock that cannot be sold and the reason they came back is lost.

To the person: any claim against a supplier or carrier, and any return policy change the return rate argues for.

### 4.4.3 Operate warehousing

Runs `workflows/4-4-3-operate-warehousing.json`.

One list of what is held where, covering parts, work in progress and finished units at every place including the founder's home and a partner's warehouse, with how each line was counted and when. Report availability with committed stock shown apart from free stock, since a unit promised to an order is not available however real it is. Count on a cycle rather than once a year, report the difference by item and by value, and correct the record with the count named as its source. Check a fulfilment partner's stock figures and fees against your own records, because an error there is paid every month. Then look after the stock itself: age by lot, damage risk, and what has not moved. The trap is treating the record as the truth; the count is the truth, and the gap between them is the measure worth watching.

To the person: writing off, discounting or dumping stock, renting more space, and any discrepancy with a partner that becomes a dispute.

### 4.4.4 Operate outbound transportation

Runs `workflows/4-4-4-operate-outbound-transportation.json`.

Choose the service per shipment rather than once for all shipments: the cheapest service that still meets the promise, booked with the labels and the customs paperwork the destination needs. Follow the shipment to delivery and record what actually happened, which gives each carrier an on-time share and a damage rate on its supplier record. Audit every freight invoice line against the shipments recorded, the weight and volume billed, surcharges, duty and brokerage, and pass only the agreed amount; carriers bill on weight or volume, whichever is greater, so a wrong packed dimension is paid on every parcel. The trap is paying freight invoices unread because each one is small, which is the most reliable overspend in a small shipping operation.

To the person: payment of every invoice, including a disputed line, and the choice to change carrier or pass a surcharge on in the shipping charge.

### 4.4.5 Deliver last mile delivery services

Runs `workflows/4-4-5-deliver-last-mile-delivery-services.json`.

This process is for a venture that delivers to the door with its own people or vehicles; when a carrier does it, say so and run 4.4.4 instead. Turn each request into a delivery order carrying the address and access, the agreed slot and what must happen on arrival, and keep that customer's standing requirements with their record so they are not asked twice. Schedule the hands and the vehicle before any slot is promised. Record an outcome for every order on the day, and tell the customer the same day when a slot will be missed. The trap is promising slots from the number of orders rather than from the hours available, which turns one late delivery into a day of them.

To the person: every slot promised to a customer, the message asking how a delivery went, and the choice to keep delivering with the venture's own hands or hand it to a carrier.

## Records

These workflows read `customers`, `foundation/icp`, `product`, `deals`, `support/cases`, `people/team`, `supply-chain/suppliers`, `supply-chain/purchase-orders`, `finance/spend` and `decisions/*`, and they write `supply-chain/suppliers/[id]`, `supply-chain/purchase-orders/[id]` and `decisions/*`.

Naive has no record type for an inventory position or stock count, a shipment, a delivery order, a return authorisation, a carrier invoice or a delivery service policy: not built. Until there is one, the stock position, the receiving calendar, the shipment log and the delivery outcomes go on the handoff (`operations/handoff/*`) as the run's evidence; a carrier or forwarder is recorded as a supplier with its on-time and damage figures; arrival quantities and dates go on the purchase order the goods came in on; and the published delivery promise is approved as a decision, since it is a public commitment the marketing function publishes, not a record this function writes.

## Standards

- APQC Process Classification Framework 8.0, category 4.0, process group 4.4, which names these five processes.
- Incoterms 2020 (International Chamber of Commerce), which fix where the cost and risk of carriage pass between seller and buyer on a cross-border shipment.
- Harmonized System codes (World Customs Organization) for the customs paperwork and duty on each lane.
- Cycle counting: count part of the stock on a regular cycle and measure record accuracy against the count, rather than one annual count.
- ABC analysis: count and watch the items that carry most of the value most often.
- Reverse logistics: the return path and the disposition of a returned unit are planned and costed like the outbound path.
- Dimensional weight: carriers price on actual or volumetric weight, whichever is greater, so the packed size sets the bill.

## What the person decides

- The delivery promise the venture publishes, and the shipping charge that goes with it.
- Who pays return freight, and what happens to a unit that comes back.
- Which carrier, forwarder or fulfilment partner the venture uses, and on what terms.
- Payment of every carrier and partner invoice, and whether to dispute a line.
- Whether to write off, discount or clear stock that cannot be sold, and whether to rent more space.
- Whether the venture keeps delivering to the door itself, and every slot promised to a customer.
