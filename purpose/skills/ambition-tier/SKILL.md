---
type: knowledge
tags: [everything-ecosystem, skills, ambition-tier]
ai-model: claude
created: 2026-05-15
source: hybrid
name: ambition-tier
description: >
  Run Phase 0Δ — the Project Ambition Gate. Declare the project's ambition tier
  (hobby / side-project / open-source-tool / venture / enterprise) before
  Phase 0B research begins. The tier determines the depth and breadth of
  research that follows; hobby-tier projects don't need venture-tier research,
  and venture-tier projects can't skip it. Tier is stored in the entity profile
  frontmatter and may evolve as the project matures. Per SAD v3.3+ amendment §29.
  MANDATORY TRIGGERS: ambition tier, project ambition, hobby vs venture, what
  scale is this, 0Δ, ambition gate, hobby project, side project, open source
  tool, venture, enterprise, how much research do we need, research depth,
  /ambition.
---

# Ambition Tier Skill

The methodology workflow for Phase 0Δ — the Project Ambition Gate. Declares the project's ambition tier before Phase 0B research begins.

## Why ambition-tier exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §29]], the methodology had implicitly assumed every SAD project is heading toward production scale. That's not true; scale matters; scale determines research depth.

Without declaring the tier:

- **Hobby-tier projects drown in venture-tier research** (over-researching a weekend hack).
- **Venture-tier projects skip critical research** ("we know the market") and miss load-bearing context.

Naming the tier prevents both failure modes.

## When to invoke

This skill runs at **Phase 0Δ — between Triage and Research**. It runs once per project at project start, and re-runs when the project's ambition evolves (e.g., a hobby becomes a side project; a side project becomes a venture).

Triggers:

- After triage closes and before research begins
- When the operator asks "how much research do we actually need?"
- When a project's scale is being reconsidered
- When the entity profile's `ambition-tier` field needs to be set or updated

## The five ambition tiers

### 1. Hobby

**Description:** Personal exploration. Built for the operator's own use or curiosity. Not intended to scale, ship publicly, or be commercial.

**Research depth:** Light. Prior-art check. Existence check. Minimal context. No competitor breakdown. No market analysis.

**Example deliverables required:**
- Idea-dump (1 file is fine)
- Light vision (paragraph; not VISION_SPEC)
- Implementation as code; minimal spec
- No required brand or business pillar work

**Typical signs:**
- "I just want to mess around with this"
- "It's for me"
- "I'm not trying to scale this"

### 2. Side project

**Description:** Personal but with intent to ship. May go public, may have a small user base, but not actively pursuing commercialization or growth.

**Research depth:** Moderate. Prior art. Technical feasibility. Light competitor scan. Target-user identification (even if "users like me").

**Example deliverables required:**
- Idea-dump (multiple if warranted)
- Light vision spec
- Version spec with explicit V1 scope
- Light spec stack (PRODUCT_SPEC at minimum; data/impl/behavioral/verification as code complexity warrants)
- Brand: identity hypothesis (logo + voice register)
- Business: light positioning; no formal business model

**Typical signs:**
- "I want to ship this publicly but not run it as a business"
- "It's a personal project I want to be proud of"
- "I might charge for it eventually but not now"

### 3. Open-source tool / public good

**Description:** Built to be used + extended by others. The community is the primary "audience" rather than commercial users. Sustainability via grants, donations, or sponsorships rather than commercial revenue.

**Research depth:** Substantial. Prior art (especially other OSS in the space). Technical feasibility. Community-fit assessment (is there an audience for this OSS work?). License + governance research. Contributor landscape (who else is working in this space?).

**Example deliverables required:**
- Full spec stack (the spec IS the product for spec-first OSS)
- Idea map + research synthesis
- VISION_SPEC + VERSION_SPEC
- License decision (with rationale)
- Governance model (BDFL / multi-maintainer / foundation)
- Contributor docs
- Sustainability hypothesis
- Brand: light; identity + voice for OSS audience
- Business: sustainability model (grants, donations, sponsorships, founder-funded, optional commercial)

**Typical signs:**
- "I want others to build on this"
- "This should be a public good"
- "several product repos, methodology repos"

### 4. Venture / business

**Description:** Built to scale commercially. Has paying customers (or plans to), has growth ambitions, has investors (or plans to).

**Research depth:** Full. Market analysis. Competitor breakdowns. Sizing (TAM/SAM/SOM). Customer research (interviews, surveys, behavior data). Pricing landscape. Regulatory + legal scan. Partnership opportunities. Distribution channels.

