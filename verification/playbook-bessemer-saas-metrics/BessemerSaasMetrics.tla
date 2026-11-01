---- MODULE BessemerSaasMetrics ----
\* The states a founder's records move through while the Bessemer SaaS metrics playbook runs
\* (packages/finance/playbooks/bessemer-saas-metrics.md).
\* Each action is one route call. The comment names the route the replay drives.

VARIABLES
  pc, route, phase, productPresent, moneyPresent, telosPresent,
  sources, decision, targets, actuals, check, telosDraft

vars == <<pc, route, phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, check, telosDraft>>

Phases == {"discovery", "validation", "beachhead", "scale", "platform"}
Early == {"discovery", "validation"}
\* Routes the running router answers. Replay confirms each one. finance/metrics is not here.
Routes == {
  "venture",
  "product/[id]",
  "validation/pricing",
  "purpose/money/summary",
  "validation/product-market-fit",
  "foundation/telos",
  "raw/sources/[id]",
  "decisions/[id]",
  "evidence/[id]"
}

Init ==
  /\ pc = "start"
  /\ route = "none"
  /\ phase \in Phases
  /\ productPresent \in BOOLEAN
  /\ moneyPresent \in BOOLEAN
  /\ telosPresent \in BOOLEAN
  /\ sources = FALSE
  /\ decision = "none"
  /\ targets = "none"
  /\ actuals = "none"
  /\ check = "none"
  /\ telosDraft = FALSE

\* venture: the phase is already on the venture. The step reads it. It does not invent one.
ReadVenture ==
  /\ pc = "start"
  /\ pc' = "venture"
  /\ route' = "venture"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, check, telosDraft>>

\* product/[id]. The route is read either way. The product's fields are used only when the venture has a card.
ReadProduct ==
  /\ pc = "venture"
  /\ pc' = "product"
  /\ route' = "product/[id]"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, check, telosDraft>>

\* validation/pricing. Pricing is inherited. This step does not copy it into a second record.
ReadPricing ==
  /\ pc = "product"
  /\ pc' = "pricing"
  /\ route' = "validation/pricing"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, check, telosDraft>>

\* purpose/money/summary. Runway and flows are taken only when the summary is there.
ReadMoney ==
  /\ pc = "pricing"
  /\ pc' = "money"
  /\ route' = "purpose/money/summary"
  /\ actuals' = IF moneyPresent THEN "from-money" ELSE "withheld"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, check, telosDraft>>

\* validation/product-market-fit. Retention cohorts stay on that record.
ReadFit ==
  /\ pc = "money"
  /\ pc' = "fit"
  /\ route' = "validation/product-market-fit"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, check, telosDraft>>

\* foundation/telos. Read so a later draft can add exit criteria. A missing telos is not filled in here.
ReadTelos ==
  /\ pc = "fit"
  /\ pc' = "telos"
  /\ route' = "foundation/telos"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, check, telosDraft>>

\* raw/sources/[id]. Filing the Bessemer pages is what later steps cite.
FileSources ==
  /\ pc = "telos"
  /\ pc' = "sources"
  /\ route' = "raw/sources/[id]"
  /\ sources' = TRUE
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, decision, targets, actuals, check, telosDraft>>

\* decisions/[id] through propose: status stays open. Targets start as the phrase "no published Bessemer target".
ProposeMetrics ==
  /\ pc = "sources"
  /\ sources
  /\ pc' = "decision"
  /\ route' = "decisions/[id]"
  /\ decision' = "open"
  /\ targets' = "unpublished"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, actuals, check, telosDraft>>

\* The founder may replace a later phase's target with a cited benchmark. Discovery and validation cannot.
\* The chart hides this step: the label stays "Metrics record proposed".
CiteTarget ==
  /\ pc = "decision"
  /\ decision = "open"
  /\ sources
  /\ targets = "unpublished"
  /\ phase \notin Early
  /\ targets' = "cited"
  /\ route' = "decisions/[id]"
  /\ UNCHANGED <<pc, phase, productPresent, moneyPresent, telosPresent, sources, decision, actuals, check, telosDraft>>

