# Showcase page

A statechart of `/showcase`: the page loads each entry from its source path, then one filter is selected. Featured tiles show only while every entry is showing. The grid is the rest of the matches then, and every match otherwise.

TLC reached 19 states (the page opening, then each of the 18 filters) and 307 steps. The chart draws 6 states and 9 arrows. No rule breaks. The same rules were replayed on the production build of this branch: all 18 filters, the example labels, the boards, and 53 cited paths.

The chart hides 272 steps. Those are jumps from one narrowed filter straight to another. The page allows them. Each narrowed filter on the chart still has an arrow back to every entry, and every chart state can be reached from the start.

## Rules

| Rule | Invariant | What it requires | Result |
| --- | --- | --- | --- |
| Every entry's source path exists | `SourceExists` | Each catalog entry has `sourceOk`, recorded after the file was found on disk | Holds. The replay read every source, directory, citation, and piece path again (53 paths). |
| Examples are labeled Example | `ExamplesLabeled` | An example is labeled Example. An entry that is not an example is not. | Holds. On the built page the badge is Example or This repository. On the board the stamp is EXAMPLE or THIS REPOSITORY. |
| Every filter state is reachable and valid | `FilterIsValid` | The selected filter is one of the 18, it shows at least one entry, and the two sections together are exactly the entries that match | Holds. TLC visited all 18 filters. The replay clicked each one. |
| No entry appears twice | `NoEntryTwice` | Catalog ids are unique, and an entry is not drawn twice on the page | Holds. Featured tiles and the grid do not share an entry. |

`TypeOK` and `NoDeadlock` hold too. `NoDeadlock` is the checker's own rule. This page has no end state: another filter can always be chosen.

## What the model leaves out

The twelve pieces share one chart state, and the three phases share another. Discovery, Validation, and Beachhead are separate filters in the model. So are the phase named Validation and the piece named Validation.

The submit link, the docs links, and the sticky bar are not in the model.

## Run it again

The output folder must be empty. `TLA2TOOLS` is `tla2tools.jar` from TLA+ 1.7.4, and `JAVA` is Java 11 or later.

```sh
rm -rf verification/site-showcase/out
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  node --experimental-strip-types path/to/statechart.ts \
  verification/site-showcase/Showcase.tla \
  --view verification/site-showcase/view.mjs \
  --out verification/site-showcase/out
```

Render `out/chart.mmd` with Pele 1.9.0, then a headless browser, to refresh `out/chart.png`.
