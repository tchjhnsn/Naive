---- MODULE YCFundraise ----
\* The seed-fundraising playbook (packages/naive/library/packages/investors/playbooks/y-combinator-fundraise.md).
\* One founder moves records along the template. Each action is one template step.
\* Its comment names the Naive routes that step reads or writes.
\*
\* Provided: records the venture already has before this playbook writes anything.
\* Writes: routes the template writes. governance/ownership is also read (it is in Provided)
\* and later written by the founder when a form is actually signed.
\* Optional routes are named in the playbook and are not required for the pass path.
\* purpose/data-stream/[id] is not here. A write of that route stored the file under
\* customers/_streams/ because that glob is first (interface/router.mjs fileFor).

Provided == {
  "purpose/foundation",
  "system/need-now",
  "foundation/problem",
  "foundation/icp",
  "foundation/alignment",
  "product/[id]",
  "people/founders/[id]",
  "purpose/money/summary",
  "evidence",
  "governance/ownership",
  "people/team-plan"
}

Optional == {
  "validation/pricing",
  "validation/go-to-market",
  "foundation/telos"
}

Writes == {
  "decisions/[id]",
  "investors/[id]",
  "operations/handoff/[id]",
  "governance/ownership"
}

\* `investors` is the list the investor check reads. `investors/[id]` is the record it writes.
Routes == Provided \cup Optional \cup Writes \cup {"investors"}

Phases == {
  "start", "story", "blank", "filled", "listed",
  "room", "decided", "recorded"
}

CheckStates == {
  "pending", "plan-fails", "investors-fail", "room-fails", "pass"
}

VARIABLES
  phase,    \* where the template is
  checks,   \* pending, one named failure, or pass
  used      \* routes this run has read or written

vars == <<phase, checks, used>>

Init ==
  /\ phase = "start"
  /\ checks = "pending"
  /\ used = {}

\* Step 1. Read the records the venture already provides. Routes: Provided.
ReadStory ==
  /\ phase = "start"
  /\ checks = "pending"
  /\ phase' = "story"
  /\ used' = used \cup Provided
  /\ UNCHANGED checks

\* Step 2, draft. Write decisions/[id] with the labels still empty.
DraftPlan ==
  /\ phase = "story"
  /\ checks = "pending"
  /\ phase' = "blank"
  /\ used' = used \cup {"decisions/[id]"}
  /\ UNCHANGED checks

\* Check 1 can fail: the raise plan is still blank.
FailPlan ==
  /\ phase = "blank"
  /\ checks = "pending"
  /\ checks' = "plan-fails"
  /\ used' = used \cup {"decisions/[id]"}
  /\ UNCHANGED phase

\* The founder fills amount, months, and use of funds. Same route, their figures.
FixPlan ==
  /\ phase = "blank"
  /\ checks = "plan-fails"
  /\ phase' = "filled"
  /\ checks' = "pending"
  /\ used' = used \cup {"decisions/[id]"}

FillPlan ==
  /\ phase = "blank"
  /\ checks = "pending"
  /\ phase' = "filled"
  /\ used' = used \cup {"decisions/[id]"}
  /\ UNCHANGED checks

\* Check 2 can fail: no investor record yet. Reads investors/[id] and the plan.
FailInvestors ==
  /\ phase = "filled"
  /\ checks = "pending"
  /\ checks' = "investors-fail"
  /\ used' = used \cup {"investors", "investors/[id]", "decisions/[id]"}
  /\ UNCHANGED phase

\* Step 3. Write investors/[id] after the plan exists.
FixInvestors ==
  /\ phase = "filled"
  /\ checks = "investors-fail"
  /\ phase' = "listed"
  /\ checks' = "pending"
  /\ used' = used \cup {"investors", "investors/[id]"}

AddInvestors ==
  /\ phase = "filled"
  /\ checks = "pending"
  /\ phase' = "listed"
  /\ used' = used \cup {"investors", "investors/[id]"}
  /\ UNCHANGED checks

\* Check 3 can fail: the checklist is not written. Reads operations/handoff/[id].
FailRoom ==
  /\ phase = "listed"
  /\ checks = "pending"
  /\ checks' = "room-fails"
  /\ used' = used \cup {"operations/handoff/[id]"}
  /\ UNCHANGED phase

