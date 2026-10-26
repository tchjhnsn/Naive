---
type: methodology-amendment-proposal
ai-model: gpt-5.6-sol
spec-layer: methodology
version: 3.0.8-proposed
source: hybrid
created: 2026-07-26
last-reviewed: 2026-07-26
authorship: hybrid
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
status: APPLIED to SAD_SKILL_v3.md PART 5 + PART 8 — formal ratification still welcome
change-class: 3
sections-affected:
  - PART 5 — Phase 1B / Phase 2 boundary (pre-build contract gate)
  - PART 6 — specification structures (API contract as named asset)
  - PART 8 — capability-skills invoked by SAD v3
  - PART 11 — supporting patterns (contract-first)
tags: [methodology, sad-v3, amendment-proposal, class-3, contract-first, api-first, pre-build, openapi]
---

# SAD v3 Amendment Proposal — Contract-First Pre-Build Assets

**Status:** PROPOSED. Class 3 change. Pending the owner ratification before merge
into `SAD_SKILL_v3.md`.

**One-line summary:** Before Phase 2 implementation may begin on a software
slice that crosses a client–server (or client–agent) boundary, SAD requires a
published **communication contract** (industry: API-first / contract-first /
design-first) — typically OpenAPI, AsyncAPI, and/or MCP tool schemas — plus
auth, error, versioning, and fixture assets. Backend-leading implementation is
allowed; backend-without-contract is not.

**Capability skill:** [[skills/contract-first/SKILL|contract-first]]

---

## 1. Provenance

Triggered 2026-07-26 during the reference project aOS / Civic Index work: after articulating
*what* belongs in the Civic Index, the operator correctly asked whether building
backend before frontend with a detailed FE communication layer is industry
practice. The industry answer is **contract-first** (API-first / design-first),
not unstructured “backend first.” SAD already gates Phase 2 on articulation
closure and the spec stack, but did not name the machine-checkable API contract
as a required pre-build asset. This amendment closes that gap for all software
products under SAD.

Related existing skills: [[skills/articulation-closure/SKILL|articulation-closure]],
[[skills/software-product/SKILL|software-product]],
[[skills/industry-awareness/SKILL|industry-awareness]].

---

## 2. Additions

### 2.1 Pre-build contract gate (Phase 1B → Phase 2)

For software product types, a Phase 2 implementation slice that exposes or
consumes a networked boundary (HTTP route handlers, public API, webhooks, SDK,
MCP, CLI talking to services) **does not begin coding** until Tier A contract
assets exist for that slice, or each missing asset is recorded as deferred with
a version trigger.

**Tier A (mandatory):**

1. Contract artifact (OpenAPI 3.x and/or AsyncAPI and/or MCP JSON Schema)
2. Auth and tenancy model for the boundary
3. Error and incomplete-grade conventions
4. Versioning policy
5. Example payloads / fixtures
6. Pointer from IMPL_SPEC (or colocated `docs/api/`) to the live contract

**Tier B (required before public multi-client API):** generated types,
provider conformance tests, optional consumer-driven contracts (Pact), changelog.

Vision, catalog, and PRODUCT *what/why* work remain upstream of contracts.
Contracts do not replace DATA_MODEL_SPEC; they project a consumer-facing surface
of it.

### 2.2 Named asset in the specification family

Add **API / Communication Contract** as a first-class software deliverable
alongside PRODUCT / DATA_MODEL / IMPL / BEHAVIORAL / VERIFICATION. Default
in-repo location after Phase 2.1: `docs/api/` or `packages/api-contract/`.
Pre-repo drafts may live under `<entity>/product/spec/api/`.

### 2.3 Capability-skill registration

Register **contract-first** in PART 8 alongside time-awareness and
session-capture as a load-bearing ritual at the Phase 1B → Phase 2 boundary and
whenever new cross-boundary capabilities are planned.

### 2.4 Articulation closure verification row

Articulation closure gains an exit criterion:

> Every PRODUCT_SPEC F-flow or capability cluster that crosses a client–server
> or client–agent boundary has a Tier A communication contract, or a recorded
> deferral with version trigger.

---

## 3. Patches to SAD_SKILL_v3.md

### Patch 3.1 — PART 5, after Phase 1B

**Insert after Phase 1B: Specification:**

```
### Phase 1B → Phase 2 gate — Communication contracts (v3.0.8)

For software products, articulation closure and the core spec stack are
necessary but not sufficient when the next implementation slice crosses a
client–server or client–agent boundary. Before Phase 2 coding of that slice
begins, publish Tier A communication-contract assets (OpenAPI / AsyncAPI / MCP
schemas, auth, errors, versioning, fixtures) per the contract-first skill, or
record an explicit deferral with version trigger.

Industry name: API-first / contract-first / design-first. Backend-leading
implementation is fine; implementation without a published contract is not.
```

### Patch 3.2 — PART 5, Phase 2

**Append to Phase 2: Implementation:**

```
Implementation of networked slices proceeds against the published communication
contract. Drift is a defect. Contract changes follow Phase 4 class discipline.
```

### Patch 3.3 — PART 8

**Append to the capability-skills list:**

```
- **contract-first** — at Phase 1B → Phase 2 and whenever a new client-facing
  or agent-facing boundary is planned; requires published API/event/tool
  contracts before slice coding. Lives at `knowledge/skills/contract-first/`.
```

### Patch 3.4 — PART 11 (new supporting pattern)

**Insert:**

```
### Contract-First (API-First) Communication Boundaries

Publish the consumer–provider contract before building either side of a
networked slice. Prefer OpenAPI 3.x for HTTP, AsyncAPI for events, and explicit
schemas for MCP tools/resources/prompts. Keep fixtures shared. Optionally add
consumer-driven contract tests (Pact) when consumers and providers move at
different tempos. See skills/contract-first/SKILL.md.
```

---

## 4. Companion skill updates (same ratification)

- `skills/software-product/SKILL.md` — add API / Communication Contract to Tier 2
  / pre-build deliverables; link contract-first.
- `skills/articulation-closure/SKILL.md` — add Tier A contract to deliverables
  list and verification exit criteria.
- `skills/industry-awareness/SKILL.md` — map “FE communication layer” →
  contract-first / OpenAPI (optional one-line in terminology table when next
  edited).

---

## 5. Non-goals

- Does not require Pact on day one.
- Does not forbid backend-leading *implementation order* after the contract exists.
- Does not apply to Brand-only or pure vault research sessions with no software boundary.
- Does not replace real-run smoke (v3.0.1); contracts and smoke compose.

## 5b. Backfill mode (added 2026-07-26)

Projects already past the gate without contracts use the contract-first skill's
skill-specific backfill notes **and** the shared pattern:

`knowledge/skills/_patterns/gate-backfill.md`

Pattern: detect → triage (blocker / queued / deferred) → order (document reality
first) → freeze new surfaces → exit when assets + verification pass. Other gate
skills link the same pattern and keep only skill-specific notes.

---

## 6. Acceptance

- The owner ratifies; patches merge into `SAD_SKILL_v3.md` (or remain cited as
  applied amendment until next compile).
- contract-first skill is discoverable from Cursor via wrapper.
- Next the reference project build slice (Civic Index / Actions) authors Tier A contracts before
  feature coding.
