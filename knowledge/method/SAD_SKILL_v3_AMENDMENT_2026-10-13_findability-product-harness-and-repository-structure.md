---
type: amendment
spec-layer: methodology
version: 3.0.16
source: hybrid
ai-model: claude-opus-5.5
created: 2026-10-14T02:20:00Z
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
authority: constitutional
decision-status: in-force
status: RATIFIED
progress: "Ratified by the owner 2026-10-13. Applied to SAD v3 PART 4 (step 4d) and PART 14 (22-25), and to vault CLAUDE.md."
change-class: 2
governed-by:
  - "[[SAD_SKILL_v3]]"
sections-affected:
  - "PART 3 rituals and PART 4 Session Opening: rediscovery check; findability check at phase boundaries"
  - "Vault CLAUDE.md: entity-class vocabulary (app -> harness; extension role); frontmatter fields domain, serves, owner; document placement"
  - "Methodology anti-patterns list (PART 14): decisions-in-prose, boundary moved but folders didn't"
  - "New per-project artifacts: ADR register, repository-structure ADR, ownership.json"
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-08-07_governance-precedence-and-universal-session-opening]]"
  - "[[SAD_SKILL_v3_AMENDMENT_2026-10-10_capability-maps-and-design-coverage]]"
related:
  - "a project note"
  - "[[VAULT_RESEARCH_SYNTHESIS_2026-10-13]]"
  - "a project note"
  - "ADR-0006-repository-structure (tchjhnsn/polity: docs/adr/ADR-0006-repository-structure.md)"
tags: [methodology, sad, findability, product-vs-harness, adr, repository-structure, monorepo, ownership, codeowners, vault-structure]
description: "v3.0.16 proposal: generalize the reference project organization campaign so its failures do not recur in other projects. Data and encoded domain expertise are the product; interfaces are harnesses. Folders mean standing, frontmatter means subject. Nothing binding lives only in prose. Every project keeps an ADR register and a repository-structure ADR; ownership is a JSON map of paths to positions that generates CODEOWNERS. One data store unless an ADR says otherwise. When a product boundary moves, the documents move with it. A findability check runs at phase boundaries. A registry set (glossary, sources, dependencies, skills, contracts, open questions and assumptions, alongside the ledger and ADR register) backs a rediscovery check before anything is created."
---

# Findability, product versus harness, and repository structure

> **Founder (2026-10-13):** "Let's make sure we're updating the SAD methodology in accordance with what we're doing now. Otherwise, these issues will continue to repropagate. The same principles we're building here should be fairly consistent throughout our other projects."

## Why

The reference project organization campaign ([[VAULT_RESEARCH_SYNTHESIS_2026-10-13]]) found that the methodology's file-level rules work (757 notes, no YAML errors, few missing `governed-by`) while the structure failed:

1. **Decisions were rediscovered.** "The data is the product; everything else is a harness" was locked on 2026-07-28 in a planning note with no D-number, and restated as new on 2026-10-13. "Citizens get every tool governments get" was already a ratified decision. Keyword search finds only what you already suspect exists (v3.0.12 said so); a decision that never entered the ledger is invisible to the hierarchy too.
2. **The product boundary moved and the folders didn't.** When the app stopped being the whole company, 62 of 76 data-platform documents stayed in the app's folder.
3. **Subject had no home.** Folders record standing (spec, research, planning), which is right, but nothing recorded domain, so a domain's work was scattered and 25% of notes had no inbound link.
4. **Systems-design decisions had no single register.** Two ADR series with clashing numbers, plus loose decision documents, plus ledger rows with no ADR. The monorepo decision existed only as one sentence in a synthesis note.
5. **No ownership.** Nothing said which team or seat owns a document or a code path.
6. **Second data stores appeared silently** (a prototype's local Postgres, a site's D1 waitlist) despite a one-database decision.

None of these is project-specific. Every multi-product entity in the vault can fail the same way.

## §NEW.21 The product and its harnesses

For an entity that owns no model, **the product is its data and its domain expertise** (the skills, prompts and domain models that encode it). Every interface over that product is a **harness**. A module running inside a harness and not shipped alone is an **extension**.

