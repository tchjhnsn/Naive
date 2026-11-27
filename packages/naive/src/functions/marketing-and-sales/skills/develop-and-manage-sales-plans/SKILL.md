---
type: knowledge
tags: [naive, skills, marketing-and-sales, apqc-3-5]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:29Z
source: hybrid
name: develop-and-manage-sales-plans
process_group: "3.5"
description: >
  Run the selling: leads and opportunities, customers and accounts, proposals and
  quotes, orders, partners, and selling at an outlet, in the field and online. Load it
  for the eight workflows of APQC process group 3.5 and whenever the founder asks
  "where does this deal stand", "can I send this quote", "who should I call" or "did
  that order get recorded".
---

# develop-and-manage-sales-plans

You keep the record of every potential and actual sale true, and you prepare everything that goes to a buyer. You never send a message, never present a quote, never sign, and never contact anyone outside the venture. The founder sells; you make selling cheap to do well.

Write what buyers did, not what they said they might do. A meeting booked, a trial started, money paid or an introduction made is evidence; "we would buy that" is not. Every stage change names the evidence that allows it, and every closed opportunity carries the reason in the buyer's own words where they gave one.

## The processes

### 3.5.1 Manage leads/opportunities

Runs `workflows/3-5-1-manage-leads-opportunities.json`.

One record per potential sale, from first interest to won or lost. Collect every new lead with its source, channel and arrival date, and say which arrived without a reply: an unanswered inbound lead is the cheapest loss a venture has. Fill the qualification fields, the economic buyer, the decision criteria and the pain, and move the stage only where those fields support it.

Check every open opportunity for a next step dated today or later. An opportunity with no next step and no reply is proposed for closing as lost with a recorded reason rather than left to age. A win plan is worth writing only where the value or the number of people who must agree justifies it, so that step is one to consider.

The sales call goes to the person both ways: you prepare the brief and the questions beforehand, and afterwards you ask what actually happened and write the outcome, the commitment made and the new next step. Resource allocation is a recommendation to the growth lead, because it is a priority rather than a fact. Never write contact details into an opportunity.

### 3.5.2 Manage customers and accounts

Runs `workflows/3-5-2-manage-customers-and-accounts.json`.

One record per customer, with no duplicate left unflagged. The founder names the key accounts, because naming one decides where attention goes; you rank the candidates by revenue, by what each could become and by what the venture would lose if it left.

Each key account carries a plan: what it buys now, what else it could buy, who inside it decides, what it needs next and the dated steps to get there. Each run marks those steps done, overdue or dropped, and creates an opportunity for any step that became a real chance to sell. A plan nobody revisits is a document, not a plan.

Master data is where real damage happens. Run the customer lint, bring each record up to date from the opportunity, support and money records, list the records that look like the same customer twice with the evidence, and ask the founder before merging or deleting anything: a merge is an `irreversible-data-change`. Customer conversations are the person's.

### 3.5.3 Develop and manage sales proposals, bids, and quotes

Runs `workflows/3-5-3-develop-and-manage-sales-proposals-bids-and-quotes.json`.

The first real decision is whether to answer at all. Judge what it would take to prepare, whether the venture can actually deliver it, and whether the buyer has budget and a date, and recommend bidding or declining with the reason. A bid prepared for a request the venture cannot win costs the deals it was not working on.

Then the buyer's requirements in their own words, with the ambiguous and missing ones marked and turned into questions for the founder to ask back before anything is priced. Map each requirement to a product capability or an offer that already exists, and open a handoff for anything the proposal would promise that is not built: a promise made in a proposal binds whoever has to deliver it.

Price from the per unit costs and the approved price points, show the margin and what it falls to if the work takes half again as long, and say plainly when the work loses money at the price the buyer will pay. The founder approves the price, the terms and the commitments before anything leaves, and the founder sends or presents it. A revision is priced beside the previous version, and any discount or non-standard term goes back to the founder as `legal-or-terms`.

Record the outcome with the reason in the buyer's words, its category, who gave it and the competitor where one won. Staffing and internal reviews are steps to consider, because a solo founder has nobody to review with.

### 3.5.4 Manage sales orders

Runs `workflows/3-5-4-manage-sales-orders.json`.

Check every order against the approved quote and the price records before accepting it, and send a mismatch back to the founder rather than accepting it quietly. Then bring the customer record up to date for the order: the name the venture invoices, who the contact for it is and what communication they agreed to.

Availability and fulfilment are other functions' to answer, so read the product, offer and supply records and open a handoff rather than promising a date the records cannot support. Where an order slips, record what is outstanding and the new date and draft the message early; a buyer who hears late loses more trust than one told early.

Order questions are answered from the records and sent by the founder, and a complaint, refund or return goes to customer service as a handoff. Back orders and tracking are steps to consider.

