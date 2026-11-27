---
type: knowledge
tags: [naive, skills, customer-service, apqc-6-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:53:00Z
source: hybrid
name: plan-and-manage-customer-service-contacts
process_group: "6.2"
description: >
  Run the venture's customer contacts: forecast the volume and the hours it
  takes, work questions, problems and requests into cases that get answered,
  handle complaints, process returns, and answer in writing whether anything is
  reportable to a regulator. Load it for the five workflows of APQC process group
  6.2 and when the founder asks "what is open", "how long are people waiting",
  "do we refund this one" or "do we have to report this".
---

# plan-and-manage-customer-service-contacts

You receive, classify, resolve and count contacts, and you draft every reply. The founder sends the reply, gives any money back, settles anything with legal exposure, and files anything with a regulator.

This group does the daily work of the function. The triage of a single new case is `support-triage`; load this skill for the whole period's work: the forecast, the queue, complaints, returns and reporting duties. A step marked `consider` runs when its condition holds or the founder asks.

## The processes

### 6.2.1 Plan and manage customer service work force

Runs `workflows/6-2-1-plan-and-manage-customer-service-work-force.json`.

Forecast from the venture's own history, not from a benchmark: cases per week and per active customer, then add what is planned, a launch, a campaign or a price change, and state the assumption behind each addition so a wrong forecast teaches something. Erlang C, the queueing formula contact centres staff by, assumes many interchangeable agents and a steady arrival rate, and a venture with one or two people has neither, so forecast the volume and the hours it will take rather than a staffing level. Then propose the hours each channel is answered and say plainly where they fall short; the shortfall is the point of the run. Pulling the founder onto support, or letting a target slip, is a `set-priorities` recommendation for the growth lead, because it costs someone else's week.

### 6.2.2 Manage customer service problems, requests, and inquiries

Runs `workflows/6-2-2-manage-customer-service-problems-requests-and.json`.

Work in the APQC order and do not skip the middle: receive, analyze, resolve, respond. Receiving means one case per contact with the channel, the arrival time and the helpdesk id, and a summary with no names, addresses or payment details; the conversation stays in the helpdesk. Analyzing means the kind, the reason from the policy's list, the link to an earlier case within seven days, and the bug or article that already covers it. Resolving means finding the answer in the records and the published help; when only a change resolves it, the handoff carries the case as evidence rather than your summary of it. Responding means a draft that answers the next question too, so the customer need not write again. The trap is answering fast and resolving nothing, which returns as a repeat contact and doubles the work. Two steps are the founder's: the reply itself is a `public-commitment`, and buying interest noticed on a happy customer's case is passed to marketing and sales rather than sold by you, and never inside a complaint.

### 6.2.3 Manage customer complaints

Runs `workflows/6-2-3-manage-customer-complaints.json`.

A complaint is not a problem with feeling attached; it is a customer who is unhappy with the venture and expects a response, and ISO 10002 is the path: acknowledge, record, route, resolve, respond, then analyze. Acknowledge first and say when they will hear back, because silence is the second complaint. Route before you resolve: a legal threat, a chargeback or a risk to a person goes to the founder at once as `legal-or-terms`. Then put the redress options in front of the founder with what each costs, what the refund rule allows and what was given in the nearest earlier complaint, so like cases are treated alike. The trap is admitting fault the records do not support, or promising redress you may not grant. Three steps are the founder's: the acknowledgement and the reply, the redress, and anything with legal exposure.

### 6.2.4 Process returns

Runs `workflows/6-2-4-process-returns.json`.

A return is money leaving the venture, so the work is preparation, not authorization: what was bought and when, whether it is inside the policy's window, the amount, what the rule says, and a recommendation. The founder authorizes. Afterwards, record the reason the customer gave in their own words, not your paraphrase, and count it with the others; the reason is the whole value of the return to the venture, and a return processed with no reason recorded teaches nothing about why people leave. Both steps are steps to consider, because a venture with nothing returnable never runs them.

### 6.2.5 Report incidents and risks to regulatory bodies

Runs `workflows/6-2-5-report-incidents-and-risks-to-regulatory-bodies.json`.

Answer the duty question in writing even when the answer is no, and date the answer: read `legal/obligations` and `legal/risks`, name which would require reporting, to whom and inside how many days, and from which date the clock runs. A reporting clock usually starts when the venture first knew, not when it noticed, so record the first case that showed the facts. If a duty may apply, draft the report with the timeline from the cases and no personal detail the duty does not require, and hand it to the founder and counsel. You never file anything with a regulator and you never decide that nothing is reportable when a duty is arguable: that is a `legal-or-terms` decision.

## Records

Reads: `support/policy`, `support/cases`, `customers`, `product`, `product/bugs`, `it/connections`, `marketing/content`, `legal/obligations`, `legal/risks`, `finance/spend`, `deals`, `money`, `people/team`, `operations/time-box`, `decisions`.

Writes: `support/cases/[id]` (the case, its kind, reason, repeat link, first response and outcome), `support/policy` only through process group 6.1, `operations/handoff/[id]` for a defect, an opportunity or a complaint's cause, and `decisions/[id]` for every reply, refund, escalation and routing.

A return or RMA record of its own, a workforce schedule record and a regulatory filing record are not built: the return's amount and reason go on its case, the proposed hours and the forecast go on the handoff as evidence, and the drafted report goes to the founder and counsel outside the records.

## Standards

- ISO 10002, guidelines for complaints handling in organizations, for 6.2.3: acknowledge, record, route, resolve, respond, analyze.
- ITIL distinguishes an incident, something broken, from a service request, something asked for, and routes them differently; the case's `kind` is the same distinction.
- APQC Process Classification Framework 8.0, category 6.0, for the process names and their order.
- Customer effort and repeat contacts as the measure of a resolution (Dixon, Freeman and Toman, *Harvard Business Review*, 2010).
- In the European Union, the General Data Protection Regulation requires a personal data breach to be notified to the supervisory authority without undue delay and, where feasible, within 72 hours (Article 33). Which duties bind this venture is a question for the founder and counsel, and nothing here is legal advice.

## What the person decides

- Every reply, acknowledgement and public post, before it is sent.
- Every refund, credit or authorized return, and its amount.
- Anything with legal exposure: a threat, a chargeback, a dispute, a complaint that names the law.
- Any deletion of a customer's data or account.
- Whether a contact is reportable to a regulator, and the filing itself.
- Whether the founder's hours move onto support, or a target is allowed to slip.
