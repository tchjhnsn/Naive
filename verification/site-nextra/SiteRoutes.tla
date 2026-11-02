---- MODULE SiteRoutes ----
\* One request to Naive's site, as site/ answers it after docs and templates
\* move behind the waitlist (R-45). Each action is one request. The comment names the code.
\*
\* site/proxy.ts redirects /docs, /docs.md, /docs/*, /templates, /templates/*,
\* /llms.txt, /llms-full.txt, /md/docs, /md/docs/*, /og/docs, and /og/docs/*
\* to /waitlist. That includes a docs URL that is not a page, a .md URL, and
\* Accept: text/markdown. site/lib/waitlist-gate.ts is the list.
\* site/next.config.mjs still redirects the old paths onto docs URLs. The next
\* request for that docs URL is gated, so the reader does not get the page.
\* site/content/marketing/waitlist.mdx is the placeholder. It collects no sign-up.
\* site/components/shell/nav.ts names Blog, Showcase, About, and Waitlist.
\* The footer does not name docs, templates, or the llms files.
\* site/app/layout.tsx sets robots noindex, site/app/robots.ts disallows /, and
\* next.config.mjs sends X-Robots-Tag: noindex on every response. The redirect
\* from proxy.ts sets the same tag.

VARIABLES
  asked,     \* what was requested
  outcome,   \* what came back
  indexed    \* TRUE if that response could be indexed

vars == <<asked, outcome, indexed>>

Init == asked = "nothing" /\ outcome = "waiting" /\ indexed = FALSE

\* A page under content/docs, including the docs home. proxy.ts redirects it.
OpenDocs ==
    /\ outcome = "waiting"
    /\ asked' = "docs" /\ outcome' = "gated" /\ indexed' = FALSE

\* The .md URL, including /docs.md. The matcher lists /docs.md on its own
\* because /docs/:path* does not match a URL with no slash after /docs.
OpenDotMd ==
    /\ outcome = "waiting"
    /\ asked' = "dotmd" /\ outcome' = "gated" /\ indexed' = FALSE

\* The same docs URL with Accept: text/markdown. The path is gated either way.
OpenAccept ==
    /\ outcome = "waiting"
    /\ asked' = "accept" /\ outcome' = "gated" /\ indexed' = FALSE

\* /docs/no-such-page and /docs/no-such.md. Still under /docs, so still gated.
OpenMissing ==
    /\ outcome = "waiting"
    /\ asked' = "missing" /\ outcome' = "gated" /\ indexed' = FALSE

\* /templates and /templates/*. proxy.ts redirects them with the docs routes.
OpenTemplates ==
    /\ outcome = "waiting"
    /\ asked' = "templates" /\ outcome' = "gated" /\ indexed' = FALSE

\* An old path in next.config.mjs redirects(), permanent, to a docs URL.
OpenOldPath ==
    /\ outcome = "waiting"
    /\ asked' = "old" /\ outcome' = "redirect" /\ indexed' = FALSE

\* The browser follows that redirect and asks for the docs URL. The gate answers.
FollowRedirect ==
    /\ outcome = "redirect"
    /\ asked' = "docs" /\ outcome' = "gated" /\ indexed' = FALSE

\* The browser follows the gate and gets the waitlist placeholder.
FollowGate ==
    /\ outcome = "gated"
    /\ asked' = "waitlist" /\ outcome' = "page" /\ indexed' = FALSE

\* A header or footer link that is still public: /blog, /showcase, /about, /waitlist.
\* Docs, templates, and the llms files are not in that nav.
OpenNav ==
    /\ outcome = "waiting"
    /\ asked' = "nav" /\ outcome' = "page" /\ indexed' = FALSE

\* The placeholder itself. site/content/marketing/waitlist.mdx.
OpenWaitlist ==
    /\ outcome = "waiting"
    /\ asked' = "waitlist" /\ outcome' = "page" /\ indexed' = FALSE

\* /llms.txt and /llms-full.txt. proxy.ts redirects both. They do not return Markdown.
OpenLlms ==
    /\ outcome = "waiting"
    /\ asked' = "llms" /\ outcome' = "gated" /\ indexed' = FALSE

\* The reader asks for something else.
Again ==
    /\ outcome # "waiting"
    /\ asked' = "nothing" /\ outcome' = "waiting" /\ indexed' = FALSE

\* Nothing further is being asked. Stays here so a finished request is not a deadlock.
Done == outcome # "waiting" /\ UNCHANGED vars

Next == OpenDocs \/ OpenDotMd \/ OpenAccept \/ OpenMissing \/ OpenTemplates
    \/ OpenOldPath \/ FollowRedirect \/ FollowGate \/ OpenNav \/ OpenWaitlist
    \/ OpenLlms \/ Again \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ asked \in {"nothing", "docs", "dotmd", "accept", "missing", "templates", "old", "nav", "waitlist", "llms"}
    /\ outcome \in {"waiting", "page", "redirect", "gated"}
    /\ indexed \in BOOLEAN

\* Every response stays out of the index.
Noindex == indexed = FALSE

\* .md and Accept: text/markdown both come back as the waitlist gate, the same kind of result.
GatedEitherWay == asked \in {"dotmd", "accept"} => outcome = "gated"

\* A known docs URL is gated. It is not served as a page.
KnownDocsIsGated == asked = "docs" => outcome = "gated"

\* A docs URL that is not a page is gated too.
MissingIsGated == asked = "missing" => outcome = "gated"

\* Templates are gated.
TemplatesAreGated == asked = "templates" => outcome = "gated"

\* An old path redirects, rather than rendering a second copy of the page.
OldPathRedirects == asked = "old" => outcome = "redirect"

\* A public nav entry is a live page. It is not a gated docs or templates route.
NavIsLive == asked = "nav" => outcome = "page"

\* The waitlist placeholder is a page.
WaitlistIsPage == asked = "waitlist" => outcome = "page"

\* llms.txt is gated. It is not the docs Markdown.
LlmsIsGated == asked = "llms" => outcome = "gated"

\* What a request can come back as: a page, a redirect, or the waitlist gate.
DocsResolves == outcome \in {"waiting", "page", "redirect", "gated"}
====
