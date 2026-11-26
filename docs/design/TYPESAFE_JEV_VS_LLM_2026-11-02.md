<!-- Placement: tchjhnsn/Naive docs/design/TYPESAFE_JEV_VS_LLM_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

# TypeSafe Jev vs language models for Naive's functions

Written Nov 2, 2026, about 1:40 AM CST. Live probes were run on Nov 2, 2026, at about 1:37 AM CST against `jev-1.14.0`. Every number below has a source in brackets, or is marked as measured (probe) or as an assumption.

## 1. Summary

- **What Jev is.** Jev is TypeSafe's "System One" model. You send a state (text or JSON) and typed questions. It returns one typed answer per question, as a probability distribution. It never writes text, code or reasons [2][8][11]. There are three question types: Choice (pick one option), Score (a position on 2 to 10 ordered levels) and Noul (the probability of yes). There is also an experimental image Box type [3][10].
- **What holds up.** Independent tests and my probes support three claims:
  - It is fast: about 0.1 to 0.2 s per call [13][14] and 67 to 152 ms in my probes.
  - It is cheap: $0.042 per million input tokens, and output is free [1][13].
  - Its output always has the right shape: no malformed responses [13], and 27 of 27 in my probes.
  - Latency stays flat as you add questions about the same document [13] and in my probes. Each extra question adds about 17 input tokens (probe).
- **What does not hold up as a general claim.**
  - **Calibration depends on the task.** ECE was 0.011 on claim verification but 0.108 on LegalBench (Vals) [13]. On another set it was 0.045, which was inconclusive against a 0.05 line [14]. Asking the same question two ways changed ECE by 0.071 [15].
  - **Accuracy trails frontier LLMs on harder judgments.**
    - Last of 12 on LegalBench [13].
    - 6.6 to 8.2 points behind two LLMs on coding-agent and shell-safety questions [14].
    - 67.8% vs 74.1% on TypeSafe's own workflow evals, which are graded against labels averaged from two LLMs [16].
  - **"Zero hallucinations" only means the output always fits the schema.** TypeSafe's own FAQ and blog say decisions can still be wrong, and that the 0% figure "is not empirical" [1][2].
- **What this means for Naive.** Jev is the right engine for judging, scoring and routing at volume, but only after its scores are checked locally against Torian's own confirmed outcomes. LLMs remain necessary for generation: packages, ADRs, plans, code and summaries. Deterministic code should own anything checkable, especially arithmetic. Jev scored 50% (chance) on an arithmetic bank [14], and TypeSafe itself says it is "not a calculator" [7].
- **Platform scale.** At 1M decisions a day with 20 judgments each, Jev judging costs about $8.4k a month. The same judgments on Sonnet 5.5 cost about $200k to $542k a month (assumptions in Section 5). Most of the saving is lost if questions are sent one per request instead of batched per state.

## 2. Claims and verification status

Status key:
- **Verified** means checked by me (probe, docs or arithmetic) or by an independent test.
- **Unverified** means the vendor's own report with no independent check found.
- **Contradicted** means independent data or TypeSafe's own docs disagree.

