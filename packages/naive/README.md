# naive

Up: [packages](../README.md)

## What this is

Naive, the venture development framework (EE-024, EE-118). Naive is to a venture what Next.js is to an app: the conventions, the record types, the router and the CLI, MCP server and local API over it, and the checks. A real venture is an instance of the template here and lives in its tenant's own store, outside this repository.

## Where things are

| Path | Holds |
|---|---|
| [`lean/`](./lean/README.md) | The Lean proofs the term engine cites (EE-095). |
| [`library/`](./library/README.md) | The venture packages a venture can adopt (EE-070, EE-071). |
| [`src/`](./src/README.md) | The code, in units ordered by the dependency rules. |
| [`template/`](./template/README.md) | The files a new venture starts from: governance defaults, `src/<function>/` and `public/`. |
| [`test/`](./test/README.md) | Verification fixtures, benchmarks and evals the tests read. |

## Run and test

- `node test.mjs` at the repository root runs every test and check here.
- `node scripts/dependency-rules.ts` checks that the units in `src/` import in one direction.
