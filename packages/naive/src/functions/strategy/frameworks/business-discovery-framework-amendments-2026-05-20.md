---
type: framework-amendment
ai-model: claude
source: hybrid
amends: "[[business-discovery-framework]]"
created: 2026-05-20T...
tags: [methodology, framework-amendment, discovery, consultancy]
amendment-source: Lauren engagement retro (2026-05-20)
related-entities:
  - "a project note"
status: PROPOSED — to merge into the main discovery framework after second customer engagement validates
---

# Discovery Framework Amendments — 2026-05-20

After the Lauren engagement, the existing `business-discovery-framework.md` needs these additions and refinements. Captured here as a discrete amendment; will merge into the main framework after customer #2 validates.

## Amendment 1 — Pre-discovery folder review (NEW Phase 0)

**Add before Layer 1 (Vivid Present).**

Before the discovery session itself, request the customer's existing business folder. Skim it ahead of the call. Note:

- **Tools currently in use** — visible from filenames + structure (e.g., `.docx` = Word/Google Docs; `Invoice.pdf` = some invoicing process; presence of `Insurance` folder = insurance probably exists)
- **Documentation that already exists** — business plans, compliance docs, training materials, contracts, financial trackers, marketing assets
- **Visible gaps** — categories of documentation that *should* exist for a business of this type but don't
- **Industry-specific tools they're using** — sometimes obvious from naming (`PandaDoc - <Client>.pdf` signals PandaDoc adoption)
- **Quality of existing documentation** — well-organized vs. scattered, current vs. stale

Use the folder review to:
- **Tailor discovery questions** to what's already there (don't ask "do you have an LLC?" if there's an `LLC Formation` folder)
- **Avoid obvious questions** — respect the customer's time
- **Identify scattered vs. missing** — these need very different interventions
- **Estimate deliverable shape** — substantial existing docs → Shape B candidate; sparse → Shape A is right

### How to ask for the folder

> "Before our call, could you share the folder on your computer where most of your business docs live? Could be Google Drive, Dropbox, a local folder — whatever has the most. I'll skim it ahead of our conversation so I can ask sharper questions and not waste your time on the obvious."

**Privacy note:** the consultant accesses temporarily, doesn't retain copies, doesn't include in any other artifact without explicit permission.

## Amendment 2 — Layer 7 (Tooling Inventory) — expanded questions

**Add these specific questions to Layer 7.**

The original tooling inventory was general. Expand to explicitly cover industry-specific tools that didn't surface in Lauren's discovery (only came up later from folder review):

### Document signing / e-signature
- "Do you have an e-signature tool? PandaDoc, DocuSign, HelloSign, Adobe Sign?"
- "When you onboard a new client / employee / contractor, how do they sign agreements?"

### Industry-specific CRM
- For service businesses: "Do you have a CRM specific to your industry? E.g., for pet care: Time To Pet, Pet Sitter Plus, Precise Petcare. For real estate: Top Producer, Lofty. For consulting: Dubsado, HoneyBook."
- "If not, where do client records actually live today?"

### Compliance + protections
- "What's your insurance situation? Liability, bonding, professional, vehicle, workers comp?"
- "Background check provider, if any?"
- "Industry-specific compliance — licenses, certifications, regulatory portals?"

### E-commerce + payments
- "Do you sell anything online? Shopify, Etsy, Square Online, Amazon, custom?"
- "How do you take payment from clients? In-person, online, invoice-based?"
- "Stripe, Square, PayPal, Venmo Business?"

### Email + marketing
- "Do you have an email list? What tool? ConvertKit, Mailchimp, Resend?"
- "What about a CRM for prospects (vs. clients)? HubSpot, Pipedrive?"

### Booking + scheduling
- "Self-serve booking tool for clients? Calendly, Acuity, Square Appointments, Cal.com?"
- "Scheduling for your team? When I Work, 7shifts, custom?"

### Operations-specific
- For restaurants: POS, supplier portals, health code apps
- For real estate: MLS, electronic key access
- For fitness: class scheduling (Mindbody, ClassPass partner)
- For service businesses: dispatch / routing tools
- For e-commerce: fulfillment (ShipStation, Shopify Fulfillment)

### Customer support
- "Anything for handling customer support? Help Scout, Zendesk, Gorgias, just inbox?"

### AI tools
- "Are you using any AI tools today? Claude, ChatGPT, Gemini, Whisper (transcription), Otter (meetings)?"

The expanded questions identify both *existing investments* (tools to integrate around) and *gaps* (potential tooling recommendations after the engagement).

## Amendment 3 — Reframe "compliance gaps" → "compliance inventory"

**Apply throughout the discovery, especially Layer 7 (Tooling) and any conversation about insurance / legal / compliance.**

