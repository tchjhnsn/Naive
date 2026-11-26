<!-- Placement: tchjhnsn/Naive docs/design/DECLARED_RECORDS_LINKS_TRIGGERS_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Declared records, links and triggers: two layers, typed questions, blind reproduction, scoped agents and premise rate (revision 4)

Prepared Mon Nov 2, 2026, about 4:00 PM CT, for Torian. Design only. Nothing in the repo, any PR or any account was changed.

This revision supersedes revision 3. Earlier drafts are not included in this pull request. Revision 4 adds sections 7 and 8 for two Nov 2 decisions: only function agents are standing, and the data-rate clock. It replaces revision 3's channels with scopes, and revises the questions and the build order. Everything else is revision 3, renumbered.

Sources:
- `tchjhnsn/everything-ecosystem`, branch `framework` at `cb502f9`, and draft PR #164, read through the GitHub API.
- TypeSafe's public docs.
- The prior-art papers in section 9. Each DOI was resolved on Nov 2, 2026.

Your refinements, in one line each:
- Market research is not deterministic, but the question can be.
- Questions have a schema and come from a few parent question theorems.
- Meta-questions check that each question follows its theorem.
- Every question and result is observed, so gates or agents can fix mis-calibrated questions.
- A model that is never shown the question or the result rebuilds both from the parent theorems alone. That challenges the deterministic modules on reproducibility.
- The model can also propose that a child question become the parent of its own theorem, when its task needs a slightly different incentive or pipeline than the parent allows.

## 0. The answer in plain words

1. **A question is a typed object, and so is the rule that makes it.**
   - A question theorem is a template with typed slots, plus invariants its answers must obey, a result shape and a tolerance.
   - A child question is that theorem with its slots filled from one module's declared inputs. It is written with create/derive naming the theorem, and its `vocabulary_parent` is the theorem.
   - Rendering a child from its theorem is plain code, so the question is deterministic even when the answer is not.
2. **Meta-questions check conformance.** Code checks first: re-render the child from its theorem and bindings and compare, check the slot types, check the thresholds are within the theorem's bounds. A Jev meta-question runs second, only on free-text parts. The meta-theorem itself is checked by code only, so the checking stops there.
3. **Everything is observed.**
   - Every question run is a line in an append-only `question-run` log: question version, theorem version, input snapshot hash, model, answer, probability, invariants checked, cache hit.
   - Calibration is measured per question and per theorem against your confirmed outcomes: ECE, Brier score, agreement with a Wilson lower bound, invariant violations, reproduction agreement, and item discrimination as in psychometrics.
   - A gate may suspend a mis-calibrated question at once, because that only narrows. Fixing one is a change line with a tier.
