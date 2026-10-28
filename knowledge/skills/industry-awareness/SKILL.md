---
type: knowledge
tags: [everything-ecosystem, skills, industry-awareness]
ai-model: claude
created: 2026-05-16
source: hybrid
name: industry-awareness
description: >
  Map the operator's terminology to industry-standard terminology and surface
  existing industry solutions BEFORE the operator reinvents the wheel. Catch
  the pattern where a non-industry-native operator describes a workflow problem
  in their own terms, designs a custom solution, and only later discovers that
  the pattern is well-trodden + has mature tooling. Auto-loads whenever the
  operator describes a workflow, proposes a new internal tool, introduces
  new terminology for a concept, discusses managing complexity, or asks
  "what's the industry term for" / "is there software that does this" /
  "how do enterprises handle this." Web-search-enabled; industry tooling
  changes rapidly. Posture: friend when surfacing options + alternatives;
  office-hours when challenging "should we build this?" assumptions.
  MANDATORY TRIGGERS: industry term, industry standard, what's this called,
  what software, what tool, existing solution, prior art, are we reinventing,
  is there a tool for, what do they call this, best practice, common pattern,
  standard workflow, enterprises use, how do companies handle, jira, linear,
  notion, figma, github, asana, productboard, confluence.
---

# Industry Awareness Skill

The methodology mechanism that prevents the operator from reinventing solved problems due to lack of industry exposure. Authored 2026-05-15 after a multi-session pattern surfaced: The owner (a non-industry-native operator) repeatedly described workflow problems in their own terms + designed custom solutions, only to discover later that industry-standard terminology + tooling already solved them.

## Why this skill exists

