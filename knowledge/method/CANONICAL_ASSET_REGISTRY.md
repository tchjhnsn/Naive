---
type: methodology
ai-model: gpt-5.6-sol
spec-layer: methodology
source: hybrid
created: 2026-07-26
updated: 2026-07-26T08:26:15Z
last-reviewed: 2026-07-26
authorship: hybrid
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
canonical-for: "asset-definitions"
status: ACTIVE — living registry; amend via promotion paths P1–P5
related:
  - "[[sad/ASSET_REQUIREMENTS_METHOD]]"
  - "[[sad/SAD_SKILL_v3]]"
  - "[[knowledge/skills/_patterns/gate-backfill]]"
tags: [methodology, sad-v3, assets, registry, packs, obligations]
---

# Canonical Asset Registry

> **Canonical for:** what each asset *is*, when it is triggered, and what counts
> as done. Which assets *your* work needs is derived by
> [[ASSET_REQUIREMENTS_METHOD]].

---

## 1. Entry schema

Every registry entry carries:

| Field | Meaning |
|---|---|
| `id` | Stable identifier, e.g. `A-C03-02` |
| `name` | Canonical asset name |
| `aliases` | Industry names, so search finds it |
| `trigger` | The pack membership and condition that activates it |
| `purpose` | The decision or risk it exists to serve |
| `phase due` | Earliest SAD phase it gates |
| `depends on` | Assets that must exist first |
| `contents` | Minimum required sections |
| `exit` | Verifiable done condition |
| `basis` | Standard, regulation, or rationale (promotion path P1–P5) |
| `pointer` | Template or skill that produces it |

Compact tables below carry `id · name · trigger · phase · exit`. Expanded
entries follow for the load-bearing ones. Where `pointer` names a skill, that
skill owns the contents.

**Status legend for `pointer`:** `skill` = produced by an existing skill;
`template` = template exists; `unowned` = definition only, no generator yet.

---

## 2. Universal baseline (every entity, every pillar)

| id | Asset | Trigger | Phase | Exit |
|---|---|---|---|---|
| A-BASE-01 | Entity profile | always | 0A | Frontmatter complete; lifecycle stage declared |
| A-BASE-02 | Ambition tier declaration | always | 0A | Tier named with rationale (`ambition-tier` skill) |
| A-BASE-03 | System profile + characteristics | always | 0A | Every C-01…C-18 answered yes/no/planned-with-trigger |
| A-BASE-04 | Asset Requirement Set (ARS) | always | 0C | Every derived asset has status + owner + exit |
| A-BASE-05 | Session log | always | continuous | Entry per session (`session-capture` skill) |
| A-BASE-06 | Decision record set | always | 1A+ | Every irreversible decision has a dated record |
| A-BASE-07 | Glossary / term lock | always | 1A | Contested terms defined once, used consistently |
| A-BASE-08 | Version identity | multi-version work | 1A | `version-identity` skill satisfied |

---

## 3. Pillar packs

| id | Asset | Pillar | Phase | Exit |
|---|---|---|---|---|
| A-PIL-P1 | Vision spec | product | 0C | Cross-version intent, non-goals, success shape |
| A-PIL-P2 | Product spec | product | 1B | Every surface and flow named with acceptance shape |
| A-PIL-P3 | Behavioral spec | product | 1B | Validation, states, and error copy specified |
| A-PIL-P4 | Verification spec | product | 1B-Final | Invariants + ambiguity catalog + per-flow criteria |
| A-PIL-B1 | Brand voice rules | brand | 0C | Register, forbidden phrasings, worked examples |
| A-PIL-B2 | Identity system | brand | 1B | Color, type, spacing, components, usage bounds |
| A-PIL-B3 | Foreshadowing audit | brand | 1B-Final | `foreshadowing-audit` skill passed |
| A-PIL-Z1 | Monetization model | business | 0C | Revenue lines with assumptions stated |
| A-PIL-Z2 | Metric definitions | business | 1B | `metrics-review` skill satisfied |

---

## 4. Product-type packs

