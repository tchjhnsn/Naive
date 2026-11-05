# Shape Up cycle

TLA+ model of `library/packages/product/playbooks/basecamp-shape-up.md`: the records a founder writes as one six-week cycle runs (shaping, betting, building, cool-down) and the circuit breaker.

TLC 1.7.4 (`tla2tools.jar` sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`) reached 22 states and 28 steps. Every invariant held, including TLC's deadlock check. The chart draws 17 states and 21 arrows. It hides 5 steps that stay in one chart state: `Done`, which stays put in "You declined the bet" and in "Cool-down between cycles" (several model states share that label).

## Regenerate

From the repo root, with the pstack `statechart` script and an empty output directory:

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  node --experimental-strip-types <pstack>/skills/statechart/scripts/statechart.ts \
  verification/playbook-basecamp-shape-up/ShapeUpCycle.tla \
  --view verification/playbook-basecamp-shape-up/view.mjs \
  --out /tmp/shapeup-chart
```

Render `out/chart.mmd` with Pele 1.9.0 (`naive-example/pele/render.mjs` in the pstack kit) and `png.sh` beside it. This run wrote `out/chart.svg` and `out/chart.png`.

Replay the same rules on a throwaway venture:

```sh
node verification/playbook-basecamp-shape-up/replay.mjs
```

## Rules

TLC reported no broken rule. Replay ran the named routes and checkers on a venture created with `schema/init-venture.mjs`. 27/27 replay checks passed.

| Rule | TLC | Replay |
|---|---|---|
| RouteIsReal. Every template step uses a route `interface/router.mjs` `resolve()` knows. | PASS | PASS. `product/offering`, `foundation/icp`, `foundation/icp/operators`, `governance/decision-rights`, `operations/handoff/cycle-one`, `decisions/bet-cycle-one`, `evidence/cycle-one-shipped`, and `system/provenance` each resolve. `shapeup/cycle` returns `no route shapeup/cycle`. |
| ReadsWereProvided. A step does not read a record nothing earlier, and not the venture, has provided. | PASS | PASS. Reading `operations/handoff/cycle-one` before the write returns `not_found` (`no handoff record yet`). Before any profile, `foundation/icp` reads `ok: true`, `result: null`, with `not_found`, which is the stop in step 2. After a person writes `product/offering` and `foundation/icp/operators`, both reads return those records. `governance/decision-rights` is `not_found` on a new venture; the playbook then uses the framework template, which the model treats as already provided. |
| PitchCheckHonest. The pitch check passes for a full brief and fails when a section is blank. | PASS | PASS. `pitch-check.mjs` exits 0 on a full six-week brief, exits 1 with `missing No-gos` on a blank section, and exits 1 with `appetite does not name six weeks` on a one-week appetite. |
| BetOnlyAfterAPass. A bet is proposed only after that pitch check passes. | PASS | PASS. The replay writes the bet after the full brief passes. |
| NoBuildBeforeBet. The cycle handoff is not opened for an agent until the founder has bet yes. | PASS | PASS. While `decisions/bet-cycle-one` is open and `fail-closed` on `operations/handoffs/cycle-one.json`, an agent write of that handoff is stored as `_drafts/operations__handoffs__cycle-one.json.draft` (`decision bet-cycle-one is open and fails closed`). After `schema/decisions.mjs` `approve()`, the same write lands on the real file. A declined bet lifts the same hold, so an agent's move to `ready` lands too. The replay's bet check reads the answer: it passes that handoff at `draft`, and fails it at `ready`. |
| BuildCheckHonest. From building, the cycle check can pass and can fail, and a pass does not invent evidence. | PASS | PASS. `schema/check-ready.mjs` prints `cycle-one is ready to execute` on the full brief, and `FAIL brief has its Outcome section, with text: empty` when Outcome is blank. |
| NoShipWithoutEvidence. Shipping writes evidence. A done handoff without it fails. | PASS | PASS. `schema/check-execution.mjs` fails `status: done` with no evidence (`criterion pitch-sections has no passing evidence`, and the same for `shipped` and `scope-fit`). After `evidence/cycle-one-shipped` is written and linked, the same checker exits 0. |
| CooldownAfterCycle. Cool-down is a later handoff, after the cycle is shipped or tripped. | PASS | PASS. The router will write `operations/handoff/cooldown-one` while the cycle is still `draft` (the router does not know the playbook order). The playbook check fails that pair: cool-down present, cycle `draft`. After the cycle is `escalated`, the same cool-down read is the allowed pair. |
| BreakerHolds. Once the appetite is spent, the cycle is escalated and does not become shipped. | PASS | PASS. An escalated handoff with an open question and `claimed_by` passes `schema/check-execution.mjs`. The same handoff with no open question fails: `escalated with no open question`. |

## What replay showed that the model leaves out

An agent write of `decisions/bet-cycle-one` with `status: decided` is saved as a draft (`draft=true`), and the record stays open. `interface/router.mjs` lets only a person settle a decision (EE-058). The model has `YouBet` and `YouDecline` for that person, and no action for an agent marking the bet decided. The replay asserts the draft.

`approve()` accepts any answer wording, and a decline lifts the hold on the handoff just as a bet does. The router does not stop a declined pitch from moving past `draft`. The playbook's bet check does, and the replay runs that check on a declined bet. The model reaches the same end through `YouDecline`, with no later write of the handoff.

The `check` action on `operations/handoff/cycle-one` runs `schema/check-ready.mjs` with only the venture directory, so that checker exits 2 (`usage: node schema/check-ready.mjs <venture dir> <handoff id>`). The playbook tells the founder to pass the handoff id. That is the checker as it is, not a broken template step.

## Scope

One pitch and one cycle. A later cycle starts again at shaping; this model stops at cool-down or at a declined bet. It does not model a second bet, a small-batch appetite, or an extension. An extension, in the playbook, is a new open decision, which would be another run of the same steps.
