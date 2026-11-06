---
type: playbook
source: ai-drafted
created: 2026-10-29T22:20:00Z
ai-model: grok-4.7
tags: [naive, playbook, product, stripe-docs, draft]
---

# Docs a caller can read, and a changelog habit

This playbook is a draft. It decides nothing for the founder. It studies how Stripe keeps a caller-facing description next to every API change, then asks you to fill a spec and a changelog habit in your own words. An agent may propose the decision records below. It leaves them `open`. You decide them.

Specs and roadmap are planned records, not routes yet. This template writes the spec as a proposal on `decisions/[id]`, which is what the product function does with a spec until that record exists (`packages/naive/library/packages/product/skill/SKILL.md`).

## Trademark

Stripe's name, product names, release names (such as Acacia, Basil, and Endive), the header `Stripe-Version`, the header `Idempotency-Key`, and parameter names such as `expand` are Stripe's. This playbook borrows a method. It does not copy Stripe's marks, object names, or public wording into your product name, your nouns, or anything you publish. Using those names as your own marks is the trademark risk.

## What Stripe does

Stripe's developer docs and the API are one change, not two later writeups. The pages below are the source for every claim in this section. Nothing here is a slogan Stripe did not publish, and the numbers are the ones those pages state.

### One description, then the reference and the changelog

