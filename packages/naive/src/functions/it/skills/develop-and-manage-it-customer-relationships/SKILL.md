---
type: knowledge
tags: [naive, skills, it, apqc-8-1]
ai-model: claude-opus-5-5
created: 2026-11-27T03:43:41Z
source: hybrid
name: develop-and-manage-it-customer-relationships
process_group: "8.1"
description: >
  How the IT agent serves the people and agent roles inside the venture that
  depend on its systems: who they are, what they need, what they can rely on,
  what IT will and will not provide, and how a service level is agreed and then
  measured. Load it in the 8.1 workflows and when the founder asks "who needs
  what from our systems", "what can I rely on this provider for", "should we
  promise a customer an uptime number" or "is this tool actually serving us".
---

# develop-and-manage-it-customer-relationships

In a solo or small venture the IT customer is not an outside buyer. It is the founder, the venture's own functions and the agent roles that act in outside systems on their behalf. You find out what each of them needs from a system, write it down on the connection record, say plainly what the venture can and cannot rely on today, and bring every promise, price and conversation to the founder. You never agree a service level, contact a provider or a customer, or say anything about IT outside the venture.

The order of the group is the order of the work: learn who depends on what (8.1.1), turn the venture's goals into the capabilities those people need (8.1.2), tell them what is coming and what is not (8.1.3), guide one change through from requirement to roadmap (8.1.4), write and agree the levels (8.1.5), keep the way of asking and answering alive (8.1.6), then measure what actually happened (8.1.7). Each step that commits the venture, or speaks to anyone outside it, is the founder's.

## The processes

### 8.1.1 Understand IT customer needs

Runs `workflows/8-1-1-understand-it-customer-needs.json`.

Build the picture from records, not from memory: `people/team-plan` for who exists, `operations/activity-assignments` for who performs what, `governance/delegation` for who may approve what, and `it/connections` for which system each of them reaches. Group by function, because a function is the unit that will later ask IT for something. Then say, per group, what it can already do alone and where it has to wait for the founder: that wait is the capability gap, and it is the number that justifies IT work in a small venture.

Good evidence is a dated line naming the scope a role holds and the activity it performed with it. The trap is writing a group's needs as adjectives ("needs better access"). Write the activity it could not perform and the scope that would let it.

The person's part: nothing here commits the venture, so the agent does the whole process. Ask the founder only for a dependency no record shows.

### 8.1.2 Identify IT customer transformation needs

Runs `workflows/8-1-2-identify-it-customer-transformation-needs.json`.

Work from live goals outward. Read `foundation/goals` and the requirements that derive from them in `foundation/requirements`, and name for each the capability cluster it needs from `capability-clusters.json`. Then map the systems the venture has against those clusters, so a cluster nothing covers is visible as a gap rather than discovered during the work. Service expectations are where a small venture fools itself: write the number you need, then go and read the provider's own published terms, and mark the expectation an assumption until a page says it. A provider that publishes nothing is a provider with no level.

The trap is visioning first. A one-page year-out shape is only worth writing once the venture pays for several systems, which is why that step is one to consider.

The person's part: the founder decides anything that would cost money or accept terms, which the final step raises.

### 8.1.3 Plan and communicate IT services

Runs `workflows/8-1-3-plan-and-communicate-it-services.json`.

The useful output is small: what each person and agent role can rely on, what it cannot, and the one indicator per service that says whether it is working. Take indicators only from numbers that can be read without asking anyone, such as a provider's status page, a connection's last sync date or a line in `finance/spend`. Say where no such number exists instead of inventing a proxy.

APQC's names for the last two activities are marketing names, and in this venture they mean the internal note that tells a function what each system is for and what it is authoritative for, and when that note reaches people. Anything that would leave the venture is a public statement, so you draft and the founder decides.

The person's part: the founder approves any wording that goes outside the venture, and sets when announcements happen.

### 8.1.4 Provide IT transformation guidance

Runs `workflows/8-1-4-provide-it-transformation-guidance.json`.

