<!-- Placement: tchjhnsn/Naive docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# When to spawn, keep, and include agents: a coalition and transaction-cost rule for Naive

Prepared Nov 2, 2026, 12:07 AM CST, for Torian. Status: research and a candidate rule. Nothing was built or changed.

Goal wording used throughout: ship as fast as possible the outcomes with the highest KNOWN quality, meaning quality that has been verified or measured.

## 1. The short answer

Torian's intuition holds under a condition we can state and measure. Including a top-level agent live in a joint group pays off when three things together exceed the extra coordination cost of having it in the room:
- what it adds to the joint output;
- what it would lose by learning about the work only through a packet;
- the rework it would force later if it saw the work only afterward.

The three costs that excluding an agent tends to hide are:
- writing and reading the packets;
- the information lost in the packet;
- the expected rework when the excluded agent later rejects or edits the work.

The rework cost is large when the excluded agent holds a veto over the decision, such as Finance on spend. It shrinks when the packet points to the full record instead of summarizing it.

There is no general theorem saying "always include everyone." The classical result that the grand coalition is best (superadditivity) only applies when value net of coordination cost is superadditive. Pairwise communication cost grows as n(n-1)/2 [6], and measured multi-agent overheads run from 58% to 515% [15]. So net value is usually not superadditive past a small group. That makes the right group size an empirical question per function class, and Naive's provenance records can answer it.

## 2. What is established (theorems and measured findings)

### 2.1 Cooperative game theory (theorems, with exact conditions)

**Setup** [1]. A coalitional game is a set of players N and a characteristic function v: 2^N -> R with v(empty) = 0. v(S) is the value coalition S can produce together.

**Superadditivity** [1]: v(S ∪ T) >= v(S) + v(T) for disjoint S and T.
- *Consequence (standard, provable by induction on the number of blocks):* for any partition {S1, ..., Sm} of N, sum v(Si) <= v(N). So under superadditivity the grand coalition is an efficient coalition structure.
- *The condition that matters for us:* v must be the value net of every cost of being in the group. If coordination cost grows faster than value, net v is not superadditive and the theorem gives nothing.

**Monotonicity** [1]: S ⊆ T implies v(S) <= v(T). This follows from superadditivity when singleton values are normalized to zero.

**Convex (supermodular) games** [1]: v(S ∪ T) + v(S ∩ T) >= v(S) + v(T).
- Equivalently, a player's marginal contribution grows as the coalition grows (Shapley 1971, as summarized in [1]).
- Convex games have a non-empty core, and the Shapley value is the center of gravity of the core [1].
- This is the formal version of Torian's "a+b+c can be worth far more than a+b": when value snowballs, the incentive to join rises with group size.

**Core** [1]: the set of splits of v(N) under which no sub-group would do better on its own. It can be empty; games with a non-empty core are called balanced (Bondareva-Shapley).

**Shapley value** [2]: phi_i(v) = sum over S ⊆ N\{i} of [|S|! (n-|S|-1)! / n!] (v(S ∪ {i}) - v(S)). This is player i's average marginal contribution over all join orders.
- It is the unique allocation that satisfies efficiency, symmetry, linearity and the null-player rule [2].
- If v is superadditive, each player's Shapley value is at least what it gets alone [2].
- For Naive it is the principled credit score for "how much does Finance add when it joins this kind of work."

**Harsanyi dividends** [1][2]: the synergy of exactly the set S, after removing what its sub-groups already produce, is w(S) = sum over R ⊆ S of (-1)^(|S|-|R|) v(R).
- A positive w({Finance, Product, Growth}) is the precise meaning of "a+b+c has value that a+b and b+c do not."

### 2.2 Coalition formation in multi-agent systems (theorems)

**Shehory and Kraus (1998)** [3] give distributed, anytime algorithms that assign tasks to coalitions of agents, with proven low ratio bounds. They cover four settings:
- disjoint coalitions;
- overlapping coalitions;
- tasks with a precedence order;
- open, dynamic systems.

