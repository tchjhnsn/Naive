---
type: amendment
spec-layer: methodology
version: 3.0.17
source: hybrid
ai-model: claude-opus-5.5
created: 2026-10-25T22:40:00Z
authorship: hybrid
authors: [Torian, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[SAD_SKILL_v3]]"
authority: constitutional
decision-status: in-force
status: ACCEPTED
change-class: 0
governed-by:
  - "[[SAD_SKILL_v3]]"
  - "[[CLAUDE]]"
decisions:
  - G-020
  - G-021
  - G-022
  - G-023
  - G-024
  - G-025
ratified: 2026-10-25
supersedes-proposal: "[[SAD_SKILL_v3_AMENDMENT_2026-05-06_spec-colocation]]"
contradicts:
  - doc: "[[SAD_SKILL_v3_AMENDMENT_2026-10-25_design-schema-across-file-systems]]"
    claim: "Domain, product, experience and interface design stay in the vault; only systems design lives in the repo"
    decision-needed: "Founder ratifies docs as code, which moves all four layers into the repo"
sections-affected:
  - "Vault constitution: Vault Structure, Entity Pattern, Code Pointer Pattern, Source of Truth, Folder Shape by Lifecycle Stage"
  - "SAD v3 PART 0.5 scope levels (Project scope has one physical half, not two)"
  - "DOMAIN_AND_SYSTEMS_DESIGN_METHOD §4a placement table"
tags: [methodology, sad-v3, amendment-proposal, docs-as-code, workspace, companies, projects, repository-structure]
description: "v3.0.17: design and implementation documentation sits next to the code; guiding principles, philosophy and business documents stay in the vault and point to the repo docs that implement them. The workspace is the Everything Ecosystem: one master folder with companies/, projects/, ideas/ and Torian's PKM. Code-pointer notes retire; a workspace manifest replaces them."
---

# SAD v3.0.17: docs as code and the workspace layout

**Status:** accepted by the founder 2026-10-25 (G-020, G-021, G-022). §3 corrected the same day: guiding documents stay in the vault. The text of SAD v3 and the vault constitution is not yet updated; that is migration step 5.

## Why

Docs live in the vault and code lives in `~/code`, joined by pointer notes. That has three costs.

- **A repo is missing its own docs.** Its documentation only reaches GitHub, or a cloud agent, when the vault is committed and pushed. The 2026-05-06 spec-colocation proposal saw the same problem from Codespaces and mobile Claude Code, and the "Vault fully committed" working rule exists to work around it.
- **Developer tools ship without their docs.** Some projects are developer tools, and for them the documentation is part of the product.
- **The vault-or-repo rule keeps being re-decided.** It has been revisited three times: the spec-colocation proposal (2026-05-06), the Source of Truth section (2026-07-31), and v3.0.15 (2026-10-25). Each one drew the line in a different place.

## The rules

### 1. The workspace is the Everything Ecosystem

One master folder on each machine holds everything. It is a plain organizational folder, not a git repo. The vault and the code sit side by side inside it, exactly as `~/workspace/vault` and `~/code` sit side by side in the home folder today (G-025):

```
~/workspace/                     plain folder, not git-tracked
├── vault/                       the Obsidian vault and its git repo (today's ~/workspace/vault)
│   ├── companies/<company>/     company vault (its own private repo): entity profile, governance/, delivery/, company functions
│   ├── projects/<project>/      same shape, scaled down, for projects that are not companies
│   ├── ideas/                   ideas not yet an entity (today's root _ideas/)
│   ├── Torian/                  Torian's PKM: its own Obsidian vault and private repo
│   ├── _meta/                   templates, queries, migrations, registers, workspace.json
│   └── _sessions/  _issues/     cross-entity
├── code/                        every repo, never inside the vault (today's ~/code)
│   ├── companies/<company>/<repo>/   product repos: code, docs/ per part, CI, .mad/
│   └── projects/<project>/<repo>/
└── .worktrees/<repo>/<branch>/  all git worktrees, outside both
```

The master folder is `~/workspace` (G-024). Code never sits inside the vault, and Obsidian opens only the vault (and the PKM). `code/` mirrors the vault's `companies/` and `projects/` grouping, so a company's vault folder and its repos have the same path below each root. The company vault's folders are defined in [[COMPANY_VAULT_DEFINITION_2026-10-25]].

The Everything Ecosystem is not a company. Its methodology, wiki, skills and tools are projects under `projects/`, and the companies depend on them.

### 2. Company, project, idea

- **Company:** an entity with `entity-class: business`, at any lifecycle stage. Its stage stays in its profile. A company's harnesses, platforms and deferred offerings nest inside it.
- **Project:** a legitimate entity that is not a company. This covers methodology and tooling, shared platforms such as SPCT, open-source references, and hobbies.
- **Idea:** has no entity profile yet. It becomes a company or a project when it gets one.

### 3. Two kinds of documentation

Documentation splits by what it does, not by layer of the stack.

| Kind | Lives in | Examples |
|---|---|---|
| **Guiding** (why, and what we hold to) | Vault | Entity profile, philosophy, guiding principles, strategy, business documents, brand principles |
| **Design and implementation** (what it is and how it is built) | Repo, `<repo>/docs/` | Domain (DD), product (PA), experience (XD), interface (UI) and systems (SD) design, specs, ADRs, contracts, runbooks, research and planning tied to the build |

