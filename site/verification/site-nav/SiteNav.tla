---- MODULE SiteNav ----
\* The shared shell on the combined Naive site. Each action is one header link.
\* site/components/shell/nav.ts is the list. site/components/shell/header.tsx and
\* footer.tsx render it. A link resolves when that route is a page (200), not a 404.
\* site/app/layout.tsx and site/next.config.mjs keep every one of those pages noindex.

VARIABLES
  asked,    \* which nav entry was opened
  outcome,  \* page or not-found
  indexed   \* TRUE if that response could be indexed

vars == <<asked, outcome, indexed>>

Init == asked = "nothing" /\ outcome = "waiting" /\ indexed = FALSE

OpenDocs ==
    /\ outcome = "waiting"
    /\ asked' = "docs" /\ outcome' = "page" /\ indexed' = FALSE

OpenBlog ==
    /\ outcome = "waiting"
    /\ asked' = "blog" /\ outcome' = "page" /\ indexed' = FALSE

OpenTemplates ==
    /\ outcome = "waiting"
    /\ asked' = "templates" /\ outcome' = "page" /\ indexed' = FALSE

OpenShowcase ==
    /\ outcome = "waiting"
    /\ asked' = "showcase" /\ outcome' = "page" /\ indexed' = FALSE

OpenWhy ==
    /\ outcome = "waiting"
    /\ asked' = "why" /\ outcome' = "page" /\ indexed' = FALSE

OpenWho ==
    /\ outcome = "waiting"
    /\ asked' = "who" /\ outcome' = "page" /\ indexed' = FALSE

Again ==
    /\ outcome # "waiting"
    /\ asked' = "nothing" /\ outcome' = "waiting" /\ indexed' = FALSE

Done == outcome # "waiting" /\ UNCHANGED vars

Next == OpenDocs \/ OpenBlog \/ OpenTemplates \/ OpenShowcase \/ OpenWhy \/ OpenWho \/ Again \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ asked \in {"nothing", "docs", "blog", "templates", "showcase", "why", "who"}
    /\ outcome \in {"waiting", "page", "not-found"}
    /\ indexed \in BOOLEAN

\* Every header entry is a live page.
NavResolves == asked # "nothing" => outcome = "page"

\* Those pages stay out of the index.
Noindex == indexed = FALSE
====
