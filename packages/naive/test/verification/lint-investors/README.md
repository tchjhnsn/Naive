# Investors lint

A TLA+ model of `packages/naive/src/checks/lint-investors.mjs` (route `investors/lint`). An investor update moves from draft to sent. The lint flags the update when a number is not confirmed. TLC found no path that reaches sent with an unconfirmed number and no finding.

The model is the behavior of one `lint()` run after each change. It is not a second copy of the matcher. What counts as a raise, a conflict, or a confirmed number is the code, replayed by `packages/naive/src/interfaces/tests/lint-investors-test.mjs`.

Confirmed against `packages/naive/src/checks/lint-investors.mjs` at `ef26b886faf13a2a5c78e908c19dd5e589496e0c`. Move that commit forward only after checking that each action in `InvestorLint.tla` still matches `lint()`.

## Regenerate

From the repo, with the pstack `statechart` skill. The first run installs TLC and Java with mise. This check used TLC 1.7.4 (`tla2tools.jar`, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`) and Java 21.0.12.1, with `TLA2TOOLS` and `JAVA` set, because mise was not installed.

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  <statechart skill>/scripts/statechart \
  packages/naive/test/verification/lint-investors/InvestorLint.tla \
  --config packages/naive/test/verification/lint-investors/InvestorLint.cfg \
  --view packages/naive/test/verification/lint-investors/view.mjs \
  --out /tmp/investor-lint-chart
```

Copy `chart.mmd` to `packages/naive/test/verification/lint-investors/out/chart.mmd`. Render the PNG with Pele 1.9.0 (`naive-example/pele/render.mjs` in the pstack kit, then `png.sh`). The run that produced `out/chart.png` used that renderer. Chrome needs its own `--user-data-dir` if another Chrome already holds the default profile.

Last check: TLC reached 31 states and 81 steps. Every rule held, including `NoDeadlock`. The chart draws 13 states and 26 arrows.

The view hides 16 steps. They are the violations that start from "Clean venture, a rule is fail-closed", except setting the rule back to fail-open, and the returns to that state, except setting a rule fail-closed while nothing is flagged. Those steps stay in the model, so the exit-code rule is still checked. `Done` is hidden because it stays in "Sent update, numbers confirmed". Eighteen other steps stay in one chart state, so the chart does not draw them.

## What the model leaves out

One violation is loaded at a time, and only one rule is fail-closed at a time. The code checks every record in a single run, and a config may close more than one rule. `records` is one file being missing or malformed, not a mix of good and bad files in one venture. The words that make terms conflict live in `packages/naive/src/checks/lint-investors.mjs`, not in the model.

## Rules

| Rule | TLC | Replay |
| --- | --- | --- |
| TypeOK | PASS | The CLI returns JSON for every fixture in `packages/naive/src/interfaces/tests/lint-investors-test.mjs`, including malformed files. |
| RulesMatchRecords: each rule fires on its fixture and stays silent on a clean venture | PASS | "each rule fires on the fixture" and "a clean venture stays silent". A sent update with `confirmed: true` stays silent. Quoting a principle, a broad-based right, and "How will the venture be funded?" stay silent. |
| ExitFollowsMode: exit 1 if and only if a fail-closed rule has findings | PASS | Closing each of the three rules on the failing fixture exits 1. A clean venture with those rules fail-closed exits 0. Closing the terms rule when only the raise rule fired exits 0. A mode other than `fail-open` or `fail-closed` stays fail-open. |
| NeverCrashes: missing or malformed records never crash | PASS | An empty venture, a non-JSON decision, investor, alignment, ownership and config, and a garbled raise file: the CLI exits 0 and `lint()` does not throw. Repairing the raise file brings the finding back. |
| OnlyVentureFile: inputs come only through `ventureFile` | PASS | A structured venture stores the records under `k-base/` and the config under `meta/`. The finding paths are the logical ones. A root `naive.config.json` that says fail-open does not override `meta/naive.config.json`. |
| NoSentUnflagged: no path reaches sent with unconfirmed numbers unflagged | PASS | Draft unconfirmed is flagged. Confirming clears it. Sending after that stays silent. Sending while a number is unconfirmed is flagged, and `confirmed: "yes"` still counts as unconfirmed. |

No invariant failed, so there was no counterexample to replay. The chart paths above were run on the CLI.

`node packages/naive/src/checks/lint-investors.mjs` on `instance/ventures/everything-ecosystem`, `packages/naive/src/records/examples/workspace/ventures/northstar`, `acme-labs` and `tandem` exits 0 with no findings.

## Real bug or model error

A rule that breaks in TLC is a real bug only when its replay does the same thing on `node packages/naive/src/checks/lint-investors.mjs`. If the replay does not reproduce it, the model is wrong. Do not weaken an invariant to make it pass.
