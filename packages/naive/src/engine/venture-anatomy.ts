#!/usr/bin/env node
// The Venture Anatomy Matrix (EE-157): the venture's architecture description after ISO/IEC/IEEE 42010:2022. The
// definition (packages/naive/src/functions/strategy/venture-anatomy.json) names eleven sub-matrices, each a model held
// by record types the data model already has, and the viewpoints that select views over them. This module resolves
// the matrix for one venture and copies nothing:
//
//   node packages/naive/src/engine/venture-anatomy.ts <venture dir> [--as-of <iso>] [--valid-at <date>] [--sub <id>] [--view <id>] [--json]
//
// Cells. Each record type a sub-matrix reads is one cell source (CellSource):
//   canvas    identity's Lean Canvas boxes, one cell per box: confirmed is known, an agent's value estimated, else unknown;
//   anatomy   a record type with cells of the shared shape (anatomy-cell.schema.json): each cell's own status, per record,
//             and its cells once, all unknown, when there is no record;
//   presence  any other record type, one cell: known when a person wrote a record, estimated when only an agent did,
//             unknown when there is none.
// So the matrix is whole from the first day, and filling it moves cells from unknown to estimated or known.
//
// Time travel is bitemporal (SQL:2011):
//   --as-of <iso>     system time: each record as the venture knew it then, read through readAsOf from the provenance
//                     log and the blob store (packages/naive/src/store/as-of.mjs). A record written outside the router
//                     (init, a hand edit) has no system time until mentura baseline adopts it, so it reads as absent.
//   --valid-at <date> application time: a cell counts only when its valid_from and valid_to include the date (valid_to
//                     is exclusive, as SQL:2011 periods are); any other cell is unknown at that time. Cells without
//                     application time and presence cells are unaffected.
//
// The confidence share is known plus estimated cells over all cells. S-K coverage lists each Regulation S-K item and
// whether at least one sub-matrix covering it has a record. Nesting follows each market's industry (and its ICP) to
// the records it names. A definition that fails its schema, or names a record type the data model lacks, an owner that
// is not the record type's function, an unknown coverage item, sub-matrix or Lean Canvas box, fails as SchemaInvalid
// (exit 1). A bad call fails as CannotRun (exit 2).
//
// Reading is an Effect over VentureFs (EE-125) with Naive's tagged errors; the rules are plain functions exported
// beside it, and ventureAnatomy, submatrix and viewOf are plain wrappers through runSync.

import { Effect } from "effect";
import { join } from "node:path";
import { CannotRun, SchemaInvalid } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { runMain, runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.mjs";
import { globRegExp, readDataModel, readSchema, venturePaths } from "../records/index.mjs";
import { validateValue } from "../records/validate.mjs";
import { pathsAsOf, readAsOf } from "../store/as-of.mjs";
import { agentWrote } from "./foundation.mjs";
import { CANVAS, leanCanvas } from "./lean-canvas.mjs";
import type { VentureAnatomy } from "../records/types/records.d.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
export const DEFINITION = "packages/naive/src/functions/strategy/venture-anatomy.json";
/** The function that owns the matrix itself: it assembles the sub-matrices and writes none of them. */
export const MATRIX_OWNER = "strategy";

// ---- The domain ----

/** A transaction time to read the venture as of (system time). Made only by isSystemTime. */
export type SystemTime = string & { readonly __brand: "SystemTime" };
/** A calendar day the world is viewed at (application time). Made only by isApplicationDate. */
export type ApplicationDate = string & { readonly __brand: "ApplicationDate" };
export const isSystemTime = (s: string): s is SystemTime => Number.isFinite(Date.parse(s));
export const isApplicationDate = (s: string): s is ApplicationDate => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s));

export type Status = "known" | "estimated" | "unknown";
export type Counts = { known: number, estimated: number, unknown: number, total: number };
/** A cell as read from disk: its fields are unknown until statusAt reads them. */
export type CellLike = { status?: unknown, valid_from?: unknown, valid_to?: unknown };
export type Submatrix = VentureAnatomy["submatrices"][number];
export type Viewpoint = VentureAnatomy["viewpoints"][number];
type CanvasBox = (typeof CANVAS)["boxes"][number];
/** Where a sub-matrix's cells come from, one per record type it reads. */
export type CellSource =
  | { kind: "canvas", boxes: readonly CanvasBox[] }
  | { kind: "anatomy", record: string, names: readonly string[] }
  | { kind: "presence", record: string };
