// naive.config.json (P-2, like next.config.js): a venture's overrides to Naive's defaults. Every
// field is optional; what a venture leaves out keeps the default here. The file holds the gate's
// static rules (X-3, X-5, X-6), function owners (X-2), check settings (P-7, like
// eslint.config.mjs), thresholds, which System 1 questions run, pinned package versions (U-4) and
// how strictly the acting role is checked (M-18). Shape: packages/naive/src/records/naive-config.schema.json. Checked
// by node packages/naive/src/checks/check-config.mjs <venture dir>.
//
// Reading the config never calls a model or the network: it is files only, so the gate can read it
// on every write.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const CONFIG = "naive.config.json";

/** The defaults a venture overrides. Arrays and scalars are replaced; objects are merged key by key. */
export const DEFAULTS = Object.freeze({
  gate: { fail_closed: [], rules: [], packages: true, variants: false },
  owners: {},
  checks: { off: [], warn: [] },
  thresholds: { confidence: 0.7, "idea-map": load(join(repo, "purpose/frameworks/idea-map/conventions.json")).threshold },
  questions: {},
  packages: {},
  acting: { unknown_roles: "allow" },
});

const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? structuredClone(base) : structuredClone(over);
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? merge(base[k], v) : structuredClone(v);
  return out;
}

/** The venture's naive.config.json as written, or {} when it has none. A file that is not JSON throws, naming the file. */
export const namedPerson = (setBy) => typeof setBy?.person === "string" && setBy.person.trim() !== "";

export function rawConfig(dir) {
  const f = dir && ventureFile(dir, CONFIG);
  if (!f || !existsSync(f)) return {};
  try { return load(f); } catch (e) { throw new Error(`${CONFIG} is not valid JSON: ${e.message}`); }
}

/** The resolved config: the defaults with the venture's overrides on top. */
export function configFor(dir) {
  return merge(DEFAULTS, rawConfig(dir));
}

/** A threshold by name, from the config, else the fallback. */
export function threshold(config, name, fallback) {
  const t = config?.thresholds?.[name];
  return typeof t === "number" ? t : fallback;
}

/** Check settings (P-7): each check with its mode, run, warn or off. */
export function checksFor(config, checks) {
  const off = new Set(config?.checks?.off ?? []), warn = new Set(config?.checks?.warn ?? []);
  return checks.map((check) => ({ check, mode: off.has(check) ? "off" : warn.has(check) ? "warn" : "run" }));
}

// A question's kind is its key before the colon (dept.legal:i-01 is dept.legal). A pattern may end in *.
export const questionKind = (key) => key.split(":")[0];
const kindMatches = (pattern, kind) => pattern.endsWith("*") ? kind.startsWith(pattern.slice(0, -1)) : kind === pattern;

/** Whether a System 1 question runs, for a framework (idea-map). */
export function questionOn(config, framework, key) {
  return !(config?.questions?.[framework]?.off ?? []).some((p) => kindMatches(p, questionKind(key)));
}

/** A System 1 request ({ state, model, questions }) with the questions the config turns off left out. */
export function questionsFor(request, config, framework) {
  const questions = Object.fromEntries(Object.entries(request.questions ?? {}).filter(([k]) => questionOn(config, framework, k)));
  const off = Object.keys(request.questions ?? {}).length - Object.keys(questions).length;
  return { ...request, questions, ...(off ? { questions_off: off } : {}) };
}

/** System 1 answers limited to the questions that run (an answer to a question turned off is ignored). */
export function answersFor(answers, config, framework) {
  return Object.fromEntries(Object.entries(answers ?? {}).filter(([k]) => questionOn(config, framework, k)));
}

