# Amazon six-pager memo

Model of `packages/naive/library/packages/decisions/playbooks/amazon-6-pager.md`: the states a decision memo moves through, and the rules that memo has to keep.

The replay runs against the router on this branch, where each ICP profile is its own record. The actions match:

| Action | Code the replay called |
| --- | --- |
| ReadInputs, WriteNarrative | `call` read of `foundation/problem`, `foundation/icp`, `foundation/alignment`, `governance/decision-rights` (`packages/naive/src/router/router.mjs`). The fixture writes those records first. Its profile goes to `foundation/icp/shop-owners`, because `foundation/icp` has no write action. |
| DraftGap, DraftFull, WriteFaq, Propose | `propose()` in `packages/naive/src/engine/decisions.mjs` (what `mentura propose` calls), which writes `decisions/<id>.decision.json` |
| RecordFinding | `call` write then read of `evidence/[id]` |
| RunMatrix | `call` run of `governance/decisions` |
| FounderDecides | `approve()` in `packages/naive/src/engine/decisions.mjs` (what `mentura decide` calls) |

The chart hides one step: `Done`, which stays in "Decided by you". The incomplete memo stays an open draft beside the finished one. That is how the checks can fail and pass in one run. The model does not include a later rewrite. The playbook allows another propose while the record is still open. It does not read `ideas/map`. It runs `governance/decisions` once in the model, after the FAQ. The playbook also runs that command at draft time, to copy the phase.

A raw agent write of `decisions/[id]` with `status: "decided"` is not a playbook step, so it is not in the model. The replay does it. See MemoNeverDecides.

## Regenerate

TLC is tla2tools 1.7.4 (`tla2tools.jar`, sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`). Java 21 was used. The statechart script is the pstack kit's `skills/statechart/scripts/statechart.ts` (it is not in this repo). Node 22 runs it with type stripping. `--out` must be an empty directory.

```sh
TLA2TOOLS=/path/to/tla2tools.jar JAVA=java \
  node --experimental-strip-types --disable-warning=ExperimentalWarning \
  /path/to/pstack/skills/statechart/scripts/statechart.ts \
  packages/naive/test/verification/cursor/playbook-amazon-6-pager/AmazonSixPager.tla \
  --config packages/naive/test/verification/cursor/playbook-amazon-6-pager/AmazonSixPager.cfg \
  --view packages/naive/test/verification/cursor/playbook-amazon-6-pager/view.mjs \
  --out /tmp/amazon-six-pager-chart
```

Copy `chart.mmd` from that directory over `out/chart.mmd`. Render with Pele 1.9.0 (`node render.mjs out/chart.mmd`, options `limit: 1000000`, `outputLimit: 8000000`, `maxEdges: 10000`), then shoot the SVG to PNG with headless Chrome at 2x (`png.sh` in the pstack kit's `naive-example/pele`).

Replay the rules on a fixture venture:

```sh
node packages/naive/test/verification/cursor/playbook-amazon-6-pager/replay.mjs
```

## Rules

TLC reached 10 distinct states and found no broken rule (`out/tlc.out`, `out/report.md`). NoDeadlock holds. That output is from the 2026-10-29 run. TLC was not re-run after main moved ICP to one record per profile. The spec did not change, and it reads the `foundation/icp` list route, which still exists. The replay exit code was 0 on this branch.

| Rule | TLC | Replay |
| --- | --- | --- |
| TypeOK | PASS | The ten states use only `none`, `open`, and `decided`, and the founder is the only decider. |
| RoutesReal | PASS | `resolve()` in `packages/naive/src/router/router.mjs` finds `foundation/problem`, `foundation/icp`, `foundation/alignment`, `governance/decision-rights`, `decisions/[id]`, `evidence/[id]`, and `governance/decisions`. A write to `decisions/bad.id` is refused: `bad.id is not a valid id (lowercase letters, digits and hyphens)`. |
| NoReadBeforeProvided | PASS | The fixture writes the four input records, then reads them, then drafts. `foundation/icp` returns the profiles keyed by id, and the replay takes the primary one from that read. On a second venture with no problem record, `foundation/problem` reads as not found (`no validation-problem record yet`) and the replay writes no memo. A finding with no `ran_at` or `runner` is refused. `evidence/faq-finding` with both is written, then read, before the FAQ cites it. |
| MemoNeverDecides | PASS | `propose()` with `status: "decided"` returns `an agent may only propose an open decision; a person approves it` and writes nothing. After propose, `decisions/full-memo` is `open`, `drafted_by.kind` is `agent`, and `approved_by` is absent. `approve()` by Avery Founder sets `status` to `decided` and `approved_by` to that name. A second approve returns `full-memo is already decided`. |
| ChecksCanPassAndFail | PASS | `decisions/gap-memo` fails customer, problem, solution, principle, faq, and still-open. `decisions/full-memo` after propose passes those, and passes person-decided. After approve, still-open no longer passes, and person-decided does. No replay row builds a decided record with no approver, because the router refuses one (see below). |
| NoDeadlock | PASS | The only resting state is "Decided by you". |

The model reported no broken rule. The replay of that path matched the code.

The router closes the one write the model does not take. An agent `call` write of `decisions/raw-decided` with `status: "decided"` lands in `_drafts/`, and the route has no live record. A person's write of the same status with no `approved_by` is refused. The replay asserts both. Neither write is one of the playbook's steps.
