# Seed fundraising playbook

Model of `packages/naive/library/packages/investors/playbooks/y-combinator-fundraise.md`. TLC checks the template's order. The replay runs the same routes on a fixture venture through `packages/naive/src/interfaces/cli/mentura.mjs`.

The chart hides one step: `Done`, the stutter that stays on "Signed instrument on the cap table" so the end state is not a deadlock.

## Regenerate

The statechart command writes only to a new or empty folder. TLC is the copy the statechart script installs (TLC2 2.19, Java Temurin 25). The picture is Pele 1.9.0, then `png.sh` from the same example.

```sh
rm -rf packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/out
<statechart>/scripts/statechart \
  packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/YCFundraise.tla \
  --view packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/view.mjs \
  --out packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/out
node <pele>/render.mjs packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/out/chart.mmd
sh <pele>/png.sh packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/out/chart.svg
node packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/replay.mjs
```

`<statechart>` is the pstack `skills/statechart` directory. `<pele>` is `naive-example/pele` from the same kit, after `npm ci`. This run used those paths under `/tmp/pstack/pstack-kit/`.

## Rules

TLC on 29 October 2026: 12 distinct states, 15 steps, no error (`out/tlc.out`). The chart draws 14 arrows. Replay: `node packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/replay.mjs` printed `37/37 passed`.

| Rule | TLC | Replay |
| --- | --- | --- |
| RoutesExist. Every step uses a route the router serves. | PASS | PASS. 18 routes from the model are in `node packages/naive/src/router/router.mjs`, and they are the routes the playbook names. `fundraising/plan` is rejected with `no route fundraising/plan`. |
| Accounted. A step only touches a record the venture already has, or a route the template writes. | PASS | PASS. The template does not write `purpose/data-stream/[id]`. A write of `purpose/data-stream/meetings` stored `customers/_streams/meetings/stream.json`, because that glob is first on the route. |
| NoUnreadSource. A later step does not read a record nothing earlier provided. | PASS | PASS. `foundation/problem` is `not_found` on a new venture. The raise plan's `inputs` are written only after those records exist, and the check fails an input that is still missing. |
| PassMeansReady. A passing check is a filled plan, investor records, and a checklist. | PASS | PASS. Checks 1 to 3 pass only after the filled plan, one named investor, the checklist, and cited evidence on `foundation/problem`. |
| FailIsARealMiss. Each failing check is a step that is still missing. | PASS | PASS. A blank `amount` fails the plan check. No investor record fails the investor check. No checklist fails the data room check. Empty `evidence` on the problem fails it again. A product with no `market` fails it. An optional `foundation/telos` line fails when the criterion is present and the record is missing. |
| The same checks can pass. | PASS. The chart has "Checks pass". | PASS. The filled fixture passes checks 1, 2, and 3. A person writing `governance/ownership` passes check 4. `kind: "safe"` is rejected by `packages/naive/src/records/ownership.schema.json`. |

## What the model does not cover

The model found no broken rule. Two router behaviors showed up in the replay and are not template steps, so TLC did not report them:

- An agent write of `decisions/raise-plan` with `status` `decided` is held as a draft, and the read stays `open`. A person's raw write of `decided` with no `provenance.approved_by` is refused. The template tells the founder to use `mentura decide --confirm raise-plan`, and the replay runs that command.
- `purpose/data-stream/[id]` is shared by customers, investors, and money. A new id landed under customers. The playbook does not write it.

Optional routes (`validation/pricing`, `validation/go-to-market`, `foundation/telos`) are in the route set and are not read by a model step. The checklist omits them when they are `not_found`. The model does not send a form, sign one, or choose an amount. Fixture figures in the replay (`amount: 1`, one cent-scale cash field, one share) are there so the schema accepts a write. They are not a round.
