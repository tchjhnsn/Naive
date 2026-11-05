#!/usr/bin/env node
// Error boundaries (Next.js translation P-15, E-5, E-6, E-8). Expected errors stay answers, never throws.
//
//   global-error  a broken venture.json, or a broken framework file (the data model, a layer or package
//                 manifest), answers with what is wrong and the recovery steps, instead of a stack trace.
//                 One broken venture never stops the router from finding the others.
//   boundary      a failing check in one package is contained there: the other packages proceed, and
//                 only a venture-level failure (venture.json, the folder structure) reaches the venture.
//   per record    one bad record (a file that does not parse or does not match its schema) does not fail
//                 its package's read or check: the others come back, and the bad one is named with its fix.
//
//   node interface/boundaries.mjs check <venture dir> [--package <name>] [--json]   the boundaries, exit 1 on a failure
//   node interface/boundaries.mjs recover <venture dir> --confirm recover           rebuild a broken venture.json
//
// The router calls these through interface/writes.mjs; `mentura venture check` and `mentura <package> check`
// run them. Never calls a model.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { ventureFile } from "../packages/core/venture-paths.mjs";
import { ROOT, dataModelFile, readDataModel, readSchema, schemaFile, schemaNameOf } from "../packages/records/index.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(f, "utf8"));

// Where a JSON parse failed: line and column from the position in the message, when it gives one.
function where(text, message) {
  const m = message.match(/position (\d+)/);
  if (!m && /end of JSON input/.test(message)) return ` (at the end of the file, line ${text.split("\n").length})`;
  if (!m || /line \d+/.test(message)) return "";
  const before = text.slice(0, Number(m[1]));
  const line = before.split("\n").length, col = before.length - before.lastIndexOf("\n");
  return ` (line ${line}, column ${col})`;
}

/** Why a JSON file is broken, or null. */
export function jsonProblem(file) {
  if (!existsSync(file)) return "is missing";
  const text = readFileSync(file, "utf8");
  try { JSON.parse(text); return null; } catch (e) { return `does not parse: ${String(e.message).split("\n")[0]}${where(text, String(e.message))}`; }
}

const VENTURE_SCHEMA = () => readSchema("venture");

/** A minimal venture.json for a folder, from the schema's required fields: what recover writes. */
export function minimalVenture(dir) {
  const id = basename(dir).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "venture";
  return { id, name: id, parent: null, phase: "discovery", owner: "self", status: "active", profile: "profile.md",
    layers: Object.fromEntries(["purpose", "knowledge", "operations", "evidence", "governance", "interface"].map((l) => [l, existsSync(ventureFile(dir, l)) ? { location: `${l}/` } : false])) };
}

/**
 * The venture's global error (E-8, P-15): null when venture.json is sound, else what is wrong and
 * how to recover. Checks what the router needs before anything else runs: it parses, its required
 * fields are there, its id and phase are valid. The full schema check stays in schema/validate.py.
 */
export function ventureHealth(dir) {
  const file = join(dir, "venture.json");
  let problem = jsonProblem(file);
  if (!problem) {
    const v = load(file), s = VENTURE_SCHEMA();
    const missing = v && typeof v === "object" ? s.required.filter((k) => !(k in v)) : [];
    if (!v || typeof v !== "object" || Array.isArray(v)) problem = "is not a JSON object";
    else if (missing.length) problem = `is missing ${missing.join(", ")}`;
    else if (!new RegExp(s.properties.id.pattern).test(String(v.id))) problem = `has id ${JSON.stringify(v.id)}, which is not lowercase letters, digits and hyphens`;
    else if (!s.properties.phase.enum.includes(v.phase)) problem = `has phase ${JSON.stringify(v.phase)}, which is not one of ${s.properties.phase.enum.join(", ")}`;
    else if (typeof v.layers !== "object" || v.layers === null) problem = "has layers that are not an object";
  }
  if (!problem) return null;
  const git = spawnSync("git", ["-C", dir, "ls-files", "--error-unmatch", "venture.json"], { encoding: "utf8" }).status === 0;
  return {
    scope: "venture", file, problem: `venture.json ${problem}`,
    recovery: [
      ...(git ? [`Restore the last committed version: git -C ${dir} checkout -- venture.json`] : []),
      `Fix it by hand: it must be a JSON object with ${VENTURE_SCHEMA().required.join(", ")}`,
      `Or rebuild a minimal one, keeping the broken file in _private/: node interface/boundaries.mjs recover ${dir} --confirm recover`,
      `Then check it: python3 schema/validate.py --schema venture.schema.json --file ${file}`,
    ],
    template: minimalVenture(dir),
  };
}

