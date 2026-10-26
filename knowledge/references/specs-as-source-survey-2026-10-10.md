---
publish: true
type: research
source: hybrid
created: 2026-10-10
ai-model: claude-opus-5.5
authority: exploratory
status: DRAFT
governed-by:
  - "[[EVERYTHING_ECOSYSTEM_DOMAIN_DESIGN_2026-10-10]]"
lineage-from:
  - "[[sdd-cousins-pros-cons-api-first-2026-08-11]]"
  - "[[sdd-software-factory-sdlc-prior-art-2026-08-11]]"
tags: [research, specs-as-source, spec-driven-development, thesis-t2, survey]
description: "First pass of the survey for thesis T2: is specs-as-source the best approach for AI-assisted development? Records what published work exists as of 2026-10-10, how strong it is, and what it does not yet answer. Pass 2 (same day): Tufano, Alenezi, Piskala and Böckeler read; Alenezi's headline figures traced; SpecOps '26 programme recorded."
---

# Survey: is specs-as-source the best approach for AI-assisted development? (first pass)

Answers thesis **T2** in [[EVERYTHING_ECOSYSTEM_DOMAIN_DESIGN_2026-10-10]].

**Evidence standard:** rows marked **read** were checked against the paper's text (pass 2); all other rows are from abstracts or search summaries and are **unverified**.

## Short answer

