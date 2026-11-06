---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, marketing, design-system]
ai-model: claude-opus-5.5
created: 2026-10-29T21:30:00Z
source: ai-generated
name: design-system
description: >
  Build a venture's design system from its brand and records: the components its
  artifacts are made of (hero, section, fact, decision card, one-pager), each naming
  the tokens it uses and the records it shows, and the Design System artifact that
  presents it. MANDATORY TRIGGERS: design system, component library, brand assets,
  one-pager template, slide template, style guide.
---

# Design system

Part of the marketing function. Needs a confirmed or drafted `marketing/brand` and `marketing/design-system` from the `brand-kit` skill.

## Components are code

Each component in `marketing/design-system.json` `components` has an `id`, a `purpose`, the `tokens` it uses (paths in `marketing/brand.json`) and the records it `reads`. Start from what the venture's artifacts already need:

| Component | Reads |
|---|---|
| `hero` | the mission (inherited, key `mission`) |
| `problem` | `foundation/problem` |
| `audience-card` | one `foundation/icp/<id>` profile |
| `lifecycle` | the phases and the venture's current phase |
| `fact` | any record, with a Draft badge while it is unconfirmed |
| `foundation-one-pager` | `purpose/foundation`, every statement with its status |

A component shows a record's content by reading it through Naive at build time; it never holds a copy. Text an agent wrote stays marked Draft until a person confirms it.

## Tokens

`mentura marketing/brand/tokens run` renders the brand as W3C design tokens and CSS custom properties. Interfaces load those; never hand-copy a color or font into a page.

## Present it

Make the Design System artifact with the `choosing-artifacts` skill (`packages/naive/src/interfaces/skills/choosing-artifacts/SKILL.md`), from the Design System artifact type when one is listed. Put its link in `marketing/design-system.json` `artifact`. The artifact is a view: the records stay the source of truth.

## Check

`naive check` runs `packages/naive/src/checks/check-brand.mjs` and `packages/naive/src/engine/design-system.mjs`. A component naming a token the brand lacks, or a choice resting on a retired input, fails.
