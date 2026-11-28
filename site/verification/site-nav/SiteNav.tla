---- MODULE SiteNav ----
\* The shared shell on the combined Naive site. Each action is one footer link. The header has none.
\* site/components/shell/nav.ts is the list. site/components/shell/footer.tsx renders it. A link resolves when that route is a page (200), not a 404.
\* site/app/layout.tsx and site/next.config.mjs keep every one of those pages noindex.

VARIABLES
  asked,    \* which nav entry was opened
  outcome,  \* page or not-found
  indexed   \* TRUE if that response could be indexed

vars == <<asked, outcome, indexed>>

Init == asked = "nothing" /\ outcome = "waiting" /\ indexed = FALSE

OpenAbout ==
    /\ outcome = "waiting"
    /\ asked' = "about" /\ outcome' = "page" /\ indexed' = FALSE

OpenWaitlist ==
    /\ outcome = "waiting"
    /\ asked' = "waitlist" /\ outcome' = "page" /\ indexed' = FALSE

Again ==
    /\ outcome # "waiting"
    /\ asked' = "nothing" /\ outcome' = "waiting" /\ indexed' = FALSE

Done == outcome # "waiting" /\ UNCHANGED vars

Next == OpenAbout \/ OpenWaitlist \/ Again \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ asked \in {"nothing", "about", "waitlist"}
    /\ outcome \in {"waiting", "page", "not-found"}
    /\ indexed \in BOOLEAN

\* Every footer entry is a live page.
NavResolves == asked # "nothing" => outcome = "page"

\* Those pages stay out of the index.
Noindex == indexed = FALSE
====
