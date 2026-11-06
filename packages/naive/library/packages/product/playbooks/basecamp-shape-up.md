---
type: playbook
source: ai-drafted
created: 2026-10-29T22:40:00Z
ai-model: grok-4.7
tags: [naive, playbook, product, shape-up]
---

# Six-week cycles and pitches

A draft for the product function. It does not decide a bet. The betting decision stays open until a person decides it.

Shape Up is a product-development method written up by Ryan Singer and published by Basecamp. This playbook borrows the method: six-week cycles, a shaped pitch, a bet, a circuit breaker, and a two-week cool-down. It does not borrow Basecamp's marks, book subtitle, product slogans, interface, or case-study copy. Shape Up, Basecamp, and Hill Chart are their names. A venture's pitch is the founder's own words.

The book calls two-week cycles sprints, and says that length is too short. This template does not produce sprints. It produces one handoff for a six-week cycle and, after that cycle ends, a second handoff for the cool-down between cycles.

## What the method does

Sources are the chapters of Shape Up at basecamp.com/shapeup, fetched 2026-10-29.

Basecamp works in six-week cycles. Six weeks is long enough to build something meaningful from start to finish, and short enough that the deadline is visible from the start. Most of their new features are built and released in one cycle. They do not count hours or rethink the plan every two weeks. ([Chapter 1](https://basecamp.com/shapeup/0.3-chapter-01))

Shaping happens before a team is asked to build. A small senior group defines the elements of a solution at a level that is concrete enough to act on and abstract enough to leave room. The question is the appetite: how much time the idea is worth, and how much time they want to spend. ([Chapter 1](https://basecamp.com/shapeup/0.3-chapter-01))

Appetite is a time budget for a standard team, not an estimate. An estimate starts from a design and ends in a number. An appetite starts from a number and ends in a design. The book calls this fixed time, variable scope. Two sizes are the usual ones. A small batch is what one designer and one or two programmers can build in one or two weeks, batched into a six-week cycle. A big batch takes that same team the full six weeks. ([Chapter 3](https://basecamp.com/shapeup/1.2-chapter-03))

A pitch has five ingredients: the problem, the appetite, the solution, the rabbit holes, and the no-gos. A problem without a solution is unshaped. A solution without a problem has no test of fitness. The appetite is part of the problem definition: solve this in six weeks, or in one or two weeks for a small batch, rather than in a longer open-ended effort. ([Chapter 6](https://basecamp.com/shapeup/1.5-chapter-06))

A pitch does not go onto a backlog. Before each cycle, a betting table looks at pitches from the last six weeks, or an older pitch someone deliberately brings back. A pitch that is not bet is let go. There is no central list to groom. ([Chapter 7](https://basecamp.com/shapeup/2.1-chapter-07))

After each six-week cycle they schedule two weeks of cool-down, with no scheduled project. People fix bugs, explore ideas, or try a technical approach. The betting table meets during cool-down. Project teams are one designer and two programmers, or one designer and one programmer, joined later by someone doing integration testing. A bet means the whole six weeks, uninterrupted, for a specific payout. The most the bet can lose is six weeks. ([Chapter 8](https://basecamp.com/shapeup/2.2-chapter-08))

The circuit breaker is the rule that pairs with that cap. If the team does not finish inside the time that was bet, the project does not get an extension by default. More time on a bad approach is refused. The next shaping track can reframe the problem, and a new pitch is reviewed at the betting table before another six weeks is dedicated. Unfinished scraps are not carried into the next cycle unless they are shaped and bet again. ([Chapter 1](https://basecamp.com/shapeup/0.3-chapter-01), [Chapter 8](https://basecamp.com/shapeup/2.2-chapter-08))

The book allows a rare extension of a couple of weeks, and prefers not to use it. The outstanding tasks have to be must-haves that survived scope hammering, and the remaining work has to be downhill: no unsolved problems. Uphill work goes back to shaping. Cool-down sometimes absorbs a few leftover must-haves, and the book treats that as a signal about shaping or about the team, not as a habit. ([Chapter 14](https://basecamp.com/shapeup/3.5-chapter-14))

## Template

Fill this in for one product. Each step names the Naive route it reads or writes. Routes are the ones `node packages/naive/src/router/router.mjs` lists. Specs and a roadmap are not records yet (`packages/naive/library/packages/product/package.json` lists them under `planned`). The cycle and the pitch are handoffs. The bet is a decision record.

The product function reads `foundation/icp`. It does not copy that profile onto the product card. `packages/naive/src/engine/design-system.mjs` `inputs()` is the pattern: read the other function's record by its route, and leave it there.

`operations/handoff` is suggested from validation onward (`packages/naive/src/engine/need-now.json` gives handoff a discovery prior of 0.3 and a validation prior of 0.7, and the suggest line is 0.5). The route itself resolves in any phase.

### 1. Read the offer

Read `product/[id]`.

Stop when the read is `not_found`. The cycle is about a product the venture already has. Do not invent the card in this step.

### 2. Read who it is for

Read `foundation/icp`.

Each profile is its own record at `foundation/icp/<id>`, and the list read returns them keyed by id. With no accepted profile the read still has `ok: true`, with `result: null` and a `not_found` object. An agent's draft of a profile does not count. Stop on that read. Use what the primary profile says as the context for the problem section. Leave the profile on its own route.

### 3. Read which decisions the role may carry

Read `governance/decision-rights`.

When the venture has no record, the read is `not_found`, and `packages/naive/src/checks/check-execution.mjs` still loads `packages/naive/template/governance/decision-rights.json`. The template gives the builder role `implementation-detail` and `accept-verified-work`. Use classes whose owner is the handoff's role. A class owned by another role fails the execution check.

### 4. Write the pitch as a cycle handoff

Write `operations/handoff/[id]`.

Use an id such as `cycle-<slug>`. The file is `operations/handoffs/<id>.json`. The `brief` field is a markdown path beside that file. The brief is not its own route. The router write is the JSON. Write the brief on disk before `packages/naive/src/checks/check-ready.mjs`, which reads it.

Status stays `draft`. Role is `builder` unless step 3 named another role that owns the classes you carry. Set `products` to the product id from step 1. Set `attempts` to 0, `max_attempts` to at least 1, and `run_cap` to a per-run cap the schema accepts, such as `2h` or `$20`. The schema pattern is minutes, hours, or a dollar cap (`packages/naive/src/records/handoff.schema.json`). It does not accept weeks. The six-week appetite goes in the brief.

`governed_by` has to name a decision `packages/naive/src/checks/check-ready.mjs` can see. That checker reads `docs/decisions/decisions.json` and the venture's `knowledge/decisions.json`. It does not read `decisions/*.decision.json`. EE-017 in `docs/decisions/decisions.json` is in force, and it is the decision that made handoffs machine-checkable. Name EE-017, or name an in-force entry in the venture's own log. The bet in the next step is a separate record. Cite its id in the brief.

`done_criteria` needs one `conformance` and one `self-proof` (`packages/naive/src/checks/check-ready.mjs`, `packages/naive/src/checks/check-execution.mjs`). Use:

- conformance: `node packages/naive/test/verification/playbook-basecamp-shape-up/pitch-check.mjs <path to the brief>`
- self-proof: a command that runs this cycle's work and exits 0 when that work actually happened. Until you have that command, use `node -e "console.error('replace this command with one that runs the cycle work'); process.exit(1)"`. That command fails on purpose.
- review, optional: a question for a role other than the holder, for example architect: "Does what shipped stay inside the no-gos?"

The brief needs these headings, each with text under it. `packages/naive/src/checks/check-ready.mjs` requires Outcome and Work, and it fails on `TBD`, `TODO`, `FIXME`, `???`, or angle-bracket placeholders. The pitch check requires the rest, and it requires the appetite section to contain the words "six weeks".

```markdown
## Outcome

What is true for the people in the product's market when this cycle ships.

## Work

The shaped work for this cycle: the elements the team will build, and the scope they are free to cut.

## Problem

One specific story of the status quo, in the founder's words, grounded in the product card and the ICP you read. A single story gives a baseline the solution can be judged against.

## Appetite

Six weeks for one designer and one or two programmers. This is a big batch. The time is the constraint. Scope is what gets cut so the work fits.

## Solution

The core elements, concrete enough to see and loose enough that the people building it can work out the details. Leave out visual specifications that would decide layout, color, or type.

## Rabbit holes

The holes you already patched in the shaping: the approaches this cycle will not wander into.

## No-gos

What this cycle leaves out so the appetite holds.
```

A small batch in the book is one or two weeks inside a six-week cycle. This template's check expects a six-week appetite. A pitch whose appetite does not say six weeks fails `pitch-check.mjs`.

This handoff is the pitch. It is not a backlog item. A pitch you do not bet stays `draft`. You do not open a list route for it.

### 5. Propose the bet, and leave it open

Write `decisions/[id]`.

Use an id such as `bet-<slug>`. Status is `open`. Boundary is `fail-closed`. Set `decides.path` to `operations/handoffs/cycle-<slug>.json` and `decides.record` to `handoff`. Question: "Do we bet one six-week cycle on this pitch?" Options: `bet` and `decline`. Leave `answer` null for the founder to supply, or draft one of those two words. Set `provenance.drafted_by.kind` to `agent`.

Do not set status to `decided`. Only a person settles a decision (EE-058): the router saves an agent's write of `status: decided` as a draft, and the record stays open (`packages/naive/src/router/router.mjs` write). The founder decides in the next step.

While that decision is open and fail-closed, `packages/naive/src/engine/decisions.mjs` `holding()` matches `decides.path` to the cycle handoff file. An agent's later write of that file comes back as a draft (`packages/naive/src/router/router.mjs` write).

### 6. The founder bets or declines

A person runs:

```sh
node packages/naive/src/interfaces/cli/mentura.mjs decide bet-<slug> --venture <id> --by "<their name>" --answer <bet or decline>
```

`mentura decide` asks them to type the decision id. `packages/naive/src/engine/decisions.mjs` `approve()` records `provenance.approved_by`, and it accepts any wording, so the answer has to be exactly `bet` or `decline` for the bet check below to read it. Reasons go in `--note`.

Decline: leave the cycle handoff in `draft`. Do not start it. Do not carry it forward. Someone who wants it later proposes a new bet.

Bet: the decision is decided by that person.

Either way the hold on the handoff file lifts, because the decision is no longer open. After a decline the router will save an agent's write that moves the handoff forward. The bet check is what fails it.

### 7. Open the cycle

After an answer of `bet`, write `operations/handoff/cycle-<slug>` again only to move the same handoff forward. Then run:

```sh
node packages/naive/src/checks/check-ready.mjs <venture dir> cycle-<slug>
```

It fails when the brief is missing a section, a product id does not exist, `governed_by` is not in the decision log, the role or a class is wrong, or a criterion names a script that is not in the repo. When every line passes, record it:

```sh
node packages/naive/src/checks/check-ready.mjs <venture dir> cycle-<slug> --record --by <role or session>
```

That writes `ready_check` and can move a draft to `ready`. The holder then sets `in-progress` and `claimed_by`. `packages/naive/src/checks/check-execution.mjs` refuses `in-progress` without `ready_check`.

During the six weeks the team cuts scope to the appetite. Must-haves are the work the scope is not done without. Nice-to-haves are what gets cut when time runs out. ([Chapter 14](https://basecamp.com/shapeup/3.5-chapter-14)) The handoff is the project. Adding tasks by raising `max_attempts` or rewriting the appetite does not buy a longer bet.

### 8. Circuit breaker

When the six weeks end and the work is not done, write `operations/handoff/cycle-<slug>` with:

- `status`: `escalated`
- `claimed_by`: the holder
- `escalations`: one open item, `class` set to `attempts`, `answer` omitted, `to` set to `founder`, `question` asking them to shape a new pitch before any further time is bet

`packages/naive/src/checks/check-execution.mjs` fails an escalated handoff that has no open question, and it fails a handoff past `ready` that has no `claimed_by`.

Do not set `status` to `done`. Do not write a second cycle handoff that continues this pitch. A new six weeks is a new pitch (step 4) and a new open bet (step 5).

A rare extension, as the book describes it, is a new decision at `decisions/[id]`, left open for the founder. The outstanding work is must-have and has no open question left in it. This template does not change the original handoff's appetite in place.

### 9. Cool-down between cycles

After the cycle handoff is `done` or `escalated`, write a second handoff, `operations/handoff/cooldown-<slug>`.

The brief's appetite is two weeks. Outcome and Work describe unscheduled time: bugs, exploration, or shaping the next pitch. The cool-down handoff does not list the unfinished cycle as an input that commits it. It does not carry the old pitch's no-gos forward as a promise to build them.

This is the handoff between cycles. The next cycle starts again at step 1.

### 10. Evidence when it ships

When the work did ship inside the appetite, write `evidence/[id]` with `subject.kind` `handoff`, `subject.id` the cycle id, and one passing result per done-criterion. A review result names `by` as the criterion's reviewer. Set the handoff's `evidence` to those files, set `pr` to the pull request, and set `status` to `done`.

`packages/naive/src/checks/check-execution.mjs` fails `done` without a pull request, and it fails `done` when any criterion has no passing evidence.

## Checks

Each of these can pass and can fail. The replay is `node packages/naive/test/verification/playbook-basecamp-shape-up/replay.mjs`.

| Check | Pass | Fail |
|---|---|---|
| `node packages/naive/test/verification/playbook-basecamp-shape-up/pitch-check.mjs <brief>` | Outcome, Work, and the five pitch sections all have text, and the appetite says six weeks | Any of those sections is missing or empty, or the appetite does not say six weeks |
| `node packages/naive/src/checks/check-ready.mjs <venture dir> <handoff id>` | The brief, products, governing log entry, role, classes, and criteria scripts are in place | Any of those is missing. A `governed_by` id that exists only as `decisions/[id]` fails, because this checker reads the decision log |
| `node packages/naive/src/checks/check-execution.mjs <venture dir>` | A draft cycle handoff with a known role and both kinds of criteria, or a done handoff with a pull request and passing evidence, or an escalated handoff with an open question and `claimed_by` | `done` with no evidence, or `escalated` with no open question, or `in-progress` with no `ready_check` |
| Read `decisions/<bet id>` and `system/provenance` | The cycle handoff is `draft`, or the bet is `decided` with `answer` exactly `bet` and provenance shows `approve()` (`activity` accept, agent kind person, `approved_by` set) | The cycle handoff is past `draft` while the bet is missing, still open, answered anything other than `bet`, or `decided` with no person accept in the provenance log |
| Read `operations/handoff/cooldown-<slug>` and the cycle handoff | The cool-down record is absent, or it exists and the cycle status is `done` or `escalated` | The cool-down record exists while the cycle is `draft`, `ready`, or `in-progress` |

Run the ready and execution commands with the venture directory and, for ready, the handoff id. The `check` action on `operations/handoff/[id]` spawns each of the handoff's checkers with only the venture directory (`packages/naive/src/router/router.mjs`). `packages/naive/src/checks/check-ready.mjs` then exits 2, because it requires the handoff id. Use the commands in the table.

## Trademark

Shape Up, Basecamp, and Hill Chart are names of Basecamp's book, product, and progress chart. This playbook uses the method and cites the chapters. It does not use their subtitle, their interface, their sketches, or their case studies as the venture's own copy. The words in the pitch are the founder's.
