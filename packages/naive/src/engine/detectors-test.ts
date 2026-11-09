// Tests the thresholds as detectors (packages/naive/src/engine/detectors.mjs, signal detection build item 5): Naive's
// shipped detectors hold today's constants, a venture's own detector file moves the line at each call site, the
// overrides a call site already had keep precedence, and yes_when below matches the gate's strict comparison.
//
//   node packages/naive/src/engine/detectors-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { TEMPLATE, criterionFor, detectorFor, line } from "./detectors.mjs";
import { DEFAULTS, configFor } from "./naive-config.mjs";
import { evaluate } from "./gate.mjs";
import { ACCEPT, route } from "./feedback-route.mjs";
import { THRESHOLD as INDEX_THRESHOLD, rebuild } from "./decision-index.mjs";
import { call } from "./generators/detector-trial.ts";
import { TIER_COSTS } from "./generators/detector.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const load = (f: string): Record<string, unknown> => JSON.parse(readFileSync(f, "utf8")) as Record<string, unknown>;
const put = (f: string, o: unknown): void => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2) + "\n"); };
const ws = mkdtempSync(join(tmpdir(), "detectors-test-"));

// A venture's own copy of a shipped detector with its yes line moved, set by a person.
const own = (dir: string, id: string, yes: number): void => {
  const d = structuredClone(detectorFor(undefined, id)?.detector);
  d.criterion.yes = { value: yes, set_by: "founder" };
  put(join(dir, "governance/detectors", `${id}.json`), d);
};

// (b) Without a venture file, each shipped default equals today's constant.
const rules = load(join(repo, "packages/naive/src/terms/operating-rules.json")) as { jev: { yes: number; no: number }; questions: { standing: { low: number; costly: number } } };
const weights = load(join(repo, "packages/naive/src/functions/strategy/kits/validation/weights.json")) as { threshold: number };
const conventions = load(join(repo, "packages/naive/src/functions/strategy/frameworks/idea-map/conventions.json")) as { threshold: number };
const today: [string, number, number?][] = [
  ["gate-confidence", DEFAULTS.thresholds.confidence],
  ["feedback-accept", ACCEPT],
  ["idea-map-tag", conventions.threshold],
  ["decision-index-note", INDEX_THRESHOLD],
  ["validation-recommend", weights.threshold],
  ["noul-judgment", rules.jev.yes, rules.jev.no],
  ["standing-earn-low", rules.questions.standing.low],
  ["standing-earn-costly", rules.questions.standing.costly],
  ["standing-loss", Math.log(19)],
  // Not a constant moved out of code: the tools against spend seam (lead agents item 6) is new, and its line is one disagreement.
  ["seam-tools-spend", 1],
  // New with raw triage (docs/design/RAW_TRIAGE_2026-11-09.md): the line Jev's labels clear, as feedback-accept's.
  ["triage-accept", 0.95],
];
for (const [id, yes, no] of today) {
  const c = criterionFor(undefined, id);
  expect(`(b) the shipped ${id} holds today's line ${yes}${no === undefined ? "" : ` and ${no}`}`, c?.from === "default" && c.criterion.yes === yes && c.criterion.no === no, JSON.stringify(c));
}
const shipped = readdirSync(TEMPLATE).filter((f) => f.endsWith(".json")).map((f) => load(join(TEMPLATE, f)) as { id: string; tier: "low" | "costly"; costs: unknown; criterion: Record<string, { set_by: string }> });
expect("every shipped detector is listed here with its line", shipped.length === today.length && shipped.every((d) => today.some(([id]) => id === d.id)), shipped.map((d) => d.id).join(", "));
expect("every shipped line is set_by default and its costs are its tier's", shipped.every((d) => Object.values(d.criterion).every((l) => l.set_by === "default") && JSON.stringify(d.costs) === JSON.stringify(TIER_COSTS[d.tier])));
const validate = spawnSync(process.execPath, [join(repo, "packages/naive/src/records/validate.mjs")], { encoding: "utf8" });
expect("the shipped detectors pass the schema", validate.status === 0 && !/template\/governance\/detectors/.test(validate.stdout + validate.stderr), validate.stdout + validate.stderr);
const bare = join(ws, "bare");
mkdirSync(bare);
expect("(b) a venture with no detector file resolves the gate and idea-map lines it resolved before", configFor(bare).thresholds.confidence === 0.7 && configFor(bare).thresholds["idea-map"] === conventions.threshold);
expect("an unknown detector falls back to the caller's constant", line(bare, "no-such-detector", 0.42) === 0.42 && criterionFor(bare, "no-such-detector") === null);

