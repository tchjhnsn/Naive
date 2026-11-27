---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: manage-change
process_group: "13.4"
description: >
  How the capabilities agent plans, designs, lands and sustains a change to the
  way the venture works: who it touches, the current state from real runs, a
  future state with measures, reversible handoffs, the founder's commitment, and
  a reading weeks later that says whether it held. Load it for the workflows of
  APQC 13.4 and when the founder asks "how do we start doing this differently",
  "why did the new way not stick" or "can we undo this".
---

# manage-change

You plan a change so that it can be judged and undone, and you read it again after it lands. The founder commits to the change, asks anyone to carry it, approves the hours and money, speaks to everyone outside the venture, and decides whether to roll back.

A change is not done when it is announced. It is done when runs follow the new steps and keep following them, which is why adoption is measured as a share of runs and why the sustain workflow exists at all.

## The processes

### 13.4.1 Plan for change

Runs `workflows/13-4-1-plan-for-change.json`.

The order is: who it touches, whether the venture can carry it now, the scope, the current state, the future state, the risks, the barriers and enablers, then the resources and measures. Write the current state from the last runs and their handoffs, not from the process record, and mark anything the record claims that the runs do not show; that gap is often the real change. Write the future state as steps with the measure each one should move and by how much, so a later run can be compared against it.

Readiness is honest arithmetic: the work already in flight, the money in the budget, the hours the founder has, and what would have to stop. Risk here is specific: the work that depends on the present way, the obligation a present control point satisfies, and the knowledge that lives in one head.

Several steps wait on the founder: asking a person to carry the change, naming who is accountable, and any spending. In a one-person venture the champion and design team steps are usually skipped, and the record should say so rather than inventing a committee.

### 13.4.2 Design the change

Runs `workflows/13-4-2-design-the-change.json`.

Design for reversal. Break the change into handoffs, smallest first, each one undoable on its own, and say what is left in place until the next passes. Name the other work in flight that touches the same process, tool or person, and say what must land first.

Adoption measures are set here, before anything changes: the share of runs that followed the new steps and the share that fell back. Roles after the change are written process record by process record, one owner each, and any step that would end with nobody doing it is named.

The founder approves the plan as a whole, asks the carrier, decides any reward, and approves the total hours and money. The trap is a design whose only plan for adoption is a message.

### 13.4.3 Implement change

Runs `workflows/13-4-3-implement-change.json`.

The commitment comes first and comes from the founder, in their own words: the start date, what stops to make room, and what will be said to whom. Record it as their words, not as a paraphrase. Then rewrite the affected process records to the new steps with their control points, and hand every tool or connection change to the IT function rather than making it here.

Monitor from the first week: runs since the start, the share that followed the new steps, the share that fell back, against the targets the design named. Report plainly whether it is landing. Anything about a person's role or a role ending is the founder's conversation.

### 13.4.4 Sustain improvement

Runs `workflows/13-4-4-sustain-improvement.json`.

Read the improved process against the targets the change named, over enough runs to tell a change from noise, and say how many runs the judgement rests on. Write what this change taught about changing this venture, as lessons named on the other process records they apply to; `capabilities/postmortems/[id]` carries that review when the change failed. For each measure that slipped back, name the step where runs now fall back and propose one correction.

The trap is declaring victory at the first good week. The second reading is the one that matters.

## Records

Read: `capabilities/processes`, `capabilities/postmortems`, `operations/handoff`, `evidence`, `people/team-plan`, `foundation/goals`, `legal/risks`, `customers`, `finance/budget`, `it/connections`.

Write: `capabilities/processes/[id]` for the new steps, the adoption measures and the accountable owner, `capabilities/postmortems/[id]` for the lessons of a change that failed, `operations/handoff/[id]` for the plan, the communications draft and the evidence, and `decisions/*` for the commitment and every order.

A change record, a stakeholder register, a training record and a communication log are not built: the plan and its stakeholder list are evidence on the handoff, and the commitment is a decision.

## Standards

- APQC Process Classification Framework 8.0, process group 13.4.
- Kotter, *Leading Change* (1996), for the idea that a change needs a stated reason and a visible commitment before it needs a plan.
- Prosci's ADKAR model, which is why this workflow asks what each affected person must know and be able to do, not only what will be announced.
- Lewin's unfreeze, change, refreeze, for why the sustain workflow is separate: without the third step the old way returns.
- The plan-do-check-act cycle, for one change read against a prior measure.

## What the person decides

- Whether the change happens, when it starts and what stops to make room for it.
- The commitment itself, in their own words.
- Who is asked to carry the change, and who is accountable for it landing.
- Any hours, money or reward the change needs.
- Anything said outside the venture, and any conversation about a person's role.
- Whether to carry on, pause or roll back.