**Example deliverables required:**
- Full spec stack
- Full Articulate lane traversal (0A → 1C)
- Articulation closure inventory (per [[../articulation-closure/SKILL|articulation-closure skill]])
- All three pillars active (Product + Brand + Business)
- Business model + pricing
- Sales motion design (if applicable)
- Investor materials (pitch deck, financial model, data room)
- Legal posture (incorporation, IP, ToS, privacy)

**Typical signs:**
- "I'm raising capital for this"
- "This will be a company"
- "I'm trying to find PMF"

### 5. Enterprise

**Description:** Built to sell to enterprise customers. Layered on top of venture-tier expectations, with additional concerns specific to enterprise sales motion.

**Research depth:** Venture-tier + enterprise-readiness research. Security + compliance (SOC 2, GDPR, HIPAA, etc.). Procurement patterns (RFPs, vendor onboarding). Integration landscape. Sales motion (long cycles, multiple stakeholders). Partnership landscape (system integrators, channel partners).

**Example deliverables required:**
- Everything from Venture tier
- Security policy + compliance roadmap
- Enterprise sales playbook
- Reference architecture for enterprise deployment
- Partnership program design
- RFP response template

**Typical signs:**
- "Our target customer is enterprise"
- "Our sales motion is multi-stakeholder"
- "We need SOC 2 / GDPR / etc."

## How to run the ambition gate

When this skill is loaded, the AI should:

1. **Surface the current state.** Read the entity profile for any existing `ambition-tier` declaration.
2. **Walk the tiers with the operator.** Don't assume; ask. The right tier is the one the operator commits to, not the one the AI infers.
3. **Probe the commitment.** Press on the tier choice gently:
   - "You said venture — what evidence do you have that this is venture-scale? Do you have a market thesis?"
   - "You said hobby — but you've also said you want users. That sounds more like side-project."
   - The probe is in office-hours-mode posture (sharp), but the goal is calibration, not critique.
4. **Record the tier.** Update the entity profile frontmatter: `ambition-tier: <tier>`. Add changelog entry if tier changed from a previous value.
5. **Surface what this tier implies.** What research depth is appropriate? What deliverables are required? What can be deferred?
6. **Update the orchestration HTML.** Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], the project's orchestration HTML reflects the ambition tier visibly.
7. **Close the gate.** Confirm the tier; move to Phase 0B research (which the tier has now calibrated).

## Backfill / missing assets

Follow [[../_patterns/gate-backfill|gate-backfill]]. Skill-specific notes:

1. **Detect** — entity profile missing `ambition-tier` while research/build runs.
2. **Declare retrospectively** — tier matches *current* commitment.
3. **Recalibrate** — trim or expand in-flight work; log over/under-build.
4. **Freeze** — no venture deliverables on a hobby declaration (or reverse)
   without explicit tier change + changelog.
5. **Exit** — `ambition-tier` set; changelog; orchestration HTML updated.

## Tier evolution

Tiers can evolve. Common patterns:

- **Hobby → Side project.** "I want to share this with friends" — slight escalation.
- **Side project → Open-source tool.** Project gains contributors; community emerges.
- **Side project → Venture.** Project finds early signal; operator decides to pursue commercially.
- **Venture → Enterprise.** Product traction surfaces enterprise interest; pivot.
- **Open-source tool → Open-source + commercial.** Sustainability model adds commercial offering.

Tier de-escalation also happens:

- **Venture → Side project.** Couldn't find PMF; operator decides to keep it as a personal project rather than abandoning it.
- **Open-source tool → Archive.** Project ages out; community moves elsewhere.

Each evolution is logged in the entity profile changelog with `lifecycle-ambition-change` entries.

## What ambition-tier is NOT

- **Not a value judgment.** Hobby tier isn't lesser than venture tier. They're different shapes for different work. The methodology supports all five.
- **Not permanent.** Tiers evolve. The declaration is for *current* scale, not forever.
- **Not a substitute for vision.** The vision tells you what the project could be at full scope. The tier tells you what to commit to *for this version*.

## Relationship to other skills

- [[../triage/SKILL|triage]] runs before ambition-tier
- [[../friend-mode/SKILL|friend-mode]] for vision expansion (0C) — friend-mode helps see what's possible at the higher tiers
- [[../office-hours-mode/SKILL|office-hours-mode]] for the tier-commitment probe — sharp framing about what the project actually is
- Research (Phase 0B) reads `ambition-tier` to calibrate depth

## Status

- **2026-05-14:** Initial authoring per §29 amendment.
