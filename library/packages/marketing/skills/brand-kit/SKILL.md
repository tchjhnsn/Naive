---
type: knowledge
tags: [everything-ecosystem, naive, skills, packages, marketing, brand]
ai-model: claude-opus-5.5
created: 2026-10-29T21:30:00Z
source: ai-generated
name: brand-kit
description: >
  Derive a venture's brand (ethos, colors, typefaces, voice) from its records instead
  of taste: the mission and strategic foundation, the ICP profiles, the market and the
  founders. Writes marketing/design-system.json (why) and marketing/brand.json (values)
  as drafts a person accepts. MANDATORY TRIGGERS: brand kit, brand colors, pick fonts,
  color palette, typography, visual identity, logo direction, brand assets.
---

# Brand kit

Part of the marketing function (`library/packages/marketing`). The brand is a decision the venture makes from what it already knows, so every choice names the records it rests on. Read the marketing function skill first (`library/packages/marketing/skill/SKILL.md`).

## 1. Read the inputs

Run `mentura marketing/design-system/inputs run` (or `mentura_run` over MCP). It returns, by key, what marketing inherits from other functions: `mission`, `problem`, `segment`, each `icp:<id>`, each `alignment:<id>`, each `market:<product>` and each `founder:<id>`. Never restate these from memory or copy them into marketing records; cite the key.

If `mission` or the primary ICP is missing or only a draft, stop and say so. A brand built on an unconfirmed foundation is a guess.

## 2. Name the ethos

Write one or two sentences on what the venture stands for, three to five traits it should feel like, and what it must never feel like. Take them from the mission, the alignment principles and the founder. Its `from` lists those keys.

## 3. Choose from the audience and the market, then the ethos

Best practice, in this order:

1. **The ICPs and the market set the constraints.** Who reads it, where (phone or desk, meetup slide or investor deck), and what the category already looks like. Note two or three competitors' looks as `competitor:<name>` inputs, so the venture can stand apart on purpose.
2. **The ethos picks within them.** Among choices that work for the audience, take the one that feels like the traits.
3. **Accessibility is not a choice.** Text contrast at least 4.5:1 (WCAG 2.2 AA), both light and dark themes, body type at least 16px.

For each area, write one entry in `choices` with `choice`, `tokens` (the `marketing/brand.json` paths it sets), `why` and `from`:

- **Color:** one primary, one accent, neutrals biased toward the primary, and semantic colors (success, warning, danger) kept apart from the accent.
- **Typography:** a display face and a body face, both licensed for the web, with a fallback stack. Register each in `public/assets` with its license.
- **Voice:** voice rules for `marketing/brand.json` `voice`, from how the ICPs talk about their problem.

Offer two or three alternatives per area in `alternatives`, so the person decides between real options.

## 4. Write drafts

- `mentura marketing/design-system write --input <file>`: the ethos, audiences (ICP ids, primary first), choices and components. Schema: `packages/naive/src/records/marketing-design-system.schema.json`.
- `mentura marketing/brand write --input <file>`: the values. Schema: `packages/naive/src/records/marketing-brand.schema.json`.

Both carry the experience-design decision class, so an agent's write is a draft. Put the choices in front of the person as a decision, with your recommendation, and never accept the draft yourself.

## 5. Check

`mentura marketing/design-system/check run` fails when a choice rests on an input that no longer exists. Run it after each write and whenever the mission, an ICP or a product's market changes, then revisit the choices it names.

## Then

Build the design system with the `design-system` skill (`library/packages/marketing/skills/design-system/SKILL.md`).

## Brand alignment lint

`node packages/naive/src/engine/brand-lint.mjs <venture dir> [--json]` (route `marketing/brand-lint`) checks every decision record and marketing content file against `marketing/design-system.json`. Rules: `avoid-words` (ethos.avoid terms), `voice-jargon` (a built-in jargon list), `audience-unknown` (an icp id not in `audiences`) and `unsourced-brand-choice` (a choice with no `from`). Each finding is `{rule, mode, file, message, suggestion}`. Rules are fail-open warnings by default; set `brand_lint.rules.<id>.mode` to `"fail-closed"` in naive.config.json to make a rule fail the run (exit 1).
