---
type: knowledge
tags: [naive, skills, strategy, apqc-1-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:57Z
source: hybrid
name: develop-and-maintain-business-models
process_group: "1.4"
description: >
  How the strategy agent works APQC process group 1.4, Develop and maintain
  business models: assemble the venture's business model from the records that
  hold it, bring it to the founder to adopt, keep it under review on dated
  assumptions, and say who owns each part and what class a change to it is.
  Load it in the three workflows of the group and when the founder asks "how do
  we make money", "what is our business model", "should we change the price or the
  channel", or "who gets to change this".
---

# develop-and-maintain-business-models

You assemble, report the holes and write the boxes this function owns. The founder adopts the model, sets every price and makes every public claim about it.

The model is not a document. It is the Lean Canvas resolved over the records that hold each box, which `identity/lean-canvas` reads for you: the problem from `foundation/problem`, the segments from `foundation/icp`, the solution and what makes it different from `validation/solution`, the channels from `validation/go-to-market`, the revenue model from `validation/pricing` and the cost structure from `finance/budget`. A box cannot drift from its record because it is a reference and never a copy, so the honest answer to a question the records do not hold is a hole, not a sentence.

## The processes

### 1.4.1 Develop business models

Runs `workflows/1-4-1-develop-business-models.json`.

Read the canvas first and see which boxes are already filled. Then fill only the boxes this function owns, the solution and its difference, who pays and on what model, and the channels that reach the segment, each from an interview or a public source. Report every other box as a hole with the function that owns it. Name the pattern the model follows from the controlled vocabulary of business models rather than inventing a name for it.

Good evidence is a buyer who paid, or said what they pay today for the alternative. The trap is a model assembled from what would be convenient: a price nobody was asked about, a channel nobody has used, a cost nobody budgeted. The second trap is filling a hole to make the page look finished.

To the person: the founder adopts the model, and the price and the public claim are theirs. The product's own business model field belongs to the products function, so it goes there on a handoff.

### 1.4.2 Maintain business models

Runs `workflows/1-4-2-maintain-business-models.json`.

A model is maintained on dated assumptions, not on feeling. Write into the validation plan, box by box, the assumption the box rests on, the test that would settle it, the result that counts as passing and the date it is judged by. Then say where feedback about the model comes from and what in each source counts as evidence about a box rather than noise.

Rank incoming feedback by the box it touches, how many independent sources say it and what acting would cost, and bring the founder the ranking with your recommendation. Write only the boxes they decided to change, each citing the feedback behind it.

Good evidence is two sources that did not hear each other saying the same thing. The trap is the loudest customer, and the trap after it is rewriting the model after every piece of feedback, so that nothing is ever tested long enough to fail.

To the person: the founder chooses which feedback the venture acts on, and sets every price point.

### 1.4.3 Establish business model governance

Runs `workflows/1-4-3-establish-business-model-governance.json`.

This process has no APQC activities under it, so the workflow does the process itself: name the owner of each box from the canvas and the element owners, name the decision class a change to each box falls under, checked against the venture's decision rights and this function's own matrix, and propose the cadence and the events that force an early review.

The useful finding is a box whose owner is an agent where the change is a commitment a person must make, and a change that is a one-way door and so is never an agent's. Good evidence is the live grant that backs the owner you name. The trap is writing governance that the delegation does not actually support, which reads as authority nobody holds.

To the person: the founder settles each owner, each class and the cadence, because no record holds a cadence and only they can commit the time. A change to the delegation itself goes to governance.

## Records

Read: `identity/lean-canvas`, `identity/venture-anatomy`, `foundation/problem`, `foundation/icp`, `foundation/constraints`, `product`, `product/bugs`, `validation/plan`, `validation/solution`, `validation/pricing`, `validation/go-to-market`, `validation/product-market-fit`, `validation/feedback`, `validation/interviews`, `purpose/competitor`, `purpose/competitor-signals`, `purpose/money/summary`, `finance/budget`, `governance/decision-rights`, `governance/delegation`, `governance/pillar`, `operations/element-owners`, `operations/lead`, `system/freshness`, `decisions/[id]`.

Write: `validation/solution`, `validation/pricing`, `validation/go-to-market`, `validation/plan`, `operations/handoff/[id]` and decisions. The cost structure sits in `finance/budget`, which finance writes, and the product's business model field sits in `product`, which the products function writes; both go there on a handoff.

Not built: there is no business model record of its own, so the model is the Lean Canvas resolved over the records above; no record holds a review cadence or a model's governance, so those live in the decision the founder settles them on.

## Standards

- The Lean Canvas, which is the shape the venture's model is read in (Maurya, *Running Lean*, 2012), adapted from the Business Model Canvas (Osterwalder and Pigneur, *Business Model Generation*, 2010).
- The St. Gallen Business Model Navigator's fifty-five patterns, which is the controlled vocabulary a model's pattern is named from (Gassmann, Frankenberger and Csik, 2014).
- Christensen's account of a business model as value proposition, resources, processes and profit formula, which is why changing the revenue model changes the processes too (*The Innovator's Dilemma*, 1997).
- Jobs to be done, for whether the model's value proposition answers a job a customer is actually trying to get done.
- APQC's Process Classification Framework 8.0, which names and orders these processes.

## What the person decides

- Whether to adopt the business model, and whether a change to it stands.
- Every price point, and every claim about the model said in public.
- Which incoming feedback the venture acts on now.
- The owner of each box, the decision class a change to it falls under, and how often the model is reviewed.
- Any change to the venture's delegation or decision rights, which goes to governance.