### 4.1 Software (`A-SW-*`)

| id | Asset | Trigger | Phase | Exit |
|---|---|---|---|---|
| A-SW-01 | Tech stack lock | software | 1B | Versions pinned with change protocol |
| A-SW-02 | Data model spec | persistent state | 1B | Entities, constraints, named invariants |
| A-SW-03 | Implementation spec | software | 1B | File topology, API surface, build pipeline |
| A-SW-04 | Environment + parity map | any deploy target | 2.0 | Local mode reaches every runtime path used in prod |
| A-SW-05 | Test strategy | software | 1B-Final | Unit/integration/E2E boundaries + coverage intent |
| A-SW-06 | Migration discipline | persistent state | 2.0 | Forward-only, reversible-or-documented, numbered |
| A-SW-07 | Release + rollback runbook | any deploy | 2.5 | Steps executable by someone else at 3am |

Hardware, content, and service packs remain as defined by their respective
skills (`hardware-product`, editorial and service templates); they are indexed
here but not expanded until a project activates them.

---

## 5. Characteristic packs

These are the packs the previous derivation lacked.

### C-01 Networked boundary

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C01-01 | Interface contract (OpenAPI / AsyncAPI / schema) | 1B-Final | `contract-first` Tier A satisfied |
| A-C01-02 | Error taxonomy | 1B | Machine code + human message + retry semantics per class |
| A-C01-03 | Mock server + fixture set | 1B-Final | Frontend can build against it with no backend |
| A-C01-04 | Contract test suite | 2.x | Provider verified against consumer expectations in CI |

### C-02 Developer platform

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C02-01 | Versioning + deprecation policy | 1B | Support window, breaking-change rules, sunset notice |
| A-C02-02 | Authentication + scope model | 1B | Scopes enumerated with least-privilege rationale |
| A-C02-03 | Rate limit + quota policy | 1B | Limits published, headers specified, 429 behavior defined |
| A-C02-04 | Terms of use + acceptable use | 1B-Final | Attribution, redistribution, and abuse bounds stated |
| A-C02-05 | Reference docs + quickstart | 2.5 | A stranger reaches first success without help |
| A-C02-06 | Changelog | 2.5 | Every published surface change dated |

### C-03 Data platform (ingest / normalize / redistribute)

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C03-01 | Source inventory | 1A | Every source: authority, license, cadence, access mode |
| A-C03-02 | Provenance policy | 1B | Every stored fact traceable to source + retrieval time |
| A-C03-03 | Licensing + redistribution matrix | 1B | Per-source rights to store, display, cache, redistribute |
| A-C03-04 | Ingestion contract + schema map | 1B-Final | Source fields mapped to internal model with unmapped fields listed |
| A-C03-05 | Data quality + freshness SLOs | 1B-Final | Staleness thresholds and user-visible staleness behavior |
| A-C03-06 | Correction + retraction procedure | 1B-Final | Path from "source was wrong" to corrected display, with audit |
| A-C03-07 | Backfill + reconciliation plan | 2.x | Re-ingest is idempotent and diffable |
| A-C03-08 | Rate/etiquette + access-terms compliance | 2.0 | Crawl and API terms honored, documented per source |

### C-04 Temporal knowledge graph

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C04-01 | Ontology / entity-and-relation catalog | 1B | Every node and edge type defined with identity rules |
| A-C04-02 | Bitemporal model | 1B | Valid time and known time defined; queries state which they use |
| A-C04-03 | Identity resolution + merge policy | 1B | Entity keys, dedupe rules, merge and split handling |
| A-C04-04 | Modality vocabulary | 1B | Enumerated states (actual, scheduled, proposed, contested, superseded…) |
| A-C04-05 | Supersession + revision rules | 1B-Final | How a later fact relates to an earlier one; append-only guarantees |
| A-C04-06 | Coverage map | 1B-Final | What the graph claims to cover, per jurisdiction and period |

