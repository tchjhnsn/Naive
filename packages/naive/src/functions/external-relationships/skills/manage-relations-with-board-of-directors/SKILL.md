---
type: knowledge
tags: [naive, skills, external-relationships, apqc-12-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:39Z
source: hybrid
name: manage-relations-with-board-of-directors
process_group: "12.3"
description: >
  Report to a board: the period's financial results, and the audit and review
  findings, both drafted as board updates whose figures name their records and
  whose asks are only what the board itself must decide. Load it in the two APQC
  12.3 workflows, and when the founder asks what goes in the board pack, what
  the board has reserved, or how to tell the board something went wrong.
---

# manage-relations-with-board-of-directors

You assemble the board pack from the records and draft it. The founder approves the words and sends them, and the board decides what the board record reserves for it.

A board report is the one place where a figure the venture cannot trace is most expensive, because the board will quote it back later. Every figure names the record it came from, and keeps the definition it had last period.

## The processes

### 12.3.1 Report financial results

Runs `workflows/12-3-1-report-financial-results.json`.

Read `governance/board` first, for the seats, the reserved matters and the reporting cadence, then the last board update, and list what this period owes the board and by when. Only then assemble figures: cash, monthly flows and runway from `purpose/money/summary`, the plan from `finance/budget`, the actuals from `finance/spend`.

Order matters in the draft. One headline change, then the figures, then what went wrong or is at risk before the highlights, then the asks. The asks are only decisions the board itself must take, each with its options and your recommendation, so the board can settle them in the meeting instead of asking for a follow-up pack. A matter the board record reserves is `ownership-or-control`, so it is raised, never decided.

The trap is a redefined metric. When a definition has to change, show both the old and the new figure for this period and say which record each came from.

To the person: approving and sending, which is `public-commitment`, and the status is set to sent only after the founder has sent it.

### 12.3.2 Report audit findings

Runs `workflows/12-3-2-report-audit-findings.json`.

A finding is anything a check, a review or an auditor found that has not been fixed. Collect them from `evidence`, `legal/risks` and `legal/obligations`, and ask the founder for any review the records do not hold, because an audit that exists only in an email is still a finding.

Rate each one by the cost of doing nothing against the cost of the fix, taking likelihood and impact ranges from the risk register where it holds them, and order them that way. Do not soften a finding, do not merge two findings into one line, and do not report a fix as done without the evidence record that shows it. Every finding carries an owner and the date its fix is due; a finding with no owner is the one that is still open at the next report.

The reason to do this at all is that a board which hears a finding from the venture first can still help with it.

To the person: approving and sending, which is `public-commitment`, and any decision the findings force on the board.

## Records

Read: `governance/board`, `governance/ownership`, `purpose/money/summary`, `finance/budget`, `finance/spend`, `evidence`, `legal/risks`, `legal/obligations`, `investor-relations/updates`, `operations/handoff`, `foundation/goals`, `foundation/telos` and the open decisions.

Write: `investor-relations/updates/[id]` with audience board, `operations/handoff/[id]` for the assembled figures and the findings list, and `decisions/[id]` to raise what the board or the founder must settle.

There is no board meeting record, no minutes record and no audit record: these are not built, so the agenda, the findings list and the evidence behind each figure go on the handoff. Resolutions a board passes belong to governance, not to this function.

## Standards

- The board's own reserved matters, as `governance/board` records them, are the authority for what the board decides rather than the founder. Nothing in this skill overrides that record.
- Where the venture's books are kept on a stated basis, such as generally accepted accounting principles or IFRS, name the basis beside any figure the board will compare across periods.

## What the person decides

- What goes to the board and in exactly which words.
- When the report is sent, and the status is set to sent only after that.
- Every matter the board record reserves, which the agent raises and never settles.
- Whether a finding is disclosed early rather than held to the next cycle.
- Which audit or review to commission, and what it costs.
