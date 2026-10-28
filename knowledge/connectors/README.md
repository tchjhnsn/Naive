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
| Connectors | `filesystem.mjs`, `github.mjs` | A folder or git repository (writes in place); a GitHub repository (writes by draft pull request). |
| Catalog | `catalog.mjs` | One index over every source: address, version, route, title and words. No content. Routes `knowledge/catalog` and `knowledge/search`. |
| Evals | `eval.mjs`, `fake-github.mjs` | The contract suite for every connector, the router over a mapped source, and the catalog. |

## A source map

```json
{
  "sources": [
    { "id": "team-repo", "connector": "github", "repo": "acme/tandem", "ref": "main", "root": "ventures/tandem" }
  ],
  "records": { "product": "team-repo" }
}
```

With this map, `purpose/product/kettle` reads `ventures/tandem/products/kettle.json` from `acme/tandem` and says which version and commit it came from. A write opens a draft pull request, which a person accepts by merging. Every other record stays in the venture folder. The venture folder always keeps `venture.json`, the provenance log and drafts.

## Adding a connector

1. Write `knowledge/connectors/<id>.mjs`, exporting `connect(options)` that returns an object meeting the contract.
2. Add a `connector` to its entry in `knowledge/tooling/integrations.json`: the module, its write modes and its options.
3. Run it through `contract()` in `eval.mjs`, against a fake of its API offline and against the real one when credentials are given.

## Running the evals

```sh
node knowledge/connectors/eval.mjs
MENTURA_EVAL_GITHUB_REPO=owner/name GITHUB_TOKEN=... node knowledge/connectors/eval.mjs   # also live
MENTURA_EVAL_GITHUB_WRITE=1 ...                                                          # and open one real draft PR
```
