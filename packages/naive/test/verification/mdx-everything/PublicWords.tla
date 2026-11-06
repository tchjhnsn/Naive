---- MODULE PublicWords ----
\* One field of a venture record (foundation/problem.json statement) on its way to a public channel (the
\* marketing site's facts, the one-page artifact, the strategic foundation one-pager), as the code of
\* tchjhnsn/everything-ecosystem does it. CODE = "main" is origin/main at 566bb99; CODE = "branch" is
\* cursor/mdx-everything. Each action is one command or one file write; its comment names the code.

CONSTANT CODE

VARIABLES
    vis,       \* the field's sidecar (<record>.visibility.json): "internal" (default), "variant", "public"
    wording,   \* "pinned": the field still hashes to the sha256 a person approved; "edited": it changed since
    variant,   \* its MDX variant (operations/marketing/content/*.mdx): "none", "draft" (publish: false),
               \* "approved" (publish: true, approved_by a person), "copying" (approved, but copies ten
               \* words of the field), "forged" (publish: true and approved_by written by an agent)
    pub,       \* what the last build put in the output: "nothing", "fieldWords" (the record's own
               \* wording), "variantWords", "refused" (the build stopped)
    falseAlarm, \* the public gate (check-public.mjs) refused an honest variant
    breach     \* the rules the last build broke, judged on the records as they were when it ran. An output
               \* that goes stale after a later edit is item 11 (republish on change), not this item.

vars == <<vis, wording, variant, pub, falseAlarm, breach>>

Init == vis = "internal" /\ wording = "pinned" /\ variant = "none" /\ pub = "nothing" /\ falseAlarm = FALSE /\ breach = {}

\* An agent writes operations/marketing/content/problem.mdx: variant_of: foundation/problem.json#statement, publish: false.
AgentDraftsVariant == variant = "none" /\ variant' = "draft" /\ UNCHANGED <<vis, wording, pub, falseAlarm, breach>>
\* The founder sets publish: true and approved_by: <their name> on the draft.
PersonApprovesVariant == variant = "draft" /\ variant' = "approved" /\ UNCHANGED <<vis, wording, pub, falseAlarm, breach>>
\* The variant is rewritten to reuse the record's own sentence (ten words or more), still marked approved.
VariantCopiesSource == variant = "approved" /\ variant' = "copying" /\ UNCHANGED <<vis, wording, pub, falseAlarm, breach>>
\* An agent writes publish: true and approved_by: Torian itself. An MDX file has no provenance line.
AgentWritesApproved == variant = "draft" /\ variant' = "forged" /\ UNCHANGED <<vis, wording, pub, falseAlarm, breach>>
\* The founder writes the sidecar: { statement: { visibility: "variant" } }.
PersonMakesItVariant == vis = "internal" /\ vis' = "variant" /\ UNCHANGED <<wording, variant, pub, falseAlarm, breach>>
\* The founder approves the exact wording as public: visibility public plus its sha256 (schema/visibility.mjs hash).
PersonApprovesPublic == vis # "public" /\ vis' = "public" /\ wording' = "pinned" /\ UNCHANGED <<variant, pub, falseAlarm, breach>>
\* Anyone edits the field (mentura foundation/problem write). A pinned public field no longer matches its sha256.
EditField == wording = "pinned" /\ wording' = "edited" /\ UNCHANGED <<vis, variant, pub, falseAlarm, breach>>

ApprovedLike == variant \in {"approved", "copying", "forged"}
\* schema/visibility.mjs publicValue: public and pinned gives the field; variant (or public but edited, demoted
\* to variant) gives the approved MDX variant; anything else gives nothing.
Compiled ==
    IF vis = "public" /\ wording = "pinned" THEN "fieldWords"
    ELSE IF vis # "internal" /\ ApprovedLike THEN "variantWords"
    ELSE "nothing"
\* check-public.mjs. On main it reads variant_of as a file path, so every record#field variant fails to resolve.
GateBlocks == IF CODE = "main" THEN variant # "none" ELSE variant = "copying"

\* main: no build command. site/scripts/foundation.mjs prints every filled statement from
\* mentura purpose/foundation run, whatever its visibility, and nothing runs the gate first.
\* branch: operations/marketing/publish-build.mjs <channel> runs gate, compile, build, verify (operations/marketing/publish-build.mjs);
\* verify refuses output that carries a field's own wording unless that field is public and pinned.
Out == IF CODE = "main" THEN "fieldWords" ELSE IF GateBlocks THEN "refused" ELSE Compiled
Build ==
    /\ falseAlarm' = (CODE = "main" /\ GateBlocks /\ variant \in {"draft", "approved"})
    /\ pub' = Out
    /\ breach' = (IF Out = "fieldWords" /\ ~(vis = "public" /\ wording = "pinned") THEN {"R1"} ELSE {})
               \cup (IF Out = "variantWords" /\ variant = "copying" THEN {"R2"} ELSE {})
               \cup (IF Out = "variantWords" /\ variant # "approved" THEN {"R3"} ELSE {})
    /\ UNCHANGED <<vis, wording, variant>>

Next == AgentDraftsVariant \/ PersonApprovesVariant \/ VariantCopiesSource \/ AgentWritesApproved
     \/ PersonMakesItVariant \/ PersonApprovesPublic \/ EditField \/ Build

Spec == Init /\ [][Next]_vars

TypeOK == vis \in {"internal", "variant", "public"} /\ wording \in {"pinned", "edited"}
    /\ variant \in {"none", "draft", "approved", "copying", "forged"}
    /\ pub \in {"nothing", "fieldWords", "variantWords", "refused"} /\ falseAlarm \in BOOLEAN
    /\ breach \subseteq {"R1", "R2", "R3"}

\* R1. A record's own wording is published only when a person approved exactly that wording as public.
NoInternalWords == "R1" \notin breach
\* R2. A variant reaches the output only when it does not copy its source.
NoCopiedVariant == "R2" \notin breach
\* R3. A variant reaches the output only when a person approved it.
OnlyAPersonApproves == "R3" \notin breach
\* R4. The public gate accepts an honest variant (record#field, a draft or approved by a person).
GateAcceptsHonestVariant == ~falseAlarm
====
