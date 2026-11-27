---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-10]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: manage-sustainability
process_group: "13.10"
description: >
  How the capabilities agent builds a sustainability capability that is asked for
  rather than performed: who actually asks the venture for what, goals the founder
  states and can keep, measures computed from records it already holds, and every
  statement approved before it leaves. Load it for the workflows of APQC 13.10 and
  when a customer questionnaire or an investor asks for a policy, a figure or a
  statement.
---

# manage-sustainability

You find out what the venture is really asked for, draft what can be backed by its own records, and hand every statement to the founder. The founder sets the goals, approves the policy and publishes: a sustainability claim is a public commitment that will be read back to the venture.

The discipline here is the same as everywhere else in this function: a figure that cannot be computed from a named record is not reported, and a gap is shown as a gap. The failure mode is borrowed language, a policy copied from a larger company about operations this venture does not have.

## The processes

### 13.10.1 Develop sustainability capability

Runs `workflows/13-10-1-develop-sustainability-capability.json`.

Start from the ask, not from the topic. Read `legal/obligations`, `customers` and `investors` and name who actually asks this venture for anything, what they ask for, who must be able to answer and what the answer must contain. Where nobody asks, write that plainly; it is the most useful finding a young venture can have here, and it changes the moment a customer sends a questionnaire or an investor adds a term.

Goals are the founder's, stated in their own words, because they are values and public commitments at once. Measures are defined once from records the venture already keeps, with unit, window and method, and a measure that would need data the venture does not have is left out rather than estimated. The plan is two or three things with an owner and a date, and a plain statement of what is deliberately not being done yet.

A policy waits until someone asks for one, and even then it is drafted here and adopted by the founder.

### 13.10.2 Manage sustainability capability

Runs `workflows/13-10-2-manage-sustainability-capability.json`.

A commitment that changes nobody's steps is not kept, so the first part of keeping one is writing what each person or supplier does differently, inside the process they already run. Questions that come in are answered from the venture's own records, the unanswerable ones are listed, and every reply is handed to the founder to send.

Reporting is arithmetic plus honesty: compute each measure for the window from the records its definition names, put the figure, the window and the method together, show each gap as a gap, and hand the statement to the founder, since publishing it commits the venture. The trap is a statement that reads better than the records support; it is the one a customer or a regulator will quote back.

## Records

Read: `legal/obligations`, `customers`, `investors`, `investor-relations/updates`, `finance/spend`, `supply-chain/suppliers`, `governance/publication-policy`, `capabilities/processes`, `operations/handoff`.

Write: `capabilities/processes/[id]` for the requirement list, the goals as recorded, the drafted policy, the measure definitions and the reported figures, `operations/handoff/[id]` for the plan, the incoming questions and the drafted statements, and `decisions/*` to raise a goal, a policy or a statement for approval.

A sustainability report record, an emissions inventory and a questionnaire register are not built: the requirement list and the measure definitions sit on a process record, each statement is a draft on a handoff until the founder approves it, and a published statement becomes marketing's or investor relations' record, not this function's.

## Standards

- APQC Process Classification Framework 8.0, process group 13.10.
- The Greenhouse Gas Protocol Corporate Standard, and its scopes 1, 2 and 3, where a venture is asked for an emissions figure. Most of a small venture's figure sits in scope 2 and scope 3, which it can only estimate from supplier and spend records, and the estimate must say so.
- The GRI Standards and the ISSB's IFRS S1 and S2, which are what a customer or an investor usually means by a disclosure framework. A venture of this size is normally subject to none of them, and whether any applies is for the founder and counsel.
- The EU Corporate Sustainability Reporting Directive, where a customer in its scope passes a requirement down a contract. The duty then comes from the contract, which is why the requirement list cites the contract rather than the directive.

## What the person decides

- Every sustainability goal, in their own words.
- The policy, and whether it is published.
- Every statement, figure and reply that leaves the venture.
- What the venture spends on this, and what it declines to do for now.
- Whether a disclosure framework applies, with counsel.
