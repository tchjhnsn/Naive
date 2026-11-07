// Tests the recipe scorer (packages/naive/src/engine/recipes/scoring.ts) and the outcomes it scores against
// (packages/naive/src/engine/recipes/outcomes.ts). Pure: no venture, no sandbox.
//
//   node packages/naive/src/engine/recipes/scoring-test.ts

import { readFileSync } from "node:fs";
import { signalId } from "../../core/signal-id.ts";
import { baselineRecord, forecastOutcome, recipeInput, settledRecord, settledSignals } from "./outcomes.ts";
import type { Known } from "./outcomes.ts";
import { blockBootstrap, brier, fieldLoss, rowLoss, seeded, settledLoss, verdict } from "./scoring.ts";
import type { RowScore, Settles } from "./scoring.ts";
import type { Signal, SignalType } from "../../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

// ---- Losses ----
expect("exact: equal values lose 0, different 1, both missing 0", fieldLoss({ fn: "exact" }, { a: 1, b: 2 }, { b: 2, a: 1 }) === 0 && fieldLoss({ fn: "exact" }, "x", "y") === 1 && fieldLoss({ fn: "exact" }, undefined, null) === 0);
expect("set-jaccard: entries match by what they say, whichever signal they name", near(fieldLoss({ fn: "set-jaccard" }, [{ signal: "a", x: 1 }, { signal: "b", x: 2 }], [{ signal: "c", x: 2 }]), 0.5)
  && fieldLoss({ fn: "set-jaccard" }, [{ signal: "a", x: 1 }, { signal: "b", x: 1 }], [{ signal: "c", x: 1 }]) === 0);
expect("set-jaccard: two empty sets lose 0, one empty 1", fieldLoss({ fn: "set-jaccard" }, [], undefined) === 0 && fieldLoss({ fn: "set-jaccard" }, [], ["x"]) === 1);
expect("abs-scaled: the difference over the scale, capped at 1", near(fieldLoss({ fn: "abs-scaled", scale: 10 }, 3, 7), 0.4) && fieldLoss({ fn: "abs-scaled", scale: 1 }, 0, 9) === 1 && fieldLoss({ fn: "abs-scaled", scale: 1 }, null, 2) === 1);
expect("brier: a missing forecast counts as 0, so it pays for an event that came", brier(undefined, 1) === 1 && near(brier(0.2, 0), 0.04) && brier(2, 1) === 1);

const settles: Settles = { horizon: "90d", cadence: "7d", loss: { funding: { fn: "set-jaccard" }, first_seen: { fn: "exact", weight: 0.5 } }, forecasts: { p: { resolved_by: { signals: ["x@^1"] }, window: "90d" } }, min_counts: { training: 1, dev: 1, holdout: 1 } };
expect("rowLoss: a null prediction of a settled record loses every field", rowLoss(settles, null, { funding: [] }, { p: 1 }) === 1);
expect("rowLoss: a null prediction where nothing settled pays only its forecasts", near(rowLoss(settles, null, null, { p: 1 }), 1 / 2.5) && rowLoss(settles, null, null, { p: 0 }) === 0);
expect("rowLoss: weighted mean of fields and Brier, a null outcome left out", near(rowLoss(settles, { funding: [{ signal: "a" }], first_seen: "2025-01-01", p: 0.5 }, { funding: [{ signal: "a" }], first_seen: "2025-01-02" }, { p: 1 }), (0 + 0.5 + 0.25) / 2.5)
  && near(rowLoss(settles, { funding: [], first_seen: "x" }, { funding: [], first_seen: "x" }, { p: null }), 0));
expect("settledLoss: the weighted mean", near(settledLoss([{ loss: 1, weight: 3 }, { loss: 0, weight: 1 }]), 0.75) && settledLoss([]) === 0);

// ---- The bootstrap and the verdict are functions of their arguments ----
const a = seeded("ab".repeat(32)), b = seeded("ab".repeat(32)), c = seeded("cd".repeat(32));
const xs = Array.from({ length: 5 }, () => a()), ys = Array.from({ length: 5 }, () => b()), zs = Array.from({ length: 5 }, () => c());
expect("seeded: the same sha draws the same numbers, another sha others", JSON.stringify(xs) === JSON.stringify(ys) && JSON.stringify(xs) !== JSON.stringify(zs) && xs.every((x) => x >= 0 && x < 1));
const DAY = 86_400_000;
const diffs = Array.from({ length: 40 }, (_, i) => ({ point: i * 7 * DAY, value: Math.sin(i) / 10, weight: 1 + (i % 3) }));
const se1 = blockBootstrap(diffs, 28 * DAY, 500, "ab".repeat(32)), se2 = blockBootstrap(diffs, 28 * DAY, 500, "ab".repeat(32));
expect("blockBootstrap: the same rows and sha give the same standard error", se1 === se2 && se1 > 0, [se1, se2]);
expect("blockBootstrap: one block gives 0", blockBootstrap(diffs.slice(0, 3), 28 * DAY, 500, "ab") === 0);

