---
type: example
source: hybrid
created: 2026-11-01T02:55:00Z
ai-model: claude-opus-5.5
tags: [product-anatomy, examples, ai-labs, anthropic, openai, spacex, thinking-machines]
description: "Four AI labs run through the Product Anatomy Matrix as worked examples: Anthropic, OpenAI, SpaceX with xAI, Thinking Machines. Draft scores by a reasoning model, from public filings and press."
---

# AI labs on the Product Anatomy Matrix

Worked examples, requested by Torian on 2026-11-01 to study the frontier labs. Google is left out on purpose.

| Lab | Input | Answers | Output | Main source |
| --- | --- | --- | --- | --- |
| Anthropic | `anthropic.json` | `anthropic.answers.reasoned.json` | `anthropic.matrix.md` | Anthropic S-1, 2026-10-26 (reference `anthropic-s-1-2026`) |
| OpenAI | `openai.json` | `openai.answers.reasoned.json` | `openai.matrix.md` | Press reports; no filing |
| SpaceX with xAI | `spacex.json` | `spacex.answers.reasoned.json` | `spacex.matrix.md` | Press coverage of the SpaceX S-1, 2026-05-20 |
| Thinking Machines | `thinking-machines.json` | `thinking-machines.answers.reasoned.json` | `thinking-machines.matrix.md` | Wikipedia and press; no filing |

Each core promise is our wording of the company's own statements, not theirs. The answers are a reasoning model's drafts (no `TYPESAFE_API_KEY` in the session); re-score with `score --send` when a key is available.

Re-run one:

```bash
node ../../anatomy.mjs matrix anthropic.json anthropic.answers.reasoned.json > anthropic.matrix.md
```

What the runs found, and the gaps they expose in the matrix (one core per venture, unsold substrate, risk only as promise breach), are in the Claude Doc "AI labs on the Product Anatomy Matrix, and a Venture Anatomy Matrix design": https://claude.ai/artifact/B5jooKPEzoS8E3CmAReqkK
