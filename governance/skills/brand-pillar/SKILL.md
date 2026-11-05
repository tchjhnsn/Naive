---
type: knowledge
tags: [everything-ecosystem, skills, brand-pillar]
ai-model: claude
created: 2026-05-15
source: hybrid
name: brand-pillar
description: >
  Provide Brand pillar context — teams, roles, Tier 1 deliverables (identity,
  voice, asset library, foreshadowing invariants, version-identities),
  cross-pillar overlap zones, and the import discipline (Brand is the source of
  truth; other pillars wikilink, never duplicate). Auto-loads when working on
  brand identity, voice, visual systems, marketing, community, PR, brand-led
  products, or any Brand-pillar concern. References venture-template/pillars/brand.md
  as the canonical reference. Per SAD v3.3+ amendment §33.
  MANDATORY TRIGGERS: brand pillar, brand work, brand identity, voice, tone,
  logo, wordmark, OG image, typography, colors, marketing, content, community,
  PR, CMO, foreshadowing, version-identities, narrative, naming, brand assets,
  brand book, brand guidelines, brand campaign.
---

# Brand Pillar Skill

The context-providing skill for Brand-pillar work. Auto-loads when brand-pillar concerns surface in conversation.

## What this skill provides

- **Brand pillar reference** — [[../../venture-template/pillars/brand|venture-template/pillars/brand.md]] for the canonical Brand pillar description
- **CMO role context** — [[../../venture-template/roles/cmo|venture-template/roles/cmo.md]]
- **The import discipline** — Brand is the source of truth for identity; other pillars wikilink to Brand, never duplicate
- **Tier 1 deliverable awareness** — identity, voice, asset library, foreshadowing invariants, version-identities
- **Optional Brand-pillar products** — when present (campaigns, brand-led podcasts, events, merchandise, brand books)

## When to invoke

Auto-loads when:

- Brand identity work is happening (colors, typography, logo, imagery)
- Voice + tone + narrative work is happening
- Marketing, content, community, or PR work surfaces
- A foreshadowing audit is being run (V[N] → V[N+1] persona evolution)
- Version-identities document is being authored
- Brand assets are being shipped (favicon, OG image, wordmark exports)
- Naming decisions are being made (product names, feature names)
- Brand-load-bearing files appear in commits (per pre-commit ritual)

## What this skill emphasizes

When loaded, the AI should keep in mind:

1. **Brand is the source of truth.** Other pillars import from Brand by wikilink. Watch for duplication — if Product or Business is defining identity locally, that's drift. The methodology will not accept a duplicate brand asset in another pillar's folder.

2. **Foreshadowing is structural.** V[N] must foreshadow V[N+1]'s audience and capabilities. Brand changes between versions are deliberate, not accidental. The version-identities discipline + foreshadowing invariants prevent brand whiplash across versions.

3. **CMO is the pillar lead.** Brand-pillar sign-offs map to CMO authority. When brand-load-bearing files ship, CMO awareness is implicit.

4. **Brand-pillar products are optional.** Most early-stage companies don't have them. They emerge when the brand itself becomes the audience's primary touchpoint distinct from the canonical product. Don't force a Brand-pillar product structure on a project that just needs identity + voice.

5. **The import-not-duplicate discipline is methodology-load-bearing.** A V1 brand revert (2026-05-13) happened in part because a system font cascade was effectively a duplicate of brand identity in Product that drifted out of sync. The discipline is the fix.

## Brand authoring posture

Brand work typically lands in friend mode (vision expansion — what could the identity be?) and shifts to office-hours mode when converging on the canonical identity. Mode-aware:

- **Identity hypothesis / early-stage** — friend mode dominant
- **Identity convergence / brand book authoring** — mixed mode; friend for breadth, office-hours for what makes the cut
- **Brand audit / foreshadowing audit** — office-hours mode (looking for inconsistency, drift, weakness)

## Cross-pillar overlap behavior

When work crosses pillars:

- **Design system** (Brand × Product) — Brand owns visual tokens + voice; Product owns interaction. Co-authored artifact.
- **Marketing site** (Brand × Business) — Brand owns voice + identity; Business owns conversion strategy.
- **Developer experience** (Brand × Product) — Brand owns dev portal aesthetic + voice; Product owns SDK / API docs.
- **Sales collateral** (Brand × Business) — Brand owns voice + identity; Business owns commercial framing.
- **PR strategy** (Brand × Business) — Brand owns narrative; Business owns press / analyst / investor relationships.
- **Trust & safety** (Brand × Product × Business) — Brand owns community standards + voice for moderation messaging.

## Related skills

- [[../version-identity/SKILL|version-identity]] — Brand-led; runs at version boundaries
- [[../articulation-closure/SKILL|articulation-closure]] — Brand-pillar deliverables in the closure inventory
- [[../friend-mode/SKILL|friend-mode]] / [[../office-hours-mode/SKILL|office-hours-mode]] — posture skills for Brand work
- [[../product-pillar/SKILL|product-pillar]] — companion pillar; design system overlap zone
- [[../business-pillar/SKILL|business-pillar]] — companion pillar; sales collateral + PR overlap zones

## Status

- **2026-05-14:** Initial authoring. References venture-template/pillars/brand.md as the canonical Brand pillar reference.
