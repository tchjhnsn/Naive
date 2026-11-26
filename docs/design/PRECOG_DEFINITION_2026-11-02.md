<!-- Placement: tchjhnsn/Naive docs/design/PRECOG_DEFINITION_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

# What "precog" should mean in the Naive ontology

Written Nov 2, 2026, about 3:00 AM CST. Repo facts were read remotely from tchjhnsn/everything-ecosystem on `main`. Code search pointed at commit cb502f9b. Every claim has a numbered source.

## 1. Summary

- **The word.** "Precog" is a science-fiction coinage. Philip K. Dick introduced it in 1954 and used it in "The Minority Report" (1956) [1]. No technical field uses it as a term.
- **The standard for the idea.** Robert Rosen's *anticipatory system* (1985) is the closest standard. His definition is: "a system containing a predictive model of itself and/or its environment, which allows it to change state at an instant in accord with the model's predictions pertaining to a later instant" [2][3].
- **Rosen's definition has two parts, and EE-098 has the same two parts.** EE-098 says precog "is a capability of Mentura, not a product; parts of it are records in Naive and delivery in the app" [17].
  - The predictive model is a set of records in Naive.
  - Changing state now is delivery in the app.
- **Recommendation.** Keep "precog" as Mentura's name for the capability, marked as ours, with its meaning anchored to Rosen. Split the work into two standard-named parts:
  - **impact forecast:** a record. When one function writes a record, this predicts which forecasts in other functions it changes, and by how much. The standards are change impact analysis [11][12][13] and forecasting [4].
  - **decision prefetch:** delivery. Agents draft the next likely decisions as inert drafts before a person reaches them. The standards are prefetching and speculative execution [7][8][9][10].
- **Why split.** The two parts are measured differently:
  - Impact forecasts use proper scoring rules: Brier score and interval score [5][6].
  - Prefetches use prefetch accuracy, coverage and lateness [10], plus acceptance rate [16].
  - One noun would mix a probability that can be scored with a draft that can be accepted or refused.
- **Owners.** All three nouns are shared: `function: null`, as Mentura capabilities. Each forecast instance belongs to the function whose number it forecasts, and is produced through that function's X@Y lens (for example finance@engineering). Each draft belongs to the function whose decision it is. One-way doors go to Torian.

## 2. What the repo says today

| Where | What it says | Source |
| --- | --- | --- |
| docs/decisions/decisions.json, EE-098 (in force, 2026-11-01) | "Precog is a capability of Mentura, not a product; parts of it are records in Naive and delivery in the app." | [17] |
| site/content/marketing/how.mdx | The page compares Naive to Next.js: Prefetching maps to Precog, described as "Agents draft the next likely decisions before you reach them." It also says "Precog drafting on its own ... [is] not built yet." | [18] |
| docs/master/naive-docs.md | Status table: "Precog, decisions that fill in as evidence arrives, phase handoffs: Not built" | [19] |
| docs/design/DECISION_ROADMAPS_AND_LIFECYCLE_PLAYBOOKS_2026-10-29.md | "precog may pre-draft the next steps" after `naive roadmap install` proposes open decisions | [20] |
| docs/design/NAIVE_MAD_ARCHITECTURE_AND_SUBSTRATES_2026-10-29.md | Row "Generator model": "Agents draft records and decisions (precog)" | [21] |
| docs/design/NAIVE_SYSTEMS_2026-11-01.md | "'Capability' is already a glossary term, as a capability of a product (EE-098: precog is a capability)" | [22] |
| packages/naive/src/terms/ontology.json (v0.6.0) | Rule: "Standards first: a noun uses an established term with its standard meaning, and is coined only when none exists ('ours'). Each noun names its function (one id ... or null when the word is shared)." The same note says "a function is a noun at level function, and its capabilities are the nouns it owns." There is no "precog", "forecast" or standalone "capability" noun. "draft" (EE-030) and "provenance log" exist. | [23] |
| EE-056 (proposed) | "Forecasts (the whether statement's weather-like outlook) use both our own priors and optional integrations ... In a later phase we lean toward building our own forecasting agent." | [17] |
| EE-057 (proposed) | "a decision needed in a later phase than the venture's is speculative and is held back, the way React renders a component only when it is needed." | [17] |
| schema/internal-terms-test.mjs | A test fixture flags `\bprecog\b` as "internal word" (warn). This is test data, not venture config. | [24] |

