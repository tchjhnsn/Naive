---
publish: false
type: research
source: hybrid
created: "2026-10-17T18:50:00Z"
updated: "2026-10-17T18:50:00Z"
ai-model: grok-bot
authority: exploratory
decision-status: none
status: DRAFT
tags: [research, methodology, madsad, linear, lincal, item-register, calendar, cli]
research-phase: synthesised-mimetic
research-unit: madsad-item-register-tool-linear
canonical: false
research-problem: "Should Linear be the MAD/SAD item register (instead of, or ahead of, GitHub Projects), is there a CLI path that avoids MCP, and how would it work with the five MADSAD Google calendars?"
governed-by:
  - "[[RESEARCH_METHOD]]"
related:
  - "[[MADSAD_RESEARCH_TEMPLATE_2026-10-17]]"
  - "[[MADSAD_GITHUB_PROJECTS_RESEARCH_2026-10-17]]"
  - "[[MADSAD_CALENDAR_METHODOLOGY_RESEARCH_2026-10-16]]"
---

# Linear as the MAD/SAD item register (research item, 2026-10-17)

> **Labels.** **[V]** verified: the page, file or API output was read in full this session. **[S]** secondary: a search synthesis or snippet, a third-party page, or a statement on a page I did not read in full. **[J]** my judgment. **[U]** unverified or not examined.
>
> **Rules kept.** Read-only. No account, API key, OAuth app or workspace was created. Nothing was installed. No Linear, GitHub or Google setting was changed. No token or key was touched. Nothing staged or committed in the vault. Nothing under `.cursor/`. All fetches were of public pages and public GitHub files.

## Front half (set before any research started)

