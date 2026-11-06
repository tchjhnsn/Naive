---- MODULE InvestorLint ----
\* The investors lint (schema/lint-investors.mjs, route investors/lint).
\* One investor update moves from draft to sent. Each action is one change a founder makes
\* and the lint run that follows it, in the same step: the CLI sees the venture only as it
\* stands when someone runs it. schema/lint-investors.mjs lint().
\*
\* One violation is loaded at a time so the chart stays readable. The code checks every
\* record it finds; the three rules do not depend on each other.

VARIABLES
  update,     \* "none" | "draft" | "sent". An item of updates on investors/<id>.json.
  numbers,    \* "none" | "unconfirmed" | "confirmed". confirmed is true only in the last.
  raise,      \* "ok" | "missing-use". A raise decision whose answer never says "use of funds".
  terms,      \* "ok" | "conflict". Terms that use a principle's forbidden words.
  records,    \* "ok" | "missing" | "malformed". A file ventureFile could not read is skipped.
  closed,     \* Rules whose naive.config.json investors_lint.rules.<id>.mode is fail-closed.
  raiseHit,   \* The raise-no-use-of-funds finding.
  termsHit,   \* The terms-conflict-alignment finding.
  updateHit,  \* The update-unconfirmed-numbers finding.
  exitCode,   \* 0 or 1. 1 only when a fail-closed rule has a finding.
  crashed,    \* TRUE if lint() threw. Missing and malformed records leave this FALSE.
  source      \* "ventureFile" or "memory". Every read goes through ventureFile.

vars == <<update, numbers, raise, terms, records, closed, raiseHit, termsHit, updateHit, exitCode, crashed, source>>

Rules == {"raise", "terms", "update"}

HitsOf(rec, rai, ter, num) ==
  IF rec # "ok" THEN [raise |-> FALSE, terms |-> FALSE, update |-> FALSE]
  ELSE [
    raise |-> rai = "missing-use",
    terms |-> ter = "conflict",
    update |-> num = "unconfirmed"]

FailOf(h, cls) ==
  \/ (h.raise /\ "raise" \in cls)
  \/ (h.terms /\ "terms" \in cls)
  \/ (h.update /\ "update" \in cls)

\* Recompute the findings from the venture after the action. lint() does this on every run.
Apply ==
  LET h == HitsOf(records', raise', terms', numbers')
  IN /\ raiseHit' = h.raise
     /\ termsHit' = h.terms
     /\ updateHit' = h.update
     /\ exitCode' = IF FailOf(h, closed') THEN 1 ELSE 0
     /\ crashed' = FALSE
     /\ source' = "ventureFile"

Init ==
  /\ update = "none" /\ numbers = "none" /\ raise = "ok" /\ terms = "ok"
  /\ records = "ok" /\ closed = {}
  /\ raiseHit = FALSE /\ termsHit = FALSE /\ updateHit = FALSE
  /\ exitCode = 0 /\ crashed = FALSE /\ source = "ventureFile"

Quiet == raise = "ok" /\ terms = "ok" /\ numbers # "unconfirmed"

\* You record a raise decision whose answer, note, options and outcomes never say "use of funds".
RecordRaiseWithoutUse ==
  /\ records = "ok" /\ Quiet /\ update = "none"
  /\ raise' = "missing-use"
  /\ UNCHANGED <<update, numbers, terms, records, closed>>
  /\ Apply

\* You add "use of funds" to the answer.
AddUseOfFunds ==
  /\ records = "ok" /\ raise = "missing-use"
  /\ raise' = "ok"
  /\ UNCHANGED <<update, numbers, terms, records, closed>>
  /\ Apply

\* Terms text contains every distinctive word of a principle that says never or must not.
RecordConflictingTerms ==
  /\ records = "ok" /\ Quiet /\ update = "none"
  /\ terms' = "conflict"
  /\ UNCHANGED <<update, numbers, raise, records, closed>>
  /\ Apply

\* You change the terms so they no longer contain those words.
AlignTerms ==
  /\ records = "ok" /\ terms = "conflict"
  /\ terms' = "ok"
  /\ UNCHANGED <<update, numbers, raise, records, closed>>
  /\ Apply

\* You draft an investor update that cites a number whose confirmed is not true.
DraftUpdate ==
  /\ records = "ok" /\ Quiet /\ update = "none"
  /\ update' = "draft" /\ numbers' = "unconfirmed"
  /\ UNCHANGED <<raise, terms, records, closed>>
  /\ Apply

\* You set confirmed: true on every number.
ConfirmNumbers ==
  /\ records = "ok" /\ numbers = "unconfirmed"
  /\ numbers' = "confirmed"
  /\ UNCHANGED <<update, raise, terms, records, closed>>
  /\ Apply

\* You send the update. Sending does not confirm numbers and does not clear a flag.
SendUpdate ==
  /\ records = "ok" /\ update = "draft"
  /\ update' = "sent"
  /\ UNCHANGED <<numbers, raise, terms, records, closed>>
  /\ Apply