### C-05 AI / agent system

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C05-01 | Agent role taxonomy + authority bounds | 1B | Each role: inputs, tools, what it may assert, what it may not |
| A-C05-02 | Grounding + citation policy | 1B | Fail-closed rule for uncited output, with enforcement point |
| A-C05-03 | Tool / capability contract | 1B-Final | Every tool: schema, side effects, permission, failure mode |
| A-C05-04 | Evaluation set + rubric | 1B-Final | Golden cases, scoring, regression threshold |
| A-C05-05 | Human-in-the-loop + escalation map | 1B-Final | Which actions require confirmation; how a human overrides |
| A-C05-06 | Model + prompt version registry | 2.x | Output traceable to model, prompt, and retrieval version |
| A-C05-07 | Abuse, jailbreak, and refusal policy | 2.x | Red-team cases with expected refusals |
| A-C05-08 | Cost + latency budget | 2.x | Per-call ceilings and degradation behavior |

### C-06 Identity & private records

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C06-01 | Data classification | 1B | Every field tiered (public / internal / sensitive / never-stored) |
| A-C06-02 | Retention + deletion matrix | 1B | Per class: retention, deletion trigger, propagation to derivatives |
| A-C06-03 | Consent + purpose-limitation record | 1B | What was collected, for what stated purpose, and the proof |
| A-C06-04 | Access control model | 1B | Roles, ownership, sharing, admin access, break-glass audit |
| A-C06-05 | Export + portability | 1B-Final | User can get their records out in an open format |
| A-C06-06 | Breach response runbook | 2.5 | Detection, containment, notice obligations, timeline |

### C-09 Third-party directory / referral

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C09-01 | Listing inclusion + exclusion criteria | 1B | Objective, published, and applied uniformly |
| A-C09-02 | Verification + credential-check policy | 1B | What is verified, how often, what "verified" claims |
| A-C09-03 | Ranking + ordering disclosure | 1B | Ordering basis stated; paid placement labeled if present |
| A-C09-04 | Conflict-of-interest + compensation disclosure | 1B | Any referral fee disclosed at the point of referral |
| A-C09-05 | Non-advice disclaimer + scope boundary | 1B-Final | Clear statement of what the product is not providing |
| A-C09-06 | Complaint + delisting procedure | 2.5 | A user or listee can contest a listing; outcomes logged |

### C-10 Action routing to external institutions

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C10-01 | Action catalog | 1A | Each action: authority, jurisdiction, eligibility, effect |
| A-C10-02 | Authority + jurisdiction map | 1B | Which body actually accepts this act, and where |
| A-C10-03 | Handoff contract per destination | 1B-Final | Deep link / prefill / API submit, with the fields each requires |
| A-C10-04 | Confirmation + receipt model | 1B-Final | What proof the user gets; what the product does and does not attest |
| A-C10-05 | Failure + partial-submission handling | 1B-Final | Timeouts, rejects, and duplicates cannot silently drop an act |
| A-C10-06 | Liability + disclaimer review | 1B-Final | Reviewed statement of who is responsible for the act |
| A-C10-07 | Destination change monitoring | 2.5 | Detection when a form, URL, or requirement changes |

### C-11 User-generated content

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C11-01 | Content policy | 1B | What is allowed, forbidden, and how borderline is judged |
| A-C11-02 | Moderation workflow + appeals | 1B-Final | Report → decision → notice → appeal, with SLAs |
| A-C11-03 | Takedown + legal-request handling | 2.0 | Named process for legal demands and counter-notice |
| A-C11-04 | Contributor license + rights grant | 1B | What rights the platform receives, stated at submission |

### C-12 Public-interest / high-trust

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C12-01 | Editorial standards + neutrality posture | 1B | Stated stance on framing, selection, and balance |
| A-C12-02 | Claim-level citation discipline | 1B | Every factual claim carries a resolvable source |
| A-C12-03 | Uncertainty + caveat vocabulary | 1B | Standard language for contested, partial, and stale facts |
| A-C12-04 | Correction policy (public-facing) | 1B-Final | Corrections are visible, dated, and preserved |
| A-C12-05 | Independence + funding disclosure | 1B-Final | Funding and incentives disclosed where they could bias output |
| A-C12-06 | Reliance boundary statement | 1B-Final | What decisions the product is and is not fit to support |