type ModelRecord = { id: string, function?: string | null, schema?: string | null, paths: string[] };
type Model = { records: ModelRecord[] };
export type Link = { from: string, field: string, to: string, record: string, resolved: boolean };
export type Detail = { file: string, cells: Record<string, Status> };
export type Nesting = NonNullable<Submatrix["nesting"]> & { links?: Link[], files?: string[] };
export type SubResult = {
  id: string, label: string, concern: string, owner: string | null, status: Submatrix["status"], record: string | null, records: string[],
  covers: string[], from_phase: Submatrix["from_phase"], expected: boolean, files: string[], cells: Counts, confidence: number, detail: Detail[],
  nesting?: Nesting, note?: string,
};
export type Coverage = { item: string, label: string, by: string[], covered: boolean };
export type Matrix = {
  venture: string, phase: string, as_of: SystemTime | null, valid_at: ApplicationDate | null,
  kernel: { owner: string, standard: VentureAnatomy["standard"] | null, note: string },
  cells: Counts, confidence: number, coverage: Coverage[], covered: string[], uncovered: string[], submatrices: SubResult[],
};
/** The parsed options every reader takes. */
export type Options = { asOf?: SystemTime, validAt?: ApplicationDate };
/** The options as a caller gives them, before parseOptions. */
export type RawOptions = { asOf?: string, validAt?: string };
type ViewBase = {
  venture: string, phase: string, as_of: SystemTime | null, valid_at: ApplicationDate | null, viewpoint: string, label: string,
  concerns: string, source: string | null, reads: string[], confidence: number, submatrices: SubResult[],
};
/** A view, by its viewpoint's kind. */
export type View =
  | ViewBase & { kind: "canvas", definition: string | null, canvas: ReturnType<typeof leanCanvas> }
  | ViewBase & { kind: "outline", sections: (Coverage & { submatrices: string[] })[] }
  | ViewBase & { kind: "submatrices" };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const STATUSES: readonly Status[] = ["known", "estimated", "unknown"];
const isStatus = (v: unknown): v is Status => typeof v === "string" && (STATUSES as readonly string[]).includes(v);

// ---- Pure rules ----

/** A cell's status at an application time: outside [valid_from, valid_to) a known or estimated cell is unknown. Pure. */
export function statusAt(cell: CellLike | undefined, validAt?: ApplicationDate): Status {
  const s = isStatus(cell?.status) ? cell.status : "unknown";
  if (s === "unknown" || !validAt || !cell) return s;
  if (typeof cell.valid_from === "string" && validAt < cell.valid_from) return "unknown";
  if (typeof cell.valid_to === "string" && validAt >= cell.valid_to) return "unknown";
  return s;
}

/** Each named cell's status at an application time; a missing cell is unknown. Pure. */
export function cellStatuses(cells: Record<string, CellLike | undefined>, names: readonly string[], validAt?: ApplicationDate): Record<string, Status> {
  return Object.fromEntries(names.map((n) => [n, statusAt(cells[n], validAt)]));
}

/** Counts by status. Pure. */
export function countOf(statuses: readonly Status[]): Counts {
  const c: Counts = { known: 0, estimated: 0, unknown: 0, total: statuses.length };
  for (const s of statuses) c[s]++;
  return c;
}

/** Sum of counts. Pure. */
export const addCounts = (all: readonly Counts[]): Counts => all.reduce((a, c) => ({ known: a.known + c.known, estimated: a.estimated + c.estimated, unknown: a.unknown + c.unknown, total: a.total + c.total }), countOf([]));

/** Known or estimated cells over all cells, rounded to three places; 0 with no cells. Pure. */
export const confidenceOf = (c: Counts): number => (c.total ? Math.round(((c.known + c.estimated) / c.total) * 1000) / 1000 : 0);

/** A Lean Canvas box status as a cell status: confirmed is known, an agent's value is estimated, anything else unknown. Pure. */
export const boxStatus = (s: unknown): Status => (s === "confirmed" ? "known" : s === "agent" ? "estimated" : "unknown");

