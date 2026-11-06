---
type: research-note
source: hybrid
created: 2026-10-27T06:05:00Z
ai-model: claude-opus-5.5
authority: advisory
status: DRAFT
tags: [everything-ecosystem, mad, jev, typesafe, benchmark, scoring]
description: "First head-to-head of Jev (TypeSafe jev-1.13.0) and a reasoning model (Claude) as MAD's methodology scorer, on two cases: assignment A-001 and the golden due-date case. Small sample; read as a first look, not a verdict."
---

# Jev versus a reasoning model as MAD's scorer: first look

Both scorers answer the same typed questions from `ee recommend` (whole fit, part fit, and whether each fits-when and unfit-when condition holds); the same scoring rule (v2) turns the answers into a ranking. Jev ran three times per case; the reasoning model once, by hand (`--answers`).

## Results

**A-001, Product Anatomy runner JSON output** (a one-flag change to a small CLI, with tests).

| Methodology | Reasoning model | Jev (3 runs) |
| --- | --- | --- |
| small change | 1st, 0.70 | 5th, 0.36 |
| spec-first | 2nd, 0.64 | 11th, 0.14 |
| contract-first | 3rd, 0.34 | 6th, 0.32 |
| spec-anchored | 4th, 0.26 | 2nd, 0.44 |
| V-model (candidate) | 9th, 0.05 | **1st, 0.62** |

**Golden case, due-date calculator** (rules as data, high cost of error, high verifiability). The golden expectation (SD-20) is spec-as-source, TDD and design by contract near the top, and neither spec-anchored prose nor a spike first.

| Methodology | Reasoning model | Jev (3 runs) |
| --- | --- | --- |
| design by contract | **1st, 0.63** | 3rd, 0.57 |
| V-model (candidate) | 2nd, 0.44 | **1st, 0.72** |
| contract-first | 3rd, 0.41 | 7th, 0.36 |
| spec-anchored | 4th, 0.37 | 2nd, 0.60 |
| BDD | lower | 4th, 0.52 |

| | Reasoning model | Jev |
| --- | --- | --- |
| Run-to-run spread | not measured (one run) | at most 0.05, mostly 0.01 |
| Cost per recommendation | the session's own tokens | about $0.0034 for 3 runs of 20 methodologies |
| Reasons | written with each answer | none; reasons come from which conditions passed |
| Setup | none | API key; project description sent to TypeSafe |

## What it shows

1. **Jev is very consistent.** Three runs moved scores by 0.01 to 0.05. That is its real strength over hand scoring.
2. **Jev ranks V-model first in both cases, including a one-flag CLI change.** It answers each condition literally ("requirements are stable enough to write a test specification" holds for a JSON flag) and the catalog gives it nothing to weigh proportion against: V-model's unfit-when list has no "small, low-risk change" condition (spiral's has one). This is a catalog gap first; any scorer reading the catalog literally will make it.
3. **Jev reads conditions without context.** For A-001 it says both "tiny changes" (0.66) and "intent that must stay true for months" (0.77) hold, which pushes spec-first to 11th.
4. **The golden case cannot be fully tested today.** TDD and spec-as-source are in `re-check` lifecycle, which `ee recommend` skips, so the two methods the golden case expects near the top were not scored by either side. Design by contract, the third, is in both top three.
5. **The reasoning model's answers are not blind.** It proposed A-001 before Jev ran, and the golden expectation is written in the case file it read. Its agreement with the expectation is weak evidence.

## After the catalog fix (same day)

Torian chose to fix the catalog before re-scoring. Proportion conditions were added to V-model, waterfall, the agile-waterfall hybrid, Scrum and spec-anchored (Boehm and Turner's home grounds; the Scrum Guide), and TDD and spec-as-source were re-checked and returned to `listed`. Jev was re-run three times on each case (`2026-10-27-golden.jev.after-catalog-fix.json` beside this note; A-001's run is in the register).

| Case | Jev before | Jev after |
| --- | --- | --- |
| A-001 | V-model 0.62, then spec-anchored, design by contract | **TDD 0.79 alone in band 1**; spec-anchored 0.45; V-model fell to 8th (its new proportion condition held at 0.75) |
| Golden | V-model 0.72, spec-anchored 0.60, design by contract 0.57 | V-model 0.73; band 2 holds spec-anchored, design by contract, TDD, BDD and spec-as-source (0.60 to 0.50) |

On the golden case all three expected methods are now in the second band, behind V-model. For a high-stakes, auditable calculator, V-model first is defensible. Jev's spread stayed at 0.01 to 0.03. The two disagreements in the first run came mostly from the catalog, not the scorer.

## What would make the comparison fair

- Fix the catalog first: add a proportion condition to V-model and the other heavyweight candidates, and finish the re-check of TDD and spec-as-source.
- Score held-out cases whose expected ranking the reasoning model has not seen, and repeat the reasoning model three times too.
- Then compare agreement with the expected rankings, spread, cost and time.
