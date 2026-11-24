# PR review agent

Reads a pull request's Vercel preview and reports what it finds in a PR comment. It never merges, approves or pushes. `.github/workflows/pr-review.yml` runs it with the PR's own code, no secrets and a read-only token. `.github/workflows/pr-review-comment.yml` posts the comment from the default branch and runs no PR code.

| File | Does |
|---|---|
| `content.mjs` | Fetches the markdown of each changed site page and checks it for internal terms and secret shapes |
| `design.mjs` | Reads computed styles from the preview, with screenshots only when asked (`naive.config.json` `pr_review.screenshots`) |
| `pr-review-test.mjs` | Tests both offline, and checks the two workflows keep their permissions. `naive publish --venture <dir> check` runs on Naive's example venture relay |

## Where the content patterns come from

`content.mjs` uses three lists, in this order:

1. Naive's internal terms, `packages/naive/src/engine/internal-terms.json` in this repository.
2. The founder's own list, frozen in `site/gate/governance/internal-terms.json` (`site/scripts/export-gate.ts` writes it from a venture folder). A missing file is skipped here; the site's page gate fails closed without it.
3. The built-in fallback patterns (ledger ids, private paths, local paths, unfinished markers, secret shapes, email addresses).

The agent moved here with the docs site from Mentura's repository on 2026-11-23. It reviews the docs site's Vercel previews, which now deploy from this repository. Naive's own suite runs in `test.yml`, so `pr-review.yml` no longer lints.

## Run it

```sh
node site/pr-review/content.mjs --fixtures site/pr-review/fixtures
node site/pr-review/pr-review-test.mjs
```
