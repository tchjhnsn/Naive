<!-- Placement: tchjhnsn/Naive docs/design/RL_METHOD_ROUTER_RESEARCH_2026-11-01.md. Original research date: 1 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

# Reinforcement Learning Method Router: does it exist?

Prepared for Torian, Sunday Nov 1, 2026 (CST). Every source below was opened and checked during this research (arXiv API, Crossref, publisher pages, or the X API). Numbers in brackets point to the source list at the end.

## 1. Short answer

The exact phrase "Reinforcement Learning Method Router" is not an established term. An X full-archive search for "method router", "methodology router" and "RL method router" returned only unrelated uses (blockchain RPC routing, woodworking) [X1]. No paper title uses it.

The idea itself is old and well studied under other names:

- **Algorithm selection problem.** Rice defined it in 1976: given a problem instance, pick the algorithm from a portfolio that performs best on it, using features of the instance [1]. This is the formal ancestor of the concept.
- **Algorithm selection with RL.** Lagoudakis and Littman (ICML 2000) cast algorithm selection as an MDP and solved it with Q-learning [6]. Gagliolo and Schmidhuber framed it as a bandit problem [7]. Laroche and Feraud's ESBAS lets a bandit pick which RL algorithm controls each episode [8].
- **Hyper-heuristics.** A high-level policy (often RL or bandit) chooses which low-level heuristic to apply next [9].
- **LLM routing and orchestration.** This is the current wave. A router sends each query to a model, an agent, or a multi-agent setup. It is trained by supervision (RouteLLM [20]), by bandits (MixLLM [23], MetaLLM [24], OrcaRouter [25]), or by full RL (Router-R1 [21], ToolOrchestra [27], the Puppeteer orchestrator [28]).
- **Meta-reasoning / strategy selection.** A bandit picks the reasoning strategy (backtrack, switch approach, restart) during inference (Meta-Reasoner [30]). MasRouter picks the collaboration mode, the roles and the models for a multi-agent system [29]. That is the closest published analogue to choosing a methodology rather than a model.

So the right framing is: **a per-instance method selection policy, learned from outcome feedback, in the algorithm-selection and contextual-bandit tradition.** Calling it "RL" is fair, but most of the theory you need is bandit theory, plus safe RL and off-policy evaluation for the costly tiers.

## 2. What the literature establishes

### 2.1 Algorithm selection (the ancestor)
- Rice's model has four spaces: problems, features, algorithms, performance. The selector maps features to an algorithm [1]. The "verb + noun + asking function" question type in Naive plays the role of Rice's feature space.
- The No Free Lunch theorems [2] are the usual justification: no single method dominates across all problems, so selection per instance pays.
- Surveys: Smith-Miles links algorithm selection to meta-learning [3]. Kotthoff covers combinatorial search [4]. Kerschke et al. give the modern overview [5].
- SATzilla is the canonical portfolio selector that won SAT competitions [10].
- Dynamic algorithm configuration extends selection from "pick once" to "adjust during the run", formulated as RL [11].

### 2.2 Bandits for selection
- Contextual bandits: choose an action given context, observe the reward of that action only. LinUCB on Yahoo front-page news reported a 12.5% click lift over a context-free bandit [12]. That paper also shows logged random traffic can evaluate a bandit policy offline [12]. This matters for Naive.
- Agarwal et al. give an efficient, theoretically optimal contextual bandit reducible to supervised learning [13].
- Thompson sampling tutorial [14]. It is a practical default, and it extends naturally to Bayesian priors from your existing routing rules.
- Non-stationarity: discounted and sliding-window UCB handle drift [15].
- Delayed feedback: regret grows additively with the delay in the stochastic case [16]. This is the formal counterpart of your time-to-detect rule.

### 2.3 Meta-learning, meta-RL, learning to optimize
- Learning to optimize: learn the update rule itself [17][18].
- MAML [19a] and RL^2 [19b] / "learning to reinforce learn" [19c] learn priors that adapt fast. These matter for cold start on a new venture or a new question type, but they are heavy machinery. I would not start here.

