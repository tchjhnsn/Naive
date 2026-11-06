---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, marketing, functions]
ai-model: claude-opus-5.5
created: 2026-10-29T20:45:00Z
source: ai-generated
name: marketing-function
description: >
  Work with the marketing function of a Naive venture in code: read
  and write its records through the router or MCP, know what lands as a draft
  and what needs a person, run its checks, and pick the artifact each action
  builds. MANDATORY TRIGGERS: sitemap, landing page, brand, voice, public content, marketing site, ads, campaigns.
---

# Marketing function

Package `packages/naive/library/packages/marketing`. A venture function is a part of the venture with one accountable owner. The owner is named in `venture.json` under `functions` and in `naive.config.json`. Who the site and campaigns speak to, what goes where and why, the brand, the public variants and the pipeline.

## Records

| Route | What it is | Record type |
|---|---|---|
| `marketing/sitemap` | The planned public site, page by page | `marketing-sitemap` |
| `marketing/content` | Public variants of internal records, as MDX (read through the router; write the files) | `marketing-content` |
| `marketing/brand` | Brand tokens, type, voice and marks | `marketing-brand` |
| `marketing/design-system` | The ethos and why each brand choice was made, from inherited inputs | `marketing-design-system` |
| `marketing/design-system/inputs` | Command: what marketing inherits (mission, ICPs, market, founders) | command or item |
| `marketing/brand/tokens` | Command: the brand as design tokens and CSS | command or item |
| `marketing/voice` | Command: content held to the voice rules | command or item |
| `operations/marketing/public` | Command: the public gate | command or item |

The schemas are listed in `packages/naive/library/packages/marketing/package.json`. Call `mentura_layout` with a route to get its schema, template, gate and what need-now says before you act.

## Read and write

- Over MCP: `mentura_read` with `venture` and `route` (for example `marketing/sitemap`). Pass `header_only` to see state and owner first. `mentura_write` with the whole `record`, and say what it came from and the decision it acts under.
- In a shell inside the venture: `naive mcp` serves the same routes; `mentura routes` lists them.
- Read through Naive, never from memory. A missing, draft or stale record is shown as such, never filled in.
- Every write is checked against its schema and logged in `system/provenance`.

## Draft or person

`marketing/brand` carries the experience-design decision class, so an agent's write is a draft a person accepts. Every content file passes the public gate: it names its internal record and audience, and a published file needs a person's approval. Never mark content published yourself.

Open decisions for this function come from `mentura_decisions`. Propose with `mentura_propose_decision`; you never mark a decision decided.

## Checks

`naive check` runs every check that applies to the venture. For this function: `packages/naive/src/checks/check-brand.mjs`, `packages/naive/src/checks/check-assets.mjs` and the public gate (`operations/marketing/public`). Run it after each write, and fix a failure before you report the work done.

## Actions and artifacts

Build artifacts by the `choosing-artifacts` skill (`packages/naive/src/interfaces/skills/choosing-artifacts/SKILL.md`). Each artifact names the records it was built from.

| Action | Artifact | Built from |
|---|---|---|
| Draft a landing page or ad | Design | marketing/brand and positioning |
| Set up the brand | Design system | marketing/brand and marketing/design-system, by the `brand-kit` and `design-system` skills in `packages/naive/library/packages/marketing/skills/` |
| Plan content | Document | marketing/sitemap and content records |

## Depends on

Reads `foundation/icp` and `product`. Hands the sitemap and brand to engineering. Publishes only under `governance/publication-policy`.
