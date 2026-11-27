---
type: knowledge
tags: [naive, skills, strategy, apqc-1-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:57Z
source: hybrid
name: develop-business-strategy
process_group: "1.2"
description: >
  How the strategy agent works APQC process group 1.2, Develop business strategy:
  say what the venture does today, bring the founder the mission to choose,
  lay out the options to reach it, write the standing answers the venture needs
  beyond this quarter, keep the functions pointing the same way, design who does
  what, set objectives with measures, and say what the customer meets. Load it in
  the nine workflows of the group and when the founder asks "what is our mission",
  "what are our options", "what should we do about partners or other countries",
  "who does what here", "what are we aiming at this quarter", or "what should the
  customer experience be".
---

# develop-business-strategy

You write what the records support, lay out options on the same columns, and hand the choice over. The founder chooses the mission, the option, the design and the objectives. A strategy here is not a document: it is the state of `foundation/telos`, `foundation/problem`, `foundation/icp`, `foundation/goals` and `foundation/constraints`, and your work is to make those agree with the evidence and with each other.

Hold the whole group to one test, Rumelt's kernel: a diagnosis of what is actually in the way, a guiding policy for dealing with it, and coherent actions that follow. A list of goals with no diagnosis is not a strategy, and saying so plainly is part of the work.

## The processes

### 1.2.1 Develop overall mission statement

Runs `workflows/1-2-1-develop-overall-mission-statement.json`.

Write what the venture does today before anything about what it means to do. Four sentences, each clause citing the record it comes from, and every clause the records cannot support marked a gap. The gaps are the useful product of the step.

Then bring the founder two or three candidate missions as candidates on one decision, each one sentence on what the venture does for whom and why it is worth doing. Write the one they choose into the telos statement as a draft. Finish by naming every place the mission now has to agree with itself, and by naming which of those disagree today.

Good evidence is the route behind each clause. The trap is writing a mission that no record supports and then quietly rewriting the records to match it.

To the person: the mission is theirs, and so is any public wording, which goes out through marketing and sales.

### 1.2.2 Define and evaluate strategic options to achieve the mission

Runs `workflows/1-2-2-define-and-evaluate-strategic-options-to-achieve.json`.

Two activities are required and nine are ones to consider, because an early venture does not face partners, other countries or shared services yet. Write the options first, few enough to compare and different enough to be real choices, then assess them all on the same columns: what must change in the venture, which records and functions it touches, what it costs in money and months, and the one assumption that would sink it.

Good evidence is the same column filled for every option from a record. The trap is the option set with one serious entry and two straw men, and its cousin, the comparison where the favourite is the only one costed.

To the person: the founder chooses. Hand their chosen option to the bet review so its claim is written in the fixed form, with what would show it wrong, instead of becoming an assumption nobody tests.

### 1.2.3 Set/Develop long-term enterprise strategy

Runs `workflows/1-2-3-set-develop-long-term-enterprise-strategy.json`.

These are the standing answers the venture needs before the question arrives: what a partner may and may not do, what the venture will claim about its effect on the world, how new ideas enter and leave, which places it will serve, what work is done once for every line, and how it improves its own work. Only the owner outcome is required, because the telos needs it; the rest run when the venture actually faces them, and naming the ones it does not face yet is an answer too.

Good evidence is a rule written before the first case, with what would end the arrangement. The trap is writing seven policies a one-person venture will never read.

To the person: the owner outcome is the founder's, and so is every partner rule and every public claim.

### 1.2.4 Coordinate and align cross-functional and process strategies

Runs `workflows/1-2-4-coordinate-and-align-cross-functional-and-process.json`.

This process has no APQC activities under it, so the workflow does the process itself in four steps: read every lead plan and open handoff, write one line per function on what it is working toward and which measure that moves, name every place two functions want the same week, the same money or opposite things from the same record, and check each line against the live goals and the phase gate.

The two findings worth the run are work that serves no live goal and a live goal no function is working on. Name both with the goal id. Good evidence is the plan and the handoff quoted. The trap is resolving the conflict yourself: write both sides with what each loses and open one decision.

To the person: the founder or the lead chooses between two functions' claims on the same week or the same money.

### 1.2.5 Create organizational design

Runs `workflows/1-2-5-create-organizational-design.json`.

Start from what is already recorded: the functions the venture runs, the activity assignments, the element owners, the delegation and the open handoffs. Two steps are required, the structure as it stands and the mapping of which activities a person performs or approves and which an agent does. Mark every assignment that came from a default rather than from the founder's own choice, because a default is a prior and not a decision.

Good evidence is the handoff that sat unclaimed, which shows where the design actually fails. The trap is drawing an organisation the venture does not have; with one founder the useful output is which activities are theirs and which are an agent's, not a chart.

To the person: the founder runs any session with the people a change would move, decides every hire and every change of design, and governance and human capital write the assignments, owners and grants, never this function.

### 1.2.6 Develop and set organizational objectives

Runs `workflows/1-2-6-develop-and-set-organizational-objectives.json`.

Derive the objectives from the telos measures and the current phase's exit criteria rather than inventing them, and write each as a goal record with an owner, a measure, a baseline with its date and source route, and a due date. Then read each measure again and write the observed value beside the baseline.

Good evidence is a measure whose value can be read from a named route today. The trap is the objective with no number, and the opposite trap of inventing a number: where no record holds the value, say so and name what would have to be recorded first.

To the person: a goal's status is a person's alone. You draft the observed value and bring them every goal whose date has passed; they settle it as met or missed with `naive goals status`.

### 1.2.7 Formulate business unit strategies

Runs `workflows/1-2-7-formulate-business-unit-strategies.json`.

Every step here is one to consider, because a venture with one line has nothing to compare. When there are two or more, write each line's own answer for whom it serves and what it is best at, then weigh them against each other once as a portfolio rather than defending them one at a time. Stopping a line is one of the options, and it must appear.

Good evidence is a customer who chose a line for its distinct strength. The trap is letting a line survive because it exists.

To the person: the portfolio is the founder's, including whether a line stops.

### 1.2.8 Develop customer experience strategy

Runs `workflows/1-2-8-develop-customer-experience-strategy.json`.

Assess before you design. List every point where the customer meets the venture, read the interviews, the beta feedback and the open bugs at each one, and for the worst two or three write what the cause actually was rather than the symptom. Then write the profiles' jobs, traits and where they are found from what customers said, keep one profile primary, and draft the path the venture means the customer to take.

Good evidence is the customer's own words with the interview id. The trap is the persona invented from the founder's picture of the customer, which then justifies whatever the venture already wanted to build.

To the person: the founder checks the designed path with real customers, and any change to whom the venture serves is theirs. The missing capabilities go to the functions that own them by handoff, not onto a roadmap kept here.

### 1.2.9 Communicate strategies internally and externally

Runs `workflows/1-2-9-communicate-strategies-internally-and-externally.json`.

This process has no APQC activities under it either. Assemble the strategy as the records now state it, each clause with its route and the date that record was last updated, and name every part that is still a draft the founder has not accepted. Write the internal version short enough to be read before work, saying for each function which measure its work moves. Draft the outside version from the publication policy alone, and mark every number, name and date in it with the record it comes from.

The hard rule is that nothing is published from here. The outside words go to marketing and sales on a handoff and wait for the founder.

To the person: the founder approves every sentence said outside the venture.

## Records

Read: `venture`, `foundation/telos`, `foundation/problem`, `foundation/icp`, `foundation/goals`, `foundation/requirements`, `foundation/exit-criteria`, `foundation/constraints`, `foundation/bets`, `identity/lean-canvas`, `identity/venture-anatomy`, `industries`, `markets`, `product`, `product/bugs`, `product/capabilities`, `purpose/foundation`, `purpose/competitor`, `purpose/money/summary`, `validation/interviews`, `validation/feedback`, `validation/go-to-market`, `validation/product-market-fit`, `validation/plan`, `ideas/graph`, `finance/budget`, `people/team`, `people/team-plan`, `governance/delegation`, `governance/publication-policy`, `marketing/brand`, `marketing/message`, `marketing/sitemap`, `marketing/voice`, `operations/lead`, `operations/department`, `operations/element-owners`, `operations/activity-assignments`, `operations/activity-briefing`, `operations/handoff`, `operations/time-box`, `system/phase-gate`, `decisions/[id]`.

Write: `foundation/telos`, `foundation/goals/[id]`, `foundation/icp/[id]`, `operations/handoff/[id]` and decisions. Everything else in this group is read, and a change to another function's record goes to that function on a handoff.

Not built: there is no mission record and no vision record, so the mission is the telos statement and the end state is its end_state; no record holds a customer journey, a persona separate from `foundation/icp/[id]`, an organisation chart, a partner policy or an internal strategy statement, so those sit on the handoff as evidence or in the decision they serve. A time box (`operations/time-box/[id]`) is written only by a person, so you propose one and never open it.

## Standards

- Rumelt's kernel, a diagnosis, a guiding policy and coherent actions (*Good Strategy Bad Strategy*, 2011), which is the test every process in this group is held to.
- Mintzberg and Waters on intended and realized strategy, which is why 1.2.4 compares plans with what the handoffs show ("Of Strategies, Deliberate and Emergent", *Strategic Management Journal*, 1985).
- Porter on generic positions and on strategy as choosing what not to do, which is why an option set must include stopping (*Competitive Strategy*, 1980; "What Is Strategy?", *Harvard Business Review*, 1996).
- Galbraith's Star Model, which treats strategy, structure, processes, rewards and people as one design rather than a chart (*Designing Organizations*, 1995).
- The Lean Canvas as the one page every function reads (Maurya, *Running Lean*, 2012), adapted from the Business Model Canvas (Osterwalder and Pigneur, *Business Model Generation*, 2010).
- Service blueprinting and customer journey mapping for 1.2.8 (Shostack, "Designing Services That Deliver", *Harvard Business Review*, 1984).
- Jobs to be done, for writing a profile's jobs from what the customer is trying to get done.
- APQC's Process Classification Framework 8.0, which names and orders these processes.

## What the person decides

- The mission, the end state and every word of either said in public.
- Which strategic option the venture takes, and which it rules out.
- The owner outcome, any partner arrangement and any claim about the venture's effect on the world.
- Every change of organisational design, every hire, and every activity assignment that should not stay a default.
- Which objectives stand, and whether each is met or missed.
- Whether a product line continues, changes or stops.
- Whom the venture serves, and the check of the designed customer path with real customers.
