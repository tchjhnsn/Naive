# Hooks and loops across the 13 functions

Date: 2026-11-26. Decisions: EE-182, EE-183, EE-184, EE-188. Status: steps 1 (what is due), 2 (the loop), 3 (record data categories) and 6 (the element graph, `packages/naive/src/engine/element-graph.ts`, `naive graph`) are built. Steps 4, 5, 7 and 8 are not built.

## The ask

Torian, 2026-11-25: build the hooks and loops across all 13 functions and every level of the process framework. Be clear about what triggers each one, by event and by time. Build on Effect and in TypeScript. Assign each element to a person or an agent. For each element, know what it does, what state it is in, what its quality is, and what happens to other elements when it is absent or weak, and be able to test and formally verify that.

## Domain

An element is one node of APQC's Process Classification Framework as Naive carries it (`packages/naive/src/functions/pcf.json`): a category (level 1, which Naive calls a function), a process group, a process, an activity or a task. The words below are the standard ones.

| Aspect of an element | Standard | In Naive today |
|---|---|---|
| Inputs, outputs, owner, measures | ISO 9001 process approach | Workflow `reads` and step `writes`. No owner per element. |
| Who is accountable | RACI | Performer and approval per activity (EE-172, EE-179). Not built above an activity. |
| What starts it | Event, time or request | Workflow `trigger`, read by `naive due` (EE-182). Record triggers and signal listeners for events. |
| State | Statechart | Not built. |
| Quality | ISO/IEC 33020 process capability levels 0 to 5 | Not built. Evidence grades exist for validation records only. |
| Effect of absence or weakness on others | Failure mode and effects analysis (FMEA) | Decision impact for decisions only (`packages/naive/src/engine/impact.ts`). Not built for elements. |

A hook is a reaction to one event: a record written, a signal heard. A loop is work that recurs: a workflow on a schedule. Both come down to one question, which workflow is due and why.

The state an element will have, when step 5 is built:

```mermaid
stateDiagram-v2
  [*] --> absent
  absent --> started: its first record is written
  started --> operating: its workflow finished on time
  operating --> degraded: a run failed, a run is overdue, or an element it reads is absent or degraded
  degraded --> operating: the cause is gone and a run finished
  operating --> retired: a person retires it
  degraded --> retired: a person retires it
  retired --> [*]
```

## System

```mermaid
flowchart LR
  T[Workflow triggers in the 13 function modules] --> D[due.ts: what is due and why]
  R[.naive/workflow-runs.jsonl] --> D
  P[provenance.jsonl] --> D
  PH[Phase module: active workflows] --> D
  D --> C[naive due]
  D -.step 2, not built.-> L[Durable loop on Effect]
  L -.-> A[naive agent run as the function agent]
  A -.-> R
  L -.a failed run.-> Q[A decision for a person]
```

What is due, by trigger kind (`due()` in `packages/naive/src/engine/due.ts`, a pure function):

| Trigger | Due when |
|---|---|
| intake | It has not finished once. |
| schedule | It has never finished, or its cadence (daily, weekly, monthly, quarterly) has passed since it last finished. A month is a calendar month in UTC. |
| event | A record on its route went live after it last finished: a write, accept, merge or rollback. A draft held for a person does not count until the person accepts it. |
| request | Never on its own. A lead or a person hands it off. |

A failed run does not move a schedule. Each entry says whether the venture's phase module lists the workflow as active.

What Effect gives the later steps, from the vendored source in `repos/effect`: `Cron` and `Schedule` for times and retries, `workflow/DurableClock` for a loop that sleeps across a restart, `workflow/DurableDeferred` for waiting on a person, and `Graph` for the element graph. Effect has no statechart module, so an element's state will be a tagged union with a pure transition function.

## Implementation

One pull request each.

1. What is due. Built: `naive due [--at <iso>] [--function <id>] [--json]` and `naive due record <function>/<workflow> [--outcome done|failed|skipped] [--by <who>]`.
2. The loop with modes (EE-183). Built: `naive loop plan`, `naive loop tick`, `naive loop watch` and `naive loop mode`, described below.
3. Record data categories (EE-184). Built: every workspace and venture record type in the data model names `data`, master, reference, transactional or derived, and `check-data-model.ts` requires it. Nothing reads it yet: steps 6 and 7 do.
4. Time boxes. Not built: a time box record for a campaign or a sprint, and a trigger "while a time box is open".
5. Owners. Not built: one accountable owner per element, inherited from its parent, and a check that nothing is unowned.
6. The element graph (EE-188). Built: `naive graph [--function <id>] [--element <id>] [--json] [--mermaid]`, described below.
7. State and quality. Not built: the statechart above, a capability level per element from evidence, and the effect of an absent or weak element on the elements it feeds.
8. Proofs. Not built: Lean proofs of the transition function and of propagation.

## The loop and its modes

The loop reads what is due and acts as far as a mode allows. A person sets the mode in `naive.config.json` under `loops`, for the venture, per function and per workflow. The most specific one wins.

