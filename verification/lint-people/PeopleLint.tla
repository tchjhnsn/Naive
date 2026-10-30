---- MODULE PeopleLint ----
\* People lint (route people/lint, schema/lint-people.mjs).
\* One role, one hire and one decision. Each action is one edit of a venture record.
\* The team plan edit and the hire are separate actions, so TLC tries both orders.
\* records = "missing" or "malformed" means none of the records this lint reads can be parsed.
\* A file that fails on its own, while another file still parses, is checked by the CLI replay.

VARIABLES
  plan,       \* "unnamed" or "named": the team plan currently names the hire's role, or it does not
  hired,      \* a hire for that role is on the books
  roleOwns,   \* the role owns a function
  decision,   \* "open", "person" or "nobody"
  records,    \* "ok", "missing" or "malformed"
  closed,     \* "none", or the one rule whose naive.config.json mode is fail-closed
  crashed,    \* the lint threw
  readFrom    \* where the record bodies were read

vars == <<plan, hired, roleOwns, decision, records, closed, crashed, readFrom>>

Init ==
  /\ plan = "named"
  /\ hired = FALSE
  /\ roleOwns = TRUE
  /\ decision = "open"
  /\ records = "ok"
  /\ closed = "none"
  /\ crashed = FALSE
  /\ readFrom = "ventureFile"

\* schema/lint-people.mjs reads people/team-plan.json (else operations/team-plan.json) through ventureFile.
NameRole ==
  /\ plan = "unnamed"
  /\ plan' = "named"
  /\ UNCHANGED <<hired, roleOwns, decision, records, closed, crashed, readFrom>>

DropRole ==
  /\ plan = "named"
  /\ plan' = "unnamed"
  /\ UNCHANGED <<hired, roleOwns, decision, records, closed, crashed, readFrom>>

\* A hire is a recruiting entry of kind hire, or a person in people/people.json who is not a founder.
Hire ==
  /\ ~hired
  /\ hired' = TRUE
  /\ UNCHANGED <<plan, roleOwns, decision, records, closed, crashed, readFrom>>

CancelHire ==
  /\ hired
  /\ hired' = FALSE
  /\ UNCHANGED <<plan, roleOwns, decision, records, closed, crashed, readFrom>>

\* A function owner in venture.json, or a hat in the flat layout.
GiveFunction ==
  /\ ~roleOwns
  /\ roleOwns' = TRUE
  /\ UNCHANGED <<plan, hired, decision, records, closed, crashed, readFrom>>

TakeFunction ==
  /\ roleOwns
  /\ roleOwns' = FALSE
  /\ UNCHANGED <<plan, hired, decision, records, closed, crashed, readFrom>>

LeaveOpen ==
  /\ decision # "open"
  /\ decision' = "open"
  /\ UNCHANGED <<plan, hired, roleOwns, records, closed, crashed, readFrom>>

PersonDecides ==
  /\ decision # "person"
  /\ decision' = "person"
  /\ UNCHANGED <<plan, hired, roleOwns, records, closed, crashed, readFrom>>

NobodyDecides ==
  /\ decision # "nobody"
  /\ decision' = "nobody"
  /\ UNCHANGED <<plan, hired, roleOwns, records, closed, crashed, readFrom>>

LoseRecords ==
  /\ records # "missing"
  /\ records' = "missing"
  /\ UNCHANGED <<plan, hired, roleOwns, decision, closed, crashed, readFrom>>

\* A record that does not parse is skipped. The run does not throw, and it still read through ventureFile.
GarbleRecords ==
  /\ records # "malformed"
  /\ records' = "malformed"
  /\ crashed' = FALSE
  /\ readFrom' = "ventureFile"
  /\ UNCHANGED <<plan, hired, roleOwns, decision, closed>>

RestoreRecords ==
  /\ records # "ok"
  /\ records' = "ok"
  /\ UNCHANGED <<plan, hired, roleOwns, decision, closed, crashed, readFrom>>

CloseRole ==
  /\ closed # "role-no-function"
  /\ closed' = "role-no-function"
  /\ UNCHANGED <<plan, hired, roleOwns, decision, records, crashed, readFrom>>

