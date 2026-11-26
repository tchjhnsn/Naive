<!-- Placement: tchjhnsn/Naive docs/design/WORKTREES_BRANCHES_RESEARCH_2026-11-01.md. Original research date: 1 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 1, 2026. Not a decision.

# Worktrees and branches for Naive's agents: research and recommendation

Prepared for Torian, Sunday Nov 1, 2026 (CST). Every source was fetched and checked during this research. Numbers in brackets point to the source list at the end.

**Goal being optimized:** shipping speed of the highest-known-quality outcomes. That means how fast work whose quality has been verified and measured, at the highest level achievable, reaches its proper endpoint.

## 1. Short answer

Your proposal is close to what the evidence supports. The part that matters most is already in it: one short-lived branch per item, named agent/item, deleted after merge. Short-lived branches, small batches and frequent merges are the practices DORA's research ties to both speed and stability [1][2][3]. The research also finds that speed and stability move together for most teams rather than trading off [3].

I recommend four changes:

1. **Worktree per item, not per agent.** A git worktree can hold only one checked-out branch, and git refuses to check out a branch already checked out in another worktree [5]. A long-lived per-agent worktree therefore forces each agent to do one item at a time, and to carry leftover files, dependencies and environment from item to item. That leftover state is exactly what makes quality less "known". Both Claude Code and Cursor default to a fresh worktree per session or task [9][10]. Cursor and Codex cloud agents give each task its own VM or workspace [11][12]. Your cloud coding agents already work this way.
2. **Put limits on branch lifetime.** DORA describes trunk-based branches as lasting "no more than a few hours" and recommends merging to trunk at least daily [1]. The trunk-based development guide sets a ceiling of two days, after which a branch risks becoming a long-lived feature branch [8].
3. **Verify the merged result, not just the PR head.** "Known quality" should attach to the exact commit that lands on main. A GitHub merge queue does this by testing temporary merge branches [6]. However, merge queues are only available for public repositories owned by an organization, or private repositories in organizations on Enterprise Cloud [6]. As of today, tchjhnsn is a personal account and the repo is private, so a merge queue is not available. The substitute is "require branches to be up to date before merging" (strict status checks) [7], with the review gate merging one PR at a time.
4. **Make the WIP limit explicit.** A per-agent worktree caps work-in-progress at one item per agent as a side effect. Per Little's Law that cap is good: average lead time equals average WIP divided by throughput [15]. Keep the benefit by setting the cap directly (for example, at most 2 open item branches per agent), rather than getting it accidentally from the directory layout.

## 2. What the recommended approach optimizes for and what it trades off

**Optimizes for:**
- **Short lead time per item.** Small batches cut cycle time, variability and feedback delay [2][16]. Little's Law ties lead time directly to WIP [15].
- **Fewer and cheaper merge conflicts.** In 73,504 merge scenarios, conflict odds rose with more commits, more changed files and longer contribution duration [18]. In 143 projects, almost 1 in 5 merges conflicted. Code involved in a conflict was twice as likely to have a bug, and 26 times more likely when the conflict needed manual resolution [19]. Short branches keep conflicts rare and small.
- **Known quality.**
  - Each item is built and tested in a clean tree.
  - Each item is reviewed as one small diff. DORA notes that large changes are hard to review and defects escape reviewers [1].
  - The quality evidence is tied to the commit that actually lands [6][7].
- **Parallelism without collisions.** Each worktree has its own HEAD and index while sharing the object store and refs [5]. Parallel checkouts are therefore cheap in disk space and fetch time.

**Trades off:**
- **Setup time per item.** Every fresh worktree needs dependencies installed. Cursor recommends a setup script (.cursor/worktrees.json) and fast package managers rather than symlinking dependencies [10]. Claude Code can copy gitignored files such as .env into new worktrees [9].
- **Serialized merges if there is no merge queue.** Strict up-to-date checks mean more builds, because each head branch must be updated after every merge to main [7]. Throughput is capped by how fast CI runs on the updated head.
- **Agents getting confused across worktrees.** A primary practitioner (Peter Steinberger) reports agents wandering into other worktrees. He also reports friction with several dev servers and database migrations across worktrees, and prefers separate clones [X1][X2][X3]. This is evidence from 2025 tools and one practitioner, not a measured rate. Mitigations:
  - keep worktrees outside the main repo folder;
  - give each worktree its own ports and database;
  - have the agent's working directory pinned by the harness.
