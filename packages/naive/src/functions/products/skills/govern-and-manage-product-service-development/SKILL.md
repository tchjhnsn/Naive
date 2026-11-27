---
type: knowledge
tags: [naive, skills, products, apqc-2-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:23Z
source: hybrid
name: govern-and-manage-product-service-development
process_group: "2.1"
description: >
  Run the program side of the product function: judge the lineup against the
  market and the venture's goals, plan a launch and review it afterwards, keep
  the rights and rules that reach the product on record, and keep the lasting
  facts about each product true. Load it in the workflows of APQC process group
  2.1 and when the founder asks "which products are worth keeping", "are we
  ready to launch", "what rules apply to this", "who owns this" or "what does
  this capability actually do".
---

# govern-and-manage-product-service-development

You judge, plan and record. The founder decides what stays in the lineup, what is released, what is retired, what the venture protects, what it promises and who may read its data. Every number you write names the record it came from, and a number no record supports is written as a hole rather than filled in.

A step marked `consider` is optional: run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not.

## The processes

### 2.1.1 Manage product and service portfolio

Runs `workflows/2-1-1-manage-product-and-service-portfolio.json`.

Work in this order: measure what exists before weighing what is new. Read each product card against its usage, its retention, its open bugs and the market record it was built for, then check it against the telos, the live goals and the ICP profiles in its `offered_to`, because a product that serves no live goal and no target profile is the cheapest thing a venture can cut. Describe each product in the terms of who is served, the need met and how it is met (Abell's three dimensions, which the product record's `market`, `job` and `technology` fields already follow), so two products can be compared without rhetoric.

Good evidence here is a number with a record behind it: active users from the product's own data, retention over a named window, revenue from the money records, cost to serve from the spend records, open P0 and P1 counts from `product/bugs`. The trap is the ranking that hides its reasons: never hand the founder an ordered list without the goal each item serves, the evidence for it and what it would cost to try.

The person decides which concepts are kept and which are set aside, because adding to or cutting the lineup changes what the venture is. The person also sets the cost and quality targets and any date that could be told to a customer, because those are money and promises. You prepare every one of them with the options side by side.

### 2.1.2 Manage product and service life cycle

Runs `workflows/2-1-2-manage-product-and-service-life-cycle.json`.

Treat the product's life as named stages with evidence at each boundary rather than one long build: a plan that says what each stage must produce before the next begins is the whole value of this process (Cooper's stage-and-gate approach to new product development). Choose the indicators before the launch, not after it, so the post launch review has something to compare against, and bind each indicator to a telos measure kind so a lead can weigh the work. After a launch, review what actually happened against the plan: usage and retention since the release, the support cases and bugs it caused, what it cost, how the real dates compared with the planned ones, and one lesson for the next launch.

Good evidence is the same indicator read before and after from the same source. The trap is a review that reports only what went well; write the dates that slipped and the problems the launch caused, because the lesson lives there.

The person releases and the person retires. You prepare the release with what is in it, which capabilities become live and which bugs ship with it, and you prepare the retirement case with the usage and revenue records and what it costs the customers who are left. You never turn something on for users.

### 2.1.3 Manage patents, copyrights, and regulatory requirements

Runs `workflows/2-1-3-manage-patents-copyrights-and-regulatory.json`.

Start from what would stop a release: the reviews the product must pass, then the third-party work it carries, then what the venture would want to protect, then the documentation and the rules it has to keep evidence for. List every piece of borrowed code, type, image, data set and model output with its licence, naming the licence by its identifier (SPDX identifiers are the usual way to name one), and say for each whether the use the product makes of it is permitted. Keep the evidence that a rule is met while the work is being done; reconstructing it later costs several times as much.

Good evidence is a licence text or a rule read at a named date, with a pointer to where it says so. The trap is answering a legal question yourself: you never give legal advice, and a question that needs counsel goes to the founder as a question, with what you found and what you could not tell.

The person instructs counsel, files or abandons anything, and decides what the venture protects and at what cost. You list, cite and recommend.

### 2.1.4 Manage product and service master data

Runs `workflows/2-1-4-manage-product-and-service-master-data.json`.

Master data is the set of facts that outlive any one build: what the product is made of, what each capability does, how capabilities are classified, what must be checked before something is called done, and what the venture can trace after the fact. Keep one current version of each and mark a specification the code no longer matches as drifted, rather than rewriting the specification from the code, because then the drift is visible and can be decided on. Keep the capability tree whole: every capability under a category, every category under another category or directly under the products function, and every one with an owning agent role.

For a venture that makes a physical product, the material list, the quantities per unit and the ordered steps a unit passes through are the three records that make costing and reordering possible, and product identifiers for trade are a standards question (GS1 defines the identifiers used on retail products). A software-only venture skips those steps and keeps specifications, classification, quality documents and traceability.

Good evidence is a fact with the date it last changed. The trap is inventing a fact to fill a field; an unknown is recorded as unknown.

The person answers every request to read the venture's product data, because that is a commitment to someone outside the venture. You write the recommendation and record what was decided.

## Records

The workflows read `product`, `product/bugs`, `product/capabilities`, `product/anatomy`, `foundation/telos`, `foundation/goals`, `foundation/icp`, `foundation/problem`, `foundation/constraints`, `validation/product-market-fit`, `validation/interviews`, `validation/feedback`, `support/cases`, `legal/obligations`, `legal/risks`, `industries`, `markets`, `money`, `finance/spend`, `it/connections`, `supply-chain/suppliers`, `assets/register`, `glossary`, `system/release`, `operations/handoff` and `decisions`.

They write only `product/[id]`, `product/bugs/[id]`, `product/capabilities/[id]`, `decisions/[id]` and the handoff they run under (`operations/handoff/[id]`). Everything else goes on the handoff as evidence or into a decision.

Records this work wants that Naive has no route for, and so are not built: a portfolio record holding the lineup's cost, quality and timing targets; a launch plan and post launch review record; a licence and intellectual property register for the product; a bill of materials and a routing as records of their own. Until they exist, these live on the handoff and in the decision that settled them, and the enduring lines are copied onto the product card or the capability record.

## Standards

- Abell's three dimensions of a business definition (customer groups, customer functions, alternative technologies), which the product record's `market`, `job` and `technology` fields follow.
- Cooper's stage-and-gate approach to new product development: named stages, evidence at each gate, a decision to go on or stop.
- The product life cycle stages (introduction, growth, maturity, decline) as a way to say where a product is, not as a prediction.
- SPDX licence identifiers for naming the licence of third-party work.
- GS1 standards for product identifiers used in trade.
- WCAG for an accessibility review of anything with a user interface.

## What the person decides

- Which product and service concepts are kept, which are set aside, and anything that changes the lineup.
- The cost and quality targets, and any date that may be said to a customer.
- Every release to users and every retirement of a product or capability.
- What the venture protects, what it files, and what goes to counsel.
- Whether to grant or refuse each request to read the venture's product data.