// Package definitions, read once per process: they are framework files and do not change under a running gate.
let pkgCache = null;
export function packageDefs() {
  if (pkgCache) return pkgCache;
  const dir = join(repo, "library", "packages");
  const catalog = existsSync(join(dir, "catalog.json")) ? load(join(dir, "catalog.json")) : {};
  pkgCache = existsSync(dir) ? readdirSync(dir).filter((n) => existsSync(join(dir, n, "package.json"))).sort().map((n) => {
    const p = load(join(dir, n, "package.json"));
    // A package without its own version is versioned with the catalog it ships in.
    return { ...p, folder: n, version: p.version ?? catalog.version ?? "0.0.0" };
  }) : [];
  return pkgCache;
}

/** Installed package versions: name to version. */
export function installed() {
  return Object.fromEntries(packageDefs().map((p) => [p.name, p.version]));
}

/** The packages that hold a record type: its home (required or optional) first, then any that lists it in records. */
export function packagesOf(recordType) {
  if (!recordType) return [];
  const defs = packageDefs();
  const home = defs.filter((p) => [...(p.required ?? []), ...(p.optional ?? [])].includes(recordType));
  const listed = defs.filter((p) => (p.records ?? []).includes(recordType) && !home.includes(p));
  return [...home, ...listed];
}

/** The function (department) a record type belongs to: its home package's department. */
export function functionOf(recordType) {
  return packagesOf(recordType).find((p) => p.department)?.department ?? null;
}

/** Pins that do not match what is installed: { package, pinned, installed } (installed null for an unknown package). */
export function pinProblems(config) {
  const have = installed();
  return Object.entries(pins(config ?? {})).filter(([n, v]) => have[n] !== v.version).map(([n, v]) => ({ package: n, pinned: v.version, installed: have[n] ?? null }));
}

/** The pins that block a write to a record type: its packages pinned to a version other than the installed one. */
export function pinsBlocking(config, recordType) {
  const bad = new Map(pinProblems(config).map((p) => [p.package, p]));
  return packagesOf(recordType).map((p) => bad.get(p.name)).filter(Boolean);
}

// A venture's naive.config.json (EE-073): the framework's defaults, overridden for one venture.
// The gate reads `gate` (packages/naive/src/engine/gate.mjs). Upgrades read and write the pins (EE-076, U-1 to U-5):
//
//   naive      { version, channel }   the framework version the venture is on, and its channel
//                                     (stable, or canary for experimental packages)
//   packages   { <name>: { version, early?, channel? } }   the package versions it is pinned to; early
//                                     marks a later phase's package adopted before its phase. A bare
//                                     version string ("0.3.0") is read as { version }.
//   triggers   [ ... ]                what starts the next step on an event (packages/naive/src/router/orchestration/triggers.mjs)
//   kits       [ <name> ]             Mentura kits whose automations this venture turns on
//
// Every other key is kept as it is. Nothing here calls a model or the network.

/** The venture's naive.config.json, or {} when it has none. A file that is not JSON throws. */
export function readConfig(dir) {
  const f = ventureFile(dir, CONFIG);
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { throw new Error(`${CONFIG} is not valid JSON: ${e.message}`); }
}

/** Writes the config back, keys in a stable order: naive, packages, kits, triggers, gate, then the rest. */
export function writeConfig(dir, cfg) {
  const order = ["naive", "packages", "kits", "triggers", "gate"];
  const out = Object.fromEntries([...order.filter((k) => cfg[k] !== undefined).map((k) => [k, cfg[k]]), ...Object.entries(cfg).filter(([k]) => !order.includes(k))]);
  writeFileSync(ventureFile(dir, CONFIG), JSON.stringify(out, null, 2) + "\n");
  return out;
}

/** The pinned packages as { name: { version, early, channel } }. */
export function pins(cfg) {
  return Object.fromEntries(Object.entries(cfg.packages ?? {}).map(([k, v]) => [k, typeof v === "string" ? { version: v } : { ...v }]));
}

/** The names of the packages adopted early (U-5): open now whatever their phase prior says. */
export function adopted(dir) {
  try { return new Set(Object.entries(pins(readConfig(dir))).filter(([, p]) => p.early).map(([k]) => k)); }
  catch { return new Set(); }
}
