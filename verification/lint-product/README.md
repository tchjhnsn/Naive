# Product lint

TLA+ model of `schema/lint-product.mjs` (route `product/lint`). One product record is read through `ventureFile`, judged, then the run exits. ICP jobs and the pricing record are looked up by key. No step copies them onto the product.

TLC 1.7.4 checked the model at 40 states and 40 steps. Every rule held. The chart draws 9 states and 14 arrows. It hides the `Done` stutter (10 steps), which stays in Exit 0 or Exit 1 and changes nothing.

The model is one record and one defect at a time. The code can fire more than one rule on one product. `interface/tests/lint-product-test.mjs` replays that case. The model also leaves out the router's wrapping of a non-zero exit as `ok: false`. The route test replays that.

## Regenerate

From the repo root, with TLC 1.7.4 on `TLA2TOOLS` (or let the pstack `/statechart` skill install it with mise) and Java 11 or later:

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
rm -rf /tmp/product-lint-chart
/path/to/pstack/skills/statechart/scripts/statechart \
  verification/lint-product/ProductLint.tla \
  --config verification/lint-product/ProductLint.cfg \
  --view verification/lint-product/view.mjs \
  --out /tmp/product-lint-chart
```

Copy `/tmp/product-lint-chart/chart.mmd` to `verification/lint-product/out/chart.mmd`. Render that file with Pele 1.9.0 (the pstack naive example `pele/render.mjs` and `png.sh`) to replace `out/chart.png`.

## Rules

| Rule | TLC | Replay |
| --- | --- | --- |
| EachRuleFires | PASS | `node interface/tests/lint-product-test.mjs`: one product with no ICP, a feature with no job, and a business model with no pricing record. Exit 0. Findings are `product-no-icp`, `feature-no-job`, and `business-model-no-pricing`. |
| SilentOnClean | PASS | Same test: a product offered to `shop-owners`, a feature whose job is that profile's job, and `validation/pricing.json` naming the product. Exit 0. No findings. |
| ExitIffFailClosed | PASS | Same test: `product_lint.rules.product-no-icp.mode` set to `fail-closed` while that rule has no finding exits 0. `feature-no-job` set to `fail-closed` while it has a finding exits 1. A mode other than `fail-open` or `fail-closed` stays fail-open. |
| MalformedNeverCrashes | PASS | Same test: a product file, an ICP file, a pricing file, and `naive.config.json` that are not JSON. Exit 0. The sibling card is still judged. A directory with no `venture.json` exits 2. |
| InputsFromVentureFile | PASS | Same test: `layout: "structured"`. The card, the per-file ICP, and `purpose/validation/pricing.json` sit under `k-base/` and `meta/`. Exit 0. No findings. |
| IcpReadByKeyNeverCopied | PASS | Same test: rewriting only `foundation/icp.json` jobs makes `feature-no-job` fire. The product file bytes are unchanged, so the ICP was not copied onto it. |

A scratch `Finish` that always sets the exit code to 0 breaks `ExitIffFailClosed`. TLC's shortest path is: records not read, read the venture's records, the product names no ICP, the finding stays a warning, Exit 0. The real CLI with `product_lint.rules.product-no-icp.mode` set to `fail-closed` exits 1 on that fixture, so the scratch action was wrong. It is not part of this model.

## Chart paths

| Path | Replay |
| --- | --- |
| Judge a clean venture, then no fail-closed finding, Exit 0 | Clean venture in the test. Exit 0. |
| The product names no ICP, the finding stays a warning, Exit 0 | The three-rule fixture, default modes. Exit 0. |
| The product names no ICP, a fail-closed rule has a finding, Exit 1 | Route `product/lint` and the CLI, with that rule fail-closed. Exit 1. |
| The feature serves no job, warning or fail-closed | The test rewrites the ICP job, then sets `feature-no-job` fail-closed. Exit 0, then exit 1. |
| The business model has no pricing record | The three-rule fixture includes `business-model-no-pricing`. |
| Skip a record that is not valid JSON, Exit 0 | The malformed-file case. Exit 0. |
| No finding, and the fail-closed rule has no finding, Exit 0 | `product-no-icp` is fail-closed and the only finding is `feature-no-job`. Exit 0. |
