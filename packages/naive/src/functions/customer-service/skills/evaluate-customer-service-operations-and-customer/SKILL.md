---
type: knowledge
tags: [naive, skills, customer-service, apqc-6-5]
ai-model: claude-opus-5-5
created: 2026-11-27T03:53:00Z
source: hybrid
name: evaluate-customer-service-operations-and-customer
process_group: "6.5"
description: >
  Judge how well the venture serves its customers and tell the rest of the
  venture: ask customers about being helped, about complaint handling, about the
  product after buying and about warranty handling, count what the cases say,
  and evaluate a finished recall. Load it for the five workflows of APQC process
  group 6.5 and when the founder asks "are customers happy", "what are people
  complaining about" or "what should we fix first".
---

# evaluate-customer-service-operations-and-customer

You draft the question, count the cases, and hand each finding to the function that can act on it. The founder sends every question to a customer and decides what the venture changes in response.

Measurement here is worth nothing unless it leaves the function. Each workflow ends by handing findings to products, to marketing and sales or to the growth lead, with the counts and the customers' own words attached.

## The processes

### 6.5.1 Measure customer satisfaction with customer problems, requests, and inquiries handling

Runs `workflows/6-5-1-measure-customer-satisfaction-with-customer.json`.

Ask one question, soon after the case closes, and ask it of named customers rather than of everyone. One question about how much effort the contact took tells more about whether they stay than a satisfaction score does (Dixon, Freeman and Toman, *Harvard Business Review*, 2010). Record every answer against its case, because an answer with no case behind it cannot be acted on. Then count the handling itself: first response and resolution times, repeat contacts inside seven days, and contacts per active customer by reason, which is the number to drive down rather than cases handled (Price and Jaffe, *The Best Service Is No Service*, 2008). Name the two changes that would remove the most contacts, each with its count, and hand the top reasons to products with the cases and the quotes. The trap is reporting a rising number of cases as growth in demand when it is growth in confusion.

### 6.5.2 Measure customer satisfaction with customer- complaint handling and resolution

Runs `workflows/6-5-2-measure-customer-satisfaction-with-customer.json`.

Complaints are measured apart from questions, because the customer's judgment is about how the venture behaved when it had failed, not about whether an answer was correct. Ask each customer whose complaint closed whether the outcome settled it. Then count by cause, by days to redress and by redress given, and separate the complaints lost to the original fault from those lost to the handling, slow replies, repeated explanations, a promise missed; ISO 10002 asks for exactly that review of the handling. Finish by grouping the recurring complaints and recording the grouping on the cases, so next period's count means the same thing as this one.

### 6.5.3 Measure customer satisfaction with products and services

Runs `workflows/6-5-3-measure-customer-satisfaction-with-products-and.json`.

Start with what customers have already said, in `support/cases`, `validation/feedback`, `validation/interviews` and public reviews, and only then draft a question for those who have said nothing; asking for an opinion the records already hold wastes the one question a customer will answer. Keep what one customer said apart from what many did: a finding carries a count and one quote. Two questions are steps to consider, where the customer first heard of the venture, and what they had to repeat when their case crossed channels, because each pays off only in a venture that is spending on reach or answering on several channels. End by opening one handoff per receiving function with only the findings that function can act on; a single list sent to everyone is read by nobody.

### 6.5.4 Evaluate and manage warranty performance

Runs `workflows/6-5-4-evaluate-and-manage-warranty-performance.json`.

Count claims, the share approved, days from claim to close, and money given per claim and per unit sold, citing the cases and `finance/spend` so the cost is not an estimate. The improvement step is the point: name the product, terms or instruction change that would cut the top cause, with the cost it would avoid. Two steps are to consider: the waste, money given outside the terms, units repaired twice, parts replaced with no fault found, and the claims whose own records disagree with what was claimed. Hand a doubtful claim to the founder with the records that disagree and write nothing to the customer; an accusation is a person's to make, never an agent's, and never on an inference.

### 6.5.5 Evaluate recall performance

Runs `workflows/6-5-5-evaluate-recall-performance.json`.

Judge the recall against the test it set itself: customers affected, reached and acting, units returned, days from decision to first message and to close, and what it cost. Say plainly where it fell short, and say what the records cannot answer at all, which is usually how many holders were never identifiable. Then name one change, in how the venture records purchases, reaches customers or supports them, with the number from this recall behind it. The trap is a write-up that praises the response and proposes nothing.

## Records

Reads: `support/policy`, `support/cases`, `customers`, `deals`, `validation/feedback`, `validation/interviews`, `product`, `product/bugs`, `marketing/content`, `finance/spend`, `legal/obligations`, `supply-chain/suppliers`, `operations/handoff`.

Writes: `support/cases/[id]` to record each customer's answer and the complaint grouping against the case it belongs to, `operations/handoff/[id]` to carry findings to products, marketing and sales and service delivery, and `decisions/[id]` for what the venture should change and in what order.

A satisfaction survey record, a score record and a customer service metrics record are not built. The answers sit on the cases they came from and the period's counts go on the handoff as evidence, each count citing the cases behind it, which also keeps the count re-checkable later.

## Standards

- ISO 10004 covers monitoring and measuring customer satisfaction, and ISO 10002 asks for the complaints handling itself to be reviewed, which is what 6.5.2 does.
- Customer effort, from Dixon, Freeman and Toman, *Harvard Business Review*, 2010, as the question to ask after a contact.
- Contacts per active customer as the operating measure (Price and Jaffe, *The Best Service Is No Service*, 2008).
- The Net Promoter Score (Reichheld, *Harvard Business Review*, 2003) is widely used, and it needs more customers than an early venture has to mean anything; with a handful of customers, quote them instead of scoring them.
- APQC Process Classification Framework 8.0, category 6.0, for the process names and their order.

## What the person decides

- Every question that goes to a customer, and when it is sent.
- What the venture changes in response to what customers said, and in what order.
- Which findings go to which function, when the handoff needs that function to agree.
- Whether a doubtful warranty claim is challenged, and in what words.
- Whether a measure is worth keeping at the venture's size.
