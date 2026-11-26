<!-- Placement: tchjhnsn/Naive docs/design/COMPETITOR_RESEARCH_OWNER_AND_OBJECTS_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

Status: research note, Nov 2, 2026. Not a decision.

# Who owns competitor research, and the objects it fetches and produces

Prepared Mon Nov 2, 2026, about 1:45 PM CT, for Torian. Read-only research. Nothing in the repo, any PR or any account was changed.

Scope, per your correction: the Macro research covered licensing (BSL to AGPLv3, the CLA, trademark), pricing tiers, the hosted offering, packaging, funding, the founder's stated reasons, and what a clone lacks (app store and OAuth approvals, SOC 2, the iOS app, paid services). It did not cover languages or architecture, so no Engineering pair and no architecture or dependency objects appear below.

Sources read. The repo is `tchjhnsn/everything-ecosystem`, branch `framework`, at commit `cb502f9`, read through the GitHub API. Line numbers are for that commit. The draft PRs #161, #162 and #163 (EE-105, EE-106, EE-107) were read as patches. The pair decisions come from saved memory, because they are not in the repo yet (see Gaps). No Macro notes file was found among the working notes, so the Macro facts come from the parent agent's summary of the earlier research.

## 1. Short answer

- **Owner: Strategy, working alone. Not a pair.** The Naive Strategy agent does this research for the `strategy` function.
  - `packages/naive/src/functions/departments.json` L11-12: Strategy's governance is "Strategic decisions and the link to the telos". Its operations are "Planning cadence, market research".
  - The standard it is built on, APQC PCF 7.4, 1.0 Develop Vision and Strategy, includes 1.1.1.1 "Identify competitors", 1.1.1.2 "Analyze and evaluate competition" and 1.1.1.10 "Evaluate intellectual property" ([APQC PCF Cross-Industry 7.4 PDF](https://www.business-analysis.com.au/wp-content/uploads/2025/04/K014750_APQC-Process-Classification-Framework-PCF-Cross-Industry-PDF-Version-7.4_January-2025.pdf)). The ontology cites this same standard for the strategy function (`packages/naive/src/terms/ontology.json` L1016-1027).
- **Why neither Strategy x Product pair fits:**
  - An X@Y lens reads Y's records. This research mostly reads public sources outside Naive.
  - strategy@product checks product records against bets. This research compares an outside company to Naive.
  - product@strategy turns bets into product records. That step only comes later, if you adopt a bet.
  - The findings land in three functions, not one:
    - packaging and business model go to Product;
    - pricing tiers go to Growth, because Growth owns the pricing decision;
    - license, CLA and trademark go to legal, a dormant function the Lead holds.
  - A single pair would cover only one of these. The Lead routes the rest, which matches Rule D's star shape.
- **No new scoped sense is needed.** Competitor, license, price tier and trademark mean the same thing to every function. Your rule is to scope a sense only when the meaning differs.
- **Rule C says temporary for any pair.** It has not been measured. Two competitor scans are known, on Oct 28 and Nov 2. Neither produced provenance lines that could measure recurrence f.

## 2. Rule C, quoted exactly

Rule C is not in the repo. A search of `packages/naive/src/terms/ontology.json`, `packages/naive/src/terms/operating-rules.json` and `docs/decisions/decisions.json` on `framework` found no match, and neither did the EE-105 to EE-107 patches. The only written text is in `docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md`, lines 235-253:

> ### Rule C: durable or ephemeral (transaction-cost amortization)
>
> Let:
> - f = recurrence rate of J for this relationship (occurrences per week);
> - H = planning horizon (weeks);
> - sigma(s) = saving per occurrence from a warm child over assembling the context from scratch. It rises with specificity s, the share of the child's context that is only useful for this relationship;
> - K = setup cost;
> - m = maintenance cost per week;
> - d = expected cost of drift or staleness over H.
>
> Make the child durable if and only if:
>
>     f * H * sigma(s)  >=  K + m * H + d
>
> Otherwise spawn it ephemerally per occurrence, as long as one occurrence is worth doing at all.
>
> This is Williamson's matching in symbols [11]: recurrent and idiosyncratic work justifies unified governance; occasional or generic work does not. The rule flips at most once as f rises, so it is a threshold rule.
>
> Retire a durable child when f, measured as a conservative lower bound (Section 4), falls below the break-even rate (K/H + m + d/H) / sigma.

`docs/design/DIRECTIONAL_PAIR_AGENTS_2026-11-02.md` line 127 applies it to pairs: "The K-to-D flow meets Rule C, f · H · sigma(s) >= K + m · H + d, measured from provenance as a conservative lower bound".

## 3. What the repo and the decisions say about who does what

| Fact | Where |
| --- | --- |
| Strategy: "Strategic decisions and the link to the telos"; operations "Planning cadence, market research" | `packages/naive/src/functions/departments.json` L11-12 |
| Products: operations "Specs, roadmaps and the work of building" | `packages/naive/src/functions/departments.json` L24 |
| Marketing and sales: operations "The marketing website (EE-044), campaigns, marketing assets, the sales pipeline" | `packages/naive/src/functions/departments.json` L36 |
| Legal, risk and compliance: "Policies, the risk register, contract approval"; operations "Filings, contract work, privacy requests" | `packages/naive/src/functions/departments.json` L131-132 |
| Strategy function noun: "sets the venture's direction: vision, and the choices that follow from it", capabilities: founder appointment | `packages/naive/src/terms/ontology.json` L1016-1027 |
| Products function noun: "develops what the venture offers, and the decisions that change the offering", capability: product decision | `packages/naive/src/terms/ontology.json` L1028-1039 |
| marketing-and-sales "finds the buyer and sells the offering, including the price"; owns pricing decision | `packages/naive/src/terms/ontology.json` L1040-1052 |
| pricing decision: marketing and sales owns it, every package lists finance in touches | `packages/naive/src/terms/ontology.json` L1083-1094 |
| The earlier competitor scan sat under purpose/validation and says "The framework has no record type for competitors yet, so they live here and as evidence items" | `instance/ventures/everything-ecosystem/_private/research/competitive-landscape-2026-10-28.md` (as of 2026-11-02; since moved/removed) L11 |
| A research cell has a required `function` that is "A department id from packages/naive/src/functions/departments.json" | `platform/research/schemas/research-cell.schema.json` (as of 2026-11-02; since moved/removed). Proposed on Nov 2; not in `packages/naive/src/records/data-model.json` as of 08a5466 |
| Scoped noun form `name@function`, where the suffix is a function id | `packages/naive/src/terms/ontology.md` L18 |
| X@Y is a durable lens owned by X that reads Y's records and writes only X's record kinds through the Lead | memory, Nov 2, 2026; `docs/design/DIRECTIONAL_PAIR_AGENTS_2026-11-02.md` L77-92 |
| strategy@product: "Strategy checks product records against bets to catch drift". product@strategy: "Product turns new bets into testable product records". Both temporary, logged, strategy@product expected to qualify first | memory, Nov 2, 2026 |
| Durable lenses today: finance@engineering, finance@growth, finance@product. No pairs with the Lead | memory, Nov 2, 2026 |
| A scoped sense is added only when the meaning differs | memory, Nov 2, 2026 |
| Dormant functions run as Jev-plus-code sentinels, and the Lead spawns a temporary function agent when one fires | memory, Nov 2, 2026 |

The agent-to-function mapping is a proposal, not something the repo records. It reads: Strategy = strategy, Product = products, Growth = marketing-and-sales, Finance = finance. The directional-pair table at `docs/design/DIRECTIONAL_PAIR_AGENTS_2026-11-02.md` L64-73 says the Lead performs none and is not a function. `docs/design/FUNCTIONS_TO_AGENTS_2026-11-02.md` counts 8 functions held by the Lead with no dedicated agent.

## 4. Solo or pair: the options

| Option | Fit to the Macro research | Verdict |
| --- | --- | --- |
| Strategy alone (function `strategy`) | Matches Strategy's "market research" (`packages/naive/src/functions/departments.json` L12) and APQC 1.1.1.1, 1.1.1.2 and 1.1.1.10. The inputs are public sources, not another function's records. The research-cell schema already takes one function id | **Recommended** |
| strategy@product (existing, temporary) | Covers part of it: the step that compares Macro's packaging and business model to Naive's `product.business_model` (`packages/naive/src/records/data-model.json` L188). Its definition checks against bets, not competitors, and it does not cover pricing or license | Not as owner. Use it only if you later want competitor drift checks against product records. That would mean amending its definition with amend/revise |
| product@strategy (existing, temporary) | Starts only after you adopt a bet, for example "AGPL plus a CLA plus a trademark for Naive". Product then writes the product record changes | Downstream consumer, not the owner |
| A new scoped sense such as `competitor@strategy` | Your rule allows a scoped sense only when the meaning differs. No other function uses "competitor" in a different sense | Not needed |
| A different pair, strategy@growth | Would fit the price-tier comparison only, since Growth owns the pricing decision (`packages/naive/src/terms/ontology.json` L1083) | Not needed now. It is a temporary candidate if price comparisons start to recur |

**Rule C check.** Two competitor scans are known: Oct 28 (the file above) and Nov 2 (Macro). That is about 2 in 5 days. This count was not measured from provenance:
- research cells gitignored at `.naive/research/*.jsonl` were proposed on Nov 2. Those record types are not in `packages/naive/src/records/data-model.json` as of 08a5466;
- the Oct 28 file is free Markdown;
- sigma, K, m and d are unknown.

So any pair stays temporary. Strategy alone needs no Rule C test, because it is a function, not a child.

**Recommended flow (one owner, routed by the Lead):**
1. Strategy opens a research cell (`function: strategy`). It fetches sources and writes claims and citations.
2. Strategy writes or updates the competitor record and its implications for Naive.
3. The Lead routes each implication to the function that owns its target:
   - business model or packaging goes to Product as a handoff;
   - pricing tiers go to Growth, with Finance touching, per `packages/naive/src/terms/ontology.json` L1083;
   - license, CLA or trademark goes to legal (risk-and-compliance) through its sentinel.
4. Anything one_way_door goes to you. Relicensing Naive is one, because once a version ships under AGPL that version stays AGPL.
5. If you adopt a bet, product@strategy turns it into product records.

## 5. Objects it fetches (inputs)

"Existing" means an exact `noun` value in `packages/naive/src/terms/ontology.json`. Ontology nouns still have no separate `id` field as of 08a5466. EE-107 is not a logged decision.

| # | Input | Example from Macro | Noun in ontology.json | Record type | Status |
| --- | --- | --- | --- | --- | --- |
| F1 | Public web page read as a source (home, product, docs, FAQ) | docs.macro.com/faq | none. `reference` (L377) is "A source behind a default", a different meaning | `research-source` was proposed on Nov 2 and is not in the data model. Line 2060 of `packages/naive/src/records/data-model.json` is the `upgrade-registry` schema path | **New noun** `research source` |
| F2 | Pricing page (plan names, per-seat prices) | macro.com/pricing: Free, Pro $40, Max $200 per seat a month | none for a price tier. `business model` (L317) covers the earning pattern | `research-source`, then claims | **New noun** `price tier` (produce side) |
| F3 | License file and license history | LICENSE.txt (AGPLv3); BSL to AGPLv3 on May 31, 2026; apps/web/LICENSE "All rights reserved" | none | `research-source` | **New noun** `software license` |
| F4 | Contributor license agreement | services/cla-worker/CLA.md | none | `research-source` | **New noun** `contributor license agreement` |
| F5 | Trademark status or policy | the "Macro" name | none | `research-source` | **New noun** `trademark` |
| F6 | Public repository (as a fact source: license, what is published, not code structure) | github.com/macro-inc/macro | `repository (repo)` (L701) | `research-source` | Existing |
| F7 | Funding news | about $30M, a16z lead | `funding` (L154) covers the round type | `research-source` | Existing (values only) |
| F8 | Founder or company statement of reasons | "why-macro-is-open-source", Aug 7, 2026 | none | `research-source` with kind `primary` (`platform/research/schemas/source.schema.json` (as of 2026-11-02; since moved/removed)) | Covered by F1 |
| F9 | Certifications and approvals a clone lacks | SOC 2, app store and OAuth approvals, iOS app, LiveKit, FusionAuth | none | `research-source`, then claims | **New noun** `barrier to imitation` (produce side) |
| F10 | Naive's own product records | `product.business_model` | `product` (L263), `business model` (L317), `offering` (L308) | `product` (`packages/naive/src/records/data-model.json` L188) | Existing |
| F11 | Naive's business-model vocabulary | open-source, license, subscription, freemium, open-core | `business model` (L317) | `business-models` (`packages/naive/src/records/data-model.json` L918; values at `packages/naive/src/records/vocab/business-models.json` L94, L134, L169, L244, L286) | Existing |
| F12 | Naive's pricing evidence | price model and points | `pricing decision` (L1083) for decisions | `validation-pricing` (`packages/naive/src/records/data-model.json` L491) | Existing |
| F13 | Prior competitor scan | competitive-landscape-2026-10-28.md | none | none (free Markdown under `_private/research/` (as of 2026-11-02; since moved/removed)) | Gap: should become competitor records |
| F14 | Strategic direction to judge against | telos, strategic foundation, core product, EE-024 and EE-041 (the "open lane") | `telos` (L847), `strategic foundation` (L998), `core product` (L176), `decision` (L368) | `telos`, `strategic-foundation` (L1609), `decision` | Existing |
| F15 | Bets to check implications against | none written yet | none | none | **Gap**: `bet` is used in the pair definitions but is not a noun |

## 6. Objects it produces (outputs)

Verb and kind follow `packages/naive/src/terms/operating-rules.json` L46-60. EE-107 decision 1 was proposed on Nov 2 and is not a logged decision as of 08a5466. Tiers follow L83-92 (the max of four 1-to-3 scores). The tiers below are my proposed defaults.

| # | Output | Noun | Record type | Verb / kind | Default tier | Status |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Research question for one company and aspect | **new** `research cell` | `research-cell` | create / originate | low | New noun. Proposed on Nov 2; not in `packages/naive/src/records/data-model.json` as of 08a5466 |
| P2 | Source read, with credibility | **new** `research source` | `research-source` | create / originate | low | New noun. Proposed on Nov 2; not in `packages/naive/src/records/data-model.json` as of 08a5466 |
| P3 | Sourced finding ("Macro relicensed to AGPLv3 on May 31, 2026") | **new** `claim` | `research-claim` | create / derive (source: P2) | low | New noun. Proposed on Nov 2; not in the data model as of 08a5466. `claim.schema.json` (as of 2026-11-02; since moved/removed) is not in the repo |
| P4 | Link from claim to source with locator and short quote | **new** `citation` | `research-citation` | create / derive (source: P3, P2) | low | New noun. Proposed on Nov 2; not in the data model as of 08a5466 |
| P5 | Competitor record: name, offering, business model ids, license, funding, price tiers, barriers, `fresh_until` | **new** `competitor` | proposed: `account` with relationship `competitor` (`packages/naive/src/records/data-model.json` L217) | create / originate; later amend / append for dated changes, amend / revise for corrections, amend / deprecate when no longer a rival, delete / merge for duplicates | low | New noun. Needs `relationship` (L209) and the account schema's list amended (amend / append) |
| P6 | Price tier of a competitor's offering | **new** `price tier` | field on P5 | create / derive (source: P3) | low | New noun, shared (function null), because Growth's pricing decision uses the same word with the same meaning |
| P7 | Software license, CLA, trademark facts | **new** `software license`, `contributor license agreement`, `trademark` | fields on P5 | create / derive (source: P3) | low | New nouns, shared (function null). Legal decides Naive's own |
| P8 | What a clone cannot copy (approvals, certifications, apps, paid services, brand) | **new** `barrier to imitation` | field on P5 | create / derive (source: P3) | low | New noun, function strategy |
| P9 | Implication for Naive ("AGPL plus a CLA plus a trademark would copy Macro's setup") | **new** `competitive implication` | `judgment` (L1719), linked to the target record (P10) | create / derive (source: P3 and the Naive record it is about) | the tier of the change it points at | New noun; `judgment` itself also has no noun |
| P10 | Readable competitor profile | **new** `artifact` (no noun today) | `artifact` (L1696) | create / derive (source: P5, P3) | low; costly if published | New noun; record type exists. Publishing it is a `publication` (L820) |
| P11 | Request to the owning function (Product, Growth, legal) | `handoff` (L395) | `handoff` (L982) | create / originate | the target's tier; relicensing is one_way_door | Existing |
| P12 | Question to you | none. A question type is "verb, noun, asking_function" (`packages/naive/src/terms/operating-rules.json` L71-74) | none | n/a | per tier | **Gap**: `question` has no noun or record type |
| P13 | Every write above | `provenance` (L935), `provenance log` (L944) | `provenance` (L1473) | automatic | n/a | Existing |

Existing nouns used: `repository (repo)`, `funding`, `product`, `business model`, `offering`, `pricing decision`, `telos`, `strategic foundation`, `core product`, `decision`, `handoff`, `publication`, `provenance`, `provenance log`, `account`, `relationship`.

### Proposed new nouns

As of 2026-11-02 the ontology had no `id` or `broader` fields. As of 08a5466 `broader` is on all 149 nouns and there is still no `id`. These rows were proposed on Nov 2 for an EE-107 decision 7 that is not logged as of 08a5466.

| Proposed id | Label | Broader | Function | Definition | Standard |
| --- | --- | --- | --- | --- | --- |
| `competitor` | competitor | `account` | strategy | A named party whose offering serves the same job for the same market as one of the venture's products, kept as an account with relationship competitor | APQC 1.1.1.1 Identify competitors; Porter, rivalry among existing competitors |
| `price-tier` | price tier | `offering` | null | One named plan of an offering, with its price, unit (seat, month) and what it includes | common pricing usage |
| `software-license` | software license | none | null | The terms under which software may be used, changed and redistributed, named by its SPDX identifier where one exists | SPDX License List |
| `contributor-license-agreement` | contributor license agreement | none | null | The terms under which outside contributors grant a project rights to their contributions, including whether the project may relicense them | common open-source usage (CLA) |
| `trademark` | trademark | none | null | A sign that identifies the source of goods or services, whose rights are separate from copyright and the software license | USPTO usage |
| `barrier-to-imitation` | barrier to imitation | none | strategy | Something a copier of an offering cannot reproduce by copying its published work, such as approvals, certifications, apps, paid services, brand or data | Rumelt's isolating mechanisms; Barney, resources that are costly to imitate |
| `competitive-implication` | competitive implication | `judgment` | strategy | A judgment of what a sourced competitor claim means for one named venture record or bet, citing both | ours |
| `research-cell` | research cell | none | null | One research question, state(subject, time, aspect), for a venture, a function and a frame | ours (`platform/research/schemas/research-cell.schema.json` (as of 2026-11-02; since moved/removed)) |
| `research-source` | research source | none (related: `reference`) | null | A source the research engine read, with access level and credibility factors, stored as a hash and a locator | citation practice |
| `claim` | claim | none | null | One statement a research cell asserts, whose confidence and verdict are computed in code from its citations | nanopublication assertion |
| `citation` | citation | none | null | A link from a claim to a source, with a locator and an optional short quote, saying whether the source supports or contradicts it | citation practice |
| `judgment` | judgment | none | null | The typed output of one model step: what it read, its answer and confidence, and what code did with it | ours (`packages/naive/src/records/data-model.json` L1719) |
| `artifact` | artifact | none | null | A view built from records for a reader, naming the records it read; artifacts are published, records never are | ours (`packages/naive/src/records/data-model.json` L1696) |

All are created with create / originate in a reviewed framework PR. A Nov 2 proposal called EE-107 decision 7 said a vocabulary change is the highest-risk change. That decision is not logged as of 08a5466.

## 7. Conflicts and gaps

1. **Rule C and the pair definitions are not in the repo.**
   - Rule C exists only in `docs/design/AGENT_SPAWN_COALITION_RESEARCH_2026-11-02.md`.
   - The strategy@product and product@strategy definitions exist only in memory.
   - So the docs and readmes cannot cite them until a decision record lands.
2. **The two "@" notations collide.**
   - `packages/naive/src/terms/ontology.md` L18 says the suffix of `name@function` is a function id.
   - Pair names use agent names: `strategy@product`, `finance@growth`, `finance@engineering`.
   - `product`, `growth` and `engineering` are not function ids. The ids are `products` and `marketing-and-sales`, and there is no engineering function.
   - The noun check could read `strategy@product` as a scoped noun with an unknown function.
   - Two fixes would work: name pairs with function ids (`strategy@products`), or give pairs a different separator.
3. **Some record types have no noun.**
   - `research-cell`, `research-source`, `research-claim` and `research-citation` were proposed on Nov 2 and are not in `packages/naive/src/records/data-model.json` as of 08a5466. `judgment` and `artifact` are named in that file. None of the four research ids is a noun in `packages/naive/src/terms/ontology.json`.
   - A vocabulary-parent check was proposed on Nov 2 as EE-107 decision 7, from preserved PR #163. It is not a logged decision as of 08a5466.
4. **There is no competitor record type.**
   - The Oct 28 scan says so itself (`competitive-landscape-2026-10-28.md` (as of 2026-11-02; since moved/removed) L11).
   - It filed competitor research under purpose/validation, as input to the problem and solution records.
5. **"bet" is not a noun.** Both Strategy x Product pair definitions depend on it.
6. **No strategy frame exists.**
   - A `research-cell` that requires a `frame` id was proposed on Nov 2. It is not in the data model as of 08a5466.
   - The frames that exist are finance and marketing ones, for example `packages/naive/library/packages/finance/frames/fund-without-ceding-control.frame.json` and the six `brand-*.frame.json` files under `packages/naive/library/packages/marketing/frames/`. `packages/*/frames` and `packages/marketing/frames/brand-*.frame.json` (as of 2026-11-02; since moved/removed) do not match a path.
   - A "competitor assessment" frame for Strategy would be needed.
7. **Confidentiality.**
   - Research cells, sources, claims and citations marked confidential and gitignored were proposed on Nov 2. Those ids are not in `packages/naive/src/records/data-model.json` as of 08a5466, and that file does not use the word confidential.
   - Competitor records committed to a venture folder would not be.
   - Decide where competitor records live: `_private/` (as of 2026-11-02; since moved/removed) like the Oct 28 file, or the research store.
8. **Pricing ownership splits the work.**
   - Price-tier findings feed Growth's pricing decision, with Finance touching (`packages/naive/src/terms/ontology.json` L1083).
   - Packaging and business-model findings feed Product.
   - This split is why a single Strategy x Product pair underfits.
9. **Legal is dormant.** License, CLA and trademark implications have no active owner. The Lead holds risk-and-compliance until its sentinel fires.
10. **Freshness.** Prices and licenses change: Macro switched licenses on May 31, 2026. `research-cell` has `fresh_until`, but competitor fields need a dated, append-only history so later changes are amend / append, not overwrites.
11. **The Macro notes file is missing.** No file for the Macro research was found among the working notes. Its facts here come from the parent summary. The listed sources should be re-fetched before any of it becomes claims.
