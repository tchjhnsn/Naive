---
type: knowledge
tags: [naive, skills, customer-service, apqc-6-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:53:00Z
source: hybrid
name: develop-customer-service-strategy
process_group: "6.1"
description: >
  Decide and write down how the venture supports its customers: the requirements
  support must meet, the experience a customer meets, the channels the venture
  answers, the rules support runs on, the target per segment and what support
  depends on elsewhere. Load it for the six workflows of APQC process group 6.1
  and when the founder asks "where should customers reach us", "how fast do we
  have to answer", "when do we refund" or "what do we promise which customers".
---

# develop-customer-service-strategy

You read what the venture has already promised and already does, count it from the cases, and draft the support policy. The founder decides every number and every word a customer will ever see, because the policy is a promise and not a plan.

The whole group writes one record, `support/policy`, which the gate holds as a draft until the founder accepts it. Draft it once per run and show the founder what changed, rather than writing a field at a time. A step marked `consider` in a workflow runs when its condition holds or the founder asks; otherwise say you considered it and why you did not run it.

## The processes

### 6.1.1 Define customer service requirements across the enterprise

Runs `workflows/6-1-1-define-customer-service-requirements-across-the.json`.

Start from promises already made, not from what good support would look like. Read the published messages, the offers and the legal obligations and quote each promise with the record it sits in; a promise the venture has made is a requirement whether anyone planned it or not. Then count the cases by reason and channel: a reason with many cases is a requirement for published help, and a channel with slow replies is a requirement for hours. Good evidence is a quoted promise or a case count; a requirement with neither is your opinion, and you mark it one. The trap is writing a wish list the founder's week cannot hold, which is why the step that asks for the hours and the hard limits goes to the founder: only they know how much of the week support may take and what must never be promised.

### 6.1.2 Define customer service experience

Runs `workflows/6-1-2-define-customer-service-experience.json`.

Walk real cases end to end before writing anything. Ten closed cases, stage by stage, with the time each stage took, will show the breaks faster than any map drawn from memory: the customer who had to ask again, the one who waited with no word, the one passed between channels. Each break cites its cases. Then read `marketing/voice` so replies sound like the venture rather than like a helpdesk, and keep one line in every reply that leaves the customer a way to reach a person. Reducing a customer's effort predicts loyalty better than delighting them (Dixon, Freeman and Toman, *Harvard Business Review*, 2010), so the experience is judged by what the customer has to do, not by how warm the words are. The founder approves the drafted experience, because each stage of it is a promise.

### 6.1.3 Define and manage customer service channel strategy

Runs `workflows/6-1-3-define-and-manage-customer-service-channel.json`.

List every way in first, including the ones nobody answers: the site, the product, the published messages, the connected tools. Then cost each channel from the cases, how many it brought, how many were answered in target, which reasons arrive almost only there. An unanswered channel is worse than a closed one, so the honest move is often to close it and say so plainly. The founder chooses which channels stay open, since each open channel is a promise to be there; you draft the hours and targets around the choice.

### 6.1.4 Define customer service policies and procedures

Runs `workflows/6-1-4-define-customer-service-policies-and-procedures.json`.

Write down the rules the venture already follows before inventing new ones: read the decided decisions about customers, refunds and replies, and name the rule each one set. Three rules matter most, and in this order: what the agent may answer alone, what goes to a person at once, and when money goes back. The escalation list is the safety rail, so give each trigger the decision class it is raised as, and keep it short enough to be read in a hurry. The refund rule changes what the venture owes a customer, so it goes to the founder as a `legal-or-terms` decision.

### 6.1.5 Establish target service level for each customer segment

Runs `workflows/6-1-5-establish-target-service-level-for-each-customer.json`.

Measure before promising. For each segment from `foundation/icp` and the customer records, count the median and the worst first response and resolution time from closed cases; a median hides the case that lost a customer, so report both. Propose a target per segment with what meeting it costs in the founder's hours, and say which targets today's replies already miss. The trap is one target for everyone, which either over-serves the smallest customer or quietly breaks the promise to the largest. The founder sets every target, because a target told to a customer is a promise.

### 6.1.6 Identify and define customer service strategy integrations

Runs `workflows/6-1-6-identify-and-define-customer-service-strategy.json`.

Support cannot finish most contacts alone, so name the seams: a defect to products, buying interest to marketing and sales, a refund to finance, a complaint with legal exposure to risk and compliance. For each, name the handoff route, the role that answers, what support sends and how long it waits before chasing. Read the connected tools too, and say which record the venture treats as the source of truth; a helpdesk that quietly becomes the real record is how a venture stops trusting its own. Anything another function must agree to goes out as a handoff, not as a line you wrote into the policy on their behalf.

## Records

Reads: `support/policy`, `support/cases`, `customers`, `product/bugs`, `foundation/icp`, `foundation/telos`, `service-delivery/offers`, `marketing/message`, `marketing/voice`, `marketing/brand`, `marketing/sitemap`, `legal/obligations`, `it/connections`, `deals`, `money`, `people/team`, `decisions`.

Writes: `support/policy` (channels, targets, the refund rule, the escalation list, the experience and the integration rules), `operations/handoff/[id]` for work another function must agree to, and `decisions/[id]` for everything a person settles.

A record for one service level agreement per customer, separate from the policy, is not built; a per-segment target in the policy is as far as the records go.

## Standards

- ISO 10002, guidelines for complaints handling in organizations, for the complaints path the policy's escalation list points at. ISO 10004 covers monitoring and measuring customer satisfaction, which process group 6.5 does.
- APQC Process Classification Framework 8.0, category 6.0, for the process names and their order.
- Customer effort as the thing to minimize, after Dixon, Freeman and Toman, *Harvard Business Review*, 2010.
- Contacts per active customer rather than contacts handled as the number to drive down (Price and Jaffe, *The Best Service Is No Service*, 2008).

## What the person decides

- How many hours a week support may take, and who other than the founder may answer a customer.
- Which channels stay open, which close, and what a closed channel tells a customer.
- Every response and resolution target, per segment.
- The refund and credit rule, and the limit under which an agent may propose one.
- Every word of the policy that a customer will read, and whether the draft is accepted.
- Whether a dependency on another function is agreed to by that function.