**Two findings from the repo.**
1. **"Capability" already has two meanings.** The ontology note uses it to mean the nouns a function owns. EE-098 and NAIVE_SYSTEMS use it to mean what a product can do. The meanings differ, so under the scoped-sense rule each needs its own sense. Proposed names: capability@function and capability@product.
2. **EE-057 and prefetch are compatible.** EE-057 holds back decisions that belong to a later phase. Prefetch prepares a decision without showing it, the way Next.js loads a route without rendering it [7]. Precog drafts should therefore obey `needed_in`: they can be prepared early, but are shown only in the phase the decision belongs to.

## 3. Fields precog could borrow a term from

| Field | What the term means there | What it maps to in Naive | Sources |
| --- | --- | --- | --- |
| Forecasting (Hyndman and Athanasopoulos) | "Forecasting is about predicting the future as accurately as possible, given all of the information available." It is distinct from goals and from planning, which "is a response to forecasts and goals." Predictability falls when "the forecasts can affect the thing we are trying to forecast." | Forecast values: finance run rate, strategy horizon, growth projections. The EE-056 outlook is already a forecast in this sense. | [4] |
| Superforecasting (Tetlock) | Probability forecasts scored with the Brier score (0 best, 2 worst). Training, teaming and tracking "improved both calibration and resolution." | How forecasts are scored and how forecasters (agents or Jev questions) earn trust: track record, not role. | [5] |
| Proper scoring rules (Gneiting and Raftery) | A proper rule rewards honest probabilities. It covers interval scores for range forecasts and CRPS for full distributions. | The score for impact forecasts: Brier score for "will this change F?" and interval score for "by how much?" | [6] |
| Branch prediction and speculative execution | Guess a branch outcome and run ahead. A wrong guess is thrown away. Smith (1981) compared prediction strategies by accuracy on real traces. | Drafting a decision before it is asked for, then discarding it if it is not needed. | [8][9] |
| Hardware prefetching (Srinath et al. 2007) | Prefetch *accuracy* (useful prefetches over prefetches sent), *lateness* (useful but late) and *pollution* (misses caused by prefetching) are used to tune how aggressively to prefetch. | The metric set for decision prefetch: accepted drafts over drafts made; drafts not ready in time; drafts that crowd the docket. | [10] |
| Web prefetch (Next.js; Speculation Rules) | Next.js prefetches a linked route "in the background" when it enters the viewport, and only in production [7]. MDN warns that a prefetch the user does not follow "is generally a waste of resources." It also says never to prefetch URLs with side effects such as sign-out or "add to cart," and that prefetched pages can go stale (Chrome keeps them 5 minutes) [9]. | how.mdx already maps Prefetching to Precog. This field supplies the safety rules: drafts must be inert, and must be invalidated when the records they depend on change. | [7][9][18] |
| Speculative decoding (Leviathan et al. 2023) | A small model drafts tokens and a large model verifies them in parallel. The result was 2X to 3X faster "with identical outputs." | The closest parallel to Naive's split: a cheap drafter proposes, and an authority verifies before anything counts. In Naive the verifier is the person, or the gate chain. | [8] |
| Anticipatory systems (Rosen 1985) | A predictive model plus a present change of state based on it. Later work separates *prediction* (a representation of a future event) from *anticipation* (an action taken now because of a prediction). | The umbrella: the impact forecast is the predictive model, and decision prefetch is the change of state now. This matches EE-098's split. | [2][3] |
| Predictive processing (Clark 2013) | The brain as a "prediction machine." Top-down predictions are compared with input, and prediction error drives learning. | A design principle rather than a term: an impact forecast's error, when the actual record arrives, is the learning signal for the router and the standing rules. | [14] |
| Palantir Foundry Scenarios | "A Scenario is a fork of the data in the Ontology created by applying a set of Actions and evaluating a set of Models." A Model "estimates object properties given other object properties ... most commonly used to estimate or forecast unknown values." | What-if forks of records: "if this tech-debt record is accepted, here is the forked finance forecast." Palantir keeps the fork separate from the base data until it is applied. | [15] |
| Rolling forecasts, driver-based planning, xP&A | Rolling forecast: actuals replace forecasts as periods close, and the horizon moves forward. Driver-based planning "calculates financial outcomes from the operational and financial factors with the greatest influence on performance," with the warning that "correlation may be mistaken for causation." xP&A extends FP&A to "all other business functions." | The finance side of impact forecasts. Records from other functions are *drivers*, and the finance forecast is recomputed from them by code. xP&A is the enterprise name for the cross-function part. | [25][26] |
| Change impact analysis (Arnold and Bohner) | "Identifying the potential consequences of a change, or estimating what needs to be modified to accomplish a change." | The detection half of an impact forecast: which records and forecasts a new record touches. | [11] |
| Requirements traceability (Gotel and Finkelstein 1994) | The ability to follow a requirement's life "in both a forwards and backwards direction." | The typed relations (derived-from, part-of) are the trace links that propagation walks. | [12] |
| Change propagation (Clarkson, Simons and Eckert 2004) | The Change Prediction Method: a design structure matrix of dependencies, with direct *likelihood* and *impact* values combined to estimate indirect propagation risk. | The algorithm for impact forecasts: walk record dependencies and combine likelihood times impact along paths. Jev supplies the likelihoods; code does the combining. | [13] |

