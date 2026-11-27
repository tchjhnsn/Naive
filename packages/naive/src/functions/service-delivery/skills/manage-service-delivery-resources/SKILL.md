---
type: knowledge
tags: [naive, skills, service-delivery, apqc-5-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:49Z
source: hybrid
name: manage-service-delivery-resources
process_group: "5.2"
description: >
  Work out how much delivery work is coming, who or what will do it, and whether
  they can. Load it for the 5.2.1, 5.2.2 and 5.2.3 workflows and when the founder
  asks "can we take this on", "what am I committed to next month", "do I need a
  subcontractor" or "could anyone else deliver this".
---

# manage-service-delivery-resources

You forecast, assign, count hours and prepare the materials someone learns from. The founder agrees the forecast, asks the clients, hires and pays anyone, and teaches a person.

## The processes

### 5.2.1 Manage service delivery resource demand

Runs `workflows/5-2-1-manage-service-delivery-resource-demand.json`.

The method is two numbers reconciled into one. The baseline is arithmetic: the remaining hours on signed engagements, plus each open opportunity's hours at its offer's usual duration weighted by the probability the sales record already carries, laid out week by week. The second number is what the founder expects. Reconciling them in one agreed figure, rather than keeping a sales forecast and a delivery plan that disagree, is what sales and operations planning means; in a small venture it is one conversation about the weeks where the two differ by more than a quarter.

Show the arithmetic, never only the result, so the founder can change one probability and watch the weeks move. Then measure the last forecast: the absolute percentage difference between forecast and delivered hours per week, kept as a series. Mean absolute percentage error is the usual way to say it, and its weakness matters here: a week with almost no delivered hours makes the percentage enormous, so report the hours alongside it. Changing the method is a step to consider and waits for three measured forecasts, because with one or two you are fitting noise.

Good evidence is a forecast whose every line names the engagement or opportunity it came from, with guesses marked as guesses. The trap is a forecast of revenue dressed as a forecast of work: delivery is bounded by hours and skills, so forecast hours and the skills each order needs, and let finance forecast the money.

Asking a client when their work starts is the founder's: you draft the question, they send it. Agreeing the one figure is the founder's too.

### 5.2.2 Create and manage resource plan

Runs `workflows/5-2-2-create-and-manage-resource-plan.json`.

A resource plan in a venture this size is one table: every deliverable due in the next eight weeks, its performer, its hours, its week. Write it by assigning deliverables, not by assigning people to engagements, because the acceptance test lives on the deliverable and so does the handoff that carries it.

Then compare committed hours with available hours week by week and name every week that is over. Do not spread the overload evenly across the weeks; say which deliverable would slip and which client it belongs to, and propose what moves. Loading a performer to their full available hours guarantees lateness, because queueing time rises sharply as utilisation approaches capacity, and the founder's week also carries selling: flag any week where delivery took more than half of it.

Name the critical resources plainly: the person, agent, tool, account or supplier whose loss stops a committed deliverable, what covers each, and how long the cover takes to arrange. A single source with no cover is the finding worth escalating, and the Kraljic matrix is the usual way to argue it, by what the item is worth and how hard it is to replace.

The supplier step is the founder's: you prepare the scope, the acceptance test, the dates, the budget and what the supplier may see of the client's data, and the founder approaches and agrees. Never contact a supplier yourself and never commit money. The skills list you write is for the human capital function, because the venture's skills record is theirs.

### 5.2.3 Enable service delivery resources

Runs `workflows/5-2-3-enable-service-delivery-resources.json`.

Most of this process is a step to consider while the founder delivers everything alone; two parts are worth doing anyway. Say, per live offer, who must be able to run its procedure unaided, and turn that procedure into something a person can learn from: the runbook with its checks, one worked example from a closed engagement with the client's identifying details removed, and the list of mistakes already made.

When someone new does deliver, test before a client pays for the learning: set the test as a task from a closed engagement, judged by that engagement's own acceptance test, where the right answer is already known. Record who passed and on what date, and say who may not yet take a client's deliverable. Then judge the training by the next delivery, not by the session: compare its rework, hours and on-time result with earlier deliveries of the same offer. Kirkpatrick's four levels are the usual frame, and the only levels worth your time here are the last two, behaviour and results; a satisfied session says nothing. The design order of analysis, design, development, implementation and evaluation is the ADDIE model, and the workflow follows it.

Giving a session to a person is the founder's or the holder of the skill's. You prepare it and never deliver it.

## Records

Read: `sales/opportunities`, `service-delivery/engagements`, `service-delivery/offers`, `customers`, `operations/handoff`, `operations/activity`, `people/team`, `people/team-plan`, `supply-chain/suppliers`, `finance/budget`, `it/connections`, `capabilities/processes`, `decisions`.

Write: `operations/handoff/[id]` for the forecast, the plan, the capacity arithmetic, the critical resources and the test results; `service-delivery/engagements/[id]` to list the handoff that carries each deliverable; `service-delivery/offers/[id]` to point an offer's runbook at the learning materials; and `decisions/[id]` for the recommendations and anything that spends money.

Naive has no record type for a demand forecast, a resource plan, a skills taxonomy owned by this function, or a training plan and its test results, so each lives on the handoff as evidence and in the decision it supports: not built. The venture's skills and gaps belong to `people/team` and its hiring to `people/team-plan`, which the human capital function writes, so send findings there as a handoff rather than writing them.

## Standards

- Sales and operations planning: one agreed plan reconciling demand with the capacity to deliver it, rather than separate sales and delivery numbers.
- Mean absolute percentage error, the measure the accuracy step computes, read with the hours beside it because small weeks distort the percentage.
- Little's law relates work in progress, throughput and lead time, and is the reason a performer loaded to their full available hours delivers late.
- The Kraljic matrix classifies a supplied item by its value and the difficulty of replacing it; the supplier record's schema already uses it.
- ADDIE, the instructional design order the training workflow follows, and Kirkpatrick's four levels of training evaluation, of which only behaviour and results are used here.
- APQC Process Classification Framework 8.0, category 5.0, supplies the process names these workflows carry.

## What the person decides

- The one agreed forecast, and every departure from the baseline.
- What is asked of a client about their own timing, and when it is asked.
- Which deliverable moves when a week is over capacity.
- Whether to engage a supplier, at what price, and what they may see of a client's data.
- Who may work a client's deliverable, and when learning time is taken out of delivery weeks.
- Whether to build a skill, buy it or stop offering the service that needs it.
