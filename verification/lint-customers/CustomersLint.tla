---- MODULE CustomersLint ----
\* Customers lint (schema/lint-customers.mjs, route customers/lint).
\* One customer and one promise that names one product key. Each action is one change to the
\* records, then one lint run. The product variable is the product record read by that key on
\* this run, through ventureFile (packages/core/venture-paths.mjs). A later change to the product is
\* what the next run sees. The lint does not copy the product onto the customer.
\*
\* icp = "gone" covers a missing ICP file and an unreadable one: both leave no profile ids.
\* configMode = "config-bad" is an unreadable naive.config.json: the override is not applied,
\* so both rules stay fail-open. "open" is the default.

VARIABLES
  customer,    \* "none" | "matched" | "unmatched" | "bad"
  icp,         \* "known" | "gone"
  promise,     \* "none" | "made"
  product,     \* "keeps" | "dropped" | "retired" | "missing" | "bad"
  configMode,  \* "open" | "icp-closed" | "promise-closed" | "both-closed" | "config-bad"
  via,         \* "ventureFile"
  findingIcp,
  findingPromise,
  exitCode,
  crashed

vars == <<customer, icp, promise, product, configMode, via, findingIcp, findingPromise, exitCode, crashed>>

IcpOn(c, i) == (c \in {"matched", "unmatched"}) /\ ((c = "unmatched") \/ (i # "known"))
PromiseOn(c, pr, prod) == (pr = "made") /\ (c \in {"matched", "unmatched"}) /\ (prod # "keeps")
ClosedIcp(cfg) == cfg \in {"icp-closed", "both-closed"}
ClosedPromise(cfg) == cfg \in {"promise-closed", "both-closed"}

RECOMPUTE(c, i, pr, prod, cfg) ==
  LET icpOn == IcpOn(c, i)
      prOn == PromiseOn(c, pr, prod)
  IN /\ customer' = c
     /\ icp' = i
     /\ promise' = pr
     /\ product' = prod
     /\ configMode' = cfg
     /\ via' = "ventureFile"
     /\ crashed' = FALSE
     /\ findingIcp' = icpOn
     /\ findingPromise' = prOn
     /\ exitCode' = IF ((icpOn /\ ClosedIcp(cfg)) \/ (prOn /\ ClosedPromise(cfg))) THEN 1 ELSE 0

Init ==
  /\ customer = "none" /\ icp = "known" /\ promise = "none" /\ product = "keeps" /\ configMode = "open"
  /\ via = "ventureFile" /\ crashed = FALSE /\ findingIcp = FALSE /\ findingPromise = FALSE /\ exitCode = 0

MatchCustomer == customer # "matched" /\ RECOMPUTE("matched", icp, promise, product, configMode)
UnmatchCustomer == customer # "unmatched" /\ RECOMPUTE("unmatched", icp, promise, product, configMode)
\* Removing the customer record removes the promise with it.
DropCustomer == customer # "none" /\ RECOMPUTE("none", icp, "none", product, configMode)
BreakCustomer == customer # "bad" /\ RECOMPUTE("bad", icp, promise, product, configMode)

\* The promise is recorded while the product record still keeps it.
MakePromise ==
  /\ customer \in {"matched", "unmatched"} /\ promise # "made"
  /\ RECOMPUTE(customer, icp, "made", "keeps", configMode)
\* The promise is recorded against a product record that already does not keep it.
PromiseIntoGap ==
  /\ customer \in {"matched", "unmatched"} /\ promise # "made" /\ product # "keeps"
  /\ RECOMPUTE(customer, icp, "made", product, configMode)

\* The product record changes after the promise (or before one exists).
DropWords == product # "dropped" /\ RECOMPUTE(customer, icp, promise, "dropped", configMode)
RetireProduct == product # "retired" /\ RECOMPUTE(customer, icp, promise, "retired", configMode)
RemoveProduct == product # "missing" /\ RECOMPUTE(customer, icp, promise, "missing", configMode)
BreakProduct == product # "bad" /\ RECOMPUTE(customer, icp, promise, "bad", configMode)
RestoreProduct == product # "keeps" /\ RECOMPUTE(customer, icp, promise, "keeps", configMode)

LoseIcp == icp # "gone" /\ RECOMPUTE(customer, "gone", promise, product, configMode)
RestoreIcp == icp # "known" /\ RECOMPUTE(customer, "known", promise, product, configMode)

OpenRules == configMode # "open" /\ RECOMPUTE(customer, icp, promise, product, "open")
CloseIcp == configMode # "icp-closed" /\ RECOMPUTE(customer, icp, promise, product, "icp-closed")
ClosePromise == configMode # "promise-closed" /\ RECOMPUTE(customer, icp, promise, product, "promise-closed")
CloseBoth == configMode # "both-closed" /\ RECOMPUTE(customer, icp, promise, product, "both-closed")
BreakConfig == configMode # "config-bad" /\ RECOMPUTE(customer, icp, promise, product, "config-bad")

Next ==
  \/ MatchCustomer \/ UnmatchCustomer \/ DropCustomer \/ BreakCustomer
  \/ MakePromise \/ PromiseIntoGap
  \/ DropWords \/ RetireProduct \/ RemoveProduct \/ BreakProduct \/ RestoreProduct
  \/ LoseIcp \/ RestoreIcp
  \/ OpenRules \/ CloseIcp \/ ClosePromise \/ CloseBoth \/ BreakConfig

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ customer \in {"none", "matched", "unmatched", "bad"}
  /\ icp \in {"known", "gone"}
  /\ promise \in {"none", "made"}
  /\ product \in {"keeps", "dropped", "retired", "missing", "bad"}
  /\ configMode \in {"open", "icp-closed", "promise-closed", "both-closed", "config-bad"}
  /\ via = "ventureFile"
  /\ crashed \in BOOLEAN
  /\ findingIcp \in BOOLEAN
  /\ findingPromise \in BOOLEAN
  /\ exitCode \in {0, 1}

\* The findings are exactly the two rules on the records this run read.
FindingsMatch ==
  /\ findingIcp = IcpOn(customer, icp)
  /\ findingPromise = PromiseOn(customer, promise, product)

\* Exit 1 if and only if a fail-closed rule has findings. config-bad applies no override.
ExitIffFailClosed ==
  exitCode = IF ((findingIcp /\ ClosedIcp(configMode)) \/ (findingPromise /\ ClosedPromise(configMode))) THEN 1 ELSE 0

\* A customer who matches a known ICP, with no promise or a promise the product still keeps, is quiet.
SilentOnClean ==
  (customer = "matched" /\ icp = "known" /\ ((promise = "none") \/ (product = "keeps")))
    => (~findingIcp /\ ~findingPromise /\ (exitCode = 0))

\* Each rule fires on its fixture: an unmatched customer, and a kept-then-dropped promise.
RuleFiresOnItsFixture ==
  /\ ((customer = "unmatched") /\ (icp = "known") => findingIcp)
  /\ ((customer = "matched") /\ (icp = "known") /\ (promise = "made") /\ (product = "dropped")
      => findingPromise /\ ~findingIcp)

\* A missing or unreadable customer, ICP, product or config does not crash the run.
MalformedNeverCrashes ==
  ((customer = "bad") \/ (product = "bad") \/ (icp = "gone") \/ (configMode = "config-bad")) => ~crashed

\* A promise finding follows the product record read on this run, not a copy taken when the promise was made.
PromiseFollowsCurrentProduct ==
  findingPromise = PromiseOn(customer, promise, product)

\* Every read this run is through ventureFile.
ReadsOnlyViaVentureFile == via = "ventureFile"
====