Their framing matches the relationship child directly: group agents per task, either because one agent cannot do the task or because the group is more efficient [3].

**Sandholm, Larson, Andersson, Shehory and Tohme (1999)** [4] study coalition structure generation, meaning the partition of the agents with the highest total value.
- Finding the optimal structure is NP-complete.
- To guarantee any bound from optimum, you must search the bottom two levels of the structure graph: 2^(a-1) structures for a agents. That gives a tight bound of a.
- No algorithm that searches 2^(a-1) or fewer structures can guarantee any bound.
- Searching one more node halves the bound to a/2 [4].

**What this means at Naive's size.** With 5 top-level agents:
- there are 2^5 - 1 = 31 non-empty coalitions;
- 26 of them have two or more members (10 pairs, 10 triples, 5 groups of four, 1 group of five);
- there are 52 coalition structures in total (the Bell number B5, computed).

Search is trivial at this size. The hard part is estimating v(S), not searching over structures. That points to measurement and a bandit over a short list of candidate groups, not to a clever search algorithm.

### 2.3 Team theory (framework)

Marschak and Radner's *Economic Theory of Teams* (1972) [5] treats an organization as a team with a common payoff. Its chapters cover:
- "Organizational Form: Information and Decision Functions";
- "Best Decision Functions";
- "The Evaluation of Information in Organizations";
- "The Team Problem as a Problem of Optimal Networks";
- "Task Allocation, Organizing, and Leading" (table of contents in [5]).

The relevant idea: who sees what (the information structure) and who decides from it (the decision functions) are design variables that are chosen jointly. Live inclusion and after-the-fact packets are two different information structures for the same agent.

### 2.4 Coordination cost and communication structure

**Brooks** [6]: "If each part of the task must be separately coordinated with each other part, the effort increases as n(n-1)/2."
- Brooks's law: adding people to a late software project makes it later. The causes are ramp-up time and communication overhead, and less divisible tasks gain less [7].
- Good modularity reduces the overhead [7].

**Conway (1968)** [8]: organizations "are constrained to produce designs which are copies of the communication structures of these organizations."
- Conway also notes that the number of possible communication paths is roughly half the square of the number of people.
- His recommendation: "a design effort should be organized according to the need for communication."
- This is an empirical principle, not a theorem.

**Team Topologies** [9] defines three interaction modes:
- Collaboration: "high bandwidth, high cost";
- X-as-a-Service: "low cost, clear boundaries";
- Facilitating: "temporary and focused".

It also makes team cognitive load an explicit design limit.
- Live inclusion corresponds to Collaboration.
- Exclude-then-packet corresponds to X-as-a-Service.
- A short-lived helper child corresponds to Facilitating.

### 2.5 Transaction cost economics: make or buy, durable or ephemeral

**Coase (1937)** [10]: firms exist because using the market has costs, including search and information, bargaining, and policing and enforcement. A firm grows until its rising internal organizing costs, and its "decreasing returns to the entrepreneur function," balance those market costs.

**Williamson (1979)** [11] characterizes transactions by three dimensions:
- uncertainty;
- frequency of recurrence;
- the degree of durable, transaction-specific investment.

His governance matching:
- specialized governance "much easier to justify for recurrent transactions than for identical transactions that occur only occasionally";
- internal (unified) governance is attractive "for transactions of a recurrent, idiosyncratic kind" [11].

The overview in [12] lists Williamson's determinants: frequency, specificity, uncertainty, limited rationality, and opportunism.

**Mapping to Naive:**
- a durable relationship child is unified governance;
- an ephemeral child is a spot contract;
- doing the work in the parents' own contexts is the "market" between parents.

### 2.6 Information theory of handoffs (theorem)

