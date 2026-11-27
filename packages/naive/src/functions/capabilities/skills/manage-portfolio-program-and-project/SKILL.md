---
type: knowledge
tags: [naive, skills, capabilities, apqc-13-2]
ai-model: claude-opus-5-5
created: 2026-11-27T03:44:06Z
source: hybrid
name: manage-portfolio-program-and-project
process_group: "13.2"
description: >
  How the capabilities agent runs the venture's work in flight: the portfolio as
  every piece of work against the goal it serves, a program as several projects
  aimed at one outcome, and a project as one handoff chain from scope to close.
  Load it for the workflows of APQC 13.2 and when the founder asks "what are we
  working on", "why is this taking so long", "should we stop this" or "what did
  that project actually deliver".
---

# manage-portfolio-program-and-project

You keep the work in flight visible and honest: what is running, what it serves, what it is waiting on, and what it delivered. The founder starts, funds, pauses and stops work, speaks to everyone outside the venture, and decides any scope change.

In Naive a project is not a new kind of record. It is an ordered set of handoffs with done criteria, and its evidence is the evidence of those handoffs. Resist inventing a parallel plan: a plan that does not live in the handoffs is a plan nobody works from.

## The processes

### 13.2.1 Manage portfolio

Runs `workflows/13-2-1-manage-portfolio.json`.

The portfolio is the list of everything in flight against the live goal and measure each piece serves, read from `operations/handoff` and `foundation/goals`. The useful output is short: what serves a goal, what serves none, and what has had no evidence for the longest. A small venture's real constraint is attention, so the governance rule worth writing is a limit on how many pieces may run at once and when a stalled piece is stopped.

Good evidence is a dated list where every piece names its goal. The trap is a portfolio that only grows: the run is worth little unless it proposes stopping something.

The founder decides what stops.

### 13.2.2 Manage programs

Runs `workflows/13-2-2-manage-programs.json`.

A program is worth naming only when three or more pieces of work must land in an order to reach one outcome. Write the order and the handover points, then report against the outcome rather than against activity: what has been proved, what is still assumed, which dates moved and by how much, each cited to a handoff or an evidence record.

Anyone outside the venture that the program waits on is listed with what they must deliver and when, and the message to each is drafted and left for the founder to send. The trap is reporting motion as progress; a program that has produced no evidence has not progressed.

### 13.2.3 Manage projects

Runs `workflows/13-2-3-manage-projects.json`.

Scope first, and scope as what must be true when it is done, with what it will not do and the measures it will be judged by. Then pick how it will be run from how uncertain the outcome is: a short fixed sequence where the work is known, timeboxed attempts where it is not. Plan as handoffs in the order they must finish, each with done criteria and the role and access it needs. Execute by writing evidence as each criterion passes, and bring every scope change back rather than absorbing it, because absorbed scope is why projects have no end. Report against the measures the scope named. Close by writing the recurring work the project leaves behind as an owned process record, and the lessons another project can reuse.

Good evidence is a close where the measures named at the start are read at the end. The trap is a project that closes with a demonstration and no measure.

The founder chooses the project, approves the hours and money, hires anyone, sets the launch date and approves every change of scope.

## Records

Read: `operations/handoff`, `foundation/goals`, `foundation/telos`, `foundation/requirements`, `evidence`, `capabilities/processes`, `people/team-plan`, `finance/budget`, `operations/lead`, `system/decision-index`.

Write: `operations/handoff/[id]` for the work, its plan and its evidence, `capabilities/processes/[id]` for the governance rule and for the recurring work a project leaves behind, and `decisions/*` to raise an order or a stop.

A project record, a program record, a portfolio record and a schedule with dependencies are not built. The portfolio is derived by reading the handoffs against the goals, and a program is held as a process record naming its projects. A Gantt chart is not built and is not planned.

## Standards

- APQC Process Classification Framework 8.0, process group 13.2.
- PMI's *PMBOK Guide* and ISO 21502:2020 for the vocabulary of portfolio, program and project, and for the idea that a project has a definite end.
- PRINCE2's stage boundary, which is why each handoff here has done criteria that must pass before the next begins.
- The *Scrum Guide* where the work is uncertain enough to be run as timeboxed attempts; Naive's time boxes are `operations/time-box/[id]`, which the operations function writes.

## What the person decides

- Which projects start, in what order, and which stop or pause.
- The hours, the money and any hire a project needs.
- Every change to a project's scope.
- Anything said to a supplier, partner or contractor the program depends on.
- Whether a project met what it was started for.
