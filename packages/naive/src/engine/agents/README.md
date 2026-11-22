# agents

Up: [engine](../README.md)

## What this is

The function agents and lead agents, derived from Naive's own data (EE-124; they moved here from everything-ecosystem `platform/agents/`). There is no list of agents: every function in [`departments.json`](../../functions/departments.json) is a function agent, and every role template with a portfolio is a lead. The specs import no agent framework, so any harness can read them; Mentura builds its deepagents from them.

## Where things are

| Path | Holds |
|---|---|
| [`function-spec.ts`](./function-spec.ts) | `functionAgent(id)`: role `<id>-agent`, charter, the module's `agent.md`, purpose, intake, workflows and decision matrix, skills, and write reach (decisions plus the routes of the record types the data model gives the function, never the team plan); `teamPlanEntry` for the entry a person adds to staff it; `functionResearcher(id)` for the function's researcher |
| [`lead-spec.ts`](./lead-spec.ts) | `leadAgent(id)`: portfolio, measure kinds, grantable classes and reach (its lead plan, decisions and handoffs); `routeFor(task, dir)`, the routing rule ([`route-task.ts`](../route-task.ts)) with the tool that takes the task |
| [`agents-test.ts`](./agents-test.ts) | Every function agent has its module's files and a reach that covers what its workflows write; the leads cover the 13 functions once; routing for one function, one portfolio and a one-way door |

## Run and test

- `node packages/naive/src/engine/agents/agents-test.ts`; `node test.mjs` runs it.
