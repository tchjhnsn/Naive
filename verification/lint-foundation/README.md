# Foundation lint

Model of one run of `schema/lint-foundation.mjs` (route `foundation/lint`). TLC checks the rules below. The chart draws the same run in coarser labels: the four fixtures share two judged states, because a finding exits the same way whichever rule produced it.

The chart hides the `Done` step. That step changes nothing after the run has exited. TLC found 14 of them (7 record shapes, each with the rule fail-open and fail-closed).

The model is one record shape per run. It does not show two findings at once. The test `exit 1 when one of several findings is fail-closed, and the others stay warnings` replays that case on the CLI.

A mission is `venture.json` `core.promise` (the strategic-foundation statement `mission`). It names an ICP when that text contains a current profile's `id` or `short` as a whole phrase. A profile with `status` `retired` is not current. A blank job or a blank check does not count. A problem form with `status` `dropped` is not checked.

## Regenerate

The `out/` folder must be empty. TLC is tla2tools 1.7.4 (`sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`). The statechart script is the one in the pstack kit (`skills/statechart/scripts/statechart`).

```sh
rm -rf verification/lint-foundation/out
mkdir -p verification/lint-foundation/out
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  /path/to/statechart \
  verification/lint-foundation/FoundationLint.tla \
  --config verification/lint-foundation/FoundationLint.cfg \
  --view verification/lint-foundation/view.mjs \
  --out verification/lint-foundation/out
```

Then render `out/chart.mmd` with Pele 1.9.0 and the kit's `naive-example/pele/render.mjs`, and `naive-example/pele/png.sh` for `out/chart.png`.

Replay the rules on the CLI:

```sh
node schema/lint-foundation-test.mjs
```

## Rules

| Rule | TLC | Replay |
|---|---|---|
| TypeOK | PASS | The CLI result is JSON with `ok`, `rules` and `findings`, and the process exits 0, 1 or 2. `node schema/lint-foundation-test.mjs` |
| InputsViaVentureFile | PASS | A structured venture is read from `k-base/` and `meta/`. A decoy at the flat path is ignored. Test: "a structured venture reads k-base and meta, not the flat decoy" |
| FixtureFires (`mission-names-no-icp`) | PASS | Promise "We help everyone." with ICP short "mentors". Test: "the fixture exits 0 while every rule fires" |
| FixtureFires (`icp-no-jobs`) | PASS | That ICP has `jobs: []`. Same test |
| FixtureFires (`alignment-no-check`) | PASS | Principle `sourced` has `check: null`. Same test |
| FixtureFires (`problem-form-no-icp`) | PASS | Form `orphan` is on no profile. Same test |
| SilentOnClean | PASS | Promise contains the short "early founders", the profile has a job, the principle has a check, and the form is on that profile. Test: "a clean venture exits 0 with no findings" and "foundation/lint on a clean venture returns no findings" |
| GapSkipped | PASS | No foundation records, and a venture whose ICP, alignment, problem and config do not parse. Tests: "a venture with no foundation records exits 0 and reports nothing", "malformed records are skipped and the run exits 0" |
| NoCrash | PASS | Those runs exit 0. The same CLI on `instance/ventures/everything-ecosystem` and on `schema/examples/workspace` exits 0 |
| ExitIffFailClosed | PASS | Fail-closed with no finding exits 0. Fail-closed on the rule that fired exits 1. An unknown mode stays fail-open. One fail-closed finding among warnings exits 1. Tests: "a fail-closed rule with no finding still exits 0", "exit 1 when the rule that fired is fail-closed", "fail-open, and an unknown mode, keep the default and exit 0", "exit 1 when one of several findings is fail-closed, and the others stay warnings" |
| NoDeadlock | PASS | TLC. After exit, `Done` leaves the state unchanged |

TLC, on this model, reported no broken rule. A scratch change that ignored fail-closed mode made the exit tests fail. That change was reverted. It was not a bug in the lint.
