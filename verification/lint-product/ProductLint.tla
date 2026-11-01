---- MODULE ProductLint ----
\* Product lint (schema/lint-product.mjs, route product/lint).
\* One product record moves from unread, to read through ventureFile, to judged, to an exit code.
\* ICP jobs and the pricing record are looked up by key in inputs(). No action copies them onto the product.
\* Read is the ventureFile reads. Judge is the rule loop. Finish is process.exit.

VARIABLES
  phase,    \* "start" | "read" | "judged" | "exited"
  defect,   \* which fixture this record is
  closed,   \* TRUE when naive.config.json sets that rule's mode to fail-closed
  finding,  \* "none" or the rule id that fired
  exit,     \* 0 or 1 once phase = "exited"; 0 before that
  source,   \* "unread" or "ventureFile"
  lookup,   \* "unread" | "by-key" | "skipped"
  copied,   \* TRUE if an ICP profile was copied onto the product
  crashed   \* TRUE if a missing or malformed record aborted the run

vars == <<phase, defect, closed, finding, exit, source, lookup, copied, crashed>>

Defects == {"clean", "no-icp", "feature-no-job", "model-no-price", "malformed"}
Findings == {"none", "product-no-icp", "feature-no-job", "business-model-no-pricing"}

Init ==
  /\ phase = "start"
  /\ defect \in Defects
  /\ closed \in BOOLEAN
  /\ finding = "none"
  /\ exit = 0
  /\ source = "unread"
  /\ lookup = "unread"
  /\ copied = FALSE
  /\ crashed = FALSE

\* lint() reads product cards, foundation ICP and validation pricing through ventureFile.
Read ==
  /\ phase = "start"
  /\ phase' = "read"
  /\ source' = "ventureFile"
  /\ UNCHANGED <<defect, closed, finding, exit, lookup, copied, crashed>>

\* A malformed file is skipped (load returns null). Any other record is judged by key.
Judge ==
  /\ phase = "read"
  /\ phase' = "judged"
  /\ lookup' = IF defect = "malformed" THEN "skipped" ELSE "by-key"
  /\ finding' = CASE defect = "no-icp" -> "product-no-icp"
                  [] defect = "feature-no-job" -> "feature-no-job"
                  [] defect = "model-no-price" -> "business-model-no-pricing"
                  [] OTHER -> "none"
  /\ UNCHANGED <<defect, closed, exit, source, copied, crashed>>

\* Exit 1 only when a fail-closed rule has a finding.
Finish ==
  /\ phase = "judged"
  /\ phase' = "exited"
  /\ exit' = IF finding = "none" \/ ~closed THEN 0 ELSE 1
  /\ UNCHANGED <<defect, closed, finding, source, lookup, copied, crashed>>

\* End state. Changes nothing, so the deadlock check holds.
Done ==
  /\ phase = "exited"
  /\ UNCHANGED vars

Next == Read \/ Judge \/ Finish \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in {"start", "read", "judged", "exited"}
  /\ defect \in Defects
  /\ closed \in BOOLEAN
  /\ finding \in Findings
  /\ exit \in {0, 1}
  /\ source \in {"unread", "ventureFile"}
  /\ lookup \in {"unread", "by-key", "skipped"}
  /\ copied \in BOOLEAN
  /\ crashed \in BOOLEAN

\* Once judged, each broken fixture has fired its rule.
EachRuleFires ==
  /\ (phase \in {"judged", "exited"} /\ defect = "no-icp") => finding = "product-no-icp"
  /\ (phase \in {"judged", "exited"} /\ defect = "feature-no-job") => finding = "feature-no-job"
  /\ (phase \in {"judged", "exited"} /\ defect = "model-no-price") => finding = "business-model-no-pricing"

\* A clean venture, and a run that only skipped a broken record, have no finding.
SilentOnClean ==
  defect \in {"clean", "malformed"} => finding = "none"

\* The exit code is 1 if and only if a fail-closed rule has a finding.
ExitIffFailClosed ==
  /\ (exit = 1) => (phase = "exited" /\ finding # "none" /\ closed)
  /\ phase = "exited" => (exit = 1 <=> finding # "none" /\ closed)

\* A missing or malformed record does not abort the run, and it does not fail the run by itself.
MalformedNeverCrashes ==
  /\ crashed = FALSE
  /\ (defect = "malformed" /\ phase = "exited") => exit = 0

\* Records are read through ventureFile. Nothing is taken from memory.
InputsFromVentureFile ==
  /\ source \in {"unread", "ventureFile"}
  /\ (phase \in {"read", "judged", "exited"}) => source = "ventureFile"
  /\ phase = "start" => source = "unread"

\* Foundation records are read by key. No step copies an ICP profile onto the product.
IcpReadByKeyNeverCopied ==
  /\ copied = FALSE
  /\ (phase \in {"judged", "exited"} /\ defect # "malformed") => lookup = "by-key"
  /\ (phase \in {"judged", "exited"} /\ defect = "malformed") => lookup = "skipped"

====