### 2.4 LLM routing (the current wave)
- FrugalGPT, an LLM cascade: it matched GPT-4 performance with up to 98% cost reduction, or improved accuracy over GPT-4 by 4% at the same cost, on its benchmarks [19].
- RouteLLM trains routers between a strong and a weak model from human preference data. It reports cost cuts of over 2 times in some cases without quality loss, and transfer when the models are swapped [20].
- RouterBench: a benchmark of over 405k inference outcomes for evaluating routers [22].
- Router-R1: the router is itself an LLM trained with RL. It interleaves "think" and "route" actions over several rounds, with a reward that combines format, outcome and cost [21]. This is the clearest "RL router" in the literature.
- MixLLM: a contextual-bandit router with continual learning that handles models being added or removed. It reports 97.25% of GPT-4 quality at 24.18% of the cost under a time constraint [23].
- MetaLLM: frames LLM selection as a multi-armed bandit [24].
- OrcaRouter: a LinUCB contextual bandit with an offline prior and online updates, aimed at production [25].
- Hybrid LLM [26a] and AutoMix [26b]: quality-aware routing and cascades with self-verification.
- Survey of routing strategies [26c].

### 2.5 RL for workflow and agent orchestration
- ToolOrchestra trains an 8B orchestrator with RL, using rewards that are outcome-, efficiency- and user-preference-aware. It reports 37.1% on Humanity's Last Exam versus 35.1% for GPT-5, while being 2.5x more efficient [27].
- Puppeteer (Dang et al.): a central orchestrator, trained with RL, sequences and prioritises agents. Gains came from more compact, cyclic reasoning structures [28].
- MasRouter: a cascaded controller decides collaboration mode, role allocation and model per task. It reports up to 52.07% lower overhead than prior methods on HumanEval [29]. **This is the closest analogue to "route to a methodology".**
- Meta-Reasoner: a contextual bandit picks the reasoning strategy mid-inference. It reports 9 to 12% accuracy gains and 28 to 35% less inference time [30].
- GPTSwarm optimises agent graphs (nodes and edges) [31]. AFlow [32] and ADAS [33] search over agentic workflows. These are design-time search, not per-instance routing.
- Mixture-of-Agents layers several LLMs' outputs [34]. It is an aggregation method, a different thing from selection.

### 2.6 Options and hierarchical RL
- The options framework treats a temporally extended "method" as a single action with its own policy and termination condition [35]. A methodology is naturally an option: you commit to it for a stretch, then it terminates. Option-critic learns options end to end [36].
- Mixture of experts, from Jacobs et al. [37] to sparse gating [38], is routing inside a model. It is the same idea at token scale, and useful mostly as vocabulary.

### 2.7 Safe exploration, off-policy evaluation, deferral
- Garcia and Fernandez survey safe RL [39]. Constrained Policy Optimization keeps a policy inside cost constraints during learning [40].
- Conservative bandits keep cumulative reward above a fixed baseline at all times while exploring [41][42]. This maps directly onto "the current rule is the baseline; never fall below it".
- Off-policy evaluation from logs: doubly robust estimators [43], counterfactual risk minimisation [44], and high-confidence off-policy evaluation, which gives a lower confidence bound on a new policy's value from old data before deploying it [45]. The offline RL review covers the general problem [46].
- Learning to defer: the model learns when to hand the decision to a human expert [47][48]. This is the formal home for your "ties go to Torian" rule and for one-way-door escalation.

## 3. What X contributed

### 3.1 Torian's bookmarks (198 read, the full set the API returned)
Nothing bookmarked names the concept directly. Several are adjacent:
- @dair_ai on a FAIR paper about agent memory, where a single global history adds an average of +0.015 normalised reward over no memory when tasks interleave: https://x.com/dair_ai/status/2116548002617917603 . This bears on what context the router should condition on.
- @_avichawla on HarnessRouter, which routes tasks across agent harnesses (Codex, Claude Code and others): https://x.com/_avichawla/status/2113954302901256597 . It routes between agents, but the post shows no learning from outcomes.
- @GenReasoning on RL from Collective Rewards, where agent organisations learn hierarchies and divisions of labour: https://x.com/GenReasoning/status/2113590771722952908 . Here the "which agent does what" structure is learned with RL.
- @alexgshaw on reward hacking fixes: https://x.com/alexgshaw/status/2115558191811661977 . It is a reminder that any learned router can game its reward.
- @SergioPaniego on a curriculum from SFT to RL for agents: https://x.com/SergioPaniego/status/2115466119913816116 .

