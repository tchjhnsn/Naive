---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-8]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: develop-manage-and-deliver-analytics
process_group: "13.8"
description: >
  How the capabilities agent runs an analysis end to end: a question tied to a
  decision, a scope the records can answer, hypotheses fixed before any data is
  read, collection and preparation that could be repeated, a model measured
  against a baseline on unseen data, and a report whose limits sit beside its
  answer. Load it for the workflows of APQC 13.8 and when the founder asks "what
  do the numbers say", "can we trust this" or "what should we do about it".
---

# develop-manage-and-deliver-analytics

You answer questions from the venture's own records and say plainly what the records cannot answer. You decide nothing: the person who asked holds the decision, and an analysis is evidence on that decision, never the decision itself.

Two rules carry most of the value. Write the question, the hypotheses and the method before looking at the data, so a result cannot be chosen after the fact. Report the counts and the gaps beside the answer, so nobody reads the answer without them.

## The processes

### 13.8.1 Identify needs from stakeholders

Runs `workflows/13-8-1-identify-needs-from-stakeholders.json`.

Name who wants the answer and the open decision it serves, from `decisions/*` and `foundation/goals`. Write the question in one sentence an answer could be wrong about, with the date it is needed. Then the test that saves the most hours: write what the venture would do under each possible answer. If every answer leads to the same action, say the analysis is not worth running and stop. Only the asker can say what they would do differently, so this step asks them.

### 13.8.2 Scope analytics project

Runs `workflows/13-8-2-scope-analytics-project.json`.

List the records and connected sources that could bear on the question, how far back each goes and how complete it is, and name what is simply not recorded. Size the work in hours, then write the smallest version that would still change the decision. The scope says what is out of scope and which part of the question the records cannot reach.

### 13.8.3 Develop and manage hypotheses

Runs `workflows/13-8-3-develop-and-manage-hypotheses.json`.

Read the venture's registered claims first: `foundation/bets` and `foundation/pre-registration` hold the claims a person has already fixed, and restating one here in easier words is the worst thing this process can do. Write each remaining hypothesis with its measure, its population, the line that would settle it and what would show it wrong. Fix them on the handoff before any data is read; a later change is appended with its reason, never overwritten. A claim that belongs in the bet register goes to the strategy function as a handoff, because only a person registers one.

### 13.8.4 Collect data

Runs `workflows/13-8-4-collect-data.json`.

Read each named source and record what was pulled, the window and the date. Take only the fields the analysis needs, personal information above all, and never copy a private record into a working set. Write what could not be collected and what the analysis therefore cannot claim.

### 13.8.5 Prepare data

Runs `workflows/13-8-5-prepare-data.json`.

One table, one row per thing counted, each column named with its unit and the key that joins the sets. Record every cleaning step in order with the rule used, so the set could be rebuilt from the sources alone. Count the dropped rows by reason, and name the reason that could bend the answer; dropping exactly the runs that failed is the classic way to find whatever was hoped for.

### 13.8.6 Analyze data

Runs `workflows/13-8-6-analyze-data.json`.

Method before result, in writing. Compute, and show the count behind every figure. For each result, name the other thing that could have produced it, a change in volume, a different customer mix, a process change in the same window, and say what in the data would tell them apart. Then say which hypotheses are settled, which are open and which the data cannot reach, and never report an open one as settled.

### 13.8.7 Create data models

Runs `workflows/13-8-7-create-data-models.json`.

Build the simplest thing first, a count, a rate or a ratio, and keep it as the baseline every later model must beat. Write the model's inputs, rule and assumptions well enough for another person to compute the same answer by hand. Then measure it on data it has not seen, a held-back part or a later window, and report how far off it was and where it was worst.

### 13.8.8 Review data models with stakeholders

Runs `workflows/13-8-8-review-data-models-with-stakeholders.json`.

Put the model in front of the asker as one page, with the assumptions in plain words. Then ask which assumptions do not match what they know, because only they know the business behind the numbers. Record each objection against the part of the model it touches and whether it would change the answer.

### 13.8.9 Refine data models

Runs `workflows/13-8-9-refine-data-models.json`.

Take the objections in the order of how much they could change the answer, one change at a time, measuring the error after each and undoing anything that made it worse. Then say whether the model is good enough for the decision it was built for, and when it is not, say what would be needed instead of refining further.

### 13.8.10 Report on analysis

Runs `workflows/13-8-10-report-on-analysis.json`.

The answer goes in the first sentence, in the words of the question asked. Counts, window, dropped rows and limits go beside it, not at the end. The report is recorded as evidence on the open decision it was run for.

### 13.8.11 Identify remedial actions

Runs `workflows/13-8-11-identify-remedial-actions.json`.

Every finding either becomes one action with a process, an owner and a measure, or is recorded as dropped with a reason, so it is not rediscovered and analyzed again next quarter. Each action's measure gets a date to be read, written on the process record it changes.

## Records

Read: `decisions/*`, `foundation/goals`, `foundation/bets`, `foundation/pre-registration`, `evidence`, `evidence/eval-plan`, `knowledge/knowledge-sources`, `raw/sources`, `it/connections`, `operations/handoff`, `operations/meeting`, `capabilities/processes`, `system/decision-index`, `validation/interviews`.

Write: `operations/handoff/[id]` for the question, the scope, the hypotheses, the data, the working and the report, `capabilities/processes/[id]` for an analysis the venture repeats and for the date an action's measure is read, and `decisions/*` to attach the answer to the decision it serves.

An analysis record, a dataset record and a model record are not built: each run is a handoff with evidence, and a repeated analysis becomes a process record. Nothing in these workflows writes a measure into the venture's telos, which the strategy function owns.

## Standards

- APQC Process Classification Framework 8.0, process group 13.8.
- CRISP-DM, for the order these workflows follow: understand the question, understand the data, prepare, model, evaluate, deliver.
- Pre-registration, for writing hypotheses and lines before looking; the venture's own form of it is `foundation/pre-registration`, which only a person registers.
- Holding back data the model has not seen, and comparing against a simple baseline, before any claim that a model works.
- The Brier score for a probability stated in advance, which Naive computes over the bet register rather than here.

## What the person decides

- Whether the analysis is worth running, and which version of it.
- What they would do differently under each answer.
- Which assumptions are wrong, in the review.
- Whether a model is good enough to act on.
- The decision the analysis informs, and which remedial action is taken first.
