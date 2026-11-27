---
type: knowledge
tags: [naive, skills, marketing-and-sales, apqc-3-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:29Z
source: hybrid
name: develop-marketing-strategy
process_group: "3.2"
description: >
  Settle what the venture offers, how it says it, what it charges, which channels
  it reaches buyers through and how it keeps them, each as a record the founder
  approved. Load it for the seven workflows of APQC process group 3.2 and whenever
  the founder asks "what do we say we are", "what do we charge", "where do we find
  buyers" or "is the brand holding together".
---

# develop-marketing-strategy

You draft, compare and count. Everything in this process group ends in a commitment the venture makes in public or to a buyer, so the founder approves every one of them: the positioning, the brand, the price, the channels and any program promised to a customer.

Order matters. The offering and its value proposition come first, because the brand, the price, the channel and the communication plan all say the same thing in different places. Writing a price before the positioning produces a number nobody can defend, and designing a brand before the words produces a look with nothing to say.

## The processes

### 3.2.1 Define offering and customer value proposition

Runs `workflows/3-2-1-define-offering-and-customer-value-proposition.json`.

Positioning is one statement the rest must agree with: what the venture is, whom it is for, what it replaces and why that matters. Draft it as a `marketing/message/[id]` record of kind positioning, then the value proposition for each target segment, then the tagline and headline candidates that follow from it. Every clause cites the product, problem, ICP or competitor record it rests on; a clause no record supports is left out rather than written and softened.

Good evidence that a value proposition works is a buyer repeating it back unprompted. Prepare two or three wordings with the question that tells them apart, and give them to the founder to put to buyers. The trap is validating with people who already like the venture, and the second trap is testing one wording with no alternative, which measures politeness rather than preference.

Validation goes to the person: it is a conversation outside the venture.

### 3.2.2 Develop and manage brands

Runs `workflows/3-2-2-develop-and-manage-brands.json`.

The brand is two records. `marketing/brand` holds the values a page and a message must use, the name, the colors, the typefaces with their licences, the voice rules and the marks. `marketing/design-system` holds why each choice was made and which record it follows from, so a later change can be argued rather than guessed.

Sentiment is counted, not felt: read the public mentions and reviews that name the venture, count them by whether they are favourable, quote the two that matter most, and record each with its link and the date read. Never reply, and never make the venture's first public reply an agent's.

Performance is measured against what is already published. The brand lint and the site presence score show where a live page or message departs from the voice rules, the colors or the marks; report the departure with the page it sits on. The trap is a brand refresh proposed without counting where the old one already appears, which turns a small change into weeks of work.

### 3.2.3 Define pricing strategy

Runs `workflows/3-2-3-define-pricing-strategy.json`.

Price from three sides at once: what the buyer gains, what the alternative costs them, and what the venture's own cost floor is. Gather what each segment pays today, every competitor's published price with the page and date read, what interview records say buyers would pay, and what the venture's own closed deals actually went out at.

The guidelines matter more than the number: the floor no price goes under, the largest discount allowed without the founder, what a discount must be traded for, and which terms always escalate. Written once, they stop every later quote becoming its own negotiation.

Approval is the founder's, and the price points are a `strategy-or-constitution` decision. You never publish a price; the pricing page and the quote wording are drafted here and published in process 3.3.3.

### 3.2.4 Define and manage channel strategy

Runs `workflows/3-2-4-define-and-manage-channel-strategy.json`.

List the channels that could reach each segment, drop the ones the records show the venture cannot staff or pay for, and give every shortlisted channel one number it must deliver and the date it is judged on. A channel with no number is a hobby.

Test few channels at once and test them long enough to learn. Most of a venture's buyers end up arriving through one channel, so the point of the run is to find which one rather than to be present everywhere; the evidence is the source and channel fields of the opportunities that actually arrived.

The founder chooses the channels. Three steps are to consider: evaluating partners for a channel that runs through another company, orchestrating the experience across channels, and storefront formats. The trap in a partner channel is losing the customer relationship with it, so record who owns the customer before anything is signed.

### 3.2.5 Analyze and manage channel performance

Runs `workflows/3-2-5-analyze-and-manage-channel-performance.json`.

Count each channel's number from the venture's own records, set it beside its target, and name what else moved it: a launch, an outage, a holiday, a campaign, a competitor's price change, each with its date and source. Then work out the cost per qualified opportunity and per closed sale from the spend records.

The trap is attributing a change to the channel that is easiest to measure. Say how much of a difference the named events explain before proposing a change, and propose the smallest change that would move the measure.

### 3.2.6 Develop marketing communication strategy

Runs `workflows/3-2-6-develop-marketing-communication-strategy.json`.

One plan, covering what the venture says, to whom, where, how often and who approves it. The parts that always apply are the customer communication calendar, the direct marketing rules and the communication guidelines; public relations, internal communication and point of sale are steps to consider.

Direct marketing is where a venture gets into trouble. Write where the list came from and what consent it carries, how often anyone may be contacted and how they stop being contacted, before any message is drafted. The guidelines step also writes `marketing/publish-terms`, the names the publish lint flags in public copy, so the function that owns the words tightens the gate on itself.

Every message to a person outside the venture is sent by a person.

### 3.2.7 Design and manage customer loyalty program

Runs `workflows/3-2-7-design-and-manage-customer-loyalty-program.json`.

For most early ventures the honest answer is that there is no program, and the run's job is to say so with reasons. Every step but the last is one to consider, because a reward for staying only pays where customers already stay for a reason and there is a retention number to move.

Where a program exists, count both sides: what it cost the venture from the spend records and what it returned in retained revenue, and separately what each member actually received. A program only the venture benefits from loses the customers it was meant to keep. Changing a reward is a promise to every member, so it is proposed with its cost and never slipped in, and ending the program is sometimes the right recommendation.

Conversations with members go to the person; you prepare what is worth talking about and never contact a member.

## Records

Read: `foundation/core`, `foundation/icp`, `foundation/problem`, `foundation/constraints`, `product`, `markets`, `purpose/competitor`, `validation/pricing`, `validation/go-to-market`, `validation/product-market-fit`, `customers`, `sales/opportunities`, `support/cases`, `finance/budget`, `finance/spend`, `money`, `governance/publication-policy`, `governance/internal-terms`, `governance/analytics`, `operations/site-presence`, `operations/time-box`, `legal/obligations`, `people/team-plan`, `marketing/voice`, `marketing/brand-lint`.

Write: `marketing/message/[id]` for each element of the words, `marketing/brand` for the brand values, `marketing/design-system` for the reasons behind them, `marketing/sitemap` for what a page shows and where, `marketing/publish-terms` for the names the publish lint flags, `customers/[id]` for a loyalty member's standing, and `operations/handoff/[id]` and `decisions/[id]` for everything else a run produces.

A channel record, a communication calendar, a pricing policy and a loyalty program have no record types of their own: that is not built. Until they exist, each run's plan goes on the handoff as evidence and the choice it asks for goes into a decision, which is where the founder's answer is kept.

## Standards

- Positioning as a statement of what the offering is, whom it is for and what it replaces (Dunford, *Obviously Awesome*, 2019), and the competitive alternative as the thing the buyer would do otherwise.
- The marketing mix, product, price, place and promotion (McCarthy), as the checklist that this process group is covering all four.
- The nineteen traction channels and the bullseye framework (Weinberg and Mares, *Traction*, 2015) for listing candidate channels and testing few at a time.
- The Van Westendorp price sensitivity questions for asking buyers about price without asking them to name one.
- The CAN-SPAM Act in the United States and the GDPR in the European Union bound direct marketing and consent. This is not legal advice: a question about either goes to the founder and counsel.
- Naive's own publishing gate: `naive publish check` lints the copy a record holds as well as a page's prose, and the publication policy says where the venture may publish and who may approve it.

## What the person decides

- The positioning and the value proposition, and the exact words of each element.
- The brand's name, colors, voice rules and marks, and any change to them.
- The price points, the plans on offer and the discount guidelines.
- Which channels the venture tests now, and which it leaves.
- Whether to run a loyalty program at all, what members get and when it ends.
- Every message, page or post that leaves the venture, and every conversation with a buyer, a partner or a member.
- Any spend on a channel, a campaign or a program.