**Caution on SKOS.** The W3C SKOS Reference says `skos:related` and `skos:broader` are *not transitive* [27]. They describe meaning, not cause, and must not be used as propagation paths. Propagation should walk derived-from links, part-of links, and an explicit driver relation (proposed below).

## 4. Torian's example, walked through with the decided building blocks

The example: Engineering writes a technical-debt record, and it moves finance run rate, the strategy horizon, and growth projections that also depend on the product roadmap.

1. **Record.** Engineering writes the tech-debt record to the blackboard. The Lead routes it, and the provenance log records it [23].
2. **Detection (impact forecast, part 1).** Jev-plus-code sentinels ask each function's typed questions about the record. For example: "Does this change engineering capacity or cost?" for finance, and "Does this change what the roadmap can deliver by its dates?" for products. Each answer is a probability P(affects F). This is change impact analysis [11] with Clarkson-style likelihoods [13]. Jev scores, and code checks; earlier research found Jev unreliable at arithmetic [28].
3. **Magnitude (impact forecast, part 2).** Code recomputes each affected forecast from drivers [25]:
   - **Run rate:** the finance@engineering lens maps engineering hours to cost.
   - **Horizon:** runway is cash divided by burn, which is arithmetic, so code does it.
   - **Growth projection:** it is derived from the roadmap, so the change reaches it by two paths (engineering to roadmap to growth through finance@product and finance@growth, and engineering to finance). Clarkson's method combines the paths instead of counting them twice [13].
   
   The output is a forecast delta with an interval, written as a record, and owned by the function whose number it is.
4. **Delivery (decision prefetch).** For the decisions the deltas make likely, an agent drafts an inert decision in `_drafts/` (as of 2026-11-02; since moved/removed) (EE-030) [23], for example "schedule debt paydown in Q1 or accept the run-rate change." Drafts respect `needed_in` (EE-057) [17], and are invalidated if the source record changes, as Next.js refreshes prefetches on invalidation [7]. A one-way door goes to Torian.
5. **Learning.** When the actual forecast update or decision arrives, the forecast's error and whether the draft was accepted update the standing rules (Wilson to earn a rule, SPRT to suspend one) and the router [14][29].

## 5. Candidate definitions

### Candidate A: precog = impact forecasting

- **Standard:** forecasting [4] plus change impact analysis [11] and change propagation [13].
- **Definition:** For each new record, a calibrated forecast of which other functions' forecasts it changes, and by how much.
- **Includes:**
  - P(record affects function F);
  - a delta and interval for each affected forecast;
  - the dependency paths it used.
- **Excludes:**
  - drafting decisions;
  - setting goals or plans, which Hyndman separates from forecasting [4].
- **Measured by:**
  - Brier score and a reliability curve on P(affects F) [5][6];
  - interval score and 80% interval coverage on deltas [6];
  - lead time: the time from the source record to the updated forecast, compared with the next scheduled rolling reforecast [25].
- **Failure modes:**
  - **False alarms.** Every sentinel that fires costs someone's attention.
  - **Missed propagation.** The dependency graph is incomplete, or SKOS links are mistaken for causal ones [27].
  - **Overconfidence.** Jev's calibration varies by task [28], and calibration must be earned by track record [5].
  - **Spurious drivers.** Correlation is taken for causation [25].
  - **Double counting.** One change reaches a forecast by two paths [13].
  - **Self-fulfilling forecasts.** The forecast changes the behaviour it predicts [4].

### Candidate B: precog = decision prefetching

