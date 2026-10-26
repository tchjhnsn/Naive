---
type: reference
source: hybrid
ai-model: claude-opus-5
created: 2026-08-11
updated: 2026-08-11
authority: exploratory
decision-status: none
governed-by:
  - "[[SAD_SKILL_v3]]"
  - "[[CLAUDE]]"
status: ACTIVE
description: "Prior-art research on Block's Buzz (buzz.xyz) — human+agent workspace on Nostr — and how it relates to SAD, position-schema, and tooling options. Captured from the owner's idea-dump; not an adoption decision."
tags: [reference, prior-art, buzz, sad, agents, tooling, hybrid-occupancy, research]
related:
  - "[[idea-dump-buzz-xyz-sad-prior-art-2026-08-10]]"
  - "[[position-schema]]"
  - "[[SAD_SKILL_v3]]"
  - "[[idea-167-tooling-layer-thought-partner]]"
  - "[[sad-methodology]]"
  - "[[sdd-software-factory-sdlc-prior-art-2026-08-11]]"
---

# Buzz.xyz — prior art for SAD-shaped collaboration

**Status:** Research pass (2026-08-11). Compiles public primaries + secondary analysis. **Not** an adoption decision.

**Seed:** The owner called Buzz “the best implementation I’ve seen of what SAD is trying to be” ([[idea-dump-buzz-xyz-sad-prior-art-2026-08-10]]). This note separates (a) what Buzz *is*, (b) what it rhymes with in SAD, (c) what it is *not*, (d) how we might *use* it.

## Sources (primary first)

