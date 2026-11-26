<!-- Placement: tchjhnsn/Naive docs/design/NOUNS_VERBS_VS_PALANTIR_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Naive's nouns and verbs vs Palantir's semantic and kinetic halves

Prepared Nov 2, 2026 (America/Chicago). Read only. Naive sources are the `framework` branch of tchjhnsn/everything-ecosystem at `cb502f9`, read through the GitHub connector, plus the decision patches in PR #157 (EE-103), PR #161 (EE-105) and PR #162 (EE-106). Palantir sources are `docs/design/PALANTIR_ONTOLOGY_2026-11-02.md` and the saved pages in `palantir-src/` (as of 2026-11-02; since moved/removed). Where a Naive rule exists only in Torian's saved decisions and research notes, and not yet in the repo, it says so.

---

## 0. Short answer

- **The two "nouns" sit at different levels.** Naive's nouns are words: each one is a meaning, a cited standard, an owning function and a status. They keep language consistent and decide which function a package belongs to. Palantir's nouns are data: object types are schemas, and objects are the rows that fill them. Naive's closest thing to a Palantir object type is not a noun. It is a record type in `packages/naive/src/records/data-model.json`.
- **The two "verbs" also sit at different levels.** Naive's verbs are a small closed set of change classes (create, amend, delete, each with kinds), used to label every change and give it a risk tier and a route. Palantir's verbs are action types: many named, domain-specific transactions, each with parameters, rules, submission criteria and side effects, that actually change objects.
- **So the 8 questions mixed levels.** They took Palantir's instance-level machinery (objects, actions, markings) and applied it to Naive's statement model from EE-106, which is not on `framework` and which EE-106's own conflict list says the code does not match. Two questions hold almost as written (4, 8). Four hold once reframed in Naive's own terms (1, 5, 6, 7). One does not fit as worded (2). One depends on an unsettled choice of unit (3).

---

## 1. Naive's nouns: what they are and what they do

**Where they live.** `packages/naive/src/terms/ontology.json` is canonical (EE-014). `packages/naive/src/terms/ontology.md` is generated from it by `node packages/naive/src/checks/check-nouns.ts --md`.

**Shape of a noun.** On `framework`, `packages/naive/src/terms/ontology.json` v0.6.0 holds 112 nouns. Every noun has `noun`, `level`, `meaning`, `standard`, `status`, `function` and `handoff_type`. Some also have `references`, `replaced_by` and `retired_pattern`, `capabilities` (functions only), `required_touches`, or `term` and `properties`.
- Levels: venture 31, governance 20, system 17, purpose 15, interface 14, operations 6, function 4, evidence 3, knowledge 2.
- Status: new 67, kept 23, retired 13, proposed 9.
- Function: 103 nouns are shared (function null). The rest belong to marketing-and-sales (3), strategy (2), products (2) and finance (2).