- **Standard:** prefetching and speculative execution [7][8][9][10]. This is what how.mdx describes today [18].
- **Definition:** Agents draft the next likely decisions, as inert drafts, before a person reaches them.
- **Includes:**
  - choosing which decisions to draft and in what order;
  - writing the drafts;
  - invalidating drafts when their inputs change.
- **Excludes:**
  - forecasting values;
  - committing anything (a draft is never an action) [9].
- **Measured by:**
  - **Accuracy:** accepted drafts divided by drafts made [10]. Acceptance rate is the best single predictor of perceived productivity in Copilot data [16].
  - **Coverage:** decisions reached that already had a draft, divided by all decisions reached.
  - **Lateness:** drafts not ready when the person arrived [10].
  - **Lead time gained:** how long before the person arrived the draft was ready.
  - **Waste:** tokens spent on drafts that were discarded [9].
- **Failure modes:**
  - **Wasted drafts** [9].
  - **Stale drafts** [9].
  - **Anchoring and automation bias:** people accept a draft because it is there [30].
  - **Docket crowding:** the analogue of cache pollution [10].
  - **Leaking later-phase decisions,** against EE-057 [17].

### Candidate C (recommended): precog = Mentura's anticipatory capability

- **Standard:** anticipatory system (Rosen 1985), narrowed [2][3]. The word "precog" is ours, taken from Dick [1].
- **Definition:** Mentura's capability to keep a predictive model of the venture (impact forecasts, kept as records in Naive) and to act now on what it predicts (decision prefetch, delivered in the app), with people deciding.
- **Includes:** both parts above, linked: forecasts trigger and rank prefetches.
- **Excludes:**
  - goals and plans, which stay with people;
  - autonomous commitment of any kind;
  - one-way doors without Torian.
- **Measured by:** each part's own metrics, plus one end-to-end measure: **lead time gained on accepted decisions.** That is the time between when precog had the impact forecast and draft ready and when the decision would otherwise have surfaced (its next scheduled review or reforecast).
- **Failure modes:**
  - both parts' failure modes;
  - the umbrella word starting to mean anything predictive, which is why the parts get their own nouns.

**Recommendation: C.** It is the only candidate that matches EE-098 as written (records in Naive plus delivery in the app) [17]. It also keeps how.mdx true, since prefetching is one part, and gives each part a standard term and a proper metric.

## 6. One noun or split, and who owns each

- **Split, under one umbrella.** The two parts differ in meaning, in record type (forecast vs draft) and in metric (proper score vs acceptance), so the scoped-sense test is met. Each part gets its own noun, and "precog" is the broader term (SKOS broader) over both [27].
- **precog.** `function: null`, because it is a capability of Mentura and not of any of the 13 functions [17][23].
- **impact forecast.** Also `function: null`, because one record's forecasts land in many functions. Each forecast *instance* is owned by the function whose quantity it forecasts:
  - finance owns run rate;
  - strategy owns the horizon;
  - marketing-and-sales owns growth projections.
  
  Instances are produced through that function's durable lens (finance@engineering, finance@growth, finance@product). Other pairs stay temporary until recurrence is shown, as decided earlier [29].
- **decision prefetch.** `function: null` as a mechanism. Each draft is owned by the function whose decision it is, under the existing "draft" noun (EE-030) [23]. Its impact tier comes from the impact-tier rule, and one-way doors go to Torian.
- **forecast.** Add this as a noun with the Hyndman meaning [4]. EE-056 already uses it in that sense [17], so no scoped sense is needed. "Impact forecast" is narrower than "forecast."
- **capability.** Add capability@function and capability@product as scoped senses (Section 2 finding 1).

## 7. Recommended ontology entries

``json
{ "noun": "precog", "level": "system",
  "meaning": "Mentura's anticipatory capability (EE-098): it keeps a predictive model of the venture as impact forecasts, records in Naive, and acts now on what it predicts by decision prefetch, delivered in the app. People decide; nothing it produces commits the venture. Broader term of impact forecast and decision prefetch",
  "standard": "ours (the word, after Dick 1954); meaning: anticipatory system (Rosen 1985), narrowed",
  "status": "proposed", "function": null, "handoff_type": false }

