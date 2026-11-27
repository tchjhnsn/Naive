---
type: knowledge
tags: [naive, skills, products, apqc-2-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:23Z
source: hybrid
name: develop-products-and-services
process_group: "2.3"
description: >
  Take a chosen concept through design, prototype, market test and the setting
  up of the way it reaches a customer, and settle what the venture stands behind
  afterwards: the design specifications, the prototype that answers the risks,
  the sessions with real people, the delivery path run for real, the warranty and
  the recall plan. Load it in the workflows of APQC process group 2.3 and when
  the founder asks "how should this work", "is it ready", "what do we promise"
  or "what would we do if it went wrong".
---

# develop-products-and-services

You design, build the small thing that answers the risk, test, record and recommend. The founder changes a flow a customer already knows, speaks to every customer, supplier and partner, says when it goes live, and settles every promise. A design line with no requirement behind it is marked as an assumption, not written as settled.

A step marked `consider` is optional: run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not.

## The processes

### 2.3.1 Design and prototype products and services

Runs `workflows/2-3-1-design-and-prototype-products-and-services.json`.

Order matters here more than anywhere in the function: who is doing it, then the business case and technical assessment, then the specifications, then the prototype, then the testing, then what the testing found. Write the design specification per capability and trace each line to a requirement, keeping the design inputs, the reviews and the verification on record as a quality system expects (ISO 9001 asks for design inputs, review, verification and validation to be retained). Design for the whole life of the thing, not only its first day: how it is made with what the venture can get, how it is serviced and upgraded without being rebuilt, and what a person does when it misbehaves (design for manufacture and assembly is the established name for the first of these).

A prototype is built to answer a risk, not to be a smaller product: say before you build it which risk it would settle and what result would settle it. Load `four-risks-review` when a build is proposed, because a design with no evidence for value, usability, feasibility or viability is a discovery task. When the testing turns up quality and reliability problems, work from the failure back to its cause and rank by how often it happens and what it costs when it does (failure mode and effects analysis is the usual method), fix what belongs to this design, and record everything left as a bug with a severity and steps to reproduce.

Good evidence is a prototype result, a test run or a review answer with a date. The trap is a design document that reads as decided throughout; mark each line decided, assumed or open.

The person approves any change to a flow a customer already knows (the user experience decision escalates), engages a design or development partner, sends a request to an outside reviewer, and speaks to every supplier. You write what they need and record the answers.

### 2.3.2 Test market for new or revised products and services

Runs `workflows/2-3-2-test-market-for-new-or-revised-products-and.json`.

Put the thing in front of real people before building the rest of it. Write the market study first so the sessions have something to be a test of: who the buyers and users are, how many the records can account for, what they do today instead and what they pay for it, with every estimate marked as the venture's own. Then watch people attempt the job without help. Ask what they do today and what it costs them; never ask them to predict what they would buy, because that answer does not survive contact with a price (the practice of asking about the past rather than the future, as in Fitzpatrick's *The Mom Test*).

Record what each person did and said in their own words, then settle what the product is: which capabilities stay, which are cut, which change, each change naming the session that caused it, and redo the business case with what the sessions showed. Good evidence is an observed attempt and a verbatim quote. The trap is counting enthusiasm: a person who says they love it and then does not finish the task has told you the opposite of what they said.

The person runs the conversation, because talking to a customer is a relationship the venture has, and the interview records belong to the strategy function. You prepare the script, sit in, write the notes, and hand them over.

### 2.3.3 Prepare for production/service delivery

Runs `workflows/2-3-3-prepare-for-production-service-delivery.json`.

Set the path up and run it for real before the launch depends on it. Name what is missing first (a tool, an account, a service, equipment, materials, a skill nobody has) and what each would cost, then name each change the existing way of working needs, then ask the function that owns that work for the change rather than changing their work yourself. Install the path, run the first units or the first sessions, and watch them: how long each step took, what needed a person, what failed, whether the output met the quality document.

Rehearse the launch itself, including how it is turned back: what is switched on in what order, what tells the venture it has gone wrong, how it is reversed, and who answers the first customer. Good evidence is a timed run with its failures written down. The trap is declaring the path ready after a run that a person rescued by hand; a path that cannot be run twice the same way is not ready, and you say so.

