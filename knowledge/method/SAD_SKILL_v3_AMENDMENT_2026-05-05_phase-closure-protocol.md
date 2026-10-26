---
type: methodology-amendment-proposal
ai-model: claude
spec-layer: methodology
version: 3.0.1-proposed
source: hybrid
created: 2026-05-05
last-reviewed: 2026-05-05
authorship: hybrid
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
predecessor-idea: "[[vault/Torian/everything-ecosystem/_ideas/sad-amendment-2026-05-05-phase-closure-protocol]]"
status: PROPOSED — awaiting convergence + ratification
change-class: 3
sections-affected:
  - PART 5 — episodic phases (new Phase Closure Protocol sub-section)
  - PART 11 — supporting patterns (new External-Integration Smoke Tests)
  - PART 12 — known failure modes (new "real-run gap" entry)
tags: [methodology, sad-v3, amendment-proposal, class-3, phase-closure, real-run-discipline, smoke-tests]
---

# SAD v3.0.1 Amendment Proposal — Phase Closure Protocol + Real-Run Discipline

**Status:** PROPOSED. Class 3 change. Pending convergence pass + the owner ratification before merging into `SAD_SKILL_v3.md`.

**Source idea:** [[vault/Torian/everything-ecosystem/_ideas/sad-amendment-2026-05-05-phase-closure-protocol]] (graduated to this proposal 2026-05-05).

**One-line summary:** SAD v3 currently lets a Phase close as long as the slice "looks done" (compiles, passes mock-based tests, deploys). It does not require that the slice has been exercised once against the real external dependencies it will talk to in production. This proposal adds three additive guardrails — a Phase Closure Protocol, a Local-Dev-Parity-by-Bootstrap requirement, and an External-Integration Smoke Test pattern — that together close the "real-run gap" without changing any other SAD invariant.

---

## 1. Provenance

This amendment is motivated by a concrete, dated, single-session failure on the reference project:

- **2026-05-05, Phase 2.4 → 2.5 handoff (the reference project v1).** The F1 vertical slice (visitor enters address → federal representation returned) was authored against mocks during Phase 2.4 and merged to `main`. Phase 2.4 closed as "complete." First time the slice ran against the real Census Bureau Geocoder API was *in production*, where every request was rejected by Census's Imperva WAF (TLS-fingerprinting at the edge; programmatic clients blocked regardless of HTTP-layer headers). Diagnosing the failure took five GitHub Actions deploy cycles plus the eventual stand-up of a `pnpm preview` workflow that should have existed since Phase 2.1 (project bootstrap). Resolution required a Class 2 substrate change (live Census API → build-time TIGER seed) documented in IMPL_SPEC §0.2.

- **The meta-failure is upstream of the bug.** Even if the Census WAF hadn't blocked us, *some* runtime integration would have surfaced *some* surprise the moment the slice met production. The cost of that surprise scales with how late it surfaces: caught in local dev = 5 seconds; caught in CI = 5 minutes; caught in production = 5 deploy cycles + on-call attention + rollback risk + (if user-facing) brand damage. SAD v3 currently doesn't enforce the early-catch path.

- **This proposal is not a reaction to one bug.** The reference project's F1/Census incident is the immediate trigger; the structural pattern the proposal addresses applies to every project that integrates with external services (geocoders, payment providers, mail, search, analytics, social-network APIs — i.e., most projects).

Cross-reference for the full session arc: `<repos>/<repo>/SESSION_LOG.md` Sessions 4–6 (2026-05-05) plus IMPL_SPEC §0.1 + §0.2.

---

## 2. The Three Proposed Additions

### 2.1 Phase Closure Protocol — new sub-section under PART 5

A phase that lands user-visible code is not closed until its slice has been exercised once locally against the real external dependencies it will talk to in production. Three concrete additions:

1. **Closure Checklist gains a "Real-Run Smoke" step.** Before declaring any Phase 2.x complete, the maintainer runs the slice end-to-end against real external services (geocoder, payment, mail, etc.) in a dev or preview environment. The smoke test is a one-off — not automated; the goal is to *surface surprises*, not to encode them. If a surprise surfaces, it gets either fixed or recorded as a Spec Change before closure.
2. **Session-end log entry** (PART 10 format) captures the date + outcome of the real-run smoke. A closing log entry without a smoke-run date is a process violation, not a successful close.
3. **If the real-run reveals a discrepancy from the spec**, the spec is amended (Class N change per existing SAD §Phase 4 protocol) before the phase closes. Equivalent of "the integration test tells the spec what reality is."

