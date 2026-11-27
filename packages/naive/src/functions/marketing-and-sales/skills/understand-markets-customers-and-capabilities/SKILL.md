---
type: knowledge
tags: [naive, skills, marketing-and-sales, apqc-3-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:29Z
source: hybrid
name: understand-markets-customers-and-capabilities
process_group: "3.1"
description: >
  Find out who the venture's buyers are, how many of them it can reach, what the
  market is doing and what the venture can actually serve, and write the answers on
  the market record with their sources. Load it for the two workflows of APQC process
  group 3.1 and whenever the founder asks "who is this for", "how big is this",
  "which segment first" or "can we even serve them".
---

# understand-markets-customers-and-capabilities

You count, read and record. You write the market record and you hand findings to the decisions they bear on. The founder names which market opportunity the venture takes, and the founder, not you, talks to buyers.

Market intelligence is only worth the hours when a decision is waiting on it. Before either workflow, name the open decision or live goal the run serves. With none, keep the run to bringing the market record up to date and say so.

## The processes

### 3.1.1 Perform customer and market intelligence analysis

Runs `workflows/3-1-1-perform-customer-and-market-intelligence-analysis.json`.

Work from the inside out. The venture's own interview, customer and opportunity records are the only evidence nobody else has, so read them first and count them before reaching for a public source. Group what buyers said they needed and what they actually did by the job they were trying to get done, because a segment that shares a job behaves alike and a segment that shares an industry code often does not.

Good evidence here is a count with the records named and the date counted, or a public page with its link and the date read. Weak evidence is a buyer saying they would buy: write what buyers did, not what they said they might do. A prediction about purchasing is written with what would show it wrong, or it is not a finding.

The trap is the market study nobody uses. A long report with no decision attached is the most common waste in this process group. The second trap is counting a market from the top down: a serviceable market worked out as a share of a published industry figure is an estimate, and it is marked estimated on the cell.

Competitor records belong to the strategy function, so this process reads `purpose/competitor` and hands strategy what its records do not cover. The step on the internal and external environment is where the real constraints get written down: the hours one founder has, the money in the budget, the capabilities the product holds, a platform's terms, an obligation in the legal records.

### 3.1.2 Evaluate and prioritize market opportunities

Runs `workflows/3-1-2-evaluate-and-prioritize-market-opportunities.json`.

Quantify before ranking, and show the arithmetic. Each market cell carries a status: known when a record or a cited source gives it, estimated when any input is a guess, unknown when nothing does. An unknown cell written honestly is worth more than a number nobody can defend.

Rank segments on what the venture can act on: how many buyers it can actually reach now, what a deal is worth, how long a sale takes and how many people must agree to it. Name the under-served segments and the saturated ones with the evidence for each.

Two steps go to the person. Prioritizing opportunities is the founder's, because it decides what the venture gives up; you bring two or three ranked options with the capability each needs and the evidence behind its numbers, and you record the choice. Validating an opportunity means asking real buyers, which is a conversation outside the venture: you write the questions that would show the opportunity false, the founder asks them, and you record which assumption each answer confirmed and which it broke.

## Records

Read: `foundation/icp`, `foundation/problem`, `foundation/goals`, `foundation/telos`, `markets`, `industries`, `purpose/competitor`, `purpose/validation/problems`, `validation/interviews`, `validation/go-to-market`, `product`, `product/capabilities`, `people/team-plan`, `customers`, `sales/opportunities`, `legal/obligations`, `decisions`.

Write: `markets/[id]`, one record per market the venture sells into, whose cells hold the customer type, the reachable buyers, the serviceable market, the deal size, the sales cycle, the buying roles, the purchase frequency, the switching cost, the network effects, the maturity and the concentration, each with its status, its cited evidence and the dates it was true. Also `operations/handoff/[id]` for the findings a run produces and `decisions/[id]` for the evidence a finding adds to an open question.

A market study, a segment and a trend have no record types of their own: that is not built, so a run's narrative findings go on the handoff as evidence and into the decision they bear on, and only the numbers that match a market cell are written as a record.

## Standards

- Jobs to be done: group buyers by the job they are hiring the offering for, not by what they look like.
- Porter's five forces (Porter, *Competitive Strategy*, 1980) for reading an industry's structure, and Porter's four corners for predicting what a competitor does next. The competitor records themselves are strategy's.
- Blank's TAM, SAM and SOM for market sizing, which is why the market record keeps the serviceable market and the reachable buyers as separate cells.
- The buying center (Webster and Wind, 1972) for the buying roles cell: how many roles must agree to a purchase.
- The Mom Test (Fitzpatrick) for interview evidence: a commitment or a past action counts, a compliment does not.

## What the person decides

- Which market opportunity the venture pursues first, and what it gives up to do it.
- Which segment is the primary one, and whether a named segment is dropped.
- Every conversation with a buyer: who is asked, and what is asked of them.
- Whether a market figure the records cannot support is used anyway, and on the record that it is an assumption.
- Whether a finding is worth a change of strategy, which is the founder's decision and not the agent's recommendation.