**Rules (file note, `packages/naive/src/terms/ontology.json` line 3; `packages/naive/src/terms/ontology.md` lines 12 to 20).**
- Standards first: a noun uses an established term with its standard meaning, and is marked "ours" only when none exists.
- Each noun names one function, or none when the word is shared. A shared noun never decides a package's type.
- A scoped sense is written `name@function`, for example `customer@marketing-and-sales` (line 1065) and `customer@finance` (line 1074). A new sense is made only when the meaning differs (EE-103 text in PR #157).
- A function is a noun at level function, and its capabilities are the nouns it owns (for example `strategy`, line 1016, with capabilities at line 1023).
- Retired nouns name what replaced them, and the check fails if one reappears.

**What the check does (`packages/naive/src/checks/check-nouns.ts`).**
- Lines 1 to 6 and 62 to 74: fails when a retired noun reappears in checked files, when a reference id does not resolve, or when the membership rules break.
- Lines 35 to 54: `--package <file> --function <id>` prints one membership verdict (admit, refer, reject) for a handoff package.
- The verdict logic is `packages/naive/src/terms/ontology-gate.ts`, lines 1 to 17. G1 checks the handoff schema. G2 checks every term is a live noun. G3 checks the type noun's function is the receiver, or refers it to the owner. G4 checks touches. G5 runs the term's properties over facts. No model call.

**Nouns that type work.** A noun with `handoff_type: true` can type a handoff package.
- `pricing decision` (line 1083): marketing-and-sales owns it, `required_touches: ["finance"]`, and the founder approves.
- `founder appointment` (line 1104): typed by the `founder` term with properties F1 to F5.

**Terms (EE-095).** `packages/naive/src/terms/terms.ts` defines a term as checkable properties over facts. For example `founder` has F1 "a person...", F2 "there before the first hire...", up to F5, each a `check` function. EE-095 requires every new or contested term to be admitted by running these properties, cross-run against other terms, with named Lean theorems present. This is the most "typed" part of Naive's nouns: a meaning written as tests on facts, never on the label.

**Relations (EE-103, PR #157, not yet on `framework`).** PR #157 adds `relations` to nouns from a closed set: SKOS broader, narrower and related, plus part-of and derived-from. broader and narrower are inverses, related is symmetric, and broader and part-of may not cycle. The PR's patch adds 72 related, 10 part-of, 7 broader and 1 derived-from relation, and generates `docs/noun-graph.md` (as of 2026-11-02; since moved/removed) (for example `agent harness` broader `AI harness`, `done-criterion` part-of `handoff`, `preference stack` derived-from `cap table`). Torian also decided check-nouns must refuse a pair that is both broader and related (saved decision, Nov 2).

**Record types are separate from nouns.** `packages/naive/src/records/data-model.json` v0.5.0 lists 128 record types. Each has a layer, a JSON Schema file and paths, and 22 have a `decision_class` (strategy-or-constitution 14, ownership-or-control 4, public-commitment 3, security-loosening 1). The noun `record type` (`packages/naive/src/terms/ontology.json` line 674) names this, and the noun `data model` (line 665) names the file. There is no field linking a record type to the noun it implements.

**In one line.** Naive's nouns are a governed vocabulary of meanings, with owners and standards, that routes work to functions. They are the SKOS-like layer. The data schema is a different file.

---

## 2. Naive's verbs: what they are and what they do

There are three verb-like things. Only the first is what Torian means by verbs.

**2.1 Change verbs (Torian's saved decisions, Nov 1; drafted in `docs/design/WORKTREES_BRANCHES_RESEARCH_2026-11-01.md` section 5; not yet a decision record in the repo).**
- Three verbs, one kind per line:
  - create: originate, or derive (naming the source);
  - amend: append, rename, deprecate, revise;
  - delete: remove, or merge (naming the successor).
- The set must be exhaustive and non-overlapping. Rename is a kind of amend. A move that keeps the id is a rename. A compound change is split into separate lines.
- Each change line gets a tier (low, costly, one_way_door), the maximum of severity, reversibility and time to detect. The draft table in `docs/design/WORKTREES_BRANCHES_RESEARCH_2026-11-01.md` (lines 80 to 99) applies this to worktrees and branches. For example, delete remove of a dirty worktree is one_way_door, and amend revise with a review in progress is costly.
- A question's type is verb plus noun plus asking function (saved decision, Nov 1). Routing rules match on that type, the most specific rule wins, and agents may propose standing answer rules, never for deletes.
- The "worktrees/branches + verbs" decision record is still in the pending decision-record queue.

What they do: they describe any change, to a design, a record or a branch, in a fixed grammar. That grammar sets how risky the change is, who must answer for it, and whether it needs a person. They do not execute anything.

**2.2 Router actions (in code, EE-030 and EE-032).** `packages/naive/src/router/router.ts` lines 11 and 145 to 153: record routes have read, view, layout, write, check and template. Command routes have run, view and layout. A write is validated against the record's schema. `gateOf` (lines 261 to 266) makes an agent's write a draft when the record's decision class is escalate or recommend-approve. These are generic CRUD-style operations, the same for every record type.

**2.3 Provenance activities (EE-031).** Each router write appends a line to `<venture>/provenance.jsonl` with the activity (write, draft, accept, baseline), the agent, the interface, what it was derived from, the decision, and a hash of the content, chained to the previous line. `packages/naive/src/router/orchestration/triggers.ts` lines 1 to 5 treat a provenance line (written, drafted, accepted, confirmed or moved) as the event that starts the next router call.

**In one line.** Naive's verbs are a classification of change for risk and routing, sitting above a generic read, write and accept machinery.

---

## 3. Palantir's semantic and kinetic halves

**The split, in Palantir's words.**
- The Ontology contains "both the semantic elements (objects, properties, links) and kinetic elements (actions, functions, dynamic security)" (`palantir-src/www_palantir_com_docs_foundry_ontology_overview.clean` (as of 2026-11-02; since moved/removed)).
- "If the data elements in the Ontology are 'the nouns' of the enterprise (the semantic, real-world objects and links), then the actions can be considered 'the verbs' (the kinetic, real-world execution)" (`palantir-src/www_palantir_com_docs_foundry_ontology_why_ontology.clean` (as of 2026-11-02; since moved/removed)).

**Semantic half** (`docs/design/PALANTIR_ONTOLOGY_2026-11-02.md` section 2.1).
- An object type is "the schema definition of a real-world entity or event", and an object is one instance (`palantir-src/..._object_link_types_object_types_overview.clean` (as of 2026-11-02; since moved/removed)). Palantir maps it straight onto tables: object type is a dataset, object a row, property a column, link type a join.
- Shared properties share metadata across object types. Value types wrap a field type with constraints and are versioned. Interfaces give abstract types. Object sets are saved lists or filters.
- Objects are indexed from backing datasets, or created only through actions.

**Kinetic half** (`docs/design/PALANTIR_ONTOLOGY_2026-11-02.md` sections 2.2, 3.2 and 4).
- Action types: "An action is a single transaction that changes the properties of one or more objects, based on a user-defined logic" (`palantir-src/..._action_types_overview.clean` (as of 2026-11-02; since moved/removed)). Each has parameters, rules, side effects and submission criteria. In Object Storage v2, "user edits" happen only through actions.
- Functions: server-side TypeScript or Python that reads objects, follows links and makes edits.
- Dynamic security: markings that "travel with the data" (`palantir-src/www_palantir_com_docs_foundry_security_markings.clean` (as of 2026-11-02; since moved/removed)) and "propagate through derivation", plus row and column policies that filter reads only.
- Around these: an action log, opt-in edit history, ontology proposals on branches for protected types, AIP Evals in an "Ontology simulation", a per-model allowlist of markings, two MCP servers (one for data via actions, one for schema), and the Agent Stack's sessions with typed context items and events.

---

## 4. Mapping

### 4.1 Where they match

| Naive | Palantir | Why it matches |
|---|---|---|
| Record type in `packages/naive/src/records/data-model.json` with its JSON Schema | Object type and properties | Both are the schema of a kind of thing |
| Record file (for example `purpose/telos.json` (as of 2026-11-02; since moved/removed)) | Object | Both hold the current state of one thing |
| `decision_class` on a record type, draft until a person accepts | Submission criteria plus "stage as proposal" for consequential actions | Both decide, per type, whether a write needs a person |
| A handoff type noun with required touches and an approver (`pricing decision`) | An action type with submission criteria and rules | Both name one kind of consequential change and who must take part |
| Provenance log (append-only, hash-chained, on from the first write) | Action log plus edit history | Both record who changed what. Naive's is always on, Palantir's edit history is opt-in |
| EE-095 term admission, check-nouns, framework PRs | Ontology proposals on protected types | Both review changes to the shape before use |
| `private`, `private_fields` and `sensitive` flags checked by `packages/naive/src/checks/check-private.ts` (EE-073) | Markings and the LLM marking allowlist | Both keep marked data away from a model |
| `layout` (the context an agent gets before acting, `packages/naive/src/terms/ontology.json` line 953) | Typed context items in an Agent Stack session | Both hand an agent typed context before it acts |
| Triggers fired by provenance events | Automate triggered by object-data conditions | Both start work when the record changes |

### 4.2 Where they differ in purpose

1. **Vocabulary of meanings vs typed data schema.** A Naive noun says what a word means, which standard it follows and which function owns it. It holds no instances. Palantir has no glossary layer: its object types hold rows. The Naive noun `customer@finance` is a sense of a word. A Palantir `Customer` object type would be a table. Palantir docs fetched this session never mention SKOS, RDF or OWL (`docs/design/PALANTIR_ONTOLOGY_2026-11-02.md` line 217).
2. **Change classes vs transactions.** Naive's three verbs apply to every noun and say how risky a change is and who answers. Palantir's action types are many, one per business operation, and they run. Naive has no per-domain executable action definitions. Palantir has no fixed grammar of change kinds or risk tiers.
3. **Routing vs access.** Naive's membership gate uses nouns to send a package to the function that owns it, and to refuse one that does not belong. Palantir uses types mainly for data access and app building. It has nothing like function ownership of words.
4. **History first vs state first.** Naive treats the provenance log as the authoritative history, with record files as the latest state. Palantir treats the object as the unit and history as an add-on.
5. **Security inside the kinetic half.** Palantir counts dynamic security as kinetic. Naive has no matching security part in its verbs. Its tiers are about risk of the change, not about who may see the data. Its `private` flag is a static, binary check (one record or field, never reaches any model) and does not follow derived records.

### 4.3 What each side has that the other lacks

**Naive has, Palantir lacks:**
- A cited standard and retired-word check for every noun (EE-014).
- Scoped senses per function and a membership gate that admits or refers packages by function (`packages/naive/src/terms/ontology-gate.ts`).
- Term definitions written as property tests on facts, cross-run and tied to Lean theorems (EE-095).
- SKOS relations among nouns (EE-103, PR #157, pending).
- A closed, exhaustive set of change verbs with kinds and risk tiers, and question types of verb plus noun plus asking function (saved decisions, not yet in the repo).
- History on by default, hash-chained (EE-031).

**Palantir has, Naive lacks:**
- Per-domain action types with parameters, side effects and submission criteria that run as one transaction.
- Markings that propagate through derivation, and a per-model allowlist of markings.
- A materialized current-state view built from source data plus edits.
- Two MCP servers split by use vs schema change.
- Evals that run in a simulated ontology.
- A typed agent session model.
- Value types, interfaces and object sets.

---

## 5. The 8 held questions under Naive's model

Verdicts: **Holds** (fits as written), **Reframe** (the need is real, but it should be said in Naive's terms), **Doesn't fit**, **Depends** (waits on another choice).

**Q1. Required labels that pass to derived knowledge. Verdict: Reframe.**
- The need is real. `packages/naive/src/checks/check-private.ts` already keeps `private`, `private_fields` and `sensitive` items away from a model (EE-073), but only as a static check on named inputs. Nothing follows a record into what an agent derives from it. Palantir documents the same gap for read filters (`docs/design/PALANTIR_ONTOLOGY_2026-11-02.md` section 3.2).
- In Naive's terms: a label is a governed noun, cited to a standard like every other noun. It sits on a record or field, the way `private` already does. The provenance log already records `derived_from` on every router write (EE-031). So inheritance can be computed from provenance: a record derived from a labelled input carries the union of its inputs' labels. Removing a label is an amend deprecate line at the one_way_door tier, held for a named role.
- What changes from the held wording: it applies to records and fields, not "statements and sources". A statement record type does not exist on `framework` (EE-106 conflict 2).

**Q2. Typed action types as the only write path. Verdict: Doesn't fit as worded.**
- Palantir's answer is many domain-specific action types. Naive's answer is a closed grammar: verb, kind, noun, tier. Adding Palantir-style action types would create a second, overlapping verb system, which breaks Torian's rule that the verb set be exhaustive and non-overlapping.
- The real gap is different. EE-106 conflict 5 shows that 106 of 128 record types have no `decision_class`, so an agent's write is the record, and the MCP and API servers write as an agent while the CLI writes as a person. EE-031 also lets writes outside the router be covered only by git history.
- In Naive's terms: "every write goes through the router and is labelled with one change line (verb, kind, noun), and the line's tier decides whether it lands, drafts or waits for a person." Handoff type nouns such as `pricing decision` are where a Palantir-style named action is genuinely needed, and they already carry required touches and an approver.

**Q3. Derived current-state view per subject. Verdict: Depends.**
- On `framework` the unit is a JSON record file, and the file already is the current state. The provenance log stores a hash of the content, not the content (EE-031), so the file cannot be rebuilt from history today.
- The question only makes sense if the unit becomes a sourced statement (EE-106 decision 2, which conflict 2 says the code does not match). Then a per-subject view is needed, as Palantir's materializations are.
- So it waits on the open question below about the unit. If the record file stays the unit, the Naive version is the reverse: keep the file as state and make the log rich enough to rebuild it (content or a diff per line), which is a separate decision.

**Q4. Two MCP scopes. Verdict: Holds, with Naive's names.**
- Naive already separates using a venture's records from changing the framework's shape: venture routes on one side, and `packages/naive/src/terms/ontology.json`, `schema/terms` (as of 2026-11-02; since moved/removed), `packages/naive/src/records/data-model.json` and decision records on the other, changed by framework PRs.
- In Naive's terms: a use scope that runs router actions on venture routes, and a shape scope that only opens proposals against the noun list, terms, relations, verbs and kinds, record types and agent configuration. Neither scope writes the other's files. This matches Palantir's Ontology MCP vs Palantir MCP split (`docs/design/PALANTIR_ONTOLOGY_2026-11-02.md` section 4).

**Q5. Per-model allowed-label lists in AI Gateway. Verdict: Reframe, and it depends on Q1.**
- `packages/naive/src/checks/check-private.ts` is a one-list version already: private items may reach no model. A per-model list generalizes it.
- In Naive's terms: the check reads each model step's inputs (the `use_model` steps check-private already reads) and compares their inherited labels with that model's allowed list. The framework holds the rule as data. Enforcing it in AI Gateway is a platform detail, because EE-041 and EE-098 keep the framework vendor-neutral (EE-106 conflict 1).

**Q6. Evals in a simulated scope. Verdict: Holds, reframed onto what exists.**
- Naive has the nouns `eval` and `evidence` (`packages/naive/src/terms/ontology.json` lines 413 and 422) and a working pattern for running checks against another copy of the repository: `EE_ROOT` in `packages/naive/src/checks/check-nouns.ts` line 19, used by `schema/test.mjs` (as of 2026-11-02; since moved/removed). `packages/naive/src/engine/upgrade-venture.ts` also has a staged-copy `--agent` mode (AGENTS.md line 40).
- In Naive's terms: an eval runs against a copy of the venture, and its writes land only as drafts in that copy, never in the real venture's accepted records or provenance log. The results are written as evidence. "Draft status" from the held wording is better said as "writes into a copy", since today draft is a router state for gated records only.

**Q7. Run record as a session with typed context items, events and state transitions. Verdict: Reframe.**
- Naive already has each piece under its own nouns: the `layout` is the typed context an agent gets before acting (`packages/naive/src/terms/ontology.json` line 953, EE-032). Provenance lines are the events, and triggers already treat them as events (`packages/naive/src/router/orchestration/triggers.ts` lines 1 to 5). A handoff has a status and attempts (`packages/naive/src/terms/ontology.json` line 395).
- In Naive's terms: a run is one attempt on a handoff. Its context is the layout it was given, its events are the provenance lines it wrote, and its states are the handoff's statuses. Adding Palantir's session, context item and event types beside these would duplicate them. EE-106 conflict 16 notes there is no task or chat-history record yet, so where a run's transcript lives is still open.

**Q8. Schema and vocabulary changes via reviewed proposals on protected types, no knowledge branching. Verdict: Holds.**
- This is already how Naive works: nouns through check-nouns and EE-014, terms through EE-095 admission, relations through EE-103, all as framework PRs with decision records.
- In Naive's terms: the protected types are `packages/naive/src/terms/ontology.json`, `schema/terms/` (as of 2026-11-02; since moved/removed), `packages/naive/src/records/data-model.json` and the verbs and kinds list. Each proposal is written as change lines (verb, kind, noun). One conflict to settle: EE-037 and `platform/connectors/github.mjs` (as of 2026-11-02; since moved/removed) already branch knowledge for a GitHub-stored source (a write opens a draft PR), which disagrees with "no knowledge branching" (EE-106 conflict 11).

| Q | Verdict | Naive-terms version |
|---|---|---|
| 1 | Reframe | Labels as governed nouns on records and fields, inherited through provenance `derived_from`; removal is a held one_way_door amend |
| 2 | Doesn't fit as worded | Every write goes through the router as one change line (verb, kind, noun); tier decides land, draft or wait |
| 3 | Depends | Only needed if the sourced statement becomes the unit; otherwise the record file is the state |
| 4 | Holds | Use scope (venture routes) vs shape scope (nouns, terms, verbs, record types, agent config) |
| 5 | Reframe, after 1 | Per-model allowed labels generalize `packages/naive/src/checks/check-private.ts`; rule in the framework, enforcement on the platform |
| 6 | Holds | Evals run on a copy of the venture (the `EE_ROOT` pattern) and write evidence |
| 7 | Reframe | Run equals a handoff attempt: layout as context, provenance lines as events, handoff status as state |
| 8 | Holds | Protected types are the ontology, terms, data model and verbs list, changed by framework PRs |

---

## 6. Open questions for Torian

1. **Is a noun a meaning, a type, or both?** You have said "the ontology is the types" (saved, Nov 1). On `framework`, though, nouns and record types are two files with no link. **Recommendation:** keep nouns as meanings, and add one field on each record type in `packages/naive/src/records/data-model.json` naming the noun it implements, checked by check-nouns. That gives Naive a semantic half without copying Palantir's object model.
2. **Is the unit a record file or a sourced statement?** `framework` uses record files. EE-106 decision 2 says sourced statement. Q1 and Q3 change depending on the answer. **Recommendation:** settle this before reopening Q1 and Q3. My lean, which is uncertain: keep the record file as the unit for now, and record sources per field when a venture needs it.
3. **Should the three change verbs become the write vocabulary of the router?** Today they label design diffs and question types, while the router has its own read and write actions. **Recommendation:** yes. Every router write carries one change line (verb, kind, noun) and its tier, and Palantir-style named actions exist only as handoff type nouns where a consequential change needs required touches and an approver.
4. **Does Naive need a security part in its verbs, the way Palantir counts dynamic security as kinetic?** **Recommendation:** yes, but as nouns rather than a fourth verb. Labels are governed nouns inherited through provenance (Q1 reframed), and removing one is an amend at the one_way_door tier.

---

## Notes on uncertainty

- The change verbs, kinds, tiers and question-type rule are from Torian's saved decisions and `docs/design/WORKTREES_BRANCHES_RESEARCH_2026-11-01.md`. I found no decision record for them in `docs/decisions/decisions.json` on `framework` (a search for "verb" found only incidental uses in EE-046 and EE-059).
- EE-103 (relations) is in open PR #157, EE-105 in draft PR #161, and EE-106 in PR #162. None is on `framework` at `cb502f9`.
- Line numbers refer to `framework` at `cb502f9` as fetched on Nov 2, 2026.
- I did not run any repo scripts. Counts come from parsing the JSON files.
