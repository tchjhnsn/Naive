# create-venture

Up: [packages](../README.md)

## What this is

The generator for Naive (EE-118 step 2): `npx create-venture my-venture` makes a workspace and a first venture on it, as `create-next-app` does for Next.js. It runs Naive's `init-venture.mjs`, so a venture it makes passes the same checks.

## Where things are

| Path | Holds |
|---|---|
| [`index.mjs`](./index.mjs) | The generator. |
| [`test.mjs`](./test.mjs) | Its tests. |
| [`package.json`](./package.json) | The package, with its `create-venture` bin. |

## Run and test

- `node packages/create-venture/test.mjs` tests the generator; `node test.mjs` runs it.
