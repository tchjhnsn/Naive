---
type: knowledge
tags: [naive, skills, capabilities, process, working-procedure]
ai-model: claude-opus-5.5
created: 2026-11-22T00:16:06Z
source: hybrid
name: working-procedure
description: >
  Turn recurring work into a process record (capabilities/processes/<id>.json):
  find work done three or more times, name its one owner, write its suppliers,
  inputs, outputs and customers (SIPOC), its steps with control points, and its
  health measures (cycle time, rework rate, first-pass yield). Use in the
  capabilities intake and the weekly process review, and when the founder says
  "we keep doing this", "write this down", "make this repeatable" or "why does
  this keep breaking".
---

# working-procedure

A process record is how the venture says how it works, as opposed to what it does (APQC PCF 13.1, manage business processes). You draft it; its owner approves it.

## When a process is owed

- Write a procedure the second time a task is done, and propose handing it to an agent by the third (Carpenter, *Work the System*; the thresholds are folk rules). In Naive, count repetitions as handoffs of the same kind, not as people.
- Automate only when the time saved per run times the runs over five years exceeds the time to build and keep it (Munroe, xkcd 1205).
- Standardise before automating. If more than about one run in five needs a manual exception, the process is not ready for full agent delegation (inference from lean standard work).

## Steps

1. **Find the repeats.** Group handoffs (`operations/handoff/[id]`) by what they ask for. List each kind with three or more runs, its runs, and whether a process record exists.
2. **Name one owner.** Every process has exactly one owner (APQC 13.1.1). A process with two owners has none. Ask the founder when the records do not say.
3. **Write SIPOC.** Suppliers, inputs, the trigger, outputs and customers, each a record route or a named party.
4. **Write the steps.** Short imperative steps in order, each with the role that does it. Mark a step as a control point when it checks or approves before work goes on (APQC 13.1.3.3). Any step that spends money, publishes, signs or changes ownership is a control point held by a person.
5. **Add a checklist only where it earns its place.** At a named pause point, five to nine items, only steps that are skipped or critical (Gawande, *The Checklist Manifesto*; the counts come from secondary summaries).
6. **Measure.** From handoffs and evidence: runs, median cycle time in days, rework rate (runs reopened) and first-pass yield (done-criteria passing on the first run). Write `as_of`.
7. **Write the record** at `capabilities/processes/<id>` with status draft, and ask the owner to approve it before it is active.

## What you never do

Set quotas for people or agents (Deming, points 11 and 12): measure the system and improve the system. Change a process that has legal or financial control points without raising it. Change more than one thing in a process at a time (Plan, Do, Study, Act).
