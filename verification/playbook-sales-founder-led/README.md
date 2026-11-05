# Founder-led sales, checked

The model is one customer record moving through the buying stages in `library/packages/customers/playbooks/sales-founder-led.md`. The earlier TLC run did not find a broken rule. The chart is `out/chart.mmd` and `out/chart.png`.

The chart hides a step that stays in one label. That covers you stopping once the foundation records are missing or the checks already have a result, the two answers of the price read (a price is on file, or none), and whether `knowledge/knowledge-sources` names another source. Those answers share a label. Both check results are drawn: Checks passed and Checks failed.

## Regenerate

From the repo root, with Java 11 or later and the TLC 1.7.4 jar (`tla2tools.jar`, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`):

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
export JAVA=java
/path/to/statechart verification/playbook-sales-founder-led/FounderLedSales.tla \
  --config verification/playbook-sales-founder-led/FounderLedSales.cfg \
  --view verification/playbook-sales-founder-led/view.mjs \
  --out /tmp/founder-led-out
```

`statechart` is the pstack statechart skill (`scripts/statechart`). It needs Node 22.18 or later in the 22 line, or Node 23.6 or later. This run used TLC 2.19 (the 1.7.4 jar) and Java 21.

Render the chart with Pele 1.9.0, then a PNG from the SVG:

```sh
node render.mjs verification/playbook-sales-founder-led/out/chart.mmd
sh png.sh verification/playbook-sales-founder-led/out/chart.svg
```

`render.mjs` and `png.sh` are the Pele renderer from the statechart skill (`references/render.md`): `pele@1.9.0` with `{ limit: 1000000, outputLimit: 8000000, maxEdges: 10000 }`, then headless Chrome at 2x. Copy `chart.mmd` into `out/` before rendering if you regenerated into `/tmp`.

Replay the same steps on a temporary venture:

```sh
node verification/playbook-sales-founder-led/replay.mjs
```

## Rules

The earlier TLC run reported 158 distinct states, 250 steps and depth 11, with no failed invariant and NoDeadlock holding. Re-run on 30 October 2026 with TLC 2.19 on OpenJDK 21: the same result, saved in `out/tlc.out`. The TLC column below comes from the same run.

| Rule | What it says | TLC | Replay |
|---|---|---|---|
| RoutesAreReal | Every step reads or writes a route `node interface/router.mjs` lists | PASS | PASS. `sales/pipeline` is refused (`no route sales/pipeline`). Each route named in the playbook was read or written on the fixture: `knowledge/knowledge-sources`, `foundation/icp`, `foundation/icp/shop-owner`, `foundation/problem`, `product/shop`, `validation/pricing`, `people/founders`, `people/founders/ada`, `customers`, `customers/ada-shop`, `purpose/data-stream/conversations`. |
| NoPhantomRead | A step does not use a record the venture did not provide, or an earlier step did not write. An icp id requires the foundation records. A pointer requires an external source. Notes are not written before the customer exists. The price record is not copied onto the customer. | PASS | PASS. Before any of those records existed, reads of `foundation/icp`, `foundation/problem`, and `product/shop` returned `result: null`, and `customers` was still empty. `validation/pricing` was absent while the customer notes already said 40 USD. After a price record of 49 USD was written, the customer notes still said 40 and did not say 49. |
| ChecksAreReal | The check result is pass exactly when every check holds, and both pass and fail are reachable | PASS. The chart has Checks passed and Checks failed. | PASS. `node verification/playbook-sales-founder-led/replay.mjs` prints PASS for each check failing on a bad record and passing on a repaired one. The goal in the model is one paying customer, because the model has one customer. The playbook's first-ten check is ten. The replay writes ten `paying` records before that check passes, and it fails at zero and at one. |

## What the model leaves out

One customer. The playbook's done line is ten who have paid. The model uses one so the state space stays small. The replay is what counts to ten.

The model does not parse note text. `amount`, `caller`, and `nextAsk` are flags the actions set. A first draft of the paying check treated any digit as an amount, so a date such as 2026-10-29 made "They paid" look like an amount, and the fail case did not fail. The caller check treated the period after an id as part of the id, so `caller: ada.` did not match founder id `ada`. The replay reproduced both. The checks now require digits plus a three-letter currency, and a caller id of lowercase letters, digits, and hyphens. The replay was run again and passed. TLC did not report those, because the flags are not the note text.

`buying_stage` is the field on `customers/[id]`. The customers package also has a model step named `stage` whose answers are `aware`, `trying`, `paying`, and `gone`. The model here does not run that step. `named` is the list, before there are notes for that step to read.

The chart draws 15 states and 27 arrows.
