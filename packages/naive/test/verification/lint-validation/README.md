# Validation lint

TLA+ model of `packages/naive/src/checks/lint-validation.mjs` (route `validation/lint`). TLC checks the rules. The chart is how a claim, its evidence, and a decision move. Orange is a finding. Teal is a clean claim. Tan is a missing or unreadable record.

Checked with TLC 1.7.4 (`tla2tools.jar` sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`) at 365 states. Every rule held. The chart draws 12 states and 24 arrows.

## Regenerate

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  /path/to/pstack/skills/statechart/scripts/statechart \
  packages/naive/test/verification/lint-validation/ValidationLint.tla \
  --view packages/naive/test/verification/lint-validation/view.mjs \
  --out /tmp/validation-lint-chart
```

Then render `chart.mmd` with Pele 1.9.0 (`limit` 1000000, `outputLimit` 8000000, `maxEdges` 10000) and screenshot the SVG to `out/chart.png`. Copy `chart.mmd` and `chart.png` back to `out/`.

The replay is `node packages/naive/src/interfaces/tests/lint-validation-test.mjs`.

## What the chart hides

- Setting a rule fail-closed or fail-open, and waiting. The mode does not change the finding. It only changes the exit code, which the rules table checks.
- The owner grading an assumption back. That returns to the clean label.
- A decision in Discovery, and a Validation decision on stronger evidence. Neither adds a finding, so they share the label of the claim without that decision.
- Time passing, or a phase change, once the evidence is already past its shelf life.
- Taking back a decision that was not a discovery-grade Validation decision.

Every chart state still has an arrow out.

## Rules

| Rule | TLC | Replay |
|---|---|---|
| NoCrash. A missing or malformed record does not throw. | PASS | A venture with no validation records, a problem file of `{`, a solution file of `[]`, a bad decision file, a bad `naive.config.json`, and a bad freshness line all exit 0. |
| InputsViaVentureFile. Records are read through `ventureFile`. | PASS | A structured venture's claim lives in `k-base/`. A stray copy at `foundation/problem.json` with no evidence is ignored, and the run stays silent. |
| MissingSafe. No record, or a record that will not parse, has no finding and exit 0. | PASS | Same fixtures as NoCrash. Findings are empty. |
| CleanSilent. Fresh evidence, graded by the owner, in the phase it was collected, does not fire. A Validation decision on that evidence does not fire. | PASS | Problem with behavior evidence collected 2026-10-20, `probability.by` owner, a phase change on 2026-10-01, and a Validation decision. `--now 2026-10-29`. Zero findings, exit 0. |
| ClaimFixture. A claim with no evidence fires `claim-no-evidence`. | PASS | `foundation/problem.json` with a statement and `evidence: []`. The only finding is `claim-no-evidence`. Exit 0. |
| StaleByTime. Evidence past the time shelf fires `stale-evidence`. | PASS | Collected 2025-09-01, checked at 2026-10-29. The message names the assumption shelf of 365d. |
| StaleByPhase. A phase change after the evidence was collected fires `stale-evidence`, even while the evidence is young. | PASS | Collected 2026-10-20. Freshness log: phase from discovery to validation on 2026-10-28. A bad line in the log does not crash. |
| FreshSamePhase. A phase change before collection does not fire. | PASS | Collected 2026-10-28. Phase change on 2026-10-01. Zero findings. |
| AgentFixture. An assumption graded only by an agent fires `agent-only-grade`. | PASS | `probability.by` is `jev` on fresh evidence. Findings name the assumptions, including exists. |
| OwnerSilent. An owner grade does not fire. | PASS | The clean venture. |
| DiscFixture. A decision made in Validation on discovery-grade evidence fires `discovery-grade-decision`. A claim with no evidence is discovery-grade, so both rules fire. | PASS | Opinion evidence grades very low and fires only the decision rule. An empty evidence list plus that decision fires both. |
| NotValidationPhase. The same decision made in Discovery does not fire. | PASS | `provenance.phase` is `discovery` on the weak evidence. Zero findings. |
| StrongerOk. A Validation decision on stronger evidence does not fire. | PASS | The clean venture's decision sits on behavior evidence and adds no finding. |
| OpenNeverExits. Fail-open findings exit 0. | PASS | Every fixture above exits 0. |
| ExitIff. Exit is 1 exactly when a fail-closed rule has a finding. | PASS | `claim-no-evidence` set to `fail-closed` on an empty claim exits 1. |
| ClosedOnlyItsRule. A fail-closed rule with no finding does not fail the run. | PASS | `stale-evidence` is fail-closed and `claim-no-evidence` is left open, on a claim with no evidence. Exit 0. A mode that is not `fail-open` or `fail-closed` stays fail-open. |

## Bug the route replay found

The model does not parse arguments. The first route replay did.

`validation/lint` runs the CLI as `node packages/naive/src/checks/lint-validation.mjs <venture dir> --json`, with no `--now`. The parser treated index `indexOf("--now") + 1` as the date. When `--now` is absent that index is 0, so the venture directory was skipped and the CLI exited 2.

The route reproduced it: `call` on `validation/lint` returned the usage line. The fix ignores a `--now` value only when the flag is present. The route then returns the finding, and exit 1 only when the fail-closed rule has one. `node packages/naive/src/interfaces/tests/lint-validation-test.mjs` covers the no-`--now` command as well.

## Left out

- Time is one tick past the shelf, not a calendar. The code uses the assumption profile's `expire` (365d in `knowledge/freshness.json`) and `per_phase`, overridable under `freshness.profiles.assumption` in `naive.config.json`.
- The model has Discovery and Validation. A later phase is the same test: a `phase` event in `knowledge/freshness.jsonl` dated after `collected`.
- The model closes one rule at a time. The code can close several. Exit is 1 if any closed rule has a finding.
- An agent can grade a stated assumption before any evidence is cited. The code fires `claim-no-evidence` and `agent-only-grade` together. The model only grades an assumption after evidence is cited. The test `a stated assumption graded by an agent, with no evidence` is that replay.
