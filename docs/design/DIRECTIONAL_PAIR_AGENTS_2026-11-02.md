<!-- Placement: tchjhnsn/Naive docs/design/DIRECTIONAL_PAIR_AGENTS_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Directional pair agents (X@Y): design and light research

Prepared Nov 2, 2026, about 1:30 AM CST, for Torian. Design and research only. Nothing in the repo or any account was changed.

Goal wording used throughout: shipping speed of the highest-known-quality outcomes, meaning quality that has been verified or measured, as high as possible.

## 0. Short answer

1. **An X@Y agent is a durable lens.**
   - Function X owns it.
   - It speaks X's ontology.
   - It reads Y's records.
   - It writes only X's record kinds, into X's ledger.
   - Every record it writes goes through the Lead.
   - The asymmetry is real and useful. finance@engineering prices and gates engineering's designs. engineering@finance builds finance's tools. They share no record kinds.
2. **This refines Torian's blackboard decision; it does not replace it.**
   - The earlier recommendation already said a relationship child has exactly one owning parent [4].
   - A durable child owned by Finance that works on engineering's records is finance@engineering.
   - So the proposal is to make durable relationship children directional lenses, and keep temporary children only for live back-and-forth.
   - The Lead stays the only router.
3. **Most of the possible pairs should not exist.**
   - The Lead is a router, not a function. That removes the 10 ordered pairs that involve it, leaving 20.
   - Of those, start with 2 durable lenses: finance@engineering and finance@growth.
   - Promote other pairs only when Rule C's recurrence test is met [4].
   - If a stateless check can do a lens's job, it should be a gate rule in code, not an agent.
4. **Gating authority belongs in config.** Each entry says who may hold, postpone or veto which record kind at which tier.
   - Release conditions are predicates over records that code can check.
   - If a predicate cannot be evaluated, the item stays on hold.
   - Only Torian releases a one-way door.
5. **Design is cheaper than implementation, but CI is not the reason.**
   - Today every PR runs the full CI, design-only PRs included, because `test.yml` has no path filter [1].
   - A design PR saves about 5 minutes per test run, and only with PR #154, which is still open [2].
   - That is about $0.09 to $0.12 per merged PR.
   - The real savings are the implementation tokens, rework and spend that a design-time hold avoids.
   - The famous 100x cost-of-defect curve is disputed [16][17], so the case for gating at design time rests on irreversibility (real options [12]), not on that curve.

## 1. What the repo says today

I read these remotely from `main` on Nov 2, 2026, without cloning [1].

**Is engineering a function?** No.
- `packages/naive/src/functions/departments.json` lists 13 functions taken from APQC's Level 1 categories.
- Product development sits in `products` (APQC 2.0) and internal tooling in `it` (APQC 8.0).
- There is no engineering function.
- `packages/naive/library/packages/engineering/package.json` is a package of `kind: "handoff"`, sent `from` product and marketing.
- `NAIVE_SYSTEMS_2026-11-01.md` calls a handoff "a view, not a what".
- The roles file (`packages/naive/template/governance/roles/agent-roles.json`) has an `architect` who decides "ADRs inside decided strategy" and a `builder` who decides "how to implement within the handoff".

**The top-level agents are not in the repo.** A code search for Lead, Strategy, Product, Growth and Finance as agents found nothing. I took them from the brief.

**A seed of finance@engineering already exists.**
- The `operations-finance-lead` role "reviews: cost and terms of proposed dependencies".
- It escalates "to founder for any new expense, plan upgrade, cancellation of an in-use service, or terms".

**Pattern to reuse.**
- The relationship-theorem handoff specifies functions that "read only records" and return `{ verdict, open_obligations }`.
- It also requires that "`unknown` never counts as zero anywhere".
- Gate release predicates below follow the same contract.

**CI facts.**
- `test.yml` runs on every `pull_request` with no `paths` filter.
- `docs-required.yml` runs on every `pull_request`. `pr-review.yml` runs on `deployment_status` and `workflow_dispatch`, and its only job is `preview`. It has no `checks` job.

**Proposed mapping of agents to functions** (my proposal, not in the repo):

| Agent | Functions it performs (from the 13) |
| --- | --- |
| Lead | none: it routes records and is not a function |
| Strategy | strategy (1.0) |
| Product | products (2.0), the discovery and design part |
| Growth | marketing-and-sales (3.0) |
| Finance | finance (9.0) |
| Engineering | products (2.0), the delivery part, plus it (8.0) |

