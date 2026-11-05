# Netflix culture playbook

Model of `library/packages/people/playbooks/netflix-culture.md`: the records a founder reads and writes while the template runs, and the checks at the end.

TLC 1.7.4 (`tla2tools.jar` sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`) found no broken rule. 74 distinct states, depth 15. The chart is `out/chart.mmd` and `out/chart.png`. `out/report.md` is the statechart summary. `out/tlc.out` is TLC's own log from the config as written.

## Regenerate

The statechart script is the pstack `statechart` skill (`scripts/statechart`). It is not vendored in this repo. This run used system Java 21 and `TLA2TOOLS` pointing at tla2tools 1.7.4. The `--out` directory must be empty.

```bash
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  /path/to/statechart/scripts/statechart \
  verification/playbook-netflix-culture/NetflixCulture.tla \
  --view verification/playbook-netflix-culture/view.mjs \
  --out /tmp/netflix-culture-chart
```

Render the Mermaid with Pele 1.9.0 and the kit's `render.mjs` and `png.sh` (headless Chrome):

```bash
node render.mjs /tmp/netflix-culture-chart/chart.mmd
sh png.sh /tmp/netflix-culture-chart/chart.svg
```

Replay the routes on fixture ventures:

```bash
node verification/playbook-netflix-culture/replay.mjs
```

Re-run both after any edit to the playbook or to a route the template names.

## Rules

| Rule | TLC | Replay |
|---|---|---|
| RouteIsReal. Every template step names a route the router has, with the action the step uses. | PASS | PASS. 14 routes in the playbook are in `node interface/router.mjs`, each with the named action. |
| NoReadAhead. A step reads a record's content only when the venture or an earlier step provides it. | PASS | PASS. A missing `people/team` does not yield a skill. The main path reads the problem, profile, alignment, team, people, and founder the fixture has. Decision rights, ownership, and the team plan are absent until their own steps. The note cites `alignment:own-words` and does not paste the problem statement or the principle. |
| CheckHonest. The culture check passes only when the note cites alignment, the bar has a brief and no pay figure, the gaps were read, and a person has decided `decisions/team-plan-culture`. It fails otherwise. Both results happen. | PASS. The chart ends at both "The culture check passed" and "The culture check failed". | PASS. The check failed before `mentura decide`. It failed on a pasted principle, a pasted problem statement, the phrase "keeper test", and a pay figure. It passed after Fixture Founder decided `decisions/team-plan-culture`. While that decision was open, an agent's write that pasted a principle was held as a draft and the live note stayed. |
| NoInventedPay. A pay or equity figure in the bar was read from `governance/ownership`. The culture check still fails if a figure is copied into the brief. | PASS | PASS. With ownership present, the brief points at `governance/ownership` and has no grant amount. A brief that copies the fixture grant `17` fails the culture check. With ownership absent, the brief says pay and equity are not recorded. |
| NoPasteWithoutSource. A pasted principle is only possible after alignment was read. | PASS | PASS, as part of CheckHonest: the failing paste uses the statement `foundation/alignment` returned. |
| Team plan check (`people/team-plan` check, `schema/check-team.mjs`). | Not a separate TLC state. WriteBar in the model includes the brief; forgetting it makes CheckHonest fail. | PASS and FAIL. The route check passes when there is no team plan, and the culture check still fails. It fails when an open role needed now has no recruiting entry, and when the brief file is missing. It passes once `people/briefs/practice-lead.md` exists. |

## What the chart hides

Steps that stay inside one label are not drawn:

- Reading the venture profile stays in "You have read the work".
- Reading who is here, the founder list, and each founder stays in "You have read the people and the gaps".
- Reading whether pay and equity are recorded stays in "You have read who decides and whether pay is recorded".

`Done` is the idle step on the two end states. `view.mjs` returns null for it, so the chart does not draw that self-loop.

"You accept a draft the culture check will fail" covers three causes that the labels do not split: a pasted principle, a pay or equity figure in the bar, or a missing brief file. They break the same rule, CheckHonest.

## What the model leaves out

- A venture with no problem record. The template says to stop and write `foundation/problem` first.
- A venture that already has `governance/decision-rights`. The template adds an authority only when that file names this role as the class owner. The model starts with no such file, and the replay reads `not_found`.
- An empty `people/founders` list. The template says not to invent a person. The model and the replay use one founder the venture already has.
- An agent edit after `team-plan-culture` is decided. The fail-closed hold applies while the decision is open. The replay saw the hold. A later edit is a person's write, or a new decision, as the playbook says.
