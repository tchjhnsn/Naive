# Finance lint

A TLA+ model of `schema/lint-finance.mjs` (route `finance/lint`). TLC checks every order of loading a fixture, changing the venture's phase, and setting a rule fail-closed. The checker reads records only through `ventureFile`.

The model covers 251 states. It leaves out three details the tests cover instead: a cost in another currency is not compared, a cost written on the price point wins over `finance/costs.json`, and a target of zero counts as a target. A withdrawn spend decision is treated as absent. The word runway in the question does not count as the impact; the answer, the note or an option has to say it.

## Regenerate

From the repo root. Needs Java 11 or later, `tla2tools.jar` 1.7.4, and Node 22. `STATECHART` is `scripts/statechart.ts` from the pstack statechart skill. The output folder must be empty. Pele 1.9.0 renders the SVG; `png.sh` next to the example renderer writes the PNG.

```sh
rm -rf verification/lint-finance/out
TLA2TOOLS="$TLA2TOOLS" JAVA=java node --experimental-strip-types "$STATECHART" \
  verification/lint-finance/FinanceLint.tla \
  --view verification/lint-finance/view.mjs \
  --out verification/lint-finance/out
node render.mjs verification/lint-finance/out/chart.mmd
sh png.sh verification/lint-finance/out/chart.svg
```

`render.mjs` and `png.sh` are the Pele renderer from the worked example (`naive-example/pele` after `npm install`).

## What the chart hides

The chart draws 13 states and 25 arrows. It hides:

- `Done`, the step that changes nothing once a check has run.
- A mode change that does not change the exit code.
- A phase change that does not change whether the metric finding is on. Discovery, beachhead, scale and platform are one chart state when the only target is Validation.
- Three steps that stay on "Nothing to flag. Run passes": checking a clean venture, checking a venture with none of these records, and checking a metric targeted only for Validation while the venture is in Validation. The phase arrow out of that state is what makes the metric finding appear.
- Missing and unreadable records stay on their own states. Changing the phase or the mode there still passes, so the chart draws no arrow out.

## Rules

| Rule | What must hold | TLC | Replay |
| --- | --- | --- | --- |
| TypeOK | Phase, records, mode, findings and the exit code stay in the sets the checker uses | PASS | Every case in `node schema/lint-finance-test.mjs` returns JSON |
| FiresOnFixture | Each rule fires on the fixture that breaks it. A metric fires only in a phase that has no numeric target | PASS | `one fixture fails each rule`. `phase discovery with no target fires metric-no-target` (and beachhead, scale, platform). `a non-numeric target fires metric-no-target` |
| SilentWhenClean | A clean venture, a missing record, a malformed record, and a missing price or cost stay silent. A metric targeted for Validation stays silent in Validation | PASS | `a clean venture stays silent`. `a venture with none of these records stays silent`. `malformed records and a missing phase do not crash`. `a missing price does not crash and does not fire`. `a missing cost does not crash and does not fire`. `a metric with a target for the current phase stays silent`. `a target of zero counts for the current phase` |
| ExitIffFailClosed | Exit 1 if and only if a fail-closed rule has a finding | PASS | `fail-open findings exit 0`. `fail-closed with a finding exits 1`. `fail-closed on a rule with no finding exits 0`. `two fail-closed rules exit 1 when one of them has a finding`. `fail-closed with no findings exits 0` |
| NoCrash | A missing record, a malformed record, or a missing price or cost never throws | PASS | `malformed records and a missing phase do not crash`. `a missing price does not crash and does not fire`. `a missing cost does not crash and does not fire` |
| InputsFromVentureFile | Record bytes come from `ventureFile` | PASS | `structured layout reads pricing and decisions through ventureFile`. `structured layout reads the metric and its phase through ventureFile`. `structured layout reads finance_lint mode through ventureFile` |
| NoDeadlock | Every state has a next step | PASS | TLC (`out/report.md`). The CLI runs finish |

TLC reported no broken rule. The replays above match the code, so there is no bug to fix. `node schema/lint-finance-test.mjs` is the replay.