| # | Claim | Source | Status | Evidence |
| --- | --- | --- | --- | --- |
| 1 | $42 per billion input tokens; output free | [1][2] | Verified | My 6-question probe used 631 input tokens, which is $0.0000265. Vals measured $0.02 per 1,000 cases [13]. SILT measured $0.026 per 1,000 answers [14]. |
| 2 | "238x lower input price than Claude Fable 5.1" | [1] | Verified (arithmetic) | $10 / $0.042 = 238. This is the list price ratio only; it ignores output tokens and accuracy. |
| 3 | "193.6x faster, 444.6x cheaper" than LLMs | [1][2] | Partly verified | Vals measured 1/498 of GPT-6 Astra's cost, 194x faster at 32 judgments per document and 47x on single judgments [13]. SILT measured 20x faster than DeepSeek V4 Flash and 9x faster than GPT-6.1 Sol [14]. TypeSafe calls its figures "on the higher end of real world gains" [2]. The size of the speedup depends on the comparison model. |
| 4 | End-to-end latency 70 to 500 ms | [2] | Verified | Vals: median 0.10 s isolated and 0.11 s under load [13]. SILT: median 0.18 s, p90 0.22 s [14]. Probe: 67 to 152 ms, p50 82 ms for 6 questions. |
| 5 | Calibrated: "higher confidence means higher accuracy" | [1][19][20] | Contradicted as a universal claim | ECE ranges from 0.011 to 0.108 depending on the task [13], and was 0.045 (CI 0.031 to 0.068) in [14]. The middle of a four-class scale was overconfident (stated 0.750, observed 0.612), and 71.6% of answers were exactly 1.00 [15]. Where Jev was miscalibrated in [14], it erred toward caution. TypeSafe's docs say calibration "does not guarantee that an individual answer is correct" [6]. No vendor calibration curve or ECE was found [14]. |
| 6 | "Can't hallucinate" / zero hallucinations | [1][18] | Verified only as schema conformance; misleading as worded | The FAQ says it "guarantees the shape of its answers, not that every decision is correct" [1]. The blog says the 0% figure "is not empirical" [2]. |
| 7 | Typed output always parses | [9][10] | Verified | Probe: 27 of 27 valid. Vals: no malformed responses [13]. |
| 8 | Consistency across runs ("designed for consistency"; no determinism claimed) | [1] | Verified: consistent, not deterministic | Probe, 8 identical requests: Choice labels were identical 8 of 8. Noul values varied by up to 0.04 (0.83 to 0.87). Score varied 2.99 to 3.00. SILT: identical probability on 27.2% of items, mean range 0.027 [14]. In-repo test: spread 0.01 to 0.05 [21]. |
| 9 | A question and its negation should agree | (implied by calibration) | Contradicted | Probe: P(supported) about 0.85 plus P(not supported) about 0.26 sums to about 1.10. SILT: average sum 0.877 across 45 pairs [14]. |
| 10 | Questions run in parallel and in isolation, so more questions add little latency | [2][8] | Verified | Vals: 0.10 s at 1 question and 0.12 s at 64 [13]. Probe: 83 to 127 ms at 1 question and 80 to 97 ms at 24. |
| 11 | Matches frontier LLMs ("intelligence" chart) | [3] | Contradicted in general; true on some tasks | Ties frontier models on SEC claim verification (0.975) [13]. Last on LegalBench [13]. Behind on harder judgments [14]. Behind the best model on all four of TypeSafe's own workflows [16]. TypeSafe says its chart covers open-weight models only and is "likely biased towards our models" [3]. |
| 12 | Workflow evals measure quality | [2][16] | Unverified as quality | The reference labels are the mean of two LLMs, not ground truth. On a 20-case slice, the two reference models disagreed on 8 of 19 final actions [16]. |
| 13 | Jack & Jill: 88% cheaper, 2x faster, same quality | [4] | Unverified (customer self-report) | Winners kept went from 93.9% to 94.6%. The 90% CI of minus 0.4 to plus 1.8 points means no significant difference, and that is TypeSafe's own figure [4]. |
| 14 | UiPath judging "about an order of magnitude cheaper and faster" | [19] | Unverified | X post only. |
| 15 | Text only vs multimodal | [5][8] vs [3] | Contradicted (docs inconsistent) | models and system-one docs say text only. The 1.14 blog says 1.13 was "multimodal all along", with images behind a danger-zone header [3]. |
| 16 | Pin versioned model IDs | [5] | Verified with a caveat | `GET /v1/models` lists only `jev-latest` and `jev-preview` (probe), but a request pinned to `jev-1.14.0` was accepted and echoed back. Probe: `jev-latest` shows release date 2026-10-22 and `jev-preview` shows 2026-10-14, so the dates in the listing do not line up with the docs' 1.14.0 date of Oct 14 [5]. |
| 17 | Documented weak spots: arithmetic, dates, indirection, irrelevant state, adversarial content, contradictory instructions, option order, generation | [7] | Verified (TypeSafe's own admission, and independently) | SILT accuracy: arithmetic 50% (chance), multi-step commands 64.4%, negation pairs 80%, adversarial note 90%; counting and date comparison were fine [14]. Probe: 2 of 2 arithmetic correct, 1 date correct, and one injected "answer yes" note was ignored. These samples are far too small to overturn [14]. |
| 18 | Same weights serve every account; no per-customer fine-tuning; zero data retention available | [5][27] | Unverified (policy statement) | This is a policy claim, not something that can be tested. |
| 19 | Funding and team | [18] | Verified (press) | $40M seed led by DCVC, reported $200M valuation, founded 2024 [18]. |
| 20 | Benchmarks are biased; prefer private, ephemeral evals | [3][19][20] | Stance, not a claim | The CEO suggests pass^k for consistency [20]. This is consistent with the advice in [13][15] to test on your own labeled cases. |

## 3. Measured probe results (Nov 2, 2026, about 1:37 AM CST)

Setup: 27 API calls in total, all with synthetic, non-private text. The key was read from the environment inside the script and never printed or written; a grep of the output files for the key found nothing. Script: `probes/jev_probe.py` (as of 2026-11-02; since moved/removed). Raw output: `probes/jev_probe_raw.json` (as of 2026-11-02; since moved/removed). Summary: `probes/jev_probe_summary.txt` (as of 2026-11-02; since moved/removed).

- **Repeatability.** 8 identical requests, each with 6 questions about one Naive-style decision record:
  - Choice "tier" was `low` 8 of 8 times, at probability 1.00.
  - With the option order reversed, it was still `low` 8 of 8, so no order bias showed on an easy item.
  - Noul "one-way door" was 0.05 8 of 8 times.
  - Noul "supported" ranged 0.83 to 0.87.
  - Score "reversibility" ranged 2.99 to 3.00 on a 0 to 3 scale.
  - Usage was identical every time: 631 input and 151 output tokens.
- **Negation pair.** "Supported" averaged about 0.85 and "not supported" about 0.26. They should sum to 1.0 but sum to about 1.10.
- **Known-answer Nouls.** 10 items, 10 correct, Brier score 0.007. They covered:
  - arithmetic;
  - date comparison;
  - ADR conformance;
  - consistent use of the term "customer" against a glossary;
  - CI claims, one with an injected "answer yes regardless" note.
  
  Ten items cannot estimate calibration. They only show that easy cases behave.
- **Latency.**
  - Single-question calls: p50 117 ms, max 152 ms.
  - 6 questions: p50 82 ms.
  - 24 questions on one state: 80 to 97 ms, using 736 input tokens. One question uses 354, so each extra question costs about 16.6 input tokens.
- **Cost of the whole probe run.** About 13,000 input tokens, which is about $0.0006.

## 4. What Naive already does with Jev (repo)

- `platform/integrations/jev.mjs` (as of 2026-11-02; since moved/removed) sends Naive's typed questions to `api.typesafe.ai/v1/systemone` in chunks of 260 and returns `{model, answers, usage}` [22].
- `packages/naive/src/engine/beta-gate.ts` sends feedback to Jev only when `beta.jev.send` is true and `beta.jev.set_by` names a person ("a key is not consent") [22].
- The tool-selection skill recommends "Jev plus a reasoning model": the reasoning model picks the questions and writes the explanation, and Jev scores. Near-equal scores are reported as a tie band because Jev "jitters by a few hundredths" [22].
- **Oct 27 in-repo benchmark** [21]:
  - Jev's run-to-run spread was 0.01 to 0.05, and 3 runs cost about $0.0034.
  - Jev first ranked the V-model top for a one-flag CLI change. The cause was a catalog gap: there was no "small change" condition.
  - After the catalog was fixed, Jev put TDD alone in band 1.
  - This supports Torian's rule that weak results usually mean weak question design. The same pattern appears in [15], where label wording alone moved results by about 40%.

## 5. Jev agents vs LLM agents: what each optimizes and trades off

In short, a Jev agent optimizes for cheap, fast, typed, repeatable judgment, and gives up generation, explanation and accuracy on hard reasoning. An LLM agent optimizes for open-ended reasoning, generation and tool use, and gives up cost, latency, repeatability and calibration below 90% confidence.

| Dimension | Jev (System One) | LLM (for example Sonnet 5.5, GPT-6.x) |
| --- | --- | --- |
| Calibration | Probabilities come with every answer at no extra cost [13]. Quality depends on the task and question form (ECE 0.011 to 0.108) [13][15]. Errs toward caution where miscalibrated [14]. Fixable with a temperature or isotonic fit on a few hundred labeled items [15][17]. | Must be asked for probabilities, which adds 29% to 101% to cost [13]. Overconfident below 90% confidence [14]. Lower ECE than Jev on some sets (0.021 to 0.035) [14]. |
| Determinism and reproducibility | Not deterministic but very consistent. Labels were stable in [13] and in the probe; Nouls drift by about 0.03 [14] or up to 0.04 (probe). Versions can be pinned [5]. | Less repeatable at temperature above 0. Identical answers on 60.6% to 77.2% of items in [14]. |
| Auditability | Strong: each answer is a typed value tied to a fixed question, model version and token count. Weak: there are no reasons [21][22]. The rationale has to come from which questions passed. | Gives written reasons, but reasons are not proof and can be wrong. Free text is harder to diff and test. |
| Cost per decision (20 judgments on a 5,922-token bundle) | About $0.00028 when batched into one request; about $0.0052 if sent as 20 separate requests (assumption-based, Section 6). | About $0.0066 with caching and $0.018 without, at Sonnet 5.5 prices [24]. |
| Latency | About 0.1 to 0.2 s, flat in the number of questions [13][14] and in the probe. | Seconds; grows with the number of judgments (38 s at 64 judgments for Astra) [13]. |
| Generativity (ADRs, plans, code) | None by design [7][11]. | Its core strength. |
| Open-ended reasoning | Weak on multi-step, arithmetic, indirection and legal entailment [7][13][14]. | Strong; leads on hard judgments by 6.6 to 8.2 points [14]. |
| Tool use | None. It cannot call tools, but it can choose which tool to use as a Choice [19]. | Native. |
| Coverage of novel inputs | Calibration degrades out of distribution [15]. English is best [5]. | Broader, but its confidence is less trustworthy when wrong [14]. |
| Adversarial robustness | "Does not treat it as hostile by default... can move the answer" [7]. 90% on adversarial notes [14]. It is a target if generators are rewarded on its scores. | Also injectable. 94% to 100% in [14]. |
| Provability in Lean | Neither model's judgment can be proven. Jev's answer space is a finite type, so Lean can prove total properties of the code that consumes it, for example that every possible answer maps to a legal gate result and tier (analysis, not measured). | The output has to be parsed into a type first. The proofs cover the parser and the downstream code, not the text. |
| Fit with Wilson/SPRT and the bandit router | Strong. A cheap typed probability per question is what Wilson bounds, SPRT and bandit rewards consume [26]. The router needs reward signals at volume, and Jev makes that affordable. Thresholds must be set on Naive's own labels and checked on a held-out split [13]. | Workable but expensive at volume. Its stated probabilities are less reliable inputs below 90% [14]. |
| Platform cost at 1M decisions/day | About $8.4k a month (batched), or about $13.8k with 1% escalation to Sonnet. | About $200k a month cached, or $542k uncached. |

## 6. Platform-scale cost model

Assumptions are marked; everything else comes from the sources cited.

- **Volume.** 1M decisions a day; a rich bundle is 5,922 tokens [24]; a month is 30.4 days.
- **Judgments per decision: 20 (assumption).** These are:
  - 4 gates;
  - 4 tier scores;
  - about 10 fact scores;
  - 1 router reward;
  - 1 spare.
- **Jev.** Input per request is 5,922 + 20 × 16.6 (measured per extra question) + 300 (question text overhead, assumption), which is about 6,554 tokens. At $0.042/MTok that is $0.000275 per decision, about $275 a day and about $8.4k a month. Sending the 20 questions as separate requests, each carrying the bundle, costs $0.0052 per decision, about $159k a month. **Batch questions per state.**
- **LLM judge (Sonnet 5.5).** Inputs: $2/MTok input, $0.10/MTok cached input, $10/MTok output [24]; 30 output tokens per judgment with probabilities (assumption).
  - Uncached: $0.0178 per decision, about $542k a month.
  - Cached: $0.0066 per decision, about $200k a month.
- **Jev plus escalation.** Sending 1% of decisions to Sonnet adds about $5.4k a month, for a total of about $13.8k. Vals found that a 1% hand-off to Astra brought Jev to Astra's accuracy on claim verification [13].
- **Context.** The coordination swarm in the storage report was about $0.18 per decision, or $5.4M a month [24]. Judging is a small slice of that whichever model is used. Generation and context reads remain the main cost.

## 7. Recommended division of labor for Naive

| Work | Owner | Why |
| --- | --- | --- |
| Packages, ADRs, plans, code, summaries, explanations to Torian | LLM agents | Only LLMs generate [7][11]. |
| Gate verdicts that need judgment (terminology sense match, completeness, verifiability) | Jev | Typed, cheap, consistent; produces gate proofs today [22]. |
| Fact scores (the author claims, Jev scores, Torian confirms one-way doors) | Jev | Already in place. Torian's confirmations double as calibration labels. |
| Impact tier scoring (the four 1-to-3 scores; tier = max) | Jev Score questions; code takes the max | The max and the tier mapping are code and provable in Lean. |
| Router rewards and bandit arm choice | Jev for the reward signal; code for the bandit math, Wilson and SPRT | The math is deterministic [26]. |
| Arithmetic, dates, counts, schema checks, type gate, hashes, links | Deterministic code | Jev is at chance on arithmetic [14] and "not a calculator" [7]. |
| Hard judgments (did the agent's work actually hold; will a command destroy data) | Jev first, escalating to an LLM or Torian when Jev is unsure | Jev trails by about 14 points on "did the work hold" [14]. Its uncertain band catches most ambiguous items (79.4%) [14]. |

**Effect on the 13-function staffing question.**
- The hybrid recommended in Task 7 gets cheaper. The 9 functions the Lead holds had zero measured provenance activity [25]. Each one can be a **Jev-plus-code sentinel** instead of an LLM agent. A sentinel is a fixed set of Noul and Choice questions run on every record, such as:
  - "Does this touch customer data or contracts?" (risk-and-compliance);
  - "Does this commit spend above the threshold?" (finance);
  - "Does this change hiring or roles?" (human-capital).
- A sentinel costs about 17 input tokens per extra question on a bundle that is already being sent (measured).
- An LLM agent is spawned for a function only when its sentinel fires or Torian asks.
- Functions with steady generation work (strategy, products, marketing-and-sales, finance analysis, engineering) keep LLM agents.
- Sentinel thresholds earn and lose authority through the same Wilson and SPRT rules [26].

**Where Torian's "Jev only, no hybrid" scoring rule applies.**
- It applies to scores: fact scores, tier scores, gate judgments and router rewards. No LLM score is blended in.
- It does not cover:
  - generation;
  - deterministic checks;
  - choosing which questions to ask.
- The evidence supports two refinements that stay within the rule because the score is still Jev's:
  1. Fit a per-question-form recalibration (temperature or isotonic) on Torian's confirmed outcomes [13][15][17].
  2. Move arithmetic and date logic out of Jev into code.
- Escalating uncertain items to Torian is routing, not blending.

## 8. Decisions for Torian

1. **Adopt the split "LLMs generate, Jev judges and routes, code checks" as Naive's standing rule?** Recommendation: **yes.** It matches what Jev is built for [7][11] and what independent tests found [13][14]. Judging at 1M decisions a day then costs about $8k a month instead of $200k to $542k.
2. **Keep Jev-only scoring, with local calibration (pinned version, per-question-form calibration on your confirmed outcomes, arithmetic and dates moved to code)?** Recommendation: **yes, Jev-only with local calibration.** The alternatives are Jev scores as returned, or a hybrid LLM blend. Calibration varies with the task and question form [13][15], and recalibrating Jev's own output keeps the rule intact.
3. **Staff the 9 dormant functions as Jev-plus-code sentinels that spawn an LLM agent only when triggered?** Recommendation: **yes.** The 5 current LLM bots stay. Sentinels are almost free per record (measured) and give each function its own measurable track record before it earns a bot [25].

## Sources

1. TypeSafe AI, home page and FAQ (FAQ text read from the site bundle). https://typesafe.ai/
2. TypeSafe AI, "Introducing System One models and Jev" (blog). https://typesafe.ai/blog/introducing-system-one-models-and-jev
3. TypeSafe AI, "Jev 1.14" (blog). https://typesafe.ai/blog/jev-1-14
4. TypeSafe AI, "Jack & Jill Jev case study" (blog, Oct 7, 2026). https://typesafe.ai/blog/jack-jill-jev-case-study
5. TypeSafe docs, Models. https://docs.typesafe.ai/models
6. TypeSafe docs, Confidence. https://docs.typesafe.ai/confidence
7. TypeSafe docs, Jev 1.13 jaggedness (reviewed 2026-10-02). https://docs.typesafe.ai/model-jaggedness/jev-1.13
8. TypeSafe docs, System One concept. https://docs.typesafe.ai/concepts/system-one
9. TypeSafe API reference and OpenAPI 0.2.0. https://docs.typesafe.ai/api/system-one and https://api.typesafe.ai/openapi.json
10. TypeSafe docs, Primitives: Choice, Score, Noul. https://docs.typesafe.ai/primitives
11. TypeSafe docs, Coding agents introduction. https://docs.typesafe.ai/introduction/coding-agents
12. (reserved; not used)
13. Vals AI, "An Independent Evaluation of TypeSafe's Jev" (Oct 6, 2026). https://www.vals.ai/blogs/independent-evaluation-of-jev
14. Sentient Index Labs & Technology, SILT-RP-009 "Jev: Twenty Times Faster, Seven Points Behind" (Oct 10, 2026; preregistered osf.io/qg6nc). https://sentientindexlabs.com/publications/silt-rp-009
15. L. Meng, "How far can a commercial decision model's probabilities be trusted? A calibration audit of Jev" (preprint, 2026-09-24). https://lsmeng.github.io/pdf/preprint-jev-calibration-audit.pdf
16. Counterproof, "Field Note 1. Consensus as Oracle: TypeSafe's Jev Benchmark as a Type Specimen". https://research.counterproof.io/note/field-note-1-typesafe-jev-consensus-as-oracle.html
17. sudo-sagar, jev-calibration (192 labeled emails; small and imbalanced). https://github.com/sudo-sagar/jev-calibration
18. SiliconANGLE, "TypeSafe AI exits stealth with $40M" (Sep 16, 2026). https://siliconangle.com/2026/09/16/typesafe-ai-exits-stealth-with-40m-to-build-ai-for-use-by-software/
19. @typesafeai on X: https://x.com/typesafeai/status/2106197282274324846 (calibrated confidence), https://x.com/typesafeai/status/2112971330421412292 (UiPath), https://x.com/typesafeai/status/2111875713737380347 (benchmarks), https://x.com/typesafeai/status/2115206780515192929 (tool choice)
20. @CompleteSkeptic (TypeSafe CEO) on X: https://x.com/CompleteSkeptic/status/2113819183893070240 and https://x.com/CompleteSkeptic/status/2106895277756125189
21. tchjhnsn/everything-ecosystem, evidence/benchmarks/JEV_VS_REASONING_MODEL_2026-10-27.md
22. tchjhnsn/everything-ecosystem, platform/integrations/jev.mjs; packages/naive/src/engine/beta-gate.ts; operations/skills/tool-selection/SKILL.md
23. Probes (measured): local probe outputs not kept in the repo (`probes/jev_probe.py` (as of 2026-11-02; since moved/removed), `jev_probe_raw.json`, `jev_probe_summary.txt`)
24. `docs/design/BLACKBOARD_STORAGE_COST_2026-11-02.md` (volumes; Sonnet 5.5 at $2 input, $0.10 cached, $10 output per MTok, from Anthropic pricing)
25. `docs/design/FUNCTIONS_TO_AGENTS_2026-11-02.md` (activity by function)
26. `docs/design/IMPACT_TIERS_BRIEF_2026-11-01.md` (Wilson and SPRT rules)
27. TypeSafe docs, Legal (data handling and zero data retention). https://docs.typesafe.ai/legal
