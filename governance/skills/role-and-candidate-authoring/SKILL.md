---
type: knowledge
tags: [everything-ecosystem, skills, role-and-candidate-authoring]
ai-model: claude
created: 2026-05-15
source: hybrid
name: role-and-candidate-authoring
description: >
  Author the three role-filling artifacts when an operator (CEO, founder, or
  pillar lead) is hiring for a role, assigning a project, or filling an
  operational responsibility: (1) role description, (2) ideal candidate
  qualities, (3) explicit recommendations for finding + evaluating candidates.
  Also applies to sub-project owner-filling per the recursive pillar pattern.
  This is the bridge from solo-operator methodology to multi-person team
  methodology. Per SAD v3.3+ amendment §38.
  MANDATORY TRIGGERS: hiring, hire, role description, job description,
  candidate, ideal candidate, qualities, who should run this, who owns this,
  role-filling, assign a project, sub-project owner, /role-and-candidate-authoring.
---

# Role + Candidate Authoring Skill

The methodology workflow for producing the artifacts an operator needs when filling a role or assigning an owner — whether that's a formal hire, a contractor engagement, an internal team assignment, or a sub-project ownership decision.

## Why role-and-candidate-authoring exists

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|build-roadmap §38]], the methodology should support the transition from solo-operator + AI to multi-person teams. The bridge is the moment when the operator decides to bring someone in — for a role, a project, a sub-company per the §36 recursive pillar pattern.

At that moment, the operator needs three concrete artifacts:

1. **A role description** that the candidate (and any reviewers) can read
2. **A candidate-qualities profile** that calibrates what to look for
3. **Recommendations** for where to look + how to evaluate

Without explicit support, these get drafted ad-hoc, often poorly, and the methodology breaks down at exactly the moment the team grows.

## When to invoke

- Filling a C-level role (CTO, CMO, COO, CFO, etc.)
- Filling a VP-level or director role
- Filling a senior IC role with specific scope
- Assigning ownership of a sub-project (per §36 recursion — when a pillar product matures enough to warrant its own owner)
- Engaging a contractor for a defined scope of work
- Establishing a project lead within an existing team
- The user explicitly asks "what should I look for in a [role]" or "help me write a job description for X"

## What this skill produces

For any role-filling moment, three artifacts:

### 1. Role description

A 1-2 page document covering:

- **Title** and the role's relationship to the methodology layer (pillar lead / company-wide / sub-project owner / IC)
- **Purpose** — one paragraph on what the role is for
- **Primary + secondary pillars** the role touches
- **Owns** — what the role is accountable for (deliverables, decisions, outcomes)
- **Does not own** — explicit non-responsibilities (per the role-file pattern at company-template/roles/)
- **Reports to** + **collaborates with** + **reports to this role**
- **Stage variation** — how the role differs by company stage; what version of the role this hire is filling

For predefined roles (CEO, CTO, CMO, COO, Founder, Chief of Staff), this starts from the company-template/roles/ file and customizes for the specific project's context.

For custom roles (e.g., "Editor-in-Chief of the company podcast"), this synthesizes from the relevant pillar(s) + the role's specific scope.

### 2. Ideal candidate qualities

A profile covering:

- **Required skills** — load-bearing capabilities the candidate must have
- **Strong-preference skills** — capabilities that significantly improve fit
- **Traits** — temperament, working style, values alignment
- **Experience** — kinds of prior work that match; the shape of the right career arc
- **Stage fit** — the candidate's experience tier relative to the company's stage (a hobby project's first hire vs. a venture's growth-stage hire are very different profiles)
- **Cultural fit signals** — what the candidate's framing of work should sound like

Calibrated per the project's [[../ambition-tier/SKILL|ambition tier]]. A pre-PMF venture's VP Engineering is a different profile from a growth-stage one.

### 3. Explicit recommendations

A practical guide covering:

- **Sources** — where this kind of person tends to come from (specific communities, prior companies, networks, schools)
- **Outreach patterns** — how to make first contact (warm intros via X, direct reach via Y, posting in Z communities)
- **Interview considerations** — what to evaluate, in what order, with what specific questions
- **Signal vs. noise** — what looks like a yes that isn't, what looks like a no that isn't
- **Common mismatches** — typical bad fits; how to recognize them early
- **Compensation reference** — when the methodology has reference data; otherwise points to where to find it
- **Reference checks** — what to ask of references; what answers indicate fit

## How to run this skill

When this skill is loaded, the AI should:

### Step 1 — Clarify the role

Ask:
- Is this a predefined role (CEO / pillar lead / etc.) or a custom role?
- What pillar(s) does this role touch?
- What's the project's current stage + ambition tier?
- Is this a full-time hire, contractor, project owner, sub-project owner, or other arrangement?
- What's the company / project's context that makes this role exist NOW?

