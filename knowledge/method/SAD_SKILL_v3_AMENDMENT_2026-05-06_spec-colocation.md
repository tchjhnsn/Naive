---
type: methodology-amendment-proposal
ai-model: claude
spec-layer: methodology
version: 3.0.2-proposed
source: hybrid
created: 2026-05-06
last-reviewed: 2026-05-06
authorship: hybrid
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
status: PROPOSED — awaiting convergence + ratification
change-class: 3
sections-affected:
  - PART 5 — episodic phases (new "Spec Colocation" sub-section)
  - PART 2 — two-layer data model (compiled-layer table addendum)
  - PART 0.5 — scope levels (Project scope guidance)
related-amendments:
  - "[[sad/SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol]]"
tags: [methodology, sad-v3, amendment-proposal, class-3, spec-colocation, vault-vs-repo, mobile-dev]
---

# SAD v3.0.2 Amendment Proposal — Spec Colocation (Vault vs. Code Repo)

**Status:** PROPOSED. Class 3 change. Pending convergence + the owner ratification before merging into `SAD_SKILL_v3.md`.

**One-line summary:** SAD v3 places all spec artifacts under the vault's project hierarchy (`Documents/projects/<entity>/product/spec/`). For software projects with a dedicated code repo, this creates a friction point: cloud dev environments (Codespaces, Gitpod, etc.) and mobile-Claude-Code can read the code but cannot read the vault. This amendment establishes when project specs should colocate with the code repo (canonical) versus stay in the vault (canonical), and defines the spec-pointer pattern that preserves vault discoverability when content moves.

---

## 1. Provenance

This amendment is motivated by a concrete need that surfaced 2026-05-06 during the reference project v1 development:

- **The trigger.** The owner set up GitHub Codespaces + the Claude Code mobile app to enable cloud / on-the-go development. The Codespace can clone `<repos>/<repo>/` but cannot reach `<vault>/`. Every Claude Code handoff prompt authored during recent the reference project sessions referenced spec files in the vault — none of those file paths exist inside a Codespace, and mobile Claude Code can't read them.
- **The structural mismatch.** SAD v3's two-layer data model (PART 2) places "compiled" spec artifacts at `<entity>/product/spec/` — implicitly the vault. That works when the spec is ahead of the code (Phase 0A → 1B). It works less well once code exists, because spec changes are now triggered *by* code work, the spec evolves in tight coupling with implementation, and the people / tools doing implementation may not have vault access.
- **The deeper question.** Are project specs vault-scoped or project-scoped? SAD v3 implicitly says vault-scoped. But specs are descriptions of code behavior. They evolve with the code. A new contributor (or a remote dev session) needs the spec next to the code more than the maintainer's-personal-vault next to other entities.

Cross-reference: see also the related Phase Closure Protocol amendment ([[SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol]]), which surfaced *its own* trigger from the same project. Both amendments improve SAD's fit to the implementation-and-beyond phases (Phase 2+).

---

## 2. The principle

