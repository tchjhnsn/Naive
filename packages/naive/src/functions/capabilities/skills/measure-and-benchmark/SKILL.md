---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-7]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: measure-and-benchmark
process_group: "13.7"
description: >
  How the capabilities agent measures the venture and compares it with others:
  one definition per measure computed from named records, comparisons made like
  for like from public sources, and a reading each window that shows its counts
  and says what is not measured. Load it for the workflows of APQC 13.7 and when
  the founder asks "how are we doing", "is that good", "how do we compare" or
  "what does this number actually mean".
---

# measure-and-benchmark

You define the venture's measures once, compute them the same way every window, and say what the figures cannot tell. The founder and the strategy lead decide what to do about a reading; the measures themselves belong to the venture's telos and goals, which the strategy function writes.

Two readings are only comparable when the definition did not move between them. That is why the definition is a record, why a changed definition is dated, and why an old series is kept separate rather than restated.

## The processes

### 13.7.1 Define and manage organizational performance strategy

Runs `workflows/13-7-1-define-and-manage-organizational-performance.json`.

Write each measure once: its definition, the records it is computed from, the window, who reads it and the goal it serves. A measure nobody acts on is dropped, because every measure costs something to keep and invites being gamed. When a definition has to change, record the change with its date and keep the old series separate, so a break is never read as a trend.

Good evidence is a definition a reader could use to recompute the figure from the named records. The trap is a dashboard of measures with no goal behind them.

### 13.7.2 Benchmark performance

Runs `workflows/13-7-2-benchmark-performance.json`.

Start inside: each process against its own best run and its own last windows. That comparison is always like for like and usually enough. Then outside, from public sources only, each figure cited with the date it was read; the `industry-awareness` skill finds what the industry already knows. The method is written down once, measure, unit, window and what counts as the same work, so two comparisons can be trusted together.

A figure that is not comparable is marked as not comparable, never adjusted into agreement. Then each gap is sized in hours or money per month against what closing it would take, and the one or two worth the work go to the founder. The trap is comparing a venture of one with a published figure from a company of a thousand and concluding anything at all.

### 13.7.3 Evaluate performance

Runs `workflows/13-7-3-evaluate-performance.json`.

Take the indicators from the measurement model, no more than can be acted on, and say for each what reading would make the venture do something different. Set the frequency from how fast the measure can move and how long the venture would take to act. Collect from the records the definitions name, and list what is missing rather than estimating it. Compute exactly as defined, show the count behind each figure, and mark the ones resting on too few runs to mean anything. Name a trend only against several windows. For each measure that moved, name what in the venture's own records changed before it and what would show that explanation wrong.

The report is one page in the same shape every window: indicator, figure, count, moved or not, and what is not measured. Then one improvement proposed at the measure furthest from its goal.

## Records

Read: `foundation/telos`, `foundation/goals`, `capabilities/processes`, `operations/handoff`, `evidence`, `system/vitals`, `finance/spend`, `knowledge/knowledge-sources`, `raw/sources`, `industries/[id]`, `markets/[id]`, `operations/lead`.

Write: `capabilities/processes/[id]` for the measurement model, the indicators and the frequency, `operations/handoff/[id]` for the readings, the comparisons and the report, and `decisions/*` to raise what to work on.

A measure record, a time series store and a benchmark record are not built: a process record carries its current measures with one as-of date, each reading is evidence on a handoff, and earlier values are read from provenance.

## Standards

- APQC Process Classification Framework 8.0, process group 13.7. APQC's Open Standards Benchmarking is the industry practice this group is named for; this venture uses it only as far as public figures allow.
- The balanced scorecard (Kaplan and Norton, 1992) for the discipline of a few measures tied to goals rather than a long list.
- Goodhart's law: a measure that becomes a target stops measuring. It is why each indicator here names what reading would change a decision, and why a measure nobody acts on is dropped.

## What the person decides

- Which measures the venture keeps, and which it stops reading.
- Which gap found by a comparison is worth closing.
- Which improvement is taken this cycle.
- Whether a changed definition is accepted, given that it breaks the series.
