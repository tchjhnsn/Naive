---
type: framework
source: hybrid
created: 2026-10-28T20:10:00Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, operations, marketing, marketing-website, site-presence, icp, typesafe, jev, firecrawl]
description: "Site presence: read a venture's website, judge which pages say what with Jev, and score how present its public records are, weighed by who the site must speak to now and why (the marketing matrix, customer types), shown as the site's sitemap with a rating per route. Version 0.1.0, unevaluated."
---

# Site presence and the marketing matrix

Version 0.1.0, ours and unevaluated (EE-062, EE-063, EE-064, EE-065). For the demo there are no connections: a founder pastes a link to their marketing site (or their product), and Naive reads it.

## What it does

1. **Read.** The app's site reader, named by `NAIVE_SITE_CMD` (run by `packages/naive/src/interfaces/harness/site.mjs`), reads the home page and up to nine pages it links to. Pages a marketing site usually has (about, pricing, careers, investors, community, press, security) come first, one per section. Each page records where it sits: the home page, the header or navigation, linked from the home page (the footer counts), or deeper.
2. **Judge.** Jev answers one typed question per page and item: "Does this page tell a visitor …?" That is 150 questions for ten pages, in about 0.4 seconds. The judge is the command `NAIVE_JUDGE_CMD` names. Without one, the matrix's keywords judge instead, which is rougher, and the result says so.
3. **Weigh.** The marketing matrix (`matrix.json`) names six audiences: customers, investors, candidates, contributors, partners and press. It lists fifteen items each audience may need to learn, and the record each item comes from. Every item is public by default (publish: true).
   - **Audience weights** come from the venture's facts: raising, hiring, inviting contributors, and what its ICP records say about who it courts. Investors weigh 1 while the venture is raising and 0.15 otherwise.
   - **An item's need** is its strongest audience weight times importance.
   - **Need sets prominence:** 0.7 or more belongs on the home page, 0.4 in the navigation, 0.2 linked from the home page, and anything less can be anywhere. An item with its own page, such as pricing or careers, needs that page in the navigation, not on the home page.
4. **Score.** An item scores 1 when it is as prominent as it needs to be, 0.5 when it is present but buried, and 0 when it is missing. The site score is the need-weighted share, from 0 to 100, with a score for each audience. "Fix first" lists the three most-needed items that fall short. A missing item that no audience needs now is noted and not held against the site.

## Who the customers are, and why they look for what they look for (EE-063)

What a customer looks for depends on who the customer is. A consumer rarely looks up the founders. A clinic owner trusting a vendor with patient data often does. So the matrix has customer types, and each type says how much each item matters to it and why:

- consumers, small-business owners, teams inside companies, enterprise buyers;
- developers, regulated professionals, creators, public sector and nonprofits.

The reasons are claims to test with the venture's own customers, not findings.

- **The ICP.** It comes, in order of preference, from:
  - the founder's own sentence;
  - the venture's ICP record (`purpose/icp.json`);
  - failing both, the home page's opening text, marked inferred.
- **Placing the ICP.** Jev places the ICP into types. It answers "mainly" conservatively, so a type counts at 0.25 or more and within 0.6 of the strongest type.
- **Several types at once.** A customer who is several types needs what the most demanding one needs.
- **Evidence on every item.** Each item shows every audience's weight, the item's importance to that audience, and the reason. The rating can always be traced back to who the ICP is and why we think they look for it.

## The sitemap

The result is drawn as the site's sitemap. The home page sits on top, with the pages in its navigation in one band and the pages linked elsewhere (usually the footer) in another. Each page's own routes sit under it.

- **Ratings.** Each route that was read is rated on the items that belong there. On the home page, that is what must be on the home page. On other pages, it is the items whose place is that page type.
- **Suggested pages.** Dashed ghost routes are pages the venture's priorities call for and the site lacks, for example an investors page while raising.
- **Route detail.** Click a route to see what belongs there, what is missing and why.

## Where to run it

- **Board:** `node packages/naive/src/interfaces/demo/board.mjs`, then `/site`. Paste a link, say who your customers are (optional), tick raising, hiring or contributors, and read the sitemap and its ratings.
- **CLI:** `node packages/naive/src/interfaces/harness/site.mjs <url> [--venture <dir>] [--icp "<who your customers are>"] [--raising] [--hiring] [--contributors]`. With a venture, the result is saved to `operations/marketing/site-presence.json`, and the router command `operations/marketing/site` reads it back.

## In reverse: planning the site from the venture (EE-064)

`plan.mjs` uses the same matrix in the other direction. It reads the venture's records and plans the site. The plan says what is shown where, how (the MDX component), when, and for whom, with the reason for each.

- **The product decides the audience.** A product's `offered_to` names the ICP profiles it is offered to, and `serves` names the profiles it reaches through them. In a partner-led (B2B2C) venture, the partners are the site's customers. A profile can say it is `reached_through` another and which buying-center roles it plays (Webster and Wind 1972, with the initiator added by Bonoma 1982).
- **Services are already an offering type** on the product card (product, service, platform, content, marketplace), so services drive the site like any other product.
- **Topics, not audiences.** Pages follow topics, because audience-based navigation tends to hurt usability (NN/g). An audience with content of its own (candidates, investors, contributors, press) gets its own page, and only while it is a priority. Otherwise the plan says when that page would appear.
- **Each page lists its sections in order of need**, each with:
  - the MDX component;
  - the audiences and why;
  - any condition;
  - the internal record it draws on;
  - the public variant a marketing agent writes, at `operations/marketing/content/<page>/<item>.mdx`.
- **The public gate.** `packages/naive/src/engine/check-public.mjs` checks every content file before it can be published:
  - it names the internal record it is a variant of, its audience, and whether it is published;
  - a published file names the person who approved it;
  - it copies no run of ten words from its internal record, apart from public fields.

  This keeps internal content out of public pages and keeps generic text off them.
- **The handoff (EE-065).** The plan, the content variants and the brand make up the marketing package. Marketing hands it to engineering, which builds the site and does not decide what goes where. Planning the sitemap and designing the site are separate agents.

Run it with `node packages/naive/src/functions/marketing-and-sales/marketing/site/plan.mjs <venture> [--raising] [--hiring] [--contributors] [--write]`, or from the board's /site page with "Plan from my venture".

## What is not settled

The matrix is a starting opinion. Where information belongs depends on the startup type, the product, the industry and who the venture courts. That includes how to become a contributor, whether the venture is hiring, and whether it is raising, which can sit on an about, investors, careers or community page.

Next work, logged in EE-062:
- research best practice and replace the matrix's guesses with sourced conventions;
- rank several ICPs against each other (today they are one customer audience);
- derive the recommended sitemap and the order a visitor meets information from those priorities, beyond suggested pages;
- write skills and kits for organizing marketing content (MDX, EE-044);
- draft missing marketing records from what the site already says.