\* naive.config.json sets the rule that has a finding to fail-closed.
CloseRaised ==
  /\ records = "ok" /\ raise = "missing-use"
  /\ closed' = {"raise"}
  /\ UNCHANGED <<update, numbers, raise, terms, records>>
  /\ Apply

CloseTerms ==
  /\ records = "ok" /\ terms = "conflict"
  /\ closed' = {"terms"}
  /\ UNCHANGED <<update, numbers, raise, terms, records>>
  /\ Apply

CloseUpdate ==
  /\ records = "ok" /\ numbers = "unconfirmed"
  /\ closed' = {"update"}
  /\ UNCHANGED <<update, numbers, raise, terms, records>>
  /\ Apply

\* A fail-closed rule with no finding does not fail the run.
CloseWhileClean ==
  /\ records = "ok" /\ Quiet /\ update = "none" /\ closed = {}
  /\ closed' = {"update"}
  /\ UNCHANGED <<update, numbers, raise, terms, records>>
  /\ Apply

\* You set that rule back to fail-open.
Reopen ==
  /\ closed # {}
  /\ closed' = {}
  /\ UNCHANGED <<update, numbers, raise, terms, records>>
  /\ Apply

\* A record is missing, or it is not JSON. lint() skips it and does not throw.
LoseRecord ==
  /\ records = "ok" /\ Quiet /\ update = "none" /\ closed = {}
  /\ records' = "missing"
  /\ UNCHANGED <<update, numbers, raise, terms, closed>>
  /\ Apply

GarbleRecord ==
  /\ records = "ok" /\ Quiet /\ update = "none" /\ closed = {}
  /\ records' = "malformed"
  /\ UNCHANGED <<update, numbers, raise, terms, closed>>
  /\ Apply

\* The raise decision itself will not parse, so its finding drops until the file is repaired.
GarbleRaise ==
  /\ records = "ok" /\ raise = "missing-use" /\ closed = {}
  /\ records' = "malformed"
  /\ UNCHANGED <<update, numbers, raise, terms, closed>>
  /\ Apply

RepairRecords ==
  /\ records # "ok"
  /\ records' = "ok"
  /\ UNCHANGED <<update, numbers, raise, terms, closed>>
  /\ Apply

\* Sent, numbers confirmed, nothing else wrong: nothing more happens on this update.
Done ==
  /\ update = "sent" /\ numbers = "confirmed" /\ raise = "ok" /\ terms = "ok"
  /\ records = "ok" /\ closed = {}
  /\ UNCHANGED vars

Next ==
  \/ RecordRaiseWithoutUse \/ AddUseOfFunds
  \/ RecordConflictingTerms \/ AlignTerms
  \/ DraftUpdate \/ ConfirmNumbers \/ SendUpdate
  \/ CloseRaised \/ CloseTerms \/ CloseUpdate \/ CloseWhileClean \/ Reopen
  \/ LoseRecord \/ GarbleRecord \/ GarbleRaise \/ RepairRecords
  \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ update \in {"none", "draft", "sent"}
  /\ numbers \in {"none", "unconfirmed", "confirmed"}
  /\ raise \in {"ok", "missing-use"}
  /\ terms \in {"ok", "conflict"}
  /\ records \in {"ok", "missing", "malformed"}
  /\ closed \subseteq Rules
  /\ raiseHit \in BOOLEAN /\ termsHit \in BOOLEAN /\ updateHit \in BOOLEAN
  /\ exitCode \in {0, 1}
  /\ crashed \in BOOLEAN
  /\ source \in {"ventureFile", "memory"}
  /\ (update = "none" => numbers = "none")
  /\ (numbers = "unconfirmed" => update \in {"draft", "sent"})
  /\ (numbers = "confirmed" => update \in {"draft", "sent"})

\* Each rule fires on the fixture that breaks it, and stays silent when that record is clean.
RulesMatchRecords ==
  /\ raiseHit = (records = "ok" /\ raise = "missing-use")
  /\ termsHit = (records = "ok" /\ terms = "conflict")
  /\ updateHit = (records = "ok" /\ numbers = "unconfirmed")

\* Exit 1 if and only if a fail-closed rule has findings.
ExitFollowsMode ==
  exitCode = IF \/ (raiseHit /\ "raise" \in closed)
                \/ (termsHit /\ "terms" \in closed)
                \/ (updateHit /\ "update" \in closed)
             THEN 1 ELSE 0

\* Missing or malformed records never crash the run.
NeverCrashes == crashed = FALSE

\* Inputs come only through ventureFile.
OnlyVentureFile == source = "ventureFile"

\* No path reaches sent with unconfirmed numbers and no finding.
NoSentUnflagged == (update = "sent" /\ numbers = "unconfirmed") => updateHit

====
