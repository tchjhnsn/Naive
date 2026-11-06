# apple-launch

The TLA+ model of `packages/naive/library/packages/marketing/playbooks/apple-launch.md`: the states a founder's records move through as the template steps run.

TLC 2.19 (tla2tools 1.7.4, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`) checked 134 distinct states in the 2026-10-29 run (`out/tlc.out`). No invariant failed. TLC was not re-run for the later playbook edits, which change no model step. The chart is `out/chart.mmd` and `out/chart.png`.

The chart hides three stutter steps, because they stay in one state: you stop when there is no product card, you stop when the card has no job, and you are done after the checks. `out/report.md` counts those hidden steps.

## Regenerate

From the repo root, with the pstack `statechart` script, Java 11 or later, and the pinned jar:

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
export JAVA=java
rm -rf packages/naive/test/verification/playbook-apple-launch/out
<statechart>/scripts/statechart packages/naive/test/verification/playbook-apple-launch/AppleLaunch.tla \
  --config packages/naive/test/verification/playbook-apple-launch/AppleLaunch.cfg \
  --view packages/naive/test/verification/playbook-apple-launch/view.mjs \
  --out packages/naive/test/verification/playbook-apple-launch/out
```

Render the picture with Pele 1.9.0 (`naive-example/pele` in the pstack kit: `render.mjs`, then `png.sh`):

```sh
node render.mjs packages/naive/test/verification/playbook-apple-launch/out/chart.mmd
sh png.sh packages/naive/test/verification/playbook-apple-launch/out/chart.svg
```

Replay the template on fixture ventures (needs `python3` with `jsonschema`, the same as `node test.mjs`):

```sh
node packages/naive/test/verification/playbook-apple-launch/replay.mjs
```

## Rules

| Rule | Result | Replay |
| --- | --- | --- |
| Every template step reads or writes a Naive route that exists, and only an action that route offers | PASS | `replay.mjs` reads each `route:` line in the playbook and checks it against `routes()` from `packages/naive/src/router/router.mjs`. Nine distinct actions, all offered. A write of `marketing/content` is refused: that route's actions are read, view, layout. The narrative and the demo are files, then `marketing/content` is read. |
| No step reads a record that no earlier step, or the venture, provides | PASS | TLC `NoReadBeforeProvided` and `NoInventedVoice`. Replay: `product/no-such` read is not-found and returns no card. A card with no `job` reads back with no job, and the template stops. `marketing/design-system/inputs` returns `market:kettle` only after the card exists, and the result does not contain the card's description. A demo beat `pricing:` fails support while `validation/pricing` is not-found, and passes after that record is written. |
| Every check can pass and can fail | PASS | Public gate (`operations/marketing/public`): fails with no audience, fails when the body copies the product description, fails when `publish` is true and `approved_by` is missing, passes on the clean narrative and demo. Voice (`marketing/voice`): the call's `ok` stays true; `result.ok` is false when the body says `synergy` and the brand forbids it, and true once that word is gone. With no brand record, `result.ok` is true because there are no rules, and that pass does not judge the words. Support: a `warranty` beat fails, a `pricing` beat fails until the pricing record exists and passes after it does, and the clean demo passes. Marks: `Think different` fails; the clean files pass. Sitemap: no `/launch` page, a missing variant, a section citing another file, and a dropped earlier page each fail; the page with both variants and the home page kept passes. The sitemap check is a replay function over the `marketing/sitemap` read. No route computes it. |
| A passing check is not awarded to a broken draft, and a failing check is not awarded to a clean one | PASS | TLC `PublicAgrees`, `VoiceAgrees`, `SupportAgrees`, `MarkAgrees`, `ChecksTogether`. Those four checks run in one step. The model has no sitemap check. It records only that the sitemap was pointed at. |
| The model stays inside its scope, and no state is stuck | PASS | TLC `TypeOK`, `OneDefect`, `NoDeadlock`. `OneDefect` is a bound: the model injects one defect at a time so the chart can show which check fails. A launch with two defects at once is left out. |

## What replay showed about the public gate

`operations/marketing/public` only reads `operations/marketing/content/` (`packages/naive/src/engine/check-public.mjs`). A broken file at `marketing/content/bad.mdx` comes back as a pass with `files: 0`. The same file under `operations/marketing/content/` fails. The template writes the gated folder so the public gate can fail. The model assumes that folder. This is not a counterexample in the model.

`marketing/voice` (`packages/naive/src/engine/brand.mjs`, mode `voice`) prints violations and exits 0. The playbook reads `result.ok`, not the process status. Replay confirmed both.

## Left out

The model does not contain the words of a narrative, an existing sitemap's other pages, or the provenance log. Replay covers adding `/launch` beside a home page that was already there: both paths remain. Price figures and dates are not states. A price exists in the model only as whether the venture already had `validation/pricing`.
