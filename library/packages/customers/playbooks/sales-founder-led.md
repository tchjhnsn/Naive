---
type: playbook
source: ai-drafted
created: 2026-10-29T22:40:00Z
ai-model: grok-4.7
tags: [naive, playbook, customers, founder-led-sales, draft]
---

# Founder-led sales

Draft. This playbook does not decide who you sell to, what you charge, or which people are customers. You write those records. An agent may help you file words you already said. It may not invent a person, an amount, or a buying stage.

The template produces two things. A pipeline: one `customers/[id]` record per person you are working, with a buying stage. A first-ten playbook: the same records, each carrying one sentence on how you reach people, what a yes is, and when you let them go. Ten is the number of people who have paid, not the number of names on the list.

You read other functions' records by their route and cite an id. You do not copy their text into a customer record, and you do not write their records from here.

## What the method does

Founder-led sales, as these sources describe it, means a founder does the first selling and learns the motion before anyone is hired to sell.

Pete Kazanjy uses "Founder-Led Sales" for the pattern in which the founder figures out the first repeatable sales motion, then hires and manages the first professional sellers, instead of hiring sellers to invent that motion. He describes it as the sales-motion version of the experiments in Eric Ries's *The Lean Startup*. [Founder-Led Sales](https://kazanjy.svbtle.com/founder-led-sales) (25 September 2016).