- **Discipline cost.** Splitting work into items small enough to merge within a day is a skill. DORA calls it "a significant change" for developers not used to it [1].

## 3. How the alternatives compare on shipping speed of highest-known-quality work

Ratings are my judgment, based on the cited mechanisms.

| Option | Speed | Known quality | Main cost | Verdict |
|---|---|---|---|---|
| Worktree per item + short branch agent/item + strict merge (recommended) | High | High: clean tree, small diff, merged commit tested [5][7] | Setup time per item, serialized merges | Adopt |
| Long-lived worktree per agent + short branch per item (your proposal) | High, but one item at a time per agent | Medium: state carries over between items | Leftover files and dependencies; per-agent parallelism capped by the one-branch-per-worktree rule [5] | Close second; fine for the non-coding top-level agents |
| One long-lived branch per agent | Low | Low | Big infrequent merges, code freezes, stabilization phases [1]; conflict odds rise with duration and size [18]; conflicted code is buggier [19] | Reject |
| Shared checkout, branches only | Low under parallel load | Medium | One HEAD per checkout: agents block each other, and switching branches risks stash and dirty-tree mistakes [5] | Only for a single agent working serially |
| Trunk-based, direct push to main with feature flags | Highest in human teams [1][8] | Depends on pre-commit tests | Violates the "no push to main" rule and bypasses the review gate | Keep the idea (flags, dark launch [2]), not the direct push |
| Stacked PRs | High for dependent items | High: each layer is small and reviewed alone [14] | Needs restacking when a lower PR changes; tooling | Allow, up to 2 to 3 deep, for dependent items only |
| Merge queue | High at volume | Highest: tests the merged group before it lands [6] | Not available on a personal-account private repo [6]; CI must handle merge_group events [6] | Adopt when the repo moves to an eligible org, or when serialized merging becomes the measured bottleneck |

Note on the DORA "three or fewer active branches" finding [1]: it comes from human teams on one application in 2016 and 2017. With many agents, the principle that carries over is the one behind it: short branch lifetime and daily merges. The literal count does not carry over. That extrapolation is mine; I did not find DORA data on agent fleets.

Note on AI and batch size: DORA's 2024 report found that as AI adoption increased, delivery throughput fell by an estimated 1.5% and delivery stability by an estimated 7.2%. It names small batch sizes and robust testing as the basics that were missing [4]. DORA's batch-size guidance says small batches matter more, not less, with AI coding assistants [2]. This directly supports "one item per PR" for agents.

Note on branch alignment: Shihab, Bird and Zimmermann found, in Windows Vista and Windows 7, that misalignment between branching structure and organizational structure was associated with higher post-release failure rates [20]. Per-agent branches align with the org chart, but they are long-lived, and long life is the stronger documented risk [1][18]. Per-item branches named agent/item keep the ownership signal without the lifetime cost.

## 4. Concrete changes to the proposal

1. **Worktree per item.** Each top-level agent may keep one read-only "home" checkout of main for context, and never commits there. Each item gets `git worktree add -b <agent>/<item> <path-outside-repo> origin/main`. Remove it after merge with `git worktree remove`, not `rm`, so the administrative files are cleaned up. Run `git worktree prune` for strays [5].
2. **Branch name: `<agent>/<item-id>-<slug>`.** Turn on GitHub's automatic deletion of head branches after merge [13]. Merged branches stay restorable from the closed PR [21].
3. **Lifetime limits.** Target: merged within 1 day [1]. At 24 hours the branch is marked deprecated, and the owning agent either merges, splits, or explains. At 48 hours [8] it must be merged, split into new derived items, or removed with a reason recorded in provenance.
4. **WIP limit.** At most 2 open item branches per agent, and a portfolio-wide cap set from the gate's measured review throughput. Little's Law says lead time grows with WIP when throughput is fixed [15].
5. **Strict up-to-date merges by the review gate now**, one at a time [7]. Move to a merge queue [6] if the repo moves to an eligible organization and the measured wait in the gate becomes the bottleneck. Protected branches on a private repo require GitHub Pro, Team or Enterprise [7]. I could not see which plan Torian's account has.
6. **Record quality evidence against the merged SHA** in provenance: CI run id, gate review id, and the base SHA it was tested on. That is what makes the quality "known" for the commit that reaches the endpoint.
7. **Feature flags or dark launch** for items that should merge before their endpoint is ready, instead of holding branches open [2].
8. **Stacks only for true dependencies**, at most 2 to 3 deep. The upper branch is derived from the lower one and names it [14].

