---
type: knowledge
tags: [naive, skills, external-relationships, apqc-12-5]
ai-model: claude-opus-5-5
created: 2026-11-27T03:48:39Z
source: hybrid
name: manage-public-relations-program
process_group: "12.5"
description: >
  Everything the venture says in public that is not marketing copy: the
  communities it takes part in, the journalists who cover its market, the places
  it depends on politically, and the writing and sending of a press release.
  Load it in the five APQC 12.5 workflows, and when the founder asks who covers
  this, what to say to a reporter, whether to take a public position, or whether
  something is worth announcing.
---

# manage-public-relations-program

You find out who is listening, write what the venture could truthfully say, and check it against the gates. A person speaks, posts and sends. You contact no journalist, no outlet and no community, and you publish nothing.

Two gates apply to every draft in this group. The venture's publication policy, in `governance/publication-policy`, says where it publishes and under which rules. And while the venture relies on a securities exemption that forbids general solicitation, nothing public may say it is raising, which `investor-relations/raises` records as the raise's exemption.

## The processes

### 12.5.1 Manage community relations

Runs `workflows/12-5-1-manage-community-relations.json`.

Start with where the venture already is, not where it could be. Read `governance/publications` for what it has already put out, `support/cases` for where its users already talk to it, and `governance/publication-policy` for what it is allowed to say, and list each community with who speaks there for the venture today and what has already been said in its name.

The contribution worth proposing is the one the venture would still do if nobody noticed: answering questions, fixing a bug, publishing data it already holds. Put the weekly hours beside each, because hours are what a small venture runs out of. The trap is a community strategy that is marketing in a different font, which communities recognise immediately.

To the person: which contribution to make, and every post, which is `public-commitment`.

### 12.5.2 Manage media relations

Runs `workflows/12-5-2-manage-media-relations.json`.

Name individual journalists, not outlets, with what each last wrote about this market and the date you read it. A bought media list is worse than no list: it produces approaches to people who do not cover the category.

Do the answers before the approach. Write the answer to each question a journalist will ask, what it does, who pays, how many, who is behind it and what went wrong, from the records with each figure naming its source, and mark the ones only the founder may answer. Then an approach is about something that actually happened, to one named person, in their own subject and length. An inquiry is answered the same day, because a reporter's deadline is hours and an unanswered question is printed without the venture in it.

To the person: every approach and every reply, which is `public-commitment`. The founder speaks for the venture, always.

### 12.5.3 Promote political stability

Runs `workflows/12-5-3-promote-political-stability.json`.

For most ventures this reduces to two honest pieces of work. First, name each place the venture depends on for customers, people, money, suppliers or hosting, from `markets`, `customers`, `people/team` and `supply-chain/suppliers`, and say what would stop working there if the rules, the courts or the currency changed. Second, read the official operating and travel guidance and the published risk assessments for each place and write what they say with the source and the date read, adding no prediction of your own.

Whether the venture says anything publicly about a political question is a separate decision, and a position taken in passing is read as the venture's position everywhere it operates. Set out what each option costs it in customers, people and attention, and leave the choice alone.

To the person: whether to take any public position, which is `public-commitment`, and whether to reduce a dependency on a place.

### 12.5.4 Create press releases

Runs `workflows/12-5-4-create-press-releases.json`.

A release needs an event. Name the thing that happened and the record that shows it happened, and when nothing has happened, say so and write nothing: that is the most common right answer.

Then draft it from the records and `marketing/voice`: what happened, when, who it is for, and facts a reader can check with each figure naming its record. Ask the founder for the quote rather than writing words in their mouth. Last, check every line against the publication policy, against the record behind the claim, and against the raise exemption, and list each failing line with the reason. After the founder approves the exact text, not one word changes without raising it again.

To the person: the quote, and approving the exact text, which is `public-commitment`.

### 12.5.5 Issue press releases

Runs `workflows/12-5-5-issue-press-releases.json`.

Issuing is a check and a handover, not a send. Confirm the text is word for word the approved one and name the decision that approved it, and stop when they differ. List every place it goes, the venture's own site from `operations/site-presence`, each named journalist, each community it already belongs to, with the person who posts each one and the time. A paid wire or agency is a cost the founder approves.

Afterwards record each place it was published with its url and date, and hand that list to marketing and sales, which owns `governance/publications`. The trap is a release that went out in a slightly different wording than the one approved, which is why the first step is a comparison and not a formality.

To the person: sending and posting, which is `public-commitment`, and paying for any wire or agency, which is `spend-money`.

## Records

Read: `governance/publication-policy`, `governance/publications`, `marketing/voice`, `marketing/brand`, `marketing/message`, `marketing/content`, `operations/site-presence`, `markets`, `industries`, `purpose/competitor`, `customers`, `support/cases`, `people/team`, `supply-chain/suppliers`, `legal/risks`, `legal/obligations`, `investor-relations/raises`, `product`, `purpose/money/summary`, `foundation/icp`, `foundation/goals` and the open decisions.

Write: `operations/handoff/[id]` for the lists, the drafts and the checks, and `decisions/[id]` to raise what a person must approve.

A press release, a media list, a community log and a political risk assessment have no record type: these are not built, so each lives on the handoff as evidence. `governance/publications` is marketing and sales's to write, so where a release was published is handed to it. Public copy that belongs on the venture's own pages is a marketing message, written by marketing and sales, not here.

## Standards

- The venture's publication policy, in `governance/publication-policy`, decides where it publishes and under what rules, and publishing is a one-way door.
- US Regulation D Rule 502(c) forbids general solicitation while a raise relies on Rule 506(b), so nothing public may say the venture is raising during one.
- Every claim in a public draft names the record behind it, which is the same rule the venture's own copy is held to.

## What the person decides

- Every post, reply, approach, statement and release, in exactly which words.
- The quote in a release, which the agent never writes unasked.
- Whether the venture takes a public position on a political question.
- Which communities are worth the founder's hours.
- Whether to pay for a wire, an agency or a conference.
