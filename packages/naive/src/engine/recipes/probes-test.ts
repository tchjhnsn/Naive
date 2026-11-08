// Tests packages/naive/src/engine/recipes/probes.ts: the deterministic share of noise a consumer probes, the probe mark
// and its schema, propensities, and the inverse propensity estimate that scores a recipe on signals the current one
// never surfaced (autoresearch build plan item 10). research.probe_rate is read from a temporary venture.
//
//   node packages/naive/src/engine/recipes/probes-test.ts

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateValue } from "../../records/validate.mjs";
import { draw, ipwEstimate, markProbes, probeRate, probed, propensity } from "./probes.ts";
import type { Logged } from "./probes.ts";

let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const ids = Array.from({ length: 4000 }, (_, i) => i.toString(16).padStart(24, "0"));
const A = "competitors/acme/signals.json", B = "competitors/globex/signals.json";

// The rate.
const tmp = mkdtempSync(join(tmpdir(), "naive-probes-"));
try {
  t("probe_rate is 0 with no naive.config.json", probeRate(tmp) === 0);
  writeFileSync(join(tmp, "naive.config.json"), JSON.stringify({ research: { probe_rate: 0.1 } }));
  t("probe_rate is read from research.probe_rate", probeRate(tmp) === 0.1);
  t("naive.config.json takes research.probe_rate from 0 to 1, and nothing else under research",
    validateValue("naive-config.schema.json", { research: { probe_rate: 0.1 } }).status === 0
    && validateValue("naive-config.schema.json", { research: { probe_rate: 1.5 } }).status !== 0
    && validateValue("naive-config.schema.json", { research: { other: 1 } }).status !== 0);
  writeFileSync(join(tmp, "naive.config.json"), JSON.stringify({ research: { probe_rate: "lots" } }));
  t("a rate that is not a share counts as 0", probeRate(tmp) === 0);
} finally { rmSync(tmp, { recursive: true, force: true }); }

// The draw.
t("the draw is a share in [0, 1) and the same on every call", ids.every((id) => { const d = draw(A, id); return d >= 0 && d < 1 && d === draw(A, id); }));
const share = ids.filter((id) => probed(A, id, 0.1)).length / ids.length;
t("about the rate's share of signals is probed", share > 0.08 && share < 0.12, share);
t("rate 0 probes nothing and rate 1 probes everything", ids.every((id) => !probed(A, id, 0)) && ids.every((id) => probed(A, id, 1)));
const both = ids.filter((id) => probed(A, id, 0.1) && probed(B, id, 0.1)).length / ids.length;
t("two consumers draw apart", both < 0.03, both);
t("a higher rate probes every signal a lower one did", ids.filter((id) => probed(A, id, 0.05)).every((id) => probed(A, id, 0.2)));

// The mark.
const recs = ids.slice(0, 200).map((id, i) => (i % 2 ? { signal: id, kind: "noise" as const } : { signal: id, kind: "salient" as const }));
const marked = markProbes(A, recs, 0.2);
t("only noise is marked, each with the rate", marked.every((r, i) => (r.probe ? r.kind === "noise" && r.probe.rate === 0.2 && probed(A, recs[i].signal, 0.2) : !(r.kind === "noise" && probed(A, r.signal, 0.2)))));
t("some noise is marked and the receptions are otherwise unchanged", marked.some((r) => r.probe) && marked.every((r, i) => r.signal === recs[i].signal && r.kind === recs[i].kind));
t("a mark already there is kept", markProbes(A, [{ signal: ids[1], kind: "noise", probe: { rate: 0.5 } }], 1)[0].probe?.rate === 0.5);
t("rate 0 marks nothing", markProbes(A, recs, 0).every((r) => !r.probe));
const reception = (extra: Record<string, unknown>) => ({ signal: "a".repeat(24), time: "2026-01-01", observed: "2026-01-02T00:00:00Z", withdrawn_at: null,
  factors: { lag: 86400, age: 0, producer_confirmed: null, producer_withdrawn: null, uptake: null }, ...extra });
const file = (r: Record<string, unknown>) => ({ record: "competitors/acme/signals.json", recipe: "b".repeat(64), as_of: "2026-01-03T00:00:00Z", receptions: [r] });
t("the reception schema takes a probe on a noise reception", validateValue("reception.schema.json", file(reception({ kind: "noise", failed: [{ why: "rated below B2" }], probe: { rate: 0.1 } }))).status === 0);
t("the reception schema refuses a probe on a salient reception, and a rate of 0", validateValue("reception.schema.json", file(reception({ kind: "salient", fields: ["funding"], probe: { rate: 0.1 } }))).status !== 0
  && validateValue("reception.schema.json", file(reception({ kind: "noise", failed: [{ why: "x" }], probe: { rate: 0 } }))).status !== 0);

// Propensity and the estimate.
t("propensity: 1 salient, the rate probed noise, 0 unprobed noise", propensity({ signal: "s", kind: "salient" }) === 1 && propensity({ signal: "s", kind: "noise", probe: { rate: 0.25 } }) === 0.25 && propensity({ signal: "s", kind: "noise" }) === 0);
// A world of 2,000 signals: half salient (outcome 0.2 each), half noise (outcome 0.8 each, seen only when probed).
const world = ids.slice(0, 2000).map((id, i) => ({ signal: id, kind: i % 2 ? "noise" : "salient", outcome: i % 2 ? 0.8 : 0.2 }));
const logged = (rate: number): Logged[] => markProbes(A, world.map((w) => ({ signal: w.signal, kind: w.kind })), rate)
  .map((r, i) => ({ ...r, outcome: r.kind === "salient" || r.probe ? world[i].outcome : null }));
const all = ipwEstimate(logged(0.2), () => true);
t("a candidate that surfaces everything is estimated near the true mean from a 20 percent probe", all.estimate !== null && Math.abs(all.estimate - 0.5) < 0.05, all);
const noiseOnly = new Set(world.filter((w) => w.kind === "noise").map((w) => w.signal));
const n = ipwEstimate(logged(0.2), (s) => noiseOnly.has(s));
t("a candidate that surfaces only what the current recipe calls noise is scored from the probes", n.estimate !== null && Math.abs(n.estimate - 0.4) < 0.05 && n.normalized !== null && Math.abs(n.normalized - 0.8) < 1e-9 && n.used > 0 && n.ess > 0, n);
const blind = ipwEstimate(logged(0), (s) => noiseOnly.has(s));
t("with no probes the same candidate is scored on nothing", blind.used === 0 && blind.estimate === 0 && blind.normalized === null, blind);
const pending = ipwEstimate([{ signal: "s", kind: "salient", outcome: null }, { signal: "t", kind: "salient", outcome: 1 }], () => true);
t("a surfaced signal with no outcome yet is left out", pending.n === 1 && pending.estimate === 1, pending);

console.log(failed === 0 ? "probes: all pass" : `probes: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
