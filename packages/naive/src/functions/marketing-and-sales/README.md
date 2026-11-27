# marketing-and-sales

Up: [functions](../README.md)

## What this is

The marketing and sales function (APQC 3.0, Market and Sell Products and Services). Its governance side is brand guidelines and the publication policy; its operations side is the marketing website (EE-044), campaigns, marketing assets, the sales pipeline. This module holds the skills, templates and frameworks Naive ships for it (EE-118 step 7). A function exists even when it ships nothing yet (EE-115), so the folder is here either way.

## Where things are

| Path | Holds |
|---|---|
| [function.json](./function.json) | The manifest: purpose, intake, measures, capability clusters |
| [agent.md](./agent.md) | The marketing and sales agent's instructions |
| [decisions.json](./decisions.json) | The decision matrix |
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn who the venture sells to and where each sale stands. Its pipeline step names APQC activity 3.5.1.2 Identify/receive leads/opportunities (EE-168). Its steps for records need-now suggests only after Discovery, or never, are steps to consider that name the phase they start in (check-functions.ts). |
| [workflows/campaign-daily-review.json](./workflows/campaign-daily-review.json) | Workflow: review an open campaign each day. Its trigger is daily `during` a campaign (EE-186), so it is due only while a campaign that covers it is open (`operations/time-box/[id]`): it counts responses against the campaign's goal, writes an opportunity and drafts a reply for each new lead, and proposes one change to the growth lead when responses fall short |
| [workflows/weekly-pipeline-review.json](./workflows/weekly-pipeline-review.json) | Workflow: review the sales pipeline each week. Its stage check names APQC activity 3.5.1.6 Manage opportunity pipeline (EE-168). Its `competitive-pricing` step is one to consider (EE-181): compare the price with each competitor's published price, APQC activity 3.3.3.11 Conduct competitive pricing review, when the venture has a price and a competitor publishes one |
| [workflows/site-copy.json](./workflows/site-copy.json) | Workflow: write a page's words as records and have the founder approve them before anything is designed (EE-216). On request: the gap report, the two paths, one open decision per element with two or three options, the founder's choice, the handoff to the builder, then the publish check |
| [marketing/copy.ts](./marketing/copy.ts) | A page's words as records (EE-216): the element catalogue from the sitemap and the matrix, each element's state and the state of every record it cites, `naive copy gaps`, `check`, `draft --propose` and `one-shot`, and the copy gate the publish build runs first |
| [marketing/copy-test.mjs](./marketing/copy-test.ts) | Its test: the gap report, the gate refusing a build, drafting through a stand-in harness, a person deciding and merging each element, and the one-shot path |
| [workflows/site-documents.json](./workflows/site-documents.json) | Workflow: read the settled site copy as one document before anyone builds a page (EE-218). Triggered by a request, and it runs after `site-copy`, whose copy records are what it reads. Its steps are the document ladder in order: render the `site-copy` document kind, the catalog's name for the site's words as one reading copy (`naive render site-copy`), fill every hole it shows by writing the record rather than the sentence, and hand the printed copy to a person. Building the interactive page and publishing the site are steps to consider, each held until a person approved the rung below, and publishing raises `public-commitment`, a one-way door the founder approves. Its done criteria run `node packages/naive/src/checks/check-documents.ts` over the venture |
| [marketing/canaries-test.mjs](./marketing/canaries-test.ts) | Its test |
| [marketing/fixtures](./marketing/fixtures) | A folder |
| [marketing/leaks-test.mjs](./marketing/leaks-test.ts) | The publishing gate test: field visibility, leak canaries and internal terms. Its public variant sits in `marketing/content/` and names its audience, as `packages/naive/src/engine/check-public.ts` requires of every content file |
| [marketing/publish-build-test.mjs](./marketing/publish-build-test.ts) | Its test |
| [marketing/publish-build.mjs](./marketing/publish-build.ts) | The publish build: gate, compile, build, leak check and sha256 of each output |
| [marketing/site](./marketing/site) | Site presence: read a venture's website, judge which pages say what with Jev, and score how present its public records are, weighed by who the site must speak to now and  |
| [skills/brand-pillar](./skills/brand-pillar) | Skill: Provide Brand pillar context: teams, roles, Tier 1 deliverables (identity, voice, asset library, foreshadowing invariants, version-identities), cross-pillar overlap zone |
| [skills/pipeline-review](./skills/pipeline-review) | Skill: keep the sales pipeline true: MEDDIC qualification, stage evidence, leads with no reply, deals with no next step, and the win-loss reason of each closed deal |
| [skills/site-copy](./skills/site-copy) | Skill: write a public page's words as records before anything is designed: name the records that are missing, offer two or three options per element with the records each one cites, ask the founder which they want, and build only from the elements they approved |
| [skills/publication-policy](./skills/publication-policy) | Skill: Help a venture decide where it publishes and who may publish what there: its channels (website, docs site, social, newsletter, app store, press, investor update, regulato |
| [templates/marketing-brand.md](./templates/marketing-brand.md) | Template: brand |
| [templates/public-assets.md](./templates/public-assets.md) | Template: public assets |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/marketing-and-sales.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |

Each workflow names its `goal`, what one run must make true, and the telos measure kinds it moves, which are a subset of this function's in `function.json`; `agent.md` names what the agent works toward, the routes it writes, what to do when it does not know, and when to load each skill in this module (EE-215). `node packages/naive/src/checks/check-functions.ts` fails on any drift between the three.

Each workflow's done criterion `records-valid` runs `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`: it validates the business's records, the folder the handoff runner names in `NAIVE_VENTURE`, not Naive's own.