- Vault vocabulary: `entity-class: app` is renamed **`harness`** (same structural role). **extension** is a role inside a harness, like `module`, not an entity class. `platform` keeps its meaning and, where an entity has one, names the product.
- An AI team is a team inside the product (it owns the encoded expertise), not a separate product, unless the entity trains and ships its own model.
- A harness that collects user content (posts, conversations) still owns no data; its content is stored in the product and stays distinguishable by provenance from authoritative records.

## §NEW.22 Folder means standing; frontmatter means subject

Folders keep the CLAUDE.md placement rule (spec / subsystems / planning / research). Three frontmatter fields, required on governance documents in any multi-product entity:

```yaml
domain: <one value from the entity's domain list>
serves: [<product or harness ids>]
owner: <position id>
```

Each entity keeps its domain list beside its capability map (DD-12). Per-domain and per-owner views are Dataview queries, never manual indexes.

## §NEW.23 Nothing binding lives only in prose

A document that "locks", "decides" or declares something "in force" must either (a) be or cite a ledger decision (founder decisions) or an ADR (systems design), or (b) be marked `authority: exploratory`. A lock without a D-number or ADR number is a defect, checkable mechanically by searching for lock language in documents whose `governed-by` chain does not reach a decision.

## §NEW.24 ADR register and repository-structure ADR

Every entity with code keeps:

1. **An ADR register**: one numbered series (`ADR-NNNN-<slug>.md`), one index listing every ADR with status and its ledger D-number. Ledger rows that make systems-design choices link their ADR. Canonical in the repo's `docs/adr/` once a repo exists (implementation-bound), with a vault pointer.
2. **A repository-structure ADR** answering: one repo or several; what belongs in each; folder layout by role (product, AI, harnesses, extensions); which satellites exist and why.
   - Default for a multi-product entity: **one monorepo for all first-party code that touches the product's data**, with satellite repos only for a stated reason (independent entity, throwaway spike, community-facing template).
3. **An ownership map** (`ownership.json` at the repo root): paths mapped to **positions**, not people; occupancy recorded separately. A script generates the standard `CODEOWNERS` file. Positions come from the entity's `business/org/positions/` (position-schema).
4. **One data store by default.** Any second database needs its own ADR naming why.

## §NEW.25 When a boundary moves, the documents move

A decision that changes a product boundary (merging, splitting, renaming, demoting an app to a harness) includes moving the affected documents in the same change, or a migration plan with dates, the way v3.0.12's "elevation implies relocation" ties authority to folder. A boundary decision with no document plan is incomplete.

## §NEW.26 Rediscovery and findability checks

- **Session opening, rediscovery check (PART 4, new step 4d):** before creating anything a registry covers (§NEW.27), a decision, a term, a source, a dependency, a skill, a contract, a question, search that registry and say what was found. If it exists, cite it instead of restating it.
- **Phase boundaries, findability check:** run a structural inventory (no model calls): notes without frontmatter, orphans (no inbound link), authority-gate violations, governance notes missing `governed-by`, self-declared superseded notes not archived, lock language without a decision number. Deep pass (TypeSafe, paid): classify notes by domain, product, layer and kind; compare decisions pairwise within a domain for contradictions. The reference project scripts (a project file) are the reference implementation; on ratification they become a `findability` skill beside `design-coverage`.
- **One open-questions register per entity**, generated from `decision-status: awaiting-decision` and an `open-questions:` frontmatter list.
- **Wholly versus partly superseded.** The deep pass must tell them apart: a partly superseded note stays in place with `corrected-by` pointers and struck claims; only a wholly superseded one is archived (the reference project run: 11 of 12 flags were partial).
- **Stale means archived the same day:** a document that says it is superseded moves to `_archive/` with its tombstone in the same edit.

## §NEW.27 The registry set

**When a registry earns its place.** A kind of thing needs a registry when all three hold: (1) it is created again and again; (2) a duplicate or a contradiction costs something (re-deciding, re-researching, two meanings, a surprise bill); (3) search cannot find it reliably, because it is named inconsistently or buried in prose. A registry is what makes the rediscovery check possible: you can only check before creating if there is one place to look.

