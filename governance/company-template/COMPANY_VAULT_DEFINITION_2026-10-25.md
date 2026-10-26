---
type: architecture-spec
source: hybrid
created: 2026-10-25T23:05:00Z
ai-model: claude-opus-5.5
authority: architectural
decision-status: in-force
status: ACTIVE
governed-by:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-10-25_docs-as-code-and-workspace-layout]]"
  - "[[governance/company-template/index]]"
related:
  - "[[POLITY_VAULT_TARGET_STRUCTURE_2026-10-13]]"
  - "ADR-0006-repository-structure (tchjhnsn/polity: docs/adr/ADR-0006-repository-structure.md)"
  - "[[everything-ecosystem/MAD/layers/README]]"
tags: [company-template, company-vault, governance, delivery, docs-as-code, workspace]
description: "What a company's vault is once design and implementation docs move into the repo. Uses MAD's four layers: governance and delivery live in the vault, software engineering and automation in the repo, and company functions MAD doesn't cover stay in the vault. Proposes folders, a sorting test, and how vault and repo link."
last-revised: 2026-10-26T00:44:21Z
revision-note: "Re-framed on MAD's four layers (Torian, 2026-10-26); open questions decided as G-023"
---

# What a company vault is

## Why this is needed

Under G-020, design and implementation documentation moves into the repo. That defines the repo well: **the repo is the product and the account of how it is built.**

It leaves the vault defined only by what is left over, which is the wrong way to define anything. This document defines the vault on its own terms.

## The definition

> **A company vault is how the company governs and runs itself.** It holds what the company has decided and why, what it is delivering and in what order, who is responsible, and how it is known and earns its keep. It is the company's handbook, its book of record and its operating desk. The repo holds what a product is and how it is built.

### The layers are MAD's (revised 2026-10-26)

The first draft invented three layers (governance, delivery and operation, build). Torian meant the four layers MAD already defines in `everything-ecosystem/MAD/layers/`. Using them means the vault and repo split falls out of a model the workspace already maintains, rather than a second one.

| MAD layer | What MAD asks about | Home |
|---|---|---|
| **Governance** | Whether it's worth building, who decides, how value is judged (13 questions: evidence, funding, regulation, decision rights, success measure, review point, goal setting, what happens when evidence says the direction is wrong) | **Vault**, `governance/` |
| **Delivery** | How work is planned, sequenced and handed over (15 questions: requirements stability, how work arrives, fixed commitments, stage gates, which artifact decides the plan) | **Vault**, `delivery/` |
| **Software engineering** | How each part is specified, built and checked, asked per part (15 questions: kind of part, who depends on its interface, invariants, which artifact defines correct behaviour) | **Repo**, `docs/` beside the part |
| **Automation** | How it's built, tested, released and run without hand work (12 questions: build, merge, release, infrastructure, observability, reliability) | **Repo**, as config and code (CI, infrastructure), with its docs in `docs/` |

The line between vault and repo is the line between MAD's upper two layers and its lower two. Governance and delivery decide *whether, who, what and when*. Software engineering and automation decide *how*.

Two consequences follow.

**MAD covers software only, and a company is more than its software.** MAD's governance layer asks about one piece of software ("who decides whether *this software* gets built"). A company also has corporate records, people, brand, money and legal duties, which no MAD layer covers yet (MAD requirement 10: software only for now). These stay in the vault as **company functions** beside the two MAD layers, rather than being forced into them. If MAD later grows past software, they are the candidates for a company-level governance layer.

**Where a document lives is itself a MAD answer.** MAD requirement 12 says a project's repo structure and file formats are questions at each layer, answered by the chosen templates. Two practice questions settle which document is canonical:
- delivery: *which artifact decides what the current plan is when people disagree?*
- software engineering: *which artifact defines correct behaviour for this part, and wins when artifacts disagree?*

The folder layout follows those answers. A part built spec-as-source keeps its spec in the repo as the winning artifact. A project run waterfall keeps its signed-off plan in the vault's `delivery/` as the winning artifact. The folders below are a default, and a project's MAD answers can override them.

### Where the MAD record lives

