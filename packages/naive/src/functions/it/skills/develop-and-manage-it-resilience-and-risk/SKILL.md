---
type: knowledge
tags: [naive, skills, it, apqc-8-3]
ai-model: claude-opus-5-5
created: 2026-11-27T03:43:41Z
source: hybrid
name: develop-and-manage-it-resilience-and-risk
process_group: "8.3"
description: >
  How the IT agent keeps a small venture from losing its records, its accounts
  or its customers' data: the risk and obligation register, the resilience
  strategy, the controls and their dated checks, continuity and tested restores,
  security, privacy and data protection, compliance assessments, and identity
  and authorization. Load it in the 8.3 workflows and when the founder asks
  "what could go wrong with our systems", "what happens if this provider
  disappears", "are we allowed to hold this data" or "who can reach what".
---

# develop-and-manage-it-resilience-and-risk

You identify, record, check and narrow. You never widen access, accept a provider's terms, buy anything, delete data, attack anything or speak to anyone outside the venture. The founder sets how much loss the venture can live with, accepts a risk, approves a widening and answers an auditor or a customer.

The honest shape of this group in a venture of one or a few people: a handful of risks, almost all of them about credentials and copies of records, a short page of rules, and dated checks that prove the rules hold. Everything claimed here must point at evidence. A control reported as met because the fix is planned is a false report, and worse than an open failure.

The order is register first (8.3.1), then what the venture could not run without (8.3.2), then the controls and their checks (8.3.3), continuity and restores (8.3.4), data and privacy (8.3.5), assessment and reporting (8.3.6), the continuity work and change control that keep it true (8.3.7), and identity and authorization, which is where most of the real exposure sits (8.3.8).

## The processes

### 8.3.1 Develop IT compliance, risk, and security strategy

Runs `workflows/8-3-1-develop-it-compliance-risk-and-security-strategy.json`.

Follow ISO 31000's order: identify, analyze, evaluate, then treat. One register, one row per risk, each row naming what could happen, how, which connection and which record it would reach, how likely, how bad, and the evidence the estimate rests on. Obligations come from `legal/obligations`, the venture's markets and industries, and each provider's own terms, always with the page and date; what you cannot source is marked unknown and sent to the founder and counsel, never guessed.

Tolerance is the part only the founder can give, and it must come back as numbers: hours without a system, records that may be lost, accounts that must carry a second factor with no exception. Adjectives are useless here. Every risk then gets one owner who can actually act on it, taken from `governance/delegation` and `operations/element-owners`, and a mitigation labelled avoid, reduce, transfer or accept. Map the mitigation to a control in whichever framework the founder chose, the NIST Cybersecurity Framework or ISO/IEC 27001, and say plainly if neither has been chosen. Where a system also controls physical equipment, say so, because its failure is not an ordinary software failure.

The person's part: `understand-business-unit-risk-tolerance` asks the founder, and accepting a risk, spending, accepting terms or widening access is the founder's.

### 8.3.2 Develop IT resilience strategy

Runs `workflows/8-3-2-develop-it-resilience-strategy.json`.

The useful question per system is what the venture could still do without it, for how long, and what it would lose for good. Record the longest outage the work can absorb on the connection. Critical risks in a small venture are nearly always the same four: the single credential holder, the account without a second factor, the system with no export, and the provider with no notice period. Name each with the evidence that it is real here, not in general.

The person's part: step `prioritize-it-risks` is the founder's, and the founder also names which risks the venture accepts as they are. Write every accepted risk with the date it was accepted, so it is revisited rather than forgotten.

### 8.3.3 Control IT risk, compliance, and security

Runs `workflows/8-3-3-control-it-risk-compliance-and-security.json`.

Keep the rules to one dated page, and keep requirements checkable: "every account that can move money is on a second factor" can be checked; "security is taken seriously" cannot. Threat analysis is specific too: the reused password, the phished login, the token left in a repository, the dependency taken over, the agent talked into using a credential, each written with what it would reach given the scopes on the connection records today.

Then assess on a date and write pass, fail or could not check with what you looked at. Could not check is a real result and must be reported as itself. Between assessments, watch what actually changes: new connections, new scopes, a provenance line showing a write by a role that should not have made it, a credential past its rotation date.

The person's part: the briefing for people with access is drafted by you and given by the founder; widening, spend, terms and deletion are the founder's.

### 8.3.4 Plan and manage IT continuity

Runs `workflows/8-3-4-plan-and-manage-it-continuity.json`.

Take the backup facts from each system's own settings, never from assumption: how it is backed up, how old the newest usable copy is, where that copy sits, who can restore it. Compare with the numbers the founder set, and single out every system with no export at all, which is the worst case because the records cannot be moved even in slow time. Write the plan in the order ISO 22301's thinking suggests, what happens first, how the records come back, who does it, what is accepted as lost, and then test one restore and record the date and the result. An untested backup is reported as untested.

The person's part: a paid plan, new terms or a second provider.

### 8.3.5 Develop and manage IT security, privacy, and data protection

Runs `workflows/8-3-5-develop-and-manage-it-security-privacy-and-data.json`.

Start from the data, not the system: what personal or confidential data each system holds, whose it is, which sourced rule covers it, and what the venture has promised about it in writing. Then write one page: what is collected and why, who and which agent role may read each class, how long each class is kept, when it is deleted, and how a person's request about their own data is answered. Retention and deletion are the two a small venture nearly always leaves blank, and they are the two that cost most later.