| Source | Role |
|---|---|
| [buzz.xyz](https://buzz.xyz) | Product surface (early / developer preview) |
| [Block announcement](https://block.xyz/inside/introducing-buzz-where-humans-and-agents-work-together) (2026-07-21) | Positioning |
| [Engineering post](https://engineering.block.xyz/blog/buzz) | Design rationale, swarm story, Git-on-object-storage |
| [github.com/block/buzz](https://github.com/block/buzz) README + VISION_AGENT.md | Capabilities, maturity matrix, agent architecture |
| Secondary: Digital Applied capability review (2026-08-08) | Caveats (ACL depth, audit limits, doc disagreements) — treat as analysis, not vendor truth |

License: **Apache-2.0**. Builder: **Block**. Repo public since ~March 2026; public launch posts ~July 21, 2026.

---

## What Buzz actually is

One sentence: **a self-hostable team workspace where humans and AI agents are equal members of the same rooms**, on a **Nostr relay you can own**, with a **shared signed event log** (chat, workflows, git events, approvals).

### Product shape

- Feels like Slack/Discord-class collab: channels, threads, DMs, media, canvases, search, voice huddles (lifecycle still wiring)
- Agents are **members**, not “bots posting as you”
- Git hosting + NIP-34 git events; “branch as room” — feature work gets a short-lived channel where patches, CI, review, and merge decision share one record
- YAML workflows (message / reaction / schedule / webhook triggers); approval-gate glue still early
- Model- and harness-agnostic: Claude Code, Codex, goose, etc. via **ACP** (`buzz-acp`); agent-first CLI (`buzz-cli`, JSON in/out)
- Desktop app (Tauri); hosted community at buzz.xyz **or** self-host (Docker Compose / Railway, etc.)

### The load-bearing design choice: identity

| Usual agent tooling | Buzz |
|---|---|
| Agent borrows human / service-account credentials | Each agent gets its **own cryptographic keypair** |
| Authorship muddied (“did the bot or Alice do that?”) | Owner signs **authorization**; agent signs **its own work** — authorship ≠ authority |
| Private prompt windows + Slack as ferry | Shared room = shared context; agents act on what the team already knows |

Engineering framing: *“The bottleneck moved from intelligence to coordination.”* Humans stopped enjoying being middleware between agent harness and chat.

### Explicit non-claims (from their README)

- Not blockchain
- Not an AI-replacement plan — “works best when humans stay in the loop and agents stay in the room”
- Not finished — they publish a works / wiring / opinions table

### Caveats worth keeping (esp. if we adopt operationally)

- **Access control is channel membership** (SECURITY.md per secondary review): coarse by design; not a fine-grained capability taxonomy
- **Audit log is tamper-evident, not tamper-resistant** if an attacker can rewrite the DB
- Early product; some features (mobile, approval gates, culture/reputation) unfinished
- Secondary sources note internal doc disagreements (e.g. rate limiting) — verify against current ARCHITECTURE.md before compliance / swarm-scale bets
- “Decentralized” here means **sovereignty of keys + self-host**, not a gossip mesh — the relay is still the single source of truth for a community

---

## Map to SAD (rhyme ≠ identity)

Buzz is a **runtime coordination substrate**. SAD is a **methodology** (vision → version → spec convergence → implementation → verification) with vault governance. They overlap where SAD *assumes* humans and agents share durable context and clear authorship.

| SAD / vault concern | Buzz analogue | Fit |
|---|---|---|
| Continuous feeds episodic; cite don’t load | Shared channel history as project memory; agents answer with **receipts** (links to threads) | Strong rhyme |
| Session log / why survived | Branch-as-room: rejected fixes + reasons stay searchable, not only the green diff | Strong rhyme |
| Spec Convergence / shareability (reminder #16) | Room that an outsider (or another agent) can read without private-prompt archaeology | Strong rhyme |
| `ai-model` / provenance / no silent drift | Signed events; agent identity separate from human; hash-chained audit | Partial — Buzz signs *workspace* acts; vault still owns methodology authority fields |
| Hybrid occupancy ([[position-schema]]) | Human CEO + CEO agent as **two members**, not one seat vacated by automation | **Direct conceptual match** |
| Human-required / agent-capable staffing | Channel membership + scoped agent authorization; humans stay in loop | Compatible |
| Agent role taxonomy (assertion bounds) | Channel membership as ACL; persona packs (`buzz-persona`) | Compatible but coarser than vault taxonomy |
| Phase 0A–1B / Spec Convergence rituals | No built-in SAD phases — would be **convention** (channels, canvases, workflows) if we invent them | Weak unless we design it |
| `governed-by` / authority ladder / vault SoT | Buzz is not a knowledge vault; Obsidian remains SoT for methodology docs | **Do not collapse** |
| Repo vs vault Source of Truth | Git-in-the-room helps *implementation* continuity; does not replace vault governance | Complementary |

**Punchline:** The owner’s instinct is directionally right — Buzz is the best *product-shaped* expression of “humans + agents in one accountable room with durable why.” It is **not** an implementation of SAD’s phase machine, convergence thresholds, or vault governance. Treat it as the **room SAD work can happen in**, not as SAD itself.

---

## What to learn (adopt as ideas, even without installing)

1. **Agents as principals** — reinforce position-schema: agent occupancy is a first-class occupant with its own identity; never “dress up as the owner.”
2. **Authorization ≠ authorship** — owner scopes the agent; the agent still signs its own work. Maps to hybrid duty splits on positions.
3. **Coordination > more IQ** — SAD’s shareability / session continuity is solving the same bottleneck; keep rituals that make context public to the team (including agent teammates).
4. **Episodic rooms** — short-lived channels for a feature/bug parallel SAD sessions / project episodes; close when done, keep the why.
5. **Harness-agnostic room** — methodology should not hard-code Cursor vs Claude Code vs goose; the room and the identity should survive harness swaps (Buzz’s ACP bet).
6. **Open substrate** — Apache-2.0 + self-host matches SAD’s publishable-methodology / sovereignty instincts ([[idea-dump-2026-04-23]] sad-methodology repo thread).

## What not to copy blindly

- Channel-only ACL as a substitute for position staffing-posture / agent assertion bounds
- Treating chat history as a replacement for compiled specs / IDEA_MAP / governed docs
- Assuming hosted buzz.xyz is the vault — IP-sensitive methodology stays in the vault unless explicitly published

---

## How we can use this (options, escalating commitment)

| Option | Effort | Value | Recommendation posture |
|---|---|---|---|
| **A. Methodology-only learning** | Done (this note) | Harden hybrid occupancy + provenance language; cite Buzz as prior art | **Do now** — already in progress via position-schema |
| **B. Try hosted [buzz.xyz](https://buzz.xyz)** | Low | Feel the room; run one the reference project or SAD episode with a named agent member | **Next if experimenting** — no vault migration |
| **C. Wire an agent** (Claude Code / goose + `buzz-cli` / ACP) into a Buzz community for a real workstream | Medium | Test hybrid CEO/CTO-agent seats in a live room; compare to Cursor-only | After B feels useful |
| **D. Self-host a relay** | Medium–high | Sovereignty; IP stays on infra you control; closer to “workspace you own” | Only if B/C stick and hosted trust model is wrong for us |
| **E. SAD ritual pack on Buzz** | High / speculative | Channels + workflows that encode Phase gates / convergence checklists | **Defer** until B proves the room is sticky; keep vault as SoT |
| **F. Tooling-layer entity** | Spec work | Register Buzz as a tool/entity in the tooling taxonomy (idea-167 cluster) | Thought-partner when tooling session happens |

**Suggested sequence:** A (done) → B (trial community) → decide C vs stop. Do **not** block position-schema usage on Buzz adoption — schema is vault methodology; Buzz is optional runtime.

### Concrete trial (if the owner wants next)

1. Create a Buzz community (hosted) named for one active concern (e.g. `<reference-project>` or `sad-methodology`).
2. Add the owner (human) + one agent with its **own** key (not the owner’s).
3. Run one short episode: e.g. “research X / draft Y” with the agent posting *in channel*, human steering live.
4. Afterward, capture: what stayed in the room that would have died in a private Cursor chat; what still needed the vault.
5. Decide whether position instances should link `occupied-by-agent` to a Buzz agent identity (npub) as an optional field later.

---

## Relation to vault work already done

- [[position-schema]] hybrid occupancy is the vault-side twin of Buzz’s “agents are members.”
- SAD reminder #21 (org seats) + dual-occupancy language already align; cite this note when explaining *why* hybrid is first-class.
- [[idea-167-tooling-layer-thought-partner]] — Buzz is a candidate for the deferred tooling thought-partner session (items 67–71 class: external tool classification / SaaS / role-based tool recommendations).

## Open questions

1. Does the owner want Buzz as **daily room**, **episodic experiment**, or **reference-only** for now?
2. Should agent identities in position frontmatter optionally store a Nostr npub / Buzz agent id?
3. Is there a future public face where SAD docs + Buzz community co-exist for methodology collaborators (Gauntlet / community) without opening the private vault?

## Changelog

- **2026-08-11:** First research pass from idea-dump; primary sources + usage ladder.
