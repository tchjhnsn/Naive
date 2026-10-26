---
type: methodology-amendment
ai-model: claude
spec-layer: methodology
version: 3.0.6
source: hybrid
created: 2026-05-17
ratified: 2026-05-17
ratified-by: The owner
last-reviewed: 2026-05-17
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
status: RATIFIED — canonical methodology as of 2026-05-17
change-class: 2
sections-affected:
  - PART 2 — entity-profile schema (one new optional field; one rule clarifying when existing fields apply)
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-17_dependency-actuality-and-version-categorization]]"
related-ideas:
  - "[[idea-177-version-categorization-schema]]"
tags: [methodology, sad-v3, amendment-proposal, class-2, shipped-definition, version-categorization, applicability-rule]
---

# SAD v3.0.6 Amendment — Shipped-Definition + Version-Categorization Applicability Rule

**Status:** PROPOSED. Class 2 change. Adds one field, one applicability rule, and two coarse-grained phase groupings that organize existing concepts (do NOT compete with the 7 lifecycle stages or 5 version categories).

**One-line summary:** An entity's life has two coarse phases — **pre-ship** and **post-ship** — separated by the moment it first meets its own declared `shipped-definition`. Version-categorization fields (baseline / mainline / frontier / future / legacy) only have meaning post-ship. Each entity declares what "shipped" means for itself.

---

## Provenance

Surfaced 2026-05-17 during V1.6 Pipeline view verification. The owner observed:

> "baseline, mainline, frontier, future, and legacy are actually all descriptions of phases after something has actually shipped. You only get to these phases if a project has completed a CI/CD loop at least one time. If a project has never actually shipped before, then there would never be a mainline version that has gone into production or been deployed, nor would there be a baseline version."

And:

> "What we mean by shipped or in production may muddle our vocabulary/terminology."

Two things implied:
1. A rule clarifying when version-categorization fields apply (only post-ship).
2. A way to define what "ship" means per entity, since different entities have different legitimate definitions.

Per the owner's caveat ("if we introduce too many different terms, that may muddle the definition") — clarified to mean don't bloat *competing* vocabulary, but coarse-grained organizing concepts (like pre-ship / post-ship) are valuable and DO get included. The amendment introduces:

- One new field (`shipped-definition`)
- One applicability rule (version-categorization fields are post-ship-only)
- Two coarse-grained phase groupings (pre-ship, post-ship) — these GROUP existing concepts rather than compete with them
- One planned skill ([[skills/shipped-definition/SKILL]]) for assisted definition authoring

Vocabulary is added only where it earns its keep.

---

## §NEW.4 — Pre-ship / Post-ship phases + Version-Categorization Applicability Rule

### The two coarse phases

Every entity's life divides into two coarse phases, organized around its declared shipped-definition (§NEW.5):

- **Pre-ship** — the entity has NOT yet met its own `shipped-definition`. Lifecycle stages typically present here: `concept`, `scoped`, `specced`, `prototyping`. Version-categorization fields don't apply (except `version-future` for planned versions).
- **Post-ship** — the entity HAS met its own `shipped-definition`. Lifecycle stages typically present here: `active`, `maintenance`. (`archived` is a special after-the-fact state and conceptually post-ship.) Version-categorization fields are fully meaningful and populate.

The boundary between pre-ship and post-ship is the moment the entity first satisfies its `shipped-definition` (recorded as `shipped-first-occurred` if known).

These two phases are NOT new lifecycle stages — they're coarse-grained groupings OVER the existing 7-stage lifecycle. They exist to make one rule cleanly statable (the applicability rule below) and to give the plugin a clean visual divide when rendering the Pipeline view.

### Applicability rule

The version-categorization fields from §NEW.3 (`version-baseline`, `version-mainline`, `version-frontier`, `version-legacy`) populate **only post-ship**.

`version-future` is the exception — planned versions can be declared pre-ship since "future" is unshipped by definition.

For entities that have not yet shipped, those five fields should be left empty or omitted. The entity uses its `entity-lifecycle-stage` field alone to express its position (concept / scoped / specced / prototyping). The `version-future` field is the one exception — planned versions that haven't shipped yet always live there regardless of ship status, since "future" by definition is unshipped.

### Why this rule

The five categories describe states a version can occupy *only if it exists in production* — has been baselined, has stabilized as mainline, has shipped as frontier, has aged out to legacy. Before first ship, an entity has none of these — only plans, and plans live in `version-future`.

The plugin's Pipeline view should respect this rule when rendering: pre-ship entities show only along the `entity-lifecycle-stage` axis (with planned versions optionally in the `future` column); post-ship entities populate the full lifecycle × version-category matrix. Pre-ship and post-ship rows can be visually distinguished (e.g., via a horizontal divider, background tone, or grouping section).

### What changes in practice

Entities that have NOT yet shipped (lifecycle = concept / scoped / specced / prototyping):

```yaml
entity-lifecycle-stage: prototyping
# version-baseline, version-mainline, version-frontier, version-legacy: leave EMPTY or omit
version-future: ["V1.0"]  # acceptable — planned versions
```

Entities that HAVE shipped (lifecycle = active / maintenance):

```yaml
entity-lifecycle-stage: active
version-baseline: "V1.0"
version-mainline: "V1.5"
version-frontier: "V1.6"
version-future: ["V1.7"]
version-legacy: []
```

---

## §NEW.5 — Per-Entity Shipped-Definition

### Statement

Each entity declares its own definition of "shipped" via a `shipped-definition` field. The methodology recognizes three legitimate definitions; entities choose the one appropriate to their nature.

