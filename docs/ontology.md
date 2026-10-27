---
type: reference
source: hybrid
created: 2026-10-27T04:18:09Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, ontology, glossary, nouns]
description: "The system's nouns at every level, the standard each follows, its references, and the retired nouns with what replaced them. Generated from docs/ontology.json (canonical) by node schema/check-nouns.mjs --md (EE-014)."
---

# Ontology

The system is opinionated: it names one default for each choice, and every default carries references to its sources and the alternatives it weighed (EE-014). Its nouns follow one rule: **standards first**. Use an established term with its standard meaning, and coin a word (marked "ours") only when none exists.

- Canonical: `docs/ontology.json`. This page is generated from it; regenerate with `node schema/check-nouns.mjs --md`.
- `node schema/check-nouns.mjs` fails when a retired noun reappears in the schema, design docs, Product Anatomy, AGENTS.md or README.md.
- References are ids in `<layer>/references/references.json`.
- The genus of the whole is open: files say "the system" until the first venture runs end to end, then it is settled as an operating system or an operating model.
- Phases and gates: Discovery, Validation, Beachhead, Scale, Platform (EE-012). Three Horizons, VC funding stages and Blank's customer development are lenses onto them, mapped in the ontology research doc (https://claude.ai/artifact/6LcDgsc8SA9ybY5ddTfsMn).
### System

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| Everything Ecosystem | The name of the system | ours |  |
| the system | How files refer to the whole. Proposed genus (EE-024): a venture development framework; operating system and operating model are set aside | EOS (Wickman) for 'operating system' |  |
| venture development framework | Proposed genus of the Everything Ecosystem (EE-024): an opinionated framework for developing ventures, in the same genus as web development frameworks. Like them it gives conventions over configuration (one default per choice, with references), a fixed structure the builder fills in (the venture folder, layers and records), generators (init-venture), checks that run like tests, a data model, and packages that plug in (kits). The builder's venture calls on it, and its checks call back on the venture's records | software framework (Johnson and Foote 1988; Rails' convention over configuration) applied to venture development (venture building, venture studios) |  |
| method | What to do: SAD, MAD, Product Anatomy, handoffs | common usage |  |
| schema | What to record: venture.json, products, decisions, references | JSON Schema |  |
| tooling | What helps do it: scripts, skills, agent rules | common usage |  |
| workspace | One builder's instance of the system, declared by workspace.json | common software usage |  |
| layer | One of the seven: purpose, knowledge, operations, execution, evidence, governance, interface | ours |  |
| integration | A tool or service one layer uses, listed in <layer>/tooling/integrations.json (Obsidian for knowledge, Linear for operations, GitHub checks for evidence). An interface reaches integrations; it is not one | systems integration |  |
| data model | The list of every record type in the ecosystem, the layer that owns it, its schema, where its records live and what it references (schema/data-model.json). It is the master map; no single schema contains everything | data model (ANSI/SPARC; entity-relationship modelling, Chen 1976) |  |
| record type | One kind of record in the data model, such as venture, product, handoff or evidence, owned by exactly one layer or by the system | record type (database usage) |  |
| kit manifest | The file (<layer>/kit.json) that lists what one kit holds: its skills, the record types it owns, those of other kits it reads and writes, and its checks. Layer relationships are derived from manifests | package manifest (common software usage) |  |
| vault | The folder of documents (Markdown notes and JSON records) that holds a workspace's venture folders, their records and decisions. Every workspace has one; a venture outside software may need nothing else | Obsidian's name for a folder of notes; generically a knowledge base |  |
| repository (repo) | A version-controlled store, normally Git, holding code and the documents that ship with it (docs-as-code). A venture that builds software needs at least one; repo is the short form | version control (Git: repository) |  |
| template | A fill-in starting point for one record or document: the fields, what to write in each and what a strong one looks like. A kit holds templates; a template holds no rules and checks nothing | common usage (document template) |  |

### Venture

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| venture | The unit: anything a builder undertakes, from a hobby to a company. Ventures can hold ventures | common business usage |  |
| phase | How far a venture has come: discovery, validation, beachhead, scale, platform | Blank; Moore | blank-2005-four-steps, moore-1991-crossing-the-chasm, moore-1995-inside-the-tornado |
| gate | The test for leaving a phase: problem-solution fit, product-market fit (retention), repeatability, market leadership | Andreessen; Zook and Allen | andreessen-2007-only-thing-that-matters, zook-allen-2012-repeatability |
| ambition | Why the venture exists and how far it means to go: hobby, survival, lifestyle, managed growth, aggressive growth | IRS (hobby); venture-type literature | irs-treas-reg-1-183-2, elgar-what-do-entrepreneurs-create |
| legal form | none, sole-prop, partnership, llc, s-corp, c-corp, benefit-corp, nonprofit | US entity types |  |
| funding | bootstrapped, grant, angel, venture capital, debt, mixed | common usage |  |
| industry | What the venture produces, by its current flagship | NAICS | naics-2022, gics-msci |
| core product | The promise, who it is made to, what it must not deliver, and the competence behind it | Kotler; Prahalad and Hamel | kotler-core-product, prahalad-hamel-1990-core-competence |
| account | A named party a venture keeps a record for, at accounts/<id>/account.json, with a relationship: client, customer, user, member, partner or other. Optional; who a product serves in general is its market | CRM usage (Salesforce, HubSpot: account) |  |
| relationship | How a party or market stands to the venture: customer (buys), client (served under a professional relationship), user (uses, may not pay), member (belongs), audience (reads, watches or listens; markets only), partner | common business usage; client as a customer of professional services |  |
| link | What crosses from one venture into another, one way, with a border | Clark's work/family border theory |  |
| venture profile | The readable companion to venture.json: narrative, pillars, changelog | ours |  |
| pillar | Product, brand and business, in every venture | ours |  |
| venture template | The scaffold for a venture: pillars, roles, decision rights | ours |  |
| kit | A package a layer offers: skills, record types (schemas), checks, templates and references, used together. Each layer has one at <layer>/kit.json and may hold more under <layer>/kits/ (EE-026). As an offering it is a bundle; a part can also be its own product | product bundling (Adams and Yellen 1976); package, as in a framework's packages |  |

### Purpose

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| product | One thing a venture offers, stored as a card in products/ | common usage |  |
| market | Who a product serves: customer type, segment, geography, vertical or horizontal | Abell (customer groups) | abell-1980-defining-the-business |
| job | The need a product meets | Abell (customer functions); jobs to be done | abell-1980-defining-the-business |
| technology | How a product meets the need | Abell (alternative technologies) | abell-1980-defining-the-business |
| offering | product, service, platform, content, marketplace | common usage |  |
| business model | How a product earns, by St. Gallen pattern names | St. Gallen Business Model Navigator | gassmann-2014-business-model-navigator |
| portfolio role | A product's place in each phase: flagship, substrate, revenue engine, wedge, option, end product | portfolio strategy |  |
| wedge | A portfolio role: the narrow product or segment used to enter a market | Dixon (2010) | dixon-2010-thin-edge-of-the-wedge |
| Product Anatomy | The method that judges products against the core product | ours |  |
| Succession Matrix | Part of Product Anatomy that assigns portfolio roles by phase | ours |  |
| telos | The end a venture exists to reach (purpose/telos.json): statement, end state, measures, the owners' intended outcome, and exit criteria for each phase. Start with the end: other layers derive from it | Aristotle (final cause); Covey, begin with the end in mind |  |
| exit criterion | What must be true for a venture to leave a phase, written in its telos and tied to a telos measure; it refines that phase's generic gate. Not an owner's exit (governance) | Stage-Gate exit criteria (Cooper) |  |
| validation score | The probability that a venture is validated: a weighted average of sub-scores (problem, solution, product-market fit, pricing, go-to-market, team, operations readiness), each a Jev probability times its evidence weight, with floors; replaces a declared phase gate (EE-026) | ours, after Blank's customer validation | blank-2005-four-steps |
| evidence grade | How much a validation record's cited evidence can be trusted: high, moderate, low or very low, from the kind of signal, the audience, the sample, the specificity and the age; a claim with no evidence is very low | GRADE certainty of evidence | grade-handbook, fitzpatrick-2013-mom-test |
| need-now score | The probability that a venture needs a record type in its current phase and the next, from priors raised or lowered by facts about the venture; records below 0.5 are held back unless the builder asks, so builders don't overbuild (EE-028) | ours; just-in-time (lean manufacturing) and YAGNI (extreme programming) in spirit |  |

### Knowledge

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| decision | A logged choice with an id (EE- or a venture's own prefix) | ADR practice |  |
| reference | A source behind a default, recorded per layer with a stance | citation practice |  |

### Operations

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| tier | One of MAD's four levels: governance, delivery, software engineering, automation | architecture tiers |  |
| derived answer | A MAD answer taken from a venture's records (telos, ownership, board, form, decision rights) instead of asked again; it names the record it came from | ours |  |

### Execution

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| handoff | One unit of delegated work: a JSON record (role, decision classes, done-criteria, status, attempts) at <venture>/execution/handoffs/<id>.json with a Markdown brief beside it | common operations usage |  |
| done-criterion | One check that says a handoff is finished: conformance (a command, no model, no reviewer), self-proof (the change exercised for real, with output) or review (fit to intent, by a named role) | definition of done (Scrum) |  |

### Evidence

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| eval | A test of whether something worked; evals are grouped in eval suites (eval-suite.schema.json) | AI evals |  |
| evidence | The recorded result of one run of a check or eval: subject and version, each criterion's outcome and its output, at <venture>/evidence/results/<id>.json. Append-only | common audit usage |  |
| capability register | What agents can, cannot, may not or are not yet known to do, task by task, with sources and dates, fed by research and our own evals (evidence/capabilities/agent-capabilities.json, EE-029) | ours |  |

### Governance

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| role | A person's or agent's job; never a product's place in the portfolio | decision rights (RACI, RAPID) |  |
| team plan | Who the venture needs, agent or person, by phase, with the authority each holds and where a human stays in the loop; recruiting briefs for open person roles (operations/team-plan.json, EE-029) | workforce planning (common HR usage) |  |
| human loop | The person who decides, reviews or does the part of a task that agents cannot, may not, or are not known to do; named for every such agent task | human-in-the-loop (common AI usage) |  |
| decision right | Who may decide what, at one of four levels: decide, decide-inform, recommend-approve, escalate. A venture may tighten the template, never loosen it without a named decision | decision rights (RAPID, DACI) |  |
| cap table | The record of who owns the venture and on what terms: share classes, holders, grants with vesting, the option pool, SAFEs and notes (governance/ownership.json) | capitalization table (common startup and finance usage) |  |
| share class | A kind of share (or LLC unit) with its own votes, price and rights: common, preferred, super-voting, non-voting | corporate law (classes of stock) |  |
| vesting | Earning granted shares over time, commonly four years with a one-year cliff, so that someone who leaves early keeps only what they earned | common startup usage |  |
| founder agreement | What founders agreed with each other: roles, commitment, IP assignment, departure and deadlock terms; required once two or more founders share ownership | common startup usage |  |
| board | A formal board of directors (or managers, or trustees), which holds legal authority, or an advisory board, which advises and decides nothing (governance/board.json) | corporate law; Feld and Ramsinghani, Startup Boards |  |
| reserved matter | A decision only the formal board may make, such as issuing shares or selling the company | corporate governance usage |  |
| investor right | A right an investor gets with a class or instrument: board seat, information, pro-rata, protective provisions, anti-dilution, drag-along, tag-along, right of first refusal and others | NVCA model legal documents |  |
| exit | How owners realize value or the venture ends: acquisition, IPO, secondary sale, merger, management buyout, wind-down, or hold (governance/exit.json) | venture finance usage |  |
| preference stack | The order and amounts in which a sale's proceeds reach each owner, preferences first by seniority, then common; computed from the cap table by schema/payouts.mjs, never typed | venture finance usage (pref stack; Feld and Mendelson, Venture Deals) |  |
| publication policy | Where a venture publishes and who may publish what there: its channels, the guidelines each follows, the checks and preview every publication passes, and who drafts and approves by role or team (governance/publication-policy.json, EE-025) | content governance; communications or disclosure policy (corporate usage) |  |
| channel | A place the venture publishes to (website, docs site, social account, newsletter, app store, press, investor update, regulatory filing); its destination decides which guidelines apply | marketing channel (Kotler, Marketing Management) |  |
| publication | One act of making something public on a channel; always a handoff under the public-commitment decision class, previewed, checked and approved by a person | common usage |  |
| brand guidelines | The rules for using the venture's visual and verbal identity, kept by the brand pillar | brand guidelines or brand book (common marketing usage) |  |
| editorial guidelines | What content covers and how it is written, separate from brand voice; a style guide is one part | editorial guidelines and style guide (publishing usage) |  |

### Interface

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| console | A custom interface built for the system: a viewer over a venture's records | common software usage |  |
| interface | A tool through which a person, with agents, works across all or most other layers at once in one session (reaches at least four of the six). A tool that serves one or two layers is an integration of those layers, however good its screen is | ours, a narrowed sense of user interface |  |
| agent harness | An AI harness in which the model directs its own steps and tool use in a loop toward a goal, acting on files, tools and systems between the person's turns, under permissions (Claude Code, Cursor, Codex, Hermes Agent). The default kind of interface. Every agent harness is an AI harness; a chatbot is not an agent harness | agent harness (industry usage) | anthropic-2024-building-effective-agents |
| AI harness | A product that is the software around a model: the person's work happens in exchanges with it, so without the model nothing is left. A chatbot is one. The model answers; the person acts | harness (industry usage) | anthropic-2024-building-effective-agents |
| AI feature | A model used inside a product that does its job without it (summaries, search, drafting). Test: remove the model and the product still works. Most apps that implement AI are here, not harnesses | common product usage | anthropic-2024-building-effective-agents |
| custom interface | An interface built for the system or a venture rather than bought, such as the operator console | common software usage |  |
| route | The address of one record type or command in a venture, such as purpose/validation/problem: a layer, then a kit when the record sits in a nested kit, then the record. Generated from the data model and kits; the CLI, the MCP server and the HTTP API share one route table (EE-030) | routing in web frameworks (Next.js App Router, Rails routes) |  |
| draft | A gated record an agent wrote, held in <venture>/_drafts/ until a person accepts it; the decision class of the record says it is a person's to make (EE-030) | common usage (draft for approval) |  |

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
