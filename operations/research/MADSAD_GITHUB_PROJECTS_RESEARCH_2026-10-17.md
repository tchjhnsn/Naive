---
publish: false
type: research
source: hybrid
created: "2026-10-17T17:30:00Z"
updated: "2026-10-17T18:50:00Z"
ai-model: grok-bot
authority: exploratory
decision-status: none
status: DECIDED
tags: [research, methodology, madsad, github-projects, linear, item-register, calendar]
research-phase: synthesised-mimetic
research-unit: madsad-item-register-tool
canonical: false
research-problem: "Should GitHub Projects hold the MAD/SAD item records, instead of or alongside Google Calendar and Google Tasks, and how should it divide the work with the five MADSAD calendars?"
governed-by:
  - "[[RESEARCH_METHOD]]"
related:
  - "[[MADSAD_CALENDAR_METHODOLOGY_RESEARCH_2026-10-16]]"
  - "[[MADSAD_HELD_OUT_LABELLING_SHEET_2026-10-17]]"
---

# GitHub Projects as the MAD/SAD item register (research item, 2026-10-17)

> **Template note.** No file called an approved research template was found in the vault (searched `everything-ecosystem/sad/RESEARCH_METHOD.md`, `everything-ecosystem/templates/`, and a grep for "research template"). This note therefore uses the front-half fields given in the request, the required frontmatter and the adopt/reject/transform/open obligations from `RESEARCH_METHOD.md`, and Part 5 §47's item definition (outcome, plan, time box, proof of done, owner, approver). If a different template exists, say where and I will re-cut the note.
>
> **Labels.** **[V]** verified: the page or command output was read this session. **[S]** secondary: a search synthesis or snippet, or a page I did not read in full. **[J]** my judgment. **[U]** unverified or not examined.
>
> **Rules kept.** Read-only everywhere. No project, issue, PR, label or setting was created, edited or deleted. Nothing staged or committed. Nothing under `.cursor/`. No token or key was printed or touched; `gh auth status` output was filtered to the account name and scope list.

## Front half (set from the request; not changed after the findings)

| Field | Content |
|---|---|
| **Item type** | Research item |
| **Why** | The owner asked whether GitHub Projects should be the MAD/SAD item register instead of, or alongside, Google Calendar and Google Tasks. |
| **Objective** | Decide the tool for item records and how it divides labour with the calendar. |
| **Source** | The MADSAD research note, Parts 1 to 5 (`MADSAD_CALENDAR_METHODOLOGY_RESEARCH_2026-10-16.md`, same folder). |
| **Appetite** | One pass, no more than about 90 minutes of work. |
| **Owner / approver** | Research by Grok Bot; decision by the owner. |
| **Done when** | Findings, a recommendation per decision owed, and a blank decision record are written, and the owner has logged a decision (the report alone does not close it). |
| **Non-goals** | Building the project, importing items, changing any repo or GitHub setting. |
| **What would change the answer** | Any hard limit that blocks the fields in Q1, or no workable access path for Grok Bot. |
| **Source rule** | Official GitHub and Linear docs read on the page; every claim labelled. |

**Questions (five).**

1. Can Projects hold, as fields, an item's type (build, research, decision-ops), planned weight, actual weight, newsworthiness tier, stretch date, must-be-true-by date, verified status, parent goal, owner and approver? What are the real limits (field counts, item counts, field types, iteration fields, draft items, sub-issues, roll-ups, built-in automations, charts, Roadmap view)?
2. Can items link to the PRs that build them, and can weight and status be computed from linked PRs and the Deploy Worker result?
3. What access paths exist from the owner's Mac and from Grok Bot (gh CLI, GraphQL, token scopes, the Mac's login state, org versus user projects, the Grok Bot GitHub connector)?
4. What does Projects do badly for this use, and what is the cleanest division of labour with the five MADSAD calendars?
5. How does it compare with Linear for the same job, as a fair baseline?

**Decisions owed to the owner.** D1 tool choice. D2 field schema. D3 who owns the register. D4 whether to pilot with a few real items.

