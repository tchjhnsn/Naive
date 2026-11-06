---- MODULE FoundationLint ----
\* One foundation-lint run (schema/lint-foundation.mjs, route foundation/lint).
\* Load reads the venture only through ventureFile. Judge fires a rule on its fixture
\* and stays silent on a clean venture. A missing or malformed record is skipped.
\* Finish exits 1 only when a fail-closed rule has a finding. The mode is
\* naive.config.json foundation_lint.rules.<id>.mode, else fail-open.

VARIABLES
  step,       \* "start", "loaded", "judged", "done"
  readBy,     \* "none" until Load, then "ventureFile"
  shape,      \* which records this run saw
  closed,     \* TRUE when the rule that can fire is fail-closed
  finding,    \* "none" or the rule id Judge emitted
  exitCode    \* 0 or 1

vars == <<step, readBy, shape, closed, finding, exitCode>>

Shapes == {"clean", "mission", "icp", "alignment", "form", "missing", "malformed"}

RuleOf(s) ==
  CASE s = "mission" -> "mission-names-no-icp"
    [] s = "icp" -> "icp-no-jobs"
    [] s = "alignment" -> "alignment-no-check"
    [] s = "form" -> "problem-form-no-icp"
    [] OTHER -> "none"

Init ==
  /\ step = "start"
  /\ readBy = "none"
  /\ finding = "none"
  /\ exitCode = 0
  /\ shape \in Shapes
  /\ closed \in BOOLEAN

\* schema/lint-foundation.mjs loadRecord and icpProfiles: every path goes through ventureFile.
Load ==
  /\ step = "start"
  /\ step' = "loaded"
  /\ readBy' = "ventureFile"
  /\ UNCHANGED <<shape, closed, finding, exitCode>>

\* lint() adds a finding only for a readable record that breaks its rule.
Judge ==
  /\ step = "loaded"
  /\ step' = "judged"
  /\ finding' = RuleOf(shape)
  /\ UNCHANGED <<readBy, shape, closed, exitCode>>

\* process.exit: 1 if and only if some finding's mode is fail-closed.
Finish ==
  /\ step = "judged"
  /\ step' = "done"
  /\ exitCode' = IF finding # "none" /\ closed THEN 1 ELSE 0
  /\ UNCHANGED <<readBy, shape, closed, finding>>

Done == step = "done" /\ UNCHANGED vars

Next == Load \/ Judge \/ Finish \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ step \in {"start", "loaded", "judged", "done"}
  /\ readBy \in {"none", "ventureFile"}
  /\ shape \in Shapes
  /\ closed \in BOOLEAN
  /\ finding \in {"none", "mission-names-no-icp", "icp-no-jobs", "alignment-no-check", "problem-form-no-icp"}
  /\ exitCode \in {0, 1}

\* Inputs come only through ventureFile. A run that has left start has read that way.
InputsViaVentureFile == step = "start" \/ readBy = "ventureFile"

\* Each rule fires on its fixture.
FixtureFires == step \in {"judged", "done"} =>
  /\ (shape = "mission" => finding = "mission-names-no-icp")
  /\ (shape = "icp" => finding = "icp-no-jobs")
  /\ (shape = "alignment" => finding = "alignment-no-check")
  /\ (shape = "form" => finding = "problem-form-no-icp")

\* A clean venture produces no finding.
SilentOnClean == (step \in {"judged", "done"} /\ shape = "clean") => finding = "none"

\* A missing or malformed record is skipped: no finding, and the run still finishes.
GapSkipped == (step \in {"judged", "done"} /\ shape \in {"missing", "malformed"}) => finding = "none"

\* The run never crashes. exitCode stays 0 or 1 and step stays in the four phases.
NoCrash == exitCode \in {0, 1} /\ step \in {"start", "loaded", "judged", "done"}

\* Exit 1 if and only if a fail-closed rule has a finding.
ExitIffFailClosed == step = "done" => (exitCode = 1 <=> (finding # "none" /\ closed))
====
