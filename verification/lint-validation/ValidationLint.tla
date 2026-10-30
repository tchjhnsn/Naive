---- MODULE ValidationLint ----
\* One validation claim, the evidence on it, and what validation/lint reports.
\* Time (age) and a phase change are separate steps. Shelf life is past when age has
\* ticked, or when the venture's phase moves past the phase the evidence was collected in.
\* A missing or unreadable record never crashes. Every read is through ventureFile (source = "file").
\* Exit is 1 exactly when the one fail-closed rule has a finding. Rules start fail-open (closed = "none").

EXTENDS Integers

VARIABLES
    rec,        \* "missing" | "bad" | "claim" (no evidence) | "held" (evidence cited)
    age,        \* 0 within the time shelf, 1 past it
    phase,      \* 0 Discovery, 1 Validation
    born,       \* phase the evidence was collected in
    who,        \* "owner" | "agent"
    decided,    \* "no" | "discovery" | "validation"
    strength,   \* "stronger" | "discovery" (very low, Discovery-grade)
    closed,     \* "none" or the one rule set fail-closed in naive.config.json
    crashed,    \* TRUE if a missing or malformed record threw
    source      \* "file" ventureFile, "memory" anything else

vars == <<rec, age, phase, born, who, decided, strength, closed, crashed, source>>

Rules == {"claim", "stale", "agent", "decision"}

Init ==
    /\ rec = "missing"
    /\ age = 0 /\ phase = 0 /\ born = 0
    /\ who = "owner" /\ decided = "no" /\ strength = "stronger"
    /\ closed = "none" /\ crashed = FALSE /\ source = "file"

SeeBad ==
    /\ rec = "missing" /\ rec' = "bad"
    /\ UNCHANGED <<age, phase, born, who, decided, strength, closed, crashed, source>>

WriteClaim ==
    /\ rec \in {"missing", "bad"} /\ rec' = "claim"
    /\ who' = "owner" /\ decided' = "no" /\ age' = 0
    /\ UNCHANGED <<phase, born, strength, closed, crashed, source>>

AddFresh ==
    /\ rec = "claim" /\ rec' = "held"
    /\ age' = 0 /\ born' = phase /\ strength' = "stronger" /\ who' = "owner"
    /\ UNCHANGED <<phase, decided, closed, crashed, source>>

AddWeak ==
    /\ rec = "claim" /\ rec' = "held"
    /\ age' = 0 /\ born' = phase /\ strength' = "discovery" /\ who' = "owner"
    /\ UNCHANGED <<phase, decided, closed, crashed, source>>

\* Time passes the shelf. The phase does not change.
Tick ==
    /\ rec = "held" /\ age = 0 /\ age' = 1
    /\ UNCHANGED <<rec, phase, born, who, decided, strength, closed, crashed, source>>

\* The venture moves from Discovery to Validation. Evidence collected earlier is from the old phase.
Advance ==
    /\ phase = 0 /\ phase' = 1
    /\ UNCHANGED <<rec, age, born, who, decided, strength, closed, crashed, source>>

GradeAgent ==
    /\ rec = "held" /\ who # "agent" /\ who' = "agent"
    /\ UNCHANGED <<rec, age, phase, born, decided, strength, closed, crashed, source>>

GradeOwner ==
    /\ rec = "held" /\ who # "owner" /\ who' = "owner"
    /\ UNCHANGED <<rec, age, phase, born, decided, strength, closed, crashed, source>>

Decide ==
    /\ rec \in {"claim", "held"}
    /\ decided' = IF phase = 0 THEN "discovery" ELSE "validation"
    /\ decided # decided'
    /\ UNCHANGED <<rec, age, phase, born, who, strength, closed, crashed, source>>

Undecide ==
    /\ decided # "no" /\ decided' = "no"
    /\ UNCHANGED <<rec, age, phase, born, who, strength, closed, crashed, source>>

Close(r) ==
    /\ r \in Rules /\ closed # r /\ closed' = r
    /\ UNCHANGED <<rec, age, phase, born, who, decided, strength, crashed, source>>

OpenMode ==
    /\ closed # "none" /\ closed' = "none"
    /\ UNCHANGED <<rec, age, phase, born, who, decided, strength, crashed, source>>

Wait == UNCHANGED vars

Next ==
    \/ SeeBad \/ WriteClaim \/ AddFresh \/ AddWeak \/ Tick \/ Advance
    \/ GradeAgent \/ GradeOwner \/ Decide \/ Undecide
    \/ \E r \in Rules : Close(r) \/ OpenMode \/ Wait

Spec == Init /\ [][Next]_vars

ClaimFired == rec = "claim"
StaleFired == rec = "held" /\ (age = 1 \/ phase > born)
AgentFired == rec = "held" /\ who = "agent"
DiscFired == decided = "validation" /\ (rec = "claim" \/ (rec = "held" /\ strength = "discovery"))

Exit == IF \/ (closed = "claim" /\ ClaimFired)
           \/ (closed = "stale" /\ StaleFired)
           \/ (closed = "agent" /\ AgentFired)
           \/ (closed = "decision" /\ DiscFired)
        THEN 1 ELSE 0

TypeOK ==
    /\ rec \in {"missing", "bad", "claim", "held"}
    /\ age \in {0, 1} /\ phase \in {0, 1} /\ born \in {0, 1}
    /\ who \in {"owner", "agent"}
    /\ decided \in {"no", "discovery", "validation"}
    /\ strength \in {"discovery", "stronger"}
    /\ closed \in {"none"} \cup Rules
    /\ crashed \in BOOLEAN /\ source \in {"file", "memory"}

NoCrash == crashed = FALSE
InputsViaVentureFile == source = "file"
MissingSafe == rec \in {"missing", "bad"} => ~ClaimFired /\ ~StaleFired /\ ~AgentFired /\ ~DiscFired /\ Exit = 0

Clean == rec = "held" /\ age = 0 /\ phase = born /\ who = "owner" /\ strength = "stronger"
CleanSilent == Clean => ~ClaimFired /\ ~StaleFired /\ ~AgentFired /\ ~DiscFired

ClaimFixture == (rec = "claim") => ClaimFired
StaleByTime == (rec = "held" /\ age = 1) => StaleFired
StaleByPhase == (rec = "held" /\ phase > born) => StaleFired
FreshSamePhase == (rec = "held" /\ age = 0 /\ phase = born) => ~StaleFired
AgentFixture == (rec = "held" /\ who = "agent") => AgentFired
OwnerSilent == (who = "owner") => ~AgentFired
DiscFixture == (decided = "validation" /\ rec \in {"claim", "held"} /\ (rec = "claim" \/ strength = "discovery")) => DiscFired
NotValidationPhase == (decided = "discovery") => ~DiscFired
StrongerOk == (rec = "held" /\ strength = "stronger") => ~DiscFired
OpenNeverExits == (closed = "none") => Exit = 0

ExitIff == Exit = 1 <=> (
    (closed = "claim" /\ ClaimFired)
    \/ (closed = "stale" /\ StaleFired)
    \/ (closed = "agent" /\ AgentFired)
    \/ (closed = "decision" /\ DiscFired))

ClosedOnlyItsRule ==
    /\ (closed = "stale" /\ ~StaleFired) => Exit = 0
    /\ (closed = "claim" /\ ~ClaimFired) => Exit = 0
    /\ (closed = "agent" /\ ~AgentFired) => Exit = 0
    /\ (closed = "decision" /\ ~DiscFired) => Exit = 0
====