The person spends the money, and the person says when it goes live.

### 2.3.4 Define warranty claims

Runs `workflows/2-3-4-define-warranty-claims.json`.

A promise is a cost, so cost it before it is made: estimate what each promise would cost to honour from the bug and support records, and bring the policy to the founder with the figure. Once the policy is settled, turn it into named kinds of claim with what counts as each, the evidence a customer must give, what it is answered with, and who may answer without asking the founder, because that is what lets anyone but the founder handle one. Settle who pays when a supplier's part is at fault before it fails, reading what the supplier's own terms already promise.

Good evidence is a cost per claim computed from claims the venture has actually answered. The trap is a published promise the venture cannot keep, which costs more than the failure it covers.

The person settles every promise, agrees anything with a supplier, and approves the words customers read, because a published promise is a public commitment.

### 2.3.5 Develop recall strategy

Runs `workflows/2-3-5-develop-recall-strategy.json`.

Write it before it is needed; in the hour it is needed nobody writes anything. Start from what would have to be pulled back and from whom: a release or version, a batch of units, a published file, a model output already acted on. For each one, say where the record of who has it lives and whether the venture can produce that list today, because a recall plan that assumes a list the venture cannot produce is not a plan. Then write how the venture learns of it, how it stops it spreading in the first hour, who is told in what order and within what time, and what is recorded while it happens. Think of it as a risk treated in advance, with its likelihood, its consequence and the treatment named (ISO 31000's vocabulary fits: identify, analyse, evaluate, treat).

Good evidence is a dry run or, failing that, a named owner for each step who is not only the founder. The trap is writing the notice at the time: draft it now, with the facts left as blanks.

The person decides what the venture would promise in a recall and approves the notice in advance, since only the founder speaks to customers and the public.

## Records

The workflows read `product`, `product/bugs`, `product/capabilities`, `foundation/icp`, `foundation/problem`, `foundation/requirements`, `foundation/constraints`, `foundation/goals`, `validation/plan`, `validation/interviews`, `validation/feedback`, `validation/pricing`, `validation/product-market-fit`, `validation/operations-readiness`, `support/policy`, `support/cases`, `customers`, `deals`, `markets`, `purpose/competitor`, `marketing/design-system`, `marketing/message`, `people/team`, `people/team-plan`, `finance/budget`, `finance/spend`, `legal/obligations`, `legal/risks`, `it/connections`, `assets/register`, `capabilities/processes`, `supply-chain/suppliers`, `supply-chain/purchase-orders`, `governance/publication-policy`, `operations/handoff` and `decisions`.

They write only `product/[id]`, `product/capabilities/[id]`, `product/bugs/[id]`, `decisions/[id]` and the handoff they run under (`operations/handoff/[id]`).

Records this work wants that Naive has no route for, and so are not built: a design specification and a prototype result as records of their own, a market study record, a launch rehearsal and runbook record, a warranty policy and claim register, and a recall plan record. Until they exist, the specification lines live on the capability record, the problems found become bugs, and the rest lives on the handoff and in the decision that settled it.

## Standards

- The four product risks (value, usability, feasibility, viability), checked with `four-risks-review` before a build handoff is accepted.
- ISO 9001's design and development expectations: keep the design inputs, the reviews, the verification and the validation on record.
- Design for manufacture and assembly, for a product that is made rather than only run.
- Failure mode and effects analysis for ranking quality and reliability problems by how often they happen and what they cost.
- Fitzpatrick's *The Mom Test*: ask about what the customer does today, not what they would buy.
- ISO 31000's vocabulary for the recall strategy: identify, analyse, evaluate and treat the risk.
- WCAG for an accessibility review of a user interface, before release rather than after.

## What the person decides

- Every change to a flow a customer already knows, and every design decision that changes what the product promises.
- Who is engaged as a design or development partner, and what is said to a supplier or an outside reviewer.
- Every conversation with a customer in a market test, and what is asked of them.
- What money is spent to set up the way the product reaches a customer, and when it goes live.
- What the venture stands behind: the warranty, its exclusions, the cover offered, and the words customers read.
- What the venture would promise in a recall, and the notice it would send.
