---- MODULE FinanceLint ----
\* finance/lint, schema/lint-finance.mjs. One check of a venture.
\* Each action is one change a person can make, then the checker reads the records through
\* ventureFile (schema/venture-paths.mjs) and sets the findings and the exit code.
\* Scale and platform are in Phases with the others: a target is a number stored under the phase name,
\* and the code does not treat any phase as a special case (metricFindings).

EXTENDS FiniteSets

Phases == {"discovery", "validation", "beachhead", "scale", "platform"}
Modes == {"none", "spend-no-runway", "price-below-cost", "metric-no-target", "spend_and_price"}

VARIABLES
  pc,         \* "start" before the first check, then "ready"
  phase,      \* venture.json phase
  spend,      \* the spend decision: absent, clean, no_runway, malformed
  price,      \* the price point: absent, clean, below, missing_price, missing_cost, malformed
  metric,     \* the metric: absent, covered, validation_only, no_targets, malformed
  mode,       \* which rules naive.config.json sets fail-closed
  findings,   \* the rule ids that fired
  exitCode,   \* "0" or "1"
  crashed,    \* TRUE if the checker threw
  source      \* where the record bytes came from

vars == <<pc, phase, spend, price, metric, mode, findings, exitCode, crashed, source>>

SpendFires(s) == s = "no_runway"
PriceFires(p) == p = "below"
\* validation_only has a number only under "validation". no_targets has no number for any phase.
MetricFires(m, ph) == m = "no_targets" \/ (m = "validation_only" /\ ph # "validation")

FindingsOf(s, p, m, ph) ==
  (IF SpendFires(s) THEN {"spend-no-runway"} ELSE {})
  \union (IF PriceFires(p) THEN {"price-below-cost"} ELSE {})
  \union (IF MetricFires(m, ph) THEN {"metric-no-target"} ELSE {})

\* none: every rule stays fail-open. spend_and_price: those two are fail-closed. Any other mode names one rule.
ClosedRules(md) ==
  CASE md = "none" -> {}
    [] md = "spend_and_price" -> {"spend-no-runway", "price-below-cost"}
    [] OTHER -> {md}

ExitOf(f, md) == IF (ClosedRules(md) \cap f) # {} THEN "1" ELSE "0"

\* lint() in schema/lint-finance.mjs. Missing and malformed records add nothing and do not throw.
Lint(s, p, m, ph, md) ==
  LET f == FindingsOf(s, p, m, ph)
  IN /\ pc' = "ready"
     /\ phase' = ph
     /\ spend' = s
     /\ price' = p
     /\ metric' = m
     /\ mode' = md
     /\ findings' = f
     /\ exitCode' = ExitOf(f, md)
     /\ crashed' = FALSE
     /\ source' = "ventureFile"

Init ==
  /\ pc = "start"
  /\ phase = "validation"
  /\ spend = "absent"
  /\ price = "absent"
  /\ metric = "absent"
  /\ mode = "none"
  /\ findings = {}
  /\ exitCode = "0"
  /\ crashed = FALSE
  /\ source = "ventureFile"

LoadAbsent == pc = "start" /\ Lint("absent", "absent", "absent", "validation", "none")
LoadClean == pc = "start" /\ Lint("clean", "clean", "covered", "validation", "none")
LoadSpend == pc = "start" /\ Lint("no_runway", "clean", "covered", "validation", "none")
LoadPrice == pc = "start" /\ Lint("clean", "below", "covered", "validation", "none")
LoadMetric == pc = "start" /\ Lint("clean", "clean", "validation_only", "validation", "none")
LoadNoTargets == pc = "start" /\ Lint("clean", "clean", "no_targets", "validation", "none")
LoadAll == pc = "start" /\ Lint("no_runway", "below", "validation_only", "validation", "none")
LoadMalformed == pc = "start" /\ Lint("malformed", "malformed", "malformed", "validation", "none")
LoadMissingPrice == pc = "start" /\ Lint("clean", "missing_price", "covered", "validation", "none")
LoadMissingCost == pc = "start" /\ Lint("clean", "missing_cost", "covered", "validation", "none")

\* venture.json phase changes. The metric rule is recomputed; the other records stay.
PhaseChanges == \E ph \in Phases : pc = "ready" /\ ph # phase /\ Lint(spend, price, metric, ph, mode)

\* naive.config.json finance_lint.rules.<id>.mode changes. Findings stay; the exit code is recomputed.
ModeChanges == \E md \in Modes : pc = "ready" /\ md # mode /\ Lint(spend, price, metric, phase, md)

Done == pc = "ready" /\ UNCHANGED vars

Next ==
  \/ LoadAbsent \/ LoadClean \/ LoadSpend \/ LoadPrice \/ LoadMetric \/ LoadNoTargets \/ LoadAll
  \/ LoadMalformed \/ LoadMissingPrice \/ LoadMissingCost
  \/ PhaseChanges \/ ModeChanges \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ pc \in {"start", "ready"}
  /\ phase \in Phases
  /\ spend \in {"absent", "clean", "no_runway", "malformed"}
  /\ price \in {"absent", "clean", "below", "missing_price", "missing_cost", "malformed"}
  /\ metric \in {"absent", "covered", "validation_only", "no_targets", "malformed"}
  /\ mode \in Modes
  /\ findings \subseteq {"spend-no-runway", "price-below-cost", "metric-no-target"}
  /\ exitCode \in {"0", "1"}
  /\ crashed \in BOOLEAN
  /\ source = "ventureFile"

\* Each rule fires on the fixture that breaks it. A metric fires only in a phase that has no numeric target.
FiresOnFixture ==
  /\ (spend = "no_runway") => ("spend-no-runway" \in findings)
  /\ (price = "below") => ("price-below-cost" \in findings)
  /\ (metric = "no_targets") => ("metric-no-target" \in findings)
  /\ (metric = "validation_only" /\ phase # "validation") => ("metric-no-target" \in findings)

\* A clean record, a missing record, a malformed record, or a price or cost that is not a number stays silent.
SilentWhenClean ==
  /\ (spend \in {"absent", "clean", "malformed"}) => ("spend-no-runway" \notin findings)
  /\ (price \in {"absent", "clean", "missing_price", "missing_cost", "malformed"}) => ("price-below-cost" \notin findings)
  /\ (metric \in {"absent", "malformed", "covered"}) => ("metric-no-target" \notin findings)
  /\ (metric = "validation_only" /\ phase = "validation") => ("metric-no-target" \notin findings)

\* Exit 1 if and only if a fail-closed rule has a finding.
ExitIffFailClosed == (exitCode = "1") <=> ((ClosedRules(mode) \cap findings) # {})

\* A missing record, a malformed record, or a missing price or cost never crashes the run.
NoCrash == crashed = FALSE

\* The checker reads record bytes only through ventureFile.
InputsFromVentureFile == source = "ventureFile"

====
