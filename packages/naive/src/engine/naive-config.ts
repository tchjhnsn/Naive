// naive.config.json (P-2, like next.config.js): a venture's overrides to Naive's defaults. Every
// field is optional; what a venture leaves out keeps the default here. The file holds the gate's
// static rules (X-3, X-5, X-6), function owners (X-2), check settings (P-7, like
// eslint.config.mjs), thresholds, which System 1 questions run, pinned package versions (U-4) and
// how strictly the acting role is checked (M-18). Shape: packages/naive/src/records/naive-config.schema.json. Checked
// by node packages/naive/src/checks/check-config.ts <venture dir>.
//
// Reading the config never calls a model or the network: it is files only, so the gate can read it
// on every write.

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { line } from "./detectors.ts";
import type { NaiveConfig, NaiveConfigRule } from "../records/types/records.d.ts";

/** The resolved config: naive.config.json over the defaults, so the sections the defaults hold are always there. */
export type ResolvedConfig = NaiveConfig & Required<Pick<NaiveConfig, "gate" | "owners" | "checks" | "thresholds" | "questions" | "packages" | "acting">>;
/** A venture package as written (packages/naive/library/packages/<name>/package.json, which has no schema), and as
 *  packageDefs gives it, with its folder and version. */
export type PackageFile = {
  name: string; version?: string; department?: string; required?: string[]; optional?: string[]; records?: string[];
  gate_rules?: NaiveConfigRule[]; [key: string]: unknown;
};
export type PackageDef = PackageFile & { folder: string; version: string };
/** One pinned package version (U-4). */
/** A pin in its object form, as naive-config.schema.json allows it. */
export type Pin = Exclude<NonNullable<NaiveConfig["packages"]>[string], string>;

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
export const CONFIG = "naive.config.json";

/** The defaults a venture overrides. Arrays and scalars are replaced; objects are merged key by key. */
export const DEFAULTS = Object.freeze({
  gate: { fail_closed: [], rules: [], packages: true, variants: false },
  owners: {},
  checks: { off: [], warn: [] },
  thresholds: { confidence: 0.7, "idea-map": load(join(repo, "packages/naive/src/functions/strategy/frameworks/idea-map/conventions.json")).threshold },
  questions: {},
  packages: {},
  acting: { unknown_roles: "allow" },
} satisfies NaiveConfig);

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
function merge(base: unknown, over: unknown): unknown {
  if (!isObj(base) || !isObj(over)) return over === undefined ? structuredClone(base) : structuredClone(over);
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? merge(base[k], v) : structuredClone(v);
  return out;
}

/** The venture's naive.config.json as written, or {} when it has none. A file that is not JSON throws, naming the file. */
export const namedPerson = (setBy: unknown): boolean =>
  typeof setBy === "object" && setBy !== null && "person" in setBy && typeof setBy.person === "string" && setBy.person.trim() !== "";

export function rawConfig(dir: string | undefined): NaiveConfig {
  const f = dir && ventureFile(dir, CONFIG);
  if (!f || !existsSync(f)) return {};
  try { return load(f); } catch (e) { throw new Error(`${CONFIG} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`); }
}

/** The thresholds a detector holds (packages/naive/src/engine/detectors.ts): threshold name to detector id. */
export const DETECTOR_THRESHOLDS = Object.freeze({ confidence: "gate-confidence", "idea-map": "idea-map-tag" });

/**
 * The resolved config: the defaults with the venture's overrides on top. A threshold a detector holds is, in order,
 * the venture's naive.config.json thresholds, its governance/detectors/<id>.json, Naive's shipped detector, then
 * the default here.
 */
export function configFor(dir: string | undefined): ResolvedConfig {
  const raw = rawConfig(dir);
  const c = merge(DEFAULTS, raw) as ResolvedConfig;
  for (const [name, id] of Object.entries(DETECTOR_THRESHOLDS))
    if (typeof raw.thresholds?.[name] !== "number") c.thresholds[name] = line(dir, id, c.thresholds[name]);
  return c;
}

/** A threshold by name, from the config, else the fallback. */
export function threshold<F>(config: NaiveConfig | null | undefined, name: string, fallback: F): number | F {
  const t = config?.thresholds?.[name];
  return typeof t === "number" ? t : fallback;
}

/** Check settings (P-7): each check with its mode, run, warn or off. */
export function checksFor(config: NaiveConfig | null | undefined, checks: string[]) {
  const off = new Set(config?.checks?.off ?? []), warn = new Set(config?.checks?.warn ?? []);
  return checks.map((check) => ({ check, mode: off.has(check) ? "off" : warn.has(check) ? "warn" : "run" }));
}

// A question's kind is its key before the colon (dept.legal:i-01 is dept.legal). A pattern may end in *.
export const questionKind = (key: string) => key.split(":")[0];
const kindMatches = (pattern: string, kind: string) => pattern.endsWith("*") ? kind.startsWith(pattern.slice(0, -1)) : kind === pattern;

/** Whether a System 1 question runs, for a framework (idea-map). */
export function questionOn(config: NaiveConfig | null | undefined, framework: string, key: string) {
  return !(config?.questions?.[framework]?.off ?? []).some((p) => kindMatches(p, questionKind(key)));
}

