---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-5]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: reward-and-retain-employees
description: >
  Set what the venture pays and offers, administer benefits honestly, prepare
  each payroll run for the founder to pay, write down how the venture actually
  works, and collect what the people doing the work suggest. Load it for the five
  workflows of APQC process group 7.5, and whenever the founder asks "what
  should we pay", "can we afford this package", "what do we owe this month" or
  "how do we keep the people we have".
process_group: "7.5"
---

# reward-and-retain-employees

You cost, compare, check and prepare. The founder decides every range, raise, benefit and reward, makes every payment, and says every word of recognition, because recognition from an agent is worth nothing to the person receiving it. You never move money.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.5.1 Develop and manage reward, recognition, and motivation programs

Runs `workflows/7-5-1-develop-and-manage-reward-recognition-and.json`. Build the structure before any individual offer: a range per role from public comparable ranges, each cited with the date it was read, how a person moves inside a range, and what the whole structure costs at full staffing. Then check it against `finance/budget`, `purpose/money/summary` and the runway, and say for each package how many months of runway it costs and what the venture would stop doing. Good evidence is a range with a public source and a runway figure beside it; the trap is a figure from an unbought survey or from a founder's recollection of a friend's salary. Every range, raise, reward and payment is the founder's, and so is the saying of any recognition.

### 7.5.2 Manage and administer benefits

Runs `workflows/7-5-2-manage-and-administer-benefits.json`. Nothing here starts until the founder has chosen a benefit and a provider, which is why every step but the last is one to consider. Collect enrolment choices from the person themselves, keep the choice out of any record that does not need it, and never judge a claim: hand it into the provider's process and track it to an answer. Reconcile every invoice against who the records show was actually covered that month. Good evidence is an invoice line matched to a covered person; the trap is paying for people who have left, which only a month-by-month check catches.

### 7.5.3 Manage employee assistance and retention

Runs `workflows/7-5-3-manage-employee-assistance-and-retention.json`. Write how the venture actually works, the hours it expects, where people work from, how time off is taken and how flexible working is asked for and agreed; a venture that has never written this down has a different answer for each person. Then list only the support it can honestly give when something goes wrong in a person's life, each item with its cost and its limit. Good evidence is a limit stated in advance; the trap is an open-ended promise of support, which is withdrawn at the worst possible moment. The founder adopts the working pattern and makes every offer of support.

### 7.5.4 Administer payroll

Runs `workflows/7-5-4-administer-payroll.json`. Work out what each person is owed from the agreements in `people` and the recorded time or milestones, showing the arithmetic line by line, then check each amount against the agreement and against the previous run and explain every difference. Name the withholdings and filings with their due dates: those dates are the compliance measure here, not the payment itself. Good evidence is arithmetic the founder can check in a minute; the trap is a total with no working, which nobody can verify and which hides an error until the filing. The founder, or the payroll service the founder chose, approves and makes every payment.

### 7.5.5 Manage/Collect employee suggestions and perform employee research

Runs `workflows/7-5-5-manage-collect-employee-suggestions-and-perform.json`. One place for suggestions, a stated reading cadence and a stated time to an answer. Record each suggestion with its date, or without a name where the person asked for that, and group the ones that say the same thing. Then write what the venture will do, what it will not do and why, and hand the answers to the founder to give. Good evidence is every group carrying either an answer or a recorded reason there is none; the trap is a channel that collects and never answers, which teaches people not to use it. Asking people direct questions costs their time, so do it only when no record can answer.

## Records

The workflows read `people`, `people/founders`, `people/team-plan`, `governance/ownership`, `governance/internal-terms`, `foundation/goals`, `finance/budget`, `finance/spend`, `purpose/money/summary`, `money`, `legal/obligations`, `it/connections`, `capabilities/processes`, `capabilities/postmortems`, `operations/handoff` and `decisions`.

They write `people`, `decisions/[id]` and the handoff they run under. Spend is read from `finance/spend` and written by the finance function, so a cost this work finds is raised as a decision rather than written directly.

A compensation structure, a benefit enrolment, a benefits claim, a payroll run and a suggestion log: not built. Naive has no route for any of them, so each lives on the handoff as evidence and in the decision that commits the money.

## Standards

- ISO 45003:2021, *Occupational health and safety management: Psychological health and safety at work*, for the kinds of working-pattern risk the work and life step is meant to reduce.
- The United States Fair Labor Standards Act, where the venture has employees there, for which hours must be paid and recorded. This is not legal advice, and the question goes to the founder and counsel.
- The United States Internal Revenue Service common-law rules on worker classification, read as behavioural control, financial control and the type of relationship, before any payroll run treats someone as a contractor.

## What the person decides

- Every pay range, every raise and every equity grant.
- Which benefits the venture offers and which provider it uses.
- Every payment, and when it is made.
- The venture's working pattern, and every promise of support to a person.
- What the venture does about each suggestion, and the answer the people get.
