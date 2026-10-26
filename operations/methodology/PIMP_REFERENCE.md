---
type: knowledge
source: hybrid
created: 2026-04-10
ai-model: claude
tags: [everything-ecosystem, methodology]
---
# Philosophical Inquiry Methodology Protocol (P.I.M.P.)
## Reference Document — v1.0

> **Core principle**: If we are to study, build frameworks, or construct computational models on top of our understanding of any phenomenon, it is pertinent that we understand what it is we are asking and what it is we are discussing. This is why methodology matters — not because of any particular research program, but because of the thing being asked about itself.
>
> **Extended principle**: "Philosophical" is the correct term because philosophy itself is the parent branch of every other school of thought and knowledge. The methodology applies to any phenomenon — scientific, theological, humanistic — but the commitment to attending to phenomena before theorizing is inherently philosophical.

---

## DOCUMENT HIERARCHY

```
PROLEGOMENA.md                <- (when needed) terminological clearing, declared assumptions,
  |                              scope boundaries, motivations; discovered through questioning
  |
  |-- INQUIRY_FRAME.md              <- the guiding light; questions, non-assumptions, adequacy criteria
        |-- OBSERVATION_CATALOG.md       <- phenomenological reduction output
        |-- LIMIT_CASE_CATALOG.md        <- eidetic variation / limit-case reasoning output
        |-- DEDICATED_TREATMENT.md       <- the ontological statement (central deliverable of Part 1)
              |
              |-- [Branch A: Comparative-Critical Track]
              |     |-- APPROACH_RATIONALE.md      <- why these critical-analytic traditions
              |     |-- COMPARATIVE_ANALYSIS.md     <- our treatment vs. existing treatments
              |     |-- SELF_CRITIQUE.md            <- our treatment subjected to its own analysis
              |
              |-- [Branch B: Integration-Provability Track]
                    |-- INTEGRATION_MAP.md          <- treatment mapped into parent framework
                    |-- DERIVATION_RESULT.md        <- formal derivation attempt (if applicable)
                    |-- PROVABILITY_ASSESSMENT.md   <- engineering validation predictions

IDEA_DUMP.md                  <- precedes all of the above; raw capture
SESSION_LOG.md                <- reads across all phases (shared with SAD if unified)
```

**Derivation rule**: Every downstream document derives from the document directly above it. The Observation Catalog derives from the Inquiry Frame's question and method. The Dedicated Treatment derives from the Observation Catalog and Limit-Case Catalog. Branch A and Branch B both derive from the Dedicated Treatment but are independent of each other.

**The Inquiry Frame is never invalidated by downstream work.** If downstream work reveals that the question itself was wrong, that is a finding — the Inquiry Frame is revised, and the revision is documented as a methodological discovery, not an error.

---

## QUICK REFERENCE

### Complete Step Map

| Step | Name | Part | Produces | Stopping Metric |
|------|------|------|----------|----------------|
| 0 | Idea Dump | Pre | `IDEA_DUMP.md` | Saturation |
| 0p | Prolegomena (when needed) | Pre | `PROLEGOMENA.md` | Terminological + assumptive clarity |
| 1 | Inquiry Frame | Core | `INQUIRY_FRAME.md` | Transferability |
| 2 | Phenomenological Reduction | Core | `OBSERVATION_CATALOG.md` | Observational saturation |
| 2b | Limit-Case Reasoning | Core | `LIMIT_CASE_CATALOG.md` | Essential/accidental clarity |
| 3 | Dedicated Treatment | Core | `DEDICATED_TREATMENT.md` | Observational coverage |
| 4 | Approach Selection | Branch A | `APPROACH_RATIONALE.md` | Justification |
| 5 | Comparative Analysis | Branch A | `COMPARATIVE_ANALYSIS.md` | Coverage + survival evaluation |
| 5a | Self-Critique | Branch A | `SELF_CRITIQUE.md` | Reflexive coverage |
| 6 | Integration | Branch B | `INTEGRATION_MAP.md` | Bidirectional mapping |
| 7 | Derivation | Branch B | `DERIVATION_RESULT.md` | Formal result |
| 8 | Provability | Branch B | `PROVABILITY_ASSESSMENT.md` | Testable prediction |

### Methodology Structure