## 5. Draft noun and verb rules for Naive

Nouns (marked ours unless a standard is cited):
- `worktree@vcs`, as defined by git-worktree [5];
- `branch@vcs`, with subtype `item_branch@vcs` (`<agent>/<item>`);
- `trunk@vcs` (main);
- `pull_request@vcs`;
- `stack@vcs`.

Tier is the maximum of severity, reversibility and time to detect, per Naive's existing rule.

| Verb | Kind | Noun | Action | Tier | Reason |
|---|---|---|---|---|---|
| create | originate | worktree | `worktree add -b agent/item <path> origin/main` | low | Fully reversible with `worktree remove` [5] |
| create | originate | item_branch | New branch from current main | low | Nothing else depends on it yet |
| create | derive | item_branch | Branch from an unmerged item branch (stack); must name the source branch | low | Reversible; the source is named |
| amend | append | item_branch | Add commits to your own branch | low | History preserved |
| amend | revise | item_branch | Rebase onto main and push `--force-with-lease`, no review in progress | low | The lease refuses to overwrite remote changes you have not seen [22] |
| amend | revise | item_branch | Same, with a gate review in progress | costly | Invalidates the reviewed head; forces re-review |
| amend | revise | any branch with other writers, or any force push without a lease | Overwrite remote history | one_way_door | Others' commits can be lost with no guaranteed recovery |
| amend | rename | item_branch | Rename the branch | low with no PR; costly with an open PR | Breaks PR, CI and provenance links |
| amend | rename | worktree | `git worktree move` | low | Reversible [5] |
| amend | deprecate | item_branch | Mark stale at 24 h | low | Signal only |
| amend | revise | worktree | `git worktree lock` / `unlock` | low | Prevents prune, move and delete; reversible [5] |
| delete | merge | item_branch into trunk | Gate merges the PR; the successor is the merge commit on main | costly by default, inheriting the item's tier if higher | Revertible, but it reaches endpoints; a one-way-door item (for example a live price) keeps its tier |
| delete | remove | item_branch (merged) | Delete after merge | low | Restorable from the closed PR [21] |
| delete | remove | item_branch (unmerged, has a PR) | Delete | costly | Restorable from the closed PR [21], but work stops |
| delete | remove | item_branch (unmerged, no PR, no other copy) | Delete | one_way_door | No guaranteed recovery path |
| delete | remove | worktree (clean) | `git worktree remove` | low | Only clean worktrees can be removed without `--force` [5] |
| delete | remove | worktree (dirty) | `git worktree remove --force` | one_way_door | Discards uncommitted and untracked work [5] |
| delete | remove | worktree metadata | `git worktree prune` | low | Only affects worktrees already missing [5] |
| (forbidden) | n/a | trunk | Direct push, force push, delete | blocked | Branch protection settings for force pushes and deletions [7] |

Compound changes split per your existing rule. For example, "rebase and rename" becomes one `amend revise` line and one `amend rename` line.

## 6. Second question: is "best gains with least tradeoff weight" the premise of established decision frameworks?

**Where it matches:**
- **Pareto optimality.** In multi-objective optimization, a solution is Pareto optimal when no objective can improve without another getting worse [23]. Removing dominated options, ones that are worse on something and better on nothing, is the shared first step of nearly every framework. Your instinct to find "gains without tradeoffs" is exactly that step.
- **Multi-attribute utility theory** (Keeney and Raiffa [24]) makes tradeoffs explicit and weighs them, which is your "tradeoff weight".
- **Cost of delay and WSJF.** Reinertsen argues for converting everything into one economic unit, with cost of delay as the key number [16][17]. WSJF sequences work by relative cost of delay divided by job duration [17]. This is your framing with a single common currency.
- **Satisficing** (Simon [25]) accepts the first option that is good enough on every criterion when searching for the optimum costs too much. It fits low-tier decisions.

