---- MODULE AmazonSixPager ----
\* The amazon-6-pager playbook (packages/naive/library/packages/decisions/playbooks/amazon-6-pager.md).
\* Two decision memos share one venture.
\* "gap" is drafted and left incomplete, so the checks can fail.
\* "full" is drafted, filled from records the venture already holds, given a finding
\* the FAQ step writes first, proposed while status stays open, then decided by the founder.
\* The memo steps never set status to "decided". That is FounderDecides, which is
\* schema/decisions.mjs approve() (mentura decide), not a field the memo fills in.
\* A raw router write that stores status decided is outside this spec. replay.mjs runs it.

VARIABLES stage, provided, gap, full

vars == <<stage, provided, gap, full>>

VentureProvides == {
  "foundation/problem",
  "foundation/icp",
  "foundation/alignment",
  "governance/decision-rights"
}

\* Route strings that node interface/router.mjs resolves. replay.mjs checks this set
\* against the live route table. A step route that is not in this set breaks RoutesReal.
RealRoutes == VentureProvides \union {
  "decisions/[id]",
  "evidence/[id]",
  "governance/decisions"
}

RouteReadInputs == {"foundation/problem", "foundation/icp", "foundation/alignment", "governance/decision-rights"}
RouteDraft == "decisions/[id]"
RouteNarrative == "decisions/[id]"
RouteEvidence == "evidence/[id]"
RouteFaq == "decisions/[id]"
RouteMatrix == "governance/decisions"
RoutePropose == "decisions/[id]"
RouteDecide == "decisions/[id]"

Blank == [
  customer |-> FALSE,
  problem |-> FALSE,
  solution |-> FALSE,
  faq |-> FALSE,
  answer |-> FALSE,
  status |-> "none",
  decider |-> "nobody"
]

Init ==
  /\ stage = "start"
  /\ provided = VentureProvides
  /\ gap = Blank
  /\ full = Blank

\* Read the four records the venture already holds. No memo exists yet.
ReadInputs ==
  /\ stage = "start"
  /\ RouteReadInputs \subseteq provided
  /\ stage' = "inputs"
  /\ UNCHANGED <<provided, gap, full>>

\* Draft an open memo and leave every section empty. The checks fail on this one.
DraftGap ==
  /\ stage = "inputs"
  /\ stage' = "gap"
  /\ provided' = provided \union {"decisions/gap"}
  /\ gap' = [gap EXCEPT !.status = "open"]
  /\ UNCHANGED full

\* Open the memo that will be proposed. Status is open. No answer yet.
DraftFull ==
  /\ stage = "gap"
  /\ RouteReadInputs \subseteq provided
  /\ stage' = "drafted"
  /\ provided' = provided \union {"decisions/full"}
  /\ full' = [full EXCEPT !.status = "open"]
  /\ UNCHANGED gap

\* Write the customer, the problem, and the solution into the open draft.
\* Reads foundation/icp, foundation/problem, foundation/alignment, and the draft.
WriteNarrative ==
  /\ stage = "drafted"
  /\ {"decisions/full", "foundation/icp", "foundation/problem", "foundation/alignment"} \subseteq provided
  /\ full.status = "open"
  /\ stage' = "narrative"
  /\ full' = [full EXCEPT !.customer = TRUE, !.problem = TRUE, !.solution = TRUE]
  /\ UNCHANGED <<provided, gap>>

\* The FAQ needs a finding the venture did not already hold. Write it before anyone reads it.
RecordFinding ==
  /\ stage = "narrative"
  /\ stage' = "finding"
  /\ provided' = provided \union {"evidence/full"}
  /\ UNCHANGED <<gap, full>>

\* Cite that finding from the memo. Status stays open.
WriteFaq ==
  /\ stage = "finding"
  /\ {"evidence/full", "decisions/full"} \subseteq provided
  /\ full.status = "open"
  /\ stage' = "faq"
  /\ full' = [full EXCEPT !.faq = TRUE]
  /\ UNCHANGED <<provided, gap>>

\* governance/decisions reads decision records that earlier steps wrote.
RunMatrix ==
  /\ stage = "faq"
  /\ {"decisions/gap", "decisions/full"} \subseteq provided
  /\ stage' = "matrix"
  /\ UNCHANGED <<provided, gap, full>>

\* Propose sets the answer and leaves status open. It does not set decider.
Propose ==
  /\ stage = "matrix"
  /\ full.customer /\ full.problem /\ full.solution /\ full.faq
  /\ full.status = "open"
  /\ full.decider = "nobody"
  /\ stage' = "proposed"
  /\ full' = [full EXCEPT !.answer = TRUE]
  /\ UNCHANGED <<provided, gap>>