CloseHire ==
  /\ closed # "hire-before-plan"
  /\ closed' = "hire-before-plan"
  /\ UNCHANGED <<plan, hired, roleOwns, decision, records, crashed, readFrom>>

CloseDecision ==
  /\ closed # "decision-no-person"
  /\ closed' = "decision-no-person"
  /\ UNCHANGED <<plan, hired, roleOwns, decision, records, crashed, readFrom>>

OpenRules ==
  /\ closed # "none"
  /\ closed' = "none"
  /\ UNCHANGED <<plan, hired, roleOwns, decision, records, crashed, readFrom>>

Next ==
  \/ NameRole \/ DropRole \/ Hire \/ CancelHire \/ GiveFunction \/ TakeFunction
  \/ LeaveOpen \/ PersonDecides \/ NobodyDecides
  \/ LoseRecords \/ GarbleRecords \/ RestoreRecords
  \/ CloseRole \/ CloseHire \/ CloseDecision \/ OpenRules

Spec == Init /\ [][Next]_vars

\* What schema/lint-people.mjs returns from the records above. The invariants below restate the
\* contract and do not mention this operator's branches, so a drift between the two fails TLC.
codeFindings ==
  IF records # "ok" THEN {}
  ELSE
    (IF ~roleOwns THEN {"role-no-function"} ELSE {})
    \union (IF hired /\ plan = "unnamed" THEN {"hire-before-plan"} ELSE {})
    \union (IF decision = "nobody" THEN {"decision-no-person"} ELSE {})

codeExit == IF closed \in codeFindings THEN 1 ELSE 0

TypeOK ==
  /\ plan \in {"unnamed", "named"}
  /\ hired \in BOOLEAN
  /\ roleOwns \in BOOLEAN
  /\ decision \in {"open", "person", "nobody"}
  /\ records \in {"ok", "missing", "malformed"}
  /\ closed \in {"none", "role-no-function", "hire-before-plan", "decision-no-person"}
  /\ crashed = FALSE
  /\ readFrom = "ventureFile"

\* Each rule fires on the fixture that breaks it, and stays silent when that fixture is absent.
RoleFiresOnFixture == (records = "ok" /\ ~roleOwns) <=> "role-no-function" \in codeFindings
HireFiresOnFixture == (records = "ok" /\ hired /\ plan = "unnamed") <=> "hire-before-plan" \in codeFindings
DecisionFiresOnFixture == (records = "ok" /\ decision = "nobody") <=> "decision-no-person" \in codeFindings

RoleStaysSilent == (records # "ok" \/ roleOwns) => "role-no-function" \notin codeFindings
HireStaysSilent == (records # "ok" \/ ~hired \/ plan = "named") => "hire-before-plan" \notin codeFindings
DecisionStaysSilent == (records # "ok" \/ decision # "nobody") => "decision-no-person" \notin codeFindings

\* A clean venture: the role owns a function, no hire is waiting on an unnamed role, and every
\* decided decision has a person. Open decisions are clean.
CleanVentureSilent ==
  (records = "ok" /\ roleOwns /\ (~hired \/ plan = "named") /\ decision # "nobody")
    => codeFindings = {}

\* Exit 1 if and only if the fail-closed rule has a finding. "none" means every rule is fail-open.
ExitIffFailClosed == codeExit = 1 <=> closed \in codeFindings

\* Missing or malformed records never crash, and a run that can read nothing reports nothing.
UnreadableNeverCrashes ==
  /\ crashed = FALSE
  /\ records \in {"missing", "malformed"} => codeFindings = {} /\ codeExit = 0

\* Record bodies come through ventureFile.
InputsOnlyViaVentureFile == readFrom = "ventureFile"

\* Ordering. These states are reachable both by hiring first and by naming the role first.
HireWhileUnnamedFires == (records = "ok" /\ hired /\ plan = "unnamed") => "hire-before-plan" \in codeFindings
HireAfterNamedSilent == (records = "ok" /\ hired /\ plan = "named") => "hire-before-plan" \notin codeFindings
====
