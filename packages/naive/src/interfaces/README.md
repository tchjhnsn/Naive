# interfaces

Up: [src](../README.md)

## What this is

The ways a person, or an agent, works with a venture: the `naive` and `mentura` CLIs, the MCP server and the local HTTP API, all over one router (EE-030). Also the skills the Claude Code plugin ships, the harness adapters, the agent harness and the operator console.

## Where things are

| Path | Holds |
|---|---|
| [`adapters/`](./adapters) | Harness adapters: Claude Code, Codex, Cursor. |
| [`adapters.mjs`](./adapters.mjs) | Adapters (Z-4). |
| [`api/`](./api) | The local HTTP API over the router. |
| [`cli/`](./cli) | `naive.mjs` and `mentura.mjs`, the CLIs. `mentura <route> write --as person --revert` marks a write as restoring the version before (provenance activity `rollback`), which resolves the gate's no call on the reverted write as a miss when the venture keeps the gate detector. `naive trace append` and `naive trace show` run [`trace-cli.ts`](../engine/trace-cli.ts) on the venture's trace files (EE-121). `naive signals emit|pull|explain|replay` run the signal library's [`orchestration/signals.ts`](../router/orchestration/signals.ts) on the venture (signal library build item 5). `naive recipes plan` and `naive recipes check` run [`recipes/cli.ts`](../engine/recipes/cli.ts): a person's eval plan, and training feedback on it. |
| [`context-test.mjs`](./context-test.mjs) | Tests for context (packages/naive/src/router/context.mjs), instrumentation (packages/naive/src/core/instrumentation.mjs) and agent vitals (packages/naive/src/router/vitals.mjs). |
| [`demo/`](./demo) | Demos: the decision harness and a live agent over MCP. |
| [`dev/`](./dev) | `naive dev` setup and its test. |
| [`harness/`](./harness) | The agent harness, its evals and examples. Hosted (`NAIVE_RUNTIME=hosted`), `run.mjs` refuses to start, and `site.mjs` reads a site and judges it through the host's `site` and `judge` hooks, refusing without a `site` hook. |
| [`mcp/`](./mcp) | The MCP server over the router. |
| [`operator-console/`](./operator-console/README.md) | The operator console. |
| [`plugin-mcp.json`](./plugin-mcp.json) | The Claude Code plugin's MCP server entry (EE-084). |
| [`plugin-test.mjs`](./plugin-test.mjs) | The Claude Code plugin (EE-084). |
| [`skills/`](./skills) | The skills the plugin ships: install, create, setup, choosing artifacts, run a playbook. |
| [`test.mjs`](./test.mjs) | Tests for the router and the three interfaces over it (EE-030). |
| [`tests/`](./tests/README.md) | Tests that run a module in `packages/naive/src/engine/` through the router. |

## Run and test

- `node packages/naive/src/interfaces/test.mjs` tests the router and the three interfaces over it.
- `node packages/naive/src/interfaces/plugin-test.mjs` tests the plugin manifest and skills.

## How it connects

- Calls: [`router`](../router/router.mjs).

`naive dev` checks each record as it is saved with `validateFile` from [`packages/naive/src/records/validate.mjs`](../records/README.md), and `naive info` no longer reports a Python version, because nothing here needs one.
