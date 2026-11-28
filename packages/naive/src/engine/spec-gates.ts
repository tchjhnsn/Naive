// The specification gates (EE-236): SAD's gate questions for 0A, 0B, 0C, 1A and 1B, asked of a venture's own Naive
// records (packages/naive/src/phases/spec-gates.json). SAD's documents are never read; EE-036 stands, and this is its
// clause that SAD's surviving rules become checks.
//
//   evaluateGates(loadGates(), snapshot)   // pure: each gate named by its question, each answer citing its records
//   runSync(specGatesEffect(dir))          // the same over a venture folder, read through VentureFs
//
// An answer reads the records of one type at one field (answerOf). A question holds when its answers hold (or one of
// them, with any). A hole is a question no record type answers yet: it is reported as not built and never blocks, so
// the gates do not wait on something Naive cannot record. A gate passes when its other questions hold, and is reached
// when it and every gate before it pass. The staffing gate (packages/naive/src/engine/staffing.ts) drafts nothing
// until its gate is reached, which is how it fails closed (EE-217).

import { Effect } from "effect";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NaiveError } from "../core/effect/errors.ts";
import { VentureFs } from "../core/effect/fs.ts";
import { logical, ventureFile } from "../core/venture-paths.ts";
import { globRegExp, readDataModel, venturePaths } from "../records/index.ts";
import type { SpecGates } from "../records/types/records.d.ts";
import { naivePath } from "./agents/function-spec.ts";

export const GATES_FILE = "packages/naive/src/phases/spec-gates.json";

export type Gate = SpecGates["gates"][number];
export type Question = Gate["questions"][number];
export type Answer = NonNullable<Question["answers"]>[number];
/** One record in the venture: its venture-relative path and its parsed JSON, or its text for a Markdown record. */
export type Rec = { readonly path: string; readonly value: unknown };
/** The venture's records by record type id. */
export type Snapshot = Readonly<Record<string, readonly Rec[]>>;

export type AnswerResult = {
  record: string;
  field: string | null;
  holds: boolean;
  /** Where the answer lives: path#field for each record that counted, or each record that blocks under none. */
  cites: string[];
  /** Why it does not hold, in plain words, or null. */
  why: string | null;
};
export type QuestionResult = { id: string; question: string; status: "met" | "missing" | "hole"; answers: AnswerResult[]; hole?: string };
export type GateResult = { id: string; sad: Gate["sad"]; name: string; question: string; passed: boolean; reached: boolean; questions: QuestionResult[] };
export type GateReport = { gates: GateResult[]; reached: string | null; holes: string[] };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The value at a dotted path, or undefined. */
export const fieldOf = (value: unknown, path: string): unknown => path.split(".").reduce<unknown>((v, k) => (isObject(v) ? v[k] : undefined), value);

/** Whether a value says something: not missing, null, an empty string, an empty list or an empty object. */
export const filled = (v: unknown): boolean =>
  v !== undefined && v !== null && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && !v.length) && !(isObject(v) && !Object.keys(v).length);

/** Whether a value is one of the values that count; a list counts when any item does. */
const oneOf = (v: unknown, allowed: readonly unknown[]): boolean => (Array.isArray(v) ? v.some((x) => allowed.includes(x)) : allowed.includes(v));

/** The venture paths a decision record names: what it decides and where it writes. */
const touched = (value: unknown): string[] => {
  if (!isObject(value)) return [];
  const decides = isObject(value.decides) && typeof value.decides.path === "string" ? [value.decides.path] : [];
  const applies = Array.isArray(value.applies_to) ? value.applies_to.flatMap((t) => (isObject(t) && typeof t.file === "string" ? [t.file] : [])) : [];
  return [...decides, ...applies];
};

/** One answer over the records of its type. Pure. */
export function answerOf(a: Answer, recs: readonly Rec[]): AnswerResult {
  const field = a.field ?? null;
  const read = a.where ? recs.filter((r) => oneOf(fieldOf(r.value, a.where?.field ?? ""), a.where?.in ?? [])) : [...recs];
  const cite = (r: Rec): string => (field ? `${r.path}#${field}` : r.path);
  if (a.none) {
    const hits = read.filter((r) => oneOf(fieldOf(r.value, field ?? ""), a.in ?? []) && (!a.touches || touched(r.value).some((p) => a.touches?.some((t) => p.startsWith(t)))));
    return { record: a.record, field, holds: !hits.length, cites: hits.map(cite),
      why: hits.length ? `${hits.map((r) => r.path).join(", ")} ${hits.length === 1 ? "is" : "are"} ${(a.in ?? []).join(" or ")}` : null };
  }
  const counts = (r: Rec): boolean => (field === null || filled(fieldOf(r.value, field))) && (!a.in || oneOf(fieldOf(r.value, field ?? ""), a.in));
  const ok = read.filter(counts);
  const min = a.min ?? 1;
  const short = read.filter((r) => !counts(r));
  const what = `${a.record}${field ? ` ${field}` : ""}${a.in ? ` in ${a.in.join(", ")}` : ""}`;
  const why = ok.length < min ? (read.length ? `no ${what} yet: ${read.length} record${read.length === 1 ? "" : "s"} read, ${ok.length} count${min > 1 ? ` of ${min} needed` : ""}` : `no ${a.record} record`)
    : a.every && short.length ? `${short.map((r) => r.path).join(", ")} ${short.length === 1 ? "lacks" : "lack"} ${what}` : null;
  return { record: a.record, field, holds: why === null, cites: ok.map(cite), why };
}

