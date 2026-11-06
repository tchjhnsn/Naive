---- MODULE NetflixCulture ----
\* The netflix-culture playbook (library/packages/people/playbooks/netflix-culture.md).
\* Each action is one template step. The comment names the Naive route and the
\* action the router exposes (node interface/router.mjs). TLC checks the rules
\* in the config. The chart is view.mjs.

Base == {"problem", "profile", "alignment", "team", "people", "founders"}

Routes == {
  "foundation/problem",
  "knowledge/venture-profile",
  "foundation/alignment",
  "people/team",
  "people",
  "people/founders",
  "people/founders/[id]",
  "governance/decision-rights",
  "governance/ownership",
  "people/team-plan",
  "decisions/[id]"
}

Records == Base \cup {"rights", "ownership", "plan", "decision"}

VARIABLES
  pc,          \* which template step has just finished
  have,        \* records the venture or an earlier step provides
  readSoFar,   \* records whose content a step has read
  copied,      \* the culture note pastes an alignment statement
  payKnown,    \* governance/ownership was there when the step read it
  payWritten,  \* the hiring bar contains a pay or equity figure
  brief,       \* the recruiting brief file the team plan points at exists
  accepted,    \* a person has decided decisions/team-plan-culture
  check,       \* "none", "pass", or "fail"
  lastRoute,
  lastReads

vars == <<pc, have, readSoFar, copied, payKnown, payWritten, brief, accepted, check, lastRoute, lastReads>>

Init ==
  \E own \in BOOLEAN :
    /\ pc = "start"
    /\ have = Base \cup (IF own THEN {"ownership"} ELSE {})
    /\ readSoFar = {}
    /\ copied = FALSE
    /\ payKnown = FALSE
    /\ payWritten = FALSE
    /\ brief = FALSE
    /\ accepted = FALSE
    /\ check = "none"
    /\ lastRoute = ""
    /\ lastReads = {}

\* foundation/problem, read. The venture provides the problem.
ReadProblem ==
  /\ pc = "start"
  /\ "problem" \in have
  /\ pc' = "problem"
  /\ readSoFar' = readSoFar \cup {"problem"}
  /\ lastRoute' = "foundation/problem"
  /\ lastReads' = {"problem"}
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* knowledge/venture-profile, read. Content is used only when the file is there.
ReadProfile ==
  /\ pc = "problem"
  /\ pc' = "profile"
  /\ lastRoute' = "knowledge/venture-profile"
  /\ lastReads' = IF "profile" \in have THEN {"profile"} ELSE {}
  /\ readSoFar' = readSoFar \cup lastReads'
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* foundation/alignment, read. The note will cite ids from this record.
ReadAlignment ==
  /\ pc = "profile"
  /\ "alignment" \in have
  /\ pc' = "alignment"
  /\ readSoFar' = readSoFar \cup {"alignment"}
  /\ lastRoute' = "foundation/alignment"
  /\ lastReads' = {"alignment"}
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* people/team, read. Gaps are needed skills with no holder.
ReadTeam ==
  /\ pc = "alignment"
  /\ "team" \in have
  /\ pc' = "team"
  /\ readSoFar' = readSoFar \cup {"team"}
  /\ lastRoute' = "people/team"
  /\ lastReads' = {"team"}
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* people, read.
ReadPeople ==
  /\ pc = "team"
  /\ "people" \in have
  /\ pc' = "people"
  /\ readSoFar' = readSoFar \cup {"people"}
  /\ lastRoute' = "people"
  /\ lastReads' = {"people"}
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* people/founders, read (the list).
ReadFounderList ==
  /\ pc = "people"
  /\ pc' = "founderlist"
  /\ lastRoute' = "people/founders"
  /\ lastReads' = IF "founders" \in have THEN {"founders"} ELSE {}
  /\ readSoFar' = readSoFar \cup lastReads'
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* people/founders/[id], read. One step per founder file the list returned.
ReadFounders ==
  /\ pc = "founderlist"
  /\ pc' = "founders"
  /\ lastRoute' = "people/founders/[id]"
  /\ lastReads' = IF "founders" \in have THEN {"founders"} ELSE {}
  /\ readSoFar' = readSoFar \cup lastReads'
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* governance/decision-rights, read. This model starts without a venture file,
\* so the step reads the route and uses no class names.
ReadRights ==
  /\ pc = "founders"
  /\ pc' = "rights"
  /\ lastRoute' = "governance/decision-rights"
  /\ lastReads' = IF "rights" \in have THEN {"rights"} ELSE {}
  /\ readSoFar' = readSoFar \cup lastReads'
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* governance/ownership, read. A missing record means the bar states no figure.
ReadOwnership ==
  /\ pc = "rights"
  /\ pc' = "ownership"
  /\ lastRoute' = "governance/ownership"
  /\ payKnown' = ("ownership" \in have)
  /\ lastReads' = IF "ownership" \in have THEN {"ownership"} ELSE {}
  /\ readSoFar' = readSoFar \cup lastReads'
  /\ UNCHANGED <<have, copied, payWritten, brief, accepted, check>>

