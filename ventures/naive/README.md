# ventures/naive: venture:naive built in Naive

This folder holds venture:naive, built as real Naive records from Naive `134d2d3` (tchjhnsn/Naive main) through the CLI as an agent. There is no `phase --override` and no `--as person`. Every decision is still open for Torian.

| Path | What it is |
|---|---|
| `workspace/naive/k-base/` | The venture's records, written by Naive (30 raw sources, validation, decisions, accounts, competitors, markets, team plan, offer, sitemap) |
| `workspace/naive/k-base/_drafts/` | 12 strategy and public-commitment records Naive held as drafts for Torian (problem, 4 ICPs, 4 goals, constraints, discovery exit criteria, design system) |
| `interim/` | 13 records Naive refused (core, telos, 3 products, 6 risks), plus `capabilities.json` and `cost-model.json`. See GAPS.md |
| `STRATEGY.md` | Readable form of the records |
| `GAPS.md` | 26 gaps: command, result, interim choice |
| `WEBSITE-CONTENT-SPEC.md` | Per-page content spec and the record that backs each page |
| `site-content/` | Generated page Markdown (8 pages plus Naive's own sitemap plan) |
| `tools/` | `nv.sh` (env + log wrapper), `build_inputs.py`, `fetch_sources.py`, `write_records.py`, `gen_site.py`, `count_records.py` |
| `runs/naive-self-20261126-1/`, `runs/naive-self-20261126-2/` (Datafeel correction), `runs/naive-self-20261126-3/` (Datafeel role) | `run.json`, `prompt.md` (sha256 in run.json), `commands.jsonl`, `writes.jsonl`, `record-counts.json`, `evidence/` |

Regenerate the site content:
```
cd /workspace/naive-self && python3 tools/gen_site.py && python3 tools/count_records.py runs/naive-self-20261126-1/record-counts.json
```

```mermaid
flowchart LR
  subgraph Records
    S[strategy: foundation, decisions, plan, markets, competitors]
    P[products: product cards, capabilities, solution]
    M[marketing-and-sales: pricing, GTM, accounts, design-system, sitemap]
    H[human-capital: team-plan]
    R[risk-and-compliance: risks, data-terms]
    F[finance: cost-model]
  end
  S --> home & about & vision
  P --> capabilities & how
  M --> pricing & start
  F --> pricing
  H --> careers
  Records --> G[tools/gen_site.py] --> C[site-content/*.md]
```

## In this repo

- The run was made on the box at `/workspace/naive-self/`. Absolute paths in run logs refer to that location.
- **Fetched page text is not committed.** Every `raw/sources/*/text.md` and `runs/*/sources/` is left out, and `runs/*/inputs/source-*.json` keep `text: null`. These pages are third-party, so only the URL, fetch time, HTTP status and sha256 are kept. As a result, `naive check --venture naive` in this copy fails `data-packages` with "missing text.md" (GAPS.md G-26). Re-fetch with `tools/fetch_sources.py` to restore the text locally.
- `.naive/` blobs and editor folders are left out.
- `tools/nv.sh` runs the CLI from this repo's checkout. Set `NAIVE_CLI` to override.
- The site pages stay here, not in `site/content/marketing/`. Every page is `status: not-publishable` until Torian accepts the drafts and decisions. Adding them to `site/content/marketing/meta.json` would publish them. To wire them in later: copy each accepted page to `site/content/marketing/<page>.mdx`, add it to `meta.json`, and run the site's publish gate (`site/gate`).
