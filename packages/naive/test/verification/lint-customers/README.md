# Customers lint

TLA+ model of `packages/naive/src/checks/lint-customers.mjs` (route `customers/lint`). One customer, one promise that names one product key, and one lint run after each change. The product variable is the product record read by that key on this run, through `ventureFile`. A later change to the product is what the next run sees. The lint does not copy the product onto the customer.

`icp = "gone"` is a missing ICP file and an unreadable one. Both leave no profile ids. The CLI replay below runs those two cases separately. `configMode = "config-bad"` is an unreadable `naive.config.json`: the override is not applied, so both rules stay fail-open.

TLC (tla2tools 1.7.4) reached 350 states. Every rule held, including `NoDeadlock`. No rule break to replay. The chart paths were replayed with `node packages/naive/src/interfaces/tests/lint-customers-test.mjs`.

## Regenerate

From the repo root, with Java 11 or later and tla2tools.jar 1.7.4 (sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`). `--out` must be a new or empty folder.

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  /path/to/pstack/skills/statechart/scripts/statechart \
  packages/naive/test/verification/lint-customers/CustomersLint.tla \
  --view packages/naive/test/verification/lint-customers/view.mjs \
  --out /tmp/customers-lint-chart
```

Then render `chart.mmd` with Pele 1.9.0 (`naive-example/pele/render.mjs`) and `png.sh`, and copy `chart.mmd` and `chart.png` here.

## Rules

| Rule | Result | Replay |
|---|---|---|
| TypeOK | PASS | `node packages/naive/src/interfaces/tests/lint-customers-test.mjs`: every run prints JSON with `rules`, `findings` and `ok`, and exits 0, 1 or 2 |
| FindingsMatch | PASS | `no-icp-match` fires for a customer whose `icp` is not a profile, and for a customer with no `icp`. `promise-not-kept` fires only when a readable customer has a promise the current product record does not keep |
| ExitIffFailClosed | PASS | Fail-open with a finding exits 0. Fail-closed with a finding exits 1. Fail-closed with no finding exits 0. A fail-open finding exits 0 while another rule is fail-closed and quiet. A mode other than `fail-open` or `fail-closed` stays fail-open. An unreadable config stays fail-open |
| SilentOnClean | PASS | Customer `ada`, ICP `shop-owners`, promise `next-day pickup` while `product/desk.json` job contains those words: 0 findings, exit 0 |
| RuleFiresOnItsFixture | PASS | `customers/bev.json` with `icp` `clinics` fires `no-icp-match` only. `ada` promising `same-day delivery` fires `promise-not-kept` only |
| MalformedNeverCrashes | PASS | Unreadable customer JSON, product JSON, ICP JSON and `naive.config.json`, and a `customers` path that is a file: the process prints a result and does not throw |
| PromiseFollowsCurrentProduct | PASS | Quiet while the product keeps the words. After the job drops them, the next run reports the promise. Retired, removed and unreadable product records report it too. Restoring `products/desk.json` with the words clears it |
| ReadsOnlyViaVentureFile | PASS | A structured venture reads `k-base/` and `meta/naive.config.json`. A decoy `customers/ada.json` at the venture root is ignored. Fail-closed in `meta/naive.config.json` exits 1 |
| NoDeadlock | PASS | TLC: every state has a step out. Not a separate CLI case |

## What the chart hides

The chart draws 10 states and 20 arrows. It hides steps that stay in one label, and pairs of labels that are not in `view.mjs` `edges`.

Hidden because the label does not change: adding a matched customer to a quiet venture; setting a rule fail-closed when that rule has no findings; editing a product record when no promise names it.

The arrow "the product record changes and no longer keeps the promise" is four model actions: the product drops the promised words, the product is retired, the product record is removed, and the product record cannot be read. The CLI replay runs each one.

Also hidden: making a promise for a customer who already matches no ICP (that step can land on both rules directly). Both rules are still reached from "Warned: the product does not keep the promise" by "the customer also matches no ICP".
