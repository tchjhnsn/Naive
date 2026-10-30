# Site routes

A small TLA+ model of what one request to the Naive site comes back as, after the move to Nextra (EE-088). TLC checks it. The pstack statechart command draws the chart.

The model is the request, not the React tree. Each action is one request, and the comment in `SiteRoutes.tla` names the file that answers it.

## Rules

| Rule | What the reader is promised | Where it broke, if it did |
| --- | --- | --- |
| Noindex | No response is offered for indexing. HTML carries `robots` noindex (`site/app/layout.tsx`). `robots.txt` disallows `/`. Every other response, including Markdown and `llms.txt`, sends `X-Robots-Tag: noindex, nofollow`. | Holds. A 308 to an old path has no header of its own. The page it lands on is noindex. |
| MarkdownEitherWay | The `.md` address and `Accept: text/markdown` on a docs page both come back as the same Markdown. | Broke before the fix, on the docs home only. See below. Holds on the built site. |
| KnownDocsIsPage | A docs URL that is a page comes back as that page. | Holds. |
| MissingIs404 | A docs URL that is not a page is a 404, and the 404 is noindex. | Holds. |
| OldPathRedirects | An old path (the list in `site/next.config.mjs`) redirects to a docs page. It does not render a second copy. | Holds. All 19 redirects are 308, and each target is a live page. |
| NavIsLive | Header and footer links are live pages: Docs, Blog, Templates, Showcase, Why, Who it is for, About, the five docs sections, `llms.txt`, and `llms-full.txt`. | Holds. Blog, Templates, and Showcase are stubs and still answer 200. |
| LlmsIsMarkdown | `llms.txt` is Markdown, and every page it names has HTML and a `.md` body. The `.md` body and `Accept: text/markdown` are the same bytes. | Holds for all 43 docs pages, after the docs-home fix. |
| DocsResolves | A request comes back as a page, as Markdown, as a redirect, or as a 404. | Holds. |
| NoDeadlock | A finished request can stay finished. | Holds. The chart hides that step. |

## The bug the model caught

`/docs/:path*` matches `/docs/get-started.md` and does not match `/docs.md`, because that URL has no slash after `/docs`. The docs home's "View Markdown" link, its `text/markdown` alternate, and the first entry in `llms.txt` all use `/docs.md`. On the first build that address was a 404, while `Accept: text/markdown` on `/docs` returned Markdown.

Replayed on the built site: `GET /docs.md` was 404 HTML, and `GET /docs` with `Accept: text/markdown` was 200 `text/markdown`. Same bytes were not returned.

A copy of this model with `OpenDotMd` answering `not-found` makes TLC report it in one step:

0. Nothing asked yet
1. you open the .md address: Not found

The rule is `MarkdownEitherWay`. The fix is the `/docs.md` entry in the matcher in `site/proxy.ts`. After the rebuild, `/docs.md` and `Accept: text/markdown` on `/docs` return the same Markdown, and `llms.txt`'s 43 links all do too.

## What the chart hides

The chart does not draw the step "nothing further is being asked" (`Done`). It stays in the state it is already in. Seven of those steps are hidden. Every state on the chart is still reachable from the start, and every state that has a real next request still has an arrow out.

## What the model leaves out

It does not model search, the sidebar, dark mode, or the bytes of a page. It treats every docs page as one request, and every nav link as one request. It does not model marketing pages asking for Markdown: those URLs are not in `llms.txt`, and the proxy only rewrites `/docs`. A page whose body has no `##` heading (Nouns, File formats, Decisions) still returns Markdown. The content contract allows that.

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

`statechart.ts` is the pstack `/statechart` skill. It is not in this repo. The command writes `report.md`, `chart.mmd`, and `tlc.out`. This folder's `out/` is that run: 8 model states, 7 chart states, 13 arrows, every rule holding. TLC was `tla2tools.jar` 1.7.4.

Replay against a built site (`cd site && npm run build && npm start`):

- `GET /docs` and `GET /docs/get-started/install` are HTML, and the HTML says `noindex`.
- `GET /docs.md` and `GET /docs` with `Accept: text/markdown` are the same `text/markdown` body.
- `GET /docs/get-started/install.md` contains `##`.
- `GET /docs/no-such-page` and `GET /docs/no-such.md` are 404.
- `GET /getting-started` is 308 to `/docs/get-started`, which is 200.
- `GET /blog`, `/templates`, `/showcase`, `/why`, `/for` are 200.
- `GET /llms.txt` is Markdown, and each linked path is 200 as HTML and as `.md`.
- `GET /robots.txt` is `Disallow: /`.

Do not weaken a rule to make TLC pass. If a rule breaks in TLC and the replay does not show it on the built site, the action is wrong: open the file named in its comment and fix the action.
