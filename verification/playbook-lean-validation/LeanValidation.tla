---- MODULE LeanValidation ----
\* States of the founder's records as the lean-validation playbook runs.
\* Each action is one call through interface/router.mjs, except CiteMissingPath,
\* which is the mistake the source check is there to catch, and Done, which
\* only holds still at the end.
\*
\* SameFile is TRUE once schema/assess-problem.mjs problemFile reads the file the
\* foundation/problem route writes. A run with SameFile == FALSE breaks
\* CheckReadsTheRecordTheTemplateWrote. TLC's shortest path for that break
\* (203 states) was: read the profile, write the claim, write the plan, read
\* the plan, file the notes, read the notes, add evidence, run the assessment.
\* Before problemFile(), assess on instance/ventures/everything-ecosystem
\* reported no problem record although foundation/problem.json is there.

VARIABLES
  icp,      \* "absent" | "provided" | "written"
  who,      \* "unread" | "read"
  claim,    \* "absent" | "draft" | "accepted"
  plan,     \* "none" | "written" | "read"
  notes,    \* "none" | "filed" | "read"
  evidence, \* "none" | "linked" | "dangling"
  learn,    \* "not checked" | "asks" | "learning" | "holds"
  sources,  \* "not checked" | "pass" | "fail"
  step

vars == <<icp, who, claim, plan, notes, evidence, learn, sources, step>>

Routes == {
  "foundation/icp",
  "foundation/problem",
  "purpose/validation/assess",
  "raw/sources/problem-interview-plan",
  "raw/sources/problem-interview-notes",
  "purpose/raw/text/problem-interview-notes"
}

\* Flip this to FALSE to see the file mismatch. The code fix makes it TRUE.
SameFile == TRUE

Init ==
  /\ icp \in {"absent", "provided"}
  /\ who = "unread"
  /\ claim = "absent"
  /\ plan = "none"
  /\ notes = "none"
  /\ evidence = "none"
  /\ learn = "not checked"
  /\ sources = "not checked"
  /\ step = "none"

fresh == learn' = "not checked" /\ sources' = "not checked"

WriteIcp ==
  /\ icp = "absent"
  /\ icp' = "written"
  /\ step' = "foundation/icp"
  /\ fresh
  /\ UNCHANGED <<who, claim, plan, notes, evidence>>

ReadIcp ==
  /\ icp \in {"provided", "written"}
  /\ who = "unread"
  /\ who' = "read"
  /\ step' = "foundation/icp"
  /\ UNCHANGED <<icp, claim, plan, notes, evidence, learn, sources>>

PersonWritesClaim ==
  /\ who = "read"
  /\ claim = "absent"
  /\ claim' = "accepted"
  /\ step' = "foundation/problem"
  /\ fresh
  /\ UNCHANGED <<icp, who, plan, notes, evidence>>

AgentDraftsClaim ==
  /\ who = "read"
  /\ claim = "absent"
  /\ claim' = "draft"
  /\ step' = "foundation/problem"
  /\ fresh
  /\ UNCHANGED <<icp, who, plan, notes, evidence>>

AcceptClaim ==
  /\ claim = "draft"
  /\ claim' = "accepted"
  /\ step' = "foundation/problem"
  /\ fresh
  /\ UNCHANGED <<icp, who, plan, notes, evidence>>

WritePlan ==
  /\ claim = "accepted"
  /\ plan = "none"
  /\ plan' = "written"
  /\ step' = "raw/sources/problem-interview-plan"
  /\ UNCHANGED <<icp, who, claim, notes, evidence, learn, sources>>

ReadPlan ==
  /\ plan = "written"
  /\ plan' = "read"
  /\ step' = "raw/sources/problem-interview-plan"
  /\ UNCHANGED <<icp, who, claim, notes, evidence, learn, sources>>

FileNotes ==
  /\ plan = "read"
  /\ notes = "none"
  /\ notes' = "filed"
  /\ step' = "raw/sources/problem-interview-notes"
  /\ UNCHANGED <<icp, who, claim, plan, evidence, learn, sources>>

ReadNotes ==
  /\ notes = "filed"
  /\ notes' = "read"
  /\ step' = "purpose/raw/text/problem-interview-notes"
  /\ UNCHANGED <<icp, who, claim, plan, evidence, learn, sources>>

