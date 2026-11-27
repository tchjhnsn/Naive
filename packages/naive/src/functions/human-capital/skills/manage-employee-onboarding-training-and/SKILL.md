---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: manage-employee-onboarding-training-and
description: >
  Get someone productive, keep their objectives tied to a goal, and close the
  competency gaps the goals demand. Load it for the four workflows of APQC
  process group 7.3, and whenever the founder asks "what does their first week
  look like", "how do I review someone", "what should they learn next" or "do we
  need a certification for this work".
process_group: "7.3"
---

# manage-employee-onboarding-training-and

You write the lists and keep the records: the first-week list, the objectives, what the review found, the competency comparison and the ranked gaps. The founder grants access, holds every review conversation, agrees each person's objectives with them, and approves every sum and every working hour spent on learning.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.3.1 Manage employee onboarding

Runs `workflows/7-3-1-manage-employee-onboarding.json`. Write the list once and reuse it: the accounts and access the role needs with who may grant each from `governance/delegation` and `it/connections`, the records to read in order, the first real task and who answers questions. Run it item by item with a date against each. The measure worth keeping is the date of the person's first finished real task, not the number of items ticked. Good evidence is an access grant with the granter and the date; the trap is an onboarding list of reading with no first task, which leaves the person busy and unproductive. Every grant, signature and introduction is the founder's.

### 7.3.2 Manage employee performance

Runs `workflows/7-3-2-manage-employee-performance.json`. Two or three outcomes per person per quarter, each traced to a goal in `foundation/goals` and each readable from a record rather than an impression. Prepare the review as what the objectives said, what the records show, the gap, and the questions to ask; the founder holds the conversation and reports back. Record what they report with the evidence and anything the person disputed, and keep your own view of the person out of it. Good evidence is a judgement with the record behind it; the trap is a review of character rather than of outcomes, which the records cannot support and the person cannot answer.

### 7.3.3 Manage employee career development

Runs `workflows/7-3-3-manage-employee-career-development.json`. Write the venture's limits on paying for learning first, in money and in working hours, so every later answer is already decided. Then compare each person's competencies with what their role and the plan need, and propose one thing to learn next with the real task it will be practised on. Say plainly where the venture is too small to offer a next step: a path it cannot honour is worse than none. Good evidence is a named successor for work only one person can do; the trap is a career ladder drawn for roles the venture has no plan to create. The founder sets the spending limits and makes every promise about a person's future.

### 7.3.4 Develop and train employees

Runs `workflows/7-3-4-develop-and-train-employees.json`. Go in order: which capability the goals demand, the competencies each role needs, one specific way to gain each missing one, then the gaps ranked by the goal each blocks and the monthly cost of leaving it open. Only then build or buy training. Judge each training by the measure before and after on the task it was practised on, and say what else changed at the same time. Good evidence is a gap that names the goal it blocks; the trap is buying a course because it is available and reporting attendance as the result. Certifications are different: where the work may not lawfully be done without one, the expiry is a compliance date, and every approach to a certifying body is the founder's.

## Records

The workflows read `people`, `people/founders`, `people/team-plan`, `foundation/goals`, `foundation/telos`, `governance/delegation`, `governance/decision-rights`, `governance/internal-terms`, `it/connections`, `capabilities/processes`, `capabilities/postmortems`, `operations/activity-assignments`, `operations/activity-summary`, `finance/budget`, `legal/obligations`, `glossary` and `decisions`.

They write `people`, `decisions/[id]` and the handoff they run under.

An onboarding checklist, a performance objective, a training record and a certification register: not built. Naive has no route for any of them, so each lives on the handoff as evidence, with the dates written out, and anything that commits money or a promise lives in the decision that settles it.

## Standards

- The ADDIE model, analyse, design, develop, implement and evaluate, for the order in which training is built rather than bought.
- Kirkpatrick's four levels of training evaluation, reaction, learning, behaviour and results, for judging a training by what changed in the work rather than by attendance.
- ISO 10667-2:2011, *Assessment service delivery*, where an outside assessment is used in a review or a development plan.

## What the person decides

- Every access grant, signature and introduction during onboarding.
- Each person's objectives, agreed with them.
- Everything said in a performance conversation, and what follows from it.
- What the venture will pay for in learning, in money and in hours.
- Whether to pursue a certification, and every approach to a certifying body.
- Whether a role the venture cannot run without needs a named successor now.
