---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: manage-business-processes
process_group: "13.1"
description: >
  How the capabilities agent governs, frames, defines, measures and improves the
  venture's recurring work: one owner per process, a procedure someone else could
  follow, control points where a run is checked, and three measures read from the
  handoffs. Load it for the workflows of APQC 13.1 and whenever the founder asks
  "who owns this", "how do we actually do this", "why does this take so long" or
  "what should we fix first".
---

# manage-business-processes

You write down how the venture's recurring work is done, measure it from the records the work already leaves behind, and propose one change at a time. The founder names the owner of a process, picks which bottleneck to work on, and approves anything that removes a control point a contract or a regulation requires.

Work from runs, not from intentions. A process record that describes what someone meant to do is worse than none, because the measures computed from it are wrong. Every procedure here is written from the last handoffs and evidence of that work, and every measure cites them.

## The processes

### 13.1.1 Establish and maintain process management governance

Runs `workflows/13-1-1-establish-and-maintain-process-management.json`.

Write the rule before the catalog grows: who may change a process record, who reviews a change, how often the catalog is read against the work, and what happens when a record has drifted. Take the authority from the venture's decision rights and delegation rather than inventing a new one, and never give an agent a change a person holds. Then the one hard part: ownership. A process with two owners has none, and a process whose owner no longer does the work has an owner in name only. Find who actually does it from the handoffs, and bring the founder one candidate per process.

Good evidence here is a dated review that names the records that drifted and the handoff opened for each. The trap is a governance document that is itself never reviewed: put the catalog's own review in the catalog, as a process record with a cadence.

The person assigns every owner, because ownership is accountability and only the founder can hand it out.

### 13.1.2 Define and manage process frameworks

Runs `workflows/13-1-2-define-and-manage-process-frameworks.json`.

Place each process under the APQC process group whose work it does, read from the venture's own briefing at `operations/activity-briefing/capabilities`. The point is not taxonomy for its own sake: it finds the two records that describe the same work under different names, and it shows which groups the venture runs with nothing written at all.

Then name the processes more than one function works. Fill the record's functions field and write the point where work passes from one function to the next as a step with a control point, because that is where runs wait. The trap is calling everything cross-functional in a one-person venture; a process crosses functions only when its steps are owned by different functions' records.

### 13.1.3 Define processes

Runs `workflows/13-1-3-define-processes.json`.

Order matters: scope, then analyze, then control points, then the procedure, then publish. Scope first so two runs can be counted the same way. Analyze by walking the real runs and timing each step, and look up the published practice for this kind of work before inventing one; the `industry-awareness` skill is for that, and `find-reference` records the source. Mark a step as a control point only where a run is actually checked or approved before it goes on, and say what the check looks at and what happens when it fails. Write the procedure as ordered steps with a role on each, in sentences someone who has never run it could follow. Publish by setting the record active once its owner has read it, with the three measures left empty and dated so the first real run fills them.

The trap is writing the ideal procedure. If the steps are not what the next run will do, the record will be ignored and the measures will be fiction.

A control point that a contract or a regulation requires goes to the founder before it is changed or removed.

### 13.1.4 Manage process performance

Runs `workflows/13-1-4-manage-process-performance.json`.

Three measures, each computed the same way every window: runs counted from the handoffs, median days from trigger to done, the share of runs reopened, and the share whose done criteria passed on the first try. Write the as-of date with them and never carry a number forward unchanged. Support a run by reading the record, not by changing it, and keep a list of the places the record was silent so the next definition run fixes them.

Good evidence is a measure a reader can recompute from the named handoffs. The trap is measuring a person: these measures describe the system, and a rework rate is a property of the procedure, never of whoever ran it.

### 13.1.5 Improve processes

Runs `workflows/13-1-5-improve-processes.json`.

Improve the constraint, not the process that is easiest to touch: rank by waiting time, rework and open postmortem actions, and bring the founder the three with the clearest cost. Then one change at a time, with the measure and the number of runs agreed before the change, so the reading afterwards means something. Rewrite the affected steps on the record once the change is in force, and write plainly whether it helped, did nothing or hurt.

The person chooses the method and the order. Changing several things at once is the trap: nothing can then be learned from the result.

## Records

Read: `capabilities/processes`, `capabilities/postmortems`, `operations/handoff`, `evidence`, `governance/decision-rights`, `governance/delegation`, `people/team-plan`, `foundation/goals`, `operations/activity-briefing/capabilities`, `knowledge/knowledge-sources`.

Write: `capabilities/processes/[id]` for the process catalog, `operations/handoff/[id]` for the work and its evidence, and `decisions/*` to raise a question. Everything else in these workflows, a governance rule, a review finding, a training note, goes on the process record or on the handoff as evidence.

A process map as a drawing, a separate measure series over time, and a record of who was trained on what are not built: the process record holds the current measures with one as-of date, and history is read from provenance.

## Standards

- APQC Process Classification Framework 8.0, category 13.0, carried in this repository at `packages/naive/src/functions/pcf.json`. The process ids here are its own.
- SIPOC (suppliers, inputs, process, outputs, customers), the frame the process record's fields follow.
- The plan-do-check-act cycle (Shewhart, and Deming's use of it) for one change measured against a prior reading.
- The theory of constraints (Goldratt, *The Goal*, 1984): improving anything other than the constraint does not improve the system.
- BPMN 2.0 (Business Process Model and Notation, OMG) where a diagram is wanted; the record's ordered steps are the default here, because they can be read and checked without a tool.
- ISO 9001:2015 for documented procedures and their review, where a customer or a certification asks for it.

## What the person decides

- Who owns each process, and whether an owner may be changed.
- Which bottleneck or process is worked on this cycle.
- The method an improvement is run by, and whether a change is kept or undone.
- Removing or weakening any control point a contract or a regulation requires.
- Retiring a process record, or archiving one other records cite.
