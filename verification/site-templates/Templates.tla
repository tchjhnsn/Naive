---- MODULE Templates ----
\* The templates page: a file in the repository is read, shown as a card, filtered,
\* and opened. The actions follow site/lib/templates/catalog.mjs (what is listed),
\* site/lib/templates/filter.mjs (which cards a filter keeps), and
\* site/app/(site)/templates/[slug]/page.tsx (the detail page for each slug).
\* A playbook added later at packages/<function>/playbooks/ is read by the same Discover step.

VARIABLES
    screen,   \* start, read, cards, filtered, empty, detail, use
    pathOk,   \* the card's file is in the repository
    listed,   \* the card is in the catalog, so a detail page is generated for it
    cmdOk,    \* every Use command on the card can be run
    matches   \* the card matches the filters that are on

vars == <<screen, pathOk, listed, cmdOk, matches>>

Init == screen = "start" /\ pathOk = FALSE /\ listed = FALSE /\ cmdOk = FALSE /\ matches = FALSE

\* catalog.mjs reads a file that exists and keeps only a runnable command.
Discover ==
    /\ screen = "start"
    /\ screen' = "read"
    /\ pathOk' = TRUE /\ listed' = TRUE /\ cmdOk' = TRUE
    /\ UNCHANGED matches

\* The page renders one card per catalog record.
ShowCards ==
    /\ screen = "read" /\ pathOk /\ listed
    /\ screen' = "cards" /\ matches' = TRUE
    /\ UNCHANGED <<pathOk, listed, cmdOk>>

\* A filter that keeps this card. filter.mjs returns it.
ApplyMatchingFilter ==
    /\ screen = "cards"
    /\ screen' = "filtered" /\ matches' = TRUE
    /\ UNCHANGED <<pathOk, listed, cmdOk>>

\* A filter that keeps nothing. filter.mjs returns an empty list. That is a valid page.
ApplyEmptyFilter ==
    /\ screen \in {"cards", "filtered"}
    /\ screen' = "empty" /\ matches' = FALSE
    /\ UNCHANGED <<pathOk, listed, cmdOk>>

\* View opens /templates/<slug>, and generateStaticParams built that page.
OpenDetail ==
    /\ screen \in {"cards", "filtered"} /\ listed /\ matches
    /\ screen' = "detail"
    /\ UNCHANGED <<pathOk, listed, cmdOk, matches>>

\* Use shows the command. The catalog has already dropped ones that cannot be run.
ShowUse ==
    /\ screen = "detail" /\ cmdOk /\ listed
    /\ screen' = "use"
    /\ UNCHANGED <<pathOk, listed, cmdOk, matches>>

\* Back to the full list. An empty filter result can be cleared.
GoBack ==
    /\ screen \in {"filtered", "empty", "detail", "use"}
    /\ screen' = "cards" /\ matches' = TRUE
    /\ UNCHANGED <<pathOk, listed, cmdOk>>

Next == Discover \/ ShowCards \/ ApplyMatchingFilter \/ ApplyEmptyFilter \/ OpenDetail \/ ShowUse \/ GoBack

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ screen \in {"start", "read", "cards", "filtered", "empty", "detail", "use"}
    /\ pathOk \in BOOLEAN /\ listed \in BOOLEAN /\ cmdOk \in BOOLEAN /\ matches \in BOOLEAN

\* Every card maps to a real repository path.
CardHasPath == screen \in {"read", "cards", "filtered", "detail", "use"} => pathOk

\* Every filter combination is a list of matching cards, or an empty list.
FilterValid ==
    /\ (screen = "filtered" => matches)
    /\ (screen = "empty" => ~matches)
    /\ (screen \in {"cards", "detail", "use"} => matches)

\* Every Use command can be run.
CommandRunnable == screen = "use" => cmdOk

\* Every detail page was generated for a catalog slug.
DetailExists == screen \in {"detail", "use"} => listed
====
