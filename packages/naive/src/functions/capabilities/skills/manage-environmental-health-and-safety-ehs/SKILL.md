---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-9]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: manage-environmental-health-and-safety-ehs
process_group: "13.9"
description: >
  How the capabilities agent handles health, safety and environmental work in a
  venture that may have none of it yet: a dated finding on what its operations
  physically do, the duties that reach it with each one cited, a policy only the
  founder states, one place events are recorded, and a program that is read
  rather than assumed. Load it for the workflows of APQC 13.9 and when the
  founder asks "do any of these rules apply to us", "what do we do if someone is
  hurt" or "what happens when we hire someone".
---

# manage-environmental-health-and-safety-ehs

You find out what the venture physically does, cite the duties that follow from it, and write down what is done when something goes wrong. The founder states the policy, arranges any inspection, speaks to any authority, and takes every question of legal duty to counsel.

Most software ventures have no environmental or safety duty beyond ordinary care, and saying so with a date is a real output. The failure mode is in both directions: a borrowed policy about things the venture does not do, or a first employee and a workplace with nothing written at all. Nothing here is legal advice.

## The processes

### 13.9.1 Determine environmental health and safety impacts

Runs `workflows/13-9-1-determine-environmental-health-and-safety-impacts.json`.

Read what the venture actually does, from `venture`, `assets/register`, `assets/leases` and `supply-chain/suppliers`, and list every physical impact: a place people work in, goods shipped, hardware made, waste, or energy bought at scale. When there is none, write that finding with its date and the condition that would create one, usually the first employee, the first workplace or the first physical product. That finding is the record a later reader needs.

An audit is worth running only once there is a place, equipment or materials involved, and anything needing a qualified inspector goes to the founder to arrange.

### 13.9.2 Develop EHS program

Runs `workflows/13-9-2-develop-ehs-program.json`.

List the duties that reach this venture from `legal/obligations`, its lease and its customer contracts, and cite each one; mark the guessed ones as guesses for counsel rather than writing them as facts. Then look ahead: what would create a duty the venture does not have today, and what each would require.

The policy is drafted but never adopted here: it is a public commitment, so the founder states it, and it should contain nothing the venture cannot keep. The part worth having first is the event path: the one way an injury, a near miss or a spill is recorded and who is told. Each event becomes a postmortem record with its timeline, its causes as conditions and its actions with owners.

### 13.9.3 Monitor and manage EHS program

Runs `workflows/13-9-3-monitor-and-manage-ehs-program.json`.

Read the program instead of assuming it: events, near misses and open actions past their due date since the last reading, with the as-of date, and report zero events as zero out of how many weeks rather than as an absence. Total the cost against what it prevents, and say plainly where the benefit cannot be measured.

The emergency response is cheap and worth writing even for a venture with no workplace: what is done in the first hour of a fire, an injury or a serious outage, who is called in what order, and where the list is kept so it can be read without the system that failed. Prevention, training and support are scoped to the impacts the finding named: where it named none, record that they are not needed and why.

## Records

Read: `venture`, `legal/obligations`, `legal/risks`, `assets/register`, `assets/leases`, `supply-chain/suppliers`, `people/team`, `finance/spend`, `capabilities/processes`, `capabilities/postmortems`, `operations/handoff`.

Write: `capabilities/processes/[id]` for the impact finding, the duty list, the drafted policy, the event path, the emergency response and the measures, `capabilities/postmortems/[id]` for each event, `operations/handoff/[id]` for audits and questions, and `decisions/*`.

An incident record, a permit register, an EHS policy record and a training record are not built: an event is a postmortem record, a duty sits in `legal/obligations`, which the risk and compliance function writes, and the policy text is held on a process record until a person adopts and publishes it.

## Standards

- APQC Process Classification Framework 8.0, process group 13.9.
- ISO 14001:2015 (environmental management systems) and ISO 45001:2018 (occupational health and safety management systems), for the shape of a program: scope from real impacts, duties identified, controls, measurement, review.
- In the United States, the Occupational Safety and Health Administration's requirements for employers, which begin to apply when a venture has employees. Whether and how they apply is for the founder and counsel.
- The Google SRE book, chapter 15, for the blameless review the event path uses, which the postmortem record follows.

## What the person decides

- The policy, and whether it is published.
- Whether a duty applies, with counsel.
- Any inspection, certification or professional advice arranged.
- Anything said to an authority, an insurer or an affected person.
- What the venture spends on health, safety and environmental work.
