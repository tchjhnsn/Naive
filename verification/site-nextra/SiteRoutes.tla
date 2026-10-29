---- MODULE SiteRoutes ----
\* One request to Naive's docs site, as site/ answers it after the Nextra move.
\* Each action is one request. The comment names the code.
\*
\* site/proxy.ts rewrites /docs, /docs.md, and /docs/* when the URL ends in .md
\* or the request accepts text/markdown, to site/app/md/docs (markdownFor in site/lib/pages.ts).
\* site/next.config.mjs redirects the old paths onto docs pages that exist.
\* site/app/docs/[[...mdxPath]]/page.tsx serves content/docs. Unknown docs URLs 404
\* (dynamicParams is false). site/components/shell/nav.ts and footer.tsx name live routes.
\* site/app/llms.txt/route.ts lists those same docs pages.
\* site/app/layout.tsx sets robots noindex, site/app/robots.ts disallows /, and
\* next.config.mjs sends X-Robots-Tag: noindex on every response.

VARIABLES
  asked,     \* what was requested
  outcome,   \* what came back
  indexed    \* TRUE if that response could be indexed

vars == <<asked, outcome, indexed>>

Init == asked = "nothing" /\ outcome = "waiting" /\ indexed = FALSE

\* A page under content/docs, including the docs home. app/docs/[[...mdxPath]]/page.tsx
OpenDocs ==
    /\ outcome = "waiting"
    /\ asked' = "docs" /\ outcome' = "page" /\ indexed' = FALSE

\* The .md URL, including /docs.md. proxy.ts matcher lists /docs.md on its own
\* because /docs/:path* does not match a URL with no slash after /docs.
OpenDotMd ==
    /\ outcome = "waiting"
    /\ asked' = "dotmd" /\ outcome' = "markdown" /\ indexed' = FALSE

\* The same docs URL with Accept: text/markdown. The same rewrite and the same handler.
OpenAccept ==
    /\ outcome = "waiting"
    /\ asked' = "accept" /\ outcome' = "markdown" /\ indexed' = FALSE

\* /docs/no-such-page and /docs/no-such.md. Not a generated page, so notFound().
OpenMissing ==
    /\ outcome = "waiting"
    /\ asked' = "missing" /\ outcome' = "not-found" /\ indexed' = FALSE

\* An old path in next.config.mjs redirects(), permanent, to a docs page.
OpenOldPath ==
    /\ outcome = "waiting"
    /\ asked' = "old" /\ outcome' = "redirect" /\ indexed' = FALSE

\* The browser follows that redirect and gets the docs page.
FollowRedirect ==
    /\ outcome = "redirect"
    /\ asked' = "docs" /\ outcome' = "page" /\ indexed' = FALSE

\* A header or footer link: /docs, /blog, /templates, /showcase, /why, /for,
\* and the docs section links. Each is a page, not a redirect and not a 404.
OpenNav ==
    /\ outcome = "waiting"
    /\ asked' = "nav" /\ outcome' = "page" /\ indexed' = FALSE

\* /llms.txt names the docs pages, and each of those has HTML and Markdown.
OpenLlms ==
    /\ outcome = "waiting"
    /\ asked' = "llms" /\ outcome' = "markdown" /\ indexed' = FALSE

\* The reader asks for something else.
Again ==
    /\ outcome # "waiting"
    /\ asked' = "nothing" /\ outcome' = "waiting" /\ indexed' = FALSE

\* Nothing further is being asked. Stays here so a finished request is not a deadlock.
Done == outcome # "waiting" /\ UNCHANGED vars

Next == OpenDocs \/ OpenDotMd \/ OpenAccept \/ OpenMissing \/ OpenOldPath
    \/ FollowRedirect \/ OpenNav \/ OpenLlms \/ Again \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ asked \in {"nothing", "docs", "dotmd", "accept", "missing", "old", "nav", "llms"}
    /\ outcome \in {"waiting", "page", "markdown", "redirect", "not-found"}
    /\ indexed \in BOOLEAN

\* Every response stays out of the index.
Noindex == indexed = FALSE

\* .md and Accept: text/markdown both come back as Markdown, and they are the same kind of result.
MarkdownEitherWay == asked \in {"dotmd", "accept"} => outcome = "markdown"

\* A known docs URL is a page.
KnownDocsIsPage == asked = "docs" => outcome = "page"

\* A docs URL that is not a page is a 404.
MissingIs404 == asked = "missing" => outcome = "not-found"

\* An old path redirects, rather than rendering a second copy of the page.
OldPathRedirects == asked = "old" => outcome = "redirect"

\* A nav entry is a live page.
NavIsLive == asked = "nav" => outcome = "page"

\* llms.txt is Markdown, like the pages it lists.
LlmsIsMarkdown == asked = "llms" => outcome = "markdown"

\* What a request can come back as: a page, Markdown, a redirect, or a 404.
DocsResolves == outcome \in {"waiting", "page", "markdown", "redirect", "not-found"}
====