/** Which coverage items have at least one sub-matrix with a record. Pure. */
export function coverageOf(def: VentureAnatomy, withFiles: ReadonlySet<string>): Coverage[] {
  return def.coverage.items.map((i) => {
    const by = def.submatrices.filter((s) => s.covers.includes(i.id)).map((s) => s.id);
    return { item: i.id, label: i.label, by, covered: by.some((s) => withFiles.has(s)) };
  });
}

/** The record types a sub-matrix reads, its own first. Pure. */
export const recordsOf = (s: Submatrix): string[] => (s.record ? [s.record, ...(s.also ?? [])] : [...(s.also ?? [])]);

/** The cell sources of a sub-matrix: the Lean Canvas boxes it names, else one per record type it reads. Pure. */
export function sourcesOf(s: Submatrix, cellNames: (type: string) => readonly string[], boxes: readonly CanvasBox[]): CellSource[] {
  if (s.boxes?.length) return [{ kind: "canvas", boxes: boxes.filter((b) => s.boxes?.includes(b.id)) }];
  return recordsOf(s).map((record): CellSource => {
    const names = cellNames(record);
    return names.length ? { kind: "anatomy", record, names } : { kind: "presence", record };
  });
}

/** Whether a phase has reached the phase a sub-matrix is expected from. Pure. */
export const expectedAt = (phases: readonly string[], phase: string, from: string): boolean => phases.indexOf(phase) >= phases.indexOf(from);

/** What is wrong with a matrix definition against the data model and the Lean Canvas. Pure. */
export function problemsOf(def: VentureAnatomy, model: Model, boxes: readonly string[]): string[] {
  const out: string[] = [];
  const types = new Map(model.records.map((r) => [r.id, r]));
  const subs = new Set(def.submatrices.map((s) => s.id));
  const items = new Set(def.coverage.items.map((i) => i.id));
  const ids = def.submatrices.map((s) => s.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) out.push(`venture anatomy: two sub-matrices are named ${id}`);
  for (const s of def.submatrices) {
    if (s.record === null && s.status !== "not built") out.push(`venture anatomy: ${s.id} names no record type, so its status is not built`);
    if (s.record !== null && s.status === "not built") out.push(`venture anatomy: ${s.id} names ${s.record}, so it is built`);
    for (const t of recordsOf(s)) if (!types.has(t)) out.push(`venture anatomy: ${s.id} names record type ${t}, which the data model lacks`);
    const own = s.record ? types.get(s.record)?.function ?? null : null;
    if (s.record && types.has(s.record) && s.owner !== own) out.push(`venture anatomy: ${s.id} says owner ${String(s.owner)}, but the data model gives ${s.record} to ${String(own)}`);
    for (const c of s.covers) if (!items.has(c)) out.push(`venture anatomy: ${s.id} covers ${c}, which is not a coverage item`);
    if (s.nesting?.in && !subs.has(s.nesting.in)) out.push(`venture anatomy: ${s.id} sits in ${s.nesting.in}, which is not a sub-matrix`);
    if (s.nesting?.record && !types.has(s.nesting.record)) out.push(`venture anatomy: ${s.id} holds record type ${s.nesting.record}, which the data model lacks`);
    for (const b of s.boxes ?? []) if (!boxes.includes(b)) out.push(`venture anatomy: ${s.id} names Lean Canvas box ${b}, which the canvas lacks`);
  }
  for (const i of def.coverage.items) if (!def.submatrices.some((s) => s.covers.includes(i.id))) out.push(`venture anatomy: no sub-matrix covers ${i.id} (${i.label})`);
  for (const p of def.viewpoints) for (const r of p.reads) if (!subs.has(r)) out.push(`venture anatomy: viewpoint ${p.id} reads ${r}, which is not a sub-matrix`);
  return out;
}

// ---- Boundaries: options, the definition, venture.json and records ----

/** Parse a caller's options into branded times, or fail as CannotRun. */
export const parseOptions = (raw: RawOptions) => Effect.gen(function* () {
  const out: Options = {};
  if (raw.asOf !== undefined) {
    if (!isSystemTime(raw.asOf)) return yield* Effect.fail(new CannotRun({ message: `--as-of ${raw.asOf} is not a time; give an ISO 8601 time` }));
    out.asOf = raw.asOf;
  }
  if (raw.validAt !== undefined) {
    if (!isApplicationDate(raw.validAt)) return yield* Effect.fail(new CannotRun({ message: `--valid-at ${raw.validAt} is not a date; give YYYY-MM-DD` }));
    out.validAt = raw.validAt;
  }
  return out;
});

