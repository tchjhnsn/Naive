---
type: knowledge
tags: [naive, skills, supply-chain, apqc-4-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:52:02Z
source: hybrid
name: produce-assemble-test-product
process_group: "4.3"
description: >
  Run and record production for a venture that makes or assembles physical
  goods: scheduling and releasing a build, working the run and closing it with
  its yield and cost, testing a lot against the written standard, and keeping lot
  traceability. Load it in the four workflows of APQC process group 4.3, and when
  the founder asks "can we start this build", "what did that run really cost",
  "is this lot good" or "which units came from that batch".
---

# produce-assemble-test-product

You schedule, record and test. You compute yield and the cost of one good unit, and you say what a run proved. The founder releases a build, approves what it commits, accepts or rejects a lot and decides what happens to a failure. Nothing is released on your word, and no lot is accepted by an agent.

Keep every figure attached to a lot. A yield, a defect rate or a cost per unit with no lot behind it cannot be traced to a supplier, a procedure or a batch of parts, and so it cannot be acted on.

## The processes

### 4.3.1 Schedule production

Runs `workflows/4-3-1-schedule-production.json`.

Work down the levels in order: the master schedule gives the week, the line plan gives the quantity per line and the run order, the detailed schedule gives the days, the hours and who is doing it, and the production order gives the lot. Find the station that limits output and schedule around it rather than loading every station, which is the one lesson of the theory of constraints worth applying on a bench. Release is the gate: materials on hand, the procedure and acceptance standard current, and a person's approval of what the run commits in money and parts. Good evidence is a release record naming the lot, the materials issued and who approved it. The trap is releasing against materials that are on order rather than in hand, which turns one late shipment into a half-built batch and idle time.

To the person: the release itself, and any unplanned repair, because the cost of the repair is judged against the builds it is holding up.

### 4.3.2 Produce/Assemble product

Runs `workflows/4-3-2-produce-assemble-product.json`.

Record as the run happens, not afterwards: materials issued, start and finish, who built it, quantity completed, quantity set aside, and every deviation from the written procedure at the moment it happens. Close the run with first pass yield, hours per unit and the cost of one good unit including scrap and rework, and compare those with the manufacturing targets. Count reworked units apart from units that passed first time, because a yield that hides rework hides the real cost. Good evidence is a run record whose numbers add up: units issued, good, reworked and scrapped reconciling to the materials drawn. The trap is pricing from the planned cost after a run that proved the real one.

To the person: whatever the run proved wrong, a part that does not fit, a yield too low to sell at the planned price, a step that needs a jig, each as a decision with its cost per unit.

### 4.3.3 Perform quality testing

Runs `workflows/4-3-3-perform-quality-testing.json`.

Test to the procedure, with the sample size it names, and refuse to report a measurement from an instrument whose calibration is out of date; a calibration certificate from a laboratory accredited to ISO/IEC 17025 is what makes a measurement defensible to a supplier. Keep the retained sample from each lot, labelled and stored, because a field failure months later can only be compared with what actually left the bench. Then work on the trend rather than the lot: count failures by type, by lot and by supplier, take the type that carries most of the loss, and find its cause in the design, the part, the process or the handling. State what the cause predicts and what would show it wrong before proposing the fix. The trap is testing the units that look suspect instead of the sample, which produces a number that cannot be compared between lots.

To the person: the accept or reject verdict on a failing lot, and the choice between a concession, rework, return and scrap, each of which costs money or a relationship.

### 4.3.4 Maintain production records and manage lot traceability

Runs `workflows/4-3-4-maintain-production-records-and-manage-lot.json`.

Set the numbering rule once and write down what each part of the number means and where it is marked on the unit and the carton; GS1 standards define a batch or lot number as an attribute carried alongside the product identifier, which is worth following if the venture will ever sell through a retailer. Then record, per lot, the purchase orders and supplier lots that fed it, its test results, the units it yielded and where those units went. The test of the chain is a question: given a unit a customer returns, can the venture name the lot, its materials and every other unit affected. The trap is a numbering scheme that runs out or repeats, such as a date with no sequence, which silently merges two batches a year later.

To the person: every break in the chain, as a decision between the cost of closing the gap and the cost of a recall that cannot name the units affected.

## Records

These workflows read `product`, `product/bugs`, `support/cases`, `supply-chain/suppliers`, `supply-chain/purchase-orders`, `assets/register`, `deals`, `legal/obligations` and `decisions/*`, and they write `supply-chain/purchase-orders/[id]` and `decisions/*`.

Naive has no record type for a production order, a lot, a run record, a test result, a maintenance request or an equipment calibration: not built. Until there is one, the run record, the test results and the lot history go on the handoff (`operations/handoff/*`) as the run's evidence, the quantities received and the lot a shipment fed go on the purchase order the materials arrived on, and the accept or reject verdict is recorded as a decision.

## Standards

- APQC Process Classification Framework 8.0, category 4.0, process group 4.3, which names these four processes.
- First pass yield, the share of units that pass without rework, as the production measure that does not hide rework cost.
- The theory of constraints (Goldratt): output is set by the limiting step, so schedule and improve that step first.
- ISO 2859-1, sampling procedures for inspection by attributes, for the sample size and acceptance quality limit a test procedure names.
- ISO/IEC 17025, the competence requirements for testing and calibration laboratories, which a calibration certificate cites.
- Root cause analysis with a cause-and-effect diagram (Ishikawa) and Pareto analysis of failure types, to work on the failure that carries most of the loss.
- GS1 standards for identifying a trade item and carrying its batch or lot number, for a venture that will sell through retail.

## What the person decides

- Whether a production order is released, and what the run commits in money and parts.
- Whether to pay for an unplanned repair now or let the schedule slip.
- Whether a lot is accepted, reworked, returned to the supplier or scrapped.
- Whether a unit that failed may be sold as a second, and at what price.
- Whether to make the fix a run argued for, and to accept its cost per unit.
- Whether a break in lot traceability is closed or accepted.
