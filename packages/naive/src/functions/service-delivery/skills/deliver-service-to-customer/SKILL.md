---
type: knowledge
tags: [naive, skills, service-delivery, apqc-5-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:49Z
source: hybrid
name: deliver-service-to-customer
process_group: "5.4"
description: >
  Take one signed engagement from its statement of work to a closed record: start
  conditions met, each deliverable built and accepted against its own test, every
  change priced and approved first, and the close review and reusable parts
  harvested. Load it for the 5.4.1, 5.4.2 and 5.4.3 workflows and when the founder
  asks "what do we owe this client", "can we accept this change", "is this
  finished" or "what did we learn".
---

# deliver-service-to-customer

You read the contract into records, build, test, record and close. The founder signs, approves every change, pays for anything and sends every word to the client.

This is the heart of the function, and the engagement record is where it lives: the client, the offer, each deliverable with its acceptance test, the change requests, the budget, the status and the close review. Use the module's `engagement-delivery` skill for the engagement record's own fields and conventions; this skill is the APQC order of the work.

## The processes

### 5.4.1 Initiate service delivery

Runs `workflows/5-4-1-initiate-service-delivery.json`.

Initiation turns a signed document into a workable record. Read the statement of work the founder gives you and write its deliverables, dates, payment points, limits and signature date onto the engagement. Then do the thing that saves the engagement: name every deliverable with no acceptance test, and every term the venture cannot meet as it stands. An acceptance test is written so a stranger could apply it, which means a condition and not an adjective: "the import runs on the client's March export with no errors", never "a working import".

Order matters. Terms, then requirements, then the plan, then the client's own objectives, then readiness, then who does what, then the weeks. Write the client's objective and how they will judge it, because a deliverable that passes its test and misses the objective still loses the client. Mark as a guess anything no record supports, rather than filling it from the sales conversation as you remember it.

The trap is a plan with dates and no inputs: most slips are the client's input arriving late, so the plan says what they must provide and when, and the readiness step says which deliverable cannot start without it. Signing is the founder's, sending the plan to the client is the founder's, and the questions only the client can answer go to the founder to ask.

### 5.4.2 Execute service delivery

Runs `workflows/5-4-2-execute-service-delivery.json`.

Execution is build, test, record, repeat, with change control around it. Before building, write what the deliverable has to fit and what still has to be seen. When you define the solution, say which part of the acceptance test each piece satisfies; a piece that satisfies none is scope you added yourself.

Run the test exactly as written. Not a test you would rather run, and not a demonstration: the deliverable stays in progress until its own test passes, and it is accepted only with an evidence record behind it. Build or buy is a comparison with hours, price, what the venture is then left maintaining and what the client is tied to, and the purchase is the founder's.

Change control is where engagements are lost. Anything outside the offer's inclusions, or inside its exclusions, is a change request with its price and days impact and the status requested, and no work starts on it. Scope accepted quietly to keep a client happy is unpaid work that also moves every other date, so put each change in front of the founder with what it costs the deliverables already promised and what happens if it is refused. Deploying or handing over is by the procedure, inside the window the client agreed, and anything that actually reaches the client is sent by the founder.

### 5.4.3 Complete service delivery

Runs `workflows/5-4-3-complete-service-delivery.json`.

Closing is seven checks, and the point of it is that the next engagement is cheaper. Write the close review while it is fresh, each line pointing at the handoff or evidence it comes from: what went well, which deliverable overran and why, what the client said, what you would do differently.

Then the money, the facts and the release. List the work done and not yet billed, the final amount against the budget and any write-off, and hand it to the finance function, which owns the money records. Check each deliverable against the contract and record the delivered and late facts with their dates, which are `domain-fact` decisions you may record yourself. Close every handoff with its result and end any supplier's access.

Harvest last. Correct the procedure where the work differed, set `duration_days` from the hours actually spent, and add to inclusions and exclusions whatever this engagement showed was unclear. On the third delivery of the same request, propose a fixed-scope offer; that is a `strategy-or-constitution` decision for the founder. The trap is closing the status and skipping the harvest, which is how a venture delivers the same custom project five times and never ships an offer.

## Records

Read: `service-delivery/engagements`, `service-delivery/offers`, `customers`, `sales/opportunities`, `legal/obligations`, `operations/handoff`, `evidence`, `product`, `people/team`, `finance/budget`, `finance/spend`, `supply-chain/suppliers`, `it/connections`, `decisions`.

Write: `service-delivery/engagements/[id]` (deliverables with their acceptance criteria, due dates, status and evidence ids, the change requests, the signature and start dates, the budget, the status and the close review), `service-delivery/offers/[id]` for the harvest, `operations/handoff/[id]` for each deliverable's work, the readiness list and the final figures handed to finance, and `decisions/[id]` for everything the founder settles.

Naive has no invoice, payment or revenue record in this function's reach, so the final amount goes to the finance function as a handoff: not built here. The statement of work itself is a document in the venture, and the engagement record only carries the date it was signed.

## Standards

- APQC Process Classification Framework 8.0, category 5.0, supplies the process names and the order these three workflows follow.
- ISO 9001:2015 clause 8.2 asks a provider to review the requirements for a service before committing to it, which is what the contract and requirements steps do.
- The PMBOK Guide's initiating and closing process groups are the same shape as 5.4.1 and 5.4.3: authorise with the requirements understood, close with the deliverables accepted, the records archived and the lessons recorded.
- ITIL 4 change enablement: a change is assessed and authorised before it is made. Here the authority is always the founder's.

## What the person decides

- Signing the statement of work, and any term the venture cannot meet.
- Every change request: whether it is accepted, and at what price and date.
- Anything bought or reused instead of built.
- Every message, plan, deliverable and closing note that reaches the client.
- Adding a fixed-scope offer to the catalogue after a request repeats.