> **Spec Colocation (v3.0.2 invariant):** For software projects with a dedicated code repository, the project's *version-and-below* spec artifacts (Version Spec, Product Spec, Data Model Spec, Implementation Spec, Behavioral Spec, Verification Spec, Phase Closure Reviews, Phase Prep Docs) MAY be colocated with the code repo (canonical: `<repo>/docs/specs/`) when *all* of the following hold:
>
> 1. The project has a dedicated code repository — not shared with other entities.
> 2. The spec stack tracks the codebase tightly enough that spec edits typically follow code-side discoveries (architectural pivots, schema changes, dependency drift).
> 3. The maintainer benefits from spec access in environments other than their primary vault host (Codespaces, mobile, collaborator's machine, CI).
>
> When colocated, the vault retains a **spec-pointer note** at the original `<entity>/product/spec/<NAME>.md` path. The pointer preserves frontmatter (`type: spec-pointer`, plus the original spec-layer / scope-entity / phase tags) for Dataview discoverability, and links to the canonical location.
>
> **What does NOT colocate:** Vision Spec stays in the vault. Vision describes the entity's vision-lattice across all versions; it is not version-bound and is not coupled to a single codebase. Vision lives at `<entity>/product/spec/VISION_SPEC.md` (vault, canonical).
>
> **Other artifacts that stay in the vault:** idea-dumps (`_ideas/`), research synthesis (`RESEARCH_SYNTHESIS.md`), idea map (`IDEA_MAP.md`), any spec for an entity that doesn't have a dedicated code repo, the entity profile itself, and brand / business pillars (which often span versions and other surfaces beyond the code repo).

The principle is **opt-in, not mandatory.** A maintainer choosing to keep all specs in the vault remains compliant with SAD v3. The colocation pattern is available when the project's circumstances make it useful.

---

## 3. The spec-pointer pattern

When a spec moves from vault to repo, the vault-side file is replaced with a pointer of this form:

```markdown
---
type: spec-pointer
spec-layer: <product | data-model | impl | behavioral | verification | version | phase-Nb-final-review | phase-N-prep>
version: <major-version>
source: <hybrid | human | machine>
created: <original-creation-date>
last-relocated: <YYYY-MM-DD>
authorship: <as before>
ip-sensitivity: <as before>
scope: project
scope-entity: "[[<entity>]]"
entity: "[[<entity>]]"
phase: <as before>
canonical-repo: <local-path-to-repo>
canonical-rel-path: docs/specs/<NAME>.md
canonical-github: <github-url>
status: relocated — canonical content lives at the path above
tags: [..., pointer, relocated-<YYYY-MM-DD>]
---

# <Spec Name> — relocated <YYYY-MM-DD>

The canonical content of this spec moved to the <project> code repository
per the SAD methodology amendment authored 2026-05-06 (spec-colocation pattern).

**Canonical location:** `<canonical-repo>/<canonical-rel-path>`
**GitHub mirror:** <canonical-github>

This pointer stays in the vault to preserve Dataview cross-references and
the entity-lifecycle relationships built around `[[<entity>]]`. Do not edit
content here; edit the canonical file in the repo.
```

This shape preserves:
- **Dataview queryability.** Notes still surface under queries on `type: spec-*` (Dataview matches `spec-pointer` if the query uses `type STARTSWITH "spec"` or similar). Add `LIKE "*-pointer"` filters to distinguish.
- **Wikilink resolution.** `[[product/spec/PRODUCT_SPEC]]` from another vault note still resolves to a real file, just one that redirects.
- **Frontmatter relationships.** `scope-entity`, `phase`, `tags` are all preserved so the spec's lifecycle position is still visible vault-side.

The pointer is a thin redirect, not a working copy. There is no sync — the canonical lives in the repo, and the pointer is a stable entry point that announces where to find the actual content.

---

## 4. Patches to SAD_SKILL_v3.md

### Patch 4.1 — PART 2, Two-Layer Data Model: compiled-layer file-type table addition

**Before** (existing file-type table excerpt):

```
| `<entity>/product/IDEA_MAP.md` | Compiled | AI from `_ideas/` | Phase 0A output |
| `<entity>/product/RESEARCH_SYNTHESIS.md` | Compiled | AI from `_sources/` | Phase 0B output |
| `<entity>/product/spec/*.md` | Compiled | AI from upstream specs | Phase 0C–1B outputs |
```

**After:**

```
| `<entity>/product/IDEA_MAP.md` | Compiled | AI from `_ideas/` | Phase 0A output |
| `<entity>/product/RESEARCH_SYNTHESIS.md` | Compiled | AI from `_sources/` | Phase 0B output |
| `<entity>/product/spec/VISION_SPEC.md` | Compiled | AI from `_ideas/` + `_sources/` | Phase 0C output. Vault-canonical. Cross-version. |
| `<entity>/product/spec/<other>.md` | Compiled (vault-canonical default) OR pointer to `<repo>/docs/specs/<NAME>.md` | AI from upstream specs | Phase 0C–1B outputs. May colocate with code per v3.0.2 spec-colocation amendment. |
| `<repo>/docs/specs/<NAME>.md` | Compiled (repo-canonical when colocated) | AI from upstream specs | Phase 0C–1B outputs when the project opts into spec colocation. |
```

### Patch 4.2 — PART 5, new Spec Colocation sub-section

**Insert after the existing Phase 1B description, before Phase 2:**

```
#### Spec Colocation (v3.0.2, 2026-05-06)

For software projects with a dedicated code repository, project-scoped
specs MAY colocate with the code repo. When colocated:

- The canonical content lives at `<repo>/docs/specs/<NAME>.md`.
- The vault retains a spec-pointer note at the original
  `<entity>/product/spec/<NAME>.md` path; the pointer preserves Dataview
  discoverability + lifecycle frontmatter and links to the canonical
  location.
- Specs that DO colocate (when the colocation pattern is opted into):
  Version Spec, Product Spec, Data Model Spec, Implementation Spec,
  Behavioral Spec, Verification Spec, Phase Closure Reviews, Phase
  Prep Docs.
- Specs that do NOT colocate: Vision Spec (cross-version, entity-scoped),
  IDEA_MAP, RESEARCH_SYNTHESIS, idea-dumps, brand / business pillars,
  entity profile.

Pre-conditions for choosing colocation:
1. Project has a dedicated code repo (not shared with other entities).
2. Spec stack tracks the codebase tightly (spec edits typically follow
   code-side discoveries).
3. Maintainer needs spec access in environments other than their primary
   vault host — e.g., cloud dev (Codespaces / Gitpod), mobile, CI,
   collaborator machines.

Pointer note shape: see [[everything-ecosystem/methodology/
SAD_SKILL_v3_AMENDMENT_2026-05-06_spec-colocation]] §3 for the full
template.
```

### Patch 4.3 — PART 0.5 Scope Levels, Project scope clarification

**Before** (current Project section, last paragraph):

```
Each Project's code half has its own `CLAUDE.md` that inherits from this file.
```

**After:**

```
Each Project's code half has its own `CLAUDE.md` that inherits from the
Global file.

Per v3.0.2 (spec-colocation amendment 2026-05-06), a Project may further
choose to colocate its version-and-below specs with the code repo at
`<repo>/docs/specs/`. When colocated, the vault's
`<entity>/product/spec/<NAME>.md` becomes a spec-pointer note pointing at
the canonical repo location. Vision Spec stays vault-canonical regardless.
```

---

## 5. Cost / risk analysis

| Concern | Assessment |
|---|---|
| Confusion about "where does this spec live?" | Mitigated by the spec-pointer pattern: vault always has a discoverable file at the expected path; that file announces the canonical location. The redirect is one click / one frontmatter field away. |
| Spec edits in the wrong location | Real risk if a contributor edits the vault pointer thinking it's canonical. Mitigated by the explicit "Do not edit content here" warning in every pointer + the fact that pointers contain almost no content (~10 lines). |
| Drift between vault and repo | None when properly implemented — there's only one canonical location per spec. The pointer holds no spec content, only metadata + the redirect. |
| Search / Dataview discoverability | Preserved. Dataview queries on `type: spec-pointer` surface the pointers; queries that need to traverse to canonical content can follow the wikilink to the repo path or check `canonical-github`. |
| Adoption friction for projects already on full-vault | Zero. Colocation is opt-in. Projects can stay vault-canonical indefinitely. |
| Friction with other vault tooling (Obsidian plugins, etc.) | Low. The pointer files are valid Markdown with valid frontmatter. Plugins that rely on file existence + frontmatter still work. Plugins that traverse content (e.g., finding citations, computing word counts) will see only the pointer's pointer-text — but for citation traversal specifically, that's outside the pointer's content scope anyway. |
| Consistency with v3 invariants | Additive. No retraction. Vision Spec staying vault-canonical preserves the cross-version pattern. The two-layer data model still holds — compiled artifacts can live in vault OR in repo, and the principle of compiled-from-raw is unchanged. |

---

## 6. Convergence protocol for this amendment

Per SAD's Phase 4 (Spec Evolution) protocol:

1. **Author the proposal.** ✓ done 2026-05-06.
2. **Run a Spec Convergence pass** on the proposal. ~10 adversarial scenarios. Section 7 below previews the obvious ones.
3. **The owner ratification.** Maintainer approves or requests changes.
4. **Patch SAD_SKILL_v3.md** with the three discrete patches in §4. Bump methodology version frontmatter to `3.0.2`. Add a DELTA LOG entry. The companion 2026-05-05 Phase Closure Protocol amendment may merge alongside (3.0.1 + 3.0.2 → 3.1).
5. **Apply retroactively** to any project that has its specs in the vault and would benefit from the colocation. The reference project v1 already has its specs colocated (executed alongside this proposal); other entities (another project, Reflect, etc.) decide for themselves.

---

## 7. Adversarial scenarios — preliminary pass

**Q1: What if a project has no code repo (e.g., a methodology entity, or a research-only entity)?** Then colocation is trivially N/A. The project's specs stay vault-canonical. The amendment doesn't apply.

**Q2: What if a project's repo has multiple sub-projects sharing one repo?** The colocation can still work; `<repo>/docs/specs/<sub-project>/<NAME>.md`. Vault pointers reference the sub-project subdirectory. SAD v3 already handles multi-sub-project repos via PART 0.5.

**Q3: What if the maintainer wants to do spec work mostly from the vault (Obsidian's UX) even though specs are colocated?** The pointer mechanism doesn't fight this — the maintainer can still navigate from `<entity>/product/spec/PRODUCT_SPEC.md` (the pointer) → click the canonical-github link → edit on GitHub web UI → commits to the repo. Or open the canonical file in any editor. Or symlink the vault path to the repo path on machines where both are local (a stronger move; not required by this amendment).

**Q4: What about archived projects?** When a project is archived (per the existing archive pattern), its specs typically don't change anymore. Colocated specs in the archived repo work fine. The vault pointer + repo file together form the archived record.

**Q5: What if a project is open-source and contributors don't have vault access?** This is exactly the case the amendment optimizes for. Contributors see the canonical specs in the repo (where they belong); the maintainer's vault stays a personal layer.

**Q6: What if SAD's compile pipeline (Phase 0A → 1B) runs against vault files and now needs to write to the repo?** Pre-Phase-2 (when the repo doesn't exist yet), specs are vault-canonical. The colocation move happens at or after Phase 2.1 (project bootstrap creates the repo). The compile pipeline doesn't change for Phase 0–1; only Phase 2+ work touches colocated specs.

**Q7: What if someone moves a project's specs to the repo, then later wants to revert?** Move them back, replace pointer with content, delete repo copies. The cost is moderate (a one-time file shuffle); the reversion is documented in the SESSION_LOG.

**Q8: Is there any risk that GitHub-side spec edits diverge from local-canonical state?** The local file IS the canonical, fetched via git pull. As long as the maintainer pulls before editing (standard git discipline), no divergence. A spec edit committed via GitHub web UI gets pulled to local on next `git pull`.

Convergence verdict (preliminary): no scenarios surface a structural problem. Q3 and Q6 suggested clarifications already incorporated in the proposal text.

---

## 8. Cross-references

- **Companion amendment**: [[SAD_SKILL_v3_AMENDMENT_2026-05-05_phase-closure-protocol]] (Class 3, real-run discipline + Phase Closure Protocol).
- **A v1 execution example**: vault-side specs at `<vault>/projects/<entity>/product/spec/*.md` were relocated to `<repos>/<repo>/docs/specs/*.md` on 2026-05-06 (alongside this amendment authoring). Vault originals replaced with spec-pointer notes following the §3 template.
- **SAD_SKILL_v3.md PART 2** — two-layer data model file-type table (target of patch 4.1).
- **SAD_SKILL_v3.md PART 0.5** — Project scope guidance (target of patch 4.3).
- **SAD_SKILL_v3.md PART 5** — episodic phase pipeline (target of patch 4.2).
- **Global CLAUDE.md** — references the entity-profile-schema and code-pointer pattern; this amendment introduces the parallel spec-pointer pattern.
