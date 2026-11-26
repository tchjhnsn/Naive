<!-- Placement: tchjhnsn/Naive docs/design/IMPACT_TIERS_BRIEF_2026-11-01.md. Original research date: 1 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

# Impact tiers and rule learning: research brief (Nov 1, 2026)

## The headline problem: the numbers as set can't work
Wilson lower bound (WLB), with z = 1.96 (95%):
WLB = [p + z²/2n − z·sqrt(p(1−p)/n + z²/4n²)] / (1 + z²/n), where p = successes/n [S1].

| Window n | 0 failures | 1 failure | 2 failures |
|---|---|---|---|
| 3 | 0.438 | 0.208 | 0.061 |
| 5 | 0.566 | 0.376 | 0.231 |
| 10 | 0.722 | 0.596 | 0.490 |
| 20 | 0.839 | 0.764 | 0.699 |

(Computed on the box. With z = 1.645, 10/10 gives 0.787, so the problem holds there too.)

- **Learning.** 10 unanimous answers give 0.722, not 0.9. The 0.9 bar needs 35 unanimous answers, or 53 with one dissent. Under the current rule, no standing rule is proposed for months.
- **Unlearning.** A perfect window of 5 scores 0.566 and a perfect window of 10 scores 0.722. Both sit below their 0.9 and 0.8 floors, so every rule would trip "ask me" on its first check. WLB over a small window measures how little data there is, not how often the rule fails.

## (a) What the design gets right
- **Tiering by reversibility.** Bezos's Type 1 (one-way door) and Type 2 decisions, and his warning against "one-size-fits-all" process, match the tier idea [S2].
- **Wilson for earning trust.** Wilson is among the most accurate small-sample intervals [S1]. It fits earning trust, as long as the sample is long-run history.
- **Human approval and override.** Founder approval, pausing a rule when he disagrees, and "never standing" for one-way doors match the EU AI Act Art. 14 duties: the human can override or reverse the output, can stop the system, and oversight is "commensurate with the risks" [S3]. They also match NIST AI RMF MANAGE 2.4 (disengage systems that underperform) and 4.1 (appeal and override) [S4].
- **Provenance log.** Supports NIST GOVERN 1.4 and MEASURE 2.8 on documentation and accountability [S4].
- **Faster loss than gain.** Trust is "created rather slowly" but "destroyed in an instant" (Slovic's asymmetry principle) [S5].

## (b) Gaps, most important first
1. **Use two different tests to earn and to lose a rule.** Earning: WLB of agreement over full history at 0.9 (needs about 35 answers), or drop to 0.8 (about 16). Losing: a sequential test on recent failures. An SPRT with failure rate 5% (H0) vs 30% (H1), α = β = 0.05, adds +1.79 per failure and −0.31 per success, and suspends at 2.94 [S6]. So two failures in quick succession suspend the rule and one does not. CUSUM works the same way and resets to zero, so old wins can't bank credit [S7]. Off-the-shelf drift detectors need more data than you will have: ADWIN's grace period is 10 points and DDM's warm start is 30 [S8][S9]. Use those for the Jev's error rate, not for single rules.
2. **Implicit feedback is biased.** Joachims et al. show that naive implicit signals are "severely biased" and "not missing completely at random" [S10]. So:
   - Silence is not acceptance. Score it as no data.
   - A frustration flag should start a confirming question, not count as a failure, because the mood may not be about the rule.
   - Rules only get outcomes when they run. Periodically ask the founder about a sample of rule answers, as Joachims does with small randomized interventions [S10].
3. **Delayed harm.** FMEA scores detection and "dormancy period" separately from severity [S11]. Add a time-to-detect field to each question type. When it is long, score an outcome only after that horizon, or keep the type below standing.
4. **Hysteresis and re-earning.** Trust recovers slowly after a first failure ("first-failure effect"). Steady high reliability also breeds "learned carelessness" [S12]. A suspended rule should re-earn trust from zero counts after a cooldown. Also, occasionally re-confirm long-running rules so the founder keeps checking them.
5. **Alert fatigue.** Warnings that interrupt for low-stakes items get ignored, critical ones included. Tier alerts by severity and interrupt only for severe ones [S13]. Batch low-tier reconfigure prompts into a digest.
6. **Governance of tiers.** RAPID requires one Decider per decision and gives "Agree" roles to legal or regulatory gates [S14]. So:
   - Tier changes are packages.
   - Only the founder decides on them, and Finance must agree when the noun is money.
   - Any agent may raise a tier. Lowering one needs approval.
7. **Retry interaction.** A rejection from the one-retry-then-escalate rule should count as a rule failure, and one-way-door types should skip the retry.
8. **Level of automation per tier.** Sheridan-Verplank levels run from 4 ("suggests one alternative") through 5 ("executes if approved") and 6 ("restricted time to veto") to 7 ("executes, then informs") [S15]. Map them to tiers:
   - one-way door: 4 or 5
   - costly to undo: 6
   - low impact: 7

   Parasuraman et al. name reliability and "costs of decision/action outcomes" as the criteria [S16].

## (c) Three tiers, five, or a continuous score?
**Use three action tiers, assigned by a small rubric.** Score each question type 1 to 3 on four dimensions:
- severity
- reversibility
- time to detect
- blast radius (who is affected, including regulatory exposure)

The tier is the **maximum** score, not the product. FMEA's RPN multiplies ordinal scores, which causes "rank reversals." The AIAG/VDA handbook replaced RPN with action priority for this reason [S11]. A continuous 0 to 1 score has the same false precision and invites threshold creep. Five tiers add calibration work without new behavior: there are only three useful actions (auto with log, veto window, always ask), and the alert-fatigue guidance favors few, clear severity levels [S13].

Suggested defaults:
- **Low:** earn at WLB ≥ 0.8 (16+ answers). Suspend on SPRT. Level 7.
- **Costly:** earn at WLB ≥ 0.9 (35+ answers). Suspend on the first failure, then review. Level 6.
- **One-way door:** never standing. Level 4 or 5.

## (d) Not verified
The ISO 31000 and ISO/IEC 23894 texts are paywalled. I confirmed only the scope of 23894 [S17]. I did not open the RACI or DACI sources.

## Sources
S1 https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval
S2 https://www.sec.gov/Archives/edgar/data/1018724/000119312516530910/d168744dex991.htm
S3 https://artificialintelligenceact.eu/article/14/
S4 https://airc.nist.gov/airmf-resources/airmf/5-sec-core/
S5 https://scholarsbank.uoregon.edu/server/api/core/bitstreams/f1309fba-c92e-411b-bbb6-47e6ffef95a1/content
S6 https://en.wikipedia.org/wiki/Sequential_probability_ratio_test
S7 https://en.wikipedia.org/wiki/CUSUM
S8 https://riverml.xyz/latest/api/drift/ADWIN/
S9 https://riverml.xyz/latest/api/drift/binary/DDM/
S10 https://arxiv.org/abs/1608.04468
S11 https://en.wikipedia.org/wiki/Failure_mode_and_effects_analysis
S12 https://en.wikipedia.org/wiki/Automation_bias
S13 https://psnet.ahrq.gov/primer/alert-fatigue
S14 https://www.bain.com/insights/rapid-tool-to-clarify-decision-accountability/
S15 https://ocw.mit.edu/courses/16-422-human-supervisory-control-of-automated-systems-spring-2004/6cb73391272fcbf537e50790c002d186_020504hmancenter.pdf (level wording read from the search-index excerpt; PDF not opened)
S16 https://annieburke.com/research/assets/sheridan-autonomy.pdf
S17 https://www.iso.org/standard/77304.html
