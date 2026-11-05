---- MODULE LegalLint ----
\* Legal lint (schema/lint-legal.mjs). This is a lint, not legal advice.
\* One run reads a public claim and a founder agreement through ventureFile, applies
\* naive.config.json legal_lint.rules.<id>.mode, then exits.
\* Each action is one step of lint(); the comment names the code.

VARIABLES
  phase,            \* ready, seen-claim, seen-agreement, configured, judged, done
  claim,            \* none, sourced, unsourced, draft, malformed
  agreement,        \* none, linked, unlinked, malformed
  claimMode,        \* fail-open or fail-closed, after the config rule
  agreementMode,
  claimFinding,     \* the unsourced-public-claim rule has a finding
  agreementFinding, \* the agreement-no-counterparty rule has a finding
  code,             \* process exit code: 0 or 1. A crash is not a value here.
  channel           \* where the run read the records: unset, then ventureFile

vars == <<phase, claim, agreement, claimMode, agreementMode, claimFinding, agreementFinding, code, channel>>

Init ==
  /\ phase = "ready"
  /\ claim = "none"
  /\ agreement = "none"
  /\ claimMode = "fail-open"
  /\ agreementMode = "fail-open"
  /\ claimFinding = FALSE
  /\ agreementFinding = FALSE
  /\ code = 0
  /\ channel = "unset"

\* walkMdx + claimOf. Missing file, a draft, a sourced claim, an unsourced public claim, or bytes that do not parse.
SeeClaim ==
  /\ phase = "ready"
  /\ claim' \in {"none", "sourced", "unsourced", "draft", "malformed"}
  /\ phase' = "seen-claim"
  /\ channel' = "ventureFile"
  /\ UNCHANGED <<agreement, claimMode, agreementMode, claimFinding, agreementFinding, code>>

\* partiesOf on governance/founder-agreement.json. Missing, linked, unlinked, or unreadable.
SeeAgreement ==
  /\ phase = "seen-claim"
  /\ agreement' \in {"none", "linked", "unlinked", "malformed"}
  /\ phase' = "seen-agreement"
  /\ channel' = "ventureFile"
  /\ UNCHANGED <<claim, claimMode, agreementMode, claimFinding, agreementFinding, code>>

\* modesOf. An unknown mode string is ignored, so the value here is the mode that remains.
ApplyModes ==
  /\ phase = "seen-agreement"
  /\ claimMode' \in {"fail-open", "fail-closed"}
  /\ agreementMode' \in {"fail-open", "fail-closed"}
  /\ phase' = "configured"
  /\ channel' = "ventureFile"
  /\ UNCHANGED <<claim, agreement, claimFinding, agreementFinding, code>>

\* A finding is recorded only for an unsourced public claim, or an agreement with no counterparty record.
Judge ==
  /\ phase = "configured"
  /\ claimFinding' = (claim = "unsourced")
  /\ agreementFinding' = (agreement = "unlinked")
  /\ phase' = "judged"
  /\ UNCHANGED <<claim, agreement, claimMode, agreementMode, code, channel>>

\* process.exit: 1 if and only if a fail-closed rule has findings.
Exit ==
  /\ phase = "judged"
  /\ code' = IF (claimFinding /\ claimMode = "fail-closed") \/ (agreementFinding /\ agreementMode = "fail-closed") THEN 1 ELSE 0
  /\ phase' = "done"
  /\ UNCHANGED <<claim, agreement, claimMode, agreementMode, claimFinding, agreementFinding, channel>>

\* The run is over. Stays here so the end state is not a deadlock.
Done ==
  /\ phase = "done"
  /\ UNCHANGED vars

Next == SeeClaim \/ SeeAgreement \/ ApplyModes \/ Judge \/ Exit \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in {"ready", "seen-claim", "seen-agreement", "configured", "judged", "done"}
  /\ claim \in {"none", "sourced", "unsourced", "draft", "malformed"}
  /\ agreement \in {"none", "linked", "unlinked", "malformed"}
  /\ claimMode \in {"fail-open", "fail-closed"}
  /\ agreementMode \in {"fail-open", "fail-closed"}
  /\ claimFinding \in BOOLEAN
  /\ agreementFinding \in BOOLEAN
  /\ code \in {0, 1}
  /\ channel \in {"unset", "ventureFile"}

\* After judgment, the claim rule has a finding exactly when the record is a public claim with no source.
UnsourcedClaimFires ==
  (phase \in {"judged", "done"}) => (claimFinding <=> (claim = "unsourced"))

\* After judgment, the agreement rule has a finding exactly when the agreement has no counterparty record.
UnlinkedAgreementFires ==
  (phase \in {"judged", "done"}) => (agreementFinding <=> (agreement = "unlinked"))

\* A missing, sourced, draft, or unreadable claim is silent. A missing, linked, or unreadable agreement is silent.
CleanStaysSilent ==
  (phase \in {"judged", "done"}) =>
    /\ ((claim \in {"none", "sourced", "draft", "malformed"}) => ~claimFinding)
    /\ ((agreement \in {"none", "linked", "malformed"}) => ~agreementFinding)

\* Exit code is 1 if and only if a fail-closed rule has findings. Until then the code is 0.
ExitIffFailClosed ==
  /\ ((phase # "done") => (code = 0))
  /\ ((phase = "done") =>
       (code = 1 <=> ((claimFinding /\ claimMode = "fail-closed") \/ (agreementFinding /\ agreementMode = "fail-closed"))))

\* Malformed records never crash, and an unreadable record adds no finding.
MalformedNeverCrashes ==
  /\ code \in {0, 1}
  /\ ((phase \in {"judged", "done"} /\ claim = "malformed") => ~claimFinding)
  /\ ((phase \in {"judged", "done"} /\ agreement = "malformed") => ~agreementFinding)

\* Every read goes through ventureFile. Before the first read the channel is still unset.
ReadsUseVentureFile ==
  (phase = "ready" /\ channel = "unset") \/ (phase # "ready" /\ channel = "ventureFile")

====
