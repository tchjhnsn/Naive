# Templates page

How a file in this repository becomes a card on `/templates`, then a filter result, a detail page, and a Use command.

The loader is `site/lib/templates/catalog.mjs`. It reads venture types, packages, the decision sets `create-venture` writes, frames, kits, skills, handoffs, the docs guides, and files tagged playbook. It also reads `library/packages/<function>/playbooks/` (JSON with `id`, `title`, and `purpose` or `when`, or Markdown with a heading). That directory is empty on this branch. A file added there is listed on the next build without a change to the loader.

## Rules

| Rule | What you are owed | Result |
| --- | --- | --- |
| CardHasPath | Every card names a file that is in this repository | Holds. TLC, and the replay, which checks each path |
| FilterValid | Every filter combination is a list of the cards that match, or an empty list | Holds. TLC. The replay tried 20640 combinations |
| CommandRunnable | Every Use command can be run. A placeholder, a question, a missing script, a home-directory example, or a command whose own usage says it needs a directory is not shown | Holds. TLC. The replay ran `create-venture --type software-startup --yes` and `naive setup` |
| DetailExists | Every card has a `/templates/<slug>` page. An unknown slug is not a page | Holds. TLC. The replay checks each URL when given `--http` |

TLC reached 7 states and 12 steps. No rule broke, including NoDeadlock, so there was no bug path to replay. The replay walks the same steps on this checkout.

Before that filter, the loader showed text that cannot be run, such as `node schema/check-ready.mjs <venture dir> <handoff id>` and questions copied out of a handoff. Those strings fail `commandRunnable` in `site/lib/templates/commands.mjs` and are no longer Use commands. A card with no runnable command still opens Use and says so. Skills keep their trigger phrases as the prompt.

## What the model leaves out

One Discover step stands for every file the loader keeps, including a future playbook under `library/packages/<function>/playbooks/`. The chart does not name the 80 records or the words on the cards. It does not run npm or the network. The replay runs `create-venture` from this checkout with `--skip-install` and `--no-git`, which the page's command does not pass, because those two flags only skip work this check does not need.

The chart hides no steps.

## Again

From a scratch directory, with Java 11 or later and `tla2tools.jar`:

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  /path/to/statechart/scripts/statechart \
  verification/site-templates/Templates.tla \
  --config verification/site-templates/Templates.cfg \
  --view verification/site-templates/view.mjs \
  --out /tmp/templates-chart
```

The chart is `out/chart.mmd`. Render it with Pele 1.9.0 (`naive-example/pele/render.mjs` in the statechart kit) and a headless Chrome screenshot for `out/chart.png`.

```sh
node verification/site-templates/replay.mjs --http http://127.0.0.1:3456
```
