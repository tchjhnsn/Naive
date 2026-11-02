# Site routes

A small TLA+ model of what one request to the Naive site comes back as, after docs and templates moved behind the waitlist (R-45). TLC checks it. The pstack statechart command draws the chart.

The model is the request, not the React tree. Each action is one request, and the comment in `SiteRoutes.tla` names the file that answers it.

## Rules

| Rule | What the reader is promised | Where it is checked |
| --- | --- | --- |
| Noindex | No response is offered for indexing. HTML carries `robots` noindex (`site/app/layout.tsx`). `robots.txt` disallows `/`. Every other response sends `X-Robots-Tag: noindex, nofollow`. The waitlist redirect sets that tag too. | Holds. A 308 from an old path has no header of its own. The waitlist page it reaches is noindex. |
| GatedEitherWay | The `.md` address and `Accept: text/markdown` on a docs URL both come back as the same result: a redirect to `/waitlist`. | Holds. `site/proxy.ts` gates the path. It does not serve Markdown. |
| KnownDocsIsGated | A docs URL that is a page redirects to `/waitlist`. It is not served as that page. | Holds. |
| MissingIsGated | A docs URL that is not a page redirects to `/waitlist` as well. | Holds. The prefix is gated, so the docs 404 is not the answer. |
| TemplatesAreGated | `/templates` and a template detail URL redirect to `/waitlist`. | Holds. |
| OldPathRedirects | An old path (the list in `site/next.config.mjs`) redirects to a docs URL. It does not render a second copy. | Holds. The next request for that docs URL is gated. |
| NavIsLive | Header and footer links that remain public are live pages: Blog, Showcase, About, and Waitlist. Docs, Templates, `llms.txt`, and `llms-full.txt` are not in that nav. | Holds. |
| WaitlistIsPage | `/waitlist` is a page. The signup form is not built. The page does not collect a sign-up. | Holds. |
| LlmsIsGated | `llms.txt` and `llms-full.txt` redirect to `/waitlist`. They are not the docs Markdown. | Holds. |
| DocsResolves | A request comes back as a page, as a redirect, or as the waitlist gate. | Holds. |
| NoDeadlock | A finished request can stay finished. | Holds. The chart hides that step. |

`/md/docs` and `/og/docs` use the same gate as `/docs`. The model treats a docs request as one action, and the code lists those prefixes beside it.

## The matcher, and the earlier docs-home bug

`/docs/:path*` matches `/docs/get-started.md` and does not match `/docs.md`, because that URL has no slash after `/docs`. Before the waitlist gate, `/docs.md` was the docs home's Markdown address, and a matcher that omitted it returned 404 while `Accept: text/markdown` on `/docs` returned Markdown.

The matcher in `site/proxy.ts` still lists `/docs.md` on its own. Both addresses now redirect to `/waitlist`, which is `GatedEitherWay`.

## What the chart hides

The chart draws 5 states and 10 arrows. It does not draw 9 steps that stay in the state they are already in: "nothing further is being asked" (`Done`), once from each finished request. Every state on the chart is still reachable from the start, and every state that has a real next request still has an arrow out.

## What the model leaves out

It does not model search, the sidebar, dark mode, or the bytes of a page. It treats every docs page as one request, and every remaining nav link as one request. It does not model marketing pages asking for Markdown: the proxy does not rewrite those URLs. Showcase pages may still name a docs URL in their HTML. A request for that URL redirects to `/waitlist`. The build gate in `site/scripts/gate-pages.ts` fails when a rendered marketing page names a gated route. The real waitlist signup is not built.

## Run it again

From a machine with Java 11 or later and [tla2tools.jar 1.7.4](https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar):

```sh
export TLA2TOOLS=/path/to/tla2tools.jar
export JAVA=/usr/bin/java
rm -rf /tmp/site-routes-out
node /path/to/pstack/skills/statechart/scripts/statechart.ts \
  verification/site-nextra/SiteRoutes.tla \
  --config verification/site-nextra/SiteRoutes.cfg \
  --view verification/site-nextra/view.mjs \
  --out /tmp/site-routes-out
```

`statechart.ts` is the pstack `/statechart` skill. It is not in this repo. The command writes `report.md`, `chart.mmd`, and `tlc.out`. This folder's `out/` is that run: 10 model states, 5 chart states, 10 arrows, every rule holding. TLC was `tla2tools.jar` 1.7.4.

Replay against a built site (`cd site && npm run build && npm start`):

- `GET /docs` and `GET /docs/get-started/install` are 307 to `/waitlist`.
- `GET /docs.md` and `GET /docs` with `Accept: text/markdown` are 307 to `/waitlist`.
- `GET /docs/no-such-page` and `GET /docs/no-such.md` are 307 to `/waitlist`.
- `GET /templates` and `GET /llms.txt` and `GET /llms-full.txt` and `GET /md/docs` and `GET /og/docs` are 307 to `/waitlist`.
- `GET /waitlist` is HTML, the placeholder, and the HTML says `noindex`.
- `GET /getting-started` is 308 to `/docs/get-started`, and that URL is 307 to `/waitlist`.
- `GET /blog`, `/showcase`, `/why`, `/for`, `/about` are 200.
- `GET /` does not link to `/docs` or `/templates`.
- `GET /robots.txt` is `Disallow: /`.

Do not weaken a rule to make TLC pass. If a rule breaks in TLC and the replay does not show it on the built site, the action is wrong: open the file named in its comment and fix the action.