- **Why:** The owner now thinks Linear may be a better item register than GitHub Projects, pointed at the LinCal listing (https://linear.app/integrations/lincal), and he dislikes MCP, so he prefers a CLI if Linear has one. The earlier note decided to pilot GitHub Projects and keep Linear as a later option, but its Linear claims rested partly on snippets.
- **Objective:** Be able to decide whether Linear should be the item register (instead of or ahead of GitHub Projects), through which access path, and how it would feed the five MADSAD Google calendars.
- **Source:** The owner's message t211u; Part 5 of `MADSAD_CALENDAR_METHODOLOGY_RESEARCH_2026-10-16.md`; `MADSAD_GITHUB_PROJECTS_RESEARCH_2026-10-17.md` (decided: pilot GitHub Projects, Linear stays the later option).
- **Questions (max five):**
  1. Does Linear have an official CLI? How good are the community CLIs, and is the GraphQL API plus official TypeScript SDK a sound non-MCP path (auth, rate limits)?
  2. What can Linear hold for our item model (type, planned weight, actual weight, tier, stretch date, must-be-true-by date, verified status, approver, appetite, decision record, parent goal), and what does each plan include, including solo use on Free?
  3. What does LinCal actually do and not do, how far can it be trusted, and can the five MADSAD calendars be generated one-way from Linear instead?
  4. How does Linear track PRs (private personal repo `<owner>/<repo>`, Vercel), and can PR weight and "live-checked" be written back by a script?
  5. Head-to-head with GitHub Projects on this job.
- **Decisions owed (each a choice with options; the owner decides all):**
  - **D1 Tool:** GitHub Projects only, Linear only, or both.
  - **D2 Access path (if Linear is used at all):** community CLI, API script (SDK or GraphQL), or both. MCP is excluded by the owner's preference.
  - **D3 LinCal:** trust and authorize now, trust later (only if Linear is chosen), or do not use it.
  - **D4 Pilot plan:** keep the GitHub Projects pilot only, add a short Linear trial, or switch the pilot to Linear.
- **What would change the answer:** no workable CLI or API path; no way to hold planned weight, actual weight and the two dates; or plan costs that do not fit a solo user.
- **Non-goals:** signing up, installing anything, authorizing any OAuth app, creating keys, or changing any account.
- **Sources allowed:** Official Linear docs, changelog, developer docs, pricing page, the `linear` GitHub org and its raw files, the Linear GraphQL schema file, LinCal's own pages; community CLI READMEs and GitHub metadata for the community tools. Search snippets are allowed only when labelled [S].
- **Appetite:** One pass, about 90 minutes. At the limit, stop and report.
- **Output:** This note, in `everything-ecosystem/references/`. The final report gives file paths, a ten-line summary, a recommendation per decision owed, what is unverified, and a short comparison table. The decision record is left blank for the owner.

## Ending (filled at the end)

### Findings (ten lines; each labelled)

1. **No official general-purpose Linear CLI exists.** Linear's developers page lists the GraphQL API, authentication, agents, TypeScript SDK and a *CLI importer* only; `linear.app/docs/cli` and `/developers/cli` return 404; the `linear` GitHub org has two CLIs, `linear-release` (CI release tracking, MIT, 68 stars) and the importer (archived, moved). [V]
2. **The community CLI `schpet/linear-cli` is the strongest.** v3.0.0 released 2026-10-06, Rust rewrite, ISC licence, 1,013 stars, single personal maintainer, last push 2026-10-07. It covers issues (create, update, due date, estimate, milestone, parent, relations, templates), projects (create, update, target and start dates, labels, initiatives), milestones, cycles (list and view only), initiatives (list, view, comment), documents, project and initiative updates, a raw `linear api` GraphQL escape hatch, `--json`, distinct exit codes, and key storage in the macOS Keychain. Other CLIs: `linearis` (261 stars, MIT, org-owned), `linctl`, `joa23/linear-cli`, `lineark`. [V README and metadata; other CLIs V metadata only]
3. **The official non-MCP path is the GraphQL API plus `@linear/sdk`.** A personal API key (restrictable to read, write or create-issues, and to chosen teams) allows 2,500 requests per hour and 3,000,000 complexity points per hour; OAuth apps get 5,000 and 2,000,000; webhooks exist and polling is discouraged. A solo register would use a tiny fraction. [V rate-limit, GraphQL and OAuth pages]
4. **Linear has no custom fields, on purpose.** The GraphQL `IssueCreateInput` and `ProjectCreateInput` have no custom-field slot (schema read), the issue-properties page lists fixed properties, and a Linear staff member wrote in May 2026 "We intentionally do not support custom fields" and pointed to labels and label groups. [V schema and docs; S staff statement on Reddit]
5. **So four of our fields have no native slot.** Fit: type, tier, appetite = label groups (one value per group); planned weight = estimate (fixed scales; Fibonacci extended tops out at 21, so Rule W values such as 9, 11 and 17 would be rounded); verified = a workflow status; parent goal = initiative; owner/doer = assignee plus delegate. Not native: actual weight, second date, approver, decision record. Dates: one due date per issue; one start and one target date per project; milestone target dates; initiative target date. [V docs; fit is J]
6. **Free plan is workable but tight.** Free is $0 with unlimited members, 2 teams, 250 issues, and archived issues do not count ("250 issues, plus unlimited archived issues"). Closed issues count until auto-archived, and archiving is automatic only; the shortest auto-archive period I found is 1 month, from a third-party page. Basic is $10 per user per month, Business $16 (Insights, Asks, Releases, Triage Intelligence), Enterprise custom (sub-initiatives and initiative views). Whether API and webhooks are on Free is not readable from the pricing text. [V startups page, pricing text, docs; S 1-month minimum; U per-plan API access]
7. **LinCal is a thin, free-for-solo calendar view, not a sync with Google Calendar.** It is a third-party web app (Rolf Mistelbacher, Fresh van Root) that reads Linear from your browser and writes back drag-and-drop due dates, with project target dates and cycles shown too. Free for a solo or free workspace; flat paid price when two or more people in a paid workspace use it. It stores your Linear user ID and email; analytics by Fathom. Its homepage says it "never stores or sees" your data while its privacy page says issue data is "cached in-memory"; it requests OAuth scopes I could not read, and I found no source repository. [V lincal.app and privacy page; U scopes and source]
8. **Linear's own Google Calendar link does not carry work.** The native Google Calendar integration only reads out-of-office events to set your Linear status. Team cycles can be subscribed in Google Calendar by feed or `.ics`. Issue due dates reach Google Calendar only through third parties (Reclaim, IFTTT, scripts such as `linear-gsuite`) or our own script, so generating the five MADSAD calendars one-way from Linear through the API plus the Google Calendar write path is feasible but would be our script. [V integration and cycle docs; S third-party tools; J feasibility]
9. **GitHub linking is strong but attaches to issues, not projects.** The Linear GitHub app links PRs by branch name, issue ID in the title, or magic words; several PRs per issue; status automation per target branch (for example merge to `main`); Vercel preview comments become preview links; Business-plan Releases track deploys through the `linear-release` CLI in CI. Docs describe organizations and repository-level installs; a private repo on a *personal* account is not addressed. No PR-size field exists, so weight and "live-checked" would be script-written to the estimate or a description block. [V GitHub and releases docs; U personal-account install; J write-back]
10. **Net: Linear is a good tracker but a worse fit for this item model than GitHub Projects.** GitHub Projects has real number, date and single-select fields, a first-party `gh` CLI already logged in on the Mac, and no cost; Linear has the better hierarchy (initiative, project, issue), cycles, PR automation, and a usable community CLI, but would force actual weight, the second date and approver into labels or text. [J, from items 1 to 9]

### Recommendation (per decision owed)

**D1 Tool: GitHub Projects only, for now. Do not run both.**
- Why: Findings 4, 5 and 10. The approved item model needs planned weight, actual weight, two dates, verified and approver as queryable fields; Linear has none of them as custom fields, and GitHub Projects has all but a person field. Running both would create a fourth list beside `work-queue.json`, the handoff index and Projects.
- Keep Linear as the named fallback with these triggers: a second person joins; cycles, initiatives or PR-to-status automation turn out to matter more than weights; or the GitHub pilot fails on its own criteria. If the owner wants to test Linear anyway, treat it as D4 option 2.

**D2 Access path (only if Linear is adopted): official API through a small script, with `schpet/linear-cli` for hand use.**
- Why: There is no official CLI (Finding 1). The CLI is good enough for daily work and has a `linear api` escape hatch, but it is a single-maintainer tool; computed write-back (weights, verified, calendar generation) should use the official SDK or GraphQL so it does not depend on a hobby project. Both authenticate with a personal API key; create it restricted (read plus write, limited to the one team), store it in the Mac Keychain, and never paste it in chat. Grok Bot has no Linear connector, so it would work through the Mac with the owner's approval per call, as with `gh`. MCP stays off, as the owner prefers.

**D3 LinCal: do not authorize now.**
- Why: It shows one date per issue and nothing our model needs beyond that, and we would generate the calendars ourselves (Finding 8). If Linear is adopted and the owner still wants a drag-and-drop view, read the consent screen first: it should ask for read and write only, never admin. The privacy page and homepage disagree slightly on caching, scopes and source are unverified, and its Linear directory listing is not an audit [J]. Revisit only after D1 changes.

**D4 Pilot plan: keep the GitHub Projects pilot as decided; add no Linear pilot now.**
- Why: The decided pilot (3 to 5 items, one week, its own pass criteria) already tests the fields that Linear lacks. If the GitHub pilot fails, the first test for Linear is: can actual weight and the second date be held without a description-block hack, and does a PR in `<owner>/<repo>` link to an issue through a personal-account install. A Linear trial would be the owner's own sign-up (Free workspace, 3 items, one week); I have not done it and would not without his go-ahead.

### Decision record (to be filled by the owner)

| Field | Entry |
|---|---|
| Result (decided / postponed / rejected) | |
| Date | |
| D1 Tool | |
| D2 Access path | |
| D3 LinCal | |
| D4 Pilot plan | |
| Reason | |

### Rolled into

(blank; "none" if nothing follows)

---

## Evidence appendix (supports the findings above)

The template caps Findings at ten lines; the tables below are the supporting detail and are not part of the cap.

### A. CLI and API options (Q1)

| Option | Maintainer and activity | Licence and stars | Auth | Can do | Gaps | Label |
|---|---|---|---|---|---|---|
| Official: `linear/linear-release` | Linear; pushed 2026-10-16 | MIT, 68 | `LINEAR_ACCESS_KEY` | Create and update releases from CI, link issues by commit and PR | Releases are a Business-plan feature; not an issue manager | [V] README and pricing/releases docs |
| Official: CLI importer (`linear/linear-import`) | Linear; archived, moved to a new repo | MIT, 70 | Admin | One-time CSV import | Not an issue manager | [V] |
| Community: `schpet/linear-cli` | One maintainer (schpet), created 2024-11, v3.0.0 on 2026-10-06, 11 open issues | ISC, 1,013 | Personal API key, stored in Keychain or `LINEAR_API_KEY`; multi-workspace | Issues (create, update, due date, estimate, milestone, parent, relations, comments, attachments, templates), projects (create, update, start and target dates, labels, initiatives, members), milestones (create, update), cycles (list, view), initiatives (list, view, comments), documents, project and initiative updates with health, `linear api` raw GraphQL, `--json`, exit codes, `--no-input`, an agent skill | Cannot create cycles; initiative create or update not listed; no custom fields (none exist); single-maintainer risk; installer is `curl | sh` or brew, npm, binaries | [V] README, changelog, metadata |
| Community: `linearis-oss/linearis` | Org-owned, created 2025-09, pushed 2026-10-16 | MIT, 261 | API key, stored in `~/.linearis/token` | Issues, projects, cycles (read), milestones, initiatives (create, update), documents, labels and groups, JSON in and out | Cycles create and update not covered | [V] metadata; [S] README table read in part |
| Community: `dorkitude/linctl`, `joa23/linear-cli`, `nesszer/linear-cli`, `flipbit03/lineark` | Individuals; all pushed within 2026-09 to 10 | MIT, 55 to 145 | API key (joa23 also OAuth) | Issues, projects, cycles, labels, relations, due dates | Not reviewed beyond metadata and README keywords | [V] metadata; [U] depth |
| Official API: GraphQL at `api.linear.app/graphql` | Linear | n/a | Personal API key (header, no `Bearer`), OAuth2 (PKCE, refresh), client-credentials for apps | Full read and mutate; introspection; webhooks for issues, comments, attachments, documents, projects, project updates, cycles, labels, users, SLAs | Rate limits below; no REST | [V] |
| Official: `@linear/sdk` (TypeScript) | Linear; repo `linear/linear` pushed 2026-10-17 | MIT, 1,637 | Same keys | Typed models over the same schema | Node only | [V] |

**Rate limits** [V]: API key 2,500 requests per user per hour and 3,000,000 complexity points per hour; OAuth app 5,000 and 2,000,000; unauthenticated 600 per IP and 100,000; single-query maximum 10,000 points; default page size 50; leaky-bucket refill; webhooks preferred over polling. API keys can be limited by permission (read, write, admin, create issues, create comments) and by team. Admins can disable member-created keys. Creating a key needs member access, not guest.

### B. What Linear can hold (Q2)

| Need | Best Linear slot | Fit | Note |
|---|---|---|---|
| Type (build, research, decision-ops) | Label group "Type" on issues, or a project label group | Yes | One value per group. Issue label groups hold up to 250 labels each. [V] |
| Planned weight | Issue estimate (team opt-in); project progress rolls up estimates | Partial | Scales: Exponential 1-16 (extended to 64), Fibonacci 1-8 (extended 21), Linear 1-5 (extended 7), T-shirt; zero estimates optional; unestimated counts as 1 unless disabled. Rule W values (1 to 17) would round. [V] |
| Actual weight | None | No | Script-written to a description block or an attachment's `metadata` JSON (the `attachmentCreate` input has a `metadata` field); neither is a filterable field. [V schema; J] |
| Newsworthiness tier | Label group "Tier" (M0 to M4) | Yes | [J] |
| Stretch date and must-be-true-by date | Issue: one `dueDate`. Project: `startDate` and `targetDate` (day, month, quarter, half-year or year resolution). Project milestone: `targetDate`. Initiative: `targetDate`. | Partial | Only one native date pair per project. A second date means a milestone named "Stretch", a label, or text. A due date and an SLA cannot both exist on an issue. [V docs and schema; mapping J] |
| Verified status | Team workflow status (custom statuses allowed, fixed categories Backlog to Canceled) | Yes | Status automation from PRs can move it; "verified" would be a manual or script step. [V] |
| Approver | Assignee (one) or a label group; project lead (one) | Partial | No person field. Issues also have a `delegate` (agent) property: assignee as the accepting owner and delegate as the doer matches Part 5 §40, if an agent app is installed. [V schema and templates doc; fit J] |
| Appetite | Cycles (1 to 8 weeks, cooldowns, capacity dial), or a label group | Partial | Cycle capacity uses past velocity. [V cycles doc] |
| Decision record | Document attached to an issue, project or initiative; comment; attachment URL | Yes | Documents attach to exactly one target (per the CLI README). [V] |
| Parent goal | Initiative (status, priority, labels, target date, owner, health via updates) holding projects | Yes, thin | Initiatives group projects, not issues. Sub-initiatives and initiative views are Enterprise-only. [V] |

**Suggested mapping if Linear were used (J):** goal = initiative; item = project (one status, one lead, start and target dates, milestones, health updates, documents); PR slots = issues in that project (estimates, due dates, PR links). Cost: PRs link to issues, not projects (finding 9), and every PR slot counts toward the Free cap.

**Features checked:**
- Estimates [V]; labels and label groups [V]; relations (blocks, blocked by, related, duplicate) [V]; due dates with overdue and filter options [V]; SLAs (Business and Enterprise) [V].
- Project milestones with target dates [V]; project status, priority, labels (workspace-level on all plans; team-level on Business and up) [V]; project and initiative updates with On track, At risk, Off track health [V]; Timeline view (projects only, not issues) [V].
- Cycles [V]; triage as an inbox status category [V]; customer requests (all plans; API creates them) [V]; Insights (Business and up) [V]; Asks (Business and up) [V]; issue and form templates (all plans) [V]; releases (Business and up) [V].
- Linear Agent and skills (all plans in public beta from 2026-03; automations and Code Intelligence on Business and up) [V changelog].

**Plans.**

| Plan | Price | Notable limits | Label |
|---|---|---|---|
| Free | $0 | Unlimited members, 2 teams, 250 issues (archived do not count), 10 MB uploads, Agent platform and Linear Agent | [V] pricing and startups pages |
| Basic | $10 per user per month, billed yearly | 5 teams, unlimited issues and uploads, admin roles | [V] |
| Business | $16 per user per month, billed yearly | Unlimited teams, private teams and guests, Insights, Asks, Triage Intelligence, Code Intelligence, Loops, Releases (15 pipelines) | [V] |
| Enterprise | Custom, annual only | Sub-initiatives, initiative views, SSO and SCIM, audit log | [V] |

Cancelling a paid plan deletes nothing, but with over 250 issues you can no longer create issues (billing doc). [V] The pricing page lists "API and webhook access" and "Core: issues, projects, cycles, initiatives" as rows, but the per-plan check marks did not survive the text extraction. [S]

**Solo on Free (J):** About 35 PRs in 7 days is the recent rate. If each PR slot were an issue, the 250 cap is reached in a few weeks, and closed issues only leave the count after auto-archive. Mitigation is to make issues items, not PR slots, or to pay $10 a month.

### C. LinCal (Q3)

- **What it is:** A third-party app listed in Linear's integrations directory, by Fresh van Root. Sign in with Linear; month and week calendar of issues by due date; project timelines and target dates; cycle timelines; drag to reschedule; create issues on a date; edit title, status, assignee, project, labels and cycle; filters; shareable filtered links; unscheduled drawer. [V lincal.app and the Linear listing]
- **What it does not do:** one date per issue; no other issue fields; no calendar feed into Google Calendar; nothing about weights, tiers or verification; the homepage FAQ says it "focuses on due date management". [V]
- **Sync:** it reads and writes Linear through Linear's API, in your browser; changes show in Linear immediately. It is a view of Linear, not a two-way sync with Google Calendar. [V]
- **Price:** Free for free Linear workspaces and for one user in a paid workspace; a flat per-workspace plan once two or more people use it. Prices not shown on any page I could read. [V; U amount]
- **Trust:** The operator is Rolf Mistelbacher / Fresh van Root (named controller on the privacy page, EU style GDPR wording). It stores your Linear user ID, sign-in email and session start times in PostgreSQL, and uses Fathom analytics. Revoking it in Linear settings deletes stored data within 30 days. The homepage says nothing is stored or seen and no data passes its servers; the privacy page says issue data is "cached in-memory" and not stored. OAuth scopes requested are not written on any page I read; Linear's consent screen would show them. No open-source repo found. Used by "100+ teams" (self-reported). [V pages; U scopes, source, claims]
- **Linear's own features:** native calendar-ish items are Timeline (projects only), cycle calendar feeds (`.ics` or Google Calendar subscription), due-date icons and filters, and project and milestone dates; none shows issue due dates in a Google Calendar. [V docs]
- **Linear integrations:** Google Calendar (out-of-office to status only) [V]; GitHub (PR and issue sync) [V]; Slack (also Asks, Business and up) [V]; Google Sheets (exists; plan not stated on the page I read) [V]; Zapier [V listing]; Reclaim.ai (schedules Linear issues as Google Calendar blocks) [V listing].
- **Generating the five MADSAD calendars from Linear (J):** a script would query issues, projects and milestones through the API, then write all-day events to five Google calendars. Third-party precedent: `tinyland-inc/linear-gsuite` (issues with due dates to all-day events, removes on completion) [S snippet, code not read]. The one-way rule from the earlier note holds. The hard part is the second date, not the script.

### D. GitHub link (Q4)

- **How PRs link** [V]: branch name containing the issue ID (copy the branch name from Linear), issue ID in the PR title, or a magic word in the description (closing: fixes, closes, resolves, implements and others; non-closing: ref, part of, contributes to, towards; relation: relates to). Several issues per PR and several PRs per issue are allowed; the issue changes status when the final linked PR reaches the target state. `ignore ENG-123` skips a link. Adding `TEAM-NEW` to a PR description creates a linked issue.
- **Status automation** [V]: per team, on draft, open, review requested, ready to merge and merged; branch-specific rules by regex (merge to `main` can set "Deployed").
- **Permissions** [V]: read access to checks, commit statuses, deployments, members, merge queues and metadata; read and write to actions, code, issues, pull requests and workflows.
- **Install** [V/U]: docs describe organization-level install by an org owner, or repository-level install by a repository admin; each member then connects a personal GitHub account. Whether a private repo owned by a *personal* account (our `<owner>/<repo>`) can be connected is not stated on the page; a search synthesis says yes. [S]
- **Vercel** [V]: Vercel preview comments (and Netlify, Cloudflare, Amplify) become preview links on the Linear issue; there is no Vercel production-deploy tracking in the integration. Deploy-aware status needs Releases (Business) with the `linear-release` CLI in CI, which reads commits for issue IDs. Our deploy is a GitHub Actions workflow (earlier notes), so it would be an added CI step. [J]
- **Writing PR weight and live-checked back** [J]: possible only by script through the API (estimate, description block, label, attachment metadata) or by the `linear api` command; no field exists for PR size.
- **Two-way GitHub Issues sync** [V]: syncs title, description, status, assignee, labels, sub-issues, comments and priority only; no dates, estimates or Projects fields.

### E. Linear versus GitHub Projects (Q5)

| Job | GitHub Projects | Linear |
|---|---|---|
| Custom fields for weights, dates, tier, verified | Yes: text, number, date, single select, iteration; 50 fields; about 24 used in the proposed schema [V earlier note] | No custom fields by design; labels, estimate, one due date, status [V] |
| Planned and actual weight | Two number fields; actual script-written | Estimate (rounded fixed scale); actual has no slot |
| Two dates per item | Two date fields | One due date per issue; one start and target pair per project |
| Time view | Roadmap (one start and one target field per view), no grid | Timeline (projects only), cycles, cycle `.ics` feed |
| Goal layer | Parent issue (one parent), Milestone | Initiative with status, owner, target date, health; sub-initiatives Enterprise |
| PR link and automation | Linked pull requests; Done on merge | Strong: branch, title, magic words, status per branch rule |
| CLI | First-party `gh project` (logged in on the Mac) [V earlier note] | No official CLI; strong community CLI |
| API and Grok Bot path | GraphQL; Mac `gh` with approval per call; no connector tools | GraphQL and SDK; key-based; no connector; Mac CLI or script with approval |
| Cost solo | $0 on the current account | Free with 250-issue cap, or $10 per month |
| Lock-in | Data in your GitHub account | CSV and API export; Linear-hosted |
| Handoff and work-queue overlap | A third list unless one is retired | Same: a third list |
| Fit for a solo founder plus AI agents | Good: same place as the PRs; fields match the model | Good tracker; model needs workarounds; best if a team joins |

## Unverified or not examined [U]

- Which OAuth scopes LinCal requests; whether it is open source; its paid-plan price; its "100+ teams" claim.
- Per-plan availability of API and webhooks on Free (the pricing page text lost its check marks); whether `Core: initiatives` applies to Free.
- The auto-archive minimum period (a third-party page says 1 month; the Linear page I read does not list options); whether deleted issues count toward the 250 cap.
- Whether Linear's GitHub app installs on a personal GitHub account for a private repo.
- The installation integrity of `schpet/linear-cli` releases (checksums not checked); the code of any community CLI or of `linear-gsuite`; which CLI commands set `estimate` and `due date` in v3.0.0 beyond the README text.
- The `linearis` capability table was read in part; `linctl`, `joa23`, `nesszer` and `lineark` were read by keyword only.
- Linear's Timeline and custom views in practice (not logged in); Linear's Insights details; the Linear Agent's behaviour.
- Whether the Linear label-group count, estimate rounding or milestone hack stays workable at our item volume (no live test: no workspace).

## Sources

Linear: https://linear.app/integrations/lincal ; https://linear.app/integrations/google-calendar ; https://linear.app/pricing ; https://linear.app/startups [S snippet] ; https://linear.app/developers ; /developers/graphql ; /developers/sdk ; /developers/rate-limiting ; /developers/oauth-2-0-authentication ; /developers/agents [S snippet] ; https://linear.app/llms.txt ; docs: /docs/issue-property ; /docs/github ; /docs/billing-and-plans ; /docs/api-and-webhooks ; /docs/delete-archive-issues ; /docs/projects ; /docs/project-milestones ; /docs/project-status ; /docs/project-labels ; /docs/initiatives ; /docs/sub-initiatives ; /docs/initiative-and-project-updates ; /docs/use-cycles ; /docs/timeline ; /docs/customer-requests ; /docs/insights ; /docs/linear-asks ; /docs/releases ; /docs/custom-views ; /docs/cli-importer [S snippet] ; changelog pages for initiative properties (2026-07-02), form templates (2025-11-20) and Linear Agent (2026-03-24) [S snippets] ; `raw.githubusercontent.com/linear/linear/master/packages/sdk/src/schema.graphql`.

GitHub: `github.com/linear` org and `api.github.com` metadata for `linear/linear`, `linear/linear-release`, `linear/linear-import`, `schpet/linear-cli`, `linearis-oss/linearis`, `dorkitude/linctl`, `joa23/linear-cli`, `flipbit03/lineark`; README, CHANGELOG and `docs/authentication.md` of `schpet/linear-cli`; README of `linear/linear-release`.

Third party: https://lincal.app ; https://yes.lincal.app ; https://yes.lincal.app/privacy ; https://reclaim.ai/integrations/linear [S] ; https://ifttt.com/connect/google_calendar/linear [S] ; https://github.com/tinyland-inc/linear-gsuite [S] ; https://www.reddit.com/r/Linear/comments/1tm85kg/ [S] ; https://linearguide-6914.notaku.site/ (unofficial billing and auto-archive pages) [S].

Vault: the approved research template and the GitHub Projects note, read from the Mac.
