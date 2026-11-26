---
type: template
tags: [everything-ecosystem, knowledge, glossary, template]
ai-model: claude-opus-5.5
created: 2026-10-29T06:04:07Z
source: hybrid
---

# Template: package glossary

Fills `<venture>/glossary/<package>.json` (`packages/naive/src/records/glossary.schema.json`). A package's terms stay local to it: an agent working in another package sees only the terms marked `export`. See what a package sees with `mentura glossary/terms run --value <package>`.

```json
{
  "package": "finance",
  "terms": [
    { "term": "burn multiple", "meaning": "net burn divided by net new ARR" },
    { "term": "runway", "meaning": "months of cash at the current burn", "export": true }
  ]
}
```

Two packages may not export one term with different meanings. A package's own term wins over another's exported one.
