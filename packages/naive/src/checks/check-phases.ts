// Checks the five phase modules (packages/naive/src/phases/<id>/phase.json, EE-126): each one present, valid and
// agreeing with the data Naive already has, and the only place a phase's gate is defined.
//
//   node packages/naive/src/checks/check-phases.ts [--json] [--root <repo copy>]
//
// It fails on:
//   - a phase of venture.schema.json with no phase.json, or a folder that is not a phase;
//   - a phase.json that does not match phase-module.schema.json, names another id, or sits at the wrong step;
//   - a gate with no question or no evidence, an evidence item with no source, or a source that is not a record
//     type in data-model.json;
//   - an active workflow <function>/<workflow> that is not a file in that function module's workflows/;
//   - weights that do not cover exactly the 13 functions of departments.json, or do not sum to 1;
//   - a need-now prior missing for the phase in need-now.json or departments.json (the priors are derived from them);
//   - a gate defined twice: product-anatomy/phases.json holding phases or gates, or a lifecycle playbook repeating the
//     phase module's gate name.
// Exit 1 on a finding, 2 when a framework file it reads cannot be read.

import { Effect } from "effect";
import { join } from "node:path";
import { CannotRun, SchemaInvalid } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { runMain } from "../core/effect/run.ts";
import { phaseFile, phasesDir } from "../phases/phases.ts";
import { recordsIn } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";

const args = process.argv.slice(2);
const at = args.indexOf("--root");
const root = at >= 0 ? args[at + 1] : new URL("../../../..", import.meta.url).pathname;
const asJson = args.includes("--json");

type Finding = { phase: string, file: string, error: string };
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rel = (p: string) => p.slice(root.replace(/\/$/, "").length + 1);

// A framework file the check needs; one it cannot read means the check cannot run (exit 2).
const framework = (path: string) => readJson(path).pipe(Effect.mapError((e) => new CannotRun({ message: `cannot read ${rel(path)} (${e._tag})`, cause: e })));

