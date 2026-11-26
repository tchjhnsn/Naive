<!-- Placement: tchjhnsn/Naive docs/design/GLOSSARY_LOOP_HARNESS_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

# Glossary loop and harness: clearing the term backlog into vocabulary objects, keeping them current and used

Prepared Mon Nov 2, 2026, about 4:45 PM CT, for Torian (revision 4, about 6:35 PM CT). Design and build spec only. Nothing in the repo, any PR or any account was changed. Revision 1 is an earlier draft of this note, not included in this pull request. Revision 2 adds sections 6 to 9 (standards intake, the provenance grade, the Kahneman case study, the promotion and invention rules) and updates acceptance, ratchets, backfill, the build spec, the decisions and the risks. Revision 2 is an earlier draft of this note, not included in this pull request. Revision 3 splits the one grade ladder into two fields, `grade` (how authoritative the source is) and a computed `origin` participle (adopted, adapted, narrowed, broadened, borrowed, operationally coined). It drops "scoped sense" and "invention" as grades and fixes a SKOS direction error. The evidence is in `docs/design/TERM_GRADE_NAMES_PREMISE_2026-11-02.md`. Revision 3 is an earlier draft of this note, not included in this pull request. Revision 4 records your Nov 2 decision: every term carries three labels, scope (the `name@function` subject field), origin and grade. "Scoped sense" and "invention" are dropped as labels, and the origin `coined` is renamed `operationally-coined` (operationally coined).

Your ask (Nov 2): "we have a serious backlog of terms that need to go into our glossary and turned into objects. We need to sketch, design, and build this loop and harness so that it is consistent updating and the objects actually being used. I would prefer once we design it, Claude Code builds it." Plus: "plan the backfill of terms and how we identify terms that should be objective... going through our code and designs and identifying aspects of them that should be calling these objects."

Approved Nov 2:
- intake pulls candidate terms from the standards Naive cites;
- a draft fails unless its standard resolves to a real reference record with a typed SKOS mapping, and "none fits" must be explicit.

Your rule, verbatim: "Standards are preferred, conventions are acceptable, inventions should be highly rare. There may be sibling to these. Look at Thinking Fast and Slow for inventions that have become conventions or standards." Revision 3 reads "inventions" as terms whose meaning is ours: `origin` operationally coined or borrowed (section 7).

Sources:
- `tchjhnsn/everything-ecosystem`, branch `framework` at `cb502f9`, read through the GitHub API on Nov 2. Line numbers are for that commit.
- Draft PR #164, branch `cursor/ee-107-vocabulary-objects-b376`.
- The notes in `docs/design/` (this pull request).
- For section 8: OpenAlex (citation and phrase counts on Nov 2), the APA Dictionary of Psychology, and the primary papers linked there.

## 0. The answer in plain words

1. **The repo already has four places terms live, and they are not joined yet:**
   - the noun registry `packages/naive/src/terms/ontology.json` (112 nouns);
   - the term engine `schema/terms/` (as of 2026-11-02; since moved/removed) (9 terms admitted as proposed);
   - package glossaries `glossary/<package>.json`;
   - PR #164's vocabulary objects `schema/vocabulary.json` (as of 2026-11-02; since moved/removed), which hold the verbs, kinds, tiers and one shape (`noun:venture`).

   EE-089 already says how they should join: code, schemas and docs cite term ids and never redefine a term, and a changed term marks every citing file stale. That part is not built yet. The loop is the thing that builds it.
2. **The backlog is 310 distinct candidate terms,** before merging by meaning (section 2). The biggest sources:
   - 151 pending terms in the public term list that are not nouns yet;
   - 96 record types with no noun;
   - 30 terms the sandbox engine ran that never reached the ontology.
3. **Separately, 389 subjects have no `vocabulary_parent`** (PR #164's baseline):
   - 207 modules;
   - 127 record types;
   - 55 records.

   71 of those can be closed now, with no new noun at all, because their noun already exists (section 12.3).
4. **The loop has eight steps: intake, triage, draft, shape, accept, land, check usage, check drift.**
   - Code does every step except drafting and accepting.
   - A temporary agent under `vocabulary-drafting@capabilities` drafts. The Lead's capabilities function owns vocabulary.
   - Gates and you accept, by tier.
   - Two ratchets keep it moving. The term backlog drift list and the code-literal list may only shrink, the same way PR #164's baseline does.
5. **Backfill means finding code and designs that should be calling these objects:**
   - string literals, enums, branches and JSON keys that carry domain meaning without citing a vocabulary object.

   The scan found real duplicates. For example:
   - `PHASES` is hardcoded in `packages/naive/src/engine/decisions.ts` L44, and the same five values are the phase enum in `noun:venture`'s shape (PR #164 `schema/vocabulary.json` (as of 2026-11-02; since moved/removed)).
   - There are three different lists of "layers": `packages/naive/src/engine/caching.ts` L192 (9 entries), `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L33-36 (10) and the `layer` noun (6).
6. **Standards feed the loop, and every term carries three labels: scope, origin and grade** (sections 6 to 9; decided Nov 2).
   - Naive cites 26 reference records and 83 free-text `standard` strings. Only 13 of 99 live nouns resolve to a reference record.
   - Labels (decided): scope is the `name@function` subject field, `origin` is the participle below, and `grade` is standard (with siblings regulatory and codified), then convention (with sibling seminal), then `none`. `origin` is a past participle: adopted, adapted, narrowed, broadened, borrowed or operationally coined.
   - Code computes both from the reference records and their SKOS mappings.
   - Operationally coined terms need a written "none fits" with three alternatives checked. Operationally coined and borrowed terms (meaning is ours) are costly at least, capped at 10% of live nouns (at most 8 of 99 today, after Everything Ecosystem, Product Anatomy and Succession Matrix are classed as proper names; proper names never count), and reviewed every quarter.
7. **Thinking, Fast and Slow shows how a term rises.**
   - None of its coinages reached a standards body. The ceiling is a professional dictionary (APA) and use by government or regulators.
   - Independent adoption marked the move to convention (planning fallacy). Codification marked the move to standard (availability heuristic, anchoring, prospect theory).
   - Labels can still move later: System 1 became Type 1 for its own originators.
   - WYSIATI and the focusing illusion never left their origin.
8. **Claude Code can build it as 21 PRs** (section 14), each with files, acceptance criteria and test cases. Section 15 lists 24 decisions (G1 to G24). Those marked decided are settled, and the rest need you first.

## 1. What exists today

| Piece | Path | What it does | Gap the loop fills |
| --- | --- | --- | --- |
| Noun registry | `packages/naive/src/terms/ontology.json` (v0.6.0, `nouns` from L13) | 112 nouns: 67 new, 23 kept, 9 proposed, 13 retired. Each has level, meaning, standard, function and status | no `id`, `broader`, `related` or alternate labels; no usage counts |
| Readable glossary | `packages/naive/src/terms/ontology.md` | generated by `node packages/naive/src/checks/check-nouns.ts --md`; L18 is the scoped noun rule `name@function` | none (keep generating) |
| Noun check | `packages/naive/src/checks/check-nouns.ts` | fails on retired nouns reappearing (`retired_pattern`), unknown references and membership rules (`checkOntology` in `packages/naive/src/terms/ontology-gate.ts`); runs in `test.mjs` (as of 2026-11-02; since moved/removed) L26 | does not catch new unknown terms (drift) |
| Term engine | `packages/naive/src/terms/engine.ts`, `packages/naive/src/terms/admit.ts`, `packages/naive/src/terms/terms.ts`, `packages/naive/src/terms/levels.ts`, `packages/naive/src/terms/admitted.json`; `packages/naive/lean/Naive/Terms.lean` | EE-095: define as properties over facts, freeze by hash, check as a valid test, cross-run, name Lean theorems, record as proposed. `admit.ts --check` exits 1 when `packages/naive/src/terms/admitted.json` is stale | `admit.ts --check` is not among the `test.mjs` (as of 2026-11-02; since moved/removed) steps at this commit; only 9 terms are admitted |
| Public term list | `docs/design/term-harvest/TERM_LIST_2026-11-01.json` (as of 2026-11-02; since moved/removed) | 199 terms in 8 subjects: 36 run in the sandbox, 163 pending; a `how` list (6 steps); `collides_with` marks contested terms | step 5 names a `usage.json` that does not exist in the repo |
| Package glossary | `packages/naive/src/records/glossary.schema.json`, `packages/naive/src/engine/generators/glossary.ts`, `packages/naive/src/functions/capabilities/templates/glossary.md` | per-package terms, local unless `export: true`; two exports with different meanings fail `packages/naive/src/checks/check-brand.ts` | local terms never meet the ontology |
| Internal terms | `packages/naive/src/engine/internal-terms.json`, record type `internal-terms` | patterns that must never appear in public output (`packages/naive/src/engine/check-leaks.ts`) | the stop list must exclude these from intake |
| Vocabulary objects (PR #164) | `schema/vocabulary.json` (as of 2026-11-02; since moved/removed), `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed), `schema/check-vocabulary.mjs` (as of 2026-11-02; since moved/removed), `schema/vocabulary-baseline.json` (as of 2026-11-02; since moved/removed), `schema/vocabulary-test.ts` (as of 2026-11-02; since moved/removed) | ids `noun:<slug>` (`nounId`, L150-153), `verb:`, `kind:`; `vocabulary_parent` on record types, records, and modules (first 40 lines); a shrink-only baseline of 389 gaps (`evaluate`, L615-645) | only one noun shape; no loader for enum values; no term-level ratchet |
| Premise lint | `packages/naive/src/checks/premise-lint.ts` (described in `AGENTS.md` L44) | flags `undefined-term` among premise aspects of goals and decisions | its findings are an intake source |
| References | `governance/references/references.json` (as of 2026-11-02; since moved/removed), `interface/references/references.json` (as of 2026-11-02; since moved/removed), `operations/references/references.json` (as of 2026-11-02; since moved/removed), `purpose/references/references.json` (as of 2026-11-02; since moved/removed), `purpose/kits/validation/references/references.json` (as of 2026-11-02; since moved/removed) | 26 records with `kind`, `url`, `checked`, `informs` and `stance.is` (adopted, adapted, alternative); `packages/naive/src/checks/check-nouns.ts` fails a noun that cites an unknown id | no quote, mapping type, version, jurisdiction or `superseded_by`; 86 live nouns cite none |
| Decisions | `docs/decisions/decisions.json` | EE-014 standards first; EE-089 knowledge base and code joined at the glossary (stale marking "planned as schema/terms/stale.ts", not built); EE-095 one admission for every new or contested term | the loop implements EE-089's missing half |

## 2. The actual backlog

### 2.1 How it was counted

