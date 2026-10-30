# Site nav

The header on the combined site (`site/components/shell/nav.ts`) names six places: Docs, Blog, Templates, Showcase, Why, and Who it is for. Each one is a page. None of them is indexed.

| Rule | What the reader is promised |
| --- | --- |
| NavResolves | Opening a header entry comes back as that page, not a 404. |
| Noindex | That page stays out of the index (`robots` noindex, `X-Robots-Tag`, and `robots.txt`). |

The footer uses the same list, and adds Blog RSS at `/blog/feed.xml`. The feed is not a header entry. The replay checks it separately: it is 200 `application/rss+xml` and sends `X-Robots-Tag: noindex`.

The chart hides "nothing further is being asked", which stays in the current state.

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
export JAVA=/usr/bin/java
rm -rf /tmp/site-nav-out
node /path/to/pstack/skills/statechart/scripts/statechart.ts \
  verification/site-nav/SiteNav.tla \
  --config verification/site-nav/SiteNav.cfg \
  --view verification/site-nav/view.mjs \
  --out /tmp/site-nav-out
```

`out/` in this folder is that run. If a header link 404s on the built site, `Open*` for that entry should set `outcome` to `"not-found"` and `NavResolves` should fail. Do not weaken the rule.
