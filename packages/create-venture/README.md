# create-venture

Up: [packages](../README.md)

## What this is

The generator for Naive (EE-118 step 2): `npx create-venture my-venture` makes a workspace and a first venture on it, as `create-next-app` does for Next.js. It runs Naive's `init-venture.mjs`, so a venture it makes passes the same checks.

Run from a clone of Naive, the venture's `package.json` pins `naive-framework` to the clone's repository at its commit (`git+https://github.com/tchjhnsn/naive.git#<sha>`), as everything-ecosystem pins it (EE-119), and installs from the clone; a clone with no commit keeps a `file:` path. `naive upgrade --framework` moves a git pin to the commit of the Naive running it. The venture's `package.json` also carries the framework's Node floor in `engines.node` (Node 22.19 or later, EE-158). Without `--name` the founder is "Founder" until named: a git identity is not a person's name.

## Where things are

| Path | Holds |
|---|---|
| [`index.mjs`](./index.mjs) | The generator. |
| [`test.mjs`](./test.mjs) | Its tests. |
| [`package.json`](./package.json) | The package, with its `create-venture` bin. |

## Run and test

- `node packages/create-venture/test.mjs` tests the generator; `node test.mjs` runs it. The registry test packs the framework, create-venture and the framework's runtime dependencies (`effect`) from this checkout and installs them offline.

Its `naive dev` test expects every record to be checked as it is saved, because the check runs in process through `validateFile` in [`packages/naive/src/records/validate.mjs`](../naive/src/records/README.md) and needs no Python.
