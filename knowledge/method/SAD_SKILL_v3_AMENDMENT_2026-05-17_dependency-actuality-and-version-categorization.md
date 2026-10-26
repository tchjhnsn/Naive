---
type: methodology-amendment
ai-model: claude
spec-layer: methodology
version: 3.0.5
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
  - PART 2 — entity-profile schema (new fields)
  - PART 5 — Build phase (new "Activity-axis state" guidance)
  - NEW PART or appendix — Source-of-Truth Granularity table
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-06_spec-colocation]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-05-14_methodology-evolution]]"
related-ideas:
  - "[[idea-177-version-categorization-schema]]"
  - "[[idea-178-source-of-truth-granularity]]"
tags: [methodology, sad-v3, amendment-proposal, class-2, dependency-actuality, source-of-truth, version-categorization, schema]
---

# SAD v3.0.5 Amendment — Dependency-Actuality + Source-of-Truth Granularity + Version Categorization

**Status:** RATIFIED 2026-05-17 by the owner. Class 2 change (schema additions, no breaking changes). The three principles below are now canonical SAD methodology and authoritative over any prior conventions they replace.

**One-line summary:** Three related schema/methodology refinements that surfaced during SAD Command Center plugin development. The plugin is fundamentally a vault visualization layer, so any gap in the methodology's schema becomes a gap in the plugin. This amendment closes three such gaps.

---

## Provenance

Surfaced during a continuous SAD Command Center plugin dev session (V1.0 → V1.5, 2026-05-16/17). Three observations crystallized:

1. **The reference project's entity-profile incorrectly declared `platforms-used: [[ai-lab]]`** — but the reference project does not currently use ai-lab. This led to articulating the principle that entity-profiles declare CURRENT reality, while specs declare aspiration. The plugin can't show "actual vs planned" if the schema doesn't distinguish them.
2. **The plugin needs to bridge to the code folder** (read package.json, git status, deployment status) to validate vault declarations against ground truth. This raised "which source is authority for which question?" — the answer turned out to be granular: code folder for static facts, git for sync state, GitHub for events, deploy providers for deployment, production URLs for runtime health.
3. **Versions need semantic categorization beyond just numbers.** "V1.0" and "V1.5" are nouns. But the methodology needs to express "V1.0 is the baseline / V1.5 is the frontier" — and these labels FLOAT as versions evolve. Once codified, the SAD Command Center's Pipeline view can render entities in 2-D space (lifecycle stage × version category).

---

## §NEW.1 — Dependency-Actuality Principle

### Statement

Entity-profile frontmatter declares **current reality**. Specs declare **aspirational direction**. The two roles are distinct and shouldn't conflate.

### Schema impact

When a dependency / relationship is planned-but-not-current, declare it on a sibling field with the `-planned` suffix:

```yaml
# Current reality (what the entity actually uses today)
platforms-used: ["a project note"]   # ONLY if actually used now

# Aspirational (planned for later versions)
platforms-planned: ["a project note"]
platforms-planned-note: "Brief explanation of when/why this becomes actual"
```

Equivalent fields:

- `providers-used:` (actual) / `providers-planned:` (aspirational)
- `consumed-data-from-used:` (actual) / `consumed-data-from-planned:` (aspirational)
- `surfaces-of-used:` / `surfaces-of-planned:`
- etc.

The plugin renders both axes, visually distinguishing actual from planned.

### Worked example

The reference project today (post-correction):

```yaml
# The reference project does NOT currently use ai-lab.
# The ai-lab dependency is planned for later versions of the product.
platforms-planned: ["a project note"]
platforms-planned-note: "ai-lab will be wired into the reference project starting in V1.5+ for generative wiki features. Currently V1.0 ships without ai-lab integration."
```

If the methodology ratifies this, the plugin's V1.x will render the reference project with a "planned: ai-lab" badge alongside its current providers (Cloudflare, Neon, etc.).

---

## §NEW.2 — Source-of-Truth Granularity Principle

### Statement

