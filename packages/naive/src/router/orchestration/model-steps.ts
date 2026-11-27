#!/usr/bin/env node
// Model steps ("use model", EE-073): the client side of Naive's server and client split. Code is the
// server: it reads records, computes values and decides. A model is the client: it answers one atomic
// judgment over unstructured input, or drafts prose. A package (or a kit) declares its model steps in
// use_model; this module checks them, assembles the state each one is given, asks a model in batches,
// checks the typed answers, and writes each answer as a judgment record through the router.
//
//   kinds         classify, noul (judge fit: yes, no or unknown), choice, score, draft. Each call is
//                 one question about one item (S-2). Only a draft is model-only (S-17)
//   decompose     a step names the fields its question needs (item.notes, foundation/problem#statement,
//                 ada.note) and the model gets those fields and nothing else (S-4); a field path, never a
//                 whole record or package, inside a context budget (S-11)
//   batch         every question of a package in one wave goes in one request, and packages are asked in
//                 parallel (S-5, F-11)
//   payload       code's results, a placeholder for each pending judgment, and the state each judgment
//                 receives (S-6); a run emits computed values first and judgments as they arrive (S-7)
//   provenance    a judgment is the agent's until a person confirms it, and so is an agent's record
//                 derived from it; the records the step read stay their authors' (S-9, S-10)
//   JSON          state is plain JSON and every question points at paths in it (S-12)
//   keep          a draft can carry computed values it must not change ({{seats}}); code fills them in
//                 and checks they came through unchanged (S-13)
//   after         a step waits on the steps it reads first; independent steps move at once (F-10, F-11)
//   when          a step asked only when a computed condition holds; --speculate asks it while code is
//                 still computing and discards the answers not used (F-13)
//   outcomes      answer, expected (an invalid write, a missing record, a gate that holds), uncaught (a
//                 bug, such as a cycle in the step order) and uncertain (below threshold, malformed or
//                 unanswered), which goes to the founder as an open decision (E-1, E-9). When a judgment
//                 and a code check disagree, the code wins (overruled)
//
// The model is passed in: a function (tests), an answers file (--answers, written by the founder's agent
// or by the app's Jev client), or MENTURA_MODEL_CMD, a command that reads one request on stdin
// and prints {model, answers} (the same protocol as Jev). With none, run refuses and payload shows what
// would be asked. This module never names a vendor or a credential.
//
//   node packages/naive/src/router/orchestration/model-steps.ts <venture dir> payload [--package <name>] [--kit <kit.json>] [--json]
//   node packages/naive/src/router/orchestration/model-steps.ts <venture dir> run [--package <name>] [--kit <kit.json>] [--answers <file>] [--speculate] [--stream] [--fresh] [--json]
//   node packages/naive/src/router/orchestration/model-steps.ts <venture dir> check [--package <name>] [--kit <kit.json>]
//   node packages/naive/src/router/orchestration/model-steps.ts <venture dir> waterfall [--json]
//   node packages/naive/src/router/orchestration/model-steps.ts <venture dir> provenance <file> [--checks] [--json]
//   node packages/naive/src/router/orchestration/model-steps.ts <venture dir> confirm <judgment id> --by <name>

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { call as routerCall, files as ventureFiles, glob, routes } from "../router.ts";
import type { Answer, CallArgs, RouteEntry } from "../router.ts";
import type { BoundedKit } from "../kit-boundary.ts";
import type { Judgment, Venture } from "../../records/types/records.d.ts";
import type { Entry as LogEntry } from "../../core/provenance.ts";
import { agentFromEnv, entries as provEntries, record as prov } from "../../core/provenance.ts";
import { decisions as decisionsOf, propose } from "../../engine/decisions.ts";
import { loadPackages } from "../../engine/load-packages.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { envCommand } from "../../core/runtime.ts";
import { now as clockNow, wallClock } from "../../core/clock.ts";

const repo = new URL("../../../../..", import.meta.url).pathname;
const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));

export const KINDS: Record<string, { options?: boolean; scale?: boolean; judgment: boolean }> = {
  classify: { options: true, judgment: true },
  noul: { judgment: true },
  choice: { options: true, judgment: true },
  score: { scale: true, judgment: true },
  draft: { judgment: false },
};
export const THRESHOLD = 0.7;
export const BUDGET = 2000;
export const ACTOR = "model-step";
export const JUDGMENTS = "knowledge/judgments";
const ID = /^[a-z0-9][a-z0-9-]*$/;

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => !!x && typeof x === "object";
/** A computed value: a count of a collection, a field of a routed record, or a field of the item. */
type ComputedSpec = { count?: string; read?: string; item?: string };
/** When a step is asked: a condition on one computed value. */
type When = { computed: string; equals?: unknown; in?: unknown[]; gte?: number; lte?: number };
/**
 * A checked model step, with the package or kit that declares it. A package's use_model has no JSON
 * Schema (package.json is not a record type), so its shape is written here.
 */
export type Step = {
  package: string; step: string; kind: string; question: string; inputs?: string[]; computed?: Record<string, ComputedSpec>;
  for_each?: string; after?: string[]; options?: string[]; scale?: number[]; threshold?: number; check?: { equals: string };
  keep?: string[]; when?: When; budget?: number;
};
/** A step as declared, before checkStep: any field may be missing. */
export type Declared = Partial<Omit<Step, "package">> & { package: string };
/** The fields of a step that typing and settling an answer read. */
type Def = Partial<Step>;
/** The router's call, or a kit's wrapped one. */
type Call = (a: CallArgs) => Promise<Answer>;
type Item = { id: string | null; record: unknown; file: string | null };
type Ctx = { dir: string; venture: string; workspace: string; call: Call; read: (route: string) => Promise<Answer>; recordById: (id: string) => { file: string; record: Obj } | null };
type Inputs = { state: Obj; reads: string[]; files: string[]; withheld?: undefined; missing?: undefined }
  | { withheld: string; missing?: undefined; state?: undefined; reads?: undefined; files?: undefined }
  | { missing: string; withheld?: undefined; state?: undefined; reads?: undefined; files?: undefined };
/** What an input names, or why it is not one. */
type Input = { form: "item"; path: string; route?: undefined; id?: undefined; error?: undefined } | { form: "route"; route: string; path: string; id?: undefined; error?: undefined }
  | { form: "id"; id: string; path: string; route?: undefined; error?: undefined } | { error: string; form?: undefined; path?: undefined; route?: undefined; id?: undefined };
/** One judgment as settle returns it, before it is written. */
type Settled = { outcome: Judgment["outcome"]; answer: unknown; confidence: number | null; threshold: number | null; why: string; kept?: Obj; overruled?: Judgment["overruled"]; decision?: string; state_sha256?: string };
type Question = ReturnType<typeof questionFor>;
/** One request to a model: the state each question receives, and the questions. */
export type Request = { model: string; state: Record<string, Obj>; questions: Record<string, Question> };
/** What a model is given: a request, of which a model needs only the question keys. */
type Asked = { model?: string; state?: Record<string, Obj>; questions: Record<string, unknown> };
/** What a model answers: its name and an answer per question key. */
export type ModelReply = { model?: unknown; answers?: Record<string, unknown> };
export type Ask = (req: Asked) => Promise<ModelReply | null | undefined>;
/** A decision as decisions() lists it, with only the fields this module reads. */
type Dec = { id: string; source?: string; status?: string; answer?: unknown; file?: string; provenance?: { approved_by?: string } };
/** A line of a run's report. */
type Entry = { key?: string; error?: string; why?: string; [k: string]: unknown };

