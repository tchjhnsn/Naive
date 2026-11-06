---
type: framework
ai-model: none
source: human
created: 2026-05-20T...
tags: [methodology, consultancy, onboarding, handoff, customer-success]
related-entities:
  - "a project note"
related-frameworks:
  - "[[business-discovery-framework]]"
  - "[[post-discovery-deliverable-playbook]]"
status: living-document
authored-after: Lauren engagement (2026-05-20)
---

# Onboarding Handoff Framework

What happens after the deliverable lands with the customer. How they learn what we built. How they graduate from being onboarded to running the methodology themselves. How the consultant supports without becoming a crutch.

This framework is consultant-facing — it describes what *we* do to set the customer up for success. The customer-facing version of this lives in the README.html that ships with every deliverable.

---

## The first 30 days

The customer's first 30 days with the methodology are the *make-or-break window*. If they don't use the vault meaningfully in the first month, they probably never will. This framework structures that window.

### Day 0 — Handoff

The deliverable lands. The customer has:
- Files on their computer
- A bootstrap command they haven't run yet
- A README they may or may not have read

**Consultant action:** within 24 hours, send a brief, warm message acknowledging the handoff. Something like:

> "Sent you the package — let me know when you've had a chance to try the bootstrap. No pressure on timing. The README explains everything; we can troubleshoot together if anything is unclear."

### Day 1-3 — First session

The customer runs the bootstrap command and goes through Session 1 (Welcome & orientation) of the onboarding skill. The onboarding skill handles 95% of this; the consultant's job is to be available for the 5% that goes off-script.

**Common Day 1 friction points:**
- Bootstrap command can't find the skills package folder → check folder placement
- Claude doesn't have file access to the vault → check Cowork / Claude Code permissions
- The CLAUDE.md doesn't get installed correctly → re-run with explicit instructions
- Customer says "I don't know what to type next" → reference the README's session prompts

**Consultant action:** be available for text the first day. After that, the onboarding skill should carry them.

### Day 4-14 — Articulation work

Customer runs Sessions 2 (BASED) and 3 (SMART). The vault gets its first real content — the customer's actual vision and scope captured in their own words.

**Common Day 4-14 friction points:**
- Customer's BASED vision feels small (self-censorship) → the skill should catch this; if not, gentle nudge from consultant
- Customer struggles to convert BASED to SMART → may need a brief call
- Customer's vault is otherwise empty (they haven't captured anything in `_ideas/`) → not a problem; ideas come naturally with use

**Consultant action:** read what the customer captures (with permission) within 48 hours of session completion. Offer brief reactions. Resist the urge to rewrite their articulations.

### Day 15-21 — Real improvement

Customer runs Session 4 — uses a business skill (client-intake, care-plan-author, monthly-financial-review, social-content-generator, etc.) on something real. This is the **methodology proving itself**.

**Why this session matters most:**
If the customer feels real value from Session 4, they keep using the methodology. If they don't, the package becomes a relic on their drive.

**Consultant action:** check in after Session 4. Ask: "Was that useful? What would have made it more useful?" Capture their answer — it improves the skill for future customers.

### Day 22-30 — Rhythm

Customer runs Session 5 — establishes their daily / weekly / monthly cadence. Onboarding skill steps back. Customer is now driving.

**Consultant action:** schedule the 30-day check-in conversation. This is the proper handoff moment.

---

## The 30-day check-in

A 30-45 minute conversation, scheduled at handoff for 30 days later. Format:

**What's working?**
- Which skills did they use?
- What was easiest?
- What surfaced that they didn't expect?

**What's not working?**
- What feels overweight?
- What did they skip?
- What's confusing?

**Where to go from here?**
- Next 30 days — any specific focus?
- Any additional skills they want?
- Move from Shape A to Shape B (full vault), or stay light?
- Support tier going forward?

**Capture:** consultant takes notes in the customer's engagement log (see template below). Notes are also for the consultancy's own learning.

---

## The calendar architecture

Every customer has three potential calendars. Make this explicit during onboarding (Session 5 or follow-up):

| Calendar | What it holds | Lives where |
|---|---|---|
| **Personal (master)** | Life events, family, faith, rest, friends, health | Customer's personal Google Calendar |
| **Business** | Customer's business operations — client visits, team meetings, content sessions | Separate Google Calendar, subscribed-to-from personal view |
| **Day-job (optional)** | Work commitments for any employer | Separate Google Calendar (if applicable) |

The personal calendar is the master. The others overlay onto it. This way the customer sees their whole life in one place but can mentally separate which life-domain a given block belongs to.

**Consultant action:** during Session 5 or the 30-day check-in, walk the customer through setting up the three-calendar architecture in Google Calendar. ~15 minutes of screen-share. Most customers benefit from this.

---

## The post-onboarding rhythm

