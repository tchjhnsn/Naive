---- MODULE JtbdPlaybook ----
\* The jobs playbook (library/packages/foundation/playbooks/jtbd.md).
\* The founder's records move as the template steps run, for one profile.
\* Each action is one step. Its comment names the Naive route it reads or writes.
\* Probe is FALSE for the playbook as written. TRUE adds steps the playbook does
\* not take, so each rule can be seen to fail. Those steps are not in the playbook.

CONSTANT Probe

VARIABLES
  phase,    \* where the template is
  problem,  \* "missing" or "ready": foundation/problem in the venture
  icp,      \* "missing" or "open": foundation/icp in the venture
  product,  \* "absent" or "present": a product card in the venture
  jobs,     \* "none", "copied", or "progress" on the profile
  check,    \* "pending", "pass", or "fail"
  route,    \* the route the latest step named
  seat      \* "none", "agent", or "founder": who last wrote the jobs

vars == <<phase, problem, icp, product, jobs, check, route, seat>>

\* Routes resolve() accepts. "none" is the start, before any step.
\* "foundation/icp/[id]" is one profile's record, and the only ICP route that writes.
RealRoutes == {
  "none",
  "foundation/problem",
  "foundation/icp",
  "foundation/icp/[id]",
  "product",
  "product/[id]",
  "purpose/foundation"
}

Init ==
  /\ phase = "start"
  /\ problem \in {"missing", "ready"}
  /\ icp \in {"missing", "open"}
  /\ product \in {"absent", "present"}
  /\ jobs = "none"
  /\ check = "pending"
  /\ route = "none"
  /\ seat = "none"

\* Read foundation/problem. The venture already has the record.
ReadProblem ==
  /\ phase = "start" /\ problem = "ready"
  /\ phase' = "problem-read" /\ route' = "foundation/problem"
  /\ UNCHANGED <<problem, icp, product, jobs, check, seat>>

\* The read returns not_found. Stop. Do not use the record's fields.
StopNoProblem ==
  /\ phase = "start" /\ problem = "missing"
  /\ phase' = "stopped" /\ route' = "foundation/problem"
  /\ UNCHANGED <<problem, icp, product, jobs, check, seat>>

\* Read foundation/icp. The venture already has the profiles.
ReadIcp ==
  /\ phase = "problem-read" /\ icp = "open"
  /\ phase' = "profiles" /\ route' = "foundation/icp"
  /\ UNCHANGED <<problem, icp, product, jobs, check, seat>>

StopNoIcp ==
  /\ phase = "problem-read" /\ icp = "missing"
  /\ phase' = "stopped" /\ route' = "foundation/icp"
  /\ UNCHANGED <<problem, icp, product, jobs, check, seat>>

\* Read the product list. Read product/[id] only when a card is already there.
SeeProduct ==
  /\ phase = "profiles"
  /\ phase' = "ready"
  /\ route' = IF product = "present" THEN "product/[id]" ELSE "product"
  /\ UNCHANGED <<problem, icp, product, jobs, check, seat>>

\* Write foundation/icp/[id]. An agent's write is a draft (strategy-or-constitution).
WriteProgress ==
  /\ phase = "ready"
  /\ jobs' = "progress" /\ phase' = "drafted" /\ seat' = "agent" /\ route' = "foundation/icp/[id]"
  /\ UNCHANGED <<problem, icp, product, check>>

WriteCopy ==
  /\ phase = "ready"
  /\ jobs' = "copied" /\ phase' = "drafted" /\ seat' = "agent" /\ route' = "foundation/icp/[id]"
  /\ UNCHANGED <<problem, icp, product, check>>

WriteEmpty ==
  /\ phase = "ready"
  /\ jobs' = "none" /\ phase' = "drafted" /\ seat' = "agent" /\ route' = "foundation/icp/[id]"
  /\ UNCHANGED <<problem, icp, product, check>>

\* The checks. They read the draft of foundation/icp/[id] and run purpose/foundation.
RunCheck ==
  /\ phase = "drafted"
  /\ phase' = "checked"
  /\ check' = IF jobs = "progress" THEN "pass" ELSE "fail"
  /\ route' = "purpose/foundation"
  /\ UNCHANGED <<problem, icp, product, jobs, seat>>

