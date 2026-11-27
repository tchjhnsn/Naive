---
type: knowledge
tags: [naive, skills, products, apqc-2-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:23Z
source: hybrid
name: generate-and-define-new-product-service-ideas
process_group: "2.2"
description: >
  Turn what the venture already knows into product concepts worth building and
  into requirements a test can pass or fail: scan the technologies that change
  what is possible, gather and group every idea with its source, shape two or
  three concepts for the founder, then write the requirements, the support model
  and any bundle. Load it in the workflows of APQC process group 2.2 and when
  the founder asks "what should we build next", "is this even possible", "what
  are people asking for" or "what exactly are we building".
---

# generate-and-define-new-product-service-ideas

You gather, group, shape and write. The founder chooses which concept the venture pursues and sets the limits only they can set. An idea with no record behind it is marked as the venture's own guess, never as what customers want.

A step marked `consider` is optional: run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not.

## The processes

### 2.2.1 Perform discovery research

Runs `workflows/2-2-1-perform-discovery-research.json`.

Scan first, trial second, judge third. Name the technologies, models, interfaces and libraries that could change what the product does, what it costs to run or who could use it, each from a public source with the date you read it, and say for each what it would make possible that is not possible today. Then build the smallest thing that answers the open question for the one or two that would matter most. A vendor's page states a claim; a trial on the venture's own input states a fact.

Judge how ready a technology is rather than how exciting it is: a demonstration in a laboratory and a component running in the conditions the product will meet are different levels of readiness (technology readiness levels are the usual scale for saying which), and the feasibility verdict names the level, the open question and the test that would settle it. Good evidence is a trial with its input, its cost in time and money and what it did not settle. The trap is a feasibility verdict with no test behind it, which is an opinion wearing a verdict's clothes.

The person decides whether a trial is worth its cost before it is run, and no technology is adopted because it is new. You record the verdict as the feasibility risk on the product card.

### 2.2.2 Generate new product/service concepts

Runs `workflows/2-2-2-generate-new-product-service-concepts.json`.

Gather everything before judging anything: the interviews, the beta feedback, the support cases, the bug list, the founder's raw dumps and the open decisions, each idea with the record it came from and the customer's own words where there are any. Then group by the job and the ICP profile served, and separate the thing asked for from the problem behind the ask, because customers describe solutions and buy progress (jobs to be done). Count how many separate sources raised each group and how many paid or built a workaround; a group raised once by the loudest customer is one source.

Shape only what survives into two or three concepts, each stated as who it is for, the job it does, how it does it and what the customer would stop doing. Keep the ideas you set aside with their reason, so the same idea does not arrive again as new. Good evidence is an unprompted mention in an interview or a workaround someone pays for. The trap is a concept that serves no form of the venture's primary problem and no target profile: it is attractive, it is plausible, and it is a different venture.

The person chooses which concept to pursue. You bring them side by side with the evidence for and against each and what it would cost to try.

### 2.2.3 Define product/service development requirements

Runs `workflows/2-2-3-define-product-service-development-requirements.json`.

Write requirements as statements a test could pass or fail, one requirement per statement, in a fixed form so each is unambiguous (the EARS patterns, which Naive already uses for a bet's claim, are a good form: when such a thing happens, the product shall do such a thing). Cover the functional need for each job, what the product must work with, what must never go wrong with a person's data or safety, the rules from the legal and industry records, what the industry's buyers expect as standard, the two or three moments where how it feels decides whether the job gets finished, and what is sold as service rather than software. Trace every requirement to the job, the interview or the rule behind it; a requirement with no trace is an assumption and is marked as one.

Say what happens after launch in the same breath: who answers a customer who is stuck, through which channel, within what time. A support model nobody wrote is the founder at every hour. Good evidence is a requirement whose source record can be opened and read. The trap is the requirement that states a design (three screens, a dropdown) instead of a need, which forecloses the design before anyone has tried it.

The person sets the limits that cost money or make a promise (a response time, an uptime, a price-shaped constraint) and confirms the scope. The requirement records themselves belong to the strategy function, so the set goes to the founder and to strategy on the handoff rather than being written here.

## Records

The workflows read `product`, `product/bugs`, `product/capabilities`, `foundation/problem`, `foundation/icp`, `foundation/goals`, `foundation/constraints`, `foundation/bets`, `foundation/requirements`, `validation/interviews`, `validation/feedback`, `validation/pricing`, `support/cases`, `support/policy`, `purpose/raw/dump`, `raw/dump`, `purpose/competitor`, `purpose/competitor-signals`, `it/connections`, `knowledge/knowledge-sources`, `industries`, `legal/obligations`, `deals`, `finance/spend` and `decisions`.

They write only `product/[id]`, `decisions/[id]` and the handoff they run under (`operations/handoff/[id]`). The requirement record `foundation/requirements/[id]` is the strategy function's to write, so this work hands the set over rather than writing it.

Records this work wants that Naive has no route for, and so are not built: an idea or opportunity record with its sources and its status, a concept record for a product that does not exist yet, a technology scan record, and a support model record. Until they exist, the list, the concepts and the model live on the handoff, and the concept the founder picks becomes a product card.

## Standards

- Jobs to be done: describe the progress the customer is trying to make, not the feature they asked for.
- The Kano model as a way to tell a feature that must be there from one that delights, when there is enough evidence to sort them.
- EARS, the easy approach to requirements syntax: one requirement per sentence in a fixed pattern.
- ISO/IEC/IEEE 29148 for what a requirement set has to be: each requirement singular, verifiable and traceable.
- Technology readiness levels for saying how proven a technology is.

## What the person decides

- Which concept the venture pursues, and which ideas are set aside.
- Whether a technology trial is worth its cost before it is run.
- Every limit that costs money or makes a promise: a response time, an uptime, a cover, a date.
- Whether a bundle is offered, and what it includes.
