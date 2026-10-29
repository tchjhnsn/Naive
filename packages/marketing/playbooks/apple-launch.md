---
type: playbook
source: ai-drafted
created: 2026-10-29T22:30:00Z
ai-model: grok-4.7
tags: [naive, playbook, marketing, apple-launch, draft]
---

# Apple launch

A draft. The founder fills it in. It produces two files from the venture's product card: a launch narrative (the public post) and a demo script (the path someone shows, in order). It borrows the sequence of an Apple keynote and an Apple newsroom post. It does not borrow Apple's marks, product names, or advertising lines.

Marketing reads other functions' records by route. It does not copy them into a marketing record. The narrative names the product file it is a variant of. It does not paste the card's sentences.

## What Apple does

On 9 January 2007 Apple's newsroom post opened with one sentence: iPhone combines three products, a mobile phone, a widescreen iPod with touch controls, and an internet communications device, into one device. The body then took those three parts in turn. It closed with a Pricing & Availability section (United States in June 2007, a 4GB model at $499 and an 8GB model at $599) and a link to the keynote video. Source: [Apple Reinvents the Phone with iPhone](https://www.apple.com/newsroom/2007/01/09Apple-Reinvents-the-Phone-with-iPhone/) (press release, 9 January 2007).

The same close is still how a launch post ends. The 5 June 2023 Vision Pro post describes the product and then a Pricing and Availability section: it starts at $3,499 (U.S.) and would be available early the next year on apple.com and in Apple Store locations in the U.S. Source: [Introducing Apple Vision Pro](https://www.apple.com/newsroom/2023/06/introducing-apple-vision-pro/) (press release, 5 June 2023).

The Macworld 2007 keynote, in the transcript Todd Bishop typed and European Rhetoric republished, does the stage version of that post.

- Jobs names three things, repeats them, and says "These are not three separate devices, this is one device, and we are calling it iPhone."
- Before showing it, he sets the situation: ordinary phones are "not so smart and they're not so easy to use," and smartphones are "a little smarter, but they actually are harder to use."
- He then operates the device. The line into the demo is "let me show it to you."
- Earlier in the same keynote, after the Apple TV demo, he states the terms he had: "Apple TV is gonna be priced at $299," "shipping them next month, in February," and "taking orders starting today."

Source: [Transcript, iPhone Keynote 2007](https://www.european-rhetoric.com/analyses/ikeynote-analysis-iphone/transcript-2007/) (European Rhetoric; the page credits Todd Bishop for the transcript).

The demo was a rehearsed path, not a tour of every feature. New York Magazine's 9 January 2017 account, quoting Fred Vogelstein's 2013 New York Times Magazine piece, says Jobs rehearsed for six days and the phone still would not finish a full run: it lost its connection, calls failed, or it shut down. Engineers kept a "golden path," a specific set of tasks in a specific order. Backup units were on stage because the phone ran out of memory and restarted. The same account says the demo phone was set to show five bars of signal no matter the true strength. This playbook does not adopt that last practice. A beat may show only a result a record you have read already supports. Source: [How Steve Jobs Faked His Way Through Unveiling the iPhone](https://nymag.com/intelligencer/2017/01/how-steve-jobs-faked-his-way-through-unveiling-the-iphone.html) (Jake Swearingen, New York Magazine, 9 January 2017).

The method to borrow, and nothing else:

1. One sentence that says what the product is, before any feature list.
2. The situation that sentence is for, before the product is shown.
3. One rehearsed path that shows the product doing that one job, plus a fallback if the live path fails.
4. Who can have it, where, when, and for how much, and only with figures the records already hold.

## Trademark risk

Apple's trademark list is a non-exhaustive list of Apple's trademarks and service marks. It includes Apple (computers, computer software, computer peripherals, and, separately, various services), iPhone (mobile digital device), iPod (mobile digital device), Mac (computer), and Think different (slogan). The page says the absence of a name from the list is not a waiver of Apple's rights. Source: [Apple Trademark List](https://www.apple.com/legal/intellectual-property/trademark/appletmlist.html).

Apple's guidelines for third parties say Apple's trademarks, service marks, trade names, and trade dress are Apple's assets, that use may be prohibited unless expressly authorized, and that you do not shorten Apple product names or make up names that contain Apple trademarks. Source: [Guidelines for Using Apple Trademarks and Copyrights](https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html).

Do not use Apple, iPhone, iPod, or the slogan Think different as this venture's name, product name, or line. Do not paste sentences from an Apple post or keynote into the narrative or the demo. The check below flags those four. It is not a legal opinion, and it does not clear any other Apple mark. The list itself says it is not exhaustive.

## Template

Run the steps in order. Each one names the route it reads or writes. A route you have not read, and that the venture does not already hold, is not a source. If a read comes back not-found, leave that fact out. Do not fill it in.

Stop the whole template when step 1 has no card, or the card has no `job`. A launch with nothing to show is not this playbook.

### 1. Read the product card

route: product/[id] action: read

Use the id of the product this launch is for. The venture provides the card. If the read is not-found, stop. If `job` is missing or empty, stop and fill the card first. Keep `id`, `name`, `job`, `description`, `technology`, `offering`, `status`, `market`, and `offered_to`. You will cite this file. You will not paste its sentences into the public words.

### 2. Read what marketing inherits

route: marketing/design-system/inputs action: run

This command reads other functions' records by key. It does not copy them. Use a key only if it is in the result: `market:<id>` for this product, `problem`, `segment`, `icp:<id>`. If `market:<id>` is absent, the card has no `market`. The audience then has to be an `offered_to` id or `market.segment` on the card from step 1. If the card has neither, stop and fill the card.

### 3. Read the brand

route: marketing/brand action: read

If the read is not-found, there are no voice rules yet. Say so in your notes and keep going. Do not invent rules. If the record is there, keep `voice.rules`: each `avoid` phrase and the `use` phrase beside it.

### 4. Read pricing, and do not invent a price

route: validation/pricing action: read

If the read is not-found, the narrative and the demo state no price and no date. If it is there, a price beat may use only a `points` entry this record already holds (name, amount, currency). A date is spoken only when this record or the product card's `status` supports it. `status: live` means you may say it is available. Any other status means you say it is not available yet. You do not pick a month because a keynote would have one.

### 5. Write the launch narrative

The route `marketing/content` has actions read, view, and layout. It has no write action. Markdown is written as a file, then read back. Save the file at `operations/marketing/content/launch-narrative.mdx` (that folder is the one `operations/marketing/public` checks; a file under `marketing/content/` is read by `marketing/content` and missed by the public gate). Then:

route: marketing/content action: read

Confirm the file is in the result.

Frontmatter:

```yaml
variant_of: product/<id>.json
audience: <an offered_to id, or market.segment, from step 1>
publish: false
```

`variant_of` is the product file from step 1, and that file has to exist. Leave `publish` false. A person sets `publish: true` and `approved_by` to their own name in the same edit. An agent does not publish.

Body, in the venture's own words, four short paragraphs:

1. One sentence: what this product is, from `job`. Not a feature list.
2. The situation that job is for. If step 2 returned `problem`, say that problem in new words. If it did not, use `job` only.
3. The one path the demo will show: the product doing that job. Use `technology` only when the card has it.
4. Who can have it, and when. Only facts from steps 1 and 4. If you have no price record and `status` is not `live`, say it is not available yet and name no price.

No paragraph may repeat ten words in a row from the product file. The product's name may appear. None of Apple's lines may appear.

### 6. Write the demo script

Do this only after step 5. The script follows the narrative's one path. Save `operations/marketing/content/launch-demo.mdx` with the same frontmatter shape (`variant_of` the same product file, the same `audience`, `publish: false`). Then:

route: marketing/content action: read

Confirm both files are in the result.

The body is a title line and then one beat per line:

```text
# Show the product doing its job
job: <what the presenter does, and what the audience should see, from job>
technology: <the next beat, only if the card has technology>
status: <available, or not, from status>
```

A beat is a line `field: words`. The field is `job`, `technology`, `description`, `offering`, `status`, `market`, or `name`, and only when that field is on the card and not empty. The field `pricing` is allowed only when step 4 found a record. Any other field fails the support check.

The order is fixed: the situation, then the product doing the job, then availability. Add one fallback beat on the same field as the live path, for the case where the live path fails. The fallback shows the same job. It does not show a result the product does not produce. Keep each beat under ten words of the product file's own sentences.

### 7. Point the sitemap at both files

route: marketing/sitemap action: read

If the read is not-found, you will write a new sitemap whose only page is the launch page below. If a sitemap is already there, keep every page it has and add the launch page. Do not drop a page.

route: marketing/sitemap action: write

The record matches `schema/marketing-sitemap.schema.json`. Required: `version`, `venture`, `facts`, `offerings`, `audience`, `pages`, `omitted`, `handoff`. Set `handoff.to` to `engineering`. One offering, taken from the product card (`id`, `offering`, `offered_to`). `audience.offered_to` is that same list, `audience.partner_led` is false unless step 2 showed a partner-led audience, and `audience.types` may be empty. `facts` may be `{}`. `omitted` may be `[]`.

The page you add:

- `path`: `/launch`
- `parent`: `/`
- `label`: `Launch`
- `type`: `launch`
- `level`: `linked`
- two sections, narrative then demo. Each has `item`, `component`, `need`, `for`, `why`, `source`, and `variant`.
- `need` is `1`. That means the founder chose to show the section. It is not a computed score.
- `for` is the audience from step 1.
- `why` is one sentence naming the product route the section comes from.
- `source` is `{ "record": "product", "file": "product/<id>.json", "route": "product/<id>" }`.
- `variant` is `operations/marketing/content/launch-narrative.mdx` or `operations/marketing/content/launch-demo.mdx`.
- `component` is `LaunchNarrative` or `DemoScript`. Those are names for these two sections, not a component library.

`handoff.variants` lists both files.

## Checks

The launch worked when all four of these pass. Each one can fail, and a failure means it is not done.

### Public gate

route: operations/marketing/public action: run

Passes when every file in `operations/marketing/content/` names `variant_of` (a file that exists), an `audience`, and `publish` true or false; a published file names `approved_by`; and the body copies no run of ten words from the internal record. The router's `ok` is true on a pass. On a fail the call's `ok` is false and the message names the file. A file saved under `marketing/content/` does not count: the gate cannot fail it, so it is the wrong folder.

### Voice

route: marketing/voice action: run

Read `result.ok` and `result.violations`. The command exits 0 either way, so the router's `ok` stays true. `result.ok` is false when a content line uses a phrase `marketing/brand` says to avoid. `result.ok` is true when every file keeps to those rules. If step 3 was not-found, `result.ok` is true because there were no rules. That pass does not mean the words were judged.

### Support

Read the product card and the demo again.

route: product/[id] action: read

route: marketing/content action: read

A beat is a non-empty line in the demo body, after the frontmatter, that is not the title (`# ...`). It must match `field: words`. The field must be one of `job`, `technology`, `description`, `offering`, `status`, `market`, `name` and must be present and non-empty on the card, or `pricing` when step 4's read returned a record. Anything else fails, including a price spoken when pricing was not-found. This check is the comparison above. No route computes it.

### Marks

On the narrative body and the demo body, fail if any of these appear as words, in any case: Apple, iPhone, iPod, or the slogan Think different. This is a flag for the founder, not a clearance of other marks. Apple's own list says it is not exhaustive.

### Sitemap

route: marketing/sitemap action: read

Pass when a page with path `/launch` has the two variant paths from steps 5 and 6, each section's `source.file` is the product file, and every page that was there before step 7 is still there.
