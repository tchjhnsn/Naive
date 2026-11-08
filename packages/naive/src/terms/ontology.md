---
type: reference
source: hybrid
created: 2026-10-27T04:18:09Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, ontology, glossary, nouns]
description: "The system's nouns at every level, the standard each follows, its references, and the retired nouns with what replaced them. Generated from packages/naive/src/terms/ontology.json (canonical) by node packages/naive/src/checks/check-nouns.mjs --md (EE-014)."
---

# Ontology

The system is opinionated: it names one default for each choice, and every default carries references to its sources and the alternatives it weighed (EE-014). Its nouns follow one rule: **standards first**. Use an established term with its standard meaning, and coin a word (marked "ours") only when none exists.

- Canonical: `packages/naive/src/terms/ontology.json`. This page is generated from it; regenerate with `node packages/naive/src/checks/check-nouns.mjs --md`.
- `node packages/naive/src/checks/check-nouns.mjs` fails when a retired noun reappears in the schema, design docs, Product Anatomy, AGENTS.md or README.md, when a noun has no standard, or when a function's capabilities are missing, retired or owned by another function.
- Each noun names a `function` (one id from `packages/naive/src/functions/departments.json`, or nothing when the word is shared) and a handoff type (yes when that noun can type a package). A shared noun may appear in any package and never decides which function the package belongs to.
- `node packages/naive/src/checks/check-nouns.mjs --package <file> --function <id>` prints one verdict: admit, refer to the function that owns the type, or reject. `--record` appends that verdict to `<id>.provenance.jsonl` beside the package. The verdict is not stored on the handoff. The receiver has to be a function noun. A schema checker that cannot run exits 2 and records nothing.
- A scoped noun is written `name@function`. The suffix is a function id, and the noun's function is that same id. A bare name is not added beside a scoped sense. A retired bare name may stay, as the pointer to the senses that replaced it.
- A fact value is the boolean true or a record. Any other value fails that property. Two records that give one field two values are a reject. A record the term cannot read fails every property of that type. That is a reject of the package, and it is recorded.
- References are ids in `<layer>/references/references.json`.
- The genus of the whole is open: files say "the system" until the first venture runs end to end, then it is settled as an operating system or an operating model.
- Phases and gates: Discovery, Validation, Beachhead, Scale, Platform (EE-012). Three Horizons, VC funding stages and Blank's customer development are lenses onto them, mapped in the ontology research doc (https://claude.ai/artifact/6LcDgsc8SA9ybY5ddTfsMn).
### System

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| Everything Ecosystem | The name of the system | ours |  |  |  |
| the system | How files refer to the whole. Proposed genus (EE-024): a venture development framework; operating system and operating model are set aside | EOS (Wickman) for 'operating system' |  |  |  |
| venture development framework | Proposed genus of the Everything Ecosystem (EE-024): an opinionated framework for developing ventures, in the same genus as web development frameworks. Like them it gives conventions over configuration (one default per choice, with references), a fixed structure the builder fills in (the venture folder, layers and records), generators (init-venture), checks that run like tests, a data model, and packages (packages/naive/library/packages/<name>/package.json, EE-071). The builder's venture calls on it, and its checks call back on the venture's records | software framework (Johnson and Foote 1988; Rails' convention over configuration) applied to venture development (venture building, venture studios) |  |  |  |
| method | What to do: Product Anatomy, handoffs; MAD, the method for building software, is a separate product (EE-038) | common usage |  |  |  |
| schema | What to record: venture.json, products, decisions, references | JSON Schema |  |  |  |
| tooling | What helps do it: scripts, skills, agent rules | common usage |  |  |  |
| workspace | One builder's instance of the system, declared by workspace.json | common software usage |  |  |  |
| layer | One of the six: purpose, knowledge, operations, evidence, governance, interface (execution folded into operations, EE-038). A layer organizes the framework repository (its manifest is <layer>/layer.json). It is a property of a record type, not a venture folder (EE-071) | ours |  |  |  |
| integration | A tool or service one layer uses, listed in <layer>/tooling/integrations.json (Obsidian for knowledge, Linear for operations, GitHub checks for evidence). A workbench reaches integrations; it is not one | systems integration |  |  |  |
| capability cluster | One group of capabilities that GitHub plus Naive cannot provide for a venture, served by one outside tool however many functions depend on it (one tool per cluster, not one per function). Naive's catalog, packages/naive/src/functions/it/capability-clusters.json, lists six from the whole-venture monorepo thesis, each with the functions that depend on it and the gap kinds that justify an outside tool (regulated authority, a network or money rail, a runtime, a UI preference); it names no vendor | business capability (business architecture, TOGAF capability-based planning) |  |  |  |
| data model | The list of every record type in the ecosystem, the layer that owns it, its schema, where its records live and what it references (packages/naive/src/records/data-model.json). It is the master map; no single schema contains everything | data model (ANSI/SPARC; entity-relationship modelling, Chen 1976) |  |  |  |
| record type | One kind of record in the data model, such as venture, product, handoff or evidence, owned by exactly one layer or by the system | record type (database usage) |  |  |  |
| layer manifest | The file (<layer>/layer.json, system layer at packages/naive/src/records/layer.json) that lists what one layer of the framework repository holds: its skills, the record types it still owns, those it reads and writes, and its checks. Layer relationships are derived from manifests (EE-018, EE-071) | package manifest (common software usage) |  |  |  |
| vault | The folder of documents (Markdown notes and JSON records) that holds a workspace's venture folders, their records and decisions. Every workspace has one; a venture outside software may need nothing else | Obsidian's name for a folder of notes; generically a knowledge base |  |  |  |
| repository (repo) | A version-controlled store, normally Git, holding code and the documents that ship with it (docs-as-code). A venture that builds software needs at least one; repo is the short form | version control (Git: repository) |  |  |  |
| template | A fill-in starting point for one record or document: the fields, what to write in each and what a strong one looks like. A kit holds templates; a template holds no rules and checks nothing | common usage (document template) |  |  |  |
| provenance | Who or what produced a record, by which activity, from what, and under which decision: explicit in the provenance log for writes through the router, implicit in git history for everything else (EE-031) | W3C PROV (PROV-DM: entity, activity, agent) |  |  |  |
| provenance log | A venture's append-only record of writes, <venture>/provenance.jsonl: one line per write naming the file, the activity (write, draft, accept, baseline), the person or agent and the interface, what it was derived from and the decision; each line carries the previous line's hash (EE-031) | W3C PROV; hash-chained append-only log (common audit usage) |  |  |  |
| as-of view | The venture as known at one transaction time: each record as provenance and the blob store held it then, and only the signals observed by then. Nothing written later changes it (as_of_no_lookahead in packages/naive/lean/Naive/Recipes.lean) | SQL:2011 system time; Snodgrass 1999 |  |  |  |

### Venture

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| central data management structure | What a venture's scaffolding is (EE-085): one structure for everything the venture knows, under one set of conventions, with pointers to the systems of record that keep the rest. It suits solo founders and small founding teams, for whom one central structure replaces separate SaaS silos and gives agents the whole picture | master data management, centralized style (DAMA-DMBOK) |  |  |  |
| venture | The unit: anything a builder undertakes, from a hobby to a company. Ventures can hold ventures | common business usage |  |  |  |
| phase | How far a venture has come: discovery, validation, beachhead, scale, platform | Blank; Moore | blank-2005-four-steps, moore-1991-crossing-the-chasm, moore-1995-inside-the-tornado |  |  |
| gate | The test for leaving a phase: problem-solution fit, product-market fit (retention), repeatability, market leadership | Andreessen; Zook and Allen | andreessen-2007-only-thing-that-matters, zook-allen-2012-repeatability |  |  |
| ambition | Why the venture exists and how far it means to go: hobby, survival, lifestyle, managed growth, aggressive growth | IRS (hobby); venture-type literature | irs-treas-reg-1-183-2, elgar-what-do-entrepreneurs-create |  |  |
| legal form | none, sole-prop, partnership, llc, s-corp, c-corp, benefit-corp, nonprofit | US entity types |  |  |  |
| funding | bootstrapped, grant, angel, venture capital, debt, mixed | common usage |  |  |  |
| industry | What the venture produces, by its current flagship | NAICS | naics-2022, gics-msci |  |  |
| core product | The promise, who it is made to, what it must not deliver, and the competence behind it | Kotler; Prahalad and Hamel | kotler-core-product, prahalad-hamel-1990-core-competence |  |  |
| account | A named party a venture keeps a record for, at accounts/<id>/account.json, with a relationship: client, customer, user, member, partner or other. Optional; who a product serves in general is its market | CRM usage (Salesforce, HubSpot: account) |  |  |  |
| relationship | How a party or market stands to the venture: customer (buys), client (served under a professional relationship), user (uses, may not pay), member (belongs), audience (reads, watches or listens; markets only), partner | common business usage; client as a customer of professional services |  |  |  |
| link | What crosses from one venture into another, one way, with a border | Clark's work/family border theory |  |  |  |
| venture profile | The readable companion to venture.json: narrative, pillars, changelog | ours |  |  |  |
| function | A business function with one accountable owner. One person may own several. A solo founder owns them all. Decision rights and the team plan point at function owners (EE-071). department is the alias for one release | business function (common usage) |  |  |  |
| pillar | Product, brand and business, in every venture | ours |  |  |  |
| venture template | The scaffold for a venture: pillars, roles, decision rights | ours |  |  |  |
| kit | Mentura's word (EE-071): an enhanced package that adds automations, agent workflows, richer skills and connectors, at platform/kits/<name>/kit.json. A kit names the one package it extends and never replaces it, so the package works without the kit. The framework does not use kit for its own manifests (was the layer bundle at <layer>/kit.json) | product bundling (Adams and Yellen 1976), kept for the platform |  |  |  |
| strategic foundation | The records a founder keeps in front of them every day until they are muscle memory, answering why, what, who, how, when, where and whether, with brand beside them (packages/naive/src/functions/strategy/strategic-foundation.json). Each foundation statement is an attribute of an existing record; changing one is deliberate (type to confirm) and confirmed statements unlock delegation (EE-051, EE-052) | strategic foundation in strategic planning (mission, vision, values), widened by the Five Ws and How |  |  |  |
| customer@marketing-and-sales | The buyer this function sells to. The finance sense of the same word is customer@finance. The @ scope is the one the term list uses for two senses of one word. | Schema.org Customer |  | marketing-and-sales |  |
| customer@finance | The party the books record as the source of revenue. The marketing sense of the same word is customer@marketing-and-sales. | FIBO (Financial Industry Business Ontology), Customer |  | finance |  |

### Purpose

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| product | One thing a venture offers, stored as a card in products/ | common usage |  |  |  |
| market | Who a product serves: customer type, segment, geography, vertical or horizontal | Abell (customer groups) | abell-1980-defining-the-business |  |  |
| job | The need a product meets | Abell (customer functions); jobs to be done | abell-1980-defining-the-business |  |  |
| technology | How a product meets the need | Abell (alternative technologies) | abell-1980-defining-the-business |  |  |
| offering | product, service, platform, content, marketplace | common usage |  |  |  |
| business model | How a product earns, by St. Gallen pattern names | St. Gallen Business Model Navigator | gassmann-2014-business-model-navigator |  |  |
| portfolio role | A product's place in each phase: flagship, substrate, revenue engine, wedge, option, end product | portfolio strategy |  |  |  |
| wedge | A portfolio role: the narrow product or segment used to enter a market | Dixon (2010) | dixon-2010-thin-edge-of-the-wedge |  |  |
| Product Anatomy | The method that judges products against the core product | ours |  |  |  |
| Succession Matrix | Part of Product Anatomy that assigns portfolio roles by phase | ours |  |  |  |
| telos | The end a venture exists to reach (purpose/telos.json): statement, end state, measures, the owners' intended outcome, and exit criteria for each phase. Start with the end: other layers derive from it | Aristotle (final cause); Covey, begin with the end in mind |  |  |  |
| exit criterion | What must be true for a venture to leave a phase, written in its telos and tied to a telos measure; it refines that phase's generic gate. Not an owner's exit (governance) | Stage-Gate exit criteria (Cooper) |  |  |  |
| validation score | The probability that a venture is validated: a weighted average of sub-scores (problem, solution, product-market fit, pricing, go-to-market, team, operations readiness), each a Jev probability times its evidence weight, with floors; replaces a declared phase gate (EE-026) | ours, after Blank's customer validation | blank-2005-four-steps |  |  |
| evidence grade | How much a validation record's cited evidence can be trusted: high, moderate, low or very low, from the kind of signal, the audience, the sample, the specificity and the age; a claim with no evidence is very low | GRADE certainty of evidence | grade-handbook, fitzpatrick-2013-mom-test |  |  |
| need-now score | The probability that a venture needs a record type in its current phase and the next, from priors raised or lowered by facts about the venture; records below 0.5 are held back unless the builder asks, so builders don't overbuild (EE-028) | ours; just-in-time (lean manufacturing) and YAGNI (extreme programming) in spirit |  |  |  |
| competitor | A company serving the same customers with an offering that can replace the venture's. Its master record (competitors/<id>.json) is a person's: a projection may create it once and writes only competitors/<id>/signals.json beside it | Porter 1980 |  |  |  |
| spend register | The list of what the venture pays for, one line per paid service: vendor, purpose, amount, currency, cadence, renewal date, the paying account by reference, the function that uses it and its status (active, cancel-requested, cancelled). The finance function owns it and only its agent or a person writes it (finance/spend/[id]; lead agents design, 2026-11-08) | SaaS spend management; the subsidiary ledger of recurring vendor charges (accounts payable) |  | finance |  |

### Knowledge

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| decision | A logged choice with an id (EE- or a venture's own prefix) | ADR practice |  |  |  |
| reference | A source behind a default, recorded per layer with a stance | citation practice |  |  |  |
| signal | An immutable, content-addressed, dated statement that something happened outside the venture, an element of one signal type, rated with the Admiralty code. Noise is never a field of it: whether it matters is decided at each listener (noise_relative in packages/naive/lean/Naive/Signals.lean). Not the yes case of signal detection. Signal library design, 2026-11-06 | Shannon 1948; CloudEvents 1.0 |  |  |  |
| signal type | A typed, versioned definition of one kind of signal: its props as JSON Schema, the parts it composes, its projection into records and the default age bound for edge listeners (types/<id>/<version>.signal.json in a signal library) | CloudEvents 1.0 type; React component definition (convention) |  |  |  |
| signal library | A source that publishes signal types and signals in the naive-signal-library@1 layout and is read in place, listed in knowledge/sources.json with carries signals; nothing in it is copied into the venture. The name is tentative | component library; package registry |  |  |  |
| listener | The edge between a signal type and one consumer (a record route, a frame or a decision): the type range it hears, the consumer's criterion, and what happens (project, propose or revalidate). A listener for a part's type hears every composite with that part (part_heard in packages/naive/lean/Naive/Signals.lean). Listeners merge from config, packages, frames and kits, so there is no subscription list | W3C DOM event listener |  |  |  |
| noise | A reception whose listener's criterion fails: a relation between one signal and one consumer, never a property of the signal, so the same signal can be salient at one listener and noise at another (noise_relative and noise_undefinable in packages/naive/lean/Naive/Signals.lean). In signal detection's standard sense noise is the no case of one question; a listener's criterion answers its consumer's question at once, where a detector's no is noise only once it resolves as a correct rejection | Green and Swets 1966 |  |  |  |
| projection | The deterministic fold of a record from the signals salient for it, in (time, id) order with six fixed reducers. It reads no clock, writes through the router as the projector, and a second commit of the same render writes nothing (reconcile_idempotent in packages/naive/lean/Naive/Signals.lean) | event sourcing projection (Fowler; Young) |  |  |  |
| Admiralty rating | How far a signal can be trusted: source reliability A (completely reliable) to F (cannot be judged) and information credibility 1 (confirmed) to 6 (cannot be judged), computed in code by the producer | NATO STANAG 2511 (Admiralty code) |  |  |  |
| recipe | The pure code that makes every record at one route pattern (<pattern>.recipe.ts beside the records) from the signals heard and the facts known as of a time; a kind of projection. It runs only in Naive's sandbox, and its records are written only by the projector. Autoresearch design, 2026-11-06 | training recipe (Karpathy 2019); dbt model |  |  |  |
| hindsight label | A signal's helpful, inert or harmful effect on one record, found once the horizon has passed by comparing the loss without the signal to the loss with it. A signal the check accepts as noise is always inert (noise_inert in packages/naive/lean/Naive/Recipes.lean) | leave-one-out influence (Cook 1977) |  |  |  |
| access matrix | The source map's rules (EE-042) filled in for one shared record field by field: for each field, the system of record it is read from and written to, and the role that owns it. The spend register's is the first: the bank statement sync masters amounts and dates, finance owns status, IT's tool record masters approval | access matrix (Lampson 1971), with fields as the objects; data ownership matrix in master data management (DAMA-DMBOK 2017) |  |  |  |

### Operations

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| tier | One of MAD's four levels: governance, delivery, software engineering, automation; MAD is a separate product, and Mentura records name a tier only where a venture uses MAD (EE-038) | architecture tiers |  |  |  |
| handoff | One unit of delegated work: a JSON record (role, decision classes, done-criteria, status, attempts) at <venture>/operations/handoffs/<id>.json with a Markdown brief beside it | common operations usage |  |  |  |
| handoff claim | The one exclusive taking of a ready handoff by a run in the role it names, through the router's claim action on operations/handoff/<id>: it sets claimed_by to the run id and status to in-progress in one write, a second claim is refused, and afterwards only the claimant writes progress and evidence and only the requester (requested_by) writes the verification and acceptance | claim (work-item claiming in task queues and issue trackers; compare-and-swap ownership) |  |  |  |
| done-criterion | One check that says a handoff is finished: conformance (a command, no model, no reviewer), self-proof (the change exercised for real, with output) or review (fit to intent, by a named role) | definition of done (Scrum) |  |  |  |
| connection | One outside system a venture connects, as a record at it/connections/<id>.json that the it function owns, under the thesis's eight-point connection contract: the records and fields it is authoritative for (as source map rules), sync direction, scoped reads and writes, signed events, a stable external id with provenance and last-synced time, the approval class of every send (public-commitment), payment (spend-money) and signature (legal-or-terms), idempotency and reconciliation, and the exit plan; plus what goes stale, blocks or degrades when it fails. It says what is allowed and authoritative; an app's connectors act | integration contract (enterprise application integration; data contract) |  | it |  |
| pricing decision | A decision that sets or approves a price. Marketing and sales owns the decision. Every package of this type lists finance in touches, and the founder approves. | APQC PCF 7.4 Cross-Industry 3.2.2 Define pricing strategy, including 3.2.2.4 Approve pricing strategy |  | marketing-and-sales | yes |
| product decision | A decision that changes what the venture offers. The products function owns it. | APQC PCF 7.4 Cross-Industry 2.0 Develop and Manage Products and Services |  | products | yes |
| research program | A function's person-edited instructions for its researcher (programs/<function>.md), one section per route pattern; the gate refuses an agent's write to it | program.md (autoresearch); research programme (Lakatos 1970) |  |  |  |

### Evidence

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| eval | A test of whether something worked; evals are grouped in eval suites (eval-suite.schema.json) | AI evals |  |  |  |
| evidence | The recorded result of one run of a check or eval: subject and version, each criterion's outcome and its output, at <venture>/evidence/results/<id>.json. Append-only | common audit usage |  |  |  |
| capability register | What agents can, cannot, may not or are not yet known to do, task by task, with sources and dates, fed by research and our own evals (packages/naive/src/functions/human-capital/capabilities/agent-capabilities.json, EE-029) | ours |  |  |  |
| experiment | One write of a recipe, scored in code inside the router against a frozen eval plan version and logged whether it is kept or discarded. The writer never supplies the score, and a retried write spends nothing (verdict_deterministic in packages/naive/lean/Naive/Recipes.lean) | autoresearch; design of experiments (Fisher 1935) |  |  |  |
| experiment log | The append-only, hash-chained list of a recipe's experiments (<pattern>.experiments.jsonl beside the recipe), written by the evaluator only; the count of dev evaluations per plan version is the budget | results.tsv (autoresearch) |  |  |  |
| eval plan | A frozen version of the as-of points, windows, horizon, weights and budgets one recipe is scored against (<pattern>.plan.json), made by a person; its eval set sits in a folder the router never serves (windows_purged and holdout_unread in packages/naive/lean/Naive/Recipes.lean) | pre-registration (Nosek et al. 2018) |  |  |  |
| eval window | One of an eval plan's training, dev, holdout or forward sets of as-of points, each separated from the next by the horizon, so no outcome in one settles inside the next | dev and test sets; purged cross-validation (Lopez de Prado 2018) |  |  |  |
| settled record | What people and producers established about valid times up to one as-of point once the horizon has passed, folded by Naive's reference fold. An outcome counts once a person states it or two distinct producers confirm it; an agent's write never resolves one (agent_never_resolves in packages/naive/lean/Naive/Recipes.lean) | bitemporal data (Snodgrass 1999); forecast verification (Murphy and Winkler 1987) |  |  |  |

### Governance

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| role | A person's or agent's job; never a product's place in the portfolio | decision rights (RACI, RAPID) |  |  |  |
| team plan | Who the venture needs, agent or person, by phase, with the authority each holds and where a human stays in the loop; recruiting briefs for open person roles (operations/team-plan.json, EE-029) | workforce planning (common HR usage) |  |  |  |
| human loop | The person who decides, reviews or does the part of a task that agents cannot, may not, or are not known to do; named for every such agent task | human-in-the-loop (common AI usage) |  |  |  |
| decision right | Who may decide what, at one of four levels: decide, decide-inform, recommend-approve, escalate. A venture may tighten the template, never loosen it without a named decision | decision rights (RAPID, DACI) |  |  |  |
| cap table | The record of who owns the venture and on what terms: share classes, holders, grants with vesting, the option pool, SAFEs and notes (governance/ownership.json) | capitalization table (common startup and finance usage) |  |  |  |
| share class | A kind of share (or LLC unit) with its own votes, price and rights: common, preferred, super-voting, non-voting | corporate law (classes of stock) |  |  |  |
| vesting | Earning granted shares over time, commonly four years with a one-year cliff, so that someone who leaves early keeps only what they earned | common startup usage |  |  |  |
| founder agreement | What founders agreed with each other: roles, commitment, IP assignment, departure and deadlock terms; required once two or more founders share ownership | common startup usage |  |  |  |
| board | A formal board of directors (or managers, or trustees), which holds legal authority, or an advisory board, which advises and decides nothing (governance/board.json) | corporate law; Feld and Ramsinghani, Startup Boards |  |  |  |
| reserved matter | A decision only the formal board may make, such as issuing shares or selling the company | corporate governance usage |  |  |  |
| investor right | A right an investor gets with a class or instrument: board seat, information, pro-rata, protective provisions, anti-dilution, drag-along, tag-along, right of first refusal and others | NVCA model legal documents |  |  |  |
| exit | How owners realize value or the venture ends: acquisition, IPO, secondary sale, merger, management buyout, wind-down, or hold (governance/exit.json) | venture finance usage |  |  |  |
| preference stack | The order and amounts in which a sale's proceeds reach each owner, preferences first by seniority, then common; computed from the cap table by packages/naive/src/engine/payouts.mjs, never typed | venture finance usage (pref stack; Feld and Mendelson, Venture Deals) |  |  |  |
| publication policy | Where a venture publishes and who may publish what there: its channels, the guidelines each follows, the checks and preview every publication passes, and who drafts and approves by role or team (governance/publication-policy.json, EE-025) | content governance; communications or disclosure policy (corporate usage) |  |  |  |
| channel | A place the venture publishes to (website, docs site, social account, newsletter, app store, press, investor update, regulatory filing); its destination decides which guidelines apply | marketing channel (Kotler, Marketing Management) |  |  |  |
| publication | One act of making something public on a channel; always a handoff under the public-commitment decision class, previewed, checked and approved by a person | common usage |  |  |  |
| brand guidelines | The rules for using the venture's visual and verbal identity, kept by the brand pillar | brand guidelines or brand book (common marketing usage) |  |  |  |
| editorial guidelines | What content covers and how it is written, separate from brand voice; a style guide is one part | editorial guidelines and style guide (publishing usage) |  |  |  |
| founder appointment | A package typed by the founder term (packages/naive/src/terms, EE-095). Its facts are that term's properties, and the membership gate runs those checks. Strategy holds the type while human capital is not an active function. | ours |  | strategy | yes |
| detector | The record of one yes or no call on evidence: its question, sensor, criterion, the costs of the four outcomes, base rate and resolver (governance/detectors/<id>.json). It names its sensor and never runs it. Signal detection design, 2026-11-07 | Green and Swets 1966 (the observer) |  |  |  |
| sensor | What turns the world into a score for a detector: a check, the founder's own agent, or a person. A detector names it and never runs it | Green and Swets 1966 (the sensory process) |  |  |  |
| criterion | The line a consumer draws to sort what reaches it. On a detector, the line on a sensor's score scale at or above which the call is yes; two lines make an unsure band. The optimal one rises with the noise base rate and the false alarm cost and falls with the miss cost (criterion_monotone in packages/naive/lean/Naive/Detection.lean). On a listener, the consumer's own rating bounds and predicates over the venture's facts that sort a heard signal into salient or noise (noise_salient_partition in packages/naive/lean/Naive/Signals.lean) | Green and Swets 1966 |  |  |  |
| sensitivity | How well a sensor's scores separate yes cases from no cases, as ROC area or d'. Moving the criterion changes the calls, not the sensitivity | Green and Swets 1966; Macmillan and Creelman 2004 |  |  |  |
| trial | One call a detector made and, later, its resolution: the score, the criterion in force and the call. A line in governance/detectors/<id>.trials.jsonl | psychophysics (Fechner 1860; Green and Swets 1966) |  |  |  |
| hit | A resolved trial called yes whose true answer was yes | Green and Swets 1966 |  |  |  |
| miss | A resolved trial called no whose true answer was yes | Green and Swets 1966 |  |  |  |
| false alarm | A resolved trial called yes whose true answer was no | Green and Swets 1966 |  |  |  |
| correct rejection | A resolved trial called no whose true answer was no. Noise keeps its standard meaning, the no case | Green and Swets 1966 |  |  |  |
| base rate | How often the true answer to a detector's question is yes, stated by a person or computed from resolved trials | Kahneman and Tversky 1973 |  |  |  |
| ROC curve | Hit rate against false alarm rate as the criterion moves. Its area equals the two-alternative proportion correct on the same scores (auc_eq_2afc in packages/naive/lean/Naive/Detection.lean) | Peterson, Birdsall and Fox 1954 |  |  |  |

### Interface

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| console | A custom workbench built for the system: a viewer over a venture's records | common software usage |  |  |  |
| workbench | A tool through which a person, with agents, works across all or most other layers at once in one session (reaches at least four of the six). A tool that serves one or two layers is an integration of those layers, however good its screen is. Renamed from "harness" (EE-096), which was renamed from "interface" (EE-093) | workbench (Eclipse Platform Workbench; Fowler, language workbench), narrowed |  |  |  |
| harness | The software around a model that runs it: it gives the model its context and tools and carries out what the model asks (the Agent SDK, Claude Managed Agents, Claude Code). AI harness and agent harness are kinds of harness. A harness needs no person (the Agent SDK); one a person works through across most layers is also a workbench (EE-096) | harness (industry usage; Anthropic S-1, 2026); workspace rule G-039 |  |  |  |
| agent harness | An AI harness in which the model directs its own steps and tool use in a loop toward a goal, acting on files, tools and systems between the person's turns, under permissions (Claude Code, Cursor, Codex, Hermes Agent). Every agent harness is an AI harness; a chatbot is not an agent harness. One a person uses across at least four layers is also a workbench | agent harness (industry usage) | anthropic-2024-building-effective-agents |  |  |
| AI harness | A product that is the software around a model: the person's work happens in exchanges with it, so without the model nothing is left. A chatbot is one. The model answers; the person acts | harness (industry usage) | anthropic-2024-building-effective-agents |  |  |
| AI feature | A model used inside a product that does its job without it (summaries, search, drafting). Test: remove the model and the product still works. Most apps that implement AI are here, not harnesses | common product usage | anthropic-2024-building-effective-agents |  |  |
| custom workbench | A workbench built for the system or a venture rather than bought, such as the operator console. Was "custom interface" (EE-093), then "custom harness" (EE-096) | common software usage |  |  |  |
| route | The address of one record type or command in a venture, such as purpose/validation/problem: a layer, then a kit when the record sits in a nested kit, then the record. Generated from the data model and kits; the CLI, the MCP server and the HTTP API share one route table (EE-030) | routing in web frameworks (Next.js App Router, Rails routes) |  |  |  |
| draft | A gated record an agent wrote, held in <venture>/_drafts/ until a person accepts it; the decision class of the record says it is a person's to make (EE-030) | common usage (draft for approval) |  |  |  |
| layout | The context that wraps a route: the system, layer and kit purpose, skills and references, the template, the gate and what need-now says, given to an agent before it acts on the route (EE-032) | Next.js App Router (layout) |  |  |  |
| view | A route rendered as a page for a person; the Markdown form of a record or command result. The operator console will render views (EE-032) | Next.js App Router (page); MVC view |  |  |  |
| route group | A named set of routes that shares a layout without changing their paths; one per phase, (discovery) to (platform), holding the routes need-now suggests in that phase (EE-032) | Next.js App Router (route groups) |  |  |  |
| slot | One part of a page that renders on its own beside others, such as @validation in the venture overview; a slot that fails shows its error while the rest render (EE-032) | Next.js App Router (parallel routes, @slot) |  |  |  |
| route alias | An old route kept after a rename, which the router follows to the new one with a deprecation note (EE-032) | common API usage (deprecation, redirects) |  |  |  |

### Function

| Noun | Meaning | Standard | References | Function | Handoff type |
| --- | --- | --- | --- | --- | --- |
| strategy | The function that sets the venture's direction: vision, and the choices that follow from it. A solo founder holds it with the others. Capabilities: founder appointment. | APQC PCF 7.4 Cross-Industry 1.0 Develop Vision and Strategy |  | strategy |  |
| products | The function that develops what the venture offers, and the decisions that change the offering. Capabilities: product decision. | APQC PCF 7.4 Cross-Industry 2.0 Develop and Manage Products and Services |  | products |  |
| marketing-and-sales | The function that finds the buyer and sells the offering, including the price. Capabilities: pricing decision, customer@marketing-and-sales. | APQC PCF 7.4 Cross-Industry 3.0 Market and Sell Products and Services |  | marketing-and-sales |  |
| finance | The function that keeps the books: revenue, cost, and the customer as an account. Capabilities: customer@finance. | APQC PCF 7.4 Cross-Industry 9.0 Manage Financial Resources |  | finance |  |

### Retired

| Noun | Status |
| --- | --- |
| client | retired; use account (relationship: client) |
| sphere | retired; use venture |
| stage | retired; use phase, legal form and ambition |
| kind | retired; use venture, with accounts as records |
| Wedge (phase) | retired; use validation (wedge stays a portfolio role) |
| Core Engine | retired; use scale |
| Horizon (phase) | retired; use platform (Three Horizons stays a lens) |
| entity profile | retired; use venture profile |
| company template | retired; use venture template |
| orientation | retired; use legal form |
| liquidation waterfall | retired; use preference stack |
| derived answer | retired; use undefined |
| guiding statement | retired; use undefined |
