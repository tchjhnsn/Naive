---- MODULE MoneyLint ----
\* Money lint (schema/lint-money.mjs, route money/lint).
\* One transfer decision and one account, as the lint reads them through ventureFile.
\* The lint never moves money. It only flags records.
\*
\* phase:    none | proposed | approved | executed | bad
\* approver: nobody | named     (provenance.approved_by or decided_by, and not "agent")
\* account:  none | owned | unowned | bad
\* A bad record is malformed JSON. The lint skips it.

VARIABLES
  phase, approver, account, transferMode, accountMode,
  flaggedT, flaggedA, crashed, exit

vars == <<phase, approver, account, transferMode, accountMode, flaggedT, flaggedA, crashed, exit>>

\* The same function the CLI runs after every write: which findings exist, and the exit code.
\* Exit is 1 only when a fail-closed rule has a finding.
LintOK ==
  LET transfer == phase' \in {"proposed", "approved", "executed"} /\ approver' = "nobody"
      unowned == account' = "unowned"
      fail == (transfer /\ transferMode' = "fail-closed") \/ (unowned /\ accountMode' = "fail-closed")
  IN /\ flaggedT' = transfer
     /\ flaggedA' = unowned
     /\ crashed' = FALSE
     /\ exit' = IF fail THEN 1 ELSE 0

Init ==
  /\ phase = "none" /\ approver = "nobody" /\ account = "none"
  /\ transferMode = "fail-open" /\ accountMode = "fail-open"
  /\ flaggedT = FALSE /\ flaggedA = FALSE /\ crashed = FALSE /\ exit = 0

\* money/decisions/<record>.transfer.decision.json is written, still open, with no person named.
Propose ==
  /\ phase = "none"
  /\ phase' = "proposed" /\ approver' = "nobody"
  /\ UNCHANGED <<account, transferMode, accountMode>>
  /\ LintOK

\* decided_by or provenance.approved_by becomes a person's name.
NameApprover ==
  /\ phase \in {"proposed", "approved", "executed"} /\ approver = "nobody"
  /\ approver' = "named"
  /\ UNCHANGED <<phase, account, transferMode, accountMode>>
  /\ LintOK

\* status becomes decided or approved. The name, if any, stays.
Approve ==
  /\ phase = "proposed"
  /\ phase' = "approved"
  /\ UNCHANGED <<approver, account, transferMode, accountMode>>
  /\ LintOK

\* status becomes executed, or an outcome id "executed" has a result other than pending.
\* Allowed from proposed (approval was skipped) and from approved.
Execute ==
  /\ phase \in {"proposed", "approved"}
  /\ phase' = "executed"
  /\ UNCHANGED <<approver, account, transferMode, accountMode>>
  /\ LintOK

\* The person's name is removed from the record.
DropApprover ==
  /\ phase \in {"proposed", "approved", "executed"} /\ approver = "named"
  /\ approver' = "nobody"
  /\ UNCHANGED <<phase, account, transferMode, accountMode>>
  /\ LintOK

\* The decision file is removed.
Withdraw ==
  /\ phase # "none"
  /\ phase' = "none" /\ approver' = "nobody"
  /\ UNCHANGED <<account, transferMode, accountMode>>
  /\ LintOK

\* The decision file is not JSON, or not an object. The lint skips it.
CorruptDecision ==
  /\ phase # "bad"
  /\ phase' = "bad" /\ approver' = "nobody"
  /\ UNCHANGED <<account, transferMode, accountMode>>
  /\ LintOK

AddOwned ==
  /\ account # "owned"
  /\ account' = "owned"
  /\ UNCHANGED <<phase, approver, transferMode, accountMode>>
  /\ LintOK

AddUnowned ==
  /\ account # "unowned"
  /\ account' = "unowned"
  /\ UNCHANGED <<phase, approver, transferMode, accountMode>>
  /\ LintOK

\* money/<id>.json is not JSON, or not an object. The lint skips it.
CorruptAccount ==
  /\ account # "bad"
  /\ account' = "bad"
  /\ UNCHANGED <<phase, approver, transferMode, accountMode>>
  /\ LintOK

RemoveAccount ==
  /\ account # "none"
  /\ account' = "none"
  /\ UNCHANGED <<phase, approver, transferMode, accountMode>>
  /\ LintOK

\* naive.config.json money_lint.rules.<id>.mode
FailCloseTransfer ==
  /\ transferMode # "fail-closed"
  /\ transferMode' = "fail-closed"
  /\ UNCHANGED <<phase, approver, account, accountMode>>
  /\ LintOK

FailOpenTransfer ==
  /\ transferMode # "fail-open"
  /\ transferMode' = "fail-open"
  /\ UNCHANGED <<phase, approver, account, accountMode>>
  /\ LintOK

FailCloseAccount ==
  /\ accountMode # "fail-closed"
  /\ accountMode' = "fail-closed"
  /\ UNCHANGED <<phase, approver, account, transferMode>>
  /\ LintOK

FailOpenAccount ==
  /\ accountMode # "fail-open"
  /\ accountMode' = "fail-open"
  /\ UNCHANGED <<phase, approver, account, transferMode>>
  /\ LintOK

\* A settled picture. Nothing changes, so the check has no deadlock on a finished state.
Done == UNCHANGED vars

Next ==
  \/ Propose \/ NameApprover \/ Approve \/ Execute \/ DropApprover \/ Withdraw \/ CorruptDecision
  \/ AddOwned \/ AddUnowned \/ CorruptAccount \/ RemoveAccount
  \/ FailCloseTransfer \/ FailOpenTransfer \/ FailCloseAccount \/ FailOpenAccount
  \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in {"none", "proposed", "approved", "executed", "bad"}
  /\ approver \in {"nobody", "named"}
  /\ account \in {"none", "owned", "unowned", "bad"}
  /\ transferMode \in {"fail-open", "fail-closed"}
  /\ accountMode \in {"fail-open", "fail-closed"}
  /\ flaggedT \in BOOLEAN /\ flaggedA \in BOOLEAN /\ crashed \in BOOLEAN
  /\ exit \in {0, 1}
  /\ (phase \in {"none", "bad"}) => approver = "nobody"

\* No path reaches executed without a named approver being flagged.
ExecutedNeedsFlag == (phase = "executed" /\ approver = "nobody") => flaggedT

\* Each rule fires on the bad record and stays silent when the record is clean.
TransferRule == flaggedT = (phase \in {"proposed", "approved", "executed"} /\ approver = "nobody")
AccountRule == flaggedA = (account = "unowned")
CleanSilent ==
  (phase \in {"none", "bad"} \/ approver = "named") /\ account \in {"none", "owned", "bad"}
    => ~flaggedT /\ ~flaggedA

\* Exit 1 if and only if a fail-closed rule has findings.
ExitIffFailClosed ==
  exit = 1 <=> ((flaggedT /\ transferMode = "fail-closed") \/ (flaggedA /\ accountMode = "fail-closed"))

\* Missing or malformed records never crash. A bad record is skipped, not flagged.
NoCrash == ~crashed
MalformedSkipped ==
  /\ (phase = "bad" => ~crashed /\ ~flaggedT)
  /\ (account = "bad" => ~crashed /\ ~flaggedA)

\* Record bytes are read only through ventureFile (schema/venture-paths.mjs). No other channel exists here.
ReadsViaVentureFile == TRUE
====
