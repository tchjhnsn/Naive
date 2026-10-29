# Money lint

`schema/lint-money.mjs` (route `money/lint`) checks two records in a venture. A transfer decision with no named approver is a finding in every phase: proposed, approved, and executed. An account with no owner is a finding. Both rules are fail-open unless `naive.config.json` sets `money_lint.rules.<id>.mode` to `fail-closed`. The process exits 1 only when a fail-closed rule has findings. Records are read through `ventureFile`. The lint does not move money, read a transaction stream, or print a balance or an account number.

The model is `MoneyLint.tla`. TLC 1.7.4 (`tla2tools.jar`, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`) reached 128 states and 1200 steps. No invariant failed. NoDeadlock holds. The chart draws 12 states and 20 arrows (22 `-->` lines, counting the two start arrows). The view hides 784 steps.

## Regenerate

`--out` must be a new or empty directory. The statechart script is the one in the pstack kit (`skills/statechart/scripts/statechart.ts`). Java 21 ran TLC. mise was not required once `TLA2TOOLS` and `JAVA` pointed at the jar and the JDK.

```sh
TLA2TOOLS=/path/to/tla2tools.jar \
JAVA=java \
node --disable-warning=ExperimentalWarning \
  /path/to/pstack-kit/skills/statechart/scripts/statechart.ts \
  verification/cursor/lint-money/MoneyLint.tla \
  --view verification/cursor/lint-money/view.mjs \
  --out /tmp/money-lint-chart
```

Pele 1.9.0 writes `chart.svg` beside `chart.mmd`. The kit's `naive-example/pele/render.mjs` calls Pele, and `png.sh` screenshots that SVG with headless Chrome at 2x (`--user-data-dir` set to a fresh directory, and a timeout, so Chrome does not hang):

```sh
node /path/to/pele/render.mjs /tmp/money-lint-chart/chart.mmd
sh /path/to/pstack-kit/naive-example/pele/png.sh /tmp/money-lint-chart/chart.svg
```

Copy `chart.mmd` and `chart.png` into `verification/cursor/lint-money/out/`.

## What the chart hides

Mode toggles (`FailCloseTransfer`, `FailOpenTransfer`, `FailCloseAccount`, `FailOpenAccount`) and `Done` are not drawn. They do not change the transfer or the account. Withdraw is drawn only from an unreadable transfer. A corrupt transfer is drawn only from "No transfer decision". Dropping the approver's name is not drawn on a proposal. It is drawn on an approved transfer and on an executed transfer. A corrupt account is drawn only from "No account". Removing an account is drawn only from an unreadable account. Naming an owner, and recording an account with no owner, are not drawn from an unreadable account. Every chart state stays reachable, and each state keeps an arrow out.

Account states have no color. `group()` follows the transfer phase, and one account label sits behind more than one group.

The model has no other input channel, so `ReadsViaVentureFile` is the constant `TRUE`. The structured-layout test is the proof that the CLI reads through `ventureFile`: an owned account under `k-base/money/` is seen, and a decoy at the flat path `money/decoy.json` is not.

## Rules

TLC reported no counterexample. Replay is `node schema/lint-money-test.mjs`. Every row below passed on that run.

| Rule | TLC | Replay |
| --- | --- | --- |
| TypeOK | PASS | The CLI returns JSON on every fixture in the test. A missing venture directory exits 2. |
| ExecutedNeedsFlag | PASS | "replay execute after the name is removed" flags the transfer and the message says executed. "decided with an executed outcome and no approver is executed" does the same for `status` decided plus an outcome id `executed`. |
| TransferRule | PASS | "each rule fires on the fixture" includes `transfer-no-approver`. "replay propose" flags a proposal. Naming the approver, approving, and executing with that name stay silent. |
| AccountRule | PASS | "the account with no owner is the account finding". A clean venture, whose account has an owner, stays silent. |
| CleanSilent | PASS | "a clean venture stays silent". "a venture with no money records stays silent". An unreadable transfer adds no finding. |
| ExitIffFailClosed | PASS | Fail-open findings exit 0. A fail-closed account rule with a finding exits 1, and the transfer finding on that run stays fail-open. Fail-closed with no findings exits 0. An unknown mode string stays fail-open and exits 0. `mentura money/lint run` exits 0 on a clean venture and exits 1 when a fail-closed rule has a finding. |
| NoCrash | PASS | Malformed account, decision, config, and stream do not crash. |
| MalformedSkipped | PASS | That same run exits 0 with no findings. `approved_by` set to `agent` is not treated as a person, so the transfer rule still fires. |
| ReadsViaVentureFile | PASS | "structured layout reads the owned account through ventureFile and ignores a flat-path decoy". |
| NoDeadlock | PASS | TLC, on the config as written. `Done` is the stutter that keeps an end state from deadlocking. |

No rule broke in the model, so there was no bug path to replay. The CLI tests agree with the invariants.
