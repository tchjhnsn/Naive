# Lean validation playbook

The model is the founder's records as `library/packages/validation/playbooks/lean-validation.md` runs. TLC 1.7.4 checked it. The chart is the flow. A rule that fails in TLC is a bug only when a replay on the router does the same thing.

## Regenerate

From the repo root, with the pstack `statechart` skill (it runs TLC). Java 25 and `tla2tools.jar` 1.7.4 are what this run used. The script installs them with mise when `TLA2TOOLS` and `JAVA` are unset.

```sh
export TLA2TOOLS="$HOME/.local/share/mise/installs/http-tla2tools/1.7.4/tla2tools.jar"
export JAVA="$HOME/.local/share/mise/installs/java/temurin-25.0.5+8.0.LTS/bin/java"
rm -rf verification/playbook-lean-validation/out
# skills/statechart/scripts/statechart in the pstack kit
statechart \
  verification/playbook-lean-validation/LeanValidation.tla \
  --view verification/playbook-lean-validation/view.mjs \
  --out verification/playbook-lean-validation/out
```

`--out` must be a new or empty folder. Then render `out/chart.mmd` with Pele 1.9.0 (`naive-example/pele/render.mjs` in the pstack kit) and `png.sh` beside it.

Replay the routes:

```sh
node verification/playbook-lean-validation/replay.mjs
```

## This run

TLC reached 165 states and 351 steps. The chart draws 19 states and 29 arrows. It does not draw 66 steps that stay on one label. The view hides 58 steps.

Hidden on purpose:

- `Done`, the hold-still once both checks have passed.
- Running the assessment again after the interview plan exists and before evidence is linked. The ask is already on the chart, on the claim.
- From "you ran it as is", running the assessment again without `--as-is`. The plan arrow is the way forward.

`CiteMissingPath` is not a template step. It is the mistake the source check is there to catch: the notes are on file, and the evidence cites some other path.

## Rules

| Rule | TLC | Replay |
| --- | --- | --- |
| RouteExists. Every step uses a route `node interface/router.mjs` resolves: `foundation/icp`, `foundation/icp/shop-owners`, `foundation/problem`, `purpose/validation/assess`, `raw/sources/problem-interview-plan`, `raw/sources/problem-interview-notes`, `purpose/raw/text/problem-interview-notes`. | PASS | PASS. `replay.mjs` wrote and read each of those routes on a fixture venture. |
| WhoWasProvided. A step reads the customer profile only after the venture has one or an earlier step wrote one. | PASS | PASS. A read of `foundation/icp` before any profile is not a record. After a person writes `foundation/icp/shop-owners`, the list read returns that profile keyed by id. A second fixture that already had the file reads it, and an agent's second profile stays out of the list until it is accepted. |
| PlanFollowsClaim. The interview plan is written only after the problem claim is accepted. | PASS | PASS. `raw/sources/problem-interview-plan` was written after `mentura accept foundation/problem`, and the read returned that id. |
| NotesFollowPlan. The notes are filed only after the plan was read back, and the text route is empty until the file exists. | PASS | PASS. `purpose/raw/text/problem-interview-notes` was not found before `text.md` existed, and returned the notes after it did. |
| EvidenceFollowsNotes. Linked evidence cites notes that were read back. | PASS | PASS. The passing evidence write cites `raw/sources/problem-interview-notes/text.md`. |
| CheckAgrees. A check result matches the records, so it can pass and it can fail. | PASS | PASS. See the rows below. |
| CheckReadsTheRecordTheTemplateWrote. The assessment reads the file the template wrote. | PASS | PASS, after the fix below. The fixture's assessment returned `charge` from `foundation/problem.json`. `purpose/validation/problem.json` was not there. |
| NoDeadlock | PASS | The success end is both checks passing. The replay reached a source-check pass and an assessment of `charge`. |

CheckAgrees, from `replay.mjs`:

| What the founder does | Result |
| --- | --- |
| Run `purpose/validation/assess` while an agent's claim is only a draft | PASS. It asks, and names `purpose/validation/problem.json` as missing. |
| Run it after the draft is accepted, with the claim filled and `evidence` empty | PASS. It asks, because `exists`, `segment`, `hurts`, and `why-now` have no evidence. |
| Run it again with `--as-is` on that claim | PASS. `supports` is `explore`. |
| Run `foundation/problem` check with no cited path | PASS. Exit 0. |
| Cite `raw/sources/does-not-exist/text.md` and run the check | PASS. Exit 1, and the message says the path was not found. |
| Cite the notes file, with first-hand behavior from five people on `segment` and `hurts`, plus desk items on `exists` and `why-now`, and run both checks | PASS. The source check exits 0. The assessment `supports` `charge`. |

## A break the first model reported

This section is the record of that run. Neither the 203-state failing TLC run nor the before-the-fix replay has saved output in this folder, because `out/` holds only the passing run. `LeanValidation.tla` hard-codes `SameFile == TRUE`, so the invariant `CheckReadsTheRecordTheTemplateWrote` cannot fail in the saved spec. The replay is the working check of that rule.

The first spec set `SameFile == FALSE`, which is `purpose/validation/assess` reading `purpose/validation/problem.json` while `foundation/problem` writes `foundation/problem.json`. TLC (203 states) broke `CheckReadsTheRecordTheTemplateWrote`. The shortest path was: read the profile the venture already has, write the claim, write the plan, read the plan, file the notes, read the notes, add evidence, run the assessment.

Replay, before the fix: `node schema/assess-problem.mjs instance/ventures/everything-ecosystem` answered that there is no problem record. The venture's record is `foundation/problem.json`.

`schema/assess-problem.mjs` `problemFile()` now reads `foundation/problem.json` when that file is present, and `purpose/validation/problem.json` when that is the only copy. The same order as the route. With `SameFile == TRUE`, TLC holds, as it must with that value hard-coded. The fixture replay above is the re-run.

## Left out

The model labels its write step `foundation/icp`. The route that writes is `foundation/icp/<id>`. TLC could not be rerun for this change, so the spec and chart keep the label. The model does not include the question text, problem forms, or any validation record besides `foundation/problem`. "Linked" evidence means the set that reaches `charge` in the replay, not every grade between `explore` and `charge`.
