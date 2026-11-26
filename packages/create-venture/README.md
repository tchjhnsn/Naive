# create-venture

Up: [packages](../README.md)

## What this is

The generator for Naive (EE-118 step 2): `npx create-venture my-venture` makes a workspace and a first venture on it, as `create-next-app` does for Next.js. It runs Naive's `init-venture.ts`, so a venture it makes passes the same checks. It writes `venture.json` `mode` `run` (EE-193). `--observed` writes `observed`. `--mode observed` or `--mode run` is the explicit form and is passed through to `init-venture.ts`. `naive new` runs this generator. The field is not `people.json` mode (solo or team) and not the loop mode.

Run from a clone of Naive, the venture's `package.json` pins `naive-framework` to the clone's repository at its commit (`git+https://github.com/tchjhnsn/naive.git#<sha>`), as everything-ecosystem pins it (EE-119), and installs from the clone; a clone with no commit keeps a `file:` path. `naive upgrade --framework` moves a git pin to the commit of the Naive running it. The venture's `package.json` also carries the framework's Node floor in `engines.node` (Node 22.19 or later, EE-158), and `effect` in `dependencies` at the framework's exact peer version, so the venture and Naive share one copy of Effect (EE-161). It also writes `src/naive/hello.ts`, an example program `naive run src/naive/hello.ts` runs on the venture runtime, and `src/naive/done/venture-named.ts`, an example done-criterion a handoff names with `runs: "effect"`. Without `--name` the founder is "Founder" until named: a git identity is not a person's name. `--name` is the subject written into `people/`. The provenance agent is the process (`MENTURA_ACTOR`, `MENTURA_ACTOR_ID`, `MENTURA_MODEL`, `MENTURA_SESSION`, `MENTURA_HARNESS`), so that name is not copied into the agent id. `--by` names a person only when the process is a person and `MENTURA_ACTOR_ID` is unset. An agent ignores `--by`. With `MENTURA_ACTOR` unset the kind is unverified. `--help` prints usage and writes nothing. An unknown flag, including a leftover `--modeled`, is refused by name and writes nothing. On an observed venture `joined` is null unless `--joined` and `--joined-source` are both set, and the workspace owner is the writing person or null, never the named subject. `--observed`, or `--mode observed`, leaves function owners null, writes `people.json` `mode` null, and scaffolds decisions with `decision_maker` null. The founding question does not address the founder as you. Without `--observed`, ownership stays solo and no `decision_maker` is added. A framework decision whose question the founder already answered at create-venture is decided then, as the founder's own answer through `approve` in [`packages/naive/src/engine/decisions.ts`](../naive/src/engine/README.md), so no one is asked twice: "solo or team" decides the team question `founding-team` (Solo, or Cofounders on a team), and the provenance log names the founder as the one who approved it.

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
