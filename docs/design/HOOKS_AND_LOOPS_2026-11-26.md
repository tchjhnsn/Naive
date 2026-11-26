# Hooks and loops across the 13 functions

Date: 2026-11-26. Decision: EE-182. Status: steps 1 to 3 and 5 are built: what is due (`packages/naive/src/engine/due.ts`, `naive due`), the loop (EE-183), record data categories (EE-184) and owners (EE-187, `packages/naive/src/engine/element-owners.ts`, `naive owners`). Steps 4 and 6 to 8 are not built.

## The ask

Torian, 2026-11-25: build the hooks and loops across all 13 functions and every level of the process framework. Be clear about what triggers each one, by event and by time. Build on Effect and in TypeScript. Assign each element to a person or an agent. For each element, know what it does, what state it is in, what its quality is, and what happens to other elements when it is absent or weak, and be able to test and formally verify that.

## Domain

An element is one node of APQC's Process Classification Framework as Naive carries it (`packages/naive/src/functions/pcf.json`): a category (level 1, which Naive calls a function), a process group, a process, an activity or a task. The words below are the standard ones.

| Aspect of an element | Standard | In Naive today |
|---|---|---|
| Inputs, outputs, owner, measures | ISO 9001 process approach | Workflow `reads` and step `writes`. One owner per element (EE-187). |
| Who is accountable | RACI | Accountable: one owner per element at every level (EE-187). Responsible: performer and approval per activity (EE-172, EE-179). |
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
5. Owners (EE-187). Built: one accountable owner per element, inherited from its parent, and a check that nothing is unowned, described below.
6. The element graph. Not built: edges from workflow reads and writes.
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

## Owners

Every element has one accountable owner, the A of RACI: a role or a person. The owner answers for the element. It is not the performer: who performs an activity, and whether a person approves it, is the venture's `operations/activity-assignments.json` or the default for the activity's kind, and `naive owners` shows both beside each other.

`resolveOwners()` in `packages/naive/src/engine/element-owners.ts` is a pure function. It walks the framework in order, so a parent is resolved before its children, and gives each element the first rule that applies:

| Order | Source | Rule |
|---|---|---|
| 1 | explicit | The venture names the owner in `operations/element-owners.json`: `{ "role": "growth-lead" }` or `{ "person": "Ana Ruiz" }` per hierarchy id, at any level. |
| 2 | root | The element is an activity a person performs or approves, and the owner it would inherit is an agent. An agent does not answer for a person's work, so the delegation root owns it: `root` in the venture's `governance/delegation.json`, the founder by default. |
| 3 | inherited | The parent's owner. The entry names the element where it was set. |
| 4 | default | A category the venture lists in venture.json departments is owned by its function's agent, `<function>-agent`. A category it does not list has no owner, and neither do its elements. |

```mermaid
flowchart TD
  E[an element] --> X{named in operations/element-owners.json?}
  X -- yes --> EX[explicit owner]
  X -- no --> L1{a category?}
  L1 -- yes --> LI{the venture lists its function?}
  LI -- yes --> D[default: function-agent]
  LI -- no --> N[no owner]
  L1 -- no --> P[the parent's owner, inherited]
  P --> A{an activity a person performs or approves, by assignment or kind?}
  A -- no --> OUT[owner]
  A -- yes --> K{the inherited owner is an agent?}
  K -- no --> OUT
  K -- yes --> R[root: the delegation root, a person]
  D --> OUT
  EX --> OUT
  R --> OUT
```

A role is a role template, Naive's (`packages/naive/template/governance/roles/`) or the venture's own (`governance/roles/`), or a function agent. A role whose template has `default_tier` person is a person, and the rest are agents. A role answers only within its reach: a lead within its portfolio, a role whose template names one function within that function, a function agent within its own function, and a role of function all anywhere.

`packages/naive/src/checks/check-owners.ts <venture dir>` fails on a record that does not match its schema, an element APQC lacks or one under a function the venture does not list, an owner that names no role, a role outside its reach, a delegation root that is not a role, and an element left unowned. A person named by name is not checked against a register, because Naive keeps none of people by name.

Not built for owners: a route that serves the list, the catalog's own activities (`activities.json`) as elements, the gate refusing a write by a role that does not own the element, a consulted and informed list for the C and I of RACI, and a person's name checked against the venture's people.

## Not built

- Everything in steps 4 and 6 to 8.
- A mode per time box (step 4 adds the time box). Retries with backoff inside one tick. A durable watch on `workflow/DurableClock`. Starting more than one workflow at once. A hosted starter: with `NAIVE_RUNTIME=hosted` there is no `NAIVE_AGENT_CMD`, so a start is blocked.
- The run log is not synced (`naive sync` skips `.naive/`), no route serves it, and it has no hash chain.
- A workflow step's `when` (EE-181) is still a sentence an agent reads.
- Language choice: Naive is TypeScript on Effect, with Lean for proofs. A rubric for choosing another language for a system is not written.