### Step 2 — Surface predefined context (if applicable)

For predefined roles, read the company-template/roles/ file as the starting point. Surface the pre-authored role description as the baseline; customize from there.

### Step 3 — Author the role description

Draft the 1-2 page role description following the structure above. Customize for this specific project + stage + ambition tier.

### Step 4 — Author the candidate-qualities profile

Calibrated to the role + company stage + ambition tier. Don't over-prescribe (per [[../office-hours-mode/SKILL|office-hours-mode]] discipline — required skills should be genuinely required, not nice-to-haves disguised as requirements).

### Step 5 — Author the recommendations

Concrete + actionable. Surface specific communities, outreach patterns, interview considerations. Where the methodology has gaps (e.g., compensation data), name them honestly.

### Step 6 — Save the artifacts

Save to:

```
projects/<entity>/<pillar>/hires/<date>-<role-slug>.md
```

Or for sub-project ownership:

```
projects/<entity>/<sub-project-path>/owner-profile.md
```

Frontmatter:

```yaml
---
type: role-filling-artifact
role: <role-slug>
artifact-type: role-description | candidate-qualities | recommendations | combined
pillar: <primary-pillar>
stage: <company-stage>
ambition-tier: <tier>
created: <date>
authorship: hybrid
tags: [role-filling, hiring, <entity>, <pillar>]
status: draft | active | filled | archived
---
```

### Step 7 — Surface to the orchestration HTML

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§32]], the per-project orchestration HTML can surface "open roles" as a visible state. Add the role to the orchestration's hiring/roles section with status `draft` → `active` → `filled`.

### Step 8 — Update on candidate progress

As candidates surface + are evaluated, the operator can append notes to the role artifacts. When a hire is made, update status to `filled` + capture the hire's actual profile vs. the ideal profile (the gap is methodology-useful for next time).

## Applied to sub-project ownership (recursive)

Per [[../../_ideas/build-roadmap-and-html-orchestration-2026-05-12|§36]], pillar products are themselves sub-companies. When a sub-project matures enough to warrant its own owner, this skill applies recursively:

- The sub-project's three pillars determine which pillar lead profile is needed
- The sub-project's stage determines the seniority level
- The sub-project's ambition tier determines the candidate-qualities calibration

A podcast that's a Brand-pillar product might need:
- An Editor-in-Chief (custom role; Brand pillar lead of the sub-company)
- A Producer (Product pillar lead of the sub-company)
- A Business Manager (Business pillar lead of the sub-company)

This skill authors the role-filling artifacts for each.

## Implicit-vs-explicit principle (per §37)

The skill is explicit about WHAT to consider (the three artifacts; the per-pillar context; the stage calibration). It is implicit about HOW to document — the actual shape of the role description, candidate profile, and recommendations is per role + per project + per AI conversation. Different roles surface different specifics even from the same template.

## What this skill is NOT

- **Not a compensation database.** When compensation data is available (via methodology references or operator-provided context), the skill incorporates it. Otherwise the skill points the operator to where to find it.
- **Not a substitute for actual judgment.** The skill produces artifacts to help the operator's hiring process; it doesn't make the hiring decision. The operator + their advisors do.
- **Not job-board copy.** The role description is internal; if the operator wants public-facing job-board copy, that's a separate (related) artifact for the [[../stakeholder-update/SKILL|stakeholder-update]] skill or marketing surface.
- **Not for agent occupancy.** When a [[position-schema|position]] has `staffing-posture: agent-capable` / `agent-preferred` (or `occupancy: agent`), use agent-role taxonomy / assertion bounds — do not run this human-candidate workflow as if it were a hire.

## Relationship to other skills

- [[../executive-roles/SKILL|executive-roles]] — provides context for predefined C-level **role templates**
- [[position-schema]] — create / update the **position instance** first; this skill fills when the target occupancy is human
- [[../cross-pillar-tradeoff/SKILL|cross-pillar-tradeoff]] — hiring is often a cross-pillar tradeoff (CEO + finance + relevant pillar lead all weigh in)
- [[../stakeholder-update/SKILL|stakeholder-update]] — hire announcements + public-facing job posts compose with this skill
- [[../office-hours-mode/SKILL|office-hours-mode]] — the right posture for candidate-qualities authoring (don't over-prescribe; required means required)
- [[../canonicalize/SKILL|canonicalize]] — role descriptions for filled roles may become canonical for their concern

## Status

- **2026-05-14:** Initial authoring per §38 amendment.
- **2026-08-10:** Pointer to [[position-schema]] — human fill path vs agent occupancy.