/** A bug: a broken step definition, a cycle in the step order, an assembler that built a bad request. */
export class Uncaught extends Error { declare uncaught: boolean; constructor(m: string) { super(m); this.name = "Uncaught"; this.uncaught = true; } }
/** An expected failure: a missing record, a failed model request, a field over budget. */
export class Expected extends Error { declare expected: boolean; declare kind: string; constructor(m: string, kind = "expected") { super(m); this.name = "Expected"; this.expected = true; this.kind = kind; } }

/**
 * The three kinds of error, plus the answer (E-1). x is a router result, a judgment, or a thrown error.
 * expected: an invalid write, a missing record, a gate that holds. uncaught: a bug. uncertain: a judgment
 * below threshold, routed to a person.
 */
export function outcomeOf(input: unknown): { outcome: string; kind: string; error?: unknown; why?: unknown } {
  if (input instanceof Error) { const f = input as Expected; return f.expected ? { outcome: "expected", kind: f.kind, error: f.message } : { outcome: "uncaught", kind: "bug", error: f.message }; }
  if (!isObj(input)) return { outcome: "answer", kind: "answer" };
  const x = input as { outcome?: unknown; why?: unknown; ok?: unknown; locked_by?: unknown; error?: string; not_found?: { note?: unknown }; result?: { draft?: unknown; note?: unknown } };
  if (x?.outcome === "uncertain") return { outcome: "uncertain", kind: "below threshold", why: x.why };
  if (x?.outcome === "overruled") return { outcome: "answer", kind: "code wins", why: x.why };
  if (x && x.ok === false) return { outcome: "expected", kind: x.locked_by ? "locked" : /does not match/.test(x.error ?? "") ? "invalid write" : "refused", error: x.error };
  if (x?.not_found) return { outcome: "expected", kind: "missing record", error: x.not_found.note };
  if (x?.result?.draft) return { outcome: "expected", kind: "gate holds", error: x.result.note };
  return { outcome: "answer", kind: "answer" };
}

/** A draft is model-only: code never expects a deterministic answer from it (S-17). */
export function expectDeterministic(step: Def) {
  if (!KINDS[String(step.kind)]?.judgment) throw new Uncaught(`${step.package}/${step.step} is a ${step.kind}: only a model can do it, so code cannot expect a deterministic answer from it`);
  return true;
}

// ---- Steps and their checks ----------------------------------------------------------------------

/** The model steps declared by the repository's packages (all, or the named ones), or by a kit.json (its path or its content). */
export function stepsOf({ packages: names, kit }: { packages?: string[]; kit?: string | object } = {}): Declared[] {
  if (kit) {
    const k = (typeof kit === "string" ? load(kit) : kit) as { name: string; boundary?: { use_model?: Omit<Declared, "package">[] } };
    return (k.boundary?.use_model ?? []).map((s) => ({ ...s, package: k.name }));
  }
  const dir = join(repo, "packages/naive/library", "packages");
  return readdirSync(dir).filter((n) => existsSync(join(dir, n, "package.json")) && (!names?.length || names.includes(n)))
    .flatMap((n) => ((load(join(dir, n, "package.json")) as { use_model?: (string | Omit<Declared, "package">)[] }).use_model ?? []).map((s) => (typeof s === "string" ? { step: s, package: n } : { ...s, package: n })));
}

const keyOf = (s: { package: string; step?: string }, item: string | null | undefined) => `${s.package}/${s.step}/${item ?? "-"}`;
export const judgmentId = (s: { package: string; step?: string }, item: string | null | undefined) => `${s.package}-${s.step}${item ? `-${item}` : ""}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
const refsOf = (q: unknown) => [...String(q ?? "").replace(/\{\{[^}]*\}\}/g, "").matchAll(/\{([^{}\s]+)\}/g)].map((m) => m[1]);
const placeholdersOf = (t: unknown) => [...String(t ?? "").matchAll(/\{\{([a-z0-9_-]+)\}\}/gi)].map((m) => m[1]);

/** What an input names: a field of the item, a field of a routed record, or a field of a record by id. */
export function inputOf(input: unknown): Input {
  if (typeof input !== "string") return { error: "an input is a string" };
  if (input === "item" || input.startsWith("item.")) return input.length > 5 ? { form: "item", path: input.slice(5) } : { error: "names the whole item" };
  if (input.includes("#")) { const [route, path] = input.split("#"); return path ? { form: "route", route, path } : { error: "names a whole record" }; }
  const dot = input.indexOf(".");
  if (dot < 0) return { error: "names a whole record or package" };
  return { form: "id", id: input.slice(0, dot), path: input.slice(dot + 1) };
}

/** Errors in one step definition. */
export function checkStep(s: Declared, { known }: { known?: { lists: Set<string>; all: Set<string> } } = {}): string[] {
  const at = `${s.package}/${s.step ?? "(no step id)"}`;
  const e: string[] = [];
  if (typeof s.step !== "string" || !ID.test(s.step)) e.push(`${at}: a step has an id of lowercase letters, digits and hyphens`);
  const k = KINDS[String(s.kind)];
  if (!k) { e.push(`${at}: kind is one of ${Object.keys(KINDS).join(", ")} (one atomic judgment, or a draft)`); return e; }
  if (typeof s.question !== "string" || !s.question.trim()) e.push(`${at}: a step asks one question`);
  const computed = s.computed ?? {};
  const inputs = s.inputs ?? [];
  if (!Array.isArray(inputs)) e.push(`${at}: inputs is an array of field paths`);
  if (!inputs.length && !Object.keys(computed).length) e.push(`${at}: a step names the fields its question needs`);
  for (const i of inputs) {
    const p = inputOf(i);
    if (p.error) e.push(`${at}: input ${i} ${p.error}; name only the fields its question needs (keep model calls at the leaves)`);
    else if (p.form === "item" && !s.for_each) e.push(`${at}: input ${i} names the item, but the step has no for_each`);
  }
  if (s.for_each !== undefined && (typeof s.for_each !== "string" || (known && !known.lists.has(s.for_each)))) e.push(`${at}: for_each ${s.for_each} is not a collection route`);
  for (const [name, spec] of Object.entries(computed)) {
    const forms = (["count", "read", "item"] as const).filter((f) => spec && spec[f] !== undefined);
    if (forms.length !== 1) e.push(`${at}: computed ${name} is one of {count: <route>}, {read: <route>#<path>}, {item: <path>}`);
    else if (forms[0] === "item" && !s.for_each) e.push(`${at}: computed ${name} reads the item, but the step has no for_each`);
    else if (forms[0] === "read" && !String(spec.read).includes("#")) e.push(`${at}: computed ${name} reads <route>#<path>`);
  }
  const after = s.after ?? [];
  const refs = refsOf(s.question);
  for (const r of refs) {
    if (r.startsWith("steps.")) { if (!after.includes(r.slice(6))) e.push(`${at}: the question reads {${r}}, so the step lists ${r.slice(6)} in after`); }
    else if (!(r in computed) && !inputs.includes(r)) e.push(`${at}: the question points at {${r}}, which is not one of its inputs or computed values`);
  }
  for (const i of inputs) if (!refs.includes(i)) e.push(`${at}: input ${i} is given to the model but the question never points at it`);
  if (k.options && !(Array.isArray(s.options) && s.options.length >= 2 && s.options.every((o) => typeof o === "string"))) e.push(`${at}: a ${s.kind} step lists at least two options`);
  if (k.scale && !(Array.isArray(s.scale) && s.scale.length === 2 && s.scale.every(Number.isFinite) && s.scale[0] < s.scale[1])) e.push(`${at}: a score step gives its scale as [min, max]`);
  if (s.threshold !== undefined && !(typeof s.threshold === "number" && s.threshold >= 0 && s.threshold <= 1)) e.push(`${at}: threshold is between 0 and 1`);
  if (!k.judgment) {
    if (s.threshold !== undefined) e.push(`${at}: a draft is model-only and has no confidence, so it has no threshold`);
    if (s.check) e.push(`${at}: a draft is model-only: code cannot check it for a deterministic answer`);
  }
  if (s.check && !(s.check.equals in computed)) e.push(`${at}: check.equals names one of the step's computed values`);
  for (const n of s.keep ?? []) {
    if (!(n in computed)) e.push(`${at}: keep ${n} is not one of the step's computed values`);
    if (!s.question?.includes(`{{${n}}}`)) e.push(`${at}: keep ${n}: the question asks the model to write {{${n}}} where it goes`);
  }
  if (s.keep?.length && k.judgment) e.push(`${at}: keep is for drafts; a judgment's code check is check.equals`);
  const w = s.when;
  if (w) {
    const ops = (["equals", "in", "gte", "lte"] as const).filter((o) => w[o] !== undefined);
    if (!(w.computed in computed) || ops.length !== 1) e.push(`${at}: when is {computed: <name>, equals|in|gte|lte: <value>}`);
  }
  if (s.budget !== undefined && !(Number.isInteger(s.budget) && s.budget > 0)) e.push(`${at}: budget is a positive number of characters`);
  return e;
}

