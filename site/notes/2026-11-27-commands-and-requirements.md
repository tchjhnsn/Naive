# Note: the command is `naive`, and Naive needs no Python

- From: release manager (written by hand on 2026-11-27, before the role exists)
- To: site owner
- Pages: 11 docs pages under `content/docs/`
- Source: `packages/naive/src/interfaces/cli/naive.ts` (every record command of `mentura` runs under `naive`), `package.json` (`engines`, `peerDependencies`), `packages/naive/src/records/validate.ts`

## What changed in the code

- One command covers a business: `naive` runs every `mentura` command it does not have itself.
- Records are validated in process. Python is not needed.
- Node 22.19 is the floor. Naive depends on Effect at an exact version.

## What changed on the pages

- 23 uses of `mentura <command>` in prose and in shell blocks now say `naive <command>`.
- The errors page quotes the recovery hint as the program prints it now, with `validate.ts` in place of the Python validator.
- The install page no longer lists Python, names Node 22.19, and no longer says Naive has no dependencies.

## Left as it is, and why

- 10 uses of `mentura <command>` inside quoted program output. The program still prints those words, and a page that quotes output has to match it. Changing the hints the program prints is a code change, not a docs change.
- `get-started/whats-built.mdx`, which is generated from `docs/design/naive-nextjs-status.json`.
