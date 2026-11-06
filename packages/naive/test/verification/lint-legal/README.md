# Legal lint

A TLA+ model of one run of `packages/naive/src/checks/lint-legal.mjs` (route `legal/lint`). This is a lint, not legal advice. TLC checked the model with the pstack `/statechart` skill. The chart is `out/chart.mmd` and `out/chart.png`.

The model is one claim and one agreement. It does not count a second claim, a second missing holder, or the usage exit (2) when the directory has no `venture.json`. Exit 2 happens before a run. The route can also refuse a `venture.json` that does not match its schema. That refusal is the router's, and the model does not include it.

## Regenerate

From the repo root, with `mise` on `PATH` (the statechart script installs TLC and Java on first run):

```sh
rm -rf /tmp/legal-lint-chart && mkdir /tmp/legal-lint-chart
/path/to/pstack/skills/statechart/scripts/statechart packages/naive/test/verification/lint-legal/LegalLint.tla \
  --config packages/naive/test/verification/lint-legal/LegalLint.cfg \
  --view packages/naive/test/verification/lint-legal/view.mjs \
  --out /tmp/legal-lint-chart
cp /tmp/legal-lint-chart/chart.mmd packages/naive/test/verification/lint-legal/out/chart.mmd
```

Then render `out/chart.mmd` with Pele 1.9.0 (`naive-example/pele/render.mjs`) and `png.sh`. This run used TLC 1.7.4 and reached 266 states. The chart draws 9 states and 14 arrows.

The chart hides `SeeAgreement` and `ApplyModes` (they stay on "Reading records"), the `Done` self-loop, and every other step that does not change the label. "Reading records" still has a way in (from "Ready to lint") and a way out (the five judgment arrows).

## Rules

TLC reported no broken rule, including `NoDeadlock`. Replays are `node packages/naive/src/interfaces/tests/lint-legal-test.mjs` on temp ventures, plus the example venture and the instance venture. A rule is a bug in the lint only when the replay does the same thing. None did.

| Rule | TLC | Replay |
|---|---|---|
| `UnsourcedClaimFires`: after judgment, the claim rule has a finding exactly when the record is a public claim with no source | PASS | PASS. Fixture `marketing/content/hours.mdx` (`publish: true`, `claim` set, no `source`) and `operations/marketing/content/hours.mdx` each report `unsourced-public-claim`. A sourced claim, a draft (`publish: false`), and a published page with no `claim` are silent. |
| `UnlinkedAgreementFires`: after judgment, the agreement rule has a finding exactly when the agreement has no counterparty record | PASS | PASS. `governance/founder-agreement.json` with holder `ghost`, with `founders` that are not holder ids, or with no holders, reports `agreement-no-counterparty`. The same agreement is silent when `ada` is an ownership holder, `people/founders/ada.json`, `accounts/ada/account.json`, `customers/ada.json`, or `investors/ada.json`. |
| `CleanStaysSilent`: a missing, sourced, draft, or unreadable claim is silent, and so is a missing, linked, or unreadable agreement | PASS | PASS. A venture with neither record has no findings. The tandem example and `instance/ventures/everything-ecosystem` have no findings. |
| `ExitIffFailClosed`: exit 1 if and only if a fail-closed rule has findings | PASS | PASS. Default and `fail-open` exit 0 with findings. `legal_lint.rules.<id>.mode` of `fail-closed` exits 1 when that rule has a finding, and exits 0 when it does not, including when the other rule has a fail-open finding. A mode other than `fail-open` or `fail-closed` stays `fail-open`. |
| `MalformedNeverCrashes`: an unreadable record adds no finding and the process does not crash | PASS | PASS. A truncated `naive.config.json`, founder agreement, and ownership file, plus an unclosed content frontmatter, exit 0 with JSON and no findings. A holder id of `../etc/passwd` does not crash. |
| `ReadsUseVentureFile`: every read uses `ventureFile` | PASS | PASS. On a `layout: "structured"` venture the lint reads `k-base/marketing/content/hours.mdx` and `meta/naive.config.json`, reports that logical path, and ignores a decoy at the flat `marketing/content/` path and a decoy `naive.config.json` at the venture root. |
| `TypeOK`, `NoDeadlock` | PASS | The state set is the five claim values, four agreement values, and two modes per rule (266 states). Every path reaches `Done`. |

Removing the fail-closed exit (`ok` forced true) fails the exit tests. Skipping the claim finding fails the fixture test. Both edits were restored. The committed lint passes `node packages/naive/src/interfaces/tests/lint-legal-test.mjs`.

## What the chart marks

No state breaks a rule, so nothing is marked `breaks` or `mayBreak`. Yellow states are findings that are still warnings. Exit 1 is the fail-closed outcome, which the rules require.
