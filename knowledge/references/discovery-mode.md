---
type: knowledge
source: hybrid
created: 2026-03-24
ai-model: claude
tags: [everything-ecosystem, references]
---
# Discovery Mode — Creating a New Entity Profile

This mode guides the creation of a new entity profile from scratch. The AI walks the user through a structured
interview, classifies the entity, assesses its pillars, maps its relationships, and produces a completed profile.

The interview should feel conversational, not like a form. Ask questions naturally. Let the user's answers guide
which questions come next. Not every question applies to every entity — adapt based on what you learn.

**Respect the engagement mode.** In guided mode, walk through each question and wait for responses. In
autonomous mode, analyze available evidence, produce the best entity profile you can, and present it for
correction. In exploratory mode, surface possibilities and keep classifications open. The engagement mode
can be different for different pillars — the user may want to be deeply involved in product decisions while
offloading brand decisions entirely.

---

## Phase 1: What Is This Thing?

Start broad. Understand the idea before trying to classify it.

**Opening questions (pick the most natural ones based on context):**
- What are you building? / What is this thing?
- What does it do? Who is it for?
- Does it already exist in some form, or is it purely an idea right now?
- Is this a technical product (software, hardware) or something else (a service, content, a physical product)?
- Is this something new you want to create, or something that already exists that you want to classify?

**Follow-up questions based on responses:**
- If technical: What technology does it use? Is there a codebase? What stage is the code in?
- If non-technical: What form does it take? A physical product? A service? Content?
- If it already exists: Where does it live right now? Is it in a repo? A folder? Just in your head?
- If it's an idea: How developed is the idea? Do you have a spec? A prototype? A sketch?

**When the codebase is the only artifact (no docs, no spec, no idea dump):**

Sometimes an entity exists solely as code. There is no README, no spec, no idea dump, no written
description of what it's meant to be. In these cases, the codebase itself is the source of truth and
must be analyzed from first principles to determine what the entity is.

If the user says "there's just code" or if you discover that no documentation exists:
1. **Examine the codebase directly.** Read the directory structure, package.json or equivalent
   manifests, data models, route definitions, component hierarchy, and any configuration files.
2. **Infer the product's purpose from its structure.** What do the routes suggest about user flows?
   What do the data models suggest about the domain? What do the dependencies suggest about the
   product's capabilities? What does the UI component structure (if any) suggest about user interaction?
3. **Assess the implementation stage.** Is this a stub with boilerplate? A partially working prototype?
   A functioning application? The code's maturity tells you where the product pillar stands.
4. **Form a preliminary description.** Before asking the user to confirm, state what you believe
   the product is and does based on what the code reveals. This gives the user something concrete
   to confirm, correct, or expand on — rather than asking open-ended questions about something
   they may not have fully articulated yet.
5. **Flag the documentation gap.** A codebase without documentation is a product in implementation
   without having completed the documentation stage. This is a finding, not a judgment. Note it and
   proceed to Phase 2 with what you know.

This approach also applies when documentation exists but is outdated or incomplete. If the code
has evolved beyond what the docs describe, the code is the more reliable source of truth.

**Do not classify yet.** Gather enough information to form an assessment, but present the classification in Phase 2
with your reasoning. The user confirms or corrects.

---

## Phase 2: Classification

Based on what you've learned, propose a classification with your reasoning.

