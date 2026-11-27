// Checks the document catalog, packages/naive/src/functions/documents.json (EE-218), and a venture's own rendered
// documents against the ladder.
//
//   node packages/naive/src/checks/check-documents.ts [<venture dir>...] [--json]
//
// The catalog fails when:
//   - it does not match document-catalog.schema.json;
//   - a format, rule, rung, kind or a section inside one kind is listed twice;
//   - the ladder is not one chain: no single first rung (after null), an `after` that names no rung, a cycle, or a
//     rung no chain reaches;
//   - a format's rung is not a rung, a rung's format is not a format, or the two disagree about each other;
//   - the first rung has no format Naive renders itself, so a reading copy could not be written in house;
//   - a rule names a format the catalog lacks, or names one in both `then` and `not`;
//   - a kind's function is not in departments.json, its artifact_kind is not one artifact.schema.json lists, its
//     highest_rung is not reachable, or one of its formats sits on a rung off that climb;
//   - a kind's section reads a path no venture record type in the data model matches;
//   - a rung requires a record path no record type matches, or a decision class no function's decisions.json has.
//
// A venture fails when a document artifact (one with document_kind) sits on a rung whose rung below is missing or has
// no approved_by: the ladder is fail closed, a printable reading copy a person approved comes before any interactive
// page and the page before the live site. It never fails because a person approved something a rule pointed away
// from: the rules are the catalog's opinion and a person decides.
//
// It reads files through VentureFs (EE-125). Findings exit 1; a file that cannot be read exits 2.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { globRegExp, venturePaths } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { climbTo, firstRung } from "../engine/documents.ts";
import type { Artifact, DataModel, DocumentCatalog } from "../records/types/records.d.ts";

// EE_ROOT points the check at another copy of the repository (used by check-documents-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
export const CATALOG = "packages/naive/src/functions/documents.json";
export const DEPARTMENTS = "packages/naive/src/functions/departments.json";
export const DATA_MODEL = "packages/naive/src/records/data-model.json";
export const ARTIFACT_SCHEMA = "packages/naive/src/records/artifact.schema.json";
export const FUNCTIONS = "packages/naive/src/functions";

/** What the catalog is checked against: the ids and globs it may name. */
export type Known = { functions: Set<string>; artifactKinds: Set<string>; recordGlobs: RegExp[]; classes: Set<string> };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const matchesARecord = (known: Known, path: string) => known.recordGlobs.some((g) => g.test(path));

