---- MODULE HubspotInbound ----
\* The hubspot-inbound playbook (packages/marketing/playbooks/hubspot-inbound.md).
\* One step is one template step. A comment names the Naive route.
\* Routes were read from `node interface/router.mjs` on this branch.
\* The venture provides sitemap, icp, problem, product, and publication policy,
\* except for two starts: no sitemap, and no ICP. Those starts stop.
\* They do not read the missing record.
\* marketing/content has no write action. WriteDrafts writes the file that route reads.
\* A check outcome is computed from a knob, so a check that always passes fails
\* ChecksCanPassOrFail.

EXTENDS Sequences

VARIABLES
  step,       \* which template step has finished
  available,  \* records the venture provided, or an earlier step wrote
  readLog,    \* routes read, in order
  wrote,      \* routes whose files a step wrote
  outcome     \* "none", "pass", or "fail"

vars == <<step, available, readLog, wrote, outcome>>

Routes == {
  "marketing/sitemap",
  "foundation/icp",
  "foundation/problem",
  "marketing/design-system/inputs",
  "product",
  "product/[id]",
  "marketing/voice",
  "governance/publication-policy",
  "marketing/content",
  "operations/marketing/public"
}

\* Records a step can read. Commands are routes too, and they are always there.
RecordRoutes == {
  "marketing/sitemap",
  "foundation/icp",
  "foundation/problem",
  "product",
  "product/[id]",
  "governance/publication-policy",
  "marketing/content"
}

Provided == {
  "marketing/sitemap",
  "foundation/icp",
  "foundation/problem",
  "product",
  "governance/publication-policy"
}

\* What the plan step requires to have been read already.
NeededBeforePlan == {
  "marketing/sitemap",
  "foundation/icp",
  "foundation/problem",
  "marketing/design-system/inputs",
  "product",
  "product/[id]",
  "marketing/voice",
  "governance/publication-policy"
}

\* Knobs a founder can set. Each check passes for one knob and fails for another.
AudienceOutcome(k) == IF k = "known" THEN "pass" ELSE "fail"
StageOutcome(k) ==
  IF k \in {"awareness", "consideration", "decision", "onboarding", "adoption", "retention", "advocacy"}
  THEN "pass" ELSE "fail"
GateOutcome(k) == IF k \in {"draft", "approved"} THEN "pass" ELSE "fail"
VoiceOutcome(k) == IF k = "plain" THEN "pass" ELSE "fail"
PillarOutcome(k) == IF k = "readable" THEN "pass" ELSE "fail"

Init ==
  /\ step = "start"
  /\ available \in {
       Provided,
       Provided \ {"marketing/sitemap"},
       Provided \ {"foundation/icp"}
     }
  /\ readLog = <<>>
  /\ wrote = {}
  /\ outcome = "none"

Read(route, from, to) ==
  /\ step = from
  /\ route \in Routes
  /\ route \in available
  /\ readLog' = Append(readLog, route)
  /\ step' = to
  /\ UNCHANGED <<available, wrote, outcome>>

\* Step 1. Read marketing/sitemap. Refuse the read when the venture has none.
ReadSitemap == Read("marketing/sitemap", "start", "sitemap")
StopNoSitemap ==
  /\ step = "start"
  /\ "marketing/sitemap" \notin available
  /\ step' = "stopped"
  /\ UNCHANGED <<available, readLog, wrote, outcome>>

\* Step 2. Read foundation/icp. Stop when the venture has none.
ReadIcp == Read("foundation/icp", "sitemap", "people")
StopNoIcp ==
  /\ step = "sitemap"
  /\ "foundation/icp" \notin available
  /\ step' = "stopped"
  /\ UNCHANGED <<available, readLog, wrote, outcome>>

\* Steps 3 to 7. Each read is enabled only when the record is already available,
\* or the route is a command.
ReadProblem == Read("foundation/problem", "people", "problem")
ReadInputs ==
  /\ step = "problem"
  /\ "marketing/design-system/inputs" \in Routes
  /\ readLog' = Append(readLog, "marketing/design-system/inputs")
  /\ step' = "inputs"
  /\ UNCHANGED <<available, wrote, outcome>>

\* The list provides the item route. The item read comes after that.
ReadProduct ==
  /\ step = "inputs"
  /\ "product" \in available
  /\ "product" \in Routes
  /\ "product/[id]" \in Routes
  /\ readLog' = Append(readLog, "product")
  /\ available' = available \union {"product/[id]"}
  /\ step' = "offer"
  /\ UNCHANGED <<wrote, outcome>>
ReadProductItem == Read("product/[id]", "offer", "offerItem")
ReadVoice ==
  /\ step = "offerItem"
  /\ "marketing/voice" \in Routes
  /\ readLog' = Append(readLog, "marketing/voice")
  /\ step' = "voice"
  /\ UNCHANGED <<available, wrote, outcome>>