{ "noun": "impact forecast", "level": "venture",
  "meaning": "A record predicting, for one new record, which other functions' forecasts it changes (a probability per function) and by how much (a delta with an interval), with the dependency paths used. Detection is judged by Jev, magnitudes are computed by code from drivers. Each instance is owned by the function whose quantity it forecasts and produced through its X@Y lens. Scored by Brier score and interval score",
  "standard": "forecasting (Hyndman and Athanasopoulos); change impact analysis (Arnold and Bohner 1993); change propagation (Clarkson, Simons and Eckert 2004)",
  "status": "proposed", "function": null, "handoff_type": false }

{ "noun": "decision prefetch", "level": "interface",
  "meaning": "Drafting the next likely decisions as inert drafts (EE-030) before a person reaches them, ranked by impact forecasts, held to needed_in (EE-057), invalidated when inputs change. Measured by accuracy (accepted over drafted), coverage, lateness and lead time gained",
  "standard": "prefetching and speculative execution (Smith 1981; Srinath et al. 2007; Next.js prefetching; Leviathan et al. 2023)",
  "status": "proposed", "function": null, "handoff_type": false }

{ "noun": "forecast", "level": "venture",
  "meaning": "A prediction of a future value given all information available, distinct from a goal or a plan (EE-056's outlook is one)",
  "standard": "forecasting (Hyndman and Athanasopoulos, FPP3 1.2)",
  "status": "proposed", "function": null, "handoff_type": false }
``

**Proposed relation, for the typed-relations work.** Add `driver-of`, meaning "this record's value is an input to that forecast." It is a causal, directed relation that propagation may walk. Keep it separate from SKOS broader, narrower and related, which are not causal [27], and from derived-from, which records provenance rather than causation.

**Proposed how.mdx wording (draft only, no PR):** "Precog | Agents forecast what a new record changes in your other functions and draft the next likely decisions before you reach them."

## 8. Decisions for Torian

1. **Define precog as Mentura's anticipatory capability, with two parts (impact forecast and decision prefetch)?** Recommendation: **yes** (Candidate C). The alternatives are precog as impact forecasting only (A), or as decision prefetching only (B, today's how.mdx).
2. **Keep the word "precog" as our name (marked ours), or replace it with the standard word "anticipation"?** Recommendation: **keep "precog" as the product-facing name for the capability, with the standard recorded as Rosen's anticipatory system.** No standard term covers the combination as a product capability, and the parts already use standard terms.
3. **Add the `driver-of` relation, the "forecast" noun, and scoped senses capability@function and capability@product?** Recommendation: **yes.** Without `driver-of`, propagation would have to walk SKOS links, which are not causal [27].

## Sources

