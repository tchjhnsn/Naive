---
type: reference
source: hybrid
created: 2026-10-28T01:10:00Z
ai-model: claude-opus-5.5
tags: [everything-ecosystem, knowledge, connectors, storage]
description: "How the knowledge layer reaches the sources a venture keeps records in: the connector contract, the source map, the catalog and the evals (EE-037)."
---

# Knowledge connectors

The knowledge layer is where every record is stored and found. It does not copy records into one place. Each venture keeps its records wherever it already works, and Mentura reaches each source through a connector (EE-037).

## The parts

| Part | File | What it does |
|---|---|---|
| Contract | `contract.mjs` | The five things every connector does: `list`, `read`, `version`, `search`, `write`. A version is the git blob SHA-1 of the content in every source. |
| Registry | `../tooling/integrations.json` | An integration with a `connector` names the module that implements the contract for it. |
| Source map | `<venture>/knowledge/sources.json` | Optional. The venture's sources, and which record type lives in which. Unnamed record types stay in the venture folder. Schema: `schema/knowledge-sources.schema.json`; checked by `schema/check-sources.mjs`. |
| Connectors | `filesystem.mjs` | A folder or git repository (writes in place). The framework ships only this one: it works offline and names no vendor. Connectors that reach a vendor, such as GitHub, are platform and live in `platform/connectors/` (EE-041). |
| Matrix | `resolve.mjs` | The source-of-truth matrix (EE-042): `rules` in the source map name a system of record and owner per record type, attribute and context (phase, product, account, actor). The most specific rule wins; a tie is an error. `records` is shorthand for rules that match anything. An attribute rule (a price in another source) is read from and written to that source, so the record's own file holds no second copy. |
| Where-used | `<venture>/knowledge/where-used.json` | For each fact kept once (a price, a product name), every place that repeats it, live or frozen. `schema/check-where-used.mjs` reports drift offline; delivering the change into vendors is the platform's. |
| Catalog | `catalog.mjs` | One index over every source: address, version, route, title and words. No content. Routes `knowledge/catalog` and `knowledge/search`. |
| Evals | `suite.mjs`, `eval.mjs` | `suite.mjs` is the contract suite every connector passes, framework or platform. `eval.mjs` runs it on the filesystem connector, then the router over a mapped folder and the catalog. The GitHub connector's evals are `platform/connectors/eval.mjs`. |

## A source map

```json
{
  "sources": [
    { "id": "team-repo", "connector": "github", "repo": "acme/tandem", "ref": "main", "root": "ventures/tandem" }
  ],
  "records": { "product": "team-repo" }
}
```

The `github` connector is a platform connector (`platform/connectors/github.mjs`). With this map, `purpose/product/kettle` reads `ventures/tandem/products/kettle.json` from `acme/tandem` and says which version and commit it came from. A write opens a draft pull request, which a person accepts by merging. Every other record stays in the venture folder. The venture folder always keeps `venture.json`, the provenance log and drafts.

## Adding a connector

1. Decide which side it is on. If it works offline, needs no credentials and names no vendor, it is framework and goes in `knowledge/connectors/<id>.mjs`. Otherwise it is platform and goes in `platform/connectors/<id>.mjs` (EE-041). `node schema/check-boundary.mjs` enforces this.
2. Export `connect(options)`, returning an object that meets the contract.
3. Add a `connector` to its entry in `knowledge/tooling/integrations.json`: the module, its write modes and its options.
4. Run it through `contract()` from `suite.mjs`: against a fake of its API offline, and against the real one when credentials are given.

## Running the evals

```sh
node knowledge/connectors/eval.mjs                                                       # framework
node platform/connectors/eval.mjs                                                        # platform (GitHub, against a fake)
MENTURA_EVAL_GITHUB_REPO=owner/name GITHUB_TOKEN=... node platform/connectors/eval.mjs   # also live
MENTURA_EVAL_GITHUB_WRITE=1 ...                                                          # and open one real draft PR
```