**Where it differs:**
1. **"Least tradeoff weight" is only defined once you have weights or a common unit.** Without them, the Pareto set usually holds several options and none is "the best" [23]. MAUT supplies the weights [24]. Reinertsen supplies the unit (cost of delay) [16]. Naive needs to choose one of these per decision type.
2. **The goal is the best net value, not the least sacrifice.** An option with a large tradeoff can still win if its gain is larger. Minimizing the tradeoff on its own can pick a timid option. The established frameworks maximize total weighted value; they do not minimize the loss term separately [16][24].
3. **Some tradeoffs are constraints, not weights.** One-way doors behave like hard limits: no amount of speed buys an unrecoverable loss. Treating them as a filter before weighing fits Naive's tiers better than putting them on the same scale.
4. **The cost of deciding counts too.** Simon's point is that the search for the best option has its own cost [25]. For low-tier choices, good enough is the economically better rule.

**Suggested Naive wording:** "Remove dominated options. Treat one-way doors as hard constraints. Compare what remains in one unit, using cost of delay when it can be estimated and explicit weights when it cannot. Satisfice on low tier." That keeps Torian's intent and closes the gaps.

## 7. X evidence (practitioners, ranked)

Primary authors and tool builders:
- **Cat Wu (Claude Code at Anthropic):** Claude Desktop creates a new worktree for every new local Claude Code session "so that your agents don't interfere with each other". https://x.com/_catwu/status/1993430315495497958 [X4]
- **Lee Robinson (then at Cursor):** run several agents for one prompt, each in its own worktree, and Cursor suggests the best one. https://x.com/leerob/status/2001416604655980868 [X5]
- **Peter Steinberger (heavy multi-agent user, tool builder):**
  - "the worktree part is great until claude goes wind and runs into another worktree all confused": https://x.com/steipete/status/1957883151356768300 [X1]
  - dev servers and database migrations across worktrees: https://x.com/steipete/status/1960141767744831899 [X2]
  - prefers multiple copies of the repo: https://x.com/steipete/status/2011606345074753619 [X3]
  - Codex creating worktrees on its own when other work is going on: https://x.com/steipete/status/2006351015189037473 [X6]

The rest is mostly tool promotion (Superset, Agent Orchestrator, Orca, Cline Kanban) claiming "zero merge conflicts". That claim is misleading: worktrees prevent edit collisions while work is in progress, not conflicts at merge time. Merge-time conflicts depend on overlap, size and duration [18].

## 8. Access notes
- The SAFe WSJF page shows only its definition before a login wall. I used only that definition.
- I could not open the full text of the Dias et al. paper on ScienceDirect. Its odds ratios come from the authors' public results site and preprint [18].
- I could not see Torian's GitHub plan. The repo returns 404 publicly, so it is private, and the owner is a User account.
- No DORA data covers fleets of AI agents specifically. Applying the findings to agents is my reasoning.

