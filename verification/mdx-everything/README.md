# Verification: cursor/mdx-everything (gate wave 1, item 2)

`PublicWords.tla` models (for `operations/marketing/publish-build.mjs`) one record field on its way to a public channel: its visibility sidecar, its MDX
public variant, and what a build puts in the output. `CODE = "branch"` (`PublicWords.cfg`) is this branch;
`CODE = "main"` (`PublicWords-main.cfg`) is origin/main at 566bb99. `replay.mjs` replays each rule against
the real code, on a fixture venture and on Naive's example software venture (`schema/examples/software/ventures/relay`), with the stand-in channel builders in `operations/marketing/fixtures/`.

When this branch was verified, the replay also ran main's site one-pager and the repository's own venture. Naive now has its own repository (EE-118), and that site code and venture stay in everything-ecosystem, so the replay here builds the stand-in channels instead. The table below is the record of that verification as run then.

## Regenerate

```sh
# TLC: TLA2TOOLS=<tla2tools.jar> JAVA=<java 11+>, statechart from pstack-kit/skills/statechart
statechart verification/mdx-everything/PublicWords.tla --config verification/mdx-everything/PublicWords.cfg --view verification/mdx-everything/view.mjs --out verification/mdx-everything/out
statechart verification/mdx-everything/PublicWords.tla --config verification/mdx-everything/PublicWords-main.cfg --view verification/mdx-everything/view.mjs --out verification/mdx-everything/out-main
node pstack-kit/naive-example/pele/render.mjs verification/mdx-everything/out*/chart.mmd   # then png.sh for chart.png
node verification/mdx-everything/replay.mjs
```

## Rules

| Rule | Reader's sentence | Model, main | Model, branch | Replay on branch |
|---|---|---|---|---|
| NoInternalWords | A record's own wording is published only when a person approved exactly that wording as public. | FAIL (1 step: build) | PASS | PASS. On main, `site/scripts/foundation.mjs` put 22 internal fields word for word and 5 internal-term matches (EE-045, "(Torian, 2026-10-28)") in the foundation one-pager. On the branch all three channels build and verify clean. |
| GateAcceptsHonestVariant | The public gate accepts an honest variant (`variant_of: record#field`). | FAIL (2 steps) | PASS | PASS. Main's `check-public.mjs` read `variant_of` as a file path, so the `record#field` form `schema/visibility.mjs` reads was always blocked. Fixed. |
| NoCopiedVariant | A variant that copies ten words of its source never reaches the output. | PASS | PASS | PASS: refused at the gate stage. |
| OnlyAPersonApproves | A variant reaches the output only when a person approved it. | PASS (nothing reaches it) | FAIL (4 steps) | FAIL, reproduced: an agent can write `approved_by: Torian` in the MDX frontmatter and the build publishes it. Not fixed here: the approval needs a provenance record (item 1, publish manifest, and item 4, publish decision gate). |

The model leaves out: more than one field, more than one channel, and output that goes stale after a later
edit (item 11). The charts hide no steps.
