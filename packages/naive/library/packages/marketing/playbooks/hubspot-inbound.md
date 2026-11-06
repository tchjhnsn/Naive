---
type: playbook
source: ai-drafted
created: 2026-10-29
ai-model: grok-4.7
tags: [playbook, marketing, inbound, draft]
---

# Inbound content plan

A draft for the founder. Nothing in this playbook is a decision. It studies one method and turns `marketing/sitemap` into a content plan the founder can fill in.

This playbook is independent of HubSpot, Inc., and is not authorized by, endorsed by, sponsored by, affiliated with, or otherwise approved by HubSpot, Inc.

## What the method does

Inbound marketing, as HubSpot describes it, pulls people in with content that answers a question they already have. The same page sets that against pushing messages out through cold calls, display ads, or purchased email lists. The method has three stages. Attract draws in the people the work is for, with content and conversations that are useful to them. Engage offers insight that lines up with their pains and goals. Delight helps a customer succeed with the product after they have it. HubSpot says the three stages together are a flywheel: momentum that comes back around, because a customer who succeeds is part of how the next person arrives. See [What Is Inbound Marketing?](https://www.hubspot.com/inbound-marketing).

[The Flywheel Model](https://www.hubspot.com/flywheel) says HubSpot redesigned that method as a circle. Attract earns attention with useful content and takes barriers out of the way. The forces it names there are content marketing, search engine optimization, social media marketing, social selling, targeted paid advertising, and conversion rate optimization. Engage makes it easier to shop and buy on the person's own timeline and channels. The forces it names are website and email personalization, database segmentation, marketing automation, lead nurturing, multichannel communication (chat, phone, messaging, email), sales automation, lead scoring, and try-before-you-buy programs. Delight helps the customer reach a goal. The forces it names are self-service (a knowledge base, a chatbot), proactive customer service, multichannel availability, ticketing systems, automated onboarding, customer feedback surveys, and loyalty programs. The same page says the delight stage powers the attract stage, because what a customer tells other people depends on how they were treated.

The buyer's journey, as Justina Thompson describes it for HubSpot (updated 03/24/25), is the path to a purchase. Awareness: the buyer realizes a problem or a need and looks for information that names it. Consideration: the buyer has named the problem and researches approaches. Decision: the buyer has chosen an approach and evaluates who will provide it. The same article separates the customer's journey, after the purchase: onboarding, adoption, retention, and advocacy. See [What is the Buyer's Journey?](https://blog.hubspot.com/sales/what-is-the-buyers-journey).

A content map, as Stephanie Trovato describes it for HubSpot (updated 07/14/26), is the working document that lines content up with a persona and a stage. Each row says who the piece is for, which stage they are in (awareness, consideration, or decision), what question or objection they have, and which piece answers it. See [How I use content mapping to deliver the right message at the right time](https://blog.hubspot.com/marketing/content-mapping-template-personalize-marketing).

HubSpot's knowledge base (last updated November 20, 2025) describes a topic as a pillar page plus supporting pages. The supporting pages link back to the pillar. The pillar is a long page on one topic, and it should not lock that content behind a form or a password, so a crawler can read it. HubSpot's SEO tool caps a topic at 100 subtopic keywords, and each supporting piece attaches to one topic. That cap is a limit of the tool. This playbook does not apply it. See [Topics, pillar pages, and subtopic keywords](https://knowledge.hubspot.com/content-strategy/pillar-pages-topics-and-subtopics).

The inbound page also describes Loop Marketing, a four-stage playbook (Express, Tailor, Amplify, Evolve) that HubSpot says builds on inbound and does not replace it. Loop Marketing is a HubSpot product name. This playbook studies the inbound method above. It does not carry out Loop Marketing.

### Trademark risk

HubSpot lists HubSpot as a registered mark, and INBOUND as a registered mark for the word INBOUND in an event name. The same list includes Loop Marketing, Marketing Hub, Content Hub, and the other product names HubSpot publishes there. See [Our Trademarks](https://legal.hubspot.com/trademarks).

HubSpot's trademark guidelines say a use of those marks should not suggest sponsorship or endorsement, and they say not to place the logos on a site without written permission. A referential use of the word mark, in their guidelines, stays less prominent than the speaker's own name and carries a disclaimer of the kind in the line under the title of this playbook. They also say not to use the marks in advertising copy. See [HubSpot Trademark Usage Guidelines](https://legal.hubspot.com/tm-usage-guidelines).

HubSpot's partner promotion guidelines say HubSpot holds INBOUND as a mark for its event, and that partners may not use "inbound" alone or inside another word as an event name. The same page says HubSpot treats "inbound marketing" as a generic name for this approach, and that partners may not trademark that phrase or enforce it against others. See [HubSpot Solutions Partner Promotion Guidelines](https://www.hubspot.com/partners/promotion-guidelines).

Leave HubSpot's logos, sprocket, product names, and advertising lines out of the venture's pages. Use the method: three flywheel stages, the buyer's journey, a content map, and one pillar page per topic with supporting pages that link to it. The venture's words come from its own records.

## Template

The content plan is the table at the end of this section, one row for each section on `marketing/sitemap`. Fill it in order. A step that reads a record reads it through the router. If the read says the record is missing, stop that step. Leave the cell blank. Do not invent the record.

The venture provides these before the first step, when it has them: `marketing/sitemap`, `foundation/icp`, `foundation/problem`, `product`, `marketing/brand`, `governance/publication-policy`. Later steps write files that `marketing/content` reads. They do not copy another function's record into a marketing record. Name the other record by id or by path.

1. Read `marketing/sitemap`. List every page `path` and every section `item`, `for`, `source`, and `variant`. If the read is not found, stop. There is no plan until a sitemap exists.
2. Read `foundation/icp`. The profiles are the personas. For each profile, keep `id`, and read `who` and `jobs` so you know who the row is for and what they are trying to do. The plan stores the `id`. It does not paste `who`. If the read is not found, stop. Do not invent a persona.
3. Read `foundation/problem`. Use `statement` and `segment` when an awareness row needs the problem the venture has recorded. If the read is not found, leave the problem column blank.
4. Run `marketing/design-system/inputs`. The keys (`icp:<id>`, `problem`, `segment`, `market:<product id>`, and the others it returns) are how marketing names what it inherited. Put those keys in the plan's source column when they match the section. Do not paste the values into a second record.
5. Read `product`. For each id the list returns, read `product/[id]`. A decision row may name that id, and `offered_to` when the product has it. Do not add a product the list did not return.
6. Run `marketing/voice`. If `marketing/brand` has voice rules, the drafts in step 9 have to pass this command. If there is no brand, the command still runs and reports no broken rule. The words are still the founder's.
7. Read `governance/publication-policy`. Note the channel the page will use and the `approvers` on that channel's rule. The plan may name that channel and that approver role. Leave every draft unpublished.
8. Fill the table. One row per sitemap section. This step writes no route. It uses only what steps 1 to 7 read.
   - **Page.** The sitemap page `path`.
   - **Section.** The section `item`.
   - **ICP.** An `id` from step 2. The section's `for` is a hint the sitemap already stored. Pick the profile id.
   - **Flywheel.** One of attract, engage, delight. Those are the three stages on the inbound page and the flywheel page.
   - **Stage.** One of awareness, consideration, decision (the buyer's journey), or onboarding, adoption, retention, advocacy (the customer's journey, for a delight row).
   - **Question.** The question or objection this page answers, in the founder's words. Awareness names the problem from step 3. Consideration compares approaches. Decision helps the reader choose, using the product from step 5. A delight row helps someone who already has the product.
   - **Source.** The section's `source` file, which must be a record that exists. Prefer a key from step 4 when one fits.
   - **Variant.** The section's `variant` path. It has to start with `operations/marketing/content/`, because `operations/marketing/public` only reads that folder. `marketing/content` also reads `marketing/content/`, and a file that lives only there is invisible to the public gate.
   - **Pillar.** `yes` on one row per topic. The other rows on that topic set **Links to** to the pillar's page path. The pillar row is the page a reader can open without a form in the way. HubSpot's knowledge base says a pillar should not lock its content behind a form or a password.
9. Write each row as a file at its variant path. `marketing/content` has read, view, and layout. It has no write action. Write the file on disk, then read `marketing/content` and confirm the file came back. Frontmatter:

```yaml
variant_of: <source file from the row, a path that exists>
audience: <ICP id from the row>
publish: false
page: <page path>
stage: <stage>
flywheel: <flywheel>
pillar: <true or false>
links_to: <pillar page path, or empty>
gated: false
```

The body is the founder's own words and answers the row's question. It does not repeat a run of ten words from `variant_of`. It does not use a phrase `marketing/voice` says to avoid. It does not use HubSpot's marks or advertising lines. Leave `publish` false. A person sets `publish: true` and `approved_by` later, and `approved_by` is an approver from step 7.

10. Run the checks in the next section.

### Content plan

| Page | Section | ICP | Flywheel | Stage | Question | Source | Variant | Pillar | Links to |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | | |

Stages with no row (write the list, including "none"):

Topic (one line, from `foundation/problem`, named by the founder):

Channel and approver role (from `governance/publication-policy`):

## Checks

Each check can pass and can fail. Run them on the venture after step 9. A missing record is a failed read, not a pass.

1. **Pages covered.** Read `marketing/sitemap` and `marketing/content`. Every page path on the sitemap appears as `page` on a file the content read returned. Pass: every path is there. Fail: a sitemap page has no file.
2. **Known audience.** Read `foundation/icp` and `marketing/content`. Every file's `audience` equals a profile `id`. Pass: each audience is an id from that read. Fail: the audience is missing, or it is a label that is not an id.
3. **Stage named.** Read `marketing/content`. Every file's `stage` is awareness, consideration, decision, onboarding, adoption, retention, or advocacy. Every file's `flywheel` is attract, engage, or delight. Pass: both fields are in those lists. Fail: a field is missing or uses another word.
4. **Public gate.** Run `operations/marketing/public`. Pass: the command lists each variant file and reports no error. A draft passes when `variant_of` is a file that exists, `audience` is set, and `publish` is false. Fail: the command reports an error. It errors when a file is published with no `approved_by`, when `audience` or `variant_of` is missing, when `variant_of` is not a real file, or when the body copies a run of ten words from that file. A run that lists zero files has not checked the plan. That happens when the files sit outside `operations/marketing/content/`. Treat zero files as a fail.
5. **Voice.** Run `marketing/voice`. Pass: no phrase in the drafts breaks a voice rule. Fail: the command names a phrase a `marketing/brand` rule says to avoid. With no brand, the command reports no broken rule. That pass only means there is no rule yet.
6. **One open pillar.** Read `marketing/content`. Exactly one file on the topic has `pillar: true`, that file is in the read (so it is not under a private folder the router skips), and `gated` is not true. Other files on the topic set `links_to` to the pillar's page. Pass: one readable pillar, not gated. Fail: none, more than one, a pillar the content read does not return, or `gated: true`.
7. **Approver, when something is published.** Read `governance/publication-policy` and `marketing/content`. For a file with `publish: false`, this check passes because nothing was published. For a file with `publish: true`, `approved_by` is one of the `approvers` on the channel the plan names. Pass: unpublished drafts, or a published file whose `approved_by` is on that list. Fail: `publish: true` and `approved_by` is missing or is not on that list. The public gate already rejects a missing `approved_by`. It does not compare the name to the policy. This check does.

The model of these steps, and the replay that runs them on a fixture venture, is `packages/naive/test/verification/cursor/playbook-hubspot-inbound/`.

## Sources

- [What Is Inbound Marketing?](https://www.hubspot.com/inbound-marketing)
- [The Flywheel Model](https://www.hubspot.com/flywheel)
- [What is the Buyer's Journey?](https://blog.hubspot.com/sales/what-is-the-buyers-journey) (Justina Thompson, updated 03/24/25)
- [How I use content mapping to deliver the right message at the right time](https://blog.hubspot.com/marketing/content-mapping-template-personalize-marketing) (Stephanie Trovato, updated 07/14/26)
- [Topics, pillar pages, and subtopic keywords](https://knowledge.hubspot.com/content-strategy/pillar-pages-topics-and-subtopics) (HubSpot knowledge base, last updated November 20, 2025)
- [Our Trademarks](https://legal.hubspot.com/trademarks)
- [HubSpot Trademark Usage Guidelines](https://legal.hubspot.com/tm-usage-guidelines)
- [HubSpot Solutions Partner Promotion Guidelines](https://www.hubspot.com/partners/promotion-guidelines)
