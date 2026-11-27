---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: manage-enterprise-quality
process_group: "13.3"
description: >
  How the capabilities agent sets what good means here and keeps it: quality
  characteristics with a line each, preventive steps and control points in the
  process records, checks proved before they are relied on, and every failure
  turned into a blameless postmortem with owned actions. Load it for the
  workflows of APQC 13.3 and when the founder asks "is this good enough to send",
  "why did this go wrong again" or "what are we checking before it goes out".
---

# manage-enterprise-quality

You turn what the customer counts as good into characteristics that can be checked, put the checks where the defect is made, and run the failure review. The founder says what quality means for this venture and what it will not accept, approves the plan, and makes any statement to a customer or a regulator.

Prevention before inspection. A check at the end of a process tells you the work is wrong after it has been paid for; a step that makes the defect impossible costs less and is read more often. Where a check is still needed, prove it catches a known bad case before anyone relies on it.

## The processes

### 13.3.1 Establish quality requirements

Runs `workflows/13-3-1-establish-quality-requirements.json`.

Take the characteristics from evidence, not from taste: `validation/interviews`, `support/cases`, `product/bugs` and `legal/obligations` say what customers and duties actually ask for. Each characteristic needs a line that two people would judge the same way. Then, for each, write the preventive step first and place it ahead of the step where the defect used to appear. Only then write the check: which step it sits in, how much is checked and how often, how the judgement is made, and what the checker needs to be able to do.

Prove each check once on work already done, with a known good and a known bad case. A check that passes both is not a check. Good evidence is that pair of runs recorded on the handoff. The trap is a long list of characteristics nobody checks; three that are checked beat twelve that are aspirations.

The founder approves the finished plan, and any line a contract or a regulation fixes is theirs and counsel's.

### 13.3.2 Evaluate performance to requirements

Runs `workflows/13-3-2-evaluate-performance-to-requirements.json`.

Run the checks the plan names on the sample it names, record every result against its line, and give each failed item a disposition: reworked, let through, or stopped. A result with no disposition is an open question pretending to be data.

Then say what the sample can carry. At a venture's volumes this is usually very little, and saying so is the honest part of the job. Summarize which characteristics held, recommend an action for each failure, and leave the choice of what to act on to the founder.

### 13.3.3 Manage non-conformance

Runs `workflows/13-3-3-manage-non-conformance.json`.

Order: impact, containment, causes, actions, close. Write the impact and the timeline first, while it is fresh. Contain before explaining. Then work back from the timeline to the conditions of the process or the system that let it happen; the `postmortem` skill is the method, and the rule is absolute: a contributing cause is a condition the venture controls, never a person. One corrective action per cause and one preventive action for the class of failure, each with an owner and a due date, each carried by a handoff, with the matching control point added to the process record.

Close only when every action is done or dropped with a reason, after a person has reviewed it. Good evidence is a postmortem whose actions are all closed and whose lessons are named on the process records they apply to. The trap is a postmortem with lessons and no owners: nothing changes.

Anything said to a customer or a regulator is the founder's, and a corrective action that would undo a decision in force goes to them as a decision.

### 13.3.4 Implement and maintain the enterprise quality management system (EQMS)

Runs `workflows/13-3-4-implement-and-maintain-the-enterprise-quality.json`.

At this size the quality system is a short list: what quality means here, which processes carry checks, the procedures behind them, and a reading of whether the system is catching things. Write the scope honestly, including the processes it does not cover, and widen it on purpose. Read the system rather than a process: failures that reached a customer, how many were caught by a control first, and how many postmortem actions are open past their due date.

The trap is a quality system that claims to cover everything on its first day. It then covers nothing, and the first reading has nothing to compare.

The founder states what quality means and what will never be accepted, and owns every public statement about it.

## Records

Read: `capabilities/processes`, `capabilities/postmortems`, `foundation/requirements`, `foundation/telos`, `validation/interviews`, `support/cases`, `product/bugs`, `legal/obligations`, `operations/handoff`, `evidence`.

Write: `capabilities/processes/[id]` for characteristics, preventive steps, control points and the quality plan, `capabilities/postmortems/[id]` for a failure and its actions, `operations/handoff/[id]` for test results and the proving runs, and `decisions/*`.

A quality plan record, a test result record and a non-conformance register of their own are not built: the plan lives on the process record as steps with control points, each test run is evidence on a handoff, and a non-conformance is a postmortem record.

## Standards

- APQC Process Classification Framework 8.0, process group 13.3.
- ISO 9001:2015, clause 10.2 (nonconformity and corrective action), which the postmortem record follows, and its requirement that a documented procedure be reviewed.
- The Google SRE book, chapter 15 (postmortem culture), for blamelessness: the postmortem record cites it.
- Critical-to-quality characteristics and DMAIC from Six Sigma, for turning a customer's words into something with a line, and for the order define, measure, analyze, improve, control.
- The five whys (Toyota) as a way to reach a condition rather than a culprit, stopping at the condition whose removal would have prevented the failure.

## What the person decides

- What quality means for this venture, and which failures it will not accept.
- Approval of the quality plan and of each line that is not fixed by a contract or a regulation.
- Which failed characteristic is acted on first.
- Anything said to a customer, a partner or a regulator about a failure.
- Any corrective action that would undo a decision already in force.