MAD stores each project's answers as JSON in `.mad/record.json` (MAD does this for itself). One record covers all four layers for one project. Proposed default: **the record lives in the repo** at `.mad/`, because a repo is cloned alone and its engineering and automation answers have to travel with it. The vault's `governance/` and `delivery/` folders hold the readable decisions and plans, and cite the record's governance and delivery answers by question id. A company with several products has one record per repo, listed in `delivery/portfolio.md`.

Systems of record outside both (the database, GitHub issues and PRs, the bank, the state's corporate filings, signed contracts) are referenced from the vault, never copied into it.

## What the prior art says

**Governance is separate from management.** COBIT and ISO/IEC 38500 split *governance* (evaluate, direct, monitor: the board's job) from *management* (plan, build, run, monitor). The split keeps the people running a thing from also grading it ([Hyperproof on COBIT](https://hyperproof.io/cobit-it-governance/), [Orbus on COBIT principle 5](https://www.orbussoftware.com/resources/blog/post/cobit-5-principle-5-separating-governance-from-management)).

This lines up with MAD: MAD's governance layer is evaluate, direct and monitor; its delivery layer is plan and run; software engineering and automation are build and run.

**A company handbook is a different thing from product docs.** GitLab is the strongest example of documentation done in the open. It keeps two separate bodies:
- the **handbook**, covering values, governance and the board, each department and how the company works;
- the **product documentation**, which lives with the product and is its single source of truth for usage.

The handbook links to the product docs rather than restating them ([GitLab handbook](https://handbook.gitlab.com/handbook/about/), [GitLab documentation style guide, mirror](https://gitlab-doc-test.readthedocs.io/zh-cn/latest/development/documentation/styleguide/)). That is the vault/repo split almost exactly.

**A management system has a known shape.** Every ISO management-system standard (9001 quality, 27001 security, 42001 AI) shares one high-level structure. Clauses 4–10 are **context, leadership, planning, support, operation, performance evaluation, improvement** ([ANSI on Annex SL](https://blog.ansi.org/ansi/annex-sl/), [Modulos on ISO 42001 clauses 4–10](https://docs.modulos.ai/frameworks/iso-42001/clauses-4-10.html)). It is a good coverage check: a company vault that has nothing for one of these has a gap.

**Documents have a hierarchy.** Quality systems run *policy → procedure → work instruction → record*. A procedure crosses functions; a work instruction covers one task at one station ([Advisera](https://advisera.com/9001academy/knowledgebase/how-to-structure-quality-management-system-documentation/), [QMS UK](https://www.qmsuk.com/news/iso-9001-processes-procedures-and-work-instructions)). This maps cleanly:
- **Policies and procedures** are company → vault.
- **Work instructions** for a system (runbooks, deploy steps) are build → repo.
- **Records** are vault registers and ledgers, or a pointer to the system of record.

**A company must keep corporate records.** Statutes require permanent minutes of board and shareholder meetings, actions taken without a meeting, the articles and bylaws, and registers of directors and shareholders. The cap table usually sits alongside ([Iowa Code §490.1601](https://www.legis.iowa.gov/DOCS/IACODE/2001/490/1601.html), [Inc Authority on corporate minutes](https://www.incauthority.com/blog/corporate-minutes/)). None of this has a home in the vault today.

**Investors and acquirers expect a fixed set of areas.** Due-diligence rooms converge on: corporate and governance, financials, legal and compliance, intellectual property, team and HR, product and technology, market and strategy, traction and metrics ([Visible](https://visible.vc/blog/data-rooms-faq/), [Drooms](https://drooms.com/es/startup-fundraising-data-room-checklist)). A vault organized this way can produce a data room from what already exists.

**Small-company operating systems name the same parts.** EOS has six components: vision, people, data (scorecard), issues, process, traction (priorities and meeting cadence). The vault already has most of them as registers and positions ([EOS Worldwide](https://www.eosworldwide.com/traction-component)). Treat this source as promotional; it is useful only as a checklist.

## The sorting test (replaces the earlier one)

The test in the v3.0.17 draft ("would it still hold if the code were rewritten?") is wrong for domain design. A domain model of how a court works survives a rewrite, yet G-020 puts domain design in the repo. The better test:

> **Is it about the company, or about a product?**
> - About **how the company decides, runs, staffs, sells or presents itself** → vault.
> - About **what a product is, the domain it models, or how it is built and run** → repo.

Edge cases:

| Document | Goes to | Why |
|---|---|---|
| Vision of a product | Repo (`docs/vision.md`) | About the product. The company's mission is a vault document; the product vision answers to it |
| Product roadmap / version plan | Vault, delivery | Sequencing and commitment are company decisions; the repo holds what each version contains |
| Domain research (sources on how a government works) | Repo | It informs the domain model. Strategy research (market, competitors) stays in the vault |
| ADR | Repo | Systems decision. Founder decisions (D-numbers) stay in the vault ledger |
| Runbook, deploy, on-call | Repo | Work instruction for a system |
| Incident review | Repo for the technical record; vault if it changes policy | |
| Brand identity and voice | Vault | How the company is known |
| Design tokens, component library | Repo | Implements the brand |
| Pricing, contracts, cost model | Vault | Business. A cost model's code (e.g. `stage1_cost_model.py`) is still a business tool and stays with it |
| Marketing copy | Repo of the site that ships it | It is shipped content. Campaign strategy stays in the vault |

## Proposed folders for a company vault

Folders follow MAD's layers. The two upper layers get one folder each, with subfolders that match the groups of MAD questions they answer. Company functions that MAD doesn't cover sit beside them. Inside each folder, the constitution's "folder means standing" rule still applies.

```
companies/<company>/
├── entity-profile.md            the company's constitution (identity, scope, stage)
│
│   MAD governance layer: whether it's worth building, who decides, how value is judged
├── governance/
│   ├── charter/                 mission, values, philosophy, guiding principles
│   ├── evidence/                is the problem real, can we reach the people: market, competitors, strategy research
│   ├── decisions/               decision rights, founder decision ledger (D-NNN), continue/stop reviews
│   ├── policies/                company policies (data, security, AI use, conduct, publishing), regulatory exposure
│   └── scorecard/               the success measure and goals for the next stretch (pointers to live data)
│
│   MAD delivery layer: how work is planned, sequenced and handed over
├── delivery/
│   ├── portfolio.md             every product and harness, its stage, its repo and its .mad record
│   ├── roadmap/                 version plans and sequencing, by product; fixed outside commitments
│   ├── work/                    work queue, campaigns, handoffs, stage gates, phase status
│   └── cadence/                 operating rhythm: reviews, retros, planning cycles
│
│   Company functions (outside MAD, which covers software only)
├── corporate/                   minute book index, bylaws, board and shareholder actions, cap table pointer
├── organization/                positions, roles, occupancy, hiring, people policies
├── operations/                  running the company: vendors, accounts, tools, spend, support
├── brand/                       identity, voice, narrative, asset index
├── business/                    model, pricing, sales, partnerships, finance, legal and compliance, fundraising
│
├── _meta/registers/             risk, dependency, open questions, fragmentation (records)
├── _ideas/  _archive/  deferred/
│
```

The MAD software-engineering and automation layers live in the company's product repos at `~/workspace/code/companies/<company>/<repo>/` (code, `docs/` per part, CI and infrastructure, `.mad/record.json`). Repos never sit inside the vault (G-025).

`strategy/` from the first draft folds into `governance/evidence/`, because the questions it answers (is the problem real, can we reach the people who have it) are MAD governance questions. `corporate/` moves out of `governance/` because MAD's governance layer is about whether software is worth building, not about the legal entity.

**Coverage against ISO's seven clauses:**

| Clause | Folder |
|---|---|
| Context | `governance/evidence` |
| Leadership | `governance/charter`, `governance/policies`, `organization/` |
| Planning | `delivery/roadmap`, `_meta/registers/` (risk) |
| Support | `operations/`, `organization/` |
| Operation | `delivery/work`; the repo for building and running the product |
| Performance evaluation | `governance/scorecard` |
| Improvement | `delivery/cadence` (retros), `_archive/` with supersession |

**Against a due-diligence room:**

| Data-room area | Folder |
|---|---|
| Corporate | `corporate/` |
| Financial | `business/finance` |
| Legal | `business/legal` |
| IP and product/tech | the repos, plus `governance/policies` |
| Team | `organization/` |
| Market | `governance/evidence` |
| Traction | `governance/scorecard` |

## How the vault and the repo relate

1. **Down by path.** The vault points at the repo through `delivery/portfolio.md` (generated from `_meta/workspace.json`) and through `implemented-in:` on any principle, policy or decision that a repo carries out.
2. **Up by ID, not by path.** A repo is cloned alone (on GitHub, in a cloud agent, by a contributor), so a relative path into the vault breaks there. Repo documents cite what governs them by stable ID instead: a decision (`D-122`, `G-020`), a principle id, a policy id, or the entity id. A small resolver (the registers plus `workspace.json`) turns the ID into a file. This also makes the governance link survive folder moves.
3. **Each decision is recorded once.** Company decisions live in the vault ledger. Systems decisions live as ADRs in the repo. An ADR that implements a founder decision names its D-number.
4. **Work lives where it is done.** Company-level work (campaigns, handoffs, priorities) is in `delivery/work`. Code-level work is GitHub issues and PRs, which the vault links to rather than mirrors.
5. **Nothing is restated.** A vault document summarizes a repo document only as far as a reader needs to decide whether to follow the link. This is GitLab's SSOT rule and the constitution's pointer rule.

## What changes for Polity (illustration, not a plan)

| Today | Proposed |
|---|---|
| `business/org/positions/` | `organization/positions/` |
| `business/FRAGMENTATION_REGISTER.md` | `_meta/registers/` |
| `product/planning/` (handoffs, roadmaps, phase status) | `delivery/` |
| `product/planning/DECISION_LEDGER_2026-08-12.md` | `governance/decisions/` |
| `product/spec/adrs/` | `polity/docs/adr/` (repo) |
| `product/research/`: strategy research | `governance/evidence/` |
| `product/research/`: domain research | repo |
| `product/spec/`, `design/` | repo `docs/` |

## Decisions (Torian, 2026-10-26, recorded as G-023)

Torian answered the six open questions. Where the answer was "your recommendation", the recommendation is written out here.

1. **Sensitive records stay out of git.** Signed contracts, minutes that carry personal data, HR files and financial statements go in an encrypted store outside git. The vault keeps an index entry for each one (id, date, what it is, where it is stored, a checksum) in `corporate/` or `business/`. Decisions, policies and anything meant to be read and versioned stay in git.
2. **A hybrid of one repo and one per company.** The vault is one repo for shared material (`_meta/`, `_sessions/`, `_issues/`, `ideas/`, and projects without a repo of their own). Each company vault is its own private repo at `vault/companies/<company>/`, which the vault repo ignores and lists in `_meta/workspace.json`. That lets a company vault be shared with a future co-founder or board without exposing the rest of the vault. *Corrected 2026-10-26 (G-025):* the workspace folder itself is not a repo, the shared repo is the vault, and product repos sit beside the vault in `code/`, never inside it. *Corrected again 2026-10-26 (G-026):* company vaults are not separate repos. `companies/` stays in the vault repo; each company's code repos sit in `code/companies/<company>/`.
3. **Projects get the same shape, scaled down.** A non-company project has an entity profile and its repo. It adds `governance/` and `delivery/` only when it has something to put in them. Company functions (`corporate/`, `organization/`, `brand/`, `business/`, `operations/`) are left out unless the project needs one.
4. **Folder names are MAD's layer names.** `governance/` and `delivery/` take MAD's names and follow MAD if it renames a layer. The charter stays at `governance/charter/`.
5. **The MAD record lives in the repo** at `.mad/record.json`, whole, with all four layers. The vault cites its governance and delivery answers by question id.
6. **MAD gets a company-level layer soon**, without waiting for MAD to grow beyond software. It covers what the company functions hold (corporate, organization, brand, business, operations), so MAD can recommend how a company organizes its vault. Logged as work item W-013 for the MAD project.