Old framing (Lauren's discovery): "What compliance items are missing?"
**New framing:** "What compliance items are in place, and which need attention?"

The change matters because:
- Most established businesses have *more* compliance documentation than discovery surfaces — it's just scattered
- The "missing" framing assumes worst-case and over-authors corrective work
- The "inventory" framing surfaces what exists first; gaps become evident by contrast

### Specific question replacements

| Old question | New question |
|---|---|
| "Do you have insurance set up?" | "What insurance do you have? Liability, bonding, vehicle, workers comp? Walk me through what's bound." |
| "Are you formed as an LLC?" | "What's your business entity structure? LLC, sole prop, S-corp? When was that set up?" |
| "Do you have employee paperwork?" | "Walk me through how a new sitter / employee gets onboarded — what paperwork do they sign? Where does it live?" |
| "Are background checks done?" | "What's your current process for vetting new hires? Background check provider, when in the process, how documented?" |
| "Do you have a cancellation policy?" | "What's the client experience when they cancel? Is there a written policy? Where does it live?" |

The new questions assume something exists; the customer confirms or corrects.

## Amendment 4 — Closing question for Layer 6 (Next Step)

**Add this question at the end of Layer 6:**

> *"What's something you already have that you wish was more organized?"*

This question surfaces **scattered-but-existing** assets — Lauren-shaped problems where the work isn't to *author* but to *consolidate*. It's the inverse of "what's missing?" and gives the consultant a much sharper read on what to build.

Examples of answers:
- "My care plans live in like four different Google Docs — I never find the one I need"
- "I've got business plans from like three versions ago and they don't match what we actually do"
- "All my financial stuff is in QuickBooks, Venmo, Google Sheets, and a notebook"

Each answer surfaces a consolidation opportunity that's much more valuable to the customer than authoring something net-new.

## Amendment 5 — Add "Phase 8" — Post-discovery folder deep review

**Add as a Phase 8, after the 7 layers complete.**

Within 24 hours of discovery, do a thorough review of the customer's actual folder. This is the **deep version** of the Phase 0 pre-discovery skim. Now you know what to look for because discovery told you.

Catalog:
- **Existing assets** by category — compliance, training, plans, financial, marketing, customer records
- **Tools confirmed in use** — from real artifacts, not just self-report
- **Industry-specific tools surfaced** that weren't in the discovery conversation
- **Quality of existing documentation** — is it well-organized? Current? Stale?
- **Estimated migration effort** — for Shape B (full vault) determination
- **Hidden gems** — documents the customer didn't mention but that are valuable

The Phase 8 review feeds the deliverable triage decision in `post-discovery-deliverable-playbook.md`.

## Amendment 6 — Discovery captures into the vault from minute one

**Add to the "Capture protocol" section of the existing framework.**

Discovery captures (transcript, summary, your notes) belong in the customer's eventual vault at `_sessions/raw/`. Even if the customer doesn't have a vault yet, save these into a placeholder location that gets transferred during deliverable build.

The raw IS the source of truth. The compiled idea dump is a synthesis layer; the entity profiles and pillar specs are further-compiled. When in doubt about what was actually said, the raw transcript wins.

**Specifically:**
- Recorded session → save transcript + summary as markdown files
- Live notes → save as `_sessions/raw/<date>-discovery-session-notes.md`
- Photos / whiteboard captures → save into the same folder
- Pre-discovery folder review notes → save as `_sessions/raw/<date>-pre-discovery-folder-review.md`

## What changes after these amendments merge

The discovery framework gets longer but sharper. Estimated time impact:
- Pre-discovery folder review: +30-60 min of consultant time before the call
- Discovery session itself: unchanged (still 60-120 min)
- Post-discovery folder deep review: +1-2 hours of consultant time after the call
- Total: ~1-3 extra consultant hours per engagement

**Worth it.** Lauren's engagement showed the cost of skipping these: weeks of work corrected later, "12 compliance gaps" that were mostly already closed, deliverable shape chosen without folder context, raw transcripts added retroactively.

## Ratification path

These amendments are **PROPOSED**. Ratify (merge into main framework) when:
- Customer #2 engagement applies them and they hold up
- Or sooner if the owner decides they're obviously correct

After ratification: merge content into `business-discovery-framework.md` and `business-discovery-framework.html`; archive this amendment file with status `RATIFIED <date>`.

## Companion

- `business-discovery-framework.md` — the parent framework being amended
- `post-discovery-deliverable-playbook.md` — what to do *with* the discovery findings
- `onboarding-handoff-framework.md` — what happens after the deliverable lands
- `a consulting practice/_ideas/lauren-engagement-retro-2026-05-20.md` — the retro that generated these amendments
