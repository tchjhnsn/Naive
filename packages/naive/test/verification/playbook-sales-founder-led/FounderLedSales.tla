---- MODULE FounderLedSales ----
\* One customer moving through the buying stages in
\* packages/naive/library/packages/customers/playbooks/sales-founder-led.md.
\* Each action is one template step, or a write the customers/[id] route accepts
\* when that step is skipped. The comment names the routes.
\* RealRoutes was taken from `node interface/router.mjs` on this branch.
\* The model follows one customer, so the "ten paying" goal is bounded to one
\* (Goal below). The playbook's check counts ten. The replay uses ten.

EXTENDS FiniteSets

RealRoutes == {
  "foundation/icp",
  "foundation/problem",
  "product/[id]",
  "validation/pricing",
  "people/founders",
  "customers",
  "customers/[id]",
  "purpose/data-stream/[id]",
  "knowledge/knowledge-sources"
}

VARIABLES
  foundation,     \* the venture has foundation/icp, foundation/problem, and a product
  source,         \* "absent" or "external": knowledge/knowledge-sources names no other source, or it does
  sourcesRead,    \* step 1 has read knowledge/knowledge-sources
  foundationRead, \* step 2 has read the three foundation routes
  price,          \* "unread", "absent", or "known" after reading validation/pricing
  stream,         \* purpose/data-stream/conversations has been written
  deal,           \* none, named, aware, trying, paying, gone, or other
  notes,          \* customers/[id] notes are non-empty
  amount,         \* paying notes include a numeral the buyer paid or was charged
  caller,         \* notes include who held the call
  nextAsk,        \* trying notes include the date of the next ask
  icpKey,         \* the record cites an icp id
  pointer,        \* the record is a pointer because a source outside the folder holds customers
  stopped,        \* step 2 found the foundation records missing, so the template stops
  verdict,        \* "none", "pass", or "fail" after the checks
  used            \* routes this run has read or written

vars == <<foundation, source, sourcesRead, foundationRead, price, stream, deal, notes, amount, caller, nextAsk, icpKey, pointer, stopped, verdict, used>>

StageKnown == deal \in {"none", "named", "aware", "trying", "paying", "gone"}
ListStarted == deal # "none"
IcpCited == deal = "none" \/ icpKey
NamedQuiet == deal # "named" \/ ~notes
NotesOk == deal \in {"none", "named"} \/ notes
StreamOk == ~notes \/ stream
CallerOk == deal \in {"none", "named"} \/ caller
TryingOk == deal # "trying" \/ nextAsk
AmountOk == deal # "paying" \/ amount
\* One customer stands in for the playbook's ten. Replay counts ten records.
Goal == deal = "paying" /\ amount
Passes == StageKnown /\ ListStarted /\ IcpCited /\ NamedQuiet /\ NotesOk /\ StreamOk /\ CallerOk /\ TryingOk /\ AmountOk /\ Goal

TypeOK ==
  /\ foundation \in BOOLEAN
  /\ source \in {"absent", "external"}
  /\ sourcesRead \in BOOLEAN
  /\ foundationRead \in BOOLEAN
  /\ price \in {"unread", "absent", "known"}
  /\ stream \in BOOLEAN
  /\ deal \in {"none", "named", "aware", "trying", "paying", "gone", "other"}
  /\ notes \in BOOLEAN /\ amount \in BOOLEAN /\ caller \in BOOLEAN /\ nextAsk \in BOOLEAN
  /\ icpKey \in BOOLEAN /\ pointer \in BOOLEAN /\ stopped \in BOOLEAN
  /\ verdict \in {"none", "pass", "fail"}
  /\ used \subseteq RealRoutes

\* Every route a step reads or writes is a route the router has.
RoutesAreReal == used \subseteq RealRoutes

\* A step does not use a record the venture did not provide, or an earlier step did not write.
\* Citing an icp id requires the foundation records. A pointer requires an external source.
\* Notes are not written before the customer exists. An amount or a caller is not written before notes.
\* The price record is never copied onto the customer: amount is set only by Close, from the buyer.
NoPhantomRead ==
  /\ icpKey => foundation
  /\ pointer => source = "external"
  /\ notes => deal # "none"
  /\ amount => notes
  /\ caller => notes

\* The check result is pass exactly when the records meet every check. Both results are reachable.
ChecksAreReal == verdict = "none" \/ (verdict = "pass" <=> Passes)

Init ==
  /\ foundation \in {TRUE, FALSE}
  /\ source \in {"absent", "external"}
  /\ sourcesRead = FALSE
  /\ foundationRead = FALSE
  /\ price = "unread"
  /\ stream = FALSE
  /\ deal = "none"
  /\ notes = FALSE
  /\ amount = FALSE
  /\ caller = FALSE
  /\ nextAsk = FALSE
  /\ icpKey = FALSE
  /\ pointer = FALSE
  /\ stopped = FALSE
  /\ verdict = "none"
  /\ used = {}

\* Read knowledge/knowledge-sources. Absence and an external source are both real answers.
\* The step does not copy fields out of that record.
ReadSources ==
  /\ ~sourcesRead /\ verdict = "none" /\ ~stopped
  /\ sourcesRead' = TRUE
  /\ used' = used \cup {"knowledge/knowledge-sources"}
  /\ UNCHANGED <<foundation, source, foundationRead, price, stream, deal, notes, amount, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* Read foundation/icp, foundation/problem, and product/[id].
