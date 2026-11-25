// Checks APQC's Process Classification Framework as Naive carries it, packages/naive/src/functions/pcf.json (EE-165).
//
//   node packages/naive/src/checks/check-pcf.ts [--json]
//
// It fails when:
//   - the file does not match pcf.schema.json;
//   - the attribution is empty or does not name APQC, or the source is not an id in any
//     packages/naive/src/records/layers/<layer>/references/references.json;
//   - a hierarchy id is listed twice;
//   - an element's level does not agree with its hierarchy id (a category is N.0, and below it a level has as many
//     parts as its number);
//   - an element's parent is missing (a process group's is its category N.0, every other element's is its id less
//     the last part);
//   - the children of a category, an element or the framework itself are not numbered 1 to n with no gap;
//   - there are not exactly 13 categories;
//   - the tool catalog drifts from it: a process group in packages/naive/src/functions/tools.json is not a level 2
//     element here, its name or element id differs from APQC's, or a level 2 element here is not in tools.json.
// Element ids are not required to be unique, because APQC files a few elements at two hierarchy ids (PCF 8.0 has
// four: 19950, 19951, 14197 and 10530).
// --json prints the counts per level and per category, and tool_catalog_drift, the same drift as data (empty when
// the check passes).
//
// It reads files through VentureFs (EE-125). Findings exit 1; pcf.json, tools.json or a references file that cannot be
// read exits 2.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { validateValue } from "../records/validate.ts";
import type { Pcf, ToolCatalog } from "../records/types/records.d.ts";
import { referenceIds } from "./check-activities.ts";

// EE_ROOT points the check at another copy of the repository (used by check-pcf-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
export const PCF = "packages/naive/src/functions/pcf.json";
const TOOLS = "packages/naive/src/functions/tools.json";
const CATEGORIES = 13;
const LEVELS = ["categories", "process groups", "processes", "activities", "tasks"] as const;

type Element = Pcf["elements"][number];
type Group = ToolCatalog["process_groups"][number];
/** One process group where tools.json and pcf.json disagree. */
export type Drift =
  | { id: string; kind: "missing"; tools: { name: string; pcf?: number } }
  | { id: string; kind: "differs"; fields: ("name" | "pcf")[]; tools: { name: string; pcf?: number }; pcf: { name: string; pcf: number } }
  | { id: string; kind: "not-in-tools"; pcf: { name: string; pcf: number } };

const schemaErrors = (value: unknown): string[] => {
  const v = validateValue("pcf.schema.json", value);
  return v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
};
const isCategory = (id: string) => /^\d+\.0$/.test(id);
/** The level a hierarchy id stands for: 1 for N.0, otherwise its number of parts. */
const depth = (id: string) => (isCategory(id) ? 1 : id.split(".").length);
/** The hierarchy id of an element's parent, or null for a category. */
const parentOf = (id: string): string | null => {
  if (isCategory(id)) return null;
  const parts = id.split(".");
  return parts.length === 2 ? `${parts[0]}.0` : parts.slice(0, -1).join(".");
};
const lastPart = (id: string) => Number(isCategory(id) ? id.split(".")[0] : id.split(".").at(-1));

/** Every finding for a PCF file that already matches its schema. Pure, so the test can call it on copies. */
export function pcfErrors(pcf: Pcf, references: Set<string>): string[] {
  const out: string[] = [];
  if (!pcf.attribution.trim()) out.push("attribution is empty; APQC's licence requires its attribution in every copy");
  else if (!pcf.attribution.includes("APQC")) out.push("attribution does not name APQC; it must be the attribution APQC's licence gives, verbatim");
  if (!references.has(pcf.source)) out.push(`source ${pcf.source} is not a reference id in packages/naive/src/records/layers/<layer>/references/references.json`);

  const ids = new Set<string>();
  for (const e of pcf.elements) { if (ids.has(e.id)) out.push(`hierarchy id ${e.id} is listed twice`); ids.add(e.id); }

  const children = new Map<string, number[]>();
  for (const e of pcf.elements) {
    if (depth(e.id) !== e.level) out.push(`${e.id} is level ${e.level}, but its hierarchy id is level ${depth(e.id)}`);
    const parent = parentOf(e.id);
    if (parent !== null && !ids.has(parent)) out.push(`${e.id} has no parent: ${parent} is not in the file`);
    const key = parent ?? "the framework";
    children.set(key, [...(children.get(key) ?? []), lastPart(e.id)]);
  }
  for (const [parent, numbers] of children) {
    const have = new Set(numbers);
    const missing = Array.from({ length: Math.max(...numbers) }, (_, i) => i + 1).filter((k) => !have.has(k));
    if (missing.length) out.push(`the children of ${parent} skip ${missing.join(", ")}: siblings are numbered 1 to n with no gap`);
  }
  const categories = pcf.elements.filter((e) => e.level === 1).length;
  if (categories !== CATEGORIES) out.push(`there are ${categories} categories; the PCF has ${CATEGORIES}`);
  return out;
}

