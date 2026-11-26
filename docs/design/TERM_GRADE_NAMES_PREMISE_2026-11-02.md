<!-- Placement: tchjhnsn/Naive docs/design/TERM_GRADE_NAMES_PREMISE_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Attacking "scoped sense" and "invention", and choosing past participles for how we took a term

Prepared Mon Nov 2, 2026, about 5:50 PM CT, for Torian. Research and design only. Nothing in the repo, any PR or any account was changed. Inputs: `glossary-loop-harness.v2.md` (as of 2026-11-02; since moved/removed) (rev 2) section 7, and `tchjhnsn/everything-ecosystem` read through the GitHub API: `framework` at the time of reading, and PR #164 head `7da7909` for `schema/vocabulary.json` (as of 2026-11-02; since moved/removed). That commit does not resolve in this repository. EE-113 still names preserved PRs 164 and 163.

**Update, Nov 2, about 6:35 PM CT (applied with glossary rev 4).** Torian decided:
- every term carries three labels: scope (the `name@function` subject field), origin (adopted, adapted, narrowed, broadened, borrowed, operationally coined) and grade (standard with siblings regulatory and codified, convention with sibling seminal, none);
- "scoped sense" and "invention" are dropped as labels;
- the origin first proposed here as `coined` is named `operationally-coined` (operationally coined). It still counts toward the rare, 10% cap, and `own-meaning.json` stays.

T1 is decided. T2 and T3 were decided at about 6:35 PM CT: `adopted` requires a quoted definition, otherwise `adapted`; operationally coined and borrowed terms count toward the 10% cap, and proper names do not. The analysis below keeps its original wording except for the origin name.

Your two asks, verbatim: "Attack the premise of scoped sense and invention as terms we should use." and "research what past particle verbs to add to these noun in order to describe whether we adopted them, adapted/scoped is, etc."

## 0. The answer in plain words

1. **Rev 2's ladder mixes two questions into one list.** One question is how much authority the source has (standard, regulatory, codified, convention, seminal). The other is what we did with the term (took it as is, changed it, narrowed it, made it up). "Scoped sense" and "invention" answer the second question, but they sit on a ladder that answers the first.
2. **"Scoped sense" fails as a grade.** Both nouns that have it cite a standard (FIBO and Schema.org). On rev 2's ladder they rank below every convention, even though their sources outrank conventions. The `@function` part is a subject field, a separate attribute that ISO 1087 and TBX already name. Rev 2 also gets the SKOS direction wrong for it (section 2.3).
3. **"Invention" fails as a name, but the rule behind it stands.** The rule is that terms whose meaning is ours alone should be rare. That holds. But the word assumes the new word is what matters. None of the 11 "ours" nouns is a new word: 8 are compounds of ordinary words, 2 are ordinary words given our meaning, and 1 is a proper name. What makes them costly is that their meaning has no outside source. "Invention" also already has a legal meaning in patent law.
4. **Recommended replacement: two fields, plus the existing scope suffix (decided Nov 2 as three labels: scope, origin, grade).**
   - `grade` keeps the authority ladder: standard (with regulatory and codified), convention (with seminal), or `none`.
   - `origin` is a past participle for what we did: **adopted, adapted, narrowed, broadened, borrowed, operationally coined**.
   - The labels become "standard, adopted" or "none, operationally coined".
5. **Code computes `origin` from the SKOS mapping rev 2 already requires.** Nobody types it by hand, and it adds no new verbs or kinds. Every origin except `operationally-coined` is written as EE-107 `create/derive` naming the source. `operationally-coined` is `create/originate`. Later changes use the amend and delete kinds that already exist.
6. **Three open decisions**, in section 6.

## 1. What rev 2 says, and the premise under each name

Rev 2 section 7 has one `grade` per noun, ranked as follows. "Means" is quoted from rev 2.

| Rank | Grade | Means (rev 2) |
| --- | --- | --- |
| 1 | standard, with siblings regulatory and codified | defined by a standards body, a regulator, or a professional dictionary |
| 2 | convention, with sibling seminal | de facto usage, or one seminal work |
| 3 | scoped-sense | "our narrowing of a graded term to one function" |
| 3 (rarest) | invention | "ours; nothing fits" |

