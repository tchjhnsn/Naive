# Run prompt: venture:naive built on Naive itself

Brief (from the parent agent, on behalf of Torian, 2026-11-26 CST; Torian's words in t24u and t25u, paraphrased by the parent):

Build Naive's own venture (venture:naive) as real Naive records through the Naive CLI, across the phases and the 13 functions:
strategy, capabilities, offerings and pricing, go-to-market and early accounts, hiring, hypotheses with statuses, ethos and vision.
The website must be generatable from those records; Markdown is the records' readable form, not separate docs.

Rules:
1. Naive cloned read-only at main HEAD; record the SHA.
2. Fresh workspace outside any repo (/workspace/naive-self/). MENTURA_* set as in run-usenaive.sh. This run.json and prompt.md (sha256 in run.json).
3. No `phase --override`, no `--as` person. Records are agent-proposed; decisions stay proposed for Torian. Null where there is no source.
4. Where Naive lacks a way, try it first, log the gap in GAPS.md (command, result, interim workaround), make the interim choice, keep going. Do not modify Naive's code.
5. Generate the website content from the records with a small script (Markdown out) plus a content spec. Do not design or build the site.
Standing rules: read-only on GitHub; no pushes, PRs or messages; no naming decisions ("Naive" is the working name); no invented facts, numbers, customers, team members, quotes or traction; every claim cites a URL or a repo path; estimates marked; unknowns null or TBD-by-Torian; agents propose and Torian decides; symbolic things stay EE-095 and Lean compatible (propose terms, never side checks); Mermaid diagrams; plain, brief writing.