- **Script:** a local harvest script, on box files fetched from `framework` at `cb502f9`.
- **Read:**
  - all 28 design docs under `docs/design/`;
  - `docs/master/naive-docs.md` (as of 2026-11-02; since moved/removed), `docs/reference/ROUTES.md`, `packages/naive/src/terms/ontology.md`;
  - 17 READMEs and AGENTS files (root, `schema/`, `platform/` (as of 2026-11-02; since moved/removed), `lean/` (as of 2026-11-02; since moved/removed), `knowledge/` (as of 2026-11-02; since moved/removed), `purpose/` (as of 2026-11-02; since moved/removed), the instance venture);
  - `docs/decisions/decisions.json`;
  - `packages/naive/src/records/data-model.json` (128 record types);
  - the term list;
  - the research notes now being added to `docs/design/`.
- **Normalized:** lowercase, hyphen and underscore to space, simple singular, parenthetical dropped.
- **Matched** against every live noun, its `term` field, and the bare name of each scoped noun.

| Source | Candidates not already a noun |
| --- | --- |
| A. Term list, pending | 151 of 163 (12 are already nouns: evidence, provenance, schema, channel, market, founder, role, phase, gate, view, decision, handoff) |
| B. Record types in `packages/naive/src/records/data-model.json` with no noun | 96 of 128, after 4 obvious mappings (exit-criteria to exit criterion, need-now to need-now score, decision-record to decision, department to function) |
| C. Terms the engine ran in the sandbox but never added to the ontology | 30 (artifact, citation, competitor, complementor, supplier, substitute, partner, co-opetition, glossary, record, routing, triage, receipt, subject, title, excerpt, sealed excerpt, folder, suite, group, holding, kernel, loop, matrix, skill, theorem, prove, verify, validate, corroborate) |
| D. Proposed in the design notes | 27 (the 13 competitor-research nouns, `bet`, module, handler, venture seed, library object, verification level, question, question theorem, question run, theorem fork, scope, scoped agent, data-rate clock, premise rate) |
| E. Mined from docs, used in 2 or more files, domain words only | 23 (for example entity, package, organization, tenant, visibility, standing rule, impact tier, change line, decision class, pair lens) |
| **Distinct after overlap** | **310** |

- **Overlaps:**
  - A and B share constraint, icp and playbook.
  - D overlaps A and B on artifact, judgment, module, scope and the four research record types.
- **Not counted:**
  - commands, paths and file names;
  - field names (these become shape properties, section 12.1);
  - generic code words (string, object, item, list).
- **Merging by meaning will cut the count further.** The engine's verbs (prove, verify, validate, corroborate, triage) belong in `verb:` objects, not nouns. The validation-* record family should collapse under one broader noun.

### 2.2 Collisions with existing nouns (fix these before adding anything)

These are worse than missing terms, because code and the ontology already disagree on the word.

| Word | Ontology says | Code and design say | Where |
| --- | --- | --- | --- |
| `tier` | one of MAD's four levels: governance, delivery, software engineering, automation (`packages/naive/src/terms/ontology.json` L386) | the impact tier low, costly, one_way_door | `schema/vocabulary.json` (as of 2026-11-02; since moved/removed) `tiers` (PR #164); `packages/naive/src/terms/operating-rules.json` `questions.impact` |
| `gate` | the test for leaving a phase | the write gate that refuses or drafts a write; a provenance activity | `packages/naive/src/engine/gate.ts` L125-132; `interface/provenance.mjs` (as of 2026-11-02; since moved/removed) L134 (`activity: "gate"`); admitted engine term `phase-gate` (`packages/naive/src/terms/admitted.json`) |
| `channel` | a place the venture publishes to (`packages/naive/src/terms/ontology.json` L811) | revision 3's graph entry point | resolved by revision 4: channels became scopes |
| `customer` (record type) | only scoped nouns exist: `customer@marketing-and-sales`, `customer@finance`, and no bare name may sit beside them (`packages/naive/src/terms/ontology.md` L18) | record type `customer` "A customer master record" | `packages/naive/src/records/data-model.json` L1626 |
| `theorem` | not a noun | term list `theorem` collides with `theorem@torian`; revision 3 needs `question theorem` | `TERM_LIST_2026-11-01.json` |
| `premise` | not a noun | `frame` "premises and the attacks on them"; `premise-lint` aspects; revision 4's `premise` (decision input plus threshold) | `packages/naive/src/records/data-model.json` `frame`; `AGENTS.md` L44 |

### 2.3 Ranked starter list (first 25)

Rank uses section 4.3's formula: dependents first, then collision risk, then active design need, then spread across files.

| # | Term | Why now | Lands as |
| --- | --- | --- | --- |
| 1 | impact tier | collision on `tier`; every change line and gate uses it | new noun; `tier` relabeled `MAD tier` (question G6) |
| 2 | write gate | collision on `gate` | new noun; `gate` relabeled `phase gate` to match the admitted term (question G7) |
| 3 | customer (record type) | the record type has no legal noun | `vocabulary_parent: noun:customer@marketing-and-sales` (question G8) |
| 4 | judgment | record type in active use by `use_model` (`packages/naive/src/records/data-model.json` L1719) | new noun |
| 5 | artifact | record type; what gets published (L1696) | new noun |
| 6 | research cell | record type (L2048) | new noun |
| 7 | research source | record type | new noun, related: reference |
| 8 | research claim | record type | new noun (label "claim", id `research-claim`) |
| 9 | research citation | record type | new noun |
| 10 | scope | revision 4: no scope, no spawn | new noun (level system) |
| 11 | bet | premises and pair lenses depend on it; 0 uses in repo docs | new noun and record type |
| 12 | premise | three uses that must be one meaning | new noun, reconciled with `frame` and premise-lint |
| 13 | question | revision 3, section 3 | new noun |
| 14 | question theorem | revision 3; collides with `theorem@torian` | new noun, label fixes the sense |
| 15 | competitor | strategy research owner; engine already ran it | new noun, broader: account |
| 16 | price tier | shared by Strategy and Growth | new noun, broader: offering |
| 17 | visibility level | `LEVELS` in `packages/naive/src/engine/visibility.ts` L21, no noun | new noun with enum shape |
| 18 | decision status | open, decided, deferred, withdrawn branched on in `packages/naive/src/engine/decisions.ts` L168-186 and `packages/naive/src/router/orchestration/triggers.ts` L123 | values in `noun:decision`'s shape |
| 19 | boundary (fail-open, fail-closed) | `packages/naive/src/engine/decisions.ts` L152-158, L175 | values in `noun:decision`'s shape |
| 20 | decision-right level | `escalate`, `recommend-approve` in `packages/naive/src/router/router.ts` L262-268 | values in `noun:decision-right`'s shape |
| 21 | answer kind | `noul`, `choice`, `classify`, `score` in `packages/naive/src/router/orchestration/model-steps.ts` L357-366 | values in `noun:judgment`'s shape |
| 22 | step outcome | expected, uncaught, uncertain, overruled, answer in `packages/naive/src/router/orchestration/model-steps.ts` L78-82 | values in `noun:judgment`'s shape |
| 23 | ICP | record type with 2 instance records in the baseline; also a term-list term | new noun (label "ideal customer profile") |
| 24 | goal | record type with an instance record | new noun |
| 25 | validation record family | 9 record types `validation-*` | one broader noun plus narrower ones |

## 3. Intake: where candidate terms come from

Every candidate becomes one entry in `docs/glossary/backlog.json` (as of 2026-11-02; since moved/removed). That file is generated and committed, so diffs are reviewable. An entry holds:
- the normalized key;
- the labels seen;
- each site, as path, line and source kind;
- a count of files and functions;
- the first-seen commit.