After Session 5, the customer should have a sustainable rhythm. Recommend (customizable per customer):

### Daily
- Capture ideas into `_ideas/` as they happen (1-minute moments, not a chore)
- Update entity profiles when something material changes

### Weekly (end of week)
- 5-10 minute SESSION_LOG entry: what got done, what's next
- Review `_sessions/planned/` to set the next week's focus

### Monthly
- Run the relevant industry-specific monthly skill (e.g., `monthly-financial-review` for the business)
- Review `_ideas/` — any ideas ready to graduate to entities?

### Quarterly
- Cycle close: review the cycle goals, retro on what worked / didn't
- Set next cycle goals (uses the cycle pattern from methodology)

### Annually
- Re-articulate BASED + SMART (these aren't fixed; they evolve)
- Tithe disbursement audit (if applicable — Lauren-specific pattern, generalizable to "annual giving" or "annual generosity")
- Brand audit (does the brand still match what the business has become?)

---

## Support tiers

Define explicitly with the customer at the 30-day check-in:

| Tier | What it includes | Cost |
|---|---|---|
| **Self-serve** | Customer uses methodology independently. Consultant available for text Q&A. | Free / included |
| **$100 call** | One-off coaching call when stuck. 30-45 min. | $100 |
| **Monthly check-in retainer** | Recurring monthly session (60 min) — review progress, refine, troubleshoot | TBD ($300-500/mo range, customer-dependent) |
| **Deep engagement** | Multi-session deeper work — new entity articulation, methodology adaptation, multi-vault setup, custom skill authoring | Project-priced ($1k-15k range, depending on scope) |

**Lauren is currently:** self-serve + text Q&A (free pilot). The 30-day check-in will determine if she upgrades.

---

## The engagement log (consultant-side)

For every customer, the consultant maintains an engagement log. Lives at a project file.

### Template

```yaml
---
type: customer-engagement
customer-name: <full name>
business-name: <business name>
business-type: <industry>
engagement-start: <YYYY-MM-DD>
engagement-status: active | paused | completed | churned
deliverable-shape: A | B | C
support-tier: self-serve | $100-call | retainer | deep
created: <ISO timestamp>
last-updated: <ISO timestamp>
---
```

### Sections

**Overview**
- Customer summary (1-2 sentences)
- Business summary (1-2 sentences)
- Why they engaged with the consultancy

**Discovery findings**
- Top 3 things that surfaced
- Anything notable about how they articulate / their working style

**Deliverable summary**
- Shape (A/B/C)
- What was customized
- Notable methodology amendments authored

**Session log** (newest first)
- Each session: date, format, what we did, what they learned, what's next

**Wins**
- Concrete outcomes from using the methodology
- Customer quotes (with permission, for case studies)

**Friction**
- What's been hard
- What we changed in response

**Methodology learnings**
- What this customer taught us about the methodology / consultancy process
- Updates we made to frameworks based on this customer

**Financial**
- Pricing agreed
- Payments received
- Outstanding

**Referrals**
- Customers they've referred
- Customers they might refer

---

## When the consultant steps back

The onboarding skill is designed to step back after Session 5. The consultant should mirror this — be available, but stop being the active driver.

Signs the customer is *driving themselves*:
- They're capturing ideas without prompting
- They're running sessions and logging them
- They're invoking skills by name
- They're referring to entity profiles or pillar specs as if they're real working documents
- They're asking sharper, more methodology-fluent questions

Signs the customer is *not yet self-driving*:
- They reach out to consultant for things the skills could handle
- They haven't captured anything new in `_ideas/`
- The SESSION_LOG hasn't been updated in 2+ weeks
- They're not invoking skills — just chatting with Claude freely
- They say "I forgot what to do" or "I'm not sure how this works"

If not self-driving by Day 30: gentle re-engagement. Walk them through the part that didn't land. Update the onboarding skill if a systematic gap surfaces.

---

## Anti-patterns

- ✗ Treating the customer like they need hand-holding forever
- ✗ Treating the customer like they're on their own after handoff
- ✗ Skipping the 30-day check-in
- ✗ Letting the engagement log get stale (it's how we learn)
- ✗ Not capturing customer wins (no case studies = no referrals)
- ✗ Selling the customer support they don't actually need
- ✗ Failing to refine the framework based on what each customer teaches

---

## Companion frameworks

- `business-discovery-framework.md` — the discovery interview structure (Step 1 of the engagement)
- `post-discovery-deliverable-playbook.md` — what to build (Steps 2-9 of the engagement)
- This file — what happens after the deliverable lands (Steps 10+)
- `vault-and-tooling-consultancy-setup.md` — the original consultancy checklist (predates these frameworks; gradually being subsumed)

---

## Living document note

Refine after every customer's 30-day check-in. The framework gets sharper with each engagement.
