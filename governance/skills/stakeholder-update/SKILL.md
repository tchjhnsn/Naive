---
type: knowledge
tags: [everything-ecosystem, skills, stakeholder-update]
ai-model: claude
created: 2026-05-15
source: hybrid
name: stakeholder-update
description: >
  Compose a stakeholder update tailored to audience + cadence. Reads project
  state (recent SESSION_LOG entries, articulation closure status, metrics
  review outputs, decisions log) and produces an update in the right register
  for the audience: exec brief / engineering detail / customer-facing / investor
  update / board materials. Sponsored by Chief of Staff role.
  MANDATORY TRIGGERS: stakeholder update, status update, weekly update,
  monthly update, board update, investor update, all-hands update, customer
  comms, launch announcement, executive brief, engineering update, /stakeholder-update.
---

# Stakeholder Update Skill

The Chief-of-Staff-sponsored skill for composing updates tailored to specific audiences + cadences.

## Why stakeholder-update exists

Per [[../../venture-template/roles/chief-of-staff|Chief of Staff role]], CoS owns the rhythm of stakeholder communications — all-hands, board updates, investor updates, customer comms. These updates draw from project state but need translation: an engineering team's progress reads differently to engineers vs. the board vs. customers. The skill handles the translation.

## When to invoke

- Weekly / monthly / quarterly status updates to leadership or board
- Launch announcement composition
- Customer-facing release notes
- Investor update emails
- All-hands deck or script
- Escalation comms (a risk needs surfacing to specific stakeholders)
- The user explicitly asks for a stakeholder update or asks "how do I summarize this for X?"

## What stakeholder-update produces

A stakeholder update sized to the audience + cadence. Structure varies by type:

### Executive brief (CEO / exec team / board)

- **Headline** — one sentence: most important development since last update
- **Status** — green / yellow / red on key initiatives
- **Highlights** — 3-5 bullets, mostly outcomes (shipped, achieved, decided)
- **Risks + asks** — what's at risk + what the audience can help with
- **Numbers** — relevant metrics (from [[../metrics-review/SKILL|metrics-review]] outputs)
- Length: 1-2 paragraphs + scorecard

### Engineering detail (technical team / CTO)

- **What shipped** — with PR / commit references where useful
- **What's in flight** — with progress %
- **What's blocked** — with specific blockers + needed help
- **Technical decisions** — ADRs from the period
- Length: bullet-heavy; can be longer

### Customer-facing (release notes / community)

- **What's new** — user-facing capabilities, in customer register (not engineer register)
- **What's better** — improvements, in customer-relevant framing
- **What's coming** — light foreshadowing of next version (per [[../foreshadowing-audit/SKILL|foreshadowing-audit]] discipline)
- Length: short; voice-aligned with brand

### Investor update (monthly/quarterly to investors)

- **Headline** — milestone or shift since last update
- **KPIs** — revenue, growth, churn, runway
- **Highlights** — wins + significant developments
- **Lowlights** — losses + risks (honesty here builds trust)
- **Asks** — intros, hiring help, customer connections
- **Runway** — months remaining at current burn
- Length: 1-2 pages

### All-hands update (internal team-wide)

- **Wins** — celebrate
- **Progress on goals** — OKRs / strategic plan
- **What's changing** — org changes, process changes, priority shifts
- **Q&A or open thread** — invite engagement
- Length: deck + script, ~15-20 minutes

## How to compose a stakeholder update

When this skill is loaded, the AI should:

### Step 1 — Clarify the audience + cadence

Ask:
- Who's the audience? (CEO / exec team / engineering team / board / investors / customers / all-hands)
- What's the cadence? (one-off / weekly / monthly / quarterly)
- What's the date range covered? (since last update / since launch / this quarter)
- Are there specific topics to emphasize or de-emphasize?

### Step 2 — Read project state

Pull from:
- Recent SESSION_LOG entries (the project's institutional memory)
- Articulation closure inventory (what's done vs in-flight vs deferred)
- Metrics review outputs (numbers + interpretation)
- Decision log (significant calls)
- Idea archive (what was tried + decided against, if relevant)
- The per-project orchestration HTML (current state overview)

If any input is missing, surface to the operator.

### Step 3 — Translate to the audience register

The single most important step. The same project state reads differently to different audiences:

- **Executives** want outcomes + decisions + risks + asks
- **Engineering** wants technical specifics + decisions + unblocking help
- **Customers** want what's new + what's better + brand-aligned voice
- **Investors** want numbers + trajectory + honest assessment
- **All-hands** wants progress + celebration + clarity

The skill's job is to take the same underlying state and render it in the right register.

### Step 4 — Draft + iterate

Draft the update; surface to the operator; iterate. Updates often need 2-3 passes to land the tone correctly.

### Step 5 — Track the update

Save to:

```
projects/<entity>/business/stakeholder-updates/<date>-<audience>.md
```

Or in a per-audience update log if the project uses one.

Frontmatter:

```yaml
---
type: stakeholder-update
update-audience: exec | engineering | customer | investor | all-hands | board
cadence: weekly | monthly | quarterly | one-off
date: <date>
date-range-start: <date>
date-range-end: <date>
author: <name>
tags: [stakeholder-update, <entity>, <audience>]
---
```

### Step 6 — Surface to the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], stakeholder updates show in the Business pillar section of the orchestration HTML with their audience + date.

## Posture

Stakeholder-update runs in a **mode that matches the audience**:

- **Executive / board / investor updates** — office-hours-mode posture. Sharp, evidence-driven, honest about risks.
- **Customer / all-hands** — friend-mode posture. Generative, energetic, celebratory.
- **Engineering** — office-hours-mode by default; engineers appreciate directness.

The skill should declare its posture explicitly so the operator can adjust if needed.

## What stakeholder-update is NOT

- **Not a substitute for direct communication.** Updates supplement; they don't replace conversation with stakeholders.
- **Not spin.** Especially for investor + board updates, honesty about lowlights builds trust. Spin destroys it.
- **Not a release-notes generator.** Customer-facing release notes are one stakeholder-update flavor; if the operator just wants release notes, do that — but the skill is broader.

## Relationship to other skills

- [[../metrics-review/SKILL|metrics-review]] — feeds the numbers section of most updates
- [[../articulation-closure/SKILL|articulation-closure]] — feeds the what-shipped section
- [[../friend-mode/SKILL|friend-mode]] / [[../office-hours-mode/SKILL|office-hours-mode]] — posture per audience
- [[../canonicalize/SKILL|canonicalize]] — recurring update types (weekly investor, monthly all-hands) have canonical formats

## Status

- **2026-05-14:** Initial authoring.