| Source | Extractor | Notes |
| --- | --- | --- |
| Term list files `docs/design/term-harvest/*.json` | read `status: pending` | the public seed list; research-note terms enter by adding a new term-list file, never by reading a box working directory |
| Record types | subjects of kind `record-type` from `collectSubjects` (`schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L514-550) with no noun match | reuses PR #164's walker |
| Docs | Markdown in `docs/**`, every `README.md` and `AGENTS.md`, `docs/decisions/decisions.json` text fields: backticked tokens, bold labels, the first column of definition tables, headings | skips code blocks, paths, commands and anything matching `packages/naive/src/engine/internal-terms.json` |
| Code | the literal scan, section 12.2 | domain literals only |
| Scopes | the `background` lists on scope objects (revision 4, section 7.2) | arrives already ranked by the scope |
| Premise lint | `undefined-term` findings | the term in the finding |
| Pull requests | the same extractors on the PR diff only | runs in CI, section 11 |
| Engine runs | terms in `packages/naive/src/terms/terms.ts` with no ontology noun | engine to ontology handoff |
| Standards | the importers in section 6.2, over the sources in section 6.1 | arrives with grade and mapping filled; ranks first |

## 4. Triage and dedupe

### 4.1 Match rules, in order

1. **Retired noun.** Point to `replaced_by`. That is already a failure in `packages/naive/src/checks/check-nouns.ts`.
2. **Same meaning as a live noun.** It becomes an alternate label on that noun, not a new noun.
3. **Same word, different meaning, owned by one function.** Add a scoped noun `name@function`, only when the meaning differs (`packages/naive/src/terms/ontology.md` L18). Never add a bare name beside a scoped noun.
4. **Same word, different meaning, system-wide.** Give it a distinct label, such as "impact tier" and "MAD tier". Do not scope it, because a scope suffix must be a function id.
5. **Field name.** It becomes a property in its noun's shape, not a noun.
6. **Enum value.** It becomes a value in its noun's shape `enum`. It gets its own noun only if it carries its own fields or rules. A phase value carries a phase gate, so `phase` keeps its noun and the values stay an enum.
7. **Not a term.** It goes into `docs/glossary/stoplist.json` (as of 2026-11-02; since moved/removed) with a one-line reason. The stop list is reviewed like code.

### 4.2 SKOS rules

The ontology gains `broader`, `related`, `alt_labels` and `scope_note`, following the SKOS reference ([W3C SKOS Reference](https://www.w3.org/TR/skos-reference/)).
- **One broader per noun** (a mono-hierarchy). It is simpler to check and to read (question G4).
- **`broader` means is-a:** every instance of the narrower noun is an instance of the broader one.
  - When both terms have engine definitions at the same level, code checks this with `relation()` (`packages/naive/src/terms/engine.ts`): the result must be `is_a`.
  - Otherwise the claim is declared and flagged as unchecked.
- **`related` is association only.** It is never set on a pair that already has a broader path between them. SKOS integrity condition S27 makes `related` disjoint with `broaderTransitive` ([SKOS Reference, S27](https://www.w3.org/TR/skos-reference/#S27)).
- No cycles in `broader`.
- A scoped noun `x@f` has no broader link to a bare `x`. Each one stands alone. Its link to an outside source (for example FIBO Customer) is a mapping, which sets its `origin` (section 7).
- `alt_labels` are unique across all nouns. Two nouns cannot share a label.

### 4.3 Rank

    score = 4 * dependents + 3 * collision + 2 * design_need + files + functions

- **dependents:** the baseline gaps the term would close, plus code literal sites.
- **collision:** 1 if the term clashes with a live noun or has `collides_with` in the term list.
- **design_need:** 1 if a scope foreground list or an accepted design names it.
- **files and functions:** the spread counts.

Ties break by first-seen commit. The rank is code, so it never needs a model.

## 5. Drafting, shape and parent

- **Owner.** The Lead's capabilities function owns vocabulary. `capabilities` is one of the 13 functions in `packages/naive/src/functions/departments.json`, confirmed by EE-090.
- **Drafter.** A temporary agent spawned under the scope `vocabulary-drafting@capabilities` (revision 4, section 7). Its foreground nouns are just `noun:noun-draft`. It may write drafts, never the ontology.
- **A draft** is `docs/glossary/drafts/<id>.json`, produced by a record generator in the EE-099 pattern, like `packages/naive/src/engine/generators/glossary.ts`. It holds:
  - id (from `nounId`);
  - label;
  - level;
  - meaning;
  - `standard_ref` (a reference record id, or the explicit `none`), the SKOS `mapping` with a quote, and `none_fits` for operationally coined terms (section 9.4); the free-text `standard` is kept for display;
  - the computed `grade` (section 7);
  - function, or null when shared;
  - broader, related and alternate labels;
  - `handoff_type`;
  - a shape in the JSON Schema subset PR #164 enforces (`SHAPE_KEYS`, `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L135-140);
  - a usage note (use, avoid, instead);
  - 2 or more real sites from the backlog.
- **Contested or role terms** also get an engine definition in `packages/naive/src/terms/terms.ts` and run `packages/naive/src/terms/admit.ts`. A term is contested when `collides_with` is set or when it names a role or act at a fact level. EE-095 applies to every new or contested term; question G2 asks whether to keep that literal.
- **The model drafts; code checks.** The draft step is a declared `use_model` step (`packages/naive/src/router/orchestration/model-steps.ts`). Code then checks:
  - the shape parses;
  - the id is free;
  - the label does not collide;
  - the SKOS rules hold;
  - the sites exist;
  - the draft gate passes (section 9.4).
- **Batches.** The weekly run drafts the top N (proposed 10) of the backlog.

## 6. Standards as an intake source (approved Nov 2)

### 6.1 What Naive cites today

Counted from `packages/naive/src/terms/ontology.json` (`standard` and `references` on the 99 live nouns) and the five reference files: `governance/` (as of 2026-11-02; since moved/removed), `interface/` (as of 2026-11-02; since moved/removed), `operations/` (as of 2026-11-02; since moved/removed), `purpose/` (as of 2026-11-02; since moved/removed) and `purpose/kits/validation/references/references.json` (as of 2026-11-02; since moved/removed).

- **26 reference records,** by kind: 13 book, 6 article, 4 standard, 1 paper, 1 law, 1 conversation.
  - Each has a `stance.is`: 19 adopted, 5 adapted, 2 alternative.
- **83 distinct `standard` strings** on 112 nouns. These are free text, and code cannot resolve them.
- **Only 13 of 99 live nouns resolve to a reference record** through `references`:
  - phase, gate, ambition, industry, core product, market, job, technology, business model, wedge, agent harness, AI harness, evidence grade.
- 55 name a source in text with no record.
- 20 say a generic "common ... usage".
- 11 are `ours`.
- **APQC is cited in 6 nouns' `standard` text, but no noun lists the reference `apqc-pcf-cross-industry`** (`operations/references/references.json` (as of 2026-11-02; since moved/removed)).

**Standards and sources cited, with counts** (nouns whose `standard` names them):

| Kind | Source | Nouns | Reference record? |
| --- | --- | --- | --- |
| Standards body | APQC PCF 7.4 Cross-Industry | 6 | yes (`apqc-pcf-cross-industry`), never linked |
| Standards body | W3C PROV (PROV-DM) | 2 | no |
| Standards body | JSON Schema | 1 | no |
| Standards body | Schema.org (Customer) | 1 | no |
| Standards body | FIBO, EDM Council (Customer) | 1 | no |
| Standards body | NAICS 2022 | 1 | yes (`naics-2022`); GICS kept as an alternative (`gics-msci`) |
| Standards body | GRADE Working Group | 1 | yes (`grade-handbook`) |
| Professional body of knowledge | DAMA-DMBOK | 1 | no |
| Professional body of knowledge | ANSI/SPARC; Chen 1976 entity-relationship | 1 | no |
| Industry model documents | NVCA model legal documents | 1 | no |
| Codified practice | Scrum (definition of done) | 1 | no |
| Law or regulation | IRS Treas. Reg. 1.183-2 | 1 | yes (`irs-treas-reg-1-183-2`) |
| Law or regulation | corporate law (classes of stock; boards) | 2 | no |
| Law or regulation | US entity types | 1 | no |
| Seminal work | Abell 1980 | 3 | yes |
| Seminal work | Blank 2005 | 2 | yes |
| Seminal work | Kotler; Prahalad and Hamel 1990 | 2 and 1 | yes |
| Seminal work | Feld (Startup Boards; Venture Deals) | 2 | no |
| Seminal work | Moore 1991; Andreessen 2007; Zook and Allen 2012; Dixon 2010; Gassmann 2014 (St. Gallen) | 1 each | yes |
| Seminal work | Cooper (Stage-Gate); Clark (work/family border); Adams and Yellen 1976; Johnson and Foote 1988; Covey; Aristotle; jobs to be done; Wickman (EOS) | 1 each | no |
| Decision-rights methods | RAPID (Bain), DACI, RACI | 2, 1, 1 | no |
| De facto industry | Next.js App Router | 5 | no |
| De facto industry | Rails; Git; Eclipse; Obsidian; Anthropic S-1 and agent guides; ADR practice; YAGNI; just-in-time | 1 to 2 each | Anthropic only (`anthropic-2024-building-effective-agents`) |

### 6.2 Pulling terms from those standards

For each standards-body source with a machine-readable vocabulary, the intake imports only the branch Naive uses:

| Source | Machine-readable form | Branch to import |
| --- | --- | --- |
| APQC PCF | the PCF download (check the license before committing the extract) | categories 1.0, 2.0, 3.0 and 9.0, for the four functions' processes |
| W3C PROV | PROV-O ([W3C PROV-O](https://www.w3.org/TR/prov-o/)) | classes and properties |
| Schema.org | schema.org JSON-LD (check its terms page) | Organization, Customer and Offer branches |
| FIBO | OWL, MIT license ([edmcouncil/fibo LICENSE](https://raw.githubusercontent.com/edmcouncil/fibo/master/LICENSE)) | Customer, LegalEntity |
| NAICS | Census and Statistics Canada tables | sector names |
| GRADE | handbook headings | certainty levels |
| JSON Schema | the 2020-12 vocabulary | keywords, which feed the shape rules, not nouns |

Each imported concept becomes a `standard-term` row in `docs/glossary/standards/<source>.json`. It holds:
- the source id;
- the concept id or URI;
- the preferred label;
- the definition, at most 300 characters (the same cap as citations in revision 2);
- the version.

**Matching to Naive's terms** is code-only, with three outcomes:
1. **Exact label or alternate label match, same function:** propose `exactMatch`, for a person to confirm.
2. **Label match, different branch or definition:** propose `closeMatch` or `relatedMatch` for review.
3. **A standard concept that our records use but no noun names:** a new backlog candidate, with grade `standard` already filled.

Standards-sourced candidates outrank everything else (section 9.5): rule 1 of your Nov 2 note is that standards are preferred.

## 7. The provenance grade and origin

Your rule: "Standards are preferred, conventions are acceptable, inventions should be highly rare. There may be sibling to these."

Every noun gets one `grade`.
- Code computes it from the noun's mappings and reference records. It is never typed by hand.
- `status` (proposed, new, kept, retired) stays a separate field. A retired noun keeps its last grade and its `replaced_by`.

| Rank | Grade | Means | Evidence code checks | Example in Naive |
| --- | --- | --- | --- | --- |
| 1 (preferred) | `standard` | defined by a standards or classification body, versioned | a reference record of kind `standard`, with a version and a URL, mapped `exactMatch` or `closeMatch` | the four function nouns (APQC PCF); provenance (W3C PROV); industry (NAICS) |
| 1, sibling | `regulatory` | defined in law or by a regulator; the meaning is tied to a jurisdiction | kind `law` or `regulation`, plus a `jurisdiction` field | ambition, whose hobby value follows IRS Treas. Reg. 1.183-2; share class (corporate law) |
| 1, sibling | `codified` | an entry in a professional body's dictionary or body of knowledge | kind `dictionary` or `body-of-knowledge`, plus the publisher | central data management structure (DAMA-DMBOK); done-criterion (Scrum's definition of done) |
| 2 (acceptable) | `convention` | de facto usage in a field, adopted independently | at least N independent sources (section 9.1) | repository (Git); layout and route (Next.js); cap table |
| 2, sibling | `seminal` | adopted from one seminal work, with that work's meaning | one reference record of kind book, article or paper, `exactMatch`, `stance: adopted` | beachhead (Moore); wedge (Dixon); market, job and technology (Abell) |
| 3 | `none` | no source with authority over the meaning | `standard_ref: "none"` with `none_fits`, or a borrowed label (see `origin`) | Product Anatomy, Succession Matrix, need-now score, pillar |

**Why these siblings:**
- `regulatory` ranks with `standard` because it binds, but it carries a jurisdiction, so it cannot be applied silently across countries.
- `codified` ranks with `standard`, because a professional dictionary fixes a definition and its attribution. The case study (section 8) shows it is where most well-known coinages end up.
- `seminal` sits under `convention`: the meaning is pinned by one origin, but there is no independent adoption yet. It is the usual waystation between operationally coined and convention.

**Why `scoped-sense` and `invention` were dropped (decided Nov 2, rev 4).** Each one answered "what did we do with the term", not "how authoritative is the source". Both scoped nouns cite standards (FIBO, Schema.org), yet rev 2 ranked them below conventions. None of the 11 "ours" nouns is a new word: 8 are compounds, 2 are ordinary words with our meaning, and 1 is a proper name. "Invention" also has a patent-law meaning (35 U.S.C. 100(a)), and "scope" is now the name for agent scopes. Full evidence: `docs/design/TERM_GRADE_NAMES_PREMISE_2026-11-02.md`.

**Decided labels (rev 4): scope, origin and grade.** Every noun carries three labels: its scope, the `name@function` subject field (empty for a shared noun); its `origin` (below); and its `grade` (the table above). Code computes origin and grade; neither is typed by hand.

**`origin`.** Code computes it from the SKOS mapping and quote, never by hand. A stored value that disagrees fails.

| `origin` | Means | Computed from | Standard source | EE-107 line at creation |
| --- | --- | --- | --- | --- |
| adopted | their concept and definition, quoted | `exactMatch` plus a quote of their definition | SBVR adopted definition; OMG Commons `directSource`; PROV `wasQuotedFrom` | create/derive, `source` = reference |
| adapted | same concept in substance, reworded | `closeMatch`, or `exactMatch` without a quote | OMG Commons `adaptedFrom` ("compatible with but not quoted"); SBVR "based on" | create/derive |
| narrowed | ours is a kind of theirs | `broadMatch` (theirs is broader) | SKOS `broadMatch` (S41); ISO 25964-2 BM | create/derive |
| broadened | ours covers theirs and more | `narrowMatch` (theirs is narrower) | SKOS `narrowMatch`; ISO 25964-2 NM | create/derive |
| borrowed | their label, our different concept | `relatedMatch` or `deliberateDifference` with a reason | ISO 704 terminologization and transdisciplinary borrowing; SBVR dictionary basis | create/derive, `source` = where the label came from |
| `operationally-coined` (operationally coined) | ours, named for how Naive operates; no source | `standard_ref: "none"` plus `none_fits` | ISO 1087-1:2000 neologism ("new terms coined for a given concept") | create/originate |

- `origin` adds no verbs or kinds. Later changes use the existing EE-107 kinds. Revise recomputes `origin`. A rename (id kept) moves an operationally coined noun to a standard label, or follows an upstream relabel. Deprecate and merge are status, not origin.
- The `name@function` suffix stays the scoped-noun naming rule (`packages/naive/src/terms/ontology.md` L18). It records the subject field (the terminology-work term; TBX `subjectField`), separate from both `grade` and `origin`.

**`designation`, the fourth label (rev 4, for your Nov 2 "Proper Names" note).** This label records what kind of thing a word names, which is separate from scope, origin and grade. It uses the ISO 1087:2019 designation types:
- `term` (3.4.2), the default, for a general concept;
- `proper-name` (3.4.4), "designation that represents an individual concept", such as Everything Ecosystem or a venture or company name;
- `appellation` (3.4.3), a term for a product line whose units are identical, such as a product name (decided Nov 2, G24; outside the 10% cap);
- `symbol` (3.4.5), reserved.

Rules for a proper-name noun:
- It links to its general concept by `instance_of`, following the ISO 25964-1 instance relationship (BTI), never by `broader`, because `broader` means is-a and SKOS has no instance sub-property.
- It still carries scope, origin and grade.
- It never counts toward the 10% cap and is never listed in `own-meaning.json`.
- It must have one referent. A check fails if anything uses it as a kind.

"proper name" is itself a glossary noun: designation `term`, scope shared, origin adopted (definition quoted from ISO 1087:2019 3.4.4), grade standard, with a new ISO 1087:2019 reference record.

Proper names among today's 99 live nouns (`packages/naive/src/terms/ontology.json` on `framework`):
- Everything Ecosystem, `instance_of` venture development framework;
- Product Anatomy and Succession Matrix, as one unique method and its part, each under the one-referent check (decided Nov 2, G24).

"The system" is better as an `altLabel` of Everything Ecosystem. No venture or product name is a noun yet. Evidence: `docs/design/TERM_GRADE_NAMES_PREMISE_2026-11-02.md` section 7.

**First pass over today's 99 live nouns.** This is by string match on `standard`; the real grade comes from the backfill (section 12, population P8).

| Grade | Count |
| --- | --- |
| standard | 11 |
| regulatory | 4 |
| codified | 4 |
| convention | 44 |
| seminal or another named source | 23 |
| standard (the two scoped nouns, FIBO and Schema.org; origin to be confirmed) | 2 |
| none (each to be sorted operationally coined or borrowed; includes the proper names Everything Ecosystem, Product Anatomy and Succession Matrix, which do not count toward the cap) | 11 (11%), of which at most 8 count |

## 8. Case study: Thinking, Fast and Slow

The question is which of Kahneman's terms went from coinage to convention to standard, and what marked each step.

- **Citation counts** are OpenAlex `cited_by_count` on Nov 2, 2026 (for example `https://api.openalex.org/works/https://doi.org/10.2307/1914185`).
- **Phrase counts** are OpenAlex works whose title or abstract contains the exact phrase.
- **Dictionary entries** were read on the APA Dictionary of Psychology on Nov 2.

| Term | Coined by, where | Evidence of adoption | Where it is now |
| --- | --- | --- | --- |
| System 1 / System 2 | Stanovich and West, "Individual differences in reasoning", *BBS* 2000 ([doi:10.1017/S0140525X00003435](https://doi.org/10.1017/S0140525X00003435), 4,264 citations). Kahneman: "I adopt terms originally proposed by the psychologists Keith Stanovich and Richard West" ([excerpt, Scientific American](https://www.scientificamerican.com/article/kahneman-excerpt-thinking-fast-and-slow/)) | Kahneman's Nobel lecture used them ([AER 2003, doi:10.1257/000282803322655392](https://doi.org/10.1257/000282803322655392), 5,379); APA entry "System 1" ([APA](https://dictionary.apa.org/system-1)). But Evans and Stanovich later prefer "Type 1 and Type 2" ([*Perspectives on Psych. Science* 2013, doi:10.1177/1745691612460685](https://doi.org/10.1177/1745691612460685), 4,271). APA's "dual-process theory" sense 3 attributes the idea to Kahneman and Tversky ([APA](https://dictionary.apa.org/dual-process-theory)) | **codified**, but its own originators deprecated it, and attribution drifted |
| WYSIATI ("what you see is all there is") | Kahneman, *Thinking, Fast and Slow*, 2011 | 17 works use "WYSIATI" in title or abstract; no APA entry found; Wiktionary has an entry | **a coinage** with no outside source, and still there; a crowd-edited dictionary entry is not evidence |
| Anchoring | Tversky and Kahneman, "Judgment under uncertainty", *Science* 1974 ([doi:10.1126/science.185.4157.1124](https://doi.org/10.1126/science.185.4157.1124), 28,810) | APA "anchoring bias", "also called anchoring-and-adjustment heuristic; anchoring effect" ([APA](https://dictionary.apa.org/anchoring-bias)); 3,056 phrase hits for "anchoring effect" | **codified**, under three labels |
| Availability heuristic | Tversky and Kahneman, *Cognitive Psychology* 1973 ([doi:10.1016/0010-0285(73)90033-9](https://doi.org/10.1016/0010-0285(73)90033-9), 9,984) | APA entry, "described in 1973 by Amos Tversky and Daniel Kahneman" ([APA](https://dictionary.apa.org/availability-heuristic)); 931 phrase hits | **codified**, with attribution intact |
| Planning fallacy | Kahneman and Tversky, 1979, "Intuitive prediction: biases and corrective procedures" | taken up independently by Buehler, Griffin and Ross ([*JPSP* 1994, doi:10.1037/0022-3514.67.3.366](https://doi.org/10.1037/0022-3514.67.3.366), 1,108); APA entry, "identified by Amos Tversky and Daniel Kahneman" ([APA](https://dictionary.apa.org/planning-fallacy)); led to reference class forecasting in project management ([Flyvbjerg 2006, doi:10.1177/875697280603700302](https://doi.org/10.1177/875697280603700302)) and to UK Treasury guidance on optimism bias ([Green Book supplementary guidance](https://www.gov.uk/government/publications/green-book-supplementary-guidance-optimism-bias)) | **codified**, and used in government guidance under a neighbouring name |
| Premortem | Gary Klein, "Performing a project premortem", *HBR* Sept 2007 ([HBR](https://hbr.org/2007/09/performing-a-project-premortem)); spread by Kahneman's book | no APA entry found. Phrase counts are polluted: "pre-mortem" also means a medical exam before death, so raw counts (1,785 and 1,281) say nothing until the sense is filtered | **convention** in practice, not codified; a homonym trap for counters |
| Prospect theory, loss aversion | Kahneman and Tversky, *Econometrica* 1979 ([doi:10.2307/1914185](https://doi.org/10.2307/1914185), 48,524); Tversky and Kahneman, *QJE* 1991 ([doi:10.2307/2937956](https://doi.org/10.2307/2937956), 6,430) | Nobel 2002 motivation: "for having integrated insights from psychological research into economic science" ([NobelPrize.org](https://www.nobelprize.org/prizes/economic-sciences/2002/kahneman/facts/)); APA "prospect theory" entry ([APA](https://dictionary.apa.org/prospect-theory)), while "loss aversion" only redirects to "behavioral economics" ([APA](https://dictionary.apa.org/loss-aversion)); the UK FCA's Occasional Paper 1 uses "loss aversion" 15 times ([FCA OP1, 2013](https://www.fca.org.uk/publication/occasional-papers/occasional-paper-1.pdf)) | **codified** (prospect theory) and used by a **regulator** (loss aversion) |
| Base-rate neglect | Kahneman and Tversky, "On the psychology of prediction", *Psych. Review* 1973 ([doi:10.1037/h0034747](https://doi.org/10.1037/h0034747), 6,203) | the label that stuck, "base-rate fallacy", was Bar-Hillel's ([*Acta Psychologica* 1980, doi:10.1016/0001-6918(80)90046-3](https://doi.org/10.1016/0001-6918(80)90046-3), 1,183); APA entry "base-rate fallacy" ([APA](https://dictionary.apa.org/base-rate-fallacy)); phrase hits: neglect 446, fallacy 219 | **codified**, under someone else's label |
| Focusing illusion | Schkade and Kahneman, *Psych. Science* 1998 ([doi:10.1111/1467-9280.00066](https://doi.org/10.1111/1467-9280.00066), 870); Kahneman et al., *Science* 2006 ([doi:10.1126/science.1129688](https://doi.org/10.1126/science.1129688), 1,258) | 59 phrase hits; no APA entry found | **seminal**: used with its origin's meaning, never codified |

**What the case shows about the transition:**
1. **None of these reached a standards body.** The ceiling for a coinage in a field is a professional dictionary, plus government and regulator use. That is why `codified` and `regulatory` sit beside `standard` rather than below it.
2. **Citation counts separate the extremes but not the middle.**
   - Prospect theory has 48,524 citations and WYSIATI has 17 phrase hits.
   - But planning fallacy (1,108 for the independent paper) and focusing illusion (1,258) have similar counts and different fates.
   - So counts can rank candidates for review, but they are not a test.
3. **Independent adoption is the real marker of convention.** Planning fallacy turned into a convention when Buehler and others, outside the Kahneman and Tversky collaboration, studied it under that name. Focusing illusion has stayed mostly with Kahneman's own papers.
4. **Codification fixes the definition and the attribution, and that is the marker of a standard.** Even then, a later source can move the label: System 1 became Type 1 for its own originators, and base-rate neglect became base-rate fallacy. A grade has to be rechecked, not set once.
5. **Homonyms and crowd-edited sources fool counters.** "Pre-mortem" has a medical sense, and Wiktionary lists WYSIATI. Evidence has to be sense-checked: a quoted definition mapped to ours.

## 9. Promotion, demotion and the operationally coined term rules

### 9.1 Operationally coined to convention (code-checkable)

Evidence lives in reference records, with `kind`, `url`, `checked`, `authors`, `year`, `stance`, and a new `quote` (at most 300 characters) and `mapping`. Promote when all of these hold:

| Test | Rule | Checked from |
| --- | --- | --- |
| P1 independent adoption | at least 5 reference records (N, question G15) mapped `exactMatch` or `closeMatch`, from at least 3 distinct author groups that share no author with the coining source | reference `authors`; optionally OpenAlex authorships |
| P2 spread in time | the sources span at least 2 calendar years after the coinage | reference `year` |
| P3 sense check | each source carries a quote whose mapping a person confirmed (`mapping.confirmed_by`) | reference `mapping` |
| P4 stable definition | the noun's meaning hash unchanged for at least 90 days | `usage.json` hash history (section 11.3) |
| P5 used in Naive | at least 2 subjects whose `vocabulary_parent` is the noun | `collectSubjects` |

**Seminal to convention** uses the same tests, with the seminal work as the coining source.

### 9.2 Convention to standard, or to its siblings

Promote when there is a reference record of kind `standard` (versioned, from a standards or classification body), `law` or `regulation` (with a jurisdiction), or `dictionary` or `body-of-knowledge` (from a professional body), and all three of these hold:
- the mapping is `exactMatch` or `closeMatch`, with a quote;
- the record was checked within 12 months;
- no record marks the term `superseded_by` another label. That is the System 1 to Type 1 case.

The grade goes to `standard`, `regulatory` or `codified` to match the kind.

**Demotion is automatic and narrows,** so it is low tier with a notice:
- a recheck fails;
- a record goes past 12 months unchecked;
- or a `superseded_by` appears.

The grade then drops to what the remaining evidence supports.

### 9.3 Operationally coined and borrowed terms (meaning is ours)

- **Justification.** A draft with `origin` `operationally-coined` must carry `none_fits`. A borrowed draft instead needs its source and a `deliberateDifference` reason. That lists at least 3 standards or conventions searched, each with the candidate term and a one-line reason it does not fit. A blank or "none" without a list fails.
- **Tier.** Costly at least. One_way_door if it would type more than 10 subjects. You accept every one.
- **Cap and ratchet.**
  - `docs/glossary/own-meaning.json` (as of 2026-11-02; since moved/removed) lists every operationally coined and borrowed noun, and no proper names (decided Nov 2, G17). It is a ratchet: an addition needs `approved` with your decision id.
  - A hard cap of 10% of live nouns (decided Nov 2, G17). Operationally coined and borrowed nouns count. Proper names such as Everything Ecosystem do not count and are not listed. Proper names are marked by `designation: proper-name` (section 7). Today at most 8 of 99 count: 11 "ours" nouns minus the 3 proper names Everything Ecosystem, Product Anatomy and Succession Matrix (decided Nov 2, G24). The backfill sort decides how much room is left.
- **Review.** Every quarter, for each operationally coined or borrowed noun:
  - rerun the standards intake (section 6.2), looking for a new match. A match is a replace proposal: amend/rename to the standard label, keeping the id;
  - rerun the promotion test.

  The weekly job flags due reviews.

### 9.4 The draft gate (approved Nov 2)

A draft fails unless all of these hold:
1. **A real reference record.** `standard_ref` names a reference record that exists in a layer or kit `references.json`, as `packages/naive/src/checks/check-nouns.ts` already resolves `references`. The free-text `standard` string is kept for display, but code reads `standard_ref`.
2. **A typed SKOS mapping** to that reference's concept ([SKOS mapping properties](https://www.w3.org/TR/skos-reference/#mapping)):
   - `exactMatch`;
   - `closeMatch`;
   - `broadMatch` (theirs is broader);
   - `narrowMatch` (theirs is narrower);
   - `relatedMatch`;
   - or `deliberateDifference`, which is ours, not SKOS. It carries a `reason`: what in their meaning we reject, and why.
3. **No blank standard.** "None fits" is the explicit value `standard_ref: "none"`, together with section 9.3's `none_fits` list. The noun is then graded `none`, `origin` `operationally-coined`.
4. **The noun's computed `origin` agrees with the reference's own stance:**
   - `stance.is: adopted` allows origin adopted or adapted;
   - `adapted` allows adapted, narrowed, broadened or borrowed;
   - `alternative` allows only borrowed (`relatedMatch` or `deliberateDifference`).

**Migration.** 86 of today's 99 live nouns do not resolve to a reference record. They go into `docs/glossary/standard-baseline.json` (as of 2026-11-02; since moved/removed), which may only shrink. New nouns must pass from day one.

### 9.5 Rank order with grades

The section 4.3 score gains `+ 3 * standard_sourced`, for candidates that came from section 6.2. Within the same score, the grade order is standard, then regulatory, codified, convention, seminal, none. Within a grade, the order by `origin` is adopted, adapted, narrowed, broadened, borrowed, operationally coined.


## 10. Acceptance, by tier

All are change lines (EE-107 verbs) in a framework PR. PR #164's note says the vocabulary is the highest-risk change.

| Change | Line | Tier | Who accepts |
| --- | --- | --- | --- |
| New noun, no dependents yet | create/originate | costly | code checks, then capabilities review, then you approve the batch PR |
| New noun that closes baseline gaps or literal sites | create/originate plus the landing PR | costly | same |
| Alternate label, scope note, usage note | amend/append | low | capabilities function; you are notified |
| Meaning change on a noun with dependents | amend/revise | one_way_door when dependents exceed 10, else costly | you |
| Relabel (id kept) | amend/rename | costly | you |
| Deprecate an unused noun | amend/deprecate | costly | you |
| Merge two nouns | delete/merge, naming the successor | one_way_door | you |
| Stop-list entry | amend/append | low | capabilities function |
| New operationally coined or borrowed noun | create/originate with `none_fits` (operationally coined), or create/derive with a reason (borrowed) | costly at least; one_way_door when it would type more than 10 subjects | you, with a decision id in `own-meaning.json` |
| Grade promotion (section 9.1, 9.2) | amend/revise on `grade` | low when the code test passes, because it only records evidence | capabilities function; you are notified |
| Grade demotion | amend/revise on `grade` | low and automatic | notice to you |
| Replace an operationally coined noun with a standard label | amend/rename (id kept) | costly | you |

**Code checks that must pass first:**
- `node packages/naive/src/checks/check-nouns.ts`;
- `node schema/check-vocabulary.mjs` (as of 2026-11-02; since moved/removed);
- `node packages/naive/src/terms/admit.ts --check`;
- `node schema/check-glossary.mjs` (as of 2026-11-02; since moved/removed) (new).

## 11. Keeping it current and used

### 11.1 Five ratchets (shrink-only, the same mechanics as `evaluate` in `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L615-645)

- **Drift baseline `docs/glossary/drift-baseline.json` (as of 2026-11-02; since moved/removed).** It lists every term used in docs that is not a noun, alternate label, admitted term, package-local term or stop-list entry, as of the PR that adds the check.
  - A new unknown term in a doc fails CI.
  - A listed term that is now resolved must be removed.
  - An addition needs `approved`.
- **Literal baseline `docs/glossary/literal-baseline.json` (as of 2026-11-02; since moved/removed).** It lists every domain literal site from the code scan (section 12.2) that does not read a vocabulary object yet. The same three rules apply.
- **PR #164's `schema/vocabulary-baseline.json` (as of 2026-11-02; since moved/removed)** stays the third ratchet, for `vocabulary_parent`.
- **Standard baseline `docs/glossary/standard-baseline.json` (as of 2026-11-02; since moved/removed).** It lists the 86 live nouns with no resolvable `standard_ref`. It may only shrink, and new nouns must pass the draft gate (section 9.4).
- **Own-meaning list `docs/glossary/own-meaning.json` (as of 2026-11-02; since moved/removed)** (operationally coined and borrowed; proper names excluded). An addition needs `approved`, and the list is capped at 10% of live nouns (section 9.3, decided Nov 2).

### 11.2 Usage checks

`docs/glossary/usage.json` (as of 2026-11-02; since moved/removed) is generated, and is also the `usage.json` the term list's step 5 expects. For each live noun it counts:
- subjects whose `vocabulary_parent` is the noun (records, record types and modules, from `collectSubjects`);
- shapes that reference it;
- scope foreground lists;
- code literal sites that now read it through the loader;
- doc mentions.

**Flags:**
- `unused`: no parent use and no loader use 30 days after it was accepted (question G11). This proposes amend/deprecate, or delete/merge when another noun covers it.
- `doc-only`: used only in prose. That is fine for system nouns, and is reported for others.
- Function-level and system-level nouns are exempt from `unused`.

### 11.3 Stale marking (EE-089's missing piece)

- Each noun gets a `hash` of its meaning plus its shape, computed by code.
- A citing file records the hash it was written against. For modules, that is in the `// vocabulary_parent:` line as `noun:x#<hash8>`; question G12 asks whether to require it.
- When the hash changes, `check-glossary` lists every citing subject as stale. This is the `schema/terms/stale.ts` (as of 2026-11-02; since moved/removed) that EE-089 names.

### 11.4 Cadence

| When | What runs | Output |
| --- | --- | --- |
| Every PR (`test.mjs` (as of 2026-11-02; since moved/removed), which `.github/workflows/test.yml` runs) | intake on the diff only, drift ratchet, literal ratchet, vocabulary baseline, `admit.ts --check`, SKOS checks | pass or fail |
| Weekly (new `.github/workflows/glossary.yml` (as of 2026-11-02; since moved/removed), cron Monday 14:00 UTC, 8 AM CT) | full intake, rank, usage, stale report, then drafts for the top 10 | a report artifact; a draft PR only if you approve (question G10) |
| Monthly | unused and doc-only review | deprecate or merge proposals |

## 12. Backfill: finding what should be calling these objects

### 12.1 When a term becomes a vocabulary object instead of plain prose

A term becomes an object when at least one hard test and at least one spread test hold.

**Hard tests (what it is):**
- H1. It names a record type, or a field whose values carry domain meaning.
- H2. It is a function, capability, scope, decision class, tier, status or other enum that code branches on.
- H3. It appears as a code identifier, string literal, `switch` or `if` branch, `includes()` set, JSON key or config value that encodes domain meaning.
- H4. It has a shape, meaning fields other records must match.

**Spread tests (how far it reaches):**
- S1. It is used in 2 or more files, or by 2 or more functions or packages.
- S2. A decision, scope or gate refers to it.

**It stays prose when:**
- it appears in one doc only;
- it is a metaphor or a descriptive phrase;
- it is a command, path or file name;
- it is a generic programming word (string, object, item, list, run).

**Enum values** live inside their noun's shape (section 4.1, rule 6). The term becomes the noun, such as `decision status`, and its values become the enum.

### 12.2 The code and design scan

`schema/glossary/scan-code.ts` (as of 2026-11-02; since moved/removed) uses the TypeScript compiler API. `typescript` 5.9.3 is already a dev dependency (`package.json`), and it parses `.mjs` and `.ts` alike. It walks PR #164's `MODULE_ROOTS` (`schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L33-36) and finds:

| Pattern | Example found |
| --- | --- |
| Exported string-array constants | `export const PHASES = [...]` (`packages/naive/src/engine/decisions.ts` L44); `export const LEVELS = [...]` (`packages/naive/src/engine/visibility.ts` L21) |
| Non-exported string-array constants | `CODE_DIRS` (`packages/naive/src/engine/caching.ts` L192) |
| `===` and `!==` against a string literal | `d.status === "withdrawn"` (`packages/naive/src/engine/decisions.ts` L170); `top.then === "refuse"` (`packages/naive/src/engine/gate.ts` L130) |
| `case "x":` | `case "noul":`, `case "choice": case "classify":` (`packages/naive/src/router/orchestration/model-steps.ts` L358, L364) |
| `[...].includes(x)` | `["decided", "withdrawn"].includes(d.status)` (`packages/naive/src/router/orchestration/triggers.ts` L123) |
| Ternary chains over literals | `v === "day" ? ... : v === "hour" ? ... : v === "actor"` (`packages/naive/src/engine/caching.ts` L221) |
| JSON Schema `enum` arrays | `schema/*.schema.json` |
| Config values | `naive.config.json` check modes `off` and `warn` (`packages/naive/src/router/router.ts` L547-548) |
| Doc headings and definition tables | `docs/design/*.md` |

For each site, the scan:
1. groups literals compared against the same expression (such as `d.status`) into one set;
2. fingerprints the sorted set;
3. matches it to a noun shape enum, a noun's meaning text, or a data-model field.

Each site is written to `docs/glossary/backfill-map.json` (as of 2026-11-02; since moved/removed):

``json
{ "site": "packages/naive/src/engine/decisions.ts:44", "kind": "exported-const", "symbol": "PHASES",
  "values": ["discovery", "validation", "beachhead", "scale", "platform"],
  "match": { "object": "noun:phase", "how": "exact-set", "also": ["noun:venture shape.properties.phase.enum"] },
  "action": "replace-with-loader", "population": "P1-duplicated-enums" }
``

`how` is one of:
- `exact-set`;
- `subset`;
- `superset`;
- `name-only` (the symbol name matches a noun but the values do not);
- `none` (a candidate new noun, sent to intake).

### 12.3 Ranked backfill order, tied to PR #164's 389 gaps

Order by dependents times risk:
- a duplicated list that has already drifted comes first;
- a mechanical fix with many closures comes next;
- anything that needs a new noun waits for the loop.

| Order | Population | Size | Closes in the 389 | Needs new nouns? |
| --- | --- | --- | --- | --- |
| P1 | Duplicated enums that already match or contradict a noun: phase (`packages/naive/src/engine/decisions.ts` L44 against `noun:venture`'s shape), layers (`packages/naive/src/engine/caching.ts` L192 with 9, `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L33-36 with 10, `layer` noun with 6) | 2 sets | 0 (literal ratchet) | no, but the layer list needs your call (question G13) |
| P2 | Record types whose noun exists: account, board, business-models, data-model, decision, decision-rights, evidence, exit, founder, founder-agreement, handoff, integration, kit, pillar, product, provenance, publication-policy, publications, reference, role, strategic-foundation, team-plan, telos, venture-profile, workspace, plus decision-record, department, exit-criteria, need-now. `customer` waits for question G8 | 29 record types | 29 | no |
| P3 | Instance records of those types | 42 records | 42 | no |
| P4 | The 6 record types the competitor research needs: research-cell, research-source, research-claim, research-citation, judgment, artifact | 6 | 6 | yes, ranks 4 to 9 |
| P5 | Code enum families with no noun: decision status, boundary, render state; decision-right level; visibility level; answer kind; step outcome; trigger run status; cache status; gate action; write mode | about 12 sets | 0 (literal ratchet) | about 4 new nouns; the rest are values in existing nouns' shapes |
| P6 | Modules, one PR per folder: schema 131, interface 30, platform 23, knowledge 7, purpose 6, operations 4, evidence 3, frameworks 2, governance 1 | 207 | 207 | mostly no; a check module's parent is the noun it checks (`check-telos.mjs` gets `noun:telos`) |
| P7 | Remaining record types and their records, as the loop accepts nouns | 92 record types, 13 records | 105 | yes |

Totals: 29 + 42 + 6 + 207 + 105 = 389.

P8 runs beside these and is outside the 389: **`standard_ref` and SKOS mapping for the 86 live nouns in `standard-baseline.json`.** It runs one PR per source, in this order:
1. APQC, for the 6 function and capability nouns, through the existing `apqc-pcf-cross-industry` record;
2. W3C PROV, Schema.org, FIBO and JSON Schema (new records);
3. regulatory and codified sources;
4. Next.js, Git and the other conventions;
5. seminal works;
6. the 11 nouns graded none last, each sorted operationally coined or borrowed, with `none_fits` or a replacement.

### 12.4 How each fix lands

For each population there is one PR, of at most about 40 subjects, so review stays small:
1. **The noun first.** If the population needs a new noun, its loop PR merges first (section 10).
2. **Shape with the enum.** Add or extend the noun's shape in `schema/vocabulary.json` (as of 2026-11-02; since moved/removed) `shapes`, so the enum lives in one place.
3. **A loader, not a literal.** PR #164's `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) gains small read-only accessors:
   - `enumOf(id, path?)` returns the enum at a shape path;
   - `labelOf(id)`;
   - `assertTerm(id)` throws on an unknown id.

   Each reads `schema/vocabulary.json` (as of 2026-11-02; since moved/removed) once and caches it. `export const PHASES = [...]` becomes `export const PHASES = enumOf("noun:phase")`.
4. **Generated types.** `schema/types/vocabulary.d.ts` (as of 2026-11-02; since moved/removed) is generated from the shapes, so `.ts` callers get the literal unions. Its staleness is checked by `test.mjs` (as of 2026-11-02; since moved/removed), like the other generated files.
5. **`vocabulary_parent`.**
   - A module gets `// vocabulary_parent: noun:x` in its first 40 lines.
   - A record type gets the field in `packages/naive/src/records/data-model.json`.
   - An instance record gets the field. It is shape-checked, so a mismatch fails (`evaluate` L629-631).
6. **Shrink the baselines.** Remove the closed ids from `schema/vocabulary-baseline.json` (as of 2026-11-02; since moved/removed) and the closed sites from `docs/glossary/literal-baseline.json` (as of 2026-11-02; since moved/removed). The checks fail if a closed id is left in (L636).
7. **No behavior change.** For each replaced constant, a test asserts the loader returns exactly the old literal, in order.

### 12.5 Starter sample from the repo

All at `cb502f9`.

| Site | Literal or symbol | Maps to | Fix |
| --- | --- | --- | --- |
| `packages/naive/src/engine/decisions.ts` L44 | `PHASES = ["discovery", "validation", "beachhead", "scale", "platform"]` | `noun:phase`; the same five are `noun:venture`'s `phase` enum in PR #164 `schema/vocabulary.json` (as of 2026-11-02; since moved/removed) | shape on `noun:phase`; `enumOf("noun:phase")`; `noun:venture`'s shape points at it |
| `packages/naive/src/engine/caching.ts` L192 | `CODE_DIRS`, 9 dirs | `noun:layer` says six layers; `MODULE_ROOTS` in `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L33-36 has 10 (adds frameworks) | one list in `schema/layer.json` (as of 2026-11-02; since moved/removed) or a `noun:layer` shape; both read it (question G13) |
| `packages/naive/src/engine/visibility.ts` L21 | `LEVELS = ["public", "variant", "internal", "confidential"]` | none | new noun `visibility level` with enum |
| `packages/naive/src/engine/decisions.ts` L168-176 | `"withdrawn"`, `"deferred"`, `"stale"`, `"overdue"`, `"done"`, `"later"`, `"waiting"`, `"now"` (render); `"open"`, `"working"`, `"firm"` (firmness); `"async"`, `"sync"` (lane) | `noun:decision` | shape properties `status`, `render`, `firmness`, `lane` with enums |
| `packages/naive/src/engine/decisions.ts` L154-157 | `"fail-open"`, `"fail-closed"` | `noun:decision` boundary | enum in shape |
| `packages/naive/src/router/orchestration/triggers.ts` L115, L123-125 | `"raised"`, `"decided"`, `"withdrawn"`, `"skipped"` | trigger run status; decision status | `noun:trigger` (new) run status enum; read decision status from `noun:decision` |
| `packages/naive/src/router/router.ts` L262-268 | `"escalate"`, `"recommend-approve"` | `noun:decision-right` | level enum in its shape |
| `packages/naive/src/router/router.ts` L547-548 | check modes `"off"`, `"warn"` | none | values in the `naive-config` record type's shape (`packages/naive/src/records/naive-config.schema.json`) |
| `packages/naive/src/router/router.ts` L623 | `writes === "pull-request"` and `"draft"` | `noun:draft`, plus a write mode | write mode enum |
| `packages/naive/src/engine/gate.ts` L127-132 | `top.then`: `"owner"`, `"refuse"`, draft | `noun:write-gate` (new, rank 2) | `then` enum in its shape |
| `interface/provenance.mjs` (as of 2026-11-02; since moved/removed) L134 | `activity: "gate"` | provenance activity | activity enum on `noun:provenance-log` |
| `packages/naive/src/router/orchestration/model-steps.ts` L357-366 | `"noul"`, `"choice"`, `"classify"`, `"score"` | `noun:judgment` (new, rank 4) | answer kind enum |
| `packages/naive/src/router/orchestration/model-steps.ts` L78-82 | `"expected"`, `"uncaught"`, `"uncertain"`, `"overruled"`, `"answer"`; kinds `"code wins"`, `"below threshold"` | `noun:judgment` | outcome enum |
| `packages/naive/src/engine/caching.ts` L221 | vary values `"day"`, `"hour"`, `"actor"`, `env:` | cache key | enum on a `cache entry` noun, or stop list (question G9 applies) |
| `packages/naive/src/engine/caching.ts` L283-285 | `"off"`, `"hit"`, `"stale"` | cache status | enum |
| `packages/naive/src/terms/ontology-gate.ts` L196-198 | `noun.level !== "function"`, `status === "retired"` | ontology level and status | enums on the ontology's own schema; the loader reads them |
| `packages/naive/src/terms/ontology.json` L386 against PR #164 `tiers` | `tier` | collision | question G6 |
| `packages/naive/src/records/data-model.json` L1626 | record type `customer` | no legal bare noun | question G8 |

## 13. The harness

### 13.1 CLI

These run as `naive glossary <command>`, with the same entry also wired to `node schema/glossary/loop.mjs <command>` (as of 2026-11-02; since moved/removed). Every command except `draft` is deterministic and offline.

| Command | Does | Writes |
| --- | --- | --- |
| `intake [--diff <base>]` | runs the extractors (section 3) | `docs/glossary/backlog.json` (as of 2026-11-02; since moved/removed) |
| `triage` | match rules and SKOS checks; proposes an action per entry | the same file, `action` field |
| `rank` | the section 4.3 score | the same file, `rank` field |
| `scan-code` | the section 12.2 scan | `docs/glossary/backfill-map.json` (as of 2026-11-02; since moved/removed) |
| `draft --top N` | spawns `vocabulary-drafting@capabilities`; the model step drafts, code checks | `docs/glossary/drafts/*.json` |
| `accept <id>` (a person only) | moves a draft into `packages/naive/src/terms/ontology.json` and `schema/vocabulary.json` (as of 2026-11-02; since moved/removed) as a create/originate line; regenerates `packages/naive/src/terms/ontology.md` | those files |
| `apply --population <P>` | mechanical landing for one population: loader swaps, `vocabulary_parent`, baseline shrink | code and baseline files |
| `usage` | section 11.2 | `docs/glossary/usage.json` (as of 2026-11-02; since moved/removed) |
| `stale` | section 11.3 | a report |
| `check` | everything CI needs: drift and literal ratchets, backlog schema, SKOS, stale, generated files current | exit code |

### 13.2 Files

- `schema/glossary/` (as of 2026-11-02; since moved/removed) holds:
  - `loop.mjs`;
  - `normalize.ts`;
  - `extract-docs.ts`;
  - `extract-records.ts`;
  - `scan-code.ts`;
  - `triage.ts`;
  - `rank.ts`;
  - `usage.ts`;
  - `stale.ts`;
  - `apply.ts`;
  - `glossary-loop-test.ts`.
- `schema/check-glossary.mjs` (as of 2026-11-02; since moved/removed) is the CI entry.
- `schema/glossary-backlog.schema.json` (as of 2026-11-02; since moved/removed) and `schema/backfill-map.schema.json` (as of 2026-11-02; since moved/removed) are the record schemas, registered in `packages/naive/src/records/data-model.json` with `vocabulary_parent`.
- `docs/glossary/` (as of 2026-11-02; since moved/removed) holds:
  - `backlog.json`;
  - `drift-baseline.json`;
  - `literal-baseline.json`;
  - `stoplist.json`;
  - `usage.json`;
  - `backfill-map.json`;
  - `drafts/` (as of 2026-11-02; since moved/removed).
- Fixtures go in `schema/fixtures/glossary/` (as of 2026-11-02; since moved/removed), following `schema/fixtures/ontology-gate/` (as of 2026-11-02; since moved/removed).

### 13.3 CI wiring

- Add steps to `test.mjs` (as of 2026-11-02; since moved/removed), after "nouns" (L26):
  - `["glossary: drift, literals, SKOS, stale", "node", ["schema/check-glossary.mjs"]]` (as of 2026-11-02; since moved/removed);
  - `["glossary loop tests", "node", ["schema/glossary/glossary-loop-test.ts"]]` (as of 2026-11-02; since moved/removed);
  - `["term engine admitted.json is current", "node", ["packages/naive/src/terms/admit.ts", "--check"]]`.
- `.github/workflows/test.yml` already runs `node test.mjs` on every pull request with `fetch-depth: 0`, which the ratchet's merge-base read needs (`previousBaseline`, `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L596-607).
- A new `.github/workflows/glossary.yml` (as of 2026-11-02; since moved/removed) runs the weekly job (section 11.4).

## 14. Build spec for Claude Code: ordered PRs

Each PR:
- is based on `framework` after PR #164 merges;
- runs `node test.mjs` green;
- adds its own tests;
- changes nothing outside its listed files.

**G1. Decision record and ontology fields.**
- Files: `docs/decisions/decisions.json` (the next free id, EE-101 or later: the glossary loop, answers to section 15); `packages/naive/src/terms/ontology.json` gains optional `id`, `broader`, `related`, `alt_labels`, `scope_note`, `hash`; `packages/naive/src/terms/ontology-gate.ts` validates them; `packages/naive/src/checks/check-nouns.ts --md` prints them.
- Accept when:
  - every existing noun still passes;
  - `id` equals `nounId(noun)` when present;
  - the SKOS rules in section 4.2 are enforced.
- Tests:
  - a cycle fails;
  - `related` alongside a `broader` path fails;
  - two `broader` values fail;
  - a duplicate `alt_label` fails;
  - a scoped noun with a bare `broader` fails;
  - a valid tree passes.

**G2. Normalizer and stop list.**
- Files: `schema/glossary/normalize.ts` (as of 2026-11-02; since moved/removed), `docs/glossary/stoplist.json` (as of 2026-11-02; since moved/removed).
- Accept when it is pure and has 100% branch tests.
- Tests:
  - "Exit-Criteria" and "exit criterion" give the same key;
  - "customer@finance" keeps its scope;
  - "ICP" stays "icp";
  - "repository (repo)" matches "repo";
  - stop-list words are dropped.

**G3. Extractors and backlog.**
- Files: `extract-docs.ts`, `extract-records.ts`, `loop.mjs intake`, `schema/glossary-backlog.schema.json` (as of 2026-11-02; since moved/removed), `docs/glossary/backlog.json` (as of 2026-11-02; since moved/removed).
- Accept when:
  - the output is byte-stable on a rerun;
  - code blocks and paths are skipped;
  - `internal-terms` patterns are never emitted.
- Tests:
  - a fixture doc with a backticked term, a bold label, a command and a path yields exactly the one term;
  - a fixture data model with an unmatched record type yields it;
  - a term-list fixture yields only pending terms.

**G4. Triage and rank.**
- Files: `triage.ts`, `rank.ts`.
- Accept when every backlog entry gets exactly one action from section 4.1.
- Tests:
  - same meaning becomes an alternate label;
  - different meaning with a function owner becomes `name@function`;
  - system-wide becomes a distinct label;
  - a field becomes a shape property;
  - an enum value becomes a shape enum;
  - the rank order matches a hand-computed fixture.

**G5. Drift ratchet.**
- Files: `schema/check-glossary.mjs` (as of 2026-11-02; since moved/removed), `docs/glossary/drift-baseline.json` (as of 2026-11-02; since moved/removed), the `test.mjs` (as of 2026-11-02; since moved/removed) step.
- Reuse `evaluate`-style logic from `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) L615-645. Export a shared `ratchet()` there rather than copying it.
- Accept when the baseline is generated from the current tree, and CI is green with it.
- Tests:
  - a new unknown doc term fails;
  - a resolved listed term must be removed;
  - an addition without `approved` fails;
  - an addition with `approved` passes;
  - no previous baseline on `framework` means the start case.

**G6. Usage and stale.**
- Files: `usage.ts`, `stale.ts`, `docs/glossary/usage.json` (as of 2026-11-02; since moved/removed), noun `hash` computed in G1's field.
- Accept when every live noun has a count, and changing a noun's meaning lists its citing subjects.
- Tests:
  - a noun with a parent use is used;
  - one with none past the window is `unused`;
  - function nouns are exempt;
  - a meaning change produces a stale list.

**G7. Code scan.**
- Files: `scan-code.ts`, `schema/backfill-map.schema.json` (as of 2026-11-02; since moved/removed), `docs/glossary/backfill-map.json` (as of 2026-11-02; since moved/removed), `docs/glossary/literal-baseline.json` (as of 2026-11-02; since moved/removed).
- Accept when:
  - the scan finds every site in section 12.5;
  - the output is byte-stable;
  - the literal ratchet is wired into `check-glossary`.
- Tests: fixtures with an exported const, a `switch`, an `includes` set, a ternary chain, a JSON Schema enum and a comment containing literals (ignored), each mapped with the right `how`.

**G8. Loader accessors and generated types.**
- Files: `schema/vocabulary.ts` (as of 2026-11-02; since moved/removed) (`enumOf`, `labelOf`, `assertTerm`), `schema/types/vocabulary.d.ts` (as of 2026-11-02; since moved/removed) (generated), a `test.mjs` (as of 2026-11-02; since moved/removed) staleness step.
- Accept when the accessors are read-only and cached, and an unknown id throws.
- Tests:
  - `enumOf("noun:venture", "phase")` returns the five phases;
  - an unknown id throws;
  - the generated `.d.ts` matches its regeneration.

**G9. Scope and drafting.**
- Files: `noun:scope` and `noun:noun-draft` shapes, `vocabulary-drafting@capabilities` scope (revision 4, section 7.2), `schema/generators/noun.mjs` (as of 2026-11-02; since moved/removed) (EE-099 pattern), the `loop.mjs draft` and `accept` commands.
- Accept when:
  - `draft` writes only under `docs/glossary/drafts/` (as of 2026-11-02; since moved/removed);
  - `accept` refuses a non-person actor (as `packages/naive/src/router/router.ts` L609-610 refuses an unapproved decided write);
  - `accept` writes one create/originate change line.
- Tests:
  - a stand-in model draft that violates SKOS is rejected by code;
  - a valid draft is accepted only by a person;
  - `packages/naive/src/terms/ontology.md` is regenerated.

**G10. First noun batch: the collisions.**
- Covers `impact tier`, `MAD tier`, `write gate`, `phase gate`, and the customer record type, after questions G6 to G8.
- Accept when:
  - `check-nouns` passes;
  - the retired patterns catch the old bare uses where they were relabeled;
  - every code site in section 12.5 that used the old word still passes tests.

**G11. Second noun batch: competitor research.**
- Covers judgment, artifact, research cell, research source, research claim, research citation, competitor, price tier, and the remaining competitor nouns.
- Lands P4 (6 record types).

**G12. Backfill P1:** phase and layer. One list, both callers on the loader, a no-behavior-change test.

**G13. Backfill P2 and P3:** 29 record types and 42 records get `vocabulary_parent`. Run `apply --population P2`, then `P3`. The baseline drops by 71.

**G14. Backfill P5:** code enum families, about 12 sets. Split into two PRs: decisions and triggers; then model steps, caching and the gate.

**G15. Backfill P6:** modules, one PR per folder. Schema is split into three, about 44 each. 207 closed in total.

**G16. Weekly workflow:** `.github/workflows/glossary.yml` (as of 2026-11-02; since moved/removed) with the cron. It opens a draft PR only after question G10. P7 then runs continuously from the weekly batches.

The next five PRs come from revision 2. Build G17 to G19 right after G4, and before G9, so drafting starts with the draft gate in place.

**G17. Reference records, extended, and the draft gate.**
- Files:
  - the reference schema (the one `packages/naive/src/checks/check-nouns.ts` reads) gains `authors`, `year`, `quote` (at most 300 characters), `mapping` (`type`, `concept`, `confirmed_by`, `reason`), `version`, `jurisdiction`, `superseded_by`, and kinds `regulation`, `dictionary` and `body-of-knowledge`;
  - `packages/naive/src/terms/ontology.json` gains `standard_ref` and `grade`;
  - `packages/naive/src/terms/ontology-gate.ts` enforces section 9.4;
  - `docs/glossary/standard-baseline.json` (as of 2026-11-02; since moved/removed) (86 entries).
- Accept when:
  - every existing reference still validates;
  - a new noun without a resolving `standard_ref` fails;
  - `standard_ref: "none"` without `none_fits` fails;
  - a mapping that disagrees with the reference's `stance` fails.
- Tests:
  - blank standard fails;
  - an unknown reference id fails;
  - `adopted` with `closeMatch` fails;
  - `deliberateDifference` without `reason` fails;
  - a valid `exactMatch` passes;
  - the baseline shrinks only.

**G18. Grade and origin computation, and the own-meaning ratchet.**
- Files: `schema/glossary/grade.ts` (as of 2026-11-02; since moved/removed), `docs/glossary/own-meaning.json` (as of 2026-11-02; since moved/removed), a `check-glossary` step.
- Accept when:
  - the grade and origin are computed, never typed, and a hand-set `grade` or `origin` that disagrees fails;
  - the cap is enforced;
  - an addition to `own-meaning.json` without `approved` fails.
- Tests, one fixture per grade:
  - a `standard` record with `exactMatch` gives standard;
  - `law` with a jurisdiction gives regulatory;
  - `dictionary` gives codified;
  - 5 independent sources give convention;
  - one seminal source gives seminal;
  - `exactMatch` with a quote gives adopted, and without a quote gives adapted;
  - `broadMatch` (theirs is broader) gives narrowed, and `narrowMatch` gives broadened;
  - `relatedMatch` gives borrowed;
  - `none` plus `none_fits` gives grade none, origin `operationally-coined`;
  - an 11% own-meaning share fails at a 10% cap, and a `designation: proper-name` noun does not count;
  - a proper-name noun with `broader` instead of `instance_of` fails, and so does one used as a kind (a `vocabulary_parent` of many records, or an `instance_of` target).

**G19. Standards intake importers.**
- Files: `schema/glossary/standards/{prov,schemaorg,fibo,naics,grade,apqc}.ts`, `docs/glossary/standards/*.json`.
- Licenses are checked before committing each extract. FIBO is MIT; APQC and Schema.org must be confirmed.
- Accept when:
  - the extracts are byte-stable;
  - only the branches listed in section 6.2 are imported;
  - matching proposes `exactMatch` or `closeMatch` with no model.
- Tests:
  - PROV `Activity` matches `provenance`;
  - FIBO `Customer` matches `customer@finance` as `broadMatch` (theirs is broader, so origin narrowed) or `closeMatch`;
  - an unused standard concept that the records use becomes a backlog candidate graded standard.

**G20. Promotion and demotion.**
- Files: `schema/glossary/promote.ts` (as of 2026-11-02; since moved/removed), plus quarterly review of operationally coined and borrowed nouns in the weekly job.
- Accept when:
  - P1 to P5 and section 9.2's tests are code;
  - the author-overlap check uses reference `authors` (OpenAlex optional, behind a flag, never in CI);
  - demotion is automatic.
- Tests, from the Kahneman cases as fixtures:
  - planning fallacy, with Buehler 1994 as an independent author group, passes P1 when 5 sources exist;
  - focusing illusion, with only Kahneman-coauthored sources, fails P1;
  - System 1 with a `superseded_by: "Type 1"` record does not promote to standard;
  - a "pre-mortem" medical source with a quote that does not map is rejected by P3.

**G21. Backfill P8:** `standard_ref` and mappings for the 86 nouns, one PR per source, in the section 12.3 order. `standard-baseline.json` shrinks each time.

## 15. Decisions for you, one each

| # | Question | Recommended answer |
| --- | --- | --- |
| G1 | Is `packages/naive/src/terms/ontology.json` the single noun registry, with the term engine as an admission step and package glossaries local only? | Yes |
| G2 | Does every new noun go through engine admission (EE-095 as written), or only contested and role or act terms? | Only contested and role or act terms. Record-type nouns get shape checks instead. Amend EE-095 to say so |
| G3 | What tier is adding a noun? | Costly, accepted by you as a batch PR. A meaning change with more than 10 dependents, or a merge, is one_way_door |
| G4 | One broader per noun? | Yes |
| G5 | Must `broader` be checked by the engine's `is_a` when both terms have definitions? | Yes. Otherwise it is declared and flagged as unchecked |
| G6 | How to split `tier`? | "impact tier" for low, costly and one_way_door; "MAD tier" for MAD's four levels. No bare `tier` |
| G7 | How to split `gate`? | "phase gate" (matches the admitted engine term) and "write gate" for `packages/naive/src/engine/gate.ts`. No bare `gate` |
| G8 | Which sense does the `customer` record type claim? | `customer@marketing-and-sales`. Finance reads it through `customer@finance` links |
| G9 | Are enum values separate nouns? | No. They are values in their noun's shape, unless they carry their own fields or rules |
| G10 | May the weekly job open a draft PR by itself? | Yes, a draft only. It never merges, and you or the reviewer approve |
| G11 | When is an accepted noun "unused"? | No parent or loader use 30 days after acceptance, which leads to a deprecate or merge proposal |
| G12 | Must citing modules pin the noun hash (`noun:x#hash8`)? | Not yet. Start with stale reports by parent id. Pin later if stale reports are noisy |
| G13 | Which layer list is right? | The `layer` noun's six layers for "layer". The code roots (schema, platform, packages, frameworks) are a separate `module root` list in one file that both checks read |
| G14 | How are terms labeled? | **Decided Nov 2:** three labels. Scope is the `name@function` subject field. Origin is computed: adopted, adapted, narrowed, broadened, borrowed or operationally coined (id `operationally-coined`). Grade is computed: standard (siblings regulatory, codified), convention (sibling seminal) or none. "Scoped sense" and "invention" are dropped as labels. Status stays separate, and a retired noun keeps its last labels. Also decided Nov 2: `adopted` requires a quoted definition, and without a quote the origin is `adapted` |
| G15 | How many independent sources make an operationally coined term a convention (N)? | 5 sources from 3 author groups over 2 years, each with a confirmed quote |
| G16 | What makes a convention a standard? | One record from a standards body, a regulator, or a professional body's dictionary or body of knowledge, mapped exact or close, checked within 12 months, not superseded |
| G17 | What is the cap on terms whose meaning is ours? | **Decided Nov 2:** 10% of live nouns, counting operationally coined plus borrowed and excluding proper names, with a shrink-only list where each addition carries your decision id |
| G18 | What tier is a new operationally coined or borrowed noun? | Costly. One_way_door when it would type more than 10 subjects |
| G19 | How often are operationally coined and borrowed nouns reviewed? | Quarterly, rerunning the standards intake and the promotion test |
| G20 | Do citation counts gate promotion? | No. They only rank candidates for review, because homonyms and title noise distort them |
| G21 | Which standards are imported first? | W3C PROV, FIBO, NAICS and GRADE, whose licenses are clear or public. Then APQC and Schema.org once their licenses are confirmed |
| G22 | Is the free-text `standard` field kept? | Yes, for display only. Code reads `standard_ref` and `mapping` |
| G23 | Where does "proper name" go? | **Decided Nov 2:** proper names are classified in the glossary itself. Placement (rev 4): a fourth computed-and-checked label, `designation`, using ISO 1087:2019 types (term, proper-name, appellation, symbol). Proper names stay out of the 10% cap |
| G24 | Are named methods (Product Anatomy, Succession Matrix) proper names, and are product names `appellation` or `proper-name`? | **Decided Nov 2:** the methods are proper names, with the one-referent check. Product names are `appellation` (ISO 1087:2019 3.4.3), and venture and company names are `proper-name`. Neither counts toward the 10% cap |

## 16. Risks

1. **Over-objectifying.** Turning every word into an object slows writing and bloats the vocabulary. The hard and spread tests (section 12.1) and the stop list are the brake.
2. **Drafts sound right and are wrong.** A model drafts meanings. Standards first with a cited source, real sites, engine admission for contested terms, and your batch approval are the guard.
3. **Ratchet friction.** A shrink-only drift list can block a docs PR for one new word. Section 4.1's actions give the author a quick path (alternate label, stop list or draft). Question G10's weekly batch keeps the queue short.
4. **Two meanings stay hidden.** A label can match while the meaning differs. Same-word candidates are triaged by meaning, not string, and contested ones go through the engine.
5. **Loader indirection.** Replacing a literal with `enumOf()` can hide values from a reader. Generated types and the no-behavior-change tests keep it visible and safe.
6. **Research notes outside the repo.** Terms in these research notes reach the loop only through a committed public term-list file, so nothing private leaks (`TERM_LIST_2026-11-01.json` `_about`).
7. **Grades that look certain.** A computed grade can hide a weak mapping. The mapping must carry a quote confirmed by a person, and grades are rechecked every 12 months.
8. **Standards churn.** APQC, Schema.org and FIBO version their vocabularies. Mappings pin `version`, and a version bump re-runs matching and opens review.
9. **License limits on standard extracts.** Some frameworks restrict redistribution. Store only ids, labels and 300-character definitions, and check each license before committing.
10. **A cap on own-meaning terms pushes toward mislabeling.** Under a cap, authors may stretch a convention to avoid an operationally coined term. The `stance` and mapping agreement check (section 9.4, rule 4) and `deliberateDifference` with a reason make that visible.
