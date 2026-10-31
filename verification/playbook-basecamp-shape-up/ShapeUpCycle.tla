---- MODULE ShapeUpCycle ----
\* One six-week cycle from packages/product/playbooks/basecamp-shape-up.md.
\* Each action is one template step. The comment names the Naive route.
\* interface/router.mjs resolve() and call() are the code those routes run.
\* The venture starts with a product card and an ICP. The framework template
\* supplies decision rights (governance/venture-template/decision-rights.json)
\* when the venture has no governance/decision-rights record of its own.

VARIABLES
  phase,      \* where the cycle is
  pitch,      \* none, full (five ingredients and a six-week appetite), thin (a section blank)
  bet,        \* none, open, yes, no
  check,      \* none, pass, fail: the latest pitch check or cycle check
  evidence,   \* a passing evidence record has been written
  cool,       \* none or open (the cool-down handoff)
  coolFrom,   \* none, shipped, tripped
  tripped,    \* the circuit breaker has fired; it stays fired
  lastRoute,  \* the route the latest step read or wrote
  readOk      \* the latest read was a record the venture or an earlier step provides

vars == <<phase, pitch, bet, check, evidence, cool, coolFrom, tripped, lastRoute, readOk>>

Routes == {
  "product/[id]",
  "foundation/icp",
  "governance/decision-rights",
  "operations/handoff/[id]",
  "decisions/[id]",
  "evidence/[id]"
}

\* Records present before this step. "rights" is the framework template.
Have ==
  {"product", "icp", "rights"}
  \union (IF pitch = "none" THEN {} ELSE {"pitch"})
  \union (IF bet = "none" THEN {} ELSE {"bet"})
  \union (IF phase \in {"building", "shipped", "tripped", "cooldown"} THEN {"cycle"} ELSE {})
  \union (IF evidence THEN {"evidence"} ELSE {})
  \union (IF cool = "open" THEN {"cooldown"} ELSE {})

Init ==
  /\ phase = "start"
  /\ pitch = "none"
  /\ bet = "none"
  /\ check = "none"
  /\ evidence = FALSE
  /\ cool = "none"
  /\ coolFrom = "none"
  /\ tripped = FALSE
  /\ lastRoute = "none"
  /\ readOk = TRUE

\* product/[id] read. The venture already has the card.
ReadProduct ==
  /\ phase = "start"
  /\ "product" \in Have
  /\ phase' = "saw-product"
  /\ lastRoute' = "product/[id]"
  /\ readOk' = ("product" \in Have)
  /\ UNCHANGED <<pitch, bet, check, evidence, cool, coolFrom, tripped>>

\* foundation/icp read. The product function reads it and does not copy it.
ReadIcp ==
  /\ phase = "saw-product"
  /\ "icp" \in Have
  /\ phase' = "who-read"
  /\ lastRoute' = "foundation/icp"
  /\ readOk' = ("icp" \in Have)
  /\ UNCHANGED <<pitch, bet, check, evidence, cool, coolFrom, tripped>>

\* governance/decision-rights read. Classes for the handoff's role.
ReadRights ==
  /\ phase = "who-read"
  /\ "rights" \in Have
  /\ phase' = "shaping"
  /\ lastRoute' = "governance/decision-rights"
  /\ readOk' = ("rights" \in Have)
  /\ UNCHANGED <<pitch, bet, check, evidence, cool, coolFrom, tripped>>

\* operations/handoff/[id] write. The pitch is the cycle handoff, still a draft.
WritePitch(kind) ==
  /\ phase = "shaping"
  /\ pitch = "none"
  /\ "product" \in Have /\ "icp" \in Have
  /\ pitch' = kind
  /\ phase' = "pitched"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("product" \in Have /\ "icp" \in Have)
  /\ UNCHANGED <<bet, check, evidence, cool, coolFrom, tripped>>

WritePitchFull == WritePitch("full")
WritePitchThin == WritePitch("thin")

\* operations/handoff/[id] read. Passes only when every pitch section has text
\* and the appetite says six weeks. A blank section fails. Both are reachable.
CheckPitch ==
  /\ phase = "pitched"
  /\ check = "none"
  /\ "pitch" \in Have
  /\ check' = IF pitch = "full" THEN "pass" ELSE "fail"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("pitch" \in Have)
  /\ UNCHANGED <<phase, pitch, bet, evidence, cool, coolFrom, tripped>>

\* The founder fills the blank section. The check has to be run again.
RewritePitch ==
  /\ phase = "pitched"
  /\ check = "fail"
  /\ pitch' = "full"
  /\ check' = "none"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("pitch" \in Have)
  /\ UNCHANGED <<phase, bet, evidence, cool, coolFrom, tripped>>

\* decisions/[id] write. Status stays open. The founder has not bet yet.
ProposeBet ==
  /\ phase = "pitched"
  /\ check = "pass"
  /\ "pitch" \in Have
  /\ bet' = "open"
  /\ phase' = "betting"
  /\ check' = "none"
  /\ lastRoute' = "decisions/[id]"
  /\ readOk' = ("pitch" \in Have)
  /\ UNCHANGED <<pitch, evidence, cool, coolFrom, tripped>>

\* A person decides the open bet. mentura decide -> schema/decisions.mjs approve().
YouBet ==
  /\ phase = "betting"
  /\ bet = "open"
  /\ "bet" \in Have
  /\ bet' = "yes"
  /\ phase' = "placed"
  /\ lastRoute' = "decisions/[id]"
  /\ readOk' = ("bet" \in Have)
  /\ UNCHANGED <<pitch, check, evidence, cool, coolFrom, tripped>>