/** Every gate over a snapshot of the venture's records. Pure. */
export function evaluateGates(def: Pick<SpecGates, "gates">, snapshot: Snapshot): GateReport {
  let open = true;
  const holes: string[] = [];
  const gates = def.gates.map((g): GateResult => {
    const questions = g.questions.map((q): QuestionResult => {
      if (q.hole) { holes.push(`${g.id}/${q.id}`); return { id: q.id, question: q.question, status: "hole", answers: [], hole: q.hole }; }
      const answers = (q.answers ?? []).map((a) => answerOf(a, snapshot[a.record] ?? []));
      const met = q.any ? answers.some((x) => x.holds) : answers.every((x) => x.holds);
      return { id: q.id, question: q.question, status: met ? "met" : "missing", answers };
    });
    const passed = questions.every((q) => q.status !== "missing");
    open = open && passed;
    return { id: g.id, sad: g.sad, name: g.name, question: g.question, passed, reached: open, questions };
  });
  return { gates, reached: [...gates].reverse().find((g) => g.reached)?.id ?? null, holes };
}

/** What stands between the venture and a gate: one line per missing question of that gate and every gate before it. */
export function missingFor(report: GateReport, gate: string): string[] {
  const at = report.gates.findIndex((g) => g.id === gate);
  if (at < 0) return [`no gate ${gate}`];
  return report.gates.slice(0, at + 1).flatMap((g) => g.questions.filter((q) => q.status === "missing")
    .map((q) => `${g.id} ${q.id}: ${q.question} (${q.answers.filter((a) => !a.holds).map((a) => a.why).join("; ")})`));
}

/** Naive's gate definitions. */
export const loadGates = (): SpecGates => JSON.parse(readFileSync(naivePath(GATES_FILE), "utf8")) as SpecGates;

/** The record types the gates read. */
export const recordTypesOf = (def: Pick<SpecGates, "gates">): string[] =>
  [...new Set(def.gates.flatMap((g) => g.questions.flatMap((q) => (q.answers ?? []).map((a) => a.record))))].sort();

/** Folders never read for records: tooling, caches and code ported into the venture. */
const SKIP = new Set(["node_modules", "repo"]);

/** Every file in a venture by its logical path (so a structured or src layout reads the same), leaving out dot
 *  folders, node_modules, repo and nested ventures. */
const venturePathsIn = (dir: string): Effect.Effect<string[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const out: string[] = [];
  const walk = (rel: string): Effect.Effect<void, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
    for (const name of yield* fs.list(rel ? join(dir, rel) : dir)) {
      if (name.startsWith(".") || SKIP.has(name)) continue;
      const sub = rel ? `${rel}/${name}` : name;
      if (yield* fs.isDirectory(join(dir, sub))) {
        if (!(yield* fs.exists(join(dir, sub, "venture.json")))) yield* walk(sub);
      } else out.push(logical(dir, sub));
    }
  });
  yield* walk("");
  return out;
});

/** The first folders a venture keeps beside any record, so a record type whose paths start with one is found at any
 *  depth: decisions/ sits next to the record each decision decides. Every other path is read from the venture's root. */
const BESIDE = new Set(["decisions"]);

/** A venture path as a RegExp over a logical path. */
const pathRegExp = (p: string): RegExp => globRegExp(BESIDE.has(p.split("/")[0]) ? `**/${p}` : p);

/** The venture's records of each type the gates read, each parsed when it is JSON. A file that does not parse is left out. */
export const snapshotEffect = (dir: string, types: readonly string[]): Effect.Effect<Record<string, Rec[]>, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const model = readDataModel();
  const files = yield* venturePathsIn(dir);
  const out: Record<string, Rec[]> = {};
  for (const t of types) {
    const res = venturePaths(model.records.find((r) => r.id === t)).map(pathRegExp);
    out[t] = [];
    for (const f of files.filter((p) => res.some((re) => re.test(p)))) {
      const text = yield* fs.readText(ventureFile(dir, f));
      if (!f.endsWith(".json")) { out[t].push({ path: f, value: text }); continue; }
      try { out[t].push({ path: f, value: JSON.parse(text) as unknown }); } catch { /* a record that does not parse answers nothing */ }
    }
  }
  return out;
});

/** The gates over a venture folder. */
export const specGatesEffect = (dir: string, def: SpecGates = loadGates()): Effect.Effect<GateReport & { snapshot: Record<string, Rec[]> }, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const snapshot = yield* snapshotEffect(dir, recordTypesOf(def));
  return { ...evaluateGates(def, snapshot), snapshot };
});