## Sources
1. DORA. Capabilities: Trunk-based development. https://dora.dev/capabilities/trunk-based-development/ . Branches last no more than a few hours. From 2016 and 2017 data: three or fewer active branches, merge to trunk daily, no code freezes. Heavy review leads to big batches.
2. DORA. Capabilities: Working in small batches. https://dora.dev/capabilities/working-in-small-batches/ . Small batches, INVEST, dark launch and feature toggles; more critical with AI.
3. DORA. DORA's software delivery metrics (four keys guide). https://dora.dev/guides/dora-metrics-four-keys/ . Metric definitions; "speed and stability are not tradeoffs".
4. Google Cloud blog. Announcing the 2024 DORA report. https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report . An estimated 1.5% throughput decrease and 7.2% stability decrease with AI adoption. Also https://dora.dev/research/2024/dora-report/
5. Git. git-worktree documentation. https://git-scm.com/docs/git-worktree . Shared repository; per-worktree HEAD and index; a branch already checked out elsewhere is refused; remove, prune, lock.
6. GitHub Docs. Managing a merge queue. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue . Availability limits, gh-readonly-queue temporary branches, build concurrency 1 to 100.
7. GitHub Docs. About protected branches. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches . Plan availability, strict vs loose status checks, settings for force pushes and deletions.
8. Hammant, P. et al. Trunk Based Development: Short-Lived Feature Branches. https://trunkbaseddevelopment.com/short-lived-feature-branches/ . Two-day ceiling; one developer (and their agents) per branch.
9. Anthropic. Claude Code docs: Worktrees. https://code.claude.com/docs/en/worktrees ; Common workflows: https://docs.claude.com/en/docs/claude-code/common-workflows . A worktree per session on branch worktree-<name>; auto-removed when clean.
10. Cursor Docs. Worktrees. https://cursor.com/docs/configuration/worktrees . Each task gets its own checkout; worktrees.json setup.
11. Cursor Docs. Cloud Agents. https://cursor.com/docs/cloud-agent . Isolated VMs, a separate branch per agent, many in parallel.
12. OpenAI. Codex Cloud. https://developers.openai.com/codex/cloud . "Each task has its own workspace."
13. GitHub Docs. Managing the automatic deletion of branches. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-the-automatic-deletion-of-branches
14. Graphite. Stacked diffs guide. https://graphite.dev/guides/stacked-diffs . Definition and workflow (vendor source).
15. Little, J. D. C. (1961). A Proof for the Queuing Formula L = λW. Operations Research. https://doi.org/10.1287/opre.9.3.383
16. Reinertsen, D. (2009). The Principles of Product Development Flow. Celeritas. Chapter 1 (publisher PDF): http://celeritaspublishing.com/wp-content/uploads/2013/07/ReinertsenFLOWChap1.pdf . Cost of delay; queues; batch size.
17. Scaled Agile. Weighted Shortest Job First. https://framework.scaledagile.com/wsjf . WSJF = relative cost of delay / relative job duration.
18. Dias, K., Borba, P., Barreto, M. (2020). Understanding predictive factors for merge conflicts. Information and Software Technology. https://doi.org/10.1016/j.infsof.2020.106256 ; results: https://merge-conflict-factors.github.io/merge-conflict-factors/rq3-results.html . 73,504 merge scenarios. Commits, changed files and duration raise conflict odds (Ruby: commits 3.55, files 3.27, duration 1.04 to 1.09; Python: commits 2.16, files 2.40, duration 1.18 to 1.23).
19. Brindescu, C., Ahmed, I., Jensen, C., Sarma, A. (2019). An empirical investigation into merge conflicts and their effect on software quality. Empirical Software Engineering. https://doi.org/10.1007/s10664-019-09735-4 . Almost 1 in 5 merges conflict; conflicted code 2 times as likely to have a bug, 26 times when manual.
20. Shihab, E., Bird, C., Zimmermann, T. (2012). The effect of branching strategies on software quality. ESEM. https://doi.org/10.1145/2372251.2372305 ; https://www.microsoft.com/en-us/research/publication/the-effect-of-branching-strategies-on-software-quality/
21. GitHub Docs. Deleting and restoring branches in a pull request. https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/deleting-and-restoring-branches-in-a-pull-request
22. Git. git-push documentation (--force-with-lease). https://git-scm.com/docs/git-push
23. Miettinen, K. (1998). Nonlinear Multiobjective Optimization. Springer. https://doi.org/10.1007/978-1-4615-5563-6
24. Keeney, R., Raiffa, H. (1976; Cambridge reissue 1993). Decisions with Multiple Objectives: Preferences and Value Tradeoffs. https://doi.org/10.1017/CBO9781139174084
25. Simon, H. (1955). A Behavioral Model of Rational Choice. Quarterly Journal of Economics. https://doi.org/10.2307/1884852
Book: Forsgren, N., Humble, J., Kim, G. (2018). Accelerate. IT Revolution. https://itrevolution.com/product/accelerate/

X:
X1. https://x.com/steipete/status/1957883151356768300
X2. https://x.com/steipete/status/1960141767744831899
X3. https://x.com/steipete/status/2011606345074753619
X4. https://x.com/_catwu/status/1993430315495497958
X5. https://x.com/leerob/status/2001416604655980868
X6. https://x.com/steipete/status/2006351015189037473