The repo separates functions from organization: "A department is not a function... an optional grouping" [1]. An Engineering agent can therefore exist without adding a 14th function (Decision 4).

## 2. Formal definition of X@Y

X@Y reads as "X at Y": X's specialist, stationed on Y's records.

| Property | Rule |
| --- | --- |
| Owner (home) | X. Only X may edit what X@Y writes (parent-only edits). X@Y can be retired only by X or Torian |
| Ontology spoken | X's nouns and senses. Where a word means something different in Y, the X sense applies inside X@Y's records (scoped senses, one owner each) |
| Reads | Y's records of the kinds it subscribes to, through the Lead, as a per-lens view (Section 7). Reading is never editing |
| Emits | Only record kinds that X owns. Each one cites the Y records it is about in `derived_from`, so the provenance chain links them |
| Writes to | X's ledger, for example `finance/projections/<adr-id>.json` |
| Routes | 1. Vertical, always: to X. 2. Horizontal, always: a notice to Y's owner when a record is about Y's item. 3. Diagonal, by subscription: to other functions (Strategy, Lead), chosen by fixed rules plus the learned router (Section 6) |
| May ask Y to change | Only through a request record: a design-diff proposal with verb `amend` and a kind. Y's owner applies it or declines it. X@Y never writes Y's records |
| Gate powers | None by default. Powers come only from the gate-authority config (Section 4) |
| Lifetime | Durable if Rule C holds for the pair's recurring record flow [4]. Otherwise X spawns a temporary instance per occurrence |
| Live talk | When X@Y needs live back-and-forth with Y, it spawns a temporary relationship child that X owns. The child is removed after it writes its record |

**Prior art for the shape.**
- Galbraith's lateral relations. He says that when "the volume of contacts between any two departments grows, it becomes economical to set up a specialized role", a liaison role [6]. He builds on Simon's cognitive-limits theory [6].
  - A durable X@Y is that liaison role.
  - A temporary relationship child is his task force, which "exists only as long as the problem remains" [6].
  - A gate-holding X@Y is close to his integrating role.
- The embedded finance partner. AFP describes finance that "embeds FP&A staff in the business units to support rapid decision-making" while FP&A reports to the CFO [9]. That is finance@Y: the agent sits with Y but answers to Finance.
- Why one owner and not a matrix. Davis and Lawrence documented matrix pathologies such as power struggles and decision bottlenecks [7]. The earlier coalition research cites a measured gain from a single finalizer [4].

### Worked example: the asymmetry

| | finance@engineering | engineering@finance |
| --- | --- | --- |
| Owner | Finance | Engineering |
| Speaks | finance: cost, budget, runway, projection, cost of delay | engineering: ADR, pipeline, meter, schema, test |
| Reads | ADRs, design plans, implementation handoffs, dependency lists, CI and token usage, vendor price pages | Finance's requirements: the spend register shape, model specs, reports Finance wants |
| Emits | cost-projection on an ADR or design plan; gate-decision (hold, postpone, release, refer) on the matching implementation; cost-reconciliation (projection against actual); notices to Strategy (runway change) and Lead | ADRs for finance tooling; build handoffs; meter specs (what cost is measured, where, how often); pipeline records; Lean model scaffolding |
| Ledger | Finance's | Engineering's |
| Gate power | Hold or postpone on implementation of costly-tier items, by config | None over Finance. It can refer a Finance request back as infeasible |
| Team Topologies class [8] | Close to an enabling team that also holds a gate (not one of the four types exactly) | Platform: Finance consumes it as a service |
| FinOps match [10] | Inform phase (allocation, forecasting, unit economics) plus the Finance persona | Engineering persona: "Automation and Tooling Implementation", "Monitoring and Alerting" |

**The research done so far was finance@engineering work.** The Actions usage report [3] and the blackboard storage report [5] are this lens's first two cost-projection records.

## 3. Typology: which pairs exist

**Counting.**
- 6 agents give 30 ordered pairs.
- The Lead is a router. Lead@X would be a second router, and X@Lead would let one function shape routing. The router itself learns routing (Section 6).
- So the 10 pairs with the Lead should not exist. That leaves 20 ordered pairs among 5 functional agents.