const MODEL: Model = readDataModel();
const PHASES: readonly string[] = (() => {
  const s: unknown = readSchema("venture");
  const phase = isObject(s) && isObject(s.properties) && isObject(s.properties.phase) ? s.properties.phase.enum : undefined;
  return Array.isArray(phase) ? phase.map(String) : [];
})();
const CANVAS_BOXES: readonly CanvasBox[] = CANVAS.boxes;

const CELLS = new Map<string, readonly string[]>();
/** The cell names of a record type whose schema has cells; empty for any other. */
export function cellNamesOf(type: string): readonly string[] {
  const hit = CELLS.get(type);
  if (hit) return hit;
  const schema = MODEL.records.find((r) => r.id === type)?.schema;
  let names: string[] = [];
  if (schema) {
    const s: unknown = readSchema(schema.replace(/^.*\//, "").replace(/\.schema\.json$/, ""));
    const cells = isObject(s) && isObject(s.properties) && isObject(s.properties.cells) ? s.properties.cells.properties : undefined;
    names = isObject(cells) ? Object.keys(cells) : [];
  }
  CELLS.set(type, names);
  return names;
}

/** The definition as read and parsed: its schema, then problemsOf; either failure is SchemaInvalid. */
export const definitionEffect = Effect.gen(function* () {
  const raw = yield* readJson(join(repo, DEFINITION));
  const v = validateValue("venture-anatomy.schema.json", raw);
  if (v.status !== 0) return yield* Effect.fail(new SchemaInvalid({ schema: "venture-anatomy.schema.json", errors: (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l)) }));
  // Checked against venture-anatomy.schema.json, from which VentureAnatomy is generated.
  const def = raw as VentureAnatomy;
  const errors = problemsOf(def, MODEL, CANVAS_BOXES.map((b) => b.id));
  if (errors.length) return yield* Effect.fail(new SchemaInvalid({ schema: DEFINITION, errors }));
  return def;
});

/** venture.json's id and phase. */
const ventureEffect = (dir: string) => Effect.map(readJson(join(dir, "venture.json")), (v) => ({
  id: isObject(v) && typeof v.id === "string" ? v.id : "",
  phase: isObject(v) && typeof v.phase === "string" && PHASES.includes(v.phase) ? v.phase : "discovery",
}));

/** The venture-relative files of a record type: live, or as the provenance log knew them at system time asOf. */
const filesEffect = (dir: string, type: string, asOf?: SystemTime) => Effect.gen(function* () {
  const globs: string[] = venturePaths(MODEL.records.find((r) => r.id === type));
  if (asOf) {
    const known: string[] = yield* Effect.try({ try: () => pathsAsOf(dir, asOf), catch: (cause) => new CannotRun({ message: `cannot read provenance in ${dir}`, cause }) });
    return known.filter((p) => globs.some((g) => globRegExp(g).test(p)));
  }
  const fs = yield* VentureFs;
  const found: string[] = [];
  for (const g of globs) {
    const star = g.indexOf("*");
    if (star < 0) { if (yield* fs.exists(ventureFile(dir, g))) found.push(g); continue; }
    const folder = g.slice(0, star), rest = g.slice(star + 1);
    if (rest.includes("*") || rest.includes("/")) continue;
    const names = yield* Effect.orElseSucceed(fs.list(ventureFile(dir, folder)), (): string[] => []);
    for (const n of names) if (n.endsWith(rest) && !(yield* fs.isDirectory(ventureFile(dir, folder + n)))) found.push(folder + n);
  }
  return [...new Set(found)];
});

/** One record's content, live or as of system time; null when it is absent or not JSON. */
const recordEffect = (dir: string, file: string, asOf?: SystemTime) => asOf
  ? Effect.try({ try: (): unknown => { const r = readAsOf(dir, file, asOf); return r ? JSON.parse(r.content) : null; }, catch: () => null }).pipe(Effect.orElseSucceed((): unknown => null))
  : Effect.orElseSucceed(readJson(ventureFile(dir, file)), (): unknown => null);

/** An anatomy record's cells, or none when the record holds no cells object. */
const cellsIn = (rec: unknown): Record<string, CellLike> => {
  const cells = isObject(rec) ? rec.cells : undefined;
  return isObject(cells) ? Object.fromEntries(Object.entries(cells).map(([k, c]) => [k, isObject(c) ? c : {}])) : {};
};

const pick = (o: unknown, path: string): unknown => (path === "." ? o : path.split(".").reduce<unknown>((x, k) => (isObject(x) ? x[k] : undefined), o));
const filled = (v: unknown): boolean => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length);

