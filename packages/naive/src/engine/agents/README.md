# agents

Up: [engine](../README.md)

## What this is

The function agents and lead agents, derived from Naive's own data (EE-124; they moved here from everything-ecosystem `platform/agents/`). There is no list of agents: every function in [`departments.json`](../../functions/departments.json) is a function agent, and every role template with a portfolio is a lead. The specs import no agent framework, so any harness can read them; Mentura builds its deepagents from them, and any MCP client reads them through Naive's MCP server (`mentura_agent_brief`, `mentura_route_task`), so no harness plugin is needed to staff an agent.

## Where things are

| Path | Holds |
|---|---|
| [`function-spec.ts`](./function-spec.ts) | `functionAgent(id)`: role `<id>-agent`, charter, the module's `agent.md`, purpose, intake, workflows and decision matrix, skills, and write reach (decisions plus the routes of the record types the data model gives the function, never the team plan); `teamPlanEntry` for the entry a person adds to staff it; `functionResearcher(id)` for the function's researcher |
| [`reach.ts`](./reach.ts) | `functionWrites(id)`, a function agent's write globs, which `functionAgent(id).writes` uses; `functionOfAgent(role)`; and `reachRefusal`, the rule the router applies (`reachOfWrite` in [`../../router/gate-hooks.mjs`](../../router/gate-hooks.mjs)): a write by `<function>-agent` outside those globs is refused before the schema. Plain JavaScript, because the router runs it from an installed copy |
| [`lead-spec.ts`](./lead-spec.ts) | `leadAgent(id)`: portfolio, measure kinds, grantable classes and reach (its lead plan, decisions and handoffs); `routeFor(task, dir)`, the routing rule ([`route-task.ts`](../route-task.ts)) with the tool that takes the task |
| [`brief.ts`](./brief.ts) | `agentBrief(role, dir)`: what an MCP client reads to act as a role, a function agent's spec with the text of its `agent.md`, its workflows and decision matrix, or a lead's spec with its skill, plus the environment to act under (`MENTURA_ACTOR_ID`) and the team-plan entry that staffs it, every path relative to the Naive root; `agentRoles()` lists the roles. The MCP server answers `mentura_agent_brief` with it and `mentura_route_task` with `routeFor` |
| [`agents-test.ts`](./agents-test.ts) | Every function agent has its module's files and a reach that covers what its workflows write; the leads cover the 13 functions once; routing for one function, one portfolio and a one-way door |

## Run and test

- `node packages/naive/src/engine/agents/agents-test.ts`; `node test.ts` runs it. The MCP tools are tested in [`mcp-agent-brief-test.ts`](../../interfaces/tests/mcp-agent-brief-test.ts).