**One shape for every registry.** Each entry has a stable id, a status, an owner (position), the date, and links to its source and to what depends on it. Registries are data in a standard format (JSON with a JSON Schema, or CSV with a Frictionless schema), with a generated markdown view; no manual indexes. One command searches all of an entity's registries at once; that is step 4d. Creating a covered thing without an entry is a defect, as a decision in prose is (§NEW.23).

| Registry | Holds | Check before | Exists today |
|---|---|---|---|
| **Decision ledger** | Founder decisions (D-NNN) | deciding | Yes (the reference project) |
| **ADR register** | Systems-design decisions | choosing structure, stores, runtimes, formats | Proposed (§NEW.24) |
| **Glossary** | Every term and product name, one meaning each, with retired names | naming anything | Partial: the reference system glossary only; vault vocabulary table in CLAUDE.md |
| **Source register** | External sources: custodian, terms or license, format, coverage, where originals are kept | researching or ingesting | Yes, global (`<vault>/_meta/registers/source-register.json`, seeded 2026-10-14, 10 sources); the reference project's per-domain catalogs (justice G1, national coverage, government formats) not yet merged into it |
| **Dependency register** | Third-party services, libraries and vendors: purpose, terms, cost, limits, where its key lives (never the key), what uses it | adopting a tool or service | Yes (the reference project, 2026-10-13: 24 entries, 5 marked duplicate: two auth libraries, three map stacks) |
| **Skill register** | Skills, system prompts and agents, the encoded domain expertise that is part of the product (§NEW.21): owner, location, what it covers | writing a skill or prompt | No: skills sit in the vault (39) and in `~/.claude/skills` (25) |
| **Contract register** | APIs, MCP tools, schemas, file formats the product exposes | building an endpoint, tool or format | Partial: contract-first skill; OpenAPI in repo where it exists |
| **Open questions and assumptions** | Undecided questions waiting on someone; beliefs acted on but not yet tested, each with the test that would settle it | asking or assuming | No (the reference project: 235 notes with questions in prose) |
| **Ownership map** | Paths and documents to positions | assigning work | Proposed (§NEW.24) |
| **Risk register** | Risks: likelihood and impact (5x5), owner position, response (avoid, reduce, transfer, accept), mitigation, early signal, review date, sources | starting work that could fail in a known way; at phase boundaries | Yes (the reference project, 2026-10-13: A project file, the reference implementation of the registry shape) |
| Ideas, issues, positions, design-document registry, methodology assignment register, canonical asset registry, fragmentation register | (as today) | (as today) | Yes |

**Considered and not added.** A *research register* (questions researched and answered): the `domain:` field plus the findability deep pass covers it. *Spikes*: recorded as satellite repos in the repository-structure ADR.

**Duplicates count as a finding.** A registry kept in two forms (the reference project's fragmentation register exists as both markdown and JSON) must name one canonical form; the other is generated or removed.

## Anti-patterns (add to PART 14)

22. **Decision in prose.** A "lock" in a planning note with no ledger or ADR number. It will be rediscovered and re-decided.
23. **Boundary moved, folders didn't.** The product map changed and the documents stayed where the old map put them.
24. **Silent second store.** A prototype or site keeps its own database without an ADR.
25. **Unregistered creation.** A new term, source, dependency or skill introduced without a registry entry; the next session invents it again under another name.

## On ratification

- Add §NEW.21-27 to SAD v3 (v3.0.16) and PART 4 step 4d.
- Build the registry search command (one query across an entity's registries) into the `findability` skill.
- Seed the reference project's glossary, source, dependency and skill registers first; they have the most scattered material.
- Amend vault CLAUDE.md: `entity-class` (app -> harness), extension role, required `domain` / `serves` / `owner` on governance documents in multi-product entities, the ADR register rule, the boundary-move rule.
- Create the `findability` skill from the reference project scripts.
- Apply across entities in order: The reference project (in progress), then another project (multi-venture history), another project, the methodology repo itself.
- Normalize the `entity-class: app` value in existing profiles to `harness` by script.
