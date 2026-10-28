---
type: knowledge
tags: [everything-ecosystem, skills, metrics-review]
ai-model: claude
created: 2026-05-15
source: hybrid
name: metrics-review
description: >
  Run a metrics review against current project / product state — read the
  metrics framework, evaluate against targets, surface trends, identify
  outliers, recommend actions. Business-pillar discipline with overlap into
  Product (instrumentation + event taxonomy). COO-sponsored. Runs at weekly /
  monthly / quarterly cadences, or on-demand when investigating a sudden change.
  MANDATORY TRIGGERS: metrics review, KPI review, metrics dashboard, what are
  our numbers, how is the product performing, weekly metrics, monthly metrics,
  quarterly review, cohort analysis, retention, conversion, growth metrics,
  /metrics-review.
---

# Metrics Review Skill

The Business-pillar workflow for reviewing product / commercial / operational metrics on a recurring cadence.

## Why metrics-review exists

Metrics frameworks are Tier 1 Business-pillar deliverables. But authoring the framework isn't enough — it needs recurring review to produce signal. Without a metrics-review discipline, the framework atrophies; numbers get measured but not interpreted; trends go unnoticed until they're crises.

## When to invoke

- **Cadence-driven:** weekly / monthly / quarterly metrics review meetings
- **Event-driven:** a sudden spike or drop needs interpretation; a launch needs post-launch review
- **Decision-driven:** a strategic decision requires current-state understanding (pricing change, scope change, hiring decision)
- **User-driven:** the operator asks "what are our numbers?" or equivalent

## What metrics-review produces

A metrics review at any cadence produces:

### 1. The scorecard

A snapshot of every load-bearing metric vs. its target:

```
| Metric | Target | Current | Δ from last review | Status |
|---|---|---|---|---|
| Weekly active users | 10K | 8.5K | +12% WoW | ↻ trending toward target |
| Trial-to-paid conversion | 8% | 6.2% | -1.1pp | ✗ below target |
| Monthly recurring revenue | $50K | $42K | +5% MoM | ↻ trending toward target |
| Net retention | 110% | 107% | flat | ↻ stable, slightly below |
| Page-load p95 | < 1s | 1.4s | +0.2s | ✗ regressing |
```

Status icons: ✓ at-or-above-target / ↻ trending / ✗ below-target-or-regressing.

### 2. The narrative

Per metric category (acquisition, activation, retention, revenue, referral; or whatever taxonomy the project uses), 1-2 sentences on what's happening + why.

### 3. The action items

Concrete actions surfaced by the review:

- **Investigate** — for metrics where the cause isn't clear
- **Intervene** — for metrics that need direct action
- **Adjust target** — for metrics where the target itself was wrong
- **Hold** — for metrics that are fine; no action needed

Every action has an owner, due date, and follow-up cadence.

### 4. Trend observations

Patterns that span multiple metrics:

- "Acquisition is healthy, activation is regressing — investigate onboarding flow"
- "Revenue trending up but retention regressing — at-risk for churn cliff"
- "All metrics flat for 6 weeks — investigate whether instrumentation is broken"

## How to run a metrics review

When this skill is loaded, the AI should:

### Step 1 — Identify the metrics framework

Read the entity's metrics framework deliverable (typically at `<entity>/business/metrics-framework.md` or equivalent). Identify:
- Which metrics are tracked
- What the targets are
- What the cadence is
- Where the current data lives

If no metrics framework exists, surface the gap and enter backfill per
`operations/skills/_patterns/gate-backfill.md`. Skill-specific notes:

## Backfill / missing assets

| Missing | Recovery |
|---|---|
| No metrics framework | Author minimal framework first (Tier 1 Business); then review |
| Framework but no instrumentation | Product owns event taxonomy; review exits with instrumentation debt lines, not fake numbers |
| Instrumentation but no cadence | Set cadence; run first review immediately |
| Review overdue | Run review now; do not skip to “adjust targets” without a scorecard |

**Freeze:** do not change product goals or pricing from “metrics” that lack a framework and current values.  
**Exit:** framework exists; at least one dated scorecard; action items owned.

### Step 2 — Identify the data source

Where do the actual numbers live? Options:
- Analytics platform (PostHog, Amplitude, Mixpanel, etc.)
- Internal dashboard
- Manual SQL queries against the database
- Spreadsheet maintained by the team

The skill doesn't fetch data directly (in most environments); it prompts the operator to provide the current numbers OR walks the operator through how to fetch them.

### Step 3 — Walk the scorecard

For each metric:
- Current value vs. target
- Delta from last review
- Status (✓ / ↻ / ✗)
- Brief interpretation

### Step 4 — Build the narrative

Group metrics by category (acquisition, activation, retention, revenue, referral, or project-specific). For each category, 1-2 sentences on the story the data tells.

### Step 5 — Surface action items

For each ✗ (below target) or surprising ✓ (above target):
- What's the most likely cause?
- What action does it suggest?
- Who owns it?
- When's the follow-up?

For each ↻ (trending), note the trajectory and the date by which the trend should be confirmed.

### Step 6 — Identify cross-metric patterns

Step back from individual metrics. What patterns span multiple? Are some metrics signaling something the others aren't?

### Step 7 — Update the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], surface the scorecard + action items in the Business pillar section of the orchestration HTML. The most recent review's date + status snapshot is visible at a glance.

## Posture

Metrics-review runs in **office-hours mode**. The work is critical evaluation — sharp framing, demand evidence, identify weakest claims. Friend mode is wrong for metrics reviews; numbers don't care about the operator's feelings.

Exception: if the metrics review surfaces something that needs vision-expansion (e.g., "we should rethink what we're measuring"), briefly shift to friend mode for the re-vision conversation, then return to office-hours for the review's conclusion.

## Cadence

Different metrics warrant different review cadences:

- **Daily** — system-health metrics (uptime, error rate, queue depth)
- **Weekly** — operational metrics (WAU/DAU, conversion, support volume)
- **Monthly** — business metrics (MRR, retention, expansion, churn)
- **Quarterly** — strategic metrics (LTV/CAC, payback period, market share)

The cadence should be in the metrics framework deliverable.

## What metrics-review is NOT

- **Not the source of metrics.** The framework is the source; the review interprets.
- **Not a substitute for instrumentation.** If the data isn't there, review can't help. Surface the gap.
- **Not a vanity-metrics exercise.** Metrics that don't connect to action are noise. The review should challenge metrics that don't drive decisions.
- **Not Product-pillar work.** It's Business with overlap into Product. Product owns instrumentation + event taxonomy; Business owns metric definitions + dashboards.

## Relationship to other skills

- [[../business-pillar/SKILL|business-pillar]] — auto-loads on Business work; metrics-review is one of its workflows
- [[../office-hours-mode/SKILL|office-hours-mode]] — the right posture
- [[../stakeholder-update/SKILL|stakeholder-update]] — metrics-review outputs often feed stakeholder updates

## Status

- **2026-05-14:** Initial authoring.