### C-13 Regulated domain

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C13-01 | Regulatory applicability analysis | 1A | Which regimes apply, per jurisdiction, with reasoning |
| A-C13-02 | Unauthorized-practice boundary | 1B | Where information ends and licensed practice begins |
| A-C13-03 | Required notices + consents | 1B-Final | Notice text placed at the required moment |
| A-C13-04 | Records + audit obligations | 2.0 | What must be kept, for how long, and retrievable by whom |

### C-14 Multi-tenant / federation

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C14-01 | Tenancy + isolation model | 1B | Isolation boundary named and testable |
| A-C14-02 | Jurisdictional configuration model | 1B | Per-jurisdiction variation without forked code paths |
| A-C14-03 | Cross-tenant data policy | 1B-Final | What aggregates across tenants and under what consent |

### C-17 Real-time / streaming

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C17-01 | Event contract (AsyncAPI) | 1B-Final | Channels, payloads, ordering, delivery guarantee |
| A-C17-02 | Reconnect + replay semantics | 1B-Final | Client behavior on drop, gap, and duplicate |

### C-18 Open source / community

| id | Asset | Phase | Exit |
|---|---|---|---|
| A-C18-01 | License + CLA decision | 0C | License chosen with rationale |
| A-C18-02 | Contribution + governance guide | 1B-Final | How to contribute and who decides |
| A-C18-03 | Security disclosure policy | 1B-Final | Reporting channel and response commitment |

Packs for C-07 (money movement), C-08 (marketplace), C-15 (physical/edge), and
C-16 (editorial publishing) are stubbed: they are indexed here and expanded when
a project first activates them. Stubbing is deliberate — the registry grows from
real activation, not speculation.

---

## 6. Obligation packs

| id | Asset | Obligation | Phase | Exit |
|---|---|---|---|---|
| A-O01-01 | Privacy posture + data map | O-01 | 1B | What is collected, why, where it flows, how long it lives |
| A-O02-01 | Threat model | O-02 | 1B-Final | Assets, adversaries, mitigations, accepted risks |
| A-O02-02 | Secrets + key management | O-02 | 2.0 | No secret in source; rotation path defined |
| A-O03-01 | Accessibility conformance target | O-03 | 1B | Target level named; automated + manual checks defined |
| A-O04-01 | Provenance & authenticity policy | O-04 | 1B | Origin, authorship, and machine-involvement disclosed |
| A-O05-01 | Safety policy + red-team set | O-05 | 1B-Final | Harm classes enumerated with expected behavior |
| A-O06-01 | Authority, correction, and appeal map | O-06 | 1B-Final | Who is authoritative; how a wrong output gets fixed |
| A-O07-01 | Rights & attribution register | O-07 | 1B | Every third-party input has a recorded right to use |
| A-O08-01 | Observability + audit plan | O-08 | 2.0 | Consequential actions produce durable, queryable trace |
| A-O09-01 | Continuity + exit plan | O-09 | 2.5 | Users and tenants can leave with their data intact |

---

## 7. Expanded entries

Only the entries whose contents are most often guessed wrong are expanded here.
Others expand on first activation.

### A-BASE-04 — Asset Requirement Set (ARS)

- **aliases:** deliverable register, asset inventory, DoD matrix
- **purpose:** make required assets explicit, reviewable, and gate-checkable so
  absence is a recorded decision rather than an oversight.
- **contents:** system profile header; one row per derived asset with pack and
  trigger; status; owner; phase due; exit criterion; location or deferral
  trigger; ranked debt list.
- **exit:** no derived asset lacks a status; every `— deferred` has a trigger.
- **basis:** P4 — omissions were passing gates undetected.
- **pointer:** `asset-requirements` skill.

### A-C03-02 — Provenance policy

