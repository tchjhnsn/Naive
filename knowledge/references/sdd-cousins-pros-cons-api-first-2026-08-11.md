---
type: reference
source: hybrid
ai-model: claude-opus-5
created: 2026-08-11
updated: 2026-08-11
authority: exploratory
decision-status: none
governed-by:
  - "[[CLAUDE]]"
status: ACTIVE
description: "Phase-1 research: SDD and cousins — purpose, use cases, pros/cons, when-to-use rules aimed at shipping code and reducing markdown theater. Dual lens: The module (ship) + greenfield API-first for SDK/platform (teach). Spike/thin tracks first-class."
tags: [reference, research, sdd, tdd, bdd, api-first, contract-first, shipping, agents]
related:
  - "[[sdd-software-factory-sdlc-prior-art-2026-08-11]]"
  - "[[buzz-xyz-sad-prior-art-2026-08-11]]"
---

# Phase 1 — SDD & cousins: ship code, stop babysitting markdown

**This is decision research**, not a taxonomy map. Sibling index (definitions only): [[sdd-software-factory-sdlc-prior-art-2026-08-11]].

## 0. Why this note exists

**Observed failure mode:** lots of vault documents → models re-read and rewrite markdown → Fowler-style false control → **not enough shipped code**.

**Success criteria for adopting any practice below:**
1. Ship runnable work on a regular cadence  
2. Agents can loop / run in parallel with **less** constant oversight  
3. Prefer **industry-named** practices humans (and agents) can google — replace custom rituals where they do the same job; don’t stack both  

**Dual lens (locked 2026-08-11):**
| Lens | Project | Role in examples |
|---|---|---|
| **Shipping** | **A shipping product module**: a personalized calendar plus reference data | How to get something running without drowning in prose |
| **Contract teaching** | **SDK / developer platform** (early — few/no public APIs yet) | How greenfield **API-first** works *before* a mature API catalog exists |

**Confirmed:** thin / spike tracks are first-class. Heavy SDD stacks are optional tools, not default religion.

**Adopted 2026-08-13:** §6.3 is the module’s **shipping default**. SAD v3 remains vault constitution. This note is not a SAD replacement.

**Not in this note:** Software Factory deep dive, SDLC theory, SAD rename/ontology lock.

---

## 1. How to read the cousins (axes, not a flat peer list)

| Axis | Question |
|---|---|
| **Source of truth** | What artifact wins when reality drifts? |
| **Primary reader** | Human stakeholder · test runner · another service · code generator · LLM agent |
| **Feedback speed** | Seconds (unit test) → minutes (contract CI) → days (spec review theater) |
| **Problem size** | Typo fix · vertical slice · platform boundary · unknown product |
| **Replace vs stack** | Does this **delete** a vault markdown job, or add a second layer? |

If a practice adds oversight without replacing something, it fails criterion 2–3.

---

## 2. Escape hatches first (because over-planning is the disease)

### 2.1 Spike / prototype track

| | |
|---|---|
| **Purpose** | Learn unknown shape by writing throwaway or near-throwaway code |
| **Source of truth** | Running experiment + short learning note (not a full spec tree) |
| **Pros** | Fast reality; kills bad ideas cheaply; agents can code against a tiny brief |
| **Cons** | Can become permanent junk; no parallel team safety; hard to onboard without rewrite |
| **Use when** | The module use-cases still “count on one hand” but UI/data shape is unknown; exploring calendar-feed layout |
| **Don’t use when** | Multiple consumers exist; SDK surface is public; custody/identity liability (user credentials) |
| **Graduate when** | Same spike survives 2–3 sessions → extract **tests** or **OpenAPI** for the stable seam; delete or archive the spike brief |

**The module example:** One-handed primary use case (e.g. “show my next three deadlines for my account”) → spike a single screen + fake JSON → **do not** open VISION/VERSION/PRODUCT full stack first.

### 2.2 Small-change track