### 3.2 Accounts Torian follows (1,332 read)
Searching posts from about 26 followed AI researchers and labs for router, routing, bandit and selection terms turned up these:
- @dair_ai (followed), which summarises primary papers. Each was checked on arXiv:
  - Context-guided routing for stateful agents (Microsoft). A router that reads session history passes 3.3 points more tasks at the same offloading rate: https://x.com/dair_ai/status/2110913639104561551 , paper [49].
  - Adaptive skill granularity. A learned router reached 100% success on a 12-task study where a hand-written heuristic failed: https://x.com/dair_ai/status/2114050546189709424 , paper [50]. This routes between methods of execution, not models, so it is closer to Torian's idea.
  - AgentBaton (NVIDIA). It learns a one-time capable-to-cheap handoff and cuts API cost by 65.9% on average across 11 model pairs: https://x.com/dair_ai/status/2115888920860958961 , paper [51].
  - Agent markets with first-price auctions (DeepMind authors). Routing by bidding: https://x.com/dair_ai/status/2110853295799718008 , paper [52].
  - ActiveSaddler, which treats failure patterns as arms in a non-stationary bandit: https://x.com/dair_ai/status/2106620084542419257 , paper [53].
- @hwchase17 (Harrison Chase, LangChain, followed): "router lives in the harness, not a gateway, bc the harness knows the task": https://x.com/hwchase17/status/2110041909284745578 . The linked LangChain post says their in-harness router cut median cost per coding task by 64% with no measurable quality drop [54]. Practitioner evidence, not peer reviewed.

None of the followed researchers (for example @karpathy, @natolambert, @willcb, @ShunyuYao12, @SchmidhuberAI) had posts matching the routing and bandit terms in this search. Schmidhuber is relevant as a co-author of the 2008 bandit algorithm selection paper [7].

### 3.3 Public X (not followed), ranked by credibility
1. @jifan_zhang (Thinking Machines), an author thread: "we formulate the algorithm selection problem as a bandit-like problem ... Thompson sampling style": https://x.com/jifan_zhang/status/1724829463538782329 . Primary author.
2. @OrcaRouter, a company account with its own arXiv paper [25]. It argues routing is "a sequential decision problem under a non-stationary environment" and that the session, not the request, is the unit of decision: https://x.com/OrcaRouter/status/2103856794594652395 and https://x.com/OrcaRouter/status/2103857651251875865 . Vendor, but backed by a paper.
3. @rohanpaul_ai, commentary on a contextual-bandit router with a budget policy. The post claims 93% of GPT-4 at 25% of the cost: https://x.com/rohanpaul_ai/status/1962957381324963942 . It is a secondary summary. A related verified paper on budget-constrained bandit routing is [55], but I did not confirm it is the same paper.

The rest of the routing chatter is mostly reposted FrugalGPT and RouteLLM numbers, low value.

## 4. What is established vs. what is new in Torian's framing

**Established:**
- per-instance selection from features;
- bandit learning from partial feedback;
- cost and quality trade-off rewards;
- cascades and escalation;
- RL-trained orchestrators;
- conservative exploration against a baseline;
- off-policy evaluation from logs;
- learning to defer to a human.

**Not found in the sources above, so plausibly new as a combination:**
1. **The arms are methodologies, not models.** MasRouter [29], Meta-Reasoner [30] and adaptive skill granularity [50] come closest. All of them route within one task family, not across business methodologies like "pricing per APQC 3.2.2" against an alternative.
2. **Impact tiers gate exploration itself.** Safe RL constrains cost [40][41], but I found no router that exempts whole decision classes (one-way doors) from exploration by policy and requires human approval there.
3. **Rule promotion is a separate gate from learning.** In Naive, a learned preference becomes a standing rule only after a Wilson lower bound clears a threshold and Torian approves. It is demoted by SPRT. The literature merges "learn" and "deploy". Separating them is closer to high-confidence policy improvement [45] plus a human approval step.
4. **Provenance as the training log.** A hash-chained record of each hop, answer and reason is effectively the logged-bandit dataset that off-policy evaluation needs [43][44], with integrity guarantees that are unusual in this literature.
5. **Machine-checked math for one-way doors.** I found no router literature that requires formal proofs (Lean) for the decision math behind irreversible choices.

