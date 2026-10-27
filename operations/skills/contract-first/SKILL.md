---
type: knowledge
tags: [everything-ecosystem, skills, operations, software-engineering-tier, contract-first, api-first, sad-v3, software]
ai-model: gpt-5.6-sol
created: 2026-07-26
source: hybrid
name: contract-first
description: >
  Enforce API-first / contract-first design before software implementation:
  publish the communication contract between backend capabilities and frontend
  (or SDK/MCP) consumers before either side is fully built. Industry names:
  API-first, contract-first, design-first; assets include OpenAPI, AsyncAPI,
  shared types, fixtures, and optional consumer-driven contracts (Pact).
  Mandatory at SAD Phase 1B → Phase 2 and whenever a new client-facing surface
  or cross-boundary capability is planned. Prevents backend-without-contract
  thrash and frontend-mock drift. MANDATORY TRIGGERS: contract-first, API-first,
  design-first, OpenAPI, AsyncAPI, API contract, communication contract,
  frontend contract, backend for frontend, BFF, consumer-driven contract, Pact,
  interface control document, ICD, ready for implementation, Phase 2 gate,
  client-server boundary, SDK contract, MCP tool schema.
---

# Contract-First Skill

> **Layer and tier:** operations layer, software engineering tier (EE-020). Moved from `knowledge/skills/` on 2026-10-27: contract-first is a development methodology (catalog entry `operations/catalog/methodologies/contract-first.md`), chosen per system by MAD, not a record of what is known.

The methodology ritual that requires a **published communication contract**
between providers (backend, services, agents) and consumers (web UI, SDK, MCP,
CLI) **before** a software build phase may begin — and before either side is
treated as finished.

Industry names for this practice: **API-first**, **contract-first**,
**design-first**. Related (not synonyms): Backend-for-Frontend (BFF),
consumer-driven contracts (CDC / Pact), Interface Control Document (ICD).

## Why this exists

Building “backend first” without a consumer contract produces thrash: UIs guess
shapes; APIs churn. Building “frontend first” without a contract produces mock
drift. The wise sequence is:

1. Decide **what** the product must represent and why (catalog / PRODUCT / DATA).
2. Publish the **contract** (resources, errors, auth, versioning, examples).
3. Implement provider and consumer **in parallel against the contract**.

SAD already requires articulation closure and a full spec stack before Phase 2.
This skill adds the missing **machine-checkable boundary artifact**: the API /
event / tool schema that FE and BE both implement.

## When to invoke

- Phase 1B → Phase 2 boundary (mandatory for software products).
- Version boundary when new client-facing capabilities ship.
- Planning any new cross-boundary surface: App Router data APIs, public Civic
  Index API, Actions handoffs, MCP tools/resources/prompts, webhooks.
- User asks for API-first, contract-first, OpenAPI, frontend communication
  contracts, or “backend before frontend.”
- Mid-Phase-2 when a surface is being built without a named contract (stop and
  author the contract before continuing).

Do **not** use this skill to postpone vision or catalog work. Contract-first
follows *what/why*; it does not replace it.

## Industry terminology map

| Operator phrasing | Industry term | Asset |
|---|---|---|
| Detailed FE↔BE communication layer | API contract / service contract | OpenAPI 3.x (HTTP), AsyncAPI (events) |
| Backend first, then UI | Prefer **contract-first**, then parallel implement | Spec + generated types |
| Thin API shaped for one UI | Backend for Frontend (BFF) | Optional adapter; still needs a contract |
| FE states what it needs; BE proves it | Consumer-driven contracts (CDC) | Pact (or equivalent) |
| Formal interface between systems | Interface Control Document (ICD) | Same idea; aerospace/defense name |
| Typed agent tools | MCP tools / resources / prompts schemas | JSON Schema + auth scopes |
| Shared TS types across apps | Schema-first / codegen | `openapi-typescript`, protobuf, etc. |

## Required assets (pre-build gate)

For each **consumer-facing capability cluster** in scope for the next build
slice, the following must exist or be explicitly deferred with version trigger:

### Tier A — mandatory before Phase 2 slice coding

1. **Contract document** — OpenAPI 3.x for HTTP APIs; AsyncAPI for
   event/webhook streams; JSON Schema (or equivalent) for MCP tool I/O.
2. **Auth and tenancy model** — anonymous vs Account, scopes, cookie/header
   rules, what never appears in URLs.
3. **Error and incomplete-grade conventions** — stable error codes; explicit
   incomplete / not-authoritative responses (no silent empty-as-zero).