Nobody has settled it. The question is being asked: in 2026 there is a dedicated workshop (SpecOps '26, the 1st International Workshop on Specification-Driven Development Life Cycle), a survey-style paper, and several frameworks. But the evidence is early: feasibility studies, small industrial cases, classroom reports and position papers. **No study found compares spec-as-source head to head against other methodologies across kinds of system**, which is exactly the conditional question T2 asks. That gap is a possible original contribution.

## What exists

| Work | Kind | What it says (unverified) | Bearing on T2 |
|---|---|---|---|
| Böckeler on martinfowler.com, "Understanding SDD: Kiro, spec-kit and Tessl" (15 Oct 2025) — **read** | Practitioner analysis | Names three levels: spec-first, spec-anchored, spec-as-source. Kiro turned a small bug into 4 user stories and 16 acceptance criteria; Spec Kit's agent ignored notes and duplicated code; Tessl regenerated different code from the same spec. Warns spec-as-source may inherit MDD's inflexibility *plus* LLM non-determinism, and that reviewing markdown may give false control | The framing the catalog already uses; skeptical of spec-as-source |
| Piskala, arXiv 2602.00180 (Jan 2026) — **read (abstract page)** | Practitioner guide, preprint submitted to AIWare 2026 | Three rigor levels, tool analysis, case studies, a when-to-use decision framework. **No quantitative results**; the error-reduction claim from secondary sources is not in the paper | A decision framework to compare against ours; not evidence |
| Alenezi (SDAIA), arXiv 2607.16680 (Jul 2026) — **read, figures traced** | Literature-based argument + reference model (SGRM) | The **73% security-defect reduction** traces to one preprint case study (Marri, arXiv 2602.02584, one banking microservices case); the **50% time-to-market** and one-person-squad figures to another (Vilas Boas et al., arXiv 2605.18461). Alenezi himself labels both **unreplicated**. Well-established: AI speeds up tasks, and unreviewed generation carries security risk (~40% vulnerable, "Asleep at the Keyboard"). Argues vibe coding suits ideation, governed specs suit enterprise work | Supports a conditional answer; headline pro-SDD numbers are not yet citable as findings |
| Tufano et al. (Google), SpecOps '26, arXiv 2608.17177 — **read** | Controlled empirical, 90 real Google production bugs | Agent first writes a semi-formal contract (pre/postconditions, undefined behaviour), then tests. vs. a plain test-generation agent on the same model: **+9.8 pts bug detection (p=0.035)**, +2.5 pts branch coverage (p=0.003); judged better than baseline in 77.8% and human tests in 56.7% of cases. Limits: one model family (Gemini), LLM-as-judge, Google code only | Real evidence that **a spec as intermediate reasoning** helps agents. It is spec-first/design-by-contract, *not* spec-as-source |
| Scania spec2code, arXiv 2411.13269 | Industrial feasibility | LLM plus critics generated compiling code from formal (ACSL) and natural-language specs in 3 small embedded cases; some formally verified | Closest to true spec-as-source; works where specs are formal and the domain narrow |
| SSDE, FSE Companion '26, arXiv 2605.02455 | Pilot | Quality drops from function to repository level; structured specs may restore verifiability | Supports structured over prose specs |
| SpecCoder, arXiv 2609.06041 | Benchmark | Spec analysis as an intermediate step improves generation on APPS, CodeContests | Specs help on well-defined problems |
| Tanaka et al., arXiv 2608.30572 | Classroom report | SDD with agents raised throughput but students built without understanding the code | Warns of comprehension loss: the builder stops knowing the system |
| Diaz et al., arXiv 2609.00252 | Position | SDD as human–agent teamwork, against vibe coding | Framing, not evidence |
| arXiv 2606.04967, "From Prompt to Process" | Framework comparison | Taxonomy of agent development frameworks | Useful for catalog entries |
| Tooling: GitHub Spec Kit, AWS Kiro, Tessl | Products | Spec Kit and Kiro mostly spec-first per change; Tessl aims at spec-as-source | Shows where industry is betting |

## What pass 2 changed

- The strongest evidence found supports **specs as a thinking step for the agent** (Tufano), not **specs as the source code is regenerated from**. Those are different claims, and the literature often blurs them.
- The large pro-SDD numbers in circulation trace to two single, unreplicated preprint case studies.
- Böckeler's tool observations match the vault's own experience (the August note's "markdown theater" failure mode).

## Early pattern (assumed, to test)

Across these sources a conditional answer is forming, which matches the catalog's decision questions:

- Spec-as-source does best where correct behaviour is **knowable in advance** (M2), the spec can be **formal or structured** and **checked** (M5), and the domain is **narrow** (validators, protocol code, SDK clients, embedded control).
- It does worst on **exploratory**, UI-heavy or fast-changing work (M2, M3), and at **repository scale** with prose specs.
- A risk none of the tools address: when code is derived, the human may stop understanding it (Tanaka). This bears on M6 (accountability) and M7 (builder).

## Not yet answered anywhere found

1. A comparison across kinds of system (the conditional question).
2. Long-lived systems: does spec-as-source hold up over months of change, or only for one generation?
3. Cost: the effort of writing and keeping specs versus the effort saved.
4. Anything outside software. Software-defined hardware and model-based systems engineering are the nearest parallels; not surveyed yet.

## Next research steps

1. ~~Read Tufano, Alenezi, Piskala, Böckeler~~ (done, pass 2). Next: Marron; Lahiri's intent-formalization work; the two case studies behind Alenezi's figures (Marri; Vilas Boas et al.).
2. Survey model-based systems engineering and model-driven development history for the lessons Fowler alludes to.
3. Design our own evidence: record M1–M12 answers and outcomes for every assignment, across software, physical and business projects (invariant I6), so the Ecosystem produces the comparison the literature lacks.

## SpecOps '26 watch

1st International Workshop on Specification-Driven Development Life Cycle, co-located with SPLASH/ISSTA 2026, Oakland, CA, **6 October 2026**. Proceedings in the ACM Digital Library. Track this workshop and its people for future editions.

**Organisers:** Rajdeep Mukherjee (Amazon), Anastasia Mavridou (KBR / NASA Ames), Saikat Dutta (Cornell); web chair Yangtian Zi (Northeastern). Programme committee includes José Pablo Cambronero (Google) and Cristina David (Bristol).

| Item | People | Read? |
|---|---|---|
| Keynote: Intent Formalization — assessing the quality of AI-generated formal program specifications | Shuvendu K. Lahiri (Microsoft Research) | No |
| Keynote: Neurosymbolic autoformalization for C++ verification and requirements-coverage testing | Corina S. Păsăreanu (CMU / NASA Ames), Joe Rutland (Amazon Prime Air) | No |
| Keynote: Unlocking safe agentic autonomy through verification | Niranjan Tulpule | No |
| Grounding AI Agents in Contracts: spec-driven test generation | Tufano, McClure, Cambronero, Cheng, Shi, Wei, Chen, Ivančić, Dalloro, Rondon (Google) | **Yes** |
| Specifications for Humans, Agents, and Tooling | Mark Marron (Kentucky) | No — directly on artifact readers (A2) |
| SPINACH: inferring properties of web applications for property-based testing | Savitha Ravi, Michael Coblenz (UC San Diego) | No |
| RuSMT: an executable semantics as conformance oracle and test-suite synthesiser | Mehrad Haghshenas, Meng Xu (Waterloo) | No |

The workshop's centre of gravity is **formal and executable specifications plus verification**, not prose specs. That supports the early pattern: spec-driven work is strongest where the spec can be checked.

## Sources

- [Fowler / Böckeler: Kiro, spec-kit and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [Tufano et al., Grounding AI Agents in Contracts](https://arxiv.org/pdf/2608.17177)
- [Alenezi, Specification-Driven Development as the Foundation](https://arxiv.org/pdf/2607.16680)
- [Tanaka et al., SDD with AI agents in PBL](https://arxiv.org/abs/2608.30572v1)
- [Diaz et al., SDD for Agentic Software Engineering](https://arxiv.org/abs/2609.00252)
- [From Prompt to Process](https://arxiv.org/pdf/2606.04967)
- [SSDE, FSE 2026](https://arxiv.org/abs/2605.02455)
- [SpecCoder](https://arxiv.org/pdf/2609.06041)
- [Scania spec2code](https://arxiv.org/pdf/2411.13269)
- [Agentic engineering field study: SDD](https://github.com/ianhxu/agentic-engineering-field-study/blob/main/04-spec-driven-development.md)
- [SpecOps 2026 workshop](https://conf.researchr.org/home/splash-issta-2026/specops-2026)
- [SpecOps 2026 accepted papers](https://conf.researchr.org/track/splash-issta-2026/specops-2026-papers)
- [Piskala, Spec-Driven Development](https://arxiv.org/abs/2602.00180)
