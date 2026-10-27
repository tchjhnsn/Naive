---
type: framework
source: hybrid
created: 2026-10-26T22:55:00Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, purpose, product-anatomy, succession-matrix, typesafe, jev]
description: "Product Anatomy Matrix: fix the venture's core product first, judge every product against it with typed questions (Jev plus a reasoning model), then deduce each product's portfolio role per phase with the Succession Matrix. Version 0.2.0, unevaluated."
---

# Product Anatomy Matrix

Version 0.2.0 (unevaluated). Nouns follow `docs/ontology.md`; phases and gates follow EE-012, with sources in `purpose/references/references.json`. Research and reasoning: the Claude Doc "Core product framework: research and proposal" (https://claude.ai/artifact/A8e5fEBS3AsszAB2iaBKvd).

## Order

1. **Core product first.** The venture states its core product (`core` in `venture.json`) before any product is ranked. It is required once the venture leaves Discovery. That means four things:
   - the **promise**: what a person can claim from the venture
   - **who it is made to**
   - **what it must not deliver**
   - the **core competence** that makes the promise deliverable

   No product can be the flagship until this exists, because the flagship is the product that best delivers the core promise.
2. **Product cards.** Each product is a card in the venture's `products/` folder (`schema/product.schema.json`): name, description, market, job, technology, offering, business model, and `flows_to`.
3. **Judge every product against the core.** `questions.json` holds seven typed judgments per product. Three are about the core: promise delivery, competence draw, and promise breach. Four are about the phase: job intensity, readiness, revenue and reversibility. Jev answers them all in one request. A reasoning model frames the input and writes the reasons. Spillover is computed from the cards' `flows_to`, not asked.
4. **Succession Matrix.** `phases.json` sets the venture phases (Discovery, Validation, Beachhead, Scale, Platform), the gate for leaving each, and the weights. Discovery has no weights, because nothing is ranked before the core exists. For each phase, the runner:
   - checks the flagship must-holds in code: allowed in the phase, delivers at least part of the promise directly, and does not risk breaching it
   - ranks the products that pass
   - assigns portfolio roles: flagship, substrate, revenue engine, wedge, option, end product, or unassigned. Wedge keeps its business meaning: the narrow product used to enter a market.
   - names the successor when the flagship changes between phases

   Near-ties (within 0.1) are reported as ties. Changing a weight never needs re-scoring.
5. **Re-answer at each gate** (problem-solution fit, product-market fit, repeatability, market leadership). Later phases are projections from today's answers until they are re-scored.

## Run

```bash
node anatomy.mjs request ../../../schema/examples/workspace/ventures/studio   # a venture folder
node anatomy.mjs request examples/polity.json                    # or a single input file
node anatomy.mjs score examples/polity.json out.json --send      # Jev; needs TYPESAFE_API_KEY
node anatomy.mjs matrix examples/polity.json examples/polity.answers.reasoned.json
```

Without a key, a reasoning model fills the answers file by hand and names itself in `scorer`. `examples/polity.answers.reasoned.json` is that kind of draft.