This is the one process in the group that moves a change from a wish to a plan, and it is worth running on one change at a time. Collect needs from the workflows and assignments first and from the founder second. When you rank the options, run `naive tools recommend` for the goal or the activity, so the ranking weighs what the venture would stop being able to see, not only what a tool costs: a tool that records nothing of the activity is a blind spot, and a tool the venture owns beats one it rents on the same record. Write the business case with the arithmetic visible and the assumption that carries it named.

The person's part: step `prioritize-it-outcomes` is the founder's, because the order of outcomes is a decision about ends. Wider access, a paid plan, new terms and anything that deletes data are also the founder's.

### 8.1.5 Develop and manage IT service levels

Runs `workflows/8-1-5-develop-and-manage-it-service-levels.json`.

A level is a number, a window and a consequence. Without all three it is a wish. ITIL 4's service level management practice is the useful shape here: agree what is measurable, measure it, and review it with the people who depend on it; ISO/IEC 20000-1 is the standard to read if the venture ever has to show a customer it manages services at all. The catalog belongs on the connection records, one entry per system, and an entry whose system the venture no longer uses is struck rather than left to rot.

The person's part: `define-service-level-agreement` and `negotiate-and-establish-service-level-agreements` are the founder's, because both commit the venture. You prepare the ask, the fallback and what the venture will accept; the founder has the conversation.

### 8.1.6 Manage IT customer relationships

Runs `workflows/8-1-6-manage-it-customer-relationships.json`.

The whole value is one list nobody can lose: every request IT has received, who asked, what for, its state and the decision it waits on. Refusals are written with their reason, because an unexplained refusal comes back as the same request next month. Read each function's lead plan in `operations/lead` to know what it is about to need, and tell it which of those needs its present access already covers.

The person's part: step `establish-relationship-management-mechanisms` is the founder's, because a way of working between people is a relationship, not a record.

### 8.1.7 Analyze service performance

Runs `workflows/8-1-7-analyze-service-performance.json`.

Compare each agreed level with what happened, and take the evidence from outside your own summary: the provider's status history, the connection's sync dates, `system/provenance`, cases in `support/cases` and bugs in `product/bugs`. Separate the misses the provider caused from the misses the venture's own setup caused, because only the second kind is yours to fix. The trap is reporting availability as a percentage with no source; a number you cannot point at is not a measurement.

The person's part: a plan change, a cancellation or new terms when the provider is the cause.

## Records

The workflows read `venture`, `foundation/goals`, `foundation/requirements`, `foundation/telos`, `product`, `product/capabilities`, `it/connections`, `finance/spend`, `finance/budget`, `people/team-plan`, `operations/activity-assignments`, `operations/handoff`, `operations/lead`, `operations/meeting`, `governance/delegation`, `legal/obligations`, `support/cases`, `support/policy`, `service-delivery/offers`, `product/bugs`, `system/provenance` and `decisions`.

They write only `it/connections/[id]` and `decisions/[id]`, and record everything else as evidence on `operations/handoff/[id]`. Read a route with `mentura <route> read --venture <id>` and write one with `mentura <route> write --venture <id> --input <file.json>`.

Not built: Naive has no record type for an IT service catalog entry, an internal service level agreement, or an IT request queue of its own. The catalog and the levels are fields on the connection record, and the request list and every plan or note this group produces live on the handoff as evidence. Say so rather than writing them somewhere they do not belong.

## Standards

- APQC Process Classification Framework 8.0, category 8.0 Manage Information Technology (IT), process group 8.1, which gives the processes and activities their names.
- ITIL 4, for the service level management and relationship management practices: agree only what can be measured, and review it with the people who depend on it.
- ISO/IEC 20000-1, the service management system standard, if the venture is ever asked to show that it manages its services.

## What the person decides

- The order of IT outcomes (8.1.4.6).
- Every service level the venture commits to, and every provider's terms it accepts (8.1.5.4, 8.1.5.6).
- How functions ask IT for things and hear back (8.1.6.1).
- Any wording about IT that leaves the venture, and when it is said.
- Every paid plan, cancellation, downgrade, widening of access and deletion of a system's data.