**Present your assessment like this:**
"Based on what you've described, I think this is a [classification] because [reasoning]. Here's my thinking:
- It [does/doesn't] have its own product...
- It [does/doesn't] have its own brand...
- It [does/doesn't] have its own business...
- Its operations [are/aren't] separate from [parent entity]..."

**Run the independence test:**
- Does it have its own product? (What problem does it solve? Does it serve users directly?)
- Does it have its own brand? (Do people perceive it independently? Is the brand being shaped intentionally?)
- Does it have its own business? (Does it generate revenue? Does it have its own economic logic?)
- Does it have operations and identity separate from the parent's core?
- Would users identify with it independently of any other entity?

**Classification options:**
- Ecosystem — top-level entity containing and governing multiple child entities unified by a shared mission
- Subsidiary — yes to all, operations and identity fully separate
- Product within a company — has a product, may have some pillar development, but operates under parent's identity
- Open source tool — product released publicly, may have community governance, no independent business
- Internal tool — serves internal operations, no external users
- Shared infrastructure — serves multiple entities, no brand or business of its own
- Unplaced idea — not yet classifiable, and that's OK

**Classification confidence:** Mark the classification as confirmed (user agrees, evidence is strong),
provisional (best assessment from available evidence, may change with more information), or inconclusive
(insufficient evidence to classify — note what information would resolve it).

**Potential trajectory:** If the entity's future is an open question (e.g., a hobby project that could
become commercial, open source, or remain personal), capture the possible trajectories. This is separate
from classification — it's about what the entity could become, not what it currently is.

**If the user disagrees with your classification, explore why.** Their disagreement may reveal information you
didn't have, or it may reveal a misunderstanding worth clarifying. The user has final say on classification,
but the AI should explain the implications of the choice.

---

## Phase 3: Pillar Assessment

For each of the three pillars, assess the current state and the intended state.

### Product Pillar
- What does this entity produce, create, or build? Describe the made thing in plain language.
- What is the product orientation? Is this an offering (delivered to external users/customers), operational
  capability (built to enable other entities), or enabling infrastructure (shared foundation)?
- What stage is it in? (ideation, documentation, implementation, production)
- If technical: Is there a codebase? Where does it live? What's the tech stack?
- If non-technical: What form does the product take?
- What are the key artifacts that exist right now? (specs, prototypes, code, designs, factories, facilities)
- Is SAD (Specification-Anchored Development) applicable? (Only for technical products entering documentation/implementation)
- **Product composition (if the product is complex enough):** Does this product contain what feel like other
  products within it? If so, identify:
  - Core: What is the fundamental capability that everything else depends on?
  - Variants: Are there different versions optimized for different tradeoffs?
  - Surfaces: Are there distinct product experiences for different user types?
  - Platform capabilities: Is there infrastructure that extends what the surfaces can do?
  - Are any components developing enough independence to warrant their own entity profile?

### Brand Pillar
- Is a brand being intentionally developed? Or is perception forming passively?
- What is the brand-product relationship? (product creates brand, brand creates product, brand is the product, co-developed)
- Does the brand have or need its own operations? (events, merchandise, marketing, partnerships)
- What brand artifacts exist? (name, visual identity, style guide, voice/tone docs, marketing materials)
- What lifecycle stage is the brand in? (ideation, documentation, implementation, production)

### Business Pillar
- Is there a revenue model? What is it?
- Does the business have its own products? (pricing tiers, subscription models, enterprise plans, contracts)
- Can the business sustain itself independently, or is it subsidized by another entity?
- What business artifacts exist? (financial models, pricing docs, contracts, partnership agreements)
- What lifecycle stage is the business in? (ideation, documentation, implementation, production)

**For pillars that are intentionally absent, confirm and document why.** "You mentioned this is an open source
tool with no business model. Is that an intentional choice, or something you plan to develop later?"

---

## Phase 4: Mission and Relationships

### Mission Alignment
- Does this entity belong to a larger ecosystem? If so, which one?
- What is the ecosystem's mission?
- How does this entity contribute to that mission?
- If the entity doesn't belong to an ecosystem, is it standalone? Is that intentional?

### Relationship Mapping
For each entity this one relates to:
- What is the other entity?
- What type of relationship exists? (horizontal, vertical, diagonal, radial, loose affiliation, external dependency)
- How strong is the relationship? (strong, moderate, weak, emerging)
- Is the relationship bidirectional or one-directional?
- Can each entity succeed independently of this relationship?
- Are there potential diagonal movements that haven't been realized yet?
- Are there external dependencies that should be noted? (entities outside the ecosystem that are relied upon)

**If relationship types are ambiguous (like Tesla's solar business relative to vehicles), note the ambiguity
and explain both readings.** Don't force a category.

---

## Phase 5: Visibility and Infrastructure

For each asset the entity produces or will produce:
- Source code: public, private, or partially public?
- Documentation: public, private, or internal?
- Brand assets: public, private, or internal?
- Business documents: public, private, or internal?
- Does this entity need its own repository? If so, public or private?
- Does this entity need its own website?
- What tools and accounts are needed for its current lifecycle stage?

---

## Phase 6: Generate the Entity Profile and Documentation Audit

Compile everything from the previous phases into the entity profile schema (see `entity-profile-schema.md`).
Present it to the user for review. Ask if anything needs to be corrected or added.

Save the completed profile as `ENTITY_PROFILE.md` in the appropriate location — either within the entity's
project folder or in a central profiles directory, depending on the user's folder structure.

**After generating the entity profile, produce a documentation audit.** Compare what documentation exists
for this entity against what is expected given its pillar lifecycle stages (see `references/documentation-expectations.md`).
Produce a brief gap analysis:
- What documentation exists
- What documentation is expected but missing (with priority: critical, important, recommended)
- Recommended next documentation to produce, with reasoning

Include this audit as a section in the entity profile output, or as a companion document alongside it.

If the entity has child entities that were identified during discovery (e.g., the brand pillar has its own
operations that warrant a separate profile), note them in the Child Entities section and offer to run Discovery
Mode for each child.
