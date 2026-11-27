---
type: knowledge
tags: [naive, skills, service-delivery, apqc-5-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:49Z
source: hybrid
name: manage-and-operate-service-delivery-system
process_group: "5.3"
description: >
  Run the machinery delivery depends on: the tools, accounts, environments and
  procedures each offer needs, brought into use before an engagement starts, kept
  working day to day, and held to what the venture promised. Load it for the
  5.3.1 to 5.3.4 workflows and when the founder asks "what do we need in place to
  deliver this", "are we ready to start", "what is stuck" or "are we behind on
  what we promised".
---

# manage-and-operate-service-delivery-system

You list the parts, check them, work the queue, record what broke and find its cause. The founder buys anything, confirms a start and says every word that reaches the client.

In a small venture the delivery system is not a factory. It is the tools and licences, the accounts and access, the environments, the templates and the written procedures that let an offer be delivered twice the same way. Treat it as a named list with owners, not as a feeling about whether things are set up.

## The processes

### 5.3.1 Perform service delivery system planning

Runs `workflows/5-3-1-perform-service-delivery-system-planning.json`.

Three questions in order: what does each live offer run on, how much will it be asked to carry, and what is missing. Take what is already recorded from the venture's connection and asset records and mark the rest unrecorded rather than inventing an owner. Size the load from the agreed forecast, in engagements running at once, not in revenue, because seats, storage, supplier lead time and the founder's attention are what run out.

Good evidence names the part, its owner, the week it is first short and what it would cost. The trap is planning for the peak you can imagine instead of the one the forecast gives: say which week, from which forecast line. Every purchase or commitment is the founder's decision, so this process ends in a recommendation and never in a bought licence.

### 5.3.2 Perform service delivery system startup

Runs `workflows/5-3-2-perform-service-delivery-system-startup.json`.

Startup is the gate between a signed engagement and the first hour of work. Check every prerequisite the offer names, set up what the venture owns itself, and list what is missing with who must provide it. Ask nobody outside the venture for anything: a request to a client or a supplier is the founder's.

Then run the procedure's first steps once on test data or an internal case. A dry run is cheap and finds the missing credential, the template that no longer matches and the step that takes a day rather than an hour; fixing the procedure then costs nothing, and fixing it inside the client's work costs the date. The trap is treating the dry run as a formality and recording that it passed without running it, which is worse than not running it, so record what broke and how long each step took.

The founder confirms the start. You write the start date on the engagement only after that, and open the first deliverable's handoff.

### 5.3.3 Operate service delivery system

Runs `workflows/5-3-3-operate-service-delivery-system.json`.

Day to day work is a queue. Take the open delivery handoffs in due-date order, advance what an agent may advance, and set each deliverable's status from the handoff's evidence. A status set from memory is the defect that makes every other figure in this function untrue.

Record every interruption with the deliverable it hit and the days it cost: a tool down, a missing client input, rework after a failed acceptance test, a scope question nobody answered. That record is the only thing that later tells a slow procedure from a slow week. Work stalled on a client input is the commonest cause of a missed date, so list each one with the date it is needed by and what slips without it, and leave the sending to the founder.

### 5.3.4 Assure service delivery system service

Runs `workflows/5-3-4-assure-service-delivery-system-service.json`.

Assurance compares what is happening with what was promised in writing: the offer's inclusions and duration, and the dates and response time in the statement of work. List every place the venture is behind, each line citing the handoff or evidence that shows it, and never soften a date because the client has not noticed.

For each shortfall, find the step of the procedure where it started and add the check that would have caught it, so the next delivery cannot pass that step without it. One check added at the right step beats a resolution to be more careful. The trap is stopping at the symptom: "the report was late" is not a cause, and "the client's data arrived in a format the template did not accept, at step four" is.

What the client is told is the founder's, always. You prepare what happened, what the venture will do, by when, and the options if a credit or a new date is wanted; a credit or a changed term is also a `legal-or-terms` decision.

## Records

Read: `service-delivery/engagements`, `service-delivery/offers`, `operations/handoff`, `evidence`, `support/cases`, `legal/obligations`, `customers`, `it/connections`, `assets/register`, `assets/leases`, `supply-chain/suppliers`, `finance/budget`, `decisions`.

Write: `operations/handoff/[id]` for the parts list, the load, the gaps, the readiness check, the exceptions and the shortfalls; `service-delivery/offers/[id]` for procedure corrections and the checks added to it; `service-delivery/engagements/[id]` for the start date and each deliverable's status; and `decisions/[id]` for purchases, the start, the reordering and what the client is told.

Naive has no record type for a service level or an availability promise, for an incident, or for the delivery system's own inventory, so a promise is read from the offer and the statement of work, an interruption is recorded on the handoff as evidence, and the parts list lives there too: not built. A customer's own report of a problem belongs to the customer service function in `support/cases`, which you read and do not write.

## Standards

- ITIL 4 service validation and testing: a service is tested against its acceptance criteria before it is released. The dry run and the acceptance test are that, at this venture's scale.
- ITIL 4 deployment management, which separates moving something into use from the decision to release it to the client; here the founder holds the release.
- ITIL 4 service level management: measure what was promised, not what is convenient to measure.
- ISO/IEC 20000-1:2018 expects a provider to control its services and record and correct what goes wrong, which is what 5.3.3 and 5.3.4 do.
- APQC Process Classification Framework 8.0, category 5.0, supplies the process names these workflows carry.

## What the person decides

- Every purchase, licence, lease or supplier commitment the delivery system needs.
- Whether an engagement starts now or waits for a missing part.
- Anything asked of a client, including a chase for a missing input.
- What a client is told about a slip, and any credit, discount or new date offered.
- Which procedure change or which promise is changed first.
