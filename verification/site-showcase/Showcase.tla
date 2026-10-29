---- MODULE Showcase ----
\* The showcase page (site/components/showcase/showcase.tsx, site/lib/showcase/catalog.ts).
\* An entry is loaded from its source path. It is featured or not. One filter is selected.
\* The filter is all, examples, the recorded venture, one phase, or one piece.
\* Badge is the label entry-card.tsx renders. FeaturedList and OtherList are the two
\* sections showcase.tsx renders: featured tiles only while the filter is all, and the
\* grid is the rest then, or every match otherwise.

EXTENDS Sequences, FiniteSets, Integers

Catalog == <<
  [id |-> "everything-ecosystem", example |-> FALSE, featured |-> TRUE, phase |-> "discovery",
    pieces |-> {"foundation", "product", "validation", "people", "legal", "operations", "product-anatomy", "docket"},
    source |-> "instance/ventures/everything-ecosystem/venture.json", sourceOk |-> TRUE],
  [id |-> "acme-labs", example |-> TRUE, featured |-> TRUE, phase |-> "discovery",
    pieces |-> {"foundation", "people", "money", "operations", "docket"},
    source |-> "schema/examples/workspace/ventures/acme-labs/venture.json", sourceOk |-> TRUE],
  [id |-> "tandem", example |-> TRUE, featured |-> TRUE, phase |-> "validation",
    pieces |-> {"foundation", "validation", "product", "people", "legal", "operations", "docket"},
    source |-> "schema/examples/workspace/ventures/tandem/venture.json", sourceOk |-> TRUE],
  [id |-> "polity", example |-> TRUE, featured |-> TRUE, phase |-> "validation",
    pieces |-> {"product-anatomy"},
    source |-> "purpose/frameworks/product-anatomy/examples/polity.json", sourceOk |-> TRUE],
  [id |-> "northstar", example |-> TRUE, featured |-> FALSE, phase |-> "validation",
    pieces |-> {"foundation", "fund", "deals", "people", "operations", "docket"},
    source |-> "schema/examples/workspace/ventures/northstar/venture.json", sourceOk |-> TRUE],
  [id |-> "kilnworks", example |-> TRUE, featured |-> FALSE, phase |-> "discovery",
    pieces |-> {"foundation", "operations", "docket"},
    source |-> "schema/examples/workspace/ventures/northstar/portfolio/kilnworks/venture.json", sourceOk |-> TRUE],
  [id |-> "studio", example |-> TRUE, featured |-> FALSE, phase |-> "beachhead",
    pieces |-> {"product", "relationships", "product-anatomy", "docket"},
    source |-> "schema/examples/workspace/ventures/studio/venture.json", sourceOk |-> TRUE],
  [id |-> "studio-print", example |-> TRUE, featured |-> FALSE, phase |-> "validation",
    pieces |-> {"docket"},
    source |-> "schema/examples/workspace/ventures/studio/print/venture.json", sourceOk |-> TRUE],
  [id |-> "woodworking", example |-> TRUE, featured |-> FALSE, phase |-> "discovery",
    pieces |-> {"docket"},
    source |-> "schema/examples/workspace/ventures/woodworking/venture.json", sourceOk |-> TRUE]
>>

Phases == {"discovery", "validation", "beachhead"}
Pieces == {"foundation", "product", "validation", "people", "money", "fund", "deals", "legal", "operations", "relationships", "product-anatomy", "docket"}

AllFilter == [kind |-> "all", value |-> ""]
ExamplesFilter == [kind |-> "examples", value |-> ""]
RecordedFilter == [kind |-> "recorded", value |-> ""]
PhaseFilter(p) == [kind |-> "phase", value |-> p]
PieceFilter(p) == [kind |-> "piece", value |-> p]
Filters == {AllFilter, ExamplesFilter, RecordedFilter}
  \union {PhaseFilter(p) : p \in Phases}
  \union {PieceFilter(p) : p \in Pieces}

VARIABLES loaded, filter
vars == <<loaded, filter>>

Init == loaded = FALSE /\ filter = AllFilter

\* The page reads each entry from its source path. site/lib/showcase/render-board.mjs
\* refuses a board whose source is missing; the page then shows the entries.
PageLoads ==
  /\ ~loaded
  /\ loaded' = TRUE
  /\ UNCHANGED filter

\* Every filter button stays on the page. Choosing one replaces the filter.
Choose ==
  /\ loaded
  /\ \E f \in Filters : f # filter /\ filter' = f
  /\ UNCHANGED loaded

Next == PageLoads \/ Choose
Spec == Init /\ [][Next]_vars

Matches(e) ==
  CASE filter.kind = "all" -> TRUE
    [] filter.kind = "examples" -> e.example
    [] filter.kind = "recorded" -> ~e.example
    [] filter.kind = "phase" -> e.phase = filter.value
    [] filter.kind = "piece" -> filter.value \in e.pieces

Matched == SelectSeq(Catalog, LAMBDA e : Matches(e))
FeaturedList == IF filter.kind = "all" THEN SelectSeq(Matched, LAMBDA e : e.featured) ELSE <<>>
OtherList == IF filter.kind = "all" THEN SelectSeq(Matched, LAMBDA e : ~e.featured) ELSE Matched
Shown == FeaturedList \o OtherList

IdsOf(seq) == { seq[i].id : i \in 1..Len(seq) }
Expected == { Catalog[i].id : i \in { j \in 1..Len(Catalog) : Matches(Catalog[j]) } }
Badge(e) == IF e.example THEN "Example" ELSE "This repository"

TypeOK ==
  /\ loaded \in BOOLEAN
  /\ filter \in Filters
  /\ Len(Catalog) = 9

\* Every entry's source path exists. sourceOk is the disk check recorded with the catalog.
SourceExists == \A i \in 1..Len(Catalog) : Catalog[i].sourceOk

\* An example is labeled Example. An entry that is not an example is not.
ExamplesLabeled ==
  \A i \in 1..Len(Catalog) :
    /\ (Catalog[i].example => Badge(Catalog[i]) = "Example")
    /\ (~Catalog[i].example => Badge(Catalog[i]) # "Example")

\* The selected filter is one of the page's filters, it shows at least one entry,
\* and the two sections together are exactly the entries that match.
FilterIsValid ==
  /\ filter \in Filters
  /\ ~loaded \/ (
       /\ Len(Shown) >= 1
       /\ IdsOf(Shown) = Expected
       /\ Len(Shown) = Cardinality(Expected)
       /\ filter.kind # "all" => FeaturedList = <<>>
       /\ filter.kind = "all" => \A i \in 1..Len(FeaturedList) : FeaturedList[i].featured
     )

\* No entry appears twice, in the catalog or on the page.
NoEntryTwice ==
  /\ \A i, j \in 1..Len(Catalog) : Catalog[i].id = Catalog[j].id => i = j
  /\ ~loaded \/ \A i, j \in 1..Len(Shown) : Shown[i].id = Shown[j].id => i = j

====
