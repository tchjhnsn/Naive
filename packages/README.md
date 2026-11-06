# packages

Up: [repository](../README.md)

## What this is

The two products this repository ships (EE-118): Naive, the venture development framework, and create-venture, the generator that starts a workspace and a venture on it, as `create-next-app` does for Next.js. The root `package.json` is still the installable `naive-framework` package, because a git dependency installs the repository root; its `exports` reach into `packages/naive/`.

## Where things are

| Path | Holds |
|---|---|
| [`create-venture/`](./create-venture/README.md) | The generator: `npx create-venture`, a workspace and a first venture. |
| [`naive/`](./naive/README.md) | The framework: its code, Lean proofs, venture package library, venture template and tests. |