**The existence rule.** X@Y should exist durably only if all four hold:
1. **Typed dependency.** Some record kind K owned by Y is an input to a decision class D owned by X. Example: an ADR is an input to "approve spend".
2. **Not just a check.** X's question about K needs judgment, research or projection. A threshold test should be a gate rule in code.
3. **Recurrence.** The K-to-D flow meets Rule C, f · H · sigma(s) >= K + m · H + d, measured from provenance as a conservative lower bound [4]. This is Galbraith's volume-of-contacts test in symbols [6].
4. **Different from Y's own job.** If Y already owns D, the pair is redundant.

**Five classes:**

| Class | What it does | Gate power | Prior art |
| --- | --- | --- | --- |
| Gatekeeper lens | Assesses Y's items in X's terms and may hold or postpone them | Only by config | Cooper's gatekeepers, who "own the resources required by the project team for the next stage" [11]; RAPID's "Agree" role [14] |
| Advisory lens (partner) | Emits assessments Y must answer, cannot block | None; can refer to Torian | Liaison role [6]; embedded FP&A [9]; RACI "Consulted" [13] |
| Enabling or platform | Builds and maintains capability that Y uses | None | Team Topologies platform and enabling teams; X-as-a-Service [8] |
| Temporary pair | Spawned per occurrence for a rare joint need, removed after its record | None | Galbraith's task force [6]; Rule C's ephemeral branch [4] |
| Should not exist | Pairs with the Lead; pairs failing tests 2 to 4; gatekeeper lenses on reversible low-tier work | n/a | Section 4 explains the low-tier case |

**Proposed starting set.** The recurrence numbers are not measured yet, so the durable ones are judgment calls to verify against provenance within a few weeks.

| Pair | Class | Status at start | Why |
| --- | --- | --- | --- |
| finance@engineering | Gatekeeper | Durable | Recurs on every ADR and dependency (two reports already); the role file already has a cost reviewer |
| finance@growth | Gatekeeper | Durable | Spend and price decisions recur; live price is a one-way door, so Torian confirms |
| engineering@finance | Platform | Temporary until recurrence | As of 2026-11-02 this note said `instance/.../finance/` (as of 2026-11-02; since moved/removed) held only `.gitkeep`. There is no `instance/` directory as of 08a5466, so there is no flow yet |
| strategy@product | Advisory | Temporary | Strategy-fit checks on product plans: Cooper's "must meet: does this align with our strategy" [11] |
| growth@product | Advisory | Temporary | Demand signals into product plans |
| finance@product | Advisory | Temporary; may merge into finance@engineering | Unit economics per feature |
| engineering@growth | Platform | Temporary | Site and analytics instrumentation |
| All other functional pairs | Temporary pair | On demand | No recurring flow known yet |

## 4. Ontology per type

Question types keep the agreed form, verb plus noun plus asking function. Example: "release implementation, asked by engineering". Tier is the maximum of the four 1-to-3 scores. The defaults below are starting points that the most-specific rule can override.

### finance@engineering (gatekeeper lens)

| Record kind (Finance owns) | Sense | Verbs it may use | Default tier |
| --- | --- | --- | --- |
| cost-projection | Projected cash cost of one design plan or ADR over a stated horizon. It covers tokens, CI minutes, storage, vendors and people time priced by cost of delay. Each figure carries a source or a labeled assumption | create; amend as a new version, with corrections as new rows | low; costly if it adds recurring spend above a threshold or a new vendor |
| gate-decision | A verdict on one implementation item: release, hold, postpone or refer. It carries release predicates and an expiry | create; amend by superseding | max(tier of the gated item, low) |
| cost-reconciliation | Projection against measured actual, with the error. It calibrates the lens | create | low |
| notice | A pointer record to Strategy (runway or budget change) or the Lead | create | the tier of what it points at |
| design-diff request | A proposal that Engineering amend its own design, such as a cheaper store or batched writes | create (verb amend, kind ADR or design plan) | the tier of the target |

- **Nouns read but not owned:** ADR, design plan, implementation, dependency, run.
- **Senses Finance owns inside this lens:**
  - "cost" means cash outflow plus priced delay;
  - "budget" means an allocation Finance owns;
  - "model" means a financial model.
- **Never:** delete on any record. The log is append-only, and corrections add rows.

### engineering@finance (platform)

