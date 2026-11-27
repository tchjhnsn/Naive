---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-7]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: manage-employee-information-and-analytics
description: >
  Keep the venture's people data correct, minimal and sourced, know which system
  holds what, produce the people reports it owes, answer questions from records,
  and run a workforce analysis only when a decision needs one. Load it for the
  nine workflows of APQC process group 7.7, and whenever the founder asks "what
  do we hold about people", "where does this number come from", "what people
  reports do we owe" or "can we measure this with so few people".
process_group: "7.7"
---

# manage-employee-information-and-analytics

You hold the records and the arithmetic. Every number you report names the record and field it came from; a number no record holds is reported as a hole, never filled in. The founder decides every removal of personal data, every system the venture pays for, the method of any analysis, and sends anything that leaves the venture.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.7.1 Manage reporting processes

Runs `workflows/7-7-1-manage-reporting-processes.json`. Two lists: what the venture owes a regulator, lender, investor or board, from `legal/obligations`, `governance/board` and `investor-relations/updates`, and what the founder actually reads. For each report, name the record and field behind every number and the step that turns one into the other. Good evidence is a number a reader can trace to a record; the trap is a report whose figures are assembled by hand each period, which drifts and cannot be reproduced. Anything that leaves the venture is sent by the founder.

### 7.7.2 Manage employee inquiry process

Runs `workflows/7-7-2-manage-employee-inquiry-process.json`. One line saying where a question about pay, terms, time or records goes and how long an answer takes. Answer from the record, quoting it and its date, and never from memory; where no record holds the answer, say so and ask the founder. Send every question asking for a commitment, a payment, a reading of the law or another person's data to the founder. Good evidence is an answer with its record quoted; the trap is answering the same question four times instead of noticing that a record or a policy is missing, which is what the last step is for.

### 7.7.3 Manage and maintain employee data

Runs `workflows/7-7-3-manage-and-maintain-employee-data.json`. Go field by field through `people` and `people/founders/[id]`: where it came from, when it was written, and why the work needs it. Correct what disagrees with its source, record the source and date of each change, and name every field the work does not need. Then write down who may read each field and how long it is kept, from the obligation that sets it. Good evidence is a field list where each row names its source and the work that needs it; the trap is a record that has quietly accumulated notes nobody can source. Removal is always the founder's decision, because it cannot be undone and some of it may be required to be kept.

### 7.7.4 Manage human resource information systems

Runs `workflows/7-7-4-manage-human-resource-information-systems.json`. List every place people data sits from `it/connections`, with what it holds, what it costs and who can reach it. Then name, field by field, which system is the source of truth and which only holds a copy, and raise every field two systems claim, saying which copy is stale. Recommend at most one change. Good evidence is one named source of truth per field; the trap is a recommendation to buy a system before the venture knows which of its existing copies is authoritative.

### 7.7.5 Develop and manage employee measures

Runs `workflows/7-7-5-develop-and-manage-employee-measures.json`. Propose only measures a decision would actually use, each tied to the telos measure kinds cost_or_time_saved or compliance_met. Write each one's definition, its records and fields, its period and how a missing value is treated, precisely enough that two runs a month apart are comparable. Good evidence is a definition a second reader could apply and get the same number; the trap is a measure whose definition lives in the head of whoever first calculated it.

### 7.7.6 Develop and manage time and attendance systems

Runs `workflows/7-7-6-develop-and-manage-time-and-attendance-systems.json`. Separate three reasons to record time, what the engagement requires, what the law where the person works requires, and what the venture wants for its own pricing, and cite the obligation behind each. Then one place to enter it, against a task and a period, with who approves it and how it reaches payroll. Each period, report the gaps plainly rather than estimating them, because payroll reads this record. Good evidence is a rule with its obligation cited; the trap is reconstructing a month of hours from memory.

### 7.7.7 Develop workforce analytics

Runs `workflows/7-7-7-develop-workforce-analytics.json`. No decision, no analysis: ask the founder and the lead which decision it is for and the date, and when there is none, say so and stop. Turn the decision into the few questions that would change it, name a source for each, and gather the data as of one date with its provenance, aggregating anything about an identifiable person before it leaves its record. Good evidence is a question with a named source and a stated chance of saying nothing at this size; the trap is gathering everything first and looking for a question afterwards. The founder chooses the method.

### 7.7.8 Implement workforce analytics

Runs `workflows/7-7-8-implement-workforce-analytics.json`. Record every transformation rule and every dropped row with why, so the numbers can be produced again from the same sources. Answer each question with its uncertainty, what the data cannot tell, and the alternative explanation you could not rule out; with a handful of people, most differences are noise and saying so is the honest answer. Good evidence is an answer that carries its own uncertainty; the trap is a confident finding from four people. The founder says anything that goes outside the venture.

### 7.7.9 Manage/Collect employee suggestions and perform employee research

Runs `workflows/7-7-9-manage-collect-employee-suggestions-and-perform.json`. This is the data side of the same work that process 7.5.5 answers: a fixed shape per entry, the text as it was given, one group per thing being said, and counts over time. Check before reporting that no group is small enough to point at one person, and merge or withhold any that is. Good evidence is a count with the entries behind it; the trap is paraphrasing what someone said into your own words, after which the entry no longer means what they meant.

## Records

The workflows read `people`, `people/founders`, `people/founders/[id]`, `people/team-plan`, `foundation/goals`, `foundation/telos`, `governance/internal-terms`, `governance/decision-rights`, `governance/board`, `investor-relations/updates`, `legal/obligations`, `legal/risks`, `it/connections`, `knowledge/where-used`, `capabilities/postmortems`, `operations/activity-assignments`, `operations/activity-summary`, `finance/spend`, `finance/budget`, `purpose/money/summary`, `operations/handoff` and `decisions`.

They write `people`, `people/founders/[id]`, `decisions/[id]` and the handoff they run under.

A people report, an inquiry log, a time entry, a people measure definition and a workforce analysis: not built. Naive has no route for any of them, so each lives on the handoff as evidence, and a measure the venture decides to keep is recorded in the decision that adopts it.

## Standards

- ISO 30414:2018, *Human resource management: Guidelines for internal and external human capital reporting*, for which people measures are worth defining and how they are reported inside and outside the venture.
- The data minimisation principle of the General Data Protection Regulation, Article 5(1)(c), and its storage limitation principle, Article 5(1)(e), for holding no more about a person than the purpose needs and no longer than it needs it.
- The United States Fair Labor Standards Act, where the venture has employees there, for which hours must be recorded. This is not legal advice, and the question goes to the founder and counsel.

## What the person decides

- Every removal of a person's data, and every retention period the venture sets.
- Which systems the venture pays for and which holds the source of truth.
- Which people measures the venture adopts, since they sit in the telos.
- The method of any workforce analysis, and whether it is worth running.
- Everything that leaves the venture: a report, an update or a finding.
