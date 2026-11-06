# People lint

TLA+ model of `packages/naive/src/checks/lint-people.mjs` (route `people/lint`). TLC checks every order of a team plan edit and a hire, and the exit code for one `people_lint.rules.<id>.mode` override at a time. The chart hides the mode changes (`CloseRole`, `CloseHire`, `CloseDecision`, `OpenRules`): the mode is not a label, so those steps stay in one chart state. The exit rule still checks them.

## Regenerate

`out/` has to be empty. TLC is `tla2tools.jar` 1.7.4 (TLC 2.19) and Java 21. The statechart script is the pstack `statechart` skill (`scripts/statechart.ts`).

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
export JAVA=java
node --disable-warning=ExperimentalWarning <statechart>/scripts/statechart.ts \
  packages/naive/test/verification/lint-people/PeopleLint.tla \
  --config packages/naive/test/verification/lint-people/PeopleLint.cfg \
  --view packages/naive/test/verification/lint-people/view.mjs \
  --out /tmp/people-lint-out
node <pele>/render.mjs /tmp/people-lint-out/chart.mmd
sh <pele>/png.sh /tmp/people-lint-out/chart.svg
```

This run: 288 states, 12 chart states, 18 arrows. No rule broke.

## Rules

| Rule | TLC | Replay |
|---|---|---|
| RoleFiresOnFixture | PASS | `packages/naive/src/checks/lint-people-test.mjs`: a founder with no hat fires `role-no-function`, and only that rule |
| RoleStaysSilent | PASS | the same fixture after the hat is restored; a clean venture; an advisor |
| HireFiresOnFixture | PASS | an operator, or a recruiting entry of kind hire, while the plan does not name the role |
| HireWhileUnnamedFires | PASS | same fixture, before the plan edit |
| HireAfterNamedSilent | PASS | name the role, then hire; and hire first, then add the role. Both end with no `hire-before-plan` finding |
| HireStaysSilent | PASS | a clean venture; a cofounder recruiting entry; an advisor on the roster |
| DecisionFiresOnFixture | PASS | a decided decision with no `approved_by` or `decided_by` |
| DecisionStaysSilent | PASS | the same decision after Ada is named; an open decision |
| CleanVentureSilent | PASS | `a clean venture is silent and exits 0` |
| ExitIffFailClosed | PASS | exit 1 only when a fail-closed rule has a finding. A closed rule with no finding exits 0. Findings with every rule fail-open exit 0. An unknown mode stays fail-open |
| UnreadableNeverCrashes | PASS | missing files, and `{` or other bad JSON, exit 0 and do not throw. A malformed `people.json` does not hide a bad decision |
| InputsOnlyViaVentureFile | PASS | a structured venture: the roster, the decision and `naive.config.json` are read from `k-base/` and `meta/`, not from flat decoys |
| TypeOK | PASS | TLC, 288 states |
| NoDeadlock | PASS | TLC |

## What the model leaves out

One role, one hire, one decision, and one fail-closed override. The code allows any subset of rules to be fail-closed. The replay closes one rule while another rule has the finding, and closes a rule that has no finding.

`records = "missing"` or `"malformed"` means nothing the lint reads can be parsed. A bad file next to a good one is outside that state. The replay keeps the decision finding when `people.json` does not parse.

The lint does not store history. Once the team plan names the role, `hire-before-plan` clears, including when the hire was written first. The records have no per-role clock that would show the earlier order after that edit.

A hire is a `recruiting` entry with `kind` `hire`, or a person whose role is `operator` or is not in `packages/naive/template/governance/roles/venture-roles.json`. Founders are not hires. A role must own a function when `owns_when_solo` is true, or when it is not in that registry.

## A broken model, not a product bug

Changing `codeFindings` so any hire reports `hire-before-plan`, even after the plan names the role, makes TLC fail `HireFiresOnFixture`, `HireStaysSilent`, `CleanVentureSilent` and `HireAfterNamedSilent`. The shortest path is: the plan already names the role, then you hire. The CLI replay of that path reports no `hire-before-plan` finding, so the committed model keeps the plan check. The product code was not changed for this.
