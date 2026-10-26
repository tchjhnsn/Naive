---
type: methodology-reference
ai-model: claude
source: hybrid
created: 2026-05-16
last-reviewed: 2026-05-16
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
canonical-for: "tool-categorization-and-ci-cd-mapping"
tags: [methodology, tools, ci-cd, infrastructure, runtime-services, terminology, 2026-05-16]
related:
  - "[[SAD_SKILL_v3]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-14_methodology-evolution]]"
  - "[[pipeline-canonical-view-2026-05-14]]"
  - "[[build-roadmap-and-html-orchestration-2026-05-12]]"
---

# Tool Inventory + CI/CD Mapping — Canonical Reference

> Canonical for: how the methodology categorizes external tools/services + how SAD's four lanes map to the CI/CD loop. Per §42 amendment. Applied to the reference project's current stack as the reference example.

## The CI/CD ↔ SAD lane mapping

SAD's four-lane methodology (Articulate → Build → Ship → Operate) is an expression of the CI/CD loop, with two extensions:

1. **Articulate is first-class.** Traditional CI/CD diagrams treat "Plan" as out-of-scope or barely-shown. SAD elevates Articulate to a co-equal lane with rigorous sub-phases (0A enumeration → 0B research → 0C vision → 1A version → 1B spec → 1C closure).
2. **Three pillars as cross-cutting.** CI/CD is Product-pillar-focused. SAD applies the same loop to Brand and Business work (each pillar's deliverables go through Articulate → Build → Ship → Operate).

| Traditional CI/CD stage | SAD lane | What it covers in SAD |
|---|---|---|
| Plan / Discover | **Articulate** | 0A enumeration → 0B research → 0C vision → 1A version → 1B spec stack → 1C articulation closure |
| Code | **Build** (early) | Phase 2.1 bootstrap, 2.2 schema, early implementation |
| Build | **Build** (mid) | Phase 2.3 platform, 2.4 vertical slice, 2.5 editorial seed |
| Test | **Build** (verify) | Phase 2.Final §9 test plan + Real-Run Smoke (v3.0.1 amendment) |
| Release | **Ship** (preflight) | Phase 3.1 — lockfile, env, articulation-closure verify |
| Deploy | **Ship** (deploy) | Phase 3.2 production deploy |
| Operate | **Operate** | Phase 4.1 V[N].x patches, 4.2 monitor + triage |
| Monitor | **Operate** | Same — observability is operate-lane work |
| Feedback | **Operate → next Articulate** | Phase 4.3 — V[N+1] articulation runs in parallel with V[N] operate (per §22 idea-state recognition) |

**Common misconception** (one the owner had until 2026-05-16): "CI/CD" colloquially means the GitHub-Actions-style automation in the ship phase. That's the *narrow* usage. The full CI/CD loop is broader and corresponds to SAD's entire lane structure.

---

## Tool categorization vocabulary

Industry-standard terms for the services + tools a project uses. Adopt these consistently.

### Infrastructure providers

Services that run code or store data. Critical-path; system can't run without them.

**Examples:** Cloudflare (Workers + edge + CDN + WAF + DNS), Neon (Postgres), AWS, Vercel, Anthropic (LLM compute).

### Developer tools

Used during development; not at runtime. Not in the running product.

**Examples:** GitHub, Cursor, Claude Code, pnpm, TypeScript, Drizzle, Next.js, Playwright.

### Productivity tools

Workflow + planning + knowledge management. Not in the running product.

**Examples:** Linear, Obsidian, Notion, Slack, Figma.

### Runtime services (or "runtime dependencies")

External APIs the *running app* talks to in production.

**Examples:** Geocodio (geocoding), MailerSend (email), Anthropic API (for embedded AI), congress.gov, theunitedstates.io.

### Data sources

Subset of runtime services that provide input data.

**Examples:** theunitedstates.io (officeholder data), congress.gov (federal legislative data), state legislature APIs.

### Observability / monitoring services

Production observation; degrade gracefully if down.

**Examples:** Plausible / Fathom (analytics), Sentry (error tracking), Cloudflare Analytics (built-in), Datadog.

### Vendors

Generic term for paid providers. Most of the above can be vendors.

### Cloud service model classifications

- **SaaS** — Software as a Service (Linear, Notion, MailerSend, etc.)
- **PaaS** — Platform as a Service (Vercel, Cloudflare Workers for some uses)
- **IaaS** — Infrastructure as a Service (raw AWS, Google Cloud Compute)

### Dependency criticality

- **Critical-path dependency** — system can't function without it
- **Soft dependency** — degrades gracefully if unavailable
- **Build-time dependency** — used to build/deploy but not at runtime

The **Real-Run Smoke discipline** (per SAD v3.0.1 amendment) explicitly targets critical-path runtime dependencies. Smoke tests run against real services in dev/preview before phase closure, not just against mocks.

---

## The reference project's stack — categorized

### Infrastructure providers (critical-path runtime)

- **Cloudflare** — Workers (compute), CDN (edge), WAF (security), DNS, Hyperdrive (DB connection pooling)
- **Neon** — managed Postgres database with HTTP driver

### Developer tools (build-time)

- **GitHub** — source code repository, CI/CD orchestration (Actions), code review (PRs)
- **Cursor / Claude Code** — AI-paired IDE / CLI
- **pnpm** — package manager
- **TypeScript** — language + compiler
- **Drizzle** — ORM + migration tool
- **Next.js** — application framework (App Router)
- **OpenNext** — Cloudflare adapter for Next.js

### Productivity tools

- **Linear** — project management, backlog, cycle planning, roadmap, agent system (Linear Agent in beta)
- **Obsidian** — knowledge base, methodology docs, idea-dumps, session logs, raw + compiled vault

### Runtime services (V1.0 deployed)

- **Geocodio** — geocoding API (replaces Census Imperva-blocked path; current)

### Runtime services (V1.5 adds)

- **Anthropic API** — LLM provider for ant (the embedded AI; produces wiki pages on 404 fallback)
- **congress.gov + senate.gov + house.gov** — federal legislative real-time data
- **State legislature APIs** — 50 separate APIs; coverage varies per state
- **News feeds** — curated allowlist with concentric-rings classification

### Data sources

- **theunitedstates.io** — civic data (officeholders, positions, congressional data)
- **congress.gov** — federal legislative records
- **State legislature APIs** — state-level legislative records

### Monitoring services (planned)

- **Plausible / Fathom** — privacy-respecting analytics (V1.5-B.12; required for trending feed)
- **Sentry** — error tracking (I-03 in V1 enumeration)
- **Cloudflare Analytics** — built-in, basic-tier

### Soft dependencies

- **MailerSend** — transactional email (failure → log + retry, doesn't break wiki)
- News feeds (failure → "news section unavailable" UI; doesn't break wiki)
- Analytics (failure → no trending data; doesn't affect users)

---

## Stack-by-CI/CD-stage

| CI/CD stage | SAD lane | The reference project tools |
|---|---|---|
| Plan / Discover | Articulate | Linear, Obsidian, Cursor / Claude Code |
| Code | Build (early) | GitHub, Cursor, Claude Code |
| Build | Build (mid) | GitHub Actions, pnpm, TypeScript, Drizzle |
| Test | Build (verify) | GitHub Actions test runners; VERIFICATION_SPEC §9 plan; Real-Run Smoke |
| Release | Ship (preflight) | GitHub (tags, releases), GitHub Actions release workflow |
| Deploy | Ship (deploy) | Cloudflare Workers, Neon, GitHub Actions |
| Operate | Operate | Cloudflare, Neon, Anthropic, Geocodio, theunitedstates.io, MailerSend |
| Monitor | Operate | Cloudflare Analytics, Plausible (planned), Sentry (planned), Linear (triage) |
| Feedback | Operate → next Articulate | Linear (user reports + bug intake), User flagging mechanism (V1.5-B.05), Editorial review dashboard (V1.5-B.07) |

---

## How to refer to these things in the methodology

When writing about specific tools or services in vault docs, specs, runbooks, etc., prefer **specific industry terms** over generic ones:

- **"Infrastructure provider"** when referring to compute/storage layer (Cloudflare, Neon)
- **"Runtime service"** or **"runtime dependency"** when referring to APIs the running app talks to (Geocodio, Anthropic API)
- **"Data source"** when referring to providers of input data specifically (congress.gov, theunitedstates.io)
- **"Developer tool"** for build-time tools (GitHub, Cursor)
- **"Productivity tool"** for workflow tools (Linear, Obsidian)
- **"Observability / monitoring service"** for production observation (Plausible, Sentry)

**"External service"** is acceptable as a generic catch-all, but prefer specific terms when possible.

**"Provider"** alone is too generic — prefer "infrastructure provider," "runtime service provider," "monitoring provider," etc.

**"Dependency"** alone is ambiguous (could mean library, runtime service, or build-time tool) — prefer "runtime dependency," "build-time dependency," or "library dependency."

When discussing reliability + criticality:

- **"Critical-path"** for things the system can't function without
- **"Soft dependency"** for things that degrade gracefully
- **"Smoke-tested"** for runtime dependencies that pass Real-Run Smoke (per v3.0.1)

---

## Cross-references

- [[SAD_SKILL_v3_AMENDMENT_2026-05-14_methodology-evolution]] — §42 captured as proposed amendment
- [[build-roadmap-and-html-orchestration-2026-05-12]] §42 — full amendment authoring
- [[pipeline-canonical-view-2026-05-14]] — canonical methodology view; §42 in queued amendments list
- [[SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol]] — Real-Run Smoke discipline this doc references
- [[industry-awareness/SKILL]] — the skill that surfaces these terminology distinctions in conversation

## Status

- **2026-05-16:** Initial authoring per §42 amendment.