// (c) yes_when below matches the gate's strict comparison at exactly 0.7.
const gate = criterionFor(undefined, "gate-confidence");
expect("(c) the gate detector says yes (hold) below its line", gate?.criterion.yes_when === "below");
const held = (dir: string, confidence: number): boolean => evaluate({ config: configFor(dir), route: "validation/solution", confidence }).then !== "pass";
// The largest double below 0.7: 0.7 sits in [0.5, 1), where one step is 2^-53.
const justBelow = 0.7 - 2 ** -53;
const atLine = gate ? call(0.7, gate.criterion) : null, under = gate ? call(justBelow, gate.criterion) : null;
expect("(c) at exactly 0.7 the gate passes the write and call() says no", !held(bare, 0.7) && atLine === "no", String(atLine));
expect("(c) just below 0.7 the gate holds the write and call() says yes", held(bare, justBelow) && under === "yes", String(under));
expect("call() under yes_when below: a band sends the middle to a person", call(0.5, { yes: 0.3, no: 0.7, yes_when: "below" }) === "unsure" && call(0.7, { yes: 0.3, no: 0.7, yes_when: "below" }) === "no" && call(0.29, { yes: 0.3, no: 0.7, yes_when: "below" }) === "yes");

// (a) A venture's detector file moves the line at each call site.
const v = join(ws, "moved");
mkdirSync(v);
own(v, "gate-confidence", 0.5);
expect("(a) the reader takes the venture's copy first", criterionFor(v, "gate-confidence")?.from === "venture" && line(v, "gate-confidence", 0.7) === 0.5);
expect("(a) a venture gate-confidence at 0.5 passes a write at 0.6 that the default holds", !held(v, 0.6) && held(bare, 0.6));
put(join(v, "naive.config.json"), { thresholds: { confidence: 0.65 } });
expect("naive.config.json thresholds.confidence still overrides the venture's detector", configFor(v).thresholds.confidence === 0.65 && held(v, 0.6));
rmSync(join(v, "naive.config.json"));
own(v, "idea-map-tag", 0.6);
expect("(a) a venture idea-map-tag moves thresholds.idea-map", configFor(v).thresholds["idea-map"] === 0.6);
own(v, "feedback-accept", 0.9);
const jev = async (): Promise<{ destination: string; confidence: number }> => ({ destination: "decisions", confidence: 0.92 });
const opts = { jev, send: true, env: { TYPESAFE_API_KEY: "test" } };
const fb = { capability: "venture", text: "which option" };
const moved = await route(fb, { ...opts, dir: v }), kept = await route(fb, { ...opts, dir: bare }), forced = await route(fb, { ...opts, dir: v, accept: 0.95 });
expect("(a) a venture feedback-accept at 0.9 takes Jev's 0.92; the default does not", moved.model === "jev" && kept.model === "fallback", JSON.stringify([moved, kept]));
expect("an accept option still overrides the venture's detector", forced.model === "fallback");
own(v, "decision-index-note", 0.4);
put(join(v, "venture.json"), { id: "moved", name: "Moved", phase: "discovery" });
const idx = rebuild(v) as { threshold: number };
expect("(a) a venture decision-index-note moves the index's threshold", idx.threshold === 0.4, JSON.stringify(idx.threshold));
const tandem = join(ws, "ventures/tandem");
cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures/tandem"), tandem, { recursive: true });
const score = (): { threshold: number } => (JSON.parse(spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-validation.mjs"), tandem, "--score", "--json"], { encoding: "utf8" }).stdout) as { scores: { threshold: number }[] }).scores[0];
expect("(b) check-validation scores against the shipped line", score().threshold === weights.threshold);
own(tandem, "validation-recommend", 0.5);
expect("(a) a venture validation-recommend moves check-validation's threshold", score().threshold === 0.5);

rmSync(ws, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("thresholds as detectors: all passed");
