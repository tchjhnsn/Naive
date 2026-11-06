---
type: framework
ai-model: none
source: human
created: 2026-05-20T...
tags: [methodology, consultancy, deliverables, playbook, post-discovery]
related-entities:
  - "a project note"
related-frameworks:
  - "[[business-discovery-framework]]"
  - "[[onboarding-handoff-framework]]"
status: living-document
authored-after: Lauren engagement (2026-05-20)
---

# Post-Discovery Deliverable Playbook

What to build after discovery — which deliverable shape for which customer, in what order, with what contents. Authored after the Lauren engagement surfaced the need to triage deliverable shape rather than default to the same one for everyone.

This is a **decision framework**, not a single answer. Different customers get different deliverables based on triage criteria below.

---

## The three deliverable shapes

### Shape A — Lightweight skills package

**~50 KB, ~25 files. Drop-in to customer's existing or empty vault.**

What it contains:
- 10-12 skills (4 methodology essentials + 6-8 business-specific)
- 1 onboarding meta-skill (`<customer>-onboarding`)
- A `CLAUDE-template.md` for vault root
- README.html with copy-pasteable session prompts
- Bootstrap command HTML that does file management automatically
- Methodology starter doc (HTML + MD)

What it's for:
- Non-technical first-touch customers
- Customers exploring whether the methodology fits
- Customers with no existing structured vault
- Free or low-commitment pilot engagements

What it's NOT for:
- Customers with substantial existing business documentation that needs migration
- Customers ready for a populated vault with their actual content organized
- Engagements where the consultant has time + budget to do file migration

### Shape B — Full populated vault

**~150 MB+ depending on customer files. Complete operator system.**

What it contains:
- Everything in Shape A, plus:
- Multi-vault structure (business + personal + optional day-job)
- Populated entity profiles (BASED + SMART articulated)
- Spec stack (SERVICE_SPEC, OPERATIONS_SPEC, CLIENT_MODEL_SPEC, CUSTOMER_EXPERIENCE_SPEC, QUALITY_SPEC)
- Initiatives (3-5) + cycles (2-3)
- Planned sessions queue
- Customer's actual business documents migrated to proper pillar locations
- Session logs (discovery transcript + summary)
- Document migration checklist
- Tooling inventory

What it's for:
- Customers with substantial existing documentation worth migrating
- Customers with team / multi-city / complex operations
- Paid engagements where the consultant's time can be invested
- Customers ready to commit to the methodology fully

What it's NOT for:
- First-touch non-technical operators (overwhelming)
- Customers without much existing documentation (nothing to migrate)
- Quick consultations / spot help

### Shape C — Hybrid (Lightweight first, populate over time)

**Start at Shape A. Customer's vault populates organically through their own methodology sessions.**

The default for most customers. They get Shape A on day one; the vault grows as they articulate entities, capture ideas, log sessions. The consultant may return for "deepening" sessions (folder migration, populated initiatives) as the customer's engagement matures.

What it's for:
- Most customers, most of the time
- When in doubt, default to this

---

## Triage decision tree

For each new customer, walk this tree to choose deliverable shape:

```
Does the customer have substantial existing business documentation
(>100 pages of docs, multiple folders, established processes)?
  │
  ├── YES → Are they technical enough to absorb a full populated vault on day one?
  │           ├── YES → Shape B (Full Vault)
  │           └── NO → Shape C (Hybrid — start lightweight)
  │
  └── NO → Shape A (Lightweight) is correct
            └── Consider Shape C if customer signals strong commitment
                during discovery
```

Other triage signals:

| Signal | Shape implication |
|---|---|
| Free pilot, exploring | A or C |
| Paid engagement, scoped | B (if docs warrant) or C |
| Customer says "I'm overwhelmed by my current setup" | A — don't add more |
| Customer says "I have everything but it's scattered" | B — migration is the value-add |
| Solo founder, early-stage | A |
| Team + multiple cities + active operations | B or C |
| Customer is technical (developer, IT background) | B is more digestible |
| Customer is non-technical | A or C, with explanatory-mode onboarding |
| Engagement is < 1 week of consultant time | A |
| Engagement is > 1 week with deep folder review | B |

## What every deliverable includes (the baseline)

Regardless of Shape A / B / C, every customer deliverable includes:

1. **`CLAUDE.md`** at vault root — the vault constitution
2. **An onboarding meta-skill** — `<customer>-onboarding` in `_meta/skills/`
3. **A bootstrap command** (HTML, copy-pasteable) that handles file placement automatically
4. **A README** (HTML) explaining what's in the package, with 3-5 recommended session prompts
5. **Methodology starter doc** (HTML + MD) — the simplified methodology reference
6. **Skills package** (the 10 core skills minimum: BASED, SMART, session-capture, time-awareness + 6 customs)
7. **Session-log files** from the discovery (transcript + summary if recorded)

The skills + onboarding skill + bootstrap + README make up the **handoff core**. Even in a full Shape-B delivery, these are still the spine.

## Sequencing — from discovery to delivered

Recommended sequence for a customer engagement:

### Step 1 — Pre-discovery folder review (NEW from Lauren retro)

**Before** the discovery call, ask the customer to share or grant access to their current business folder. Skim it. Note:
- Tools currently in use (from filenames + structure)
- Documentation that already exists (compliance, training, contracts, plans)
- Visible gaps
- Probable industry-specific tools they're using