Paul Graham, July 2013: startups take off because the founders make them take off. "The most common unscalable thing founders have to do at the start is to recruit users manually." "You can't wait for users to come to you. You have to go out and get them." He also writes that for a startup to succeed, at least one founder, usually the CEO, will have to spend a lot of time on sales and marketing. When someone agrees to try the product, the founders he describes set it up with that person then, rather than sending a link and waiting. [Do Things that Don't Scale](https://www.paulgraham.com/ds.html).

Jason Cohen, 9 August 2010: prove a product by finding ten people ready to hand over cash. "Businesses don't start with millions of customers, they start with one, then ten, then a hundred, and then a thousand." "When ten people say they'll give you money, that's the only validation that counts." [Yes, but who said they'd actually BUY the damn thing?](https://longform.asmartbear.com/customer-validation/). Naive's ICP record asks for the same scale of specificity: a profile "specific enough to go and find ten of them" (`schema/icp-profile.schema.json`).

Gustaf Alströmer, in the Y Combinator Startup School talk "How to get your first customers", argues that the founder should do the selling at the beginning, and says "you should not hire a sales team until you know how to do sales yourself." He simplifies the funnel, in his words, to: make a list, send an email or a message, schedule and run a demo or a meeting, talk pricing, close them as a customer, and onboard them so they start using it. He says your first customers should be your easiest, that selling to people you know is going to be easy and selling to strangers is harder, and that if you do not charge, they are not a customer. For business-to-business sales he says not to offer free trials: charge, and use a money-back guarantee or a way to opt out instead. He also says you cannot close five customers from 10 leads, and he works an example, at rates he assumes for that example, in which 100 outreach messages produce zero customers. In that talk he says the Brex founders recruited the first ten customers from their Y Combinator batch, and that one of them onboarded every one of those customers. [How to get your first customers](https://www.ycombinator.com/library/Ip-how-to-get-your-first-customers).

This playbook takes Cohen's ten and Alströmer's charge-and-onboard line together. A person who only says they would pay stays at `aware`, with the amount they named written in notes. `paying` means money moved, or a charge they can opt out of, and the notes show the amount as digits plus a three-letter currency. A date by itself is not an amount. Ten names on a list are not ten customers. The list can be longer than ten. The exercise is done when ten records are `paying`.

The customers package already asks which buying stage the notes support, and its answers are `aware`, `trying`, `paying`, and `gone` (`library/packages/customers/package.json`). This playbook adds `named` for a person on the list before any conversation, because that question has no notes to read yet. The field on the record is `buying_stage`. The package's model step is a separate judgment. It does not replace what you wrote.

### Marks

Y Combinator is a trademark. Stripe, Airbnb, and Brex are trademarks of their owners; the sources above mention them. "Founding Sales" is the title of Kazanjy's book. This playbook borrows the method. It does not copy their names, marks, slogans, or emails into your records, your product, or a message you send. Do not paste a sample email from that talk. Write your own, short, in plain text, about the problem your `foundation/problem` record states, and ask for a conversation or for them to try it with you there.

Alströmer names several contact and CRM products in that talk. This playbook does not adopt them. The pipeline is `customers/[id]`.

## Template

Fill this in from records you read through Naive. If a read comes back missing, stop at that step or continue only where the step says the record may be absent. Do not fill a missing record in from memory.

The buying stages, in the order a deal usually moves:

1. `named`. On the list. No conversation yet. Notes empty.
2. `aware`. You have talked, or you set it up with them. Notes say what they already do, not what they might do later.
3. `trying`. They are using it on their own work and have not paid. Notes name the date you will ask them to pay. Alströmer's line is that an unpaid user is not yet a customer. This stage is allowed so you can see that gap. It is not a yes.
4. `paying`. They paid an amount, or accepted a charge they can opt out of. Notes include the numeral.
5. `gone`. They will not pay, you let them go, or they stopped. Notes say which.

You can move from `aware` to `paying` without `trying`. That is the path where you charge instead of running an unpaid pilot. You do not move from `named` to `paying` without notes of a conversation or a setup you did with them.

### 1. Read where customer records live

Read `knowledge/knowledge-sources`.

If the record is missing, customer records live in this venture's folder. Continue.

If `records` names a source for the customer record type, that source is the system of record. Each `customers/[id]` you write is a pointer and a short summary, not a copy of that source. Do not copy a stage name out of it. You still set `buying_stage` from what you saw.

### 2. Read who you sell to

Read `foundation/icp`, `foundation/problem`, and `product/[id]` for the product you are selling.

Stop if any of the three is missing, or if `foundation/icp` lists no profile, or if the problem record has no statement. Do not invent a profile or a problem. Do not copy the profile's `who` text or the problem statement into a customer record. Keep the profile id. You will cite it.

Read `people/founders`. If the list is empty, you still hold the calls. You will write your own name in notes. If it has records, the `caller` you write later is one of those ids.

### 3. Read the price, or find that there is none

Read `validation/pricing`.

If it is missing, or it has no price point, you have no price to quote. Do not invent one. The ask on the first calls is what they would pay, and you write only an amount they name or pay.

If it has points, that is the ask you are testing. You still do not copy a point into a customer record. The amount on the customer record is what that person paid or offered.

### 4. Name the list

For each person you can actually reach, write `customers/[id]`. Start with people you know and with the ones most likely to decide quickly. Alströmer says the first customers should be the easiest, and that selling to people you know is easier than selling to strangers. Leave the list longer than ten if you need more conversations. His talk says you cannot close five customers from 10 leads.

Write:

- `id`: a lowercase slug you choose.
- `name`: the person or the account, as you would say it.
- `icp`: the profile id from `foundation/icp`. The id only.
- `buying_stage`: `named`.
- `summary`: the first-ten sentence below, filled in.
- `notes`: `""`.

Do not write a person you cannot contact yourself. Do not import a purchased list.

The first-ten sentence, in `summary`, is the playbook. Use your words, in this shape:

`ICP <profile id>. Reach: <how you actually reach this person>. Yes: they pay an amount written in notes. Let go: <when you stop pursuing them>.`

The reach and let-go clauses can be the same on every record while the motion is the same. Change them when you change the motion. Do not copy them from a web page.

### 5. Open the conversation log

Before the first note that is not empty, write `purpose/data-stream/conversations`:

- `id`: `conversations`
- `sensitive`: `true` if the log will hold what someone said about their business, otherwise `false`
- `summary`: one line on what the log covers, required by you when `sensitive` is `true`

The facts the checks read stay on `customers/[id]`, because that is the record the buying-stage question reads. This step only declares the stream. There is no route for an events file. Do not put the pipeline in a file the router does not write.

### 6. Talk, then write what happened

After a conversation, or after you set the product up with them on the spot, write `customers/[id]` again.

- `buying_stage`: `aware`
- `notes`: the date, then `caller: <founder id, or your name if people/founders is empty>`, then what they already do or already pay. Specific past facts. Not a hope about later.

If they will not take the conversation, write `buying_stage` `gone`, with the date, `caller: <founder id, or your name if people/founders is empty>`, and that they declined in notes. Do not leave them `named` with a silent no.

### 7. Ask them to pay

Write `customers/[id]` again. Every note here keeps the `caller:` line from step 6.

- They pay, or they accept a charge they can opt out of: `buying_stage` `paying`. Notes include the amount as digits and a three-letter currency, such as `40 USD`, and a line that you onboarded them (you set it up with them, you did not only send a link). A date on its own is not an amount.
- They use it and have not paid: `buying_stage` `trying`. Notes include `ask: YYYY-MM-DD`, the date you will ask for payment. This is not a yes.
- They will not pay, or they drag on and you let them go: `buying_stage` `gone`, with `caller:` and the reason in notes.

A promise of an amount, with no payment, stays `aware`. Keep the numeral in notes so you can see the offer. Do not mark it `paying`.

### 8. Read the pipeline back

Read `customers`. The list is the pipeline. Each item's `buying_stage` is the deal. The `summary` lines, read together, are the first-ten playbook: who you cite, how you reach them, what a yes is, and when you let go.

Stop adding names and re-read `foundation/icp` when several records are `gone` for the same reason. This playbook does not change the ICP. You change `foundation/icp/<profile id>` yourself if you decide the profile is wrong.

## Checks

Read the routes. A check that cannot fail tells you nothing. Each one below fails on a record you can actually write, and passes on a record that meets it.

| Check | Pass | Fail |
|---|---|---|
| List started | `customers` returns at least one record | The read is missing |
| ICP cited | Every record's `icp` is an id on `foundation/icp` | `icp` is missing, or it is not an id on that list |
| Buying stage known | `buying_stage` is `named`, `aware`, `trying`, `paying`, or `gone` | Any other word, including a CRM stage |
| Named is only a list | `buying_stage` `named` has empty `notes` | `named` with notes |
| Notes for a later stage | `aware`, `trying`, `paying`, or `gone` has non-empty `notes` | One of those stages with empty notes |
| Stream before notes | If any notes are non-empty, `purpose/data-stream/conversations` exists | Notes exist and that read is missing |
| Caller written | For every stage past `named`, notes contain `caller:` and then an id of lowercase letters, digits, and hyphens | That line is missing |
| Caller is a founder | If `people/founders` has records, that id is one of them. Punctuation after the id is not part of it | A caller id that is not in the list |
| Trying names the next ask | `trying` notes match `ask:` and a date `YYYY-MM-DD` | `trying` without that date |
| Paying names an amount | `paying` notes contain digits and a three-letter currency, such as `40 USD`. A date alone does not count | `paying` with no amount |
| First ten | At least ten records are `paying`, and each of those notes has digits and a three-letter currency | Fewer than ten, or a `paying` record with no amount |
| Playbook sentence | Every `summary` contains `ICP `, `Reach:`, `Yes:`, and `Let go:` | A summary missing any of those |

The first-ten check is the exercise, not a permanent cap. After ten have paid, more `paying` records still pass it. It fails while you have fewer than ten. That is the point: the list is not done when it merely exists.

`naive check` does not grade this playbook. For the customers function it runs `schema/check-data-packages.mjs` (coverage and freshness). Run that after you write, and fix a failure before you treat the write as filed.
