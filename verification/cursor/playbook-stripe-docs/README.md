# Stripe docs playbook

The model is the template in `packages/product/playbooks/stripe-docs.md`. Each step is one route read or write. TLC checks four rules. `replay.mjs` runs those routes on a temporary venture and throws the venture away.

The chart hides the four `Done` steps. Those are the stutter on "Stopped: no reader on file", the two check failures, and "Habit and entries listed". Nothing changes there.

The model leaves out three things the replay still runs, because they are not template steps:

- A direct write of `decisions/[id]` with `status` `decided` and no `provenance.approved_by`. An agent's write is held as a draft and the read returns null, so Check 2 fails it. A person's write is refused. `propose` refuses it.
- `propose` with `at` set to `product`. The file lands at `product/decisions/<id>.decision.json`. `decisions/<id>` reads `result` null, though the `decisions` list shows it. The template says not to set `at`.
- `product/[id] check`. It runs `schema/check-ventures.mjs` on the whole venture. A second card with `software: true` and no `repos` entry fails `product/ledger check` with `docs-probe/ledger-soft: builds software, so the venture (or a parent) needs a repository in repos`. The playbook does not use that action as proof the spec worked.

## Regenerate

From the repo root. The statechart script is `scripts/statechart` in the pstack `statechart` skill (this run used `/tmp/pstack/pstack-kit/skills/statechart/scripts/statechart`). The first run installs TLC and Java with `mise`, which must be on `PATH`. `replay.mjs` needs `python3` with `jsonschema`, the same as `node test.mjs`.

```sh
scripts/statechart \
  verification/cursor/playbook-stripe-docs/StripeDocs.tla \
  --config verification/cursor/playbook-stripe-docs/StripeDocs.cfg \
  --view verification/cursor/playbook-stripe-docs/view.mjs \
  --out /tmp/stripe-docs-chart
```

`--out` must be a new or empty folder. Copy `chart.mmd` into `out/`. Render the PNG with Pele 1.9.0 (`npm install pele@1.9.0`) and the kit's `naive-example/pele/render.mjs` and `png.sh`:

```sh
node render.mjs /tmp/stripe-docs-chart/chart.mmd
sh png.sh /tmp/stripe-docs-chart/chart.svg
```

Then:

```sh
node verification/cursor/playbook-stripe-docs/replay.mjs
```

Re-run both after any edit to the playbook's steps, routes, or checks. An earlier TLC run reported 21 states and 23 steps. Re-run on 30 October 2026 with TLC 2.19 on OpenJDK 21: the same result, saved in `out/tlc.out`. The TLC column below comes from the same run. The chart draws 15 states and 16 arrows.

## Rules

| Rule | What it says | TLC | Replay |
| --- | --- | --- | --- |
| RouteReal | Every template step reads or writes a route in the router table: `foundation/icp`, `product`, `product/[id]`, `decisions`, `decisions/[id]`, `glossary/[id]`. | PASS | PASS. `node interface/router.mjs` lists all six. The table has 135 routes. |
| NoUnprovidedRead | No step uses a record the venture did not provide and no earlier step wrote. Glossary follows the spec. An entry follows the habit, the card, and the spec. `offered_to` is set only after the profile was read. | PASS | PASS on the main path. `foundation/icp` read with no record returns `result` null and the playbook stops. `glossary/product` is written after `decisions/docs-spec` reads back. `decisions/changelog-first-change` is written after the card and the habit. The `at: product` write is not a template step. Replay of that write returns `result` null on `decisions/docs-spec-nested`. |
| CheckIsReal | The checks pass only when the spec is complete and the card names the reader, and fail only otherwise. A blank section and a card that names no reader are different failures. | PASS | PASS. Check 1 fails on a missing `offered_to` and on `offered_to: ["no-such-profile"]` (the schema still accepts the write) and passes on `["builders"]`. Check 2 fails on a `versions:` placeholder and on an agent's `status: decided` write held as a draft, and passes while `open` and after `decide docs-spec --by "Ada Founder" --confirm docs-spec`. Check 3 fails on term `charge` and passes on `transfer`. Check 4 fails when the habit is missing and passes when the four lines are filled. Check 5 fails on `product: no-such-product` and passes on `product: ledger`. |
| NoDeadlock | The stop, both check failures, and the decision list are ends, and every other state has a step out. | PASS | The replay ends in those same places: no reader, a failed check, or the `decisions` list after an entry. |