const rows = (losses: number[]): RowScore[] => losses.map((loss, i) => ({ key: `s@${i}`, point: i * 7 * DAY, weight: 1, loss }));
const plan = { sha: "ef".repeat(32), min_gain: 0.01, bootstrap: { block: "14d", resamples: 400 } };
const tip = rows(Array.from({ length: 20 }, (_, i) => 0.5 + (i % 4) / 20));
const better = rows(Array.from({ length: 20 }, (_, i) => 0.2 + (i % 3) / 50));
const v1 = verdict(better, tip, plan, { candidate: 100, against: 100 }), v2 = verdict(better, tip, plan, { candidate: 100, against: 100 });
expect("verdict: a clear gain keeps as better", v1.verdict === "keep" && v1.kept_as === "better", v1);
expect("verdict: identical over two runs", JSON.stringify(v1) === JSON.stringify(v2));
const same = verdict(tip, tip, plan, { candidate: 80, against: 100 });
expect("verdict: strictly smaller and no worse keeps as smaller", same.verdict === "keep" && same.kept_as === "smaller", same);
const noise = verdict(rows(tip.map((r, i) => r.loss + (i % 2 ? 0.02 : -0.019))), tip, plan, { candidate: 100, against: 100 });
expect("verdict: a gain inside the margin discards", noise.verdict === "discard", noise);
const worse = verdict(rows(tip.map((r) => r.loss + 0.1)), tip, plan, { candidate: 50, against: 100 });
expect("verdict: smaller but worse discards", worse.verdict === "discard", worse);

// ---- Outcomes: only people and producers resolve them ----
const typeFile = new URL("../../records/examples/signals/library/types/", import.meta.url);
const types = ["competitor-funding", "organization", "funding-event"].map((id) => JSON.parse(readFileSync(new URL(`${id}/1.0.0.signal.json`, typeFile), "utf8")) as SignalType);
const at = (d: string) => Date.parse(`${d}T00:00:00Z`);
const mk = (producer: string, series: string, time: string, observed: string, extra: Record<string, unknown> = {}): Signal => {
  const body = { type: "competitor-funding@1.0", producer, subject: "acme", time, observed, props: { org: { name: "Acme" }, round: { series, amount: 1, currency: "USD" } }, rating: { reliability: "B", credibility: 2 }, ...extra };
  return { ...body, id: signalId(body) } as unknown as Signal;
};
const k = (signal: Signal, library: string, by: Known["by"]): Known => ({ signal, library, by });
const seedA = k(mk("lib-a/research", "seed", "2025-01-10", "2025-01-12T00:00:00Z"), "lib-a", "producer");
const seedB = k(mk("lib-b/news", "seed", "2025-01-10", "2025-02-01T00:00:00Z"), "lib-b", "producer");
const agentSeries = k(mk("venture/agent", "series-a", "2025-03-01", "2025-03-02T00:00:00Z"), "local", "other");
const personSeries = k(mk("venture/founder", "series-a", "2025-03-01", "2025-03-02T00:00:00Z"), "local", "person");
const rumorA = k(mk("lib-a/research", "series-a", "2025-03-01", "2025-03-03T00:00:00Z"), "lib-a", "producer");
const H = 90 * DAY, t = at("2025-04-01");
expect("settled: one producer's claim does not settle", settledSignals([seedA], types, t, H).length === 0);
expect("settled: a second producer settles it", settledSignals([seedA, seedB], types, t, H).length === 2);
expect("settled: a second producer observed after t + horizon does not", settledSignals([seedA, seedB], types, at("2024-11-01"), H).length === 0 && settledSignals([seedA, seedB], types, at("2024-11-03"), H).length === 2);
expect("settled: an agent's local signal settles nothing, alone or beside a producer", settledSignals([agentSeries], types, t, H).length === 0 && settledSignals([agentSeries, rumorA], types, t, H).length === 0);
expect("settled: a person's local signal settles and confirms a producer's claim", settledSignals([personSeries, rumorA], types, t, H).length === 2);
const withAgent = settledRecord([seedA, seedB, agentSeries, rumorA], types, "competitors/[id]/signals", "acme", t, H);
const without = settledRecord([seedA, seedB, rumorA], types, "competitors/[id]/signals", "acme", t, H);
expect("settledRecord: an agent's write changes nothing", JSON.stringify(withAgent) === JSON.stringify(without) && (without?.funding as unknown[]).length === 1, withAgent);
const withPerson = settledRecord([seedA, seedB, personSeries, rumorA], types, "competitors/[id]/signals", "acme", t, H);
expect("settledRecord: a person's statement does", (withPerson?.funding as unknown[]).length === 2, withPerson);
expect("forecastOutcome: an agent's claim resolves no forecast; a person's does",
  forecastOutcome([agentSeries], types, ["competitor-funding@^1"], "acme", at("2025-02-15"), H, H) === 0 && forecastOutcome([personSeries], types, ["competitor-funding@^1"], "acme", at("2025-02-15"), H, H) === 1);
expect("baselineRecord: the plain fold of everything observed by t, whoever wrote it", (baselineRecord([seedA, agentSeries], types, "competitors/[id]/signals", "acme", t)?.funding as unknown[]).length === 2);
const inp = recipeInput([seedB, seedA, rumorA], ["competitor-funding@^1"], "competitors/[id]/signals", "acme", at("2025-01-20"));
expect("recipeInput: only signals observed by t, in (time, id) order", inp.signals.length === 1 && inp.signals[0].id === seedA.signal.id && inp.asOf === at("2025-01-20"), inp);

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
