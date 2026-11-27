---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-5]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: develop-and-manage-enterprise-wide-knowledge
process_group: "13.5"
description: >
  How the capabilities agent builds and keeps the venture's knowledge capability:
  what is kept and why, an honest reading of what is current and findable, one new
  capture step at a time placed inside a process that already runs, and the
  courage to drop a step nobody does. Load it for the workflows of APQC 13.5 and
  when the founder asks "where did we write that down", "why do we keep
  re-deciding this" or "what should we be recording".
---

# develop-and-manage-enterprise-wide-knowledge

You decide nothing about what the venture believes; you make sure what it has already decided and learned can be found when it is needed. The founder approves what the venture spends on keeping knowledge and is the only one who may archive or delete a record.

The test of a knowledge capability is a question answered twice. Every gap worth closing is a question the venture has had to answer again because the first answer was not written down, or was written where nobody could find it.

## The processes

### 13.5.1 Develop KM strategy

Runs `workflows/13-5-1-develop-km-strategy.json`.

Write the rule: which kinds of knowledge are kept as records, who may write each, who is accountable for its being current, and what happens when a record goes stale. Then tie each kind to the live goal or open decision it serves, and name the kinds that serve none so they can be dropped rather than maintained.

The methods worth having are few and they sit inside the work: a record written at the moment of the decision, a postmortem after a failure, a cited source behind every default. A capture step that is a separate chore is the one that gets skipped. The measures are time to find an answer the venture has already given, the share of defaults with a cited source, and the number of stale records, read from `system/freshness`.

Tool gaps go to the IT function as a handoff; this skill never chooses a tool. The founder decides any spending, and in a one-person venture the central-versus-unit split and the training plan are usually skipped.

### 13.5.2 Assess KM capabilities

Runs `workflows/13-5-2-assess-km-capabilities.json`.

Judge each kind of record on four rungs: it does not exist, it exists but is out of date, it is current, it is current and checked. Give the evidence from the freshness reading rather than an impression. Then judge each capture method by whether it ran: count the records written last quarter against the runs that should have produced one, and name the steps that are skipped every time.

Write the gaps as questions, with the hours each repeat cost. The `findability` skill finds the answers that exist but cannot be found, which is a different problem from an answer that was never written. The trap is grading the venture against a maturity model it has no reason to climb.

### 13.5.3 Design and implement KM capabilities

Runs `workflows/13-5-3-design-and-implement-km-capabilities.json`.

One gap, one new way, in force inside a process that already runs. Design it as a record to write, the moment in the process at which it is written, and the field that must be filled, and keep it to minutes. Cost it per run and per month, and name what will be dropped to pay for it. Put it into the process record as a step with its control point, run it once on real work, and set its measure with an as-of date.

The trap is a capture step that needs a tool the venture does not have. Hand that to the IT function and either wait or design something simpler.

### 13.5.4 Evolve and sustain KM capabilities

Runs `workflows/13-5-4-evolve-and-sustain-km-capabilities.json`.

Read each capture step against its measure. Any step skipped more often than it runs is cut down or dropped, and the record says which and why; keeping a step that nobody does is how a knowledge base becomes a place people do not trust. When a question is answered from a record the venture already had, say so and name the record, so the cost of keeping it is visible to whoever pays it.

Growth is handled by naming where the arrangement is now too small: a folder nobody can search, a term two functions disagree about, a source list longer than anyone reads. Archiving or deleting anything goes to the founder, because it cannot be undone.

## Records

Read: `knowledge/catalog`, `knowledge/knowledge-sources`, `knowledge/where-used`, `knowledge/venture-profile`, `system/freshness`, `glossary/terms`, `capabilities/processes`, `operations/research-program`, `foundation/goals`, `decisions/*`, `it/connections`.

Write: `capabilities/processes/[id]` for the governance rule, the capture steps and their measures, `operations/handoff/[id]` for the assessment, the gaps and the tool requests, and `decisions/*` to raise an order or an archive.

A knowledge management strategy record, a maturity score and a capture-rate series are not built: the strategy is a process record, the assessment is evidence on a handoff, and freshness is read from `system/freshness` rather than stored.

## Standards

- APQC Process Classification Framework 8.0, process group 13.5.
- ISO 30401:2018 (knowledge management systems) for the idea that knowledge work needs an owner, a scope and a measure like any other process.
- Nonaka and Takeuchi, *The Knowledge-Creating Company* (1995), for the distinction between what someone knows how to do and what the venture has written down, which is why capture steps sit inside the work.
- The after-action review, the practice the postmortem record follows, for turning a finished piece of work into something reusable.

## What the person decides

- What the venture spends, in hours or money, on keeping knowledge.
- Which gap is closed first.
- Whether a capture step is dropped when nobody does it.
- Archiving or deleting any record, and retiring a kind of record entirely.
- Everything written in a research program, which only a person writes.