/** Steps in waves: each step after the steps it reads first. A cycle is a bug (uncaught). */
export function waves<T extends { package: string; step?: string; after?: string[] }>(steps: T[]): T[][] {
  const id = (s: T) => `${s.package}/${s.step}`;
  const byId = new Map(steps.map((s) => [id(s), s]));
  const deps = new Map(steps.map((s) => [id(s), (s.after ?? []).map((a) => `${s.package}/${a}`)]));
  for (const [s, ds] of deps) for (const d of ds) if (!byId.has(d)) throw new Uncaught(`${s} waits on ${d}, which no package declares`);
  const out: T[][] = [], done = new Set<string>();
  while (done.size < byId.size) {
    const wave = [...byId.keys()].filter((s) => !done.has(s) && (deps.get(s) ?? []).every((d) => done.has(d)));
    if (!wave.length) {
      const left = [...byId.keys()].filter((s) => !done.has(s));
      const cycle = [left[0]]; let at = left[0];
      // Each step left waits on one not done, so the walk always finds the next.
      for (;;) { const next = (deps.get(at) ?? []).find((d) => !done.has(d)); if (next === undefined) break; at = next; if (cycle.includes(at)) { cycle.push(at); break; } cycle.push(at); }
      throw new Uncaught(`a cycle in the step order: ${cycle.slice(cycle.indexOf(at)).join(" -> ")}`);
    }
    wave.forEach((s) => done.add(s));
    out.push(wave.flatMap((s) => { const x = byId.get(s); return x ? [x] : []; }));
  }
  return out;
}

const knownRoutes = () => { const rs: RouteEntry[] = routes(); return { lists: new Set(rs.filter((r) => r.collection === "list").map((r) => r.route)), all: new Set(rs.map((r) => r.route)) }; };

/** Everything thrown in this module is an Error, so its message is read as one. */
const messageOf = (e: unknown) => (e as Error).message;

/** Errors across steps: each definition, unknown routes, the order, and (with a venture) private fields named. */
export async function checkSteps(steps: Declared[], { dir, call = routerCall, workspace }: { dir?: string; call?: Call; workspace?: string } = {}): Promise<string[]> {
  const known = knownRoutes();
  const errors = steps.flatMap((s) => checkStep(s, { known }));
  for (const s of steps) for (const i of s.inputs ?? []) { const p = inputOf(i); if (p.form === "route" && !known.all.has(p.route)) errors.push(`${s.package}/${s.step}: input ${i} names no route`); }
  try { waves(steps); } catch (e) { errors.push(messageOf(e)); }
  if (dir && !errors.length) {
    const ctx = await context(dir, { call, workspace });
    for (const s of steps) {
      let items: Item[];
      // checkSteps found no errors above, so each step is whole.
      try { items = await itemsOf(ctx, s as Step); } catch (e) { errors.push(`${s.package}/${s.step}: ${messageOf(e)}`); continue; }
      for (const it of items) for (const i of s.inputs ?? []) {
        const p = inputOf(i);
        if (p.form === "item" && privacy(it.record, p.path)) errors.push(`${s.package}/${s.step}: input ${i} of ${it.id} is ${privacy(it.record, p.path)} and must not reach a model`);
      }
    }
  }
  return errors;
}

// ---- Code: reading state and computing values ----------------------------------------------------

const get = (o: unknown, path: string) => path.split(".").reduce<unknown>((x, k) => (x == null ? undefined : (x as Obj)[k]), o);
const set = (o: Obj, path: string, v: unknown) => { const ks = path.split("."); let x = o; for (const k of ks.slice(0, -1)) x = (x[k] ??= {}) as Obj; x[ks[ks.length - 1]] = v; return o; };
const fileOf = (src: unknown): string | null => (src as { address?: string } | null | undefined)?.address?.replace(/^venture:\/\//, "") ?? null;

/** Why a field of a record must not reach a model, or null (S-16, EE-073). */
function privacy(record: unknown, path: string): string | null {
  if (!record || typeof record !== "object") return null;
  const rec = record as { private?: unknown; sensitive?: unknown; private_fields?: string[] };
  if (rec.private === true) return "in a private record";
  if (rec.sensitive === true) return "in a sensitive record";
  if ((rec.private_fields ?? []).some((f) => path === f || path.startsWith(`${f}.`))) return "a private field";
  return null;
}

/** Plain JSON only: what a model is given must survive serialization unchanged (S-12). */
export function assertJson(v: unknown, at = "state"): void {
  if (v === null || typeof v === "string" || typeof v === "boolean") return;
  if (typeof v === "number") { if (!Number.isFinite(v)) throw new Expected(`${at} is not a finite number`, "not JSON"); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => assertJson(x, `${at}[${i}]`)); return; }
  if (typeof v === "object" && Object.getPrototypeOf(v) === Object.prototype) { for (const [k, x] of Object.entries(v)) assertJson(x, `${at}.${k}`); return; }
  throw new Expected(`${at} is not plain JSON (${v === undefined ? "undefined" : typeof v === "object" ? v.constructor?.name ?? "object" : typeof v})`, "not JSON");
}

