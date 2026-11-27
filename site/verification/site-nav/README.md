# Site nav

The header on the Naive site carries no links: the mark, search, the theme control and GitHub. The footer (`footerNav` in `site/components/shell/nav.ts`) names two places: About and Waitlist. Each one is a page. Neither is indexed.

| Rule | What the reader is promised |
| --- | --- |
| NavResolves | Opening a footer entry comes back as that page, not a 404. |
| Noindex | That page stays out of the index (`robots` noindex, `X-Robots-Tag`, and `robots.txt`). |

The chart hides "nothing further is being asked", which stays in the current state.

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
export JAVA=/usr/bin/java
rm -rf /tmp/site-nav-out
node /path/to/pstack/skills/statechart/scripts/statechart.ts \
  site/verification/site-nav/SiteNav.tla \
  --config site/verification/site-nav/SiteNav.cfg \
  --view site/verification/site-nav/view.mjs \
  --out /tmp/site-nav-out
```

If a footer link 404s on the built site, `Open*` for that entry should set `outcome` to `"not-found"` and `NavResolves` should fail. Do not weaken the rule.