Applies to: any phase whose deliverable touches an external service. Phase 0A (mind-dump), Phase 1B (specs), and Phase 5 (completion) are unaffected — those don't have runtime integrations.

### 2.2 Local-Dev-Parity-by-Bootstrap — addition to Phase 2.1 guidance

Whatever phase initializes the codebase (Phase 2.1 in our cadence) cannot close until a developer can run the production-equivalent stack locally. Concretely:

- The bootstrap-phase ship list explicitly includes a `pnpm preview` (or equivalent) script that runs the **same runtime** as production (e.g., workerd for Cloudflare projects, not just `next dev` on Node).
- Bindings and integrations reachable in production are reachable in local preview, even if the local versions point at staging instances.
- Documentation: the project's `CLAUDE.md` Development Workflow section names which command produces what fidelity (fast-but-mock vs. slow-but-real).

Rationale: the F1 incident's root cause was discoverable in 30 seconds of local preview — but local preview wasn't set up until *after* the incident. Setting it up at bootstrap is one-time work; setting it up under fire is much costlier.

### 2.3 External-Integration Smoke Tests — new pattern in PART 11

For every external service the project integrates with at runtime, a `tests/smoke/<service>.smoke.ts` file hits the real service on a CI schedule (nightly, weekly — *not* per-commit, to avoid hammering the dependency). The test asserts the contract we depend on:

- Authenticated request succeeds.
- Response shape matches expected fields.
- Latency under a sane threshold.

When the external service drifts (changes endpoint, rotates auth, tightens WAF, changes response shape), the smoke test fails publicly in CI within hours-to-days. The team learns about the drift before the next user-visible regression.

Constraint: smoke tests do **not** run in pre-commit / pre-merge gates. They run on cron, surface as a separate CI status, and don't block development.

---

## 3. Patches to SAD_SKILL_v3.md

Each change below is a discrete edit. The "before" excerpt is verbatim from the current SAD_SKILL_v3.md; the "after" replaces it.

### Patch 3.1 — PART 5, Phase 2 sub-section

**Before** (lines 475–478):

```
### Phase 2: Implementation

Carries from v2. Decision Boundary protocol unchanged. Session-end log entry now uses the v3 format (PART 9).
```

**After:**

```
### Phase 2: Implementation

Carries from v2. Decision Boundary protocol unchanged. Session-end log entry now uses the v3 format (PART 9). v3.0.1 adds the **Phase Closure Protocol** below.

#### Phase Closure Protocol (v3.0.1, 2026-05-05)

A Phase 2.x sub-phase that lands user-visible code does not close until its slice has been exercised once locally against the real external dependencies it will talk to in production:

1. **Real-Run Smoke.** Before declaring the sub-phase complete, run the slice end-to-end in a dev or preview environment against real external services. One-off; not automated. Goal: surface surprises before they hit production.
2. **Log capture.** The session-end log entry (PART 10) records the date of the smoke-run + outcome. A close without a smoke-run date is a process violation.
3. **Spec amendment if surprised.** If the real-run reveals a divergence from the spec (Census WAF blocks programmatic clients, vendor changed pricing tier, response shape evolved), amend the spec (Class N per Phase 4 protocol) before declaring the sub-phase complete.

Applies to any phase whose deliverable touches an external service. Phase 0A, 1B, 4, and 5 are exempt — they have no runtime integrations.

#### Phase 2.1 — Local Dev Parity (v3.0.1, 2026-05-05)

The bootstrap sub-phase (typically Phase 2.1 — repo initialization) cannot close until a developer can run the production-equivalent stack locally:

- A `pnpm preview` (or equivalent) script that runs the **same runtime** as production. For Cloudflare projects this means workerd via `wrangler dev` / `opennextjs-cloudflare preview`, not just `next dev` on Node.
- Bindings and external integrations reachable in production are reachable in local preview (with staging-instance overrides where appropriate).
- The project's `CLAUDE.md` Development Workflow section names which command produces what fidelity.
```

