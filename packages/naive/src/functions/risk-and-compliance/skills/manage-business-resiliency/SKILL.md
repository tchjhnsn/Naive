---
type: knowledge
tags: [naive, skills, risk-and-compliance, apqc-11-4]
ai-model: claude-opus-5-5
created: 2026-11-27T03:46:03Z
source: hybrid
name: manage-business-resiliency
process_group: "11.4"
description: >
  Run APQC process group 11.4 for a small venture: name the few things it
  cannot stop doing, get the founder's limit on downtime and lost work, write a
  runbook for each single point of failure, test what can be tested safely,
  keep the plan current, and share the risks other functions own. Load it in
  the 11.4.1 to 11.4.5 workflows and when the founder asks "what happens if
  this account is locked", "could we recover from this", "how long would we be
  down" or "who else needs to know".
---

# manage-business-resiliency

You find what the venture cannot afford to lose, write down how it would carry on without each part, and test what can be tested without touching anything live. The founder sets the limits, approves anything that touches live data or customers, and sends every word to anyone outside the venture.

## The processes

### 11.4.1 Develop the business resilience strategy

Runs `workflows/11-4-1-develop-the-business-resilience-strategy.json`.

Start from what the venture does, not from what it owns. There are usually three or four things it cannot stop for long: serving its customers, taking money, and keeping its records readable. Read `it/connections`, `product` and `support/policy` for what each one actually depends on.

Then get two figures per item from the founder: how long it may be down, and how much work or data it may lose. These are the recovery time and recovery point objectives of business continuity practice, and only the founder can set them, because they are a judgment about what the venture can survive, not a calculation. Propose figures with the cost of the outage behind them so the founder has something to argue with.

The honest output of this process is often a list of things nobody knows how to recover. Write each of those as a risk on `legal/risks/[id]` rather than leaving it as a blank in a plan.

### 11.4.2 Perform continuous business operations planning

Runs `workflows/11-4-2-perform-continuous-business-operations-planning.json`.

Map dependencies down to accounts, platforms, keys, payment rails and people, from `it/connections` and `governance/ownership`, and mark every place where a single account or a single person is the only way in. In a venture of one or two people that is most places, and the mark is the whole value of the exercise.

Write the runbook as steps someone could follow on a bad day: in order, naming who acts, which credential they need and where the backup is. A plan that reads like a policy will not be used. The trap is a plan whose first step needs the credential that is locked.

The duties the plan creates are the part that survives: a backup to verify, a contact list to refresh, a domain or certificate that must not lapse, each as an obligation with an owner and a date. Drafting what the venture would tell customers, its platform or a regulator is a step to consider, and every word of sending it is the founder's.

### 11.4.3 Test continuous business operations

Runs `workflows/11-4-3-test-continuous-business-operations.json`.

An untested plan is a belief. Pick the dependency whose failure would hurt most and has never been tested, and write what the test must show against the limit before running anything, including what the test itself could break.

Run only the parts that touch nothing live: restore a backup to a scratch copy and actually read the data, check that a contact list resolves, confirm a second person can reach a credential. Record what each part showed and how long it took, because the elapsed time is the result. Anything that would touch live data, a customer or a production account goes to the founder first, and you run none of it.

Then report against the limit: how long recovery took, what was lost, which step failed, and move the ranges on the resiliency risks. The trap is reporting that the test passed when the restore produced a file nobody opened.

### 11.4.4 Maintain continuous business operations

Runs `workflows/11-4-4-maintain-continuous-business-operations.json`.

A resilience plan decays faster than almost anything else the venture writes, because it names accounts, people and credentials. Read it against the records as they stand and list everything that has changed or gone. Roll the duties it created forward to their next dates, mark the met ones with their evidence, and add duties for new dependencies. Then reprice the risks from what the last test and these changes showed, and close the ones whose dependency the venture no longer has.

When most of the plan is stale, say so and recommend rewriting it rather than patching it line by line.

### 11.4.5 Share knowledge of specific risks across other parts of the organization

Runs `workflows/11-4-5-share-knowledge-of-specific-risks-across-other.json`.

Share the few risks a function must know because it owns the record or the dependency the risk names, read from `operations/department`. Sending the whole register to everyone is the same as sending nothing. One handoff per function, carrying the risk, why it touches that function's records, the treatment owner, the review date and the one thing you need back.

Then record what came back on the risk itself with who said it and when, and move the range only when the answer is evidence rather than an opinion. An unrecorded answer is a conversation that will be had again.

## Records

Read: `it/connections`, `governance/ownership`, `product`, `support/policy`, `customers`, `people/team`, `operations/department`, `operations/handoff`, `purpose/money/summary`, `legal/obligations`, `legal/risks` and `evidence`.

Write: `legal/risks/[id]` for a dependency nobody can recover and for the resiliency risks, `legal/obligations/[id]` for the recurring duties the plan creates, `operations/handoff/[id]` for the dependency map, the runbook, the test and its result, and `decisions/[id]` to raise a limit, a live test or a notice.

There is no record type for a continuity plan, a runbook, a recovery objective or a test result: that is not built. They live on the handoff as evidence, and what must outlast the run becomes an obligation or a risk.

## Standards

- ISO 22301:2019, business continuity management systems: understand the venture's priority activities first, then plan, exercise and maintain.
- Recovery time objective and recovery point objective, the two figures a business continuity plan is measured against.
- ISO 31000:2018 clause 6.6, monitoring and review: why the maintain process exists at all.

## What the person decides

- How long each activity may be down and how much work or data may be lost.
- Any test that would touch live data, a customer or a production account.
- Every word sent to a customer, a platform or a regulator during or about an outage.
- Any spend on redundancy, backups or a second provider.
- Whether a stale plan is patched or rewritten.
