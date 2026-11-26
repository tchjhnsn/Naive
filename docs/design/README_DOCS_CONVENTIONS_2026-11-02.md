<!-- Placement: tchjhnsn/Naive docs/design/README_DOCS_CONVENTIONS_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# READMEs as the docs: a book-shaped convention for Naive

Prepared Nov 2, 2026 (CST). Read only. Repo snapshot: `tchjhnsn/everything-ecosystem` at main, commit `cb502f9` (Nov 1, 2026, 11:24 PM CST), 1,462 files and 467 folders. Repo evidence is cited as `path:line` at that commit (base URL: https://github.com/tchjhnsn/everything-ecosystem/blob/cb502f9b8a68b8d90c72440e5e52a732c1bcef6e/). Outside sources are numbered [n] and listed at the end.

## 1. Summary

- The repo already has the right parts for checked docs: a README template (`docs/readme-template.md`), a claims linter (`packages/naive/src/checks/check-docs-claims.ts`), a CI gate (`.github/workflows/docs-required.yml`) and three generated docs checked against a fresh render (`test.mjs:162-174` as of 2026-11-02; the suite is now `node test.ts`). The problem is coverage and ownership, not tooling.
- Coverage: 74 of the 110 folders that hold code have no README, although the template says every such folder gets one (`docs/readme-template.md:3`). Of 15 READMEs read in full, none has the template's `Up:` line and none has all five template sections.
- The gate has holes: 232 code files sit outside its scope, 86 in scope have no README to owe, and 396 files all owe the same `schema/README.md` (as of 2026-11-02; since moved/removed).
- The root README is not yet a title page or a table of contents. It has zero Markdown links and does not mention 11 of the 21 top-level folders.
- Facts are written by hand in several places and have drifted. The layer list is in `README.md`, `AGENTS.md` and each `layer.json`. `AGENTS.md` still names an `execution/` (as of 2026-11-02; since moved/removed) folder that does not exist and says kits are not built, though two are.
- Recommendation: make the code tree the book. Use one ordering file (`docs/book.json` (as of 2026-11-02; since moved/removed)). Each folder's facts are owned by its manifest (`layer.json`, `package.json`, `kit.json`, `framework.json`). README sections are generated from those owners between begin and end markers. A new `schema/check-docs.mjs` (as of 2026-11-02; since moved/removed) runs in report mode first, then fails on: missing READMEs, missing sections, stale generated blocks, incomplete contents maps, broken links and paths, and READMEs that cannot be reached from the root.

## 2. Research: READMEs as the docs

### 2.1 Docs as code (Write the Docs)
Write the Docs defines docs as code as writing docs with the same tools as code: issue trackers, version control, plain-text markup, code review and automated tests. It notes you "can block merging of new features if they don't include documentation" [1]. Naive already commits to this (EE-005, `README.md:49`), and `docs-required.yml` is that merge block.

### 2.2 Google's documentation guide
- Placement: README files describe "a directory's contents" and are shown when you browse that directory. "All top-level directories for a code package should have an up-to-date README.md file." [2]
- Contents: what the package is and what it is for, points of contact, status (such as deprecated), how to use it, and links to further docs [2].
- Best practices [3]:
  - "Minimum viable documentation", and "Change your documentation in the same CL as the code change."
  - "Delete dead documentation."
  - "Duplication is evil."
  - Design docs, once built, "should serve as archives of these decisions, not as half-correct docs".
  - A spectrum of homes for each fact: names, inline comments (the why), API comments (the contract, with tests), README (orientation: "Which files should the developer look at first?"), docs/ (getting started, tests, debugging, release), and design docs.

### 2.3 How GitHub renders READMEs
- If there is more than one README, GitHub shows the one from `.github`, then the root, then `docs` [4].
- It builds an outline from headings and gives every heading an anchor [4].
- It rewrites relative links to work on whatever branch you are viewing, and recommends relative links over absolute ones [4].
- Content past 500 KiB is truncated [4].

Two points follow for Naive. A README in any folder is the page a reader lands on when they browse that folder. And relative links are the safe way to join the chapters.

### 2.4 Diataxis: four modes, and where a README fits
Diataxis names four needs and four forms: tutorials, how-to guides, technical reference and explanation [5]. Diataxis does not define a README. My reading, as an inference, is that a folder README is a landing page. It has a short explanation (what this is and why it is shaped this way) and a reference map (what is here and how it connects). It links out to how-to guides and tutorials rather than holding them. That matches the existing `site/content/docs/` split: the site holds tutorials and how-tos, and READMEs hold reference and explanation.

### 2.5 Standard Readme
The spec requires:
- sections in a fixed order with fixed titles;
- a table of contents covering every level-two heading;
- no broken links;
- code examples linted like the rest of the code [6].

It was written for open-source library roots, so its section list (Install, Usage, API, Maintainers, Contributing, License) fits the root README, not every folder. Its useful lesson is that order and titles are fixed, so a machine can check them.

### 2.6 arc42 and C4
- **arc42** is a 12-section architecture template. Its sections include building block view, runtime view, deployment view, crosscutting concepts, quality requirements, risks and technical debt, and a glossary [7]. Its building block view is a nested decomposition, the same shape as folders inside layers.
- **C4** gives four levels of abstraction (software systems, containers, components, code) and one diagram per level [8].

For Naive, the C4 levels map roughly to the repo's own levels, and the folder tree can carry them: the system is the repo, the parts are the layers, components are folders, and code is the files.

### 2.7 Literate programming
Knuth: "Instead of imagining that our main task is to instruct a computer what to do, let us concentrate rather on explaining to human beings what we want a computer to do." He also wants concepts "introduced in an order that is best for human understanding" [9]. That is Torian's "book" instinct. Knuth's WEB tool wove one source into both code and the book. Naive can get much of that benefit without a new tool: keep code where it is, and generate the reading order and each chapter's reference sections from the files.

### 2.8 What breaks at scale, and the known fixes
- **Drift.** In a study of 878 documentation issues, Aghajani et al. found 190 up-to-dateness issues: docs that were correct until a change made them stale. That is about 39% of the content issues (completeness was 268 issues, or 55%). Correctness issues hit code examples most [23]. Naive's audit shows the same pattern (section 5).
- **Duplication.** "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system" (the DRY principle) [22], and Google says the same [3].
- **Fixes in use elsewhere:**
  - Generated sections: Cog runs small bits of code inside a file to generate its content [25]. Naive already does this for `packages/naive/src/terms/ontology.md`, `docs/reference/ROUTES.md` and a section of `LAYERS_AND_KITS` (`test.mjs:172-174` as of 2026-11-02; the suite is now `node test.ts`).
  - Link checks: lychee checks links in Markdown and HTML [24]. Naive's `packages/naive/src/checks/check-docs-claims.ts` already resolves relative links and backticked paths.
  - Freshness markers: the Rust compiler guide asks writers to date time-sensitive text with `<!-- date-check -->`. A monthly CI job opens an issue listing dates older than six months [10][11].
  - Reachability: Sphinx warns about any document that no toctree includes, "because that means that this file will not be reachable through standard navigation", and requires an explicit `orphan` mark to silence the warning [20].
  - Ownership metadata per folder: Kubernetes OWNERS files sit in a folder and apply to its children [16]. GitHub CODEOWNERS does the same per path pattern [26].
- **Correction to the brief:** `packages/naive/src/checks/check-nouns.ts` has `--md` and `--package`, but no `--graph` flag (`packages/naive/src/checks/check-nouns.ts:5-10`). The staleness test for its Markdown was `test.mjs:172` as of 2026-11-02. The suite is now `node test.ts`.

## 3. The book: exemplars and the structure they suggest

| Exemplar | What it does well | What Naive should take |
|---|---|---|
| mdBook | One `SUMMARY.md` defines every chapter, its order, its nesting and its source file; "Without this file, there is no book." It has parts (h1), numbered chapters, prefix and suffix chapters, and draft chapters with no file yet [19] | One ordering file. Draft chapters are a clean way to show "not built" |
| Rust compiler dev guide | An mdBook whose `SUMMARY.md` gives the reading order [12]. Each procedure is documented "with the parts of the guide that own them" [10]. It has date-check freshness markers and a monthly triage issue [10][11] | One owner per topic; freshness by date marker |
| Go standard library | "Every package should have a package comment"; it sits in one file; the doc tools extract it [13] | The contract of a function lives at the function, not in a README |
| SQLite | The architecture page walks the modules in pipeline order (tokenizer, parser, code generator, bytecode engine, B-tree and below) and names the source files of each [14] | The reading order follows the flow of data through the system |
| Redis | The 7.0 README had a "Source code layout" section with a tour of the main folders and files [15]. The current README no longer has it [15] | A hand-written file tour is valuable but can quietly disappear; generate the map instead |
| Kubernetes | OWNERS files per folder, inherited by children, drive review [16] | A per-folder manifest is the natural owner of that folder's facts |
| Linux kernel `Documentation/` (as of 2026-11-02; since moved/removed) | New docs are "referred to from the Sphinx main TOC tree in Documentation/index.rst"; subsystems have their own index with its own toctree [17]; API docs are extracted from source comments (kernel-doc) [18] | A tree of indexes from one root, and generated reference from code |

**Proposed book shape** (inference from the above, fitted to Naive's design):

- **Title page and contents:** the root `README.md`. It holds one paragraph of what Naive is, then a generated "Contents" block listing the parts in order, each linking to its README.
- **Volume 1, Naive (framework):**
  - Part 0 is System (`schema/`).
  - Then the loop: Part I Purpose, Part II Knowledge, Part III Operations, Part IV Evidence.
  - Then the cross-cutting parts: Part V Governance, Part VI Interface.
  - This matches the loop in `README.md:15` and the six-plus-system layers in the `layer.json` files.
- **Volume 2, Mentura (platform):** `platform/` (as of 2026-11-02; since moved/removed) and `console/` (as of 2026-11-02; since moved/removed), kept apart so the framework/platform boundary (EE-041, EE-043) is visible in the table of contents.
- **Chapters:** folders with their own README. **Sections:** subfolders and files listed in the chapter's contents map.
- **Back matter:**
  - `packages/` (catalog);
  - `packages/naive/src/terms/ontology.md` (glossary, already the ontology);
  - `docs/decisions/decisions.json` rendered as a decisions index;
  - `docs/design/` (archive);
  - `verification/` (as of 2026-11-02; since moved/removed) and `lean/` (as of 2026-11-02; since moved/removed) (proofs and checks);
  - `site/` (the published edition);
  - `instance/` (as of 2026-11-02; since moved/removed), `agents/`, `beta/` and `scripts/`.
- **Reading order:** generated into `docs/SUMMARY.md` (as of 2026-11-02; since moved/removed) (mdBook format, so the repo could be built as a book later), plus generated `Up / Previous / Next` lines in each README.

## 4. Placement rules

### 4.1 One owner per fact

| Fact | Owner (hand-edited) | Views (generated, never hand-edited) |
|---|---|---|
| A layer's purpose, skills, records, reads, writes, checks, gaps | `<layer>/layer.json` | Layer README blocks, root contents, AGENTS.md links |
| A package's purpose and contents | `packages/naive/library/packages/<name>/package.json`, `packages/naive/library/packages/catalog.json` | `packages/README.md` catalog, package README header |
| A kit or framework | `kit.json`, `framework.json` | Its README header |
| Noun meanings | `packages/naive/src/terms/ontology.json` | `packages/naive/src/terms/ontology.md` (already checked; as of 2026-11-02 that check was `test.mjs:172`, and the suite is now `node test.ts`) |
| Decisions | `docs/decisions/decisions.json` | "Decisions" block in each README that a decision cites |
| Routes | `packages/naive/src/router/router.ts` | `docs/reference/ROUTES.md` (already checked; as of 2026-11-02 that check was `test.mjs:174`, and the suite is now `node test.ts`) |
| Reading order | `docs/book.json` (as of 2026-11-02; since moved/removed) (new) | Root contents, `docs/SUMMARY.md` (as of 2026-11-02; since moved/removed), Up/Previous/Next lines |
| What a function or file does, its contract | A comment at the declaration or top of file (Go style [13]) | None |
| Why a folder is shaped as it is | Its README, "What this is" (hand) | None |
| How to do a task across folders | `site/content/docs/` how-to or tutorial (Diataxis [5]) | Linked from READMEs |
| A design before it is built | `docs/design/` with a status line | Archive once built [3] |
| Rules for agents | `AGENTS.md` (rules only) | Facts in AGENTS.md become links or generated blocks |

### 4.2 When a folder gets its own README
A folder must have a README when any of these holds:

1. It is a top-level folder, as Google requires [2].
2. It holds a manifest (`layer.json`, `package.json`, `kit.json`, `framework.json`). That makes it a chapter, with an owner to generate from.
3. It has 5 or more direct code files (`.mjs .js .ts .tsx .py .lean .sh`).
4. It is an entry point: a CLI, an MCP server, an API, or an npm `bin` or `exports` target.

Every other folder must be named in its nearest ancestor README's contents map.

Exempt:
- dot folders;
- `node_modules`;
- `site/content/` (the site has its own navigation);
- fixture ventures under `schema/examples/` (as of 2026-11-02; since moved/removed), which follow the venture scaffold, not the code template.

Applied to the snapshot, these rules require 61 READMEs. 55 of them are missing: 22 packages, 6 layer folders, `interface/cli` (as of 2026-11-02; since moved/removed), `interface/create-venture` (as of 2026-11-02; since moved/removed), `platform/integrations` (as of 2026-11-02; since moved/removed), `platform/research` (as of 2026-11-02; since moved/removed), and others. The threshold of 5 is a proposal, not a standard. Section 8 asks Torian to confirm it.

### 4.3 README vs docs/ vs comments vs decision records
- **README:** orientation and reference for one folder. What it is, what is in it, how to run it, how it connects, the rules it keeps, and what is not built. Keep it to about a page (`docs/readme-template.md:5`).
- **Code comment:** the contract and the why of one function or file [3][13].
- **`site/content/docs/`:** tutorials and how-to guides that cross folders [5].
- **`docs/`:** cross-cutting reference (ontology, routes, decisions index) and the design archive.
- **Decision record:** context, decision, status and consequences. Never edited after the fact; a later decision supersedes it, as in Nygard's ADRs, which are marked "superseded" with a reference to the replacement [21]. Naive's records are entries in `decisions.json`. READMEs cite their ids and never restate the reasoning.

## 5. Audit of the repo

### 5.1 Tree, top two levels
- **Top level (21 folders):** `.claude-plugin`, `.github`, `agents`, `beta`, `console`, `docs`, `evidence`, `frameworks`, `governance`, `instance`, `interface`, `knowledge`, `lean`, `operations`, `packages`, `platform`, `purpose`, `schema`, `scripts`, `site`, `verification`.
- **Root files:** `AGENTS.md`, `README.md`, `LICENSE`, `package.json`, `test.mjs` (as of 2026-11-02; since moved/removed), `tsconfig.json`, `tsconfig.strict.json`, `eslint.config.mjs`.
- **Second level:** 125 folders, 98 of them with no README.
- **Top-level folders with a README:** 5 (`console`, `frameworks`, `lean`, `platform`, `schema`).
- **Top-level folders with none:** the other 16, including all six layer folders (`purpose`, `knowledge`, `operations`, `evidence`, `governance`, `interface`).

### 5.2 Every README and layer.json
- **82 `README.md` files.** About 34 are under `schema/examples/` (as of 2026-11-02; since moved/removed) and about 27 under `verification/` (as of 2026-11-02; since moved/removed). The other 22 are:
  - `README.md`, `console/` (as of 2026-11-02; since moved/removed), `docs/design/statecharts/` (as of 2026-11-02; since moved/removed), `frameworks/`;
  - `governance/venture-template/` (as of 2026-11-02; since moved/removed), `governance/venture-template/roles/` (as of 2026-11-02; since moved/removed);
  - four under `instance/ventures/everything-ecosystem/` (as of 2026-11-02; since moved/removed);
  - `interface/operator-console/` (as of 2026-11-02; since moved/removed);
  - `knowledge/connectors/` (as of 2026-11-02; since moved/removed), `knowledge/sdlc/` (as of 2026-11-02; since moved/removed);
  - `lean/` (as of 2026-11-02; since moved/removed), `operations/marketing/site/` (as of 2026-11-02; since moved/removed);
  - `platform/` (as of 2026-11-02; since moved/removed), `platform/kits/` (as of 2026-11-02; since moved/removed);
  - `packages/naive/src/functions/strategy/frameworks/idea-map/`, `packages/naive/src/functions/products/frameworks/product-anatomy/` and its `packages/naive/src/functions/products/frameworks/product-anatomy/examples/ai-labs/`, `purpose/kits/validation/` (as of 2026-11-02; since moved/removed);
  - `schema/`.
- **7 `layer.json` files:** purpose, knowledge, operations, evidence, governance, interface, and `schema/` (layer "system").
- **README and layer.json agree in exactly 1 of 7 folders.** Only `schema/` has both. The other six layer folders have a `layer.json` and no README.
- **`platform/` (as of 2026-11-02; since moved/removed) has a README but no `layer.json`.**
- **Totals across the `layer.json` files:** 34 skills, 108 records, 60 checks and 22 gaps. All of it is ready to render, and none of it is rendered.
- **`layer.json` against the filesystem:** every listed skill and check path exists, with one gap. `purpose/kits/validation/skills/problem-validation/SKILL.md` (as of 2026-11-02; since moved/removed) was not in `packages/naive/src/records/layers/purpose/layer.json` on that reading. The other layers match: knowledge 2/2, operations 3/3, evidence 6/6, governance 15/15, interface 5/5.
- **Other docs files:** 8 `AGENTS.md`, 48 `SKILL.md`, and 351 `.md`/`.mdx` files in all.

### 5.3 Template compliance (15 READMEs read in full)
- **The template** gives `Up: [<parent folder>](../README.md)` at `docs/readme-template.md:11`, and the sections What this is, Where things are, Run and test, How it connects and Not built at lines 13, 17, 23, 28 and 34.
- **`Up:` line:** 0 of 15 have it.
- **All five sections:** 0 of 15 have them.
- **Partial matches:** only `interface/operator-console/README.md` (as of 2026-11-02; since moved/removed) has "What this is", and only `console/README.md` (as of 2026-11-02; since moved/removed) has a near match ("Not built yet").
- **Frontmatter:** 7 of 15 carry vault-style YAML frontmatter with differing `type` values: `index`, `reference`, `framework`, `entity-readme`, `venture-template-readme`. The template has none.

**Contents maps against disk** (direct children not named anywhere in the README):

| README | Direct children | Not named |
|---|---|---|
| `schema/README.md` (as of 2026-11-02; since moved/removed) | 292 | 229 |
| `README.md` (root) | 31 | 14 |
| `console/README.md` (as of 2026-11-02; since moved/removed) | 12 | 9 |
| `governance/venture-template/README.md` (as of 2026-11-02; since moved/removed) | 8 | 5 |
| `packages/naive/lean/README.md` | 6 | 3 |

At file level, `platform/README.md:33-47` (as of 2026-11-02; since moved/removed) lists `connectors/` (as of 2026-11-02; since moved/removed), `mcp/` (as of 2026-11-02; since moved/removed), `integrations/` (as of 2026-11-02; since moved/removed), `kits/` (as of 2026-11-02; since moved/removed) and `webhooks/` (as of 2026-11-02; since moved/removed). It never mentions `platform/research/` (as of 2026-11-02; since moved/removed) (14 files: `run.mjs`, `cells.mjs`, `store.mjs`, `credibility.mjs`, 5 adapters, 4 schemas, a test). It also omits `integrations/langsmith-setup.mjs` and `integrations/remote-image.mjs`.

### 5.4 Contradictions and stale references
1. **Kits.** `AGENTS.md:38` says a kit "will live under `platform/kits/` (as of 2026-11-02; since moved/removed) and is not built yet". `platform/kits/README.md:9` (as of 2026-11-02; since moved/removed) lists two kits. `platform/kits/agent-upgrade/` (as of 2026-11-02; since moved/removed) has `kit.json`, `run.mjs` and `stand-in-agent.mjs`, and `platform/kits/validation-kickoff/kit.json` (as of 2026-11-02; since moved/removed) exists. `README.md:38` and `platform/README.md:43-45` (as of 2026-11-02; since moved/removed) also treat kits as built.
2. **`execution/` (as of 2026-11-02; since moved/removed).** `AGENTS.md:76` names `execution/tooling/` (as of 2026-11-02; since moved/removed) and `AGENTS.md:82` names `execution/handoffs/` (as of 2026-11-02; since moved/removed). No `execution/` (as of 2026-11-02; since moved/removed) folder exists in the tree. EE-038 moved this work into operations.
3. **Root README file claim.** `README.md:14` says each layer has `tooling/integrations.json`. This is true of the six named layers, but the backticked path is written bare, so a path checker reads it as `tooling/integrations.json` at the root, which does not exist.
4. **The layer table is written by hand three times:**
   - `README.md:5-12` lists 6 layers. It omits system/`schema` and platform, and the Purpose row (line 7) names only "Discovery frameworks (BASED goals), ambition tiers".
   - `AGENTS.md:11-27` gives a "Where things are" table. That table lacks `agents`, `beta`, `frameworks`, `instance`, `lean`, `packages`, `scripts`, `verification` and `.claude-plugin`.
   - Each `layer.json` holds the canonical purpose.
5. **The operator console in two places.**
   - `interface/operator-console/` (as of 2026-11-02; since moved/removed) holds only a README, dated `created: 2026-05-14`.
   - That README is a companion to `[[project-view-mockup-2026-05-14.html]]` (`interface/operator-console/README.md:5,35` (as of 2026-11-02; since moved/removed)). No such file is in the repo; the link is an Obsidian-style link to the vault.
   - The built console is `console/` (as of 2026-11-02; since moved/removed), a Next.js app on the platform side (`AGENTS.md:25`).
   - So `interface/operator-console/` (as of 2026-11-02; since moved/removed) is an orphaned doc for an earlier mockup.
6. **Two framework homes.** There is a top-level `frameworks/` (`frameworks/ambition-tier/`, `frameworks/telos/`, each with `framework.json` and `adapter.ts`) beside `purpose/frameworks/` (as of 2026-11-02; since moved/removed). Neither layer README nor the root README explains the split, apart from `frameworks/README.md`.
7. **Near-duplicate names:**
   - `packages/naive/library/packages/investor/` and `packages/naive/library/packages/investors/`;
   - `packages/naive/library/packages/marketing/` has both `skill/` and `skills/`.
8. **`docs/design/` is an unindexed archive.** It holds 25 dated files: designs, 4 `HANDOFF_*` notes, a `PR_CATCHUP_PLAN`, and both `EVERYTHING_ECOSYSTEM_DOMAIN_DESIGN_2026-10-10.md` and a `_PUBLIC` copy. It has no README and no status per file, though as of 2026-11-02 `test.mjs:173` treated one of them (`LAYERS_AND_KITS_2026-10-27.md`) as live, generated reference. Google's rule is that built designs become archives [3].

### 5.5 The docs gate, measured
- **Scope of the scan.** `check-docs-claims.mjs:34` scans only:
  - `site/content/docs/**/*.mdx`;
  - `docs/master/*.md`;
  - `packages/*/playbooks/*.md`;
  - `SKILL.md` and `README.md` files.

  It skips `AGENTS.md`, `docs/design/` and `packages/naive/src/terms/ontology.md`, so the stale `execution/` (as of 2026-11-02; since moved/removed) paths in AGENTS.md are invisible to it.
- **Which paths it checks.** `REPO_DIRS` at line 93 is only `schema`, `interface`, `purpose`, `packages` and `docs`. A backticked path under `knowledge`, `operations`, `evidence`, `governance`, `platform`, `console`, `site`, `lean` or `frameworks` is never checked.
- **What counts as code.** Code is `^(schema|interface|packages|purpose)/` (`packages/naive/src/checks/check-docs-claims.ts`). That leaves 232 code files outside the gate entirely:
  - `site` 80, `console` 50, `verification` 41, `platform` 28;
  - `knowledge` 7, `operations` 6, `scripts` 6, `lean` 5;
  - `evidence` 3, `frameworks` 2, `governance` 2;
  - plus 2 root files.
- **Code that owes no README.** `nearestReadme` (lines 43-46) stops at the top-level folder and returns `null` when it finds nothing. Of 548 in-scope files, 86 owe nothing: all 47 in `interface/` (as of 2026-11-02; since moved/removed), all 31 in `packages/`, and 8 in `purpose/` (as of 2026-11-02; since moved/removed).
- **Concentration on one README.** 396 of the in-scope files resolve to `schema/README.md` (as of 2026-11-02; since moved/removed), so one 74-line index absorbs every schema change.
- **The gate condition.** `docs-required.yml` passes when there is no code, or when the scanned docs that are owed were updated. A pull request that edits `packages/naive/src/router/router.ts` owes `packages/naive/src/router/README.md`. An unrelated README or SKILL.md leaves that README owed, so the check does not pass.
- **What already works.** Three generated docs are compared to a fresh render (`test.mjs:162-174` as of 2026-11-02; the suite is now `node test.ts`). The helper `rendered(path, marker)` compares from a marker to the end of the file. So a generated block must be the last thing in its file. Begin and end markers would remove that limit.

### 5.6 interface/ top level
- 22 direct files, about 349 KB.
- The large ones are `packages/naive/src/router/router.ts` (65,705 bytes), `context.mjs` (35,542), `writes-test.mjs` (28,541), `test.mjs` (as of 2026-11-02; since moved/removed) (25,344), `context-test.mjs` (22,264) and `brand.mjs` (17,451).
- Also: `boundaries.mjs`, `writes.mjs`, `package-routes.mjs`, `adapters.mjs`, `reads.mjs`, `provenance.mjs`, `vitals.mjs`, `kit-boundary.mjs`, `instrumentation.mjs`, `acting.mjs`, `plugin-test.mjs`, `packages/naive/src/router/route-aliases.json`, `gate-hooks.mjs`, `release-card.mjs` and `packages/naive/src/interfaces/plugin-mcp.json`.
- 12 subfolders: `adapters`, `api`, `cli`, `create-venture`, `demo`, `dev`, `harness`, `mcp`, `operator-console`, `references`, `skills`, `tooling`. Only `operator-console` has a README, and it holds no code.
- `interface/` (as of 2026-11-02; since moved/removed) is the busiest folder in the framework and has no chapter at all.

## 6. Proposals

### (a) Codebase structure convention
**Recommendation: the folder tree is the table of contents.**
- Top-level folders are parts: the layers, plus `schema` as System, plus platform.
- A folder holding a manifest is a chapter. The ordering of parts and chapters lives in `docs/book.json` (as of 2026-11-02; since moved/removed), an ordered list of folder paths with a part title for each group.
- A folder stays under about 12 direct code files. Past that, it splits into subfolders, each a chapter. `interface/` (as of 2026-11-02; since moved/removed) (21 non-manifest files) is the first case.
- A possible split, inferred from file names only, so check the imports before moving anything:
  - `interface/router/` (as of 2026-11-02; since moved/removed) (`packages/naive/src/router/router.ts`, `packages/naive/src/router/route-aliases.json`, `package-routes.mjs`);
  - `interface/context/` (as of 2026-11-02; since moved/removed) (`context.mjs`, `reads.mjs`, tests);
  - `interface/writes/` (as of 2026-11-02; since moved/removed) (`writes.mjs`, `provenance.mjs`, `acting.mjs`, `gate-hooks.mjs`, tests);
  - `interface/boundaries/` (as of 2026-11-02; since moved/removed) (`boundaries.mjs`, `kit-boundary.mjs`);
  - `interface/observability/` (as of 2026-11-02; since moved/removed) (`instrumentation.mjs`, `vitals.mjs`).
- Resolve the near-duplicates (`investor`/`investors`, `skill`/`skills`) and fold `frameworks/` into `purpose/frameworks/` (as of 2026-11-02; since moved/removed), or state in `book.json` why it is separate.

**Alternatives:**
- Keep the tree as is and put the order only in a hand-written `SUMMARY.md`, as mdBook does [19]. This is cheaper, but the order then drifts from the tree.
- A Sphinx-style index in every folder [17][20]. This spreads the order across many files, with no single owner.
- Reorganize the tree to match C4 levels [8]. This changes too much for too little gain.

**Why:** a single ordering file with checked folder paths gives a book order that cannot drift from the tree. It also keeps one owner for "what comes next".

### (b) README template
**Recommendation:** keep `docs/readme-template.md`'s names and add three generated blocks. Generated blocks sit between `<!-- generated:NAME -->` and `<!-- /generated:NAME -->` and are never edited by hand.

1. `# <folder>`, then one sentence of purpose. *Generated* from `layer.json.purpose`, `package.json.description`, `kit.json` or `framework.json`. Hand-written only where there is no manifest.
2. `Up: [parent](../README.md) · Previous · Next`. *Generated* from `docs/book.json` (as of 2026-11-02; since moved/removed).
3. `## What this is`. *Hand.* Explanation: why the folder exists and why it is shaped this way, with decision ids.
4. `## Where things are`. *Generated skeleton* listing every direct child. The one-line "Holds" text for each child is hand-written, and the generator keeps it. The check fails on a missing or extra child.
5. `## Run and test`. *Hand.* Commands are checked by `packages/naive/src/checks/check-docs-claims.ts`.
6. `## How it connects`. *Generated* from `layer.json.reads`, `writes` and `records` (Called by / Calls / Records).
7. `## Rules it keeps`. *Generated* from `layer.json.checks`: each check's path and its test name in `test.mjs` (as of 2026-11-02; since moved/removed).
8. `## Decisions`. *Generated*: the ids in `docs/decisions/decisions.json` that cite this folder.
9. `## Not built`. *Generated* from `layer.json.gaps`. It may carry a hand-written line for folders without a manifest.

Drop vault-style frontmatter from code READMEs. The template has none, and the 7 that carry it disagree on `type`. Fixture venture READMEs under `schema/examples/` (as of 2026-11-02; since moved/removed) keep the venture scaffold's format.

**Alternatives:**
- Standard Readme's sections [6]: a good fit for the root, a poor one for internal folders.
- arc42's 12 sections [7]: right for a single architecture doc, too heavy per folder.
- Fully hand-written READMEs: this is the current state, and it is what drifted.

**Why:** most of a chapter's reference content already exists in manifests (34 skills, 108 records, 60 checks, 22 gaps). Generating it removes the drift class Aghajani et al. measured [23], and the hand-written parts stay small.

### (c) Placement rules
**Recommendation:** adopt section 4 as written. That means:
- the one-owner table (4.1);
- the four README triggers with the threshold of 5 (4.2);
- the README / comment / site / docs / decision split (4.3);
- AGENTS.md holds rules, not facts. Its "Where things are" table becomes a generated block or a link to the root contents.

**Alternatives:**
- A README in every folder: 467 READMEs, most of them noise.
- A README only at top level, as Google's minimum [2]: that leaves `interface/cli` (as of 2026-11-02; since moved/removed) and the packages without chapters.

**Why:** the triggers are mechanical, so a checker can enforce them. Folders below the threshold are still covered, because the parent's contents map must name them.

### (d) Checker design: `schema/check-docs.mjs` (as of 2026-11-02; since moved/removed)
The style follows `packages/naive/src/checks/check-nouns.ts`: a header comment with usage, exit code 1 on failure, `--md` to print the generated `SUMMARY.md`, `--write` to regenerate blocks in place, and `--report` to print without failing. Each rule has an id, so it can move from report mode to failing on its own.

| Id | Rule | Source of truth |
|---|---|---|
| D1 | Required README exists (the triggers in 4.2) | Tree, manifests |
| D2 | Title, `Up:` line and required `##` sections present, in template order | `docs/readme-template.md` |
| D3 | Every generated block equals a fresh render (begin and end markers, unlike today's marker-to-end-of-file helper) | `layer.json`, `package.json`, `kit.json`, `decisions.json`, `book.json` |
| D4 | Contents map complete: every direct child named exactly once, and no named child missing on disk | Tree |
| D5 | Relative links and backticked paths resolve, in every `.md` including `AGENTS.md` and `docs/design/`, for all top-level folders | Tree (extends `check-docs-claims.mjs:34,93`) |
| D6 | Every README is reachable from the root through contents blocks; an exception needs `<!-- orphan: reason -->` (the Sphinx rule [20]) | `book.json`, links |
| D7 | `book.json` lists only real folders, and every chapter folder appears once | Tree |
| D8 | Each manifest's skills and checks match disk in both directions (would catch `problem-validation`) | `layer.json`, tree |
| D9 | Freshness: a `<!-- date-check: Mon YYYY -->` older than 6 months is reported, as in rustc [10][11] (report only) | Dates in docs |
| D10 | Gate: every code file in any top-level folder has an owning README (no `null`), and a PR must touch that README or say `No docs change:` | Fixes `check-docs-claims.mjs:42-46` and `docs-required.yml:21` |

It wires in as one entry in the `cheap` list in `test.mjs` (as of 2026-11-02; since moved/removed), with D1 to D8 in report mode until the migration below is done. Output, one line per failure: `D4 platform/README.md: research/ is on disk but not in "Where things are"` (as of 2026-11-02; since moved/removed). Link checking for external URLs can use lychee [24] as a separate, non-blocking job, because the network makes it flaky.

**Alternatives:**
- Extend `packages/naive/src/checks/check-docs-claims.ts` instead of adding a file. This mixes "claims are true" with "structure is complete".
- Off-the-shelf tools only (lychee, markdownlint). These cannot know layer.json or the book order.

**Why:** a separate checker with ids can turn on rule by rule, and it reuses the repo's existing generated-file pattern.

### (e) Migration order, one item per PR
1. Add `check-docs.mjs` in `--report` mode with D1 to D10, and record the baseline counts from section 5 in the PR body.
2. Fix the stale facts in `AGENTS.md` (`:38` kits, `:76` and `:82` `execution/` (as of 2026-11-02; since moved/removed)), and extend the scan to `AGENTS.md` (D5).
3. Widen `REPO_DIRS` and `CODE` to all top-level folders, and make `nearestReadme` never return `null` (D10 in report mode).
4. Generalize `rendered()` in `test.mjs` (as of 2026-11-02; since moved/removed) to begin and end markers.
5. Add `docs/book.json` (as of 2026-11-02; since moved/removed) and the generated root contents block and `docs/SUMMARY.md` (as of 2026-11-02; since moved/removed). This makes the root README the title page.
6. to 11. One layer README per PR, generated from its `layer.json` plus a hand-written "What this is": purpose, knowledge, operations, evidence, governance, interface. Add `problem-validation` to `packages/naive/src/records/layers/purpose/layer.json` in the purpose PR.
12. `packages/README.md` and generated per-package READMEs. Resolve `investor`/`investors` in a separate PR.
13. Fix the `platform/README.md` (as of 2026-11-02; since moved/removed) contents (research/, two integrations).
14. Decide `interface/operator-console/` (as of 2026-11-02; since moved/removed): archive it to `docs/design/` or merge it into `console/README.md` (as of 2026-11-02; since moved/removed).
15. Add `docs/README.md` (as of 2026-11-02; since moved/removed) and a `docs/design/README.md` (as of 2026-11-02; since moved/removed) index with a status per file (live, archive, handoff).
16. Add the remaining top-level READMEs: `agents`, `beta`, `scripts`, `site` (pointing to `site/AGENTS.md`), `verification`.
17. to 24. Turn D1 to D8 from report mode to failing, one rule per PR.
25. onward. Split `interface/` (as of 2026-11-02; since moved/removed), one cluster per PR, with D1 to D4 already enforcing.

## 7. Top recommendations
1. Generate, do not write, every README fact that a manifest already owns (D3), and make `docs/book.json` (as of 2026-11-02; since moved/removed) the one owner of reading order.
2. Close the gate holes first (PRs 1 to 3). Until then, 318 code files (232 outside the gate and 86 that owe nothing) can change with no doc pressure.
3. Write the six layer READMEs next. They are the missing parts of the book, and they generate almost entirely from `layer.json`.
4. Enforce complete contents maps (D4) and reachability from the root (D6). These are the checks that catch what manual cleanups miss.

## 8. Open decisions for Torian
1. Should one file, `docs/book.json` (as of 2026-11-02; since moved/removed), own the reading order? **Recommended: yes**, with `SUMMARY.md` and Up/Previous/Next generated from it.
2. Should 5 direct code files be the threshold for a folder's own README? **Recommended: yes, 5**, plus the top-level, manifest and entry-point triggers.
3. Should each of the 22 packages get its own README? **Recommended: yes, generated from `package.json`**, with a short hand-written line only where one is needed.
4. Is platform a second volume rather than a part? **Recommended: yes**, "Volume 2, Mentura", so the framework/platform boundary shows in the table of contents.
5. Are fixture ventures under `schema/examples/` (as of 2026-11-02; since moved/removed) exempt from the code template? **Recommended: yes.** They follow the venture scaffold.
6. Should `interface/` (as of 2026-11-02; since moved/removed) be split now? **Recommended: no.** Split it after D1 to D4 enforce, one cluster per PR, after checking the imports.
7. What happens to built design docs in `docs/design/`? **Recommended: keep them as an indexed archive with a status per file.** Move any live generated reference (the `LAYERS_AND_KITS` section) to `docs/reference/`.
8. Does AGENTS.md keep its own tables of facts? **Recommended: no.** Rules only; facts become links or generated blocks.
9. Should READMEs drop vault frontmatter? **Recommended: yes, for code READMEs.**
10. Should `frameworks/` fold into `purpose/frameworks/` (as of 2026-11-02; since moved/removed)? **Recommended: yes**, unless there is a recorded reason (a decision id) to keep it separate.

## Sources
1. Write the Docs, "Docs as code". https://www.writethedocs.org/guide/docs-as-code/
2. Google documentation guide, "READMEs". https://google.github.io/styleguide/docguide/READMEs.html
3. Google documentation guide, "Documentation Best Practices". https://google.github.io/styleguide/docguide/best_practices.html
4. GitHub Docs, "About the repository README file". https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes
5. Diataxis. https://diataxis.fr/
6. Standard Readme, specification. https://github.com/RichardLitt/standard-readme/blob/main/spec.md
7. arc42, overview. https://arc42.org/overview
8. The C4 model. https://c4model.com/
9. D. E. Knuth, "Literate Programming", The Computer Journal 27(2), 1984. http://www.literateprogramming.com/knuthweb.pdf (doi:10.1093/comjnl/27.2.97)
10. Rust Compiler Development Guide, "Writing rustc-dev-guide documentation" and "Contribution procedures". https://rustc-dev-guide.rust-lang.org/contributing-to-guide.html and https://rustc-dev-guide.rust-lang.org/contributing.html
11. rustc-dev-guide, "Date Reference Triage for 2026-07" (issue #2914). https://github.com/rust-lang/rustc-dev-guide/issues/2914
12. rustc-dev-guide, `src/SUMMARY.md` (as of 2026-11-02; since moved/removed). https://github.com/rust-lang/rustc-dev-guide/blob/main/src/SUMMARY.md
13. Go, "Go Doc Comments". https://go.dev/doc/comment
14. SQLite, "Architecture of SQLite". https://www.sqlite.org/arch.html
15. Redis README, 7.0 branch ("Redis internals", "Source code layout") and current. https://github.com/redis/redis/blob/7.0/README.md and https://github.com/redis/redis/blob/unstable/README.md
16. Kubernetes Contributors, "OWNERS Files". https://www.kubernetes.dev/docs/guide/owners/
17. Linux kernel, "Using Sphinx for kernel documentation". https://www.kernel.org/doc/html/latest/doc-guide/sphinx.html
18. Linux kernel, "Writing kernel-doc comments". https://www.kernel.org/doc/html/latest/doc-guide/kernel-doc.html
19. mdBook, "SUMMARY.md". https://rust-lang.github.io/mdBook/format/summary.html
20. Sphinx, "Directives" (toctree). https://www.sphinx-doc.org/en/master/usage/restructuredtext/directives.html
21. M. Nygard, "Documenting Architecture Decisions", 2011. https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
22. The Pragmatic Programmer, tips (DRY). https://pragprog.com/tips/
23. E. Aghajani et al., "Software Documentation Issues Unveiled", ICSE 2019. https://csnagy.github.io/research/pdfs/2019/Aghajani2019-preprint.pdf
24. lychee link checker. https://github.com/lycheeverse/lychee
25. Cog. https://nedbatchelder.com/code/cog/
26. GitHub Docs, "About code owners". https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
