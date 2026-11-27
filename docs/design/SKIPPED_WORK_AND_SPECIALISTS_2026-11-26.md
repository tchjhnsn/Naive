# Skipped work and temporary specialists

Steps 9 and 10 of [Hooks and loops across the 13 functions](./HOOKS_AND_LOOPS_2026-11-26.md). EE-213.

## The ask

Torian, 2026-11-26: walk the work in hierarchical order, and when a step is skipped, loop back to it or hand it to
the agent for its recommendation. And: an agent can spawn a specialty agent for a temporary task.

Two problems, one shape. Work is skipped all the time and the record of it lives nowhere, so a skipped step is lost
the moment the run ends. And a function agent that meets a task outside its skills has nowhere to put it: its own
reach is the only reach there is.

## Domain

Naive already orders work hierarchically: APQC's framework gives a function its category, its process groups and its
activities, and a workflow's steps name the activity each performs. So the order to walk is already in the data, and
so is the order to loop back in. Three things can be left behind:

| Left behind | Where it is recorded today |
|---|---|
| A whole occurrence a person skipped | `.naive/workflow-runs.jsonl`, outcome `skipped` |
| A required step a run did not finish | nowhere |
| A step to consider the run did not run, whose `when` may now hold | nowhere |

The second and third need the run to say which steps it finished. That is one optional field on a run line
(`steps`), so a run that says nothing is read as saying nothing, not as saying everything was done.

Nothing judges a step's `when`: it is a sentence (EE-181). The ledger carries it and names who judges it, a person or
the function's agent. That is the honest half of "loop back to it".

A specialist is a role, not a new kind of actor. Naive derives a function agent from its data (EE-124) and the router
refuses a write outside its reach (`agent-reach`). A specialist is that same rule with a narrower list and an expiry:
a record in the venture holding its parent, its task, its reach and when it ends. The invariant is one sentence: a
specialist's reach is the intersection of its record's globs with its parent's reach, so it can never be wider than
the parent, whatever the record says.

## System

```mermaid
flowchart TD
  runs[".naive/workflow-runs.jsonl<br/>outcome, steps finished"] --> skipped["skipped()<br/>pure"]
  flows["functions/*/workflows/*.json<br/>steps, activity, consider"] --> skipped
  pcf["pcf.json, activities.json<br/>category, process group"] --> skipped
  skipped --> ledger["naive skipped<br/>hierarchical order"]
  graph["element-graph.ts<br/>downstream feeds"] --> ledger
  ledger --> handback["naive skipped handback<br/>open decision, assigned_to"]
  handback --> agent["function agent<br/>recommends do-now, defer, drop"]
  agent --> person["a person decides"]
  ledger -. one line .-> loop["naive loop plan"]

  parent["<function>-agent<br/>functionWrites(fn)"] --> spawn["naive agent spawn<br/>--task --skills --ttl --writes"]
  spawn --> rec["operations/specialists/&lt;role&gt;.json<br/>parent, task, writes, expires"]
  rec --> reach["reachRefusal(dir, role, route)<br/>writes ∩ parent reach"]
  reach --> router["the router refuses the rest"]
  spawn --> harness["NAIVE_AGENT_CMD<br/>MENTURA_ACTOR_ID=&lt;role&gt;"]
  harness --> finished["status finished<br/>reach gone"]
```

## The skipped ledger

`naive skipped [--function <id>] [--at <iso>] [--json]` reads the venture's workflows and its run log and gives one
item per piece of work left behind, due ones of the hierarchy first:

- a `workflow` item for a workflow some occurrence of which a person skipped, with how many times and when last;
- a `step` item for each step the latest finished run that reported its steps left out, `required` when the step has
  no `consider`, and carrying the `consider` block when it has one.

The order is the framework's: the function's APQC category, then the process group, then the activity, then the
workflow and the step's position in it. An item with no activity sits at its function, before its process groups.

Each item says what it blocks downstream when the element graph can tell: the elements its activity feeds, with the
record types the feed runs on (`downstream` in `element-graph.ts`). An activity no workflow reaches has no feeds, and
the item says so rather than guessing.

`naive skipped handback <item> [--to <role>]` hands one item to the owning function agent for a recommendation. It
files one open decision through the ordinary decision door (`propose`), with `assigned_to` naming the role asked,
the options `do-now`, `defer` and `drop`, and a note carrying why the item is skipped and what it blocks. The agent
recommends; a person decides, as always. A rerun leaves a decision already filed, open or decided, as it is.

`naive loop plan` ends with one line naming how many items are waiting, so the loop that starts due work also shows
the work that was passed over. The loop never acts on a skipped item: only `handback` and a person do.

## Specialists

`naive agent spawn <parent-role> --task <text> [--skills a,b] [--ttl <duration>] [--writes a,b]`:

1. The parent is a function agent (`<function>-agent`). A lead, a researcher and a specialist cannot spawn, so a
   chain of specialists cannot grow.
2. Only that agent, or a person, may spawn it: a spawn by another acting agent is refused, so no agent borrows
   another function's reach by proxy.
3. The reach starts as the parent's own (`functionWrites`) and `--writes` narrows it. A glob the parent's reach does
   not cover is refused at the spawn, and dropped again at every write, so a hand-edited record cannot widen it.
4. The named skills must be the parent's own.
5. It expires at `now` plus the ttl. The default ttl is an unvalidated prior in
   `packages/naive/src/engine/specialists.json`, which a venture overrides under `specialists` in `naive.config.json`.
6. The spawn is written as a record, `operations/specialists/<role>.json`, with a provenance line, so it is auditable.
7. It then runs through `NAIVE_AGENT_CMD` with `MENTURA_ACTOR_ID` set to its role, exactly as `naive agent run` does,
   and its status becomes `finished` when the run returns.

The router refuses every write by a role whose record is missing, whose status is not `live`, whose expiry has passed,
or whose route no surviving glob matches. No mode and no spawn goes past the gate: the specialist's writes meet the
gate as its own role, a held draft still waits for a person, and a one-way door is still a person's.

## Not built

- Judging a step's `consider.when`. It stays a sentence an agent or a person reads.
- A step a run did not finish is only known when the run reported its steps (`naive due record --steps`). A run that
  reports nothing leaves nothing on the ledger.
- No route serves the skipped ledger, and no record holds it: it is derived each time, like the activity briefing.
- A specialist spawning a specialist, and a specialist that outlives the process that spawned it (nothing sweeps
  expired records; the reach is simply gone once the expiry has passed).
- `naive loop` does not hand a skipped item back on its own.
