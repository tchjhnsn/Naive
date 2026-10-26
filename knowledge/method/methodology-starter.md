---
type: methodology-starter
ai-model: none
source: human
created: 2026-05-19T05:11:51Z
tags: [methodology, starter, generalized, any-business, operator-onboarding]
related-entities:
  - "a project note"
  - "[[everything-ecosystem]]"
status: living-document
audience: operators new to methodology-driven work
---

# Starter Methodology for Operators

A stripped-down, generalized version of the methodology — designed for any kind of operator running any kind of business. Use this to organize your vault on day one. Graduate to the full methodology later as your work demands more structure.

## What this is

A simple framework for thinking about your business and the work you do on it. It gives you:

- A **vault structure** — folders that match how your business actually works
- A **shared vocabulary** — names for the things you're doing, so you can talk about them
- A **handful of moves** — six small skills that, used together, keep ideas flowing and the business moving
- Two **thinking frameworks** — one for ambition (BASED) and one for scope (SMART)

The methodology doesn't tell you what to build. It tells you *how to think* about what you're building, in a way that compounds.

---

## The three pillars

Every business has three sides. Some businesses lean heavily on one or two; some balance all three. Your vault organizes around these:

| Pillar | What it covers |
|---|---|
| **Product / Service** | What you actually do or sell. The offering itself. For a pet-sitter: the visits, the boarding, the walks. For a baker: the bread, the menu, the recipes. |
| **Brand** | How the world experiences you. Name, voice, visual identity, story, reputation. The feeling someone gets when they think of your business. |
| **Business** | The operational + financial + legal side. Pricing, contracts, taxes, insurance, hiring, supplier relationships, banking. The infrastructure that keeps everything running. |

Not every pillar needs the same attention at every moment. Sometimes you're heads-down on the product; sometimes you're rebuilding the brand; sometimes you're sorting out legal. The pillars give you names for what you're working on so you don't lose track.

---

## The four lifecycle stages

An entity (a business, a project, a service line, an idea) moves through stages over time. We keep this simple:

| Stage | Meaning |
|---|---|
| **Idea** | Something noticed. A possibility. Lives in `_ideas/`. Not yet committed to. |
| **Articulating** | Worked on enough to write down what it actually is. Has an `entity-profile`. Still figuring it out. |
| **Active** | Running in the world. Doing the thing. Has real customers / users / output. |
| **Resting** | Stable and not changing much (maintenance), OR done / superseded (archived). |

Don't confuse "idea" with "articulating." Ideas are cheap; articulating them takes real time. The methodology helps you decide which ideas deserve articulation work.

---

## Your vault structure

This is the folder layout you start with. It grows as you grow.

```
your-vault/
├── _ideas/                       ← any idea, captured fast
├── _sessions/
│   ├── SESSION_LOG.md            ← what you did and when
│   ├── raw/                      ← raw session notes
│   └── planned/                  ← sessions you've planned but not done yet
├── _meta/
│   ├── templates/                ← templates for new notes
│   └── tooling-inventory.md      ← every tool you use
├── your-business/                ← your main entity (named whatever)
│   ├── entity-profile.md         ← who and what this business is
│   ├── _ideas/                   ← ideas specific to this business
│   ├── product/                  ← service offering, pricing, delivery
│   ├── brand/                    ← identity, voice, visuals, story
│   └── business/                 ← operations, finance, legal
└── (later: other entities, side projects, future surfaces)
```

A few things about this structure:

- **Folders are flat under `_ideas/`** — ideas don't get filed into subfolders; they get tagged via frontmatter.
- **`_sessions/` is your memory** — what happened, when, and what's planned next.
- **Pillars are explicit** — each pillar gets its own folder under the entity so you always know which side of the business a note belongs to.
- **`_meta/` is infrastructure** — templates and tool inventories that support the rest of the vault.

---

## The six core moves

Six small skills. Each one is something you'll do regularly. Together they form the entire rhythm.

### 1. Capture an idea

Drop a markdown file into `_ideas/` whenever something occurs to you. Tiny. Don't refine it. Just get it captured.

```yaml
---
type: idea
created: 2026-05-20T...
tags: [whatever]
---

# Quick title

What the idea is, in a sentence or three.
```

### 2. Articulate an entity