**Authority depends on the question being asked.** Different questions have different authoritative sources; the plugin (and any other consumer of vault data) should know which source answers which question.

### The 5-tier authority map

| Tier | Source | Authoritative for |
|---|---|---|
| 1 | **Local code folder** | Static facts about the codebase as-it-sits-on-disk (size, file structure, declared dependencies via package.json / Cargo.toml / etc.) |
| 2 | **Git (local + remote)** | Synchronization state (committed?, up-to-date with origin?, branch state, who-changed-what history) |
| 3 | **GitHub APIs** | Events on github.com (PR state, issues, workflows you defined, code review, gh actions in_progress runs) |
| 4 | **Deploy provider APIs** (Cloudflare / Vercel / Render / etc.) | Events on the deploy platform — provider's own API is the canonical authority for deploy success/failure |
| 4b | **GitHub Actions as deploy-status fallback** | When provider API integration isn't yet wired up, GitHub Actions IS a usable signal for deploy status — accurate for Cloudflare (since Cloudflare reports back to GitHub on workflow completion). May be less reliable for other providers. Treat as **fallback** until provider-specific integration exists. |
| 5 | **Production surfaces** | Runtime ground truth (what version is actually serving requests right now, post-cache, post-propagation) — accessed via HTTP probe |

### Authority-by-question table

| Question | Authoritative source | Tier |
|---|---|---|
| What's the codebase size? | Local code folder | 1 |
| What dependencies does it declare? | Local `package.json` | 1 |
| Is local code committed? | `git status` | 2 |
| Is it up to date with origin? | `git fetch` + `git status` | 2 |
| Did the last CI workflow pass? | GitHub Actions API | 3 |
| Did the last deploy succeed? | Provider API (preferred); GitHub Actions (fallback when provider integration not yet wired) | 4 → 4b |
| What version is serving in production? | Production HTTP probe (preferred); deploy provider as fallback | 5 |

### Activity-axis source-of-truth (per-version)

For methodology-level "what version is X right now?" questions, the authority and cardinality differ:

| State | Authoritative source | Cardinality |
|---|---|---|
| **deployed** — live version | Production HTTP probe (preferred) → deploy provider API → GitHub Actions (fallback when no provider integration) | **Scalar** — only one version can be live at any moment (modulo blue-green, itself a snapshot) |
| **building** — version being compiled / shipped | GitHub Actions in-progress runs + local `git status` working tree | **Array** — multiple parallel builds possible |
| **articulating** — version being scoped / spec'd | Vault: entity-profile + sprint declaration + issue frontmatter (`phase: articulate` + `sprint-type: articulation`) | **Array** — multiple parallel articulations possible |

The pattern: as work moves left-to-right (articulating → building → deployed), authority moves from vault → GitHub → production, and cardinality narrows from array → array → scalar.

### Cost implications (per §45)

- Tier 1 + 2 (local) — free, instant; query freely
- Tier 3 + 4 (remote APIs) — paid token + network; debounce + cache + only-on-demand
- Tier 5 (HTTP probes) — paid network; cache aggressively, on-demand or scheduled only

### Cross-cutting application: The reference project wiki

This principle generalizes beyond the SAD Command Center. The reference project wiki encodes civic information; the same authority question applies per fact-type:

- Officeholder's current position → official congressional record (canonical)
- Officeholder's framing of an issue → personal site / press releases
- Third-party characterization → news coverage with attribution
- Bill status → congress.gov
- District boundaries → Census Bureau

The reference project's VERIFICATION_SPEC §"data vintage" partially captures this; full articulation deferred to a the reference project methodology refinement.

---

## §NEW.3 — Version Categorization Principle

### Statement

Every actively-maintained entity declares its versions across **five floating categories**: `baseline`, `mainline`, `frontier`, `future`, `legacy`. Categories are positional labels that migrate forward as the entity evolves; they are not properties of any single version number.

### The 5 categories

