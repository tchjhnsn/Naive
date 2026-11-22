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
| [workflows/intake.json](./workflows/intake.json) | Workflow: learn who the venture sells to and where each sale stands |
| [workflows/weekly-pipeline-review.json](./workflows/weekly-pipeline-review.json) | Workflow: review the sales pipeline each week |
| [marketing/canaries-test.mjs](./marketing/canaries-test.ts) | Its test |
| [marketing/fixtures](./marketing/fixtures) | A folder |
| [marketing/leaks-test.mjs](./marketing/leaks-test.ts) | Its test |
| [marketing/publish-build-test.mjs](./marketing/publish-build-test.ts) | Its test |
| [marketing/publish-build.mjs](./marketing/publish-build.ts) | The publish build: gate, compile, build, leak check and sha256 of each output |
| [marketing/site](./marketing/site) | Site presence: read a venture's website, judge which pages say what with Jev, and score how present its public records are, weighed by who the site must speak to now and  |
| [skills/brand-pillar](./skills/brand-pillar) | Skill: Provide Brand pillar context: teams, roles, Tier 1 deliverables (identity, voice, asset library, foreshadowing invariants, version-identities), cross-pillar overlap zone |
| [skills/pipeline-review](./skills/pipeline-review) | Skill: keep the sales pipeline true: MEDDIC qualification, stage evidence, leads with no reply, deals with no next step, and the win-loss reason of each closed deal |
| [skills/publication-policy](./skills/publication-policy) | Skill: Help a venture decide where it publishes and who may publish what there: its channels (website, docs site, social, newsletter, app store, press, investor update, regulato |
| [templates/marketing-brand.md](./templates/marketing-brand.md) | Template: brand |
| [templates/public-assets.md](./templates/public-assets.md) | Template: public assets |
| [templates/research-program.md](./templates/research-program.md) | Template: the function's starter research program (autoresearch). Init and `naive upgrade` copy it to a venture's `programs/marketing-and-sales.md` once, when the venture lists this function in venture.json departments and has no program; the copy is then the founder's, and only a person writes it |
