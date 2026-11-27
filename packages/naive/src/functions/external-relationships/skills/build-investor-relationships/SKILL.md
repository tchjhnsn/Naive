---
type: knowledge
tags: [naive, skills, external-relationships, apqc-12-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:39Z
source: hybrid
name: build-investor-relationships
process_group: "12.1"
description: >
  Keep the people who have put money into the venture, or could lend it money,
  on the record and informed: lenders and their covenants, the analysts who
  cover the category, and the shareholders the venture owes information to. Load
  it in the three APQC 12.1 workflows, and when the founder asks who the venture
  owes a report to, what a lender will ask for, what an analyst said about the
  category, or what goes in this period's update.
---

# build-investor-relationships

You keep the records of everyone outside the venture who has a claim on its money or its attention, and you draft every word they would read. The founder borrows, speaks, briefs and sends. You never contact a lender, an analyst, a journalist or a shareholder.

The function's write reach is narrow on purpose. A lender is an investor record, a borrowing is a raise record, an update is a stakeholder update record, and everything else this group produces goes on the handoff as evidence or into a decision.

## The processes

### 12.1.1 Plan, build, and manage lender relations

Runs `workflows/12-1-1-plan-build-and-manage-lender-relations.json`.

Start from what is already owed, not from what the founder wants to borrow. Read `purpose/money/summary` for cash and runway, `finance/spend` for what is already going out, and every raise whose instrument is debt or revenue-based. Write one investor record per lender and put the covenant on it in plain words: the figure it tests, the record that figure comes from, and the next date it is tested. A covenant you cannot tie to a record is a covenant nobody will notice breaking, which is the trap in this process.

A borrowing is a raise record like any other, with instrument debt or revenue-based, an amount, the milestone it reaches and a stop date. Good evidence for a lender packet is twelve months of cash in and out, the runway, the customer concentration and who owns the venture, each figure naming the record it came from.

To the person: the decision to borrow at all, which is `strategy-or-constitution`, and every conversation with a lender. Sending the packet is `public-commitment`.

### 12.1.2 Plan, build, and manage analyst relations

Runs `workflows/12-1-2-plan-build-and-manage-analyst-relations.json`.

Work from public sources only, and name every analyst and publication individually with the last thing it published about the category and the date you read it. An undated note about coverage is worthless within a quarter. Read `markets` and `industries` for what the category is called by the people who write about it, and `purpose/competitor` for who else they cover.

Most early ventures have no coverage, and the honest finding is a short list of people who write about the category and have never mentioned the venture. Say that rather than padding the list. A briefing draws only on approved records, and nothing in it is a figure the venture cannot show the record for.

To the person: every briefing goes out as `public-commitment`, and the founder does the talking.

### 12.1.3 Communicate with shareholders

Runs `workflows/12-1-3-communicate-with-shareholders.json`.

Begin with who must hear, not with what to say. Read `governance/ownership` for who holds shares, a SAFE or a note, and `governance/founder-agreement` for the information, pro rata and consent rights each holder was promised, and write that duty on each investor record so no holder is left off by accident.

Then draft the update in the shape the record already holds: a headline, the metrics, the highlights, the lowlights, at most three asks and the runway. Use the same metrics as the last update, defined the same way, each naming the record it came from, and put bad news in the lowlights before anyone hears it elsewhere. The trap is a metric that quietly changes definition between periods, because a reader who notices stops trusting the rest.

To the person: approving and sending is `public-commitment`, and the update is marked sent only after the founder has sent it. Answers to a shareholder's question go to the founder to send, never from you.

## Records

Read: `governance/ownership`, `governance/founder-agreement`, `purpose/money/summary`, `finance/spend`, `investors`, `investor-relations/raises`, `investor-relations/updates`, `markets`, `industries`, `purpose/competitor`, `foundation/icp`, `foundation/goals`, `product` and the open decisions.

Write: `investors/[id]` for each lender and each holder, `investor-relations/raises/[id]` for a borrowing, `investor-relations/updates/[id]` for the period's update, `operations/handoff/[id]` for evidence, and `decisions/[id]` to raise a question.

An analyst or a publication has no record type of its own, and neither has a lender covenant as a thing apart from its investor record: both are not built, so the analyst list, the coverage log and the lender packet go on the handoff as evidence.

## Standards

- US Regulation D Rules 506(b) and 506(c). Under 506(b), Rule 502(c) forbids general solicitation, so while the venture relies on it nothing public may say it is raising. Under 506(c) every investor must be verified as accredited.
- ISO 4217 currency codes, which the raise record's currency field uses.
- Where the venture's books are kept on a stated basis, such as generally accepted accounting principles, say which basis a figure is on when a lender or a shareholder will compare it with another period.

## What the person decides

- Whether to borrow at all, on what instrument and at what size.
- Every conversation with a lender, an analyst or a shareholder.
- Whether a briefing, a lender packet, a deck or an update goes out, and in exactly which words.
- Which exemption a raise relies on, with counsel.
- Whether coverage is worth the founder's hours this quarter.
