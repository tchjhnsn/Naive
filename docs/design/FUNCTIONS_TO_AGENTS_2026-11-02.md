<!-- Placement: tchjhnsn/Naive docs/design/FUNCTIONS_TO_AGENTS_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# The 13 functions and the agents that serve them

Prepared Nov 2, 2026, about 1:45 AM CST, for Torian. Research only. Nothing in the repo or any account was changed.

## 1. Which agent serves which function

**Where the 13 functions come from.**
- The catalog is `packages/naive/src/functions/departments.json`: 13 entries, one per APQC Level 1 category [1].
- It is still named "departments", although EE-090 says these are functions [3].
- Each function's "packages" (column 3) are the core packages under `packages/<name>/package.json` whose `department` field names it [2].
- The discovery prior is the catalog's need-now weight for the discovery phase, which is the venture's current phase [1][4]. The priors are labeled "version 0.x, ours and unevaluated" [1].

**Where the agent assignments come from.**
- The bot team record says the team is Naive Lead, Strategy, Product, Growth and Finance, and that "the Lead holds the other 9 functions until each gets its own bot" [8].
- Engineering is the Nov 2 decision: the delivery part of products, plus IT [11].

| # | Function id (APQC name) | Packages | Discovery prior | Agent today | Status |
| --- | --- | --- | --- | --- | --- |
| 1.0 | strategy (Develop Vision and Strategy) | foundation, validation | 0.2 | Strategy | Covered |
| 2.0 | products (Develop and Manage Products and Services) | product; also the engineering handoff, `from` product and marketing | 0.6 | Product (discovery and design), Engineering (delivery) | Split |
| 3.0 | marketing-and-sales (Market and Sell Products and Services) | marketing | 0.3 | Growth (judgment: Growth's name and its pricing role [8]) | Covered |
| 4.0 | supply-chain (Manage Supply Chain for Physical Products) | none | 0 | Lead, held | Unassigned in practice |
| 5.0 | service-delivery (Deliver Services) | operations | 0 | Lead, held | Unassigned in practice |
| 6.0 | customer-service (Manage Customer Service) | none | 0 | Lead, held | Unassigned in practice |
| 7.0 | human-capital (Develop and Manage Human Capital) | people | 0 | Lead, held | Unassigned in practice |
| 8.0 | it (Manage Information Technology (IT)) | none | 0 | Engineering (from Lead, Nov 2) | Covered |
| 9.0 | finance (Manage Financial Resources) | finance, fund | 0.2 | Finance | Covered |
| 10.0 | assets (Acquire, Construct, and Manage Assets) | none | 0 | Lead, held | Unassigned in practice |
| 11.0 | risk-and-compliance (Manage Enterprise Risk, Compliance, Remediation, and Resiliency) | legal | 0 | Lead, held | Unassigned in practice |
| 12.0 | external-relationships (Manage External Relationships) | relationships | 0 | Lead, held | Unassigned in practice. Overlap: investor relations is listed here, but the fund package sits under finance |
| 13.0 | capabilities (Develop and Manage Business Capabilities) | none | 0 | Lead, held | Unassigned in practice. Judgment: its catalog text, "process ownership; process improvement, knowledge management, quality", describes the Lead's own work |

**In short.** Counting products once, under the split, the 13 break down as:

| Status | Count | Functions |
| --- | --- | --- |
| Covered by a working agent | 5 | strategy, products, marketing-and-sales, finance, it |
| Split | 1 | products (Product and Engineering) |
| Held by the Lead with no dedicated agent | 8 | the rest |

- The 8 the Lead holds, plus IT, are exactly the 9 functions whose discovery prior is 0. The team was staffed the way the catalog's own priors say a discovery-phase venture needs.
- Five functions have no package at all: supply-chain, customer-service, it, assets, capabilities [3].
- The venture declares only `"departments": ["marketing-and-sales"]` and no `functions` map [4]. So in the repo no function has an owner yet; ownership lives only in the bot setup.

## 2. Measured activity per function

**Source.** The venture provenance log has 127 lines, 21 of them baselines, covering Oct 27 to Oct 29, 2026 (CST) [5]. I mapped each of the 106 non-baseline lines to a function by its entity path. Judgment calls:
- `purpose/` (as of 2026-11-02; since moved/removed) and `foundation/` (as of 2026-11-02; since moved/removed) count as strategy.
- `governance/publication-policy` (as of 2026-11-02; since moved/removed) counts as marketing-and-sales, which owns "the publication policy" [1].
- `telos.*` decisions count as strategy.

| Function | Writes | Share |
| --- | --- | --- |
| products | 55 | 52% |
| strategy | 23 | 22% |
| marketing-and-sales | 4 | 4% |
| human-capital | 1 | 1% |
| finance | 0 | 0% |
| the other 8 | 0 | 0% |
| cross-cutting: venture.json, decisions not tied to one function, private notes, release | 23 | 22% |

- The `finance/` (as of 2026-11-02; since moved/removed), `customers/` (as of 2026-11-02; since moved/removed), `investors/` (as of 2026-11-02; since moved/removed) and `accounts/` (as of 2026-11-02; since moved/removed) folders contain only `.gitkeep` [6].
- Code work, about 23 merged PRs a day [9], is products delivery and IT, which is Engineering's work.

**Caveat.** This log covers only writes through the router, and it is a 2-day window. It is an early signal, not a stable rate.

## 3. Torian's alternative: 13 function agents, with the top-level agents as routers

| Factor | Current design (5 working agents plus the Lead) | 13 function agents, 5 routers, plus the Lead |
| --- | --- | --- |
| Router hops for a record | 1 (the Lead) | 2 (the Lead, then a head), more if heads route to heads |
| Error containment | The measured gain came from a central verifier: 4.4x error amplification against 17.2x for independent agents [10][12]. Extra routers that only forward add hops and lossy summaries without adding verification [10] | Same containment only if every head also verifies |
| Ordered pairs (possible X@Y lenses) | 5 × 4 = 20 functional (30 with the Lead) | 13 × 12 = 156 |
| Hub spokes from the Lead | 5 | 5 heads, then 13 below them |
| Durable agents to maintain | 6, plus 3 lenses | 13 + 5 + 1 = 19, before any lens |
| Rule C: do the 8 dormant functions earn a durable agent? | n/a | No. Recurrence f is about 0 today, so f · H · sigma cannot cover the setup and upkeep K + m · H [10] |
| Who does the work | The top-level agents do the work; the Lead routes | Heads stop working and only route, which adds a layer of agents that produce no records |
| Parent-only edits | The parent is the agent that did the work | The parent becomes a router that did not do the work, or the edit right moves down a level, which needs a new rule |
| Scoped senses with one owner each | Owners are agents. Senses must move when the roster changes (a Conway's-law risk [10]) | Owners are the 13 functions, which are stable because no phase adds or removes one [3]. This is the alternative's real strength |
| At platform scale | 5 agents each serve many functions: overload | Fits. At the platform phase, 10 of 13 functions have priors of 0.7 or more [1] |

**Verdict.**
- The alternative has the right unit of ownership but the wrong time to staff it.
- Functions should own records, senses and decision classes now. That matches the agreed design, where a function is a module (`functions/<id>/`) with its own state, decision classes, agenda and checks [3].
- Giving every function its own agent today would add 13 agents and a second router layer, for 8 functions with no activity.
- At platform scale the alternative's shape is where the system should end up, with each top-level agent acting as a holon head for its functions [13].
- It should get there by measured promotion, not up front.

## 4. Recommendation: the hybrid

1. **The function is the unit of ownership.** Every record kind, scoped sense, decision class, gate rule and function module belongs to exactly one of the 13 functions, whichever agent runs it. Write the `functions` map into `venture.json` so the repo, not just the bot setup, says who serves what [4].
2. **The agent is the unit of execution.**
   - Each function is served by one agent at a time.
   - A function gets its own durable agent only when its measured recurrence passes Rule C. Measure it per function from provenance, as a conservative lower bound [10].
   - Until then, its parent agent serves it by loading that function's module: its ontology, checks and agenda. This is Galbraith's sequence of adding a dedicated role only when contact volume makes it economical [14].
3. **Top-level agents keep working.**
   - The Lead stays the only router.
   - A top-level agent becomes a head over its promoted function agents only after it has at least one. It then routes for them inside its own area, and never across areas; cross-area records still go through the Lead.
4. **Lenses and pairs stay as decided.**
   - X@Y is defined over functions, with an agent serving it.
   - So finance@product, finance@engineering and finance@growth carry over unchanged [11].
   - The 156 possible pairs are a ceiling, not a plan. Rule C filters them.
5. **Retire as well as promote.** When a promoted function agent's recurrence falls below break-even, fold it back into its parent agent [10].

## 5. Decisions for Torian (one question each)

**Decision 1. How should the 13 functions be staffed?**
- (a) Hybrid. Each function owns its records and senses. It gets its own agent only when measured recurrence passes Rule C; until then its parent agent serves it. The Lead stays the only router.
- (b) 13 function agents now, with Strategy, Product, Growth, Finance and Engineering as routers.
- (c) Keep today's agents with no promotion rule.
- **Recommendation: (a).** It gets the stable ownership of (b) without 13 agents and a second router layer for 8 functions that have no activity today. It still reaches (b)'s shape at platform scale.

**Decision 2. Should the Lead's own function be capabilities (APQC 13.0)?**
- (a) Yes. The Lead owns capabilities, whose catalog text is "process ownership; process improvement, knowledge management, quality". It keeps serving the other 7 held functions until each is promoted or reassigned.
- (b) No. Define a new function for the Lead.
- **Recommendation: (a).** It meets Torian's wish to define the Lead as a function without adding a 14th one. Whether routing itself fits 13.0 is a judgment call and should go through the glossary check.

## Sources

1. tchjhnsn/everything-ecosystem, `packages/naive/src/functions/departments.json` (13 entries, APQC ids and names, discovery-to-platform priors), read Nov 2, 2026. https://github.com/tchjhnsn/everything-ecosystem/blob/main/packages/naive/src/functions/departments.json
2. Same repo, `packages/{foundation,validation,product,marketing,finance,fund,people,operations,legal,relationships}/package.json` (`department` field), and `packages/engineering/package.json` (as of 2026-11-02; since moved/removed) (`kind: handoff`, `from: product, marketing`).
3. Same repo, `docs/design/NAIVE_SYSTEMS_2026-11-01.md` section 2 (functions, the four tests, EE-090, "ten core packages cover eight functions", "five functions have no package", function modules not built, no phase adds or removes a function).
4. Same repo, `instance/ventures/everything-ecosystem/venture.json` (as of 2026-11-02; since moved/removed) (`phase: discovery`, `departments: [marketing-and-sales]`, members architect and builder).
5. Same repo, `instance/ventures/everything-ecosystem/provenance.jsonl` (as of 2026-11-02; since moved/removed) (127 lines, 2026-10-27T21:01Z to 2026-10-30T01:12Z).
6. Same repo, git tree of `instance/ventures/everything-ecosystem/` (as of 2026-11-02; since moved/removed) (`finance/` (as of 2026-11-02; since moved/removed), `customers/` (as of 2026-11-02; since moved/removed), `investors/` (as of 2026-11-02; since moved/removed) and `accounts/` (as of 2026-11-02; since moved/removed) contain only `.gitkeep`).
7. Same repo, `packages/naive/template/governance/roles/agent-roles.json` (architect, builder, operations-finance-lead).
8. Grok Bot memory, Torian's Naive bot team record (Nov 1, 2026): Naive Lead, Strategy, Product, Growth, Finance; "the Lead holds the other 9 functions until each gets its own bot"; marketing-and-sales sets pricing and finance checks it.
9. the companion Mentura3 research note `docs/mentura/research/ACTIONS_USAGE_2026-11-01.md` (as of 2026-11-02; since moved/removed) (23.0 merged PRs a day, Oct 27 to Nov 1, 2026).
10. `docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md` (Rules A to D, channel counts, data processing inequality, Conway's law, Kim et al. figures).
11. `docs/design/DIRECTIONAL_PAIR_AGENTS_2026-11-02.md` and the Nov 2 decisions: Engineering as its own agent; durable lenses finance@product, finance@engineering, finance@growth.
12. Kim, Y. et al. "Towards a Science of Scaling Agent Systems." arXiv:2512.08296. https://arxiv.org/abs/2512.08296
13. Fischer, K., Schillo, M., Siekmann, J. (2003). "Holonic Multiagent Systems: A Foundation for the Organisation of Multiagent Systems." https://doi.org/10.1007/978-3-540-45185-3_7
14. Galbraith, J. R. (1974). "Organization Design: An Information Processing View." Interfaces 4(3):28-36. https://doi.org/10.1287/inte.4.3.28

Computed, not sourced: the mapping of provenance lines to functions (judgment calls listed in Section 2), 13 × 12 = 156 and 5 × 4 = 20 pairs, the count of 19 agents, and the count of 10 functions with platform priors of 0.7 or more.
