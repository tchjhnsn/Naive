# Blog publication

A TLA+ model of how a post reaches the Naive blog, checked with the pstack statechart skill. `ShipDrafts = FALSE` is the loader after `isListed` in `site/lib/blog/posts.ts`. `ShipDrafts = TRUE` is that loader before the filter, when every Markdown file was public.

The index, the feed, the post page, and the OG image route all read `getPosts()`. A file is listed only when `draft` is not true and `date` is on or before the build day (UTC, or `BLOG_AS_OF`).

## Rules

| Rule | What the reader can check | Result with `ShipDrafts = FALSE` |
| --- | --- | --- |
| DraftsOffTheIndex | A draft never appears on the index | Holds |
| DraftsOffTheFeed | A draft never appears in the feed | Holds |
| FutureOffTheIndex | A future-dated post never appears on the index | Holds |
| FutureOffTheFeed | A future-dated post never appears in the feed | Holds |
| ListedHasAPage | Every listed post has a working page | Holds |
| ListedHasAnImage | Every listed post has an OG image route | Holds |
| FeedMatchesTheIndex | The feed is the same list as the index | Holds |
| NewestComesFirst | Dates sort newest first, and two listed posts do not share a place | Holds |
| PublishedIsListed | A published post is on the index | Holds |
| NoDeadlock | Every state has a step out | Holds |

## Breaks before the filter

With `ShipDrafts = TRUE`, TLC reached the same 16 states. Four rules broke. Each shortest path is one step from "Not written".

| Rule | Path |
| --- | --- |
| DraftsOffTheIndex | You mark the newer post as a draft. It is "Draft, but listed". |
| DraftsOffTheFeed | The same step. The feed follows the index. |
| FutureOffTheIndex | You date the newer post in the future. It is "Dated ahead, but listed". |
| FutureOffTheFeed | The same step. |

Replay against the files, then against `next build` and `next start`:

- An unfiltered read of `site/content/blog/` included `draft-note.md` (`draft: true`, date 2026-10-01) and `future-note.md` (date 2099-01-01). `getPosts()` left both out.
- `BLOG_AS_OF=2026-10-28` left only `docs-site`. The two posts dated 2026-10-29 were ahead of that day.
- `BLOG_AS_OF=2026-10-29` listed `naive-releases`, then `decisions-ledger`, then `docs-site`.
- The built routes `/blog/draft-note` and `/blog/future-note` answered 404, and so did their `/image` routes. They were absent from `/blog` and from `/blog/feed.xml`.
- `/blog/naive-releases`, `/blog/decisions-ledger`, and `/blog/docs-site` answered 200, and each `/image` route answered 200. The feed order matched the index.

Those two replay files were not kept.

The three notes in `site/content/blog/` are not `draft: true`. The banner on the blog says the prose still needs Torian. That banner is not the `draft` field.

## The chart

`out/chart.mmd` is the `ShipDrafts = FALSE` run. TLC found 16 states and 72 steps. The chart draws 9 states and 26 arrows.

The view hides the step that switches a post already off the site between a draft and a future date (16 steps). Both of those states stay off the index and the feed. Each is still reached from "Not written", and each still has a publish step.

Three steps change both posts at once, which is the date order:

- You publish the newer post, and the older one moves down.
- You mark the newer post as a draft, and the older one moves up.
- You date the newer post in the future, and the older one moves up.

## What the model leaves out

Tags, authors, the prose, the site-wide banner, same-day ordering by title, and the pixels of the image. Same-day posts are ordered by title in `getPosts()`. The image rule is only that the route exists.

## Run it again

The statechart script installs or reuses TLC. Point `TLA2TOOLS` at `tla2tools.jar` (v1.7.4) and `JAVA` at Java 11 or later. `--out` must be a new or empty folder.

```sh
TLA2TOOLS=/path/tla2tools.jar JAVA=java \
  statechart verification/site-blog/BlogPost.tla \
  --config verification/site-blog/BlogPost.cfg \
  --view verification/site-blog/view.mjs \
  --out /tmp/blog-chart
```

Render `chart.mmd` with Pele 1.9.0 (`limit: 1000000`, `outputLimit: 8000000`, `maxEdges: 10000`), then screenshot the SVG to PNG.
