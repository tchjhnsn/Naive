---
type: checklist
ai-model: none
source: human
created: 2026-05-19T05:11:51Z
tags: [methodology, consultancy, vault-setup, tooling, checklist, anything-factory]
related-ideas:
  - "[[idea-187]]"
related-entities:
  - "[[everything-ecosystem]]"
status: living-document
---

# Vault + Tooling Consultancy Setup Checklist

A working checklist for setting up another operator's vault, AI tooling, methodology layer, and external tool connections — regardless of industry. Use it as a session-by-session guide; not every customer needs every item.

This is a *living document*. After each engagement, refine the checklist with what you learned.

---

## Phase 0 — Pre-engagement (before first session)

- [ ] **Scope conversation** — what does the customer want at the end of this engagement? One-session setup, or multi-session articulation?
- [ ] **Pricing agreement** — hourly, fixed project, or retainer. Captured in writing.
- [ ] **Contract / engagement letter** — basic terms, IP ownership (customer owns their vault), confidentiality, cancellation
- [ ] **Discovery questionnaire** sent ahead of session — what do they sell, who do they serve, what tools do they use, what's painful
- [ ] **Hardware/OS check** — Mac / Windows / Linux. Obsidian works on all; Claude Code works on macOS/Linux/WSL; Cowork is macOS for now
- [ ] **Schedule** — 2-4 hour blocks work better than 1-hour sessions for setup work
- [ ] **Pre-share methodology overview** — give them a one-pager so they're not blind on session-day

## Phase 1 — Discovery / intake (first hour of first session)

- [ ] **BASED elicitation** — what's the fullest extent of what they want this business to become? Don't accept pre-narrowed answers.
- [ ] **Business shape** — solo / partnership / team / has-employees / has-physical-location / online-only / hybrid
- [ ] **Customer / clientele** — who they serve, how they reach them, retention model
- [ ] **Revenue model** — service / product / subscription / commission / mixed
- [ ] **Current tools inventory** — every tool they currently use, even tools they don't love
- [ ] **Current pain points** — what's most painful about running the business right now
- [ ] **Compliance/regulatory** — licenses, insurance, certifications, industry rules (e.g., HIPAA for medical, PCI for cards, food safety, etc.)
- [ ] **Team / staffing** — current team size, hiring plans, contractor vs. employee
- [ ] **Budget for tools** — monthly software budget; what they're willing to pay for
- [ ] **Tech comfort level** — affects how much hand-holding the handoff needs

## Phase 2 — Vault foundation

- [ ] **Install Obsidian** (if not already)
- [ ] **Vault location decision** — local-only / iCloud / Dropbox / Git-backed. Recommend Git-backed if you'll collaborate ongoing.
- [ ] **Initial folder structure** — adopt or adapt the SAD vault constitution
  - [ ] `_meta/` — templates, queries, infra
  - [ ] `_ideas/` — cross-entity ideas
  - [ ] `_sessions/` — session logs (raw + compiled)
  - [ ] `projects/` — flat folder for all entities
  - [ ] Personal/operator folders as needed
- [ ] **Core plugins**
  - [ ] Templater (template engine)
  - [ ] Dataview (queries)
  - [ ] Obsidian Git (if Git-backed sync)
  - [ ] Recommended community plugins per industry (Excalidraw for visual planning, etc.)
