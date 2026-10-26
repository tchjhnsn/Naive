---
type: reference
ai-model: claude
source: hybrid
created: 2026-04-23
updated: 2026-04-23
last-reviewed: 2026-04-23
authorship: sole
ip-sensitivity: normal
scope: global
tags: [reference, template, claude-md, repo, sad-v3]
---

# Repo CLAUDE.md — Template

A thin, project-layer CLAUDE.md for any `<repos>/<repo>/` that inherits from the Global CLAUDE.md at `<vault>/CLAUDE.md`. Meant to stay under 200 lines so it survives Claude Code's compaction passes without losing coherence.

## When to use this template

When a new repo enters SAD Phase 2 (Implementation), its first `<repos>/<repo>/CLAUDE.md` is authored from this template. The template lives here in the global layer; instances live in each repo. Keep them in sync *with this template's structure*, not its content — every repo's content is project-specific.

## What belongs in a repo CLAUDE.md

Only what's project-specific. Everything cross-project lives in the Global CLAUDE.md and is inherited. A repo CLAUDE.md that restates security rules, git control, scaffolding defaults, or methodology pointers is bloated — those are upstream.

What's genuinely project-specific:

- The entity this repo implements (wikilink to vault entity profile).
- Tech stack with version pins.
- Build, test, and run commands.
- File-organization decision tree specific to this codebase.
- Forbidden patterns specific to this codebase.
- Testing rules specific to this codebase.
- Deployment specifics.

## Template

Copy the content below (frontmatter + body) into a new file at `<repos>/<repo>/CLAUDE.md`. Replace every `<placeholder>`. Delete any section that doesn't apply; this template is a maximum, not a minimum.

```markdown
---
# Per-repo CLAUDE.md frontmatter is optional but useful for Dataview queries
# that span both vault-side and code-side artifacts (if the code directory is
# ever indexed). Keep minimal.
entity: [[<vault-entity-profile-path>]]
repo-name: <repo>
primary-language: <language>
---

# CLAUDE.md — <repo>

*Project-layer rulebook. Inherits from the Global CLAUDE.md at `<vault>/CLAUDE.md`. Only project-specific content below.*

## Entity

This repo implements [[<vault-entity-profile-path>]]. The full spec package, design, and session log for this entity live in the vault at `<vault>/projects/<entity-path>/product/`.

## Project Context

- **What this is:** <one-paragraph what the project is, current version, non-obvious decisions>
- **Current SAD phase:** <Phase 0A | 0B | 0C | 1A | 1B | 2 | 3 | 4 | 5>
- **Current version:** <v1 | v2 | ...>
- **Deployment status:** <production | staging | preview | none>
- **Production URL:** <url or null>

## Tech Stack

<Every technology: choice | version pin | rationale. Match IMPL_SPEC.md in the vault's spec package.>

- <tech>: <version> — <rationale>
- <tech>: <version> — <rationale>

## Build, Test, Run

```bash
# Install
<install command>

# Dev
<dev server command>

# Test
<test command>

# Build
<build command>

# Deploy
<deploy command, or "the owner controls deploys; see deployment-checklist">
```

## Session Protocol

Follow [[SAD_SKILL_v3#PART 4]] (Session Opening Protocol) at the start of every implementation session:

0. Declare the level (almost always `Project` for code sessions; name the entity).
1. Run session-start ritual (time-awareness + session-capture).
2. Read `SESSION_LOG.md` (this repo's, full — don't skim).
3. Read this file (`CLAUDE.md`, full).
4. Read the spec layer(s) relevant to the current task. The spec package lives in the vault, not here — fetch via pointer.
5. State the precise task, its spec reference, and anticipated decision points.
6. Check for unresolved staleness markers in SESSION_LOG.
7. No implementation code until steps 0–6 are complete.

## Naming Conventions

<Exhaustive list. One rule per category. Example correct + incorrect for each.>

- Files: <rule> — e.g., `<correct>` not `<incorrect>`.
- Variables: <rule>.
- Functions: <rule>.
- Types: <rule>.
- API routes: <rule>.
- Database tables / collections: <rule>.

## File Organization

<Decision tree, not a listing. New contributor should be able to place any new file correctly.>

## Forbidden Patterns

<Project-specific "never do X because Y" rules. Short list. Every entry must name the reason.>

- Never <X> because <Y>.
- Never <X> because <Y>.

## Testing Rules

- What must be tested: <unit / integration / e2e / specific flows>.
- Where tests live: <path rule>.
- Required patterns: <naming, setup, teardown>.
- Minimum coverage (if enforced): <percentage or rule>.

## Deployment Specifics

<If deployment exists. Otherwise delete this section.>

- Platform: <vercel | cloudflare | aws | fly | railway | none>.
- Environments: <production | staging | preview list>.
- Env vars: <reference to where they're defined — never list the values here>.
- Rollback procedure: <one sentence or link to runbook>.

## Links

- Vault entity profile: [[<entity-profile-path>]]
- Spec package: `<vault>/projects/<entity-path>/product/spec/`
- Code-pointer note: `<vault>/projects/<entity-path>/product/code/pointer.md`
- Production URL: <url or null>

---

*Last reviewed: <YYYY-MM-DD>. Last compiled from spec package: <YYYY-MM-DD>.*
```

## Maintenance

When the vault-side spec package changes (Phase 4 — Spec Evolution), this repo CLAUDE.md may need refresh:

- Class 4 changes (Convention) → update this file directly.
- Class 0–3 changes → update spec package in the vault, then re-derive the relevant sections of this file (tech stack, build, naming, forbidden patterns).

The `Last compiled from spec package:` timestamp at the bottom records the last deliberate re-derivation from the spec.

## Cross-references

- [[SAD_SKILL_v3]] — the methodology this template implements.
- [[SAD_SKILL_v3#PART 0.5]] — Global / Project / Local scope model.
- [[SAD_SKILL_v3#PART 4]] — Session Opening Protocol.
- Global CLAUDE.md — `<home>/Documents/CLAUDE.md`, the file every repo CLAUDE.md inherits from.

## Changelog

| Date | Change | Trigger |
|------|--------|---------|
| 2026-04-23 | Created. | SAD v3 Levels session ([[session-proposal-author-sad-skill-v3]] Campaign extension) |