| Record kind (Engineering owns) | Sense | Verbs | Default tier |
| --- | --- | --- | --- |
| ADR (finance-tooling) | An architecture decision about a tool Finance uses | create, amend, delete for drafts only | low |
| build handoff | Done-criteria for a finance tool | create, amend | low |
| meter spec | What cost is measured, the source, how often, and the field names | create, amend | low; costly if it reads billing data |
| pipeline record | A data flow into Finance's records | create, amend | costly if it writes into money records |
| model scaffold | Code or Lean structure for a Finance model, where Finance owns the numbers | create, amend | low |

- **Senses Engineering owns inside this lens:**
  - "model" means software that computes a model;
  - "meter" means instrumentation.
- The same word "model" therefore has two scoped senses with one owner each, and the gate's terminology check tells them apart by the lens.
- **One-way door:** anything that moves money or signs in to bank or billing accounts. The role file already forbids the latter [1].

### Others, briefly

- **finance@growth:**
  - campaign-budget projection;
  - CAC projection;
  - gate-decision on spend;
  - price-change assessment. Any live price is a one-way door and routes to Torian.
- **strategy@product:** strategy-fit assessment (fits, misfit with reasons, or refer). It cannot block. A misfit refers the item to Torian.
- **growth@product:** demand-signal record citing its evidence. Advisory only.

## 5. Gating authority as configuration

**A proposed `gates.authority` section in `naive.config.json`.** It is not in the schema today.

``json
{
  "gates": {
    "authority": [
      {
        "record_kind": "implementation",
        "tier": ["costly"],
        "holder": "finance",
        "via": "finance@engineering",
        "powers": ["hold", "postpone"],
        "requires": "cost-projection",
        "release": ["budget.remaining('engineering') >= projection.p90", "runway_months >= 9"],
        "max_hold_days": 14,
        "escalate_to": "torian"
      },
      {
        "record_kind": "*",
        "tier": ["one-way-door"],
        "holder": "torian",
        "powers": ["veto", "release"],
        "others": ["hold"]
      }
    ]
  }
}
``

The predicate names and thresholds above are placeholders, not proposals for the numbers.

**Powers:**
- **hold:** pause until every release predicate is true. Code re-checks the predicates whenever their input records change, and releases automatically.
- **postpone:** hold until a named date or event, then re-decide. This is the real option (below).
- **veto:** kill. Only Torian may veto a one-way door. A function may veto only inside its own decision class, as agreed earlier [4].
- **refer:** send to Torian with a reason.

**Rules:**
- **Most specific rule wins; ties go to Torian.** These are the existing rules. The `*` one-way-door entry is the least specific, but no entry may grant release on a one-way door to anyone but Torian. The config check should reject such an entry.
- **Predicates are code over records.** Like relationship theorems, they read only records and return `{ verdict, open_obligations }` [1]. If a predicate input is unknown, the verdict is hold, with an open obligation naming the missing record. Unknown never counts as zero.
- **Every hold expires** (`max_hold_days`). At expiry it escalates to Torian rather than lingering. This bounds cost of delay.
- **Order relative to the existing gate chain.**
  - The chain (terminology, type, completeness, verifiability) answers "is this record well-formed and supported".
  - Authority gates run after it and answer "should this go now".
  - A record that fails the chain never reaches an authority gate.
- **Claims, scores, confirmation.**
  - The lens claims the facts in a projection, with sources.
  - Jev scores it.
  - Torian confirms one-way doors.
  - The same split as today.
- **Exploration.** The learned router may never change gate powers. Changes to `gates.authority` are packages that Torian decides.

**Postponement as a real option.**
- McDonald and Siegel show that when an investment is irreversible and its value uncertain, waiting has value. For plausible parameters it can be optimal to wait until benefits are about twice the cost [12].
- Cooper's gates make the same move in practice: Hold and Recycle are outputs alongside Go and Kill. Gate 3, before development, is "the last point at which the project can be killed before entering heavy spending" [11].
- For Naive, postpone an implementation only if all three hold:
  1. The item is costly or one-way-door tier. Reversible low-tier work has little option value, because undoing it is cheap. So no gate: ship, measure and reconcile.
  2. A named observable will settle the uncertainty, and the release predicate can check it.
  3. The expected loss avoided by deciding after the observable resolves exceeds cost of delay times the wait. Both are in dollars, per the general decision rule.

## 6. Is design really cheaper than implementation?

