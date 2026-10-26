---
type: knowledge
source: hybrid
created: 2026-03-26
ai-model: claude
tags: [everything-ecosystem, systems]
---
# Person Profile System

This system manages person profiles, position schemas, and the relationships between people,
positions, and entities. A person is genuinely different from a product or company — the person
profile shares structural DNA with entity profiles (identity, relationships, lifecycle, no blanks,
changelog) but has different sections reflecting what a person actually is.

The person is the root node above the ecosystem level. A person has ecosystems; ecosystems have
entities.

## Person Profile Schema

### Identity
Name, roles, public presence (websites, profiles, handles), date created, version.

### Capacities
What the person can do and knows. Replaces "pillars" from the entity profile. Each capacity has:
- Description
- Development level (beginner, developing, proficient, expert, or custom)
- Status: active or dormant

Not fixed — new capacities emerge, old ones go dormant. A capacity going dormant is not failure;
it's a natural part of a person's evolution.

### Projects & Relationships
Every project the person connects to, with:
- **Nature of commitment:** founder, contractor, collaborator, hobbyist
- **Emotional investment:** passion, obligation, curiosity
- **Time horizon:** indefinite, time-boxed, one-off
- **Intended outcome:** build company, learn, ship, explore, help friend

This enables framework calibration per project. A personal hobby and a venture-backed startup
get different treatment.

### Relationships to People
Other people the person relates to, with:
- Role (colleague, mentor, friend, client)
- Shared project context (if any)
- Nature (professional, personal, mentorship)

Handles organizational modeling: C-suite relationships, team structures, external collaborators.

### Visibility
What's public vs. private about this person. Per-attribute granularity — some capacities are
public (listed on portfolio), others are private.

### Lifecycle
Professional journey stage: early career, building, scaling, transitioning, or custom stages.
This is not a linear progression — people cycle through stages.

### Documentation Audit
What personal documents exist: resume, website/portfolio, mission statement, professional bio,
public profiles. Gaps flagged the same way entity documentation gaps are flagged.

### Changelog
Same as entity profiles — record of changes over time.

### Context
Open-ended flexible section for anything that doesn't fit core sections:
- Age, personal deadlines
- Aspirational models ("I want to lead like Jensen Huang")
- Values, constraints, philosophical commitments
- Life context that affects work (moving, family, health)

Semi-structured: each entry has date, source conversation, optional idea status.

The framework should treat offhand remarks as potential context entries and confirm with the
person: "You mentioned wanting to be like Jensen Huang as a leader. Should I capture that in
your context?" The framework actively references Context when calibrating behavior and making
recommendations.

## Person Profile File Format

```markdown
# Person Profile — [Name]

**Version:** [N]
**Created:** [date]
**Last Updated:** [date]

## Identity
- **Name:** [name]
- **Roles:** [list of current roles]
- **Public Presence:** [websites, profiles, handles]

## Capacities
| Capacity | Development Level | Status |
|----------|------------------|--------|
| [name]   | [level]          | active/dormant |

## Projects & Relationships
| Project | Commitment | Investment | Horizon | Outcome |
|---------|-----------|------------|---------|---------|
| [name]  | [type]    | [type]     | [type]  | [type]  |

## Relationships to People
| Person | Role | Shared Context | Nature |
|--------|------|---------------|--------|
| [name] | [role] | [project/none] | [type] |

## Visibility
[per-attribute visibility decisions]

## Lifecycle
**Current Stage:** [stage]

## Documentation Audit
[what exists vs. what should exist]

## Changelog
[entries with dates]

## Context
[semi-structured entries]
```

## Position Schemas

**Canonical system:** [[position-schema]] (`knowledge/systems/position-schema.md`, 2026-08-10). Completes [[idea-073-position-schema-separate-from-person]].

A position is a structural seat in an organization. It exists whether or not anyone occupies it. Positions are separate from person profiles and entity profiles. **Occupancy** may be `human` · `agent` · `vacant` · `hybrid`. **Staffing posture** (`human-required` · `agent-capable` · `agent-preferred` · `undecided`) decides fill path before hiring or automation. **Assignments** bind seats to teams, projects, and portfolio entities.

Role *templates* live in `company-template/roles/`. Position *instances* live on the entity (default `business/org/positions/`). Template: `_meta/templates/tpl-position.md`.

### Person-Position Relationship

When a person fills a position:
- Which position
- Start date
- Whether current
- The distinction between personal-capacity and positional-capacity actions/resources

The person's attributes do not merge with the position's attributes. They are linked but separate.

### Action Attribution

Actions should be attributable to:
- **Person-capacity:** personal funds, personal expertise, personal relationships
- **Position-capacity:** institutional authority, budget allocation, formal decisions
- **Ambiguous/both:** when the line is unclear

Examples:
- "the owner decided to use Neo4j" — is this CEO authority (position) or technical expertise (person)?
- "The CTO approved the architecture" — position-capacity
- "The CTO suggested a novel algorithm from their PhD research" — person-capacity

The framework represents ambiguity rather than forcing a choice. The question "which capacity?"
is structurally meaningful and should be askable at any point.

## Three Interacting Schemas

The complete picture:
- **Person profiles** — humans, their capacities, their context
- **Position schemas** — structural roles, their authorities and constraints
- **Entity profiles** — projects, products, organizations

Persons fill positions. Positions belong to entities. Persons relate to entities both through
positions and directly. All three schemas interact; changes to one may affect the others.

## Multiple Person Profiles

The same schema works for:
- **The person using the framework** — detailed, accumulates over time through conversations
- **Any person being modeled within a structure** — only as detailed as available information
  allows. Another project modeling a government uses the same person profile schema for the president
  as the framework uses for its own user.

## Operations

### Creating a Person Profile
Walk through each section with the person. For the primary user's profile, this builds over
time — don't force full completion in one session. Capture what's offered and note what's
unspecified.

### Updating a Person Profile
When the person mentions new capacities, new projects, changed relationships, or context:
update the relevant section. Confirm changes with the person. Log in changelog.

### Creating a Position Schema
When modeling an organization, create position schemas for key roles. These can be created
before anyone fills them — the position exists independently.

### Linking Person to Position
When a person fills a position, create the linkage with start date and capacity attribution
rules. Flag when actions could be attributed to either capacity.

## Handoff Triggers

**→ Orchestrator:** Person profile updates recalibrate how the orchestrator behaves. New project
relationships may trigger entity profiling for newly mentioned entities.

**→ Entity Profiling:** Position schemas belong to entities — creating a position may trigger
entity profile updates.

**→ Diagnostic System:** Person profile data (project commitments, emotional investment, time
horizons) is useful for strategic planning recommendations.