- [ ] **Theme** — pick one that works for them; default is fine
- [ ] **CLAUDE.md (vault root)** — vault constitution + operator preferences
- [ ] **Backup of initial state** — before any further changes (especially if they had a pre-existing vault you're restructuring)

## Phase 3 — AI tooling

- [ ] **Anthropic account** — sign up, choose tier (Free / Pro / Max / Team / Enterprise)
- [ ] **Claude Code install** — verify it runs on their machine
- [ ] **Cowork install** (if macOS) — verify it runs
- [ ] **MCP / connector setup** — at minimum, the workspace MCPs that read their selected folders
- [ ] **Verify Claude can read/write their vault** — first smoke test
- [ ] **Recommend plugin tier** for cost-aware operators — what gets used vs. what's premium

## Phase 4 — Plugin + skills layer

- [ ] **Identify business-type-relevant skill bundles** from the cowork plugin marketplace
- [ ] **Install relevant plugins** — engineering, product-management, etc., as fits
- [ ] **Author or customize business-type-specific plugin** via `cowork-plugin-management:create-cowork-plugin` or `:cowork-plugin-customizer` skills
- [ ] **Install operator-essential skills** — `time-awareness`, `session-capture`, methodology-aligned skills
- [ ] **Author custom skills if needed** — for unique workflows the customer has that no off-the-shelf skill handles
- [ ] **Configure CLAUDE.md** at vault root and per-project — the operator-level memory layer

## Phase 5 — External tool connections

- [ ] **Inventory external tools the business uses** (often discovered in Phase 1; revisit now)
- [ ] **For each tool, check MCP availability** via the MCP registry
- [ ] **For each available MCP, walk through OAuth / auth flow** with the customer (their credentials, their hands on keyboard for the auth step)
- [ ] **Test connection per tool** — quick smoke test that the connector actually works
- [ ] **Document which tools have no MCP** and fall back to browser / manual workflows
- [ ] **Configure scheduled tasks** that touch external tools (where applicable) — daily digest, weekly report, etc.

## Phase 6 — Methodology onboarding

- [ ] **Walk customer through SAD phases** at a high level — phases 0A → 1A in particular
- [ ] **Identify their first entity** — usually the business itself, but sometimes a specific surface or product
- [ ] **Run Phase 0A on the first entity** — IDEA_MAP from their stated ideas, surface tensions
- [ ] **Run Phase 0B** — research synthesis (industry / competitors / state of the art for their domain)
- [ ] **Run Phase 0C** — apply BASED discipline to produce VISION_SPEC
- [ ] **Run Phase 1A** — apply SMART discipline to produce VERSION_SPEC for their realistic-now slice
- [ ] **Defer Phase 1B+ to a later session** unless the engagement covers it
- [ ] **Identify which Phase 1B specs are relevant** — for a non-software business, this is where the spec-stack template needs adaptation (see `idea-187`)

## Phase 7 — Wiki schema design

- [ ] **Identify business-specific entity types** — for a pet-care business: Client, Pet, Visit, Package, Employee. For a restaurant: Recipe, Menu, Vendor, Shift, Customer.
- [ ] **Frontmatter conventions per entity type** — what fields, what types, what required vs. optional
- [ ] **Templater templates** per entity type — so creating a new Client is a single command
- [ ] **Dataview queries for dashboards** — "active clients," "upcoming visits," "low-stock supplies"
- [ ] **Note-type taxonomy** — what types of notes exist beyond entities (decisions, retros, ideas, etc.)
- [ ] **Tag conventions** if used

## Phase 8 — Collaboration setup (if ongoing)

- [ ] **Git repo creation** (private, on GitHub / GitLab / Codeberg)
- [ ] **Customer pushes their vault to the repo**
- [ ] **You get collaborator access** — explicit scope (read-only review, write-via-PR, or write-direct)
- [ ] **Both sides install Obsidian Git plugin** — auto-pull on interval, manual push on commit
- [ ] **Conflict-handling agreement** — when both edit same file, who wins, how to merge
- [ ] **Session cadence** — weekly, biweekly, ad-hoc
- [ ] **Async communication channel** — text / Slack / email — for between-session questions
- [ ] **Branch convention** if using PRs (`consultant/feature-x`, `customer/idea-y`)

## Phase 9 — Handoff / training

- [ ] **Customer can independently:**
  - [ ] Start a Claude Code or Cowork session
  - [ ] Capture an idea into `_ideas/`
  - [ ] Create a new entity profile
  - [ ] Invoke BASED + SMART skills
  - [ ] Open a planned session
  - [ ] Pull updates from the shared repo (if applicable)
- [ ] **Documentation of what was set up** — handoff doc that lives in their vault under `_meta/` or `engagement-log.md`
- [ ] **Maintenance/support plan** — what happens when the methodology updates, when tools change, when they're stuck
- [ ] **Customer signs off** — explicit "this is what we agreed to and what was delivered"

## Phase 10 — Post-engagement

- [ ] **Capture methodology amendments** — anything you learned doing this customer that should feed back into your methodology
- [ ] **Add the business-type template to your library** — refined skills + plugin + spec-stack template for the next customer in this industry
- [ ] **Schedule follow-up** — 30-day check-in, 90-day retainer review
- [ ] **Case study draft** (with permission) — quotable testimonial, before/after, time saved

---

## Cross-cutting safety / considerations

Apply throughout all phases:

- [ ] **Backup before changes** — every time you restructure something the customer relies on, snapshot first
- [ ] **Don't break what works** — if the customer has a tool that works for them, don't replace it unless replacement clearly wins
- [ ] **IP boundaries** — if the customer has co-authored work, employer-owned content, or sensitive customer data, those need protection
- [ ] **Sensitive data handling** — HIPAA, PCI, FERPA, customer PII — flag and protect; don't paste into Claude conversations
- [ ] **Privacy / data ownership clarity** — customer owns their vault; consultant has access for the duration of the engagement
- [ ] **Access duration** — when does your collaborator access on their repo end? Make this explicit.
- [ ] **Verify-don't-trust on first-party tools** — don't assume tool X works the way you remember; check the actual current state
- [ ] **Pace** — vault setup is fatiguing for the customer; take breaks, don't over-load a single session

---

## Industry-specific addenda

These are starter notes; expand as you build templates per business type.

### Pet-care / Pet-services

- Industry-specific CRMs exist (Time To Pet, Pet Sitter Plus, Precise Petcare). Evaluate whether to integrate or replace.
- Liability insurance is non-trivial; not your job to recommend but flag it during legal-spec articulation.
- Many states have business licensing rules specific to pet-services.
- Recurring revenue is common (boarding contracts, weekly visits) — model this in DATA / FINANCIAL_SPEC.

### Restaurant / Food-service

- Health code compliance, food safety certifications.
- Vendor / supplier relationships are core.
- POS integration matters (Toast, Square, Clover).
- Shift scheduling tools (When I Work, 7shifts).

### Solo consulting / Service business

- Client intake forms + contracts.
- Time tracking + invoicing.
- Knowledge-management is the actual product (consulting *is* the deliverable).

### E-commerce / D2C

- Shopify / Amazon / Etsy as primary platforms.
- Fulfillment integration (3PL, Shopify Fulfillment, ShipStation).
- Inventory management is critical.
- Customer support tooling (Gorgias, Help Scout, Zendesk).

### Software / SaaS

- Current SAD framing applies most directly.
- GitHub, CI/CD, deploy providers, APM.
- Customer onboarding flows are part of product.

### Real-estate / Brokerage

- MLS integration.
- Contract templates as a core asset.
- Commission tracking.
- License + continuing education tracking.

### Fitness / Wellness

- Class scheduling (Mindbody, ClassPass partner).
- Waivers + intake forms.
- Recurring billing (memberships).

---

## What this checklist is NOT

- Not a substitute for thinking. Use it as a prompt, not a script.
- Not exhaustive. Every business surfaces something new — capture and add it back here.
- Not pricing guidance. Pricing depends on scope, customer, and your time. See `idea-187` for the business-model thread.
- Not legal/financial advice for the customer. Direct them to their own attorney / accountant for those.