### Schema

```yaml
shipped-definition: public-deployment | first-useful-run | first-ci-cd-loop
shipped-first-occurred: <ISO-date>   # optional; when the entity first met its declared definition
```

### The three values

| Value | Meaning | Best suited for |
|---|---|---|
| `public-deployment` | Code is deployed to a publicly reachable URL where any user can access it | Public products (a consumer app, a public website) |
| `first-useful-run` | Any audience (including only the operator) uses the entity for its intended purpose | Solo / hobby projects, internal tools, personal-use plugins |
| `first-ci-cd-loop` | At least one full build-test-deploy cycle has completed successfully | Open-source libraries, infrastructure, things where successful deployment IS the use |

### Worked examples

- **A consumer product** — `shipped-definition: public-deployment`. Its ship event is when it starts serving real users.
- **A command-center plugin** — `shipped-definition: first-useful-run`. The plugin "ships" when the owner (its only audience) is actively using it in his workflow. Currently NOT shipped by that definition; lifecycle should remain `prototyping`.
- **sad-methodology** — `shipped-definition: first-useful-run`. Shipped when the owner (and any other adopters) actively use it.
- **An SDK** — `shipped-definition: first-ci-cd-loop` (when a downstream tool actually imports + builds with it).
- **An open-source tool** — `shipped-definition: public-deployment` (the repo + npm package availability).
- A hobby script the owner runs once a week — `shipped-definition: first-useful-run`.

### Why three values, not one or many

- ONE wouldn't cover the legitimate diversity (a hobby project's "ship" is genuinely different from a public product's "ship").
- MANY would muddle the vocabulary (the owner's concern).
- Three covers the practical space: there's "audience reaches it" (public-deployment), "any user uses it" (first-useful-run), and "it deploys clean" (first-ci-cd-loop). Most entities fit one of these naturally.

### Lifecycle-stage interaction

The `shipped-definition` plus `shipped-first-occurred` (or its absence) determines whether the entity has "shipped." This is what triggers eligibility for version-categorization fields per §NEW.4.

The plugin should:
- Read `shipped-definition`
- Determine whether the entity has shipped (either via the declared `shipped-first-occurred` date OR by inferring from `entity-lifecycle-stage` being `active` or later)
- Render version-categorization fields only for shipped entities
- Use `version-future` for planned versions regardless of ship status

---

## §NEW.6 — Planned skill: shipped-definition determination

### Why a skill

Choosing the right `shipped-definition` per entity is a small but real authoring decision. For some entities the choice is obvious (a public consumer app → `public-deployment`). For others it requires thought (a hobby script with a fluid notion of "useful run" — does it ship the first time the operator runs it? The first time they integrate it into a daily habit? The first time it produces a stored artifact?).

The three values (`public-deployment`, `first-useful-run`, `first-ci-cd-loop`) cover the main space, but the owner noted:

> "If we have too thin of a vocabulary, then we may not be able to detect exceptions or outliers."

A capability skill addresses this gap. It can:

1. Ask the entity-author a few diagnostic questions (audience, deployment model, intended use pattern, observable artifact of "ship")
2. Suggest the most appropriate of the 3 default values
3. **Propose custom vocabulary if the entity is a genuine outlier** that none of the 3 fit cleanly
4. Help articulate the specific *criteria* for the chosen definition (e.g., for `first-useful-run`, "useful run = the script has produced a saved annotation file" vs "useful run = the owner opens the report at least weekly")
5. Stamp `shipped-definition` + criteria into the entity-profile

### Skill location

Planned: `sad/skills/shipped-definition/SKILL.md`

Authoring the skill itself is V1.x scope (out of this amendment). When uncertain about a definition, the operator can invoke the skill manually.

### Interaction with this amendment

If the skill proposes a 4th or 5th `shipped-definition` value for a genuine outlier (e.g., `first-publication-event`, `first-user-feedback-received`), that becomes a new ratified value via another amendment. The 3-value default isn't a ceiling; it's the starting vocabulary.

This is how vocabulary stays disciplined — it grows only when an actual outlier surfaces, not preemptively.

---

## Implication for SCC plugin (immediate)

The seeded a command-center project entity-profile (set during V1.6) declared `version-baseline: V1.0`, `version-mainline: V1.5`, `version-frontier: V1.6` — but by `first-useful-run` definition, SCC has NOT yet shipped (the owner is not actively using it in his workflow). Those fields are premature.

Correction needed (on ratification): update a command-center project entity-profile to:

```yaml
entity-lifecycle-stage: prototyping
shipped-definition: first-useful-run
# version-baseline, version-mainline, version-frontier, version-legacy: omit (not yet shipped)
version-future: ["V1.0", "V1.5", "V1.6", "V1.7"]
```

After this correction, the Pipeline view will render SCC as a pre-ship entity (just showing in prototyping row on the lifecycle axis) — matching the actual state. The reference project stays as-is (public-deployment definition is met).

---

## Convergence path

- [ ] the owner sign-off on the applicability rule
- [ ] the owner sign-off on the three `shipped-definition` values (public-deployment / first-useful-run / first-ci-cd-loop)
- [ ] Update a command-center project entity-profile per the correction above
- [ ] Update SCC Pipeline view to honor the applicability rule
- [ ] Add `shipped-definition` field to entity-profile-schema reference doc
- [ ] Update SAD_SKILL_v3.md amendments index when ratified

---

## Status

- **2026-05-17:** Drafted. Pending the owner convergence + ratification.