## 5. Pitfalls the literature flags
- **Reward design and hacking.** Learned routers optimise whatever you measure [21][27]. Gate-pass rate alone will teach the router to pick methods that pass gates, not ones that produce good ventures.
- **Delayed and sparse reward.** Feedback that arrives after time-to-detect adds regret proportional to the delay [16]. Slow question types will learn slowly. That is consistent with your "slow types stay at costly or above" rule.
- **Non-stationarity.** Methods, models and Torian's preferences drift [15][25]. SPRT demotion helps, but the router's own estimates also need discounting or windows.
- **Cold start.** Bandits need a prior. Your existing most-specific routing rules are a natural baseline policy, and conservative bandits require exactly such a baseline [41][42].
- **Off-policy evaluation needs propensities.** IPS and doubly robust estimates need the probability with which each logged action was chosen [43][44]. A deterministic rule-based router logs probability 1 for one arm and 0 for the rest, so you cannot evaluate alternatives later unless some randomisation was logged.
- **Full RL is costly here.** Router-R1 and ToolOrchestra train LLMs with RL on thousands of tasks [21][27]. Naive's decision volume is small, so a bandit over question types is the right scale to start.

## 6. Design questions for Torian (one at a time)

1. **Bandit or full RL to start?** Recommendation: a contextual bandit (Thompson sampling) whose context is the question type and whose arms are the candidate methods, with the current routing rule as the prior. Treat each methodology as an option [35] only later, once trajectories are logged. Reason: low data volume and interpretable decisions [12][14].

2. **What is the reward, and when is it scored?** Recommendation: a composite of gate outcome, Torian override or correction, and the downstream outcome, scored only after the type's time-to-detect. Store each reward component with its provenance. Gate passes count as a weak proxy, never the whole reward. Reason: reward hacking and delayed feedback [16][21].

3. **How does exploration depend on tier?** Recommendation:
   - Low tier: conservative exploration that never falls below the current rule's measured value [41].
   - Costly: no live exploration. Candidates are evaluated off-policy from logs with a high-confidence lower bound [45], then Torian approves.
   - One-way door: no exploration, ever. The router only recommends and defers to Torian [47].

4. **Is the router a separate learner whose winners must earn standing-rule status?** Recommendation: yes. The router proposes; Wilson promotion and SPRT demotion stay the deployment gate. That keeps one source of authority, and the existing Lean-proven math covers deployment.

5. **Do we log propensities now?** Recommendation: yes. Add the chosen arm, the candidate arms and the selection probability to each provenance record now, even while routing is deterministic. Reason: without them, the logged history cannot evaluate any future policy [43][44], and it is cheap to add now but impossible to recover later.

## 7. Access notes
- The X following list and bookmarks were read through Torian's X connection (read only, nothing written). The bookmarks API returned 198 posts. I did not page through bookmark folders separately.
- Semantic Scholar rate-limited me. dblp and MIT Press pages blocked automated fetches. Lagoudakis and Littman was verified via ML Anthology instead, and Sutton and Barto via the authors' book page.
- I did not open the images in @michaelrbock's "algorithm for RSI" bookmark or @willcb's "swarm orchestration" bookmark, so I make no claims about their content.

## Sources