| | |
|---|---|
| **Purpose** | Fix or tweak known behavior |
| **Source of truth** | Existing tests / existing OpenAPI / existing code |
| **Pros** | Avoids Fowler sledgehammer (Kiro turning a bug into 16 acceptance criteria) |
| **Cons** | Silently erodes design if used for large behavior change |
| **Use when** | Bug, copy, styling, obvious one-endpoint tweak |
| **Don’t use when** | New module behavior, new public SDK endpoint |

### 2.3 “Ship thin, then anchor”

1. Spike until one vertical slice runs  
2. Write **the smallest durable contract** (OpenAPI path *or* a focused test suite)  
3. Only then add living prose if humans need narrative onboarding  

**Stop writing:** parallel IDEA_MAP + RESEARCH_SYNTHESIS + multi-file SDD markdown for the same slice unless a named reader needs them.

---

## 3. Spec-Driven Development (SDD) — three levels as decisions

Industry SDD = write a spec before AI codes; spec aims to be source of truth. Semantically diffuse ([Fowler/Böckeler](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html); [IBM](https://www.ibm.com/think/topics/spec-driven-development)). Levels:

### 3.1 Spec-first

| | |
|---|---|
| **Purpose** | Give the agent a clear task brief before generation |
| **What it is** | Spec for *this change*; may rot after merge |
| **Pros** | Cheap clarity; cuts blank-prompt vibe coding; good agent kickoff |
| **Cons** | Spec dies → next session invents again; markdown review can exceed code review; overkill on small tasks (Fowler) |
| **Tooling vibe** | Kiro-like Requirements→Design→Tasks for a story |
| **Use when** | The module slice with known acceptance (“deadlines list for ZIP”); one agent session |
| **Don’t use when** | You need the artifact to stay true for months; or the change is tiny |
| **Agent fit** | High for one-shot; low for multi-week autonomy unless you re-spec |

### 3.2 Spec-anchored

| | |
|---|---|
| **Purpose** | Keep a living spec that evolves with the feature |
| **Pros** | Onboarding + agent re-entry without archaeology; forces “update spec when behavior changes” |
| **Cons** | Dual maintenance (spec + code); agents ignore long specs; false control (Fowler); becomes markdown theater if untested |
| **Tooling vibe** | Tessl-like living specs; Spec Kit *aims* here but often stays change-scoped |
| **Use when** | Module behavior must stay coherent across sessions; human teammates will read it |
| **Don’t use when** | Spec isn’t executable/checked — prefer tests or OpenAPI as the anchor instead |
| **Replace custom vault job** | Prefer an **OpenAPI + examples** or **BDD scenarios** as the anchored artifact over a novel prose genre when the job is “what does it do?” |

**Critical for this vault:** “Spec-anchored” only helps shipping if the anchor is **cheap to verify**. Unverified prose is how we got here.

### 3.3 Spec-as-source

| | |
|---|---|
| **Purpose** | Humans edit only the spec; code is generated |
| **Pros** | Maximum agent automation; single edit surface |
| **Cons** | LLM non-determinism; MDD déjà vu (Fowler); high rigor cost; brittle for UI-heavy modules |
| **Use when** | Boring, schema-shaped modules (validators, client SDKs from OpenAPI) |
| **Don’t use when** | Exploratory product UX (the module personalization), custody-sensitive flows |
| **Agent fit** | High *if* regeneration + tests gate merge; disastrous if “generate and vibe” |

---

## 4. Cousins — purpose, use cases, when / when-not

### 4.1 TDD (Test-Driven Development)

| | |
|---|---|
| **Purpose** | Specify behavior as failing tests; implement until green; refactor |
| **Primary reader** | Test runner (seconds feedback) |
| **Pros** | Executable truth; great agent loop (“make tests pass”); less prose babysitting; industry-standard onboarding |
| **Cons** | Weak at discovering *what product to build*; can lock bad design early; UI/visual modules hard to TDD fully |
| **Use when** | The module date math, jurisdiction resolution, sorting/filtering deadlines; any pure function / service |
| **Don’t use when** | You don’t know the use-case yet (spike first); pure visual exploration |
| **vs SDD** | Tests *are* a form of spec — often a better anchor than markdown |
| **Ship fit** | Excellent for criterion 1–2 |

### 4.2 BDD (Behavior-Driven Development)

| | |
|---|---|
| **Purpose** | Stakeholder-readable scenarios (Given/When/Then) that can drive tests |
| **Primary reader** | Humans + optionally Cucumber-style runners |
| **Pros** | Forces hand-countable behaviors (matches the module ask); shared language; can become automated |
| **Cons** | Gherkin theater if not automated; verbose; agents pad fake user stories (Fowler/Kiro failure) |
| **Use when** | Locking the module’s ≤5 primary use cases with the owner as stakeholder |
| **Don’t use when** | Internal library code; SDK wire details (use OpenAPI); every tiny bug |
| **vs SDD** | BDD scenarios can *be* the spec-first/anchored artifact — prefer over free prose |
| **Ship fit** | Good if scenarios are few and automated; bad if they multiply unread |

**The module rule of thumb:** Write **≤5** BDD-style bullets for primary use cases. If you can’t, you don’t need more methodology — you need a product decision session, then a spike.

### 4.3 Design-by-Contract (DbC)

| | |
|---|---|
| **Purpose** | Preconditions / postconditions / invariants on modules |
| **Pros** | Precise agent constraints; local correctness |
| **Cons** | Rare in mainstream JS/TS culture; onboarding weaker than TDD/OpenAPI unless encoded as asserts/types |
| **Use when** | Core module invariants (“every deadline has timezone + jurisdiction id”) |
| **Don’t use when** | You can express the same with types + tests cheaper |
| **Ship fit** | Medium — prefer TypeScript types + tests unless you already practice DbC |

### 4.4 MDD (Model-Driven Development) — cautionary cousin

| | |
|---|---|
| **Purpose** | Models (UML/DSL) generate code |
| **Pros** | Historical proof that “spec-as-source” can work in narrow domains |
| **Cons** | Awkward abstraction; generator fragility; Fowler’s warning for LLM spec-as-source |
| **Use when** | Almost never for the module UI; maybe codegen from OpenAPI (a *narrow* modern MDD) |
| **Don’t use when** | General product development |
| **Ship fit** | OpenAPI→SDK codegen = yes; general MDD = no |

### 4.5 Contract-first (provider schema as law)

| | |
|---|---|
| **Purpose** | Agree machine-readable contract before/parallel to implementation; validate impl against it |
| **Pros** | Parallel work; breaking-change detection; mocks; industry tooling (Spectral, oasdiff, etc.) |
| **Cons** | Spec drift if not CI-gated; overhead during rapid exploration; overkill for single-consumer same-repo |
| **Use when** | SDK ↔ API; the module app ↔ backend services; any multi-agent boundary |
| **Don’t use when** | Solo spike with no second consumer yet — spike code-first, **formalize at stabilization** ([contract-first practical guidance](https://mdsanwarhossain.me/blog-contract-first-openapi.html)) |
| **Ship fit** | High once a boundary exists |

### 4.6 API-first (deep — §5)

API-first is contract-first applied when **the API is a product**. See next section.

### 4.7 Consumer-driven contracts (Pact)

| | |
|---|---|
| **Purpose** | Each consumer publishes expected interactions; provider must satisfy them |
| **Pros** | Catches “schema ok but this client breaks”; independent deploy safety |
| **Cons** | Broker/process overhead; overkill for solo or single-team monolith; weaker for unknown external consumers |
| **Use when** | Multiple internal consumers of the product APIs later; mobile + web clients diverge |
| **Don’t use when** | Early solo work on the module; public SDK with unknown consumers (favor OpenAPI + examples) |
| **with OpenAPI** | Complementary: OpenAPI = structure; Pact = per-consumer behavior ([common mature pattern](https://totalshiftleft.ai/blog/what-is-api-contract-testing)) |

---

## 5. API-first — deep dive

### 5.1 What it means

Treat the API as a **first-class product**: design the **contract** (usually OpenAPI) with stakeholders, then implement server, clients, mocks, docs, and SDKs from that contract — often in parallel ([Swagger/SmartBear overview](https://swagger.io/resources/articles/adopting-an-api-first-approach/)).

**Not the same as:** “we’ll add Swagger annotations after the handlers exist” (code-first documentation).

### 5.2 Why it fits your objectives

| Objective | How API-first helps |
|---|---|
| Ship regularly | Mocks unblock UI/module client while server catches up |
| Agents in parallel | Agent A implements handler to spec; Agent B generates client; Agent C builds the module UI against mock — shared OpenAPI file is the handshake |
| Less markdown oversight | OpenAPI + examples **replace** long IMPL prose for the boundary |
| Onboarding / googleability | “We do API-first with OpenAPI 3” is researchable; custom vault genres are not |
| Developer platform / SDK | The SDK *is* a packaged client of the API — contract-first is the natural spine even when few endpoints exist yet |

**Greenfield SDK note:** Having *few* public APIs is not a reason to skip API-first. It is the reason to **write the first endpoints in OpenAPI before coding them** — so you don’t invent the platform in chat logs.

### 5.3 Kinds of “API” (so “all of the above” is usable)

| Kind | Typical contract | Use in your world |
|---|---|---|
| **HTTP/JSON APIs** | **OpenAPI** | Primary for the SDK + module↔backend |
| **Events / streams** | AsyncAPI | Later: civic calendar notifications, jurisdiction updates |
| **Graph query** | GraphQL SDL | Only if you choose a graph product surface |
| **Typed RPC** | protobuf / gRPC | Internal high-perf seams if ever needed |
| **Agent tool surfaces** | MCP tool schemas / JSON Schema | Agent-callable the product tools |

**Phase-1 recommendation:** Master **OpenAPI HTTP** first. Add AsyncAPI/MCP when that sub-project appears — don’t boil the ocean.

### 5.4 Practical workflow (ship-oriented)

```text
1. Name 1–5 module use cases (BDD bullets OK)
2. For the first slice, draft OpenAPI paths + schemas + 2–3 examples
3. Lint (Spectral) → mock server → generate TS client stub
4. Agent implements UI against mock; agent implements server to satisfy OpenAPI
5. CI: response validates against OpenAPI; breaking-change check on PR
6. Only then expand endpoints — not a big-bang API surface
```

### 5.5 Pros

- Parallel human/agent work on a shared machine-readable truth  
- SDK, docs, mocks, and tests generate from one artifact  
- Industry language for hiring and agent priors  
- Forces “what is the product boundary?” early — healthy for a platform  

### 5.6 Cons / anti-patterns

| Trap | Why it hurts you specifically |
|---|---|
| **Big-bang API design** | Recreates over-planning — design 40 endpoints, ship 0 |
| **Spec without CI** | Drift → agents trust a lie |
| **API-first during pure discovery** | Same as premature specification — spike first, freeze contract at stabilization |
| **OpenAPI as unread PDF** | Markdown theater in YAML form |
| **Ignoring custody/identity** | the product may touch regulated docs — contract must encode authz, not only JSON shapes |

### 5.7 Tooling snapshot (actionable)

| Tool / class | Job |
|---|---|
| **OpenAPI 3.x** | Contract source of truth |
| **Spectral** | Lint style/consistency |
| **Prism / WireMock / MSW** | Mocks from spec |
| **openapi-generator / Speakeasy / similar** | SDK + types from spec |
| **oasdiff / similar** | Breaking change detection in CI |
| **Pact** | Later, per-consumer interaction safety |
| **Swagger UI / Redoc** | Human browsable docs from the same file |

### 5.8 The module × API-first (concrete)

**Do now (shipping lens):**
- Pick ≤5 module primary use cases  
- Spike **one** vertical slice (fake data OK)  
- Extract **one** OpenAPI path the UI needs (e.g. `GET /me/civic-deadlines`)  
- Agents: UI vs mock; server vs OpenAPI; you review the **diff + failing CI**, not a new architecture novel  

**Don’t:** A full custody model + a module vision package + SDK platform portfolio before a running deadlines list.

**SDK teaching lens:** Even a single `GET /health` + `GET /me/civic-deadlines` OpenAPI file is a real platform seed — better than waiting for “proper APIs.”

---

## 6. Decision aids

### 6.1 Pain → practice

| Pain | Prefer | Avoid |
|---|---|---|
| Not shipping / over-planning | Spike → thin ship → anchor | Full SDD file trees; big-bang API |
| Agents ignore long docs | TDD + OpenAPI in CI | Spec-anchored prose without checks |
| Agents conflict in parallel | Shared OpenAPI + mocks | Separate chat briefs per agent |
| Specs rot | Executable anchors (tests/OpenAPI) | Spec-first that never updates |
| Can’t onboard humans | Industry names (TDD, OpenAPI, BDD) | Novel vault-only genres for the same job |
| Unknown module product shape | Spike + ≤5 BDD bullets | Spec-as-source; MDD |
| SDK / multi-client boundary | API-first OpenAPI | Code-first handlers + docs later |
| Small bug | Small-change track | Kiro-style mega requirements |

### 6.2 Comparison matrix (shipping-centric)

| Practice | Feedback speed | Ambiguity discovery | Agent loop fit | Maintenance cost | Best problem size | Googleable onboarding |
|---|---|---|---|---|---|---|
| Spike | Fast (runtime) | Excellent | Medium | Low if deleted | Unknown | Medium (“spike”) |
| Spec-first SDD | Slow (review) | Medium | High one-shot | Low if disposable | Medium story | High (“SDD”) |
| Spec-anchored prose | Slow | Medium | Medium | High | Multi-session feature | Medium |
| Spec-as-source | Med/Slow | Poor if wrong | High if gated | High | Schema-shaped | Medium |
| TDD | Seconds | Poor for product | Excellent | Medium | Logic/services | Excellent |
| BDD (few scenarios) | Med | Good for product | Good if automated | Medium | User-facing module | Excellent |
| OpenAPI API-first | Med (CI) | Good for boundaries | Excellent parallel | Medium | Platform/SDK/API | Excellent |
| Pact | Med | Narrow (per consumer) | Good | High | Multi-consumer | Good |

### 6.3 The module starter recipe (recommended default)

1. **Product lock (hours, not weeks):** ≤5 primary use cases (BDD bullets)  
2. **Spike track:** one running UI with fake data  
3. **TDD** on pure logic extracted from the spike  
4. **API-first:** one OpenAPI path + mock + CI validate  
5. **Refuse** additional vault methodology layers until that path ships  

If step 1 can’t finish, the blocker is product judgment — not missing a cousin.

### 6.4 SDK / platform starter recipe (greenfield)

1. Don’t wait for a large API catalog  
2. OpenAPI for the first real resources the module (or console) needs  
3. Generate types/client; implement server to satisfy spec  
4. Add Spectral + breaking-change CI before the third endpoint  

---

## 7. What this implies for “our methodology” (operational, not ontological)

- Plan→Build→Ship-shaped workflows are **generic**; they don’t make a practice unique or correct.  
- If a custom vault ritual and an industry practice do the same job, **prefer the industry one** for shipping + onboarding + agent priors.  
- SDD levels are useful **vocabulary**; unverified markdown SDD is how Fowler’s failure mode became ours.  
- The module should be the **proving ground** for spike→TDD→OpenAPI, not another perfect paper system.

---

## 8. Sources

- [Fowler/Böckeler — SDD tools (Kiro, Spec Kit, Tessl)](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)  
- [IBM — Spec-driven development](https://www.ibm.com/think/topics/spec-driven-development)  
- [Swagger — API-first approach](https://swagger.io/resources/articles/adopting-an-api-first-approach/)  
- Contract-first practical guidance (stabilize after exploration; OpenAPI+Pact complementarity) — e.g. [Hossain on contract-first OpenAPI](https://mdsanwarhossain.me/blog-contract-first-openapi.html); [Pact vs OpenAPI discussions](https://www.api-contract-testing.com/api-contract-fundamentals-tool-selection/consumer-driven-contracts-with-pact/pact-vs-openapi-for-frontend-backend-integration/)  
- Vault: placement of the module in the product architecture map

## Changelog

| Date | Change |
|---|---|
| 2026-08-11 | Phase-1 research note: shipping-first cousin decisions; the module + SDK dual lens; spike tracks first-class. |
| 2026-08-13 | Adopted §6.3 as the module shipping default; SAD remains constitution. |
