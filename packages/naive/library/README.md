# library

Up: [naive](../README.md)

## What this is

The venture package library (EE-070, EE-071, step 6). A venture package is a folder of records a venture adopts by function, such as foundation, people or money; `catalog.json` lists them.

## Where things are

| Path | Holds |
|---|---|
| [`packages/`](./packages) | One folder per venture package, each with its `package.json`. |

The foundation package lists `packages/naive/src/records/validate.mjs` among its checks: records are validated in JavaScript, with no Python.
