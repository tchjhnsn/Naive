---
type: research
source: hybrid
ai-model: claude-opus-5
created: 2026-08-10
authority: exploratory
decision-status: in-force
governed-by:
  - "[[CLAUDE]]"
  - "[[entity-profile-schema]]"
  - "a project note"
status: ADOPTED
progress: "ADOPTED 2026-08-10 — prior art for product-kind taxonomy; PK-1/2/4 settled; PK-3 parked"
description: "What already exists in the vault and in established frameworks for classifying kinds of products (platform vs app vs infrastructure), before inventing a project-specific enum."
tags: [research, methodology, product-taxonomy, entity-class, platform, app, prior-art]
---

# Product kinds — prior art (2026-08-10)

Question: *Have we declared what types of products exist (platforms, applications, etc.)?*
Answer: **No single declared product-kind taxonomy.** Several overlapping axes already exist in the vault, and several external frameworks classify the same territory differently. This note inventories both so a declaration can adopt rather than reinvent.

## 1. Already in this vault (do not ignore)

### 1.1 `entity-class` (structural / commercial role)

Declared exhaustive (six values) in `CLAUDE.md` and [[entity-profile-schema]]:

| Value | Axis (as documented) |
|---|---|
| `business` · `hobby` | Commercial posture |
| `platform` · `surface` · `hybrid` · `standalone` | Structural role in an ecosystem |

**Gap:** `app` / `application` / `product` are **not** values. Shipping civic product a project note is still `entity-class: surface` while prose calls it an app.

### 1.2 Structural vocabulary (prose, 2026-08-10)

`CLAUDE.md` §Structural vocabulary: entity · app · product · module · platform · surface · subsystem.

**Gap:** These are definitions, not a frontmatter enum. `app` ≈ nested product entity; `surface` = the entity-class; same object can be both in language and neither in schema.

### 1.3 Product Orientation (schema — closest existing “kind”)

[[entity-profile-schema]] §Product Orientation Definitions:

| Orientation | Meaning |
|---|---|
| **offering** | Delivered to external users/customers |
| **operational-capability** | Built to enable offerings; audience is internal |
| **enabling-infrastructure** | Shared foundation multiple entities draw from; no brand, no direct business model |

This is a **who-is-the-audience / how-value-is-captured** axis, not a UI-vs-SDK taxonomy. It already maps cleanly onto the reference project examples: The reference project ≈ offering; <reference-project> / ai-lab ≈ enabling-infrastructure; Gigafactory-style internals ≈ operational-capability.

### 1.4 Product composition model (schema — layers inside one product)

When a product is complex, the schema asks for:

| Layer | Role | Anthropic-style example |
|---|---|---|
| **Core** | Shared capability | the model |
| **Variants** | Tradeoff expressions | Opus / Sonnet / Haiku |
| **Surfaces** | Distinct user experiences | Chat / Code / API |
| **Platform capabilities** | Non-user-facing extension points | MCP, tool use |

**Important:** here “Surfaces” means *experiences inside one product*, not `entity-class: surface`. Crossing into independence (own brand, users, business) is when a component becomes its own entity profile. This is prior art for **module vs entity**, not for product-kind enum.

### 1.5 Form / medium (methodology family)

[[methodology-family]]: software · physical · service · content · other.

Orthogonal to platform-vs-app. The reference project is mostly software.

### 1.6 Body Classification field

ecosystem · subsidiary · product-within-company · internal-tool · shared-infrastructure · unplaced-idea.

Corporate/placement language, overlapping `enabling-infrastructure` and `entity-class` without being the same enum.

### 1.7 Ecosystem synthesis (operational inventory, not a type system)

A project note inventories roles: substrate, AI Lab, shipping civic, marketing site, deferred suite. Useful as instances; not a declared type list.

---

## 2. External frameworks (sampled 2026-08-10)

### 2.1 TOGAF Technical Reference Model

Separates:

| Layer | Meaning |
|---|---|
| **Business Applications** | Implement enterprise/industry processes |
| **Infrastructure Applications** | General-purpose apps on infrastructure services |
| **Application Platform** | Services applications run on (data, security, UI services, etc.) |

Closest classic EA split to “app vs platform.” Note: TOGAF’s “platform” is a *service layer*, not necessarily a shippable product entity.

### 2.2 Application Portfolio Management (APM)

Typically classifies applications by **orthogonal dimensions** (Sparx / industry practice): business domain, criticality, hosting (IaaS/PaaS/SaaS) — not a single “kind” enum. Lesson: one field rarely carries all meaning.

### 2.3 PIM / retail product taxonomy

Distinguishes **taxonomy** (tree), **classification** (assignment to a node), **categorization** (customer navigation). Different job from platform-vs-app; useful meta-lesson: don’t overload one hierarchy for both internal “is-ness” and public navigation (sitemap).

### 2.4 Wardley evolution stages

Genesis → Custom-Built → Product → Commodity/Utility.

This is **maturity of a component**, not kind of product. A platform and an app both evolve along this axis. Do not use as product-kind.

---

## 3. Synthesis — axes we already have (don’t flatten)

| Axis | Existing home | Answers |
|---|---|---|
| Commercial posture | `entity-class`: business / hobby | Monetized or not? |
| Ecosystem structural role | `entity-class`: platform / surface / hybrid / standalone | Consumed-by vs user-facing wrapper vs both vs neither? |
| Audience / value capture | Product Orientation | Offering vs internal ops vs shared infrastructure? |
| Decomposition inside a product | Core / Variants / Surfaces / Platform capabilities | What’s inside this product? |
| Form | methodology-family / Identity Type | Software vs physical vs service? |
| Maturity (optional, external) | Wardley — not in vault | How evolved is this component? |

**What is missing:** a declared name for “user-facing installable product” that is not the overloaded word `surface`, and an explicit relationship between that name and Product Orientation + nesting under `product/`.

---

## 4. Implications for a future declaration (not decided here)

Lean from prior art, not invention:

1. **Prefer Product Orientation** (`offering` · `operational-capability` · `enabling-infrastructure`) as the product-kind axis that already exists and is defined with examples — before inventing `product-kind: app | platform`.
2. If `app` becomes a class, it likely **replaces or renames `surface`** for shipping user-facing products, rather than sitting beside it as a seventh class.
3. Keep **composition layers** (core/variants/surfaces/platform capabilities) for *inside* a product; do not promote those layer names to entity-root folders (the mistake of 2026-08-10).
4. Keep Wardley/APM/PIM as **other axes** if needed later; do not merge maturity or hosting into product kind.
5. The reference project instances as a sanity check against Product Orientation:
   - The reference project → offering
   - <reference-project> → enabling-infrastructure
   - ai-lab → enabling-infrastructure (or operational-capability if treated as internal lab)
   - Console → offering (developer) or surface-within-product — open
   - Citizens (future) → offering

## 5. Decisions (settled 2026-08-10)

| ID | Decision |
|---|---|
| **PK-1** | **Adopt Product Orientation** (`offering` · `operational-capability` · `enabling-infrastructure`) as the product-kind axis. **Do not** invent `product-kind:`. |
| **PK-2** | **Rename** `entity-class: surface` → **`app`**. `type: surface-profile` → **`app-profile`**. |
| **PK-3** | **Parked** — Console (own offering vs composition surface) deferred. |
| **PK-4** | **Keep Classification** orthogonal; do not fold into Product Orientation. |

Adopted into vault `CLAUDE.md`, [[entity-profile-schema]], [[documentation-expectations]], [[entity-profiling]], and entity profiles (Session B census).

## Decision log

| Date | Note |
|---|---|
| 2026-08-10 | Research only. No taxonomy declared. Triggered by taxonomy reconciliation session after nest correction |
| 2026-08-10 | **Adopted.** PK-1/2/4 settled; PK-3 parked. Frontmatter repair Session 0 also completed (37 invalid YAML fixed; hygiene rule in CLAUDE.md) |