| Category | Meaning | Position stability |
|---|---|---|
| **baseline** | The MVP / starter version. Lowest functional version. Recommended for new adopters. | Rarely moves (usually fixed at V1.0 or a rewrite point) |
| **mainline** | Currently-recommended-for-production. Most users land here. Battle-tested. | Migrates forward as later versions stabilize |
| **frontier** | Leading edge. Most ambitious working version. May have rough edges. | Migrates forward continuously |
| **future** | Planned but not yet built | Migrates out as versions ship |
| **legacy** | Past versions, no longer maintained but documented | Versions migrate IN as time passes |

### Schema additions (entity-profile.md)

```yaml
# Position axis — what versions exist + their role for users
version-baseline: "V1.0"
version-mainline: "V1.5"
version-frontier: "V1.5"
version-future: ["V1.6", "V1.7"]
version-legacy: []

# Activity axis (§NEW.2) — what's happening right now
version-deployed: "V1.5"                    # scalar
versions-building: ["V1.6"]                 # array
versions-articulating: ["V1.7", "V2"]       # array
```

Position categorization and activity state are **orthogonal axes**. A single version can be at any combination:

- V1.0 → baseline (position) + nothing (no current activity)
- V1.5 → mainline + frontier (position) + deployed (activity)
- V1.6 → future (position) + building (activity)
- V1.7 → future (position) + articulating (activity)

### Worked example

```yaml
# The reference project at 2026-05-17
version-baseline: "V1.0"
version-mainline: "V1.0"
version-frontier: "V1.0"
version-future: ["V1.5"]
version-legacy: []

version-deployed: "V1.0"
versions-building: []
versions-articulating: ["V1.5"]
```

Reading this: "the reference project's V1.0 is the baseline AND the current production. V1.5 is planned but not yet built; articulation has started on it."

### Why not "tier" or "best"

- "Tier" implies fixed ordering. These categories float.
- "Best" implies a single winner. Frontier is the *most ambitious*; for some users, baseline is *best for their needs*.

### Connection to the plugin

Once ratified, the SAD Command Center plugin's Pipeline view becomes a 2-D space:
- Y-axis: lifecycle stage (concept → ... → archived)
- X-axis: version category (baseline → mainline → frontier → future)

A point in this 2-D space tells you "the reference project's frontier version is currently in Articulate phase." Arrows between points represent transitions (a version moving from frontier → mainline as it stabilizes; a version moving through methodology phases).

---

## Convergence path

These three sections should ratify together because they're entangled — §NEW.3 references §NEW.2's activity axis, and both depend on §NEW.1's actual-vs-planned distinction.

### Checklist before ratification

- [ ] the owner sign-off on the 5-category vocabulary (baseline / mainline / frontier / future / legacy)
- [ ] Sign-off on the 5-tier authority map
- [ ] Sign-off on the actual-vs-planned suffix convention (`-planned` for aspirational fields)
- [ ] Update at least one canonical entity-profile (e.g., the reference project) to fully express the new schema
- [ ] Update SCC plugin to parse the new fields (V1.6+; not required for ratification but blocks rendering)
- [ ] Add to `knowledge/method/SAD_SKILL_v3.md` once converged

### Out of scope for this amendment

- Plugin rendering of the new fields (separate Build work; V1.6+)
- The reference project wiki source-of-truth methodology (cross-cutting concern; separate refinement)
- Deploy provider integration libraries (separate per-provider work)

---

## Status

- **2026-05-17 (drafted):** All three principles articulated with schemas + worked examples.
- **2026-05-17 (ratified):** The owner sign-off received. Status flipped to RATIFIED; this amendment is now canonical SAD methodology.

### Downstream effects of ratification

- Task #234 (Capture methodology refinements) — closed
- Task #235 (Ratify SAD v3.0.5 amendment) — closed on completion of this status flip
- SCC plugin V1.6+ work (Pipeline view with 2-D rendering) — now schema-supported and unblocked
- The reference project entity-profile — updated as the canonical worked example of the new schema (next action)
- Future entity-profiles authored from this date forward MUST use the actual-vs-planned distinction (§NEW.1) where applicable, and SHOULD declare version categorization (§NEW.3) when versions exist
