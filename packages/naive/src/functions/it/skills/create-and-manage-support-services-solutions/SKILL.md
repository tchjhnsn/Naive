---
type: knowledge
tags: [naive, skills, it, apqc-8-7]
ai-model: claude-opus-5-5
created: 2026-11-27T03:45:06Z
source: hybrid
name: create-and-manage-support-services-solutions
process_group: "8.7"
description: >
  Keep the venture's systems running and its users answered: name the services it
  must keep alive, plan the operating week, know the headroom and the renewals,
  watch what is running, and work the support queue. Load it for the eight
  workflows of APQC process group 8.7 and when the founder asks "what do we have
  to keep running", "when do we run out of capacity", "what is down", "what are we
  paying to renew" or "how do we answer this user".
---

# create-and-manage-support-services-solutions

You keep the record of what runs, watch it, work what can be worked inside your own reach, and hand up what cannot. The founder answers customers, commits money, speaks to providers, grants wider access and authorises anything that cannot be undone.

Three rules hold across all eight processes. A service is called working only when it was exercised the way a user would use it, not when its health endpoint returned a page. A recovery is called possible only when a restore was run and compared. No reply leaves the venture to a customer in anyone's name but the founder's.

## The processes

### 8.7.1 Define and establish service delivery strategy

Runs `workflows/8-7-1-define-and-establish-service-delivery-strategy.json`.

Derive the service list from `foundation/goals` and `foundation/telos`, not from the tools the venture happens to have: for each goal, what has to keep running for it to be met. Then give each service its users, its promise in plain words, its cost to run and what stops without it. Record where each service runs and where its data sits, because location is the constraint a customer contract or an obligation is most likely to bite on.

Sourcing is the founder's: run it, buy it, or have someone else operate it, each with its cost and its way out. Anything that hands an outside party access is `security-loosening`.

### 8.7.2 Define and develop service support strategy

Runs `workflows/8-7-2-define-and-develop-service-support-strategy.json`.

Aim at one way in and one written path from arrival to closure. Keep the rating scheme to three levels, each with a first-answer time the venture can actually hold to, and draw the line clearly between what an agent answers on its own and what always reaches a person. Choose the one place requests arrive with the `tool-selection` skill, favouring the option that leaves the venture holding `support/cases` rather than a vendor.

The trap is to promise hours the venture cannot cover. Write what is explicitly not supported; that sentence prevents more disappointment than the rest of the policy.

### 8.7.3 Plan and manage service delivery control

Runs `workflows/8-7-3-plan-and-manage-service-delivery-control.json`.

APQC puts this in one activity, and its level 5 tasks give the contents: who is on hand and when, the recurring jobs and their times, the change windows, the backup and archive runs, the work spread so two heavy jobs do not contend for one host or quota, and the known procedure for each recurring failure. Record each scheduled job on the connection of the system that runs it.

The finding that matters is the job that runs only because someone remembers it. Name every one, because that is the work that stops when the founder is ill or busy.

### 8.7.4 Develop and manage infrastructure resource planning

Runs `workflows/8-7-4-develop-and-manage-infrastructure-resource.json`.

Write the present use of every host, database, queue, storage and quota against its limit, then answer one question honestly: which limit does the venture hit first, and when. Say what would change if use doubled or the venture signed its largest plausible customer, with the cost and the lead time. Count seats and licences against the people and agent roles that actually opened them.

Recovery point objective and recovery time objective belong here: how much data the venture can afford to lose and how long it can afford to be down. Both are the founder's numbers, and the rest of the plan follows from them.

### 8.7.5 Define service support planning

Runs `workflows/8-7-5-define-service-support-planning.json`.

Plan against a count, never a guess. Group the last period's requests by cause and name the three causes behind the largest share: those are worth fixing rather than staffing. Write one short answer for every request seen twice, keep it next to the support tool, and delete answers that no longer hold. Define escalation concretely: the ratings, the time limits, who is reached, how they are reached outside hours, and what the asker is told as it moves.

Outside providers are a relationship. You prepare the account, the terms, the response time promised and the renewal date; the founder speaks to them and makes every commitment.

### 8.7.6 Develop and manage service delivery operations

Runs `workflows/8-7-6-develop-and-manage-service-delivery-operations.json`.

