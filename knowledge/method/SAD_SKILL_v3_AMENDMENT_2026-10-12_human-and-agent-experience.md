---
type: methodology-amendment-proposal
spec-layer: methodology
version: 3.0.15
source: hybrid
ai-model: claude-opus-5.5
created: 2026-10-12
authorship: hybrid
authors: [the author, Claude]
ip-sensitivity: normal
scope: global
scope-entity: "[[SAD_SKILL_v3]]"
target-document: "[[sad/SAD_SKILL_v3]]"
authority: constitutional
decision-status: proposed
status: PROPOSED
progress: "Founder insight 2026-10-12, from reviewing the reference system prototype. Proposed; not applied to SAD v3 until the owner ratifies."
change-class: 2
governed-by:
  - "[[SAD_SKILL_v3]]"
sections-affected:
  - "[[DOMAIN_AND_SYSTEMS_DESIGN_METHOD]]: experience layer asks who the user is, human or agent"
  - "Experience documents: XD-01 users and jobs gains a 'kind of user' column; a new agent-experience set (AX-*)"
  - "Test strategy guidance: the prototype is the human-experience test bed; the test suite is the agent-experience surface"
  - "design-documents.registry.json: AX entries (on ratification)"
related-amendments:
  - "[[SAD_SKILL_v3_AMENDMENT_2026-10-11_experience-and-interface-design]]"
related:
  - "a project note"
  - "OS-ADR-0004-agent-access-human-principal (tchjhnsn/polity: docs/adr/OS-ADR-0004-agent-access-human-principal.md)"
tags: [methodology, sad, experience-design, agent-experience, human-experience, prototype, testing]
description: "v3.0.15 proposal: the experience layer must first ask who the user is. A person and an agent are different users with different experiences: people need clarity, calm, trust and few steps in their own words; agents need stable contracts, machine-readable states, determinism, explicit errors and a principal to act for. Design each separately: human experience (HX, today's XD/UI documents) and agent experience (AX, new). A prototype is the human-experience test bed and carries no testing controls; a test suite is the agent-experience surface and carries no product screens."
---

# Human experience and agent experience

> **Founder insight (2026-10-12):** "The prototype is my testing suite because I'm testing the human experience. The test suite is yours, the agent experience. That may be a new concept of how we divide user experience, because now we have to ask who the user is."

## Why

v3.0.14 put experience design before interface and systems design, but assumed the user is a person. the reference system showed the gap within a day: a page meant for officials grew testing controls ("start a run", "sandbox chain", "run the harness") because the agents that test the system needed them, and the person reviewing the experience couldn't tell what they were for. Agents are now first-class users (OS-ADR-0004: headless by design, agents as callers acting for a human principal), so every product has at least two kinds of user, and one experience can't serve both.

## §NEW.18 Ask who the user is

The experience layer starts by naming each user **and its kind**:

| Kind | Needs | Fails when |
|---|---|---|
| **Person** | Their own words; clarity; calm; trust; few steps; accessibility | Shown machinery, jargon, or controls meant for someone else |
| **Agent** | Stable contracts; machine-readable states and errors; determinism and idempotence; discoverability; a principal and a grant to act for | Given screens to scrape, ambiguous states, or silent failures |

XD-01 (users and jobs) gains a **kind** column. A job may have both kinds (a resident asks to speak; their agent submits the request for them), and then each kind gets its own experience of the same job.

## §NEW.19 Two experience sets

- **Human experience (HX):** today's experience and interface documents (XD-01..10, UI-01..08), unchanged.
- **Agent experience (AX):** a new, smaller set, to be drafted on ratification:
  - **AX-01 Agents and their principals:** which agents act, for whom, under what grant.
  - **AX-02 Agent jobs:** what agents do, as job stories.
  - **AX-03 Contracts and states:** the operations, states and errors agents see, machine-readable, versioned.
  - **AX-04 Discovery and onboarding:** how an agent learns what it can do.
  - **AX-05 Agent verification:** harnesses, drills and oracles; what passing means.

The back end answers both: the front-end contract (UI-06) for people and the agent contract (AX-03) for agents. Usually they share operations; they never share surfaces.

## §NEW.20 Prototype and test suite are different products

- **The prototype is the human-experience test bed.** People use it as real users will. It carries no testing controls or testing words. A prototype may have a clearly separated prototype panel (for example, "experience as" another fictional person) that never exists in the product.
- **The test suite is the agent-experience surface.** Commands, APIs and findings files; no product screens.
- Each is accepted by its own kind of check: the prototype by people (and by screen-reading checks of what people would see); the test suite by its oracles.

## On ratification

- Add §NEW.18–20 to SAD v3 (v3.0.15) and the method document.
- Add AX-01..05 to the design-documents registry, gated for entities whose design profile declares agent users.
- the reference system adopts it first (UI-09 already applies §NEW.20).
