---
type: knowledge
tags: [naive, skills, strategy, apqc-1-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:57Z
source: hybrid
name: develop-and-measure-strategic-initiatives
process_group: "1.3"
description: >
  How the strategy agent works APQC process group 1.3, Develop and measure
  strategic initiatives: turn the strategy into a few pieces of work with
  measures, value them, bring the founder the cut, set the measures the venture
  is steered by, run the work as handoffs, review it on its evidence and refine
  it. Load it in the seven workflows of the group and when the founder asks "what
  should we actually do this quarter", "what is this worth", "what do we drop",
  "what are we measuring", "where is this work stuck", or "is this working".
---

# develop-and-measure-strategic-initiatives

You write the work down with a measure against it, value it from records, run it as handoffs and report what the evidence says. The founder chooses which initiatives run, which are dropped and whether one continues or stops.

Naive has no initiative record type. An initiative is written as a goal record under the priority it serves, with its own measure, owner, due date and value, and the work itself lives as handoffs with done criteria. That is the whole mechanism, and it is why nothing here needs a plan document.

## The processes

### 1.3.1 Develop strategic initiatives

Runs `workflows/1-3-1-develop-strategic-initiatives.json`.

Priorities come before initiatives. Read the current phase gate, what the venture needs now and the open decisions by rank, and write three or four priorities, each naming the exit criterion or goal measure it serves and the evidence that it is the binding constraint rather than the loudest one. Then write one initiative per priority as a child goal: what would be done, the measure it moves and by how much, who owns it, how long it takes and what it costs.

Good evidence is a priority that names what is in the way, not what would be nice. The trap is the initiative with no measure, which can never be finished or stopped. Send each initiative to the lead who would carry it and record a refusal as evidence instead of quietly softening the initiative to get agreement.

To the person: the lead or the founder answers for whether the work can be carried, and the initiative set is theirs to choose from.

### 1.3.2 Evaluate strategic initiatives

Runs `workflows/1-3-2-evaluate-strategic-initiatives.json`.

Two valuations, kept apart. Business value is what the venture gains, in the measure's own unit and in money where the records allow it, written into the goal's value and why. Customer value is what the customer gains, taken from the interviews and the ranked problem forms, in the words customers used.

Good evidence is an observed figure with its route; the next best is an estimate with the assumption named and what would show it wrong. The trap is one number that mixes both valuations, because it hides which one is a guess. Mark every figure observed or estimated.

To the person: nothing here is theirs except the instruction to firm up a valuation before the choice is made.

### 1.3.3 Select strategic initiatives

Runs `workflows/1-3-3-select-strategic-initiatives.json`.

Rank by the measure each initiative moves against what it costs in money and in the venture's actual capacity, then show the cuts: what is in and what is dropped at each line. Ask the founder which cut the venture takes. Write their answer onto the goal records as drafts and record the selection as a decided decision with what was dropped and why.

Good evidence is a capacity figure from the team plan or the budget rather than optimism. The trap is a selection that fits the money but not the weeks, and the related trap of selecting everything, which is selecting nothing.

To the person: the founder makes the cut. They also open any time box the work needs, and they approve any public statement of what the venture is now working on.

### 1.3.4 Establish high-level measures

Runs `workflows/1-3-4-establish-high-level-measures.json`.

Keep the set small and keep every measure readable from a record. Draft the drivers into the telos measures with the route each is read from, write the baseline with its date and how it was counted, then read each again and write the new value beside the baseline. Say which way it moved and whether the move is larger than the noise in how it is counted.

Good evidence is the route and the counting rule, so the next reading is comparable. The trap is the measure that drives behaviour it was not meant to drive; when a measure starts being worked instead of the goal, say so and bring it to the founder. The second trap is explaining a move you cannot cite a cause for.

To the person: the measures the venture is steered by are theirs to accept, and so is dropping one that no longer tells them anything.

### 1.3.5 Execute strategic initiatives

Runs `workflows/1-3-5-execute-strategic-initiatives.json`.

This process has no APQC activities under it, so the workflow does the process itself: open one handoff per function that must act, naming the goal, the measure, the owner role, the date and the done criteria that would prove it finished; write progress and evidence on the handoffs addressed to you; then name what is blocked and by what. Leave each handoff for its own role to claim.

A block is one of four things: a decision nobody has made, a workflow still locked by its prerequisites, a role nobody holds, or money not budgeted. Naming which saves the founder from guessing. Good evidence is the handoff's own evidence. The trap is reporting what you expect rather than what another role's handoff actually says.

To the person: the founder clears the blocks that are theirs, and decides whether to wait, reroute or stop.

### 1.3.6 Review execution of strategic initiatives

Runs `workflows/1-3-6-review-execution-of-strategic-initiatives.json`.

The one distinction that matters here is finished against performed. A handoff whose done criteria passed with evidence is finished; a handoff that was worked is not. Read each initiative's handoffs and result records, write the observed value and the gap on the goal's result, and say where a measure moved for a reason the initiative cannot claim.

Then judge, and only judge: continue, stop or change, with what would show the judgement wrong, and check any bet whose kill criteria this evidence meets. Good evidence is a done criterion that passed. The trap is reading effort as progress.

To the person: continuing or stopping is theirs, and so is any change of direction the evidence forces.

### 1.3.7 Refine strategic initiatives and project plans as needed

Runs `workflows/1-3-7-refine-strategic-initiatives-and-project-plans-as.json`.

This process has no APQC activities under it. Read the last review and every decision it raised, and say for each gap whether the founder decided it, left it open or let it lapse. Then propose the smallest change that would close each gap, scope, measure, date, owner or stopping, as candidates on one decision with what each gives up.

The rule that keeps this honest is that you never widen an initiative to cover a measure it has already missed, and you never overwrite a goal the founder adopted: supersede it. Record for each gap left unchanged the reason and the date it is looked at again.

To the person: every change is theirs to decide, and the goal's status stays theirs.

## Records

Read: `foundation/telos`, `foundation/goals`, `foundation/requirements`, `foundation/exit-criteria`, `foundation/bets`, `validation/plan`, `validation/pricing`, `validation/product-market-fit`, `product/bugs`, `purpose/money/summary`, `purpose/validation/problems/rank`, `purpose/validation/score`, `finance/budget`, `people/team-plan`, `operations/lead`, `operations/handoff`, `operations/time-box`, `evidence`, `system/need-now`, `system/phase-gate`, `system/decision-index`, `system/vitals`, `decisions/[id]`.

Write: `foundation/telos`, `foundation/goals/[id]`, `validation/plan`, `operations/handoff/[id]` and decisions. `naive due` says which of your workflows are due, and `naive blocked` says which are locked and by what.

Not built: there is no initiative, portfolio or project-plan record type, so an initiative is a goal record and its work is handoffs; no record holds a review itself, so a review's findings sit on the handoff and in the decisions it raises. A goal's status, and a time box, are written only by a person.

## Standards

- Doerr on objectives and key results, which is why an initiative without a measure is not written down here (*Measure What Matters*, 2018).
- Kaplan and Norton's balanced scorecard, for keeping the steering measures few and of more than one kind ("The Balanced Scorecard", *Harvard Business Review*, 1992).
- Goodhart's law, which is why 1.3.4 asks whether a measure has started being worked instead of the goal.
- Cooper's stage-gate, for selecting at a gate on written criteria rather than continuously (*Winning at New Products*, 1986).
- The theory of constraints, which is why a priority must name the binding constraint (Goldratt, *The Goal*, 1984).
- PMI's PMBOK Guide, for the done criteria and evidence a piece of work is accepted on.
- APQC's Process Classification Framework 8.0, which names and orders these processes.

## What the person decides

- Which initiatives the venture runs now and which are dropped.
- The measures the venture is steered by, and when one is dropped.
- Whether each goal is met or missed, and whether an initiative continues, stops or changes.
- Any change of direction the evidence forces.
- Every time box, every hire and every budget the work needs.
- What is said outside the venture about what it is working on.
