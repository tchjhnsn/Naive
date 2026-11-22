// Breaks check-phases.ts on copies of the repository: each rule fails when its file is wrong, and the real repository
// passes. Also tests the phase loader (packages/naive/src/phases/phases.ts) and the phase-module generator.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import { MemoryFs } from "../core/effect/fs.ts";
import { runSync } from "../core/effect/run.ts";
import { loadPhase, loadPhases, phasePriors, phaseWeights } from "../phases/phases.ts";
import { draft } from "../engine/generators/phase-module.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
const check = join(repo, "packages/naive/src/checks/check-phases.ts");
let failed = 0;
const expect = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail.slice(0, 800)}`}`); if (!ok) failed++; };
const run = (root: string) => spawnSync("node", [check, "--root", root], { encoding: "utf8" });

const real = run(repo);
expect("the repository's phase modules pass", real.status === 0 && /phase modules: 5 checked/.test(real.stdout), real.stdout + real.stderr);

// The loader.
const phases = runSync(loadPhases());
expect("the loader returns the five phases in lifecycle order", phases.map((p) => p.id).join(",") === "discovery,validation,beachhead,scale,platform");
const w = runSync(phaseWeights("beachhead"));
expect("phaseWeights gives the 13 functions, summing to 1", Object.keys(w).length === 13 && Math.abs(Object.values(w).reduce((s, x) => s + x, 0) - 1) < 1e-9, JSON.stringify(w));
const need = JSON.parse(readFileSync(join(repo, "packages/naive/src/engine/need-now.json"), "utf8")) as { records: Record<string, { base: Record<string, number> }> };
const pri = runSync(phasePriors("validation"));
expect("phasePriors derives the phase's priors from need-now.json, not a copy", pri.records.product === need.records.product.base.validation && typeof pri.functions.strategy === "number" && Object.keys(pri.records).length === Object.keys(need.records).length);
let tag = "";
try { runSync(loadPhase("launch")); } catch (e) { tag = (e as { _tag?: string })._tag ?? ""; }
expect("an unknown phase fails with NotFound", tag === "NotFound", tag);
const mem = Effect.runSync(Effect.result(Effect.provide(loadPhase("validation", { root: "/mem" }), MemoryFs({ "/mem/packages/naive/src/phases/validation/phase.json": JSON.stringify({ id: "validation" }) }))));
expect("a phase.json that breaks its schema fails with SchemaInvalid, on an in-memory file system", mem._tag === "Failure" && mem.failure._tag === "SchemaInvalid", JSON.stringify(mem));

// The generator drafts a phase.json that passes its schema.
const v = phases[1];
const d = draft({ ...v, weights: v.weights.functions });
expect("phase-module: a draft of a real phase passes the schema", d.ok, JSON.stringify(d.errors));
expect("phase-module: a draft with no gate is refused", !draft({ id: "validation", step: 2, name: "Validation", question: "q" }).ok);

// The check, broken on copies.
const copy = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "check-phases-"));
  for (const p of ["packages/naive/src/phases", "packages/naive/src/functions", "packages/naive/src/records", "packages/naive/src/engine/need-now.json"]) cpSync(join(repo, p), join(dir, p), { recursive: true });
  return dir;
};
type Json = Record<string, unknown> & {
  gate: { name: string, asks: string[], evidence: Record<string, unknown>[] }, workflows: string[], step: number,
  weights: { functions: Record<string, { weight: number, why: string }> }, records: Record<string, { base: Record<string, number> }>,
  phases: { phase: string, gate?: string }[],
};
const edit = (root: string, rel: string, f: (j: Json) => void) => { const p = join(root, rel); const j = JSON.parse(readFileSync(p, "utf8")) as Json; f(j); writeFileSync(p, JSON.stringify(j, null, 2) + "\n"); };
const VAL = "packages/naive/src/phases/validation/phase.json";
const cases: [string, (dir: string) => void, RegExp][] = [
  ["a phase with no phase.json fails", (dir) => rmSync(join(dir, "packages/naive/src/phases/scale"), { recursive: true }), /scale: .*phase.json: missing/],
  ["a folder that is not a phase fails", (dir) => cpSync(join(dir, "packages/naive/src/phases/scale"), join(dir, "packages/naive/src/phases/launch"), { recursive: true }), /launch: .* is not a phase/],
  ["a phase at the wrong step fails", (dir) => edit(dir, VAL, (j) => { j.step = 3; }), /step 3 is not 2/],
  ["a workflow that does not exist fails", (dir) => edit(dir, VAL, (j) => { j.workflows.push("finance/no-such-review"); }), /workflow finance\/no-such-review does not exist/],
  ["a workflow of no function fails", (dir) => edit(dir, VAL, (j) => { j.workflows.push("sales/intake"); }), /workflow sales\/intake does not name one of the 13 functions/],
  ["weights that leave out a function fail", (dir) => edit(dir, VAL, (j) => { delete j.weights.functions.assets; }), /weights leave out function assets/],
  ["weights that do not sum to 1 fail", (dir) => edit(dir, VAL, (j) => { j.weights.functions.assets.weight = 0.5; }), /weights sum to 1.49, not 1/],
  ["a gate evidence item with no source fails", (dir) => edit(dir, VAL, (j) => { delete j.gate.evidence[0].source; }), /evidence solution has no source/],
  ["a gate evidence source that is not a record type fails", (dir) => edit(dir, VAL, (j) => { j.gate.evidence[0].source = "retention-chart"; }), /source retention-chart, which is not a record type/],
  ["a gate that asks nothing fails", (dir) => edit(dir, VAL, (j) => { j.gate.asks = []; }), /the gate asks no question/],
  ["a missing need-now prior fails", (dir) => edit(dir, "packages/naive/src/engine/need-now.json", (j) => { delete j.records.product.base.validation; }), /record product has no prior for validation/],
  ["phases.json holding phases again fails", (dir) => edit(dir, "packages/naive/src/functions/products/frameworks/product-anatomy/phases.json", (j) => { j.phases = []; }), /holds phases; their names, questions and gates belong in the phase modules/],
  ["a playbook repeating the gate name fails", (dir) => edit(dir, "packages/naive/src/functions/products/frameworks/product-anatomy/playbooks/product-first.json", (j) => { j.phases[2].gate = "Repeatability"; }), /repeats the phase module's gate name "Repeatability"/],
];
for (const [name, breakIt, want] of cases) {
  const dir = copy();
  try { breakIt(dir); const r = run(dir); expect(name, r.status === 1 && want.test(r.stdout), r.stdout + r.stderr); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}
{
  const dir = copy();
  try { rmSync(join(dir, "packages/naive/src/functions/departments.json")); const r = run(dir); expect("a framework file it cannot read exits 2", r.status === 2 && /cannot run/.test(r.stderr), r.stdout + r.stderr); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("phase modules check: all passed");