**Data processing inequality** [13]: if X -> Y -> Z is a Markov chain, then I(X;Y) >= I(X;Z). In words, post-processing cannot increase information.
- A packet Z made from the group's working record Y cannot carry more information about the underlying state X than Y does.
- Equality holds only when the packet loses nothing relevant.
- So an excluded agent reading a packet is at best as informed as one that was present. This is a theorem, under the Markov condition that the packet is computed from the record.

What the inequality does not say: it says nothing about the value of the agent's own input. Exclusion also removes what k would have contributed during the work (k's marginal value in Section 3). Both losses count against exclusion.

### 2.7 LLM multi-agent research (measured, with limits)

**Anthropic, multi-agent research system** [14]:
- A Claude Opus 4 lead with Sonnet 4 subagents beat single-agent Opus 4 by 90.2% on Anthropic's internal research eval.
- Token usage alone explained 80% of performance variance on BrowseComp. Three factors together explained 95%.
- Agents use about 4x the tokens of chat, and multi-agent systems about 15x.
- Multi-agent fits "valuable tasks that involve heavy parallelization, information that exceeds single context windows, and interfacing with numerous complex tools."
- It fits poorly where "all agents ... share the same context or involve many dependencies between agents."
- Effort rules from the post:
  - simple fact-finding: 1 agent with 3 to 10 tool calls;
  - direct comparisons: 2 to 4 subagents with 10 to 15 calls each;
  - complex research: more than 10 subagents.
- Early versions spawned 50 subagents for simple queries.
- Writing subagent outputs to a filesystem and passing "lightweight references" back reduces "information loss" (the "game of telephone").

**Kim et al., Google Research and MIT, "Towards a Science of Scaling Agent Systems"** [15]. Setup: 260 configurations, 6 agentic benchmarks, 5 architectures, 3 model families, with tools, prompts and compute held equal.
- Performance relative to a single agent ranged from +80.8% (Finance Agent, centralized) to -70.0% (PlanCraft, independent).
- Every multi-agent variant degraded sequential planning, by 39% to 70%.
- Coordination yielded diminishing returns once the single-agent baseline exceeded about 45%. This is the most robust finding: cluster-robust p = 0.004, Holm-corrected p = 0.018.
- Overhead versus a single agent: independent 58%, decentralized 263%, centralized 285%, hybrid 515%.
- Trace-level error amplification: independent 17.2x, centralized 4.4x.
- Turns grow as T = 2.72 (n + 0.5)^1.724 (R^2 = 0.974). Beyond 3 to 4 agents, per-agent reasoning becomes "prohibitively thin" under a fixed budget.
- The fitted model reaches cross-validated R^2 of 0.373 (0.413 with a task-grounded capability index). It picks the best architecture for 87% of held-out configurations.
- The authors caution that leave-one-dataset-out prediction of absolute performance is weak.

**Cemri et al., "Why Do Multi-Agent LLM Systems Fail?" (MAST)** [16]:
- 1,642 annotated traces from 7 frameworks.
- 14 failure modes in 3 categories: system design, inter-agent misalignment, and task verification. Inter-annotator kappa was 0.88.
- Failure rates were 41% to 86.7% across 7 state-of-the-art open-source systems.
- Inter-agent misalignment includes information withholding (0.85%) and ignoring other agents' input (1.9%).
- Information withholding and being unaware of termination conditions appear almost exclusively in failed runs.
- Two interventions worked in ChatDev: letting only superior agents finalize (+9.4% task success), and adding a high-level objective verification step (+15.6% on ProgramDev).

**DyLAN** [17] selects a team from candidates using an unsupervised Agent Importance Score from a trial run.
- Team optimization raised accuracy by up to 25.0% on some MMLU subjects.
- On code generation, it cut the team from 12 agents to 8, raised Pass@1 from 76.2 to 82.9, and lowered API calls from 23.04 to 16.85.
- An optimized team of 3 beat the 7-agent team before optimization.
- The score correlated with Shapley values in-domain. The authors note that exact Shapley values are too expensive as teams grow.

