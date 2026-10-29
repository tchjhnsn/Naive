---
name: verify-legal-lint
description: >
  Check a change to the legal lint against its TLA+ model: schema/lint-legal.mjs,
  the legal/lint route, and naive check's lint-legal entry. Use before merging a
  change to those, or to packages/legal/skill/SKILL.md where it describes the lint.
---

# Verify the legal lint

One TLA+ model of a legal-lint run. This is a lint, not legal advice. Read every TLC result with the pstack `/statechart` skill. It runs TLC, prints each broken rule as its shortest path in plain words, and draws the chart.

## Does my change touch it?

Coverage, confirmed at the commit that adds `verification/lint-legal` on `cursor/lint-legal`:

| Model action | Code |
| --- | --- |
| SeeClaim | `schema/lint-legal.mjs` `walkMdx`, `claimOf` |
| SeeAgreement | `schema/lint-legal.mjs` `partiesOf` |
| ApplyModes | `schema/lint-legal.mjs` `modesOf` (`naive.config.json` key `legal_lint.rules.<id>.mode`) |
| Judge | the two `add` calls in `lint` |
| Exit | `process.exit` from `ok`, and `interface/router.mjs` when it runs `legal/lint` |
| channel `ventureFile` | every read goes through `ventureFile` in `schema/venture-paths.mjs` |

`naive check` runs `schema/lint-legal.mjs` because `interface/cli/naive.mjs` lists `lint-legal`.

If `git diff <sync> -- schema/lint-legal.mjs interface/router.mjs interface/cli/naive.mjs` is empty, the model still describes the code. Move the sync commit forward only after you confirm, file by file, that each action above still matches.

## Run it

1. Run `/statechart` on `verification/lint-legal/LegalLint.tla` with `LegalLint.cfg` and `view.mjs`.
2. Replay on the real CLI: `node schema/lint-legal-test.mjs`.

## Real bug or model error?

A rule that breaks in TLC is a real bug only when its replay does the same thing on `node schema/lint-legal.mjs`. If the replay does not reproduce it, assume the model is wrong: open the function named in the action's comment, fix the action, and rerun. Never weaken an INVARIANT to make it pass.

Known at the sync commit: no rule breaks. The chart hides the agreement read, the mode step, and the end self-loop, because those do not change the label a reader sees. See `verification/lint-legal/README.md` for the rules table.