// ---- Reading (Effect, through VentureFs) ----

type SourceCells = { files: string[], detail: Detail[], statuses: Status[] };

/** The cells of one source. Live canvas cells come from leanCanvas; as of a time, from each box's record then. */
const sourceEffect = (dir: string, source: CellSource, opts: Options) => Effect.gen(function* () {
  switch (source.kind) {
    case "canvas": {
      const cells: Record<string, Status> = {};
      const files = new Set<string>();
      if (!opts.asOf) {
        const c = yield* Effect.sync(() => leanCanvas(dir));
        for (const b of source.boxes) {
          const box = c.boxes.find((x) => x.id === b.id);
          cells[b.id] = boxStatus(box?.status);
          if (cells[b.id] !== "unknown") for (const f of box?.refs ?? []) files.add(f);
        }
      } else for (const b of source.boxes) {
        cells[b.id] = "unknown";
        for (const f of yield* filesEffect(dir, b.record, opts.asOf)) {
          if (filled(pick(yield* recordEffect(dir, f, opts.asOf), b.attribute))) { cells[b.id] = "known"; files.add(f); }
        }
      }
      return { files: [...files], detail: [{ file: "lean-canvas", cells }], statuses: Object.values(cells) };
    }
    case "anatomy": {
      const tf = yield* filesEffect(dir, source.record, opts.asOf);
      if (!tf.length) { const cells = cellStatuses({}, source.names); return { files: [], detail: [{ file: `(${source.record})`, cells }], statuses: Object.values(cells) }; }
      const out: SourceCells = { files: [], detail: [], statuses: [] };
      for (const f of tf) {
        const rec = yield* recordEffect(dir, f, opts.asOf);
        const cells = cellStatuses(cellsIn(rec), source.names, opts.validAt);
        out.detail.push({ file: f, cells });
        out.statuses.push(...Object.values(cells));
        if (rec !== null) out.files.push(f);
      }
      return out;
    }
    case "presence": {
      const tf = yield* filesEffect(dir, source.record, opts.asOf);
      const byAgent = !opts.asOf && tf.length > 0 && (yield* Effect.sync(() => tf.every((f) => agentWrote(dir, f) === true)));
      const status: Status = !tf.length ? "unknown" : byAgent ? "estimated" : "known";
      return { files: tf, detail: [{ file: tf[0] ?? `(${source.record})`, cells: { [source.record]: status } }], statuses: [status] };
    }
    default: { const _exhaustive: never = source; return _exhaustive; }
  }
});

/** One sub-matrix resolved for a venture. */
const submatrixEffect = (dir: string, s: Submatrix, phase: string, opts: Options) => Effect.gen(function* () {
  const parts: SourceCells[] = [];
  for (const source of sourcesOf(s, cellNamesOf, CANVAS_BOXES)) parts.push(yield* sourceEffect(dir, source, opts));
  const cells = countOf(parts.flatMap((p) => p.statuses));
  const out: SubResult = {
    id: s.id, label: s.label, concern: s.concern, owner: s.owner, status: s.status, record: s.record, records: recordsOf(s), covers: s.covers,
    from_phase: s.from_phase, expected: expectedAt(PHASES, phase, s.from_phase), files: [...new Set(parts.flatMap((p) => p.files))].sort(),
    cells, confidence: confidenceOf(cells), detail: parts.flatMap((p) => p.detail), ...(s.note ? { note: s.note } : {}),
  };
  if (s.nesting) out.nesting = { ...s.nesting };
  return out;
});

