# Jobs playbook, checked

The model is the template in `packages/naive/library/packages/foundation/playbooks/jtbd.md`. One profile moves from the records the venture already has, through a draft, to a founder accept. TLC 2.19 (tla2tools 1.7.4) checked it. The replay drives `packages/naive/src/router/router.mjs` `resolve` and `call` on a fixture venture.

The chart hides `Park`. That action is true only in the end states (stopped, check failed, accepted) and changes nothing, so the chart has no arrow for it. The earlier playbook run hid 12 of those steps. No other step is hidden.

## Regenerate

From the repo root. tla2tools 1.7.4, which reports TLC 2.19, is the jar pinned by the statechart script (`sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`). Java 11 or later. This run used OpenJDK 21. Set `TLA2TOOLS` to the jar and `JAVA` to the binary, or leave them unset and let the statechart script install TLC and Temurin 25 with mise.

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=/usr/bin/java \
  /path/to/statechart/scripts/statechart \
  packages/naive/test/verification/playbook-jtbd/JtbdPlaybook.tla \
  --config packages/naive/test/verification/playbook-jtbd/JtbdPlaybook.cfg \
  --view packages/naive/test/verification/playbook-jtbd/view.mjs \
  --out /tmp/jtbd-chart
```

`--out` must be a new or empty directory. The probe, which adds steps the playbook does not take, uses `--config packages/naive/test/verification/playbook-jtbd/JtbdProbe.cfg` and a different `--out`. It exits 1.

Render the chart with Pele 1.9.0 and the statechart skill's `references/render.md` colors, then a headless Chrome PNG:

```sh
node render.mjs packages/naive/test/verification/playbook-jtbd/out/chart.mmd
sh png.sh packages/naive/test/verification/playbook-jtbd/out/chart.svg
```

`render.mjs` and `png.sh` are the Pele renderer from the statechart skill's worked example (`pele@1.9.0`).

Replay the rules on a fixture venture. Needs `python3` with `jsonschema`, because a router write validates the record.

```sh
node packages/naive/test/verification/playbook-jtbd/replay.mjs
```

## Rules

Playbook config (`Probe = FALSE`): the earlier run reported 36 states and 40 steps, with every rule holding, including `NoDeadlock`. Re-run on 30 October 2026 with TLC 2.19 on OpenJDK 21: the same result, saved in `out/tlc.out`. The PASS cells in the model column below are from that earlier run, on the older route names. The chart is from before the route change. It draws 13 states and 16 arrows, and its labels name no route. Replay results are from this branch.

| Rule | In the model | Result | Replay |
| --- | --- | --- | --- |
| EveryRouteReal | Every step's route is one `resolve` accepts. `none` is only the start. | PASS | `resolve` accepts `foundation/problem` read, `foundation/icp` read, `foundation/icp/shop-owners` as `foundation/icp/[id]` write, `product` read, `product/ledger` as `product/[id]` read, and `purpose/foundation` run. `foundation/icp` offers no write. |
| ReadsAreProvided | A step uses a record only when the venture already has it. `product/[id]` is used only when a card is present. A stop on a missing problem or profile names the route and does not use its fields. | PASS | With no product card, `product` and `product/ledger` read as `not_found`, and the replay does not read a `job` field. `foundation/problem` reads back the record the fixture wrote, and `foundation/icp` lists the profile under its id. After a real `product/ledger` write, the read returns `job` `Close the books`. |
| CheckMatchesJobs | The check passes only for a progress sentence, and fails for a blank or a copy. Both results are on the chart: "Check failed" and "Check passed, waiting for you". | PASS | On the fixture, empty `jobs`, a blank string, a copy of `who`, a copy of a trait, and a copy of the product's `job` each fail. A progress sentence passes. `node packages/naive/src/engine/foundation.mjs` exits 0 when a bad `problem_forms` id sits only in a draft, because it reads live records. It exits 1 when a live profile names `not-a-form`. |
| NotLiveUntilYouAccept | An agent's write is a draft. The founder accepts only after the check passed. | PASS | A write of `foundation/icp` is refused. An agent write of `foundation/icp/shop-owners` returns `draft: true`, and the live `jobs` stay `[]`. With two profiles drafted, `purpose/foundation` reports `icp` as `draft`, and still does after one accept. `mentura accept foundation/icp/<id> --confirm foundation/icp/<id>` on both leaves no `pending_draft`, the live job is the progress sentence, and `purpose/foundation` reports `confirmed`. |

## Probe

`JtbdProbe.cfg` turns on four steps the playbook does not take. TLC exits 1. Shortest paths are in `out/probe-report.md`. That report predates the route change and was not regenerated, so its first path still says "a profile path the router does not have". That path was true before main added `foundation/icp/[id]`. The model's bad route is now a write of the list route:

| Rule | Path | Replay |
| --- | --- | --- |
| EveryRouteReal | Start, then "you write the profile list, which has no write action". | A write of `foundation/icp` is refused. Same fact as the pass row. The playbook writes `foundation/icp/<id>`. |
| ReadsAreProvided | Read the problem, read the profiles, then "you read a product card when the venture has none". | `product/ledger` read on a venture with no card is `not_found`. The replay does not use a `job` field. The playbook skips that read. |
| CheckMatchesJobs | Write a copy, then "the check says pass on a blank or a copy". | The real check fails a copy of `who`. The playbook's check does not say pass for that record. |
| NotLiveUntilYouAccept | Write a copy, the check fails, then "you accept a draft the check failed". | The router will accept that draft. After `mentura accept`, the live `jobs` are `["Owners of small shops"]` and check 2 fails on the live record. The playbook tells the founder not to accept. The router does not enforce the jobs check. This item does not add that gate. |

## What the model leaves out

The model is one profile. The playbook loops every profile `foundation/icp` lists. The replay accepts two. The model stores a job as `none`, `copied`, or `progress`. The replay compares the whole string with `who`, `short`, `traits`, and any product `job`. Forces and the switch story are notes. The schema has no field for them.

## Covered code

`packages/naive/library/packages/foundation/playbooks/jtbd.md`. `packages/naive/src/router/router.mjs` `resolve` and `call` for the routes in the table. `packages/naive/src/engine/foundation.mjs` for a `problem_forms` id the problem record lacks. `packages/naive/src/records/icp-profile.schema.json` `jobs`. `packages/naive/src/interfaces/cli/mentura.mjs` `accept` for `foundation/icp/<id>`. Confirmed on this branch before the pull request, by the commands above.