```
Part 1: Constructive (from observation)        Part 2: Analytic (from existing treatments)
--------------------------------------------   -------------------------------------------
Step 0: Idea Dump                               Step 4: Approach Selection
Step 0p: Prolegomena (when discovered)          Step 5: Comparative Analysis
Step 1: Inquiry Frame                           Step 5a: Self-Critique
Step 2: Phenomenological Reduction
Step 2b: Limit-Case Reasoning
Step 3: Dedicated Treatment (Ontological Stmt)

              Branch B: Integration-Provability
              ---------------------------------
              Step 6: Integration
              Step 7: Derivation
              Step 8: Provability
```

**Valid paths through the methodology:**

- **Core only**: 0 -> 1 -> 2 -> 2b -> 3 (minimum complete inquiry)
- **Core + Branch A**: 0 -> 1 -> 2 -> 2b -> 3 -> 4 -> 5 -> 5a (with comparative analysis)
- **Core + Branch B**: 0 -> 1 -> 2 -> 2b -> 3 -> 6 -> 7 -> 8 (with integration and provability)
- **Full**: 0 -> 1 -> 2 -> 2b -> 3 -> (4 -> 5 -> 5a) + (6 -> 7 -> 8) (Branch A and B are independent and can run in parallel)
- **Branch A standalone**: 1 -> 4 -> 5 (comparative analysis used independently, without prior phenomenological reduction — for response papers or pure comparative work)
- **Framework paper**: 0 -> 1 -> 2 -> 2b -> 3 (the dedicated treatment IS the paper)
- **Architectural handoff**: 0 -> 1 -> 3 -> 8 -> SAD (for papers where the philosophical grounding exists and the goal is engineering specification)

### Contamination Guardrail

**When the subject of inquiry is a framework the inquirer has already developed, there is a strong contamination risk.** The inquirer already knows (or believes they know) the answers, and those answers pull the questions toward themselves. The Inquiry Frame risks becoming a description of the existing framework rather than a framing of the inquiry that would lead to it.

Three contamination mechanisms have been identified:

1. **Reading the answers before writing the questions.** If the inquirer reads or reviews the framework's conclusions before drafting the Inquiry Frame, those conclusions leak into the questioning space. The Inquiry Frame should be writable *without* consulting the framework's content. The framework's content belongs to Steps 2 and 3, not Step 1.

2. **Confusing "framing a paper" with "framing an inquiry."** A paper frame says "here's what this paper will present." An inquiry frame says "here's what we're asking and how we'll know when we've answered it." These are fundamentally different documents. The Inquiry Frame must not contain statements about what the theory proposes, descriptions of the framework's structure, or summaries of its content. It contains only questions, motivations, non-assumptions, and adequacy criteria.

3. **Importing the subject's conclusions into the question structure.** If the inquiry is about the soul and the framework proposes 18 elements, the Inquiry Frame must not reference 18 elements. If the inquiry is about personality and the framework proposes a derivation from Image, the Inquiry Frame must not reference Image. Conclusions belong to the treatment, not the frame. The frame must be written as if the theory does not yet exist.

**The test for contamination**: Could someone who has never encountered the framework use this Inquiry Frame to conduct the inquiry from scratch? If the frame assumes knowledge of the framework's content, it is contaminated.

**When the framework already exists**: The Inquiry Frame should be written as if the questions are being asked for the first time. The existing framework's content enters the methodology at Step 2 (as phenomenological observations that may or may not be confirmed) and Step 3 (as the dedicated treatment that must earn its right to exist). It does not enter at Step 1.

### Methodology Flexibility

**P.I.M.P. is not rigid.** The methodology should evaluate the subject matter and determine which steps are necessary for the given inquiry. Not every paper requires every step. The methodology serves the inquiry, not the other way around.

Key principles of flexible application:
- **Some papers are frameworks.** The dedicated treatment (Step 3) IS the paper. Steps beyond the core track may not be needed.
- **Part 2 can be used independently.** Comparative analysis and response papers may use Branch A without having done a full phenomenological reduction first.
- **Not all papers need Step 2b.** Limit-case reasoning is powerful but not universally required — some phenomena are better served by direct phenomenological description.
- **The inquiry type determines the path.** Phenomenological inquiries follow the full core track. Convergence papers emphasize Step 6. Response papers emphasize Steps 4-5. Architectural papers hand off to SAD at Step 8.
- **A research program may follow P.I.M.P.'s own structure.** Original, standalone research (Part 1 of the methodology — constructive, from observation) should precede relational research (Part 2 — comparative, convergent, responsive). This applies at the portfolio level, not just the individual paper level.