Each premise, written down:

- **P-A, the ladder.** A noun's provenance fits in one value on one ordered scale.
- **P-B, scoped sense.** Narrowing a term to one function is a lower level of authority, below convention. The relation to a parent term is a grade, not a relation.
- **P-C, invention.** The property worth tracking for "ours" terms is how new the word is. One bucket covers every term with no source.
- **P-D, the words.** "Invention" and "scoped" are free of other meanings in Naive.

## 2. Testing each premise

### 2.1 P-A: one ordered scale

**What would show it false:** standards that record "how authoritative is the source" apart from "how we used it". If two separate fields are the normal practice, one scale is the odd one out.

**Evidence:**

| Standard | Authority of the source | How the term was taken | Separate? |
| --- | --- | --- | --- |
| OMG SBVR, as described in *SBVR Speaks* (8) ([BRCommunity](https://www.brcommunity.com/articles.php?id=b306)) | the `Source` caption cites the reference ([*SBVR Speaks* (6)](https://www.brcommunity.com/articles.php?id=b288)) | "Definition Origin ... classifies a definition based on whether it is owned by its speech community or adopted by its speech community from an identified source" | yes |
| OMG Commons Annotation Vocabulary ([RDF](https://www.omg.org/spec/Commons/AnnotationVocabulary.rdf)), used by FIBO | the cited source | `directSource`: "quoted reference"; `adaptedFrom`: "adapted (i.e., is compatible with but not quoted)" | yes |
| IATE reliability codes ([IATE help](https://online-help.iate.europa.eu/entry-overview/entry-structure/tl/)) | 4 stars: "confirmed by a trusted and authoritative source"; 3 stars include "the common designation of the concept in its field" | not in the reliability code; a neologism "not ... sanctioned by a competent body" stays at 2 stars | yes, reliability is its own field |
| TBX ([TBX-Basic](https://www.tbxinfo.net/ns/dct/basic), [namespace docs](https://tbxinfo-c.byuling.net/tbx-namespaces/)) | `source`, and `normativeAuthorization` for standardization status | `administrativeStatus` (preferred, admitted, deprecated, superseded, standardized, legal, regulated) | yes, three fields |
| ISO 25964-2 mapping types ([ISO](https://www.iso.org/standard/53658.html), [preview](https://webstore.ansi.org/preview-pages/ISO/preview_ISO+25964-2-2013.pdf)) | the target vocabulary | exact equivalence, inexact, partial, broader (BM), narrower (NM), associative (RM) | the mapping type is the relation alone |
| W3C SKOS ([Reference §10](https://www.w3.org/TR/skos-reference/#mapping)) | the target concept scheme | exactMatch, closeMatch, broadMatch, narrowMatch, relatedMatch | the property is the relation alone |

**Verdict: P-A is false.** Each of the six standards keeps the source and the relation in separate places. My search found none that ranks "how we used it" on the same ladder as "how authoritative the source is". That search was not exhaustive. Naive already keeps them apart in one place: reference records carry `kind` (the source type) and, separately, `stance.is` (adopted 19, adapted 5, alternative 2, read in rev 2 and confirmed on Nov 2 in `purpose/references/references.json` (as of 2026-11-02; the current file is `packages/naive/src/records/layers/purpose/references/references.json`).

### 2.2 P-B: scoped sense is a grade

**What would show it false:** scoped-sense nouns whose sources outrank convention, or a `@function` part that means something besides authority.

**Evidence:**
- Only two live nouns are scoped, and both cite a standard. In `packages/naive/src/terms/ontology.json` on `framework`, `customer@finance` cites "FIBO (Financial Industry Business Ontology), Customer" and `customer@marketing-and-sales` cites "Schema.org Customer". Rev 2 grades them below "repository (Git)" and "cap table", which are conventions.
- Rev 2 contradicts itself here. It says scoped-sense "inherits a graded parent". So the grade already exists (the parent's), and the noun adds a relation to it.
- The `@function` part names the owning function. Terminology work calls this a "subject field": the term is used in ISO 704 and by Valeontis and Mantzari (section 2.3), and TBX-Basic carries it as `subjectField` ([TBX-Basic](https://www.tbxinfo.net/ns/dct/basic)). `packages/naive/src/terms/ontology.md` L18 on `framework` already calls it a "scoped noun" and defines it as a naming rule, not a level.
- **Rev 2 has the SKOS direction backwards for this case.** Its table says a scoped sense is "`narrowMatch` to a graded noun", and G18's test says "`narrowMatch` plus `@` gives scoped-sense". But rev 2 section 9.4 itself says `narrowMatch` means "theirs is narrower". SKOS S41 makes `broadMatch` a sub-property of `broader` ([SKOS Reference §10.3](https://www.w3.org/TR/skos-reference/#mapping)), so "ours narrows FIBO Customer" is `noun:customer@finance skos:broadMatch fibo:Customer`. The single grade hid this mistake, and a separate relation field makes it visible.

**Verdict: P-B is false.** A scoped noun carries three separate facts:
- the source's grade (here, standard);
- the relation to that source (narrowed, if the mapping check confirms it);
- the subject field (`finance`).

Ranking it as a grade lowered two standard-backed nouns and hid a direction error.

### 2.3 P-C: novelty of the word is what matters

**What would show it false:** "ours" nouns whose words are not new, and a terminology standard that splits the "ours" bucket.

**Evidence from Naive.** These are the 11 live nouns whose `standard` reads "ours" in `packages/naive/src/terms/ontology.json` on `framework`, sorted by ISO 704 term-formation method. I sorted them by reading the strings. This is not yet a checked mapping.

| How the word was formed (ISO 704) | Nouns | Count |
| --- | --- | --- |
| Proper name (ISO 1087:2019 3.4.4; not a term, see section 7) | Everything Ecosystem | 1 |
| Existing word with a special meaning (terminologization) | layer, pillar | 2 |
| Compound of existing words | venture profile, venture template, Product Anatomy, Succession Matrix, capability register, validation score, need-now score, founder appointment | 8 |
| Wholly new word (like WYSIATI) | none | 0 |

**Evidence from standards:**
- **ISO 704 splits term formation three ways:** "creating new forms; using existing forms; translingual borrowing". Existing forms include "terminologization", "transdisciplinary borrowing" and "semantic transfer". This is ISO 704:2000 Annex A ([text](https://www.academia.edu/35054077/Terminology_work_Principles_and_methods)). ISO 704:2022 still covers term-formation methods ([iTeh summary](https://standards.iteh.ai/catalog/standards/iso/041b1c72-c51f-4947-a66b-c7b7f10c185d/iso-704-2022)). I could not read its full text to confirm that the three routes are unchanged.
- **ISO 1087-1:2000 defines a neologism as "new terms coined for a given concept"**, as quoted by Valeontis and Mantzari (ELETO, 2006, [PDF](https://eleto.gr/download/BooksAndArticles/HAU-Conference2006-ValeontisMantzari_EN.pdf)). They state that under this definition, terms "that are the result of borrowing from foreign languages or other subject fields, or of terminologization of words from general language cannot be considered neologisms". They go further and "would not consider new multi-word terms as neologisms if they are the result of compounding single-word terms already existing in a language". By their reading, none of Naive's 11 is a neologism.
- **What the cap actually guards against is a meaning the reader cannot look up anywhere else.** That cost belongs to the concept, not the word. A new compound for a standard concept is cheap. An ordinary word like "pillar" with our own meaning is costly, and it is costly because readers bring the everyday meaning with them. That is the homonym trap rev 2 found with "pre-mortem".

**Verdict: P-C is false.** The property to track is "the meaning has no outside source", not "the word is new". The single bucket also mixes 3 different cases:
- a proper name (exclude it from term rules);
- a borrowed word with our meaning (risk: readers assume the old meaning);
- a compound for a concept of ours (risk: no outside definition).

### 2.4 P-D: the words are free in Naive

| Word | Other meaning that collides | Source |
| --- | --- | --- |
| invention | US patent law: "The term 'invention' means invention or discovery." Naive's Lead owns license, CLA and trademark, so the legal sense will come up. | [35 U.S.C. 100(a)](https://www.law.cornell.edu/uscode/text/35/100) |
| scoped / scope | Since Nov 2, channels are called "scopes", and temporary agents are `name@function` scopes (your decisions, in profile memory). A third "scope" would be a homonym inside Naive's own vocabulary. | parent conversation, Nov 2 |
| owned (SBVR's word for "ours") | your tenant "extreme ownership" rule, which is about who may share or export | parent conversation, Nov 2 |
| extended | In TypeScript, `extends` "allow[s] us to effectively copy members from other named types, and add whatever new members we want". That narrows the set of values while sounding like widening. | [TypeScript handbook](https://www.typescriptlang.org/docs/handbook/2/objects.html#extending-types) |
| imported | Code imports. The backfill scans code, so "imported" would be ambiguous there. Kept as a cited synonym only. | [IAO_0000412 "imported from"](https://raw.githubusercontent.com/information-artifact-ontology/IAO/v2026-03-30/iao.owl) |

**Verdict: P-D is false for both "invention" and "scoped".** Each would be a second sense of a word Naive or the law already uses.

## 3. Recommended replacement: two fields

**Field 1, `grade` (how authoritative the source is).** This keeps rev 2's ladder, drops the two rungs, and adds `none`:

standard (siblings regulatory, codified) > convention (sibling seminal) > none

**Field 2, `origin` (what we did with the term),** as a past participle:
- It describes the noun's current relation to its `standard_ref`.
- Code computes it from rev 2's required SKOS mapping and quote. The check fails if a stored value disagrees.
- One source of truth stays: the mapping.

Your rule reads the same with the new words: standards are preferred, conventions are acceptable, operationally coined terms should be rare.

## 4. The participle set

| `origin` | Plain meaning | Computed from | Standard source for the word or relation | EE-107 line at creation | Allowed reference `stance.is` |
| --- | --- | --- | --- | --- | --- |
| **adopted** | their concept, their definition, quoted | `exactMatch` and a quote of their definition used as ours | SBVR "adopted definition" ([BRC](https://www.brcommunity.com/articles.php?id=b306)); OMG Commons `directSource` "quoted reference"; FIBO `termOrigin` and `definitionOrigin`, "taken directly" ([FIBO AV](https://spec.edmcouncil.org/fibo/ontology/FND/Utilities/AnnotationVocabulary.rdf)); PROV `wasQuotedFrom` ([PROV-O](https://www.w3.org/TR/prov-o/)); ISO 25964-2 exact equivalence | `create/derive`, `source` = reference id | adopted |
| **adapted** | the same concept in substance, reworded or adjusted | `closeMatch`, or `exactMatch` without a quote | OMG Commons `adaptedFrom`: "compatible with but not quoted"; SBVR `Source: based on`, "largely derived from the given source but had some modification" ([BRC](https://www.brcommunity.com/articles.php?id=b288)); Dublin Core `isVersionOf`: "a version, edition, or adaptation" ([DCMI](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)); ISO 25964-2 inexact equivalence | `create/derive` | adopted or adapted |
| **narrowed** | ours is a kind of theirs (every instance of ours is one of theirs) | `broadMatch` (theirs is broader) | SKOS `broadMatch`, S41 sub-property of `broader` ([SKOS](https://www.w3.org/TR/skos-reference/#mapping)); ISO 25964-2 BM | `create/derive` | adapted |
| **broadened** | ours covers theirs and more | `narrowMatch` (theirs is narrower) | SKOS `narrowMatch`; ISO 25964-2 NM | `create/derive` | adapted |
| **borrowed** | their label, a different concept of ours | `relatedMatch`, or rev 2's `deliberateDifference` with its reason | ISO 704 terminologization and transdisciplinary borrowing (section 2.3); SBVR "A dictionary basis should not be interpreted as an adopted definition" ([BRC](https://www.brcommunity.com/articles.php?id=b288)); ISO 25964-2 associative RM | `create/derive`, `source` = where the label came from | adapted or alternative |
| **operationally coined** (`operationally-coined`) | ours, named for how Naive operates, with no source | `standard_ref: "none"` and a `none_fits` list | ISO 1087-1:2000 neologism, "new terms coined for a given concept" (as quoted by [Valeontis and Mantzari](https://eleto.gr/download/BooksAndArticles/HAU-Conference2006-ValeontisMantzari_EN.pdf)); IATE keeps an unsanctioned neologism at minimum reliability | `create/originate` | none |

How this applies to rev 2's own examples:
- **System 1/2, as Kahneman used it, is adopted from a seminal source.** Kahneman: "I adopt terms originally proposed by ... Stanovich and West". Measured against the APA entry, it is codified.
- **customer@finance is standard, narrowed (to be confirmed), with subject field finance.**
- **pillar is none, borrowed.** It is a general word with our meaning.
- **need-now score is none, operationally coined.**
- **Base-rate neglect is codified under another author's label**, Bar-Hillel's "base-rate fallacy". A noun tied to the APA entry with Kahneman's label kept is codified, adapted, with an `altLabel`.

### 4.1 No second verb set

The participles describe a state: how the noun relates to its source right now. EE-107 kinds describe the change that produced that state. Each piece of EE-107 maps onto them like this:

| EE-107 verbs, as proposed on Nov 2 (PR #164 head `7da7909` does not resolve here; `schema/vocabulary.json` (as of 2026-11-02; since moved/removed)). The rows match `design.diff.verbs` in `packages/naive/src/terms/operating-rules.json`. EE-107 is not a logged decision as of 08a5466. EE-113 still names preserved PRs 164 and 163. | Relation to `origin` |
| --- | --- |
| `create/derive` (names `source`) | adopted, adapted, narrowed, broadened and borrowed are all derive lines. `origin` is computed from the mapping on the derived noun, so derive needs no new kinds. |
| `create/originate` | operationally coined |
| `amend/revise` | changes the definition, so `origin` is recomputed. Example: aligning an adapted definition to the quote makes it adopted. |
| `amend/rename` (id kept) | an operationally coined noun takes a standard label (rev 2 9.3), or follows an upstream relabel such as System 1 to Type 1. The old label becomes an `altLabel`. This matches TBX `supersededTerm-admn-sts` and Dublin Core `isReplacedBy`. |
| `amend/deprecate` | the term-status axis: TBX `deprecatedTerm-admn-sts`, and `status` in `packages/naive/src/terms/ontology.json`. Not an origin. |
| `delete/merge` (names `successor`) | two nouns become one. The successor keeps its own origin. |
| `amend/append`, `delete/remove` | no origin change |

**Words not added:**
- **`derived` as an origin.** It is already the EE-107 kind name and would cover five origins at once.
- **`deprecated` and `superseded`.** They are statuses, already handled by kinds and `status`.
- **`imported`, `extended`, `owned`, `scoped`, `invented`.** These collide with other meanings (section 2.4).
- **`quoted`.** It folds into adopted, as OMG Commons does with `directSource`.

**Fields touched:**
- `origin` on the noun, computed and never typed.
- `subject_field`, which equals the `@function` suffix and is already implied by `function`.

Neither is a verb, a kind, or a new noun level.

## 5. What changes in rev 2 (applied as rev 3, then rev 4)

1. **Section 7:** the ladder becomes `grade` (standard, regulatory, codified, convention, seminal, none) plus the computed `origin` table above. The first-pass counts move from "scoped-sense 2" and "invention 11" to:
   - customer@finance and customer@marketing-and-sales graded standard, origin to be confirmed;
   - grade `none` for 11, each to be sorted operationally coined or borrowed by the backfill.
2. **Section 9.3:** "Inventions" becomes "Operationally coined and borrowed terms". `inventions.json` becomes `docs/glossary/own-meaning.json` (as of 2026-11-02; since moved/removed). `none_fits` stays for operationally coined. A borrowed term needs its source and the `deliberateDifference` reason instead.
3. **Section 9.4 rule 4:** the stance agreement check uses the "allowed `stance.is`" column above.
4. **G18 tests:** fix the direction (`broadMatch` gives narrowed), and add "a stored `origin` that disagrees with the mapping fails".
5. **Section 15:** G14 is reworded to the two-field question. G15, G17, G18 and G19 say "operationally coined" instead of "invention".
6. **Rev 4:** records the three labels as decided (G14), renames the origin to `operationally-coined`, and keeps `grade` as its own computed field.

## 6. Decisions

| # | Question | Recommended answer |
| --- | --- | --- |
| T1 | Replace the one ladder with two fields: `grade` (standard, regulatory, codified, convention, seminal, none) and a computed `origin` (adopted, adapted, narrowed, broadened, borrowed, operationally coined), and drop "scoped sense" and "invention" as grades? | **Decided Nov 2:** three labels, scope (`name@function`), origin (adopted, adapted, narrowed, broadened, borrowed, operationally coined) and grade (standard with regulatory and codified, convention with seminal, none). "Scoped sense" and "invention" dropped. |
| T2 | Does `adopted` require a quote of their definition, or only `exactMatch`? | **Decided Nov 2:** it requires the quote, as in SBVR and OMG Commons, where adopted or direct means quoted. Without a quote the origin is `adapted`. More nouns will read "adapted" at first, and that is accurate. |
| T3 | What counts toward the 10% cap (rev 2 G17)? | **Decided Nov 2:** operationally coined plus borrowed, since in both the meaning is ours. Proper names such as "Everything Ecosystem" are excluded, since ISO 1087:2019 3.4.4 treats a proper name as a separate kind of designation, not a term (section 7). Today that is at most 8 of 99, after the 3 proper names (section 7.3). |

## 7. Proper names (added Nov 2, about 6:45 PM CT)

Your note: "I think that classification of terms needs to belong in the glossary also, "Proper Names"."

### 7.1 Where it fits: a fourth label, `designation`

Proper name does not fit scope, origin or grade, because it answers a fourth question: what kind of thing does the word name, one unique thing or a kind of thing?
- **Scope** is the subject field (`name@function`).
- **Origin** is what we did with the source.
- **Grade** is the source's authority.
- A proper name can have any scope, origin or grade. Everything Ecosystem is shared, operationally coined, grade none. "W3C" would be shared, adopted, grade standard.

ISO 1087:2019 draws this line itself:

| ISO 1087:2019 clause | Label | Definition | Source |
| --- | --- | --- | --- |
| 3.2.8 | individual concept | "concept that corresponds to a unique object"; "Individual concepts are represented by proper names" | [ISO 1087:2019 sample, iTeh](https://cdn.standards.iteh.ai/samples/62330/f8493dfbf02f4f23b9d9524832aa0b9b/ISO-1087-2019.pdf) |
| 3.2.9 | general concept | "concept that corresponds to a potentially unlimited number of objects which form a group by reason of shared properties" | same |
| 3.4.2 | term | "designation that represents a general concept by linguistic means" | [Valeontis, ELETO 2025 slides](https://www.eleto.gr/download/Conferences/15th%20Conference/Papers-and-Speakers/15th_02_25_25_ValeontisKostas_Presentation.pdf) |
| 3.4.3 | appellation | "term that is applied to a group of objects whose relevant properties are identical", for example "Nokia 7 Plus®" | [OMG MVF encoding of ISO 1087](https://www.omg.org/spec/MVF/ISO1087-VocabularyForTermsAndDefinitions.ttl) |
| 3.4.4 | proper name | "designation that represents an individual concept", for example "International Organization for Standardization", "IBM®" | same |
| 3.4.5 | symbol | "designation that represents a concept by non-linguistic means" | same |

A correction to section 2.3: the 2000 edition used "appellation, name" for an individual concept. In the 2019 edition, "proper name" is the individual-concept designation, and "appellation" means a product model's name (Valeontis 2025 slides above).

How the other standards handle it:
- **ISO 25964-1** keeps proper names in the thesaurus and links them by the instance relationship (BTI/NTI): "The instance relationship links a general concept, such as a class of things or events, and an individual instance of that class, which is often represented by a proper name" (clause 10.2.4.1). This is quoted in [W3C public-esw-thes, Apr 2014](https://lists.w3.org/Archives/Public/public-esw-thes/2014Apr/0025.html) and [digiCULT xTree](https://digicult.atlassian.net/wiki/spaces/XTREE/pages/3292692561). An instance "cannot have instances" ([NKOS 2014](https://nkos-eu.github.io/2014/content/BTG-BTP-BTI-compositionality.pdf)).
- **SKOS** defines hierarchy only as `skos:broader` and `skos:narrower`, with no sub-property for instances ([SKOS Reference §8](https://www.w3.org/TR/skos-reference/#semantic-relations)). Naive therefore needs its own `instance_of` link to keep rev 2's rule that `broader` means is-a.
- **TBX-Basic** marks it per term as `partOfSpeech: properNoun` ([TBX-Basic](https://www.tbxinfo.net/ns/dct/basic)). That supports a per-entry field.

**Recommendation:** add a fourth field, `designation`, with the ISO 1087:2019 values:
- `term` is the default;
- `proper-name`;
- `appellation`;
- `symbol`, reserved and unused today.

A proper-name noun:
- links to its general concept by `instance_of` (ISO 25964 BTI), never `broader`;
- still carries scope, origin and grade;
- does not count toward the 10% cap and is not listed in `own-meaning.json`;
- must have one referent. A check fails if a record type or another noun uses it as a kind, that is, as a `vocabulary_parent` of many records or as the `instance_of` target. This stops a concept escaping the cap by being capitalized.

### 7.2 The glossary entry for "proper name" itself

| Field | Value |
| --- | --- |
| noun | proper name |
| meaning | "designation that represents an individual concept" (ISO 1087:2019, 3.4.4), quoted |
| standard_ref | a new reference record for ISO 1087:2019, kind `standard`, version 2019-09 |
| mapping | `exactMatch`, with the quote |
| origin | adopted, because the definition is quoted (decided T2) |
| grade | standard |
| scope | shared (no `@function`) |
| designation | term, because "proper name" names a general concept: every proper name is one of many |

### 7.3 Which of the 99 live nouns are proper names

I read `packages/naive/src/terms/ontology.json` on `framework` through the GitHub API. Only live nouns were checked, and none of them is a venture or product name. Mentura, Naive and MAD appear only inside other nouns' meanings.

| Noun | Meaning in the repo | Verdict |
| --- | --- | --- |
| Everything Ecosystem | "The name of the system" | **proper name**. Its `instance_of` is `venture development framework` (EE-024's proposed genus). |
| Product Anatomy | "The method that judges products against the core product" | **proper name** (decided Nov 2, P1): one unique method, like "Scrum", under the one-referent check. |
| Succession Matrix | "Part of Product Anatomy that assigns portfolio roles by phase" | **proper name** (decided Nov 2, P1): a unique part of a unique method, under the one-referent check. |
| the system | "How files refer to the whole" | not a separate proper name. It is a short reference to Everything Ecosystem, so it is better as an `altLabel` on that noun. Left as is for now, noted in the backfill. |

The other 95 name general concepts and stay `term`. At most 8 of 99 count toward the cap: 11 "ours" nouns minus the 3 proper names.

### 7.4 Decisions (G24 in the glossary harness)

| # | Question | Recommended answer |
| --- | --- | --- |
| P1 | Are named methods and their named parts (Product Anatomy, Succession Matrix) proper names? | **Decided Nov 2:** yes. ISO 1087 3.2.8 makes a unique object an individual concept, and each one has one referent, enforced by the single-referent check. |
| P2 | Product names: `appellation` (ISO 1087:2019 3.4.3, a term for a product line whose units are identical) or `proper-name`? | **Decided Nov 2:** use `appellation` for a product name and `proper-name` for a venture or company name, keeping the ISO split. Both stay out of the 10% cap, as you asked for product and venture names. |

## 8. Sources

Standards and specifications:
- W3C SKOS Reference, §10 mapping properties: https://www.w3.org/TR/skos-reference/#mapping
- W3C PROV-O (derivation, revision, quotation, primary source): https://www.w3.org/TR/prov-o/
- DCMI Metadata Terms (`source`, `isVersionOf`, `replaces`, `isReplacedBy`, `conformsTo`): https://www.dublincore.org/specifications/dublin-core/dcmi-terms/ (definitions read from `dublin_core_terms.ttl` on Nov 2)
- OMG Commons Annotation Vocabulary (`adaptedFrom`, `directSource`): https://www.omg.org/spec/Commons/AnnotationVocabulary.rdf
- FIBO FND Annotation Vocabulary (`termOrigin`, `definitionOrigin`, uses `cmns-av:adaptedFrom`): https://spec.edmcouncil.org/fibo/ontology/FND/Utilities/AnnotationVocabulary.rdf
- OMG SBVR, as explained by *SBVR Speaks* (6) and (8): https://www.brcommunity.com/articles.php?id=b288 and https://www.brcommunity.com/articles.php?id=b306
- ISO 25964-2:2013: https://www.iso.org/standard/53658.html and preview https://webstore.ansi.org/preview-pages/ISO/preview_ISO+25964-2-2013.pdf
- ISO 704:2022: https://standards.iteh.ai/catalog/standards/iso/041b1c72-c51f-4947-a66b-c7b7f10c185d/iso-704-2022; ISO 704:2000 Annex A text: https://www.academia.edu/35054077/Terminology_work_Principles_and_methods
- TBX: https://www.tbxinfo.net/ns/dct/basic and https://tbxinfo-c.byuling.net/tbx-namespaces/
- IATE reliability codes: https://online-help.iate.europa.eu/entry-overview/entry-structure/tl/
- IAO "imported from" (IAO_0000412): https://raw.githubusercontent.com/information-artifact-ontology/IAO/v2026-03-30/iao.owl
- Wikidata P144 "based on", "the work(s) or inputs used as the basis for subject item", read via the Wikidata API on Nov 2: https://www.wikidata.org/wiki/Property:P144. This is a cited synonym for adapted and is not used.

Secondary and other sources:
- Valeontis and Mantzari, "The linguistic dimension of terminology", ELETO 2006: https://eleto.gr/download/BooksAndArticles/HAU-Conference2006-ValeontisMantzari_EN.pdf
- 35 U.S.C. 100(a): https://www.law.cornell.edu/uscode/text/35/100
- TypeScript handbook, extending types: https://www.typescriptlang.org/docs/handbook/2/objects.html#extending-types

Naive repo, read only:
- `tchjhnsn/everything-ecosystem` `framework`: `packages/naive/src/terms/ontology.json` (as of 2026-11-02: 112 nouns, 99 live, 11 "ours", 2 scoped), `packages/naive/src/terms/ontology.md` L18, and `packages/naive/src/records/layers/purpose/references/references.json` (`stance.is`). The Nov 2 path `purpose/references/references.json` is that references file (as of 2026-11-02; since moved). `packages/naive/src/terms/operating-rules.json` `design.diff` is a different file.
- PR #164 head `7da7909` does not resolve in this repository. `schema/vocabulary.json` (as of 2026-11-02; since moved/removed). The verb rows match `design.diff.verbs` in `packages/naive/src/terms/operating-rules.json`. EE-113 still names preserved PRs 164 and 163.

Not reachable: the ISO 1087 and ISO 704 full texts are paywalled, and the ANSI ISO 704:2022 preview did not download as a PDF. The ISO 1087-1:2000 neologism wording is therefore quoted from Valeontis and Mantzari, not from ISO directly.