\* Missing records stop the template. They are not filled in.
ReadFoundation ==
  /\ sourcesRead /\ ~foundationRead /\ verdict = "none" /\ ~stopped
  /\ foundationRead' = TRUE
  /\ stopped' = ~foundation
  /\ used' = used \cup {"foundation/icp", "foundation/problem", "product/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, price, stream, deal, notes, amount, caller, nextAsk, icpKey, pointer, verdict>>

\* Read validation/pricing. "absent" and "known" are the two answers.
\* Neither answer writes an amount onto the customer.
ReadPrice ==
  /\ foundation /\ foundationRead /\ ~stopped /\ price = "unread" /\ verdict = "none"
  /\ price' \in {"absent", "known"}
  /\ used' = used \cup {"validation/pricing"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, stream, deal, notes, amount, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* Write customers/[id] at named, citing the icp id. Notes stay empty.
NameCustomer ==
  /\ price # "unread" /\ deal = "none" /\ ~stopped /\ verdict = "none"
  /\ deal' = "named"
  /\ icpKey' = TRUE
  /\ pointer' = (source = "external")
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, notes, amount, caller, nextAsk, stopped, verdict>>

\* Write purpose/data-stream/conversations before any notes.
OpenStream ==
  /\ deal = "named" /\ ~stream /\ verdict = "none" /\ ~stopped
  /\ stream' = TRUE
  /\ used' = used \cup {"purpose/data-stream/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, deal, notes, amount, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* Write customers/[id] at aware. Read people/founders so the caller id is one that exists, when any do.
\* The caller flag is what you write, not a copy of the founder record's other fields.
Meet ==
  /\ deal = "named" /\ stream /\ ~notes /\ verdict = "none" /\ ~stopped
  /\ deal' = "aware"
  /\ notes' = TRUE
  /\ caller' = TRUE
  /\ used' = used \cup {"customers/[id]", "people/founders"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, amount, nextAsk, icpKey, pointer, stopped, verdict>>

\* Write trying, with the date you will ask for payment.
StartTrying ==
  /\ deal = "aware" /\ notes /\ verdict = "none" /\ ~stopped
  /\ deal' = "trying"
  /\ nextAsk' = TRUE
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, notes, amount, caller, icpKey, pointer, stopped, verdict>>

\* The route accepts trying with no ask date. The trying check then fails.
TryWithoutAsk ==
  /\ deal = "aware" /\ notes /\ verdict = "none" /\ ~stopped
  /\ deal' = "trying"
  /\ nextAsk' = FALSE
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, notes, amount, caller, icpKey, pointer, stopped, verdict>>

\* They pay an amount. The amount comes from the buyer, not from validation/pricing.
Close ==
  /\ deal \in {"aware", "trying"} /\ notes /\ stream /\ verdict = "none" /\ ~stopped
  /\ deal' = "paying"
  /\ amount' = TRUE
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, notes, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* The route accepts paying with no numeral. The paying check then fails.
PayWithoutAmount ==
  /\ deal \in {"aware", "trying"} /\ notes /\ stream /\ verdict = "none" /\ ~stopped
  /\ deal' = "paying"
  /\ amount' = FALSE
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, notes, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* Write gone. From named, this also writes the reason into notes, which the stream must already hold a place for.
LetGo ==
  /\ deal \in {"aware", "trying", "paying"} /\ stream /\ notes /\ verdict = "none" /\ ~stopped
  /\ deal' = "gone"
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, notes, amount, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* Notes on a named record before the stream exists. The stream check and the named check then fail.
NotesBeforeStream ==
  /\ deal = "named" /\ ~stream /\ ~notes /\ verdict = "none" /\ ~stopped
  /\ notes' = TRUE
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, deal, amount, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* A buying_stage value outside the five words. The stage check then fails.
BadStage ==
  /\ deal = "named" /\ ~notes /\ verdict = "none" /\ ~stopped
  /\ deal' = "other"
  /\ used' = used \cup {"customers/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, notes, amount, caller, nextAsk, icpKey, pointer, stopped, verdict>>

\* Read customers, customers/[id], foundation/icp, and purpose/data-stream/[id], and judge the checks.
RunCheck ==
  /\ verdict = "none"
  /\ stopped \/ price # "unread" \/ deal # "none"
  /\ verdict' = IF Passes THEN "pass" ELSE "fail"
  /\ used' = used \cup {"customers", "customers/[id]", "foundation/icp", "purpose/data-stream/[id]"}
  /\ UNCHANGED <<foundation, source, sourcesRead, foundationRead, price, stream, deal, notes, amount, caller, nextAsk, icpKey, pointer, stopped>>

\* End: the template stopped, or the checks have a result. Changes nothing.
Done ==
  /\ verdict # "none" \/ stopped
  /\ UNCHANGED vars

Next ==
  ReadSources \/ ReadFoundation \/ ReadPrice \/ NameCustomer \/ OpenStream \/ Meet
  \/ StartTrying \/ TryWithoutAsk \/ Close \/ PayWithoutAmount \/ LetGo
  \/ NotesBeforeStream \/ BadStage \/ RunCheck \/ Done

Spec == Init /\ [][Next]_vars
====
