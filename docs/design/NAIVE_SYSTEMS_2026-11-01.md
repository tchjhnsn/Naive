---
type: design-note
source: hybrid
created: 2026-11-01T09:29:48Z
ai-model: claude
status: DRAFT
authority: implementation
tags: [everything-ecosystem, naive, ontology, identity, functions, packages, phases, provenance, standards, prior-art]
description: "Naive, one system at a time: for each system, what kind of thing it is (its ontology), how it works in the code today, the standards it follows, and the prior art. Written before the single Naive record and the technical version, which are built from it."
---

> Copied from everything-ecosystem (docs/design/, main at 2026-11-05) when Naive moved to its own repository (EE-118). This copy is Naive's from now on. Paths it names under site/, platform/, console/ or instance/ stay in everything-ecosystem.

# Naive, one system at a time

Naive describes a venture by asking six questions about it (who, what, when, where, why, how) at two scales. At the venture scale the answers describe the venture as it stands. At the record scale, asked of every record and every decision, the answers are provenance (R-01, R-02 in `docs/design/REQUIREMENTS_IDENTITY_FUNCTIONS_PHASES_PROVENANCE_2026-10-30.md`, PR #125).

Each question is answered by one system. This note takes the systems in order:

| Question | System | Section |
| --- | --- | --- |
| Who | Identity | 1 |
| How | Functions and function modules | 2 (next) |
| What | Packages | 3 |
| When | Phases | 4 |
| Where, Why | Where and why | 5 |
| Who, what, when, where, why, how of each record | Provenance | 6 |

Each section has the same parts: what kind of thing the system is, its parts, how it works in the code today, the standards it follows, prior art, conflicts with what is already on `main`, and what must be built. "Agreed" means Torian agreed it; "proposed" means it is not agreed yet.

## 1. Identity

### What kind of thing it is

A venture's identity is the set of its properties that hold in every state the venture can be in, and that decide whether two records describe the same venture.

The terms come from OntoClean (Guarino and Welty, 2002) and its successor UFO (Guizzardi, 2005):

- **Rigid property:** true of a thing in every state in which the thing exists. If it stops being true, the thing no longer exists. "Venture" is rigid for a venture.
- **Anti-rigid property:** true of a thing only for a time. Phases and roles are anti-rigid. A venture in Discovery can leave Discovery and remain the same venture.
- **Identity criterion:** the test that answers "is this the same venture as before?" A kind of thing that has one is a *sortal*. "Venture" is a sortal; "early-stage" is not.
- **Role:** an anti-rigid property that holds because of a relation to something else (founder *of* a venture, investor *in* it). A **phase** is an anti-rigid property that holds because of the thing's own state.

OntoClean's constraint that matters most here: an anti-rigid class cannot contain a rigid one. So "founder" (a role) can never be the kind a person belongs to, and "Discovery venture" can never be a subtype of venture that some venture is permanently.

In Naive, identity is a **rigid sortal**: the kind *venture*, with an identity criterion. Everything else about a venture is either a role, a phase, or a value that changes over time.

### Its parts

Agreed (R-03, R-04, R-16):

- The venture, its founders and every other person are **separate identities**, linked by roles. Roles are anti-rigid and relational. The reason for a role assignment (a hire, say) lives in that assignment's provenance.
- Identity is stored as JSON records in `identity/`, replacing `foundation/`. `venture.json` stays the manifest.

Proposed (identity research, 2026-10-31, https://claude.ai/artifact/6PbSQ93sHw2hKxDJcx5YJH):

| Part | Rigid? | Notes |
| --- | --- | --- |
| Venture id | Yes | Assigned once, never reused |
| Founding event | Yes | Date, original founders, the idea it came from (EE-092: a venture starts as a draft from an idea) |
| Essential why | Yes, by decision | The purpose and core promise. Changing it is either a refounding (a new venture that succeeds this one, recommended) or an amendment (open question) |
| Lineage | Yes | `parent_of`, `successor_of`, `resulted_from`: the events that made this venture from others |
| Name | No | A history of names, each with the dates it was true. The name is not the identity |
| Legal entity | No | A separate identity, linked by roles (below) |

The legal entity is a separate thing with its own identity:

- Its rigid core is its id and its creation event. Legal form, jurisdiction, legal name and status change over time and are stored as dated spans. (A Delaware conversion under DGCL §265 and §266 keeps the same entity while its form changes.)
- It links to the venture by anti-rigid roles: `operated_by`, `holds_ip_for`, `employs_for`, `parent_of`, `successor_of`. The links are many-to-many over time: one entity can operate two ventures, and a venture can move to a new entity.
- Formation and diligence documents are evidence for these records, not identity fields.

Proposed files: `identity/venture.json`, `identity/entities/<id>.json`, `identity/links.json`. The MVP needs only `identity/venture.json`.

### How it works in the code today

There is no `identity/` folder and no identity record type on `main` (checked at `2507d1a`). The parts listed above are spread across four places, mixed with things that are not identity:

| Where | What it holds | Which system it belongs to |
| --- | --- | --- |
| `venture.json` | `id`, `name`, `parent`, `opened` | Identity (id, lineage), except `name`, which should be a dated history |
| `venture.json` `core` | `promise`, `promised_to`, `must_not`, `competence` | `promise` is the essential why (identity). `promised_to` is where (segment). `competence` is how (functions) |
| `venture.json` | `phase`, `industry`, `form`, `ambition`, `departments` | Phase (when), market (where), legal form (legal entity), and departments, which EE-090 made optional |
| `foundation/` | `telos.draft.md`, `problem.json`, `icp/`, `goals/`, `alignment.json` | Mixed. The telos end state is essential why. Goals are contingent why. ICPs are where. The problem is research evidence. Alignment principles are policy |
| `console/lib/identity.ts` | The signed-in person | A different sense of "identity": the authenticated user of the console, not a venture's identity |

So replacing `foundation/` with `identity/` (EE-091) is not a rename. It is a split: only the telos end state and the core promise move into `identity/`. The rest moves to the system it belongs to.

`console/lib/identity.ts` uses "identity" in its security sense. That is a second meaning of the same word in one codebase, which the glossary's scoped meanings must record ("identity@console" against "identity@venture").

### Standards

| Standard | What Naive takes from it |
| --- | --- |
| OntoClean (Guarino and Welty, *Communications of the ACM* 45(2), 2002) | Rigid, anti-rigid, identity criteria, and the constraint that an anti-rigid class cannot contain a rigid one |
| UFO and OntoUML (Guizzardi, 2005) | Kind, role and phase as distinct categories: a role depends on a relation, a phase on the thing's own state |
| ISO/IEC 21838-2:2021, Basic Formal Ontology | The ISO top-level ontology. Naive's identity sits under its continuant category: a thing that persists through time while keeping its identity. I have not read the paywalled text; mapping Naive's kinds to its classes is still to do |
| W3C Organization Ontology (Recommendation, 2014) | `org:Organization` against `org:FormalOrganization` (an organization recognised in law) is the same split as venture against legal entity. `org:ChangeEvent`, with `org:originalOrganization` and `org:resultedFrom`, models lineage. Their property chain implies `prov:wasDerivedFrom`, which ties lineage to provenance |
| FIBO and OMG Commons (EDM Council) | "Legal entity" is a formal organization recognised in some jurisdiction as able to incur liability. Naive's legal entity record should use that definition |
| ISO 17442 (LEI), ISO 20275 (entity legal forms), ISO 3166 (country codes), GLEIF LEI-CDF | Field names and code lists for the legal entity record. LEI-CDF events carry an effective date and a recorded date, which matches Naive's two-times model (R-12) |
| ISO 704 and ISO 1087 | How each term above is defined: a genus, then the characteristics that separate it from its siblings |

### Prior art

- **Separating an organization from its legal entity** is established: W3C ORG (Organization and FormalOrganization) and FIBO (legal entity under formal organization) both do it.
- **Lineage as change events** is established: W3C ORG `ChangeEvent`, and GLEIF's relationship and successor records.
- **Rigid against anti-rigid** for kinds, roles and phases is established: OntoClean, UFO and OntoUML.
- **Not found in this search:** an identity record for a venture that exists *before* any legal entity does, kept as files a solo founder owns, with the essential why as a rigid part of its identity. W3C ORG and FIBO both start from organizations that already exist in law or in an organization chart. This is the part of identity that Naive adds. The claim rests on one round of searching and should be attacked before it goes into anything public.

### Conflicts with `main`

1. **"Who" means two different things.** `purpose/strategic-foundation.json` (EE-051, on `main`) asks "Who do you serve?" and answers with the ICP. R-02 (agreed 10-30, in unmerged PR #125) says "who" is the venture's own identity, and puts customers under "where" (segment and ICP). Zachman's "who" column is people and organizations, which supports R-02. Proposed resolution: R-02 is the model; the strategic foundation is a view for founders whose question "who do you serve?" reads from the where system. The strategic foundation also has a seventh question, "whether", that R-02 does not have; it maps to the contingent why (alignment principles and decision reasons).
2. **`foundation/` against `identity/`.** As shown above, EE-091 is in force but unbuilt, and it is a split, not a rename.
3. **The word "identity" has two meanings** in the codebase (venture and signed-in person).

### What must be built

| Item | Check that proves it |
| --- | --- |
| `schema/identity.schema.json` for `identity/venture.json`: id, founding event, essential why, lineage, name history | Schema check; every venture has exactly one |
| Split `foundation/` by the table above, with a route alias so old paths keep working during `naive upgrade` | `naive check` finds no record left in `foundation/` |
| A rigidity check: a change to a rigid field is refused unless it comes with a refounding decision | Generic test over every identity field; Lean theorem that a rigid property holds in every reachable state |
| Glossary scoped meanings for identity@venture and identity@console | Term engine run (definition tests, cross-run, Lean mirror) |
| Decide the "who" conflict (above) and record it as an EE decision with `affects` | Decision conformance check |

### Sources

- Guarino and Welty, "Evaluating Ontological Decisions with OntoClean", *CACM* 45(2): 61-65, 2002; overview at https://en.wikipedia.org/wiki/OntoClean and https://www.loa.istc.cnr.it/wp-content/uploads/2020/03/OverviewOntoClean-compresso.pdf
- Welty and Andersen, revised rigidity axiom: https://dominoweb.draco.res.ibm.com/reports/rc23754.pdf
- ISO/IEC 21838-2:2021: https://webstore.iec.ch/en/publication/72703
- W3C Organization Ontology: https://www.w3.org/TR/2014/REC-vocab-org-20140116/ ; PROV derivation discussion: https://lists.w3.org/Archives/Public/public-prov-wg/2012Nov/0236.html
- FIBO Legal Persons (archived snapshot): https://akswnc7.informatik.uni-leipzig.de/dstreitmatter/archivo/spec.edmcouncil.org/fibo--ontology--BE--LegalEntities--LegalPersons/2025.08.23-092319/fibo--ontology--BE--LegalEntities--LegalPersons_type=generatedDocu.html
- Identity research, 2026-10-31: https://claude.ai/artifact/6PbSQ93sHw2hKxDJcx5YJH

## 2. Functions and function modules

### What kind of thing it is

A function is a kind of work every venture has, whether or not anyone is doing it yet. A venture with no revenue still has finance; its value is $0. Functions answer "how" at the venture scale (R-02, Zachman remapped: function modules are the how).

In ontology terms a function is a **realizable property of the venture**: it exists while unexercised, and it is realized in activities. Basic Formal Ontology (ISO/IEC 21838-2) draws the same line between a realizable entity (a function or disposition, which its bearer has even when it is not acting) and the process that realizes it. In BFO a function exists because of how its bearer was made or designed. For a venture, that is its design as a venture, so every venture bears all of them. This mapping is proposed and has not been checked against the standard's text.

Against identity (section 1): a function is **rigid** (every venture has finance in every state) but it is **not identity**. Two ventures both have finance; finance does not tell them apart. The function's *state* (its value, its owner, its records) changes; the function does not.

The four tests (R-08, agreed) say when a candidate is a function:

| Test | Means | Fails for |
| --- | --- | --- |
| Total | Defined in every state of every venture; empty is a value | "Fundraising": a bootstrapped venture never has it |
| Rigid | No reachable change makes it undefined | "Discovery work": it ends when the phase ends |
| Independent | Not computed from other functions | "Profitability": finance computes it |
| Activity, not identity | Owns decisions that change hands when the owner changes | "Mission": it is identity, and strategy is the function that maintains it (R-11) |

A **function module** is the code that implements one function (R-05, R-06, agreed). It exports: how to read the function's state (a value, possibly empty), the decision classes it owns, its agenda in each phase, and its checks. `venture.json` declares which functions exist and who owns each; the module holds the behaviour. They reference each other the way `package.json` references code (R-07).

A **department** is not a function. It is an optional grouping of functions that a person adds, the way a team adds a folder (EE-090). A solo venture has all 13 functions and no departments.

### Its parts

The set is fixed at the 13 top-level categories of APQC's Process Classification Framework (EE-047's catalog, kept by EE-090): strategy, products, marketing-and-sales, supply-chain, service-delivery, customer-service, human-capital, it, finance, assets, risk-and-compliance, external-relationships, capabilities. Each is tagged with its place in Porter's value chain (primary or support).

Each function has, per R-06 and R-07:

| Part | Where it lives | Status |
| --- | --- | --- |
| Declaration and owner | `venture.json` `functions.<id>.owner` | Schema exists; owner defaults to the founder (R-10) |
| Function module | `functions/<id>` (R-06 says a file `functions/<id>.ts`; EE-090 says a folder per function) | Not built |
| State reader | Exported by the module | Not built |
| Owned decision classes | Exported by the module | Not built; decisions today are owned by nobody in code |
| Agenda per phase | Exported by the module; a phase sets it (R-13) | Not built; today the per-phase weights are on packages (`base` in each `package.json`) |
| Checks | Exported by the module; one generic test runs the four tests over every module (R-08) | Not built |
| Lean mirror | The four tests as `def`s returning `Prop` (R-09) | Not built; Lean lives in PR #135 |

### How it works in the code today

- `operations/departments.json` is the catalog: 13 entries, each with its APQC category, Porter value-chain place, and governance and operations notes. It is still named "departments" although EE-090 says these are functions.
- `schema/venture.schema.json` has both a `functions` map (owner per function id, EE-071) and a `departments` array (EE-047, superseded). The Everything Ecosystem venture uses the old one: `"departments": ["marketing-and-sales"]` and no `functions`.
- There is no `functions/` folder and no function module anywhere.
- Functions are reached only through packages: each core package names the function it belongs to in its `department` field. Ten core packages cover eight functions (strategy has two, `foundation` and `validation`; finance has two, `finance` and `fund`). Five functions have no package at all: supply-chain, customer-service, it, assets, capabilities. Data packages (`customers`, `deals`, `investors`, `money`) name no owning function, although R-11 says each is owned by one.

So the code treats a function as a label on a package. The agreed design treats it as a module with behaviour, and a package as data that a function owns.

### Standards

| Standard | What Naive takes from it |
| --- | --- |
| APQC Process Classification Framework, cross-industry, version 7.4 (2024) | The 13 Level 1 categories and their ids. The PCF continues down through process group, process, activity and task. APQC calls these *processes*, not functions (see conflicts) |
| Porter, *Competitive Advantage* (1985) | The value-chain tag on each function: primary or support |
| Fayol, *Administration industrielle et générale* (1916) | The claim that some groups of activity are present in every undertaking, whatever its size (his six: technical, commercial, financial, security, accounting, managerial). This is the "always present" property, and the oldest prior art for it |
| ArchiMate 3.2 (The Open Group) | "Business function": behaviour grouped by the resources or competences it needs, more stable than processes or the organization chart. Naive's function is this element |
| TOGAF and BIZBOK (Business Architecture Guild) | "Business capability": what a business is able to do, independent of its organization structure. Close to Naive's function; see conflicts |
| Basic Formal Ontology, ISO/IEC 21838-2:2021 | Realizable entity against its realization in a process: a function exists unexercised |
| ISO/IEC/IEEE 12207 and 15288 | Process, activity, task: the same decomposition MAD uses (R-22). A function module's agenda items should be activities in this sense |
| ISO 9001:2015, clause 4.4 | The process approach: each process has an owner, inputs, outputs and checks. Matches the module's owner, decisions and checks |

### Prior art

- **Functions present in every organization:** Fayol (1916) is the source. APQC's PCF is the modern cross-industry list.
- **Function against organization chart:** ArchiMate and TOGAF separate a business function from the organization units that perform it. Naive's "departments are an optional grouping" is the same separation.
- **Function against capability:** enterprise architecture argues about this. One common reading: a capability is what a business *can* do (its potential), and a function is what it *does* (its activities). Naive's "exists even when empty" sits closer to capability.
- **Not found in this search:** functions as executable modules with machine-checked membership tests (total, rigid, independent, activity not identity) and a proof that phases never add or remove one. APQC, ArchiMate and BIZBOK are reference models for people to read, not code that runs against a venture's records.

### Conflicts with `main` and with agreed decisions

1. **File or folder.** R-06 says `functions/<id>.ts`; EE-090 says one folder per function. Proposed: a folder `functions/<id>/` whose `index.ts` is the function module, so it can also hold the Lean mirror and the function's own README.
2. **"Function" or "process".** APQC's 13 categories are process categories. Naming them functions is our choice (R-05, agreed). It holds under the four tests, but the ontology entry should say we take APQC's *categories*, not its meaning of "process".
3. **"Function" or "capability".** "Capability" is already a glossary term, as a capability of a product (EE-098: precog is a capability). Using BIZBOK's "business capability" for the 13 would clash with that, so "function" stays. The ontology entry should cite the capability debate as a known alternative.
4. **R-11's "research" function.** R-11 says "the validation function is renamed research". There is no validation function in the 13; `validation` is a *package* under strategy. Proposed reading: rename the `validation` package to `research`, owned by strategy (or by capabilities). This needs Torian's confirmation.
5. **Communications.** The meta-schema asks whether publishing should be a 14th function or sit under marketing-and-sales. Open.
6. **`departments.json` and the `departments` field** still exist and are used, against EE-090.

### What must be built

| Item | Check that proves it |
| --- | --- |
| Rename `operations/departments.json` to the function catalog; drop `departments` from the venture schema (keep an alias for one release) | `check-nouns` lists "department" as retired for this meaning |
| `functions/<id>/index.ts` for each of the 13, exporting state, decision classes, agenda per phase and checks | One generic test runs the four tests on every module |
| Every package names its owning function, data packages included | Schema check: no package without a function |
| Every decision record names the function that owns its class | Docket check: no unowned decision |
| Lean: the four tests as `Prop`s, and the theorem that no phase transition adds or removes a function | `lake build` |
| Decide conflicts 1, 4 and 5 and record them with `affects` | Decision conformance check |

### Sources

- APQC PCF cross-industry 7.4: https://www.apqc.org/resource-library/resource-listing/apqc-process-classification-framework-pcf-cross-industry-pdf-12 ; levels: https://www.apqc.org/sites/default/files/files/PCF%20Collateral/Understanding%20the%20PCF%20Elements%20%20-%20FINAL.pdf
- Fayol's six activity groups: https://en.wikipedia.org/wiki/Henri_Fayol ; https://www.ebsco.com/research-starters/history/fayol-publishes-general-and-industrial-management
- Function against capability: https://bizzdesign.com/blog/capabilities-vs-business-functions-same-difference ; https://www.grahamberrisford.com/00EAframeworks/01Fundamentals/Business%20functions%20in%20TOGAF%20and%20ArchiMate.htm
- ISO/IEC 21838-2:2021: https://webstore.iec.ch/en/publication/72703

## 3. Packages

### What kind of thing it is

Packages answer "what" at the venture scale (R-02): the venture's records and data. Zachman's "what" column is the inventory of things the enterprise keeps information about. Naive's what is two things:

- A **record** is information kept as evidence of what the venture is and has decided, and as an asset (ISO 15489-1:2016's definition of a record). In BFO terms (ISO/IEC 21838-2, with the Information Artifact Ontology built on it) a record is an *information content entity*, a generically dependent continuant. Two copies of the same JSON file on two machines are one record. That is why provenance links to a record by id and content hash (R-17), not by file path.
- A **package** is the unit that defines a group of record types: their schemas, templates, checks and at most one minimal skill on how to write them. It is offline and names no vendor, and it is listed in `venture.json` the way `package.json` lists dependencies (EE-071). A package is a definition. The records a venture writes with it are its instances.

A package is not a function. The function owns and acts on the records (section 2); the package defines them. A **kit** is Mentura's enhanced version of a package (EE-071), and agents never come inside a package: an agent that works a package is a package enhancement (`library/packages/catalog.json`).

### Its parts

`library/packages/catalog.json` (EE-067, EE-069) defines five package kinds:

| Kind | Holds records? | Examples | What it is, ontologically |
| --- | --- | --- | --- |
| core | Yes, and each record has exactly one home | finance, legal, marketing, people, product, relationships, operations, fund, foundation, validation | The venture's own facts |
| data | Yes | customers, deals, investors, money | Facts about other parties and transactions |
| handoff | No: a versioned snapshot of core packages for one receiver | cofounder, counsel, engineering, investor, partner | A **view**, not a what. By "records are the truth, artifacts are views", a handoff is an artifact |
| folder | Yes | decisions, evidence | Storage for record types every function uses |
| raw | Unprocessed inputs | raw | Sources before they become records (EE-070) |

Each package descriptor (`library/packages/<name>/package.json`) has:

- `required` and `optional` record types, and `refs` (records in other packages it reads);
- `base`: a weight per phase (finance: 0.2 in Discovery, 0.5 in Validation, 0.8 in Beachhead, 1 after);
- `when`: conditions that raise the weight (finance: at least 0.8 when raising);
- `gates`: when the package is complete (a person has confirmed every required record and every record it reads);
- `checks`, `skill`, `templates`, `unlocks`, and `department` (the owning function).

The record types themselves are registered in `schema/data-model.json`: 117 types, each with its JSON Schema (2020-12), the paths where its records live, its area, and its record generator (EE-099; 114 types still listed in `schema/generators/gaps.json`).

### How it works in the code today

- A package is complete when a person has confirmed every required record and every record it reads. Completion opens its gate to MAD's automation tier.
- Inside a package a record waits until the records it reads are confirmed (`records.after` in the catalog).
- Which packages a venture should attend to now is the need-now score: the phase weight, raised by conditions, with facts from the records first and from the question matrix where the records are silent (EE-028). Under R-10 this means attention, not existence: every function exists from day one, and records arrive when needed.
- The Everything Ecosystem venture keeps its package folders at the venture root (`customers/`, `finance/`, `foundation/`, `validation/` and so on), not under `knowledge/`.

### Standards

| Standard | What Naive takes from it |
| --- | --- |
| Zachman Framework (1987) | The "what" column: the things an enterprise keeps information about |
| ISO 15489-1:2016, records management | The definition of a record (evidence and asset), and the principles that records are authentic, reliable, complete and usable |
| ISO 23081, metadata for records | What a record must carry about itself and its context. Naive splits this: current state in the record, history in provenance (section 6) |
| ISO/IEC 11179, metadata registries | `schema/data-model.json` is a registry of record types; 11179 says how each data element is named, defined and registered |
| BFO (ISO/IEC 21838-2) and the Information Artifact Ontology | A record is an information content entity: one record, many copies |
| JSON Schema 2020-12 | Every record schema (94 schema files) |
| Frictionless Data Package v2 (Open Knowledge Foundation, 2024) | The closest open standard for a package descriptor: `datapackage.json` lists resources with their schemas. Naive's `package.json` does the same for record types, and adds phase weights, gates and an owning function |
| npm `package.json` | The dependency model: a venture lists its packages (EE-071) |

### Prior art

- **Records as evidence:** ISO 15489 and the records-management field.
- **Packaged, schema'd data:** Frictionless Data Packages, W3C DCAT for catalogs of datasets, and npm for versioned, declared dependencies.
- **One home per record, others read it:** the single-source-of-truth principle in master data management, and the aggregate in domain-driven design (Evans, 2003), where one aggregate owns each piece of state.
- **Not found in this search:** packages whose relevance is scored per lifecycle phase (`base`, `when`) and whose completion is a human-confirmation gate that unlocks automation. Data package standards describe data; they do not say when a venture needs it or who must confirm it.

### Conflicts with `main` and with agreed decisions

1. **Handoff packages are views.** They hold no records, so under "records are the truth, artifacts are views" they belong with publishing and handoffs, not in the what. Proposed: keep the kind for now, and record in the ontology that a handoff is an artifact.
2. **Packages name a "department", not a function.** The field should be `function` (EE-090), and data packages must name one too (R-11).
3. **Where packages live.** EE-086 (in force) puts packages flat in `knowledge/`; the venture on `main` keeps them at its root.
4. **The `foundation` package** is split by identity (section 1).
5. **The `validation` package** has the same name as the Validation phase. That collision is the likely reason for R-11's rename to `research`.
6. **Schemas are not in their packages.** `package.json` has `"schemas": []` and the schemas live in `schema/`. Either a package holds its schemas (like a Frictionless package) or the registry does; today both are half true.

### What must be built

| Item | Check that proves it |
| --- | --- |
| `department` becomes `function` on every package; data packages name an owner | Schema check: no package without a function |
| Move package folders under `knowledge/` (EE-086), with route aliases | `naive check` finds no package folder at the venture root |
| Rename `validation` to `research` (pending confirmation of R-11's reading) | `check-nouns` |
| Decide whether schemas live in packages or in the registry | Decision with `affects` |
| Record generators for the 114 types in `gaps.json` | `check-data-model.mjs`; the gap list shrinks to zero |

### Sources

- ISO 15489-1:2016 definition: https://en.wikipedia.org/wiki/Records_management ; https://www.casrai.org/guides/iso-15489-records-management-concepts-principles
- Frictionless Data Package v2: https://github.com/frictionlessdata/Specs ; https://msi.dublincore.org/standards/frictionless-data
- ISO/IEC 21838-2:2021: https://webstore.iec.ch/en/publication/72703

## 4. Phases

### What kind of thing it is

A phase is a property a venture has for a while, because of its own state, and then loses: in OntoClean and UFO terms an **anti-rigid, intrinsic** property (section 1). A venture in Discovery leaves Discovery and is the same venture. Phases answer "when" at the venture scale (R-02).

Three things follow:

- **Phases partition a venture's life.** At any valid time a venture is in exactly one phase. That is the phase partition R-09 asks to be proved in Lean.
- **A phase never adds or removes a function** (R-13, agreed). It sets each function's agenda. ISO/IEC/IEEE 15288 makes the same split for systems: its processes (the functions here) can be performed in any life-cycle stage, and a stage is a period of the life cycle, not a kind of work.
- **A phase has two times** (R-12, agreed): when it was true (valid time) and when the records said so (transaction time). This is the bitemporal model of Snodgrass (1999), standardized in SQL:2011 as application-time and system-versioned periods. A late correction ("we actually reached product-market fit in March") adds a new line; it never rewrites history.

In a statechart (Harel, 1987) the phases are states, the gates are guarded transitions, and the sub-phases are ordered markers inside a state that never guard anything (R-15).

### Its parts

| Part | What it is | Status |
| --- | --- | --- |
| The five phases | Discovery, Validation, Beachhead, Scale, Platform, each with a question and a gate (EE-012) | Built: `purpose/frameworks/product-anatomy/phases.json`, the `phase` enum in `venture.schema.json` |
| Gate | The condition for leaving: problem-solution fit; product-market fit (retention holds); repeatability; market leadership with healthy margins; others building on it | Built as text; checked through exit criteria |
| Exit criteria | What must be true to leave this phase, each met with a date, a person and evidence. Under R-13 they are the union of the functions' criteria for the phase, and each belongs to one function | Built without the function link: stored in the telos record (`telos.phases`) |
| Lifecycle playbook | The order of decisions and the evidence that clears each gate: `product-first` (default) or `revenue-first` | Built: `purpose/frameworks/product-anatomy/playbooks/` |
| Phase span | valid_from, valid_to, recorded_at, evidence, person (R-12) | Not built |
| Sub-phases | Ordered markers that never gate (R-15). "Idea" is Discovery's first (R-14) | Not built |
| Function agenda per phase | What each function works on in this phase (R-13) | Not built; the nearest thing is the per-phase weight on packages and need-now priors |

### How it works in the code today

- The current phase is one mutable field, `phase`, in `venture.json`.
- Phase changes are events in the freshness log (`event: "phase"`, with `from`, `to`, `at`), written by `mentura phase <id>`. If `venture.json` is changed by hand, `schema/freshness.mjs` warns that the field and the last recorded change disagree, and falls back to the file's modification time.
- `schema/lifecycle.mjs` decides whether the venture may move: it reads the exit criteria from the telos and the playbook's gate evidence. `console/lib/phase.ts` only shows the founder that answer; nothing in the console decides.
- Records can be stale per phase: a freshness profile with `per_phase` marks a record stale once the venture changes phase after the record was last checked.
- Need-now (EE-028, `schema/need-now.json`) gives each record type a prior per phase, raised or lowered by facts about the venture.

So the code already keeps phase changes as events, which is half of R-12. It has only one time per event, and the mutable field in `venture.json` competes with the log as the source of truth.

### Standards

| Standard | What Naive takes from it |
| --- | --- |
| OntoClean and UFO | A phase as an anti-rigid intrinsic property, distinct from a role (relational) and from a kind (rigid) |
| ISO/IEC/IEEE 15288 and 24748-1 | Life-cycle stages are periods; processes run across stages. Phases against functions is the same split |
| SQL:2011 temporal tables (ISO/IEC 9075-2:2011); Snodgrass (1999) | Valid time and transaction time: the phase span's two times |
| ISO 8601 | Every date and time in a phase span |
| Allen's interval algebra (1983) | How two spans relate (before, meets, overlaps): the check that a venture's phase spans meet with no gap or overlap |
| Harel statecharts (1987) | Phases as states, gates as guarded transitions; the form pstack's statechart skill checks with TLA+ |

### Prior art

- **The phases themselves:** Blank, *The Four Steps to the Epiphany* (2005) for Discovery and Validation; Moore, *Crossing the Chasm* (1991) and *Inside the Tornado* (1995) for Beachhead and Scale. Churchill and Lewis, "The Five Stages of Small Business Growth" (1983), is the older growth-stage model.
- **Gates with criteria:** Cooper's Stage-Gate (1990).
- **Phases against disciplines:** the Rational Unified Process (Kruchten) draws disciplines (requirements, implementation, testing) running across phases (inception, elaboration, construction, transition) with effort rising and falling in each. That chart is the prior art for R-13's function-by-phase matrix.
- **Not found in this search:** a venture's phase kept as a bitemporal, append-only log with evidence and a person on each span, and gates that check exit criteria owned by functions. Startup-stage models are frameworks for people to read; none is a record a program checks.

### Conflicts with `main` and with agreed decisions

1. **Two sources of truth for the current phase:** the mutable `phase` field and the freshness log. Proposed: the log of phase spans is the truth, and `phase` in `venture.json` becomes a derived value the checks recompute.
2. **One time, not two.** Phase events have `at` only. R-12 needs valid and recorded times.
3. **Exit criteria live in the telos.** The telos end state is identity (section 1), but its exit criteria are phase data owned by functions. The split of `foundation/` must move them out.
4. **Agenda per phase sits on packages**, not on functions (section 2).

### What must be built

| Item | Check that proves it |
| --- | --- |
| A phase span record and `phases.jsonl` log (append-only), migrated from the freshness log's phase events | Check: spans meet with no gap or overlap; the current phase in `venture.json` equals the derived one |
| Each exit criterion names its function | Schema check |
| Sub-phases as ordered markers, "Idea" first in Discovery | Check: no gate reads a sub-phase |
| Function agenda per phase, in each function module | Generic test: every function has an agenda for every phase (empty allowed) |
| Lean: the phase partition and "no transition changes the function set" | `lake build` |

### Sources

- ISO/IEC 9075-2:2011 temporal features; Snodgrass, *Developing Time-Oriented Database Applications in SQL*, Morgan Kaufmann, 1999.
- Harel, "Statecharts: A visual formalism for complex systems", *Science of Computer Programming* 8(3), 1987.
- Allen, "Maintaining knowledge about temporal intervals", *CACM* 26(11), 1983.
- Churchill and Lewis, "The Five Stages of Small Business Growth", *Harvard Business Review*, May-June 1983.
- Cooper, "Stage-Gate Systems: A New Tool for Managing New Products", *Business Horizons* 33(3), 1990.
- Kruchten, *The Rational Unified Process: An Introduction*, Addison-Wesley, 1998.

## 5. Where and why

These are two systems that share a section because neither has its own folder yet.

### 5a. Where

#### What kind of thing it is

Where is the venture's position in the world: whom it serves, in which places and under which laws, and through which channels it reaches them (R-02). All of it is anti-rigid. A venture can change market and stay the same venture. Most of it is relational, linking the venture to something outside it (a market, a jurisdiction, a channel), so in UFO terms these are relators and roles, not properties of the venture alone.

Where has four parts with different kinds:

| Part | Kind | Example |
| --- | --- | --- |
| Market, then segment, then ideal customer profile (ICP) | A classification of the people served, nested from broad to specific (proposed as separate records in the meta-schema) | b2b; early founders who build with AI; the ICP record |
| Geography | Places, by code | US, CA |
| Jurisdiction | The legal places whose rules apply, which can differ from geography (a Delaware entity selling in Texas) | US-DE for the entity, US-TX for sales tax |
| Channel | The route by which the venture reaches a segment | founder-led sales, X, LinkedIn, Substack |

Industry (what the venture produces, as a NAICS code) is in `venture.json` today. It describes the what of production, not the where, but every industry map reads it as a position in the market.

#### How it works in the code today

- `venture.json` `industry`: NAICS code and label, re-checked at each phase gate. The Everything Ecosystem is 513210, Software Publishers.
- `product.schema.json` `market`: whom each product serves, after Abell's three dimensions of a business (customer groups, customer functions, technologies), with `customer` (b2c, b2b, b2g, b2b2c) and `relationship` (customer, client, user, member, audience, partner, EE-021). Geography sits at `market.geography`.
- `foundation/icp/*.json`, against `schema/icp-profile.schema.json`: one record per ICP, with traits, jobs, where to find them, buying roles and the channels that reach them.
- `venture.json` `core.promised_to`: the ICP's short form.
- `validation-go-to-market` records: channels.
- `venture.json` `regulation`: how much laws and regulators constrain the venture (EE-040). Jurisdiction appears nowhere else.

So where is spread across five records, with no market or segment record of its own, and ICPs filed under `foundation/`.

#### Standards

| Standard | What Naive takes from it |
| --- | --- |
| NAICS 2022 | Industry codes (already used) |
| ISO 3166-1 and ISO 3166-2 | Country and subdivision codes for geography and jurisdiction |
| Abell, *Defining the Business* (1980) | Customer groups, customer functions and technologies: already the shape of `product.market` |
| W3C SKOS (2009) | Broader and narrower concepts for the market, segment and ICP hierarchy (proposed) |
| ISO 4217 | Currency codes, where a market is priced |

#### Prior art and what is new

Market segmentation and ICPs are standard marketing practice, and Abell's business definition is forty years old. What Naive adds is keeping them as linked records the docket and gates can read: for example, refusing a pricing decision whose segment has no evidence. That claim is untested.

#### Conflicts

1. The strategic foundation puts the ICP under "who" (section 1). Under R-02 it is where.
2. ICPs live in `foundation/`, which the identity split must move.
3. Jurisdiction is not modelled except as a level of regulation, although the legal entity (section 1) and compliance gates need it.

### 5b. Why

#### What kind of thing it is

Why has two parts of different kinds (R-02, agreed):

- **Essential why:** the venture's purpose and core promise. It is rigid by decision, so it belongs to identity (section 1). Changing it is a refounding or an amendment (open).
- **Contingent why:** the reasons for everything else. Goals, exit criteria, principles, and the reasons behind each decision. All of it can change, and each change is itself a decision.

This split has a direct precedent. Collins and Porras ("Building Your Company's Vision", *HBR*, 1996) divide a company's vision into a **core ideology** (core purpose and core values, which do not change) and an **envisioned future** (goals, which do). Their core ideology is the essential why; their envisioned future is the contingent why.

The contingent why is a structure of **reasons**. A decision record holds the reasons it was made, each with citations, and freezes the cited files' hashes when it is approved (R-18). In argument terms (Toulmin, 1958) a reason is a claim backed by data under a warrant. In design-rationale terms (IBIS, Kunz and Rittel, 1970) it is a position on an issue, with arguments for and against.

#### How it works in the code today

| Where | What | Which why |
| --- | --- | --- |
| `venture.json` `core.promise`, `core.must_not` | The core promise, and what the venture will not do | Essential |
| `foundation/telos` (`telos.schema.json`) | The end state, horizon, measures, owner outcome, exit criteria per phase, steering | End state: essential. The rest: contingent |
| `foundation/goals/*.json` (`goal.schema.json`) | Goals with kind, horizon, end state, value, why, measures, owner | Contingent |
| `foundation/alignment.json` | Principles the venture will not break, each with a source and a check | Contingent (the strategic foundation's "whether") |
| Decision records, `reasons` | Reasons with citations, hashes frozen at approval (`schema/reasons.mjs`) | Contingent |
| `schema/check-reasons.mjs` | Reports a decided decision whose cited file has changed since approval, and marks it stale | Built check |

The decision side is the most complete part of Naive: reasons, citations, frozen hashes and a check that fails when a reason moves.

#### Standards

| Standard | What Naive takes from it |
| --- | --- |
| OMG Business Motivation Model (BMM) 1.3 | The standard vocabulary for why. Ends (vision, goal, objective) against means (mission, strategy, tactic); directives (business policy, business rule); influencers and assessments. Note: in BMM a mission is a *means*, not an end |
| ArchiMate 3.2 motivation elements | Driver, assessment, goal, outcome, principle, requirement: the same layer in the architecture language Naive's functions already map to |
| ISO 9001:2015, clause 6.2 | Quality objectives: measurable, monitored, updated. The shape of a goal's measures |
| IBIS (Kunz and Rittel, 1970) and QOC (MacLean and others, 1991) | Design rationale: issues, positions, arguments. Decision reasons and the inquiry records (`naive-design/inquiries/`) |
| ISO/IEC/IEEE 42010 | Architecture rationale: each architecture decision records why |
| Toulmin, *The Uses of Argument* (1958) | Claim, data, warrant: what a reason with a citation is |
| W7 (Ram and Liu, 2009) | Why as one of the seven provenance questions about a record (section 6) |

#### Prior art and what is new

- **Unchanging purpose against changing goals:** Collins and Porras (1996); BMM's ends and means.
- **Decision rationale as records:** IBIS, QOC, and architecture decision records (Nygard, 2011).
- **Not found in this search:** reasons whose citations are frozen by content hash at approval, so a decision turns stale on its own when the evidence behind it changes. Decision records elsewhere keep rationale as prose.

#### Conflicts

1. **"Mission".** The strategic foundation calls `core.promise` the mission and files it under "what". BMM files mission under means (how), and Naive files the core promise under essential why. The glossary must pick one meaning and record the others as scoped senses.
2. **The telos mixes both whys:** the end state is essential; the measures and exit criteria are contingent. The identity split must divide it.
3. **The strategic foundation's "whether"** has no slot in R-02's six questions. Proposed: it is the contingent why, read from alignment principles.

### What must be built (where and why)

| Item | Check that proves it |
| --- | --- |
| Market, segment and ICP as separate, linked records (SKOS broader and narrower) | Schema check: every ICP has a segment, every segment a market |
| Jurisdiction as ISO 3166 codes on the legal entity and on each market | Schema check |
| Split the telos: end state into `identity/`, exit criteria to phases, measures to goals | `naive check` finds no essential-why field outside `identity/` |
| Map goals, principles and decisions to BMM terms in `docs/ontology.json` | `check-nouns` |
| Decide "mission" and "whether" | Decisions with `affects` |

### Sources

- Abell, *Defining the Business: The Starting Point of Strategic Planning*, Prentice-Hall, 1980.
- Collins and Porras, "Building Your Company's Vision", *Harvard Business Review*, Sept-Oct 1996.
- OMG, *Business Motivation Model* 1.3, 2015: https://www.omg.org/spec/BMM/
- The Open Group, *ArchiMate 3.2 Specification*, 2022, chapter 6 (motivation elements).
- Kunz and Rittel, "Issues as Elements of Information Systems", Working Paper 131, Berkeley, 1970.
- W3C, *SKOS Simple Knowledge Organization System Reference*, 2009: https://www.w3.org/TR/skos-reference/

## 6. Provenance

### What kind of thing it is

Provenance is the six questions asked of a record instead of a venture: who wrote it, what it is, when, where (through which interface and route), why (under which decision), and how (by which activity, from what). R-01 calls this the record scale. Provenance is *information*. Keeping and checking it is a *capability* (provenance tracking, from the capability vocabulary run).

In W3C PROV terms (PROV-DM, 2013) every line is a small graph:

- an **entity** (the record version, by content hash);
- an **activity** that generated it (write, draft, accept, confirm, move, baseline, release);
- an **agent** associated with that activity (a person, or an agent through an interface);
- and the entities it was **derived from**.

Records hold only their current state; their history is the log (R-17, agreed). Each log line carries the hash of the line before it, so the log is append-only by construction: changing an old line breaks every later hash.

### Its parts

| Part | What it is | Status |
| --- | --- | --- |
| `provenance.jsonl` | One log per venture, one line per write, hash-chained (EE-031) | Built; 127 lines in the Everything Ecosystem venture |
| `schema/provenance-entry.schema.json` | The shape of a line | Built |
| `schema/check-provenance.mjs` | Verifies the chain and the entries | Built |
| Link by record id and sha256 (R-17) | Each line names the record and the hash of the version it describes | Partly built: lines carry `sha256`, but name the record by file path |
| Generated index (R-19) | A rebuildable index answering why, then-and-now and where-used questions | Not built; `naive export` (R-32) is the first generated view |
| Research provenance (R-33) | How a research finding was found: question, queries, sources, agent, time | Not built |
| Publishing attestations (R-57) | A certificate per published file | Designed, not built |

### How it works in the code today

A real line from the log:

```json
{"at":"2026-10-30T01:12:44.912Z","entity":"venture.json","activity":"write",
 "agent":{"kind":"agent","via":"cli","id":"naive-upgrade"},"derived_from":["venture.json"],
 "decision":"Torian, 2026-10-30: an opinionated schema with swappable frameworks ...",
 "note":"telos-to-goals: ambition moved to foundation/goals/scale.json",
 "sha256":"94b64a...","prev":"219dd1...","hash":"6897fa..."}
```

Mapped to the six questions:

| Question | Field | Gap |
| --- | --- | --- |
| Who | `agent.kind`, `agent.id` | None for agents. A person's id should point at a person identity (section 1) |
| What | `entity`, `sha256` | `entity` is a file path. 40 of the 127 lines are moves, and a move changes the path, so the record's identity is lost across moves. R-17 asks for the record id |
| When | `at` | One time only (transaction time). A late correction cannot say when the fact was true |
| Where | `agent.via`, `route` | Only some lines have `route` |
| Why | `decision`, `note`, `statement` | `decision` is free text, not a decision id. The why cannot be followed to its decision record |
| How | `activity`, `derived_from` | None |

The activities used so far: confirm 45, move 40, baseline 21, write 9, accept 6, draft 5, release 1. Writes through the router get a line; edits made outside it are covered only by git history (EE-031).

A finding from the ontology run on 2026-11-01: provenance is per record version, not per value. A knowledge graph of record needs a source and a date on each value (checks KR1 and KR2); Naive's records fail those checks today.

### Standards

| Standard | What Naive takes from it |
| --- | --- |
| W3C PROV-DM and PROV-O (Recommendations, 2013) | Entity, activity, agent, `wasGeneratedBy`, `wasDerivedFrom`, `wasAssociatedWith`: the fields of each line |
| W7 (Ram and Liu, 2009) | Provenance as seven questions (what, when, where, how, who, which, why). Naive's six questions at record scale follow it |
| ISO 23081, metadata for records | Event history as records metadata, kept apart from the record's content |
| ISO 15489-1:2016 | Authenticity and reliability: what the hash chain is for |
| Hash-chained logs: Schneier and Kelsey, "Secure Audit Logs" (1999); Certificate Transparency (RFC 6962, 2013) | Each entry commits to the one before, so tampering is detectable |
| in-toto and SLSA | Attestations for published artifacts (R-57) |
| Event sourcing (Fowler, 2005) | Current state as a result of the event log. Naive keeps the state in the record and the events in the log, and both must agree |

### Prior art

- **Data provenance models:** W3C PROV and W7 are standards, and Open Provenance Model (2008) came before PROV.
- **Tamper-evident logs:** Schneier and Kelsey, Certificate Transparency, git's content-addressed history.
- **Not found in this search:** the same six questions asked at two scales, so that the venture's who, what, when, where, why and how (sections 1 to 5) and each record's provenance share one vocabulary and can be checked against each other. For example: the who of a write must hold the role that owns that function. W7 and PROV stop at the record.

### Conflicts with agreed decisions

1. **Path, not id** (R-17).
2. **Free-text decisions.** The why must be a decision id so the index can follow it.
3. **One time.** Phase spans (section 4) need two; other records may too.
4. **Where the log lives.** EE-086 puts `provenance.jsonl` under `meta/`; the venture on `main` keeps it at the root.

### What must be built

| Item | Check that proves it |
| --- | --- |
| `record` (id) on every line, with `entity` (path) kept as where | `check-provenance.mjs`: every line resolves to a record id |
| `decision` as a decision id, with free text moved to `note` | Check: every decision id resolves |
| The who of a write holds the role that owns the record's function | Cross-scale check (venture-scale who against record-scale who) |
| The generated index (R-19) | Rebuilt from files gives the same index |
| Per-value source and date where a record is a knowledge graph of record (KR1, KR2) | The KGR checks pass |

### Sources

- W3C, *PROV-DM: The PROV Data Model*, 2013: https://www.w3.org/TR/prov-dm/
- Ram and Liu, "A New Perspective on Semantics of Data Provenance", 2009 (W7).
- Schneier and Kelsey, "Secure Audit Logs to Support Computer Forensics", *ACM TISSEC* 2(2), 1999.
- RFC 6962, *Certificate Transparency*, 2013.

## What the six sections show together

1. **The model is agreed; the code is one model behind it.** Every system has an agreed design (R-01 to R-19) and a different shape on `main`: identity spread across `venture.json` and `foundation/`; functions as labels on packages; phase as one field; where and why mixed into `foundation/`; provenance by path.
2. **`foundation/` is where the systems collide.** It holds identity (telos end state), where (ICPs), contingent why (goals, alignment), phase data (exit criteria) and research (the problem). Splitting it is the single change that moves four systems at once.
3. **Two six-question models disagree.** `purpose/strategic-foundation.json` (on `main`) and R-02 (in unmerged PR #125) assign who, what and why differently. One decision fixes it.
4. **Naive's new parts are the checks, not the categories.** Every category above has a standard or prior art. What we did not find elsewhere is a venture whose categories are files a program checks: function membership tests, phase spans with evidence, reasons frozen by hash, and the same six questions checked across both scales.

The next step is to merge these six sections into the single Naive record, and then to write the technical version that states Naive as a symbolic system.