**What we measured.**
- **Per PR head:** about 13 to 15 billable minutes. That is 11 to 13 for the test workflow, 1 for docs-required and 1 for the pr-review checks [3].
- **Test job:** the latest test job took 605 s [3]. PR #154 says "about 10 minutes" [2].
- **Rate:** Task 3 used GitHub's $0.006 per minute for Linux 2-core [3]. PR #154 uses "$0.008 a minute" [2]. I give both.
- **Per merged PR:** a mean of 3.01 test runs [3], so about 39 to 45 billable minutes, or $0.23 to $0.36.
- **Design-only PRs today:** they run the same full suite, because `test.yml` has no path filter [1].
  - PR #154, open, would skip two slow groups on such diffs. It saves "about 305 seconds", about 5 minutes per test run [2].
  - That would make a design PR about 24 to 30 minutes per merged PR, $0.14 to $0.24.
  - The difference against an implementation PR is about $0.09 to $0.12.
- **How rare design-only diffs are:** in PR #154's sample, only 24 of 620 commits would skip both groups [2].
- **Why not just path-filter the workflow:** a path filter that skips a required workflow leaves its check pending and blocks the merge [18]. PR #154 skips steps inside the job for that reason.

**So CI is not what makes design cheaper.** Torian's intuition is right about the total and wrong about the mechanism. A design record is cheaper because it avoids:
- the implementation's agent tokens;
- the rework if the design is wrong;
- any spend the implementation commits to.

None of those is measured per item yet. The cost-reconciliation record is how to measure them.

**Cost of change by phase is disputed.**
- The widely quoted 1x, 6.5x, 15x, 100x chart is credited to an "IBM Systems Sciences Institute". Bossavit traced it to internal course notes cited in a textbook, with no published data [16].
- Menzies, Nichols, Shull and Layman tested the delayed-issue effect on 171 projects from 2006 to 2014. They "found no evidence for the delayed issue effect" and conclude it "might be an historical relic that occurs intermittently only in certain kinds of projects" [17].
- They also cite data showing flatter curves for small projects [17].

**Implication.**
- Put finance@engineering's gate at design time.
- The reason is that implementation is where irreversible spend and tokens start (the real-options argument), not that late fixes are always 100 times dearer.
- Limit the gate to costly and one-way-door tiers.
- Low-tier work ships under the builder's existing reversible-work rule [1].

## 7. Communication topology

| Direction | Example | Fixed or learned |
| --- | --- | --- |
| Vertical (lens to parent) | finance@engineering's records go to Finance | Fixed: always |
| Horizontal (lens to host) | Engineering gets a notice whenever an item of theirs is held | Fixed: always for holds and requests |
| Horizontal (pair to pair) | finance@engineering and engineering@finance agree a meter spec | Through records via the Lead. If live talk is needed, a temporary relationship child owned by one parent |
| Diagonal (lens to a third function) | finance@engineering notifies Strategy of a runway change | Learned, inside allowed subscriber sets |
| Up to Torian | One-way doors, ties, expired holds, refers | Fixed |

The Lead routes every record. No agent messages another directly. A mesh among 5 functional agents would have 10 channels; a hub has 4 [4].

**What the bandit or offline-RL router learns** (as configuration, inside the harness):
- **Diagonal subscribers:** for each record kind and tier, who besides the fixed recipients gets a notice.
- **Format:** whether a recipient gets a pointer, a per-lens view, or the full record.
- **Live or packet:** whether to spawn a live child or send a packet (Rule A [4]).
- **Promotion and retirement:** when to suggest promoting a temporary pair to durable, or retiring a durable one. Rule C supplies the estimates. Torian decides.

**Reward:**
- Credit: first-pass gate success, no later reversal within the time-to-detect window, and rework avoided.
- Debit: tokens, delay priced by cost of delay, and notices nobody acted on.
- Report Wilson lower bounds, to match known quality [4].

**Safe exploration by tier:**
- **Low:** explore among allowed options.
- **Costly:** a conservative bandit that never falls below the current rule's performance [19]. Policy changes are checked offline first with doubly robust estimates [20].
- **One-way door:** no exploration; the fixed route to Torian. Learning-to-defer is the formal model for that hand-off [21].

**Never learned:**
- the Lead as the only router;
- parent-only edits;
- gate powers;
- the order of the gate chain;
- one-way doors going to Torian;
- the host being told of a hold.