WriteEvidence ==
  /\ notes = "read"
  /\ claim = "accepted"
  /\ evidence = "none"
  /\ evidence' = "linked"
  /\ step' = "foundation/problem"
  /\ fresh
  /\ UNCHANGED <<icp, who, claim, plan, notes>>

\* The notes are on file, and the evidence cites some other path. The source check fails.
CiteMissingPath ==
  /\ notes = "read"
  /\ claim = "accepted"
  /\ evidence = "none"
  /\ evidence' = "dangling"
  /\ step' = "foundation/problem"
  /\ fresh
  /\ UNCHANGED <<icp, who, claim, plan, notes>>

RepairCite ==
  /\ evidence = "dangling"
  /\ notes = "read"
  /\ evidence' = "linked"
  /\ step' = "foundation/problem"
  /\ fresh
  /\ UNCHANGED <<icp, who, claim, plan, notes>>

\* A complete claim with no evidence still asks: preflight lists every assumption
\* that has no item. "learning" is the result only after the founder chooses as-is.
AssessResult == IF claim = "accepted" /\ evidence = "linked" THEN "holds" ELSE "asks"

SourceResult == IF evidence = "dangling" THEN "fail" ELSE "pass"

RunAssess ==
  /\ learn # AssessResult
  /\ learn' = AssessResult
  /\ step' = "purpose/validation/assess"
  /\ UNCHANGED <<icp, who, claim, plan, notes, evidence, sources>>

\* mentura purpose/validation/assess run --as-is. Only when the founder chooses it.
RunAsIs ==
  /\ claim = "accepted"
  /\ evidence = "none"
  /\ plan = "none"
  /\ learn # "learning"
  /\ learn' = "learning"
  /\ step' = "purpose/validation/assess"
  /\ UNCHANGED <<icp, who, claim, plan, notes, evidence, sources>>

RunSourceCheck ==
  /\ sources # SourceResult
  /\ sources' = SourceResult
  /\ step' = "foundation/problem"
  /\ UNCHANGED <<icp, who, claim, plan, notes, evidence, learn>>

Success ==
  /\ evidence = "linked"
  /\ notes = "read"
  /\ plan = "read"
  /\ claim = "accepted"
  /\ who = "read"
  /\ learn = "holds"
  /\ sources = "pass"

Done == Success /\ UNCHANGED vars

Next ==
  \/ WriteIcp
  \/ ReadIcp
  \/ PersonWritesClaim
  \/ AgentDraftsClaim
  \/ AcceptClaim
  \/ WritePlan
  \/ ReadPlan
  \/ FileNotes
  \/ ReadNotes
  \/ WriteEvidence
  \/ CiteMissingPath
  \/ RepairCite
  \/ RunAssess
  \/ RunAsIs
  \/ RunSourceCheck
  \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ icp \in {"absent", "provided", "written"}
  /\ who \in {"unread", "read"}
  /\ claim \in {"absent", "draft", "accepted"}
  /\ plan \in {"none", "written", "read"}
  /\ notes \in {"none", "filed", "read"}
  /\ evidence \in {"none", "linked", "dangling"}
  /\ learn \in {"not checked", "asks", "learning", "holds"}
  /\ sources \in {"not checked", "pass", "fail"}
  /\ step \in Routes \cup {"none"}

RouteExists == step \in Routes \cup {"none"}

WhoWasProvided == who = "read" => icp \in {"provided", "written"}

PlanFollowsClaim == plan \in {"written", "read"} => claim = "accepted"

NotesFollowPlan == notes \in {"filed", "read"} => plan = "read"

EvidenceFollowsNotes == evidence = "linked" => notes = "read"

CheckAgrees ==
  /\ learn \in {"not checked", "asks", "learning", "holds"}
  /\ (learn = "asks" => AssessResult = "asks")
  /\ (learn = "holds" => AssessResult = "holds")
  /\ (learn = "learning" => claim = "accepted" /\ evidence # "linked")
  /\ (sources # "not checked" => sources = SourceResult)

CheckReadsTheRecordTheTemplateWrote == learn = "holds" => SameFile
====
