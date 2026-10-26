---
type: methodology-template
ai-model: claude
source: hybrid
created: 2026-05-11
last-reviewed: 2026-05-11
authorship: hybrid
authors: [the owner]
scope: global
parent-methodology: "[[SAD_SKILL_v3]]"
pillar: brand+product
tags: [methodology, template, ux, ui, design, deliverables, brand-pillar, product-design, priority-tiering]
---

# UX/UI Deliverables Inventory + Priority Tiering

> A methodology-level template for scoping design work on any SAD project. Lives at the intersection of the **brand pillar** (visual identity, voice, tokens) and the **product pillar** (wireframes, flows, interaction patterns). Per the vault constitution: brand owns identity; product.design applies identity to functional surfaces.
>
> Any project using this template should produce a *project-specific deliverables plan* that maps these tiers onto the project's version roadmap. See `projects/<project>/_ideas/<version>-ux-ui-deliverables-plan-<date>.md` for the pattern.

---

## The four-tier priority system

Every deliverable below is annotated with a tier. The tier tells you *when in the product's lifecycle this deliverable is most useful*.

- **Tier 1 — Foundational.** Must exist before V1 implementation can sensibly start. Authoring is cheap relative to value. Skip these and the V1 build suffers from inconsistency, accessibility gaps, or content-drift problems that are expensive to fix later.
- **Tier 2 — Essential.** Required for a polished V1 *or* strongly needed for V2. Authoring cost moderate; value high. Most projects ship Tier 1 + a subset of Tier 2 for V1; the rest of Tier 2 fills in early V2.
- **Tier 3 — Polish.** Improves quality but not required for ship. Most projects author these between V2 and V3 as the product matures. Skipping them in V1 is fine; skipping them forever is not.
- **Tier 4 — Mature.** Only useful when the product has reached scale, has a team, or has specific operational needs (user testing, multilingual, advanced accessibility). Most solo or small-team projects can defer these indefinitely.

A common useful pattern: **commit to all Tier 1 deliverables before any V1 implementation begins; defer Tier 2 to V1 polish phase or V2; explicitly flag Tier 3/4 with version targets so they don't get forgotten.**

---

## A. Information architecture

The foundational layer. What exists and how it connects. These are *cheap* relative to their value; authoring them before implementation prevents a category of expensive structural rework later.

- **Sitemap.** Page-level inventory and hierarchy. *Tier 1.*
- **User flows for key journeys.** Step-by-step paths through each F1–Fn flow defined in PRODUCT_SPEC. *Tier 1.*
- **Information taxonomy.** How content is categorized (by entity type, by jurisdiction, by topic). User-facing reflection of the DATA_MODEL_SPEC. *Tier 1.*
- **URL structure / routing schema.** Stable URLs from V1 onward (renaming URLs later breaks the web). *Tier 1.*
- **Navigation structure.** Primary nav, secondary nav, footer. What's always reachable. *Tier 1.*
- **Breadcrumb / wayfinding patterns.** Where the user is and how they got here. *Tier 2.*
- **Search architecture.** Index strategy, query parsing, ranking, faceted filters. *Tier 2 or Tier 3 depending on whether V1 needs search.*

---

## B. Visual design system

The vocabulary every screen uses. Author once with tokens; reuse everywhere. Brand-pillar-owned; consumed by product/design.

- **Design tokens — color.** Primary, secondary, neutral ramps, semantic colors (success, warning, error, info), brand-specific accents. *Tier 1.*
- **Design tokens — typography.** Display, body, mono. Type scale. Line-heights. Letter-spacing. *Tier 1.*
- **Design tokens — spacing.** Spacing scale (4px / 8px / 16px / etc.), gutters, density. *Tier 1.*
- **Design tokens — radii, shadows, elevation.** *Tier 2.*
- **Design tokens — motion timing.** Duration, easing curves, transition primitives. *Tier 2 if motion is part of V1; Tier 3 otherwise.*
- **Color modes (light / dark).** Decide whether to ship both in V1. If tokens are built from the start, the marginal cost of supporting both is low. *Tier 2.*
- **Iconography.** Bespoke or licensed (Phosphor, Lucide, Tabler). License or fork a set; extend as needed. *Tier 2.*
- **Imagery style guide.** Photo treatment, cropping rules, when to use imagery vs. illustration. *Tier 2.*
- **Illustration style.** Only if the product uses original illustrations. *Tier 3.*
- **Animation principles.** Subtle vs. expressive; functional vs. delightful; when motion signals state change. *Tier 3.*

---

## C. Component library

The reusable UI primitives. Live at the intersection of brand and product.