ReadPolicy == Read("governance/publication-policy", "voice", "policy")

\* Step 8. Fill the table from routes already read. It writes no route.
FillPlan ==
  /\ step = "policy"
  /\ step' = "planned"
  /\ UNCHANGED <<available, readLog, wrote, outcome>>

\* Step 9. Write the files marketing/content reads.
WriteDrafts ==
  /\ step = "planned"
  /\ "marketing/content" \in Routes
  /\ "marketing/content" \notin available
  /\ available' = available \union {"marketing/content"}
  /\ wrote' = wrote \union {"marketing/content"}
  /\ step' = "drafted"
  /\ UNCHANGED <<readLog, outcome>>

\* Step 10. Read the drafts, run the public gate, run voice again.
\* Both outcomes stay enabled, because each check has a passing knob and a failing knob.
Check(result) ==
  /\ step = "drafted"
  /\ "marketing/content" \in available
  /\ result \in {"pass", "fail"}
  /\ result = "pass" =>
       /\ AudienceOutcome("known") = "pass"
       /\ StageOutcome("awareness") = "pass"
       /\ GateOutcome("draft") = "pass"
       /\ VoiceOutcome("plain") = "pass"
       /\ PillarOutcome("readable") = "pass"
  /\ result = "fail" =>
       \/ AudienceOutcome("unknown") = "fail"
       \/ StageOutcome("missing") = "fail"
       \/ GateOutcome("published-no-approver") = "fail"
       \/ VoiceOutcome("avoid") = "fail"
       \/ PillarOutcome("hidden") = "fail"
  /\ readLog' = Append(Append(Append(readLog, "marketing/content"), "operations/marketing/public"), "marketing/voice")
  /\ outcome' = result
  /\ step' = IF result = "pass" THEN "passed" ELSE "failed"
  /\ UNCHANGED <<available, wrote>>
CheckPass == Check("pass")
CheckFail == Check("fail")

Done == step \in {"passed", "failed", "stopped"} /\ UNCHANGED vars

Next ==
  \/ ReadSitemap
  \/ StopNoSitemap
  \/ ReadIcp
  \/ StopNoIcp
  \/ ReadProblem
  \/ ReadInputs
  \/ ReadProduct
  \/ ReadProductItem
  \/ ReadVoice
  \/ ReadPolicy
  \/ FillPlan
  \/ WriteDrafts
  \/ CheckPass
  \/ CheckFail
  \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ step \in {
       "start", "sitemap", "people", "problem", "inputs", "offer", "offerItem",
       "voice", "policy", "planned", "drafted", "passed", "failed", "stopped"
     }
  /\ outcome \in {"none", "pass", "fail"}
  /\ available \subseteq Routes
  /\ wrote \subseteq Routes
  /\ readLog \in Seq(Routes)

\* Every route a step reads or writes is a route in the table above.
EveryStepNamesARealRoute ==
  /\ \A i \in DOMAIN readLog : readLog[i] \in Routes
  /\ wrote \subseteq Routes

\* A record read is in `available`: the venture provided it, or an earlier step wrote it.
\* Command routes are not records, so this rule does not apply to them.
NoReadBeforeItExists ==
  \A i \in DOMAIN readLog :
    readLog[i] \in RecordRoutes => readLog[i] \in available

\* The plan is filled only after the routes it uses have been read.
PlanOnlyFromWhatWasRead ==
  step \in {"planned", "drafted", "passed", "failed"} =>
    NeededBeforePlan \subseteq {readLog[i] : i \in DOMAIN readLog}

\* The checks read the drafts and run the public gate.
ChecksReadTheDrafts ==
  step \in {"passed", "failed"} =>
    {"marketing/content", "operations/marketing/public", "marketing/voice"}
      \subseteq {readLog[i] : i \in DOMAIN readLog}

\* Each check has a knob that passes and a knob that fails.
ChecksCanPassOrFail ==
  /\ \E k \in {"known", "unknown"} : AudienceOutcome(k) = "pass"
  /\ \E k \in {"known", "unknown"} : AudienceOutcome(k) = "fail"
  /\ \E k \in {"awareness", "missing"} : StageOutcome(k) = "pass"
  /\ \E k \in {"awareness", "missing"} : StageOutcome(k) = "fail"
  /\ \E k \in {"draft", "published-no-approver"} : GateOutcome(k) = "pass"
  /\ \E k \in {"draft", "published-no-approver"} : GateOutcome(k) = "fail"
  /\ \E k \in {"plain", "avoid"} : VoiceOutcome(k) = "pass"
  /\ \E k \in {"plain", "avoid"} : VoiceOutcome(k) = "fail"
  /\ \E k \in {"readable", "hidden"} : PillarOutcome(k) = "pass"
  /\ \E k \in {"readable", "hidden"} : PillarOutcome(k) = "fail"
====