/** Every finding for a catalog that already matches its schema. Pure, so the test can call it on copies. */
export function catalogErrors(c: DocumentCatalog, known: Known): string[] {
  const out: string[] = [];
  const twice = (what: string, xs: string[]) => {
    const seen = new Set<string>();
    for (const x of xs) { if (seen.has(x)) out.push(`${what} ${x} is listed twice`); seen.add(x); }
  };
  twice("format", c.formats.map((f) => f.id));
  twice("rule", c.rules.map((r) => r.id));
  twice("rung", c.ladder.rungs.map((r) => r.id));
  twice("kind", c.kinds.map((k) => k.id));

  const formats = new Set(c.formats.map((f) => f.id));
  const rungs = new Set(c.ladder.rungs.map((r) => r.id));

  // The ladder is one chain: one first rung, every `after` a rung, no cycle, every rung reached.
  const first = firstRung(c);
  if (!first) out.push(`the ladder has ${c.ladder.rungs.filter((r) => r.after === null).length} rungs with no rung below them, not one`);
  for (const r of c.ladder.rungs) {
    if (r.after !== null && !rungs.has(r.after)) out.push(`rung ${r.id} comes after ${r.after}, which is not a rung`);
    else if (!climbTo(c, r.id).length) out.push(`rung ${r.id} does not reach the first rung: the ladder has a cycle or a broken link`);
    for (const f of r.formats) if (!formats.has(f)) out.push(`rung ${r.id} lists the format ${f}, which the catalog lacks`);
    for (const path of r.requires?.records ?? []) if (!matchesARecord(known, path)) out.push(`rung ${r.id} requires the record ${path}, which no venture record type in ${DATA_MODEL} matches`);
    for (const cls of r.requires?.decisions ?? []) if (!known.classes.has(cls)) out.push(`rung ${r.id} requires a decision of class ${cls}, which no function's decisions.json has`);
  }
  for (const f of c.formats) {
    if (!rungs.has(f.rung)) out.push(`format ${f.id} sits on the rung ${f.rung}, which is not a rung`);
    else if (!c.ladder.rungs.find((r) => r.id === f.rung)?.formats.includes(f.id)) out.push(`format ${f.id} says it sits on ${f.rung}, which does not list it`);
  }
  if (first && !c.formats.some((f) => f.rung === first.id && f.renderer === "naive"))
    out.push(`the first rung ${first.id} has no format Naive renders itself, so no reading copy could be written in house`);

  for (const r of c.rules) {
    for (const f of [...r.then, ...(r.not ?? [])]) if (!formats.has(f)) out.push(`rule ${r.id} names the format ${f}, which the catalog lacks`);
    for (const f of r.then) if ((r.not ?? []).includes(f)) out.push(`rule ${r.id} both points to ${f} and rules it out`);
  }

  for (const k of c.kinds) {
    const at = `kind ${k.id}`;
    twice(`${at} section`, k.sections.map((s) => s.id));
    if (!known.functions.has(k.function)) out.push(`${at} belongs to the function ${k.function}, which ${DEPARTMENTS} does not list`);
    if (!known.artifactKinds.has(k.artifact_kind)) out.push(`${at} is an artifact of kind ${k.artifact_kind}, which ${ARTIFACT_SCHEMA} does not list`);
    const climb = climbTo(c, k.highest_rung);
    if (!climb.length) out.push(`${at} climbs to ${k.highest_rung}, which is not a rung the ladder reaches`);
    else {
      const reachable = new Set(climb.map((r) => r.id));
      for (const f of k.formats) {
        const on = c.formats.find((x) => x.id === f)?.rung;
        if (on && !reachable.has(on)) out.push(`${at} is made as ${f}, which sits on ${on}, a rung off its climb to ${k.highest_rung}`);
      }
      if (!k.formats.some((f) => reachable.has(c.formats.find((x) => x.id === f)?.rung ?? "")
        && c.formats.find((x) => x.id === f)?.rung === climb[0].id)) out.push(`${at} has no format on the first rung, so it would skip the reading copy`);
    }
    for (const s of k.sections) if (!matchesARecord(known, s.from)) out.push(`${at} section ${s.id} reads ${s.from}, which no venture record type in ${DATA_MODEL} matches`);
  }
  return out;
}

/** A document artifact as the ladder check reads it. */
export type Document = { file: string; kind: string; format: string; approved_by?: string };

/**
 * Every finding for one venture's document artifacts: a document on a rung whose rung below is missing or
 * unapproved. Pure, so the test can call it on a list.
 */
export function ladderErrors(c: DocumentCatalog, venture: string, docs: Document[]): string[] {
  const out: string[] = [];
  const rungOf = (format: string) => c.formats.find((f) => f.id === format)?.rung ?? null;
  for (const d of docs) {
    const kind = c.kinds.find((k) => k.id === d.kind);
    if (!kind) { out.push(`${venture}: ${d.file} is a ${d.kind}, which the catalog has no kind for`); continue; }
    const on = rungOf(d.format);
    if (!on) { out.push(`${venture}: ${d.file} is a ${d.format}, which the catalog has no format for`); continue; }
    const climb = climbTo(c, on);
    for (const below of climb.slice(0, -1)) {
      const under = docs.find((x) => x.kind === d.kind && rungOf(x.format) === below.id);
      if (!under) out.push(`${venture}: ${d.file} sits on ${on} with no ${below.id} of ${d.kind} rendered: ${below.what}`);
      else if (!under.approved_by) out.push(`${venture}: ${d.file} sits on ${on} and ${under.file}, its ${below.id}, has no approved_by: a person approves each rung before the next`);
    }
  }
  return out;
}