| Mode | What the loop does with a due workflow |
|---|---|
| manual | Nothing. A person starts it. This is the default. |
| ask | Files one open decision per due occurrence, with the options start and skip. On start it starts the workflow. On skip it records the occurrence as skipped. |
| auto | Starts the workflow as its function agent through `NAIVE_AGENT_CMD` and records the run as done or failed by the exit code. |

```mermaid
flowchart TD
  due[naive due: a workflow is due] --> phase{active in the phase, or a mode names this workflow?}
  phase -- no --> leave[leave it]
  phase -- yes --> mode{mode}
  mode -- manual --> leave
  mode -- ask --> asked{decision for this occurrence}
  mode -- auto --> failed{last run failed?}
  failed -- yes --> asked
  failed -- no --> start
  asked -- none --> file[file the decision]
  asked -- open --> wait[wait for a person]
  asked -- skip --> skipped[record skipped]
  asked -- start --> start[start the function agent]
  start --> gate[every write meets the gate as that role]
  gate --> run[record done or failed]
```

Rules that hold in every mode:

- No mode goes past the gate. A start only starts the function agent. A write the gate holds waits as a draft for a person, and a one-way door is a person's. There is no bypass mode.
- A draft does not make the next workflow due. An event workflow is due only when a record on its route went live, so a draft a person has not accepted starts nothing downstream.
- A workflow whose last run failed is not started again on the loop's own word. The loop asks first, in ask and in auto.
- An agent cannot set a mode. `naive loop mode` needs `--by <person>` and refuses an acting agent, and `check-config.ts` fails on ask or auto with no person named.
- One tick at a time per venture, held by the lock file `.naive/loop.lock`.

`naive loop watch` ticks on `Schedule.spaced` from Effect in one process. It does not survive a restart on its own: a host's scheduler or a person runs it again, and a tick is safe to rerun because the run log and the decisions hold its state.

## The element graph

`buildGraph()` in `packages/naive/src/engine/element-graph.ts` reads the 13 function modules' workflows, APQC's PCF and the activity catalog, and resolves each route pattern a workflow names to record types through the route table (`packages/naive/src/records/routes/routes.ts`). It builds one directed Effect `Graph`. It is pure: the same workflows in any order give the same graph.

```mermaid
flowchart LR
  E1[Element: a function, level 1] -->|contains| E2[Element: process group, process, activity]
  W[Workflow] -->|belongs-to| E1
  W -->|performs, naming the step| E2
  W -->|writes, naming the step| RW[Route written]
  W -->|reads| RR[Route read]
  W -->|listens: event trigger| RR
  RW -->|resolves| T[Record type]
  RR -->|resolves| T
  E1 -.feeds, derived, with evidence.-> E1b[Another element of the same level]
```

| Edge | From | To | Comes from |
|---|---|---|---|
| contains | element | element | The PCF hierarchy. A catalog activity sits under its process, else its process group. |
| belongs-to | workflow | element | The workflow's function, through its APQC category in departments.json. |
| performs | workflow | element | A step's `activity`, naming the step. |
| writes | workflow | route | A step's `writes`, naming the step. |
| reads | workflow | route | The workflow's `reads`. |
| listens | workflow | route | An event trigger's `route`. |
| resolves | route | record type | The route table. `*` and `[id]` stand for one segment. |
| feeds | element | element | Derived, below. |

A step is attached to its activity, every ancestor of that activity and its function's category. A workflow is attached to every element one of its steps is attached to. Element A feeds element B when both have the same level and a route a step attached to A writes resolves to a record type that a workflow attached to B reads or is triggered by. Each feed names its evidence: the writing workflow and step, the route written, the reading workflow, the route read, whether by read or trigger, and the record type. A workflow reading what it wrote itself is a loop, not a feed, so it is left out. A route that resolves to no record type matches only the same pattern.

The graph answers `upstream(element)` and `downstream(element)`, the routes some workflow reads that no workflow writes (`unfed`: inputs a person, an intake or an outside source must give, such as `venture`, which every intake reads) and the routes some workflow writes that none reads (`unread`). `naive graph` prints the feeds between functions and both lists, `--element` and `--function` print one element's neighbours with their evidence, and `--mermaid` prints the feeds between functions.

## Not built

- Everything in steps 4, 5, 7 and 8. The element graph does not hold state or quality, and it does not say what an absent or weak element does to the elements it feeds: that is step 7, which reads the feeds this graph derives.
- The element graph covers the shipped function modules only. It does not narrow to the functions a venture lists, read a venture's own workflows, or count reads and writes by people and record triggers that no workflow declares.
- A mode per time box (step 4 adds the time box). Retries with backoff inside one tick. A durable watch on `workflow/DurableClock`. Starting more than one workflow at once. A hosted starter: with `NAIVE_RUNTIME=hosted` there is no `NAIVE_AGENT_CMD`, so a start is blocked.
- The run log is not synced (`naive sync` skips `.naive/`), no route serves it, and it has no hash chain.
- A workflow step's `when` (EE-181) is still a sentence an agent reads.
- Language choice: Naive is TypeScript on Effect, with Lean for proofs. A rubric for choosing another language for a system is not written.
