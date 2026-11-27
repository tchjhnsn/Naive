---
type: knowledge
tags: [naive, skills, marketing-and-sales, apqc-3-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:29Z
source: hybrid
name: develop-and-manage-marketing-plans
process_group: "3.3"
description: >
  Turn the marketing strategy into the plan the venture actually runs: measures and
  targets by channel and segment, a budget, the live prices, promotions, the customer
  numbers, the go-to-market plan, packaging and the material a page uses. Load it for
  the nine workflows of APQC process group 3.3 and whenever the founder asks "what are
  we doing this quarter", "did that campaign work" or "what is a customer worth".
---

# develop-and-manage-marketing-plans

You plan, count and draft. The strategy says what the venture stands for and charges; these processes commit money, publish words and change prices, so each one ends with the founder deciding and you recording what they decided.

Every number in a plan either cites the record it was counted from or is written as an assumption with what would show it wrong. A plan whose numbers cannot be traced cannot be reviewed, and a plan nobody can review is run on hope.

## The processes

### 3.3.1 Establish goals, objectives, and measures for products/services by channel/segment

Runs `workflows/3-3-1-establish-goals-objectives-and-measures-for.json`.

Start from the live goals, not from a blank page: read `foundation/goals` and say which goals already bind revenue or adoption and which product, channel and segment each covers. Then propose one measure per pair the venture actually sells through, with the number it stands at now and how it is counted.

A goal record is written by the strategy function, so the run ends by handing the agreed measures, targets and dates to strategy. The target itself is the founder's answer, asked for one at a time with the current number stated first. The trap is a measure that moves whatever the venture does, which teaches nothing; the second trap is measuring a pair the venture does not actually sell through.

### 3.3.2 Establish marketing budgets

Runs `workflows/3-3-2-establish-marketing-budgets.json`.

Every proposed line names the live goal it serves and the measure it moves, and a line that serves no goal is dropped before it is costed. Read the spend records for what marketing costs today, tool by tool and channel by channel, and count a person's hours as hours rather than as money unless the venture pays for them.

The budget is a recommendation finance puts in the books, so it leaves this function as a handoff and as a `spend-money` decision for the founder. Rank the lines by return per dollar and say which are dropped first if the total is cut, because that is the question a founder actually asks.

### 3.3.3 Develop and manage pricing

Runs `workflows/3-3-3-develop-and-manage-pricing.json`.

This is the process that keeps the venture's live prices honest, where 3.2.3 set the strategy. Work out what one unit costs to deliver through each channel before proposing anything, then what price the forecast volume needs to leave the margin the founder set, and show how the answer moves if volume halves or doubles.

Count performance from closed opportunities: what was actually charged against the list price, how often a discount was given and how large, and how many deals were lost with price recorded as the reason. That count is the only honest basis for refining a price.

Four steps go through the founder as commitments: executing a price plan, running a promotional price, communicating a change, and any non-standard pricing. Before a price changes, list every customer and open opportunity it touches and draft the notice for each group; a price change nobody was told about is a complaint waiting to arrive. Incentives, retail programs, regulatory approval and segment pricing are steps to consider.

Charging two buyers differently needs a reason either of them would accept on learning of it, and the rule that decides which buyer gets which price is written down.

### 3.3.4 Develop and manage promotional activities

Runs `workflows/3-3-4-develop-and-manage-promotional-activities.json`.

Write the objective and the one number before anything else, and refuse to start a promotion with no number. Then the audience by ICP profile and by the records that identify them, with how many they are, where the list came from and what consent it carries. Then the message elements, each as its own record citing what its claims rest on.

Test the words and the links with a person before anything goes out, and run the publish check on every piece. The founder sends and publishes; you prepare the final form, the recipients and the date, and afterwards you write what actually went out, to whom and when.

Judge the promotion against the objective written before it started, counting the opportunities created with the campaign as their source. The trap is choosing the measure after the result.

### 3.3.5 Track customer management measures

Runs `workflows/3-3-5-track-customer-management-measures.json`.

Four numbers, each shown with its arithmetic: what a customer is worth over the time they stay less the cost to serve them, how customer revenue is trending, how many customers the venture keeps and loses with the reason each departure is recorded with, and the cost of winning a customer from the spend records.

Put them together and say which segment the venture actually makes money on, then name the number most likely to be wrong. Write the date each was counted so the next run can compare rather than recompute from a different basis. The trap is a lifetime value built on an assumed retention period; if the venture has not existed long enough to observe one, say so.

### 3.3.6 Analyze and respond to customer insight

Runs `workflows/3-3-6-analyze-and-respond-to-customer-insight.json`.

Read what people actually did: public posts and comments since the last run, the site activity the venture records, and the purchase patterns in the customer and opportunity records. Where the venture records no site activity at all, say so plainly instead of reasoning about visitors it never counted.

Sort every public message into a question, a complaint, a compliment or a factual error, draft the reply for the founder, and route a service complaint to customer service. Personalized offer rules are steps to consider, and each is written as a plain condition naming the record field it reads, leaving out anything a customer has not agreed to the venture using.

### 3.3.7 Develop and manage packaging strategy

Runs `workflows/3-3-7-develop-and-manage-packaging-strategy.json`.

Packaging is what the buyer chooses among before they judge the product: the plans or bundles, what each contains and leaves out, who each is for, and what a buyer first sees or receives. Write that down first; testing, publishing and refining are steps to consider.

Buyers are the only ones who can say whether a package reads clearly, so prepare two or three packagings with the question that tells them apart and let the founder ask. Afterwards, count which package is bought, which is asked about and not bought, and what support cases say buyers misread. The trap is a package named one way on the site and another in a quote.

### 3.3.8 Develop go-to-market strategy

Runs `workflows/3-3-8-develop-go-to-market-strategy.json`.

Five parts: the segment, the offer, the price, the channel and the motion. Read the records that already settle each and say honestly which are still guesses. Draft the plan as one page, each part citing its record, every gap written as an assumption with what would show it wrong, and the first test named with the date it is judged on.

Then ask the founder what the records cannot settle: what to sell first, what the venture will not sell, which buyer to go to before any other, and the promise it will keep. The plan is one `strategy-or-constitution` decision, and the useful line in it is which assumption carries the most of the plan.

### 3.3.9 Manage product marketing material

Runs `workflows/3-3-9-manage-product-marketing-material.json`.

Two things to account for. Every image a planned page uses needs a recorded origin and a licence, and an image showing a product as it is hoped to be is a claim; name every image with no licence or no origin so it can be removed. Every line of copy needs a message record a person approved, which is what `naive copy gaps` reports element by element and what `naive copy check` refuses a build without.

Draft the missing elements as message records citing their sources and bring each to the founder to choose. Never fill a gap by guessing, and never invent a field the framework has no record type for.

## Records

Read: `foundation/core`, `foundation/goals`, `foundation/telos`, `foundation/icp`, `foundation/problem`, `product`, `markets`, `purpose/competitor`, `validation/pricing`, `validation/go-to-market`, `validation/product-market-fit`, `validation/feedback`, `customers`, `sales/opportunities`, `support/cases`, `service-delivery/offers`, `finance/budget`, `finance/spend`, `money`, `governance/analytics`, `governance/publication-policy`, `operations/time-box`, `operations/site-presence`, `legal/obligations`, `identity/lean-canvas`, `marketing/content`, `public/assets`, `public/assets/facts`.

Write: `marketing/message/[id]` for the words a page or a promotion uses, `marketing/sitemap` for what each page shows and which image it uses, `customers/[id]` for the per customer numbers, `sales/opportunities/[id]` for the opportunities a promotion created, and `operations/handoff/[id]` and `decisions/[id]` for the plans, counts and questions a run produces.

A marketing plan, a budget line, a promotion or campaign, a package and a go-to-market plan have no record types of their own: that is not built. A campaign's time box (`operations/time-box/[id]`) is written only by a person, and the marketing budget belongs to finance, so this function proposes both and writes neither.

## Standards

- The marketing mix, product, price, place and promotion (McCarthy), as the frame the plan must cover.
- Unit economics: the cost of winning a customer set against what a customer is worth, both counted from the venture's own records rather than from a benchmark.
- Cohort retention: count the customers the venture had at the start of a period and how many it kept, rather than a single churn percentage.
- RFM analysis, recency, frequency and monetary value, for reading purchase patterns in customer records.
- The CAN-SPAM Act in the United States and the GDPR in the European Union bound a promotion's list, its consent and its unsubscribe. This is not legal advice: a question goes to the founder and counsel.
- Naive's copy gate (EE-216): the words are records before the page, and `naive copy check` refuses a build while any planned element is unapproved.

## What the person decides

- Every target and every date on a measure the records cannot set.
- The budget, and which lines are cut first.
- Every live price, every price change and every promotional price, and the notice each affected customer gets.
- Every promotion that is sent or published, and every reply to a public message.
- What each package contains and who it is for.
- The go-to-market plan: what to sell first, what not to sell, and the promise the venture keeps.
- Every element of copy on a public page, and whether an unlicensed image is used anyway.
