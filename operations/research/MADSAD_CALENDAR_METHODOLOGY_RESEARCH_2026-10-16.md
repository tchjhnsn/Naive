---
publish: false
type: research
source: hybrid
created: "2026-10-17T01:58:00Z"
updated: "2026-10-17T22:40:00Z"
ai-model: grok-bot
authority: exploratory
decision-status: none
status: DRAFT
tags: [research, methodology, planning, calendar, forecasting, throughput, pstack, mad, sad, grokbot]
governed-by:
  - "[[RESEARCH_METHOD]]"
related:
  - "JUSTICE_DOMAIN_HANDOFF_2026-10-12 (tchjhnsn/polity: docs/handoffs/JUSTICE_DOMAIN_HANDOFF_2026-10-12.md)"
  - "[[SAD_SKILL_v3]]"
  - "[[sad-methodology]]"
---

# Calendar + task planning for MAD/SAD: first principles, tools, throughput (research, 2026-10-16)

> **How this was researched.** This note used web search, page fetch, the X API (for the pstack creator's own posts), the GitHub API (read-only, for the owner's own PR history) and read-only access to the Mac vault. It did **not** use the Parallel deep-research tool, because that plugin and `parallel-cli` were not installed on the box. Rigor was substituted by cross-checking across sources where possible and by labelling every claim.
>
> **Labels used throughout**
> - **[V]** verified against a primary source fetched this session
> - **[S]** secondary source only (blog, transcript mirror, search snippet)
> - **[U]** unverified or not found
> - **[J]** my judgment or derived arithmetic, not a sourced fact
>
> **Limits of this note.** `authority: exploratory`. Nothing here is a decision. The definition of "MAD" was not found in the vault (grep for the word returned nothing); this note uses only what the vault says about SAD (Specification-Anchored Development, `another project/product/SAD_SKILL.md`, `sad-methodology/entity-profile.md`) and treats "MAD" as the sibling method the owner named. The 476 KB Justice handoff was read by heading and frontmatter only, not in full.

---

## 1. Summary (ten lines)

1. **Recommended stack: Google Calendar as the time spine, a markdown vault note per project as the goal / why / evaluation record, GitHub as the source of throughput data, and a Grok Bot morning digest and Friday review on top. Drop Google Tasks.** Google is kept as the baseline and extended, not replaced. Scored 90/100 against 50 for Calendar + Tasks alone ([J], §4.4).
2. **Google Tasks cannot be the planning layer [V].** Its API stores a date-only `due` (the time is discarded), has no custom fields, and has no second date. A task cannot carry both a stretch date and a must-be-true-by date.
3. **The one-minute view answers four questions: done, active, next, what it builds toward.** Each is generated from the system, not typed by hand (§3.1).
4. **Every goal gets two dates, and they mean different things.** A *stretch date* (motivation; Musk/OKR-style, graded 0.6–0.7 at success) and a *must-be-true-by date* (a forecast percentile from throughput data, the P85). The evidence that ambitious dates are not forecasts is documented (§2.1).
5. **Time is budgeted, scope flexes.** Shape Up's appetite plus circuit breaker gives each unit a time cap and a rule for what happens at the cap (§2.2).
6. **The horizon is a per-project setting, not a global one** (§6.2). I propose a profile with horizon, cadence, review rhythm, slack, throughput unit and commit percentile.
7. **The "2,500 PRs a month" claim is real as a claim and unverifiable as a benchmark.** Lauren Tan (@poteto) posted "here's how i shipped 2,500 PRs last month to production" on 2026-09-21 [V]. No PR definition, team-versus-individual split, revert rate or token spend was found anywhere. She herself says most of it is gardening and refactoring, not 2,500 features [S] (§5.1).
8. **The owner's own baseline, from GitHub [V]:** 110 merged PRs in `<owner>/<repo>` since May; 92 in the last 26 days (about 3.5 a day); 26 merged in the Oct 12–16 sprint. Median open-to-merge is 0.67 h, but the 85th percentile is 9.3 h, which is the review and verification tail. Raw count versus the pstack claim is about 22 times lower, but the two counts are not comparable (§5.4).
9. **A smaller token budget is a verification-and-environment problem first, a model problem second.** Cheaper deterministic checks, smaller PRs, fewer broader agents, and fixed human review windows (§5.5).
10. **Forecast "what ships by when" from merged-item throughput with a Monte Carlo percentile**, re-run each cycle, then evaluate forecast versus actual at the end of every cycle (§5.6, §5.7). Worked example on the owner's real data: 40 items takes about 7 days on the average rate, but 9 days at P85 and 11 at P95.

**Decisions this needs from the owner:** (a) accept or reject dropping Google Tasks; (b) which unit counts as "an item" (PR, H-id handoff item, or verified unit); (c) approve a standing rule for Grok Bot to send the morning digest to himself; (d) create the separate calendars by hand (the connector cannot create calendars, §4.2).

---

## 2. Workstream 1: first principles

### 2.1 Musk / SpaceX / Tesla: documented practice versus myth