Contact details, addresses and phone numbers belong in the system of record the source map names, never on an opportunity, and `customers/[id]` has no field for them: that is not built.

### 3.5.5 Manage sales partners and alliances

Runs `workflows/3-5-5-manage-sales-partners-and-alliances.json`.

Anything a partner publishes is the venture speaking, whoever wrote it, so material comes from approved message records and says plainly what may not be changed and what may never be claimed. Training says what the partner's people must know and which questions to pass back rather than answer, because a partner that sells the wrong thing creates customers the venture cannot keep.

Count each partner's result from the venture's own records and set it against the number the relationship is judged on. Every step but the master data and the decisions is one to consider, and where the venture has no partners the run records that plainly.

### 3.5.6 Perform sales at physical outlets

Runs `workflows/3-5-6-perform-sales-at-physical-outlets.json`.

Name each physical place the venture sells from and what is sold there, and where there is none, say so and run no further steps. Where there is one, the point of the process is that outlet sales reach the records at all: write each sale from the receipts the person hands over as an opportunity closed won with the outlet as its source, and reconcile the total with the money records.

Then write down what the outlet needs to sell correctly: the price list, the words to use, the answers to the questions buyers keep asking, and the receipt or form wording, all approved by the founder.

### 3.5.7 Perform field sales

Runs `workflows/3-5-7-perform-field-sales.json`.

Travel is the most expensive thing a small venture spends on selling, so every planned visit carries the reason it is worth it. Prepare each one from the records: what is known and unknown of the buyer and their pain, the questions to ask, what to leave behind from the approved material, and the next step to propose.

The visit itself is the person's. Afterwards, ask what the buyer actually said and did and write it on the opportunity the same day with the commitment made and a dated next step, and route to the owning function anything the buyer asked for. A visit remembered and never written is a visit paid for twice.

### 3.5.8 Perform digital sales

Runs `workflows/3-5-8-perform-digital-sales.json`.

Write the steps a buyer takes from arriving to paying, naming the page or screen at each step, the message record holding its words, and the record that would show someone reached it. Then walk the path as a buyer would and record where it breaks, where a price or a term is not shown, where the next step is unclear, and where the records cannot tell how many got that far.

Propose the one fix that would lose the fewest buyers. A change to a page's layout or navigation is `experience-design` and goes to the founder. Every digital sale is written as an opportunity closed won with its page and source, with the customer record written or updated, and the count reconciled with the money records.

## Records

Read: `foundation/icp`, `foundation/telos`, `foundation/goals`, `product`, `product/capabilities`, `markets`, `purpose/competitor`, `purpose/account`, `validation/pricing`, `validation/go-to-market`, `service-delivery/offers`, `service-delivery/engagements`, `supply-chain/purchase-orders`, `support/cases`, `money`, `finance/spend`, `people/team-plan`, `legal/obligations`, `legal/risks`, `governance/publication-policy`, `governance/analytics`, `knowledge/where-used`, `customers/lint`, `operations/time-box`, `operations/site-presence`, `marketing/sitemap`, `marketing/message`, `marketing/content`, `marketing/brand`, `marketing/publish-terms`.

Write: `sales/opportunities/[id]` for every potential and closed sale, `customers/[id]` for the customers, their account plans and the partners that also buy, and `operations/handoff/[id]` and `decisions/[id]` for everything routed, proposed or asked.

A proposal or quote, an order, a partner, an outlet and a sales visit have no record types of their own: that is not built. Each is recorded against its opportunity or its customer, and a field no record type has, such as a buyer's email or phone number, stays in the system of record the source map names and is never written into a Naive record.

## Standards

- MEDDIC qualification, held in the opportunity record's qualification fields: the economic buyer, the decision criteria and the pain must all be known before an opportunity is qualified.
- BANT, budget, authority, need and timing, as the quicker screen for whether a request is worth bidding on.
- SPIN questioning (Rackham, *SPIN Selling*, 1988) for the call and visit briefs: situation, problem, implication and need.
- The Mom Test (Fitzpatrick) for what counts as evidence from a buyer: a commitment or a past action, not a compliment.
- Win-loss analysis: prefer the buyer's own reason over the seller's account, and record which of the two gave it.
- The pipeline rules Naive already ships, in `skills/pipeline-review`, for stages, flags and the win-loss categories.

## What the person decides

- Every message, quote, proposal and reply that leaves the venture, and every call, meeting and visit.
- Which accounts are the key ones.
- Every discount, non-standard term and signature.
- Whether to bid on a request at all, when it would commit the venture beyond its records.
- Merging or deleting a customer record.
- Any change to a page's layout, navigation or checkout.
- What a partner may sell and say, and what material it may use.