1. Historical Dictionary of Science Fiction, "precog." https://sfdictionary.com/view/1094/precog ; Wikipedia, "The Minority Report." https://en.wikipedia.org/wiki/Minority_Report_(short_story)
2. R. Rosen, *Anticipatory Systems* (1985; 2nd ed. Springer 2012), p. 341. https://link.springer.com/book/10.1007/978-1-4614-1269-4
3. euCognition briefing on anticipation (Rosen's definition; prediction vs anticipation). http://www.vernon.eu/euCognition/cognition_briefing_anticipation.htm
4. R. J. Hyndman and G. Athanasopoulos, *Forecasting: Principles and Practice* (3rd ed.), ch. 1. https://otexts.com/fpp3/what-can-be-forecast.html
5. B. Mellers et al., "Psychological Strategies for Winning a Geopolitical Forecasting Tournament," Psychological Science 2014. https://doi.org/10.1177/0956797614524255
6. T. Gneiting and A. Raftery, "Strictly Proper Scoring Rules, Prediction, and Estimation," JASA 102(477), 2007. https://doi.org/10.1198/016214506000001437
7. Next.js docs, Linking and Navigating; Prefetching guide. https://nextjs.org/docs/app/getting-started/linking-and-navigating ; https://nextjs.org/docs/app/guides/prefetching
8. Y. Leviathan, M. Kalman and Y. Matias, "Fast Inference from Transformers via Speculative Decoding," ICML 2023. https://proceedings.mlr.press/v202/leviathan23a.html
9. MDN, Speculation Rules API (prefetch waste, unsafe prefetching, staleness). https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
10. S. Srinath, O. Mutlu, H. Kim and Y. Patt, "Feedback Directed Prefetching," HPCA 2007. https://people.inf.ethz.ch/omutlu/pub/srinath_hpca07.pdf ; J. E. Smith, "A Study of Branch Prediction Strategies," ISCA 1981. https://dl.acm.org/doi/10.5555/800052.801871
11. R. Arnold and S. Bohner, "Impact Analysis: Towards a Framework for Comparison," CSM 1993. https://www.cs.purdue.edu/homes/xyzhang/fall07/Papers/00366933.pdf ; Bohner and Arnold, *Software Change Impact Analysis* (1996), ch. 1. https://catalogimages.wiley.com/images/db/pdf/0818673842.excerpt.pdf
12. O. Gotel and A. Finkelstein, "An Analysis of the Requirements Traceability Problem," ICRE 1994. https://discovery.ucl.ac.uk/749/1/2.2_rtprob.pdf
13. P. J. Clarkson, C. Simons and C. Eckert, "Predicting Change Propagation in Complex Design," J. Mech. Design 2004. https://doi.org/10.1115/1.1765117 ; Cambridge EDC, Change Management. https://www-edc.eng.cam.ac.uk/research/change-management
14. A. Clark, "Whatever next? Predictive brains, situated agents, and the future of cognitive science," BBS 2013. https://doi.org/10.1017/s0140525x12000477
15. Palantir Foundry docs, Workshop Scenarios: core concepts. https://palantir.com/docs/foundry/workshop/scenarios-concepts/
16. A. Ziegler et al., "Productivity Assessment of Neural Code Completion," MAPS 2022. https://arxiv.org/abs/2205.06537
17. tchjhnsn/everything-ecosystem, docs/decisions/decisions.json (EE-056, EE-057, EE-098). https://github.com/tchjhnsn/everything-ecosystem/blob/main/docs/decisions/decisions.json
18. tchjhnsn/everything-ecosystem, site/content/marketing/how.mdx. https://github.com/tchjhnsn/everything-ecosystem/blob/main/site/content/marketing/how.mdx
19. tchjhnsn/everything-ecosystem, docs/master/naive-docs.md. https://github.com/tchjhnsn/everything-ecosystem/blob/main/docs/master/naive-docs.md
20. tchjhnsn/everything-ecosystem, docs/design/DECISION_ROADMAPS_AND_LIFECYCLE_PLAYBOOKS_2026-10-29.md. https://github.com/tchjhnsn/everything-ecosystem/blob/main/docs/design/DECISION_ROADMAPS_AND_LIFECYCLE_PLAYBOOKS_2026-10-29.md
21. tchjhnsn/everything-ecosystem, docs/design/NAIVE_MAD_ARCHITECTURE_AND_SUBSTRATES_2026-10-29.md. https://github.com/tchjhnsn/everything-ecosystem/blob/main/docs/design/NAIVE_MAD_ARCHITECTURE_AND_SUBSTRATES_2026-10-29.md
22. tchjhnsn/everything-ecosystem, docs/design/NAIVE_SYSTEMS_2026-11-01.md. https://github.com/tchjhnsn/everything-ecosystem/blob/main/docs/design/NAIVE_SYSTEMS_2026-11-01.md
23. tchjhnsn/everything-ecosystem, packages/naive/src/terms/ontology.json (v0.6.0). https://github.com/tchjhnsn/everything-ecosystem/blob/main/packages/naive/src/terms/ontology.json
24. tchjhnsn/everything-ecosystem, schema/internal-terms-test.mjs. https://github.com/tchjhnsn/everything-ecosystem/blob/main/schema/internal-terms-test.mjs
25. Wolters Kluwer, "The ultimate guide to enterprise budgeting, planning, and forecasting" (Oct 20, 2026): driver-based planning, rolling forecasts. https://www.wolterskluwer.com/en/expert-insights/enterprise-budgeting-planning-forecasting-ultimate-guide
26. IBM, "What is extended planning and analysis (xP&A)?" (Nov 26, 2025; term popularized by Gartner in 2020). https://www.ibm.com/think/topics/extended-planning-analysis
27. W3C, SKOS Reference (2009). https://www.w3.org/TR/skos-reference/
28. `docs/design/TYPESAFE_JEV_VS_LLM_2026-11-02.md` (Jev calibration by task; arithmetic at chance in SILT-RP-009, https://sentientindexlabs.com/publications/silt-rp-009)
29. `docs/design/DIRECTIONAL_PAIR_AGENTS_2026-11-02.md` and impact-tiers-brief.md (X@Y lenses; Wilson and SPRT standing rules)
30. R. Parasuraman and D. Manzey, "Complacency and Bias in Human Use of Automation," Human Factors 52(3), 2010. https://doi.org/10.1177/0018720810376055