When an idea graduates into something worth committing to, give it an `entity-profile.md` and a folder. Now it's an entity.

### 3. BASED a vision

For any entity you commit to, write down its **uncensored** ambition. The largest, most vivid, most honest version. (See *BASED* below.)

### 4. SMART a scope

Take the unbounded vision and carve a specific, time-bound slice you can actually do. (See *SMART* below.)

### 5. End a session

When you stop working, take five minutes. Add a brief entry to `SESSION_LOG.md`: what you did, what you touched, what came up. This is your memory.

### 6. Plan a session

Before stopping (or first thing next time), drop a note in `_sessions/planned/`. What's the next bounded chunk of work? What would moving the needle look like?

---

## Two thinking frameworks

### BASED — for ambition

When articulating what you actually want, refuse to pre-narrow it. Each letter is a check against self-censorship:

- **B**road — is the aperture wide enough?
- **A**udacious — would you be willing to say this out loud?
- **S**illy — is there a vivid, playful version of this?
- **E**gotistical — are you willing to put yourself at the center?
- **D**elusional — are you refusing current evidence long enough to imagine what isn't yet?

The acronym spells *based* — confident, grounded in your own truth. BASED ambitions can be local or global, modest in scale or enormous. What matters is honesty about the fullest extent of what you actually want.

> *A baker whose BASED ambition is to be the most beloved local baker in her city — with inventions crazier than Willy Wonka, smells so strong they lift people off their feet, and tastes so good her bakery becomes the most well-known establishment in the entire city. That's a fully BASED ambition. It's local. It's also maximally honest.*

### SMART — for scope

Once you have the BASED vision, carve a piece of it you can actually do. Five-letter check:

- **S**pecific — what exactly is the thing?
- **M**easurable — how will you know it's done?
- **A**chievable — is it really doable with what you have?
- **R**elevant — does it move you toward the bigger vision?
- **T**ime-bound — by when?

BASED keeps the dream big. SMART keeps the work real. You need both.

---

## Daily rhythm

A typical day or week using the methodology looks like:

**Morning**
- Open your vault
- Check `_sessions/planned/` — what did past-you queue up for now-you?
- Do the work

**As you go**
- Capture ideas into `_ideas/` the moment they arise (don't lose them)
- Update entity profiles as the truth about your business shifts

**End of session**
- Five minutes to log what happened in `SESSION_LOG.md`
- Plan the next session — what's the next bounded thing?

**Weekly**
- Review what's in `_ideas/` — does anything want to graduate to an entity?
- Glance over your entities — anything stuck? Anything ready to move stages?

The whole thing should feel like *thinking on paper*. Not like a chore.

---

## Frontmatter cheat sheet

Every note has frontmatter at the top. The minimum:

```yaml
---
type: <note type>
created: <ISO date>
tags: []
---
```

Types you'll use most:

| Type | When to use |
|---|---|
| `idea` | A note in `_ideas/` |
| `entity-profile` | A note describing an entity |
| `session-log` | An entry in `SESSION_LOG.md` |
| `planned-session` | A note in `_sessions/planned/` |
| `code-pointer` | A note pointing to a code repo (later) |

Entity profiles add a couple of fields:

```yaml
type: entity-profile
entity-class: business
lifecycle-stage: articulating
sector: pet-services         # whatever describes the industry
```

That's it. The full methodology has more frontmatter, but you don't need it yet.

---

## What's deliberately not in here

The full methodology has more — phases (0A through 2), specific spec stacks, version categorization, provider catalogs, multiple skill bundles. You don't need any of it today. Graduate to it as your work demands more structure. The starter version above is what we know works on day one for any business.

---

## What to do right now

If you're reading this for the first time and want to use it:

1. Create the folder structure above in your vault
2. Pick the one entity that matters most (probably the business)
3. Create its `entity-profile.md`
4. Spend 30 minutes on a BASED articulation of what you actually want this business to be
5. Spend 30 more minutes on a SMART version of what you'll do this season
6. Drop a few ideas into `_ideas/` as they come up
7. Plan tomorrow's first session

You don't have to do all of these alone. The consultant is here to help you do them together. But you can re-read this and run any of these steps on your own at any time.

---

*Version 0.1 · 2026-05-19. This is a living document. As you use it and discover what's missing, refine it.*
