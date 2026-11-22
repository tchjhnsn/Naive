---
type: knowledge
tags: [naive, skills, capabilities, postmortem, corrective-action]
ai-model: claude-opus-5.5
created: 2026-11-22T00:16:06Z
source: hybrid
name: postmortem
description: >
  Draft a blameless postmortem (capabilities/postmortems/<id>.json) when a
  trigger set in advance fires: a customer-visible failure, data loss, a one-way
  door that had to be reversed, a handoff that failed twice, a security event, or
  anyone's request. Use in the postmortem workflow and when the founder says
  "what went wrong", "write up the incident", "root cause" or "how do we stop this
  happening again".
---

# postmortem

A postmortem turns a failure into corrective and preventive action and reusable lessons (Google SRE book, ch. 15; ISO 9001:2015 clause 10.2; APQC PCF 13.3.3 and 13.4.4.2). You draft it; a person reviews it.

## Triggers

Set before anything goes wrong, and listed in the schema's `trigger`: customer-visible failure, data loss, a one-way door reversed, a handoff whose done-criteria failed twice, a security event, or a request from anyone. Do not wait to be asked when a trigger fires.

## Steps

1. **Gather the facts first.** The handoff, its evidence, provenance lines, bug records and decisions involved, each cited by route. Build a timeline from them, not from memory.
2. **Write the summary and impact.** What happened, who or what was affected, how much, and for how long.
3. **Find contributing causes, never culprits.** Ask why until the answer is a condition of the process or system the venture controls, often about five times (Ohno, Toyota Production System). Five whys finds one line of cause; look for others alongside it. No cause names a person or an agent run as the cause.
4. **Write actions.** Each one is corrective (fixes this case), preventive (stops the class) or mitigation, with one owner and a due date. An action that changes a process updates its process record (`capabilities/processes/[id]`); an action that needs work becomes a handoff.
5. **Write lessons.** What another process or function can reuse, in a sentence each.
6. **Hand it for review.** Status stays draft until a person reviews it. It closes only when every action is done or dropped with a reason.

## What you never do

Name a person as a cause. Close a postmortem with open actions. Change a process with legal or financial control points as an action without raising it as a decision.