The checks are concrete: encryption at rest and in transit by the provider's own account, who can export, whether a copy sits on a personal device, whether any secret appears in a record or a repository. On the venture's own applications, check that each role authenticates as itself, that no credential is shared between a person and an agent, and that nothing writes a record outside the router's gate. Intrusion monitoring for a venture this size means reading the alerts the providers already send; a detection product is not worth buying yet, which is why that step is one to consider.

Credentials are named by variable name only. You never read, copy or write a secret's value, not even into an incident note.

The person's part: every widening of access to personal data, every set of data terms, every deletion, and anything said to a person whose data was reached.

### 8.3.6 Conduct and analyze IT compliance assessments

Runs `workflows/8-3-6-conduct-and-analyze-it-compliance-assessments.json`.

Test against evidence rather than intention: the system's own settings, the connection record, `system/provenance`. One report, one row per requirement with its control, result, evidence and date, and a plain list at the top of what is not met. For each failure write what it would take to fix it and what it would cost, do the part that is yours, and raise the rest.

The outside-facing step, supporting an audit, a customer's security questionnaire or an insurer, is one to consider because someone has to ask first. You assemble the pack from the records and flag every answer that would be a guess; the founder answers and signs, and nothing leaves the venture from you.

### 8.3.7 Develop and execute IT resilience and continuity operations

Runs `workflows/8-3-7-develop-and-execute-it-resilience-and-continuity.json`.

Two things make this process real. First, the plan is kept where it can be read when the systems it covers are down, which means an exported copy, not only a page inside the system itself. Second, change control: write the rule for changing a live system (what may change without asking, what needs a decision of its class first, what must be reversible, what is recorded afterwards) and then refuse your own change that does not meet it. Check each provider's own continuity on a date from its published pages, including the notice it gives before closing an account, and exercise the plan by actually restoring something and timing it.

The person's part: a second provider, a paid plan or terms; and the resilience card is given by the founder.

### 8.3.8 Manage IT user identity and authorization

Runs `workflows/8-3-8-manage-it-user-identity-and-authorization.json`, and its steps load `access-review`, the module's skill for scope-by-scope work.

One identity per person and per agent role, never shared, granted for a named activity and removed when the activity ends. Keep the directory of who exists on each system current, leftover unclaimed accounts included, with the date each was last checked. Compare scopes with the activities the work actually performed and remove what was not used: narrowing is yours, widening is the founder's. Check how each account proves who it is, and put a second factor on every account that can move money, change DNS, push code or read customer data. Audit against the system's own settings rather than the venture's record of them, and correct the record where they disagree; the disagreement is the finding.

Two steps are deliberately held back. Breach response runs only when something is reported, and then you write the timeline from the provider's own logs, revoke and rotate what is yours, name what the credential could have reached, and tell the founder at once; what is said outside, and whether data is deleted, is the founder's. Penetration testing is prepared and never performed: you write what a test would cover, what it must never touch and what it would cost, and the founder hires the tester and gives permission. You never attack anything, and never test a provider's system.

## Records

The workflows read `venture`, `it/connections`, `legal/obligations`, `legal/risks`, `governance/delegation`, `governance/decision-rights`, `governance/detector`, `people`, `people/team-plan`, `operations/handoff`, `operations/workers`, `operations/element-owners`, `customers`, `finance/spend`, `foundation/goals`, `foundation/constraints`, `knowledge/knowledge-sources`, `markets`, `industries`, `system/provenance`, `system/release`, `evidence` and `decisions`.

They write only `it/connections/[id]` and `decisions/[id]`. The register, the rules page, the continuity plan, the assessment report and each test result go on `operations/handoff/[id]` as evidence. A risk that belongs to the venture rather than to IT is written by the legal function to `legal/risks/[id]`, which you read and never write.

`node packages/naive/src/checks/check-connections.ts` is the conformance check these workflows run on a venture's connections, and `node packages/naive/src/checks/check-detectors.ts` checks a venture's detectors and their trial ledgers when it has any.

Not built: Naive has no record type for an IT risk register row, an IT control and its dated test result, a security policy, a continuity plan, an incident or a compliance finding. All of these live on the connection record and the handoff today. Say that plainly instead of writing them to a route that means something else.

## Standards

- APQC Process Classification Framework 8.0, category 8.0 Manage Information Technology (IT), process group 8.3, which gives the processes and activities their names.
- ISO 31000, for the order of risk work: identify, analyze, evaluate, treat, and the four treatments avoid, reduce, transfer, accept.
- ISO/IEC 27001 and the NIST Cybersecurity Framework 2.0, as the two control frameworks a venture may choose to map its mitigations to. The choice is the founder's, and you record which was chosen.
- CIS Controls v8.1, Implementation Group 1, for the account, access, and backup baselines a small venture can actually meet. The `access-review` skill carries these.
- ISO 22301, for business continuity: recovery and resumption, and a plan that has been exercised.

## What the person decides

- How much loss the venture can live with, in numbers (8.3.1.2).
- Which risks are at the top, and which the venture accepts as they are (8.3.2.3).
- Which control framework the venture maps its mitigations to.
- Every widening of access, every paid plan, every set of provider or data terms, and every deletion of a system's data.
- Whether a penetration test happens, who performs it and what it may touch (8.3.8.7).
- Everything said outside the venture about a risk, an incident or a compliance answer, including an auditor's or a customer's questionnaire (8.3.6.5).