This is the watching one. Exercise each live service the way a user would and record when it was last seen working. Read every scheduled job's result since the last run and record each one's last successful run. Read the headroom and the trend. Read the security signals each system exposes, the failed sign-ins, the new sessions and devices, the permission changes, and name every one nobody can account for. Restore one backup into a scratch copy and compare it with the live records.

For an unplanned failure, write what it stopped and from when, take the first step the triage rule gives, log every action with its time, and hand anything needing a refund, a public statement or a promise to a customer to the founder.

### 8.7.7 Manage infrastructure resource administration

Runs `workflows/8-7-7-manage-infrastructure-resource-administration.json`.

One list of everything the venture holds: machines, accounts, domains, certificates and repositories, each with its holder, its cost, its renewal date and what stops if it lapses. A domain or certificate that lapses takes the venture off the internet, so renewal dates are the part to get right. Record the configuration each system actually runs under, and name every setting that exists only in a console and in nobody's notes. Refer to secrets by variable name only and never read or write a value.

Apply the critical and high security updates first and record what was deliberately left behind with the reason. Check each licence against the actual use, including whether an agent acting for the venture is permitted at all: that is `legal-or-terms` and goes to the founder.

### 8.7.8 Operate IT user support

Runs `workflows/8-7-8-operate-it-user-support.json`.

Rate on arrival by what the request stops and how many it affects, and record the rating and the first step. Keep every open request moving with what has been tried, what it is waiting on and when the asker was last updated. Fix what is inside your own reach, grant only access the rule already allows, and close only when the asker has confirmed it is answered. Draft every reply to a customer for the founder to send.

Escalate on the clock, not on exhaustion: when a time limit has passed or the answer needs a judgment, money or wider access, send it up with what has been tried and what the decision is. When a request turns out to be an outage or a loss of data, follow the continuity procedure and stop at any step that cannot be undone.

## Records

The workflows read `foundation/goals`, `foundation/telos`, `product`, `product/bugs`, `support/cases`, `support/policy`, `customers`, `it/connections`, `assets/register`, `finance/spend`, `finance/budget`, `legal/obligations`, `supply-chain/suppliers`, `people/team`, `people/team-plan`, `capabilities/processes`, `capabilities/postmortems` and `operations/activity-assignments`.

They write `it/connections/[id]` for each system's configuration, versions, quotas, scheduled jobs, last successful run, backup and last tested restore, licences and renewal dates; `operations/handoff/[id]` for the service list, the support path, the operating schedule, the capacity figures, the demand count, the performance report and the incident log; and `decisions/[id]` for spend, renewals, cancellations, wider access, terms and any recovery step that cannot be undone.

There is no record type for a service catalog, a service level target, an incident, an operating schedule, a configuration item or a support knowledge article: those are not built. The service list and the schedule go on the handoff, an incident is recorded on the handoff and raised as a decision where it needs one, and a support request is kept in `support/cases`, which this function reads but does not own.

## Standards

- ITIL 4 is the reference for the practices in this group: service desk, incident management, problem management, monitoring and event management, capacity and performance management, and IT asset management. Problem management is the reason 8.7.5 looks for the cause behind a group of requests rather than staffing to the volume.
- ISO/IEC 20000-1 requires a service catalog, agreed service levels, and that incidents and requests be classified, prioritised and recorded.
- ISO/IEC 19770-1 is the IT asset management standard behind the single asset list, with each asset's holder, cost and lifecycle state.
- CIS Controls v8.1 Control 1 (enterprise assets), Control 2 (software assets), Control 7 (continuous vulnerability management) and Control 11 (data recovery) cover the inventory, the patching order and the tested restore. The UK Cyber Essentials expectation that critical and high security updates are applied within 14 days of release is the line used for patching.
- Recovery point objective and recovery time objective are the standard pair for stating how much data may be lost and how long recovery may take.

## What the person decides

- Which services the venture must keep running, and whether to run, buy or have each one operated.
- The recovery point and recovery time the venture can live with.
- Every reply to a customer, and every promise, refund or public statement.
- Every spend, renewal, cancellation and set of terms.
- Every widening of access, and every recovery step that cannot be undone.
- Which cause of support requests to fix first.