\* evidence/[id]. The check passes only when the product is on file, sources are filed, actuals came from
\* the money summary or were withheld, and an early phase was not given a cited number.
Honest ==
  /\ productPresent
  /\ sources
  /\ decision = "open"
  /\ targets \in {"unpublished", "cited"}
  /\ (targets = "cited" => phase \notin Early)
  /\ actuals \in {"from-money", "withheld"}
  /\ (actuals = "from-money") = moneyPresent

RunChecks ==
  /\ pc = "decision"
  /\ pc' = "checked"
  /\ route' = "evidence/[id]"
  /\ check' = IF Honest THEN "pass" ELSE "fail"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, telosDraft>>

\* A person decides. The model has no action that lets an agent set the decision to decided.
YouDecide ==
  /\ pc = "checked"
  /\ check = "pass"
  /\ pc' = "decided"
  /\ decision' = "founder"
  /\ route' = "decisions/[id]"
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, targets, actuals, check, telosDraft>>

\* foundation/telos. An agent drafts exit criteria only after the founder decides, and only when a telos
\* is already there. The draft is not a settled record (telosDraft, not a settled flag).
DraftTargets ==
  /\ pc = "decided"
  /\ decision = "founder"
  /\ check = "pass"
  /\ telosPresent
  /\ pc' = "on-telos"
  /\ route' = "foundation/telos"
  /\ telosDraft' = TRUE
  /\ UNCHANGED <<phase, productPresent, moneyPresent, telosPresent, sources, decision, targets, actuals, check>>

Done ==
  /\ \/ (pc = "checked" /\ check = "fail")
     \/ pc = "on-telos"
     \/ (pc = "decided" /\ ~telosPresent)
  /\ UNCHANGED vars

Next ==
  \/ ReadVenture
  \/ ReadProduct
  \/ ReadPricing
  \/ ReadMoney
  \/ ReadFit
  \/ ReadTelos
  \/ FileSources
  \/ ProposeMetrics
  \/ CiteTarget
  \/ RunChecks
  \/ YouDecide
  \/ DraftTargets
  \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ pc \in {"start", "venture", "product", "pricing", "money", "fit", "telos", "sources", "decision", "checked", "decided", "on-telos"}
  /\ (route = "none" \/ route \in Routes)
  /\ phase \in Phases
  /\ productPresent \in BOOLEAN
  /\ moneyPresent \in BOOLEAN
  /\ telosPresent \in BOOLEAN
  /\ sources \in BOOLEAN
  /\ decision \in {"none", "open", "founder"}
  /\ targets \in {"none", "unpublished", "cited"}
  /\ actuals \in {"none", "from-money", "withheld"}
  /\ check \in {"none", "pass", "fail"}
  /\ telosDraft \in BOOLEAN

\* Every template step names a route the router really has.
EveryStepUsesARealRoute == route = "none" \/ route \in Routes

\* No step uses a record the venture did not provide and no earlier step wrote.
\* A cited target exists only after the Bessemer pages are filed, and never on discovery or validation.
\* Money actuals are copied only when the money summary was there.
\* The telos draft waits until a person has decided, and only if a telos was already on file.
NoUseBeforeProvided ==
  /\ (actuals = "from-money" => moneyPresent)
  /\ (actuals = "withheld" => ~moneyPresent)
  /\ (targets = "cited" => sources /\ phase \notin Early)
  /\ (phase \in Early => targets # "cited")
  /\ (telosDraft => decision = "founder" /\ telosPresent /\ check = "pass")
  /\ (decision = "founder" => check = "pass")

\* The check is pass or fail from Honest, which is not a constant: a missing product fails it,
\* and a product on file can pass it. A pass stays a pass after the founder decides.
CheckMatches ==
  /\ check \in {"none", "pass", "fail"}
  /\ (check = "pass" => productPresent /\ sources /\ (actuals = "from-money") = moneyPresent /\ (targets = "cited" => phase \notin Early))
  /\ (check = "fail" => ~productPresent)

====