### Stopping Point Types

Every stage has two types of legitimate stopping points:

| Type | Meaning | Deliverable Claims |
|------|---------|-------------------|
| Conclusive completion | The stage accomplished what it set out to do | Adequacy |
| Acknowledged incompleteness | The stage reached the boundary of what it can accomplish | Adequacy within stated limits; names what lies beyond |

Both are legitimate. The methodology does not privilege one over the other. A stage that terminates in acknowledged incompleteness has not failed — it has produced an honest account of its own limits, which is itself a finding. Coming to a stopping point at any stage may itself be a Godelian constraint — the stage is "about" something that exceeds what the stage's own framework can fully resolve. Knowing that you've hit that wall *is* the stopping point.

---

## PART 1: THE CONSTRUCTIVE TRACK

Part 1 is purely based on observation, without starting from assumptions. You begin with nothing and add through disciplined attention to what shows itself. The movement is synthetic: gather, attend, build. The dedicated treatment that emerges is, in essence, an ontological statement: given everything we observe, here is what the thing *is*. This statement earns its right to exist by accounting for the phenomena.

---

### Step 0: Idea Dump

**Purpose**: Raw capture of observations, hunches, case studies, provocations. No ordering, no filtering. This is the pre-methodological phase — the material from which the inquiry takes shape.

**What this step is**:
- An unconstrained space for capturing everything that seems relevant
- A record of what was noticed before theory organized it
- The raw phenomenological ground from which the inquiry frame will be drawn

**What this step is not**:
- Not an inquiry frame (that is Step 1)
- Not a phenomenological reduction (that is Step 2)
- Not organized by any theory or framework

**Relationship to SAD**: If P.I.M.P. is standalone, this step is independent. If P.I.M.P. is unified with SAD as a skill, the idea dump is the handoff point between them. SAD Phase 0A and P.I.M.P. Step 0 are structurally identical.

**Stopping metric**: **Saturation.** When new observations begin to repeat, reference, or recombine already-captured material rather than introducing genuinely new phenomenological ground, the dump is saturated.

**Godelian constraint**: You can never know from within the dump whether all relevant observations have surfaced. New case studies or experiences may later reveal observations the dump did not anticipate.

**Deliverable**: `IDEA_DUMP.md` — the idea dump document, with a saturation note stating what has been captured and acknowledging that further observations may emerge.

---

### Step 0p: Prolegomena (When Discovered)

**Purpose**: Ground-clearing that makes honest questioning possible. Establishes what the key terms mean, what assumptions are being made and why, what the methods can and cannot reach, and why the inquiry matters — before the inquiry frame poses its questions.

**This step is not prescribed for every inquiry.** It is discovered through the questioning process. By beginning to ask questions (Step 1) or beginning a phenomenological reduction (Step 2), certain inquiries — particularly foundational ones or those where the key term is deeply contested — reveal that the ground is not clear enough to proceed. The terminological landscape is ambiguous. The list of possible questions is inexhaustible. The inquirer has goals and intentions that constrain which questions are pursued. Assumptions are being made that need to be declared transparently.

**The order of discovery is the reverse of the order of documentation.** Prolegomena are discovered after the questioning begins, but documented before the inquiry frame is finalized. The inquirer starts asking questions, recognizes the need for preparatory work, produces the prolegomena, and then returns to the inquiry frame with the ground cleared.

**The word "prolegomena"** means "things said before" — preliminary declarations that establish what must be true, defined, and assumed before the inquiry proper can begin. Kant's *Prolegomena to Any Future Metaphysics* is the canonical example: preparatory work that establishes the conditions and limits of inquiry before the inquiry proceeds.

**What the prolegomena contains:**

1. **Terminological landscape** — What are the key terms? Where do they overlap and diverge? What etymology reveals about how understanding has fragmented or shifted over time. For contested terms (e.g., soul, consciousness, mind, spirit), a declaration of how the inquiry will use each term and why. This is not a definitive etymology — it is a declaration of terms for the purposes of the research.

