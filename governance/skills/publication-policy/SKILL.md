---
type: knowledge
tags: [everything-ecosystem, skills, governance, publishing, brand]
ai-model: claude-opus-5.5
created: 2026-10-27T17:22:08Z
source: hybrid
name: publication-policy
description: >
  Help a venture decide where it publishes and who may publish what there:
  its channels (website, docs site, social, newsletter, app store, press,
  investor update, regulatory filing), the guidelines each one follows, the
  checks and preview every publication passes, and who drafts and who
  approves by role or team. Records it in governance/publication-policy.json
  and gates every publishing handoff (EE-025).
  MANDATORY TRIGGERS: publish, Substack, X, Twitter, Facebook, Instagram,
  LinkedIn, YouTube, TikTok, reply, comment, publication, go public, post, announce,
  press release, newsletter, website copy, social media, channel, brand
  guidelines, editorial guidelines, style guide, approval workflow, who can
  publish, content governance.
---

# Publication policy

Governance layer (EE-025). Writes `publication-policy.json`; `check-publication.mjs` checks it and every handoff that publishes.

## The opinion: everything published passes the gate

The framework has no way to publish around the gate. A publication is a handoff under the decision class `public-commitment`. It names its channel and the kind of content (`publication`), passes the channel's checks, shows a preview of exactly what will go out, and a person approves it. Agents may draft, run the checks and attach the preview. They never approve. The gate does two jobs: it keeps the quality of what goes out under a person's eye, especially what an agent wrote, and it lets a publication be tested before it is public, not after.

## 1. Channels: where it lands decides the rules

Start from the destination, not the content. The same paragraph is held to different rules on a website, in an app store listing, in an investor update and in a regulatory filing. For each channel record:

- `kind` and `destination`: where it lands (a URL, an account, a repository, a recipient list).
- `audience`: who reads it there.
- `guidelines`: which of the venture's guidelines apply here.
- `checks`: conformance checks (scripts, run like tests) and review checks (what a person reads for).
- `preview`: how to see exactly what would go out before it does: a dry run, a staging deploy, a draft sent to the approvers.
- `platform`: the third-party platform it runs on (Substack, X, Facebook, Instagram, LinkedIn, YouTube, TikTok and others). A social, newsletter or app-store channel must name it, and a channel on a platform must cite that platform's rules as a guideline of kind `platform`.
- `replies`: on social, newsletter and blog channels, replies, comments and direct messages speak for the venture in public too. Choose `gated` (each reply passes the gate), `delegated` (named people may reply within the guidelines; agents alone never), or `none`.
- `config`: the channel tool's own configuration, if it has one (the method site's is `publish.json`).

## 2. Guidelines: the venture's own and the outside world's

- **Brand guidelines** (visual and verbal identity) come from the brand pillar, the single source of truth for identity.
- **Editorial guidelines** (what to write about and how, distinct from brand voice) come from the product pillar for content products, otherwise the brand pillar.
- **Outside rules** apply by channel: a platform's rules (an app store's review guidelines), advertising law (the FTC Endorsement Guides in the US), disclosure duties (investor information rights; for a public company, rules on selective disclosure). Record the URL and the date it was checked.
- **Security rules**: what must never leave (private terms, archived or sensitive notes, raw captures). The method site's publisher enforces these as refusal rules.

## 3. Rights: who may publish what, by role or team

Each channel has rules: a kind of content, the layers whose records it may draw on, who drafts and who approves. Approvers are roles or teams (a governance team, a marketing team). `check-publication.mjs` fails a rule with no person approving, and fails any agent role named as an approver.

| Venture | A common shape |
| --- | --- |
| Solo founder | One approver, the founder, on every channel |
| Small team | The founders approve anything about money or control (funding announcements, investor updates); one named person approves routine product pages |
| Larger company | Brand or marketing approves campaigns; product approves docs and release notes; legal or the board approves regulated and financial disclosures |

## Guardrails

- Publishing is outward and hard to take back (copies, caches, indexes). The default level for `public-commitment` is escalate; a venture may delegate a channel to a named person, never to an agent.
- When a guideline changes, re-run the channel's checks on what is already published before the next publication.
