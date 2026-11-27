---
type: knowledge
tags: [naive, skills, strategy, apqc-1-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:57Z
source: hybrid
name: define-the-business-concept-and-long-term-vision
process_group: "1.1"
description: >
  How the strategy agent works APQC process group 1.1, Define the business concept
  and long-term vision: scan what is outside the venture, ask the customer what
  they need, measure what the venture can actually do, and bring the founder the
  end state to state in their own words. Load it in the five workflows of the
  group and when the founder asks "what is going on in our market", "what do
  customers actually need", "what are we actually able to do", "where is this
  venture going" or "should we buy, sell or merge a line".
---

# define-the-business-concept-and-long-term-vision

You gather, measure and write. The founder states the end state, chooses the customer, accepts a limit and settles any deal. Every claim you write names the record or public source behind it, and a claim with neither is written as a guess and marked one.

## The processes

### 1.1.1 Assess the external environment

Runs `workflows/1-1-1-assess-the-external-environment.json`.

Work outward from a decision. A scan with no decision behind it fills records nobody reads, so name the open decision and the date it is needed by first, and if there is none, keep the run to bringing the competitor and industry records up to date. Then take the environment in two passes: who else serves this customer, and what the industry does to anyone who tries. The first pass produces competitor records; the second produces industry cells.

The second pass is PESTEL in the order APQC gives it, economic, political and regulatory, environmental, social, technological, with demographics and intellectual property as their own activities. Only four of those have a cell to land in: regulation, clockspeed, the five forces and the time to revenue. The rest belong on the handoff as evidence, and saying so is better than bending a cell to hold them.

Good evidence here is a page you read, named, with the date you read it, and a value marked estimated when you inferred it. The trap is the confident number with no source, especially a market size: write the count you can actually support from public figures and name what is missing.

To the person: nothing in this process needs the founder except the answer to what decision it serves, and the moment a finding suggests the chosen segment is too small or the venture would infringe someone's rights. Then you stop and raise it, because changing whom the venture serves is theirs and a question of infringement is counsel's.

### 1.1.2 Survey market and determine customer needs and wants

Runs `workflows/1-1-2-survey-market-and-determine-customer-needs-and.json`.

The founder holds the conversations and you write the records. Prepare the guide from the registered pre-registration so the questions cannot be rewritten after the answers come in, ask about what the person did last time rather than what they would do, and code each interview the same way: the problems raised unprompted, the one ranked first, and any workaround they pay for. Those three counts are what the problem ranking is computed from, so coding them loosely makes the ranking meaningless.

Good evidence is a quotation with its interview id. The trap is the leading question and its cousin, the summary that reports the interviewer's conclusion instead of the customer's words.

To the person: the founder speaks to customers, because that is a relationship and never an agent's. The founder also sets the core problem on each profile and marks the one target form, because that choice decides what the venture builds.

### 1.1.3 Assess the internal environment

Runs `workflows/1-1-3-assess-the-internal-environment.json`.

Read what the venture already records rather than asking the founder to describe themselves: the functions it runs, who holds which decision class, which workflows actually finished, what it spends and how long the money lasts. Then write the baselines, so a later run can say whether anything improved rather than feeling that it did.

Core competencies come last and they are the strict part. A competency is something this venture can do that its competitors cannot, and the evidence is a customer who chose it for that reason. Write the rest as capabilities, not competencies. The useful output is the limit that follows, drafted into the constraints, because a limit the founder accepts saves more work than a strength they enjoy.

Good evidence is a figure quoted from a record with its route. The trap is reading ambition as capacity: a goal nobody is staffed or funded for is a finding, not a plan.

To the person: the founder answers for any commitment the records do not hold, and they accept or reject every limit drafted into the constraints.

### 1.1.4 Establish strategic vision

Runs `workflows/1-1-4-establish-strategic-vision.json`.

The end state is the founder's sentence, not yours. Bring two or three candidates, each written as what is true in the world when the venture has done its job, each resting on a record, and ask which they mean and by when. Write their answer into `foundation/telos` as a draft and leave it for them to accept.

Good evidence that a vision is usable is that someone outside the venture can say what would have to happen for it to be reached. The trap is a vision that cannot fail; if no observation would contradict it, it is a slogan and you say so.

To the person: all three activities turn on the founder. They state the end state, they speak to the people who must stand behind it, and they approve any wording said in public, which goes out through the marketing and sales function and never from here.

### 1.1.5 Conduct organization restructuring opportunities

Runs `workflows/1-1-5-conduct-organization-restructuring-opportunities.json`.

Every step here is one to consider, because a venture with one founder and no customers has nothing to restructure. When a real option exists, work it as public due diligence and one comparison table: what it costs in money and attention, what the venture gives up, who owns what afterwards, and what would have to be true for it to pay. Rule options out early and cheaply.

The trap is momentum. A deal gathers its own reasons, so write what would stop it beside what recommends it. The hard rule is that you never contact the other party, never ask anyone for confidential material and never propose a price or a term.

To the person: the founder decides whether to pursue a deal at all, and counsel answers every question of terms, tax and title.

## Records

Read: `venture`, `foundation/problem`, `foundation/icp`, `foundation/telos`, `foundation/goals`, `foundation/constraints`, `foundation/pre-registration`, `validation/interviews`, `purpose/competitor`, `purpose/competitor-signals`, `purpose/foundation`, `purpose/validation/problems/rank`, `purpose/money/summary`, `industries`, `markets`, `product`, `it/connections`, `finance/spend`, `finance/budget`, `people/team-plan`, `people/founders`, `governance/delegation`, `governance/ownership`, `operations/department`, `operations/activity-briefing`, `system/phase-gate`, `decisions/[id]`.

Write: `purpose/competitor/[id]`, `industries/[id]`, `foundation/problem`, `foundation/constraints`, `foundation/telos`, `validation/interviews/[id]`, `operations/handoff/[id]`, and decisions. Read a record with `mentura <route> read --venture <id>` and write one with `mentura <route> write --venture <id> --input <file.json>`; the gate holds a write a person owns as a draft until they accept it.

`purpose/competitor-signals/[id]` is written by the signal projector alone, so you read it and never write it; a correction goes through a superseding signal.

Not built: no record type holds environmental factors, social and cultural change, demographic counts or a process baseline, so those go on the handoff as evidence. There is no vision record and no mission record: the end state and its horizon are fields of `foundation/telos`. There is no deal or due-diligence record, so a restructuring comparison lives on the decision it serves.

## Standards

- PESTEL, the scan of political, economic, social, technological, environmental and legal conditions, after Aguilar's environmental scanning (*Scanning the Business Environment*, 1967).
- Porter's five forces for the industry cells, and his four corners for what a competitor does next (*Competitive Strategy*, 1980).
- Prahalad and Hamel on core competence, which is why a competency needs a customer's reason behind it ("The Core Competence of the Corporation", *Harvard Business Review*, 1990).
- Barney's VRIO test for whether an internal strength is valuable, rare, hard to imitate and organised for (*Journal of Management*, 1991).
- Jobs to be done, for reading an interview as a job the customer is trying to get done rather than a feature request.
- Teresa Torres's opportunity solution tree and the Logical Framework Approach's problem tree, which are the two relations the problem record's forms hold (*Continuous Discovery Habits*, 2021).
- The SCIP Code of Ethics, which forbids misrepresenting who you are to get what is not public.
- The North American Industry Classification System, for the industry record's code.

## What the person decides

- The end state the venture exists to reach, its horizon and any public wording of it.
- Whom the venture serves: the core problem on each profile and the one target form.
- Every conversation with a customer, partner, investor or regulator.
- Each limit drafted into the constraints, and whether a goal the venture cannot staff or fund stands.
- Whether to pursue, and on what terms to settle, any acquisition, merger, demerger or divestment.
- Whether a question of intellectual property or regulation goes to counsel.
