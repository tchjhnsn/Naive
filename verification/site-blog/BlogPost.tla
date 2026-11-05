---- MODULE BlogPost ----
\* One newer post and one older post on the Naive blog.
\* getPosts in site/lib/blog/posts.ts is the list the index, the feed, the post page,
\* and the image route all read. ShipDrafts is TRUE for the loader before isListed
\* (every file is public). It is FALSE once a draft or a future date stays off that list.

EXTENDS Integers, FiniteSets

CONSTANT ShipDrafts
ASSUME ShipDrafts \in BOOLEAN

Posts == {"newer", "older"}
Phases == {"absent", "draft", "scheduled", "published"}

VARIABLES
  phase,  \* what the file is: absent, draft, scheduled (dated ahead), or published
  slot,   \* 0 off the index, 1 first, 2 second
  rss,    \* the same positions in the feed
  page,   \* the post page is generated
  image   \* the OG image route is generated

vars == <<phase, slot, rss, page, image>>

Rank(with) ==
  [q \in Posts |->
    IF q \notin with THEN 0
    ELSE IF q = "newer" THEN 1
    ELSE IF "newer" \in with THEN 2
    ELSE 1]

Place(p, s) == Rank({q \in Posts: s[q] > 0} \cup {p})
Drop(p, s) == Rank({q \in Posts: s[q] > 0} \ {p})

Init ==
  /\ phase = [p \in Posts |-> "absent"]
  /\ slot = [p \in Posts |-> 0]
  /\ rss = slot
  /\ page = [p \in Posts |-> FALSE]
  /\ image = [p \in Posts |-> FALSE]

\* You mark a file draft: true. With ShipDrafts the build still lists it.
SaveDraft ==
  \E p \in Posts:
    /\ phase[p] # "draft"
    /\ phase' = [phase EXCEPT ![p] = "draft"]
    /\ slot' = IF ShipDrafts THEN Place(p, slot) ELSE Drop(p, slot)
    /\ page' = [page EXCEPT ![p] = ShipDrafts]
    /\ image' = [image EXCEPT ![p] = ShipDrafts]
    /\ rss' = slot'

\* You set a date after the build day. With ShipDrafts the build still lists it.
Schedule ==
  \E p \in Posts:
    /\ phase[p] # "scheduled"
    /\ phase' = [phase EXCEPT ![p] = "scheduled"]
    /\ slot' = IF ShipDrafts THEN Place(p, slot) ELSE Drop(p, slot)
    /\ page' = [page EXCEPT ![p] = ShipDrafts]
    /\ image' = [image EXCEPT ![p] = ShipDrafts]
    /\ rss' = slot'

\* You publish a file whose date is on or before the build day. The build lists it,
\* in date order, and generates its page and its image.
Publish ==
  \E p \in Posts:
    /\ phase[p] # "published"
    /\ phase' = [phase EXCEPT ![p] = "published"]
    /\ slot' = Place(p, slot)
    /\ page' = [page EXCEPT ![p] = TRUE]
    /\ image' = [image EXCEPT ![p] = TRUE]
    /\ rss' = slot'

Next == SaveDraft \/ Schedule \/ Publish

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in [Posts -> Phases]
  /\ slot \in [Posts -> 0..2]
  /\ rss = slot
  /\ page \in [Posts -> BOOLEAN]
  /\ image \in [Posts -> BOOLEAN]

\* A draft never appears on the index.
DraftsOffTheIndex == \A p \in Posts: phase[p] = "draft" => slot[p] = 0

\* A draft never appears in the feed.
DraftsOffTheFeed == \A p \in Posts: phase[p] = "draft" => rss[p] = 0

\* A future-dated post never appears on the index.
FutureOffTheIndex == \A p \in Posts: phase[p] = "scheduled" => slot[p] = 0

\* A future-dated post never appears in the feed.
FutureOffTheFeed == \A p \in Posts: phase[p] = "scheduled" => rss[p] = 0

\* Every listed post has a working page.
ListedHasAPage == \A p \in Posts: slot[p] > 0 => page[p]

\* Every listed post has an OG image route.
ListedHasAnImage == \A p \in Posts: slot[p] > 0 => image[p]

\* The feed is the index list.
FeedMatchesTheIndex == rss = slot

\* Dates sort newest first. A single listed post is first. Two listed posts do not share a slot.
NewestComesFirst ==
  /\ (slot["newer"] > 0 /\ slot["older"] > 0) => slot["newer"] < slot["older"]
  /\ Cardinality({p \in Posts: slot[p] > 0}) = 1 => \A p \in Posts: slot[p] > 0 => slot[p] = 1
  /\ \A p, q \in Posts: slot[p] > 0 /\ slot[q] > 0 /\ p # q => slot[p] # slot[q]

\* A published post is on the index.
PublishedIsListed == \A p \in Posts: phase[p] = "published" => slot[p] > 0
====