When a Stripe engineer changes an API, the API reference has to show the new shape and carry descriptions a developer can integrate from, and the public changelog has to list the change, why it matters, and how it affects users. Documentation and code samples are written and checked with the API definition, and they reach the API reference through the same description. Before a change can merge, automated tests check it against Stripe's API patterns, including naming, field types, and backwards compatibility. A public method, event, error, field, or enum value with no doc string is warned: "Every public API method, event, error, field, & enum value should have a doc string." After the change merges, Stripe compares the description of the previous version with the next one and suggests changelog text. At release, the API reference is updated for the new version. Stripe uses OpenAPI as that shared description. ([How API changes flow into Stripe's developer products](https://stripe.dev/blog/how-api-changes-flow-into-stripes-developer-products))

The method to borrow: one spec is the wording a caller reads, and a changelog entry is written from that same change. The template does not ask you to adopt OpenAPI, Protocol Buffers, or Stripe's review tools.

### Versions a caller can stay on

"Stripe versions the API so you can adopt new features on a predictable schedule." Each request, webhook, and automated operation runs against one API version, which decides the parameters you can send and the objects you receive. The versioning page names the current version as `2026-10-28.endive` and points to the API changelog as the record of changes. ([How API versioning works](https://docs.stripe.com/api-versions), [Versioning](https://docs.stripe.com/api/versioning))

Starting with the `2024-09-30.acacia` release, Stripe ships a new API version every month with no breaking changes. Twice a year it ships a major release (the page gives Basil as an example) that can contain breaking changes. You can move to any monthly release without changing your code. Moving to a major release can require changes. A version identifier is date-based, such as `2024-09-30.acacia`. A major release also has a name, such as Acacia or Basil. Monthly versions after a major release stay on that name and do not add breaking changes. ([How API versioning works](https://docs.stripe.com/api-versions))

Stripe picks a version for a request from the `Stripe-Version` header if you set one, otherwise from the version pinned by your server-side SDK, otherwise from your account's default. ([How API versioning works](https://docs.stripe.com/api-versions))

Stripe treats these as backward-compatible: adding an API resource, adding an optional request parameter, adding a response property, changing the order of properties, changing the length or format of opaque strings (object ids can be up to 255 characters), and adding an event type. A major release can rename a field, remove a parameter, or change an object shape. Stripe tells integrators to ignore unfamiliar fields and event types. ([How API versioning works](https://docs.stripe.com/api-versions))

The method to borrow: say which changes a caller can ignore, and which changes force a new wording. The template does not copy the monthly schedule, the header name, or the 255-character id rule.

### Writes a caller can retry

"The API supports idempotency for safely retrying requests without accidentally performing the same operation twice." When creating or updating an object, the caller sends an idempotency key, and a dropped connection can be retried without creating a second object or applying the update twice. Stripe suggests a V4 UUID or another random string with enough entropy to avoid collisions. Keys are up to 255 characters. Stripe says not to put sensitive data, such as an email address, in the key. ([Idempotent requests](https://docs.stripe.com/api/idempotent_requests))

On API v1, Stripe saves the status code and body of the first request after the endpoint starts running. A retry with the same key returns that saved response, including a `500`. Keys can be removed after they are at least 24 hours old, and a reuse after that is a new request. If the retry's parameters differ from the first request, Stripe returns an error. Stripe saves a result only after the endpoint starts: a request that fails validation, or that conflicts with another request still running, is not saved, and the caller can retry it. All v1 `POST` requests accept a key. `GET` and `DELETE` do not need one, because those requests are idempotent by definition. On API v2, a retry does not repeat a successful operation. Stripe retries failed or partly failed work when it can, and returns an error that says why when a retry cannot succeed. ([Idempotent requests](https://docs.stripe.com/api/idempotent_requests))

The errors page lists `409 Conflict` as "The request conflicts with another request (perhaps due to using the same idempotent key)." An `idempotency_error` is "when an `Idempotency-Key` is re-used on a request that does not match the first request's API endpoint and parameters." ([Errors](https://docs.stripe.com/api/errors))

The method to borrow: name which writes a caller may repeat, how they name that retry, and what happens if the second try does not match the first. The template does not copy the 24-hour window or the header name.

### One error shape

Stripe uses conventional HTTP status codes: codes in the `2xx` range mean success, codes in the `4xx` range mean the request failed given the information provided (an omitted required parameter, a failed charge, or a declined card), and codes in the `5xx` range mean an error on Stripe's servers. The error object's `type` is one of `api_error`, `card_error`, `idempotency_error`, or `invalid_request_error`. The same object can carry a `code`, a human-readable `message`, a `param` when the error is about one parameter, and a `doc_url` to more information about the code. ([Errors](https://docs.stripe.com/api/errors))

The method to borrow: every error has one shape a caller can branch on, including which field was wrong when there is one, and a sentence a person can read. The template does not copy Stripe's type names or status table.

### Related records in the same read

Many objects let the caller ask for more of the response with the `expand` parameter. It applies to that request only. The caller can expand the id of a related object, or ask for a field that is not in the response by default. The reference marks which fields expand. Nested fields use a dot, up to four levels. On a list, the expansion starts with `data`. Deep expansions on many list requests can be slower. ([Expanding responses](https://docs.stripe.com/api/expanding_objects))

The method to borrow: the spec says which related records come back in the same read, and which ones need a second read. The template does not copy the parameter name or the depth of four.

### A changelog row is a dated change for a caller

The changelog page opens with "Keep track of changes and upgrades to the Stripe API." It groups rows under a release name (the fetched page uses the heading Endive) and a dated version. The versioning page's current version, `2026-10-28.endive`, is one of those headings. Each row has a title, the affected products, whether the change is breaking, and a category. ([Changelog](https://docs.stripe.com/changelog), [How API versioning works](https://docs.stripe.com/api-versions))

The method to borrow: every caller-visible change gets an entry with a date, what the caller sees differently, whether a caller on the previous wording must change, and which product it belongs to. Old entries stay. A new change is a new entry.

### Sources

- [How API changes flow into Stripe's developer products](https://stripe.dev/blog/how-api-changes-flow-into-stripes-developer-products)
- [How API versioning works](https://docs.stripe.com/api-versions)
- [Versioning](https://docs.stripe.com/api/versioning)
- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
- [Errors](https://docs.stripe.com/api/errors)
- [Expanding responses](https://docs.stripe.com/api/expanding_objects)
- [Changelog](https://docs.stripe.com/changelog)

## Template

Work in your venture, from a checkout of this framework. Each step names the route it reads or writes. Commands are `node packages/naive/src/interfaces/cli/mentura.mjs`, as in `AGENTS.md`. Replace `<venture>` with your venture id.

The product function reads `foundation/icp` and does not keep its own copy of who the reader is. `offered_to` on a product card stores ICP profile ids (`packages/naive/src/records/product.schema.json`). Do not paste a profile's `who`, `jobs`, or `traits` into the card.

This template does not publish. Publishing waits on `governance/publication-policy` (a channel and a person approving). That route is not a step here.

A missing record comes back as `ok: true` with `result: null` and `not_found`. Treat that as "not on file", not as a filled record.

### 1. Read the reader

Route: read `foundation/icp`.

```bash
node packages/naive/src/interfaces/cli/mentura.mjs foundation/icp read --venture <venture> --json
```

The venture provides this record. This playbook does not write it. `foundation/icp` is the list of profiles and takes no write. Each profile is written at `foundation/icp/<id>`. An agent's write there is a draft for you to accept, because the route is a strategy-or-constitution record.

If `result` is null, stop. There is no profile id to point at, and later steps would be guessing.

If `result` lists profiles, keyed by id, pick the profile this product is offered to. Write down its `id` only. Call that `<profile-id>`.

### 2. Read the product list

Route: read `product`.

```bash
node packages/naive/src/interfaces/cli/mentura.mjs product read --venture <venture> --json
```

`result` null means there is no card yet. A result is an object whose keys are product ids. Pick the card this spec is about, or choose a new id of lowercase letters, digits, and hyphens. Call it `<product-id>`.

### 3. Write the card, or read it if it is already there

Route: write or read `product/<product-id>`.

If the list already has `<product-id>`, read it:

```bash
node packages/naive/src/interfaces/cli/mentura.mjs product/<product-id> read --venture <venture> --json
```

If it does not, write a card. Required fields are `id`, `name`, and `description` (`packages/naive/src/records/product.schema.json`). Set `offered_to` to an array of profile ids you read in step 1. `description` is one paragraph in your words: what a caller does with the product. Do not copy a Stripe sentence into it.

`status` is one of `idea`, `building`, `live`, `retired` if you want to set it. Leave it unset until you know. The schema does not require it.

```bash
node packages/naive/src/interfaces/cli/mentura.mjs product/<product-id> write --venture <venture> --input <card.json> --note "product card for the docs spec"
```

An agent's write of a product card is the record. It is not a draft. Read `product/<product-id>` back and confirm `offered_to` contains `<profile-id>`.

The schema accepts any string in `offered_to`. It does not check that the id is a profile. Check 1 does.

### 4. Propose the spec

Route: write `decisions/docs-spec`, then read it back.

Use `propose`, which stays `open` until you decide. Do not write this route with `status` set to `decided`. An agent's direct write is held as a draft, so the read returns null and Check 2 fails. A person's direct write with no `provenance.approved_by` is refused.

Do not set `at`. `propose` with `at` set to `product` files the decision at `product/decisions/<id>.decision.json`, and `decisions/<id>` does not return it.

`id` must match `^[a-z0-9][a-z0-9-]*$`. Use `docs-spec`. `boundary` `fail-open` matches the decision schema's note that a product decision fails open, so other work does not wait on this draft. You can choose `fail-closed` instead if you want work under it to wait. Set `needed_in` to the phase you are in (`discovery`, `validation`, `beachhead`, `scale`, or `platform`). `decides.record` is `product` and `decides.path` is `product/<product-id>.json`.

The `answer` is the spec, in your words. One field per line. Replace every angle-bracket prompt. A line still containing `<` or `>` fails Check 2.

```text
objects: <noun>, <noun>
retry-writes: <which writes a caller may repeat, how they name the retry, and what a mismatched second try does>
error-shape: <the kind of failure, the field when there is one, and the sentence a person reads>
versions: <which changes a caller can ignore, and which changes force a new wording>
changelog: <date, what the caller sees differently, whether the previous wording still works, product id>
```

`objects` is the nouns a caller sees. For each noun, you will add a glossary term in step 5. Say, in `retry-writes`, which writes may be repeated after a dropped connection. Say, in `error-shape`, the one shape every error uses. Say, in `versions`, what a caller on the current wording can ignore (something only added) and what forces a new wording (a rename, a removal, or a new shape). `changelog` names the four facts step 7 will record. This line is the rule. Step 6 turns it into a habit, and step 7 writes entries.

```bash
node packages/naive/src/interfaces/cli/mentura.mjs propose --venture <venture> --input <spec.json>
node packages/naive/src/interfaces/cli/mentura.mjs decisions/docs-spec read --venture <venture> --json
```

The read should show `status` `open` and `provenance.drafted_by.kind` `agent`. You decide it later, in your own words, with:

```bash
node packages/naive/src/interfaces/cli/mentura.mjs decide docs-spec --venture <venture> --by "<your name>" --confirm docs-spec
```

Add `--answer` only if you want to replace the drafted wording. Until you do this, the proposal is enough for the checks.

### 5. Write a term for each object

Route: write `glossary/product`, which reads the `objects` line from step 4.

`package` is `product`. Each token in `objects` is a `term`. `meaning` is your sentence for what the caller means by that noun. Leave `export` false unless another package must see the term. Do not use a Stripe object name as a term.

```bash
node packages/naive/src/interfaces/cli/mentura.mjs glossary/product write --venture <venture> --as person --input <glossary.json> --note "nouns from the docs spec"
```

The glossary route exists before a venture is in the beachhead phase. Need-now may still call it "coming soon". A glossary is a public commitment, so a person's write is the record, and an agent's write is a draft until you run `mentura accept glossary/product --venture <venture>`.

### 6. Propose the changelog habit

Route: write `decisions/changelog-habit`.

Same rules as step 4: `propose`, no `at`, `status` left open. The question is "What does a caller read when this product changes?" The answer is the habit, one field per line, in your words:

```text
date: <the day the caller can see the change>
difference: <what the caller sees differently>
previous-wording: <whether a caller on the previous wording must change>
product: <the product id this habit is for>
```

`product` here is the id the habit is about, `<product-id>`, or the words you will use on every entry to point at a product id. Check 4 only requires the four lines to be filled. Check 5 requires each entry's `product` line to equal a real product id.

```bash
node packages/naive/src/interfaces/cli/mentura.mjs propose --venture <venture> --input <habit.json>
node packages/naive/src/interfaces/cli/mentura.mjs decisions/changelog-habit read --venture <venture> --json
```

### 7. Write one entry when a caller-visible thing changes

Route: write `decisions/<entry-id>`, after steps 3, 4, and 6. Skip this step until something a caller can see actually changes.

`<entry-id>` is a new id, for example `changelog-first-change`. Do not edit an older entry. Read `product/<product-id>` and `decisions/docs-spec` first, and write the entry against that wording.

```text
date: <YYYY-MM-DD>
difference: <what the caller sees differently>
previous-wording: <must change, or the previous wording still works>
product: <product-id>
```

```bash
node packages/naive/src/interfaces/cli/mentura.mjs propose --venture <venture> --input <entry.json>
node packages/naive/src/interfaces/cli/mentura.mjs decisions/<entry-id> read --venture <venture> --json
```

Read `decisions` to see the habit and the entries in one list. That list returns every decision filed at `decisions/*.decision.json`, including decisions the venture already had. It also returns a decision filed under `product/decisions/` and the foundation statements still open. The list is the `decisions` array in the output, not `result`.

## Checks

A check passes or fails from the records on the routes above. A placeholder line (one that still contains `<` or `>`) fails. Run them after the step that writes the record they read.

`product/<product-id> check` is not one of these checks. That action runs `packages/naive/src/checks/check-ventures.mjs` on the whole venture, not on this card alone, and it does not read the spec or `offered_to`. A repository missing on a different software card fails it. Use the five checks below for this playbook.

### Check 1. The card names a reader the venture has

Read `product/<product-id>` and `foundation/icp`.

Pass: `offered_to` has at least one string, and every string is a profile id on that list.

Fail: the product is not on file, `offered_to` is missing or empty, or any id is not a profile.

### Check 2. The spec can be read, and an agent did not decide it

Read `decisions/docs-spec`.

Pass: the record is on file, and `status` is `open`, or `status` is `decided` and `provenance.approved_by` is a non-empty string. `answer` has a line for each of `objects`, `retry-writes`, `error-shape`, `versions`, and `changelog`. The text after the colon is not empty and contains no `<` or `>`.

Fail: the record is not on file, a line is missing or still a placeholder, `status` is `decided` and `approved_by` is missing, or `status` is `deferred` or `withdrawn`.

### Check 3. Every term is an object on the spec

Read `glossary/product` and use the `objects` line from Check 2.

Pass: `terms` has at least one item, and each `term` equals one comma-separated token on that line.

Fail: the glossary is not on file, `terms` is empty, or a term is not in `objects`.

### Check 4. The habit names the four changelog facts

Read `decisions/changelog-habit`.

Pass: the same status rule as Check 2, and `answer` has `date`, `difference`, `previous-wording`, and `product`, each filled with no `<` or `>`.

Fail: otherwise.

### Check 5. An entry names a product that exists

Run this when you have written an entry. Read `decisions/<entry-id>` and `product`.

Pass: the same status rule as Check 2, the same four filled lines as Check 4, and the `product` value equals an id in the product list.

Fail: a line is missing or a placeholder, the status rule fails, or `product` is not an id in the list.

If you have no entry yet, Check 5 does not run. Check 4 is the one that says the habit is on file.