// The framework files every route depends on. A broken one stops every route, so it is checked first.
function frameworkFiles() {
  const fromRoot = (f) => relative(ROOT, f);
  const fixed = [fromRoot(dataModelFile()), "schema/need-now.json", fromRoot(schemaFile("venture")), "library/packages/catalog.json", "purpose/frameworks/product-anatomy/phases.json", "purpose/strategic-foundation.json", "operations/departments.json"];
  let layers = [];
  try { layers = readDataModel().layers.map((l) => `${l}/layer.json`); } catch {}
  const pkgs = existsSync(join(repo, "library", "packages")) ? readdirSync(join(repo, "library", "packages")).map((n) => `library/packages/${n}/package.json`).filter((f) => existsSync(join(repo, f))) : [];
  return [...fixed, ...layers, "schema/layer.json", ...pkgs];
}

/** The framework's global error (E-8): null when the data model and manifests parse, else the file, the problem and how to recover. */
export function frameworkHealth() {
  for (const f of frameworkFiles()) {
    const problem = jsonProblem(join(repo, f));
    if (!problem) continue;
    return { scope: "framework", file: f, problem: `${f} ${problem}`, recovery: [
      `Restore it: git -C ${repo} checkout -- ${f}`,
      "Then check the data model and the manifests: node schema/check-data-model.mjs",
      "No venture record was touched: every route stops until the framework file parses again.",
    ] };
  }
  return null;
}

/** The answer a global error gives: an expected error with its recovery steps, never a throw. */
export function globalError(h, venture) {
  const head = h.scope === "venture" ? `${venture ?? basename(dirname(h.file))}: ${h.problem}` : `the framework is broken: ${h.problem}`;
  return { ok: false, outcome: "error", error: [head, "Recovery:", ...h.recovery.map((s, i) => `  ${i + 1}. ${s}`)].join("\n"), global_error: h };
}

/** Per-record containment (E-6): parses each item on its own; a bad one becomes an error beside the good ones. */
export function contain(items, parse, idOf = (x) => x.path) {
  const values = [], errors = {};
  for (const x of items) {
    try { values.push([x, parse(x)]); } catch (e) { errors[idOf(x.path)] = { file: x.path, error: `${x.path} does not parse: ${String(e.message ?? e).split("\n")[0]}` }; }
  }
  return { values, errors };
}

function validateFile(file, schema) {
  const p = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", schemaNameOf(schema), "--file", file], { encoding: "utf8" });
  return p.status === 0 ? null : (p.stdout + p.stderr).trim();
}

/**
 * The boundaries of a venture (E-5): the venture level first (venture.json and its folder structure),
 * then each package the venture uses, each contained. Inside a package each record is checked on its
 * own (E-6), then the package's checks run. options.only limits it to some packages.
 * @param {string} dir
 * @param {{ only?: string[] | null }} [options]
 * @returns {Promise<{ ok: boolean, reached: "venture" | "package" | null, venture: { ok: boolean, error?: string, recovery?: string[], errors?: string[], fix?: string, warnings?: any[] }, packages: { package: string, ok: boolean, error?: string, records: { record: string, route: string, file: string, ok: boolean, error?: string, fix?: { schema?: string, template?: string, skills: string[] } }[], checks: { check: string, passed: boolean, output: string }[] }[], contained?: string[], proceeds: string[] }>}
 */