4. **Blind reproduction is the main verification rung.**
   - A model in a separate sandbox gets only two things: the parent theorems for the question type, and the input snapshot.
   - It never sees the child question, its bindings, the result, the cache, the logs or the module code.
   - It rebuilds the question and answers it. Code compares the two: the same theorem with the same canonical bindings, and the result within the theorem's tolerance.
   - Disagreement goes to review and counts against the module's calibration.
   - It runs in order of impact (Smith's rule), on every one_way_door, on costly objects above a blast-radius line, and on a random sample of low ones so the metrics stay honest.
5. **Agreement is not truth.** Reproduction shows the module's question and answer follow from the theorem and the snapshot. It cannot catch a wrong theorem or a wrong snapshot. Only your outcomes and the invariants can.
6. **Theorems can fork.**
   - The fork signals are measured: disagreement, conformance failures or miscalibration that stay with one child, or invariant violations your outcomes contradict. When they show up, the model or the owning agent proposes a new theorem derived from the parent.
   - The child moves under it with amend/rename, which keeps the child's id.
   - The tier is costly, or one_way_door when the fork reaches many dependents or any one_way_door output. You accept.
   - A Rule C-style cost test blocks theorem sprawl, and forks merge back when they converge again.
7. **Only function agents are standing.**
   - Every other agent is temporary, spawned under a scope like `competitor-research@strategy`. The scope must already be a vocabulary object.
   - A scope declares foreground nouns, which are defined and enforced, and background nouns, which are drafted and ranked into the glossary loop.
   - Revision 3's channels are folded into scopes.
8. **Each scope has a data-rate clock.**
   - The clock counts raw incoming data, and separately the premise rate: deltas that cross a declared threshold and could flip a decision under your bets.
   - Only the premise rate feeds Rule C. It decides whether a scope runs temporary, scheduled or standing.
   - Promotion is costly and needs you. Demotion is automatic after two windows below break-even.


## 1. What TypeSafe is, and how it verifies (from revision 2)

- **What it is.** TypeSafe AI makes "System One Models". Its first public model is Jev. You send a state (text or JSON) and typed questions:
  - Choice: pick one option;
  - Score: an ordered scale;
  - Noul: the probability of yes.

  Jev returns typed decisions with probabilities and confidence instead of text. Sources: [home page](https://typesafe.ai), [System One concept](https://docs.typesafe.ai/concepts/system-one), [primitives](https://docs.typesafe.ai/primitives). TypeSafe says the training method is "Reinforcement Learning for Calibrated Decisions (RLCD)" ([home page](https://typesafe.ai)). Price: $42 per billion input tokens, output free ([home page](https://typesafe.ai)). It raised a $40M seed ([SiliconANGLE](https://siliconangle.com/2026/09/16/typesafe-ai-exits-stealth-with-40m-to-build-ai-for-use-by-software/)).
- **How it "verifies".** There is no formal verifier. Verification means three things:
  1. The output always has the declared type. The FAQ says this "guarantees the shape of its answers, not that every decision is correct" ([home page](https://typesafe.ai)).
  2. Each answer carries confidence, and your code sets thresholds to act, ask for review or escalate ([confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing.md), [confidence](https://docs.typesafe.ai/confidence.md)).
  3. Code stays in control. "Keep control flow, deterministic rules, and side effects in code" and "Avoid agent `while` loops when a software workflow can express the same behavior" ([how to build](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md)).

  Its published pattern for checking other models is a cascade: extract with a cheap model, check each field with a Noul question that returns the probability something is wrong, and escalate to a reasoning model only when a check fires ([SDE cascade](https://docs.typesafe.ai/cookbooks/sde_cascade.md)).
- **What holds up, from independent tests and earlier probes:**
  - It is fast (about 0.1 to 0.2 s per call) and cheap.
  - Its output is always well-formed: 27 of 27 in probes, and none malformed in [Vals AI](https://www.vals.ai/blogs/independent-evaluation-of-jev).
  - Calibration varies by task. ECE was 0.011 on claim checking and 0.108 on LegalBench ([Vals AI](https://www.vals.ai/blogs/independent-evaluation-of-jev)).
  - It is consistent but not deterministic. "Supported" ranged 0.83 to 0.87 over 8 identical calls (`docs/design/TYPESAFE_JEV_VS_LLM_2026-11-02.md`, section 3).
  - It is weak at arithmetic, at chance in [SILT-RP-009](https://sentientindexlabs.com/publications/silt-rp-009), and TypeSafe's own docs list its weak spots ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)).
- **What Naive should copy.**
  - Code owns control flow and anything checkable.
  - Jev answers narrow typed questions declared ahead of time.
  - Confidence gates the action.
  - A cascade escalates to bigger models only on a flag.
- **What not to copy.** Do not treat Jev as deterministic, and do not treat a well-typed answer as a true one.

## 2. Layer 1: the deterministic layer

### 2.1 The module, a folder

``
modules/strategy/competitor-pricing/
  module.json        manifest: data, checked by code
  index.ts           pure function: (inputs, judgments) -> outputs
  fixtures/          input -> expected output pairs, run in CI
  properties.ts      property checks on outputs (runtime invariants)
  theorems/          optional Lean proofs for the algorithm (required for one_way_door math)
``

The manifest (`module.json`):

``json
{
  "vocabulary_parent": "noun:module",
  "id": "strategy.competitor-pricing",
  "owner": "strategy",
  "determinism": "judged",
  "inputs": [
    { "noun": "noun:research-source", "kinds": ["pricing-page"], "shape": "noun:research-source", "fields": ["url", "snapshot_sha256", "accessed_at"] },
    { "noun": "noun:competitor", "fields": ["id", "name"] }
  ],
  "outputs": [
    { "verb": "create", "kind": "derive", "noun": "noun:price-tier" },
    { "verb": "create", "kind": "derive", "noun": "noun:claim" }
  ],
  "questions": [
    { "id": "is-pricing-page", "type": "noul", "state": ["source.text_excerpt"], "text": "Does this page list prices for the product's plans?", "yes": 0.8, "no": 0.2 },
    { "id": "unit", "type": "choice", "state": ["tier.price_text"], "options": ["per seat per month", "per month flat", "per year", "usage-based", "other"], "act_at": 0.85 }
  ],
  "model_steps": [
    { "id": "extract-tiers", "kind": "draft", "when": "questions.is-pricing-page.yes", "max_usd": 0.02, "class": "cheap" }
  ],
  "cache": { "life": "weeks", "vary_on": ["inputs", "as_of:week"] },
  "tier": "low"
}
``

This extends what exists:
- `packages/naive/src/router/orchestration/model-steps.ts` L1-32 already declares model steps in a package's `use_model`, with typed kinds (classify, noul, choice, score, draft), field-path state, batching, an `after` order, a `when` condition and speculation. The rule "When a judgment and a code check disagree, the code wins" is already there.
- `packages/naive/library/packages/<name>/package.json` declares `required`, `refs` and `use_model`, for example `packages/naive/library/packages/finance/package.json`. `packages/create-venture/package.json` does not.

So "the Jev question lives in the module's schema before execution" is EE-073's "use model", moved down from package to module. Each question is visible, testable and cacheable before anything runs.

**Determinism classes, stated honestly.** Each module declares one:

| Class | Meaning | Same input gives |
| --- | --- | --- |
| `pure` | code only | the same output, always |
| `judged` | code plus declared Jev questions | the same output from cache; a fresh run is consistent, not identical (probe spread 0.04) |
| `generative` | code plus a declared model draft | the same output from cache; a fresh run may differ, so it is always verified (section 5) |
| `observed` | reads the outside world (a web fetch) | the same output only for the same snapshot hash; a new fetch is a new input |

Replay gives you the same answer for the same input. That is reproducibility, not truth.

### 2.2 The graph

- **Edges are computed.** An output noun of module A feeds every module that declares that noun as an input. The compiler (`schema/check-graph.mjs` (as of 2026-11-02; since moved/removed), new) builds the graph from the manifests.
- **Cycles fail CI.** The existing runner already reports a cycle in step order as uncaught (`packages/naive/src/router/orchestration/model-steps.ts` header, "outcomes").
- **Order.** Modules run in topological layers, with each layer's independent modules in parallel. Within a module, Jev questions go in one batched request, as `packages/naive/src/router/orchestration/model-steps.ts` already does.
- **Per-venture configuration** decides which modules are on. That uses the venture's packages and need-now scores, the same switch the router already uses for partial adoption (`packages/naive/src/router/router.ts` L37).
- **Fan-out is bounded:**
  - by budget per run and per module (`max_usd`);
  - by AI Gateway budgets (proposed on Nov 2; not in the repo as of 08a5466. There is no EE-106 record. EE-113 says EE-101 to EE-107 and EE-110 are taken by open pull requests);
  - by the tier rules, because a module whose outputs would be one_way_door stops at a draft for you.

### 2.3 Venture in a box

- **The seed.** One typed input, `noun:venture-seed`, whose shape lists the required kinds:
  - the founder;
  - the idea statement;
  - the target market (`market`);
  - the job (`job`);
  - the technology (`technology`);
  - the ambition (`ambition`);
  - the legal form or none (`legal form`);
  - funding (`funding`);
  - known competitors (optional).

  `market`, `job`, `technology`, `ambition`, `legal form` and `funding` are nouns in `packages/naive/src/terms/ontology.json`. The founder is a term in `packages/naive/src/terms/admitted.json`, not a noun. The idea statement is not a noun. The seed and the optional competitors were proposed on Nov 2 and are not in the repo as of 08a5466.
- **Completeness first.**
  - The seed is checked against its shape before anything runs. An incomplete seed fails closed with `missing_kind` listing what is absent. No partial fan-out.
  - That is the "one complete input with the correct type of information and its kinds".
- **Spawn on command.**
  - `naive spawn <seed.json>` (as of 2026-11-02; since moved/removed) runs the graph for the discovery phase.
  - Everything it writes goes through the one write path, so records whose decision class escalates, such as telos, ownership and publication policy (EE-030), become drafts for you.
  - The box proposes a whole venture. You still accept the parts that are yours to decide.

### 2.4 Content-addressed cache and the object library

**The cache key** for a module output is:

``
key = sha256(canonical JSON of {
  module id, module content hash (manifest + index.ts + properties.ts),
  vocabulary version (schema/vocabulary.json (as of 2026-11-02; since moved/removed) + packages/naive/src/terms/ontology.json hash),
  declared input fields only, canonicalized,
  pinned model ids and versions for each declared step (jev-1.14.0, not jev-latest),
  source snapshot hashes for observed inputs,
  as_of window when the manifest varies on time
})
``

`packages/naive/src/engine/caching.ts` already does most of this:
- the judgment level is keyed by "the exact state it was given, the question, the model and the package versions";
- the record level is keyed by "the venture's files, the framework's code, the arguments and anything the declaration says it varies on";
- `keyOf` hashes canonical JSON with sorted keys (L47-49);
- every entry must have a life (L112).

The change is to key by module hash and vocabulary version, and to store the outputs centrally as objects, not only in `<venture>/.naive/cache/`. Bazel's remote cache works the same way: outputs keyed by a hash of the action and its inputs, shared by every machine that computes the same key ([Bazel remote caching](https://bazel.build/remote/caching)).

**Library objects (the React and npm analogy).** An object in the central store has:
- its key;
- its noun (`vocabulary_parent`) and shape;
- its value;
- its provenance closure (every `derived_from` back to sources);
- its labels;
- its verification level (section 5);
- `fresh_until`;
- a signature by the platform.

Users fetch by key or by noun and inputs, like importing a component. A module whose inputs hash to an existing key gets the object with no compute.

**Freshness.** Market facts expire.
- `research-cell` already has `fresh_until` (`platform/research/schemas/research-cell.schema.json` (as of 2026-11-02; since moved/removed)), and cache lives follow Next.js `cacheLife` profiles (`packages/naive/src/engine/caching.ts` L12, L97).
- An object is served while fresh. Once past `fresh_until`, it is served marked stale while one revalidation runs. It is never served past `expire`.
- A source change, such as a webhook or a new snapshot hash, invalidates that object and everything downstream through the computed reverse index (revision 1, section 4).
- Example: Macro moved from BSL to AGPLv3 on May 31, 2026. A license object cached before then must die on the new snapshot.

### 2.5 Sharing across tenants: scopes and labels

| Scope | Who can fetch | What may enter |
| --- | --- | --- |
| `tenant` (default) | that organization only | anything it derived |
| `org-shared` | organizations it names | objects whose closure carries no label above `internal` for the sharer |
| `public library` | every tenant | only objects whose entire provenance closure is public sources and public modules, with no tenant input fields and no label above `public`, verified to the level its tier requires |

Rules:
- **Labels flow down.** Security as label nouns inherited through provenance was proposed on Nov 2 (called EE-107 decision 6). That decision is not in the repo as of 08a5466. EE-113 says the metamodel follows the EE-107 vocabulary objects and change line from preserved PRs 164 and 163. Any confidential or internal ancestor would block promotion. The four visibility levels already exist: public, variant, internal, confidential (`packages/naive/src/engine/visibility.ts` L3-7).
- **Research records stay confidential.** Proposed on Nov 2: `research-cell`, `research-source`, `research-claim` and `research-citation` would be marked confidential. Those ids are not in `packages/naive/src/records/data-model.json` as of 08a5466, and that file does not use the word confidential.
  - A tenant's research run never becomes a library object.
  - The library gets its own object: a platform-owned run of the same public module over the same public sources. It does not depend on the tenant's question, cell or notes.
  - So yes: shared library objects are only public-source derived.
- **Text is not redistributed.** Sources store a hash and a locator, "never the full text" (`platform/research/schemas/source.schema.json` (as of 2026-11-02; since moved/removed)). A 300-character cap on citation quotes was proposed on Nov 2 (`citation.schema.json` (as of 2026-11-02; since moved/removed)). No such schema is in the repo as of 08a5466. Library objects carry claims and citations, not page copies.
- **Promotion is a platform decision.**
  - A tenant consents to having its module runs reused as triggers for public recomputation. It never consents to having its data reused.
  - Promotion requires the public object to pass verification at its tier, and two independent derivations from different sources to agree.
  - Revocation works through the reverse index.

## 3. Questions as typed objects

### 3.1 The theorem object

The word "theorem" is yours. The nearest standard term is the **item model** of automatic item generation: a template with variable slots, from which many test items are generated ([Gierl, Lai and Turner 2012](https://doi.org/10.1111/j.1365-2923.2012.04289.x)). The invariants are **metamorphic relations**: properties that must hold between the answers to related inputs, even when no single answer can be checked ([Chen et al. 2018](https://doi.org/10.1145/3143561)). Proposed noun `noun:question-theorem` (standard: item model; ours as a name).

``json
{
  "vocabulary_parent": "noun:question-theorem",
  "id": "theorem:value-stated-in-source",
  "version": 1,
  "family": { "verb": "create", "kind": "derive", "noun": "noun:claim" },
  "primitive": "noul",
  "template": "Does the source state that {subject} has {attribute} equal to {value}?",
  "slots": {
    "subject":   { "noun": "noun:competitor", "path": "name" },
    "attribute": { "enum_from": "theorem-attributes/value-stated-in-source.json" },
    "value":     { "type": "string", "max_length": 120 }
  },
  "state": { "noun": "noun:research-source", "fields": ["text_excerpt"], "max_tokens": 1500 },
  "result_shape": { "type": "number", "minimum": 0, "maximum": 1 },
  "thresholds": { "yes": { "min": 0.7, "max": 0.95 }, "no": { "min": 0.05, "max": 0.3 } },
  "tolerance": { "probability": 0.1 },
  "invariants": [
    { "id": "negation", "rule": "P(q) + P(not q) is within 0.15 of 1" },
    { "id": "irrelevant-state", "rule": "adding an unrelated paragraph to the state moves P by less than 0.05" },
    { "id": "literal-match", "rule": "when value appears verbatim next to attribute in the state, P >= 0.8" },
    { "id": "slot-order", "rule": "reordering the template's clauses moves P by less than 0.05" }
  ],
  "loss": { "false_yes": 1, "false_no": 1 }
}
``

The invariants are chosen from known Jev weak spots:
- The negation pair summed to about 1.10 in earlier probes (`docs/design/TYPESAFE_JEV_VS_LLM_2026-11-02.md`, section 3).
- TypeSafe itself lists irrelevant state and option order as weaknesses ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md)).

**A small root set.** Start with about six framework theorems, one per answer family:
- a value stated in a source (Noul);
- classify into a closed list (Choice);
- place on an ordered scale (Score);
- compare two values (Choice);
- the same entity (Noul);
- a date or period relation (Choice).

Arithmetic is not a theorem. Code computes it, because Jev was at chance on arithmetic ([SILT-RP-009](https://sentientindexlabs.com/publications/silt-rp-009)).

**Theorem and question type.**
- A question type (verb, noun, asking function) routes a question, as in `packages/naive/src/terms/operating-rules.json` L71-74.
- A theorem generates the question.
- One question type may allow several theorems, listed in its scope. The reproducer must pick among them, which is part of the test.

### 3.2 The child question

``json
{
  "vocabulary_parent": "theorem:value-stated-in-source",
  "id": "q:strategy.competitor-pricing.tier-price",
  "version": 2,
  "theorem_version": 1,
  "question_type": { "verb": "create", "kind": "derive", "noun": "noun:price-tier", "asking_function": "strategy" },
  "module": "strategy.competitor-pricing",
  "bindings": { "subject": "inputs.competitor.name", "attribute": "price per seat per month", "value": "inputs.candidate.price_text" },
  "thresholds": { "yes": 0.85, "no": 0.2 }
}
``

- It is created with create/derive, `source: theorem:value-stated-in-source@1`, which follows the `derive names its source` rule in `schema/vocabulary.json` (as of 2026-11-02; since moved/removed) (PR #164).
- Its bindings point at the module's declared inputs only.
- The module manifest's `questions` (revision 2, section 2.1) become references to question ids, not inline text. The rendered text is computed, never stored as the truth.

### 3.3 Meta-questions: conformance

| Order | Check | How |
| --- | --- | --- |
| 1 | Re-render: template plus bindings over this input gives exactly the text that was asked | code (`schema/check-questions.mjs` (as of 2026-11-02; since moved/removed), new) |
| 2 | Slot types: every binding resolves to a declared input field of the slot's noun and shape | code, against `schema/vocabulary.json` (as of 2026-11-02; since moved/removed) shapes |
| 3 | Bounds: thresholds and state size are inside the theorem's bounds; the question type is in the theorem's family | code |
| 4 | Invariants: sampled metamorphic checks (negation, irrelevant state, order) on live runs | code that runs the extra Jev calls and compares |
| 5 | Semantic fit, only where a slot takes free text: "Does this question ask what the theorem defines?" | Jev Noul from `theorem:conforms-to` |

`theorem:conforms-to` is the meta-theorem. Its own children are checked by checks 1 to 3 only, in code. That stops a regress of questions about questions.

## 4. Observing questions and fixing mis-calibrated ones

### 4.1 The question-run log

A new record type, `question-run`, is JSON lines, append-only and hash-chained like `provenance.jsonl` (`packages/naive/src/records/provenance-entry.schema.json`). Each line holds:
- question id@version and theorem id@version;
- the module and run key;
- the input snapshot hash and state hash;
- the model id and version (pinned, for example `jev-1.14.0`);
- the answer, probability and confidence;
- the invariants checked and their results;
- cache hit or miss, and latency;
- later, the outcome: your confirmed answer, linked as evidence.

The judgment record already holds "what it read, its answer and confidence, and whether code accepted, overruled or routed it" (`packages/naive/src/records/data-model.json` L1719). The run log is the high-volume stream under it.

### 4.2 Calibration metrics, per question and per theorem

| Metric | What it says | Source |
| --- | --- | --- |
| ECE | whether stated probabilities match observed frequencies | [Guo et al. 2017](https://arxiv.org/abs/1706.04599) |
| Brier score | overall probability error | standard |
| Agreement with your outcomes, Wilson lower bound | known quality, not hoped-for quality | `packages/naive/src/terms/operating-rules.json` standing rules use `wilson_lower` |
| Invariant violation rate | metamorphic failures | section 3.1 |
| Reproduction agreement | section 5 | blind runs |
| Item discrimination and difficulty (IRT) | whether a question separates true from false cases, and which inputs it is hard on; misfit items and differential functioning across markets show up here | [IRT overview](https://en.wikipedia.org/wiki/Item_response_theory); applied to model evaluation in [Polo et al. 2024](https://arxiv.org/abs/2402.14992) |

Calibration ground truth is your confirmed outcomes, not model consensus, because LLM consensus as the oracle is a known flaw ([Counterproof field note](https://research.counterproof.io/note/field-note-1-typesafe-jev-consensus-as-oracle.html)). Jev stays record-only until thresholds are decided (`packages/naive/src/terms/operating-rules.json` L63-68).

### 4.3 Who may change a question, at what tier

Changing a question is a change line like any other write.

| Change | Who proposes | Verb / kind | Tier | Who accepts |
| --- | --- | --- | --- | --- |
| Suspend a question breaching a bound (its outputs go to people) | the gate, automatically | amend/revise on the question's status | low, because it only narrows | lands; you are notified. This mirrors a standing rule pausing (`packages/naive/src/terms/operating-rules.json` standing `pause_when`) |
| Move thresholds inside the theorem's bounds | the owning function's agent, with the calibration evidence attached | amend/revise, a new version | the highest tier among the outputs the question gates | the gate for low; a veto window for costly; you for one_way_door |
| Change bindings or a free-text slot | the owning agent | amend/revise, a new version; conformance must pass | as above, at least costly | same |
| Retire a question | the owning agent | amend/deprecate (never delete; history is append-only) | low | lands |
| Change a theorem's template, invariants or bounds | the Lead's capabilities function, or a fork (section 6) | amend/revise on the vocabulary object | costly at least; one_way_door when it reaches one_way_door outputs or loosens an invariant protecting them | a reviewed framework PR (proposed on Nov 2 as EE-107 decision 7; not a logged decision as of 08a5466) |

Every run pins question and theorem versions, so a change never rewrites the past. The cache key gains both versions (section 2.4).

## 5. Layer 2: verification, with blind reproduction

### 5.1 What it verifies, in what order

Every new or changed object gets a verification job with:
- **impact I** = a tier weight (low 1, costly 10, one_way_door 100, as placeholders) times blast radius. Blast radius is the dependents in the computed reverse index plus, for library objects, the tenants fetching it;
- **p**, the estimated chance the object is wrong. It starts from the determinism class and the Jev confidence, then is calibrated per module against verified outcomes;
- **t**, the expected time of the next rung.

The scheduler runs jobs in order of **I × p / t**, the highest first, inside each latency budget. Smith's rule says ordering by weight over processing time minimizes total weighted completion time on one machine ([Smith 1956, Naval Research Logistics Quarterly 3:59-66](https://doi.org/10.1002/nav.3800030106)). With parallel workers, it is a good heuristic rather than optimal.

Budgets by tier, as proposed defaults:
- low: verified in the background, within a day;
- costly: within minutes, before any dependent costly write lands;
- one_way_door: before use, with no deadline that lets it skip.

### 5.2 The ladder, revised

| Rung | What runs | Runs when |
| --- | --- | --- |
| 0 | Code: schema, vocabulary shape (PR #164), conformance checks 1 to 3, property checks (totals, units, dates), citation quotes present in the snapshot | always |
| 1 | Jev: sampled invariants (check 4) and field verifier Nouls ([SDE cascade](https://docs.typesafe.ai/cookbooks/sde_cascade.md)) | always for judged and generative outputs |
| 2 | **Blind reproduction**, one model: Haiku 5.5, with GPT-6 Luna as fallback, through AI Gateway with zero data retention | by the sampling rule in 5.3 |
| 3 | Blind reproduction by a stronger reasoning model from a different provider than rung 2 (model to decide) | rung 2 disagrees, or the tier is costly with blast radius above the line |
| 4 | Two independent strong models from different providers, Lean for any algorithm or arithmetic, and you | every one_way_door object |

A tier sets the minimum before use: low needs rung 1, costly needs rung 2, one_way_door needs rung 4. The Lean floor stays as written in `packages/naive/src/terms/operating-rules.json` L140-146.

### 5.3 Blind reproduction

**What the reproducer gets:**
- the question type (verb, noun, asking function);
- the theorems that question type allows, in full, by value;
- the input snapshot: the module's declared input fields only, by value, with ids replaced by random per-run tokens.

**What it never gets:**
- the child question or its bindings;
- the result, or any other run's result;
- the cache, the object store, the question-run log or provenance;
- the module's code or name;
- network access.

**What it returns:**
- the theorem it chose;
- the bindings it would fill;
- its own answer to that question, in the theorem's result shape.

**What code compares, outside the sandbox:**

| Comparison | Pass when | If it fails |
| --- | --- | --- |
| Theorem choice | same theorem id and version | a theorem-selection disagreement: is this child under the wrong parent? |
| Question | canonical bindings equal: normalized strings, units converted, entity ids mapped back | a binding disagreement: wording or slot sensitivity |
| Result | inside the theorem's tolerance (for example 0.1 in probability; exact for Choice) | a result disagreement |
| Cross-check | the module's pipeline, run again on the reproducer's question, gives the same result within tolerance | the result depends on wording: a metamorphic failure |

Every disagreement:
- writes a `reproduction` evidence record (`packages/naive/src/records/data-model.json` L1046, evidence);
- counts against the question's and the module's calibration;
- routes to the next rung, or to the owner and you when it is already at the top.

**Keeping it blind:**
- One Vercel Sandbox per reproduction, with no shared memory. One sandbox per run, scoped reads and no shared agent memory was proposed on Nov 2 under the name EE-106. There is no EE-106 record as of 08a5466.
- An MCP scope with exactly two read tools: `theorems.read(type)` and `snapshot.read(token)`. No write tools, and no route to the router, cache or store.
- Inputs passed by value with random tokens, so nothing in the prompt can be looked up or matched to a cache key.
- A different provider from any model used upstream for that object, so the reproducer does not share the upstream model's mistakes on the same text.
- Canary items: known-answer snapshots, and snapshots whose true question is withheld even from the module. These are mixed in to catch leakage or memorized answers.
- The comparator, not the model, decides agreement.

**Cost, by Smith's rule.** Reproduction jobs join the same queue as other verification (5.1), ordered by impact times chance of error over time. Proposed sampling:
- every one_way_door object;
- every costly object above the blast-radius line;
- every object a lower rung flagged;
- a random sample of the rest, at 2% to start.

The random sample matters. Reproducing only flagged objects would bias the calibration numbers toward failures.

**What reproduction shows, and what it does not:**
- It shows that, given only the theorems and the snapshot, an independent solver reaches the same question and the same answer. So the module's question is the canonical one, and its answer is not an artifact of hidden wording.
- It does not show the answer is true. Both can be wrong in the same way from a stale or false snapshot, or from a wrong theorem.
- Independent versions fail together more often than chance. Knight and Leveson found this in N-version programming ([Knight and Leveson 1986](https://doi.org/10.1109/TSE.1986.6312924)). That is why rung 4 uses two providers and you, and why calibration is against your outcomes.

### 5.4 "Proof", honestly

A question theorem (section 3) is a generating rule for questions. A proof is a Lean or test result about an algorithm. The two are different things.

- **Provable:** properties of the algorithms. Examples:
  - the tier is the max of four scores;
  - Rule C has a single threshold;
  - the cache key covers every declared input;
  - Smith's ordering under one worker;
  - a module's output satisfies its properties for all inputs of its shape.

  Lean for one_way_door math, tests for the rest.
- **Not provable:** that Macro's Pro plan is $40 a seat. Such a claim is corroborated:
  - a primary source (the pricing page), snapshotted and archived;
  - a second independent source where one exists;
  - computed credibility (`platform/research/credibility.mjs` (as of 2026-11-02; since moved/removed));
  - an evidence grade (`evidence grade`, `packages/naive/src/terms/ontology.json` L886).

  The verification layer upgrades a claim's grade. It never marks it "proven".

### 5.5 Outcomes

- **Verified:** the level goes up, and the object becomes eligible for its tier's writes, and for promotion if public.
- **Contradicted:** a new version is written with amend/revise, never an edit in place. Dependents are marked stale through the reverse index, and the module's p and its Jev thresholds are recalibrated (record-only mode, `packages/naive/src/terms/operating-rules.json` L63-68).
- **Uncertain:** it goes to the owner function and to you, as `judge` already routes below-threshold scores (`packages/naive/src/router/router.ts` L342).
- **Ground truth for calibration** is your confirmed outcomes, not model consensus. Using LLM consensus as the oracle is the weakness found in TypeSafe's own workflow evals ([Counterproof field note](https://research.counterproof.io/note/field-note-1-typesafe-jev-consensus-as-oracle.html)).

## 6. Theorem forking: when a child needs its own parent

Your point: a child may need to become the parent of its own theorem when its task needs even a slightly different incentive or pipeline than the parent allows or gets wrong.

### 6.1 Signals, computed in code from the question-run log

Each signal compares one child against its siblings under the same theorem. A signal fires only when the child's Wilson lower bound clears the siblings' upper bound, so one bad week does not trigger a fork.

| Signal | What it looks like | What it suggests |
| --- | --- | --- |
| S1 Localized reproduction disagreement | the reproducer keeps choosing a different theorem or bindings for this child's inputs, while siblings reproduce | the parent's template does not express this task |
| S2 Recurring conformance pressure | the owner keeps proposing amendments that fail the theorem's bounds, or the child needs thresholds at the edge of the allowed range | the parent's bounds forbid what the task needs |
| S3 Localized miscalibration | the child's ECE or IRT fit is poor while siblings are fine; differential functioning on one input group | the parent's state or answer shape misreads this task |
| S4 Invariant contradicted by outcomes | the child's answers violate a theorem invariant, but your confirmed outcomes side with the child | the invariant is wrong for this task |
| S5 Incentive mismatch | the child's real loss is lopsided (a false yes costs ten times a false no), but the theorem fixes symmetric loss | the parent's incentive is wrong for this task |

### 6.2 Who proposes, and the change lines

- **Proposer:** the blind reproducer, a "theorem critic" scope (`theorem-critic@capabilities`) that reads the metrics, or the owning function's agent. Each writes a `theorem-fork` proposal with the signals, the run ids and a draft of the new theorem. It only proposes.
- **Change lines, one kind per line, split as `design.diff` requires (`packages/naive/src/terms/operating-rules.json` L41-61):**
  1. create/derive `noun:question-theorem`, `source: <parent>@<version>`. The new theorem records `forked_from` and lists exactly what differs: template, a bound, an invariant, or the loss.
  2. amend/rename on the child: its `vocabulary_parent` moves to the new theorem. The operating rules count "a move that keeps the id" as rename (`move_keeps_id: "rename"`, `packages/naive/src/terms/operating-rules.json` L44). So the child's id, links and dependents stay put.
  3. When the fork loosens an invariant, a separate amend/revise line names that invariant, so the loosening is visible in review.
- **Tier:** costly by default, because it changes how decisions are generated. It is one_way_door when any of these hold:
  - the child's dependents in the reverse index exceed a set line;
  - any dependent output is one_way_door;
  - the fork loosens an invariant that protects a one_way_door output.

  Loosening is treated like the existing `security-loosening` decision class in `packages/naive/src/records/data-model.json`.

### 6.3 Who accepts, and the evidence they see

Before you see it, code checks:
- the new theorem is well formed;
- its invariants do not contradict each other;
- the child passes conformance under it;
- a **backtest** replays the new theorem on stored snapshots of the child's past runs that have your confirmed outcomes, and shows better calibration than the parent.

The Lead's capabilities function checks the vocabulary. Then:
- costly: a veto window for you;
- one_way_door: an interrupt.

Scope:
- A fork starts **venture-local**, as an overlay on that venture's vocabulary.
- It becomes a framework theorem only through a reviewed framework PR, once the same fork recurs across ventures (proposed on Nov 2 as EE-107 decision 7; not a logged decision as of 08a5466).

### 6.4 Migration

- **Ids and links:** unchanged, because rename keeps the id.
- **Cache:** the theorem version is in the cache key, so the child's cached outputs no longer match. Their dependents are marked stale through the reverse index and recomputed in Smith's-rule order, not all at once.
- **Calibration history:** kept on the child, split by theorem version. The backtest is evidence for the fork. Standing rules built on the child restart from zero, as the operating rules already require after suspension (`packages/naive/src/terms/operating-rules.json` suspension `restart: from_zero`).
- **Siblings:** untouched.

### 6.5 Guarding against theorem sprawl

Forking shrinks each theorem's sample, which widens its Wilson bounds. So a fork has a statistical cost as well as a review cost. Use a Rule C-style test (`docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md` L245-247):

    fork only if   f * H * dL  >=  K_fork + m * H + d

- f is runs per week of the child;
- H is the horizon;
- dL is the backtested drop in expected loss per run;
- K_fork is review plus re-verification;
- m is upkeep per week (sampled reproductions, calibration);
- d is the cost of thinner statistics and more vocabulary.

Also:
- **Depth limit** on the theorem tree, proposed 3 below a root.
- **Merge back.** When a fork and its parent converge again, propose delete/merge naming the parent as the successor, and amend/rename the children back. Convergence means the parent reproduces the fork's children as well as the fork does, and an SPRT cannot tell their calibration apart (the same test `packages/naive/src/terms/operating-rules.json` uses to lose a standing rule).
- **Generalize.** When two siblings fork the same way, propose one new theorem above both, rather than two forks.

## 7. Agents: standing function agents and scoped temporary agents (new in revision 4)

Your Nov 2 lean: only the top-level function agents are standing agents. Everything else is a temporary agent, spawned under a scope that already exists as a vocabulary object.

### 7.1 Who is standing

- **Standing agents are the function agents:** Lead, Strategy, Product, Growth and Finance. Strategy, Product, Growth and Finance map to function ids in `packages/naive/src/functions/departments.json`: `strategy`, `products`, `marketing-and-sales` and `finance`. Those four are the nouns at level `function` in `packages/naive/src/terms/ontology.json`. `capabilities` is a department id, not a function-level noun. The Lead is not one of those nouns.
- **Everything else is temporary.** It lives for one run, writes only through the router, and ends.

  Revision 3 had a separate concept called a "channel". It is gone: a scope does its job. That also clears a collision, because `channel` is already a governance noun meaning a place the venture publishes to (`packages/naive/src/terms/ontology.json` L811).

### 7.2 The scope object

- **A scope is a noun in the scoped sense.** It is written `name@function`, for example `competitor-research@strategy`.
  - `packages/naive/src/terms/ontology.md` L18 already fixes the rule: the suffix is a function id, the noun's function is that same id, and no bare name is added beside a scoped sense.
  - PR #164's id pattern already allows `@` in noun ids (`schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L132).
- **The scope must exist before an agent can be spawned under it.** It must be in `packages/naive/src/terms/ontology.json`, with a declared shape in `schema/vocabulary.json` (as of 2026-11-02; since moved/removed). No scope means no spawn. The request fails closed with `missing_kind: scope` and becomes a glossary intake item (`docs/design/GLOSSARY_LOOP_HARNESS_2026-11-02.md`, section 3).
- **Proposed shape for `noun:competitor-research@strategy`:**

``json
{
  "vocabulary_parent": "noun:scope",
  "id": "competitor-research@strategy",
  "function": "strategy",
  "purpose": "Keep one competitor's offering, pricing, license and barriers current and say what they mean for Naive",
  "question_types": ["q-type:competitor-fact"],
  "foreground": ["noun:competitor", "noun:price-tier", "noun:software-license", "noun:research-claim", "noun:research-citation", "noun:competitive-implication"],
  "background": [{ "term": "barrier to imitation", "rank": 1 }, { "term": "trademark", "rank": 2 }],
  "golden_reads": ["noun:account", "noun:offering", "noun:business-model", "noun:bet"],
  "tier_ceiling": "costly",
  "budget": { "max_usd_per_run": 2, "max_runs_per_week": 7 },
  "mode": "scheduled",
  "clock": "scope-clock:competitor-research@strategy"
}
``

- **Foreground nouns are defined and enforced.**
  - Each must be a live noun with a declared shape.
  - The temporary agent may write only records whose `vocabulary_parent` is a foreground noun.
  - The gate checks this in code (`packages/naive/src/engine/gate.ts`), and a write outside the list is refused.
- **Background nouns are drafted and ranked.**
  - These are words the scope needs but the vocabulary does not have yet.
  - The agent may draft a definition for one, as a proposal into the glossary loop. It may never write records under it.
  - The rank is the scope's own order of need. The glossary loop folds it into its global ranking.
  - A background noun that the loop accepts can then be moved to foreground. That is an amend/append on the scope, and widening is costly.

### 7.3 Spawn rules

Each standing agent has one spawn policy, kept as data next to its function. It says which scopes it may spawn and when:
- **When:** a handler matches a change line, a schedule fires at the scope's premise resolution (section 8), or a person asks.
- **Depth:** a temporary agent never spawns agents. If a run needs another scope, it returns a typed handoff to its parent, and the parent decides.
- **Budget and tier:** the scope's `budget` and `tier_ceiling` are hard limits. Output above the ceiling becomes a draft for the function owner.
- **Pair lenses are scopes too.**
  - Revision 1 named the Strategy x Product pair `strategy@product`. The suffix `product` is not a function id, and `strategy` is already the function noun (`docs/design/COMPETITOR_RESEARCH_OWNER_AND_OBJECTS_2026-11-02.md`, section 7, item 2).
  - Name a pair as a task scoped to the function that owns it, with the other function as a declared consult: `product-drift-check@strategy` with `consults: ["products"]`.
- **Tiers for changing a scope** (these replace the revision 3 channel manifest tiers):
  - narrowing (fewer foreground nouns or reads, a lower budget) is low;
  - widening is costly;
  - a delete, a one_way_door foreground noun, a confidential read or a new outside tool is one_way_door.

## 8. The data-rate clock and premise rate (approved Nov 2)

### 8.1 Why raw rate is the wrong number

- How often data arrives is not how often it matters.
- **Example: a financial market.** A price feed ticks thousands of times a week. If Naive's bets only need a quarterly price, at most one tick per quarter can change a decision. A scheduled quarterly run is enough, and a standing agent would be waste.
- So the clock measures two rates. Only the second feeds Rule C's `f` (`docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md` L240-247).

### 8.2 Records and nouns

| Noun (proposed) | Record | What it holds |
| --- | --- | --- |
| `scope` | the scope object (section 7.2) | a `name@function` task area for temporary agents |
| `premise` | a list inside the scope | one condition a decision rests on: the decision or bet id, the input path, a threshold, and the resolution the decision needs |
| `bet` | `bet` record type (new) | a venture's stated wager that decisions rest on. It is already a gap in `docs/design/COMPETITOR_RESEARCH_OWNER_AND_OBJECTS_2026-11-02.md` section 7, item 5 |
| `data-rate clock` | `scope-clock` record, one per scope | the window, the raw count, the premise count, the lower and upper rate bounds, and the last tick |
| `premise event` | append-only lines in the clock's log | one delta that crossed a premise threshold, with the snapshot hash and the decision it could change |

A premise, declared on the scope:

``json
{ "id": "pricing-gap",
  "decision": "pricing-decision:pro-tier",
  "bet": "bet:undercut-on-seat-price",
  "input": "competitor.price_tiers[name=Pro].price_usd_month",
  "threshold": { "relative": 0.10 },
  "resolution": "quarter",
  "tripwire": false }
``

### 8.3 How premise rate is computed (code only, no model)

For each scope, over a rolling window W (proposed 12 weeks):
1. **Raw count.** Count every incoming item that touches the scope's golden reads or foreground nouns: new snapshots, record changes and matching webhook events. They are read from the provenance log and the trigger state (`packages/naive/src/router/orchestration/triggers.ts`).
2. **Delta against the value used, not the last value.** For each premise, compare the new input with the value the decision last used, which is in its provenance. Noise that comes and goes never adds up.
3. **Threshold.** Count a candidate only when the delta crosses the declared threshold, absolute or relative.
4. **Flip test.** Recompute the decision's deterministic rule, or its gate tier, with the new value. Count the event only if the outcome would change. Where the decision is judged and not computed, use the threshold crossing alone, until a VOI weight (step 6) is available.
5. **Resolution buckets.** Count at most one premise event per premise per resolution bucket (day, week, month or quarter). A quarterly premise can never fire more than four times a year, however fast the feed is.
6. **Value of information, later.** Weight each event by the expected value of information: the chance the decision flips times the loss difference. Use the loss declared on the decision's question theorem (section 3.1) and probabilities from calibrated Jev answers. Until calibration exists (question 56), the weight is 1.
7. **The rate.** `premise_rate = premise events / W`. The clock stores a conservative Poisson interval (Garwood): `f_lower` and `f_upper`.
8. **Tripwires.** A premise marked `tripwire: true` triggers a run at once, whatever the rate. A license change or a security advisory is like this: rare, and it guards a one_way_door output. Tripwires do not count toward promotion, because a rare event never justifies a warm agent.

### 8.4 Mode: temporary, scheduled or standing

A scope runs in one of three modes. Revision 3 had only two, durable or ephemeral.

| Mode | When | Cost shape |
| --- | --- | --- |
| temporary | runs only on a handler, a tripwire or a request | K per run |
| scheduled | premise events are bound to a resolution (quarterly pricing), so a run at that cadence catches every one | K per scheduled run, no upkeep |
| standing | Rule C holds with `f = f_lower`, and events are not predictable in time, so latency matters | K once, m per week, warm context |

- **Promote to standing** when `f_lower * H * sigma >= K + m*H + d` holds for two windows in a row, and the scope's declared maximum latency is shorter than its schedule would give.
- **Promotion is an amend/revise on the scope's `mode`.** It widens, so it is costly. The Lead's capabilities function checks it, and you accept it.
- **A promoted scope is the one exception** to "only function agents are standing." It still keeps its `name@function` id and its parent function.

### 8.5 Demotion when the rate falls

- **Demote** when `f_upper` is below the break-even rate `(K/H + m + d/H) / sigma` for two windows in a row. Then propose standing to scheduled, or scheduled to temporary.
  - This is stricter than the spawn research's retirement rule, which uses the lower bound (`docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md` L253).
  - Promoting on the lower bound and demoting on the upper bound leaves a band in between where nothing changes, so a scope does not flap.
- **Demotion only narrows,** so it is low tier and automatic, with a notice to you. That matches the automatic suspend gate (question 14).
- **What carries over:** the clock history and calibration are kept. Warm context is dropped, and cache entries stay valid because they are keyed by content (section 2.4).

### 8.6 Worked numbers

- **`competitor-research@strategy` for Macro:**
  - Raw rate: about 30 items a week (site and repo changes).
  - Premises: pricing ±10% at quarter resolution, plus a license tripwire.
  - Premise events in 12 weeks: one. That gives `f_upper` of about 0.46 a week (Garwood 95% for one event, 5.57/12).
  - Result: mode scheduled, quarterly, plus the tripwire. Not standing.
- **A hypothetical `market-price@finance`:**
  - Raw rate: about 10,000 ticks a week.
  - Premise: price ±5% at quarter resolution. At most one event a quarter, so `f_lower` is at most about 0.08 a week.
  - Result: scheduled, quarterly.


## 9. Prior art

| Idea | What it gives this design | Source |
| --- | --- | --- |
| Metamorphic testing | invariants between related inputs when single answers cannot be checked | [Chen et al. 2018, ACM Computing Surveys](https://doi.org/10.1145/3143561) |
| N-version programming | independent versions from one specification, compared | [Avizienis 1985, IEEE TSE](https://doi.org/10.1109/TSE.1985.231893) |
| Correlated failures in N versions | why agreement is weaker than it looks | [Knight and Leveson 1986, IEEE TSE](https://doi.org/10.1109/TSE.1986.6312924) |
| Property-based testing | properties checked over generated inputs (QuickCheck) | [Claessen and Hughes 2000, ICFP](https://doi.org/10.1145/351240.351266) |
| Blind analysis | hide the result from the analyst until the method is fixed | [MacCoun and Perlmutter 2015, Nature](https://doi.org/10.1038/526187a) |
| Replication | independent teams redo the study from the method alone | [Open Science Collaboration 2015, Science](https://doi.org/10.1126/science.aac4716) |
| Proof-carrying code | the producer ships a proof, and the consumer checks it cheaply | [Necula 1997, POPL](https://doi.org/10.1145/263699.263712) |
| Differential testing | run two implementations on the same input and compare | [Yang et al. 2011, Csmith, PLDI](https://doi.org/10.1145/1993498.1993532) |
| Automatic item generation | item models (templates) that generate many items | [Gierl, Lai and Turner 2012](https://doi.org/10.1111/j.1365-2923.2012.04289.x) |
| Item response theory | per-item difficulty and discrimination, misfit and differential item functioning | [IRT overview](https://en.wikipedia.org/wiki/Item_response_theory); [Polo et al. 2024](https://arxiv.org/abs/2402.14992) |
| Calibration (ECE) | whether stated confidence matches observed accuracy | [Guo et al. 2017](https://arxiv.org/abs/1706.04599) |
| Weighted scheduling | ordering by weight over time | [Smith 1956](https://doi.org/10.1002/nav.3800030106) |

Proof-carrying code is the closest fit for the module side. A module could ship its question id, theorem version, bindings and invariant results with each output, and the checker could re-render and recheck them cheaply, without trusting the module.


## 10. What carries over from revisions 1 and 2

These still hold, now applied to modules as well as scopes:
- **Scopes (were channels).**
  - A scope (section 7) is the entry point into the module graph for its question types. The parent function owns it.
  - It declares the golden reads and allowed writes, and fails closed with typed reasons to whoever routed the request.
  - Its tiers are in section 7.3.
- **Missing records.**
  - A missing instance was proposed on Nov 2 as a handoff to the noun's owner. EE-099 says a record generator drafts one valid record and hands it to the write chain. It does not say a missing instance becomes a handoff.
  - EE-100 opens a research item when an endpoint's record type has no schema, route or generator yet. A person admits the schema, the generator and the route.
  - A waiting run suspends on a server-side Workflow hook ([hooks](https://workflow-sdk.dev/docs/foundations/hooks)), never a public webhook token ([advisory](https://github.com/vercel/workflow/security/advisories/GHSA-9r75-g2cr-3h76)).
- **Records are data.**
  - No code in records. Code lives in module folders with `// vocabulary_parent:` (PR #164).
  - Links are ids in declared `refs` fields plus provenance, and dependents are a computed reverse index exported as JSON-LD.
- **Handlers** extend `packages/naive/src/records/trigger.schema.json` to match on the change line. They are pure, idempotent (keyed by handler, module hash and event hash), cycle-checked in CI, and bounded at runtime by:
  - the own-write skip (`packages/naive/src/router/orchestration/triggers.ts` L189);
  - 20 rounds (L147);
  - a new causal depth limit of 5.

  A handler's "invoke" spawns a temporary agent under a scope, and that agent runs the scope's modules.
- **Existing decisions reconciled:**
  - Agents only propose. Modules propose outputs, and the gate or you accept them.
  - One write path: every module output goes through the router.
  - Policies are data: manifests are checked by one policy engine, the gate (`packages/naive/src/engine/gate.ts`), which never calls a model (L9).
  - Postgres with an RDF and JSON-LD export was proposed on Nov 2 to hold the object store and the link index. There is no such export as of 08a5466.
  - Trigger order stays: manual and scheduled runs, then record changes, then webhooks.
  - Runtime is Vercel Workflow plus AI SDK: one durable step per module, with the cache key as the step's idempotency key.
  - History is append-only.
  - The tier is the max of four scores.
  - Standing rules are never for deletes or one-way doors.

## 11. Worked example (revision 3)

1. You add Macro to the competitor list. The handler invokes `strategy.competitor-research`, and the module graph runs as in revision 2.
2. `competitor-pricing` asks child `q:strategy.competitor-pricing.tier-price@2`, derived from `theorem:value-stated-in-source@1`, for "Pro" at "$40". Code re-renders the question and confirms it conforms. Jev answers 0.91. The run is logged with the snapshot hash.
3. **Sampling.** Price tiers are low tier, so this run is in the 2% random sample.
   - The blind reproducer (Haiku 5.5, in its own sandbox) gets the question type, the allowed theorems and the snapshot with random tokens.
   - It picks `value-stated-in-source`, binds attribute "price per seat per month" and value "$40", and answers 0.88.
   - Code compares: same theorem, same canonical bindings, results within 0.1. Pass. The run's verification level rises to rung 2.
4. **A localized problem.** Over a month, the same child disagrees on "Max" tiers. The page lists "$200 per seat, billed yearly", and the reproducer binds "per year" where the child binds "per month". Siblings under the theorem reproduce fine. Your confirmed outcomes side with the reproducer on 9 of 11. S1 and S3 fire for this child only.
5. **Fork proposal.** The critic proposes `theorem:price-stated-in-source`:
   - created by create/derive from `value-stated-in-source@1`;
   - a billing-period slot is required;
   - a new invariant: the stated period must match a period in the text.

   The child moves under it with amend/rename. The tier is costly, with 14 dependents and none one_way_door. The backtest improves agreement from 0.62 to 0.91 on 40 confirmed past runs. You get a veto window and let it pass.
6. **Migration.** The child's cached outputs no longer match their keys. Their dependents, the price-tier objects and the Growth handoff, are marked stale and recomputed in priority order.

## 12. Questions for you, one decision each, in order

| # | Question | Recommended answer |
| --- | --- | --- |
| 1 | Is the unit of work a module folder (manifest, pure function, fixtures, property checks)? | Yes |
| 2 | Do module manifests reference question ids instead of holding question text? | Yes |
| 3 | Does every module declare a determinism class? | Yes. Generative and observed outputs are always verified |
| 4 | Is the module graph computed from declared nouns? | Yes. Cycles fail CI |
| 5 | Is the venture in a box one complete typed `venture-seed`? | Yes. Incomplete fails closed with `missing_kind` |
| 6 | Is a question a first-class typed object with a schema? | Yes, `noun:question` |
| 7 | Is a question theorem a template with typed slots, invariants, a result shape, a tolerance and a loss? | Yes, `noun:question-theorem` (standard: item model) |
| 8 | Do child questions derive by create/derive naming theorem@version, with the theorem as `vocabulary_parent`? | Yes |
| 9 | How many root theorems to start? | About six, one per answer family, framework-owned. No arithmetic theorems; code computes those |
| 10 | How is conformance checked? | Code first (re-render, slot types, bounds), sampled invariants second, a Jev meta-question only on free-text slots. The meta-theorem is checked by code only |
| 11 | Is every question run logged in an append-only `question-run` log? | Yes, with question, theorem and model versions and the snapshot hash |
| 12 | Which calibration metrics count? | ECE, Brier, Wilson-bounded agreement with your outcomes, invariant violations, reproduction agreement and IRT fit. The truth source is your outcomes |
| 13 | Who may change a mis-calibrated question, at what tier? | The owning agent proposes a new version. The tier is the highest tier the question gates, and bindings changes are at least costly. Theorem changes go through a framework PR |
| 14 | May a gate suspend a question that breaches its bound? | Yes, automatically, as a low narrowing change. You are notified |
| 15 | Are only the top-level function agents standing (Lead, Strategy, Product, Growth, Finance)? | Yes. Every other agent is temporary |
| 16 | Must every temporary agent run under a scope `name@function` that exists in the ontology with a shape? | Yes. No scope, no spawn: fail closed with `missing_kind: scope` |
| 17 | Does a scope declare foreground nouns (enforced writes) and background nouns (drafted, ranked)? | Yes. The gate refuses writes outside the foreground nouns. Background nouns go to the glossary loop |
| 18 | What tier is changing a module or scope manifest? | Narrowing low. Widening costly. Delete, one_way_door noun, confidential read or new outside tool one_way_door |
| 19 | May a temporary agent spawn agents? | No. It returns a typed handoff to its parent function |
| 20 | How are pair lenses named? | As a task scoped to the owning function, with a declared consult: `product-drift-check@strategy`, `consults: [products]` |
| 21 | Does every scope have a data-rate clock? | Yes, a `scope-clock` record with raw and premise counts and rate bounds |
| 22 | How is premise rate computed? | Deltas against the value the decision used, crossing a declared threshold, passing the flip test, at most one per premise per resolution bucket. VOI weight once Jev is calibrated |
| 23 | Which rate feeds Rule C's f? | The premise rate, its lower bound for promotion and its upper bound for demotion, never the raw rate |
| 24 | Which modes may a scope run in? | Temporary, scheduled (at the premise resolution) or standing |
| 25 | What tiers do promotion and demotion carry? | Promotion is costly, checked by the Lead's capabilities function and accepted by you. Demotion is low and automatic after two windows below break-even |
| 26 | Is `bet` a noun with a record type? | Yes. Premises need a bet or decision id to point at |
| 27 | Who creates a missing declared record? | The noun's owner, through an automatic handoff |
| 28 | What does a waiting run do? | Fail closed with a typed reason, then suspend on a server-side Workflow hook |
| 29 | What if a record type is missing? | EE-100 research item, then a framework PR |
| 30 | Can records contain code? | No |
| 31 | Are dependents stored or computed? | Computed reverse index, exported as JSON-LD |
| 32 | How are handlers declared? | By extending the trigger record to match on the change line |
| 33 | When may a model be called? | Only for a declared step on a cache miss, or as a verifier or reproducer |
| 34 | What is the cache key? | Module hash, question and theorem versions, vocabulary version, declared inputs, pinned models, snapshots and the as_of window |
| 35 | What may enter the public library? | Only fully public-derived, verified objects that two independent derivations agree on |
| 36 | How is verification ordered? | Impact times chance of error over time (Smith's rule), within per-tier budgets |
| 37 | Is blind reproduction the main verification rung? | Yes: rung 2, after code and Jev |
| 38 | What does the reproducer see? | Only the question type, the theorems it allows and the declared input snapshot with random tokens |
| 39 | How is it kept blind? | Its own sandbox, an MCP scope of two read tools, no network, no store, cache or log access, a different provider from upstream, and canary items |
| 40 | What gets reproduced? | Every one_way_door, costly above the blast line, everything flagged, and a 2% random sample of the rest |
| 41 | How is agreement decided? | By code: same theorem, equal canonical bindings, result within tolerance, plus the cross-check on the reproducer's question |
| 42 | What happens on disagreement? | An evidence record, a count against calibration, and a route to the next rung or to you |
| 43 | Which stronger models fill rungs 3 and 4? | Decide after a small eval on your confirmed outcomes. Until then, that work holds at a draft for you |
| 44 | What do "proven" and "reproduced" mean? | Proven applies to algorithms and math (Lean for one_way_door). Reproduced means independent agreement, not truth. Market facts are corroborated to a grade |
| 45 | Which signals can trigger a theorem fork? | S1 to S5 (section 6.1), each localized to one child against its siblings with Wilson bounds |
| 46 | Who may propose a fork? | The reproducer, the `theorem-critic@capabilities` scope or the owning agent, with evidence. They only propose |
| 47 | What are a fork's change lines? | create/derive the new theorem naming the parent; amend/rename the child's parent; a separate amend/revise for any loosened invariant |
| 48 | What tier is a fork? | Costly. One_way_door when dependents exceed the line, any output is one_way_door, or it loosens an invariant protecting one |
| 49 | Where does a fork live first? | Venture-local. It is promoted to the framework by PR when it recurs across ventures |
| 50 | What evidence must a fork show? | A backtest on stored snapshots with your outcomes that beats the parent |
| 51 | How do dependents and history migrate? | Ids and links kept; caches invalidated and recomputed by priority; history split by theorem version; standing rules restart |
| 52 | How is sprawl limited? | The Rule C-style fork test, a depth limit of 3, and generalizing when siblings fork alike |
| 53 | When does a fork merge back? | When the parent reproduces its children as well and an SPRT cannot tell their calibration apart: delete/merge naming the parent |
| 54 | How are loops bounded? | CI cycle check, own-write skip, 20 rounds, causal depth 5 |
| 55 | Is `routing.rules` generated from scope declarations and spawn policies? | Yes |
| 56 | How is Jev calibrated? | Per question, against your outcomes, record-only until thresholds are decided |
| 57 | Do the new types get baseline exemptions? | No |

**What changed from revision 3:**
- Kept: 1 to 14.
- Replaced: the channel questions. Revision 3's 15 (channel) became 15 and 16 (standing agents, scope). Its 16 (manifest tier) became 18, now about scopes. Its 45 (routing.rules) became 55, now generated from scopes.
- New: 17, 19 and 20 (scopes) and 21 to 26 (the data-rate clock and bet).
- Renumbered: revision 3's 17 to 44 are now 27 to 54. Its 46 and 47 are now 56 and 57.

## 13. Build PRs after #164, one piece each

1. **A decision record for this design** (the Nov 2 build list called it EE-108): the two layers, questions and theorems, blind reproduction, forking, standing function agents with scoped temporary agents, the data-rate clock, and the answers above. The logged EE-108, dated 2026-11-03, is the repository top level. That assignment is not the logged decision as of 08a5466.
2. **Nouns,** through the glossary loop (`docs/design/GLOSSARY_LOOP_HARNESS_2026-11-02.md`):
   - module, handler, venture-seed, library-object, verification-level;
   - question, question-theorem, question-run, theorem-fork;
   - scope, premise, data-rate clock, premise event, bet;
   - the competitor-research nouns.

   `channel` is not added in the graph sense.
3. **Change line on every provenance write** (proposed on Nov 2 as EE-107 decision 5; not a logged decision as of 08a5466).
4. **Question and theorem schemas, `check-questions.mjs`** (conformance 1 to 3), and the first six root theorems.
5. **Module manifest schema and `check-modules.mjs`,** referencing question ids.
6. **`question-run` log and the calibration report:** ECE, Brier, Wilson, invariants, IRT once there is enough data.
7. **Scope schema and spawn policies.** Shapes for `noun:scope` and the first scope, `competitor-research@strategy`, plus one spawn policy per function agent. The gate enforces foreground nouns. `routing.rules` is generated from scopes.
8. **Data-rate clock:**
   - the `scope-clock` record;
   - premise declarations;
   - the premise-event log from provenance and trigger state;
   - the flip test;
   - Garwood bounds;
   - the mode decision;
   - automatic demotion.

   It ships record-only first, then gates mode changes.
9. **Graph compiler, local runner and seed check.**
10. **Cache v2,** with question and theorem versions in the key.
11. **Link index and JSON-LD export.**
12. **Handlers** and `check-handlers.mjs`. A handler's invoke spawns under a scope.
13. **Verification v1:** rungs 0 and 1, the Smith-rule queue, the automatic suspend gate.
14. **Blind reproduction (rung 2):** the sandbox, the two-tool MCP scope, the comparator, canaries and sampling.
15. **Workflow adapter:** a temporary agent is one workflow run, and a scheduled scope is a cron on its premise resolution.
16. **Verification v2:** rungs 3 and 4, after question 43.
17. **Theorem forks:** signals, proposals, backtest, migration, the sprawl test and merge-back.
18. **Central object store** with tenant scopes and the promotion gate.
19. **`naive spawn`** (as of 2026-11-02; since moved/removed) for the seed.
20. **First scope live:** `competitor-research@strategy`, scheduled quarterly plus the license tripwire, with section 5 of revision 2 and section 11 as its tests.

## 14. Risks, stated plainly

Carried from revision 2:
- market research is not deterministic, so replay is not truth;
- a stale cache serves wrong facts;
- cache poisoning;
- shared objects must not reveal which tenant asked;
- copyright: store hashes, locators and short quotes;
- fan-out cost;
- verifier bias;
- proof scope;
- the box still needs you.

New in revision 3:
1. **A wrong theorem passes reproduction.** The reproducer starts from the same theorem, so a bad template or a bad invariant gives agreeing, wrong answers. Only your outcomes and the invariants can catch a theorem error. Theorem changes therefore get the highest review.
2. **Blindness is hard to make complete.**
   - Famous public facts, such as a well-known company's price, may be in the model's training data. Agreement can then come from shared memory, not from the snapshot.
   - Ids, field names or prompt wording can leak hints.
   - Mitigations: random tokens, snapshot-only grounding, canaries whose answers are not public, and a different provider.
3. **Correlated failures.** Independent models still make the same mistakes on the same hard text (Knight and Leveson). Agreement rates will overstate correctness.
4. **Goodhart on reproducibility.** If modules are judged by whether a model can reproduce them, questions will drift toward what models agree on, not toward what is right. Calibration against your outcomes and the random audit sample counter this.
5. **Few confirmed outcomes.** Per-question calibration and IRT need many outcomes you confirmed, and those are scarce. Wilson bounds will stay wide at first, so suspensions and forks should rarely fire early. Forking makes each sample smaller still.
6. **Selection bias.** Reproducing only flagged runs would make every question look worse than it is. The 2% random sample must not be skipped to save cost.
7. **Forks used to escape checks.** A child that fails an invariant could be forked just to drop it. That is why loosening is its own line, priced like security loosening, and needs a backtest against your outcomes.
8. **Theorem sprawl.** Even with the cost test, venture-local forks can pile up. Merge-back and generalizing need to run on a schedule, not only on request.
9. **Cost of the top rungs.** Two strong models from different providers on every one_way_door object is the right floor, but needs its own budget line in AI Gateway.
10. **The question is deterministic, the answer is not.** Rendering is deterministic; Jev and the models are consistent at best. Every report should say which part is which.

New in revision 4:
11. **Premise thresholds set too loose.** A threshold set too wide makes the premise rate look low. The scope then stays scheduled while things change that matter.
    - Tripwires cover one_way_door inputs.
    - A threshold edit is a change line at the tier of the decision it guards.
12. **Unobserved data has a rate of zero.** The clock counts only what the scope's reads capture. A source it does not read looks quiet. Scope reviews should ask what is not being read.
13. **Scope sprawl.** Every temporary task needs a scope noun, so the vocabulary grows fast. The glossary loop's dedupe rule (a new `name@function` only when the meaning differs) and its usage checks are what keep this in check.
14. **The flip test needs a computable decision.** Many decisions are judged, not computed. Until VOI weights exist, judged premises count threshold crossings alone, which overstates the rate.