/** Every path a request's questions point at resolves in its state, and every question has state (S-12). */
export function checkRequest(req: { state: Obj; questions: Record<string, { instructions: string }> }) {
  assertJson(req.state);
  for (const [key, q] of Object.entries(req.questions)) {
    if (!(key in req.state)) throw new Uncaught(`question ${key} has no state`);
    for (const m of q.instructions.matchAll(/`state\["([^"]+)"\]((?:\.[A-Za-z0-9_-]+|\["[^"]+"\])*)`/g)) {
      const parts = [m[1], ...[...m[2].matchAll(/\.([A-Za-z0-9_-]+)|\["([^"]+)"\]/g)].map((x) => x[1] ?? x[2])];
      if (parts.reduce<unknown>((x, k) => (x == null ? undefined : (x as Obj)[k]), req.state) === undefined) throw new Uncaught(`question ${key} points at ${m[0]}, which is not in its state`);
    }
  }
  return true;
}

async function context(dir: string, { call = routerCall, workspace }: { call?: Call; workspace?: string } = {}): Promise<Ctx> {
  const venture = (load(join(dir, "venture.json")) as Venture).id;
  const ws = workspace ?? dirname(dir);
  const memo = new Map<string, Promise<Answer>>();
  const read = (route: string) => {
    let p = memo.get(route);
    if (!p) memo.set(route, p = call({ venture, workspace: ws, route, action: "read", actor: "agent", actor_id: ACTOR }).then((r) => {
      if (!r.ok) throw new Expected(`${route}: ${r.error}`, "refused");
      return r;
    }));
    return p;
  };
  let byId: Map<string, { file: string; record: Obj }> | null = null;
  const recordById = (id: string) => {
    byId ??= new Map(ventureFiles(dir).filter((f: string) => f.endsWith(".json") && !f.startsWith("knowledge/judgments/")).flatMap((f: string) => {
      try { const r = load(ventureFile(dir, f)); return isObj(r) && typeof r.id === "string" ? [[r.id, { file: f, record: r }] as const] : []; } catch { return []; }
    }));
    return byId.get(id) ?? null;
  };
  return { dir, venture, workspace: ws, call, read, recordById };
}

async function itemsOf(ctx: Ctx, s: Step): Promise<Item[]> {
  if (!s.for_each) return [{ id: null, record: null, file: null }];
  const r = await ctx.read(s.for_each);
  if (r.result === null) return [];
  const sources = r.sources as Obj | undefined;
  return Object.entries(r.result as Obj).map(([id, record]) => ({ id, record, file: fileOf(sources?.[id]) }));
}

// The fields one question is given: { state, reads, files, withheld }. Nothing else from the record.
async function inputsFor(ctx: Ctx, s: Step, it: Item): Promise<Inputs> {
  const state: Obj = {}, reads: string[] = [], files = new Set<string>();
  for (const i of s.inputs ?? []) {
    const p = inputOf(i);
    // checkSteps refused a step with a bad input, so this never returns.
    if (p.error !== undefined) return { missing: `${i} ${p.error}` };
    let rec: unknown, file: string | null;
    if (p.form === "item") { rec = it.record; file = it.file; }
    else if (p.form === "route") { const r = await ctx.read(p.route); if (r.result === null) return { missing: `${p.route} has no record yet` }; rec = r.result; file = fileOf(r.source); }
    else { const hit = ctx.recordById(p.id); if (!hit) return { missing: `no record ${p.id}` }; rec = hit.record; file = hit.file; }
    const why = privacy(rec, p.path);
    if (why) return { withheld: `${i} is ${why}` };
    const v = get(rec, p.path);
    if (v === undefined) return { missing: `${it.id ?? file ?? i} has no ${p.path}` };
    if (p.form === "item") set(state, `item.${p.path}`, v); else ((state.records ??= {}) as Obj)[i] = v;
    reads.push(`${file}#${p.path}`); if (file) files.add(file);
  }
  return { state, reads, files: [...files] };
}

async function computeFor(ctx: Ctx, s: Step, it: Item): Promise<Obj> {
  const out: Obj = {};
  for (const [name, spec] of Object.entries(s.computed ?? {})) {
    if (spec.item !== undefined) out[name] = get(it.record, spec.item);
    else if (spec.count !== undefined) { const r = await ctx.read(spec.count); out[name] = r.result ? Object.keys(r.result).length : 0; }
    // checkStep allows exactly one form, so this is the read.
    else if (spec.read !== undefined) { const [route, path] = spec.read.split("#"); const r = await ctx.read(route); out[name] = r.result ? get(r.result, path) : undefined; }
  }
  return out;
}

const holds = (w: When, c: Obj | undefined) => {
  const v = c?.[w.computed];
  if (w.equals !== undefined) return v === w.equals;
  if (w.in !== undefined) return w.in.includes(v);
  if (w.gte !== undefined) return typeof v === "number" && v >= w.gte;
  return typeof v === "number" && w.lte !== undefined && v <= w.lte;
};
const usesComputed = (s: Step) => !!(s.keep?.length || refsOf(s.question).some((r) => r in (s.computed ?? {})));

/** The question as the model reads it: each {ref} becomes the path to it in the state. */
function instructionsFor(s: Step, key: string) {
  const p = (r: string) => r.startsWith("item.") ? `\`state["${key}"].item.${r.slice(5)}\`` : r.startsWith("steps.") ? `\`state["${key}"].steps.${r.slice(6)}\``
    : r in (s.computed ?? {}) ? `\`state["${key}"].computed.${r}\`` : `\`state["${key}"].records["${r}"]\``;
  const q = s.question.replace(/\{\{([^}]*)\}\}/g, "\u0000$1\u0001").replace(/\{([^{}\s]+)\}/g, (_: string, r: string) => p(r)).replace(/\u0000/g, "{{").replace(/\u0001/g, "}}");
  return q;
}

function questionFor(s: Step, key: string) {
  return { type: s.kind, instructions: instructionsFor(s, key), deterministic: !!KINDS[s.kind].judgment,
    ...(s.options ? { options: s.options } : {}), ...(s.scale ? { scale: s.scale } : {}), ...(s.kind === "noul" ? { criteria: { true: "Yes", false: "No", unknown: "The state does not say" } } : {}) };
}

// ---- The model's answers: typed, thresholded, checked by code ------------------------------------

/** One answer checked against its step's type (E-9): a malformed answer never comes back. */
export function typed(s: Def, raw: unknown): { ok: false; why: string; confidence?: number | null; value?: undefined } | { ok: true; value: unknown; confidence: number | null; why?: undefined } {
  if (raw === undefined || raw === null) return { ok: false, why: "no answer came back" };
  let value: unknown = raw, confidence: unknown = null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Obj;
    value = r.value ?? r.answer;
    confidence = r.confidence ?? r.probability ?? null;
  } else if (s.kind === "noul" && typeof raw === "number") { value = raw >= 0.5; confidence = Math.max(raw, 1 - raw); }
  if (confidence !== null && !(typeof confidence === "number" && confidence >= 0 && confidence <= 1)) return { ok: false, why: `malformed: confidence ${JSON.stringify(confidence)} is not between 0 and 1` };
  const conf = confidence as number | null; // checked just above
  const bad = (w: string) => ({ ok: false as const, why: `malformed: ${w}` });
  switch (s.kind) {
    case "noul": {
      const v = value === true || value === "true" || value === "yes" ? true : value === false || value === "false" || value === "no" ? false : value === "unknown" ? "unknown" : undefined;
      if (v === undefined) return bad(`${JSON.stringify(value)} is not yes, no or unknown`);
      if (v === "unknown") return { ok: false, why: "the model said the state does not settle it", confidence: conf };
      return { ok: true, value: v, confidence: conf };
    }
    case "choice": case "classify": {
      const options: unknown[] = s.options ?? []; // checkStep requires them for these kinds
      return options.includes(value) ? { ok: true, value, confidence: conf } : bad(`${JSON.stringify(value)} is not one of ${options.join(", ")}`);
    }
    case "score": {
      const scale = s.scale ?? []; // checkStep requires it for a score
      const v = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
      return typeof v === "number" && Number.isFinite(v) && v >= scale[0] && v <= scale[1] ? { ok: true, value: v, confidence: conf } : bad(`${JSON.stringify(value)} is not a number from ${scale[0]} to ${scale[1]}`);
    }
    case "draft":
      return typeof value === "string" && value.trim() ? { ok: true, value, confidence: null } : bad("a draft is non-empty text");
  }
  return bad(`unknown kind ${s.kind}`);
}

/** Fills {{name}} with the computed value and confirms every kept value came through unchanged (S-13). */
export function keepComputed(text: string, kept: Obj): { ok: false; why: string; value?: undefined } | { ok: true; value: string; why?: undefined } {
  let out = text;
  for (const [n, v] of Object.entries(kept)) out = out.split(`{{${n}}}`).join(String(v));
  const stray = placeholdersOf(out);
  if (stray.length) return { ok: false, why: `the draft left {{${stray[0]}}}, which code does not compute` };
  for (const [n, v] of Object.entries(kept)) if (!out.includes(String(v))) return { ok: false, why: `the computed ${n} (${v}) did not come through unchanged; the code's value stands, so the draft goes to a person` };
  return { ok: true, value: out };
}