\* Step 4. Write the checklist. It reads the venture's records and the plan.
RoomReads == {
  "operations/handoff/[id]",
  "foundation/problem",
  "foundation/icp",
  "foundation/alignment",
  "product/[id]",
  "people/founders/[id]",
  "people/team-plan",
  "purpose/money/summary",
  "evidence",
  "governance/ownership",
  "decisions/raise-plan"
}

\* decisions/raise-plan is the same route as decisions/[id]. The model uses the
\* template form decisions/[id], so RoomReads must not name a second string.
\* The set above is corrected here: drop the concrete id, keep the template route.
RoomUses == (RoomReads \ {"decisions/raise-plan"}) \cup {"decisions/[id]"}

FixRoom ==
  /\ phase = "listed"
  /\ checks = "room-fails"
  /\ phase' = "room"
  /\ checks' = "pending"
  /\ used' = used \cup RoomUses

WriteRoom ==
  /\ phase = "listed"
  /\ checks = "pending"
  /\ phase' = "room"
  /\ used' = used \cup RoomUses
  /\ UNCHANGED checks

\* Checks 1 to 3 pass together, only once the checklist exists.
PassChecks ==
  /\ phase = "room"
  /\ checks = "pending"
  /\ checks' = "pass"
  /\ used' = used \cup {"decisions/[id]", "investors", "investors/[id]", "operations/handoff/[id]"}
  /\ UNCHANGED phase

\* Step 5. The founder decides. Route decisions/[id], a person, mentura decide.
Decide ==
  /\ phase = "room"
  /\ checks = "pass"
  /\ phase' = "decided"
  /\ used' = used \cup {"decisions/[id]"}
  /\ UNCHANGED checks

\* The founder records a signed instrument. Route governance/ownership, as a person.
RecordInstrument ==
  /\ phase = "decided"
  /\ checks = "pass"
  /\ phase' = "recorded"
  /\ used' = used \cup {"governance/ownership"}
  /\ UNCHANGED checks

\* End. Nothing else happens. Stutter so the end state is not a deadlock.
Done ==
  /\ phase = "recorded"
  /\ checks = "pass"
  /\ UNCHANGED vars

Next ==
  \/ ReadStory
  \/ DraftPlan
  \/ FailPlan
  \/ FixPlan
  \/ FillPlan
  \/ FailInvestors
  \/ FixInvestors
  \/ AddInvestors
  \/ FailRoom
  \/ FixRoom
  \/ WriteRoom
  \/ PassChecks
  \/ Decide
  \/ RecordInstrument
  \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in Phases
  /\ checks \in CheckStates
  /\ used \subseteq Routes

\* Every route a step reads or writes is one the playbook names, and the replay
\* checks that set against node interface/router.mjs.
RoutesExist == used \subseteq Routes

\* A route lands in `used` only if the venture provided it, a template step writes it,
\* or the investor check reads the `investors` list. Optional routes stay out of `used`.
Accounted == used \subseteq (Provided \cup Writes \cup {"investors"})

\* Later steps only read a record the venture provided or an earlier step wrote.
NoUnreadSource ==
  /\ (phase # "start") => Provided \subseteq used
  /\ (phase \in {"blank", "filled", "listed", "room", "decided", "recorded"}) =>
       "decisions/[id]" \in used
  /\ (phase \in {"listed", "room", "decided", "recorded"}) =>
       "investors/[id]" \in used
  /\ (phase \in {"room", "decided", "recorded"}) =>
       "operations/handoff/[id]" \in used
  /\ (phase = "recorded") => "governance/ownership" \in used

\* A passing check is the filled plan, the investor records, and the checklist.
PassMeansReady == checks = "pass" => phase \in {"room", "decided", "recorded"}

\* Each failing check sits on the step that is still missing, so the failure is real.
FailIsARealMiss ==
  /\ checks = "plan-fails" => phase = "blank"
  /\ checks = "investors-fail" => phase = "filled"
  /\ checks = "room-fails" => phase = "listed"
====
