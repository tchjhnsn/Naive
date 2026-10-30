# Bessemer SaaS metrics playbook

Model of `packages/finance/playbooks/bessemer-saas-metrics.md`: the states a founder's records move through as the template steps run. TLC checks the rules. `replay.mjs` runs the same routes on fixture ventures.

The chart hides two kinds of step. `CiteTarget` stays on "Metrics record proposed" (a later phase may cite a published number only after the Bessemer pages are filed, and discovery and validation never do). `Done` is the stutter on the end states: checks failed, you decided with no telos on file, and targets drafted on the telos. The earlier TLC run counted 88 of those model steps. The drawn chart is the path a reader follows.

`venture` is not a row in `node interface/router.mjs`. `call()` still answers it: `interface/writes.mjs` hands an unknown route to `specialCall` in `interface/package-routes.mjs`. The replay reads `phase` from it. `finance/metrics` is not a route. The playbook does not use it.

## Regenerate

From the repo root, with the pstack `statechart` script (it installs TLC and Java through mise on first run):

```sh
rm -rf /tmp/bessemer-chart
sh <pstack>/skills/statechart/scripts/statechart \
  verification/playbook-bessemer-saas-metrics/BessemerSaasMetrics.tla \
  --config verification/playbook-bessemer-saas-metrics/BessemerSaasMetrics.cfg \
  --view verification/playbook-bessemer-saas-metrics/view.mjs \
  --out /tmp/bessemer-chart
```

`--out` must be a new or empty directory. Copy `chart.mmd` into `out/`. Render the PNG with Pele 1.9.0 and the kit's `pele/render.mjs` and `pele/png.sh` (headless Chrome).

Replay the routes:

```sh
node verification/playbook-bessemer-saas-metrics/replay.mjs
```

An earlier run of TLC 1.7.4 (the statechart script's pinned jar) reported 496 states, 520 steps and exit 0. That output was not saved, so these counts have no file behind them, and TLC has not been re-run since. The TLC column below comes from the same run. The chart draws 13 states and 12 arrows.

## Rules

| Rule | TLC | Replay |
| --- | --- | --- |
| EveryStepUsesARealRoute | PASS | PASS. `call` on `finance/metrics` returns `no route finance/metrics`. On the beachhead fixture, reads of `venture`, `product/ledger`, `validation/pricing`, `purpose/money/summary`, `validation/product-market-fit`, `foundation/telos`, `raw/sources/bessemer-scaling-100m`, `decisions/finance-saas-metrics`, and `evidence/bessemer-saas-metrics` all return a record. |
| NoUseBeforeProvided | PASS | PASS. A scale-phase note with `arr_band` `$1-10MM` and value `125% net retention` sourced to `bessemer-scaling-100m` passes. `130% net retention` fails `targets-sourced`. Discovery with `125% net retention` fails `no-early-number`. A runway figure with no `purpose/money/summary` fails `actuals-from-records`. `400% year-over-year` is not a phase target. |
| CheckMatches | PASS | PASS. With a subscription product, filed sources, a money summary, and every phase target `no published Bessemer target`, `evidence/bessemer-saas-metrics` is written with `passed` true. With no product card, the same evidence route is written with `passed` false (`cloud-fit`). |
| TypeOK | PASS | The fixture records that were written came back from the router valid against their schemas. |
| NoDeadlock | PASS | The replay's pass path ends on a telos draft. The fail path ends on evidence with `passed` false. |

The model claims less than the playbook. The playbook has six failure criteria: `cloud-fit`, `targets-sourced`, `no-early-number`, `actuals-from-records`, `decision-open`, and `telos-when-decided`. `CheckMatches` in `BessemerSaasMetrics.tla` covers one way to fail: the chart state "Checks failed" means no product is on file. TLC says nothing about the other five. `grade` in `replay.mjs` runs all six on fixtures, so the replay is the only evidence for those five.

A scratch module that is not this spec, `UseMissing` (set actuals to `from-money` while `moneyPresent` is false), breaks `NoUseBeforeProvided` in one step. That action is not in `BessemerSaasMetrics.tla`. The replay does not reproduce it: a filled runway with no money summary fails the playbook check instead of being stored as fact.

`propose` of a decision with status `decided` is refused: "an agent may only propose an open decision; a person approves it." After `mentura decide --confirm finance-saas-metrics --answer` with a person's name, the checks read the metrics record from `answer`, and an agent write of `foundation/telos` returns `draft: true` and leaves the live file unchanged.
