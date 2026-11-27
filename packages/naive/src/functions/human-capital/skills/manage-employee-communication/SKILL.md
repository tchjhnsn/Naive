---
type: knowledge
tags: [naive, skills, human-capital, apqc-7-8]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:15Z
source: hybrid
name: manage-employee-communication
description: >
  Decide what the venture tells the people who work on it, how often and who
  says it, judge honestly whether it is large enough for an anonymous survey, and
  draft every message for a person to send. Load it for the three workflows of
  APQC process group 7.8, and whenever the founder asks "what should I tell the
  team", "should we run an engagement survey" or "did we ever tell them that".
process_group: "7.8"
---

# manage-employee-communication

You draft, check and record. You never send a message to the people who work on the venture: the venture's word to them is the founder's or the lead's to give. Every fact in a draft names the record behind it, and no sentence says more than a decision has settled.

A workflow step marked `consider` is optional. Run it when its condition holds or the founder asks, and otherwise say that you considered it and why you did not run it.

## The processes

### 7.8.1 Develop employee communication plan

Runs `workflows/7-8-1-develop-employee-communication-plan.json`. Start with what must be said rather than with channels: what changed in the goals, what was decided and why, what is expected of each person, and anything the law where that person works requires the venture to tell them. Then name one channel, one cadence and one person per message, keeping the channels to the fewest the venture can keep up, and say what happens when a cadence is missed. Good evidence is a plan where every message names its decider and its deliverer; the trap is four channels nobody maintains, after which people learn that nothing important arrives through any of them. The founder adopts the plan.

### 7.8.2 Conduct employee engagement surveys

Runs `workflows/7-8-2-conduct-employee-engagement-surveys.json`. The first step is a judgement with a count behind it: below a handful of people, no survey can be answered honestly or anonymously, and the right recommendation is that the founder ask each person the same two questions directly. Where a survey is run, use the same few items each time, each about something the venture could actually change, report only groups large enough that no individual stands out, and never guess who said what. Good evidence is a recorded judgement about anonymity and a report that answers each theme; the trap is a survey whose answers can be traced back to one person, which produces careful answers and lasting mistrust. The founder tells the people who answered what will and will not change.

### 7.8.3 Deliver employee communications

Runs `workflows/7-8-3-deliver-employee-communications.json`. Draft each message as what changed, what it means for the reader and what they must do, in the venture's own voice from `marketing/brand`, with the record behind every fact named. Before it goes, check it against the decisions in `decisions` it reports and flag every sentence that says more than the decision settled. Record each sent message with its date, channel, audience and anything it promised. Good evidence is a sent message whose promises are all traceable to decisions; the trap is a cheerful update that commits the venture to something nobody decided, which is then remembered as a promise.

## Records

The workflows read `people`, `people/founders`, `people/team-plan`, `foundation/goals`, `governance/internal-terms`, `governance/publication-policy`, `legal/obligations`, `marketing/brand`, `operations/handoff`, `decisions` and `decisions/[id]`.

They write `decisions/[id]` and the handoff they run under. Nothing in this group writes `people`.

A communication plan, a sent-message log and a survey with its answers: not built. Naive has no route for any of them, so the plan and the log live on the handoff as evidence, the plan's adoption lives in a decision, and survey answers are kept only in grouped form so that no one person can be identified.

## Standards

- ISO 30414:2018, *Human resource management: Guidelines for internal and external human capital reporting*, for what the venture reports to the people who work on it and what it reports outside.
- The data minimisation principle of the General Data Protection Regulation, Article 5(1)(c), for keeping survey answers in grouped form rather than per person.

## What the person decides

- Whether the communication plan is adopted, and what it commits the venture to.
- Every message sent to the people who work on the venture.
- Whether a survey is run at all, and what is said back about its results.
- Any promise a message would make that no decision has settled.