\* A person decides. This is not the memo. Status becomes decided only here.
FounderDecides ==
  /\ stage = "proposed"
  /\ full.answer /\ full.status = "open" /\ full.decider = "nobody"
  /\ {"decisions/full", "governance/decision-rights"} \subseteq provided
  /\ stage' = "decided"
  /\ full' = [full EXCEPT !.status = "decided", !.decider = "founder"]
  /\ UNCHANGED <<provided, gap>>

\* The finished lifecycle has nowhere else to go. The incomplete memo stays open.
Done == stage = "decided" /\ UNCHANGED vars

Next ==
  \/ ReadInputs
  \/ DraftGap
  \/ DraftFull
  \/ WriteNarrative
  \/ RecordFinding
  \/ WriteFaq
  \/ RunMatrix
  \/ Propose
  \/ FounderDecides
  \/ Done

Spec == Init /\ [][Next]_vars

MemoOK(m) ==
  /\ m.customer \in BOOLEAN /\ m.problem \in BOOLEAN /\ m.solution \in BOOLEAN
  /\ m.faq \in BOOLEAN /\ m.answer \in BOOLEAN
  /\ m.status \in {"none", "open", "decided"}
  /\ m.decider \in {"nobody", "founder"}

TypeOK ==
  /\ stage \in {"start", "inputs", "gap", "drafted", "narrative", "finding", "faq", "matrix", "proposed", "decided"}
  /\ provided \subseteq (VentureProvides \union {"decisions/gap", "decisions/full", "evidence/full"})
  /\ MemoOK(gap) /\ MemoOK(full)

RoutesReal ==
  /\ RouteReadInputs \subseteq RealRoutes
  /\ RouteDraft \in RealRoutes
  /\ RouteNarrative \in RealRoutes
  /\ RouteEvidence \in RealRoutes
  /\ RouteFaq \in RealRoutes
  /\ RouteMatrix \in RealRoutes
  /\ RoutePropose \in RealRoutes
  /\ RouteDecide \in RealRoutes

\* A step's read is in provided, which starts as what the venture holds and grows only when a step writes.
NoReadBeforeProvided ==
  /\ (stage # "start" => VentureProvides \subseteq provided)
  /\ (stage \in {"gap", "drafted", "narrative", "finding", "faq", "matrix", "proposed", "decided"} => "decisions/gap" \in provided)
  /\ (stage \in {"drafted", "narrative", "finding", "faq", "matrix", "proposed", "decided"} => "decisions/full" \in provided)
  /\ full.customer => {"foundation/icp", "decisions/full"} \subseteq provided
  /\ full.problem => {"foundation/problem", "decisions/full"} \subseteq provided
  /\ full.solution => {"foundation/alignment", "decisions/full"} \subseteq provided
  /\ full.faq => {"evidence/full", "decisions/full"} \subseteq provided
  /\ full.answer => full.customer /\ full.problem /\ full.solution /\ full.faq
  /\ gap.customer = FALSE /\ gap.problem = FALSE /\ gap.solution = FALSE /\ gap.faq = FALSE /\ gap.answer = FALSE

\* The memo steps leave status open. Decided means the founder action ran.
MemoNeverDecides ==
  /\ full.status = "decided" => full.decider = "founder" /\ stage = "decided"
  /\ gap.status \in {"none", "open"} /\ gap.decider = "nobody"
  /\ stage \in {"start", "inputs", "gap", "drafted", "narrative", "finding", "faq", "matrix", "proposed"} => full.status \in {"none", "open"}
  /\ full.status = "open" => full.decider = "nobody"
  /\ stage = "proposed" => full.status = "open" /\ full.answer /\ full.decider = "nobody"

\* At "proposed", the finished memo passes every content check and is still open.
\* The incomplete memo fails those checks. At "decided", only the founder action has set decided.
ChecksCanPassAndFail ==
  /\ (stage = "proposed" =>
       /\ full.customer /\ full.problem /\ full.solution /\ full.faq /\ full.answer
       /\ full.status = "open" /\ full.decider = "nobody"
       /\ ~gap.customer /\ ~gap.problem /\ ~gap.solution /\ ~gap.faq /\ ~gap.answer
       /\ gap.status = "open")
  /\ (stage = "decided" =>
       /\ full.status = "decided" /\ full.decider = "founder" /\ full.answer
       /\ gap.status = "open" /\ ~gap.answer)
====