**By MAD layer (2026-10-26):** the split follows MAD's four layers. Governance and delivery documents live in the vault; software engineering and automation documents live in the repo; company functions MAD doesn't cover yet (corporate, organization, brand, business, operations) live in the vault. See [[COMPANY_VAULT_DEFINITION_2026-10-25]].

**The test:** is it about the company (how it decides, runs, staffs, sells or presents itself) or about a product (what it is, the domain it models, how it is built and run)? Company goes to the vault; product goes to the repo. See [[COMPANY_VAULT_DEFINITION_2026-10-25]]. (An earlier test, "would it survive a rewrite of the code", misfiled domain design and was replaced the same day.)

**Guiding documents point down to their implementation.** A principle in the vault links to the repo documents that show how it is implemented (a `implemented-in:` list of repo paths). The repo documents link back up with `governed-by:`. This is the only pointer pattern that remains.

**An entity with no code yet** keeps its design documents in the vault until it gets a repo; they move at first implementation.

**Company repos are private.** If a piece must become public (an SDK, a community extension), it is split into a satellite repo with its own docs.

### 4. No code pointers

`code-pointer` and `spec-pointer` notes retire, along with the vault-canonical versus repo-canonical split for specs: design and implementation documents have one copy, in the repo.

`_meta/workspace.json` lists every repo with its path, remote, entity id, class and stage. Cross-entity inventories (the old Dataview code-pointer queries) read the manifest, and a fresh machine or cloud agent clones from it.

### 5. Git

- **The workspace folder is not a repo** (G-025). It only organizes. The list of repos a fresh machine needs lives in `vault/_meta/workspace.json`, so nothing is lost by leaving the workspace untracked.
- **The vault is one repo** holding shared material and every company vault. It gitignores only `Torian/`, which is its own vault. *Corrected 2026-10-26 (G-026):* company vaults are not separate repos; G-023's per-company repos are withdrawn.
- **Product repos live in `code/`**, never inside the vault.
- **Sensitive records** (signed contracts, minutes with personal data, HR files, financial statements) stay out of git, in an encrypted store the company vault indexes (G-023).
- **Worktrees** live only in `.worktrees/`, never as siblings in a code folder or inside a repo.
- **"Torian controls Git"** is unchanged. Docs changes now arrive as commits and PRs on the repo they describe.

### 6. Reading and linking

- **Obsidian:** any repo's `docs/` can be opened as its own Obsidian vault. Torian's PKM is its own vault. No vault spans code.
- **Links inside one repo** stay wikilinks.
- **Links across repos** cite stable IDs (a decision number, a principle or policy id, the entity id) rather than paths, because each repo is cloned on its own. Within the workspace, the mirrored layout means a vault folder's repos are always at `../../code/<same path>/` from the vault root.

## What this changes

| Today | After |
|---|---|
| `Documents/projects/<entity>/` guiding docs | stay in the vault, under the company or project |
| `Documents/projects/<entity>/` design and implementation docs | `<repo>/docs/` |
| `~/workspace/vault/` | `~/workspace/vault/` |
| `~/code/<repo>/` | `~/workspace/code/companies/<company>/<repo>/` or `code/projects/<project>/<repo>/` |
| `everything-ecosystem/` | split into projects (methodology / SAD, My AI Wiki, MAD, skills, …) |
| `Documents/Torian/` | `Torian/` PKM |
| `_ideas/` | `ideas/` |
| code-pointer, spec-pointer | `_meta/workspace.json`; guiding docs carry `implemented-in:` |
| v3.0.15 placement table (four layers in the vault) | all five layers in `<repo>/docs/` |

## Decisions

1. **Docs as code is ratified** (G-020). Domain, product, experience and interface design join systems design in the repo, superseding the vault rows of v3.0.15's placement table.
2. **Guiding principles, philosophy and business documents stay in the vault** and point to the repo docs that implement them (G-020, corrected 2026-10-25).
3. **Concept-stage businesses** count as companies.
4. **Wonka Scribe and the massage desk system** stay projects for now.
5. **Master folder:** `~/workspace` (G-024, 2026-10-26).
6. **Company vault:** organized by MAD's layers and its own private repo (G-023, 2026-10-26). Brand identity and voice are company documents (vault); design tokens and component libraries implement them (repo).
7. **The workspace is a plain folder** with `vault/` and `code/` side by side. It is not git-tracked, and code never sits inside the vault (G-025, 2026-10-26).

## Migration

Staged. Each stage is reversible, and nothing moves before ratification.

1. Create the master folder and move the existing folders in, unchanged: `~/workspace/vault/*` to `vault/`, `~/code` to `code/`. See `~/ee-cleanup-work/master-workspace-move-plan-v2.md`.
2. Split `projects/` into `companies/` and `projects/`. Fold `~/madsad-scoring` into MAD and `~/research-evidence` into Polity.
3. Sort each entity's docs into guiding and design-or-implementation, and move the second kind into its repo, Polity first, alongside ADR-0006 Phase 6.
4. Retire the pointers and write `workspace.json`.
5. Update the vault constitution and SAD v3 text, and supersede the 2026-05-06 proposal.