2. **Declared assumptions with rationale and falsifiability** — What is the inquiry assuming in order to proceed? Why is each assumption being made? Under what conditions would each assumption be shown to be wrong? This transparency framework (assumption → rationale → falsifiability condition) makes the research auditable. If the assumption is wrong, the falsifiability condition tells the reader what would reveal that.

3. **Scope boundaries** — What can the inquiry's methods access? What lies beyond the methods available? Phenomena that are real but not falsifiable are acknowledged without being asserted. The inquiry deals with what can be observed and tested, while naming what it cannot reach.

4. **Motivations (universal and practical)** — Why does this question matter as a question (universal)? And why does it matter for any specific application the inquirer intends (practical)? Both are stated, and both are honest about their different stakes.

5. **Acknowledgment of selectivity** — The inquiry cannot pursue every question. Which questions are being pursued, and which are being deferred? Why? What has the inquirer chosen to focus on, and what is being left for later or for others?

**When prolegomena are needed**: Foundational inquiries where the key term is deeply contested across multiple traditions (soul, consciousness, justice, beauty, God). Inquiries where the subject may exceed the method's capacity. Inquiries where the list of possible questions is inexhaustible and the inquirer must declare which subset they are pursuing and why.

**When prolegomena are NOT needed**: Inquiries where the key term has relatively stable common usage (personality, courage, grief). Inquiries where the terminological ground is already clear. Inquiries building on previously established prolegomena from a parent inquiry.

**Stopping metric**: **Terminological and assumptive clarity.** The prolegomena are complete when the key terms are defined for the purposes of the research, the assumptions are declared with rationale and falsifiability conditions, the scope boundaries are stated, and the motivations are articulated. The test: could someone unfamiliar with the inquiry read this document and understand the ground on which the inquiry will proceed?

**Godelian constraint**: The Gödelian constraint operates at two levels in the prolegomena. First, at the level of terminology: when the key terms of the inquiry are deeply contested across traditions, an exhaustive inquiry into any single term would be inexhaustible. The inquirer must assign operational definitions — axiomatic choices — in order for the terms to be usable. These definitions do not exhaust what the terms mean; they establish what the terms will mean for the purposes of this research. Second, at the level of assumptions: the prolegomena cannot guarantee that the chosen definitions and assumptions are correct — only that they are stated transparently. The falsifiability conditions provide a mechanism for discovering errors, but they cannot prevent them.

**Deliverable**: `PROLEGOMENA.md` — terminological landscape, declared assumptions with falsifiability, scope boundaries, motivations, and acknowledgment of selectivity.

---

### Step 1: Inquiry Frame

**Purpose**: Establish the guiding light for the entire inquiry. This is the first formal documentation and the document from which all subsequent documentation takes its direction. Before producing any other documentation, this document must exist.

**The Inquiry Frame establishes**:

1. **The Question** — What are we asking? Stated precisely enough that someone else could recognize whether a given answer addresses it.

2. **The Motivation** — Why does this matter as a question? This pertains to the inquiry's relationship to its own subject, not to any downstream application or research program. Why it matters to understand this phenomenon, period. (Note: the motivation could itself be a standalone paper.)

3. **The Non-Assumptions** — What we are deliberately NOT assuming. These are guard rails that keep the phenomenological space open. Stating non-assumptions is methodologically significant because it prevents inheriting frameworks, categories, or conclusions before the inquiry has earned them.

4. **The Adequacy Criteria** — What would count as an adequate answer? Not a predetermined conclusion, but a description of what form a satisfactory treatment would take.

5. **The Method** — What is the process by which we intend to conduct this research? Which steps of P.I.M.P. will be pursued, and in what order?

**Stopping metric**: **Transferability.** The frame is complete when someone else could conduct the reduction without further guidance — the question, motivation, non-assumptions, and adequacy criteria are stated clearly enough to be followed independently.

**Godelian constraint**: The frame may not be able to fully specify what would count as an adequate answer, because the phenomenon may exceed what the frame anticipates.

**Deliverable**: `INQUIRY_FRAME.md` — the guiding light document. This is the most important document in the inquiry. Everything else derives from it.

---

### Step 2: Phenomenological Reduction

**Purpose**: Attend to the phenomenon as it shows itself, before theory names it. Produce a catalog of observations — not conclusions.

**How this step runs**:
- Identify case studies that ground the inquiry in observable phenomena
- For each case study, ask: what do we actually observe? Strip away theory, frameworks, names.
- Record what shows itself, not what should show itself according to any theory
- The output is a catalog, not an argument