Papers and books (all verified):
1. Rice, J. R. (1976). The Algorithm Selection Problem. Advances in Computers 15. https://doi.org/10.1016/S0065-2458(08)60520-3 . Defines the problem.
2. Wolpert, D., Macready, W. (1997). No Free Lunch Theorems for Optimization. IEEE TEC. https://doi.org/10.1109/4235.585893 . Why per-instance selection pays.
3. Smith-Miles, K. (2009). Cross-disciplinary perspectives on meta-learning for algorithm selection. ACM Computing Surveys. https://doi.org/10.1145/1456650.1456656
4. Kotthoff, L. (2012). Algorithm Selection for Combinatorial Search Problems: A Survey. https://arxiv.org/abs/1210.7959
5. Kerschke, P., Hoos, H., Neumann, F., Trautmann, H. (2018). Automated Algorithm Selection: Survey and Perspectives. https://arxiv.org/abs/1811.11597
6. Lagoudakis, M., Littman, M. (2000). Algorithm Selection using Reinforcement Learning. ICML. https://mlanthology.org/icml/2000/lagoudakis2000icml-algorithm/ . Algorithm selection as an MDP with Q-learning.
7. Gagliolo, M., Schmidhuber, J. (2008). Algorithm Selection as a Bandit Problem with Unbounded Losses. https://arxiv.org/abs/0807.1494
8. Laroche, R., Feraud, R. (2017). Reinforcement Learning Algorithm Selection (ESBAS). https://arxiv.org/abs/1701.08810
9. Burke, E. et al. (2013). Hyper-heuristics: a survey of the state of the art. JORS. https://doi.org/10.1057/jors.2013.71
10. Xu, L., Hutter, F., Hoos, H., Leyton-Brown, K. (2008/2011). SATzilla: Portfolio-based Algorithm Selection for SAT. https://arxiv.org/abs/1111.2249
11. Adriaensen, S. et al. (2022). Automated Dynamic Algorithm Configuration. https://arxiv.org/abs/2205.13881
12. Li, L., Chu, W., Langford, J., Schapire, R. (2010). A Contextual-Bandit Approach to Personalized News Article Recommendation. https://arxiv.org/abs/1003.0146
13. Agarwal, A. et al. (2014). Taming the Monster: A Fast and Simple Algorithm for Contextual Bandits. https://arxiv.org/abs/1402.0555
14. Russo, D. et al. (2017). A Tutorial on Thompson Sampling. https://arxiv.org/abs/1707.02038
15. Garivier, A., Moulines, E. (2008). On Upper-Confidence Bound Policies for Non-Stationary Bandit Problems. https://arxiv.org/abs/0805.3415
16. Joulani, P., Gyorgy, A., Szepesvari, C. (2013). Online Learning under Delayed Feedback. https://arxiv.org/abs/1306.0686
17. Andrychowicz, M. et al. (2016). Learning to learn by gradient descent by gradient descent. https://arxiv.org/abs/1606.04474
18. Li, K., Malik, J. (2016). Learning to Optimize. https://arxiv.org/abs/1606.01885
19a. Finn, C., Abbeel, P., Levine, S. (2017). MAML. https://arxiv.org/abs/1703.03400
19b. Duan, Y. et al. (2016). RL^2. https://arxiv.org/abs/1611.02779
19c. Wang, J. X. et al. (2016). Learning to reinforcement learn. https://arxiv.org/abs/1611.05763
19. Chen, L., Zaharia, M., Zou, J. (2023). FrugalGPT. https://arxiv.org/abs/2305.05176
20. Ong, I. et al. (2024). RouteLLM: Learning to Route LLMs with Preference Data. https://arxiv.org/abs/2406.18665
21. Zhang, H., Feng, T., You, J. (2025). Router-R1: Teaching LLMs Multi-Round Routing and Aggregation via Reinforcement Learning. https://arxiv.org/abs/2506.09033
22. Hu, Q. J. et al. (2024). RouterBench. https://arxiv.org/abs/2403.12031
23. Wang, X. et al. (2025). MixLLM: Dynamic Routing in Mixed Large Language Models. https://arxiv.org/abs/2502.18482
24. Nguyen, Q. H. et al. (2024). MetaLLM. https://arxiv.org/abs/2407.10834
25. Bao, Z., Tian, F., Zhang, C. et al. (2026). OrcaRouter: A Production-Oriented LLM Router with Hybrid Offline-Online Learning. https://arxiv.org/abs/2605.30736
26a. Ding, D. et al. (2024). Hybrid LLM: Cost-Efficient and Quality-Aware Query Routing. https://arxiv.org/abs/2404.14618
26b. Aggarwal, P. et al. (2023). AutoMix. https://arxiv.org/abs/2310.12963
26c. Varangot-Reille, C. et al. (2025). Doing More with Less: A Survey on Routing Strategies. https://arxiv.org/abs/2502.00409
27. Su, H. et al. (2025). ToolOrchestra. https://arxiv.org/abs/2511.21689
28. Dang, Y. et al. (2025). Multi-Agent Collaboration via Evolving Orchestration. https://arxiv.org/abs/2505.19591
29. Yue, Y. et al. (2025). MasRouter: Learning to Route LLMs for Multi-Agent Systems. https://arxiv.org/abs/2502.11133
30. Sui, Y. et al. (2025). Meta-Reasoner. https://arxiv.org/abs/2502.19918
31. Zhuge, M. et al. (2024). Language Agents as Optimizable Graphs (GPTSwarm). https://arxiv.org/abs/2402.16823
32. Zhang, J. et al. (2024). AFlow. https://arxiv.org/abs/2410.10762
33. Hu, S., Lu, C., Clune, J. (2024). Automated Design of Agentic Systems. https://arxiv.org/abs/2408.08435
34. Wang, J. et al. (2024). Mixture-of-Agents. https://arxiv.org/abs/2406.04692
35. Sutton, R., Precup, D., Singh, S. (1999). Between MDPs and semi-MDPs. Artificial Intelligence. https://doi.org/10.1016/S0004-3702(99)00052-1
36. Bacon, P.-L., Harb, J., Precup, D. (2016). The Option-Critic Architecture. https://arxiv.org/abs/1609.05140
37. Jacobs, R., Jordan, M., Nowlan, S., Hinton, G. (1991). Adaptive Mixtures of Local Experts. https://doi.org/10.1162/neco.1991.3.1.79
38. Shazeer, N. et al. (2017). Sparsely-Gated Mixture-of-Experts. https://arxiv.org/abs/1701.06538
39. Garcia, J., Fernandez, F. (2015). A Comprehensive Survey on Safe Reinforcement Learning. JMLR 16. https://jmlr.org/papers/v16/garcia15a.html
40. Achiam, J. et al. (2017). Constrained Policy Optimization. https://arxiv.org/abs/1705.10528
41. Wu, Y., Shariff, R., Lattimore, T., Szepesvari, C. (2016). Conservative Bandits. https://arxiv.org/abs/1602.04282
42. Kazerouni, A. et al. (2016). Conservative Contextual Linear Bandits. https://arxiv.org/abs/1611.06426
43. Dudik, M., Langford, J., Li, L. (2011). Doubly Robust Policy Evaluation and Learning. https://arxiv.org/abs/1103.4601
44. Swaminathan, A., Joachims, T. (2015). Counterfactual Risk Minimization. https://arxiv.org/abs/1502.02362
45. Thomas, P., Theocharous, G., Ghavamzadeh, M. (2015). High-Confidence Off-Policy Evaluation. AAAI. https://doi.org/10.1609/aaai.v29i1.9541
46. Levine, S. et al. (2020). Offline Reinforcement Learning: Tutorial, Review, and Perspectives. https://arxiv.org/abs/2005.01643
47. Madras, D., Pitassi, T., Zemel, R. (2017). Predict Responsibly: Learning to Defer. https://arxiv.org/abs/1711.06664
48. Mozannar, H., Sontag, D. (2020). Consistent Estimators for Learning to Defer to an Expert. https://arxiv.org/abs/2006.01862
49. Parashar, A. et al. (2026). Whose turn is it? Context-guided model routing for stateful agents. https://arxiv.org/abs/2610.19292
50. Zhang, D. et al. (2026). Adaptive Skill Granularity for Coding Agents: Runtime Routing and Macro-to-Micro Recovery. https://arxiv.org/abs/2610.31461
51. Li, J. et al. (2026). AgentBaton: Efficient Model Collaboration in Agentic Tasks. https://arxiv.org/abs/2610.35959
52. Trivedi, S., Eisenstein, J., Agarwal, A. et al. (2026). Price of Anarchy of First-Price Auctions in Agentic Markets. https://arxiv.org/abs/2610.20587
53. Park, S. et al. (2026). ActiveSaddler: Automated Curriculum Learning for Agent Harness Optimization. https://arxiv.org/abs/2610.00906
54. LangChain (2026). How to Build a Model Router in the Harness. https://www.langchain.com/blog/how-to-build-a-model-router-in-the-harness
55. Panda, P. et al. (2025). Adaptive LLM Routing under Budget Constraints. https://arxiv.org/abs/2508.21141
Textbooks: Sutton, R., Barto, A. (2018). Reinforcement Learning: An Introduction, 2nd ed. http://incompleteideas.net/book/the-book-2nd.html . Lattimore, T., Szepesvari, C. (2020). Bandit Algorithms. https://tor-lattimore.com/downloads/book/book.pdf

X:
X1. Full-archive search for "method router" / "methodology router" / "RL method router", run Nov 1, 2026. Only unrelated uses, for example https://x.com/Amanjain812527/status/2080012497411834331