### Patch 3.2 — PART 11, new "External-Integration Smoke Tests" sub-section

**Before** (PART 11 currently ends at "Reflection cadence" or whatever the last sub-section is):

PART 11's existing sub-sections are unchanged.

**After (append):**

```
### External-Integration Smoke Tests (v3.0.1, 2026-05-05)

For every external service a project integrates with at runtime (geocoders, payment providers, mail, search, analytics), maintain a `tests/smoke/<service>.smoke.ts` file that:

- Hits the real service (not a mock).
- Asserts the contract the project depends on (auth succeeds, response shape includes expected fields, latency under threshold).
- Runs on a CI schedule (nightly, weekly), **not** on pre-commit / pre-merge.
- Surfaces as a separate CI status. Fails do **not** block development; they raise a flag that the integration drifted and the team should look.

Goal: when the external service drifts (changes endpoint, rotates auth, tightens WAF, changes response shape), the smoke test fails publicly in CI within hours-to-days, before the next user-visible regression. This is the slow continuous counterpart to the Phase Closure Protocol's one-shot real-run smoke.
```

### Patch 3.3 — PART 12, new "Real-Run Gap" failure mode

**Before** (PART 12 lists failure modes carried from v2 plus four v3 additions):

```
### Campaign drift

A Campaign that loses its charter becomes an open-ended container for vaguely-related work. Mitigation: every Campaign has a charter (intent, target outcome, exit criteria); when those drift, either rewrite the charter explicitly or close the Campaign and open a new one.
```

**After (append after the Campaign-drift entry):**

```
### Real-run gap (v3.0.1, 2026-05-05)

A Phase 2.x sub-phase closes "complete" because it compiles, passes mock-based tests, and deploys — but the slice has never been exercised against the real external dependencies it will talk to. Production is the first place the slice meets reality. Symptoms: deploy succeeds; first user request reveals a discrepancy (auth, response shape, WAF, vendor pricing-tier surprise). The cost of surfacing the gap scales with how late it surfaces: 5 seconds locally, 5 minutes in CI, 5 deploy cycles + on-call attention + (if user-facing) brand damage in production.

Mitigation: the **Phase Closure Protocol** (PART 5, Phase 2 sub-section) requires a one-off real-run smoke before sub-phase close, and the **External-Integration Smoke Tests** pattern (PART 11) maintains continuous drift detection.

Worked example: The reference project v1 Phase 2.4 → 2.5 handoff (2026-05-05). F1 slice authored against mocks; first real Census API call landed in production; Census's Imperva WAF blocked all programmatic clients; cost five deploy cycles + a Class 2 substrate change (live API → build-time seed) per IMPL_SPEC §0.2.
```

---

## 4. Cost / risk analysis

| Concern | Assessment |
|---|---|
| Adoption cost | Modest. Phase Closure Protocol = one extra checklist item per sub-phase. Local-dev-by-2.1 = one-time setup at bootstrap. Smoke tests = one file per external service + one CI cron entry. |
| Friction | The smoke tests intentionally don't gate development (cron-only, separate status). The closure protocol's "real-run smoke" is *one* run, not a continuous thing — should add minutes, not hours, per sub-phase. |
| False positives | Smoke tests against external services will sometimes flake (the service had a transient outage). Mitigation: smoke tests are non-blocking; a flake doesn't break development; tracked but not on-fire. |
| Spec-change overhead | If the real-run smoke reveals a discrepancy, the spec amends. That's already SAD's Class N protocol — not new. The amendment is just *requiring* it happen at the right moment, not invoking new machinery. |
| Consistency with v3 invariants | Additive only. No retraction of v2 → v3 carries (Phase 0A → 5 pipeline, seven specs, Convergence Layer, Decision Boundary, Spec Change Classes, staleness markers, Session Opening). |

---

## 5. Convergence protocol for this amendment

This is a Class 3 SAD methodology change — additive guardrails to the existing pipeline. Per SAD's own Phase 4 (Spec Evolution) protocol:

