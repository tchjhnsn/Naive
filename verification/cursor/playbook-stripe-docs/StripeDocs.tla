---- MODULE StripeDocs ----
\* The stripe-docs playbook (packages/product/playbooks/stripe-docs.md).
\* Each action is one template step. The comment names the Naive route.
\* RealRoutes is the set replay.mjs checks against `node interface/router.mjs`.
\* A step that only discovers a missing record (StopNoReader) records the route
\* and does not treat the profile as provided.

EXTENDS FiniteSets

VARIABLES
  phase,       \* where the founder's records are
  have,        \* records the venture or an earlier step has provided
  specFull,    \* the spec answer has all five sections filled
  offered,     \* product.offered_to names the profile that was read
  check,       \* "none", "pass", or "fail"
  routesUsed   \* routes the steps have read or written

vars == <<phase, have, specFull, offered, check, routesUsed>>

RealRoutes == {
  "foundation/icp",
  "product",
  "product/[id]",
  "decisions",
  "decisions/[id]",
  "glossary/[id]"
}

Phases == {
  "start", "stopped",
  "reader", "listed",
  "card", "card-unlinked",
  "spec", "spec-thin", "spec-unlinked",
  "terms", "terms-thin", "terms-unlinked",
  "habit", "habit-thin", "habit-unlinked",
  "passed", "failed-thin", "failed-unlinked",
  "entry", "seen"
}

Init ==
  /\ phase = "start"
  /\ check = "none"
  /\ routesUsed = {}
  /\ specFull = FALSE
  /\ offered = FALSE
  /\ have \in {{"icp"}, {}}

\* Read foundation/icp. The venture provided the profile.
ReadReader ==
  /\ phase = "start"
  /\ "icp" \in have
  /\ phase' = "reader"
  /\ routesUsed' = routesUsed \cup {"foundation/icp"}
  /\ UNCHANGED <<have, specFull, offered, check>>

\* Read foundation/icp and find no record. Stop. Do not use a profile id.
StopNoReader ==
  /\ phase = "start"
  /\ "icp" \notin have
  /\ phase' = "stopped"
  /\ routesUsed' = routesUsed \cup {"foundation/icp"}
  /\ UNCHANGED <<have, specFull, offered, check>>

\* Read product. An empty list is still this route. It does not require a card.
ReadProductList ==
  /\ phase = "reader"
  /\ phase' = "listed"
  /\ routesUsed' = routesUsed \cup {"product"}
  /\ UNCHANGED <<have, specFull, offered, check>>

\* Write product/[id] with offered_to set to the profile id from ReadReader.
WriteCardLinked ==
  /\ phase = "listed"
  /\ "icp" \in have
  /\ phase' = "card"
  /\ have' = have \cup {"product"}
  /\ offered' = TRUE
  /\ routesUsed' = routesUsed \cup {"product/[id]"}
  /\ UNCHANGED <<specFull, check>>

\* Write product/[id] and leave offered_to empty or pointing at an id that was not read.
WriteCardUnlinked ==
  /\ phase = "listed"
  /\ "icp" \in have
  /\ phase' = "card-unlinked"
  /\ have' = have \cup {"product"}
  /\ offered' = FALSE
  /\ routesUsed' = routesUsed \cup {"product/[id]"}
  /\ UNCHANGED <<specFull, check>>

ProposeSpec(full, from, to) ==
  /\ phase = from
  /\ phase' = to
  /\ have' = have \cup {"spec"}
  /\ specFull' = full
  /\ routesUsed' = routesUsed \cup {"decisions/[id]"}
  /\ UNCHANGED <<offered, check>>

\* Propose decisions/docs-spec with every section filled. No `at`. Status stays open.
ProposeSpecFull == ProposeSpec(TRUE, "card", "spec")

\* Propose decisions/docs-spec and leave a section blank.
ProposeSpecThin == ProposeSpec(FALSE, "card", "spec-thin")

\* The card names no reader, and the spec itself is complete.
ProposeSpecUnlinked == ProposeSpec(TRUE, "card-unlinked", "spec-unlinked")

WriteTerms(from, to) ==
  /\ phase = from
  /\ "spec" \in have
  /\ phase' = to
  /\ have' = have \cup {"glossary"}
  /\ routesUsed' = routesUsed \cup {"glossary/[id]"}
  /\ UNCHANGED <<specFull, offered, check>>

\* Write glossary/product from the objects line. The spec has to be on file.
WriteTermsFull == WriteTerms("spec", "terms")
WriteTermsThin == WriteTerms("spec-thin", "terms-thin")
WriteTermsUnlinked == WriteTerms("spec-unlinked", "terms-unlinked")

ProposeHabit(from, to) ==
  /\ phase = from
  /\ "glossary" \in have
  /\ phase' = to
  /\ have' = have \cup {"habit"}
  /\ routesUsed' = routesUsed \cup {"decisions/[id]"}
  /\ UNCHANGED <<specFull, offered, check>>