const read = (file: string) => readJson(join(root, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

const knownFrom = (departments: unknown, model: unknown, artifactSchema: unknown, classes: Set<string>): Known => ({
  functions: new Set(isObject(departments) && Array.isArray(departments.departments)
    ? departments.departments.flatMap((d: unknown) => (isObject(d) && typeof d.id === "string" ? [d.id] : [])) : []),
  artifactKinds: new Set(isObject(artifactSchema) && isObject(artifactSchema.properties) && isObject(artifactSchema.properties.kind)
    && Array.isArray(artifactSchema.properties.kind.enum) ? artifactSchema.properties.kind.enum.map(String) : []),
  recordGlobs: ((model as DataModel).records ?? []).flatMap((r) => venturePaths(r).map(globRegExp)),
  classes,
});

/** Every decision class any function's decisions.json names. */
const decisionClasses = Effect.gen(function* () {
  const fs = yield* VentureFs;
  const out = new Set<string>();
  for (const fn of yield* fs.list(join(root, FUNCTIONS))) {
    const file = join(root, FUNCTIONS, fn, "decisions.json");
    if (!(yield* fs.exists(file))) continue;
    const body = yield* readJson(file).pipe(Effect.orElseSucceed(() => null));
    if (isObject(body) && Array.isArray(body.rows)) for (const r of body.rows) if (isObject(r) && typeof r.class === "string") out.add(r.class);
  }
  return out;
});

/** The document artifacts in one venture: artifacts/*.json with a document_kind. */
const documentsIn = (dir: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const folder = ventureFile(dir, "artifacts");
  const out: Document[] = [];
  for (const name of (yield* fs.list(folder)).filter((n) => n.endsWith(".json"))) {
    const body = yield* readJson(join(folder, name)).pipe(Effect.orElseSucceed(() => null));
    const a = body as Artifact | null;
    if (a && typeof a.document_kind === "string" && typeof a.format === "string")
      out.push({ file: `artifacts/${name}`, kind: a.document_kind, format: a.format, approved_by: a.approved_by });
  }
  return out;
});

/** Reads the catalog and what it cites, checks it, then checks each venture's documents against the ladder. */
export const checkDocuments = (ventures: string[] = []) => Effect.gen(function* () {
  const raw = yield* read(CATALOG);
  const v = validateValue("document-catalog.schema.json", raw);
  if (v.status !== 0) {
    const errors = (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
    return { errors: errors.map((e) => `${CATALOG}: ${e}`), kinds: 0, documents: 0 };
  }
  const c = raw as DocumentCatalog;
  const known = knownFrom(yield* read(DEPARTMENTS), yield* read(DATA_MODEL), yield* read(ARTIFACT_SCHEMA), yield* decisionClasses);
  const errors = catalogErrors(c, known).map((e) => `${CATALOG}: ${e}`);
  let documents = 0;
  for (const dir of ventures) {
    const docs = yield* documentsIn(dir);
    documents += docs.length;
    errors.push(...ladderErrors(c, dir, docs));
  }
  return { errors, kinds: c.kinds.length, documents };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  await runMain(Effect.map(checkDocuments(args.filter((a) => !a.startsWith("--"))), ({ errors, kinds, documents }) => {
    if (json) { console.log(JSON.stringify({ ok: !errors.length, errors, kinds, documents }, null, 2)); process.exitCode = errors.length ? 1 : 0; return; }
    for (const e of errors) console.error(`FAIL  ${e}`);
    if (errors.length) { process.exitCode = 1; return; }
    console.log(`ok  ${kinds} document kinds, ${documents} rendered document${documents === 1 ? "" : "s"} climbing the ladder in order`);
    console.log("The rules are the catalog's opinion; a person decides.");
  }));
}