## 8. Reconciling with the Lead-routed blackboard and the pending reads question

**Blackboard.** Nothing changes in the coordination decision.
- X@Y lenses are typed subscribers and emitters on the blackboard.
- Temporary relationship children still handle live back-and-forth and are removed after writing their record.
- What changes: a durable joint child becomes a directional lens owned by one parent. The earlier "one owning parent per child" recommendation [4] already pointed this way.

**Storage.** A lens adds records but no new storage tier. A cost-projection and a gate-decision are about the size of the decision and gate records already measured, roughly 0.4 to 4.4 KB raw [5]. Storage stays immaterial.

**Reads.** The pair approach strengthens option (a), summaries plus pointers, with one refinement.
- A durable lens reads the same host record kinds again and again. Read amplification is the cost that matters [5].
- Give each lens a view defined by its own ontology. finance@engineering's view of an ADR would be its dependencies, volume assumptions and recurring cost drivers, with hashes stripped.
- Code should project these views by selecting fields, not an agent writing summaries, so the only loss is selection.
- Cache the views, and keep a pointer to fetch the full record on demand.

## 9. Decisions for Torian (one question each)

**Decision 1. What is an X@Y agent?**
- (a) A lens owned by X. It reads Y's records, writes only X's record kinds into X's ledger, and routes through the Lead. It replaces durable relationship children; temporary children stay for live back-and-forth.
- (b) An agent owned jointly by X and Y, reporting to both.
- (c) Another name for a relationship child, with no change.
- **Recommendation: (a).** It keeps parent-only edits and one owner. It avoids matrix pathologies [7]. It matches Galbraith's liaison role for recurring two-unit contact [6].

**Decision 2. Which pairs start durable?**
- (a) finance@engineering and finance@growth durable. Every other functional pair is temporary until provenance shows Rule C's recurrence. No pairs with the Lead.
- (b) Create all 20 functional pairs as durable now.
- **Recommendation: (a).** Only these two have a known recurring flow and a gate role today. The rest would be maintenance without measured demand [4].

**Decision 3. How much gating power does finance@engineering get by default?**
- (a) Hold or postpone on costly-tier implementations, set in config. Release predicates are checked by code and release automatically. Holds expire after a set number of days and escalate. Unknown inputs mean hold. Only Torian releases or vetoes one-way doors.
- (b) Veto over any implementation.
- (c) Advisory only, no gate.
- **Recommendation: (a).** Postponing is worth something only where work is costly or irreversible [12]. Low-tier work ships under the reversible-work rule. Expiry bounds the cost of delay.

**Decision 4. Is Engineering its own top-level agent?**
- (a) Yes, as an agent that performs the delivery part of the products function plus IT, with no new function added. The architect and builder roles sit under it.
- (b) Engineering stays inside the Product agent.
- (c) Make engineering a 14th function.
- **Recommendation: (a).** The repo separates functions from organization [1], and APQC puts development inside products and tooling in IT. Most current activity is engineering (23 merges a day [3]), so folding it into Product would overload one agent [8]. A 14th function would have to pass the four function tests first.

## Sources