1. **Author the proposal** (this document). ✓ done 2026-05-05.
2. **Run a Spec Convergence pass** on the proposal. Generate ~10 adversarial scenarios (e.g., "what if a project has zero external services?", "what if the smoke test itself takes 30 minutes?", "what if local-dev-parity is impossible for a regulated runtime?"). Address or accept each.
3. **The owner ratification.** Maintainer of the methodology approves or requests changes.
4. **Patch SAD_SKILL_v3.md** with the three discrete patches in §3 above. Bump the methodology version frontmatter to `3.0.1`. Add a DELTA LOG entry.
5. **Apply retroactively** (where applicable). The reference project v1 should backfill the closure-protocol log entries for Phases 2.1–2.4 once the methodology is ratified. Future projects pick it up at bootstrap.

Until step 4 lands, this proposal lives at `knowledge/method/SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol.md` as a queued artifact. The companion idea-stage note at `vault/Torian/everything-ecosystem/_ideas/sad-amendment-2026-05-05-phase-closure-protocol.md` should be marked `idea-status: graduated` once this proposal is ratified.

---

## 6. Adversarial scenarios — preliminary pass

These are the convergence-pass questions I can think of right now. Full convergence runs ~10 adversarial scenarios; this preview catches the obvious ones.

**Q1: What if a project has zero external services?** Then the Phase Closure Protocol's "real-run smoke" reduces to "run the slice end-to-end locally against the project's own services" — still valuable for catching local-vs-production runtime divergence (e.g., different DB, different filesystem assumptions). Smoke tests are simply not generated.

**Q2: What if local-dev-parity is impossible for a regulated runtime?** Some projects need production-only services (e.g., HSM-bound crypto, regulated payment rails). Mitigation: the protocol allows a documented exception; the project's CLAUDE.md Development Workflow names which integrations are not locally reachable and what staging surface tests them instead. The exception itself is a discrete artifact, not a hand-wave.

**Q3: What if the smoke test itself becomes a maintenance burden?** Smoke tests are one file per service. If a service has 20 endpoints, the smoke test asserts maybe 2 (auth + one canonical request). Aggregate burden: O(N services), not O(N endpoints). Reviewable in a quarterly sweep.

**Q4: Doesn't this slow down velocity?** The closure protocol adds minutes per sub-phase. Local-dev-parity adds one-time bootstrap setup. Smoke tests run on cron and don't block. Velocity cost is much smaller than the cost of one production incident with on-call attention.

**Q5: What about projects that use SAD partially?** The amendment is opt-in at the project level. Projects that don't use SAD's full pipeline aren't affected. Projects that do use SAD's Phase 2 protocol pick up the closure protocol along with it.

**Q6: How does this interact with the Decision Boundary protocol?** The closure protocol is downstream of the Decision Boundary — it triggers at sub-phase close, after all decisions for that sub-phase are settled. The two are orthogonal.

**Q7: Could this be enforced automatically (CI gate)?** The real-run smoke is intentionally a manual one-off — if it were automatic on every commit, it'd hammer the external service and dilute the "surface surprises" intent. The session-log capture is an honor-system artifact; future auditing could grep `_sessions/SESSION_LOG.md` for closure entries lacking smoke-run dates.

**Q8: What about external services that change their API key requirements mid-cycle?** The smoke test catches this (assuming the smoke test runs with a real key). It would fail with a 401 / 403. The team learns; the spec amends; the smoke test resumes.

Convergence verdict (preliminary): no scenarios surface a structural problem. Two scenarios (Q2, Q3) suggested minor refinements that are already captured in the proposal text.

---

## 7. Cross-references

- **The reference project v1 incident report:** `<repos>/<repo>/SESSION_LOG.md` Sessions 4–6 (2026-05-05).
- **IMPL_SPEC §0.1** — Phase 2.3 Pages → Workers pivot (Class 2 substrate change).
- **IMPL_SPEC §0.2** — Build-Time Render, Runtime Read principle (the architectural fix that the real-run gap helped surface).
- **SAD_SKILL_v3.md PART 4** — Session Opening Protocol (the existing scaffold this amendment extends).
- **SAD_SKILL_v3.md PART 12** — existing failure modes (this amendment adds one).
- **Companion idea-stage note** at `vault/Torian/everything-ecosystem/_ideas/sad-amendment-2026-05-05-phase-closure-protocol.md` — graduates once this proposal is ratified.
