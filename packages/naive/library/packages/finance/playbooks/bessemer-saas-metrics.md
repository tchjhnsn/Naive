---
type: playbook
source: ai-drafted
created: 2026-10-29T22:30:00Z
ai-model: grok-4.7
tags: [naive, playbook, finance, bessemer, saas, metrics, draft]
---

# Playbook: Bessemer SaaS metrics

Draft. This playbook does not set a venture's targets. It files Bessemer Venture Partners' published benchmarks, then proposes a metrics record whose phase targets stay `no published Bessemer target` until a person replaces one with a number copied from those pages. Finance has no metrics record type of its own (`packages/naive/library/packages/finance/package.json` lists no schemas, and `packages/naive/library/packages/finance/skill/SKILL.md` says an agent may not settle a finance record). The record this template produces is the open decision `decisions/finance-saas-metrics`.

Bessemer Venture Partners, BVP, the BVP Nasdaq Emerging Cloud Index, Cloud 100, Centaur, and Bessemer Efficiency Score are their names. This playbook borrows the measurement method. It does not use their marks, deck templates, or calls to action. Naive is not affiliated with Bessemer Venture Partners.

## What Bessemer publishes

The pages below are the only sources for a number in this playbook. A figure that is not on one of them is not a target. Two pages use the word efficiency for different formulas. Do not mix them.

### Scaling to $100 Million (2021)

Mary D'Onofrio, Ethan Ding, and the Atlas editors, published 21 September 2021: [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million). The page says the figures come from Bessemer's cloud portfolio from 2010 through the first half of 2021, and that this is not a random sample of the private market.

The page's method:

- Annual recurring revenue (ARR), or committed ARR (CARR), is the north star. GAAP revenue lags ARR because it counts only the ratable piece of a contract. CARR adds committed contracts that are not live yet and nets out forecasted churn. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)
- Growth endurance: they expect next year's growth rate to be about 70 percent of this year's in the private cloud universe, and about 80 percent on the BVP Nasdaq Emerging Cloud Index. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)
- Gross dollar retention nets out customers who turned off or downgraded, and does not count expansion. Net retention also counts upsell and expansion. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)
- Gross margin is revenue after cost of goods sold, divided by revenue. They name hosting, implementation, and services, including customer success, as typical costs of goods. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)
- CAC payback is how long sales, marketing, and the customer-success cost tied to renewal and expansion take to be repaid. They measure it on gross-margin-adjusted ARR. They recommend investing when customer lifetime value over CAC is 3x or better. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)
- Their efficiency score on this page is free-cash-flow margin of ARR plus ARR year-over-year growth. They say it is generally only meaningful after $25 million of ARR. They encourage portfolio companies to target 70 percent between $25 million and $50 million of ARR, and 50 percent at $100 million and above. They mention the Rule of 40 as the often-cited 40 percent bar, and the page says the average BVP Nasdaq Emerging Cloud Index efficiency score is closer to 50 percent. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)
- Cash conversion score is ARR divided by (total capital invested minus cash). [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

Average ARR growth by scale, from the benchmark list on that page:

| ARR band on the page | Average growth |
| --- | --- |
| $1-10MM | 200% average growth |
| $10-25MM | 115% average growth |
| $25-50MM | 95% average growth |
| $50-100MM | 60% average growth |
| $100MM+ | 60% average growth |

The prose also says the average between $1 million and $10 million was nearly 200 percent, and that it decreases to 60 percent over $50 million. The middle 50 percent from $1 million to $10 million grew from 100 to 230 percent. The middle 50 percent from $50 million up grew from 35 to 80 percent. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

Gross retention is relatively consistent at 85-90 percent across those ARR ranges. The page gives HubSpot, in the three years before its IPO, as an SMB case at 70-80 percent gross retention, and says to watch lifetime value over CAC in that case. Net retention ranged from 105-145 percent between $1 million and $10 million of ARR, and from 105-125 percent by $100 million and above. The middle 50 percent, at every scale they show, still exceeded 100 percent. The average net retention was 140 percent between $1 million and $10 million, and 120 percent for $10 million through $100 million and above. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

Average gross margin by scale:

| ARR band on the page | Average gross margin |
| --- | --- |
| $1-10MM | 70% average gross margin |
| $10-25MM | 70% average gross margin |
| $25-50MM | 65% average gross margin |
| $50-100MM | 65% average gross margin |
| $100MM+ | 70% average gross margin |

They also say the average gross margin regardless of maturity is 65-70 percent, and the middle 50 percent stays within about 60-80 percent. Twilio is their example of a strong company whose gross margin was about 50 percent because telecom fees sat in cost of goods. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

Operating expenses on the same page: R&D falls to 35 percent of revenue by $100 million and above. G&A goes from 70 percent of revenue at $1 million to $10 million of ARR to 20 percent at $50 million and above. Sales and marketing stays above 50 percent of revenue even at maturity. The opening summary states averages at $100 million ARR of R&D 35 percent, sales and marketing 50 percent, and G&A 20 percent. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

CAC payback: the average in the $1-10 million ARR bucket is 15 months. By segment they say target under 12 months for SMB, under 18 months for mid-market, and under 24 months for enterprise. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

Cash conversion score averages almost 0.5x from $1 million to $10 million of ARR and almost 1x at $100 million and above. They look for a best-in-class score of 1x or better. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

Top-performing companies on that page (not the average, and not the median):

| ARR band | What the page says top performers have |
| --- | --- |
| $1-10MM | 230%+ ARR growth, 145%+ net retention, 85%+ gross margin, -65%+ FCF margin |
| $10-25MM | 135%+ ARR growth, 135%+ net retention, 80% gross margin, -35%+ FCF margin |
| $25-50MM | 110%+ ARR growth, 130%+ net retention, 75%+ gross margin, -35%+ FCF margin |
| $50-100MM | 80%+ ARR growth, 135%+ net retention, 80%+ gross margin, -25%+ FCF margin |
| $100MM+ | 80%+ ARR growth, 125%+ net retention, 80%+ gross margin, -20%+ FCF margin |

Median benchmarks at the bottom of the same page:

| ARR band | Median ARR growth | Median net retention | Median gross margin | Median FCF margin |
| --- | --- | --- | --- | --- |
| $1-10MM | 165% ARR growth | 125% net retention | 72% gross margin | -167% FCF margin |
| $10-25MM | 87% ARR growth | 117% net retention | 70% gross margin | -75% FCF margin |
| $25-50MM | 77% ARR growth | 120% net retention | 65% gross margin | -62% FCF margin |
| $50-100MM | 60% ARR growth | 120% net retention | 70% gross margin | -37%+ FCF margin |
| $100MM+ | 57% ARR growth | 115% net retention | 70% gross margin | -35%+ FCF margin |

The medians and the averages disagree. Both are on the 2021 page. A target names which one it copies.

At IPO, for companies that were on the BVP Nasdaq Emerging Cloud Index, the page says the average last-twelve-months revenue growth was 65 percent, net retention 120 percent, gross margin 70 percent, R&D 30 percent of revenue, sales and marketing 55 percent, G&A 20 percent, and free-cash-flow margin -20 percent. The average last-twelve-months GAAP revenue in the last fiscal year before going public was $170 million. They recommend targeting $100 million or more of GAAP revenue, and visibility to free cash flow positive within about 1 to 2 years. [Scaling to $100 Million](https://www.bvp.com/atlas/scaling-to-100-million)

Valuation multiples on that page (about 30x ARR at $1 million to $10 million, about 15x beyond $10 million, over the prior decade) are prices investors paid. They are not operating targets in this playbook.

### State of the Cloud 2023

Kent Bennett, Talia Goldberg, Mike Droesch, Janelle Teng Wade, Caty Rea, Ariel Sterman, and Christine Deakers, published 11 April 2023: [State of the Cloud 2023](https://www.bvp.com/atlas/state-of-the-cloud-2023).

They tell SaaS founders to guide the business toward these good, better, and best benchmarks. The page says the benchmarks may shift by stage and by SMB, mid-market, and enterprise, and that for a typical Series B or C enterprise software company they should be top of mind for the following 24 months.

| Metric on the page | Good | Better | Best |
| --- | --- | --- | --- |
| CAC payback (the page writes "CaC Payback") | 12-18 months CAC payback (good) | 6-12 months CAC payback (better) | 0-6 months CAC payback (best) |
| Operational efficiency | under 0.5x operational efficiency (good) | 0.5x to 1.5x operational efficiency (better) | 1.5x or higher operational efficiency (best) |
| Net revenue retention | 100% net revenue retention (good) | 110% net revenue retention (better) | 120% or higher net revenue retention (best) |
| Runway ("time to cash out") | 12 months of runway (good) | 18 months of runway (better) | 24 months or more of runway (best) |
| Revenue growth | 75% or higher revenue growth (good) | 100% or higher revenue growth (better) | 125% or higher revenue growth (best) |
| Logo retention | logo retention above 85% (good) | logo retention above 90% (better) | logo retention 95% or higher (best) |

The operational-efficiency row is the Bessemer Efficiency Score on this page: net new ARR divided by net burn. That is not the 2021 efficiency score (free-cash-flow margin plus growth). [State of the Cloud 2023](https://www.bvp.com/atlas/state-of-the-cloud-2023)

The same page says a survey of the Bessemer investment team described an ideal of 100 percent revenue growth and a 1.2x burn multiple. The page does not define burn multiple in that section. This playbook does not turn that sentence into a target.

### State of the Cloud 2024, and the Cloud 100 Benchmarks Report 2025

These pages describe cohorts. They are not a target for an arbitrary venture, and the checker below rejects them as phase targets.

[State of the Cloud 2024](https://www.bvp.com/atlas/state-of-the-cloud-2024), published 20 June 2024, says vertical AI companies with meaningful scale ($4 million ARR and above) were growing at about 400 percent year over year, with an average gross margin of about 65 percent and about a 1.1x BVP Efficiency Ratio, defined there as net new CARR divided by net burn.

[The Cloud 100 Benchmarks Report 2025](https://www.bvp.com/atlas/the-cloud-100-benchmarks-report), by Byron Deeter, Elliott Robinson, Sameer Dholakia, Grace Ma, Andrew Ren, Alex Yuditski, and the Atlas editors, published 3 September 2025, says the average 2025 Cloud 100 company took 7.5 years to reach $100 million ARR (their Centaur mark), AI companies on that list averaged 5.7 years, the 2025 cohort's average revenue growth was 75 percent, and the 2023 cohort's average had been 55 percent. The report's data cutoff note says valuation data available as of July 2025.

## Template

Work in this order. Each step names the route it reads or writes. Read a missing record as missing. Do not fill it in. Do not copy another function's record into this one. The metrics decision points at the routes. It does not repeat their fields except the actuals the checks compare.

The venture provides, before step 1, whatever it already has. This playbook does not create a product, a price, a money summary, or a telos.

1. Read `venture`. Take `phase` from the manifest. Naive phases are discovery, validation, beachhead, scale, and platform.
2. Read `product/[id]` for the product this record is about. Use `business_model` only when the card is there.
3. Read `validation/pricing`. Use `model` only when the record is there. Pricing stays owned by validation.
4. Read `purpose/money/summary`. When the read returns a record, the actuals for cash, monthly inflow, monthly outflow, monthly net, and `runway_months` are that record's figures, in the minor units the summary uses. When the read is not found, those actuals are `not in the venture`. Do not treat monthly inflow as ARR. The summary has no ARR field (`packages/naive/src/records/money-summary.schema.json`).
5. Read `validation/product-market-fit`. Retention cohorts stay on that record. Do not copy a Bessemer retention number in as if it were the venture's cohort.
6. Read `foundation/telos`. If it is missing, leave it missing. This playbook does not invent `statement`, `end_state`, or `owner_outcome`.
7. Write one `raw/sources/[id]` record for each page you will cite. `fetched` is the date you fetched that page, not the date Bessemer published it. The ids are `bessemer-scaling-100m` (origin `https://www.bvp.com/atlas/scaling-to-100-million`), `bessemer-state-of-the-cloud-2023` (origin `https://www.bvp.com/atlas/state-of-the-cloud-2023`), `bessemer-state-of-the-cloud-2024` (origin `https://www.bvp.com/atlas/state-of-the-cloud-2024`), and `bessemer-cloud-100-benchmarks-2025` (origin `https://www.bvp.com/atlas/the-cloud-100-benchmarks-report`).
8. Propose `decisions/finance-saas-metrics` with `mentura propose`. Status stays `open`. An agent does not decide it. The question is: "Which published Bessemer benchmarks, if any, are the targets for each phase?" `needed_in` is the venture's current phase. `boundary` is `fail-open`. `decides` names record `telos` and path `foundation/telos.json`. The note is the metrics record, as JSON:

```json
{
  "playbook": "bessemer-saas-metrics",
  "phase": "<phase from venture>",
  "product": "<product id, or null>",
  "arr_band": "not in the venture",
  "segment": null,
  "stage_note": null,
  "actuals": {
    "runway_months": "not in the venture",
    "cash": "not in the venture",
    "monthly_inflow": "not in the venture",
    "monthly_outflow": "not in the venture",
    "monthly_net": "not in the venture"
  },
  "targets": {
    "discovery": { "value": "no published Bessemer target" },
    "validation": { "value": "no published Bessemer target" },
    "beachhead": { "value": "no published Bessemer target" },
    "scale": { "value": "no published Bessemer target" },
    "platform": { "value": "no published Bessemer target" }
  }
}
```

`arr_band` may be `not in the venture`, `under $1MM`, `$1-10MM`, `$10-25MM`, `$25-50MM`, `$50-100MM`, or `$100MM+`. The agent leaves it `not in the venture`. A person sets it, in their own words, when they decide. It is the venture's fact, not a Bessemer number.

`segment` may be null, `smb`, `mid-market`, or `enterprise`. `stage_note` may be null, `Series B or C enterprise software`, or `public playbook`. The agent leaves both null.

9. Write `evidence/[id]` for the check run. `subject.kind` is `venture`. `passed` is true only when every criterion below passed. A failed run is still written, with `passed` false. That is how a check can fail.
10. A person decides with `mentura decide finance-saas-metrics --by "<name>" --confirm finance-saas-metrics --answer "$(cat metrics.json)"`. `metrics.json` is the metrics record from step 8 with `arr_band`, `segment`, `stage_note`, and any phase target the person changed. They may replace a phase target only by the rule in the checks. They type the decision id themselves. The `note` keeps what the agent proposed. Once the status is `decided`, `answer` is the metrics record, and every check reads it. While the status is `open`, the checks read `note`.
11. After that decision is `decided`, and only if step 6 found a telos, draft the accepted numeric targets for the current phase onto `foundation/telos` as exit criteria. Each criterion's `statement` is the target value, its `evidence` names the `raw/sources` id, and `serves` names a measure that already exists on the telos. An agent's write of `foundation/telos` is a draft (`strategy-or-constitution` in `packages/naive/src/records/data-model.json`). A person accepts it. If there is no telos, stop. Do not create one in this playbook.

Replace a target's `value` only when all of the following are true. Otherwise leave `no published Bessemer target`.

- The phase is beachhead, scale, or platform. Discovery and validation stay on the phrase. Bessemer did not publish a target for a venture that is still answering whether a problem exists or whether people will adopt.
- The value is copied from the tables above, including the words around the number, and `source` is the raw source id for that page.
- The condition matches the venture, not a band you wish it were in:
  - A 2021 median, average, or top-performer row requires `arr_band` equal to that row's band. `under $1MM` and `not in the venture` match no row.
  - `85-90% gross retention` requires an `arr_band` in the 2021 bands. The page's range starts at those bands.
  - `140% average net retention` requires `arr_band` `$1-10MM`. `120% average net retention` requires an `arr_band` of `$10-25MM`, `$25-50MM`, `$50-100MM`, or `$100MM+`.
  - `15 months average CAC payback` requires `arr_band` `$1-10MM`.
  - `CAC payback under 12 months` requires `segment` `smb`. `CAC payback under 18 months` requires `mid-market`. `CAC payback under 24 months` requires `enterprise`.
  - `70% efficiency score` is the 2021 formula (free-cash-flow margin plus growth) and requires `arr_band` `$25-50MM`. `50% efficiency score` requires `$100MM+`.
  - `about 0.5x cash conversion score` requires `arr_band` `$1-10MM`. `about 1x cash conversion score` requires `$100MM+`. `1x+ cash conversion score` is the best-in-class bar on that page and requires an `arr_band` in the 2021 bands.
  - A 2023 good, better, or best string requires `stage_note` `Series B or C enterprise software`. That is the scope the 2023 page names. It is not implied by a Naive phase.
  - An IPO figure (`65% LTM revenue growth at IPO`, `120% net retention at IPO`, `70% gross margin at IPO`, `30% R&D of revenue at IPO`, `55% S&M of revenue at IPO`, `20% G&A of revenue at IPO`, `-20% FCF margin at IPO`, `$100MM+ GAAP revenue before the public markets`, `free cash flow positive within 1 to 2 years`) requires phase `platform`, `arr_band` `$100MM+`, and `stage_note` `public playbook`.

A replaced target looks like this:

```json
"scale": {
  "value": "125% net retention",
  "metric": "net_retention",
  "condition": "$1-10MM ARR median",
  "source": "bessemer-scaling-100m"
}
```

`condition` is the label in the checker (`packages/naive/test/verification/playbook-bessemer-saas-metrics/replay.mjs`). The 2024 vertical-AI figures and the 2025 Cloud 100 growth and years-to-Centaur figures are not conditions. Do not paste them.

## Checks

Run them after step 8 and again after a person decides. An `answer` that does not parse as the metrics record fails `targets-sourced`. Write the result to `evidence/[id]`. Each one can pass or fail.

| Criterion | Passes when | Fails when |
| --- | --- | --- |
| `cloud-fit` | `product/[id]` was found, and `business_model` includes `subscription` or `freemium`, or `validation/pricing` `model` is `subscription`, `freemium`, or `usage` | No product card, or the card and the pricing record are not one of those recurring software models |
| `targets-sourced` | Every phase value is `no published Bessemer target`, or it is a string in the tables above whose `source` file exists under `raw/sources` and whose condition matches `arr_band`, `segment`, and `stage_note` | A number with no source, a number that is not in the tables, or a condition the venture's note does not meet |
| `no-early-number` | Discovery and validation values are `no published Bessemer target` | Either of those phases has any other value |
| `actuals-from-records` | Each actual equals `purpose/money/summary` when that read returned a record, and is `not in the venture` when it did not | An actual is filled in with no summary, or it disagrees with the summary |
| `decision-open` | Status is `open`, or status is `decided` and `provenance.approved_by` is present | Status is `decided` with no approver. Propose with any status other than open is refused (`packages/naive/src/engine/decisions.mjs`) |
| `telos-when-decided` | Before the decision is decided, this criterion passes without a telos write. After it is decided, either there is still no telos and no telos write was made, or the current phase's accepted numeric targets appear as exit criteria on a telos draft or record and each one names its source | A telos was created from nothing in this playbook, or a numeric target was written onto it before the decision was decided |

`node packages/naive/test/verification/playbook-bessemer-saas-metrics/replay.mjs` runs these checks both ways against the router, on fixture ventures.