**MasRouter** [18] picks collaboration mode, roles and model per query by maximizing E[U - lambda * C].
- It reduced overhead by up to 52.07% on HumanEval.
- Raising the maximum agent count from 2 to 6 lifted HumanEval from 88.50% to 90.62%. Going from 6 to 10 gave only marginal gains at 1.5x per-query cost.

**AgentVerse** [19] recruits experts dynamically.
- On two of three tasks with GPT-3.5-Turbo, group discussion underperformed a solo agent.
- About 10% of math errors traced to an agent being swayed by another agent's wrong feedback.
- The authors capped math tasks at two agents, because more reviewers meant more erroneous critiques.

**X check.** I searched public X for primary-author posts on [15] and found none from the authors in the top results. Nothing from X is used as evidence here.

## 3. Candidate decision rule (our modeling, built on the above)

Notation for one joint function J, such as "price a kit," "unit economics of a feature," or "a launch budget":

| Symbol | Meaning |
| --- | --- |
| S | the agents already in the live group, with the relationship child as hub |
| k | a top-level agent we might add |
| v(S) | expected verified value of the group's output on J: gate outcome weighted by impact tier, net of nothing |
| C(S) | coordination cost of running group S live: tokens, wall time priced by cost of delay, and failure risk |
| m_k(S) = v(S ∪ {k}) - v(S) | k's live marginal contribution |
| dC_k(S) = C(S ∪ {k}) - C(S) | extra coordination cost of adding k live |
| c_pkt(k) | cost to write and read the packets k needs if excluded |
| dW_k | loss to k's own downstream work from knowing J only through the packet. dW_k >= 0 by the data processing inequality, assuming k's value is monotone in what it knows |
| p_k * R_k | expected rework if k is excluded: p_k is the chance k later rejects or edits the output, R_k is the rework cost |

### Rule A: include or exclude a top-level agent

Value of including k live: U_in = v(S ∪ {k}) - C(S ∪ {k}) + W_k(full record).

Value of excluding k and sending packets: U_out = v(S) - C(S) + W_k(packet) - c_pkt(k) - p_k * R_k.

Include k live if and only if:

    m_k(S) + dW_k + p_k * R_k + c_pkt(k)  >=  dC_k(S)

In words: include k when its live contribution, plus what it loses by being briefed late, plus the rework it would cause, plus the packet overhead, beats the cost of having it in the room.

This is the formal version of Torian's gist. The naive comparison is m_k(S) against dC_k(S). The last three terms on the left are the hidden costs of exclusion.

When the rule tips toward inclusion:
- k holds a veto on J, so p_k * R_k is large;
- J has synergy that needs k present, so the Harsanyi dividend w(S ∪ {k}) > 0 and m_k is large;
- packets are lossy summaries, so dW_k is large.

