---
type: knowledge
tags: [naive, skills, external-relationships, fundraise, investor-relations]
ai-model: claude-opus-5.5
created: 2026-11-22T00:16:06Z
source: hybrid
name: fundraise
description: >
  Run a fundraise as a bounded project in a raise record
  (investor-relations/raises/<id>.json): the ask and the milestone it reaches, a
  start and a stop date, the securities exemption, the materials, the target
  investors with their pipeline status, and every meeting with its follow-up. Use
  in the external-relationships intake and the weekly raise review, and when the
  founder says "raise", "fundraise", "SAFE", "pitch", "investor meeting" or "who
  should we talk to".
---

# fundraise

You keep the raise record true and prepare every step; the founder meets investors, sends materials and decides. Opening a raise and setting its size is `strategy-or-constitution`; sending anything to an investor is `public-commitment`; accepting terms is `ownership-or-control`. All three escalate to the founder.

## Rules

1. **In a raise or not.** A raise has an opening date, a target and a stop date. Outside one, investor meetings are relationship meetings only (Graham, "How to Raise Money", 2013).
2. **Raise for a milestone.** The ask reaches a milestone that changes the venture's value; say what it is in the record (Graham). Many investors advise 18 to 24 months of runway instead; give the founder both views when they differ.
3. **Lines, not dots.** Meet investors before raising. At each meeting, record in `promised` what the founder said would be true by the next one, with its date, and open the next meeting by grading it (Suster, "Invest in Lines, Not Dots", 2010). Fast markets reward speed over long lines; this rule is contested.
4. **Watch the exemption.** Under US Rule 506(b) nothing public may say the venture is raising (Rule 502(c)). Under 506(c) every investor must be verified as accredited. If the exemption is unknown, flag it for counsel before anything is sent.
5. **Never record terms as agreed.** `ask.terms` holds what is proposed. Agreement lives in a decision record a person takes, named in `decision`.

## Steps

1. **Read what exists.** Investor records (`investors/[id]`), past raises, the money summary for runway, ownership for who already holds equity or SAFEs.
2. **Draft or update the raise.** Ask, minimum, instrument, milestone, exemption, opening and stop dates. A new raise or a change of size goes to the founder as a decision.
3. **Build the target list.** One entry per investor record with status, priority and warm path. Rank by fit to the round, sector and cheque size, and by who is most likely to say yes fast.
4. **Track materials.** Deck, memo, model, data room, each by path or link with status. Only approved materials go out, and a person sends them.
5. **Log every meeting.** Date, kind, notes, what was promised and the follow-up with its due date. Change the target's status only on evidence.
6. **Weekly, in the review:** list overdue follow-ups, targets with no touch in two weeks, and days to the stop date. When the stop date passes, propose closing or abandoning the raise; never extend it on your own.

## What you never do

Contact an investor. Send a deck. Say in public that the venture is raising. Record a commitment no investor made in writing.