**What this step is not**:
- Not an analysis (analysis comes in Step 3 and beyond)
- Not a literature review (that is Part 2)
- Not an attempt to fit observations into a framework

**Stopping metric**: **Observational saturation.** When new case studies produce observations already accounted for in the catalog, the reduction has reached its practical limit.

**Godelian constraint**: There may be observations the reduction cannot access — first-person experience of another consciousness, phenomena that only manifest under conditions the inquirer has not encountered, or aspects of the phenomenon that are structurally invisible to the method of observation being used.

**Deliverable**: `OBSERVATION_CATALOG.md` — a catalog of observations (not conclusions), with a saturation note and an explicit acknowledgment of observational limits.

---

### Step 2b: Limit-Case Reasoning (Observation-to-Ontology Bridge)

**Purpose**: Bridge from observation to ontological claim by taking observations to their logical extremes. Test which features of the observed phenomena are essential (the phenomenon couldn't be what it is without them) and which are accidental (they can change without the phenomenon ceasing to be itself). This distinction grounds the ontological statement in Step 3.

**The logic of this step**: Limit cases are not observations — they are a reasoning technique applied *to* observations. They are made possible by Step 2 (you couldn't construct the hypothetical extremes without first having observed the real cases) but they produce something Step 2 cannot: a separation of essential from accidental features.

**Approach selection**: As with Part 2's critical-analytic approaches, the methodology does not assume one limit-case reasoning tradition is correct for every scenario. Different approaches serve different purposes and may surface different aspects of the phenomenon. Part of this step is to consider which approach is appropriate for the given inquiry. The default is eidetic variation.

#### Known Approaches

**Eidetic Variation (default)** — Husserlian phenomenology
- Imaginatively vary the features of the phenomenon — push to extremes, remove, invert — to discover which features are essential and which are accidental
- Asks: if I change this feature, does the phenomenon cease to be itself?
- Strength: directly produces the essential/accidental distinction needed for the ontological statement
- Best for: phenomena where the goal is to identify essential structure
- Example: if two people lived the exact same life with the exact same genetics but had completely opposite personalities, this would tell us that genetics and life circumstance are accidental to personality. The contrary case — people with completely contrary lives, genetics, and circumstances who have the exact same personality — would confirm the same finding from the opposite direction. These hypothetical extremes are constructed by extrapolating from observed cases (twins raised apart with similar personalities; strangers with different lives but similar personalities) to their logical limits.

**Thought Experiment** — broad philosophical tradition
- Construct scenarios that may never be observed but whose logical implications reveal something about the phenomenon
- Asks: if this scenario were the case, what would it tell us?
- Strength: can test implications that observation alone cannot reach
- Best for: phenomena where specific causal or structural relationships need to be tested
- Note: eidetic variation is a specific type of thought experiment; thought experiments in general are broader and may not be focused on essential/accidental distinction

**Counterfactual Reasoning** — analytic philosophy
- Reason about scenarios that didn't and perhaps couldn't happen, but whose logical structure is informative
- Asks: if X were the case, then Y would follow — and what does that tell us?
- Strength: can reveal structural dependencies and necessary conditions
- Best for: phenomena where causal or conditional relationships are central to the inquiry

**Reductio ad Absurdum** — classical logic
- Take a premise to its logical extreme to show it produces a contradiction
- Asks: if we assume this about the phenomenon, does it lead to an impossibility?
- Strength: can definitively eliminate candidate accounts or features
- Best for: testing whether a proposed essential feature is actually essential
- Note: unlike the other approaches, reductio aims to eliminate rather than discover — it tells you what the phenomenon is *not* rather than what it *is*

Other approaches may exist. The methodology remains open to additional limit-case traditions as they become relevant.

**Stopping metric**: **Essential/accidental clarity.** The step is complete when the limit cases have produced a clear distinction between features that are essential and features that are accidental — or when it has been established that this distinction cannot be clearly drawn for the given phenomenon (which is itself informative for the dedicated treatment).

**Godelian constraint**: Limit cases are constructed from observed cases, and the imagination is bounded by what has been observed. There may be essential features that no limit case reveals because the relevant variation has not been imagined. Additionally, some phenomena may resist the essential/accidental distinction entirely.

**Deliverable**: `LIMIT_CASE_CATALOG.md` — a catalog of limit cases with their findings: which features were shown to be essential, which accidental, and which remain undetermined. Includes the approach selection rationale.

---

### Step 3: Dedicated Treatment (Ontological Statement)

**Purpose**: Given everything observed in Step 2 and the essential/accidental distinctions established in Step 2b, state what the thing *is*. This is where the inquirer earns the right to make a claim. The treatment must account for every observation from the reduction and be consistent with the limit-case findings.

**What this step produces**: An ontological statement — not a definition imposed from outside, but a statement that earns its right to exist by accounting for the phenomena. It says: given everything that showed itself, here is what we are referring to.

**Requirements for adequacy**:
- Accounts for every observation in the catalog from Step 2
- Is consistent with the essential/accidental findings from Step 2b
- Names any gaps explicitly — observations it cannot account for
- States its own scope and limits

**Stopping metric**: **Observational coverage.** The treatment is complete when it accounts for every observation from Step 2 and is consistent with the essential/accidental findings from Step 2b. If it cannot account for all, the gaps must be explicitly named — that naming is itself part of the deliverable.

**Godelian constraint**: The treatment, as a formal statement, is necessarily incomplete relative to the full phenomenon. It is adequate within its stated scope, not exhaustive of the phenomenon itself. Any formal definition will capture aspects of the phenomenon but cannot capture the totality.

**Deliverable**: `DEDICATED_TREATMENT.md` — the ontological statement, with explicit scope, named gaps, and stated limits. This is the central deliverable of Part 1 and the document from which both Branch A and Branch B derive.

---

## PART 2: THE ANALYTIC TRACK (Branch A)

Part 2 looks at what has been. It starts the inquiry frame all over again, but rather than starting from scratch and adding observation, you start with something and subtract from it through analysis. This is the research phase. Part 2 is the inverse of Part 1: phenomenological reduction is additive; critical analysis is subtractive.

Part 1 asks: "What shows itself?"
Part 2 asks: "What did they claim, and where does it fail?"

Branch A is independent of Branch B. You can complete Part 1 and proceed directly to Branch B without ever doing Part 2. Or you can do both. The choice is itself a methodological decision within the inquiry.

---

### Step 4: Approach Selection

**Purpose**: Determine which critical-analytic tradition(s) are appropriate for examining existing treatments of the subject. This is a deliberate methodological choice, not a default.

#### Known Approaches

**Immanent Critique** — Frankfurt School tradition
- Evaluates a framework on its own terms
- Asks: where does this framework fail to deliver what it itself promises?
- Strength: takes the framework seriously enough to find its internal breaking point
- Best for: frameworks with explicit internal standards or goals they claim to meet

**Heideggerian Destruktion** — critical dismantling of inherited tradition
- Asks: where did the original phenomenological insight get buried under layers of theory?
- Works backward through existing treatments to recover what was originally observed
- Best for: concepts with long philosophical histories where tradition may have covered over the phenomenon

**Apophatic Method (Via Negativa)** — definition by negation
- Establishes what the thing is NOT
- Shows where other accounts overreach, underreach, or mistake something adjacent for the thing itself
- Best for: phenomena that resist positive definition, where every positive claim captures only a part

**Conjunctive Analysis** — the combinatorial approach
- When multiple approaches are applied to the same subject, each surfaces something different
- Hold the findings from all approaches side by side; observe what patterns emerge from the combination
- This combinatorial observation is itself a type of approach — synthetic across analytical perspectives rather than across observations
- Best for: any inquiry where multiple approaches have been used; the conjunction may reveal things no single approach could

Other approaches may exist. The methodology remains open to additional critical-analytic traditions as they become relevant. A single inquiry may — and often should — use more than one approach.

**Stopping metric**: **Justification.** The selection is complete when the chosen approach(es) are justified in terms of what was learned in Steps 1-3.

**Godelian constraint**: There may be critical-analytic traditions the inquirer is not aware of that would be more appropriate. The selection is made from known options.

**Deliverable**: `APPROACH_RATIONALE.md` — a brief rationale for approach selection, grounded in the findings of Part 1.

---

### Step 5: Comparative Analysis

**Purpose**: Examine existing treatments of the subject through the selected approach(es). This is a comparative analysis — our treatment versus theirs.

**Objectives for Part 2** (generalizable across any subject):

1. **What is being claimed** by the existing treatment?
2. **Where does it break?** (Under whichever approach(es) were selected)
3. **What survived** the critical analysis? — This is essential. The analysis is not purely destructive. Material that survives tells you what is load-bearing in the existing treatment, what was genuinely observed versus merely assumed, and what your own treatment should account for that it might not yet.
4. **What Godelian constraints** limit their systems?
5. **What did they observe** that we did not, and vice versa?

When multiple approaches are used, perform the conjunctive analysis: hold the findings from each approach side by side and observe what patterns emerge from the combination.

**Stopping metric**: **Coverage and survival evaluation.** The analysis is complete when each examined treatment has been subjected to the selected approach(es) and the findings catalogued: what broke, what survived, what Godelian constraints were identified, what observational gaps exist between their account and ours.

**Godelian constraint**: There may be existing treatments the inquirer has not encountered. The analysis covers what is known and states its survey boundaries.

**Deliverable**: `COMPARATIVE_ANALYSIS.md` — the comparative analysis document, including the survival evaluation and conjunctive findings (if multiple approaches were used). This is the central deliverable of Part 2.

---

### Step 5a: Self-Critique

**Purpose**: Subject Part 1's final product — the dedicated treatment / ontological statement — to the same critical-analytic treatment applied to others in Step 5. The dedicated treatment is itself a claim. It must be examined with the same rigor applied to every other treatment.

**How this step runs**:
- Apply the same approach selection (Step 4) to your own work
- Ask: where does our treatment fail on its own terms?
- Ask: what tradition did we inherit without noticing?
- Ask: what does our treatment claim that it cannot fully support?
- If the self-critique reveals significant failures, a revised treatment may be warranted — which cycles back through Step 3

**Stopping metric**: **Same as Step 5, applied reflexively.** The self-critique is complete when your own treatment has been subjected to the selected approach(es) and the findings catalogued honestly.

**Godelian constraint**: Self-critique is structurally limited — you cannot fully see your own blind spots from within your own framework. This is perhaps the most acute Godelian constraint in the entire methodology. The self-critique is necessary but necessarily incomplete.

**Deliverable**: `SELF_CRITIQUE.md` — self-critique findings, stating both what was found and what the self-critique itself may not be able to see.

---

## BRANCH B: INTEGRATION-PROVABILITY TRACK

Branch B is independent of Branch A. It can be pursued directly after Part 1 without completing Part 2. Both branches derive from the Dedicated Treatment (Step 3).

---

### Step 6: Integration

**Purpose**: If there is a parent framework, map the treatment into it. Where does it sit? What does it touch? Does the parent framework need revision? This step tests both the treatment and the parent framework.

**Stopping metric**: **Bidirectional mapping.** Integration is complete when the treatment has been located within the parent framework and the implications in both directions (treatment -> framework, framework -> treatment) have been stated. If the parent framework needs revision, the revision is identified.

**Godelian constraint**: The parent framework may itself have gaps that this integration reveals but cannot resolve. Identifying those gaps is a valid output.

**Deliverable**: `INTEGRATION_MAP.md` — where the treatment sits, what it touches, what revisions (if any) are needed to the parent framework.

---

### Step 7: Derivation

**Purpose**: If the treatment suggests the phenomenon is derivative of something else, attempt the formal derivation. Success shows the relationship. Failure is itself informative.

**Stopping metric**: **Formal result.** Either the derivation succeeds (and can be stated formally) or it fails (and the failure is characterized — what blocked it, what it implies).

**Godelian constraint**: The derivation may be undecidable within the current formal framework. The phenomenon may be related to its proposed source in ways the formalism cannot express.

**Deliverable**: `DERIVATION_RESULT.md` — success with formal statement, or characterized failure with implications.

---

### Step 8: Provability

**Purpose**: Determine whether the account can be validated or falsified through engineering. What would it predict? What would count as evidence for or against?

**Stopping metric**: **Testable prediction.** Provability is complete when at least one prediction has been stated that could, in principle, be validated or falsified through engineering. Or: when it has been established that no such prediction can currently be formulated (which is itself a finding).

**Godelian constraint**: Some philosophical accounts may not be reducible to engineering predictions. The provability step may conclude that the account is philosophically sound but not (currently) engineerable. This is an honest result, not a failure.

**Deliverable**: `PROVABILITY_ASSESSMENT.md` — testable predictions if available, or a characterization of why engineering validation is not (yet) possible, with conditions under which it might become possible.

**Handoff to SAD**: When provability produces testable predictions, those predictions become the seed for a SAD Phase 0A — the idea dump for the engineering artifact that would test them. P.I.M.P. Step 8 is where inquiry hands off to SAD for implementation.

---

## KEY PROPERTIES

1. **Field-independent.** Replace "personality" with "consciousness," "justice," "beauty," "causation" — the steps still hold. This is a methodology for investigating phenomena, not for investigating any particular phenomenon.

2. **Produces outputs at multiple stages.** Every step has a defined deliverable. The methodology is not a pipeline to a single output — it is a pipeline that produces outputs at every stage. Any deliverable can be developed into a standalone paper.

3. **Non-linear after the core track.** Branch A and Branch B are independent. Neither depends on the other. Both depend on the core track (Steps 0-3).

4. **Approach-pluralist.** The methodology does not prescribe a single tradition for either limit-case reasoning (Step 2b) or critical analysis (Steps 4-5). The choice of approach is part of the inquiry. Multiple approaches applied to the same subject yield conjunctive findings that no single approach would produce alone.

5. **Self-critical.** The methodology turns its own apparatus back on its own outputs (Step 5a). The dedicated treatment is subjected to the same critical analysis applied to all other treatments. This prevents methodological blind spots — while acknowledging that self-critique is itself Godelian.

6. **Godelian-aware.** Every stage acknowledges two types of stopping points: conclusive completion and acknowledged incompleteness. The methodology does not pretend that any stage achieves exhaustive coverage of its subject. Named limits are findings, not failures. **The Gödelian constraint applies not only at stopping points but at starting points.** When the key terms of an inquiry are deeply contested across traditions and languages — when an exhaustive inquiry into any single term (soul, consciousness, spirit) would itself be inexhaustible — the inquirer must assign operational definitions in order to proceed. These definitional choices are axiomatic in character: they are starting points chosen transparently, not conclusions derived from first principles. No set of definitions can exhaust what these terms mean across all traditions, languages, and use cases. The act of defining terms for the purposes of research is itself a Gödelian act — necessary, honest, and necessarily incomplete.

7. **Two-part structure.** Part 1 is constructive (from observation). Part 2 is analytic (from existing treatments). Part 1 asks "what shows itself?" Part 2 asks "what did they claim, and where does it fail?" The two parts have inverse logic: Part 1 adds through observation; Part 2 subtracts through analysis.

---

## RELATIONSHIP TO SAD

SAD governs how you build. P.I.M.P. governs how you inquire. The two are complementary:

- SAD Phase 0A (idea dump) is structurally identical to P.I.M.P. Step 0
- If unified as one skill, the idea dump is the handoff point
- If standalone, P.I.M.P.'s idea dump is independent
- P.I.M.P.'s provability step (Step 8) is where inquiry hands off to SAD for implementation
- SAD Phase 0B (research) overlaps with P.I.M.P. Branch A (comparative-critical track), but P.I.M.P.'s version is more structured: it requires approach selection, formal comparative analysis, and self-critique

---

## OPEN QUESTIONS

1. **Skill development**: When and how to develop this into an executable skill? Should each step have its own skill, or should there be one unified skill with step selection?

2. **Additional traditions**: Are there other approaches beyond the named ones (immanent critique, Destruktion, via negativa, conjunctive analysis; eidetic variation, thought experiment, counterfactual reasoning, reductio) that should be included as options?

3. **Recursion**: Can P.I.M.P. be applied to itself? Can we do a phenomenological inquiry into the methodology of phenomenological inquiry? The self-critique step (5a) already gestures toward this.

4. **Part 2 objectives formalization**: The objectives for Part 2 (what is claimed, where it breaks, what survived, Godelian constraints, observational gaps) need continued refinement to ensure they are fully generalizable across any subject.

---

*Methodology emerged during Session 10, from the personality ontology inquiry. The natural shape of the research process became visible when the question was asked: "What should our first documentation be?" The answer — the inquiry frame, the guiding light — became the seed of the entire methodology.*

*Cross-references: [[idea-001-philosophical-inquiry-methodology]], [[SAD_SKILL_v2]], [[METHODOLOGY_REFERENCE]]*
