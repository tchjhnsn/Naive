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
| the system | How files refer to the whole until its genus is settled (operating system, operating model) after the first venture runs end to end | EOS (Wickman) for 'operating system' |  |
| method | What to do: SAD, MAD, Product Anatomy, handoffs | common usage |  |
| schema | What to record: venture.json, products, decisions, references | JSON Schema |  |
| tooling | What helps do it: scripts, skills, agent rules | common usage |  |
| workspace | One builder's instance of the system, declared by workspace.json | common software usage |  |
| layer | One of the seven: purpose, knowledge, operations, execution, evidence, governance, interface | ours |  |
| integration | A tool or service one layer uses, listed in <layer>/tooling/integrations.json (Obsidian for knowledge, Linear for operations, GitHub checks for evidence). An interface reaches integrations; it is not one | systems integration |  |

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
| client | A record inside the venture that serves it; not a venture | common usage |  |
| link | What crosses from one venture into another, one way, with a border | Clark's work/family border theory |  |
| venture profile | The readable companion to venture.json: narrative, pillars, changelog | ours |  |
| pillar | Product, brand and business, in every venture | ours |  |
| venture template | The scaffold for a venture: pillars, roles, decision rights | ours |  |
| kit | A product that bundles other products (skills, schemas, checks) sold or used together. Scoped to the whole system, one layer, or one tier of the operations layer. A part can also be its own product | product bundling (Adams and Yellen 1976) |  |

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

### Knowledge

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| decision | A logged choice with an id (EE- or a venture's own prefix) | ADR practice |  |
| reference | A source behind a default, recorded per layer with a stance | citation practice |  |

### Operations

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| tier | One of MAD's four levels: governance, delivery, software engineering, automation | architecture tiers |  |

### Execution

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| handoff | One unit of delegated work, with attempts and escalation | common operations usage |  |

### Evidence

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| eval | A test of whether something worked | AI evals |  |

### Governance

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| role | A person's or agent's job; never a product's place in the portfolio | decision rights (RACI, RAPID) |  |
| decision right | Who may decide what | decision rights (RACI, RAPID) |  |

### Interface

| Noun | Meaning | Standard | References |
| --- | --- | --- | --- |
| console | A custom interface built for the system: a viewer over a venture's records | common software usage |  |
| interface | A tool through which a person, with agents, works across all or most other layers at once in one session (reaches at least four of the six). A tool that serves one or two layers is an integration of those layers, however good its screen is | ours, a narrowed sense of user interface |  |
| agent harness | An AI harness in which the model directs its own steps and tool use in a loop toward a goal, acting on files, tools and systems between the person's turns, under permissions (Claude Code, Cursor, Codex, Hermes Agent). The default kind of interface. Every agent harness is an AI harness; a chatbot is not an agent harness | agent harness (industry usage) | anthropic-2024-building-effective-agents |
| AI harness | A product that is the software around a model: the person's work happens in exchanges with it, so without the model nothing is left. A chatbot is one. The model answers; the person acts | harness (industry usage) | anthropic-2024-building-effective-agents |
| AI feature | A model used inside a product that does its job without it (summaries, search, drafting). Test: remove the model and the product still works. Most apps that implement AI are here, not harnesses | common product usage | anthropic-2024-building-effective-agents |
| custom interface | An interface built for the system or a venture rather than bought, such as the operator console | common software usage |  |

### Retired

| Noun | Status |
| --- | --- |
| sphere | retired; use venture |
| stage | retired; use phase, legal form and ambition |
| kind | retired; use venture, with clients as records |
| Wedge (phase) | retired; use validation (wedge stays a portfolio role) |
| Core Engine | retired; use scale |
| Horizon (phase) | retired; use platform (Three Horizons stays a lens) |
| entity profile | retired; use venture profile |
| company template | retired; use venture template |
| orientation | retired; use legal form |