| Claim | Status | Evidence |
|---|---|---|
| Musk states a five-step "Algorithm": make requirements less dumb and attach each to a named owner; delete the part or process; simplify and optimise; accelerate cycle time; automate last. The order matters. | **Documented [V]** (his own description) | Elon Musk book compilation, "The Algorithm": https://www.elonmuskbook.org/the-book-of-elon-musk-free-online-version/the-algorithm ; the Starbase tour interview: https://everydayastronaut.com/starbase-tour-and-interview-with-elon-musk/ |
| Delete aggressively, with an add-back check: if you never have to put things back, you did not delete enough. | **Documented [V]** | Same two sources. The mechanism is the useful part: deletion is tested by how often it is reversed. |
| First-principles reasoning: break a problem to physical or cost fundamentals, rebuild from there (battery cost example: raw-material cost versus pack price). | **Documented [V]** (his own telling) | Transcript: https://www.startuparchive.org/p/elon-musk-explains-first-principles-thinking-and-uses-it-to-predict-80-decline-in-battery-prices . This is a way of finding what is possible, not a scheduling method. |
| Set aggressive timelines because work expands to fill time. | **Documented as his stated belief [V]** | https://www.elonmuskbook.org/the-book-of-elon-musk-free-online-version/set-aggressive-timelines |
| Aggressive timelines are good forecasts. | **Contradicted [S]** | The NYT analysis of 602 stated goals (read via the Seattle Times republication: https://www.seattletimes.com/business/elon-musk-laid-out-602-goals-we-counted-how-many-he-hit/ ) found most dates were missed. The NYT interactive itself was paywalled, and I did not use percentages that appeared only in search snippets. |
| The Algorithm is a general planning method for any project. | **Myth / over-reach [J]** | By his own account it is a manufacturing and engineering process-improvement heuristic (question, delete, simplify, accelerate, automate). It says nothing about how to forecast dates. |
| "Elon time" works because everyone believes the date. | **[U]** | No primary evidence found either way; ignore. |

**Takeaway [J]:** keep the Algorithm as an *intake and pruning* discipline and keep aggressive dates as a *motivational* artefact. Never feed an aggressive date to the calendar as a commitment.

### 2.2 Other methods compared

| Method | What it contributes | Where it fails for a solo, agent-heavy builder | Source |
|---|---|---|---|
| **OKRs** (Google re:Work) | Objective plus measurable key results. Stretch goals are graded about 0.6–0.7 on a good result, so a 1.0 means the goal was too easy. Not a to-do list. | Does not say how to forecast, or what to do daily. | https://rework.withgoogle.com/intl/en/guides/set-goals-with-okrs [V] |
| **Amazon working backwards (PR/FAQ)** | Start from the customer-facing outcome and write it as a press release plus FAQ before building. A strong "why" anchor. | Heavy for small units; use it for projects, not tasks. | https://workingbackwards.com/concepts/working-backwards-pr-faq-process/ [V] |
| **Shape Up** (Basecamp) | **Appetite** (a time budget, not an estimate), fixed time with variable scope, six-week cycles plus a two-week cool-down, a betting table, and a **circuit breaker** (work not done in the cycle is not automatically extended). | Written for teams. Cool-down needs adapting for a solo person. | https://basecamp.com/shapeup/1.2-chapter-03 ; https://basecamp.com/shapeup/2.2-chapter-08 [V] |
| **Critical path method** | Activities, dependencies, durations. Float (slack) is the delay available without moving the end date; zero float means critical. History: DuPont/Remington Rand, demonstrated 1957, first paper 1959. | Needs reliable durations, which agent work does not have. Useful only for the dependency graph and for naming which items have zero float. | https://www.pmi.org/learning/library/origins-cpm-personal-history-3762 ; https://doi.org/10.1145/1460299.1460318 [S] (search-snippet level; PMI page not fully read) |
| **Time blocking** | A time slot is assigned to each task; the day is redrawn when it breaks. Newport reports roughly doubled output but this is self-reported. | No controlled trial found; the closest is a 2018 diary study linking daily planning to higher self-rated performance. Treat as low-evidence but cheap. | https://calnewport.com/deep-habits-the-importance-of-planning-every-minute-of-your-work-day/ [S] |
| **Planning fallacy / outside view** | People underestimate their own task times even when they know similar tasks overran. Fix: use a reference class of past outcomes, not the plan's inside story. Buehler, Griffin and Ross (1994) showed that prompting recall of past similar tasks reduces optimism. | None; this is the strongest argument for forecasting from history. | https://doi.org/10.1037//0022-3514.67.3.366 [S] |
| **Throughput forecasting (Monte Carlo)** | Sample historical throughput to produce percentile completion dates ("85% likely by..."). Averages mislead (the Flaw of Averages). Little's Law is a measurement relationship, not a forecasting tool, and needs stable flow. | Needs history (my rule of thumb is 20 or more samples [J]) and a stable definition of "an item". | https://prokanban.org/pdfs/flow-forecasting-pocket-guide.pdf ; https://www.55degrees.se/blog/post/how-not-to-use-littles-law [V for content read] |

### 2.3 Principles that survive (with evidence)

| # | Principle | Evidence | Consequence for the tool |
|---|---|---|---|
| P1 | **Every goal links up to a "why" and down to items.** | Working backwards (outcome first); OKR objective versus key result; Linear's own definition of initiatives as "why the work matters" (https://linear.app/docs/conceptual-model [V]). | The one-minute view must show the chain item → goal → what it builds toward. |
| P2 | **Separate the motivating date from the forecast date.** | Musk's stated aggressive-timeline belief versus the 602-goal track record; OKR 0.6–0.7 grading; planning-fallacy research. | Two dates per goal (§7). |
| P3 | **Time is the constraint; scope is the variable.** | Shape Up appetite plus circuit breaker [V]. | Each unit has an appetite and a "what happens at the cap" rule. |
| P4 | **Forecast from history, with percentiles, and re-forecast continuously.** | Pocket Guide [V]; planning fallacy. | Throughput log feeds a Monte Carlo (§5.6). |
| P5 | **Delete before you plan.** | The Algorithm's step 2 with its add-back test [V]. | Intake step: a goal must survive a "can this be deleted" question; track add-backs. |
| P6 | **A named owner and a checkable definition of done per item.** | The Algorithm's step 1; pstack orchestrate briefs require "ACCEPTANCE: checkable criteria, one per line" [V] (https://github.com/cursor/plugins/tree/main/pstack). | Item template carries owner, acceptance and verify command. |
| P7 | **Quality gates set the real speed limit.** | DORA 2025: AI adoption now correlates positively with delivery throughput but still with *more instability*; gains depend on testing, version control and fast feedback [V] (https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report). | Track a stability metric (revert/rework rate) beside throughput. |
| P8 | **Do not trust perceived speed.** | METR 2025 RCT: experienced developers expected a 24% speedup, measured 19% slower, and believed they were 20% faster afterwards [S via METR page; RCT abstract at https://arxiv.org/abs/2507.09089]. METR's Feb 2026 update says the follow-up measurement is unreliable because of selection effects and that developers are probably more sped up now, but gives only weak evidence (https://metr.org/blog/2026-02-24-uplift-update/ [V]). | Evaluation uses logged outcomes (merged, surviving, cycle time), not a felt sense of speed. |

---

## 3. Workstream 2: design requirements

### 3.1 The one-minute view

The owner wakes up unsure what is done, active and next, and what it builds toward. The view is four short lists, generated, readable in about a minute:

| Question | Definition [J] | Source of truth |
|---|---|---|
| **Done (since last look)** | Items merged or verified since the previous digest, one line each, with their goal | GitHub merges plus vault item status |
| **Active** | Items in progress, with *age* (days since start) and any item older than its cycle time distribution's P85 flagged | Vault item notes plus open PRs |
| **Next** | The next 3 items in order, with the must-be-true-by date of the goal each serves and whether it has zero float | Vault goal notes plus Calendar |
| **Builds toward** | The goal, the project, and the one-line "why" chain up to the top-level aim | Vault goal notes |

Design rule: the view is **derived**, never hand-edited. If it needs hand editing, the underlying data is wrong.

### 3.2 Failure modes and what prevents them

| Failure mode | Mechanism | Design response |
|---|---|---|
| **Lost "why"** | Items outlive the context that created them; a 476 KB handoff makes the "why" a reading task. | Every item stores a goal id and a one-line why; the digest prints the chain. |
| **Silent slippage** | Dates are written once and never compared with reality; planning fallacy. | Item age and forecast percentile shown daily; circuit breaker at the appetite; weekly forecast-versus-actual log. |
| **Over-planning** | Maintaining the plan costs more than the work; a heavy tool (Linear, Notion) for one person. | One writer per fact; derived views; no more than three planning surfaces; a time cap on the planning ritual itself. |
| **Planning the wrong unit** | PR counts vary with how work is split. | Choose the item unit explicitly (§5.4) and forecast on that unit. |
| **Human review as hidden queue** | PRs wait for a person; the wait is invisible in estimates. | Fixed review blocks on the calendar and a cycle-time tail measurement (§5.4). |

### 3.3 [moved to the private evidence note: a project-specific case]

## 4. Workstream 3: tool evaluation

### 4.1 Constraints discovered (these decide more than features do)

| Fact | Status | Source |
|---|---|---|
| Google Tasks API `due` is date-only; the time is discarded and cannot be read or written; there are no custom fields; notes are capped at 8192 characters. | **[V]** | https://developers.google.com/workspace/tasks/reference/rest/v1/tasks |
| Google Calendar API supports hidden `extendedProperties` (private and shared, searchable by exact `name=value`; key at most 44 characters, value at most 1024; up to 300 properties and 32 kB per event). | **[V]** | https://developers.google.com/workspace/calendar/api/guides/extended-properties |
| **The Calendar connector available to Grok Bot today does not expose `extendedProperties`.** `create_event` accepts summary, times, description (HTML), `eventType` (including `FOCUS_TIME`), availability, reminders, recurrence, `calendarId`, colour, attachments. `search_events` is semantic and searches the primary calendar only. There is no create-calendar tool. | **[V]** (tool schemas read this session) | `user-Google-calendar` tool schemas |
| **No connector for Google Tasks, Notion, Linear or Todoist is installed** for Grok Bot at present. Connected: Gmail, Google Calendar, a finance connector, GitHub (two namespaces), X. | **[V]** | tool catalog this session |
| Notion API: 180 requests a minute per connection on non-Business plans (600 on Business and Enterprise); a date property takes a start, optional end and optional time zone, so a range is one property. | **[V]** | https://developers.notion.com/reference/request-limits ; https://developers.notion.com/reference/page-property-values [S for the date shape] |
| Linear: Initiative → Project → Issue, with project milestones, cycles, GraphQL API and webhooks; projects have `startDate` and `targetDate`; milestones have `targetDate`. | **[V]** concepts page; **[S]** field names (search synthesis) | https://linear.app/docs/conceptual-model ; https://linear.app/developers/webhooks |
| Todoist has both a *date* (when to work) and a *deadline* (hard cutoff) and an API with `deadline_date`, but deadlines are Pro and Business only. | **[S]** | https://www.todoist.com/help/todoist/features/introduction-to-deadlines-in-todoist-uMqbSLM6U ; https://developer.todoist.com/api/v1 |
| GitHub Projects supports custom date and iteration fields, a roadmap layout and a GraphQL API. The GitHub tools available to Grok Bot expose issues and PRs, but I did not see Projects-v2 mutation tools. | **[S]** docs by search; **[V]** tool list | https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields |

### 4.2 What this means for the connector

Goal metadata (goal id, stretch date, must-be-true-by, appetite, why) cannot go into `extendedProperties` through the current connector. It has to go in the **event description** as a short, fixed, parseable block (§7), with the full detail in the vault note. If a direct Calendar API route is ever added, `extendedProperties.private` is the better home, and the migration is mechanical.

### 4.3 Criteria and weights [J]

Linking up (goal → item): 20 · Flexible dates (stretch versus must-be-true-by, appetite): 15 · Agent read/write with what is connected today: 20 · Scheduled digests and the one-minute view: 10 · Maintenance effort for one person: 15 · Fit with the vault and SAD, with auditable history: 10 · Source of throughput data: 10.

### 4.4 Scored comparison (1 to 5 per criterion; total out of 100) [J]

| Option | Link | Dates | Agent access | Digest | Maint. | SAD fit | Throughput data | **Total** |
|---|---|---|---|---|---|---|---|---|
| A. Google Calendar + Tasks (baseline) | 2 | 2 | 3 | 4 | 4 | 1 | 1 | **50** |
| B. Calendar + vault notes | 4 | 4 | 4 | 4 | 3 | 5 | 2 | **75** |
| C. Notion | 4 | 4 | 1 | 3 | 2 | 2 | 3 | **54** |
| D. Linear (+ Calendar) | 5 | 3 | 1 | 3 | 2 | 2 | 4 | **57** |
| E. Todoist (+ Calendar) | 2 | 4 | 1 | 3 | 4 | 1 | 2 | **48** |
| F. GitHub Projects (+ Calendar) | 3 | 4 | 3 | 3 | 3 | 3 | 5 | **67** |
| **G. Calendar + vault + GitHub data + Grok Bot digest** | 5 | 5 | 4 | 5 | 3 | 5 | 5 | **90** |

Score method: weighted sum divided by 5. These are judgment scores, not measurements.

**Why the baseline loses.** Tasks fails on two criteria that matter most (one date, no goal link); Calendar alone is good for time and bad for structure.

**Sensitivity check.** The "agent access" score is low for Notion, Linear and Todoist only because no connector is installed. If a connector existed (score 4 instead of 1) each would gain 12 points: Notion 66, Linear 69, Todoist 60, still below G at 90. The ranking does not hinge on connector availability. What would change the answer: working with other people (Linear moves up sharply for teams), or needing mobile-first capture (Todoist moves up).

### 4.5 Recommended stack

| Layer | Tool | Role | Notes |
|---|---|---|---|
| Time spine | **Google Calendar** | Commitment dates (all-day, free/busy = free), focus blocks (`FOCUS_TIME`), fixed review blocks, reminders | Separate calendars per role (§7) so each can be toggled |
| Structure and why | **Markdown vault notes** | One note per goal and per project: why chain, items, stretch and must-be-true-by, appetite, evaluation log | Already frontmatter and wikilink based; matches SAD's SESSION_LOG habit |
| Throughput data | **GitHub PR and issue history** | Merged-item timestamps for Monte Carlo and cycle-time tails | Read-only, already connected; I used it in §5.4 |
| Automation | **Grok Bot** | Morning one-minute view, Friday forecast-versus-actual review, drift checks | Send-to-self needs a standing approval from the owner |
| Optional | Google Tasks | Phone quick-capture inbox only, triaged into vault items weekly | Never a source of truth |
| Not now | Notion, Linear, Todoist | Revisit under the conditions in §4.4 | |

---

## 5. Workstream 4: throughput and speed

### 5.1 Tracing the "2,500 PRs a month" claim

| Date | Who / where | What was said | Status |
|---|---|---|---|
| 2026-09-21 10:01 CDT (15:01Z) | Lauren Tan (@poteto), X post 2102050467505430555, 3.9M impressions at time of read | "here's how i shipped 2,500 PRs last month to production". Says the talk was meant for Cursor Compile London; a 2,282-second (about 38-minute) video is attached. | **[V]** primary (X API) |
| 2026-10-08 | @poteto, post 2108290818746528017 | "volume does matter ... if you were an engineer before agents came along, you're rightfully skeptical about lines of code and number of PRs being used as a metric for any kind of productivity. and i agree! or at least, i used to." Quoting a reply that asked why anyone needs to ship 100s of PRs a day. Text is cut off in the API result. | **[V]** |
| 2026-10-16 | @poteto, post 2111133080526495985 | A post on how to trust agents' work more, starting with codebase improvements (types, invariants, boundaries). | **[V]** (the first item only; the rest is in a linked article) |
| Aug 2026 (approx.) | Part 1 of her pstack guide (nitter mirror) | "2,000 PRs a month" | **[S]** |
| Late Sep to early Oct | Conference listing and interview transcripts | A Compile London listing with "2,000" in the title; an Oct 2 interview where the figure was given as about "2,000 and 2,500 ... or however many" | **[S]** (transcript mirrors; I did not watch the video) |
| After Part 2 | The Neuron explainer | Attributes "2,462 for August" to her Part 2 | **[U]** I could not find "2,462" in the Part 2 text on any mirror |

**What "last month" means.** The post is dated Sep 21, so "last month" is ambiguous: August (which The Neuron says) or the trailing 30 days. **[U]**

**Arithmetic [J].** 2,500 PRs over 31 days is about 80.6 a calendar day; 2,462 over the 21 weekdays of August 2026 is about 117 a weekday; 2,000 over 21 weekdays is about 95 a weekday.

**What is verified and what is not**

| Question | Answer |
|---|---|
| Did she make the claim publicly? | **Yes [V]** |
| Is the number independently audited? | **No evidence found [U]** |
| What counts as a PR (size, docs, automated, revert)? | **Not stated anywhere I found [U]** |
| Team or individual? | Her phrasing is first-person ("i shipped"), but the PRs are produced by agents she orchestrates, and I found no statement about other people's PRs being excluded. **[U]** |
| Token spend or cost? | **Not stated anywhere I found [U]** |
| Revert rate or defect rate? | **Not stated [U]** |
| Mix of work? | She says it is not 2,500 features and that much is gardening and refactoring **[S]**. Her README says the goal "is not to maximize loc, in fact it's the opposite" **[V]** (https://raw.githubusercontent.com/cursor/plugins/main/pstack/README.md). |
| Is anyone else reproducing it? | **No independent reproduction found [U].** |

**Plain statement.** The 2,500 figure is a self-reported, unaudited count of merged-to-production PRs from one very heavy agent-orchestration setup at the company that makes the tool. It is a credible order of magnitude for "what a verification-heavy agent workflow can emit", not a benchmark you can match or beat until the PR definition and cost are known.

### 5.2 What pstack actually is (primary source: the README and playbooks in `cursor/plugins`)

- MIT-licensed skill set; `/poteto-mode` routes a request to one of 23 playbooks. [V]
- Stated aim: fearless parallelism through depth first. "if you want to go fast, go deep first." [V]
- The orchestrate playbook defines roles (coordinator, sub-coordinator, worker/verifier), a brief with `ACCEPTANCE`, `VERIFY` and **`TIMEBOX`** fields, a verification ledger, a status file derived from tables, and "the human checking in twice a day instead of every five minutes". It says ceremony must scale with the program, prefers "fewer, broader workers", and caps in-flight children at what one drain can process, roughly ten. [V] (https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/poteto-mode/playbooks/orchestrate.md)
- `autopilot-stack` hands the operator one linear stack of PRs to review and land; `autopilot-full` also lands. The choice depends on whether landing authority is granted and on coupling. [V]
- `/setup-pstack` offers four reasoning budgets (unlimited, large, medium, small), mapping to `max`, `xhigh`, `high`, `medium` reasoning effort; `large` matches the defaults. [V]

### 5.3 Why raw PR counts mislead

PR count depends on how work is split. The same change can be one PR or ten. DORA's 2025 finding that AI raises throughput and instability together means a count without a stability metric rewards splitting and churn. [V for DORA; J for the inference.]

### 5.4 [moved to the private evidence note: The owner's own baseline]

### 5.5 What matching or beating her throughput on a smaller token budget requires

Reasoned from the sources above; each line is **[J]** unless a source is cited.

1. **Environment before model.** Her central claim is that verification and codebase quality are what allow parallel agents; DORA agrees that tests, version control and fast feedback are the preconditions. A smaller budget is best spent on deterministic checks (lint, types, tests, CI), which cost no tokens, before any verifier agents. [V for both sources]
2. **Pick the lowest budget setting that still passes verification.** `/setup-pstack` budgets (large down to small) are the single most direct knob. Evaluate by outcome (merge-and-survive rate), not by feel. [V for the knob]
3. **Smaller, independent PRs.** Small batches are a DORA recommendation. They also reduce review time and conflict cost. [V for DORA]
4. **Fewer, broader agents.** The orchestrate playbook itself prefers this, and caps concurrency near ten. [V]
5. **Stack when work is coupled; autopilot-full only when independent.** [V]
6. **Review capacity is the bottleneck for one person.** The tail in §5.4 (P85 9.3 h) is human or verification waiting, not generation. Fixed review blocks and batch review beat "review whenever". [J from V data]
7. **CI time and flakiness cap throughput.** Her own playbooks include babysitting CI and landing "even if ci flakes". **I found no measured CI-time data for either her setup or the owner's**, so this is a hypothesis to measure. [U]
8. **One-way doors need a human.** Production data migrations and merges to the shared Neon database are examples seen in the PR titles. These do not parallelise and must appear as calendar commitments. [J]

### 5.6 Forecasting "what ships by when"

**Unit.** Count the *item*, not the PR: the smallest thing that is verified and merged, ideally the H-id handoff item. If items vary widely in size, split them into rough small/medium/large classes and forecast per class. Start with PRs only because that is the data that exists.

**Method (Monte Carlo from history).**
1. Collect daily counts of merged items for the last N working days (N of 20 or more is my rule of thumb [J]; the current data has 11 clean days, so treat output as indicative).
2. For a backlog of B items, simulate: repeatedly draw a random historical day's count until the total reaches B; record the number of days. Repeat many times.
3. Report P50, P85 and P95. The **must-be-true-by date is the P85** (the commit percentile is per-project, §6.2). The **stretch date is whatever the owner chooses to aim for**, and is recorded separately.
4. Re-run weekly, and whenever the backlog or the system changes.

**Worked example on the owner's real data (illustrative only, n = 11 days, bursty).** Using the daily merges Oct 5 to Oct 15: [1,13,1,6,9,4,6,1,8,8,7], 20,000 trials per backlog size:

| Backlog | Naive days (backlog ÷ mean 5.8) | P50 | P85 | P95 |
|---|---|---|---|---|
| 10 items | 1.7 | 2 | 3 | 4 |
| 20 items | 3.4 | 4 | 5 | 6 |
| 40 items | 6.9 | 7 | 9 | 11 |

The naive average understates the P85 by a few days at 40 items, which is the Flaw-of-Averages point. This example assumes similar work, similar rate, and ignores the human review tail; do not use it as a commitment.

**Preconditions.** A stable definition of "item"; a stable process (if the process changes, restart the sample); reporting dates as percentiles, never as one number. [Pocket Guide, V]

### 5.7 Evaluation loop

At the end of each cycle, and always on Fridays:

| Check | Question | Signal |
|---|---|---|
| Forecast accuracy | Did the items land by the P85 date? | Hit rate over time should approach 85%. Persistent misses mean the data window or item unit is wrong. |
| Throughput | Items merged and surviving per week | Trend, not a target |
| Stability | Reverts or rework within 7 days of merge | If it rises with throughput, slow down (DORA signal) |
| Cycle-time tail | P85 open-to-merge | A rising tail points to review or CI as the constraint |
| Token cost per surviving item | Total tokens ÷ items that merged and stayed | **Not currently measured; add it** |
| Delete/add-back | How many deleted scope items came back | Algorithm step 2 check |
| Stretch grading | OKR-style 0 to 1 score of stretch goals | About 0.6 to 0.7 is healthy |

---

## 6. Workstream 5: fit into MAD/SAD

### 6.1 Where it sits

SAD has seven specification layers read in a fixed order, starting with Layer 0, `SESSION_LOG.md`, then `CLAUDE.md`, then the product, data, implementation, behavioral and verification specs. It has a mandatory Session Opening Protocol, a mandatory session-log entry at the end, a staleness rule, and reconciliation sprints after Class 1 or 2 spec changes. [V] (`another project/product/SAD_SKILL.md`)

**Recommendation [J]: a cadence plus a per-project profile, not a new spec layer.**

- **Cadence.** Insert a "Step 0" before Session Opening Protocol step 1: read the one-minute view (§3.1). Add a calendar-derived field to the end-of-session log entry: items done, forecast delta.
- **Per-project profile.** One frontmatter block per project (§6.2). SAD already treats conventions as Class 4 changes, so profile changes are low-ceremony.
- **Why not a layer.** A layer implies a spec that must be kept consistent downstream. Dates and forecasts are volatile state, not specification, and belong in the session log and calendar, not the spec stack.
- **Where the Justice-style handoff fits.** The handoff stays the work record. The calendar layer reads its item ids and goal links, and replaces only its `progress:` line, which becomes generated.

### 6.2 Per-project profile (proposed)

```yaml
plan-profile:
  horizon-days: 28          # how far ahead dates are committed
  cycle-days: 7             # forecast and review rhythm
  review-rhythm: [Mon, Thu] # fixed human review windows
  slack-pct: 20             # reserved capacity for unplanned work
  item-unit: "H-id item"    # what throughput counts
  commit-percentile: 85     # must-be-true-by = this percentile
  forecast-window-days: 20  # history used by the simulation
  stretch-policy: "graded 0.6-0.7, never a commitment"
  circuit-breaker: "unfinished at appetite is re-shaped, not extended"
```

| Project type | Horizon | Cycle | Review | Slack | Commit pct |
|---|---|---|---|---|---|
| Data / ingestion sprint (e.g. Justice) | 2 to 4 weeks | 1 week | twice weekly | 20% | 85 |
| Methodology / publication (e.g. sad-methodology) | 6 weeks | 2 weeks | weekly | 30% | 70 |
| Exploratory research | 1 to 2 weeks | 1 week | at end | 40% | 50 |

These are starting guesses [J], to be calibrated by the evaluation loop, not research results.

### 6.3 Draft methodology section (for a MAD/SAD document)

> **Planning layer (draft).**
> 1. **Goals and why.** Each project has goals. Each goal states what it builds toward in one line, and its items link to it by id.
> 2. **Two dates per goal.** A *stretch date* the owner aims at, and a *must-be-true-by date* equal to the project's commit percentile from a throughput forecast. Only the second is a commitment.
> 3. **Appetite.** Each unit has a time budget. At the budget, the unit is finished, re-shaped, or dropped. It is not silently extended.
> 4. **Intake.** Before an item is planned, ask whether it can be deleted. Record add-backs.
> 5. **Daily view.** The session opens by reading the one-minute view: done, active, next, builds toward. The view is generated.
> 6. **Session log.** Each session log records items done and forecast change.
> 7. **Evaluation.** At the end of each cycle, compare forecast against actual, review stability, and record cost per surviving item.
> 8. **Per-project profile.** Horizon, cycle, review rhythm, slack, item unit and commit percentile are set per project in frontmatter.
>
> **Update rule.** The profile and this section change only (a) at the end of a cycle, (b) when the evaluation shows the same miss in two consecutive cycles, or (c) when the item unit or process changes, in which case the forecast sample restarts. Every change is a dated one-line entry in the session log, classified as SAD Class 4 (convention) unless it changes project scope (Class 1).

---

## 7. Concrete calendar spec (under the current connector)

**Calendars (create by hand; the connector cannot):** `Commitments` (all-day, free), `Stretch` (all-day, free, toggle off by default), `Focus` (focus-time blocks), `Reviews` (fixed windows).

**Event title:** `[<project>] <goal id> <short goal>`. **Description block** (fixed lines so Grok Bot can parse it):

```
goal: <goal-id>
item-unit: <unit>
stretch: <YYYY-MM-DD>
must-by: <YYYY-MM-DD> (P85, forecast <YYYY-MM-DD>)
appetite: <days>
why: <one line>
note: [[<vault note>]]
```

**Digest schedule [J]:** morning one-minute view; Monday forecast re-run and priorities; Friday evaluation review. All generated by Grok Bot from GitHub, vault and Calendar.

---

## 8. Not verified, not found, and caveats

- Parallel deep research was not used; coverage is whatever web search and fetch could reach.
- **2,462 August figure:** not found in her Part 2 text; attributed only by The Neuron. **[U]**
- **PR definition, team versus individual, token spend, revert rate for the 2,500 claim:** not found. **[U]**
- **The 38-minute Compile video:** not watched.
- The GitHub repository page for pstack returned only a title; primary pstack facts come from raw files in `cursor/plugins`. The `backnotprop/pstack` repo and mirrors were used only as secondary.
- NYT 602-goal interactive was paywalled; I used the Seattle Times republication and did not use snippet-only percentages.
- CPM and time-blocking sources were read at snippet level, not fully fetched.
- **Linear, Todoist, GitHub Projects field names and plan limits** are from docs search synthesis, not full page reads. Linear free-plan limits and Todoist rate limits were not verified.
- **MAD's definition** was not found in the vault.
- **GitHub sample:** one repo; open PRs not listed; a count of 40 or 100 per page was combined across two pages (136 closed); cause of 26 closed-unmerged PRs unknown.
- **Handoff:** read by headings and frontmatter only.
- **Scores in §4.4 and values in §6.2** are judgment. The Monte Carlo example uses 11 days and should not be used for decisions.
- The wikilink `[[RESEARCH_METHOD]]` in the frontmatter was copied from neighbouring notes; I did not locate the target file.

---

## 9. Sources

**pstack claim and system**
- X post, 2026-09-21: https://x.com/poteto/status/2102050467505430555 [V]
- X post, 2026-10-08: https://x.com/poteto/status/2108290818746528017 [V]
- X post, 2026-10-16: https://x.com/poteto/status/2111133080526495985 [V]
- pstack README (raw): https://raw.githubusercontent.com/cursor/plugins/main/pstack/README.md [V]
- pstack orchestrate, autopilot-stack, setup-pstack (raw files under the same path) [V]
- Guide Part 1: https://nitter.cf/poteto/article/2094457600259842065 ; Part 2: https://nitter.cf/poteto/article/2097732320606507506 [S]
- Interview transcripts: https://prepublish.ai/youtube-transcript/NjoZoUm85x0 ; https://prepublish.ai/youtube-transcript/MN9dGgmLyso [S]
- Explainers and commentary: https://www.theneuron.ai/explainer-articles/pstack-explained-lauren-tans-system-for-trustworthy-ai-agents/ ; https://thenewstack.io/agentic-verification-distributed-systems/ ; https://barnabyrobson.org/on-pstack/ ; https://folkfox.com/pstack-2500-ai-agent-prs-verification/ ; https://developer.tenten.co/pstack-verification-agent-merge ; https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/15df58 ; https://aibriefing.dev/library-assets/talks/x-2106354585455513600.pdf [S]

**Musk and first principles**
- https://www.elonmuskbook.org/the-book-of-elon-musk-free-online-version/the-algorithm ; https://www.elonmuskbook.org/the-book-of-elon-musk-free-online-version/set-aggressive-timelines ; https://everydayastronaut.com/starbase-tour-and-interview-with-elon-musk/ ; https://www.startuparchive.org/p/elon-musk-explains-first-principles-thinking-and-uses-it-to-predict-80-decline-in-battery-prices ; https://www.seattletimes.com/business/elon-musk-laid-out-602-goals-we-counted-how-many-he-hit/

**Methods and forecasting**
- https://rework.withgoogle.com/intl/en/guides/set-goals-with-okrs ; https://workingbackwards.com/concepts/working-backwards-pr-faq-process/ ; https://basecamp.com/shapeup/1.2-chapter-03 ; https://basecamp.com/shapeup/2.2-chapter-08
- https://prokanban.org/pdfs/flow-forecasting-pocket-guide.pdf ; https://www.55degrees.se/blog/post/how-not-to-use-littles-law
- https://www.pmi.org/learning/library/origins-cpm-personal-history-3762 ; https://doi.org/10.1145/1460299.1460318 ; https://calnewport.com/deep-habits-the-importance-of-planning-every-minute-of-your-work-day/ ; https://doi.org/10.1037//0022-3514.67.3.366

**Evidence on AI and delivery**
- https://metr.org/blog/2026-02-24-uplift-update/ [V] ; https://arxiv.org/abs/2507.09089 [S]
- https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report [V]

**Tools**
- https://developers.google.com/workspace/tasks/reference/rest/v1/tasks [V] ; https://developers.google.com/workspace/calendar/api/guides/extended-properties [V]
- https://developers.notion.com/reference/request-limits [V] ; https://developers.notion.com/reference/page-property-values [S]
- https://linear.app/docs/conceptual-model [V] ; https://linear.app/developers/webhooks [S]
- https://developer.todoist.com/api/v1 ; https://www.todoist.com/help/todoist/features/introduction-to-deadlines-in-todoist-uMqbSLM6U [S]
- https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields [S]

**Local evidence (read-only)**
- `product/planning/JUSTICE_DOMAIN_HANDOFF_2026-10-12.md` (headings and frontmatter)
- `another project/product/SAD_SKILL.md`; `sad-methodology/entity-profile.md`
- GitHub `<owner>/<repo>` closed PR list, read via the GitHub API on 2026-10-16

---
---

# PART 2 (added 2026-10-16 evening CT): weight, newsworthiness, milestones

> **Scope of this part.** Follow-up requested by the owner after reading Part 1. Same labels as above: **[V]** verified against a fetched primary page or API result, **[S]** secondary, **[U]** unverified or not found, **[J]** judgment or derived arithmetic. Method again: web fetch and feed parsing, the GitHub API (read-only), the X API. No Parallel deep-research tool.
>
> **Decisions the owner has made since Part 1 (relayed by the parent agent) [J, as relayed]:**
> 1. **Keep Google Tasks.** This overrides Part 1 §4.5's "drop Tasks". Tasks stays as a phone and quick-capture inbox only, because its `due` is date-only (§4.1), so nothing that needs a time, a second date, or goal metadata lives there.
> 2. **The item unit is the merged PR, tracked automatically from GitHub.** Each calendar goal is written as a **handoff item that lists the PRs it needs**. A **verified unit** is the strictest unit.
> 3. **A standing morning digest to himself** is approved.
>
> **New requirements answered here:** (A) a weight for every handoff, PR, verified unit and merged PR, tested on real PRs; (B) a newsworthiness test and a magnitude scale grounded in what companies actually announce, applied retroactively; (C) how milestones appear on the calendar, how announcement feedback returns to planning, and how it is evaluated.

---

## 10. Weight: measuring more than a count

### 10.1 Design requirements for a weight [J]

1. **Cheap:** computed from fields GitHub already returns for a PR (file list with per-file additions and deletions, paths, title, body, timestamps). No human estimate at merge time, no extra tooling.
2. **Hard to game by splitting or padding:** a PR full of generated or data lines must not look huge, and ten tiny PRs must not look like ten units of work.
3. **Separates what a PR *is* from how long it *waited*.** Waiting is a calendar and queue effect (Part 1 §5.4), so it is recorded as drag, not baked into weight.
4. **Same scale from planning to done:** a handoff item can be weighed before its PRs exist (from typical weights) and after (from the real ones), so forecasts and calibration use one unit.
5. **Integer points** so the Monte Carlo from Part 1 §5.6 can run on points per day instead of PRs per day.

### 10.2 The scheme (v0)

**Per PR, `W_pr = S + F + R + U + C`**, all integers, all derived from the PR's file list and text.

| Term | Meaning | How computed |
|---|---|---|
| **S** size | effort-equivalent lines | Classify each changed file: *code* (1.0 per changed line), *schema/migration* (1.0), *tests* (0.5), *docs and config* (0.25), *data, fixtures, snapshots, lockfiles, generated* (0.02). Sum to code-equivalent lines **CL**. Points: CL < 20 → 1; < 100 → 2; < 400 → 3; < 1,500 → 5; otherwise 8. |
| **F** spread | breadth beyond data files | Count non-data files: < 10 → 0; 10–24 → 1; 25 or more → 2 |
| **R** risk | which hard-to-reverse surfaces it touches | +2 schema or migration file; +2 deploy or infra path (workflows, wrangler, Dockerfile, deploy scripts); +1 auth, secrets or token paths; +1 data-write path (apply, backfill, reconcile, ingest, cleanup scripts) or text saying the change was applied to Neon main or the production database |
| **U** reach | user-facing surface | +2 if it touches the citizen web app routes or components |
| **C** SAD change class | how far the change propagates | +3 Class 1 (an ADR file, i.e. scope); +2 Class 2 (structural: migration or entity change); +1 Class 3 (behavioral: spec or amendment file); +0 Class 4 or none |

**Size bands for display:** XS 1–2, S 3–4, M 5–7, L 8–11, XL 12 or more. (See §10.5: these bands skew high on this sample and should be re-fit to quantiles.)

**The four things the owner asked to weigh:**

| Thing | Weight | Definition |
|---|---|---|
| **PR** | `W_pr` | As above, computed at merge (or earlier, on the draft PR, for forecasting) |
| **Merged PR** | `W_merged` | `W_pr` if merged and not reverted within 7 days, else 0. Revert detection is cheap: a later PR or commit titled "Revert ..." naming it. Counts on the merge date. |
| **Handoff item** | planned `W_h_plan`; actual `W_h` | Plan: sum, over the PR slots the item lists, of the **median `W_pr` for that slot type** from trailing history (feat, fix, docs, other; bootstrap values in §10.4). Actual: sum of `W_merged` of the PRs bound to it. The ratio actual ÷ plan is the calibration signal. |
| **Verified unit** | `W_v` | `W_h` **only when** the item is closed with recorded verification evidence (a live check, test run or query result, with a link) and every listed PR is merged. Otherwise 0. This is the strictest unit. The owner's own pattern already shows the evidence shape: PR #137 marks <item> done "after #135 merged and deploy migrate applied `0125_waitlist_signups` on Neon main", with a live `POST` check returning 400 on a bad email **[V]**. |

**Drag, recorded but not added to weight:** `D = hours from PR open to merge` (across all 110 merged PRs, P85 9.3 h and P95 24.5 h, §5.4), and, for items, calendar days from first PR to verified.

### 10.3 [moved to the private evidence note: test on real merged work]

### 10.4 Where it works badly (honest list)

1. **Weight is not wait.** W correlates only weakly with open→merge time (0.26), and raw lines even less (0.18). Waiting is driven by queues and the calendar: #121 (W 7) waited 25 h, #98 (W 4) 25 h, #110 (W 3) 17.6 h, #109 (W 17) 17.6 h. Do not use W to predict review delay; use the drag measure (P85) and fixed review windows (Part 1 §5.5).
2. **Data-heavy and truncated PRs.** #118 changed 255,452 lines in 203 files, but the data discount (0.02) and the 100-file cap in the API page give it W 11 (L), below several smaller schema PRs, though it was the biggest delivery of the sprint. #129 moved 3,918 files (renames count as additions and deletions) and scores 14. Handling: page through all files, treat pure renames separately, and report generated data as its own "data rows" column rather than inside S.
3. **The risk flags saturate.** The data-write flag fires on 24 of 35 PRs (the civic-data scripts mostly write data), so it no longer discriminates. The deploy and infra pattern is a filename guess. Treat R as a placeholder until flags are tied to real hard-to-reverse events (migration applied to Neon main, workflow change, secret rotation).
4. **Bands skew high.** 10 of 35 PRs are XL (29%). Fixed cut-offs are my choice. Fit bands to quantiles of the trailing 60 PRs instead (for example bottom 20% XS, top 10% XL), re-fit weekly.
5. **Weight is not value.** #138 (W 4) fixed live waitlist signups that were returning 500s. #103, #104 and #109 (W 17 or 18) are internal schema work no outsider would notice. Newsworthiness is scored separately (§11).
6. **Difficulty and cost are not observed.** A 17-line concurrency fix and a 17-line copy edit score the same. GitHub has no token or agent-time data. Log tokens per PR (Part 1 §5.7 already asks for token cost per surviving item) and recalibrate the bands against it. **There is no effort ground truth in this data, so the validity of W is untested beyond the weak correlation above and face validity.**
7. **PR-body signals are brittle.** The text rules (Neon main, production database) work for the owner's current PR template and would miss other phrasing. SAD class from paths is approximate: only ADR files, migrations and spec or amendment files are detected.
8. **Merge is not production.** PRs #118 and #119 state that Neon main was written by replay and that the git PRs are not what changed production **[V from PR bodies]**. For weight and for announcements, the unit must be the **verified production event**, not the PR merge date.

**Recommended use [J]:** forecast on `W_merged` points per day alongside counts; use `W_verified` for the Friday evaluation; keep counts for sanity checks. Re-fit bands weekly. Treat v0 as a measurement instrument to be corrected by the first 60 PRs, not as truth.

---

## 11. Newsworthiness: what gets announced, and at what size

### 11.1 Method

For each site I fetched the real listing pages or feeds, parsed every entry (date, title, category if given, body or summary length where available), and classified each entry with a rule-assisted keyword classifier that I then spot-checked by title. Category assignment is my judgment and some entries are borderline, so treat percentages as approximate. Counting windows are stated per site. I did not read every article body; sizing uses listing text, feed text and, for Cursor's changelog, the fetched page text.

Sources fetched this session **[V]**: https://cursor.com/changelog (pages 1–9 plus https://cursor.com/changelog/rss.xml), https://cursor.com/blog and its topic pages (product, research, company, customers, press), https://cursor.com/sitemap.xml; https://x.ai/news and https://docs.x.ai/docs/release-notes; https://vercel.com/changelog and https://vercel.com/atom (the combined changelog and blog feed); https://linear.app/changelog and https://linear.app/rss/changelog.xml; https://www.anthropic.com/news (the page embeds its post list).

**Category key:** NEW = new capability or product surface; MODEL = model release; DIST = availability on a partner platform or integration; IMP = improvement, performance or limits; CO = company (funding, acquisition, hires, offices, partnerships, awards); CUST = customer story; RES = research or engineering write-up; POL = policy, security, safety, deprecation or billing/admin.

### 11.2 What each channel announces and how often

| Site and channel | Sample [V] | Cadence [J] | Mix of announced items |
|---|---|---|---|
| **Cursor changelog** | 50 entries, 2026-03-11 to 2026-10-16 | about 1.6 a week | NEW 23 (46%), IMP 19 (38%), DIST 6 (12%), MODEL 2 (4%). No entry is a bug-fix list; every entry is a named feature or a themed "Improvements" bundle. |
| **Cursor blog** | 63 listed posts, 2025-01 to 2026-09 (53 Cursor-authored plus 10 external press links) | about 2.2 a week over Jun–Sep 2026 (35 own posts) | CUST 17 (32%), NEW 12 (23%), RES 12 (23%), CO 12 (23%) among own posts; plus 10 press items |
| **Cursor press page** | 10 external items, 2025-03 to 2026-03 | about one every 5 weeks (10 items over 12 months) | Funding (Bloomberg ×2), acquisition (Graphite, Fortune), major launches and upgrades (TechCrunch, CNBC, WIRED, Fortune) |
| **x.ai news** | 62 entries dated 2026 (86 total since 2023) | about 2.3 a week since 2026-04-17 | NEW 23 (37%), DIST 17 (27%), MODEL 15 (24%), RES or case 4 (6%), CO 3 (5%) |
| **x.ai API release notes** | 25 entries, May 1 to Oct 14 (entries carry no year on the page) | about 1 a week | Model releases, deprecations and end-of-life notices, new request parameters, regional availability, new options on existing endpoints |
| **Anthropic news** | 67 entries 2026-01-13 to 2026-10-15 (the page's embedded list; three model launches featured on the page, Haiku 5.5, Sonnet 5.5 and Opus 5.5, are not in that parse, so models are undercounted) | about 1.7 a week | POL 21 (31%), CO 18 (27%), NEW 11 (16%), MODEL 7 (10%), RES 5 (7%), other 5 (7%). Page labels (an entry can carry several): Announcements 62, News 20, Product 11, Beneficial Deployments 10, Policy 8, Economics 3, Case Study 3, Research 3, Frontier Red Team 2, Science 1, Societal Impacts 1. |
| **Vercel changelog** | 174 entries, 2026-08-17 to 2026-10-16 | about 20 a week | DIST (mostly "model X now available on AI Gateway") 68 (39%), IMP 55 (32%), NEW 21 (12%), POL or billing 7 (4%), other 23 (13%) |
| **Vercel blog** | 31 posts in the same window | about 3.6 a week | Not categorized (I did not classify the blog posts); examples are launches ("Python on Vercel is now generally available"), recaps ("Vercel Ship 2026 recap") and engineering write-ups ("How we cut CDN metadata lookup latency by 91%") |
| **Linear changelog** | 40 headline releases, 2025-09-04 to 2026-10-08 (252 since 2019) | about 0.7 a week, usually a Thursday | Of 40 headlines, about 20 are AI or agent features, 7 integrations, 5 mobile or UI. Each release bundles 1–4 headline features with long fix and improvement lists. |

### 11.3 How things are sized: headline versus changelog line

| Channel | Size signal [V from fetched text] |
|---|---|
| Cursor changelog | Median title 4 words; median body about 249 words; median 3 sub-sections (n = 45 pages read). Largest entries are launches (Cursor Projects 440 words; Rollouts and Security Review 552 words, 10 sub-sections; "Custom stores, custom tools, and auto-review for the Cursor SDK" 932 words, 5 sub-sections). The smallest are single lines (Context Usage Breakdown 29 words; Composer 2.5 76 words). |
| Cursor blog | Median read time 4 minutes (36 posts with a stated time); product posts 3 to 8 minutes (Rollouts and Security Review 3, Introducing Projects 5, Cursor for iOS 7, Cursor Router 8); research up to 27 to 28 minutes (Git at any scale; Mixture-of-Kittens) |
| x.ai news | Titles about 4 words; descriptions median 14 words; the biggest items have no description on the listing |
| x.ai API release notes | Median 48 words (n = 25); the Grok 4.7 entry (Sep 21) is 151 words; Custom Voices (May 1) is an outlier at 755 |
| Anthropic news | Listing summaries median 23 words; model posts lead with a comparative figure (for example Sonnet 5.5: "30% faster and costs up to 30% less for most work") |
| Vercel | Changelog median about 167 words; blog median about 1,070 words (feed content lengths) |
| Linear | A release's headline features about 286 words (median, 10 releases) plus, by my approximate line count, about 17 fix lines and 22 improvement lines |

**Numbers in headlines.** Measured improvement figures appear in a handful of changelog titles (Cursor: "Cloud Agents Start 3x Faster with Builds", "Bugbot is now over 3x faster, 22% cheaper, and finds 10% more bugs"; Vercel changelog: "Secure Compute and Static IP builds start 64% faster") and in most customer-story titles (by my count, 9 or 10 of Cursor's 17 customer titles lead with a number, for example "Amplitude ships 3x more production code with Cursor", "Coinbase reduces time from idea to production by 90%"). Vercel's engineering blog does the same: "How we cut CDN metadata lookup latency by 91%". **Pattern [J]: a before and after figure moves an item up one size.**

### 11.4 Channel ladder (how one thing is announced at several sizes)

Evidence of the same release at different sizes:

- **Grok 4.7, 2026-09-21 [V]:** x.ai news ("Introducing Grok 4.7"), x.ai API release notes (151-word entry with pricing), Cursor blog ("Introducing Grok 4.7"), Vercel changelog ("Grok 4.7 now available on AI Gateway, fx, and eve"). Then, for 4.6, partner-platform entries on separate days (Microsoft Foundry Aug 29, Gemini Enterprise Aug 26, Amazon Bedrock Aug 21, GitHub Copilot Aug 19), each its own x.ai news item.
- **Cursor Projects, 2026-09-10 [V]:** a 440-word changelog entry and a 5-minute blog post ("Introducing Projects") on the same day.
- **Cursor changelog entries that also have a blog post (title or slug match, my judgment):** 16 of 50, about a third (Rollouts and Security Review, Projects, Self-hosted machines, Cloud agents 3x faster, Cursor Start, Router, iOS app, Bugbot 3x faster, Design Mode, Organizations, Composer 2.5, Composer 2, Canvases, Cursor SDK, Self-hosted Cloud Agents, Development environments for cloud agents). The 34 others are changelog only (for example Origin App Marketplace on 2026-10-13 has no blog post in the topic listings **[U for absence on unlisted pages]**).
- **Vercel [V]:** the combined feed has the same item at both sizes (for example "Python on Vercel is now generally available" appears as both a 323-word changelog entry and a 976-word blog post on 2026-10-15), and a "Ship 2026 recap" blog post of about 4,700 words on the same day.
- **Cursor press page [V]:** only company-level events travel to external press: funding, acquisitions, and landmark product launches.

**Sizing ladder observed [J]:** a changelog line (about 30 to 250 words) for most shipped changes, a changelog entry plus blog post (about 800 to 1,500 words) for a new product surface or a measured result, and press or a company announcement for money, acquisitions and platform bets. Anthropic's news page has no minor tier at all: its smallest items are policy updates, partnerships and programs.

### 11.5 What is never announced (and the limits of that claim)

I can only observe what appears on the pages; "never announced" below means **absent from every sampled channel** and is a pattern, not proof of company practice.

- **Internal refactors, test additions, CI or build fixes, dependency bumps, documentation-only changes, repository reorganisation, handoff or process bookkeeping:** absent from all of Cursor's changelog (50), x.ai news (62), x.ai API notes (25), Anthropic news (67) and the Vercel changelog (174) samples. **[V for absence in these samples]**
- **Bug fixes:** none as stand-alone items on Cursor, x.ai or Anthropic. **Linear is the exception:** every weekly release carries long lists of fixes and improvements (about 17 and 22 lines by my approximate count), listed but never headlined. Vercel's smallest changelog lines (for example "Vercel Sandbox creation now returns a ready sandbox") are the nearest to a fix list.
- **Failures and reversals are announced only when external parties are affected:** Anthropic posts a statement or update when policy or access is affected (for example 2026-06-17); Vercel announces billing and retention changes; x.ai lists end-of-life and deprecations in release notes. **Obligation announcements (deprecations, security, billing, policy) are published regardless of magnitude.** That is a separate axis from celebration.
- **Funding and strategic announcements are rare relative to product items:** Cursor's company posts and Anthropic's are about a quarter of their counts but are the items that travel to press.

### 11.6 Newsworthiness test (derived) [J, grounded in 11.2 to 11.5]

Apply to a **merged PR, a handoff item, or a verified unit**. Always evaluate at the **verified production event**, not the merge (see §10.4.8).

**Gate G (all required):**
- G1. It is live in production, or will be on a stated date (not a draft, not behind a flag that is off).
- G2. An outsider can check it: a URL, a query, a screenshot, an API call, a before and after. (Channels announce things people can try; none of the sampled channels announces something unobservable.)
- G3. Nothing in it is unsafe to publish: no secrets, no unverified claims about named people, no embargoed partner information, accuracy checked for anything stating facts about real officials or elections.

If any gate fails the item is **M0**.

**Scoring questions (yes or no), answered after the gate passes:**

| # | Question | Evidence it matters |
|---|---|---|
| Q1 NEW | Can an outsider now do or see something they could not before (new capability, new data, new coverage, new surface)? | Every channel's top category is NEW, MODEL or DIST |
| Q2 MEASURED | Is there a before and after number (coverage count, speed, accuracy, size)? | Numbers lift items to blog level (§11.3) |
| Q3 SEAM | Does it complete something stated in advance: a handoff item closed with verification, a phase, or a dated external deadline? | Launch-style items and "now available" are what get posts; a seam is also the internal celebration point |
| Q4 PULL | Is there a named audience who would care and a specific question to ask them (a feedback hook)? | Customer stories and launches name audiences |
| Q5 TIME | Is there an external clock (election date, deadline, event) making it worth announcing now? | Time-boxed items are the ones that cannot wait |

**Magnitude scale (tiers) [J]:**

| Tier | Name | Criteria | Output | Observed analogue |
|---|---|---|---|---|
| **M0** | Unannounced | Gate fails, or none of Q1 to Q3 | Nothing external; recorded in the weekly digest if it carries weight | Refactors, tests, CI, docs, bookkeeping: never on any sampled channel |
| **M1** | Changelog line | Gate passes and Q1 or Q2 | One line (about 30–60 words) in a public changelog or weekly note; no social post required | Vercel one-liners; Cursor "improvements" bundles; Linear fix and improvement lists |
| **M2** | Changelog entry plus short post | Q1 and Q2, or a verified unit, and Q4 | 150–300 words, a screenshot or link, one feedback question, one social post | Most Cursor changelog entries; x.ai news items with a short description |
| **M3** | Post with story | Q1 and Q2 and Q3 and Q4, closing a verified unit; or Q5 makes it time-critical | A write-up (about 500–1,000 words) with the number, the method and the open question; posted and pinned; follow-up thread after the feedback window | Cursor blog posts for launches; Vercel blog launches; customer stories with numbers |
| **M4** | Major announcement | A project-level goal completes (all its verified units done) **or** a company-level event (launch of a product line, funding, partnership) | Full announcement, possibly press outreach; a calendar milestone event | Cursor press page items; x.ai and Anthropic company news |

**Builder-audience flag (suffix "b") [J]:** process or tooling work with no product effect (handoff automation, verification skills, repo structure) can still be a post for the agent-development audience, in the style of the owner's own method notes. It is never above M1b by default and is never mixed into the product announcement stream.

**Cadence cap [J, calibrated to the observed rates: Cursor 1.6 changelog plus about 0.5 blog a week, x.ai about 2.3 a week, Anthropic about 1.7 a week]:** at most one M3 and two M2 a week, M1 as a weekly batch, M4 as the project demands. If more qualify, queue by time-criticality (Q5), then weight.

### 11.7 [moved to the private evidence note: retroactive application to recent work]

## 12. Milestones on the calendar, feedback loop, evaluation

### 12.1 Milestone events (connector-safe format)

The connector cannot store custom fields (Part 1 §4.1 to §4.2). Milestone data therefore goes in the **description block**. Milestones are all-day events on a dedicated **Milestones** calendar (created by hand); use the connector's `colorId` for tier colour, `availability` FREE, and a morning popup reminder. Because `search_events` covers only the primary calendar (schema read, §4.1), Grok Bot reads milestones with a time-range listing on the named calendar, not by semantic search.

**Title:** `★ M2 · <short name>` (the star marks a milestone; the tier letter lets a glance filter).

**Description block (fixed keys, one per line, parseable):**

```
type: milestone
milestone-id: ms-2026-10-<nn>
goal: <goal-id>
handoff: <H-id>                    # the calendar goal is written as a handoff item
prs-needed: P1 feat, P2 feat, P3 docs        # planned slots, typed, before PRs exist
prs-bound: #135 #134 #132 #137 #138          # real PRs, filled by Grok Bot from GitHub
weight-plan: 35                    # sum of median W by slot type
weight-actual: 27                  # sum of W_merged of bound PRs
state: planned|merged|verified|announced|reviewed
verified: <url or "no">            # evidence link; required for state verified
tier: M0|M1|M2|M3|M4 (+b)
gates: G1 yes, G2 yes, G3 yes
stretch: <YYYY-MM-DD>
must-by: <YYYY-MM-DD> (P85)
announce-by: <YYYY-MM-DD>          # earliest of Q5 clock and forecast date
channel: changelog|post|thread|press
feedback-hook: <one question for readers>
feedback-due: <YYYY-MM-DD>         # review date, announce date + 7 days
note: [[<vault note>]]
```

**Follow-up events** are created with the milestone: (a) `Announce: <name>` on `announce-by` (a 30-minute `FOCUS_TIME` block on the Focus calendar to write and approve the post), and (b) `Feedback review: <name>` on `feedback-due` on the Reviews calendar. The same `milestone-id` ties the three together.

**State changes** are written by Grok Bot by updating the event description when GitHub shows the bound PRs merged (state: merged) and when the owner records verification (state: verified). Tasks stays out of this loop (date-only limit).

**Internal use [J].** The Friday digest lists the week's milestones by tier and their weights (illustrative only, numbers invented for format: "one M3, two M2, W_verified 112, forecast hit rate 5 of 6"), and the next week's calendar shows the stars ahead. This is the motivation artefact: a visible sequence of closed, verified units, not a count of PRs.

### 12.2 Announcing and capturing feedback

**Who posts what.** The available X tools are **read-only** (post lookups, counts, search, mentions, quotes; no create-post) and Grok Bot may not send or post on its own, so drafting is automated and the **posting is the owner's action** (he posts it, or approves a draft handled by the parent through the draft-and-send route). **[V tool list; J on the procedure]**

**Flow:**
1. **Draft.** At `announce-by` minus one day, Grok Bot drafts the announcement for the tier's format and the feedback hook, with the evidence link (G2). The owner approves and posts.
2. **Log.** The owner (or the digest) records the post URL in the milestone note `announcements/<milestone-id>` and the event's `state: announced`.
3. **Collect (daily until `feedback-due`).** Grok Bot reads: replies, quotes and mentions of the post URL via the X read tools (quotes, mentions, search by URL; public metrics such as likes, reposts and impressions come back on posts, per the X read-tool descriptions; I did not exercise this in this session [J]), replies in Gmail, and new GitHub issues or discussions linked to the milestone.
4. **Classify** each item as: data-error, bug, request, question, praise, spam or other.
5. **Route.**
   - *data-error* and *bug* → a new handoff item with `source: feedback` and the milestone-id, in the **next** intake, ahead of new scope.
   - *request* → a backlog candidate with a tally; promoted only when it passes the Algorithm's step-1 and step-2 check from Part 1 §2.1 (named owner; can it be deleted?).
   - *question* → answer; if the same question appears twice, add a documentation or UI item.
   - *praise and spam* → logged only; counted in the evaluation.
6. **Reserve capacity.** The per-project profile (Part 1 §6.2) gains `feedback-slack-pct` (start at 10%) so routed items do not displace committed work; unused slack is released at cycle end.
7. **Corrections.** A data-error on a named official or election fact gets a visible correction on the original post and a new verified unit; this is a hard gate G3 follow-up, not a normal request.

### 12.3 Evaluation after announcement

At `feedback-due` the calendar prompts the review; Grok Bot prepares the numbers.

| Measure | Question it answers | Use |
|---|---|---|
| Tier versus response (impressions, replies, quotes, per tier) | Is the magnitude scale calibrated? Do M3s draw more than M1s? | After 20 or more announcements, re-fit the thresholds; until then, report only |
| Feedback items per announcement, by class | Is the hook working? | Rewrite hooks that draw only praise |
| Share of feedback items that became handoff items, and share merged within one cycle | Does feedback feed development, or just accumulate? | Target set after the first month |
| Time from announce to first feedback; time from feedback to merged fix | Is the loop fast? | Compare with the drag P85 |
| Forecast hit rate for announced dates | Were `announce-by` and `must-by` kept? | Same loop as Part 1 §5.7 |
| Weight announced versus weight verified | Are we announcing only verified work? | Should be 100% for M2 and above |
| Cadence versus cap | Are we announcing too much or too little? | Cap is 1 M3 and 2 M2 a week |
| Regret list | Anything announced that was later corrected or reverted | Tightens gates G1 to G3 |

**Stop rule [J].** If two consecutive months show no feedback items that reach the backlog, drop external announcements below M3 and keep only the internal milestone stars; this prevents the announcement habit from consuming the slack it is meant to create.

### 12.4 Update to the draft methodology section (Part 1 §6.3)

Add to items 1 to 8 of the draft:

> 9. **Weight.** Every PR, merged PR, handoff item and verified unit carries an integer weight derived from its files and text; forecasts run on weight per day as well as items per day. Weight is not value and not wait.
> 10. **Verified unit.** An item counts as done for forecasting and announcement only when its listed PRs are merged **and** verification evidence is recorded.
> 11. **Milestones and announcements.** Items are tiered M0 to M4 by the newsworthiness test; M2 and above become calendar milestones with an announce-by date and a feedback review; feedback is routed into the next intake with reserved slack.
>
> **Update rule addition:** the weight bands and tier thresholds are re-fit at the end of each cycle from trailing data; any change to the weight terms or tier criteria is a dated convention change (SAD Class 4) logged in the session log.

---

## 13. Part 2: not verified, caveats, open decisions

**Not verified or not found [U]**
- No effort ground truth (hours, tokens) exists for the 35 PRs, so the validity of W is untested beyond a weak correlation with open→merge time.
- Which PRs are live in production, which have public surfaces, and the numbers (counts of races, courts, judges) behind the proposed announcements were not checked.
- Handoff item boundaries other than <item> are inferred from title prefixes, not from the vault's handoff index.
- The newsworthiness tier thresholds are judgment grounded in frequency and sizing patterns; they have no engagement data behind them yet.
- Cursor blog listing is from topic pages, which are not exhaustive (the sitemap lists about 115 blog posts; the topic pages list 63 including press). Vercel's blog split and Linear's AI-versus-other split are my reading of titles. Linear fix and improvement counts are approximate line counts from the changelog HTML.
- Anthropic's own product and release-notes pages (where small changes may be announced) were not fetched; "no minor tier" refers to the news page only.
- x.ai news dates are page dates; the API release notes list Grok Bot as available Aug 11 while the news page dates the "Introducing Grok Bot" post Aug 12, so one-day differences between channels are normal.
- The GitHub file lists are capped at 100 files per PR; #118 and #129 category splits are lower-bound estimates.

**Open decisions for the owner**
1. **Are tiers and the weight bands acceptable as v0, with quantile re-fitting from the first 60 PRs?**
2. **What counts as "verified" in practice** for each kind of item (a live URL check, a query, a test run), and where is the evidence stored (the handoff index, the milestone note, or both)?
3. **Which channel is "public"** for M1 to M4: a changelog page on a the reference project site, X posts, or both? None exists today **[U]**.
4. **Who posts.** The available tools cannot post to X; do you post drafts yourself, or do you want a posting route set up (needs a separate approval)?
5. **The Texas election item** has a hard clock (early voting from 19 October), but #100 and #102 were written as "do not merge / not run on production" drafts. Is the feature live? If you verify it by 18 October, do you want it treated as an M3 announcement?
6. **Builder-audience posts (the "b" stream)** for the handoff and pstack-style work: wanted at all, and under what name or account?
7. **Calendar housekeeping:** create the Milestones, Stretch, Focus and Reviews calendars by hand (the connector cannot).
8. **Feedback slack:** start `feedback-slack-pct` at 10% of capacity?
9. **Weight inputs:** approve logging tokens per PR so W can be calibrated against cost.

---

## 14. Part 2 sources

**Channels fetched and parsed [V]:** https://cursor.com/changelog ; https://cursor.com/changelog/page/2 to /page/9 ; https://cursor.com/changelog/rss.xml ; https://cursor.com/blog ; https://cursor.com/blog/topic/product ; https://cursor.com/blog/topic/research ; https://cursor.com/blog/topic/company ; https://cursor.com/blog/topic/customers ; https://cursor.com/blog/topic/press ; https://cursor.com/sitemap.xml ; https://x.ai/news ; https://docs.x.ai/docs/release-notes ; https://vercel.com/changelog ; https://vercel.com/atom ; https://linear.app/changelog ; https://linear.app/rss/changelog.xml ; https://www.anthropic.com/news

**Cited individual pages [V from the listings above]:** Cursor Projects changelog entry (2026-09-10), Rollouts and Security Review (2026-09-23), Bugbot "3x faster" (2026-06-10) and the Cursor customer-story titles (https://cursor.com/blog/topic/customers); Grok 4.7 entries on x.ai news and the API release notes (2026-09-21); Vercel "Python on Vercel is now generally available" (2026-10-15, changelog and blog); Anthropic "Introducing Claude Sonnet 5.5" listing on https://www.anthropic.com/news (featured slot; the "30% faster and costs up to 30% less for most work" line is from that page).

**Local data [V]:** GitHub API reads of `<owner>/<repo>` (PR list, per-PR file lists, PR objects for #118, #129, #138, 2026-10-16); PR bodies for the item groupings. Scoring and Monte Carlo scripts and the fetched pages are in `/workspace/news/` on the box; nothing in the Mac vault other than this note was changed.

---
---

# PART 3 [results of the first Jev-based scoring run: moved to the private evidence note]


## 23. Revised definitions (v1; none validated beyond this sample)

**Weight, per PR: `W = S + F + R + U + C`** (S and F unchanged, in code).
- **R (risk):** schema/migration +2 and deploy/infra +2 from **path rules** (not Jev), with the `.sql` rule restricted to real migration folders and the `fixtures/` folders excluded; **data-write +1 only when Jev's "already written to production" ≥ 0.8** (replaces the saturated path regex; the path regex stays only as a hint printed next to the score); auth +1 from a narrowed path rule (`auth|permission|rls|secret`, without `token`), **untested**. A PR with any R-driving Jev answer in 0.2–0.8 is marked `review` rather than scored as a coin flip.
- **U:** path rule unchanged. Report the Jev API/MCP-reach probability beside it, **not added** until judged.
- **C (SAD class):** in order: **a class the PR states itself** (`Class N` in the title or body); `ADR-\d+` named in the title or an `docs/adr/` file → class 1; a real migration → class 2; spec file → class 3. Jev's class is used **only to fill gaps at confidence ≥ 0.8 and only for class 1 or 2**; class 3 from Jev adds no points. (This removes Jev's inflation; **it is a rule change I did not re-test**.)
- Keep the integer `W` for forecasting and keep the probability-weighted `W_exp` as a diagnostic only. Band cut-offs should still be re-fit from trailing data (Part 2 §10.4).
- **Merged PR, handoff and verified-unit definitions are unchanged** (Part 2 §10.2), except that **a verified unit needs three things: every PR of the item merged; the item-level Jev `verified_unit` ≥ 0.9 on both models; and a closing "done" PR or record (code)**. On this sample only <item> qualifies.

**Newsworthiness tier, v1 [J]:**
1. **Split** the tier into a *candidate tier* ("what this deserves if it is live") and a *live status* ("is it live"). The calendar milestone shows the candidate tier with `live: no|yes`; the announce action unlocks when `live: yes`.
2. **G1 (live) comes from facts**, not Jev: a deployment record or a recorded live check (the <item> / #137 pattern). Jev's `evidence_live_check` and `g1_blocked` are shown as supporting text to the human, not as the gate.
3. **G2 (outsider can check) and G3 (safe)** are Jev-assisted: G3 = no secret (Jev reliably 0) **and** not (names real officials **and** says data unverified); G2 stays advisory because it was the most uncertain question (27 of 35 in 0.2–0.8).
4. **Q1 to Q5 are not scored by PR-level Jev questions.** Q3 (completes a unit) comes from the handoff index; Q5 (external clock) from a date field on the calendar goal; Q2 from a count the PR or item states (regex for a number plus a human check); Q4 from the goal's named audience. Jev's `q1_visible` may **suggest** Q1 but cannot decide it (11 yes, 17 uncertain, and some of those yeses look wrong to me).
5. **Direct tier**: show it only when its confidence is ≥ 0.5 and label it "suggestion"; never use it as the gate. **M2 and above always need the owner's approval**, which was already required because posting is manual.
6. **Builder-audience flag:** use Jev's `builder_only` (it caught #126, #129, #130 and three more).
7. **Feedback classifier:** keep as designed in Part 2 §12.2 with confidence gating: if `kind` confidence < 0.8, or the top two probabilities are within 0.3, route to the owner for a decision instead of auto-routing; **corrections about named people are always routed to the owner**, whatever the class.

## 24. What this part does not establish [U]

- **No ground truth.** I have no outcome data (hours, tokens, who actually announced what), and no second human rater. All "Jev right/wrong" statements are my reading of PR opening text and largest files; I did not read every diff.
- **One repository, 35 PRs, one week, one author.** The rule results and the Jev results are both in-sample for the thresholds I chose (0.5, 0.8, 0.2, 0.9).
- The v1 rewording was tuned on the same sample (§18).
- Jev saw each PR's text, a file list with counts and at most 120 file names, **not the diffs**, so questions about what the code does (auth, API reach) rest on titles and paths.
- I did not test `jev-latest` against repeated calls of the same request for determinism, and did not test the `TypeSafe-Danger-Zone-Long-Context` option.
- The "composed tier" rules are mine from Part 2, not TypeSafe's.

**Open decisions for the owner**
1. Accept the hybrid (§23) instead of "all scores by Jev"? Where Jev replaces a rule it does so only for the data-write flag, evidence reading and the builder flag; everything else stays code or human.
2. Who supplies **ground truth** for calibration: a list of PRs where you would have announced and at what tier, even 20–30, would let me calibrate tiers and the SAD-class use properly.
3. Where does **G1 (live in production)** get recorded: a deployment record, a live-check line in the closing PR (as in #137), or a field on the calendar milestone?
4. Is the **0.9 threshold** for a verified unit acceptable (false yes is costly)?
5. Log versioned model ids (`jev-1.13.0`, `jev-1.14.0`) with every score: approve?
6. Keep the **API key scope**: the key lives in the app repo's gitignored `.env.local` and `.env.production.local`; a separate key for scoring (rotatable, scoped to this workflow) would avoid sharing a production key with a scoring script. Your call; I used the existing variable name only.

## 25. Part 3 sources

- TypeSafe docs [V, fetched 2026-10-16]: https://docs.typesafe.ai ; /llms.txt ; /concepts/state.md ; /primitives.md ; /primitives/noul.md ; /primitives/choice.md ; /primitives/score.md ; /primitives/advanced.md ; /confidence.md ; /models.md ; /api.md ; /model-jaggedness/jev-1.13.md ; /introduction/quickstart.md ; /patterns/composite-scoring.md ; /patterns/confidence-routing.md
- API: `POST https://api.typesafe.ai/v1/systemone` (calls made from the Mac; responses stored in `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/out/`)
- GitHub [V]: read-only `gh api` on `<owner>/<repo>` (the `<owner>/<repo>` redirect) for 35 PR objects and file lists, 2026-10-16
- Part 2 rule-based scores and judgment tiers: this document §10 and §11.7
- Scripts (no key inside): `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/*.py` on the Mac

---

# Part 4: Jev for everything, asked the way TypeSafe's own guidance says

> **Ruling (the owner, relayed 2026-10-16):** use Jev for every score, not a hybrid. The flaws found in Part 3 are flaws in how I asked, and answer quality depends on question quality.
> **Bottom line first [J, supported by §30 to §33]:** The owner is right about the main failure. Re-asked the Jev-native way, **"is it live" is solved** (35 of 35 PRs deployed, matching GitHub's records, wording-stable at 0.012), the composed tier is no longer 34 of 35 M0, the feedback classifier is stable and the reversal flips on the classification disappear, and model-version drift is small. It is **not a free win everywhere**: wording still moves the answer on the fuzzy "degree" questions, one of my two Part 3 "rewordings" turned out to be a worse question (thinner criteria), hand-tuning wording on half the PRs did not reliably help the other half, ordinal tier from one direct question is stable but answers a different question than the gated one, and planning weight from a title alone does not work. Where the answer is a fact in the repository (paths, workflow results), Jev agrees with code on 32 to 35 of 35, but code is still cheaper and exact for those; the task is to use Jev for the *judgment* parts and give it *evidence in state*.

## 26. [moved to the private evidence note: findings from a read-only search]

## 27. What the skills required that Parts 2 and 3 did not follow [V for what the sources say; J for my assessment]

| # | Requirement (source) | What Parts 2 and 3 did |
|---|---|---|
| 1 | Quality of the question determines the quality of the answer; scoring principles are fixed before re-running golden and held-out cases (the owner's P1, `methodology-selection`) | I tuned nothing, but I also never held out cases and I treated an unlucky first wording as the verdict on Jev. |
| 2 | Supply the knowledge Jev lacks as **state**; typed output guarantees the interface, not truth; "inferred" kept distinct from "observed" (official skill; news v2; statement-kind fix) | G1 "is it live" was asked of PR text, which rarely says it. This was the main failure. |
| 3 | State is short, filtered, named-field with backticked paths; code owns dates, counts and arithmetic (SoR §M.6) | State was a dump of title, body and a file list; Jev was asked about counts ("has a number"). |
| 4 | One narrow coherent judgment per question; a Noul's 0.5 means "uncertain", not "medium degree" (official skill) | Part 2 turned several Noul answers into integer points, hiding 0.5 coin flips; compound `g1_blocked` mixed draft, not-run and switched-off. |
| 5 | Ordinal answers use a **Score with concrete levels that stand alone**, not an unstable direct "what tier" Choice (official skill; cookbook entity-alignment) | The tier was a direct Choice (unstable) plus a composite of saturated Nouls. |
| 6 | Criteria on every Noul; `none_of_these` on Choice; ask a Choice forward **and reversed** (the owner's scripts) | Criteria were thin on some questions, no `none_of_these`, reversal only on the tier. |
| 7 | Each decision asked **one way** with its own bar; a question and its negation need not sum to 1 and yes/no vs pick-one numbers do not compare (pydantic page) | SAD class was a single Choice that inflated class 3. |
| 8 | Weights and thresholds in code, in one reviewable file; "any serious violation" as separate conditions (official skill) | Partly followed in Part 3; bands now fixed in `compose.py` before any output. |
| 9 | Separate missing evidence, model error, code error, service failure; pin versioned ids; hash-cache calls | Models were pinned by alias only; both aliases now run and the returned ids are recorded. |
| 10 | Wording robustness measured on cases **not** used to tune it | Part 3's reword (v1, "c" here) was not isolated from criteria changes (§32.7). |

## 28. The Jev-native question set (v2) [J design; code in `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/qset.py`, `compose.py`; frozen before any v2 output]

**State shape.** Named fields with backticked paths. For a PR: `about`, `pull_request.{title, number, labels, description}`, `changed_files` (total, lines, up to 30 directory groups with example file names), and a separate **`observed_by_github`** block (merge time, the Deploy Worker run on the merge commit with per-job results, the next successful run on main, later PRs that mention this one, PR comments), with an explicit line saying these come from GitHub and not from the author. Long descriptions keep head and tail (version b). Questions with `changed_files` or `description` in the wording read only those fields. No dates, counts or sums are asked of Jev.

**Questions** (one concept each; every Noul has a true and a false criterion naming what does not count; Scores have 4 to 5 stand-alone levels; Choices have `none_of_these`). 32 Nouls, 5 Scores, 3 Choice pairs per PR, in two requests (content, evidence), about 3,000 input tokens each.

| Score | Jev questions (type) | Composed in code |
|---|---|---|
| **PR weight S (size)** | `size` Score: how much authored work (levels from "a line or two" to "a large new subsystem") | S = round(1 + 1.75 × score) → 1 to 8 |
| **F (spread)** | `spread` Score: how many different areas of the repo | F = round(⅔ × score) → 0 to 2 |
| **R (risk)** | `risk_schema`, `risk_deploy`, `risk_auth`, `risk_prod_write_script`, `risk_irreversible`, evidence `ev_text_data_applied` (Noul each) | R = 2·schema + 2·deploy + 1·auth + 1·max(prod-write, applied); expected value, not thresholded |
| **U (user reach)** | `reach_web` (Noul), `reach_api` (Noul) | U = 2 × reach_web |
| **C (SAD class)** | `sad1_adr`, `sad2_structure`, `sad3_behavior`, `sad4_convention` as strict "itself among the changed files" Nouls, plus a SAD Choice forward and reversed with `none_of_these` | C = max(3·sad1, 2·sad2, 1·sad3) |
| **Revert** | `is_revert` (Noul) | merged weight = W × (1 − p(revert)) |
| **Merged-PR weight** | all of the above | `W_merged` in `compose.py` |
| **Gate G1 (live)** | Evidence Nouls: `ev_code_deployed`, `ev_migrations_applied`, `ev_text_data_applied`, `ev_text_live_request` (excluding CI, dry runs and rehearsals), `ev_text_gates_passed`, `text_draft_do_not_merge`, `text_not_run_on_prod`, `feature_switched_off`, `needs_data_in_production`. Draft, not-run and switched-off are separate questions. | G1 = min(deployed, 1 − switched_off, max(1 − needs_data, applied)) |
| **Gate G2 (public surface)** | `g2_public_page`, `g2_public_api`, `g2_documented_query` | max |
| **Gate G3 (hold back)** | `g3_credential`, `g3_named_people`, `g3_unverified` | fail = max(credential, min(named, unverified)); ≥ 0.5 → held for review |
| **Newsworthiness (Q1 to Q5)** | `novelty` Score (4 levels), `audience` Score (4 levels), `seam`, `deadline`, `measured`, `new_for_outsiders`, `builder_only` | in code (below) |
| **Magnitude tier** | `tier_score` Score with five concrete **outcome** levels (what the announcement would be), no fitted threshold, plus `tier_choice` forward and reversed as a cross-check | `tier = M0 if any gate fails, else round(tier_score)` (exploratory, §32.2); composite from novelty/audience/seam/deadline kept for comparison |
| **Handoff weight** | PR W from above; item weight = sum of its PRs' W; **plan** weight from title only: `plan_size`, `plan_spread` Scores, `plan_schema`, `plan_web`, `plan_deploy` Nouls | sum |
| **Verified unit (item)** | PR level: `ev_code_deployed` for each PR. Item level: `item_closes_planned_work`, `item_live_check_recorded` Nouls (live request and result recorded; CI and dry runs excluded) | verified = every PR deployed **and** live check ≥ 0.7 **and** closes ≥ 0.7 (AND in code, strictest) |
| **Item tier** | `item_tier_score` Score, `item_tier_choice` fwd/rev, `item_milestone`, `item_novelty`, `item_audience`, `item_deadline`, `item_builder_only` | gated by PR-level G1 (min), G2 (max), G3 (max) |
| **PR bound to an item** | 7 Nouls per PR: "Is `pull_request` part of the work described in `candidate_items.<key>`?" (descriptions without PR numbers) | ≥ 0.5 |
| **Feedback class** | 6 label Nouls (`is_data_error`, `is_bug`, `is_request`, `is_question`, `is_praise`, `is_spam`), `contains_instruction_to_system` (injection guard), `names_a_person`, `answers_feedback_question`; Choice forward and reversed with `none_of_these` | Choice as the label, Nouls flag multi-label and injection; Choice confidence below 0.9 → fall back to a broader label (cookbook) |

Bands fixed beforehand: ≥ 0.7 yes, < 0.3 no, between = uncertain, carried as `?` and never turned into points silently (the owner's J1 starting bands from SoR §K.5, with the 0.3 lower bar my choice).

## 29. [moved to the private evidence note: a deployment evidence finding]

## 30. Method, held-out protocol and cost

- **Runs on the Mac**, key read from `TYPESAFE_API_KEY` by `jev.py` itself (environment, or the repo's gitignored `.env.local`); never printed, logged, copied, written or moved to the box; nothing staged, committed or pushed; scripts and outputs in `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/`. No auth failures occurred.
- **Versions:** `a` primary; `c` Part 3's paraphrase (text **and** criteria rewritten, criteria thinner); `d` paraphrased question text with **a's criteria** (isolates text from criteria); `b` reworded on the **dev half only**.
- **Dev / held-out:** dev = the 18 PRs at even positions of the numerically sorted list (#98, #100, …), held-out = the 17 at odd positions. Tuned on dev only: three questions (`measured`, `g2_documented_query`, `reach_api`, the most wording-sensitive in dev) and the description head-and-tail fix (motivated by dev #98).
- **Models:** `jev-latest` (returned id jev-1.13.0) and `jev-preview` (jev-1.14.0); jev-latest is announced to move to 1.14.0 around Oct 21 **[V, TypeSafe Jev 1.14 post]**.
- **Cost [V, `usage.input_tokens`, $0.042 per million input tokens, output free]:** 622 requests, 1,896,056 input tokens, **$0.0796** for everything in Part 4. About 3,000 tokens per request, far under the 64k and 32k limits.
- **Ground truth:** none exists for weights, tiers or most gates. "Agreement" below means agreement with my own path or regex rules, which I adjudicated by reading the paths where they disagreed. The "first-pass tier" is my Part 2 reading **[J]**. **No new the owner judgment exists to compare against; the tiers and weights still await his review.**

## 31. [moved to the private evidence note: accuracy results]

## 32. [moved to the private evidence note: results by task]

## 33. [moved to the private evidence note: what improved and what did not]

## 34. Decisions still open (for the owner)

1. **Accept "Jev for every judgment, code for composition"?** A literal one-question-per-tier is stable but ignores gates; the gated Score is my recommendation but is post-hoc and untested on new data.
2. **Label a ground-truth set.** Without a few dozen of his own labels (tier, live, SAD class, public surface) every comparison here is Jev against my rules. Suggest labelling the 17 held-out PRs first.
3. **Where "live" is recorded long term:** the deploy record works for merge-to-main PRs; data-only loads (#118/#119) need a live-check line in the closing PR (as in #137) or a calendar field.
4. **Handoff weight at planning time** needs a written plan description in state; titles are not enough.
5. **Thresholds** (0.7 / 0.3, W formulas, M-tier rounding) are mine and unreviewed; the cookbook says thresholds are examples to evaluate.
6. **Pin the model:** latest and preview agree closely now (0.035), but `jev-latest` moves to 1.14.0 around Oct 21; recommend pinning a versioned id in production use.
7. **Injection guard and criteria** need a pass with real replies, not 24 synthetic texts.
8. **Whether to keep `c`-style thin criteria anywhere:** no.

## 35. What the vault's guidance requires, in one list (summary only; no skill was edited)

State as named fields and evidence, not raw dumps; one narrow judgment per Noul with criteria on both sides naming what does not count; Score with stand-alone concrete levels for ordinals; Choice with `none_of_these` and forward plus reversed; never read 0.5 as "medium"; code owns dates, counts, sums, weights and thresholds in one reviewable file; fix missing knowledge by supplying it in state; thresholds as examples to evaluate on held-out cases; pin model id; hash-cache calls; publish machine output as "not reviewed" with its confidence; completeness before assertion (SoR §K.7, §M.6).

## 36. Part 4 limits [U]

Single repository, 35 PRs, one reader's baselines; synthetic feedback texts; Choice confidence is concentration not correctness (official skill); item groupings are inferred; #129's file list was truncated at 3,000 of 3,918 files; Part 3's rule-W total (Part 2: 300) was reused as-is and I did not re-derive why some Part 3 component sums differ.

## 37. Part 4 sources

- Official skill: `~/.claude/plugins/cache/typesafe-ai/typesafe/0.5.7/skills/typesafe-ai/SKILL.md` (and the vault files in §26).
- TypeSafe docs: https://docs.typesafe.ai (questions, types, criteria, state, examples, best practices, calibration, limits, cookbooks); API `POST https://api.typesafe.ai/v1/systemone`; Jev 1.14 post; "what it answers badly" on pydantic.dev; TypeSafe blog posts.
- GitHub: `.github/workflows/deploy.yml`, Actions runs and jobs API for `<owner>/<repo>` (read-only `gh api`).
- Scripts and outputs: `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/{qset.py, compose.py, run_v2.py, run4_more.py, analyze4*.py, truth4.py, fetch_*.py, build_evidence.py, data/, out4/}` (outside the repository; no key in any of them).

---

# Part 5: What is an "item"? (industry practice against the proposed definition)

Added 2026-10-17 00:42 CDT. Read-only research: the primary documentation pages were fetched and read (not search snippets), plus a read-only pass over the vault's own spec stack and registers. No skill, spec or register was edited. Part 4 (§32 to §37) stands.

## 38. Question, method and labels

**Question (from the owner).** What is an "item" in the MAD/SAD method, taking the term and the rules from what the industry already uses rather than inventing one?

**Definition under test.** An item is a unit of work that ends in a verifiable state and was set up with a written plan.

- Required parts: outcome, plan description, proof of done, one owner who accepts.
- Kinds: build item (ends in merged PRs plus a live check); research item (ends in a logged founder decision; research is done at the decision, not at the report); decision/ops item (no PRs).
- PRs are not items; they are pieces that carry weight into an item. An idea dump is raw input, not an item.
- Open: a size cap on an item, and whether goals sit above items as a separate level (a goal = a set of items with a stretch date and a must-be-true-by date).

**Labels used in every table.**

- **[V]** verified: the page itself was fetched and read in this session.
- **[S]** secondary: from a search snippet or a description on another page; the page was not read.
- **[J]** judgment: my reading or inference; not stated by a source.
- **[U]** unverified or not examined.

## 39. Industry comparison table

Each row has one source page. Cells state what the page says; anything I inferred is marked [J] inside the cell. "Unit" means the smallest thing the system calls a piece of planned work.

| System | Unit names | Definition (what the source says) | Size guidance | Done criteria | Parent layer | Estimation | Decision handling | Source and label |
|---|---|---|---|---|---|---|---|---|
| Linear: issue | Issue, sub-issue | Issue is the "fundamental unit of work". Method: an issue is a task with a clear outcome, one named owner, and "if it's not a task, then it doesn't belong in the issue tracker" (ideas go to a document or conversation). Sub-issues are for work "too large to be a single issue but too small to be a project". | "As small as possible" (Method). | Status workflow; no separate Definition of Done object on the pages read. | Project, then initiative | Optional estimates; scales exponential 1,2,4,8,16, Fibonacci, linear 1 to 5, t-shirt; "1 point per issue" if estimates are off [S] | Method: "Decide and move on"; placeholder issues ("Explore design", "Write project spec") carry research | https://linear.app/docs/conceptual-model , https://linear.app/method/write-issues-not-user-stories , https://linear.app/docs/parent-and-sub-issues [V]; estimates https://linear.app/docs/estimates fetch returned 404, so [S] |
| Linear: project | Project, milestone (stage of a project), project update | A grouping of issues around a shared outcome with "a clear outcome or planned completion date", one lead; a milestone is a stage that can become its own project. | Method: scope projects to 1 to 3 weeks with 1 to 3 people; if it cannot be scoped down, break it into stages. | Outcome reached; project updates carry health (on track, at risk, off track) | Initiative | Progress from issue completion | Project spec by the lead; Method: "Don't invent terms if possible"; "Projects should be called projects" | https://linear.app/method/scope-projects , https://linear.app/docs/projects , https://linear.app/docs/project-milestones , https://linear.app/docs/initiative-and-project-updates [V] |
| Linear: initiative and cycle | Initiative, cycle, triage | Initiative groups projects toward a goal; one owner, a target date, status Proposed, Planned, Active, Completed, Canceled. Cycle is a time box of 1 to 8 weeks whose capacity is set from the previous 3 cycles. Triage is the inbox where incoming issues are accepted, declined, duplicated or snoozed. | Cycles 1 to 8 weeks | Initiative status set by owner; updates | Initiative is top (the docs list sub-initiatives too); no OKR object on the pages read [J] | Cycle capacity from past velocity | Triage is the intake decision | https://linear.app/docs/initiatives , https://linear.app/docs/use-cycles , https://linear.app/docs/triage [V] |
| Jira / Atlassian | Work item (was "issue"), epic, story, task, bug, subtask, initiative | Hierarchy Epic > Story/Task/Bug > Subtask; initiative above epics in plans. Story is a user-level requirement; epic a body of work; initiative multi-quarter. | Story committable in a 1 to 2 week sprint; epic a month or a quarter; "not every user story needs an epic"; estimation page: split any item over about 16 hours or about 20 points; 500 child items per parent | Definition of Done is separate from acceptance criteria; the whole team agrees the DoD | Epic, then initiative | Story points, relative size | Not a decision tool; separate DACI play | https://www.atlassian.com/agile/project-management/epics-stories-themes , https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/ , https://www.atlassian.com/agile/project-management/definition-of-done , https://www.atlassian.com/agile/project-management/estimation [V] |
| Shape Up (Basecamp) | Raw idea, pitch, appetite, bet, project, scope, hill chart | Pitch = Problem, Appetite, Solution, Rabbit holes, No-gos. A problem without a solution is unshaped work. A bet is a commitment with a capped downside. Teams get projects, not tasks. | Appetite is set first: small batch 1 to 2 weeks, big batch 6 weeks; "appetites start with a number and end with a design"; if the scope cannot shrink, break off a meaningful part; 6-week cycle plus 2-week cool-down | "Done means deployed". Circuit breaker: no extension by default; unfinished work is not carried over automatically | None above a bet; no backlogs; bet one cycle at a time | No estimates; hill chart shows uncertainty (figuring out vs executing) | Betting table decides; raw ideas get "Interesting. Maybe some day." | https://basecamp.com/shapeup (chapters 03, 06, 08, 10, 13) [V] |
| GitHub | Issue, sub-issue, milestone, project | Milestone groups issues and pull requests with a due date and a percent complete. Sub-issues: up to 100 per parent, 8 levels. Projects: custom fields, iteration fields, status updates; "rather than enforcing a specific methodology". | Limits only (100 sub-issues, 8 levels) | Milestone shows completion percentage from open and closed issues and pull requests | Milestone, project | Custom number fields | None built in | https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones , https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues , https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects [V] |
| Scrum (2020 Guide) | Product Backlog item, Sprint Backlog, Increment | PBIs that can be Done within one Sprint are ready to be selected; the Product Owner is one person; Sprint Goal is the single objective of a Sprint; Product Goal is the longer-term target. | Sprint is at most one month; planning decomposes into work items of one day or less | Definition of Done is a commitment; work that does not meet it is not an Increment | Product Goal, one at a time, fulfilled or abandoned before the next | Developers size; no points required | "Only what has already happened may be used for forward-looking decision making" | https://scrumguides.org/scrum-guide.html [V] |
| Kanban (Guide, May 2025, and University glossary) | Work item, work item type, option | Work item is "a deliverable or a component thereof"; work item types are groups that behave alike (examples: information requests, campaigns, incidents, software bugs, features, projects). Before the commitment point, work supports the decision whether to deliver; "options" replace the backlog. | No size rule; policy: Service Level Expectation, e.g. 85% of items within a stated number of days; WIP limits | Definition of Workflow states when an item has started and finished | Not defined (a service can scale from task to initiative) | None; four flow metrics: WIP, throughput, work item age, cycle time | Class of service: expedite, fixed date, intangible, standard; fixed date = delay costs at a specific date | https://kanbanguides.org/english/ , https://kanban.university/glossary/ [V] |
| Asana | Task, subtask, project, portfolio, goal | Task is the basic unit of action with a single assignee; subtasks up to 5 levels; goals exist at workspace, team and user level; tasks can be in several projects. | Subtask depth only | Task completion state (not described further on the page read) | Project, portfolio, goal | Custom fields | None | https://developers.asana.com/docs/object-hierarchy [V]; the "goals > portfolios > projects > tasks" ladder from the help center is [S] (page empty on fetch) |
| Notion | Project and task databases | Task belongs to one project; progress is the percent of tasks completed; sprints template. | None | Percent of tasks completed | Project; goals through a relation is [S] | None built in | None | https://www.notion.com/help/guides/getting-started-with-projects-and-tasks [V] |
| Amazon: working backwards | PR/FAQ, narrative | Originator drafts a press release (under one page) and FAQ (at most five pages) before building; many reviews; most never get approved; the document is living. | One page plus five pages | Not a done criterion; it is the go decision | None | None | Two-way doors (reversible) take a lightweight process; "disagree and commit"; about 70% of the information is enough | https://www.aboutamazon.com/news/workplace/an-insider-look-at-amazons-culture-and-processes , https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders [V]; "one-way door" wording appears only in the 2015 letter, whose URL returned 404, so that wording is [S] |
| Amazon: two-pizza team | Team | A team under about 10 people with single-threaded ownership of one service. | Team size, not item size | n/a | Single-threaded leader | n/a | Written narratives for checkpoint decisions | https://aws.amazon.com/executive-insights/content/amazon-two-pizza-team/ [V] |
| Google: OKRs | Objective, key result | 3 to 5 objectives, about 3 key results each; key results are outcomes with evidence of completion, "not a to-do list"; grading 0 to 1.0, 60 to 70% is the sweet spot for stretch goals. | 3 to 5 objectives | Graded 0 to 1.0 | Objective is the parent | Grade, not estimate | None | https://rework.withgoogle.com/intl/en/guides/set-goals-with-okrs [V] |
| Google: design docs | Design doc, mini doc | 10 to 20 pages, or a 1 to 3 page mini doc; write one when the design is ambiguous; update the doc before shipping. (Author's account of Google practice, on a personal site.) | 10 to 20 pages, 1 to 3 for mini | n/a | n/a | n/a | Doc records goals, non-goals, alternatives | https://www.industrialempathy.com/posts/design-docs-at-google/ [V] (author page, not an official Google page) |
| ADR | Architecture decision record | One decision per record: Title, Context, Decision, Status, Consequences; superseded, never deleted; one to two pages. | 1 to 2 pages | Status field | Log | n/a | The record is the decision log | https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions , https://adr.github.io/ [V] |
| RFC (Rust) | RFC | Substantial changes need an RFC; a final comment period of 10 days ends in merge, close or postpone; "active" does not mean a priority; the author need not implement. | 10-day comment period | Disposition | n/a | n/a | Three dispositions, including postpone | https://raw.githubusercontent.com/rust-lang/rfcs/master/README.md [V] |
| DACI | Driver, Approver, Contributors, Informed | One Approver; title the play as a question ("DACI: [question]?"). The "25%" claim sometimes quoted for DACI is not on the page: unverified. | n/a | Decision recorded | n/a | n/a | One Approver | https://www.atlassian.com/team-playbook/plays/daci [V] |
| RAPID (Bain) | Recommend, Agree, Perform, Input, Decide | Ideally one decider and one recommender. | n/a | n/a | n/a | n/a | One Decide role | https://www.bain.com/insights/rapid-tool-to-clarify-decision-accountability/ [V] |
| Consent (Sociocracy 3.0) | Proposal, objection | Proposals pass when good enough for now and safe enough to try until the next review; objections block, concerns do not; the proposal names who is responsible and a review date. | n/a | Agreement | n/a | n/a | Review date built in | https://patterns.sociocracy30.org/consent-decision-making.html [V] |
| XP spike | Spike | A spike answers a technical or design question; the code is thrown away; a pair for a week or two. | 1 to 2 weeks | The question is answered | n/a | Time box | Output is knowledge | http://www.extremeprogramming.org/rules/spike.html [V] |
| Dual-track agile | Discovery, delivery, validated backlog item | Discovery produces "validated product backlog items" for delivery. | n/a | Validated | n/a | n/a | Discovery is its own track | https://www.svpg.com/dual-track-agile/ [V] |
| INVEST / SMART | Story, task | Stories should be Independent, Negotiable, Valuable, Estimable, Small ("a few person-weeks"), Testable; tasks SMART; a time-boxed spike can enable estimation. | A few person-weeks at most | Testable | n/a | Estimable | Spike resolves uncertainty | https://xp123.com/invest-in-good-stories-and-smart-tasks/ [V] |
| Forecasting (ActionableAgile) | Throughput, split rate | Monte Carlo from historical throughput gives probabilities ("85% chance by a date"); a split rate shows how much a larger item breaks into smaller items. | n/a | Item reaches the final workflow stage | n/a | Counts of items, not weights | Reforecast often | https://55degrees.atlassian.net/wiki/spaces/ActionableAgile/pages/2408972289/Monte+Carlo+When [V] |
| Basecamp product | Not read | The Shape Up chapters cover the method; the product help pages were not read. | n/a | n/a | n/a | n/a | n/a | [U] |
| Y Combinator, Stripe | Not examined | Marked "if relevant" in the request; no page was read. | n/a | n/a | n/a | n/a | n/a | [U] |

## 40. [moved to the private evidence note: the vault's own terms for a unit of work]

## 41. [moved to the private evidence note: The owner's own data on size]

## 42. The proposed definition against each system

| Clause of the proposal | Matches | Differs | Source |
|---|---|---|---|
| A unit of work with one outcome | Linear issue ("task with a clear, defined outcome") and project ("clear outcome or planned completion date"); Kanban work item ("a deliverable or a component thereof"); Shape Up project; Atlassian story | Linear and Shape Up make a project bigger than a day or two; the owner's observed items are 0.1 to 5 days. Scrum's PBI is a unit in a queue, not a closed unit with its own plan. | §39 [V] |
| Ends in a verifiable state | Scrum Definition of Done ("a commitment"); Atlassian DoD; INVEST "Testable"; Shape Up "done means deployed"; Kanban Definition of Workflow; handoff-v2 §5 (checkable by command) | Atlassian keeps the Definition of Done (team-wide quality bar) apart from acceptance criteria (per item); the proposal's "proof of done" mixes both. | §39, §40 [V] |
| Set up with a written plan | Shape Up pitch (Problem, Appetite, Solution, Rabbit holes, No-gos); Linear project spec by the lead; Amazon PR/FAQ; Google design doc; handoff-v2 | Linear's Method says issues are tasks, not user stories, so I read the plan as living at project level, not per issue [J]. Shape Up's plan includes a time budget and a "No-gos" list; the proposal has neither. | §39 [V] |
| Required part: outcome | Same as above | Okay. | |
| Required part: plan description | Same | Shape Up and design docs also require non-goals or no-gos and risks (rabbit holes). | §39 [V] |
| Required part: proof of done | Same | Add a stop rule for work that does not finish (circuit breaker). | §39 [V] |
| Required part: one owner who accepts | Linear one lead per project and one assignee per issue; Asana one assignee; Scrum one Product Owner; DACI one Approver; RAPID one Decide | The sources separate doing from accepting (Driver and Approver; Developers and Product Owner). One owner who also accepts is the solo-founder case, which the vault splits by class (G-003, G-007). | §39, §40 [V] |
| Build item ends in merged PRs plus a live check | Shape Up "done means deployed"; vault Real-Run Smoke (Phase Closure Protocol) | None in substance; "merged PRs" is a means, not the outcome. | §39, §40 [V] |
| Research item ends in a logged decision, not a report | RFC (10-day comment period ending in merge, close or postpone); ADR (record is the decision); DACI (Approver decides); PR/FAQ (the go decision); Shape Up (the bet is the decision after shaping); consent (a review date is part of the decision) | XP spike and dual-track discovery end in an answer or a validated item, not necessarily a decision. Industry decisions often end in "postpone" or "no"; the proposal needs those as legitimate endings. | §39 [V] |
| Decision/ops item with no PRs | Kanban work item types (information requests, incidents); Linear issues that are "action to be taken"; Jira issue types [V]; Jira service work types are [U] | Fine. | §39 [V] |
| PRs are not items | Kanban: an item may be "a deliverable or a component thereof"; Linear Method: "Measure progress with actual work" (issues, not PRs, are the tracked unit on the pages read) [J] | GitHub lets a milestone hold issues and pull requests directly, which treats PRs as tracked things. | §39 [V] |
| PR weight flows into the item | No source does this. Kanban counts items (throughput) and the Monte Carlo page uses item counts; Jira and Linear estimate on the issue; Shape Up gives no estimate and shows uncertainty on a hill chart. | This is the owner's own mechanism. The industry evidence supports counting items and tracking cycle time, and Shape Up chapter 13 says estimates do not show uncertainty. | §39 [V]; mechanism [J] |
| An idea dump is raw input | Shape Up "raw idea" ("Interesting. Maybe some day."; no backlog); Kanban "options" before the commitment point; Linear triage (accept, decline, duplicate, snooze) and Method ("if it's not a task, it doesn't belong in the tracker") | The vault's work-queue register keeps ideas and work together. | §39, §40 [V] |

## 43. What the industry does that the proposal misses

1. **A time box set before work starts, and a stop rule** (Shape Up appetite and circuit breaker; XP spike time box; Linear cycles; Scrum Sprint at most one month). The proposal has a size cap as an open question but no budget per item and no rule for what happens at the limit.
2. **A commitment point** (Kanban: before it, work supports the decision whether to deliver; Shape Up: the bet). The item should come into existence at commitment, with raw ideas and shaping outside it. The proposal implies this ("was set up with a written plan") but does not name the moment.
3. **Legitimate non-completion endings**: Linear initiative status Canceled; RFC postpone; Scrum "fulfilled or abandoned"; the vault's own deferred and dropped.
4. **A WIP limit** (Kanban practice; vault G-008, "one active item at a time"). A rule on how many items may be open at once is part of what an item is in a flow system.
5. **Class of service and fixed dates** (Kanban: expedite, fixed date, intangible, standard). The proposal's "must-be-true-by date" is the fixed-date class.
6. **Splitting rules** (Shape Up: break off a meaningful part; Linear: break into stages; INVEST "Small"; ActionableAgile split rate).
7. **Non-goals and risks in the plan** (Shape Up No-gos and Rabbit holes; design doc non-goals).
8. **Separation of the Definition of Done from acceptance criteria** (Atlassian).
9. **Health reporting during the work** (Linear project and initiative updates; GitHub project status updates; hill chart).
10. **Decision reversibility tiers** (Amazon: two-way doors take a lightweight process; vault change classes 0 to 4 do the same job for spec changes [J]).
11. **Recurring or ongoing work is not an item** (Linear: projects have an outcome or planned completion date). The proposal does not say where standing work lives.

## 44. Recommendation 1: size cap [J, with evidence]

**Recommendation.** Cap an item by elapsed time, set before work starts (an appetite), not by PR count, points or weight.

- **Working norm: one week or less. Hard cap: two weeks.** An item that cannot fit is split into items that each have their own outcome and proof, or is promoted to a goal (§45).
- **At the cap the item stops** (circuit breaker): it is finished, cut down to the part that is done, or ended as postponed or abandoned. No automatic extension; extending is a new decision with a new appetite.
- **Research items get a shorter time box** than build items, because a research item buys a decision, not a product. XP spikes run a week or two at most.
- **Review the cap from the owner's own data once there are enough items**, using a Kanban Service Level Expectation ("85% of items finish in N days"), instead of keeping a number copied from other teams. With seven grouped items (§41) there is not enough data; how many are enough is a judgment I did not source.

**Evidence for the range.**

| Source | What it says about size | Label |
|---|---|---|
| Linear Method | Projects 1 to 3 weeks, 1 to 3 people; issues as small as possible | V |
| Shape Up | Small batch 1 to 2 weeks; big batch 6 weeks; appetite first; circuit breaker with no default extension | V |
| Scrum Guide | PBI Done within one Sprint; Sprint at most one month; work items of one day or less | V |
| Atlassian | Story fits a 1 to 2 week sprint; split items over about 16 hours or about 20 points; epic a month or a quarter | V |
| INVEST | "Small": a few person-weeks | V |
| XP spike | A pair for a week or two | V |
| Kanban | No size rule; SLE and WIP limits control flow | V |
| The owner's data | Grouped items took 0.1 to 5.0 days; PR p85 is 8 hours | V data, J grouping |

**Why time and not PR count.** PR count does not track elapsed time in the data (§41). Kanban counts items equally and forecasts from throughput; Shape Up sizes by appetite and drops estimates. Both avoid summing smaller weights. [J]

**What the cap does not settle.** The industry caps are for teams of one to three people working in weeks. The owner's items run in days, with agents doing most of the building. The range above is the industry floor and ceiling for the same job; the owner's data sits at or below the floor. Choosing 1 week and 2 weeks is my judgment between those two facts.

## 45. Recommendation 2: goal layer [J, with evidence]

**Recommendation.** Yes, keep a goal level above items, kept thin: an outcome with measurable results, one owner, and dates. Do not make it a container with its own plan or its own backlog.

**Evidence for a layer.**

- Linear: initiatives above projects, one owner, target date, five statuses, updates with health [V].
- Atlassian: initiatives above epics, multi-quarter [V].
- Scrum: a Product Goal, one at a time, "fulfilled or abandoned" before the next [V].
- Google OKRs: 3 to 5 objectives, about 3 key results each, outcomes with evidence, graded 0 to 1.0 [V].
- Asana goals and Notion goals through relations [V for Asana object hierarchy; Notion goals [S]].
- GitHub milestones: due date and completion percentage over issues and PRs [V].
- The vault already has one: Campaign (intent, target outcome, exit criteria), with a named failure mode, Campaign drift [V].

**Evidence against a heavy layer.**

- Shape Up has none above a bet: no backlogs, bet one cycle at a time [V].
- Linear's Method says not to invent terms and to keep scope small [V].
- Kanban and Scrum put forecasting on measured history, not on a plan layer [V].

**The two dates.** The proposal's "stretch date" and "must-be-true-by date" map as follows.

| The owner's date | Closest industry idea | Label |
|---|---|---|
| Must-be-true-by | Kanban class of service "fixed date": the impact of delay occurs at a specific date. Use it only where a real external clock exists (for example an election date). | V (definition); use [J] |
| Stretch | OKR stretch grading (60 to 70% is the sweet spot); Linear's single target date | V |
| A forecast date | Kanban SLE and Monte Carlo from item throughput ("85% by this date"); Scrum: only what has happened informs forecasts | V |

I recommend keeping must-be-true-by as a hand-set fixed date, and replacing the hand-set stretch date with a forecast from item throughput once enough items exist; until then the stretch date is an aspiration to be graded, as OKRs do. [J]

**What a goal contains, as a minimum.** One outcome, one owner, results that carry evidence (OKR: not a to-do list), the must-be-true-by date if any, a state (Linear's Proposed, Planned, Active, Completed, Canceled is a ready list), and its items. The owner's observed items finish in days, so a goal is needed only when dates or outcomes span several items [J].

## 46. Recommended vocabulary: adopt, do not invent

Reason: Linear's Method says "Don't invent terms if possible", and the vault already named Linear as the later tracker (G-008).

| Need | Adopt | From | Instead of | Note |
|---|---|---|---|---|
| The generic unit | **work item**, with **work item type** for the kinds | Kanban glossary; Jira | a new noun | "Item" alone is fine in conversation; the work-queue register already uses it. |
| Kinds | Build; **spike** (research, time-boxed, answers a question); **decision** (ends in an ADR or ledger entry); operation | XP; ADR; Kanban types | "research item ends in a founder decision" as the only research kind | If research must end in a decision, call it a decision item with a research phase; keep "spike" for a pure question. [J] |
| Plan | **pitch** (Problem, Appetite, Solution, Rabbit holes, No-gos), or the existing **handoff** | Shape Up; vault handoff-v2 | "plan description" | Handoff-v2 already has outcome, work, decision rights, done-criteria, report. |
| Time budget | **appetite**; **circuit breaker** | Shape Up | a new cap name | |
| Proof of done | **Definition of Done** (the bar) plus **acceptance criteria** (per item); live check = "done means deployed" | Scrum; Atlassian; Shape Up | "proof of done" | Vault says "done-criteria" already. |
| Owner | **owner** (Linear lead or assignee) and **approver** (DACI) when different | Linear; DACI | "one owner who accepts" | Keep one accountable owner. |
| Before commitment | **raw idea**, **option**, **triage**, **commitment point** | Shape Up; Kanban; Linear | "idea dump" | |
| Flow | **WIP limit**, **cycle time**, **throughput**, **work item age**, **Service Level Expectation** | Kanban Guide | a custom weight for flow | |
| Weight | **estimate** (optional), **appetite** | Linear; Shape Up | PR weight rolled up | Keep the PR weight experiment separate [J]. |
| Goal layer | **initiative** (Linear, Atlassian) or **goal** (Asana, Scrum Product Goal); vault **Campaign** is the existing term | | "goal with stretch and must-be-true-by dates" | Pick one name; do not run Campaign and Goal together. |
| Dates | **target date**; **fixed date** class of service; **forecast** (percentile) | Linear; Kanban | "stretch date" | |
| Endings | **done**, **canceled**, **postponed** (RFC), **abandoned** (Scrum) | Linear; RFC; Scrum | | The vault has deferred and dropped. |
| Decision roles | **driver, approver** (DACI); **decide** (RAPID) | Atlassian; Bain | | Already in `decision-rights.json`. |
| Calendar milestone | Avoid "milestone" for events: in Linear a milestone is a stage inside a project; in GitHub it is a dated group of issues and PRs | Linear; GitHub | | Name conflict with the calendar milestones in Parts 1 to 4. [J] |
| Project | Avoid the SAD sense (an entity) in work talk | SAD v3 line 139 | | Linear and Shape Up use "project" for 1 to 6 weeks of work. [J] |

## 47. The definition, revised against the evidence [J]

A work item is committed work with one outcome, a written plan made before work starts, a time box, a proof of done that someone other than the doer can check, one accountable owner, and a named approver when that is a different person. It ends in done, or in an explicit stop (canceled, postponed, abandoned).

- **Types.** Build (done = Definition of Done met and live, with PRs as pieces); spike (done = question answered within the time box); decision (done = decision logged, with accepted, rejected or postponed all counting); operation (done = the checkable state holds; no PRs required).
- **Not items.** PRs (pieces), raw ideas and options (before commitment), standing or recurring work (outside the item model).
- **Goal.** A goal is an outcome with an owner and dates; items belong to at most one goal.

This is a proposal for the owner to accept, change or reject; nothing in the vault has been changed to match it.

## 48. Open decisions for the owner

1. **Time cap:** one week norm and two weeks hard, or another range; and whether research items get a shorter time box than build items.
2. **Research item ending:** a logged decision only (as proposed), or also a spike that ends in an answer; and whether "postponed" and "rejected" count as done.
3. **Owner versus approver:** one accountable owner with an approver named when different, or one person who does and accepts (the vault splits acceptance by class today).
4. **Where ideas live:** keep ideas and work in one register (as the work-queue does now), or move ideas to a separate list and keep only committed items in the queue.
5. **Goal layer name:** Campaign (existing), Initiative (Linear, Atlassian) or Goal (Asana, Scrum, OKR); and whether the stretch date is replaced by a forecast once item throughput exists.
6. **Fixed dates:** which goals carry a real external clock (class of service: fixed date).
7. **Weight:** keep the PR-weight-into-item mechanism, or count items and use cycle time, as Kanban and Shape Up do. Test both against measured cycle time before choosing.
8. **Name collisions:** "Project" (SAD entity versus a 1 to 6 week piece of work) and "milestone" (calendar event versus Linear or GitHub meaning).
9. **Handoff versus item:** is a handoff-v2 the written plan of a build item (recommended reading), and does a work-queue W-id become the item id?

## 49. Not verified or not covered [U]

- Y Combinator and Stripe memo habits: not examined (marked "if relevant").
- Basecamp product help pages: not read; Shape Up chapters only.
- Linear estimates page: fetch returned 404; scales are from a search snippet [S]. Linear does not appear to have an OKR object on the pages read; I did not search for one beyond those pages.
- Asana help-center hierarchy (goals above portfolios above projects above tasks): help page was empty on fetch [S]; the developer object hierarchy page was read [V].
- Notion goals through a relation: [S].
- Amazon's "one-way door" wording: it is in the 2015 shareholder letter, which returned 404; the 2016 letter (read) uses "two-way doors" [V].
- The McKinsey "25%" claim sometimes attached to DACI: not on Atlassian's DACI page; unverified.
- Jira Plans (hierarchy levels above epics), Jira service work types: not read.
- Scrum.org material and the Scrum "Definition of Ready": not read; the 2020 Guide has no such term in the pages I read [J].
- Vault: only the files listed in §40 were read. Other SAD v3 amendment files were listed but not read in full.
- Sizes in §41 use my own groupings of the 35 PRs; they are not the owner's labels.

## 50. Part 5 sources

Industry pages [V] unless noted in §39 and §49:

- Linear: https://linear.app/docs/conceptual-model ; https://linear.app/method/introduction ; https://linear.app/method/scope-projects ; https://linear.app/method/write-issues-not-user-stories ; https://linear.app/docs/projects ; https://linear.app/docs/initiatives ; https://linear.app/docs/initiative-and-project-updates ; https://linear.app/docs/project-milestones ; https://linear.app/docs/use-cycles ; https://linear.app/docs/triage ; https://linear.app/docs/parent-and-sub-issues ; https://linear.app/docs/estimates [S, 404]
- Shape Up: https://basecamp.com/shapeup (chapters 03, 06, 08, 10, 13)
- Scrum: https://scrumguides.org/scrum-guide.html
- Kanban: https://kanbanguides.org/english/ ; https://kanban.university/glossary/
- Atlassian: https://www.atlassian.com/agile/project-management/epics-stories-themes ; https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/ ; https://support.atlassian.com/jira-software-cloud/docs/what-is-an-issue/ ; https://www.atlassian.com/agile/project-management/definition-of-done ; https://www.atlassian.com/agile/project-management/estimation ; https://www.atlassian.com/team-playbook/plays/daci
- GitHub: https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones ; https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues ; https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects
- Asana: https://developers.asana.com/docs/object-hierarchy ; Notion: https://www.notion.com/help/guides/getting-started-with-projects-and-tasks
- Amazon: https://www.aboutamazon.com/news/company-news/2016-letter-to-shareholders ; https://www.aboutamazon.com/news/workplace/an-insider-look-at-amazons-culture-and-processes ; https://aws.amazon.com/executive-insights/content/amazon-two-pizza-team/
- Google: https://rework.withgoogle.com/intl/en/guides/set-goals-with-okrs ; https://www.industrialempathy.com/posts/design-docs-at-google/
- Decisions: https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions ; https://adr.github.io/ ; https://raw.githubusercontent.com/rust-lang/rfcs/master/README.md ; https://www.bain.com/insights/rapid-tool-to-clarify-decision-accountability/ ; https://patterns.sociocracy30.org/consent-decision-making.html
- Research as work: http://www.extremeprogramming.org/rules/spike.html ; https://www.svpg.com/dual-track-agile/ ; https://xp123.com/invest-in-good-stories-and-smart-tasks/
- Forecasting: https://55degrees.atlassian.net/wiki/spaces/ActionableAgile/pages/2408972289/Monte+Carlo+When

Vault files read on the Mac (read-only): `<ecosystem-root>/sad/SAD_SKILL_v3.md`; `.../methodology/PSTACK_AND_SAD_COMPARISON_2026-10-14.md`; `.../templates/handoff-v2.md`; `.../systems/FOUNDER_OPERATING_MODEL_CAMPAIGN_2026-10-14.md`; `.../venture-template/decision-rights.json`; `<vault>/_meta/registers/{work-queue.json, work-queue.schema.json, work-queue.md}`; `<vault>/projects/<entity>/product/spec/AGENT_HANDOFF_CONTRACTS_2026-08-12.md`; `<repos>/<repo>/docs/handoffs/{index.json, PICKUP_AUTOMATION.md, WAITLIST_NEON_HANDOFF_2026-10-15.md}`; `<repos>/<repo>/docs/methodology/{sad-overview-for-a-project.md, sad-amendment-handoff-articulation-coverage-2026-05-31.md}`; data `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/data/prs.json` and `run4_more.py` item groupings.

---

# Part 6: Jev question set for item-level scoring (v3), tested on the five pilot items [V for measurements; J for readings]

## 51. What the owner asked for, and the six new rules

Rebuild the Jev question set so that it scores **work items**, not PRs, and test it on the five draft items in the GitHub project "MADSAD Pilot" (https://github.com/users/<owner>/projects/<n>, read-only with `gh` on the Mac). Rules from the owner, 2026-10-17:

| Rule | What it means for the question set |
|---|---|
| (a) | Planned weight comes from the written **7-part plan** (outcome, scope edges, surfaces touched, expected PR slots, proof, dependencies and decisions, appetite), never from a title. |
| (b) | **Verified** needs a user to reach the feature **through the UI**, proven by a UI check; the Deploy Worker result is only the first of two checks; data-only loads need a live-check line. |
| (c) | Scoring is **per item** (build, research, decision-ops); nothing shipped so far counts as complete, because front end and back end lack API contracts. |
| (d) | Newsworthiness is judged **per item, when verified**. |
| (e) | Jev makes **every judgment**; plain code does arithmetic and composition. |
| (f) | **Pin a versioned model id** (jev-1.13.0 and jev-1.14.0 compared; `jev-latest` moves around Oct 21) and log it with every score. |

Part 4 lessons applied (§27, §35): one concept per question; criteria for both answers on every Noul; evidence supplied as named state; Score levels that are concrete situations; Choice with `none_of_these`, asked forward and reversed; held-out and repeat checks; thresholds and weights in one reviewable code file; separate missing evidence, model error, code error, service failure.

## 52. Method, safety and what was run

- **Where:** the Mac, scripts in `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/` (`qset6.py` questions and state builders, `compose6.py` arithmetic and thresholds, `data6.py` test data, `run6.py` runner, `an6.py` analysis, `log_scores6.py` score log). The key is read only by the existing `jev.py` (environment or the repo's gitignored `.env.local`); no new script reads, prints, logs, copies, moves or writes it. A scan of every new output file for a bearer header or key assignment found none. No staging, commit or push; nothing under `.cursor/`; **no write to GitHub or the project** (the five items were read with `gh project item-list`).
- **Pinned models:** the requests name `jev-1.13.0` and `jev-1.14.0` directly (both accepted). The returned id matched the requested id on all 1,098 requests and is stored with every answer (`out6/*.json`, field `returned_model`) and in the score log `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/pilot_scores_2026-10-17.jsonl`, together with short hashes of the question, composition and data files (`qset6 4f18a17ce1f1`, `compose6 da750e3b1a68`, `data6 3c91b47e85b1`).
- **Frozen first:** the questions, levels, thresholds and formulas were written, and the files hashed, **before any v3 output was read; none was edited afterwards** [V: the hashes above are of the files as run]. The only wording written with Part 4 knowledge is the feedback injection guard (§58).
- **Test data:**
  - **Real:** the five pilot items; four real merged PRs (#135, #99, #121, #118) with their real Deploy Worker records.
  - **Synthetic (written by me, labelled `SYNTHETIC` in `data6.py`):** 8 plan descriptions S1 to S8; 10 evidence packets E1 to E10; 8 newsworthiness cases N1 to N8; 8 new feedback texts s25 to s32 (held out from the guard fix).
- **Variants:** `a` primary (3 identical repeats); `d` paraphrased **question text** with the same criteria and levels (2); `ar` plan fields (or evidence fields) in **reversed order** (2 or 1); `p` **paraphrased plan text** written by me for the five items and for S1 to S5 (2); `t` **title only** (the five real items with no plan, title shown as a distractor); `thin` the five real plans cut to outcome and appetite only (2). Every Choice runs forward and reversed inside each request. Both models for everything.
- **Requests:** plan 252, weight 252, evidence 324, newsworthiness 110, feedback 160: **1,098**. **0 failures, 0 authentication failures.**

## 53. The question set in brief (60 distinct judgments, five requests)

State is named fields. The plan state is `{about, item:{item_type, plan:{the seven parts, "(not written)" where empty}}}` and **never contains the title** (rule a). The evidence state is `{about, item:{id, item_type, delivers}, evidence:{deploy_record, ui_check, live_check_line, database_checks, api_contract}}` with "(none recorded)" for empty fields. The newsworthiness request also gets a `verification` block that **code** computed from the evidence and labels as computed, so observed and inferred stay apart.

| Request | Questions (type) | Composed in code |
|---|---|---|
| **Plan completeness and plan quality** (10) | One **Score per plan part** (7; four stand-alone levels each: 0 missing or deferred, 1 vague, 2 partly specific, 3 specific and checkable); `too_thin` (Noul: could two reasonable people disagree widely about its size?); `quality` (Choice forward and reversed: complete / usable_with_gaps / too_thin_to_weigh / none_of_these) | **Plan quality output:** `scored` if the four core parts (outcome, scope edges, surfaces, PR slots) are all at least 2.0 and `too_thin` < 0.5; `too_thin` (not scored) if any core part < 1.5 or `too_thin` ≥ 0.7; otherwise `uncertain`. Lists the parts below 2.0 (gaps) and below 1.0 (missing). Jev's direct verdict is shown beside it. |
| **Planned weight** (22) | Scores: `size_outcome` (5 levels), `spread` (4), `dependency_load` (4), `unknowns` (4). Choices (fwd and rev): `slot_count` (none / one / two_or_three / four_or_more / not_stated), `appetite_fit` (too_small / plausible / generous / no_appetite). Nouls: PR slot types (`slot_app_code`, `slot_schema`, `slot_data_load`, `slot_deploy_config`, `slot_no_pr`), surfaces (`touch_database`, `touch_public_ui`, `touch_outside_system`), risk (`risk_schema`, `risk_deploy`, `risk_auth`, `risk_prod_write`, `risk_irreversible`), `plan_defers_scope` | **W = S + P + F + V + R + D + U + A**, soft expected values: S = 1 + 1.75 × size (1 to 8); P = expected PR-slot points (none 0, one 1, 2 to 3 → 2, 4 or more → 3) + max(schema, data load); F = ⅔ × spread + outside system; V = 2 × public UI; R = 2 schema + 2 deploy + auth + prod write + irreversible; D = ⅔ × dependency load; U = ⅔ × unknowns; A = p(appetite too small). **Reported only when plan quality is `scored`.** |
| **Verified-unit evidence** (9 Nouls) | `ev_deploy_succeeded` (migration and deploy jobs both succeeded on the last PR's merge or a later push to main), `ev_ui_check_recorded` (address or screen named and what appeared; a DB row, API response, deploy record, test or "it works" does not count), `ev_ui_check_production`, `ev_ui_check_passed`, `ev_db_or_api_only` (diagnostic), `ev_live_check_line`, `is_data_only`, `ev_contract_written`, `ev_contract_checked_both_sides` | **check 1** = deploy result (or the live-check line when `is_data_only` ≥ 0.5); **check 2** = min(UI recorded, on production, passed); **verified** = min(check 1, check 2) ≥ 0.7; **complete** = verified and written contract checked on both sides ≥ 0.7. Bands: ≥ 0.7 yes, < 0.3 no, between uncertain. |
| **Newsworthiness for a UI-reachable item** (13) | The three gates restated: G2 `g2_ui_reachable` (an outsider can reach it through a named public address or screen); G3 `g3_credential`, `g3_named_people`, `g3_unverified_claims`; G1 is the code-computed `verified`. Q1 to Q5 (Nouls): `q1_new`, `q2_measured`, `q3_seam`, `q4_pull`, `q5_time`; `builder_only`; tier: `tier_score` (Score, five outcome levels) and `tier_choice` (forward and reversed) | Not judged unless verified (rule d). M0 if G3 fails (credential, or named people with no source check ≥ 0.5) or G2 < 0.3; otherwise the rounded `tier_score`, capped at M1 with a "b" suffix if builder-only; "?" if G2 is uncertain. A **ladder tier** from Q1 to Q5 (the §11.6 rules; cannot reach M4) is computed beside it for comparison. |
| **Feedback class** (11) | Eight Nouls (data error, bug, request, question, praise, spam, names a person, answers the feedback question), `contains_instruction_to_system` (narrowed wording), Choice forward and reversed with `none_of_these` | Choice average as the label; Nouls flag multi-label and injection ≥ 0.7. |

## 54 to 60. [moved to the private evidence note: results on the pilot items]


## 61. What works and what does not [J, from §54 to §60]

**Works:**
1. **Plan quality as a separate, first output.** Thin, vague, title-only and thinned plans were flagged in 100% of runs on both models, and the flag agrees with Jev's own "too thin" question in 98% of runs. Without it a vague plan gets a normal-looking weight.
2. **Weight from a written plan** orders plans of different size correctly (18 of 18 runs) and is repeatable (sd about 0.05 to 0.08 points). Title-based planning in Part 4 had Spearman 0.28 and 0.08 against actual W (§32.4); this is not the same test (here the truth is my intended size), but the contrast is large.
3. **Evidence rules (b) and (c) are askable.** The UI-check, production, passed, live-check and contract questions separated 10 of 10 synthetic packets on both models, and rejected all real PRs, as the rules intend.
4. **The injection guard** (narrowed) and the feedback Choice.
5. **Both models behave alike** on plan quality, weight and evidence; cost is negligible.

**Does not (yet):**
1. **Weights are unvalidated.** No the owner labels exist for the five items; W adds my own formula (§53). The order of R3, R5 and R4 is inside the noise.
2. **Thresholds sit on common phrasing** ("None." for PR slots), and **a deferral can be paraphrased into a pass** (R2 on jev-1.14.0). The status rule needs either the `plan_defers_scope` Noul or a "none, and why" convention in the plan format.
3. **Specific is not true.** The part Scores rate how specific the text is. A plan that invents precise file names scores 3.0. Nothing here checks a plan against the repository [U, not tested].
4. **Rule (b) cannot be met by research and decision-ops items** as worded (no UI exists for a note or a calendar setting), so all of R2 to R5 would stay "not verified" forever. That is a rule gap, not a model finding.
5. **Newsworthiness:** G2 is unstable; the Q1 to Q5 ladder is worse than the direct tier; tiers differ between models in 7 of 30 runs; tested on synthetic items only.
6. **Same-author risk:** I wrote the questions, the five plans, the synthetic cases and the intended answers. Passing them shows the questions do what I meant, not that they handle plans written by someone else.

## 62. Open decisions for the owner

1. **Is the plan-quality rule right?** Core parts at least 2.0 and `too_thin` < 0.5 to be scored; below 1.5 or `too_thin` ≥ 0.7 to be held back. Should "None." for PR slots count as specific (the post-hoc fix is to lower the PR-slot bar or require "none, because …" in the plan format), and should a plan that defers its own scope ever be scored? Today R2 is held back (not scored).
2. **What "verified" means for research and decision-ops items.** Rule (b) as written needs a UI. Proposal [J]: for those types, the first check is the plan's own proof line met and recorded, the second is a named person's acceptance; Build items keep deploy result (or live-check line) plus UI check. Also whether to rename the project's Verified option "Live-checked" to something that says UI-checked (no change made to GitHub; needs your approval).
3. **Data-only first check:** I read "data-only loads need a live-check line" as replacing the deploy record as check 1 (the UI check stays check 2). Confirm, or require both the deploy result and the live-check line.
4. **"Complete" bar:** a written back-end to front-end interface description plus a check of both sides against it (a contract test or generated types). Is that the bar for rule (c)?
5. **Which model id to pin.** `jev-1.13.0` and `jev-1.14.0` agree closely on plan quality, weight (Spearman 0.99) and verification, and differ on tier (23 of 30). Recommendation [J]: pin **jev-1.14.0** for new scores, since `jev-latest` moves to it around Oct 21, and keep logging both until then; a score is only comparable within one id. Your call.
6. **Which tier method:** direct `tier_score` with gates in code (more accurate on my cases, not the §11.6 ladder) or the ladder (the rule as published, cannot reach M4).
7. **Ground truth:** label the five pilot items yourself (heavier, same or lighter than my W; a tier once verified) and the held-out PR sheet; without that every number here is Jev against my own rules.
8. **W formula:** keep V (visible UI +2) and P (PR slots) as fixed points, or score effort alone and keep exposure separate? A typo fix currently weighs 4.7.
9. **Writing scores to the project:** nothing was written (Planned weight is empty on purpose). With your approval I would write W only for items whose plan quality is `scored` (today R1, R3, R4, R5), as `planned, scored by jev-1.14.0, unreviewed`, and leave R2 empty until its front half is written.
10. **Who writes plans:** the five plans were written by me an hour before scoring. A plan written by you is the real test of the plan-quality questions.

## 63. What this part does not establish [U]

- No ground truth from the owner for any weight, tier or gate; synthetic items, intended tiers and the five plans are mine; S5's intended size is subjective.
- Plans with fabricated specifics, very long plans, non-English plans and plans containing instructions to the scorer were not tested.
- Four real PRs and five items with no evidence are the only real evidence tested; every positive evidence case is synthetic and tidy.
- The feedback guard check has two benign requests and two injections in the held-out set.
- `jev-latest` after Oct 21 and any later model were not tested; the returned ids were 1.13.0 and 1.14.0 only.
- Thresholds (0.7 and 0.3, 2.0 and 1.5, the W formula, tier rounding) are my starting values; they were not tuned and were not validated.

## 64. Part 6 sources and files

- TypeSafe: `~/.claude/plugins/cache/typesafe-ai/typesafe/0.5.7/skills/typesafe-ai/SKILL.md`; https://docs.typesafe.ai/api.md ; https://docs.typesafe.ai/primitives/score.md ; https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md (read on the page). Part 4 lessons: §27 to §37.
- Items: the project https://github.com/users/<owner>/projects/<n> (read with `gh project item-list`, read-only); the decision record in `MADSAD_GITHUB_PROJECTS_RESEARCH_2026-10-17.md`; the template `MADSAD_RESEARCH_TEMPLATE_2026-10-17.md`; real PR evidence from `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/data/{prs,deploy_record}.json` (Part 4).
- Code and outputs, on the Mac only: `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/{qset6.py, compose6.py, data6.py, run6.py, an6.py, log_scores6.py, pilot_items_create.py}`; `data/pilot_items.json`; `out6/` (1,098 answer files, each with the returned model id and token usage); `pilot_scores_2026-10-17.jsonl` (the score log, one line per item and model). No key is in any of them.

---

# Part 7: Build verification from first principles (decided 2026-10-17)

## 65. Status and how to read this part

This is a **decision record**. The owner decided the six rules below on 2026-10-17 **[D]**. Each rule is written the same way: the rule; the premise that was attacked; why the premise fails; what replaces it. Where a sentence is my reading and not his decision it is marked **[J]**.

- **What it changes:** it replaces or narrows several rules and open questions in Part 6 (listed in §72). Where Part 7 and Part 6 differ, Part 7 governs.
- **What is not done yet:** the questions and thresholds in `~/workspace/vault/everything-ecosystem/MAD/evals/madsad-pilot-2026-10-17/qset6.py` and `compose6.py` still follow Part 6. Nothing has been re-scored under these rules, the plan template has not been changed, and no GitHub project item was touched when this part was written.
- **The question that sits under every rule:** *what evidence would make a skeptic accept this claim, and could that evidence have come out the other way?* Evidence that could not have come out the other way is not evidence.

## 66. Rule 1: what counts as a specific plan (plan quality) [D]

**Rule.**
- For **research and decision-ops** items, "None." in *expected PR slots* counts as specific. It is a complete answer.
- For a **build** item, "None." in *expected PR slots* flags the plan as **too thin**. A build changes something that lives in a repository, so a build with no PR slot has not said where its work lands.
- A plan that **defers its own scope** (for example "to be set later", "scope to be fixed in the front half") stays **unscored** and **cannot reach the calendar** until it names its scope edges.

**Premise attacked.** Part 6 used one bar for every item type: a PR-slots part scores 3 only if it says how many PRs and what each holds, "or says none are expected and why". That made a bare "None." sit on the threshold (Part 6 §54, fragility 2) for all item types alike.

**Why it fails.** "No pull request" means different things by type. For a note or a calendar setting it is the whole truth; asking "and why" adds ceremony and no information. For a build it is a contradiction or an omission, because the item exists to change code. One bar for every type produced `uncertain` results on honest plans (R3, R5, S5) and, for builds, would have let an empty slot pass.

**Deferred scope.** Part 6 §54 showed that a deferral can be reworded into something that looks like a scope (R2's paraphrase scored 2.57 to 2.70 on jev-1.14.0 and flipped to `scored`). A plan that says its scope is undecided has not finished planning, however the sentence is worded. Reading the part as "how specific is this text" is the wrong test; the right test is "has the plan fixed its own edges".

**What replaces it.** A type-aware rule for the PR-slots part, and a hard stop for deferred scope: such an item is not weighed and does not appear on the calendar until scope edges are named. Today this holds back the research item "backend-to-UI API contract" (its scope is deferred to the owner's front half). **[J]** The `plan_defers_scope` question from Part 6 is the natural signal for the stop; it was not used in the Part 6 status rule.

## 67. Rule 2: data-only items [D]

**Rule.** For items that load or change data **outside the deploy workflow** (data-only items), the first check is a **live-check line in the closing note**: what was queried on production, the result, and the date. The second requirement is **a named person's acceptance**.

**Premise attacked.** "Every item needs the Deploy Worker result as check 1 and a UI check as check 2" (Part 6 §53, rules (b) and (c) as first asked).

**Why it fails.** A data-only load does not go through the deploy workflow at all (Part 4 §29: the Deploy Worker applies migrations and publishes code on pushes to main; loads and replays are separate). A green deploy run says nothing about whether the rows are there and correct. A database row count says the rows exist, not that anyone can read them or that they are right (Part 6 §56: a count alone was rejected as proof). A live-check line is evidence that could have come out the other way: the query could have returned nothing or the wrong value. A named person's acceptance replaces a UI check because there may be no interface to look at.

**What replaces it.** Live-check line (query, result, date) in the closing note, plus a named person who accepts. **[J]** If a data load also changes what a person sees, Rule 3 applies to the part that does.

## 68. Rule 3: build verification follows the build's claim [D]

**Rule.**
1. **A build is verified against what it claims, not against a universal UI check.** The UI check applies **only to builds that change what a person sees**.
2. **Before work starts, the plan names each claim the build makes and the test that would fail if the claim were false.** That test is the **proof line**.
3. **A build plan that cannot name such a test is too thin to score.**

**Premise attacked (the starting rule).** "Verified means a user reached the feature through the UI" (Part 6 §51, rule (b)). It was written for features a person sees. Applied to every build it asks the wrong question of a migration, an API handler, a refactor or a script: there may be no screen, and a screen check proves little about the claim.

**Why it fails.** Verification is evidence for a claim. Different builds make different claims (a number is correct, an endpoint returns a field, a page shows a table, behavior is unchanged). The evidence that could refute each claim differs. A single check applied to all of them either asks for impossible evidence or accepts evidence that could not have come out the other way.

**Premises attacked while building the rule, and what each became.**

| Premise | Why it fails | What replaces it |
|---|---|---|
| **"The test must be real, not a mock."** | A mock can hide the very thing the claim is about. But "real" has limits here: production Neon main is off limits to tests (writes there go only through the one-writer procedure of the justice handoff, §56 and §78 of that handoff, not of this note), and real election results exist only on election night. | The test must **exercise the code path the claim is about**. Where the real thing cannot be used (production main, election night), the plan says what stands in for it and which part of the claim that leaves unproved. |
| **"A test must fail before the change and pass after."** | Right for new behavior or a bug fix. Wrong for a refactor, where the claim is "behavior is unchanged" and the test must pass **both before and after**. A test that cannot fail for the reason the claim names proves nothing either way. | The test must be **capable of failing for the reason the claim names**. New behavior or fix: fails before, passes after. Refactor: passes before and after, and would fail if behavior changed. |
| **"One test per claim is enough."** | A green test can assert the wrong thing: it can pass because it checks something near the claim, not the claim. | A passing test counts only if the claim and the test's assertion are the same statement. A reviewer can read the pair **[J]**. Rule 4 adds who writes the proof when the stakes rise. |
| **"The plan must fix the exact test in advance."** | Fixing the exact test code up front is impossible and would block good refinements. | The **claim and the shape of the test** are fixed up front. The exact test may be refined **within the appetite**. Changing the claim, or weakening what the test would catch, is a new plan decision. |
| **"Tests are the only acceptable evidence."** | Some claims are not testable by code: a live system fact, a human judgment about wording, layout or tone. | Some claims need a **live check** (as in Rule 2) or a **human judgment** by a named person. The plan names which, and the evidence is recorded the same way. |

**What replaces the universal rule.** Each build plan has, for every claim: the claim in one sentence, the evidence that would refute it, and the test or check that gathers that evidence. The UI check is one kind of such check, required for claims about what a person sees. **[J]** A build that changes what a person sees but whose plan names only a database check has not named the test that would fail if the claim were false, and is too thin to score.

## 69. Rule 4: who writes the proof scales with weight [D]

**Rule.**
- **Light builds:** the builder's own proof, plus a check.
- **Heavy builds, and any build that touches production data, authentication or the SAD spec:** a test the builder did **not** write, **or** an independent attacker who tries to break the finished work. The Spec and QA teammate is a candidate for that role.
- **The weight threshold for "heavy" is left open**, to be calibrated in the pilot.

**Premise attacked.** "The builder can write the proof for their own work." A builder who misreads the claim writes a test that agrees with the misreading, and then both the code and the proof are wrong in the same way. The proof is only independent evidence if it could have come out the other way, and the author of the code is the person least able to imagine how it fails.

**Why it fails, and why not always.** Independent proof for every item would cost more than most builds are worth. The risk is not uniform: a typo fix and an authentication change do not deserve the same scrutiny. Weight is already a measure of effort and exposure (Part 6 §55), so it is a usable proxy for how much independent attention a build deserves. The three named areas (production data, authentication, the SAD spec) are included regardless of weight; my reading of why is that a failure there is hard to undo **[J]**.

**What replaces it.** A proof-authorship rule by weight and by area. The threshold is unset on purpose; the first pilot items give the data to place it.

## 70. Rule 5: standing system checks [D]

**Rule.**
- A build counts as **verified** only when **its own proof passes AND a small standing set of system-level checks passes after merge** (key user journeys; front-to-back contracts).
- **Each build names which standing checks it could affect**, and **adds the matching check when it adds a journey or a contract**.
- **Standing checks are their own work item type**, with their own planned weight.
- **Keep the set small**, to avoid flaky-check fatigue. **Each failure is reported against the merge that caused it.**

**Premise attacked.** "If every build's own proof passes, the system works." Each proof tests one claim in isolation. Nothing tests the seams between builds, and the seams are where the pieces fail to meet.

**Evidence.** Stated by the owner on 2026-10-17: the Texas election data is in production but **unreachable from the frontend**. The builds that put the data in production each passed their own proof; no check asked whether a person could get from the page to the data. That conclusion is his statement and was not re-checked in this part **[U]**. It is the reason Part 6 rule (c) said nothing shipped counts as complete.

**Why a small set.** A large suite that fails for reasons unrelated to the merge teaches people to ignore it. A short list of journeys and contracts that matter, each owned and each reported against the merge that broke it, keeps the signal. A standing check is work that needs planning and maintenance, so it is a work item with a weight like any other.

**What replaces it.** Verified = own proof passes **and** the standing set passes after merge. **[J]** The first standing checks to propose are the journeys that today do not work end to end (page to election data); which ones belong in the set is not decided.

## 71. Rule 6: contract only where the UI consumes the backend [D]

**Rule.** This **replaces** the earlier idea (Part 6 §53 and §62.4) that a build is **complete** only if a written back-end to front-end API contract exists and both sides were checked against it. A contract is needed **only where the build's claim involves the UI consuming the backend**.

**Premise attacked.** "Every shipped build needs a written API contract checked on both sides to count as complete."

**Why it fails.** Many builds have no consumer on the other side (a migration, a script, a research note, a back-end-only job). Demanding a contract for them is empty work. Where a front end does consume a back end, the missing contract is exactly the seam Rule 5 guards; there the contract (or a check that fails when the two sides drift) is the proof of the claim, as Rule 3 requires.

**What replaces it.** The claim in the plan says whether a UI consumes the backend. If it does, the plan names the contract (or the equivalent check) and the standing checks that cover the seam. If it does not, no contract is required.

## 72. What changes in Part 6 [J]

| Part 6 text | Status after Part 7 |
|---|---|
| §53 "complete = verified and written contract checked on both sides" and §62.4 | **Replaced** by Rule 6 (contract only where the UI consumes the backend). |
| §53 "check 2 = UI check" for all items; §51 rule (b) as the universal definition of verified | **Narrowed** by Rule 3 (UI check only for builds that change what a person sees; every build is verified against its named claim) and **extended** by Rule 5 (standing checks after merge). |
| §62.3 data-only first check (live-check line replaces deploy result) | **Decided and extended** by Rule 2 (live-check line in the closing note, plus a named person's acceptance). |
| §62.1 plan-quality thresholds, "None." for PR slots, and deferred scope | **Partly decided** by Rule 1 ("None." by type; deferred scope stays unscored). Other thresholds remain open (§73). |
| §54 fragility 1 (a deferral paraphrased into a pass) and fragility 2 ("None." on the bar) | **Both answered** by Rule 1; the code does not implement the answers yet. |
| §62.2 verified for research and decision-ops items (my proposal: the plan's proof line met plus a named person's acceptance) | **Not decided in Part 7**; still open (§73). |

## 73. Still open

1. **Plan-quality thresholds beyond Rule 1:** the core-part bar (2.0 and 1.5), the `too_thin` probability bars (0.5 and 0.7), and how the type-aware PR-slot rule is written into the questions.
2. **Tier method:** direct tier score with the gates in code, or the published Q1 to Q5 ladder (Part 6 §57, §62.6).
3. **Labels from the owner for the pilot items:** heavier, same or lighter than the machine weight for the five items, and a tier once any is verified; also the held-out PR sheet.
4. **Weight formula fixed-point terms:** whether the visible-UI term (+2) and the PR-slot term stay as fixed points or exposure is scored separately (Part 6 §62.8).
5. **Who writes plans:** plans written by the owner, not by me, are the real test of the plan-quality questions (Part 6 §62.10).
6. **Renaming the project's "Live-checked" option** (Verified field) so it no longer implies a UI check. This needs the owner's approval; no GitHub change has been made.
7. **The weight threshold for independent proof** (Rule 4): which weight and which areas are "heavy". To be calibrated in the pilot.
8. **Carried from Part 6, not covered above:** what "verified" means for research and decision-ops items (§62.2), and which model id to pin for new scores (§62.5).

## 74. Proposal only, not decided: a change to the plan template

The seven-part plan (outcome, scope edges, surfaces touched, expected PR slots, proof, dependencies and decisions, appetite) may need an added element to carry Rules 3, 5 and 6, for example **consumer / claim / test / standing checks**:
- **consumer:** who or what uses the result (a person looking at a page, a front end calling an endpoint, nothing);
- **claim:** each statement the build makes, in one sentence;
- **test:** for each claim, the check that would fail if the claim were false (or the live check or the named human judgment);
- **standing checks:** which standing system checks the build could affect, and which it adds.

This could fold into the existing *proof* part or become an eighth part. **Nothing has been changed**; the existing template, the pilot items' plans and the Part 6 question set are as before. The decision, and the wording, belong to the owner.

# Part 8: One item, one system (decided 2026-10-17)

## 75. Status and how to read this part

This is a **decision record**. The owner decided the rule in §76 and the direction in §82 on 2026-10-17 **[D]**. Everything else is marked: **[J]** is my reading, **[P]** is a proposal that needs his approval, **[V]** is something I checked.

- **What it adds:** a scope rule that sits in front of plan-quality scoring (Part 6) and build verification (Part 7). A plan that fails it is not scored.
- **What is not done yet:** nothing was split. The project item <item> and PR #131 are unchanged. No GitHub project item was touched and nothing was written to any repo when this part was written. The Part 6 questions, the plan template and the project fields are as before.
- **Where Part 8 and earlier parts differ,** Part 8 governs the question "may these two things be one item?". Parts 6 and 7 still govern how a single-system item is scored and verified.

## 76. The rule [D]

**Every work item and every PR answers one question about one system.** A system is one owning part of the monorepo. Unrelated systems are never bundled in one item or one PR.

**The evidence that led to the rule [V].** <item> and PR #131 bundled two pieces of work:
- a MapLibre rebuild of the explore maps (about 20 files in `harnesses/social-web/src`, plus a content security policy change in `next.config.ts`), and
- the Better Auth feasibility report for identity (`handoff-results/identity-c1.md`, 212 lines).

Better Auth has nothing to do with maps. Three things went wrong:
- the plan was hard to judge: one proof line carried six claims (§68 in Part 7 asks for one test per claim, and here the claims belong to different systems);
- the decisions were tangled: the report that needs Architect review sat inside a PR that also held the maps rebuild, and that PR is in conflict with `main` **[J]**;
- it was unclear which part of the monorepo owns the work, so it was unclear who reviews it (see §83, open item 1).

## 77. (a) The test for the rule [D, wording J]

A plan passes when all of these hold:
1. **One owning system is named.** The plan says which part of the monorepo owns the result (a path, for example `platform/mcp` or `harnesses/social-web`, or a named system such as "identity").
2. **One question is named.** The outcome can be written as a single question about that system ("can Better Auth carry our users and sessions?"). If the outcome needs "and" to join two unrelated questions, it is two items.
3. **Scope edges and surfaces stay inside that system.** If the scope edges or the surfaces-touched list span **two unrelated systems**, the plan is **too wide**. It must be **split before it is scored**. It does not get a planned weight, and it cannot reach the calendar, in the same way as a plan that defers its own scope (Part 7, Rule 1).
4. **Each PR maps to exactly one item and one system.** A PR that touches an unrelated system needs its own item first.

**What counts as unrelated [J].** Two surfaces are related when one is a consumer of the other in the claim being made (a page and the endpoint it calls, a table and the code that reads it). They are unrelated when removing one changes nothing about whether the other's claim is true. Shared plumbing that every change needs (the lockfile, a generated file, the handoff index) does not count as a second system, but it should be named in the plan. A change to something that every page loads, such as the content security policy, **is** a surface in its own right and must be named.

## 78. (b) An "owner system" field [P]

**Proposal only, needs the owner's approval. Nothing has been written to the project.**

- **In the plan description:** add a line to the plan (or to its surfaces-touched part): *Owner system: one name, with the path that owns it.* Optionally add *Question:* with the single question in one sentence.
- **In the project:** one new single-select field **Owner system**, with one option per system. The options would come from the repo's own ownership map (`ownership.json`, `CODEOWNERS`) once §83 item 1 is settled, so that the field uses the repo's names and not a second list.
- **Cost to weigh [J]:** the project has 24 of 50 field slots used, so the slot is not the limit. The cost is that the option list must be kept equal to the repo's ownership map, or the field drifts.
- **What to leave alone:** the existing fields, the five pilot items and their Verified options.

## 79. (c) How splitting works [D for the principle, J for the steps]

A bundled item is split into **separate items**. Each new item has:
- its own **seven-part plan** that names its one system and question;
- its own **claim and test** (Part 7, Rule 3);
- its own **approver** (the person who accepts that system's result);
- its own **planned weight**, scored after the split, from the new plan, not carried over from the old one;
- its own PR or PRs.

**The model is the waitlist split [V].** The earlier <item> included a waitlist workstream. On 2026-10-15 it was split off into <item>, with its own handoff, its own PR (#135, merged) and a follow-on <item> (<reference-project> #1, done). PR #131 kept the maps and the identity report and said not to invent waitlist schema in it. That split was clean because each part got its own handoff, owner and PR.

**What the split does to the old item [J].** The old item should not be left as a half-empty bundle. Either it becomes one of the new items (keeping its id for the part that continues) or it is closed with the ending Canceled and a pointer to the new items. Which one is the owner's choice at the time of the split. Weights, verified state and decision records already written on it are not copied to the new items.

## 80. (d) How this interacts with Part 7 and Part 6

**With Part 7 [J].**
- **Claims and tests (Rule 3):** one system gives a short list of claims that one reviewer can judge. A bundled plan mixes claims whose tests live in different systems, and nobody can say whether the proof line covers them.
- **Who writes the proof (Rule 4):** the weight and the "touches auth" test are set per item. A bundled item hides an auth-related part inside a lighter maps build, so it could be judged as light. Splitting lets the identity item be judged as the heavy item it is.
- **Standing checks (Rule 5):** each item names the standing checks its own system can affect. After a split the list is short and specific (maps: the explore-maps journey; identity: the sign-in journey).
- **Verification:** an item is verified on its own proof and the standing checks. One item cannot be held up by a different system's failing check.

**With Part 6 plan quality [J].** The rule is checked **before** the seven-part quality score. A plan that spans two systems gets `too_wide`, not a weight. Part 6 already has `scored`, `uncertain` and `too_thin`; `too_wide` would be a fourth status for the same purpose: the plan is not ready to weigh.

**Proposal only, not decided: a Jev question for scope-spans-one-system [P].** Following the Part 4 rules (one concept per question, criteria for both answers, evidence supplied as state):
- **Type:** Noul (yes/no), asked of the plan description with the repo's ownership map supplied as state.
- **Instruction (draft):** "Do the scope edges and the surfaces touched of this plan sit inside one owning system of the monorepo, and does the outcome answer one question? Answer false if two parts of the plan could each be done, reviewed and accepted without the other."
- **True means:** one system and one question. **False means:** two or more unrelated systems or questions.
- **Follow-up (Choice, only when false):** which listed surfaces belong to which system, so the split can be proposed.
- **Not tested.** Nothing was run. Before use it needs the held-out and order-reversal checks of Part 4, and a test set that includes <item>'s plan as a known-wide case, the five pilot plans, and a plan that touches shared plumbing only. **[J]** The hard cases are the ones in §77: shared plumbing and a change to something every page loads.

## 81. (e) Premises attacked, and what replaces them [D, wording J]

| Premise attacked | Why it fails | What replaces it |
|---|---|---|
| **"Related enough to ship together."** Two pieces belong in one item because they came from one handoff or one theme (here "consolidation"). | A shared source is not a shared system. A handoff theme says why the work was grouped, not who owns it or who can accept it. Judging "related" by feel lets any two pieces through. | The test in §77: one owning system and one question. A shared handoff may stay as the source of several items. |
| **"One PR is cheaper than two."** One PR means one review and one merge. | The saving is real only when one reviewer can judge the whole PR. A mixed PR waits for the slowest review, collects conflicts (PR #131 is behind `main` and in conflict), and cannot be reverted for one part without the other. | Cost is counted per item, not per PR. Two small PRs, each with its own claim, test and reviewer, are cheaper to accept than one that stalls. |
| **"The owner can be sorted out later."** Start the work, and decide who owns it when it is done. | The owner decides the approver, the reviewer and the standing checks, so those cannot be set at the end. In <item>, the Architect review of the identity report was the gate for the next phase, and the owner of auth was not settled. | The owner system is named in the plan before scoring. If it cannot be named, the plan is too thin to score, and naming it is the first work. |

## 82. [moved to the private evidence note: the current-state decision]

## 83. Still open (Part 8)

In the style of §73:
1. **Which part of the monorepo owns auth.** The repo's ownership map (`ownership.json` and the generated `CODEOWNERS`) assigns whole top-level paths: `/platform/` to the Architect position, `/harnesses/social-web/` to Product-design-lead with the Architect. Auth code sits in more than one of those paths. A read-only check made after this part was decided is reported separately; **no owner is decided here.** The owner system for the identity item cannot be named until the owner settles it.
2. **Whether the owner-system field is added** (§78), and with which option names.
3. **What "system" means in the list of options:** a top-level path, a package, or a named capability that cuts across paths (identity). This changes how the Jev question in §80 reads the ownership map.
4. **Whether `too_wide` is a new plan-quality status** or folds into `too_thin` (§80).
5. **What happens to the old <item> item and PR #131** (§79, §82): keep the id for the identity item or close it as Canceled; keep, close or park the branch; who resolves its conflicts if it is kept.
6. **Where the maps item goes** while maps is out of scope: a Postponed ending, or no item at all.
7. **Whether the Jev scope question is built and tested** (§80) and when.
8. Carried from Part 7 §73 and not changed by this part: plan-quality thresholds, tier method, labels for the pilot items, weight-formula fixed-point terms, who writes plans, renaming "Live-checked", and the weight threshold for independent proof.
