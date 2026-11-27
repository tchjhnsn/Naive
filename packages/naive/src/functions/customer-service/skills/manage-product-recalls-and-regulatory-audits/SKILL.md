---
type: knowledge
tags: [naive, skills, customer-service, apqc-6-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:53:00Z
source: hybrid
name: manage-product-recalls-and-regulatory-audits
process_group: "6.4"
description: >
  Take something already in customers' hands back or fix it in place: start a
  recall, rate the hazards behind it, say what each audience is told, draft any
  report a regulator is owed, count whether the recall is reaching people, and
  close it. Load it for the six workflows of APQC process group 6.4 and when the
  founder asks "who has the broken version", "do we have to tell anyone" or
  "can we call this finished".
---

# manage-product-recalls-and-regulatory-audits

You find who is affected, write what the hazard is and what the evidence says, draft every message and every report, and count the reach. The founder, with counsel, decides to recall, sends every message, files every report and declares the recall over.

A recall is the one piece of customer service work where being slow and being wrong cost the same. Work in the order below and write the date on every count, because the record of what was known when is what the venture will be judged by.

## The processes

### 6.4.1 Initiate recall

Runs `workflows/6-4-1-initiate-recall.json`.

Two things must be in front of the founder before the decision: who holds the affected thing, and what the hazard is. Build the holder list from `customers`, `deals` and `support/cases` and name every holder the records cannot identify, because the unidentifiable ones set the ceiling on the recall's reach. Then write what fails, under what use, how often the cases and bugs have shown it, and what harm it could do, keeping what the records show apart from what is inferred. Offer real options, recall, repair in place, a notice, nothing, each with who it reaches, what it costs and what it admits, and recommend one. The decision, its scope and its date are the recall's starting point and they are recorded; nothing reaches a customer before the founder has decided.

### 6.4.2 Assess the likelihood and consequences of occurrence of any hazards

Runs `workflows/6-4-2-assess-the-likelihood-and-consequences-of.json`.

Keep likelihood and consequence apart. ISO 31000 treats risk as the effect of uncertainty on objectives and asks for both, and multiplying them into one number hides the hazard that is rare and severe, which is exactly the one a recall exists for. Rate likelihood from the counts in the cases and bugs, rate the consequence from what the worst realistic outcome would be, and say how certain the evidence is as a third thing. Rank by consequence first. Then hand the ranking to risk and compliance with its evidence, naming the hazards support cannot do anything about alone; a hazard support rates and keeps to itself has not been managed.

### 6.4.3 Manage recall related communications

Runs `workflows/6-4-3-manage-recall-related-communications.json`.

List the audiences before writing a word, and read `governance/publication-policy` for who may publish. Each message says four things: what is wrong, what the customer should do now, what the venture will do, and by when. No blame, no selling, no explanation of how rare it is, which customers read as a reason to ignore the message. Drafts go to the founder to send or hold, and every reply becomes a case tagged with the recall, so the second message can answer what the first failed to.

### 6.4.4 Submit regulatory reports

Runs `workflows/6-4-4-submit-regulatory-reports.json`.

Name the duty first, in writing: which report, to which body, in what form, inside how many days, and from which date. If `legal/obligations` names none, say so and stop; that written answer is the output of the run. If one may apply, assemble the facts from the cases and the recall decision rather than from memory, and draft the report in the form the duty asks for. You never file it. Reporting to a regulator is the founder's and counsel's, a `legal-or-terms` decision, and so is the judgment that nothing is reportable when a duty is arguable.

### 6.4.5 Monitor and audit recall effectiveness

Runs `workflows/6-4-5-monitor-and-audit-recall-effectiveness.json`.

A recall is measured against the holder list, not against the people who happened to answer: messaged, replied, acted, outstanding, unreachable, with the date of each count and the records behind it. Name the customers who have not acted, since an aggregate hides them, and draft a second message on another channel where the records allow one. Report the same five numbers every week so the trend is visible. The trap is counting messages sent as reach.

### 6.4.6 Manage recall termination

Runs `workflows/6-4-6-manage-recall-termination.json`.

A recall ends when the test it started with is met, not when attention moves on, so lay out that test, the counts against it and anything an obligation still requires, and ask the founder and counsel. Then resolve every case the recall opened, leave open the ones where a customer is still owed something, and record the end date and the final counts. Finish by proposing the one change that would stop a repeat, with the cases that justify it; a recall that changes nothing in the product, the records or the policy will happen again.

## Records

Reads: `customers`, `deals`, `product`, `product/bugs`, `support/cases`, `support/policy`, `legal/obligations`, `legal/risks`, `marketing/message`, `marketing/content`, `governance/publication-policy`, `operations/handoff`, `finance/spend`.

Writes: `support/cases/[id]` for every contact the recall creates and for the cases it closes, `support/policy` for the part of the preventing change that belongs to support, `operations/handoff/[id]` for the hazard ranking and the weekly numbers, and `decisions/[id]` for the recall decision, every message and every filing.

A recall record is not built: the recall lives as the founder's decision, with its scope and date, the affected holder list on the handoff, and one case per affected customer contact. A hazard register of its own is not built either, so the rating goes to risk and compliance on a handoff.

## Standards

- ISO 31000, risk management, for keeping likelihood and consequence separate and for recording the certainty of the evidence.
- ISO 10393 gives guidelines for consumer product recall by suppliers, including identifying affected products, notifying customers and monitoring the recall's effectiveness.
- In the United States, the Consumer Product Safety Act requires a firm to report to the Consumer Product Safety Commission a consumer product that creates a substantial product hazard or an unreasonable risk of serious injury. Whether that or any other duty binds this venture is a question for the founder and counsel, and nothing here is legal advice.
- APQC Process Classification Framework 8.0, category 6.0, for the process names and their order.

## What the person decides

- Whether to recall, repair in place, publish a notice or do nothing.
- Every message to customers or the public, and when it goes.
- Every report to a regulator, and whether one is owed at all.
- Whether the recall may end.
- What the venture changes afterwards so it does not happen again.