\* The founder accepts the draft, only after the checks passed.
\* The accept writes foundation/icp/[id] as a person (mentura accept).
Accept ==
  /\ phase = "checked" /\ check = "pass"
  /\ phase' = "accepted" /\ seat' = "founder" /\ route' = "foundation/icp/[id]"
  /\ UNCHANGED <<problem, icp, product, jobs, check>>

\* Probes. Disabled when Probe is FALSE. Not steps of the playbook.
\* "foundation/icp/write" stands for a write of the list route, which has no write action.
BadRoute ==
  /\ Probe /\ phase = "start"
  /\ phase' = "bad-route" /\ route' = "foundation/icp/write"
  /\ UNCHANGED <<problem, icp, product, jobs, check, seat>>

BadRead ==
  /\ Probe /\ phase = "profiles" /\ product = "absent"
  /\ phase' = "bad-read" /\ route' = "product/[id]"
  /\ UNCHANGED <<problem, icp, product, jobs, check, seat>>

BadCheck ==
  /\ Probe /\ phase = "drafted" /\ jobs # "progress"
  /\ phase' = "checked" /\ check' = "pass" /\ route' = "purpose/foundation"
  /\ UNCHANGED <<problem, icp, product, jobs, seat>>

AcceptFail ==
  /\ Probe /\ phase = "checked" /\ check = "fail"
  /\ phase' = "accepted" /\ seat' = "founder" /\ route' = "foundation/icp/[id]"
  /\ UNCHANGED <<problem, icp, product, jobs, check>>

Park ==
  /\ \/ phase \in {"stopped", "accepted", "bad-route", "bad-read"}
     \/ (phase = "checked" /\ check = "fail")
  /\ UNCHANGED vars

Next ==
  \/ ReadProblem \/ StopNoProblem \/ ReadIcp \/ StopNoIcp \/ SeeProduct
  \/ WriteProgress \/ WriteCopy \/ WriteEmpty \/ RunCheck \/ Accept
  \/ BadRoute \/ BadRead \/ BadCheck \/ AcceptFail
  \/ Park

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in {
       "start", "problem-read", "profiles", "ready", "drafted", "checked",
       "stopped", "accepted", "bad-route", "bad-read"
     }
  /\ problem \in {"missing", "ready"}
  /\ icp \in {"missing", "open"}
  /\ product \in {"absent", "present"}
  /\ jobs \in {"none", "copied", "progress"}
  /\ check \in {"pending", "pass", "fail"}
  /\ route \in RealRoutes \union {"foundation/icp/write"}
  /\ seat \in {"none", "agent", "founder"}
  /\ Probe \in BOOLEAN

\* Every template step names a route the router has.
EveryRouteReal == route \in RealRoutes

\* A step that uses a record uses one the venture already has, or one an earlier
\* step wrote. A stop on not_found names the route and does not use its fields.
\* product/[id] uses the card, so the venture must already have one.
ReadsAreProvided ==
  /\ (route = "product/[id]" => product = "present")
  /\ (phase \in {"problem-read", "profiles", "ready", "drafted", "checked", "accepted"} => problem = "ready")
  /\ (phase \in {"profiles", "ready", "drafted", "checked", "accepted"} => icp = "open")

\* The jobs check passes only for a progress sentence, and fails for a blank or a copy.
\* Both results are reachable when Probe is FALSE. See the chart.
CheckMatchesJobs ==
  /\ (check = "pass" <=> jobs = "progress" /\ phase \in {"checked", "accepted"})
  /\ (check = "fail" => jobs # "progress" /\ phase = "checked")
  /\ (check = "pending" => phase \notin {"checked", "accepted"})

\* An agent's jobs stay a draft until the founder accepts, and only after the check passed.
NotLiveUntilYouAccept ==
  /\ (seat = "founder" => phase = "accepted" /\ check = "pass" /\ jobs = "progress")
  /\ (phase \in {"drafted", "checked"} => seat = "agent")
  /\ (phase = "accepted" => seat = "founder")

====