/** A System 1 request ({ state, model, questions }) with the questions the config turns off left out. */
export function questionsFor<Q extends { questions?: object }>(request: Q, config: NaiveConfig | null | undefined, framework: string) {
  const questions = Object.fromEntries(Object.entries(request.questions ?? {}).filter(([k]) => questionOn(config, framework, k)));
  const off = Object.keys(request.questions ?? {}).length - Object.keys(questions).length;
  return { ...request, questions, ...(off ? { questions_off: off } : {}) };
}

/** System 1 answers limited to the questions that run (an answer to a question turned off is ignored). */
export function answersFor<T>(answers: Record<string, T> | null | undefined, config: NaiveConfig | null | undefined, framework: string): Record<string, T> {
  return Object.fromEntries(Object.entries(answers ?? {}).filter(([k]) => questionOn(config, framework, k)));
}

// Package definitions, read once per process: they are framework files and do not change under a running gate.
let pkgCache: PackageDef[] | null = null;
export function packageDefs(): PackageDef[] {
  if (pkgCache) return pkgCache;
  const dir = join(repo, "packages/naive/library", "packages");
  const catalog: { version?: string } = existsSync(join(dir, "catalog.json")) ? load(join(dir, "catalog.json")) : {};
  pkgCache = existsSync(dir) ? readdirSync(dir).filter((n) => existsSync(join(dir, n, "package.json"))).sort().map((n) => {
    const p: PackageFile = load(join(dir, n, "package.json"));
    // A package without its own version is versioned with the catalog it ships in.
    return { ...p, folder: n, version: p.version ?? catalog.version ?? "0.0.0" };
  }) : [];
  return pkgCache;
}

/** Installed package versions: name to version. */
export function installed(): Record<string, string> {
  return Object.fromEntries(packageDefs().map((p) => [p.name, p.version]));
}

/** The packages that hold a record type: its home (required or optional) first, then any that lists it in records. */
export function packagesOf(recordType: string | null | undefined): PackageDef[] {
  if (!recordType) return [];
  const defs = packageDefs();
  const home = defs.filter((p) => [...(p.required ?? []), ...(p.optional ?? [])].includes(recordType));
  const listed = defs.filter((p) => (p.records ?? []).includes(recordType) && !home.includes(p));
  return [...home, ...listed];
}

/** The function (department) a record type belongs to: its home package's department. */
export function functionOf(recordType: string | null | undefined): string | null {
  return packagesOf(recordType).find((p) => p.department)?.department ?? null;
}

/** Pins that do not match what is installed: { package, pinned, installed } (installed null for an unknown package). */
export function pinProblems(config: NaiveConfig | null | undefined) {
  const have = installed();
  return Object.entries(pins(config ?? {})).filter(([n, v]) => have[n] !== v.version).map(([n, v]) => ({ package: n, pinned: v.version, installed: have[n] ?? null }));
}

/** The pins that block a write to a record type: its packages pinned to a version other than the installed one. */
export function pinsBlocking(config: NaiveConfig | null | undefined, recordType: string | null | undefined) {
  const bad = new Map(pinProblems(config).map((p) => [p.package, p]));
  return packagesOf(recordType).map((p) => bad.get(p.name)).filter((p) => p !== undefined);
}

// A venture's naive.config.json (EE-073): the framework's defaults, overridden for one venture.
// The gate reads `gate` (packages/naive/src/engine/gate.ts). Upgrades read and write the pins (EE-076, U-1 to U-5):
//
//   naive      { version, channel }   the framework version the venture is on, and its channel
//                                     (stable, or canary for experimental packages)
//   packages   { <name>: { version, early?, channel? } }   the package versions it is pinned to; early
//                                     marks a later phase's package adopted before its phase. A bare
//                                     version string ("0.3.0") is read as { version }.
//   triggers   [ ... ]                what starts the next step on an event (packages/naive/src/router/orchestration/triggers.ts)
//   kits       [ <name> ]             Mentura kits whose automations this venture turns on
//
// Every other key is kept as it is. Nothing here calls a model or the network.

/** The venture's naive.config.json, or {} when it has none. A file that is not JSON throws. */
export function readConfig(dir: string): NaiveConfig {
  const f = ventureFile(dir, CONFIG);
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { throw new Error(`${CONFIG} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`); }
}

/** Writes the config back, keys in a stable order: naive, packages, kits, triggers, gate, then the rest. */
export function writeConfig(dir: string, cfg: NaiveConfig): NaiveConfig {
  const order = ["naive", "packages", "kits", "triggers", "gate"];
  const fields: Record<string, unknown> = cfg;
  const out = Object.fromEntries([...order.filter((k) => fields[k] !== undefined).map((k) => [k, fields[k]]), ...Object.entries(cfg).filter(([k]) => !order.includes(k))]);
  writeFileSync(ventureFile(dir, CONFIG), JSON.stringify(out, null, 2) + "\n");
  return out;
}

/** The pinned packages as { name: { version, early, channel } }. */
export function pins(cfg: NaiveConfig): Record<string, Pin> {
  return Object.fromEntries(Object.entries(cfg.packages ?? {}).map(([k, v]): [string, Pin] => [k, typeof v === "string" ? { version: v } : { ...v }]));
}

/** The names of the packages adopted early (U-5): open now whatever their phase prior says. */
export function adopted(dir: string): Set<string> {
  try { return new Set(Object.entries(pins(readConfig(dir))).filter(([, p]) => p.early).map(([k]) => k)); }
  catch { return new Set(); }
}