YouDecline ==
  /\ phase = "betting"
  /\ bet = "open"
  /\ "bet" \in Have
  /\ bet' = "no"
  /\ phase' = "declined"
  /\ lastRoute' = "decisions/[id]"
  /\ readOk' = ("bet" \in Have)
  /\ UNCHANGED <<pitch, check, evidence, cool, coolFrom, tripped>>

\* operations/handoff/[id] write. The same handoff leaves draft only after the bet.
OpenCycle ==
  /\ phase = "placed"
  /\ bet = "yes"
  /\ "bet" \in Have
  /\ phase' = "building"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("bet" \in Have)
  /\ UNCHANGED <<pitch, bet, check, evidence, cool, coolFrom, tripped>>

\* The cycle record can pass check-ready, or fail it, from the same state.
CheckBuildPass ==
  /\ phase = "building"
  /\ check = "none"
  /\ pitch = "full"
  /\ bet = "yes"
  /\ "cycle" \in Have
  /\ check' = "pass"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("cycle" \in Have)
  /\ UNCHANGED <<phase, pitch, bet, evidence, cool, coolFrom, tripped>>

\* Claiming the cycle is done with no evidence record. The check fails.
ClaimDone ==
  /\ phase = "building"
  /\ check = "none"
  /\ ~evidence
  /\ "cycle" \in Have
  /\ check' = "fail"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("cycle" \in Have)
  /\ UNCHANGED <<phase, pitch, bet, evidence, cool, coolFrom, tripped>>

FixBuild ==
  /\ phase = "building"
  /\ check = "fail"
  /\ check' = "none"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("cycle" \in Have)
  /\ UNCHANGED <<phase, pitch, bet, evidence, cool, coolFrom, tripped>>

\* evidence/[id] write, then the handoff can be done.
Ship ==
  /\ phase = "building"
  /\ check = "pass"
  /\ ~tripped
  /\ "cycle" \in Have
  /\ evidence' = TRUE
  /\ phase' = "shipped"
  /\ lastRoute' = "evidence/[id]"
  /\ readOk' = ("cycle" \in Have)
  /\ UNCHANGED <<pitch, bet, check, cool, coolFrom, tripped>>

\* The appetite is spent. The handoff is escalated. It does not become shipped.
Trip ==
  /\ phase = "building"
  /\ "cycle" \in Have
  /\ phase' = "tripped"
  /\ tripped' = TRUE
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("cycle" \in Have)
  /\ UNCHANGED <<pitch, bet, check, evidence, cool, coolFrom>>

\* operations/handoff/[id] write for the two-week cool-down, after the cycle ends.
OpenCooldown ==
  /\ phase \in {"shipped", "tripped"}
  /\ "cycle" \in Have
  /\ cool' = "open"
  /\ coolFrom' = phase
  /\ phase' = "cooldown"
  /\ lastRoute' = "operations/handoff/[id]"
  /\ readOk' = ("cycle" \in Have)
  /\ UNCHANGED <<pitch, bet, check, evidence, tripped>>

\* End of this cycle: declined, or cool-down opened. A later cycle starts again at shaping.
Done ==
  /\ phase \in {"declined", "cooldown"}
  /\ UNCHANGED vars

Next ==
  ReadProduct \/ ReadIcp \/ ReadRights \/ WritePitchFull \/ WritePitchThin \/ CheckPitch
  \/ RewritePitch \/ ProposeBet \/ YouBet \/ YouDecline \/ OpenCycle \/ CheckBuildPass
  \/ ClaimDone \/ FixBuild \/ Ship \/ Trip \/ OpenCooldown \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in {"start", "saw-product", "who-read", "shaping", "pitched", "betting", "placed", "building", "shipped", "tripped", "declined", "cooldown"}
  /\ pitch \in {"none", "full", "thin"}
  /\ bet \in {"none", "open", "yes", "no"}
  /\ check \in {"none", "pass", "fail"}
  /\ evidence \in BOOLEAN
  /\ cool \in {"none", "open"}
  /\ coolFrom \in {"none", "shipped", "tripped"}
  /\ tripped \in BOOLEAN
  /\ lastRoute \in Routes \union {"none"}
  /\ readOk \in BOOLEAN

\* Every template step reads or writes a route in the router table.
RouteIsReal == lastRoute \in Routes \union {"none"}

\* No step reads a record that the venture or an earlier step did not provide.
ReadsWereProvided == readOk

\* The pitch check passes for a full pitch and fails for a blank section.
PitchCheckHonest ==
  /\ (phase = "pitched" /\ check = "pass" => pitch = "full")
  /\ (phase = "pitched" /\ check = "fail" => pitch = "thin")

\* A bet is proposed only after the pitch check has passed.
BetOnlyAfterAPass == bet # "none" => pitch = "full"

\* The cycle is not opened until the founder has bet yes.
NoBuildBeforeBet == phase \in {"building", "shipped", "tripped", "cooldown"} => bet = "yes"

\* The cycle check agrees with the record: pass means a full pitch and a yes bet,
\* and neither result claims evidence that was never written.
BuildCheckHonest ==
  /\ (phase = "building" /\ check = "pass" => pitch = "full" /\ bet = "yes" /\ ~evidence)
  /\ (phase = "building" /\ check = "fail" => ~evidence /\ bet = "yes")

\* Shipping writes an evidence record. A failed check cannot ship.
NoShipWithoutEvidence == phase = "shipped" => evidence /\ check = "pass" /\ ~tripped

\* Cool-down is a later handoff. It follows a shipped cycle or a tripped one.
CooldownAfterCycle == phase = "cooldown" => cool = "open" /\ coolFrom \in {"shipped", "tripped"}

\* After the circuit breaker trips, the cycle does not return to building or shipping.
BreakerHolds == tripped => phase \in {"tripped", "cooldown"}
====
