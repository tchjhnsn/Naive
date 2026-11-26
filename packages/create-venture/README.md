# create-venture

Up: [packages](../README.md)

## What this is

The generator for Naive (EE-118 step 2): `npx create-venture my-venture` makes a workspace and a first venture on it, as `create-next-app` does for Next.js. It runs Naive's `init-venture.ts`, so a venture it makes passes the same checks.

Run from a clone of Naive, the venture's `package.json` pins `naive-framework` to the clone's repository at its commit (`git+https://github.com/tchjhnsn/naive.git#<sha>`), as everything-ecosystem pins it (EE-119), and installs from the clone; a clone with no commit keeps a `file:` path. `naive upgrade --framework` moves a git pin to the commit of the Naive running it. The venture's `package.json` also carries the framework's Node floor in `engines.node` (Node 22.19 or later, EE-158), and `effect` in `dependencies` at the framework's exact peer version, so the venture and Naive share one copy of Effect (EE-161). It also writes `src/naive/hello.ts`, an example program `naive run src/naive/hello.ts` runs on the venture runtime, and `src/naive/done/venture-named.ts`, an example done-criterion a handoff names with `runs: "effect"`. Without `--name` the founder is "Founder" until named: a git identity is not a person's name. `--modeled`, or `--mode modeled`, writes `venture.json` `mode` `modeled`, leaves function owners null, writes `people.json` `mode` null, and scaffolds decisions with `decision_maker` null. The founding question does not address the founder as you. `--mode run` writes `mode` `run` and keeps today's solo ownership, with no `decision_maker`. Omitting both does the same as a run venture and leaves `mode` absent. On a modeled venture the provenance agent is the process (`MENTURA_ACTOR`), not the named person.

Installed under `node_modules`, where Node does not strip types, it runs the framework's compiled copy (`dist/` in the installed `naive-framework`, EE-159); from a clone it runs the clone's source.

## Where things are

| Path | Holds |
|---|---|
| [`index.mjs`](./index.mjs) | The generator. |
| [`test.mjs`](./test.ts) | Its tests. |
| [`package.json`](./package.json) | The package, with its `create-venture` bin. |

## Run and test

- `node packages/create-venture/test.ts` tests the generator; `node test.ts` runs it. The registry test packs the framework, create-venture and the framework's runtime and peer dependencies (`effect`) from this checkout and installs them offline, then runs the installed create-venture and `naive check` with type stripping off (`--no-experimental-strip-types`), so both run compiled JavaScript.

Its `naive dev` test expects every record to be checked as it is saved, because the check runs in process through `validateFile` in [`packages/naive/src/records/validate.ts`](../naive/src/records/README.md) and needs no Python.