\* Propose decisions/changelog-habit.
ProposeHabitFull == ProposeHabit("terms", "habit")
ProposeHabitThin == ProposeHabit("terms-thin", "habit-thin")
ProposeHabitUnlinked == ProposeHabit("terms-unlinked", "habit-unlinked")

Ready ==
  /\ specFull /\ offered
  /\ "icp" \in have /\ "product" \in have /\ "spec" \in have
  /\ "glossary" \in have /\ "habit" \in have

\* Read the four routes the checks read, and pass only when Ready.
RunCheck(from) ==
  /\ phase = from
  /\ routesUsed' = routesUsed \cup {"foundation/icp", "product/[id]", "decisions/[id]", "glossary/[id]"}
  /\ UNCHANGED <<have, specFull, offered>>
  /\ \/ /\ Ready /\ phase' = "passed" /\ check' = "pass"
     \/ /\ ~Ready /\ ~specFull /\ phase' = "failed-thin" /\ check' = "fail"
     \/ /\ ~Ready /\ specFull /\ phase' = "failed-unlinked" /\ check' = "fail"

RunCheckFull == RunCheck("habit")
RunCheckThin == RunCheck("habit-thin")
RunCheckUnlinked == RunCheck("habit-unlinked")

\* Propose decisions/<entry-id> after the checks pass. Reads the habit, the card, and the spec.
WriteEntry ==
  /\ phase = "passed"
  /\ "habit" \in have /\ "product" \in have /\ "spec" \in have
  /\ phase' = "entry"
  /\ have' = have \cup {"entry"}
  /\ routesUsed' = routesUsed \cup {"decisions/[id]"}
  /\ UNCHANGED <<specFull, offered, check>>

\* Read decisions. The list returns the habit and the entries filed at decisions/*.decision.json.
ReadDecisions ==
  /\ phase = "entry"
  /\ "habit" \in have /\ "entry" \in have
  /\ phase' = "seen"
  /\ routesUsed' = routesUsed \cup {"decisions"}
  /\ UNCHANGED <<have, specFull, offered, check>>

\* End states. TLC's NoDeadlock needs a step that changes nothing.
Done ==
  /\ phase \in {"stopped", "failed-thin", "failed-unlinked", "seen"}
  /\ UNCHANGED vars

Next ==
  \/ ReadReader \/ StopNoReader \/ ReadProductList
  \/ WriteCardLinked \/ WriteCardUnlinked
  \/ ProposeSpecFull \/ ProposeSpecThin \/ ProposeSpecUnlinked
  \/ WriteTermsFull \/ WriteTermsThin \/ WriteTermsUnlinked
  \/ ProposeHabitFull \/ ProposeHabitThin \/ ProposeHabitUnlinked
  \/ RunCheckFull \/ RunCheckThin \/ RunCheckUnlinked
  \/ WriteEntry \/ ReadDecisions \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in Phases
  /\ have \subseteq {"icp", "product", "spec", "glossary", "habit", "entry"}
  /\ specFull \in BOOLEAN
  /\ offered \in BOOLEAN
  /\ check \in {"none", "pass", "fail"}
  /\ routesUsed \subseteq RealRoutes

\* Every template step reads or writes a route in RealRoutes.
RouteReal == routesUsed \subseteq RealRoutes

\* No step uses a record the venture did not provide and no earlier step wrote.
\* offered is true only after the profile was read and the card was written.
\* Glossary is written only after the spec. An entry is written only after the habit, the card, and the spec.
NoUnprovidedRead ==
  /\ phase \in {
       "reader", "listed", "card", "card-unlinked",
       "spec", "spec-thin", "spec-unlinked",
       "terms", "terms-thin", "terms-unlinked",
       "habit", "habit-thin", "habit-unlinked",
       "passed", "failed-thin", "failed-unlinked", "entry", "seen"
     } => "icp" \in have
  /\ phase \in {
       "card", "spec", "spec-thin", "terms", "terms-thin",
       "habit", "habit-thin", "passed", "failed-thin", "entry", "seen"
     } => "product" \in have /\ offered
  /\ phase \in {
       "card-unlinked", "spec-unlinked", "terms-unlinked",
       "habit-unlinked", "failed-unlinked"
     } => "product" \in have /\ ~offered
  /\ "glossary" \in have => "spec" \in have
  /\ "entry" \in have => "habit" \in have /\ "product" \in have /\ "spec" \in have
  /\ offered => "icp" \in have /\ "product" \in have

\* A check passes only on a complete spec whose card names the reader, and fails only otherwise.
\* The thin path and the unlinked path are different failures, so each can be told apart.
CheckIsReal ==
  /\ check = "pass" <=> phase \in {"passed", "entry", "seen"}
  /\ check = "fail" <=> phase \in {"failed-thin", "failed-unlinked"}
  /\ phase \in {"passed", "entry", "seen"} => Ready
  /\ phase = "failed-thin" => ~specFull /\ offered
  /\ phase = "failed-unlinked" => specFull /\ ~offered
  /\ check = "none" => phase \notin {"passed", "failed-thin", "failed-unlinked", "entry", "seen"}

====
