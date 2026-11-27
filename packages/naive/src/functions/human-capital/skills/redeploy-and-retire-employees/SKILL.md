---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-6]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: redeploy-and-retire-employees
description: >
  Move a person's role up or down against one written test, end or pause an
  engagement so that access, handover, final pay and surviving obligations are
  all accounted for, and check an assignment in another country before it starts.
  Load it for the three workflows of APQC process group 7.6, and whenever the
  founder asks "should I promote them", "what do I have to do when someone
  leaves" or "can they work from another country".
process_group: "7.6"
---

# redeploy-and-retire-employees

You write the test, prepare the case, and run the lists with a date against every item. The founder decides every move, speaks to every person, settles every final payment, and takes every question about another country's law to counsel. Nothing in this group happens quietly: an access left open and an obligation left unrecorded are the two failures that cost most.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.6.1 Manage promotion and demotion process

Runs `workflows/7-6-1-manage-promotion-and-demotion-process.json`. Write the test before any case: the competencies and their level, the decision rights the move adds or removes from `governance/delegation`, and the pay range it moves into. Then set the person's recorded work against it and give the founder the case alongside the alternative of leaving the role as it is, with the yearly cost either way. Once the founder has decided and told the person, update `people` and name the delegation change the move needs, so the person's reach matches their role. Good evidence is a move judged against the same test as the last one; the trap is a title change with no change in what the person decides, which raises cost and nothing else.

### 7.6.2 Manage separation

Runs `workflows/7-6-2-manage-separation.json`. Offboarding is the one step here that always applies: accounts and access to close with who closes each from `it/connections` and `governance/delegation`, work and records to hand over, final pay and notice owed, the venture's property to return, and the agreements that survive, each with a date against it when done. Retirement, leave of absence and outplacement are steps to consider, because they arise only when someone raises them. Good evidence is every access closed with its date and its closer; the trap is a departure recorded in a message and nowhere else, which leaves credentials live for months. The founder speaks to the person and settles the money.

### 7.6.3 Relocate employees and manage assignments

Runs `workflows/7-6-3-relocate-employees-and-manage-assignments.json`. A person working from a country other than the one their engagement names can create an employer obligation and a tax presence for the venture in that country, so the questions are asked before the assignment starts, not after. Record the dates, where the person is paid from, which law the engagement names, and the tax, immigration, social security and employment questions the place raises, and hand every one of them to the founder and counsel. Good evidence is a dated record showing the questions were put before the start date; the trap is treating a long stay abroad as a private arrangement.

## Records

The workflows read `people`, `people/founders`, `people/team-plan`, `governance/internal-terms`, `governance/ownership`, `governance/delegation`, `governance/decision-rights`, `legal/obligations`, `legal/risks`, `finance/budget`, `purpose/money/summary`, `it/connections`, `operations/handoff` and `decisions`.

They write `people`, `decisions/[id]` and the handoff they run under. The delegation change a move needs is named for a person to make: `governance/delegation` is not this function's to write.

A separation record, an offboarding checklist, a leave register and an assignment record: not built. Each lives on the handoff with its dates written out, and anything that commits money or survives the engagement lives in the decision that settles it.

## Standards

- The United States Worker Adjustment and Retraining Notification Act, which applies to employers of 100 or more employees and so reaches almost no early venture, named here only so the threshold is known rather than guessed. This is not legal advice, and the question goes to the founder and counsel.
- ISO 30408:2016, *Human resource management: Guidelines on human governance*, for keeping decision rights and roles aligned when a role changes.

## What the person decides

- Every promotion, demotion and change of terms.
- Every ending of an engagement, and everything said to the person.
- Final pay, notice and anything the venture offers on departure.
- Whether a leave of absence is agreed, and on what terms.
- Whether an assignment in another country goes ahead, with counsel.