- **aliases:** data lineage policy, source attribution policy
- **purpose:** a redistributed fact that cannot be traced to its source cannot
  be defended, corrected, or licensed correctly.
- **contents:** what is recorded per fact (source id, retrieval time, transform
  chain, confidence); where it is stored; how it surfaces to users; what happens
  when provenance is missing (fail closed vs. flag).
- **exit:** a randomly chosen displayed fact can be traced end-to-end in under
  five minutes.
- **basis:** P3 — implied by C-03; P1 where C2PA or similar applies.
- **worked example:** The reference project `POLICY_PROVENANCE_AND_AUTHENTICITY_2026-07-26`.

### A-C03-03 — Licensing + redistribution matrix

- **aliases:** source rights matrix, redistribution register
- **purpose:** every ingested source states what may be stored, displayed,
  cached, and redistributed through a product API, under what attribution, and
  under what rate or etiquette obligation — before any public redistribution.
- **contents:** per-source rows (publisher, access mode, license/terms URL or
  `unverified`, store/display/cache/redistribute rights, attribution, rate
  obligations); class rules (public domain / licensed / terms-restricted);
  attribution rendering rules for UI and API; a blocking list for any cell still
  unverified on redistribute.
- **exit:** every source currently ingested has a matrix row; no public API path
  redistributes a source whose redistribute cell is unverified or denied.
- **basis:** P2 + P3 — first activated by the reference project 2026-07-26.
- **worked example:** The reference project `POLICY_RIGHTS_AND_REDISTRIBUTION_2026-07-26`.

### A-C03-06 — Correction + retraction procedure

- **aliases:** data correction runbook, retraction procedure
- **purpose:** when a source was wrong or the product mishandled a source, there
  is a named path from report to corrected display that preserves append-only
  history.
- **contents:** report intake; source-wrong vs product-wrong triage; decision
  owner and SLA; representation of the correction under append-only rules
  (superseding revision, retraction record, correction edge); cache and
  derivative propagation; public visibility of the correction.
- **exit:** a test correction traverses the whole path and is visible.
- **basis:** P2 + P3 — first activated by the reference project 2026-07-26.
- **worked example:** The reference project `POLICY_AUTHORITY_CORRECTION_APPEAL_2026-07-26`.

### A-C05-01 — Agent role taxonomy + authority bounds

- **aliases:** agent charter, capability matrix
- **purpose:** distinguish what each agent may *retrieve*, *synthesize*, and
  *assert* so ungrounded generation cannot be mistaken for authority.
- **contents:** role list; per role: inputs, tools, output type, assertion
  authority, forbidden behaviors, escalation path, and the enforcement point
  that makes the bound real (not merely a prompt).
- **exit:** for every role, a named runtime check enforces at least the
  assertion bound.
- **basis:** P3 — implied by C-05; P2 where C-12 or C-13 also active.

### A-C10-03 — Handoff contract per destination

- **aliases:** integration contract, submission spec
- **purpose:** routing someone toward a consequential act with the wrong fields,
  wrong body, or wrong jurisdiction is a harm, not a bug.
- **contents:** destination authority; mode (directory / deep link / prefill /
  API submit); required and optional fields with source of each; validation
  before handoff; what the user must do outside the product; evidence returned;
  monitoring for destination change.
- **exit:** one end-to-end dry run per destination, with the receipt recorded.
- **basis:** P2 + P3.

### A-C12-03 — Uncertainty + caveat vocabulary

- **aliases:** coverage grading vocabulary, incomplete-grade convention
- **purpose:** missing, partial, stale, contested, or synthesized facts must
  never render as zero, empty silence, or certainty they do not have.
- **contents:** closed vocabulary aligned with modality and coverage grades;
  canonical user-facing copy per state; API representation (at minimum a
  `coverage` object with `grade`, `as_of`, `known_gaps`); placement rules for
  UI and API.
- **exit:** every surface that can lack data has an explicit state from the
  vocabulary; conformance fixtures cover authoritative / partial / absent.
- **basis:** P3 + P4 — first activated by the reference project 2026-07-26.
- **worked example:** The reference project `POLICY_UNCERTAINTY_AND_RELIANCE_2026-07-26`.