When it tips toward exclusion:
- the group is already large, so dC_k grows, and grows faster under a mesh (see Rule D);
- J is sequential (measured degradation of 39% to 70% on planning [15]);
- the single-agent baseline is already high (the saturation at about 45% [15]);
- packets are pointers to the full provenance record, which shrinks dW_k (Anthropic's artifact pattern [14]).

### Rule B: spawn a child at all

This is a gate that comes before Rule C. Spawn a child for J only if all of these hold:
- J decomposes into parallel parts, or needs more context than one window [14][15];
- J is not strictly sequential [15];
- the measured single-agent pass rate on this function class is below the saturation region [15];
- the expected value of J covers a token multiple on the order of the measured 15x [14].

Otherwise the owning parent does J itself. Size the child's effort with the scaling rules from [14].

### Rule C: durable or ephemeral (transaction-cost amortization)

Let:
- f = recurrence rate of J for this relationship (occurrences per week);
- H = planning horizon (weeks);
- sigma(s) = saving per occurrence from a warm child over assembling the context from scratch. It rises with specificity s, the share of the child's context that is only useful for this relationship;
- K = setup cost;
- m = maintenance cost per week;
- d = expected cost of drift or staleness over H.

Make the child durable if and only if:

    f * H * sigma(s)  >=  K + m * H + d

Otherwise spawn it ephemerally per occurrence, as long as one occurrence is worth doing at all.

This is Williamson's matching in symbols [11]: recurrent and idiosyncratic work justifies unified governance; occasional or generic work does not. The rule flips at most once as f rises, so it is a threshold rule.

Retire a durable child when f, measured as a conservative lower bound (Section 4), falls below the break-even rate (K/H + m + d/H) / sigma.

### Rule D: structure of a joint group

Use a star with the relationship child as hub, not a mesh among parents.
- Mesh channels grow as n(n-1)/2 [6]: 10 channels for 5 agents.
- A star has n - 1 channels: 4 for 5 agents, plus the hub.
- Measured: centralized coordination contained trace-level error amplification to 4.4x, against 17.2x for independent agents [15].
- Measured: turn counts grow super-linearly with agent count, and per-agent reasoning thins beyond 3 to 4 agents [15].

### How the rules fit the classical theory

- If, for a function class, measured net value u(S) = v(S) - C(S) turns out superadditive across the 5 agents, the grand coalition is efficient and Rule A will keep saying "include" [1]. That would vindicate Torian's intuition for that class in its strongest form.
- If u is not superadditive, the best coalition structure is a smaller group. With 5 agents all 52 structures can be enumerated [4], so the problem reduces to estimating u.

## 4. What Naive can measure, per term

The sources below are existing Naive pieces as named in the brief. I have not inspected their schemas, so field names still need to be checked against the repo.

| Term | What to measure | Where it would come from |
| --- | --- | --- |
| v(S) | Verified outcome per run: first-pass gate result, later reversal, impact tier as weight. Report a Wilson lower bound on the pass rate, not the mean, to match "highest known quality" | PR review gate results, impact tiers, provenance chains |
| C(S) | Tokens, wall time, number of messages and turns per run; delay priced with the cost-of-delay rule | run provenance, cost records |
| m_k(S) | Leave-one-out A/B: the same function class run with and without k live. Shapley or DyLAN-style importance only for frequent classes [2][17] | bandit/RL router arms per group composition |
| p_k * R_k | Share of child outputs that the excluded parent k later rejected or edited, times the rework time. Parent-only edits make every such edit a provenance record | parent-only edit records |
| c_pkt, dW_k | Packet size and read cost; how often k's later decision was reversed after reading the full record instead of the packet | handoff packets, provenance links |
| f, s | Recurrences of the same joint-function label in a relationship per week; share of child context documents referenced only by that pair | provenance chains, record references |
| K, m, d | Setup and maintenance tokens and edits for durable children; defects traced to stale child context | child records, provenance |

**Statistics.**
- Decide include-versus-exclude per function class with an SPRT on gate pass rates, so the decision stops as soon as the evidence is sufficient.
- Report Wilson lower bounds so the chosen policy maximizes known quality, not hoped-for quality.
- Let the bandit/RL router explore group compositions only within the candidates Rules A to D allow.

## 5. Provable in Lean versus empirical

Provable (pure mathematics, no data):
- Superadditivity implies that the sum of v over any partition is at most v(N). This is induction on the number of blocks.
- Rule A is algebraically equivalent to U_in >= U_out. Proving it makes the rule auditable: the code's inequality is exactly the model's.
- Rule C is monotone in f, so it is a single-threshold rule, and the retirement threshold is its inverse.
- Channel counts: n(n-1)/2 for a mesh and n - 1 for a star.
- For finite games: Shapley efficiency (shares sum to v(N)) and recovering v from the Harsanyi dividends.
- The data processing inequality is a known theorem [13]. I did not check whether Mathlib already contains it, so the Lean work should either find it there or state it as a cited assumption.

Empirical (needs Naive's data):
- every value of v, C, p_k, R_k, dW_k, sigma, f, K, m and d;
- whether u is superadditive or convex for a given function class;
- where the saturation threshold falls for Naive's own models and tasks; [15] measured about 45% on its benchmarks, which may not transfer.

## 6. Pitfalls

1. **Coordination cost grows fast.**
   - Channels grow as n(n-1)/2 [6], and turns as about n^1.724 [15].
   - All 26 possible groups of two or more among 5 agents could become children. Ten pairwise children alone is already 10 durable agents to maintain.
   - Spawn by measured recurrence (Rule C), not by default.

2. **Diffusion of ownership against parent-only edits.**
   - A child that reports to two parents has two editors. That invites role confusion (MAST FM-1.2) and ignored input (FM-2.5) [16].
   - Proposal: every relationship child has exactly one owning parent who may edit it. The other parent reviews through packets and holds a veto only on its own decision class.
   - Measured support: making the superior agent the only one allowed to finalize raised ChatDev task success by 9.4% [16].

3. **Conway's law.** Relationship children will hardwire today's org chart into the product's structure [8]. Re-check them when the agent roster changes.

4. **The game of telephone.**
   - Summary packets lose information; the data processing inequality guarantees they can only lose, never gain [13].
   - Packets that point to the full provenance record cut the loss [14]. This genuinely shifts Rule A toward exclusion, so it should be measured, not assumed away.

5. **Errors propagating without a check.** Independent agents amplified trace-level errors 17.2x; a central verifier contained this to 4.4x [15]. Every child output should pass the review gate before a parent acts on it.

6. **Agreement mistaken for evidence.** Agents get swayed by wrong peer feedback (about 10% of math errors in [19]). Count live inclusion as positive only when it measurably raises verified outcomes.

7. **Saturation as models improve.** The value of inclusion falls as single-agent pass rates rise past about 45% [15]. Re-measure m_k after model upgrades.

8. **Shared files.** Children writing to the same files collide. Keep one worktree per item and one item per PR, with the child writing only in its item's worktree.

9. **Goodhart risk on importance scores.** LLM-judged importance [17] is a proxy; the review gate's verified outcome should stay the ground truth.

## 7. Decisions for Torian (one question each)

**Decision 1. Who may edit a relationship child's output?**
- Options:
  - (a) one owning parent per child, chosen by which parent owns the decision class; the other parent reviews by packet and has a veto on its own class;
  - (b) both parents may edit;
  - (c) Lead owns and edits all relationship children.
- Recommendation: (a). It keeps parent-only edits meaningful, avoids two-boss conflicts [16], and makes the rework term p_k * R_k measurable per parent.

**Decision 2. Default for joint work: include live or exclude with packets?**
- Options:
  - (a) default to exclude, sending packets that point to the full record; include an agent live only when it holds a veto on the decision, or its measured rejection rate on that function class is high enough that Rule A says include;
  - (b) include every relevant top-level agent live by default.
- Recommendation: (a), with the router testing (b) on the most frequent function classes. Measured multi-agent overhead is large (58% to 515%) and degrades sequential work [15]. Rule A still includes the agents whose late review would cost most, which is the case Torian's intuition is about.

**Decision 3. When does a relationship child become durable?**
- Options:
  - (a) only after the joint function has recurred enough that Rule C's break-even is met, with a starting trigger of a few repeats in a short window, to be calibrated from provenance data;
  - (b) create durable children for all 10 pairs up front.
- Recommendation: (a). It follows Williamson's recurrent-and-idiosyncratic test [11] and avoids maintaining children that may never recur.

**Decision 4. Cap on live group size and shape?**
- Options:
  - (a) at most 3 top-level agents live per joint group, connected through the child as hub (star);
  - (b) no cap, mesh allowed.
- Recommendation: (a). Per-agent reasoning thins beyond 3 to 4 agents, centralized coordination contained error amplification to 4.4x against 17.2x [15], and channels stay linear [6]. Revisit if Naive's own data shows net value staying superadditive for a function class.

## Sources

1. Wikipedia, "Cooperative game theory" (characteristic function, superadditivity, monotonicity, core, convex games, Harsanyi dividend). https://en.wikipedia.org/wiki/Cooperative_game_theory
2. Wikipedia, "Shapley value" (formula, axioms, synergy form, stand-alone test). https://en.wikipedia.org/wiki/Shapley_value
3. Shehory, O. and Kraus, S. (1998). "Methods for task allocation via agent coalition formation." Artificial Intelligence 101:165-200. Abstract: https://publications.ri.cmu.edu/methods-for-task-allocation-via-agent-coalition-formation (DOI 10.1016/S0004-3702(98)00045-9)
4. Sandholm, T., Larson, K., Andersson, M., Shehory, O., Tohme, F. (1999). "Coalition structure generation with worst case guarantees." Artificial Intelligence 111. http://www.cs.cmu.edu/~sandholm/coalstruct.aij.pdf
5. Marschak, J. and Radner, R. (1972). Economic Theory of Teams. Cowles Foundation Monograph 22 (table of contents). https://cowles.yale.edu/research/cfm-22-economic-theory-teams
6. Brooks, F. P. (1975). The Mythical Man-Month, ch. 2, quoted at https://www.supersummary.com/the-mythical-man/important-quotes/ and https://fermatslibrary.com/s/the-mythical-man-month
7. Wikipedia, "Brooks's law." https://en.wikipedia.org/wiki/Brooks%27s_law
8. Conway, M. E. (1968). "How Do Committees Invent?" Datamation. https://www.melconway.com/Home/Committees_Paper.html
9. Team Topologies, "Key concepts" (three interaction modes, cognitive load). https://teamtopologies.com/key-concepts
10. Wikipedia, "The Nature of the Firm" (Coase 1937 summary). https://en.wikipedia.org/wiki/The_Nature_of_the_Firm
11. Williamson, O. E. (1979). "Transaction-Cost Economics: The Governance of Contractual Relations." Journal of Law and Economics 22(2). https://josephmahoney.web.illinois.edu/BA549_Fall%202010/Session%203/Williamson%20(1979).pdf
12. Wikipedia, "Transaction cost" (Williamson's determinants: frequency, specificity, uncertainty, limited rationality, opportunism). https://en.wikipedia.org/wiki/Transaction_cost
13. Wikipedia, "Data processing inequality." https://en.wikipedia.org/wiki/Data_processing_inequality
14. Anthropic Engineering (Jun 13, 2025). "How we built our multi-agent research system." https://www.anthropic.com/engineering/multi-agent-research-system
15. Kim, Y. et al. "Towards a Science of Scaling Agent Systems." arXiv:2512.08296 (v3). https://arxiv.org/abs/2512.08296
16. Cemri, M. et al. "Why Do Multi-Agent LLM Systems Fail?" arXiv:2503.13657. https://arxiv.org/abs/2503.13657
17. Liu, Z. et al. "A Dynamic LLM-Powered Agent Network for Task-Oriented Agent Collaboration" (DyLAN). arXiv:2310.02170. https://arxiv.org/abs/2310.02170
18. Yue, Y. et al. "MasRouter: Learning to Route LLMs for Multi-Agent Systems." arXiv:2502.11133. https://arxiv.org/abs/2502.11133
19. Chen, W. et al. "AgentVerse: Facilitating Multi-Agent Collaboration and Exploring Emergent Behaviors." arXiv:2308.10848. https://arxiv.org/abs/2308.10848

Computed, not sourced: the counts of 31 non-empty coalitions, 26 groups of two or more, 10 pairs, and 52 coalition structures (the Bell number B5) for 5 agents.