4. **Versioning policy** — URL or header version; compatibility promises.
5. **Example payloads + fixtures** — happy path, empty, incomplete, auth
   failure; usable by FE mocks and BE conformance tests.
6. **IMPL_SPEC pointer** — where the live contract lives in-repo
   (e.g. `docs/api/` or `packages/api-contract/`).

### Tier B — strongly recommended before multi-client or public API

7. **Generated client types** (TypeScript) checked into or generated in CI.
8. **Conformance tests** — provider validates responses against the schema.
9. **Consumer-driven contract tests** (Pact or equivalent) when FE and BE are
   owned by different tempos or agents.
10. **Changelog** for breaking vs additive changes.

### Explicitly not the contract

- UI wireframes and microcopy (articulation closure / brand).
- Database migrations alone (DATA_MODEL is upstream; contract projects it).
- Vendor SDK docs substituted for *your* product contract.

## Workflow

When this skill loads:

### Step 1 — Name the consumer and provider

Record: consumers (web, SDK, MCP, …), providers (Workers routes, ingest,
identity, …), and the slice in PRODUCT_SPEC / VERSION scope.

### Step 2 — Confirm upstream *what*

If the capability indexes civic information, confirm the relevant rows in the
project’s catalog / PRODUCT / DATA_MODEL exist. Do not invent resources that
have no product purpose.

### Step 3 — Author or extend the contract

Prefer additive OpenAPI paths and schemas. Every resource states:

- purpose (orient / measure / act / contend — or product-specific verbs)
- auth
- request/response shapes
- temporal query params if applicable (`valid_at`, `known_at`, modality)
- failure and incomplete behavior
- examples

### Step 4 — Gate the build

Do not start feature UI or handler implementation for that slice until Tier A
assets exist or are deferred in writing. Parallel work *is* encouraged once the
contract is published: FE against fixtures; BE against the same schema.

### Step 5 — Keep the contract authoritative

Code that drifts from the contract is a defect. Prefer codegen and schema tests
over prose-only IMPL sections.

## Backfill / missing assets (mid-build recovery)

Follow [[../../../knowledge/skills/_patterns/gate-backfill|gate-backfill]] (detect → triage → order →
freeze → exit). Skill-specific notes:

### Detect

Inventory every shipping or in-progress client–server / client–agent boundary.
For each, mark Tier A assets present / partial / missing. Prefer route handlers,
FE fetch sites, and MCP tool lists over memory.

### Triage / freeze

| Class | Rule |
|---|---|
| **Blocker debt** | Must backfill before the *next change* to that boundary |
| **Queued debt** | Existing surface may keep running; no *new* endpoints/fields until contract exists; dated debt note required |
| **Deferred** | Explicit version trigger; not silently skipped |

No **new** networked surface ships without Tier A.

### Order

1. Document the contract from **live behavior** (paths, payloads, status codes, auth).
2. Add fixtures from real responses (redact secrets / PII / addresses).
3. Align FE types and mocks to the published contract.
4. Add conformance tests; then fix drift in code.

### Exit

Schema published, fixtures exist, provider responses match the schema (or
documented exceptions).

## Relationship to SAD

- **Phase 1B Specification** — PRODUCT, DATA_MODEL, IMPL, BEHAVIORAL,
  VERIFICATION remain required. The API contract is a **first-class Phase 1B /
  articulation-closure asset**, usually owned under or linked from IMPL_SPEC.
- **Articulation closure** — cannot pass for software slices that expose
  client-server boundaries without Tier A contracts (or recorded deferral).
- **Phase 2 Implementation** — implements against the contract; may refine the
  contract via Class 1/2 change discipline when reality contradicts it.
- **Phase Closure / real-run smoke** — smoke exercises the *contracted*
  external and internal boundaries.

Canonical methodology amendment:

`knowledge/method/SAD_SKILL_v3_AMENDMENT_2026-07-26_contract-first-pre-build.md`

## Anti-patterns

- “We’ll stabilize the API after the UI feels right” with no published schema.
- Hand-written FE types that diverge from server JSON with no single source.
- Treating route handler TypeScript as the only contract (not shareable to
  non-TS consumers; not reviewable as an artifact).
- Empty 200 responses for missing civic coverage (must be explicit incomplete).
- Collapsing Account private data into public Index API shapes.

## Status

- **2026-07-26:** Initial authoring. Class 3 SAD amendment proposed same day.
- **2026-07-26:** Backfill / missing-assets recovery mode added; shared pattern at `_patterns/gate-backfill.md`.