\* people/team-plan, read. The first time through, the record is not there yet.
ReadPlan ==
  /\ pc = "ownership"
  /\ pc' = "planread"
  /\ lastRoute' = "people/team-plan"
  /\ lastReads' = IF "plan" \in have THEN {"plan"} ELSE {}
  /\ readSoFar' = readSoFar \cup lastReads'
  /\ UNCHANGED <<have, copied, payKnown, payWritten, brief, accepted, check>>

\* people/team-plan, write. The note is the culture doc. Pasting a principle is
\* possible; the check then fails. Citing alignment:<id> keeps copied false.
WriteCulture ==
  /\ pc = "planread"
  /\ "problem" \in readSoFar
  /\ "alignment" \in readSoFar
  /\ pc' = "culture"
  /\ have' = have \cup {"plan"}
  /\ copied' \in BOOLEAN
  /\ lastRoute' = "people/team-plan"
  /\ lastReads' = {"problem", "alignment"}
  /\ UNCHANGED <<readSoFar, payKnown, payWritten, brief, accepted, check>>

\* people/team-plan, write. The hiring bar: role why, recruiting entry, and the
\* brief file. A figure is written only when ownership was actually read.
\* The brief file may be forgotten; the team-plan check then fails.
WriteBar ==
  /\ pc = "culture"
  /\ "team" \in readSoFar
  /\ "plan" \in have
  /\ pc' = "bar"
  /\ lastRoute' = "people/team-plan"
  /\ lastReads' = {"team", "plan"}
  /\ UNCHANGED <<have, readSoFar, copied, payKnown, accepted, check>>
  /\ \/ /\ payWritten' = FALSE /\ brief' \in BOOLEAN
     \/ /\ payKnown /\ payWritten' = TRUE /\ brief' \in BOOLEAN

\* decisions/[id], the person decides team-plan-culture (mentura decide).
\* An agent only proposes it open. This action is the person's decision.
YouAccept ==
  /\ pc = "bar"
  /\ pc' = "accepted"
  /\ accepted' = TRUE
  /\ have' = have \cup {"decision"}
  /\ lastRoute' = "decisions/[id]"
  /\ lastReads' = {"plan"}
  /\ UNCHANGED <<readSoFar, copied, payKnown, payWritten, brief, check>>

Pass ==
  /\ accepted /\ ~copied /\ ~payWritten /\ brief
  /\ "problem" \in readSoFar /\ "alignment" \in readSoFar /\ "team" \in readSoFar
  /\ "plan" \in have /\ "decision" \in have

\* people/team-plan, check, plus a read of the note, the brief, alignment, and
\* the decision. It passes only in Pass, and it fails in every other state
\* where it is run. Both results are reachable.
RunCheck ==
  /\ check = "none"
  /\ pc \in {"bar", "accepted"}
  /\ lastRoute' = "people/team-plan"
  /\ lastReads' = {"plan", "alignment", "team"}
  /\ UNCHANGED <<have, readSoFar, copied, payKnown, payWritten, brief, accepted>>
  /\ \/ /\ Pass /\ pc' = "passed" /\ check' = "pass"
     \/ /\ ~Pass /\ pc' = "failed" /\ check' = "fail"

Done == pc \in {"passed", "failed"} /\ UNCHANGED vars

Next ==
  ReadProblem \/ ReadProfile \/ ReadAlignment \/ ReadTeam \/ ReadPeople
  \/ ReadFounderList \/ ReadFounders \/ ReadRights \/ ReadOwnership \/ ReadPlan
  \/ WriteCulture \/ WriteBar \/ YouAccept \/ RunCheck \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ pc \in {
       "start", "problem", "profile", "alignment", "team", "people", "founderlist",
       "founders", "rights", "ownership", "planread", "culture", "bar", "accepted",
       "passed", "failed"
     }
  /\ have \subseteq Records /\ readSoFar \subseteq Records
  /\ copied \in BOOLEAN /\ payKnown \in BOOLEAN /\ payWritten \in BOOLEAN
  /\ brief \in BOOLEAN /\ accepted \in BOOLEAN
  /\ check \in {"none", "pass", "fail"}
  /\ (lastRoute = "") \/ (lastRoute \in Routes)
  /\ lastReads \subseteq Records

\* Every step names a route the router has.
RouteIsReal == (lastRoute = "") \/ (lastRoute \in Routes)

\* A step reads content only from a record the venture or an earlier step provides.
NoReadAhead == lastReads \subseteq have

\* The culture check passes only when the note cites alignment, the bar has a
\* brief and no pay figure, the gaps were read, and a person has decided.
\* Otherwise the check fails. RunCheck reaches both results.
CheckHonest ==
  \/ check = "none"
  \/ check = "pass" /\ Pass
  \/ check = "fail" /\ ~Pass

\* A pay or equity figure in the bar was read from governance/ownership.
\* The template still fails the culture check when a figure is copied in.
NoInventedPay == payWritten => payKnown

\* A pasted principle is only possible after alignment was read.
NoPasteWithoutSource == copied => ("alignment" \in readSoFar)
====