Use this to:
- Tailor discovery questions to what you find
- Avoid asking obvious questions ("do you have an LLC?")
- Identify what's scattered vs. what's missing

### Step 2 — Discovery session

Use `business-discovery-framework.md`. With the pre-discovery folder review in mind, the discovery becomes much sharper — you're filling gaps, not surveying from zero.

Capture: raw transcript (if recorded) + summary + your own notes.

### Step 3 — Folder deep review (between discovery and build)

Within 24 hours of discovery, do a thorough review of the customer's actual folder. Catalog:
- Existing assets (compliance, training, plans, financial, marketing, customer records)
- Tools confirmed in use (from real artifacts)
- Industry-specific tools surfaced (e.g., PandaDoc, industry CRM)
- Quality of existing documentation
- Estimate of migration effort if going Shape B

### Step 4 — Triage decision

Use the decision tree above. Pick A, B, or C. Document the choice + reasoning.

### Step 5 — Methodology adaptation check

Does the customer's business require a methodology amendment? E.g., a service business needs SAD-for-service-businesses; a brick-and-mortar might need new conventions. If yes:
- Capture the amendment as you build (not retroactively)
- Reference in the customer's CLAUDE.md
- Either PROPOSED status (informally tested) or RATIFIED (formally adopted after customer engagement)

### Step 6 — Build the deliverable

Shape A: 1-3 hours
Shape B: 1-3 days (or more depending on file migration)
Shape C: Start with Shape A; populate Shape B portions as customer requests over time

### Step 7 — Author the customer's onboarding skill

Tailored to the customer (their name, their business). Uses the explanatory mode pattern. Includes 5-session sequence (Welcome → BASED → SMART → Real improvement → Rhythm).

### Step 8 — Test the bootstrap command

Before sending, paste the bootstrap command into a fresh Claude session pointing at a test copy of the deliverable. Verify Claude correctly:
- Finds the skills package folder
- Moves skills to `_meta/skills/`
- Installs CLAUDE.md
- Creates `_ideas/` and `_sessions/` folders
- Invokes the onboarding skill

If anything fails, fix the bootstrap before customer sees it.

### Step 9 — Handoff

Methods (pick based on customer + size):
- **AirDrop / USB / Direct transfer** — for in-person handoffs (Lauren-shape)
- **Email** — for sub-25 MB deliverables (Shape A typically)
- **Google Drive / Dropbox link** — for larger files (Shape B)
- **Cowork Plugin install** — when we get there (future)

Always include: README + bootstrap command + session logs separately, so customer can read README before unzipping the full package.

### Step 10 — Schedule follow-up

Within 1 week of handoff:
- Quick check-in (text / brief call): "How did the first session go?"
- Within 30 days: structured check-in (could be a $100 call per the support tier in the consultancy entity profile)

## Common variations

### Shape A → B upgrade

Customer started on Shape A, then asked for a populated vault later. Process:
1. Customer's vault is already in working state (Shape A bootstrap completed)
2. Request access to or copy of their working folder
3. Do the folder deep review (Step 3 above)
4. Migrate their content into the existing vault structure (not a new vault)
5. Add the initiatives, cycles, populated entity profile
6. Don't disturb their existing work — additive only

### Multi-entity customer

Customer has multiple businesses or projects (not unusual). Recommendation:
- One vault per entity (per CLAUDE.md guidance)
- The a consulting practice can deliver Shape A for one and Shape B for another, depending on which entity needs what

### IP-sensitive customer

If the customer's business involves:
- HIPAA / healthcare
- Financial data (banking, investing)
- Legal proceedings
- Children's data

Then:
- Stronger boundary on consultant access (screen-share only, time-bounded)
- Explicit data-handling addendum in the engagement letter (when paid)
- Document migration may need to skip certain folders

### Day-job customer

Some customers have a day-job they want to operationalize too. Provide the day-job vault scaffold (already in the Lauren package as a recommendation). IP boundaries are critical here — that work is employer-owned.

## Anti-patterns

- ✗ Defaulting to Shape B because that's what we built last time
- ✗ Skipping the folder review and building before knowing what's already there
- ✗ Promising a Shape B in scope but only delivering Shape A polish
- ✗ Authoring methodology amendments retroactively after delivery
- ✗ Sending the deliverable without testing the bootstrap command on a fresh Claude session first
- ✗ Forgetting the customer's own files in the deliverable (Shape B specifically)
- ✗ Making the customer manually place skills somewhere because the bootstrap was vague

## What's deliberately not in this playbook

- Pricing structure — covered separately in the consultancy entity's business pillar
- Customer acquisition — covered in the marketing strategy (when authored)
- Skill catalog management — covered in skills documentation
- The full SAD methodology — covered in `SAD_SKILL_v3.md`

## Living document note

After every customer engagement, return to this playbook and refine. Customer #2 will teach us things customer #1 (Lauren) didn't.

## Companion frameworks

- `business-discovery-framework.md` — the discovery interview structure
- `onboarding-handoff-framework.md` — what happens once the deliverable lands with the customer
- `vault-and-tooling-consultancy-setup.md` — the original consultancy checklist (predates this playbook; this playbook subsumes the deliverable-build portions)
