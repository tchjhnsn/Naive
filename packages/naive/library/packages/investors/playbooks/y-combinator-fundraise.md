---
type: playbook
source: ai-drafted
created: 2026-10-29T22:40:00Z
ai-model: grok-4.7
tags: [naive, playbook, investors, fundraising, draft]
---

# Seed fundraising, from Y Combinator's public guidance

This is a draft. It does not decide a raise for the founder. It is not legal advice and not financial advice. It does not say whether to raise, how much to raise, or which contract to sign. A lawyer licensed where the company is formed has to read any form before anyone signs it. Y Combinator says the same about the forms on its documents page: it does not assume responsibility for using them, and you should consult a lawyer licensed where the company was formed ([The SAFE](https://www.ycombinator.com/documents)).

An agent may draft the records below. An agent does not email an investor, does not send a form, and does not mark the raise decided. The founder fills the numbers and decides.

## Trademark

Y Combinator and YC are their names. SAFE and Simple Agreement for Future Equity are the names of the instrument they publish. This playbook borrows a method: decide whether to raise, tie an amount to months of work and to the ownership that amount sells, use an unmodified published form, keep a cap table the founder can compute, and keep the leave-behind short and sourced. It does not borrow the marks. Do not put those names, their logo, or a phrase such as "YC-backed" on the venture's site, deck, or records in a way that says they endorsed the company. When a signed instrument is recorded on `governance/ownership`, the schema's `kind` values are `safe-post-money`, `safe-pre-money`, and `convertible-note`. Those are record values for an agreement the founder has signed. They are not a public slogan.

## What the public guidance does

Every figure below is from the page cited next to it. Figures from 2016 are not copied into the template as targets. The documents page examples are arithmetic illustrations, not a recommended round. The founder uses their own amounts.

### When outside capital is even the question

Geoff Ralston, 7 January 2016, [A Guide to Seed Fundraising](https://www.ycombinator.com/blog/how-to-raise-a-seed-round/):

- He describes seed capital as the initial capital a company raises, and he says a startup (he points at Paul Graham's "Startup = Growth") usually needs outside capital to grow. He says companies that bootstrap are the exception, and that the guide does not cover companies that are not startups.
- He says investors write checks when the idea is compelling, they are persuaded the founders can realize the vision, and the opportunity is real and large enough. For most founders, he says, that has meant an idea, a product, and some adoption. He says investors usually also want product-market fit and growth, and that a rate of 10 percent a week for several weeks is impressive. That rate is his 2016 illustration. This playbook does not set it as a target.
- He says founders should raise when they know the market opportunity and the customer, and they have a product that matches that need and is being adopted quickly. He says founders who can raise without those things are the exception. Everyone else, he says, should work on the product and talk to users.

The template starts by reading the venture's problem, customer, product, and evidence. If those reads are missing, it stops. It does not invent them.

### How much, and what the money buys

Same essay:

- He says the ideal is enough money to reach profitability, so a later round is not required. He says some companies, such as hardware, will need a follow-on round, and their goal should be the next fundable milestone, usually 12 to 18 months later.
- He says the amount trades off how much progress the money buys, credibility with investors, and dilution. He writes that giving up as little as 10 percent is wonderful, that most rounds will require up to 20 percent, and that you should try to avoid more than 25 percent. Those are his 2016 ranges.
- He says the amount asked for has to be tied to a believable plan. He recommends more than one plan, for different amounts, with the company still able to succeed on a smaller raise, the difference being how fast it can grow.
- His rule of thumb in that essay: an engineer costs about $15k a month all-in, so 18 months with an average of five engineers is about $1.35 million. He says to answer that you are raising for N months (usually 12 to 18) and will need a dollar amount that will usually fall between $500,000 and $1.5 million. He also writes that early raises usually ranged from a few hundred thousand dollars up to two million, and that most first rounds seemed to cluster around six hundred thousand dollars and had been increasing. All of those dollar figures are from January 2016.

The template asks the founder for their own amount, their own number of months, and what that money buys. It does not write Ralston's figures into the decision.

Y Combinator's documents page says to start from the amount you are targeting and the ownership you are willing to sell. The valuation cap follows from those two. Their illustration: a $1 million target and 15 percent ownership sold is a post-money cap of about $6.7 million, because $1 million divided by 15 percent is about $6.7 million. Raising less on that same cap sells less: $500,000 is about 7.5 percent, and $800,000 is about 12 percent. They also show two caps that add to about 15 percent: $500,000 at a $5.5 million cap (about 9 percent) plus $500,000 at an $8.3 million cap (about 6 percent) ([The SAFE](https://www.ycombinator.com/documents)). Those are their illustrations of the division. The template leaves the founder's amount and cap blank.

### What you have sold, before the shares exist

Kirsty Nathoo, in [Understanding SAFEs and priced equity rounds](https://www.ycombinator.com/library/6m-understanding-safes-and-priced-equity-rounds), says the founder has to know, at each point, how much of the company has been sold, and that leaving the cap table only to lawyers is dangerous. She says a spreadsheet of who owns how many shares is enough at the start.

She limits the arithmetic, in that talk, to valuation-cap instruments. Ownership is the amount invested divided by the post-money valuation cap, when the later priced round is above the cap. Her examples:

- $1 million on a $6 million post-money valuation is 16.67 percent.
- $200,000 at a $4 million post-money cap is 5 percent. $800,000 at an $8 million post-money cap is 10 percent. Together the founders have sold 15 percent, even though the share count has not changed yet, because these are not shares until they convert.
- On a post-money instrument, a later investor does not dilute an earlier one. Both dilute the existing shareholders.
- If the priced round prices below the cap, the instrument converts at the round's price, so the company can sell more than amount divided by cap. She says the conversion is triggered by raising the equity financing, not by the price. The documents page says the same: there is no minimum amount that triggers conversion ([The SAFE](https://www.ycombinator.com/documents)).

She then walks a priced round in that same example. After the instruments convert, an option pool is increased, then the new investors buy. In her numbers the series A investors own 25 percent (the lead, putting in $4 million of a $5 million round on a $15 million pre-money valuation, owns 20 percent of the $20 million post-money valuation). The option pool in the example is brought to 10 percent of the post-money shares. She says a pool around 10 percent, sometimes up to about 15 percent, is what she usually sees, and that more than that is fairly non-standard. The founders in the example end at 51.5 percent. She calls a picture of about 15 percent sold on these instruments, about 25 percent to the series A, and about a 10 percent option pool a fairly standard cap table she expects, with founders just over 50 percent after the priced round. She says every company differs, and that getting some money on worse terms is better than getting no money.

She also says not to over-optimize the cap. In the same example, moving the $800,000 from an $8 million cap to a $10 million cap changed founder ownership at the close from 51.5 percent to 52.7 percent. She treats that gap as too small to be worth a long negotiation.

The post-money valuation cap is post all of the money raised on these instruments. It is not post the money from the later equity financing. It is post the option pool that already exists, and it is not post a new or increased pool adopted as part of the equity financing ([The SAFE](https://www.ycombinator.com/documents)). Nathoo says the priced-round calculations happen in that order: the instruments convert, then the option pool is increased, then the new money invests, and the pool increase dilutes existing shareholders and the holders of these instruments, not the new money.

The template asks the founder to write their own division in the raise plan when they are working through a valuation cap. It does not store Nathoo's percentages as the venture's targets.

### Which contract

Ralston, in the 2016 essay, says most seed rounds in Silicon Valley were then structured as convertible debt or as simple agreements for future equity, and that equity rounds were the exception because they are more complicated, more expensive, and slower. He says you will want a lawyer when you issue equity. He describes a safe as acting like convertible debt without an interest rate, a maturity date, or a repayment requirement, with the negotiable terms almost always the amount, the cap, and the discount if any. He says to use a well-known form.

The documents page, which is the current public description, says:

- The contract was created at Y Combinator by Carolynn Levy in 2013. They say it has been used to raise over $15 billion for YC portfolio companies. The post-money form has been their standard since 2018.
- It is not debt and not stock. It has no interest and no maturity date. It converts automatically into preferred stock when the company sells preferred stock in an equity financing, and the holder does not choose whether to convert.
- For US companies they publish three forms, plus an optional side letter: valuation cap and no discount; discount and no valuation cap; uncapped MFN (no valuation cap and no discount). Canada, the Cayman Islands, and Singapore have valuation-cap forms. They say to consult a lawyer licensed in the relevant country. They say their send tool supports only US-incorporated companies.
- A discount gives earlier investors a lower price than the equity financing. They say discounts are commonly 10 to 20 percent. On a 20 percent discount, conversion is at a price 20 percent below the equity-financing price per share.
- The MFN form has no cap and no discount. It takes the best terms of any later form the company issues. They say to finish lower-cap forms, with the wire received, before issuing an uncapped MFN. The date that counts is the later of signing or receiving the wire. They say there is no separate uncapped form: use the discount form and set the discount rate to 100 percent.
- Pro rata is not in the form. It lives in an optional side letter. They say not to modify the form, and to put any extra right in a side letter. They say it is reasonable to push back, and that an investor buying $500,000 has a better case for pro rata than one investing $10,000.
- More money from an investor who already signed: issue a new form for the additional amount. Do not amend the purchase amount on the first one.
- The company's board must approve the issuance.
- Investors should be accredited. If an investor is not accredited at the equity financing, the company can rescind by returning the money.
- The form is not binding until the money is received. A signature with no wire does not take effect.
- On an acquisition or IPO, the valuation-cap form pays the greater of the purchase amount back or what the holder would receive if it had converted to common stock. On a shutdown, the purchase amount comes back. In both cases it is junior to outstanding debt.

The [post-money safe primer (v1.1)](https://www.ycombinator.com/assets/ycdc/Primer%20for%20post-money%20safe%20v1.1-2af8129e12effd9638eeab383b7309142c8f415e5cdb0bc210d573f779177a1c.pdf) says the pro rata right that was a default in the original form was removed. The side letter, when the parties agree to it, applies to the round in which the instrument converts, not the round after that. They say they could not write one pro rata rule for every company, and they contrast a company raising $500,000 from 10 angels at $50,000 each with a company raising $2,000,000 from a single institutional investor. The primer also says the board must formally consent before any of these are issued.

Nathoo says you do not need a lead investor while raising on these instruments, because each one can close when that investor agrees the amount and the cap. She says a priced round does need a lead, because there is too much to negotiate to do it with many parties at once. She says not to mix these instruments with convertible notes if you can avoid it, because the math gets harder. She says companies outside the United States often use convertible debt, which has interest and a maturity date. She says not to call the instrument a note. It is not debt. Ralston's 2016 glossary describes a convertible note as debt with a principal, an interest rate he puts at usually a minimum of about 2 percent, and a maturity date.

### Who you meet, and how a round moves

Ralston, in the same 2016 essay:

- He describes angels as people investing their own money, often able to decide alone and faster, and venture capitalists as people investing other people's money, usually needing more meetings and more than one partner. He says venture capitalists see many deals and invest in few.
- He says the best way to meet an investor, aside from a demo day, is a warm introduction. If there is no introduction, he says to research them and send a short summary. This playbook does not send that summary. The founder does that themselves, outside this playbook.
- He says the goal of a first meeting is the next meeting, not the close. The first money in is the hardest. He describes the search as breadth-first, weighted by expected value: talk to many people, and put the time on the ones most likely to close.
- He says to research what the investor likes to fund, to keep the story to the product, the team, and the opportunity, to listen, to practice, and not to leave without a next step. He says not to ask for an NDA, not to negotiate in the meeting, and not to invent a market size.
- Once someone says yes, he says to close on a standard form, take unusual requests away to counsel rather than negotiating live, and get the signature and the cash. He wrote that exchanging signed documents and a wire should take no longer than a few minutes, and he named Clerky and Ironclad as examples of online signing. The documents page now also describes Y Combinator's own send tool. This playbook does not run that tool, does not install it, and does not email an investor.

### What the summary and the deck are made of

Ralston says not to spend a long time on diligence documents for a seed round. He writes that an investor asking for too much diligence or too many financials is almost certainly someone to avoid. He says you will probably want an executive summary and a slide deck you can walk through and leave behind.

The summary, he says, should be one or two pages, one page better, and should include vision, product, team (location and contact), traction, market size, and minimum financials: revenue if any, and fundraising already done and the round now underway.

He says the deck has no fixed order. The parts he lists as usually present are: the company and a tag line; the vision; the problem; the customer; the solution and why now; the market, which he says should be a total available market above $1 billion if possible, with the most persuasive evidence you have that it is real; the landscape, including competition; current traction; the business model; the team, with roles; three to five takeaways; and the fundraising, including what is already raised, what this round is, and optionally a product roadmap of at most six quarters. He also lists, among the things not to do, detailed financials and market-size numbers without a clear justification.

The template does not supply a tag line, a logo, or a market number. Each line points at a Naive route. If that record has no sourced market, the line stays empty.

### What this checklist does not claim

Y Combinator has a library page titled "Data rooms and additional documents to prepare for seed fundraising" at <https://www.ycombinator.com/library/Da-data-rooms-and-additional-documents-to-prepare-for-seed-fundraising>. A fetch of that URL on 29 October 2026 returned the title and no document list. This playbook does not describe that page. The checklist below is only Ralston's summary and deck, the cap table Nathoo says the founder must be able to compute, and the unmodified form plus board consent that the documents page and the primer require.

## Template

Each prompt names the Naive route it reads or writes. Reads use the record that is already accepted. An agent's draft is not the record: if the read says a draft is waiting, the founder accepts it before this playbook uses it. The template does not copy another function's text into the raise plan, the investor records, or the checklist. The plan's `inputs` line names routes, and the words stay on those routes.

### 1. Read what the venture already provides

Required. If the read is `not_found`, stop. Do not write the missing record from this playbook.

- Read `purpose/foundation` (run). See which foundation statements are confirmed, drafted, or missing.
- Read `foundation/problem`. The problem, the segment, and the cited evidence. Traction later depends on this `evidence` array, or on results under `evidence`.
- Read `foundation/icp`. Who the customer is.
- Read `foundation/alignment`. Principles any term has to sit beside. Do not rewrite a principle here.
- Read `product/<id>` for the product this round is about. Use its `market` and its business model only if those fields are already there.
- Read `people/founders/<id>` for each founder the summary will name.
- Run `system/need-now`. Copy its phase into the decision's `needed_in`. Do not pick a later phase to make the raise look due.

May be missing. Read them. If the answer is `not_found`, leave the matching checklist line open. Do not type a number that was not in the record.

- Read `purpose/money/summary` for cash, monthly flows, and runway. This is the only money record the route table describes as the one a model sees. Do not invent cash.
- Read `evidence` for check results the venture has already stored.
- Read `governance/ownership` for shares, the option pool, and any instrument already signed (`safe-post-money`, `safe-pre-money`, or `convertible-note`).
- Read `people/team-plan` for the roles the money would pay for.
- Read `validation/pricing` if you want the business-model line to point at evidence that someone pays.
- Read `validation/go-to-market` if you want the "how you reach them" line to point at a path already recorded.
- Read `foundation/telos` if you want the vision line to point at an accepted end state.

### 2. Write the raise plan

Write `decisions/raise-plan`. This is one open decision. `status` is `open`. `answer` is null. Do not set `decided_by`, `decided_at`, or `provenance.approved_by`. An agent's write that sets `status` to `decided` is held as a draft for a person to accept. A person's raw write of `decided` with no `provenance.approved_by` is refused. `mentura decide` writes that name. This playbook counts a decided record without it as a failed check, which only a hand edit of the file can produce.

`question`: Do we raise outside capital now, and if we do, on what instrument, for how many months, and what does the money buy?

`options`, a menu, not a choice:

- Do not raise.
- A post-money valuation-cap form, unmodified, from the publisher's documents page, after a lawyer licensed where the company is formed has read it.
- A discount form with no valuation cap, on those same conditions.
- An uncapped most-favored-nation form, on those same conditions.
- A priced round, with a lawyer.

`note`, one label per line. Leave the value empty until the founder types it. Empty `amount`, `months`, or `use_of_funds` fails the check.

```
amount:
months:
use_of_funds:
instrument:
ownership_if_cap:
inputs:
```

- `amount`: the founder's figure.
- `months`: how long that amount is meant to fund.
- `use_of_funds`: what the money buys, in the founder's words. Point at `people/team-plan` for hires and at `product/<id>` for the product. Do not paste those records.
- `instrument`: `none`, `cap`, `discount`, `mfn`, or `priced`. This is the form they are working through. It is not a decision while `status` is `open`.
- `ownership_if_cap`: when `instrument` is `cap`, the founder writes amount divided by the post-money cap. When the later round could price below the cap, they note that the percent can be higher, which is what the documents page and Nathoo both describe. For any other instrument, write `n/a`.
- `inputs`: the record routes from step 1 that returned a record, separated by commas. Do not list a route that was `not_found`.

`needed_in` is the phase from `system/need-now`. `boundary` is `fail-open`, so product work does not wait on this decision. `decides` is `{ "record": "investor", "path": "governance/ownership.json" }`: the decision is about the raise, and the cap table stays the ownership record. `provenance.drafted_by` is `{ "kind": "agent", "id": "<the agent>" }` when an agent drafts it, or `{ "kind": "person", "id": "<name>" }` when the founder writes it.

The founder decides with `mentura decide raise-plan --venture <id> --by "<name>" --confirm raise-plan --answer "<their sentence>"`. That is the only path this playbook treats as decided.

### 3. Write investor records

Do this only after `decisions/raise-plan` reads back as a record. Write `investors/<id>`, one record per investor the founder names.

The schema requires `id`. Also set `name`. Put the rest in `summary`: what the founder already knows about what this person or firm funds, and the status the founder reports (`not-contacted`, `intro-asked`, `met`, `passed`, or `yes`). The agent does not invent a thesis and does not contact the investor.

Do not write a commitment, a cap, or a share count on this record. A signed instrument is written later, by a person, on `governance/ownership`, and only after the form is signed and the money is received. The documents page says the form is not binding until the money is received.

Do not write `purpose/data-stream/<id>` from this playbook. On 29 October 2026 a write of `purpose/data-stream/meetings` through `packages/naive/src/router/router.mjs` stored `customers/_streams/meetings/stream.json`, because that glob is the first one on the route and no stream folder existed yet. Conversation status stays in the investor record's `summary`.

### 4. Write the data-room checklist

Do this only after the raise plan exists and at least one investor record has a `name`. Write `operations/handoff/data-room` with `status` `draft`.

- `id`: `data-room`
- `title`: Data room checklist
- `venture`: the venture id
- `role`: `builder` (holds the checklist)
- `brief`: `data-room.md`, beside the handoff file. The brief says this is not legal or financial advice, and that the criteria are the checklist.
- `decision_classes`: `domain-fact` only, which is "what a source says". The holder does not sign, send, or change the cap table.
- `escalations`: one for `ownership-or-control` ("Record a signed instrument on the cap table?") and one for `legal-or-terms` ("Sign or send a form?"), both `to` `founder`.
- `assignment`: `none`
- `attempts`: `0`, `max_attempts`: `3`, `run_cap`: `2h`
- `governed_by`: `raise-plan`
- `inputs`: venture-relative paths of the required records that exist. Omit a file that is not there.

Each criterion is `kind` `review`, `reviewer` `founder` (not the holder), and `check` text that starts with `route <route>:` or with `outside:`.

Required lines fail while the read is `not_found`, or while the field named here is empty. Optional lines are omitted from the handoff when that read is `not_found`. They are not a failure by themselves.

- `route foundation/problem` required: the problem line. The traction line fails while `foundation/problem`'s `evidence` array is empty and `evidence` has no results.
- `route foundation/icp` required: the customer line.
- `route foundation/alignment` required: principles the terms sit beside.
- `route product/<id>` required: the product line. The market line fails while `market` is absent. Do not invent a total available market, including the "$1 billion if possible" figure from the 2016 essay.
- `route people/founders/<id>` required: the team line, including roles.
- `route people/team-plan` required: who a raise would hire.
- `route purpose/money/summary` required: minimum financials. Do not type cash that is not in this record.
- `route governance/ownership` required: the cap table, including instruments already signed.
- `route decisions/raise-plan` required: what this round is. Fails while `amount`, `months`, or `use_of_funds` is blank.
- `route evidence` optional: check results, if any. Not required when the problem record already cites evidence.
- `route validation/pricing` optional: the business-model line, only if that record exists.
- `route validation/go-to-market` optional: how you reach them, only if that record exists.
- `route foundation/telos` optional: the vision line, only if that record exists.
- `outside:` formation documents, kept with counsel. There is no Naive route for them.
- `outside:` an unmodified form from <https://www.ycombinator.com/documents>, if the founder is working through one, after a lawyer licensed where the company was formed has read it. Do not paste the form into the venture.
- `outside:` board consent to issue, which the documents page and the primer both say the board must give before issuance. There is no Naive route for the consent.
- `outside:` the one-page summary and the deck, written by the founder from the routes above. Ralston's section list is the order to consider. It is not copy to paste. No market number that a record does not source.

### 5. The founder decides, then records a signature

This step is a person's. Do it after the checks pass, or as a decision not to raise.

- Decide `decisions/raise-plan` with `mentura decide ... --confirm raise-plan`, as in step 2.
- When a form is signed and the money is in the account, the founder writes the instrument on `governance/ownership` as a person (`--as person`). `kind` is `safe-post-money`, `safe-pre-money`, or `convertible-note`, matching what was signed. An agent's write of that route is a draft. A read does not treat the draft as the cap table. Do not record a signature that has not happened.

## Checks

Each check can pass or fail. A draft with blank labels fails. Filling the labels can make it pass. A pass means the records are complete enough to read. It does not mean the round is a good idea, and it is not legal or financial advice.

1. Raise plan. Read `decisions/raise-plan`. Fail if the result is `not_found`. Fail if `options` has no entry that is exactly `Do not raise.` Fail if `note` has an empty `amount`, `months`, or `use_of_funds`. Fail if `instrument` is not one of `none`, `cap`, `discount`, `mfn`, `priced`. Fail if `instrument` is `cap` and `ownership_if_cap` is empty. Fail if `instrument` is anything else and `ownership_if_cap` is not `n/a`. Fail if any route in `inputs` is not a real route, or reads as `not_found`. Fail if `status` is `decided` and `provenance.approved_by` is missing or empty. Otherwise pass. An open plan with those fields filled passes. It is still not a decision.

2. Investors. Read `investors`. Fail if there is no record, or if any record has no `name`, or if `decisions/raise-plan` is `not_found`. Otherwise pass.

3. Data room. Read `operations/handoff/data-room`. Fail if it is `not_found`. Fail if any `route` criterion names a route the router does not serve. Fail if a required line's read is `not_found` or fails the empty-field rule in the list above. An optional line is not a failure when its record is `not_found`; it is a failure when the criterion is present and the read is `not_found`. `outside:` lines are not router checks. They stay the founder's review, and the handoff stays `draft` until the founder accepts them. The traction line fails when `foundation/problem`'s `evidence` is empty and `evidence` has no results.

4. Cap table. Read `governance/ownership`. Fail if the only copy is a pending draft. When the read returns the record, fail if an `instruments` entry has a `kind` outside `safe-post-money`, `safe-pre-money`, and `convertible-note`. Pass when the record is present and every instrument kind is one of those three. This check is allowed to fail while the round is still a plan. It passes only after a person has written the cap table.

The template has produced a raise plan, investor records, and a data-room checklist when checks 1, 2, and 3 pass. Check 4 is the later signature, not part of the draft.

## Sources

- [A Guide to Seed Fundraising](https://www.ycombinator.com/blog/how-to-raise-a-seed-round/), Geoff Ralston, 7 January 2016.
- [The SAFE](https://www.ycombinator.com/documents), Y Combinator documents page, fetched 29 October 2026.
- [Understanding SAFEs and priced equity rounds](https://www.ycombinator.com/library/6m-understanding-safes-and-priced-equity-rounds), Kirsty Nathoo, transcript fetched 29 October 2026.
- [Primer for post-money safe v1.1](https://www.ycombinator.com/assets/ycdc/Primer%20for%20post-money%20safe%20v1.1-2af8129e12effd9638eeab383b7309142c8f415e5cdb0bc210d573f779177a1c.pdf), fetched 29 October 2026.
- The library page <https://www.ycombinator.com/library/Da-data-rooms-and-additional-documents-to-prepare-for-seed-fundraising> was fetched the same day and returned no document list. It is not a source for the checklist.