## 1. Findings

### 1.1 Q1: fields and limits

**Field types and limits.**

| Topic | What the source says | Label and source |
|---|---|---|
| Custom field types | Text, number, date, single select, iteration. There is no person (user) field type. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields ; REST data types also list built-ins: assignees, linked_pull_requests, reviewers, labels, milestone, repository, title, issue_type, parent_issue, sub_issues_progress [S, search snippet of https://docs.github.com/en/rest/projects/fields] |
| Field count | Up to 50 fields per project, **including built-in metadata and custom fields**. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects |
| Built-ins in use | An existing user project (#1, read only) lists 13 built-in fields: Title, Assignees, Status, Labels, Linked pull requests, Milestone, Repository, Reviewers, Parent issue, Sub-issues progress, Created, Updated, Closed. That leaves about 37 for custom fields. | [V] `gh project field-list 1 --owner <owner>` on the Mac; the subtraction is [J] |
| Item count | 50,000 items per project, active views plus archive. Raised from 1,200 in April 2025. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/adding-items-to-your-project ; the 1,200 history [S] https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/ |
| Single select | Up to 50 options, each with description and colour; default value allowed. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-single-select-fields |
| Date fields | Typed or picked from a calendar; filter with `@today` and ranges; **no default values**. No time of day is described. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-date-fields ; "no time of day" is an absence on the page [J] |
| Number fields | Filter with `>`, `<`, ranges; default value allowed. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-text-and-number-fields |
| Iteration fields | Any length, individually editable, breaks allowed, `@current/@next/@previous` filters, bulk move to another iteration; three iterations created on field creation. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields |
| Draft items | Exist only in the project; can hold title, body, assignees and any custom field; labels, milestone and repository only after conversion to an issue; no notifications until converted. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/adding-items-to-your-project |
| Sub-issues | Up to 100 sub-issues per parent, 8 levels (read in Part 5). An issue has one parent (connector tool description). Projects expose "Parent issue" (group and filter) and "Sub-issue progress" (for example 3/5) fields. | [V] https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues ; Parent and progress fields [S snippet of https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-parent-issue-and-sub-issue-progress-fields] ; one parent [V, `add_sub_issue` tool text] |
| Roll-ups | The only roll-up found is a **field sum** of number fields (and item counts) in group or column headers, plus the sub-issue progress count. No formula or computed field was found on the pages read. | Field sum [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-roadmap-layout ; "no formulas" [J, absence] |
| Built-in automations | Workflows set **Status** on events. Two on by default: closed issue or PR sets Done; merged PR sets Done. Optional: auto-archive by criteria, auto-add items from a repository by filter. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations |
| Charts and insights | Current charts (counts by any field, with filters) and historical charts; the default "Burn up" tracks open, completed, closed and not-planned items over time. Archived and deleted items are not tracked. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/viewing-insights-from-your-project/about-insights-for-projects |
| Roadmap view | Timeline on a start date field and a target date field (or an iteration); drag to change dates; vertical markers for iterations, item dates and milestones; zoom month, quarter or year. One start and one target field per view. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-roadmap-layout |
| Status updates | Project-level status (On track, At risk), start and target dates, Markdown message. | [V] about-projects page above |
| Templates | Views, fields, draft issues, workflows (not auto-add) and insights can be saved as a template. | [V] about-projects page above |
| Org-level issue fields and issue types | Issue fields and issue types are **organization-level**. Issue fields only apply to issues owned by the same organization. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-issue-fields ; https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-the-issue-type-field |
| Where the owner's work lives | `<owner>/<repo>` is a **private repository owned by the personal account** `<owner>`; the account belongs to two organizations (two organizations); `<org>` has 3 issue types. The <reference-project> repo currently has **0 issues** (only PRs). | [V] live read-only `gh` calls on the Mac |
| Not found | Maximum number of views, maximum number of projects, a limit on assignees per issue. | [U] |

**Field-by-field fit.**

| Needed | Best fit in Projects | Fits? | Note |
|---|---|---|---|
| Item type (build, research, decision-ops) | Custom single select (3 options). Native Issue type is org-only. | Yes | Use the single select because the repo is user-owned [J]. |
| Planned weight | Number field | Yes | |
| Actual weight | Number field | Yes, but filled by script | No formula and no PR-size field exists (§1.2). |
| Newsworthiness tier | Single select M0 to M4 | Yes | 5 of 50 options. |
| Stretch date | Date field | Yes | Date only; no default. |
| Must-be-true-by date | Second date field | Yes | A Roadmap view shows one start and one target field, so one view per date [J]. |
| Verified status | Single select (for example not yet, live-checked, covered by a later deploy, data-only, n/a) | Yes | The built-in "Done" fires on merge or close, so it is not the same as verified [J]. |
| Parent goal | Parent issue field (goal as an issue with items as sub-issues), or Milestone, or a single select | Yes, one parent | An issue has one parent; goal with a stretch date and a must-be-true-by date needs its own date fields on the goal issue [J]. |
| Owner | Assignees (built-in) | Yes | "One owner" is a convention, not enforced [J]; assignees are a property of the issue, changed with an issue mutation, not a project field mutation [V, GraphQL page]. |
| Approver | Single select of names, or text | Partly | There is no person field type [V], so no avatar, no filter by user. |
| Appetite, ending state, decision-record link (from Part 5) | Number, single select (Done, Canceled, Postponed, Abandoned), text or URL in text | Yes | |

**Result for Q1.** No hard limit blocks the ten fields. About eleven new custom fields plus the 13 built-ins would use about 24 of 50 field slots. The gaps are soft: no person field for the approver, no computed fields, one parent per issue, one start and one target date per Roadmap view.

### 1.2 Q2: PR links, computed weight and status

| Topic | Finding | Label and source |
|---|---|---|
| Items can be PRs | A project holds issues, pull requests and draft issues. | [V] about-projects page |
| Linked PRs on an item | The "Linked pull requests" field shows the pull request linked to an issue and its state; "Reviewers" is a separate field. How a link is created (closing keywords or the sidebar) was not read on a page this session. | Field [S, snippet of https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-pull-request-fields] ; link creation [U] |
| PR size or deploy result as a field | None in the field data types listed. There is no additions, deletions or files-changed field, and no deploy field. | [S] REST field enum above; [J] reading |
| Weight computed from linked PRs | Not native. Part 4's weight uses file paths, size and a rule set, so it must be computed outside Projects and written to the number field. | [J] |
| Status computed from PRs | Partly: merged PR sets Status to Done (built-in). It cannot express "live-checked" or "covered by a later deploy". | [V] built-in automations page; the gap is [J] |
| Deploy Worker result into an item | Possible with a GitHub Actions workflow on `workflow_run` (types completed; fires for any conclusion, so filter on conclusion) that calls the GraphQL mutations. `GITHUB_TOKEN` is scoped to the repository and **cannot access projects**; a personal access token (recommended for user projects) or a GitHub App is needed. | `workflow_run` [S, https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows via search snippet] ; token rule [V, https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/automating-projects-using-actions] |
| Alternative that stores no secret in the repo | A script run from the Mac (already logged in) or by Grok Bot reads the Deploy Worker record (the same read-only `gh api` path Part 4 used) and writes the fields on demand or on a schedule. | [J] |
| GraphQL order rule | You cannot add an item and update it in the same call; add first, then update. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects |

**Result for Q2.** Linking an item to its PRs is native. Computing weight and the live-checked state is not; it needs a script or Action, with a token that has the `project` scope.

### 1.3 Q3: access paths

| Path | Finding | Label and source |
|---|---|---|
| Mac `gh` | gh 2.86.0; logged in to github.com as `<owner>` (keyring, active account, https); token scopes: `gist`, `project`, `repo`, `workflow`, `write:org`. The needed `project` scope is present. | [V] `gh --version`; `gh auth status` filtered to account and scopes (no token printed) |
| `gh project` subcommands | close, copy, create, delete, edit, field-create, field-delete, field-list, item-add, item-archive, item-create (draft issue), item-delete, item-edit, item-list, link, list, mark-template, unlink, view. The help says the minimum scope is `project`. There is no status-update command in the list. | [V] `gh project --help` on the Mac |
| Existing projects | `gh project list --owner <owner>` shows two user projects ("another project Athlete Versions", #2, and an untitled project, #1). Both were read only; nothing was changed. | [V] live read |
| GraphQL | `gh api graphql`; token scope `read:project` for queries, `project` for mutations; a classic PAT or a GitHub App installation token. Primary limit 5,000 points per hour per user; `GITHUB_TOKEN` in Actions 1,000 points per hour per repository; at most 100 concurrent requests; mutations cost 5 points toward a 2,000 per minute secondary limit; at most 500 content-creating requests per hour. A live read showed 5,000 limit with 4,998 left. | [V] https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects ; https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api ; live `gh api rate_limit` |
| REST API for project fields | Exists (field data types listed above). | [S] https://docs.github.com/en/rest/projects/fields (snippet) |
| Webhooks | A `projects_v2_item` webhook event exists. | [V] using-the-api page |
| User versus org projects | The API has separate `user(login)` and `organization(login)` project queries. Both work with the same mutations. Org-level issue fields and issue types are not usable on a user-owned repo's issues [J from the org-level statement]. | [V] API page; reading [J] |
| Grok Bot GitHub connector | The `cursor-github` namespace has no Projects tools. A pattern search for "project" across every dynamic namespace returned **no matches**. It does have sub-issue tools: `add_sub_issue` (an issue has one parent; `replace_parent` moves it), `list_sub_issues`, `remove_sub_issue`, `reprioritize_sub_issue`. The `cursor-origin` namespace's tool list has no Projects tools either. | [V] `GetDynamicTools` listing this session |
| GitHub's official MCP server | Has a consolidated `projects` toolset: `projects_list`, `projects_get`, `projects_write` (add, update, delete item; status updates), with OAuth scopes `read:project` and `project`. It is not installed for Grok Bot. A known quirk: `update_project_item` wants the numeric item id, while `add_project_item` returns the GraphQL node id. | [S] https://github.blog/changelog/2026-01-28-github-mcp-server-new-projects-tools-oauth-scope-filtering-and-new-features/ ; https://github.com/github/github-mcp-server ; issue 2153 |
| Grok Bot via the Mac | Grok Bot can run `gh` on the Mac through Shell with the machine id; each such call needs the user's local-tool approval, and the Mac must be online. | [V] tool description; friction [J] |
| `gh` on the Grok Bot box | Not checked (to stay clear of tokens). | [U] |

**Result for Q3.** A workable path exists but it is not native: today it is the Mac's `gh` with the `project` scope, run by the owner or by Grok Bot with approval per call. A native path needs the GitHub MCP projects toolset or a similar connector, which is a setup decision, not done here.

### 1.4 Q4: what Projects does badly here, and the division with the calendars

**Weak spots.**

| Weak spot | Finding | Label |
|---|---|---|
| Calendar-style time view | Roadmap is a timeline of bars between a start and a target date, zoomed by month, quarter or year; there is no day or week grid, no time of day, no recurring items found. | Roadmap [V]; the absence of a grid and recurrence [J] |
| Decisions owed | No decision object. A "decision owed" would be an item of type decision with a filter. No date-triggered reminder or notification from a field was found; built-in workflows only set Status on events. | Automations [V]; absence [J] |
| Milestones | GitHub milestones show a due date and percent complete over issues and PRs, one milestone per issue; Roadmap can show milestone markers. They are not the "★ tier" calendar milestones of Part 3. | [V] about-milestones page and Roadmap page; naming clash [J, see Part 5 §46] |
| Google integration | No official integration with Google Calendar or Google Tasks. Third-party sync exists (a Marketplace app that syncs issues and project dates to Google Calendar, and generic automation tools for Google Tasks). | [S] search results; not evaluated |
| Mobile | GitHub Mobile supports Projects on iOS and Android: switch views, view and edit custom fields. | [S] https://github.blog/changelog/2023-03-14-projects-on-github-mobile-is-now-generally-available/ (snippet) |
| Notifications | Draft items do not notify assignees until converted to issues. | [V] adding-items page |
| Roll-ups and computed fields | None beyond field sum and sub-issue progress. | [J] |

**Division of labour with the five MADSAD calendars** (Commitments, Stretch, Focus, Reviews, Milestones, from Part 3 §7) **[J, proposal]**:

| Concern | Projects (record) | Calendars (time and alerts) |
|---|---|---|
| What an item is: outcome, plan, owner, approver, type, weights, tier, verified state, parent goal, PR links | Source of truth | Not stored (the connector has no custom fields, Part 1 §4.1) |
| Must-be-true-by date | Date field on the item or goal | One all-day event on **Commitments**, written from the field, carrying the item id and link |
| Stretch date | Date field | One all-day event on **Stretch** (toggle off by default), generated |
| Time to work on it | Appetite number | **Focus** blocks, made by hand or by Grok Bot with approval |
| Look-back and planning | Saved views (per week, by tier) and the burn-up chart | **Reviews** windows |
| Newsworthy moments | Tier field | **Milestones** (★) events, generated for M2 and above |
| Phone quick capture | A draft item can be created from the GitHub mobile app (judgment: not tested) | Google Tasks stays as an inbox only (Part 4 ruling), triaged weekly into items |

**Direction of sync [J].** Projects to calendar, one way, by Grok Bot with approval. Calendar edits do not flow back, so there is one source of truth for each date. Events carry the item id so a stale event can be found.

**Existing registers.** The vault already has `work-queue.json` (W-###, decision G-008: vault JSON now, "Linear later if a team joins") and `docs/handoffs/index.json` (H-###). A Projects register would be a third list unless one of those is retired or becomes a view [V, files read in Part 5 §40; the overlap is [J]].

### 1.5 Q5: Linear as the baseline

| Dimension | GitHub Projects | Linear | Label and source |
|---|---|---|---|
| Custom typed fields | Yes: text, number, date, single select, iteration; up to 50 fields | **No general custom fields found.** Issue properties are fixed: status (per-team workflow), priority (five levels, no custom priorities), labels and label groups (one label per group, max 250 labels in a group), relations, estimates, SLAs, due date. Projects get labels; team-level project labels need Business. | GitHub [V] above. Linear [V] https://linear.app/docs/issue-property ; https://linear.app/docs/project-labels ; the statement that no general custom fields exist rests on the pages read plus a search synthesis [S] |
| Two dates per item | Two date fields | One due date per issue; an SLA replaces the due date (an issue uses one or the other). Project start and target dates and initiative target date (Part 5). | [V] issue-property page; Part 5 §39 |
| Weights | Free number field | Estimates only on fixed scales (exponential 1 to 16, Fibonacci, linear, t-shirt; extended scales add two values); unestimated issues count as 1 point by default; "effort" drives cycle and project stats. Actual weight cannot be a field. | [V] issue-property page |
| Item type, tier, verified status | Single selects | Label groups (mutually exclusive) or statuses | [V] issue-property page; mapping [J] |
| Parent goal | Parent issue (one parent), milestone | Issue to project to initiative (initiatives have sub-initiatives on the pricing page) | Initiatives [V] Part 5; sub-initiatives [V] https://linear.app/pricing |
| Cycles, projects, initiatives | Iteration fields; milestones; no initiative object (a parent issue plays the role) | Native cycles (1 to 8 weeks, capacity from past cycles), projects with milestones and updates, initiatives with owner, target date and status | [V] Part 5 §39 |
| Owner and approver | Assignees; approver as single select | Single assignee; project lead; no approver field | [V] Part 5 §39; absence [J] |
| PR linking | Linked pull requests field; PR merged sets Done | Branch name, PR title or magic words link PRs; several PRs per issue; the issue status changes only when the final linked PR reaches the required state; automations per PR event and per target branch; auto-cancel of linked PRs; preview links | [V] https://linear.app/docs/github |
| Computed from PRs and deploy | Needs script or Action | Status automation from PR events; branch rules (for example merged to `main` sets "Deployed"). No weight from PR size. | [V] https://linear.app/docs/github ; [J] |
| API | GraphQL and REST; PAT with `project`, or GitHub App | GraphQL (`https://api.linear.app/graphql`), OAuth2 or personal API keys, TypeScript SDK, webhooks | [V] https://linear.app/developers/graphql |
| Grok Bot access | No Projects tools in the connector; Mac `gh` or GitHub MCP projects toolset | No Linear connector installed (Part 1); Linear lists "MCP access" on the pricing page | Part 1 line 141 [V]; the connector list this session has no Linear [V]; MCP on pricing [V] https://linear.app/pricing |
| Charts | Burn-up and custom charts; no plan restriction stated on the page read | Linear Insights is listed under Business | GitHub [V] about-insights page; Linear [V] pricing (plan placement of other features not readable [U]) |
| Cost | Projects included with GitHub Free, Team and Enterprise; GitHub Team is $4 per user per month (first 12 months) | Free $0 (2 teams, 250 issues); Basic $10 per user per month; Business $16 per user per month (billed yearly); Enterprise custom | GitHub [S] https://github.com/pricing (snippet) and https://github.blog/news-insights/product-news/planning-next-to-your-code-github-projects-is-now-generally-available/ ; Linear [V] https://linear.app/pricing |
| Method fit | "Rather than enforcing a specific methodology" | Opinionated: one owner per issue and project, appetite-like project scoping, "don't invent terms" | [V] about-projects; Part 5 §39 |

**Result for Q5.** For this job the deciding difference is custom typed fields. GitHub Projects can hold every field in Q1; Linear cannot hold actual weight, the second date, or the approver as fields, and would put type, tier and verified state in label groups. Linear is stronger on PR-to-status automation, cycles, initiatives and method. Grok Bot has no connector for either at present, so access is not a tie-breaker.

## 2. Synthesis (adopt, reject, transform, open)

- **Adopt:** GitHub Projects as the item record, with a thin schema (§3, D2). It fits the fields [V], costs nothing extra on the current account [S], and the Mac already has the needed scope [V].
- **Reject:** Using Projects as the calendar. It has no time grid and no field-date alerts [J]. Also reject a third unlinked register.
- **Transform:** Calendars become generated views of the item dates (Projects to calendar, one way). Google Tasks stays an inbox only.
- **Open:** Which repo holds the issues; whether work-queue or handoff index is retired or becomes a mirror; how Grok Bot reaches Projects without per-call Mac approval; whether a PAT secret goes into Actions.

## 3. Recommendation per decision owed

**D1. Tool choice.** Pilot GitHub Projects as the item register, alongside the calendars, not instead of them. Keep Linear as the named later option (G-008).
- Why: it holds every Q1 field with no blocking limit [V]; Linear cannot hold the weights, second date or approver as fields [V/S].
- Switch trigger: change to Linear if the pilot shows that the missing person field, the single parent, or the script-written weights cost more than they save, or when a team joins.
- Condition: the Grok Bot access path in §1.3 is accepted as the Mac `gh` route for now [J]. If you require a native Grok Bot path before starting, that is the "what would change the answer" case and the pilot waits for the connector decision.

**D2. Field schema.** Proposed: 11 new custom fields plus extending the built-in Status options, which is about 24 of 50 slots with the 13 built-ins [J]:

| Field | Type | Values or use |
|---|---|---|
| Type | single select | Build, Research, Decision-ops |
| Status | built-in single select, options extended | Committed, Active, Waiting, Done, Stopped |
| Ending | single select | Done, Canceled, Postponed, Abandoned |
| Planned weight | number | Rule W at commitment |
| Actual weight | number | Script-written from linked PRs |
| Tier | single select | M0 to M4 |
| Stretch date | date | Aspiration |
| Must-be-true-by date | date | Real external clock only |
| Verified | single select | Not yet, Live-checked, Covered by later deploy, Data-only, Not applicable |
| Approver | single select | Names |
| Appetite (days) | number | Time box from Part 5 §44 |
| Decision record | text | Ledger or ADR id |

Owner is Assignees; parent goal is the Parent issue field, with goals as issues that carry their own two date fields.

**D3. Who owns the register.** The owner owns the schema and the acceptance of each item (owner and approver are the same person for solo items, with the doer recorded separately in the assignee, per Part 5 §40). Grok Bot may propose items and fill computed fields, but writes only with approval per action. Builder agents change item status only through PRs that link the item. During the pilot, `work-queue.json` stays authoritative; Projects mirrors the pilot items; the register of record is decided at the pilot review [J].

**D4. Pilot.** Yes: 3 to 5 real items for one week (one item each of type build, research and decision-ops, plus one with a must-be-true-by date). Pass if: all fields fit without workarounds; a PR appears on its item; Grok Bot writes actual weight and verified state for one item from the Deploy Worker record; one calendar event is generated from a date field; the owner says the upkeep cost is acceptable [J]. The pilot needs a decision on where the issues live (see Open) and approval to create the project, which this note did not do.

## 4. Unverified or not examined [U]

- How issues are linked to PRs on GitHub (closing keywords, cross-repo linking) was not read on a page this session. Whether a PR in `<owner>/<repo>` can link to an issue in another repo is unverified.
- Maximum views per project, maximum projects, and a cap on assignees per issue.
- Whether sub-issues, issue types and org-level issue fields behave the same on a user-owned private repo. Org-level behaviour is verified; user-repo behaviour is my inference. The <reference-project> repo has 0 issues, so no live test was possible without creating one.
- `gh` on the Grok Bot box (login state and scopes) was not checked.
- Parent and sub-issue progress fields, the REST fields enumeration, GitHub Mobile support, third-party Google sync, GitHub Free pricing and the `workflow_run` event are from search snippets or syntheses, not full page reads.
- Linear: no general custom fields is based on the issue-properties page (fixed properties) and a search synthesis; I did not find a docs page that states it outright. Which Linear plan includes API access, initiatives and sub-initiatives could not be read from the pricing page text. Whether archived issues count toward the Free plan's 250 issues is unknown. Linear calendar views were not examined.
- The Roadmap marker "dates of items" semantics and whether it can draw a second date field as a marker.
- Cost beyond list prices (time to maintain a schema, token handling).

## 5. Decision record (filled 2026-10-17)

Result: **decided**. The owner accepted all four recommendations in §3 as written. No separate reason was given beyond acceptance of the recommendations and their reasons in §3; none is recorded here on his behalf.

| Field | Entry |
|---|---|
| Decision id | Not assigned (no ledger entry was made in this change) |
| Date | 2026-10-17 |
| Decided by | The owner |
| D1 Tool | Accepted as written: pilot GitHub Projects alongside the calendars, not instead of them. Linear stays the later option. |
| D1 Switch trigger | As written in §3: switch to Linear if the missing person field, the single parent or the script-written weights cost more than they save, or when a team joins. |
| D2 Field schema | Accepted as written: about 11 new custom fields plus extended Status options (Type, Ending, Planned weight, Actual weight, Tier, Stretch date, Must-be-true-by date, Verified, Approver, Appetite in days, Decision record); owner is Assignees; parent goal is the Parent issue field, with goals as issues carrying the two date fields. |
| D3 Register owner and write rule | Accepted as written: The owner owns the schema and accepts each item. Grok Bot proposes entries and fills computed fields only with his approval. Builder agents change item status only through PRs that link the item. |
| D3 Register of record during pilot | `work-queue.json` stays authoritative; Projects mirrors the pilot items. The register of record is decided at the pilot review. |
| D4 Pilot | Accepted as written: 3 to 5 real items for one week (one each of build, research and decision-ops, plus one with a must-be-true-by date). Pass if the fields fit without workarounds; a PR appears on its item; Grok Bot writes actual weight and verified state for one item from the Deploy Worker record; one calendar event is generated from a date field; the owner judges the upkeep cost acceptable. Pilot window resolved 2026-10-17: 7 days, 2026-10-17 to 2026-10-24; review on 2026-10-24. |
| Creating the GitHub project | **Approved by the owner 2026-10-17 and done 2026-10-17** (see "Pilot setup" below). The research itself and the first version of this record changed nothing in GitHub. |
| Where the issues live (repo) | Resolved 2026-10-17: `<owner>/<repo>` (the default; nothing in §1 argues otherwise: it is user-owned, so the org-level issue types and fields are not used and Item type is a project single select). No issue has been created; the pilot items are draft project items only. |
| How Grok Bot gets access | Resolved 2026-10-17: Mac `gh` with the owner's approval per call (the §3 D1 condition). No GitHub MCP projects toolset is installed. |
| Token plan (PAT or GitHub App, if any) | Resolved 2026-10-17: reuse the existing Mac `gh` login (scopes include `project`). No new token, no PAT, no GitHub App, no Actions secret. |
| What this supersedes | Nothing stated by the owner. G-008 (work queue in vault JSON, Linear later) is unchanged, and D3 keeps `work-queue.json` authoritative during the pilot. |
| Research item closed | Yes: the decision record is filled in (rule: research is done at the decision, not the report). The pilot itself is a separate item that has not started. |
| Notes | Pilot setup is recorded below. Still open: the actual weights and Deploy Worker verified state need a script run with the owner's approval; the pass test "a PR appears on its item" cannot be met by draft items alone (see "Not done" below). |

### Pilot setup and planned weights [moved to the private evidence note: pilot project details]

## 6. Sources

GitHub: https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects ; .../understanding-fields (index) ; .../understanding-fields/about-text-and-number-fields ; .../about-date-fields ; .../about-single-select-fields ; .../about-iteration-fields ; .../about-issue-fields ; .../about-the-issue-type-field ; .../about-parent-issue-and-sub-issue-progress-fields [S] ; .../about-pull-request-fields [S] ; .../customizing-views-in-your-project/customizing-the-roadmap-layout ; .../managing-items-in-your-project/adding-items-to-your-project ; .../automating-your-project/using-the-built-in-automations ; .../automating-your-project/using-the-api-to-manage-projects ; .../automating-your-project/automating-projects-using-actions ; .../viewing-insights-from-your-project/about-insights-for-projects ; https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api ; https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues ; https://docs.github.com/en/rest/projects/fields [S] ; https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows [S] ; https://github.blog/changelog/2025-04-09-evolving-github-issues-and-projects/ [S] ; https://github.blog/changelog/2023-03-14-projects-on-github-mobile-is-now-generally-available/ [S] ; https://github.blog/changelog/2026-01-28-github-mcp-server-new-projects-tools-oauth-scope-filtering-and-new-features/ [S] ; https://github.com/github/github-mcp-server [S] ; https://github.com/pricing [S] ; https://docs.github.com/en/get-started/learning-about-github/githubs-plans [S].

Linear: https://linear.app/docs/issue-property ; https://linear.app/docs/project-labels ; https://linear.app/docs/github ; https://linear.app/developers ; https://linear.app/developers/graphql ; https://linear.app/pricing ; plus the Linear pages cited in Part 5 §50.

Live read-only checks on the Mac (2026-10-17, CDT): `gh --version`; `gh auth status` (account and scopes only); `gh project --help`; `gh project list --owner <owner>`; `gh project field-list 1 --owner <owner>`; `gh repo view <owner>/<repo>`; `gh api` reads of user orgs, repo issues (count), `orgs/<org>/issue-types` (count), and `rate_limit`. Connector tool listings: `GetDynamicTools` for `cursor-github` and a pattern search across namespaces.

Vault: Parts 1 to 5 of `MADSAD_CALENDAR_METHODOLOGY_RESEARCH_2026-10-16.md` (calendar names §7, Google Tasks ruling, item definition §47); `_meta/registers/work-queue.json` and G-008 as read in Part 5 §40.
