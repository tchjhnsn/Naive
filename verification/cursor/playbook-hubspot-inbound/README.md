# Inbound content plan, checked

The model is the template in `packages/marketing/playbooks/hubspot-inbound.md`. One step is one prompt. TLC checks the rules below. `replay.mjs` runs the same routes on a temporary fixture venture.

## Regenerate

From the repo root, with the pstack `statechart` script and TLC. The earlier run used Node v22.23.4, OpenJDK 21, and `tla2tools.jar` from tlaplus v1.7.4 (`sha256` `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`).

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
export JAVA=java
rm -rf /tmp/hubspot-inbound-chart
/path/to/pstack/skills/statechart/scripts/statechart \
  verification/cursor/playbook-hubspot-inbound/HubspotInbound.tla \
  --config verification/cursor/playbook-hubspot-inbound/HubspotInbound.cfg \
  --view verification/cursor/playbook-hubspot-inbound/view.mjs \
  --out /tmp/hubspot-inbound-chart
```

`--out` has to be a new or empty folder. The script writes `report.md`, `chart.mmd`, and `tlc.out` there.

Render the PNG with Pele 1.9.0 and the renderer shipped with the pstack naive example (`render.mjs`, then `png.sh`, which calls headless Chrome). Copy `chart.mmd` to `out/chart.mmd` and the PNG to `out/chart.png`.

Replay the routes:

```sh
node verification/cursor/playbook-hubspot-inbound/replay.mjs
```

## What TLC found

The earlier run reported 18 distinct states, 19 steps, and search depth 12, with no rule failing. `out/report.md` repeats the state and step counts, but that run has no saved `tlc.out`. TLC was not re-run after main moved ICP to one record per profile. The spec did not change, and it reads the `foundation/icp` list route, which still exists. The chart draws 16 states and 14 arrows. The view hides 4 steps: `Done` on the four end states (no sitemap, no ICP, checks passed, a check failed). Those steps stay put, so the chart has no arrow for them.

A scratch copy that set `AudienceOutcome` to always `"pass"` reportedly made TLC report `The invariant of ChecksCanPassOrFail is equal to FALSE`. That copy and its output were not kept. That result shows only that the outcome tables are not constant. It says nothing about the checks.

The model does not check the playbook's checks. `ChecksCanPassOrFail` is a fact about constant tables, so it holds in every state, whatever a step does. `Check` chooses `pass` or `fail` freely. Its two guards are true of those same tables and read no draft, so a clean draft can reach "failed" and a broken one can reach "passed" in the model. What the model does check is the order of steps: the routes read, and that the drafts exist before the check step. Whether a check passes or fails on real files is shown only by the replay.

## Rules

| Rule | TLC | Replay |
| --- | --- | --- |
| EveryStepNamesARealRoute. Every route a step reads or writes is in the route table. | PASS | `routes()` contains all ten names in the spec. `marketing/content` has read, view, layout. A write call returns `marketing/content has no action write`. |
| NoReadBeforeItExists. A record read is one the venture already has, or one an earlier step wrote. | PASS | The main path reads `marketing/sitemap`, `foundation/icp`, `foundation/problem`, `marketing/design-system/inputs`, `product`, then `product/offer`, `marketing/voice`, and `governance/publication-policy` before any draft exists. A venture with no sitemap file gets `not_found` (`no marketing-sitemap record yet`) and the run stops. A venture with no ICP gets `not_found` (`no icp records yet`). The read does not invent a profile. |
| PlanOnlyFromWhatWasRead. The plan step is reached only after those routes have been read. | PASS | Same main path. The drafts are written after those reads return. |
| ChecksReadTheDrafts. A finished check has logged `marketing/content`, `operations/marketing/public`, and `marketing/voice`. The rule covers the order of steps, not the results. | PASS | After the two drafts are on disk, `marketing/content` returns both files, the public gate reports 2 files and 0 errors, and voice reports 0 violations. |
| ChecksCanPassOrFail. Each outcome table in the model has a passing input and a failing input. This does not tie the check step's result to any draft. | PASS, on constants only | The check table below is the evidence that each real check can pass and fail. |
| TypeOK | PASS | TLC, on the config as written. |
| NoDeadlock | PASS | TLC. The end states stutter with `Done`. |

The earlier TLC run reported no counterexample. There was no broken path to replay as a product bug. The replay covered the main chart path and both outcomes of each playbook check.

## Playbook checks on the fixture

The fixture is a temporary venture named `inbound-fixture`. Its profile is one record at `foundation/icp/shop-owner.json`. The names in it are labels for the routes. They are not a real company.

| Check | Pass | Fail |
| --- | --- | --- |
| Pages covered | `/` and `/guide` both come back from `marketing/content`. | The `/guide` file is absent. The check reports it missing. |
| Known audience | `audience` is `shop-owner`, a profile id in the `foundation/icp` read. | `audience` is `customers` (the sitemap hint). The ICP read has no such id. |
| Stage named | `awareness` / `attract` and `consideration` / `engage`. | `stage` is `conversion`. |
| Public gate | `operations/marketing/public` reports 2 files and 0 errors. | `publish: true` with no `approved_by` errors with the gate's approval message. Files written only under `marketing/content/` make the gate report 0 files while `marketing/content` still returns 2. The playbook treats 0 files as a fail. |
| Voice | 0 violations. With no `marketing/brand`, the command still runs and reports no broken rule. | The body contains `disrupt`, which the fixture brand tells voice to avoid. The command reports that word. |
| One open pillar | One file has `pillar: true`, and the other links to `/`. | No pillar. `gated: true`. A pillar under `operations/marketing/content/_private/` is absent from the `marketing/content` read. |
| Approver | Unpublished drafts pass. A file with `publish: true` and `approved_by: founder` passes the gate and matches the policy list. | `approved_by: campaign-bot` passes the public gate (the name is present) and fails this check, because the policy's approver is `founder`. |

## What the model leaves out

A start that is missing `foundation/problem`, `product`, or `governance/publication-policy`. The playbook says to leave that cell blank. Every start that gets past the ICP has those three. The model also reads one product, standing in for each id the list returns. Pass and fail are one branch each. The replay is where each check is run on its own.
