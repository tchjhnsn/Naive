---
type: company-template-pillar
ai-model: claude
pillar: brand
source: hybrid
created: 2026-05-14
last-reviewed: 2026-05-14
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[everything-ecosystem]]"
tags: [company-template, pillar, brand, methodology, 2026-05-14]
canonical-for: "brand-pillar-reference"
related:
  - "[[governance/company-template/index]]"
  - "[[governance/company-template/pillars/product]]"
  - "[[governance/company-template/pillars/business]]"
---

# Brand pillar

> **Purpose:** *How the company shows up.* The source of truth for identity — visual, verbal, emotional. Imported by the other pillars, never duplicated.

---

## Brand pillar products (optional)

Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §35]], the Brand pillar **may** have products of its own — things produced by Brand as expressions of identity that are themselves "products" rather than supporting artifacts for the Product pillar.

Common Brand-pillar products:

- **Brand-led podcasts / YouTube channels** — when content is brand expression, distinct from a Product-pillar content product
- **Brand campaigns** — films, photoshoots, narrative arcs shipped as standalone works (Nike's "Find Your Greatness," Apple's "1984")
- **Brand-led events** — conferences, meetups, summits (when the brand IS the event's reason for being)
- **Merchandise / branded goods**
- **Brand books / identity manuals** when published externally
- **Community programs** — when brand-led, not product-led
- **Sponsorships + brand activations** as recurring offerings

If a Brand-pillar product exists, it runs through the methodology the same way a Product-pillar product does. It has a spec stack (often lighter than software), a roadmap, an articulation-closure inventory, and traverses the four lanes. Its product-type (content / event / merchandise / etc.) determines which Tier 2 deliverable templates apply — independent of the fact that it lives under Brand.

Most early-stage companies do NOT have Brand-pillar products. They have Brand-pillar deliverables (identity, voice, assets) that *support* the Product-pillar product. Brand-pillar products emerge when the brand itself becomes the audience's primary touchpoint, distinct from the canonical product.

**Brand-pillar products are themselves recursive.** Per [[_ideas/build-roadmap-and-html-orchestration-2026-05-12|§36]], a Brand-pillar product (say, a podcast) has its own three-pillar structure: its own Product (the show — episodes, formats, hosts), its own Brand (the show's identity within or distinct from parent brand), and its own Business (hosting costs, sponsor relationships, revenue tracking). The methodology applies fractally — a podcast that's a Brand-pillar product still needs Business-pillar work, handled through the podcast's *own* Business sub-pillar.

---

## What the Brand pillar owns

The Brand pillar owns everything that defines what the company looks like, sounds like, and stands for. Brand is the **source of truth for identity**. When Product needs colors for the design system, it imports them from Brand. When Business needs voice guidelines for marketing copy, it imports them from Brand. **Brand assets exist in exactly one place; everyone else wikilinks.**

Concretely, Brand owns:

- **Visual identity** — colors, typography, logo, wordmark, imagery style, illustration style, iconography
- **Verbal identity** — voice, tone, narrative register, microcopy register, naming conventions
- **Asset library** — production exports of logos, wordmarks, favicons, OG images, social cards, brand patterns
- **Foreshadowing discipline** — how the brand evolves predictably across versions; invariants that hold across V1 → V[N]
- **Version-identities** — per-version persona (one-new-persona-per-version rule); ties to product's version scoping
- **Brand guidelines** — the document(s) that capture rules for using brand assets in any context
- **Community standards** — how the brand expects users to interact with it and each other (overlap with Trust & Safety)

Brand **does not** own:
- The product spec stack — that's Product. Brand provides the visual + verbal identity Product applies.
- Marketing copy generation — that's Business (or Brand for narrative-heavy work). Brand provides the voice + tone guidelines marketing copy follows.
- Business model — that's Business. Brand may inform commercial positioning but doesn't define pricing or partnerships.

---

## Typical teams

- **Marketing.** Acquisition, retention, lifecycle. Sits under Brand when the framing is "expressing the brand"; sits under Business when the framing is "operationalizing commercial growth." Most companies have both flavors; the methodology convention is that brand-led marketing sits under Brand.
- **Content.** Editorial, long-form writing, social, video. The content team is Brand's voice incarnate.
- **Community.** Forums, Discord, Slack, in-product community. The team that interfaces with users qua community members rather than qua customers.
- **Design** (overlap with Product). Brand designers (visual systems, brand expression) sit under Brand; product designers (UX, interaction) sit under Product. The design system itself is the overlap artifact.
- **Communications.** PR, exec comms, internal comms. The team that manages how the brand shows up in external + internal contexts beyond marketing.
- **Creative Studio.** Production for high-touch creative work (campaigns, films, photoshoots). Often retainer/agency-supplemented.

---

## Typical roles

**Pillar lead:**
- *To author:* [[../roles/cmo|CMO]] — Chief Marketing Officer. Pillar lead for Brand in most modern companies. (Some companies use "Chief Brand Officer" or "Chief Creative Officer" instead — the role is the same.)

**Senior + management roles:**
- VP Marketing — runs marketing day-to-day
- Brand Director — owns brand identity + guidelines
- Creative Director — owns creative output across channels
- Content Lead / VP Content — owns editorial + content production
- Communications Director — PR + exec + internal comms
- Community Lead / VP Community — community programs + moderation

**Specialist IC roles:**
- Copywriter — long-form + short-form copy
- Brand Designer — visual systems, identity work
- Content Producer — video, podcast, long-form content
- Social Media Manager — channel-specific content + community
- Community Manager — daily community operations
- PR Lead — press + analyst relations

---

## Tier 1 deliverables — every Brand pillar produces these

1. **Brand profile** (`<entity>/brand/profile.md`) — sub-profile describing what Brand is for this entity.
2. **Brand idea-dumps** (`<entity>/brand/_ideas/`) — raw brand thinking, hypotheses, inspirations.
3. **Brand identity** (`<entity>/brand/identity.md`) — colors, typography, logo, wordmark, imagery, iconography. **Canonical for visual identity.**
4. **Brand voice** (`<entity>/brand/voice.md`) — tone, narrative, register, microcopy guidelines. **Canonical for verbal identity.**
5. **Asset library** (`<entity>/brand/assets/`) — production exports of all brand assets.
6. **Foreshadowing invariants** — explicit rules about what about the brand cannot change without re-introducing the audience. (See the reference project's I1–I9 invariants as the canonical example.)
7. **Version-identities document** — per-version persona evolution; the one-new-persona-per-version discipline. (Optional for projects without strong persona discipline; required when the brand evolves significantly across versions.)
8. **Brand narrative** — the company's story, often in 1-paragraph / 1-page / 1-pager variants for different contexts.
9. **Naming policy** — for product names, feature names, internal vocabulary. (Light when the brand has one product; heavier when the brand has many.)

---

## Tier 2 deliverables — per-company-type / per-context

Most Brand work is consistent across product types — a Brand pillar for a software company looks pretty similar to a Brand pillar for a content company. The main Tier 2 splits are by **brand maturity** and **brand context**.

### Early-stage (pre-launch, MVP)

- Brand hypothesis (working theory, not committed)
- One reference asset (logo or wordmark) as proof-of-concept
- Voice samples in the right register
- Defer everything else until the product is in users' hands

### Established (post-launch, scaling)

- Brand guidelines document (full guide, exportable to partners + vendors)
- Asset specifications (file formats, sizing, color profiles, usage rules)
- Brand audit cadence (annual or semi-annual review)
- Trademark + IP protection plan (overlap with Business / Legal)

### Multi-surface (brand spans multiple products or surfaces)

- Cross-surface brand consistency rules
- Per-surface adaptation guidelines (when the same brand needs different application in different products)
- Brand hierarchy (parent brand → sub-brands; e.g., the reference project → the reference project Journey, the reference project News)

### Multi-version (brand evolves across product versions)

- Version-identities document (one-persona-per-version rule applied)
- Foreshadowing invariants (what cannot change between versions without breaking continuity)
- Version-to-version migration guide for brand assets

---

## Tier 3 deliverables — idea-derived

Examples from the reference project's Brand pillar:

- "Caveat fallback issue + Pinyon Script swap decision" — captured as `font-revision-post-v1-ship` idea
- "Foreshadowing mechanism for V1 → V2 audience expansion" — captured as `foreshadowing-mechanism` idea
- "Brand Vol I v2 corrections + Voice Vol II R2 §04 reframing" — captured as a brand-revisions sprint

Tier 3 deliverables surface when conversations reveal brand work that doesn't fit any standard template.

---

## Brand's role in the methodology — the import discipline

**Brand is the source of truth for identity. The methodology mechanism is that other pillars *import* from Brand by wikilink; they never copy or duplicate.**

Concrete examples:

- A design system component library imports `[[brand/identity#typography]]` for the type scale.
- A marketing page imports `[[brand/voice#headline-register]]` for the headline tone.
- An app store listing imports `[[brand/identity#mark]]` for the icon and `[[brand/voice#description-register]]` for the long description.

If Brand changes, the importers reconcile. **The methodology will not accept a duplicate of a brand asset in another pillar's folder.** The deliverable-discovery skill should detect this and flag it.

### Why this matters

The reference project V1 brand revert (2026-05-13) happened in part because a system font cascade was treated as "the font" when Brand had specified an explicit web font. The cascade was effectively a duplicate of brand identity in Product (the CSS) that drifted out of sync. The import discipline is the fix: Product imports from Brand; the Brand authority is single-source.

---

## Cross-pillar overlap zones (Brand side)

How Brand participates in overlap zones with Product and Business:

- **Brand × Product → Design System.** Brand owns visual tokens + voice; Product owns interaction + behavior; the design system is the shared artifact, **canonical-for: design-system**, lives under Product but imports Brand identity by wikilink.
- **Brand × Product → Developer Experience.** Brand owns dev portal aesthetic + developer-facing voice; Product owns SDK + API docs. Cross-references both ways.
- **Brand × Business → Sales Collateral.** Brand owns voice + identity; Business owns commercial framing + audience targeting. Sales collateral lives under Business but imports Brand assets.
- **Brand × Business → Partnership Materials.** Same shape as sales collateral. Brand assets + voice; Business commercial framing.
- **Brand × Business → PR Strategy.** Brand owns narrative arcs + exec voice; Business owns analyst + investor + press relationship management.
- **Brand × Product + Business → Trust & Safety.** Brand owns community standards + voice for moderation messaging; Product owns moderation tooling; Business owns legal + policy posture.

---

## Methodology mechanisms that touch Brand

- **Skills:** `brand-pillar` (auto-loads on Brand work), `version-identity` (the one-persona-per-version discipline), `foreshadowing-audit` (per-version brand-evolution check), `articulation-closure` (Brand-pillar deliverable matrix's gating), `deliverable-discovery` (catches Brand Tier 3 candidates).
- **Hooks:** `pre-commit` (surfaces brand-load-bearing files for explicit confirmation), `pre-deploy` (checks brand assets are present in code per the v3.2 amendment about explicit font loading).
- **Selective slash commands:** `/foreshadowing-audit` (runs the V[N] → V[N+1] check on demand).

---

## Related per-role files

- *To author:* [[../roles/cmo|CMO]] — Brand pillar lead

---

## Status

- **2026-05-14:** Initial authoring. Tier 1 + Tier 2 surfaced; Tier 3 illustrated from the reference project examples. CMO role file queued.
