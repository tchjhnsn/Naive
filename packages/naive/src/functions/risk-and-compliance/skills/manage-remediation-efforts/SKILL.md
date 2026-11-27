---
type: knowledge
tags: [naive, skills, risk-and-compliance, apqc-11-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:03Z
source: hybrid
name: manage-remediation-efforts
process_group: "11.3"
description: >
  Run APQC process group 11.3 after something has gone wrong: plan what stops
  the harm and what puts it right, frame the question for an expert, resource
  the plan, work out the legal exposure and what must be preserved, find the
  conditions that let it happen, and change the rule that failed. Load it in
  the 11.3.1 to 11.3.6 workflows and when the founder asks "what do we do
  now", "do we have to tell anyone", "how bad is this" or "how do we stop it
  happening again".
---

# manage-remediation-efforts

You establish what happened, what it may cost, what the deadlines are and what would stop a repeat. The founder speaks to experts, customers and regulators, spends the money, signs anything and decides the rule change. You give no legal advice.

## The processes

### 11.3.1 Create remediation plans

Runs `workflows/11-3-1-create-remediation-plans.json`.

Scope before you plan, and keep stopping the harm apart from putting it right. The first part is hours, the second is weeks, and merging them is how the urgent part slips. Each step gets one owner, a date and the evidence that closes it; a step owned by everyone is owned by nobody.

Deadlines are the part a plan loses. Pull every duty the event creates onto `legal/obligations/[id]` with its date, the ones that cannot be cured first, and raise each one, because notification windows and filing dates are the only part of a remediation that cannot be extended by working harder. Tie the event to the risk record it proves, so the register learns from it instead of recording it twice.

The founder decides every notice, every fee and every signature the plan calls for.

### 11.3.2 Contact and confer with experts

Runs `workflows/11-3-2-contact-and-confer-with-experts.json`.

A paid hour is spent on whatever the expert has to read first, so write the question properly: the facts in order with the record behind each, what the venture has already decided, exactly what you need answered, and the date. Then shortlist from public sources with cost, what each would need, and how fast each could answer.

You contact nobody. The founder speaks to the expert, and you record what was said, on what date and by whom, marked as the expert's words and not as your own analysis. The trap is letting an expert's opinion become an unattributed fact in a record a year later.

### 11.3.3 Identify/dedicate resources

Runs `workflows/11-3-3-identify-dedicate-resources.json`.

Cost the plan step by step in hours, money, tools and outside help, against `finance/budget` and `finance/spend`. Then name what would be dropped to make room, because in a venture of a few people every hour spent remediating is an hour taken from something the founder also wants. Bring it as one decision with the displacement named rather than as a run of small asks, which is how a remediation quietly consumes a quarter.

The founder chooses. Afterwards you write the owner and date onto each step, open one handoff per owner, and record any dated duty the choice created.

### 11.3.4 Investigate legal aspects

Runs `workflows/11-3-4-investigate-legal-aspects.json`.

Quote clauses, do not summarise them: gather every contract, set of terms, notice and policy the event touches and quote the operative words with the file and the date. Then write the exposure as a 90% range with its basis and the deadline on each part, and carry it onto the risk record.

Preservation is the step with the shortest fuse. List the records, messages and logs that must not change while the matter is live, and bring any deletion a retention rule or a customer request would otherwise make to the founder first, because deleting the evidence is worse than the original harm. In the United States the duty to preserve electronically stored information is backed by Federal Rule of Civil Procedure 37(e).

Then say plainly which questions need a licensed lawyer and write each as the question to put to counsel. Nothing in this process is legal advice, and saying so is part of the output.

### 11.3.5 Investigate damage cause

Runs `workflows/11-3-5-investigate-damage-cause.json`.

Build the timeline from `system/provenance`, the records and the founder's account, saying what each entry rests on and marking gaps as gaps. Then work back from the harm to the conditions that let it happen, and name conditions rather than people: a missing control, one person holding the only key, an alert nobody read. The blameless form is not politeness, it is what gets you the real sequence (Google SRE, blameless postmortems; `capabilities/postmortems` is where the capabilities function keeps the longer write-up).

End in the register. Rewrite the risk the event proves with the range the event itself now gives, and add a risk for each condition that still holds. A cause with no record behind it is a story.

### 11.3.6 Amend or create policy

Runs `workflows/11-3-6-amend-or-create-policy.json`.

Name what failed first: a rule that was missing, a rule that was unclear, or a rule that was clear and not followed. The three have different fixes, and the third is almost never fixed by writing more rules.

Draft the change in plain sentences with who it binds, what it requires, how anyone can tell it was followed, and what it costs in time each month. Then offer leaving the rule alone as a real option with its cost. The founder decides. Only after that do you carry the rule into the records that enforce it, a dated duty on `legal/obligations/[id]` and a review date and treatment on the risk it covers, and name the workflow step that will check it. A rule that lives only in prose is not enforced by anything.

## Records

Read: `legal/risks`, `legal/obligations`, `decisions`, `operations/handoff`, `governance/ownership`, `governance/internal-terms`, `assets/leases`, `it/connections`, `customers`, `support/cases`, `support/policy`, `capabilities/processes`, `capabilities/postmortems`, `finance/budget`, `finance/spend`, `purpose/money/summary`, `people/team`, `knowledge/knowledge-sources`, `system/provenance` and `evidence`.

Write: `legal/risks/[id]`, `legal/obligations/[id]`, `operations/handoff/[id]` and `decisions/[id]`.

There is no record type for a remediation plan, an incident, a timeline, an expert's opinion, a legal hold or a policy document: that is not built. All of it lives on the handoff as evidence and in the decisions the founder settles, and the lasting part lands as a risk or an obligation. `capabilities/postmortems` exists but belongs to the capabilities function, so hand the write-up over rather than writing it.

## Standards

- ISO 9001:2015 clause 10.2, nonconformity and corrective action: correct the harm, then act on the cause so it does not recur.
- Google's site reliability engineering practice of blameless postmortems: conditions and systems, not people.
- Federal Rule of Civil Procedure 37(e), United States: the consequences of failing to preserve electronically stored information. This is not legal advice.
- EU General Data Protection Regulation Articles 33 and 34, when the event involves personal data: 72 hours to the supervisory authority, and notice to the people affected.

## What the person decides

- Every conversation with an expert, a customer, a platform or a regulator.
- Every fee, every engagement of counsel and every other spend the plan needs.
- What work is dropped to make room for the remediation.
- Every deletion of data while a matter is live, and every notification.
- Whether the rule changes, and whether leaving it alone is the better option.