/** Follow each record's nesting and references to the records they name: a market's industry and ICP. */
const linksEffect = (dir: string, subs: SubResult[], opts: Options) => Effect.gen(function* () {
  const idsOf = (rs: readonly unknown[]) => new Set(rs.filter(isObject).map((r) => String(r.id)));
  const read = (files: readonly string[]) => Effect.all(files.map((f) => recordEffect(dir, f, opts.asOf)));
  for (const s of subs) {
    const nesting = s.nesting;
    if (!nesting) continue;
    if (nesting.in) {
      const parent = subs.find((x) => x.id === nesting.in);
      const parentIds = idsOf(yield* read(parent?.files ?? []));
      const icpIds = idsOf(yield* read(yield* filesEffect(dir, "icp", opts.asOf)));
      const links: Link[] = [];
      for (const f of s.files) {
        const rec = yield* recordEffect(dir, f, opts.asOf);
        if (!isObject(rec)) continue;
        const to = nesting.field ? rec[nesting.field] : undefined;
        if (nesting.field && typeof to === "string") links.push({ from: f, field: nesting.field, to, record: parent?.record ?? "", resolved: parentIds.has(to) });
        if (typeof rec.icp === "string") links.push({ from: f, field: "icp", to: rec.icp, record: "icp", resolved: icpIds.has(rec.icp) });
      }
      nesting.links = links;
    }
    if (nesting.record) nesting.files = yield* filesEffect(dir, nesting.record, opts.asOf);
  }
  return subs;
});

/** The matrix for one venture, as an Effect over parsed options. */
export const matrixEffect = (dir: string, opts: Options) => Effect.gen(function* () {
  const def = yield* definitionEffect;
  const venture = yield* ventureEffect(dir);
  const subs: SubResult[] = [];
  for (const s of def.submatrices) subs.push(yield* submatrixEffect(dir, s, venture.phase, opts));
  yield* linksEffect(dir, subs, opts);
  const cells = addCounts(subs.map((s) => s.cells));
  const coverage = coverageOf(def, new Set(subs.filter((s) => s.files.length).map((s) => s.id)));
  const out: Matrix = {
    venture: venture.id, phase: venture.phase, as_of: opts.asOf ?? null, valid_at: opts.validAt ?? null,
    kernel: { owner: MATRIX_OWNER, standard: def.standard ?? null, note: "Each sub-matrix reads the records its owner writes; the matrix copies nothing" },
    cells, confidence: confidenceOf(cells), coverage, covered: coverage.filter((c) => c.covered).map((c) => c.item), uncovered: coverage.filter((c) => !c.covered).map((c) => c.item),
    submatrices: subs,
  };
  return out;
});

/** The matrix for one venture, as an Effect. Options are parsed here, the boundary. */
export const ventureAnatomyEffect = (dir: string, raw: RawOptions = {}) => Effect.flatMap(parseOptions(raw), (opts) => matrixEffect(dir, opts));

/** One sub-matrix, or null when the matrix has none by that id. */
export const submatrixOfEffect = (dir: string, id: string, raw: RawOptions = {}) => Effect.map(ventureAnatomyEffect(dir, raw), (m) => {
  const s = m.submatrices.find((x) => x.id === id);
  return s ? { venture: m.venture, phase: m.phase, as_of: m.as_of, valid_at: m.valid_at, kernel: m.kernel, ...s } : null;
});

/** The view a viewpoint selects, by its kind, or null for an unknown viewpoint. */
export const viewOfEffect = (dir: string, viewpoint: string, raw: RawOptions = {}) => Effect.gen(function* () {
  const def = yield* definitionEffect;
  const p = def.viewpoints.find((x) => x.id === viewpoint);
  if (!p) return null;
  const m = yield* ventureAnatomyEffect(dir, raw);
  const reads = m.submatrices.filter((s) => p.reads.includes(s.id));
  const base: ViewBase = { venture: m.venture, phase: m.phase, as_of: m.as_of, valid_at: m.valid_at, viewpoint: p.id, label: p.label, concerns: p.concerns,
    source: p.source ?? null, reads: p.reads, confidence: confidenceOf(addCounts(reads.map((s) => s.cells))), submatrices: reads };
  switch (p.kind) {
    case "canvas": return { ...base, kind: "canvas", definition: p.definition ?? null, canvas: yield* Effect.sync(() => leanCanvas(dir)) } satisfies View;
    case "outline": return { ...base, kind: "outline", sections: m.coverage.map((c) => ({ ...c, submatrices: c.by.filter((id) => p.reads.includes(id)) })) } satisfies View;
    case "submatrices": return { ...base, kind: "submatrices" } satisfies View;
    default: { const _exhaustive: never = p.kind; return _exhaustive; }
  }
});

