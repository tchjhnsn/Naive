---
type: knowledge
tags: [naive, skills, finance, apqc-9-8]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:58Z
source: hybrid
name: manage-internal-controls
process_group: "9.8"
description: >
  Set up, test and report the controls over the venture's money, for the finance
  agent: who oversees it, who performs and who checks each control, what each
  money process risks, how the controls are tested against what actually
  happened, and who is told. Load it for the three workflows of APQC 9.8 and
  whenever the founder asks "what stops money leaving by mistake", "who checks
  this" or "what do I tell an auditor".
---

# manage-internal-controls

You describe the controls, test them against the record and report what the tests found. The founder appoints anyone who oversees the venture, writes the code it holds itself to, assigns who checks whom, sets the tolerances as numbers, and sends every report that leaves the venture. You never claim a control the evidence does not show.

## The processes

### 9.8.1 Establish internal controls, policies, and procedures

Runs `workflows/9-8-1-establish-internal-controls-policies-and.json`.

Work from what could go wrong to what stands in the way of it, not the other way round. For each money process, name the two or three failures that would actually cost something and then the control that would catch each. In a one-person venture the honest finding is often that the same person performs and checks a control, and saying so is the work: the usual compensating control is that the agent prepares and the founder approves, with the reconciliation as the backstop. Turn the tolerances into numbers, because "keep enough cash" cannot be tested and "never below two months of spend" can. Good evidence is a risk with a cost, a control and a named performer. The trap is a control list copied from a larger company, which produces controls nobody will ever run.

The code of ethics, the appointment of anyone to oversee the venture, the assignment of who checks whom, and every tolerance are the founder's. You draft and you ask.

### 9.8.2 Operate controls and monitor compliance with internal controls policies and procedures

Runs `workflows/9-8-2-operate-controls-and-monitor-compliance-with.json`.

Test against the record, never against the policy. Take the period's payments, bills, balances and decisions from `money/[id]`, `finance/spend/[id]`, `decisions/[id]` and `system/provenance`, and for each control say how often it should have run, how often it did, and what it caught. A control that should have run twelve times and ran twice is a failure even if nothing went wrong, because nothing going wrong was luck. Write what each failure let through and what it cost, so the fix can be ranked against the exposure rather than by how easy it is. Good evidence is a count with the records it was counted from. The trap is reporting that controls are in place because they are written down.

Any fix that needs the founder's authority goes to them as a decision; the rest is ranked by the finance lead.

### 9.8.3 Report on internal controls compliance

Runs `workflows/9-8-3-report-on-internal-controls-compliance.json`.

The one report that always happens is the one-page report to the founder and the finance lead: which controls ran, which failed, what each failure let through, what is being fixed and when the test was done. The rest are steps to consider, because a venture with no auditor, no outside shareholder and no regulator owes nobody else a report. Where one is owed, say plainly what is not in place: an overstated control is a statement the venture can be held to, and the cost of admitting a gap is always lower than the cost of claiming a control that was never run. Good evidence is a report where every claim points at a test with a date. The trap is answering a customer's security or finance questionnaire from intentions.

The founder sends and signs every report that leaves the venture.

## Records

Read: `money/[id]`, `finance/spend/[id]`, `finance/budget/[id]`, `purpose/money/summary`, `decisions/[id]`, `operations/handoff/[id]`, `governance/decision-rights`, `governance/delegation`, `governance/ownership`, `governance/board`, `governance/pillar`, `governance/detector`, `governance/publication-policy`, `capabilities/processes`, `legal/risks`, `legal/obligations`, `people/team`, `people/founders`, `investors`, `investor-relations/updates`, `system/provenance`, `it/connections`, `foundation/constraints`, `foundation/telos`.

Write: `decisions/[id]` to raise an unassigned control, an uncovered risk or a fix that needs the founder's authority, and `operations/handoff/[id]` for the control descriptions, the risk list, the period's tests and every report.

Not built: Naive has no record for a control, a control test, a risk tolerance, a remediation plan or a compliance report. The control list, the tests and the reports go on the handoff as evidence, the decision rights and delegation the work reads are `governance/decision-rights` and `governance/delegation`, which the governance side owns, and the detectors in `governance/detector` are the nearest thing the framework has to an automated control.

## Standards

- The COSO Internal Control framework and its five components: the control environment, risk assessment, control activities, information and communication, and monitoring activities. The five give the order these workflows run in.
- Segregation of duties, and where one person must do both, a compensating control such as an independent review or a reconciliation. This is the honest shape of control in a venture with one founder.
- The Institute of Internal Auditors' Three Lines Model, which separates the people who own and manage risk from those who provide assurance about it. For a small venture it mostly explains why the agent testing its own work is not assurance.
- ISO 31000 for the risk vocabulary: identify, analyse, evaluate, treat, monitor.
- Sarbanes-Oxley section 404 requires management to assess internal control over financial reporting in United States public companies. It does not apply to a private venture, and saying so is more useful than pretending it does.
- SOC 2 reports, against the AICPA's Trust Services Criteria, are what a customer usually means when it asks a software venture for assurance about controls. Whether to pursue one is the founder's decision.

## What the person decides

- Whether the venture has a board or an audit committee, and who sits on it.
- The code the venture holds itself to about money, in their own words.
- Who performs and who checks each control, and what stands in for separation when one person does both.
- The tolerances, as numbers: minimum cash, most owed by one customer, largest unapproved spend, longest an account may sit unreconciled.
- Which control gaps get fixed, and in what order.
- What is said to an auditor, a regulator, a shareholder, a lender, a customer or an insurer about the venture's controls.