/** A judgment from one answer: outcome answer, overruled (code wins) or uncertain. */
export function settle(s: Def, raw: unknown, computed: Obj = {}): Settled {
  const t = typed(s, raw);
  const threshold = KINDS[String(s.kind)].judgment ? s.threshold ?? THRESHOLD : null;
  if (!t.ok) return { outcome: "uncertain", answer: null, confidence: t.confidence ?? null, threshold, why: t.why };
  if (s.kind === "draft") {
    if (!s.keep?.length) return { outcome: "answer", answer: t.value, confidence: null, threshold, why: "drafted; a person confirms it" };
    const kept = Object.fromEntries(s.keep.map((n) => [n, computed[n]]));
    const k = keepComputed(t.value as string, kept); // typed returns a draft only as text
    return k.ok ? { outcome: "answer", answer: k.value, confidence: null, threshold, kept, why: "drafted around the computed values, which came through unchanged" } : { outcome: "uncertain", answer: null, confidence: null, threshold, why: k.why };
  }
  if (t.confidence === null) return { outcome: "uncertain", answer: null, confidence: null, threshold, why: "the answer gave no confidence" };
  if (threshold !== null && t.confidence < threshold) return { outcome: "uncertain", answer: null, confidence: t.confidence, threshold, why: `confidence ${t.confidence} is below the threshold ${threshold}` };
  if (s.check && computed[s.check.equals] !== undefined && computed[s.check.equals] !== t.value)
    return { outcome: "overruled", answer: computed[s.check.equals], confidence: t.confidence, threshold, overruled: { judgment: t.value, code: computed[s.check.equals], check: `equals ${s.check.equals}` },
      why: `the model said ${JSON.stringify(t.value)} and code computed ${JSON.stringify(computed[s.check.equals])}: the code wins` };
  return { outcome: "answer", answer: t.value, confidence: t.confidence, threshold, why: `confidence ${t.confidence} is at or above ${threshold}` };
}

// ---- Models: passed in ----------------------------------------------------------------------------

/** A model from an answers file or object: {model, answers: {<key>: {value, confidence}}}. */
export function answersModel(src: string | object): Ask {
  const a = (typeof src === "string" ? load(src) : src) as { model?: unknown; answers?: Obj };
  const all = (a.answers ?? a) as Obj;
  return async (req) => ({ model: a.model ?? "answers-file", answers: Object.fromEntries(Object.keys(req.questions).filter((k) => k in all).map((k) => [k, all[k]])) });
}

/** A model behind a command that reads one request on stdin and prints {model, answers} (the Jev protocol). */
export function commandModel(cmdline: string): Ask {
  const argv = cmdline.split(" ").filter(Boolean);
  return (req) => new Promise<ModelReply>((ok, fail) => {
    const p = spawn(argv[0], argv.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => fail(new Expected(`could not run the model command ${argv[0]}: ${e.message}`, "failed request")));
    p.on("close", (code) => {
      if (code !== 0) return fail(new Expected(`the model command stopped with status ${code}: ${err.trim().slice(0, 300)}`, "failed request"));
      try { ok(JSON.parse(out) as ModelReply); } catch { fail(new Expected(`the model command did not answer with JSON: ${out.trim().slice(0, 200)}`, "failed request")); }
    });
    p.stdin.end(JSON.stringify(req));
  });
}

// ---- The payload and the run ---------------------------------------------------------------------

async function plan(dir: string, declared: Declared[], opts: { call?: Call; workspace?: string }) {
  const bad = await checkSteps(declared);
  if (bad.length) throw new Uncaught(`the model steps are broken:\n${bad.join("\n")}`);
  const steps = declared as Step[]; // checkSteps found no errors, so each step is whole
  const order = waves(steps);
  const ctx = await context(dir, opts);
  const items = new Map<string, Item[]>();
  for (const s of steps) items.set(`${s.package}/${s.step}`, await itemsOf(ctx, s));
  const decs: Dec[] = decisionsOf(dir).decisions;
  const founder = new Map(decs.filter((d) => d.source === "file" && d.id.startsWith("judge-")).map((d) => [d.id, d]));
  return { ctx, steps, order, items, founder };
}

/**
 * The router's answer before any model is asked (S-6): what code computed, a placeholder for each
 * pending judgment with the state it receives, and what is withheld or missing. Makes no model call.
 */
export async function payload(dir: string, steps: Declared[], opts: { call?: Call; workspace?: string } = {}) {
  const { ctx, order, items } = await plan(dir, steps, opts);
  const computed: Record<string, Obj> = {}, skipped: { key: string; why: string }[] = [], withheld: { key: string; why: string }[] = [];
  const pending: { placeholder: string; package: string; step: string; kind: string; item: string | null; deterministic: boolean; waits_on: string[]; question: string; reads: string[]; state: Obj }[] = [];
  for (const wave of order) for (const s of wave) for (const it of items.get(`${s.package}/${s.step}`) ?? []) {
    const key = keyOf(s, it.id);
    const c = await computeFor(ctx, s, it);
    if (Object.keys(c).length) computed[key] = c;
    if (s.when && !holds(s.when, c)) { skipped.push({ key, why: `when ${s.when.computed} does not hold` }); continue; }
    const inp = await inputsFor(ctx, s, it);
    if (inp.withheld) { withheld.push({ key, why: inp.withheld }); continue; }
    if (inp.missing) { skipped.push({ key, why: inp.missing }); continue; }
    const state: Obj = { ...inp.state };
    for (const a of s.after ?? []) set(state, `steps.${a}`, { pending: keyOf({ ...s, step: a }, it.id) });
    const used = Object.fromEntries(Object.entries(c).filter(([n]) => s.keep?.includes(n) || refsOf(s.question).includes(n)));
    if (Object.keys(used).length) state.computed = used;
    pending.push({ placeholder: key, package: s.package, step: s.step, kind: s.kind, item: it.id, deterministic: !!KINDS[s.kind].judgment,
      waits_on: (s.after ?? []).map((a) => keyOf({ ...s, step: a }, it.id)), question: instructionsFor(s, key), reads: inp.reads ?? [], state });
  }
  return { venture: ctx.venture, computed, pending, skipped, withheld };
}

/**
 * Runs the steps: asks the model in one batch per package per wave, packages in parallel, and writes
 * each judgment through the router. Options: ask (a model function), speculate, write (default true),
 * onEvent (computed first, then each judgment as it arrives), hooks.compute (wraps the code's compute),
 * call (the router's call, or a kit's wrapped one), model (the model name to request), fresh (ask again even
 * when a judgment on the same state exists; otherwise it is reused, and a person's answer always is).
 */
