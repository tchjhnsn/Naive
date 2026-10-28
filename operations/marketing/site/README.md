---
type: framework
source: hybrid
created: 2026-10-28T20:10:00Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, operations, marketing, marketing-website, site-presence, icp, typesafe, jev, firecrawl]
description: "Site presence: read a venture's website, judge which pages say what with Jev, and score how present its public records are, weighed by who the site must speak to now (the marketing matrix). Version 0.1.0, unevaluated."
---

# Site presence and the marketing matrix

Version 0.1.0, ours and unevaluated (EE-062). For the demo there are no connections: a founder pastes a link to their marketing site (or their product), and Naive reads it.

## What it does

1. **Read.** `platform/integrations/site.mjs` reads the home page and up to nine pages it links to. Pages a marketing site usually has (about, pricing, careers, investors, community, press, security) come first, one per section. Firecrawl renders the pages when `FIRECRAWL_API_KEY` is set. Otherwise a plain fetch reads the HTML, which misses sites that only render in the browser. Each page records where it sits: the home page, the header or navigation, linked from the home page (the footer counts), or deeper.
2. **Judge.** Jev answers one typed question per page and item: "Does this page tell a visitor …?" That is 150 questions for ten pages, in about 0.4 seconds. Without a Jev key, the matrix's keywords judge instead, which is rougher, and the result says so.
3. **Weigh.** The marketing matrix (`matrix.json`) names six audiences: customers, investors, candidates, contributors, partners and press. It lists fifteen items each audience may need to learn, and the record each item comes from. Every item is public by default (publish: true).
   - **Audience weights** come from the venture's facts: raising, hiring, inviting contributors, and what its ICP records say about who it courts. Investors weigh 1 while the venture is raising and 0.15 otherwise.
   - **An item's need** is its strongest audience weight times importance.
   - **Need sets prominence:** 0.7 or more belongs on the home page, 0.4 in the navigation, 0.2 linked from the home page, and anything less can be anywhere. An item with its own page, such as pricing or careers, needs that page in the navigation, not on the home page.
4. **Score.** An item scores 1 when it is as prominent as it needs to be, 0.5 when it is present but buried, and 0 when it is missing. The site score is the need-weighted share, from 0 to 100, with a score for each audience. "Fix first" lists the three most-needed items that fall short. A missing item that no audience needs now is noted and not held against the site.

## Where to run it

- **Board:** `node interface/demo/board.mjs`, then `/site`. Paste a link, tick raising, hiring or contributors, and read the result as three columns: missing, not prominent enough, present.
- **CLI:** `node interface/harness/site.mjs <url> [--venture <dir>] [--raising] [--hiring] [--contributors]`. With a venture, the result is saved to `operations/marketing/site-presence.json`, and the router command `operations/marketing/site` reads it back.

## What is not settled

The matrix is a starting opinion. Where information belongs depends on the startup type, the product, the industry and who the venture courts. That includes how to become a contributor, whether the venture is hiring, and whether it is raising, which can sit on an about, investors, careers or community page.

Next work, logged in EE-062:
- research best practice and replace the matrix's guesses with sourced conventions;
- route each ICP into the matrix with its own information needs and priority;
- derive the sitemap and the order a visitor meets information from those priorities;
- write skills and kits for organizing marketing content (MDX, EE-044);
- draft missing marketing records from what the site already says.