1. tchjhnsn/everything-ecosystem at `main`, read Nov 2, 2026 via the GitHub API (private repo): `packages/naive/src/functions/departments.json`; `packages/naive/library/packages/engineering/package.json`; `docs/design/NAIVE_SYSTEMS_2026-11-01.md`; `packages/naive/template/governance/roles/agent-roles.json`; `docs/design/HANDOFF_GROK_VENTURE_RECORDS_AND_RELATIONSHIPS_2026-11-01.md` (as of 2026-11-02; since moved/removed); `packages/naive/src/records/naive-config.schema.json`; `.github/workflows/test.yml`, `docs-required.yml`, `pr-review.yml`. https://github.com/tchjhnsn/everything-ecosystem
2. PR #154, "Cut pull request CI cost: cancel replaced runs and skip slow groups" (open; created Nov 2, 2026, 12:30 AM CST). https://github.com/tchjhnsn/everything-ecosystem/pull/154
3. Task 3 report, the companion Mentura3 research note `docs/mentura/research/ACTIONS_USAGE_2026-11-01.md` (as of 2026-11-02; since moved/removed) (GitHub Actions usage, Oct 27 to Nov 1, 2026; rates from GitHub Docs, "Actions runner pricing").
4. Task 4 report, `docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md` (Rules A to D; single-owner recommendation; channel counts; Wilson bounds).
5. Task 5 report, `docs/design/BLACKBOARD_STORAGE_COST_2026-11-02.md`.
6. Galbraith, J. R. (1974). "Organization Design: An Information Processing View." Interfaces 4(3):28-36. https://doi.org/10.1287/inte.4.3.28 (text: https://jaygalbraith.com/wp-content/uploads/2024/03/infoprocess1974.pdf)
7. Davis, S. M. and Lawrence, P. R. (1978). "Problems of Matrix Organizations." Harvard Business Review 56(3). https://hbr.org/1978/05/problems-of-matrix-organizations
8. Team Topologies, "Key concepts" (four team types, three interaction modes, cognitive load). https://teamtopologies.com/key-concepts
9. Lapidus, B. (2019). "FP&A Business Partnering: Creating the Right Structure." Association for Financial Professionals. https://www.financialprofessionals.org/training-resources/resources/articles/Details/fp-a-business-partnering-creating-the-right-structure
10. FinOps Foundation, "FinOps Phases" and "FinOps Personas." https://www.finops.org/framework/phases/ and https://www.finops.org/framework/personas/ ; principles as listed in Microsoft Learn, "FinOps Framework overview." https://learn.microsoft.com/en-us/cloud-computing/finops/framework/finops-framework
11. Cooper, R. G. "The Stage-Gate Idea to Launch System." Wiley Encyclopedia of Operations Research and Management Science. https://onlinelibrary.wiley.com/doi/full/10.1002/9781444316568.wiem05014 ; Cooper, "The Latest View on Stage-Gate." http://www.bobcooper.ca/images/files/articles/2/2-2-The-Latest-View-on-Stage-Gate.pdf
12. McDonald, R. and Siegel, D. (1986). "The Value of Waiting to Invest." Quarterly Journal of Economics 101(4):707-727. https://doi.org/10.2307/1884175 (NBER w1019: https://www.nber.org/papers/w1019)
13. Wikipedia, "Responsibility assignment matrix" (RACI). https://en.wikipedia.org/wiki/Responsibility_assignment_matrix
14. Bain & Company, "RAPID: Bain's tool to clarify decision accountability." https://www.bain.com/insights/rapid-tool-to-clarify-decision-accountability/
15. Fischer, K., Schillo, M., Siekmann, J. (2003). "Holonic Multiagent Systems: A Foundation for the Organisation of Multiagent Systems." HoloMAS 2003, LNAI 2744. https://doi.org/10.1007/978-3-540-45185-3_7
16. Bossavit, L. The Leprechauns of Software Engineering, ch. 10 "The cost of defects: an illustrated history." https://leanpub.com/leprechauns ; summarized in The Register (Jul 22, 2021). https://www.theregister.com/software/2021/07/22/everyone-cites-that-bugs-are-100x-more-expensive-to-fix-in-production-research-but-the-study-might-not-even-exist/1371906
17. Menzies, T., Nichols, W., Shull, F., Layman, L. (2017). "Are Delayed Issues Harder to Resolve? Revisiting Cost-to-Fix of Defects throughout the Lifecycle." Empirical Software Engineering. https://doi.org/10.1007/s10664-016-9469-x (arXiv:1609.04886)
18. GitHub Docs, "Troubleshooting required status checks." https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks
19. Wu, Y., Shariff, R., Lattimore, T., Szepesvari, C. (2016). "Conservative Bandits." https://arxiv.org/abs/1602.04282
20. Dudik, M., Langford, J., Li, L. (2011). "Doubly Robust Policy Evaluation and Learning." https://arxiv.org/abs/1103.4601
21. Madras, D., Pitassi, T., Zemel, R. (2017). "Predict Responsibly: Learning to Defer." https://arxiv.org/abs/1711.06664

Source [15] is background for the holon view: each top-level agent is a holon head, and its lenses are body members that act externally only through the head's records. Section 2 relies on [6] and [7] for the argument; [15] is not needed for any number.

Computed, not sourced: the 30 and 20 pair counts; the CI cost per merged PR (3.01 test runs times 13 to 15 billable minutes, or times 8 to 10 with PR #154's skip, at $0.006 to $0.008 a minute); the starting set and tier defaults, which are proposals.