export async function run(dir: string, declared: Declared[], { ask, speculate = false, write = true, fresh = false, onEvent = () => {}, hooks = {}, call = routerCall, workspace, model }: {
  ask?: Ask | null; speculate?: boolean; write?: boolean; fresh?: boolean; onEvent?: (e: Obj) => void;
  hooks?: { compute?: (f: () => Promise<Record<string, Obj>>) => Record<string, Obj> | Promise<Record<string, Obj>> }; call?: Call; workspace?: string; model?: string;
} = {}) {
  if (typeof ask !== "function") throw new Expected("no model: pass --answers <file> or set MENTURA_MODEL_CMD (payload shows what would be asked)", "no model");
  const t0 = wallClock();
  const { ctx, steps, order, items, founder } = await plan(dir, declared, { call, workspace });
  const out: { venture: string; speculate: boolean; judgments: Entry[]; reused: Entry[]; uncertain: Entry[]; discarded: Entry[]; skipped: Entry[]; waiting: Entry[]; withheld: Entry[]; errors: Entry[]; uncaught: Entry[]; computed?: Obj; ms?: number } =
    { venture: ctx.venture, speculate, judgments: [], reused: [], uncertain: [], discarded: [], skipped: [], waiting: [], withheld: [], errors: [], uncaught: [] };
  const answers = new Map<string, { answer: unknown; file: string | null; [k: string]: unknown }>(); // key -> judgment, for steps that read an earlier step

  // Code computes every step's values; judgments that need them wait, the rest may be asked meanwhile.
  const all = steps.flatMap((s) => (items.get(`${s.package}/${s.step}`) ?? []).map((it) => [s, it] as const));
  const computeAll = async () => Object.fromEntries(await Promise.all(all.map(async ([s, it]) => [keyOf(s, it.id), await computeFor(ctx, s, it)] as const)));
  let computed: Record<string, Obj> | null = null;
  const computeP = Promise.resolve(hooks.compute ? hooks.compute(computeAll) : computeAll());
  computeP.then((c) => { computed = c; onEvent({ event: "computed", computed: Object.fromEntries(Object.entries(c).filter(([, v]) => Object.keys(v).length)) }); }, () => {});

  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(f: () => Promise<T>): Promise<T> => (queue = queue.then(f, f));
  const writeJudgment = (s: Step, it: Item, j: Settled, reads: string[], files: string[], by: Judgment["by"]) => serial(async () => {
    const id = judgmentId(s, it.id);
    // checkStep allows only the kinds in KINDS, which are the judgment kinds.
    const rec: Judgment = { id, package: s.package, step: s.step, kind: s.kind as Judgment["kind"], item: it.id, question: s.question, reads, outcome: j.outcome, answer: j.answer, confidence: j.confidence ?? null,
      threshold: j.threshold ?? null, why: j.why, ...(j.kept ? { kept: j.kept } : {}), ...(j.overruled ? { overruled: j.overruled } : {}), ...(j.decision ? { decision: j.decision } : {}),
      by, ...(j.state_sha256 ? { state_sha256: j.state_sha256 } : {}), asked_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z") };
    const person = by.kind === "person";
    const w = await call({ venture: ctx.venture, workspace: ctx.workspace, route: `knowledge/judgment/${id}`, action: "write", input: rec, actor: person ? "person" : "agent", actor_id: person ? undefined : ACTOR,
      provenance: { derived_from: files, ...(j.decision ? { decision: j.decision } : {}), note: `use model: ${s.package}/${s.step}${person ? `, answered by ${by.name}` : ""}`, ...(person ? {} : { agent: by.model ? { model: by.model } : {} }) } });
    const o = outcomeOf(w);
    if (o.outcome !== "answer") throw new Expected(`${id}: ${o.error}`, o.kind);
    return (w.result as { written: string }).written;
  });

  for (const wave of order) {
    const needNow = wave.some((s) => usesComputed(s) || (s.when && !speculate));
    if (needNow) await computeP;
    const batches = new Map<string, { req: Request; qs: { key: string; s: Step; it: Item; reads: string[]; files: string[]; sha: string; speculative: boolean }[] }>(); // package -> { req, qs }
    for (const s of wave) for (const it of items.get(`${s.package}/${s.step}`) ?? []) {
      const key = keyOf(s, it.id), jid = judgmentId(s, it.id);
      const d = founder.get(`judge-${jid}`);
      const prior = existsSync(join(dir, JUDGMENTS, `${jid}.json`)) ? load(join(dir, JUDGMENTS, `${jid}.json`)) as Judgment : null;
      const reuse = (prior: Judgment, why: string) => { answers.set(key, { outcome: prior.outcome, answer: prior.answer, file: `${JUDGMENTS}/${jid}.json` }); out.reused.push({ key, id: jid, answer: prior.answer, why }); onEvent({ event: "judgment", key, outcome: prior.outcome, answer: prior.answer, reused: true }); };
      if (prior?.by?.kind === "person" && prior.outcome !== "uncertain") { reuse(prior, `answered by ${prior.by.name ?? "a person"}`); continue; }
      const own = prior && prior.outcome !== "uncertain" ? confirmedBy(dir, `${JUDGMENTS}/${jid}.json`) : null;
      if (prior && own) { reuse(prior, `confirmed by ${own}`); continue; }
      if (d?.status === "decided") {
        // The founder answered an uncertain judgment: their answer is the judgment, written as theirs.
        const value = s.kind === "score" ? Number(d.answer) : s.kind === "noul" ? d.answer === "true" || d.answer === "yes" : d.answer;
        const j: Settled = { outcome: "answer", answer: value, confidence: null, threshold: null, why: `answered by ${d.provenance?.approved_by ?? "a person"} in decision ${d.id}`, decision: d.id };
        try { const inp = await inputsFor(ctx, s, it); const file = await writeJudgment(s, it, j, inp.reads ?? [], [...(inp.files ?? []), d.file].filter((f): f is string => !!f), { kind: "person", name: d.provenance?.approved_by ?? "person" });
          answers.set(key, { ...j, file }); out.judgments.push({ key, id: jid, ...j, by: "person", written: file }); onEvent({ event: "judgment", key, ...j, by: "person" }); }
        catch (e) { (isObj(e) && e.expected ? out.errors : out.uncaught).push({ key, error: messageOf(e) }); }
        continue;
      }
      if (d && d.status !== "withdrawn") { out.waiting.push({ key, decision: d.id, why: "an earlier answer was uncertain and waits on the founder" }); continue; }
      if (computed && s.when && !holds(s.when, computed[key])) { out.skipped.push({ key, why: `when ${s.when.computed} does not hold` }); continue; }
      const blocked = (s.after ?? []).map((a) => keyOf({ ...s, step: a }, it.id)).find((k) => !answers.has(k));
      if (blocked) { out.skipped.push({ key, why: `waits on ${blocked}, which has no answer yet` }); continue; }
      let inp: Inputs;
      try { inp = await inputsFor(ctx, s, it); } catch (e) { (isObj(e) && e.expected ? out.errors : out.uncaught).push({ key, error: messageOf(e) }); continue; }
      if (inp.withheld) { out.withheld.push({ key, why: inp.withheld }); continue; }
      if (inp.missing) { out.skipped.push({ key, why: inp.missing }); continue; }
      const state: Obj = { ...inp.state };
      const reads = [...(inp.reads ?? [])], files = [...(inp.files ?? [])];
      for (const a of s.after ?? []) {
        // blocked above is empty, so every step this one waits on has an answer.
        const prior = answers.get(keyOf({ ...s, step: a }, it.id));
        if (!prior) continue;
        set(state, `steps.${a}`, prior.answer); reads.push(`${prior.file}#answer`);
        // file is null only for an answer not written (write false), and then nothing is written from files.
        if (prior.file !== null) files.push(prior.file);
      }
      if (usesComputed(s)) {
        // A wave with a step that uses computed values waits on them first.
        const c = computed?.[key] ?? {};
        const used = Object.fromEntries(Object.entries(c).filter(([n]) => s.keep?.includes(n) || refsOf(s.question).includes(n)));
        const missing = Object.entries(used).find(([, v]) => v === undefined);
        if (missing) { out.skipped.push({ key, why: `code has no value for ${missing[0]}` }); continue; }
        state.computed = used;
      }
      const sha = createHash("sha256").update(JSON.stringify({ question: s.question, state })).digest("hex");
      if (!fresh && prior?.by?.kind === "model" && prior.outcome !== "uncertain" && prior.state_sha256 === sha) { reuse(prior, "asked before on the same state"); continue; }
      if (JSON.stringify(state).length > (s.budget ?? BUDGET)) { out.errors.push({ key, error: `the state is over the step's context budget of ${s.budget ?? BUDGET} characters: ask a narrower question` }); continue; }
      let b = batches.get(s.package);
      if (!b) { b = { req: { model: model ?? "default", state: {}, questions: {} }, qs: [] }; batches.set(s.package, b); }
      b.req.state[key] = state;
      b.req.questions[key] = questionFor(s, key);
      b.qs.push({ key, s, it, reads, files: [...new Set(files)], sha, speculative: !!(s.when && !computed) });
    }
    // One request per package, all at once; one failing or uncertain answer never sinks the rest.
    const settled = await Promise.allSettled([...batches.values()].map(async ({ req, qs }) => {
      try { assertJson(req.state); checkRequest(req); } catch (e) { throw isObj(e) && e.expected ? new Uncaught(`the assembled request is not plain JSON: ${messageOf(e)}`) : e; }
      let res: ModelReply | null | undefined;
      try { res = await ask(req); }
      catch (e) { for (const q of qs) out.errors.push({ key: q.key, error: (e as { message?: string }).message ?? String(e) }); return; }
      const c = await computeP;
      await Promise.all(qs.map(async (q) => {
        const cq = c[q.key] ?? {};
        if (q.s.when && !holds(q.s.when, cq)) { out.discarded.push({ key: q.key, why: `asked while code computed; when ${q.s.when.computed} does not hold, so the answer is not used` }); onEvent({ event: "discarded", key: q.key }); return; }
        const j: Settled = { ...settle(q.s, res?.answers?.[q.key], cq), state_sha256: q.sha };
        const jid = judgmentId(q.s, q.it.id);
        if (j.outcome === "uncertain") j.decision = `judge-${jid}`;
        try {
          const file = await (write ? writeJudgment(q.s, q.it, j, q.reads, q.files, { kind: "model", ...(res?.model ? { model: String(res.model) } : {}) }) : null);
          if (j.outcome === "uncertain" && write) await serial(async () => {
            const p = propose(dir, { id: j.decision, at: "knowledge", question: `${q.s.package}/${q.s.step}${q.it.id ? ` for ${q.it.id}` : ""}: ${q.s.question} (the model was not sure: ${j.why})`, layer: "knowledge", boundary: "fail-open",
              decides: { record: "judgment", path: `${JUDGMENTS}/${jid}.json` }, ...(q.s.options ? { options: q.s.options } : {}), note: `Answer with mentura decide ${j.decision} --by <name> --answer <answer>; the next run writes it as the judgment. The model read ${q.reads.join(", ")}.` },
              { agentId: ACTOR } as Parameters<typeof propose>[2]);
            if (!p.ok) throw new Expected(`could not route ${jid} to the founder: ${p.error}`, "refused");
          });
          if (j.outcome !== "uncertain") answers.set(q.key, { ...j, file });
          out.judgments.push({ key: q.key, id: jid, outcome: j.outcome, answer: j.answer, confidence: j.confidence, why: j.why, by: "model", ...(file ? { written: file } : {}) });
          if (j.outcome === "uncertain") out.uncertain.push({ key: q.key, decision: j.decision, why: j.why });
          onEvent({ event: "judgment", key: q.key, outcome: j.outcome, answer: j.answer, confidence: j.confidence, why: j.why });
        } catch (e) { (isObj(e) && e.expected ? out.errors : out.uncaught).push({ key: q.key, error: messageOf(e) }); }
      }));
    }));
    for (const r of settled) if (r.status === "rejected") out.uncaught.push({ error: r.reason?.message ?? String(r.reason) });
  }
  out.computed = Object.fromEntries(Object.entries(await computeP).filter(([, v]) => Object.keys(v).length));
  await queue;
  out.ms = wallClock() - t0;
  onEvent({ event: "done", judgments: out.judgments.length, uncertain: out.uncertain.length, discarded: out.discarded.length, uncaught: out.uncaught.length });
  return out;
}

// ---- Provenance downstream of a model (S-9, S-10) -------------------------------------------------

const WRITES = new Set(["write", "draft", "accept", "baseline", "move"]);
/** The person who confirmed a file's current content, or null. */
function confirmedBy(dir: string, file: string) {
  const es: LogEntry[] = provEntries(dir).filter((e) => e.entity === file);
  const last = es.filter((e) => WRITES.has(e.activity)).at(-1);
  const c = last && es.slice(es.indexOf(last) + 1).find((e) => e.activity === "confirm" && e.agent?.kind === "person");
  return c ? c.agent?.id ?? "a person" : null;
}
const isModelJudgment = (dir: string, f: string) => {
  if (!glob(`${JUDGMENTS}/*.json`).test(f) || !existsSync(ventureFile(dir, f))) return false;
  try { return (load(ventureFile(dir, f)) as Judgment).by?.kind === "model"; } catch { return false; }
};

/** Whose a file is, as provenanceOf reports it. */
export type Whose = { entity: string; status: string; model: boolean; downstream_of_model: string[]; why: string };

/**
 * Whose a file is: "person" (a person wrote, accepted or confirmed it), "agent", or "clear" (an agent's,
 * and its checks pass). model is true for a model's judgment; downstream_of_model lists the model
 * outputs an agent's record was derived from. A person's record a step read stays the person's.
 */
export async function provenanceOf(dir: string, file: string, { checks = false, call = routerCall, workspace, seen = new Set<string>() }: { checks?: boolean; call?: Call; workspace?: string; seen?: Set<string> } = {}): Promise<Whose> {
  seen.add(file);
  const es: LogEntry[] = provEntries(dir).filter((e) => e.entity === file);
  const writes = es.filter((e) => WRITES.has(e.activity));
  const last = writes.at(-1);
  if (!last) return { entity: file, status: "unlogged", model: false, downstream_of_model: [], why: "not in the provenance log" };
  const confirmed = es.slice(es.indexOf(last) + 1).find((e) => e.activity === "confirm" && e.agent?.kind === "person");
  const model = isModelJudgment(dir, file) && last.agent?.kind === "agent";
  if (last.agent?.kind === "person" || confirmed) return { entity: file, status: "person", model: false, downstream_of_model: [],
    why: confirmed ? `confirmed by ${confirmed.agent?.id ?? "a person"}` : `${last.activity === "accept" ? "accepted" : "written"} by ${last.agent?.id ?? "a person"}` };
  const upstream: string[] = [];
  for (const d of (last.derived_from ?? []).map((x) => x.split("#")[0]).filter((x) => !seen.has(x) && existsSync(ventureFile(dir, x)))) {
    const u = await provenanceOf(dir, d, { seen });
    if (u.model) upstream.push(d); else upstream.push(...u.downstream_of_model);
  }
  const res = { entity: file, status: "agent", model, downstream_of_model: [...new Set(upstream)], why: model ? `a model's judgment (${last.note ?? "use model"}); a person confirms it` : upstream.length ? "an agent wrote it from a model's output" : "an agent wrote it" };
  if (checks && !(model && (load(ventureFile(dir, file)) as Judgment).kind === "draft") && last.route) {
    const venture = (load(join(dir, "venture.json")) as Venture).id;
    const r = await call({ venture, workspace: workspace ?? dirname(dir), route: last.route, action: "check" });
    const ran = r.result as { check: string }[] | null | undefined;
    if (r.ok && ran?.length) return { ...res, status: "clear", why: `${res.why}; its checks pass (${ran.map((x) => x.check).join(", ")})` };
  }
  return res;
}

/** A person confirms a judgment as theirs: the content is unchanged and the log records the confirmation. */
export function confirm(dir: string, id: string, { by, note }: { by?: string; note?: string } = {}) {
  if (!by) throw new Expected("confirming needs the person's name (--by)", "refused");
  const file = `${JUDGMENTS}/${id}.json`;
  if (!existsSync(ventureFile(dir, file))) throw new Expected(`no judgment ${id}`, "missing record");
  const j = load(ventureFile(dir, file)) as Judgment;
  if (j.outcome === "uncertain") throw new Expected(`${id} is uncertain: answer its decision ${j.decision} instead`, "refused");
  const e = prov(dir, ({ entity: file, route: `knowledge/judgment/${id}`, activity: "confirm", agent: agentFromEnv("person", "cli", { id: by }), note: note ?? `confirmed ${j.package}/${j.step}${j.item ? ` for ${j.item}` : ""}` }) as Parameters<typeof prov>[1]);
  return { confirmed: id, by, provenance: e.hash };
}

// ---- The waterfall: the venture's real order (F-10) ------------------------------------------------

/** Records in order: each after the records it reads first (packages/naive/library/packages/catalog.json records.after). A cycle is uncaught. */
export async function waterfall(dir: string | null | undefined, { graph }: { graph?: Record<string, string[]> } = {}) {
  const after: Record<string, string[]> = graph ?? Object.fromEntries(Object.entries(loadPackages(repo).records as Record<string, { after?: string[] }>).map(([k, v]) => [k, v.after ?? []]));
  const types = [...new Set([...Object.keys(after), ...Object.values(after).flat()])].sort();
  const deps = (t: string) => after[t] ?? [];
  const order: string[][] = [], done = new Set<string>();
  while (done.size < types.length) {
    const wave = types.filter((t) => !done.has(t) && deps(t).every((d) => done.has(d)));
    if (!wave.length) {
      const left = types.filter((t) => !done.has(t));
      const cycle = [left[0]]; let at = left[0];
      // Each record left waits on one not done, so the walk always finds the next.
      for (;;) { const next = deps(at).find((d) => !done.has(d)); if (next === undefined) break; at = next; if (cycle.includes(at)) { cycle.push(at); break; } cycle.push(at); }
      throw new Uncaught(`a cycle in the record order: ${cycle.slice(cycle.indexOf(at)).join(" -> ")}`);
    }
    wave.forEach((t) => done.add(t));
    order.push(wave);
  }
  let status = new Map<string, string>();
  if (dir) {
    const { packages } = await import("../../engine/packages.ts");
    const p = packages(dir) as { core: { records: { record: string; status: string }[] }[] };
    status = new Map(p.core.flatMap((c) => c.records.map((r) => [r.record, r.status] as const)));
  }
  const st = (t: string) => status.get(t) ?? "missing";
  const records = order.flatMap((w, i) => w.map((t) => {
    const waits = deps(t).filter((d) => st(d) !== "confirmed");
    return { record: t, wave: i, status: st(t), after: deps(t), moves: st(t) === "confirmed" ? "done" : waits.length ? "waits" : "now", ...(waits.length && st(t) !== "confirmed" ? { waits_on: waits } : {}) };
  }));
  return { order, records, now: records.filter((r) => r.moves === "now").map((r) => r.record) };
}

// ---- Command line ---------------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const flag = (n: string) => argv.includes(`--${n}`);
  const [dirArg, sub, arg] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["json", "speculate", "stream", "checks", "fresh"].includes(argv[i - 1].slice(2))));
  const usage = () => { console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   node ")).map((l) => l.slice(5)).join("\n")); process.exit(2); };
  if (!dirArg || !sub || !existsSync(join(resolvePath(dirArg), "venture.json"))) usage();
  const dir = resolvePath(dirArg);
  const json = flag("json");
  const print = (x: unknown) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));
  const pick = () => { const pkg = opt("package"), kit = opt("kit"); return stepsOf({ packages: pkg ? [pkg] : undefined, kit: kit ? resolvePath(kit) : undefined }); };
  const kitCall = async (): Promise<Call> => {
    const kit = opt("kit");
    if (!kit) return routerCall;
    const { wrap } = await import("../kit-boundary.ts");
    return wrap(load(resolvePath(kit)) as BoundedKit);
  };
  try {
    if (sub === "check") {
      const errors = await checkSteps(pick(), { dir, call: await kitCall() });
      if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
      print(`${pick().length} model steps check: each asks one typed question about named fields, in order, and no private field reaches a model.`);
    } else if (sub === "payload") {
      const p = await payload(dir, pick(), { call: await kitCall() });
      print(json ? p : [`${p.pending.length} judgments pending, ${Object.keys(p.computed).length} computed by code, ${p.withheld.length} withheld, ${p.skipped.length} skipped.`,
        ...p.pending.map((x) => `  ${x.placeholder}  ${x.kind}${x.waits_on.length ? `  waits on ${x.waits_on.join(", ")}` : ""}`), ...p.withheld.map((x) => `  withheld ${x.key}: ${x.why}`)].join("\n"));
    } else if (sub === "run") {
      const answersFile = opt("answers");
      const ask = answersFile ? answersModel(resolvePath(answersFile)) : envCommand("MENTURA_MODEL_CMD") ? commandModel(String(envCommand("MENTURA_MODEL_CMD"))) : null;
      const stream = flag("stream");
      const r = await run(dir, pick(), { ask, speculate: flag("speculate"), fresh: flag("fresh"), call: await kitCall(), onEvent: stream ? (e) => console.log(JSON.stringify(e)) : undefined });
      if (!stream) print(json ? r : [
        ...r.reused.map((j) => `${j.key}  reused  ${JSON.stringify(j.answer)}  (${j.why})`),
        ...r.judgments.map((j) => `${j.key}  ${j.outcome}${j.answer !== null ? `  ${JSON.stringify(j.answer)}` : ""}${j.confidence !== null && j.confidence !== undefined ? `  (${j.confidence})` : ""}`),
        ...r.uncertain.map((u) => `uncertain ${u.key}: ${u.why}; the founder answers decision ${u.decision}`),
        ...r.waiting.map((w) => `waiting ${w.key}: decision ${w.decision}`), ...r.discarded.map((d) => `discarded ${d.key}`), ...r.skipped.map((s) => `skipped ${s.key}: ${s.why}`),
        ...r.withheld.map((w) => `withheld ${w.key}: ${w.why}`), ...r.errors.map((e) => `error ${e.key}: ${e.error}`), ...r.uncaught.map((e) => `UNCAUGHT ${e.error}`)].join("\n") || "nothing to ask");
      if (r.uncaught.length) process.exit(1);
    } else if (sub === "waterfall") {
      const w = await waterfall(dir);
      print(json ? w : w.order.map((wave, i) => `${i}: ${wave.map((t) => { const r = w.records.find((x) => x.record === t); return `${t} (${r?.moves}${r?.waits_on ? ` on ${r.waits_on.join(", ")}` : ""})`; }).join(", ")}`).join("\n"));
    } else if (sub === "provenance") {
      if (!arg) usage();
      const p = await provenanceOf(dir, arg, { checks: flag("checks") });
      print(json ? p : `${p.entity}: ${p.status}${p.model ? " (a model's judgment)" : ""}${p.downstream_of_model.length ? ` (downstream of ${p.downstream_of_model.join(", ")})` : ""}: ${p.why}`);
    } else if (sub === "confirm") {
      if (!arg) usage();
      print(confirm(dir, arg, { by: opt("by"), note: opt("note") }));
    } else usage();
  } catch (e) {
    const o = outcomeOf(e);
    console.error(o.outcome === "uncaught" ? `uncaught: ${messageOf(e)}` : messageOf(e));
    process.exit(1);
  }
}
