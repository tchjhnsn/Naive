---
type: knowledge
tags: [naive, skills, service-delivery, apqc-5-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:49Z
source: hybrid
name: establish-service-delivery-governance-and
process_group: "5.1"
description: >
  Set up how a small venture runs service delivery and what it sells: the rules
  delivery obeys, the figures that say whether delivery works, and each offer's
  scope, price model, duration, prerequisites and written procedure. Load it for
  the 5.1.1 and 5.1.2 workflows and when the founder asks "what exactly do we
  sell", "how do we deliver it", "are we delivering on time" or "can I hand this
  delivery to someone else".
---

# establish-service-delivery-governance-and

You write the rules, the procedures and the figures. The founder sets the targets, approves every offer and its price, pays for anything, and speaks to the client.

## The processes

### 5.1.1 Establish service delivery governance

Runs `workflows/5-1-1-establish-service-delivery-governance.json`.

Governance in a one-founder venture is four things written down, not a committee: the rules delivery obeys, a place each offer's procedure lives, a small set of figures read every period, and the client's own words about the last delivery.

Work in this order. First the rules, because every later figure depends on them: no deliverable is worked without an acceptance test, no change request is worked before the founder approves it, one handoff per deliverable, and a status only ever set from evidence. Then point each live offer's `runbook` field at the file holding its delivery steps, so there is one answer to "how do we deliver this".

Then the figures. Four are enough: the share of deliverables delivered by their due date, the share the client accepted at the first attempt, the days from signature to the first deliverable, and each active engagement's forecast margin. Count them from the engagement records and their handoffs and cite the ids you counted from. Good evidence is a figure a reader can recompute from records you name; a figure with no ids behind it is an opinion in a number's clothing. The trap is reporting an average over too few engagements: with three engagements, say "two of three" and not "67%".

Feedback is the client's, so it goes to the founder. Draft three questions and the message, and let the founder send it and bring the answers back. Record the answers in the client's own words on that engagement's `review`, because a summary written by you cannot later be told from the client's judgement. The direction step is a recommendation to the product lead: at most three changes, each naming the figure it should move and the founder hours it costs.

### 5.1.2 Develop service delivery strategies

Runs `workflows/5-1-2-develop-service-delivery-strategies.json`.

This is where a service stops being whatever the founder agreed last time and becomes an offer. Write each one so a stranger could tell what is included, what is not, what the client must provide, how it is priced, and how long it takes.

The order that works: the targets first (they decide what the rest is for), then the hours available, then the parts each offer depends on, then the procedure, then a review of the procedure against what actually happened. Exclusions are the most valuable field on an offer, because a change request can point at them; write the thing clients always ask for that is not included, in the words they use for it.

Write the procedure as ordered steps with the check that ends each step, and set `duration_days` from the steps rather than from hope. Then replay it against the last two closed engagements: every step that was skipped, added or ran long is either a defect in the procedure or an exception worth recording. The trap is writing a procedure nobody follows; a procedure that disagrees with the last two engagements describes an intention, not a delivery.

Three steps go to the person. The targets are the founder's, because they are ends and not work. Labour policies and the workplace step reach money and other people's terms, so you draft and the founder decides; both are steps to consider, and a venture where the founder delivers everything from their own desk should say it considered them and why they did not run. Adding, repricing or retiring an offer is a `strategy-or-constitution` decision, so the final step files it with the evidence and never writes a price the founder has not approved.

## Records

Read: `service-delivery/offers`, `service-delivery/engagements`, `operations/handoff`, `evidence`, `customers`, `foundation/telos`, `foundation/goals`, `validation/pricing`, `product`, `it/connections`, `supply-chain/suppliers`, `assets/register`, `decisions`.

Write: `service-delivery/offers/[id]` (outcome, includes, excludes, price model, price, duration_days, prerequisites, runbook, status), `service-delivery/engagements/[id]` (the close review that carries the client's feedback), `operations/handoff/[id]` for the figures and the capacity arithmetic, and `decisions/[id]` for anything the founder or the product lead must settle.

Naive has no record type for a delivery scorecard, a labour policy or a workplace plan, so each of those lives on the handoff as evidence and in the decision it supports: not built. The delivery procedure itself is a file in the venture that the offer's `runbook` field points at, not a record.

## Standards

- ITIL 4 service catalogue management: a catalogue entry says what the service is, who it is for and what it promises. The offer record follows it, and its own schema cites it.
- ITIL 4 continual improvement: a small number of measures read on a cadence, each tied to an improvement someone owns. That is what the direction step produces.
- ISO/IEC 20000-1:2018 asks a service provider to plan its services, measure them and review them; the rules, the figures and the review in 5.1.1 are the small version of that.
- APQC Process Classification Framework 8.0, category 5.0, supplies the process names these workflows carry.

## What the person decides

- The delivery targets for the period, and which venture goal each one serves.
- Every offer: its outcome, inclusions, exclusions, price model, price and whether it is offered or retired.
- Whether anyone other than the founder may do delivery work, on what terms, and any payment for it.
- Any purchase, lease or licence the delivery of an offer needs.
- What is asked of a client and what is said to them, including the feedback questions.
- Which of the recommended delivery changes is made first.
