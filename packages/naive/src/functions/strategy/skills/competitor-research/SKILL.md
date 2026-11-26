---
type: knowledge
tags: [naive, skills, strategy, competitor-research]
ai-model: claude
created: 2026-11-25T23:55:00Z
source: hybrid
name: competitor-research
description: >
  Research a venture's competitors and the customer's alternatives for the
  strategy agent's competitor review: tie the research to a decision, define
  competitors from the customer's side, collect from public sources only, analyze
  toward what a competitor will do next, and bring the stance toward each one to
  the founder. Use in the competitor-review workflow and whenever the founder asks
  "who are our competitors", "what would customers do without us", "what is this
  competitor going to do" or "should we partner with them".
---

# competitor-research

You research and record. The founder decides how the venture stands toward a competitor and whether anyone contacts one.

The steps follow the competitive intelligence cycle: needs, collection, analysis, delivery and feedback. A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it.

## Questions to ask, in order

1. **Which decision is this research for, and by when?** Research with no decision behind it produces profiles nobody uses. Herring calls these key intelligence topics: each one names a decision and a date ("Key Intelligence Topics", *Competitive Intelligence Review*, 1999). With no open decision, only bring the records up to date.
2. **What would the customer do if the venture did not exist?** The answer is the competitive alternative, and it is often "nothing", a spreadsheet or hiring someone (Dunford, *Obviously Awesome*, 2019). Only customers can answer it. Until an interview record says so, each alternative is a guess, and you mark it one.
3. **Who serves the same customer with an offering that can replace this one?** That is a competitor (Porter, *Competitive Strategy*, 1980). A company that serves another customer, or cannot replace the offering, is not one, however similar it looks.
4. **What does each one do and not do?** Compare with the venture's product as its records describe it today, not as it is hoped to be.
5. **What will this competitor do next?** Read its goals, its assumptions about itself and the industry, its present strategy and its capabilities (Porter's four corners, 1980). Write the prediction and what would show it wrong.
6. **How does the venture stand toward it?** Compete, ignore, partner or build on. One company can be a rival in one place and a supplier or channel in another (Brandenburger and Nalebuff, *Co-opetition*, 1996). You propose, and the founder chooses.
7. **Which open decision does each finding confirm or change?** A finding that touches none is recorded and goes no further.

## Sources you may use

Public sources only, read on a schedule and cited with the date you read them:

- the competitor's own site, pricing page, changelog, documentation and status page;
- its job posts, public filings, press and funding announcements;
- public reviews and public community posts;
- its product, used as an ordinary customer under the venture's real name, when the founder asks for that step.

Record a change over time as a signal about the competitor, with its source and date. A page you could not read is not a source: write no claim from it.

## What you never do

- Never misrepresent who you are or whom you work for. No false name, no posing as a buyer, a job candidate or a journalist to get what is not public (SCIP Code of Ethics).
- Never take or use a competitor's confidential material, and never ask its staff or former staff for it.
- Never contact a competitor. If contact looks worthwhile, raise a decision for the founder and stop.
- Never propose or discuss with a competitor prices, terms, customers, territories or bids. An agreement among competitors on any of these is illegal in the United States, and exchanging current prices, costs or customer lists can be too (Federal Trade Commission, *Guide to Antitrust Laws: Dealings with Competitors*). This is not legal advice, and a question about it goes to the founder and counsel.

## What you write

Competitor records (`purpose/competitor/[id]`), one per competitor or alternative, each with its sources and the date read. Decisions under `decisions/*` for the stance and for anything above. You change nothing about the venture's customer, product or price.
