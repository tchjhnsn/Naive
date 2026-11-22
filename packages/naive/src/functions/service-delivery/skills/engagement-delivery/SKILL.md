---
name: engagement-delivery
description: >
  Run a client engagement from statement of work to close: acceptance criteria
  for every deliverable, change requests with price and date impact, margin and
  founder-capacity checks, a close review, and productizing a request on its
  third repeat. Use in the service delivery intake and the weekly engagement
  review whenever an engagement record is written.
---

# Engagement delivery

Use this when a workflow step writes or reviews an engagement (`service-delivery/engagements/[id]`). It follows APQC PCF 5.3 (initiate, execute and complete service delivery). You keep the record; the founder signs, approves and sends.

## 1. Initiate: every deliverable has a test

- Each deliverable needs an `acceptance` line: the test the client applies, said so a stranger could apply it ("the import runs on the client's March export with no errors", not "a working import"). Refuse to mark a deliverable in progress without one, and ask the founder for it.
- Record `sow_signed` only from a signed statement of work. Signing is a legal-or-terms decision for the founder; you prepare the draft and point out any deliverable without a test.
- Open one handoff per deliverable, with the acceptance test as its done criteria, and list its id under `handoffs`.

## 2. Execute: scope changes are change requests

- Any request outside the offer's `includes`, or listed in its `excludes`, is a change. Write it under `changes` with `price_impact` and `days_impact` and status `requested` (APQC 5.3.2.4 to 5.3.2.5).
- A change request that changes price or date is a legal-or-terms decision. Bring it to the founder before any work on it starts. An unapproved change being worked is a defect: report it.
- Update deliverable status from the handoffs and evidence, never from memory. A deliverable is `accepted` only with an evidence record that shows the client accepted it.

## 3. Watch margin and capacity

- Forecast margin is budget less the cost of effort spent and still to spend, over budget. Flag any engagement forecast under 35%; 40% to 50% is the healthy range for professional services (SPI Professional Services Maturity Benchmark, as reported by Deltek). The figures come from a benchmark sponsor, so treat them as priors.
- Track on-time delivery per deliverable. Below 80% for a quarter is a reason to review estimates and the runbook.
- In the beachhead phase, flag any week where delivery took more than about half of the founder's working time: selling stops when delivery fills the week (an inference, consistent with Maister's leverage model of finders, minders and grinders). Push grinder work to agents and handoffs.

## 4. Complete: close and harvest

- When every deliverable is accepted, write the `review` within two weeks: what went well, why anything overran, what can be reused, and the client's feedback (APQC 5.3.3.1 and 5.3.3.6). Then set the status to `closed`.
- A step that failed twice gets a checklist item in the offer's runbook (Gawande, The Checklist Manifesto).
- On the third delivery of the same request type, propose a fixed-scope service offer with its includes, excludes and price. Adding it to the catalogue is a strategy-or-constitution decision for the founder.

## Pricing guidance to surface, not decide

Fixed scope or value pricing suits work whose outcome can be defined; time and materials suits work whose scope cannot be, and the statement of work should say so (Enns; Stark; Baker). These views are contested. Put them in front of the founder as options; never set a price yourself.