- **Buttons.** Primary, secondary, ghost, danger, link-as-button. States: default, hover, active, disabled, focused, loading. *Tier 1.*
- **Inputs.** Text, textarea, search, address, select, checkbox, radio, switch. *Tier 1.*
- **Cards.** Generic card primitive; project-specific card variants (entity cards, content cards). *Tier 1.*
- **Navigation components.** Top nav, side nav, tabs, breadcrumbs. *Tier 1.*
- **Forms.** Form layout, label positioning, validation patterns, error messages, submission feedback. *Tier 1.*
- **Modals / dialogs.** When to use; consistent dismissal; layered modal patterns. *Tier 2.*
- **Toasts / notifications.** Transient feedback. *Tier 2.*
- **Tooltips / popovers.** Hover or click-triggered. *Tier 2.*
- **Badges.** Status, count, label. *Tier 2.*
- **Avatars / profile media.** Person avatars, placeholders, group avatars. *Tier 2.*
- **Tables.** Data display, sorting, filtering, pagination. *Tier 2 if needed for V1; otherwise Tier 3.*
- **Tabs / segmented controls.** Switching between views in a constrained space. *Tier 2.*
- **Accordions / disclosure widgets.** Progressive disclosure. *Tier 3.*
- **Sliders / range inputs.** *Tier 3.*
- **Date and time pickers.** *Tier 3 unless V1 needs them.*

---

## D. Wireframes and mockups

Where the visual design and IA meet specific pages.

- **Low-fidelity wireframes for every V1 page.** Grey-box layouts; resolve *what goes where* before *what it looks like*. Fast and cheap; strongly recommended before any high-fidelity work. *Tier 1.*
- **Mid-fidelity wireframes.** Real text, real components, no final visual styling. Resolves microcopy and layout problems. *Tier 2.*
- **High-fidelity mockups.** Pixel-perfect renderings. Hand-off-ready. *Tier 2 or Tier 3.*
- **Interactive prototypes.** Clickable wireframes/mockups. Useful for user testing and resolving interaction questions before code. *Tier 3.*

---

## E. Content and copy

What words appear, in what voice. Often underspecified; often the difference between flat and alive.

- **Voice and tone guide.** Voice attributes (e.g., "patient, plain, civically serious"); do/don't pairs; sample copy at three lengths (button label, section header, paragraph); word-list (preferred and banned terms). *Tier 1.*
- **Microcopy for V1 critical paths.** Button labels, form helpers, placeholder text, link text. *Tier 1.*
- **Empty states.** What the user sees when they have no data yet, no results, no items. *Tier 1.*
- **Loading states.** Skeletons, spinners, progress indicators. Sets perceived performance. *Tier 1.*
- **Error states / error messages.** What the product says when things go wrong. *Tier 1.*
- **Onboarding flow copy.** First-time-user experience — what does the product say, ask, explain. *Tier 2.*
- **Help / FAQ content.** Explanations for the parts of the product that need explaining. *Tier 2.*
- **Notification copy.** In-app alerts, push notifications. *Tier 3.*
- **Email templates.** Transactional emails, digests, alerts. *Tier 3.*

---

## F. Surface-specific designs

Each surface in the product gets its own design problem. The list here is *generic categories*; each project enumerates its specific surfaces.

- **Page templates per surface type.** Article template, profile template, feed template, search results template, dashboard template, etc. *Tier 1 for V1 surfaces; Tier 2-4 for later-version surfaces.*
- **Special UX moments.** Verification flows, onboarding, settings, billing, etc. *Tier 2.*
- **Comparison or contrast views.** Side-by-side displays, before/after, accountability comparisons. *Tier 2 or Tier 3 depending on V1 scope.*

---

## G. Interaction patterns

The reusable behaviors that show up across pages.

- **Form interaction patterns.** Validation timing, error display, submission feedback, multi-step wizards. *Tier 1.*
- **Search behavior.** Autocomplete, recent searches, query parsing, result presentation. *Tier 2.*
- **Filter / sort patterns.** Especially on feeds and search results. *Tier 2.*
- **Pagination / infinite scroll / load-more.** Pick one philosophy; apply consistently. *Tier 2.*
- **Modal / dialog patterns.** When modals appear; consistent dismissal; layered modal handling. *Tier 2.*
- **Tooltip / hover behavior.** Especially for jargon explanations. *Tier 2.*
- **Permalinks and deep-linking.** Stable URLs for every post, section, article. *Tier 1.*

---

## H. Accessibility

Not optional. For products with civic or public-good ambitions, accessibility is moral commitment, not feature.