Non-industry-native operators have a real, structural blind spot: they don't know what they don't know. They describe problems using their own framing (often sharper than industry's), then design solutions from first principles. Sometimes the result is genuine innovation. Often, the result is a custom version of something that's been a $1B+ industry for a decade.

Examples from past sessions:

- **The operator console mockup ≈ Linear.** The operator designed a "project-level view" with topbar / sidebar / pillar cards / agent panel / activity feed / decisions log. Linear has shipped this exact shape since 2019. 30%+ of tech teams already migrated to it. The harness was structurally a hand-rolled, less-functional Linear.

- **"Sprint" terminology mismatch.** The operator used "sprint" to mean "named work unit." Industry uses "sprint" to mean "time-boxed delivery cycle (1–2 weeks)." That usage was closer to **epic** or **initiative**. This caused the "sprint plan" doc to feel muddled — it was actually an *epic plan*.

- **V1 enumeration → backlog.** The 250-row enumeration is structurally an issue backlog. Linear, Jira, ClickUp, Notion, and many others have managed backlogs for ~15 years.

- **Status semantics on enumeration rows ≈ workflow states.** OPEN → TRIAGED → IN-SPRINT → DONE is the canonical issue workflow. Industry tools manage this natively + automatically.

- **"Orchestration HTML" ≈ project dashboards.** Project dashboards have existed since the 1990s; modern variants (Linear views, Notion databases, Asana boards) handle this as their primary feature.

In every case, the operator's framing was thoughtful + the methodology contribution was real. But the *delivery vehicle* could have been an off-the-shelf tool, freeing the operator's attention for what actually was novel (the methodology, the brand discipline, the version-identities work).

The pattern: **operator's framing matters; industry tools handle the rest.** This skill enforces that distinction.

## When to invoke

This skill should auto-load when:

- The operator describes a workflow pattern using their own terminology
- The operator proposes to build a custom tool / dashboard / system
- The operator introduces new terminology for a concept (especially methodology terminology)
- The operator discusses managing complexity, scaling teams, or hiring
- The operator references discrete domains (project management, design, content, accounting, etc.) without naming the industry tools
- The user explicitly asks "what's the industry term for ___" or "is there software that does ___" or "how do enterprises handle ___"

It should NOT load when:

- The operator is in vision-expansion mode (0A / 0C) — let novel framing emerge first; check it against industry later
- The operator's framing is genuinely novel (e.g., the V1/V2/V3 consumption-interaction-communication framing — that's specific to this operator; industry doesn't have a parallel)
- The operator has explicitly decided to build custom for documented reasons (not lack-of-knowledge reasons)

## The terminology mapping workflow

When the operator uses non-standard terminology, the skill produces a mapping:

```
| Operator's term | Industry-standard term | Notes |
|---|---|---|
| Sprint (loosely)  | Epic / Initiative      | Sprint is reserved for time-boxed cycles |
| Pillars           | Product/Brand/Business as functional areas | Common framing |
| Enumeration       | Backlog                | Backlog is the industry term |
| Pillar products   | Product portfolio      | "Portfolio" is the industry term for multi-product |
| Articulation      | Specification / Discovery / Definition | Multiple industry terms |
| Articulation closure | Definition of Ready / Pre-development gate | Loosely equivalent |
| FE↔BE communication layer / “backend first with FE contracts” | API-first / contract-first / design-first | Assets: OpenAPI, AsyncAPI, fixtures; see contract-first skill |
| Three pillars     | Functional areas / Business functions | Industry agnostic |
```

The mapping isn't a demand to switch. It's information so the operator can:
- Communicate with industry-native collaborators
- Search for tools / patterns / prior art using the right terms
- Choose deliberately when to keep custom terms vs adopt industry ones

Some custom terms are worth keeping. The version-identities discipline (consumption / interaction / communication) is more precise than industry's "phased rollout" framing. Foreshadowing as a brand invariant is sharper than "brand consistency." These are net-additions to the operator's vocabulary; they should stay.

## The stack-recommendation workflow (per §44 amendment)

A fourth use case, added 2026-05-16. Invoked proactively rather than reactively. The agent environment or operator can invoke this to ask:

> **Given pillar X with current state Y and missing capability Z, recommend the industry tool(s) that fill the gap.**

Example invocations:

- Brand pillar needs visual asset management → recommend Figma + asset library
- Business pillar needs financial tracking → recommend QuickBooks / Xero / Stripe Billing
- Product pillar needs error tracking → recommend Sentry / Datadog / Bugsnag
- Methodology layer needs decision-doc storage → recommend Notion / Obsidian / GitBook

**Output:** same shape as the prior-art surface (3–5 dominant tools with audience fit + pricing + AI integration + reviewer assessments) but proactively triggered rather than reactively.

**MCP-availability noted.** When recommending tools, include each tool's MCP-availability status — operators should prefer MCP-enabled tools where they fit equally well, since the harness can connect to them directly.

## The prior-art check workflow

When the operator proposes building something, the skill runs a prior-art check:

1. **Restate the problem in industry terms** (from the terminology mapping).
2. **Web-search for industry solutions** with the restated terms.
3. **Identify the 3–5 dominant tools / patterns** that solve this problem.
4. **For each, surface:**
   - What they do
   - Their primary audience
   - Their pricing model
   - Their AI integration status (matters in 2026)
   - Recent reviewer assessments (last 12 months)
5. **Present the build-vs-adopt frame** (next section).

The skill is web-search-enabled because industry tooling moves fast. Recommendations made in 2024 are often stale by 2026.

## The build-vs-adopt decision framework

The skill doesn't always recommend adopt. Sometimes building custom is right. The frame:

**Strong reasons to ADOPT (off-the-shelf):**
- The pattern is mature (5+ years in market)
- Multiple competing solutions exist (mature category)
- The operator's customization needs are minor + the tools accommodate them
- The operator's time is better spent on what's actually novel
- The tool's AI integration is already mature
- Team scaling is likely (off-the-shelf tools are team-ready)

**Strong reasons to BUILD (custom):**
- The methodology / approach is the actual product (not just internal use)
- Existing tools structurally cannot represent the methodology
- The operator is the customer + has unusual workflow constraints
- The pattern is genuinely novel (no prior art exists)
- The build is small enough to be cheap

**Hybrid (most common):**
- Adopt off-the-shelf for the operational layer (PM, ticketing, dashboards)
- Build custom for the methodology-specific layer (the record conventions, the venture template, the brand discipline)
- Connect them via integrations (MCPs, APIs, exports)

In one past case: Linear handles the operational layer; Obsidian handles the methodology + knowledge layer; the operator console (eventually) handles the methodology-specific orchestration if Linear genuinely doesn't fit.

## Output formats

Three deliverables this skill produces, depending on what's needed:

### Format 1 — Terminology bridge

A side-by-side table mapping operator terms to industry terms (see "terminology mapping workflow" above).

### Format 2 — Prior-art surface

A walk through the 3–5 dominant industry tools / patterns for the operator's problem, with:
- One-paragraph descriptions
- Audience fit notes
- Pricing summary
- Recent reviewer assessments (cited)
- A recommendation (or "deliberately don't adopt; build because X")

### Format 3 — Build-vs-adopt analysis

For a specific proposed build, an explicit cost-benefit:
- What you'd be replicating (the existing tool's features)
- What you'd lose by adopting (genuine customization needs)
- What you'd gain by building (long-term methodology fit)
- Cost estimates (operator's time + opportunity cost)
- Recommendation with rationale

## Posture

This skill switches posture based on what's happening:

- **Friend mode** when surfacing options — the operator is exploring; the skill helps broaden their view + introduce industry context they didn't know existed
- **Office-hours mode** when challenging "should we build this?" assumptions — the skill presses the operator on whether the proposed build is genuinely novel or is restating a solved problem

Default posture: friend (most queries are exploratory). Switch to office-hours when the operator is about to invest substantial time in a custom build that has a clear off-the-shelf alternative.

## Proactivity calibration (per §45 amendment)

The skill defaults to **LOW proactivity**. The operator's philosophy: struggle with something first to understand the pain point before being handed a solution. Premature solution-handing prevents deep understanding.

**Default behavior — DO NOT proactively:**

- Surface alternatives unless operator has clearly hit a pain point
- Recommend tools for problems the operator hasn't yet articulated
- Map operator's terms to industry equivalents on first mention
- Push the operator toward off-the-shelf when they're still exploring

**HIGH proactivity triggers (when the skill SHOULD surface things):**

- Operator explicitly invokes the skill ("what's the industry term for X?" / "is there a tool for Y?" / "how do enterprises handle Z?")
- Operator describes a clear pain point ("this is slow" / "this is expensive" / "this is breaking")
- Operator is about to invest substantial time in a custom build with obvious alternatives — surface, framed as "here's prior art for your awareness; your call"
- System-detected pain point (cost / time / quality threshold crossing — even if operator hasn't articulated)

**Two intensities of surfacing:**

- **"Alternative exists"** — lower-stakes; OK to mention briefly even at default proactivity ("by the way, this is sometimes called X in industry"). Drop in, move on.
- **"Recommend a specific tool / decision"** — higher-stakes; only when operator is asking or has clearly hit pain.

**Knowledge-base awareness:** track what the operator has demonstrated familiarity with. Don't repeat surface-level recommendations for things they clearly already know.

## Cost-aware integration hierarchy (per §45 amendment)

When recommending how to integrate with a tool/service, prefer in cost order:

| Mode | Token cost | Latency | When preferred |
|---|---|---|---|
| Local file read | ~zero | near-zero | State we own |
| **CLI** | low | fast | **Default when service has a mature CLI** |
| MCP | medium-high | slower | When AI-typed interaction is core to the workflow (bulk creation from natural language, agent workflows) |
| API direct | medium | medium | When no CLI / MCP, typed interaction needed |
| Scraping / manual | high | slowest | Last resort |

**Correction to earlier guidance:** prior versions of this skill said "MCP-first integration posture." That's wrong. The correct posture is **CLI-first where the service has a usable CLI; MCP only where AI-typed interaction is the core workflow.**

When recommending tools, surface CLI availability alongside MCP availability. Operators who can use CLI should generally prefer it for daily operations.

## What this skill is NOT

- **Not a "always adopt industry" skill.** Sometimes building custom is right (the methodology itself; the brand voice; the version-identities discipline). The skill respects when the operator's framing is genuinely novel.
- **Not a tool advertisement.** The skill surfaces tools with honest assessment, including limitations + costs, not marketing copy.
- **Not a substitute for the operator's judgment.** The final decision is the operator's. The skill provides context.
- **Not focused on a single industry.** Software / PM / design / content / accounting / hiring / sales — every domain has industry-standard tooling. The skill applies broadly.

## How this skill prevents the operator-console pattern

The operator console (then called the harness) was a 4-hour mockup that demonstrated "what work is being done across multiple projects." If this skill had loaded when the harness was being designed, it would have:

1. **Mapped the terminology:** "project view," "agent panel," "decisions log," "roadmap" → these are all standard PM tool features.
2. **Run prior-art check:** Linear, Jira, ClickUp, Asana, Notion, Productboard — all surface this exact shape.
3. **Surfaced specific tools:** Linear's project view ≈ what was being mocked up.
4. **Produced the build-vs-adopt frame:** "Build = 4-hour mockup + months to feature parity. Adopt = sign-up + import in an afternoon. Methodology fit: 80% Linear, 20% needs custom."
5. **Recommended hybrid:** "Use Linear for operational layer; defer the operator console; revisit if Linear genuinely doesn't fit after real use."

The operator console mockup is still useful — as design substrate, as the eventual "what we'd build if we ever need to differentiate from Linear." But it wasn't urgent and shouldn't have consumed primary attention until the alternative was understood.

## Related skills

- [[friend-mode]] / [[office-hours-mode]] — posture skills this one switches between
- [[deliverable-discovery]] — finds missing deliverables in templates; different from finding industry solutions for existing workflows
- [[template-generation]] — generates new templates; this skill checks whether the template is needed at all
- [[cross-pillar-tradeoff]] — when an industry tool choice has cross-pillar implications (Product wants Linear; Business wants Jira; resolve via tradeoff)

## When to web-search

Web search is core to this skill. Always search when:

- The operator names a specific tool ("Jira") — search recent (last 12 months) reviews + comparisons
- The operator describes a category ("project management software") — search current market leaders
- The operator asks about a workflow pattern — search if industry has a name for it
- The operator is about to invest in building — verify "is this already built somewhere?"

Search query patterns:

- `<concept> industry term`
- `<concept> standard tooling 2026`
- `<tool A> vs <tool B> <use case>`
- `best <category> software solo founder 2026`
- `enterprise <concept> workflow`

## Status

- **2026-05-15:** Initial authoring. Surfaced from a session where the owner explicitly recognized the harness ≈ Linear pattern + asked for a methodology mechanism to catch this.

## Methodology placement

This skill is queued for ratification as part of v3.4 (or a v3.3.x point release). Captured in [[build-roadmap-and-html-orchestration-2026-05-12]] §40.