// ---- Plain wrappers ----

/** The matrix for one venture. */
export const ventureAnatomy = (dir: string, raw: RawOptions = {}): Matrix => runSync(ventureAnatomyEffect(dir, raw));
/** One sub-matrix for one venture, or null. */
export const submatrix = (dir: string, id: string, raw: RawOptions = {}) => runSync(submatrixOfEffect(dir, id, raw));
/** The view a viewpoint selects, or null. */
export const viewOf = (dir: string, viewpoint: string, raw: RawOptions = {}): View | null => runSync(viewOfEffect(dir, viewpoint, raw));
/** What is wrong with the shipped definition: empty when it parses. */
export const problems = (): string[] => runSync(Effect.match(definitionEffect, { onFailure: (e) => (e._tag === "SchemaInvalid" ? e.errors : [e.message]), onSuccess: () => [] }));

// ---- The command line ----

const pct = (n: number) => `${Math.round(n * 100)}%`;
const line = (s: SubResult) => `${s.label.padEnd(16)} ${String(s.owner).padEnd(22)} ${String(s.cells.known).padStart(3)} known ${String(s.cells.estimated).padStart(3)} estimated ${String(s.cells.unknown).padStart(3)} unknown  ${pct(s.confidence).padStart(4)}  ${s.covers.join(", ")}${s.expected ? "" : `  (from ${s.from_phase})`}`;

const cli = (argv: readonly string[]) => Effect.gen(function* () {
  const usage = "usage: node packages/naive/src/engine/venture-anatomy.ts <venture dir> [--as-of <iso>] [--valid-at <date>] [--sub <id>] [--view <id>] [--json]";
  const flag = (n: string): string | undefined => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const dir = argv[0];
  const fs = yield* VentureFs;
  if (!dir || !(yield* fs.exists(join(dir, "venture.json")))) return yield* Effect.fail(new CannotRun({ message: usage }));
  const raw: RawOptions = { asOf: flag("--as-of"), validAt: flag("--valid-at") };
  const sub = flag("--sub"), view = flag("--view"), json = argv.includes("--json");
  const def = yield* definitionEffect;
  const print = (text: string) => Effect.sync(() => console.log(text));
  if (view !== undefined) {
    const v = yield* viewOfEffect(dir, view, raw);
    if (!v) return yield* Effect.fail(new CannotRun({ message: `no viewpoint ${view}; the matrix has ${def.viewpoints.map((p) => p.id).join(", ")}` }));
    yield* print(json ? JSON.stringify(v, null, 2) : [`${v.label} view of ${v.venture}: ${pct(v.confidence)} confident, reading ${v.reads.join(", ")}.`, ...v.submatrices.map(line)].join("\n"));
  } else if (sub !== undefined) {
    const s = yield* submatrixOfEffect(dir, sub, raw);
    if (!s) return yield* Effect.fail(new CannotRun({ message: `no sub-matrix ${sub}; the matrix has ${def.submatrices.map((x) => x.id).join(", ")}` }));
    yield* print(json ? JSON.stringify(s, null, 2) : [line(s), ...s.detail.map((d) => `  ${d.file}: ${Object.entries(d.cells).map(([k, v]) => `${k} ${v}`).join(", ")}`)].join("\n"));
  } else {
    const m = yield* ventureAnatomyEffect(dir, raw);
    yield* print(json ? JSON.stringify(m, null, 2) : [
      `Venture Anatomy Matrix for ${m.venture}, ${m.phase}${m.as_of ? `, as of ${m.as_of}` : ""}${m.valid_at ? `, valid at ${m.valid_at}` : ""}: ${pct(m.confidence)} of ${m.cells.total} cells known or estimated.`,
      ...m.submatrices.map(line),
      `S-K coverage: ${m.covered.length ? m.covered.join(", ") : "none"} covered; ${m.uncovered.length ? m.uncovered.join(", ") : "none"} not yet.`,
    ].join("\n"));
  }
});

if (import.meta.url === `file://${process.argv[1]}`) await runMain(cli(process.argv.slice(2)));
