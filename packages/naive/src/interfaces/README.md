# interfaces

Up: [src](../README.md)

## What this is

The ways a person, or an agent, works with a venture: the `naive` and `mentura` CLIs, the MCP server and the local HTTP API, all over one router (EE-030). Also the skills the Claude Code plugin ships, the harness adapters, the agent harness and the operator console.

## Where things are

| Path | Holds |
|---|---|
| [`adapters/`](./adapters) | Harness adapters: Claude Code, Codex, Cursor. |
| [`adapters.ts`](./adapters.ts) | Adapters (Z-4). |
| [`api/`](./api) | The local HTTP API over the router. |
| [`cli/`](./cli) | `naive.ts` and `mentura.ts`, the CLIs. `naive` is the one CLI: `naive new [dir]` runs create-venture's questions and scaffold, and any command `naive` does not have itself runs as the same `mentura` command, so `naive <route> <action>`, `naive decide`, `naive decisions` and `naive accept` work inside a venture and `naive help` lists both sets. `naive agent list|brief|run` runs [`agents/run.ts`](../engine/agents/run.ts): run hands a role's prompt to `NAIVE_AGENT_CMD` as that role, or prints it. `mentura` stays as an alias. `mentura <route> write --as person --revert` marks a write as restoring the version before (provenance activity `rollback`), which resolves the gate's no call on the reverted write as a miss when the venture keeps the gate detector. `naive trace append` and `naive trace show` run [`trace-cli.ts`](../engine/trace-cli.ts) on the venture's trace files (EE-121). `naive signals emit|pull|explain|replay` run the signal library's [`orchestration/signals.ts`](../router/orchestration/signals.ts) on the venture (signal library build item 5). `naive recipes init`, `naive recipes plan` and `naive recipes check` run [`recipes/cli.ts`](../engine/recipes/cli.ts): a person's starter recipe, a person's eval plan, and training feedback on it. `naive recipes search <pattern>` runs [`orchestration/recipe-search.ts`](../router/orchestration/recipe-search.ts): a knob descent with no model, each step written through the recipe route, so a keep is held for a person. `mentura accept recipes/<pattern>` sends a recipe's held tip to its route's `accept`, which runs the holdout check, instead of moving a draft into place. `mentura operations/handoff/<id> claim --venture <id>` takes a ready, unclaimed handoff for the acting role once, through the router's [`handoff-claim.ts`](../router/handoff-claim.ts); `claimed_by` is `MENTURA_SESSION`, else the role. `mentura index` also returns the decision queue across functions (`queue`, EE-127). `naive handoff run <id>` runs a handoff's done-criteria, as a durable workflow when `durable.engine` is set ([`durable-handoff.ts`](../router/orchestration/durable-handoff.ts)) and through `run-handoff.ts` otherwise. `naive run <file>` runs a venture program on the venture runtime ([`venture-program.ts`](../engine/venture-program.ts), EE-161). `naive dev` starts each server before it prints or uses its address, so no other process takes a port between a probe and the listen. `naive check` also checks the venture's Effect pin and that it resolves the same version of Effect as Naive ([`effect-pin.ts`](../engine/effect-pin.ts), EE-161). |
| [`context-test.ts`](./context-test.ts) | Tests for context (packages/naive/src/router/context.ts), instrumentation (packages/naive/src/core/instrumentation.ts) and agent vitals (packages/naive/src/router/vitals.ts). |
| [`demo/`](./demo) | Demos: the decision harness and a live agent over MCP. |
| [`dev/`](./dev) | `naive dev` setup and its test. |
| [`harness/`](./harness) | The agent harness, its evals and examples. Hosted (`NAIVE_RUNTIME=hosted`), `run.mjs` refuses to start, and `site.ts` reads a site and judges it through the host's `site` and `judge` hooks, refusing without a `site` hook. |
| [`mcp/`](./mcp) | The MCP server over the router. It lists a resource for each record route without a dynamic segment (`[id]` or the recipe route's `[...pattern]`). `mentura_agent_brief` tells any MCP client how to act as a function agent or lead, and `mentura_route_task` who takes a task ([`engine/agents`](../engine/agents/README.md)). |
| [`operator-console/`](./operator-console/README.md) | The operator console. |
| [`plugin-mcp.json`](./plugin-mcp.json) | The Claude Code plugin's MCP server entry (EE-084). |
| [`plugin-test.ts`](./plugin-test.ts) | The Claude Code plugin (EE-084). |
| [`skills/`](./skills) | The interface layer's skills: install, create, setup, choosing artifacts, run a playbook, and research, Naive's one generic research skill for every function's researcher (the autoresearch loop and its rules). The plugin ships create, setup and research. |
| [`test.mjs`](./test.ts) | Tests for the router and the three interfaces over it (EE-030). |
| [`tests/`](./tests/README.md) | Tests that run a module in `packages/naive/src/engine/` through the router. |

## Run and test

- `node packages/naive/src/interfaces/test.ts` tests the router and the three interfaces over it.
- `node packages/naive/src/interfaces/plugin-test.ts` tests the plugin manifest and skills.

## How it connects

- Calls: [`router`](../router/router.ts).

`naive dev` checks each record as it is saved with `validateFile` from [`packages/naive/src/records/validate.ts`](../records/README.md), and `naive info` no longer reports a Python version, because nothing here needs one.

`naive upgrade --framework` moves a git pin (`git+https://...#<sha>`, which create-venture writes from a clone) to the commit of the Naive running it and installs from that clone with `npm install --no-save`, so the update needs no network. The clone is `PACKAGE_ROOT` from [`core/scripts.mjs`](../core/scripts.ts), the folder above `dist/` when the CLI runs compiled (EE-159).
