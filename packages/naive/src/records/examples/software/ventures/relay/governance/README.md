# Governance

Relay's decision rights, delegation, publication policy and internal terms.

`detectors/recipe-ready.json` is a detector: a reviewer rates each recipe draft from 1 to 5, a 4 or 5 publishes it, a 1 or 2 sends it back and a 3 goes to the founder. It is low tier, so its costs are the tier's defaults, and its base rate comes from the ledger. `detectors/recipe-ready.trials.jsonl` is its ledger: three calls and two resolutions, hash-chained.

`detectors/breaking-release.json` is a one_way_door detector: a breaking release always goes to the founder, with no line drawn. Its ledger, `detectors/breaking-release.trials.jsonl`, still records the call.