export const checkPhases = Effect.gen(function* () {
  const fs = yield* VentureFs;
  const records = recordsIn(root);
  const findings: Finding[] = [];
  const fail = (phase: string, file: string, error: string) => { findings.push({ phase, file, error }); };

  const venture = yield* framework(records.schemaFile("venture"));
  const phaseEnum = isObject(venture) && isObject(venture.properties) && isObject(venture.properties.phase) ? list(venture.properties.phase.enum).map(String) : [];
  if (!phaseEnum.length) return yield* Effect.fail(new CannotRun({ message: "venture.schema.json names no phases" }));
  const model = yield* framework(records.dataModelFile());
  const recordTypes = new Set(list(isObject(model) ? model.records : []).filter(isObject).map((r) => String(r.id)));
  const FUNCTIONS = join(root, "packages/naive/src/functions");
  const catalog = yield* framework(join(FUNCTIONS, "departments.json"));
  const depts = list(isObject(catalog) ? catalog.departments : []).filter(isObject);
  const departments = depts.map((d) => String(d.id));
  const need = yield* framework(join(root, "packages/naive/src/engine/need-now.json"));
  const needRecords = isObject(need) && isObject(need.records) ? Object.entries(need.records) : [];
  const ANATOMY = join(FUNCTIONS, "products/frameworks/product-anatomy");
  const anatomy = yield* framework(join(ANATOMY, "phases.json"));
  const playbookFiles = (yield* fs.list(join(ANATOMY, "playbooks"))).filter((f) => f.endsWith(".json"));
  const playbooks: [string, unknown][] = [];
  for (const f of playbookFiles) playbooks.push([f, yield* framework(join(ANATOMY, "playbooks", f))]);

  const gateNames = new Map<string, string>();
  for (const [i, id] of phaseEnum.entries()) {
    const file = phaseFile(id, { root });
    if (!(yield* fs.exists(file))) { fail(id, rel(file), "missing: every phase of venture.schema.json is a phase module"); continue; }
    const read = yield* Effect.result(readJson(file));
    if (read._tag === "Failure") { fail(id, rel(file), `cannot be read (${read.failure._tag})`); continue; }
    const p = read.success;
    const v = validateValue("phase-module.schema.json", p);
    if (v.status !== 0) for (const e of (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l))) fail(id, rel(file), e);
    if (!isObject(p)) continue;
    if (p.id !== id) fail(id, rel(file), `id ${String(p.id)} is not the folder's name`);
    if (p.step !== i + 1) fail(id, rel(file), `step ${String(p.step)} is not ${i + 1}, its place in venture.schema.json`);

    // The gate and its exit evidence.
    const gate = isObject(p.gate) ? p.gate : {};
    if (typeof gate.name === "string") gateNames.set(id, gate.name);
    if (!list(gate.asks).length) fail(id, rel(file), "the gate asks no question");
    const evidence = list(gate.evidence).filter(isObject);
    if (!evidence.length) fail(id, rel(file), "the gate requires no exit evidence");
    const seen = new Set<string>();
    for (const e of evidence) {
      const eid = String(e.id);
      if (seen.has(eid)) fail(id, rel(file), `evidence ${eid} is listed twice`);
      seen.add(eid);
      if (typeof e.source !== "string" || !e.source) fail(id, rel(file), `evidence ${eid} has no source`);
      else if (!recordTypes.has(e.source)) fail(id, rel(file), `evidence ${eid} has source ${e.source}, which is not a record type in data-model.json`);
    }

    // The workflows active in the phase.
    for (const w of list(p.workflows).map(String)) {
      const [fn, wf] = w.split("/");
      if (!fn || !wf || !departments.includes(fn)) { fail(id, rel(file), `workflow ${w} does not name one of the 13 functions`); continue; }
      if (!(yield* fs.exists(join(FUNCTIONS, fn, "workflows", `${wf}.json`)))) fail(id, rel(file), `workflow ${w} does not exist: packages/naive/src/functions/${fn}/workflows/${wf}.json`);
    }

    // The weights across the 13 functions.
    const weights = isObject(p.weights) && isObject(p.weights.functions) ? p.weights.functions : {};
    for (const fn of departments) if (!(fn in weights)) fail(id, rel(file), `weights leave out function ${fn}`);
    for (const fn of Object.keys(weights)) if (!departments.includes(fn)) fail(id, rel(file), `weights name ${fn}, which is not a function in departments.json`);
    let sum = 0;
    for (const w of Object.values(weights)) if (isObject(w) && typeof w.weight === "number") sum += w.weight;
    if (Math.abs(sum - 1) > 1e-9) fail(id, rel(file), `weights sum to ${Number(sum.toFixed(6))}, not 1`);

    // The need-now priors the loader derives for the phase.
    for (const [rid, r] of needRecords) if (!isObject(r) || !isObject(r.base) || typeof r.base[id] !== "number") fail(id, "packages/naive/src/engine/need-now.json", `record ${rid} has no prior for ${id}`);
    for (const d of depts) if (!isObject(d.base) || typeof d.base[id] !== "number") fail(id, "packages/naive/src/functions/departments.json", `function ${String(d.id)} has no prior for ${id}`);
  }
  for (const name of yield* fs.list(phasesDir(root))) {
    if ((yield* fs.isDirectory(join(phasesDir(root), name))) && !phaseEnum.includes(name)) fail(name, rel(join(phasesDir(root), name)), "is not a phase of venture.schema.json");
  }

  // One source of truth for the gates.
  const anatomyFile = "packages/naive/src/functions/products/frameworks/product-anatomy/phases.json";
  if (isObject(anatomy)) {
    if ("phases" in anatomy) fail("all", anatomyFile, "holds phases; their names, questions and gates belong in the phase modules");
    for (const k of Object.keys(isObject(anatomy.weights) ? anatomy.weights : {})) if (!phaseEnum.includes(k)) fail("all", anatomyFile, `weights for ${k}, which is not a phase`);
  }
  for (const [f, pb] of playbooks) {
    for (const ph of list(isObject(pb) ? pb.phases : []).filter(isObject)) {
      if (typeof ph.gate === "string" && ph.gate === gateNames.get(String(ph.phase))) fail(String(ph.phase), `packages/naive/src/functions/products/frameworks/product-anatomy/playbooks/${f}`, `repeats the phase module's gate name "${ph.gate}"; leave gate out unless the playbook renames it`);
    }
  }
  return { phases: phaseEnum.length, findings };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMain(Effect.gen(function* () {
    const { phases, findings } = yield* checkPhases;
    if (asJson) console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
    else {
      for (const f of findings) console.log(`FAIL  ${f.phase}: ${f.file}: ${f.error}`);
      if (!findings.length) console.log(`phase modules: ${phases} checked`);
    }
    if (findings.length) return yield* Effect.fail(new SchemaInvalid({ schema: "phase modules", errors: [`${findings.length} finding${findings.length === 1 ? "" : "s"}`] }));
  }));
}