- **Accessibility checklist.** Project's commitment level (WCAG AA, AAA, etc.); how it's enforced. *Tier 1.*
- **ARIA / semantic markup guidelines.** *Tier 1.*
- **Keyboard navigation spec.** Every interaction reachable without a mouse. *Tier 1.*
- **Color contrast verification.** WCAG AA minimum; AAA for body text where feasible. *Tier 1.*
- **Focus management.** Visible focus rings; logical tab order; focus traps for modals. *Tier 1.*
- **Text alternatives strategy.** Alt text rules for images; transcripts for audio/video. *Tier 1.*
- **Reduced-motion support.** Respect `prefers-reduced-motion`. *Tier 2.*
- **Screen-reader testing.** Periodic audit with NVDA, VoiceOver, JAWS. *Tier 2.*
- **Specialized accessibility audits.** Third-party WCAG audit, certification work. *Tier 4.*

---

## I. Responsive / device strategy

What devices the product supports and how.

- **Responsive breakpoints.** Mobile-first vs. desktop-first; named breakpoint sizes. *Tier 1.*
- **Mobile-first patterns.** Bottom nav vs. hamburger; mobile feed scrolling; mobile-specific affordances. *Tier 1 if mobile-first; Tier 2 otherwise.*
- **Touch interaction patterns.** Button sizes, no-hover-states, gesture support. *Tier 2.*
- **Desktop-specific patterns.** Hover states, right-click menus, keyboard shortcuts. *Tier 2.*
- **PWA / app-shell considerations.** Installability, offline behavior. *Tier 3.*
- **Native app considerations.** If a native app is planned, the shared design system surfaces. *Tier 3+ depending on roadmap.*

---

## J. Handoff and documentation

The artifacts that translate design to code, and that future contributors will read.

- **Designer handoff specs.** Component specs, measurements, redlines. *Tier 2 if team is multiple people; Tier 3 if solo.*
- **Component documentation.** What each component is, when to use it, what props it accepts. *Tier 2.*
- **Token export.** `tokens.json` or equivalent, consumable by Tailwind / CSS-in-JS / design system tooling. *Tier 2.*
- **Asset export.** Icon SVGs, image assets, illustration sources. *Tier 2.*
- **Implementation notes.** Edge cases, browser quirks, accessibility nuances. *Tier 2 if team is multiple people.*
- **Design system documentation site.** A live, queryable design system (Storybook or similar). *Tier 3.*

---

## K. Validation and testing assets

Often forgotten until needed.

- **User test scenarios.** Tasks given to participants; what's being learned. *Tier 3.*
- **Usability test scripts.** Moderator script; observation framework. *Tier 3.*
- **Survey questions.** Post-launch feedback collection. *Tier 3.*
- **Quantitative analytics framework.** Events to track; conversion funnels. *Tier 3.*

---

## L. Internationalization (i18n)

Cross-cuts everything; worth flagging as its own category.

- **i18n architecture decision.** Will the product support multiple languages? When? *Tier 1 if i18n is a V1 commitment; Tier 4 otherwise.*
- **Locale-aware design patterns.** Right-to-left support, number/date formats, currency. *Tier 2 if i18n is in scope.*
- **Translation workflow.** Source-of-truth for strings; translator handoff. *Tier 2-3 if i18n is in scope.*

---

## How to use this template

1. **At Phase 1A or Phase 1B**, copy this inventory into a project-specific deliverables plan at `projects/<project>/_ideas/<version>-ux-ui-deliverables-plan-<date>.md`.
2. **Apply the tiering to your project's specific scope.** Some Tier 2 items become Tier 1 for your project (e.g., if your product is fundamentally search-based, search architecture is Tier 1 for you).
3. **Map deliverables to versions.** V1 = Tier 1 + the subset of Tier 2 that's load-bearing for your V1 scope. V2 = remaining Tier 2 + the Tier 3 items that polish V1. Etc.
4. **Add project-specific surface designs** in category F. These are the surfaces unique to your product (e.g., the reference project's accountability comparison view, or another project article-by-FORD-domain navigation).
5. **Track authoring status per deliverable.** Each deliverable becomes a graduate-able idea, marked `idea-status: graduated` when its artifact is authored.
6. **Re-tier as the product matures.** A deliverable that was Tier 3 in V1 may become Tier 1 for V2 once context changes.

---

## Cross-references

- **Brand pillar deliverables** in the vault constitution (`<home>/Documents/CLAUDE.md`) include identity.md, voice.md, identity assets. These align with Tiers 1–2 of this template's *visual design system* and *content* categories.
- **Product.design deliverables** (`product/design/`) host the wireframes, flows, component library, and accessibility specs from this template.
- **SAD Phase 1B** is when this template is typically first applied. The deliverables plan is itself a Phase 1B artifact.
- **SAD Phase 2** consumes the Tier 1 deliverables as inputs to implementation.
- **SAD Phase 3 (verification)** validates the accessibility and interaction-pattern deliverables against real implementation.

---

## Changelog

- 2026-05-11: Template authored as part of the reference project UX/UI deliverables planning session. Four-tier priority system established. Generic, project-agnostic. Anchored to SAD methodology v3.