### A-C12-04 — Correction policy (public-facing)

- **aliases:** public corrections log, errata policy
- **purpose:** corrections are visible, dated, and preserved so reliance on a
  prior display can be audited after the fact.
- **contents:** what is published when a correction lands; where it appears;
  retention; relationship to the internal correction procedure (A-C03-06).
- **exit:** a published correction remains discoverable after the corrected
  display ships.
- **basis:** P2 + P3 — first activated by the reference project 2026-07-26.

### A-C12-06 — Reliance boundary statement

- **aliases:** fitness-for-purpose statement, non-advice boundary
- **purpose:** state what decisions the product is and is not fit to support,
  especially ahead of professional referrals and consequential Actions.
- **contents:** affirmative scope (e.g. civic information and orientation);
  explicit exclusions (legal, financial, tax, medical advice, and any domain the
  product touches); where the statement appears (footer, handoff chrome, API).
- **exit:** the boundary copy is locked and placed at every handoff that could
  be mistaken for advice.
- **basis:** P2 + P3 — first activated by the reference project 2026-07-26.
- **worked example:** The reference project reliance wording in
  `POLICY_UNCERTAINTY_AND_RELIANCE_2026-07-26`.

### A-O04-01 — Provenance & authenticity policy

- **aliases:** authorship disclosure, authenticity policy
- **purpose:** origin, authorship, and machine involvement are disclosed so a
  user can distinguish retrieved evidence from synthesized explanation.
- **contents:** authorship classes; machine-involvement labeling; relationship
  to provenance records (A-C03-02); optional authenticity-manifest candidacy
  (e.g. C2PA) marked as candidate, not commitment.
- **exit:** every displayed claim class has a named authorship disclosure rule;
  synthesized-but-cited content is visually and machine-distinguishable from
  primary retrieval.
- **basis:** P2 + P3 — first activated by the reference project 2026-07-26.
- **worked example:** The reference project `POLICY_PROVENANCE_AND_AUTHENTICITY_2026-07-26`.

### A-O06-01 — Authority, correction, and appeal map

- **aliases:** accountability map, redress procedure
- **purpose:** for anything a user relies on, there must be a named authority,
  a way to be wrong, and a way to be fixed.
- **contents:** per surface: who is authoritative, what the product asserts on
  its own behalf, how a user reports an error, expected response, how the
  correction propagates to caches and derivatives, and public record of the
  correction.
- **exit:** a test correction traverses the whole path and is visible.
- **basis:** P2 + P3.
- **worked example:** The reference project `POLICY_AUTHORITY_CORRECTION_APPEAL_2026-07-26`.

### A-O07-01 — Rights & attribution register

- **aliases:** attribution register, rights ledger
- **purpose:** every third-party input has a recorded right to use, and the
  attribution the product owes is rendered where the content appears.
- **contents:** machine- or human-readable register keyed by source id;
  attribution text; link to the licensing matrix (A-C03-03); API fields that
  carry `license_id` and attribution.
- **exit:** a random displayed item resolves to a register row and the
  attribution that row requires is present in UI and API.
- **basis:** P2 + P3 — first activated by the reference project 2026-07-26.
- **worked example:** The reference project `POLICY_RIGHTS_AND_REDISTRIBUTION_2026-07-26`.

---

## 8. Amendment

New entries enter via promotion paths P1–P5 in [[ASSET_REQUIREMENTS_METHOD]] §9.
Every entry added records its path and originating project. Removing an entry
requires the same discipline as adding one.

## 9. Status

- **2026-07-26:** Initial authoring. Packs C-01…C-06, C-09…C-14, C-17, C-18
  expanded; C-07, C-08, C-15, C-16 stubbed pending first activation.
- **2026-07-26:** Expanded entries added for A-C03-03, A-C03-06, A-C12-03,
  A-C12-04, A-C12-06, A-O04-01, A-O07-01 from the reference project first activation
  (promotion paths P2/P3).
