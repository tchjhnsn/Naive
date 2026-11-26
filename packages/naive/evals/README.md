# evals

Up: [naive](../README.md)

## What this is

Public eval files (EE-198). One file is a canary plus items. Each item has an id, a split of exemplar or held-out, a record path, a label of accept, reject or null, and labelled_by. A held-out item passes `held-out-item` when its id is in no exemplar file and no prompt fixture. A label is non-null only when labelled_by names a person, judged by `person-label`. The faithful-author term is not on main, so person-label states that rule. Observed-company evals are not in this repository.

## Where things are

| Path | Holds |
|---|---|
| [`discovery-subscription.json`](./discovery-subscription.json) | The eval file for the discovery subscription template. Its canary is the fixed string in [`check-canary.ts`](../src/checks/check-canary.ts). The held-out item's record is the template. Its label is null. |

## Run and test

- `node packages/naive/src/checks/check-canary.ts` compares each file's canary with its fixed string.
- `node packages/naive/src/checks/check-evals.ts` runs the canary check, the held-out term and the person-label term.
- `node packages/naive/src/terms/evals-test.ts` runs the two terms on facts.

## How it connects

- Exemplar files are in [`../exemplars/README.md`](../exemplars/README.md).
- The terms are `held-out-item` and `person-label` in [`../src/terms/terms.ts`](../src/terms/terms.ts), proved in [`../lean/Naive/Evals.lean`](../lean/Naive/Evals.lean).

## Not built

- A prompt fixture folder is not in this repository. The check treats a file under `prompts/` or a file ending in `.prompt.md` as one, and today it finds none.