/** The number of elements at each level, overall and per category. */
export const counts = (pcf: Pcf) => {
  const byLevel = (es: Element[], from: number) => Object.fromEntries(LEVELS.slice(from - 1).map((name, i) => [name, es.filter((e) => e.level === from + i).length]));
  return {
    levels: byLevel(pcf.elements, 1),
    categories: pcf.elements.filter((e) => e.level === 1).map((c) => {
      const n = c.id.split(".")[0];
      return { id: c.id, name: c.name, ...byLevel(pcf.elements.filter((e) => e.id.split(".")[0] === n), 2) };
    }),
  };
};

/** Where the tool catalog's process groups disagree with this PCF's level 2, in tools.json's order, then the groups tools.json lacks. */
export function toolCatalogDrift(pcf: Pcf, groups: Group[]): Drift[] {
  const level2 = new Map(pcf.elements.filter((e) => e.level === 2).map((e) => [e.id, e]));
  const out: Drift[] = [];
  for (const g of groups) {
    const tools = { name: g.name, ...(g.pcf === undefined ? {} : { pcf: g.pcf }) };
    const e = level2.get(g.id);
    if (!e) { out.push({ id: g.id, kind: "missing", tools }); continue; }
    const fields = [...(g.name !== e.name ? ["name" as const] : []), ...(g.pcf !== e.pcf ? ["pcf" as const] : [])];
    if (fields.length) out.push({ id: g.id, kind: "differs", fields, tools, pcf: { name: e.name, pcf: e.pcf } });
  }
  const known = new Set(groups.map((g) => g.id));
  for (const e of level2.values()) if (!known.has(e.id)) out.push({ id: e.id, kind: "not-in-tools", pcf: { name: e.name, pcf: e.pcf } });
  return out;
}

/** A drift entry as a finding. */
export const driftError = (d: Drift): string =>
  d.kind === "missing" ? `${TOOLS}: process group ${d.id} (${d.tools.name}) is not a level 2 element of ${PCF}`
    : d.kind === "not-in-tools" ? `${TOOLS}: process group ${d.id} (${d.pcf.name}) of ${PCF} is missing`
      : `${TOOLS}: process group ${d.id} differs from ${PCF} in ${d.fields.join(" and ")}: APQC has ${JSON.stringify(d.pcf.name)}, element id ${d.pcf.pcf}`;

const read = (file: string) => readJson(join(root, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** Reads pcf.json, the tool catalog and the references, and checks the PCF. */
export const checkPcf = Effect.gen(function* () {
  const raw = yield* read(PCF);
  const tools = (yield* read(TOOLS)) as ToolCatalog;
  const references = yield* referenceIds;
  const bad = schemaErrors(raw);
  if (bad.length) return { errors: bad.map((e) => `${PCF}: ${e}`), pcf: null, groups: tools.process_groups ?? [] };
  const pcf = raw as Pcf;
  return { errors: pcfErrors(pcf, references).map((e) => `${PCF}: ${e}`), pcf, groups: tools.process_groups ?? [] };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const json = process.argv.includes("--json");
  await runMain(Effect.map(checkPcf, ({ errors, pcf, groups }) => {
    const drift = pcf ? toolCatalogDrift(pcf, groups) : [];
    errors.push(...drift.map(driftError));
    if (json && pcf) console.log(JSON.stringify({ ok: !errors.length, errors, version: pcf.version, edition: pcf.edition, ...counts(pcf), tool_catalog_drift: drift }, null, 2));
    if (errors.length) { if (!json) for (const e of errors) console.error(`FAIL  ${e}`); process.exitCode = 1; return; }
    if (json || !pcf) return;
    const { levels } = counts(pcf);
    console.log(`PCF ${pcf.version} ${pcf.edition}: ${LEVELS.map((l) => `${levels[l]} ${l}`).join(", ")}. The tool catalog's process groups match it.`);
  }));
}