export async function boundaries(dir, { only = null } = {}) {
  const { structure, checkManifest, manifest } = await import("../schema/structure.mjs");
  const { routes, glob } = await import("./router.mjs");
  const { routable } = await import("../schema/structure.mjs");
  const h = ventureHealth(dir);
  if (h) return { ok: false, reached: "venture", venture: { ok: false, error: h.problem, recovery: h.recovery }, packages: [], proceeds: [] };
  const s = structure(dir);
  const verrors = [...s.errors, ...checkManifest(dir)];
  const venture = { ok: !verrors.length, ...(verrors.length ? { errors: verrors, fix: "node schema/structure.mjs " + dir } : {}), warnings: s.warnings };
  const m = await manifest(dir);
  // Asked for by name, a package is checked whether or not the venture lists it.
  const names = only ? only.filter((n) => existsSync(join(repo, "library", "packages", n, "package.json"))) : m.packages.list.filter((p) => p.known).map((p) => p.name);
  const rs = routes().filter((r) => r.kind === "record" && r.collection !== "list");
  const out = [];
  for (const name of names) {
    // A package's failure stays in its result: an exception here is caught and reported as that package's.
    try {
      const pkg = load(join(repo, "library", "packages", name, "package.json"));
      const types = [...new Set([...(pkg.required ?? []), ...(pkg.optional ?? []), ...(pkg.records ?? [])])];
      const records = [], checks = new Set((pkg.checks ?? []).filter((c) => /^schema\/check-[a-z-]+\.mjs$/.test(c) && c !== "schema/check-data-model.mjs" && existsSync(join(repo, c))));
      for (const t of types) {
        const r = rs.find((x) => x.record === t);
        if (!r) continue;
        for (const c of r.checks ?? []) checks.add(c);
        const pats = r.files;
        const hits = files(dir).filter((f) => pats.some((g) => glob(g).test(f) && routable(f, g)));
        for (const f of hits) {
          const problem = f.endsWith(".json") ? jsonProblem(ventureFile(dir, f)) ?? (r.schema ? validateFile(ventureFile(dir, f), r.schema) : null) : null;
          records.push({ record: t, route: r.collection === "item" ? r.route.replace("[id]", starOf(f, pats) ?? basename(f)) : r.route, file: f, ok: !problem,
            ...(problem ? { error: problem, fix: { schema: r.schema, template: r.template, skills: pkg.skill?.path ? [pkg.skill.path] : [] } } : {}) });
        }
      }
      const ran = [...checks].map((c) => { const p = spawnSync("node", [join(repo, c), dir], { encoding: "utf8" }); return { check: c, passed: p.status === 0, output: (p.stdout + p.stderr).trim().split("\n").slice(-5).join("\n") }; });
      const ok = records.every((x) => x.ok) && ran.every((x) => x.passed);
      out.push({ package: name, ok, records, checks: ran });
    } catch (e) {
      out.push({ package: name, ok: false, error: `uncaught in ${name}: ${String(e.message ?? e).split("\n")[0]}`, records: [], checks: [] });
    }
  }
  const failed = out.filter((p) => !p.ok).map((p) => p.package);
  return { ok: venture.ok && !failed.length, reached: !venture.ok ? "venture" : failed.length ? "package" : null, venture, packages: out, contained: failed, proceeds: out.filter((p) => p.ok).map((p) => p.package) };
}

// The id a collection pattern's one star matches in a file (customers/[id].json, accounts/[id]/account.json).
export function starOf(file, patterns) {
  for (const g of patterns) {
    if (!g.includes("*") || g.includes("**")) continue;
    const m = file.match(new RegExp("^" + g.split("*").map((x) => x.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$"));
    if (m) return m[1];
  }
  return null;
}

// A venture's files, skipping dot folders, nested ventures and the root's private folders (as the router does).
function files(d, base = d) {
  return existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith(".") ? [] : e.isDirectory()
    ? (existsSync(join(d, e.name, "venture.json")) || (d === base && e.name.startsWith("_")) ? [] : files(join(d, e.name), base)) : [join(d, e.name).slice(base.length + 1)]) : [];
}

/** Rebuilds a broken venture.json (E-8): the broken file moves to _private/, and a minimal one takes its place. */
export function recover(dir) {
  const h = ventureHealth(dir);
  if (!h) return { ok: true, result: "venture.json is sound: nothing to recover" };
  const kept = join("_private", `venture.json.broken-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  if (existsSync(join(dir, "venture.json"))) { mkdirSync(join(ventureFile(dir, "_private")), { recursive: true }); renameSync(join(dir, "venture.json"), ventureFile(dir, kept)); }
  writeFileSync(join(dir, "venture.json"), JSON.stringify(minimalVenture(dir), null, 2) + "\n");
  return { ok: true, result: { written: "venture.json", kept: existsSync(ventureFile(dir, kept)) ? kept : null, note: "a minimal venture.json: copy back what you need from the kept file, then check it" } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, dir] = process.argv.slice(2);
  const opt = (n) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
  if (!["check", "recover"].includes(cmd) || !dir || !existsSync(dir)) { console.error("usage: node interface/boundaries.mjs check <venture dir> [--package <name>] [--json] | recover <venture dir> --confirm recover"); process.exit(2); }
  if (cmd === "recover") {
    if (opt("confirm") !== "recover") { console.error("recover rewrites venture.json: pass --confirm recover"); process.exit(1); }
    const r = recover(dir);
    console.log(typeof r.result === "string" ? r.result : JSON.stringify(r.result, null, 2));
    process.exit(0);
  }
  const fw = frameworkHealth();
  if (fw) { console.error(globalError(fw).error); process.exit(1); }
  const b = await boundaries(dir, { only: opt("package") ? [opt("package")] : null });
  if (process.argv.includes("--json")) console.log(JSON.stringify(b, null, 2));
  else {
    console.log(`venture: ${b.venture.ok ? "ok" : `failed: ${(b.venture.errors ?? [b.venture.error]).join("; ")}`}`);
    for (const p of b.packages) console.log(`${p.package.padEnd(14)} ${p.ok ? "ok" : `contained: ${[p.error, ...p.records.filter((x) => !x.ok).map((x) => `${x.file} ${x.error.split("\n")[0]}`), ...p.checks.filter((x) => !x.passed).map((x) => `${x.check} failed`)].filter(Boolean).join("; ")}`}`);
  }
  process.exit(b.ok ? 0 : 1);
}
