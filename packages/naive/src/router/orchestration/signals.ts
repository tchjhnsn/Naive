#!/usr/bin/env node
// The signal pull (signal library design, build item 5; everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md,
// "Derivation, deterministic and replayable"). The signal engine (packages/naive/src/engine/signals.ts) reads and
// decides; this commits, at router level, because only router code may act as the signal projector (asProjector in
// packages/naive/src/router/acting.ts).
//
//   pull      touched records from new log lines and the provenance log; render; diff; commit each new or changed
//             record through the router as the projector, with derived_from set to the cited signal addresses and
//             fact files; verify an unchanged one (freshness), never rewrite it; propose through decisions.propose;
//             mark through stale.mark; move the cursor only after the commit. A pull after a pull writes nothing.
//             A pattern with a live recipe (<pattern>.recipe.ts, autoresearch design, everything-ecosystem
//             docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, build plan item 9) renders through it in the sandbox
//             instead of the plain fold, and its receptions go beside each record (<record>.reception.json); once a
//             render's horizon has passed, a pull fills each reception's hindsight label. With durable.engine set
//             in naive.config.json the pull runs as a durable workflow (pullDurable, EE-161 phase 12b): a pull that
//             dies resumes with the plan it made and writes nothing twice.
//   explain   one signal at every listener: salient or noise, and why
//   replay    render every projected record again from what it cites and report drift; writes nothing
//   emit      a person records a signal in the venture's local library (raw/signals/), its address computed
//
//   node packages/naive/src/router/orchestration/signals.ts <venture dir> pull [--now <iso>] [--json]
//   node packages/naive/src/router/orchestration/signals.ts <venture dir> explain <signal id> [--now <iso>] [--json]
//   node packages/naive/src/router/orchestration/signals.ts <venture dir> replay [--json]
//   node packages/naive/src/router/orchestration/signals.ts <venture dir> emit <type> --props '<json>' [--subject <id>]
//        [--time <date>] [--rating B2] [--by <person>] [--cite <url>] [--supersedes <signal id> | --retracts <signal id>] [--json]
//
// The routes system/signals (pull), system/signals/replay and system/signals/explain run it through the router.
// It calls no model and copies no library signal into the venture.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readBlob } from "../../core/blobs.ts";
import { activityStep, closeRun, engineLayer, isDurable, openRun, plainStep, runDurable, type Step } from "../../core/effect/durable.ts";
import { canonicalJson } from "../../core/signal-id.ts";
import { entries, record } from "../../core/provenance.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { decisionFile, propose } from "../../engine/decisions.ts";
import { events, verify } from "../../engine/freshness.ts";
import { mark } from "../../engine/stale.ts";
import { LOCAL, connect, sourcesOf } from "../../store/connectors/index.ts";
import * as S from "../../engine/signals.ts";
import type { Change, Facts, Library, Merged, ProvLine, Pulled, Rendered, Typed } from "../../engine/signals.ts";
import { receptionPath } from "../../engine/generators/reception.ts";
import { loadSignals } from "../../engine/recipes/eval-set.ts";
import { factsAsOf, hindsightDoc, hindsightDue, liveRecipes, rangeIds, receptionsDoc, renderSubjects, sameReceptions, subjectIn } from "../../engine/recipes/render.ts";
import type { LiveRecipe, SubjectRender } from "../../engine/recipes/render.ts";
import { recipeExports } from "../../engine/recipes/sandbox.ts";
import { durationMs } from "../../engine/recipes/scoring.ts";
import type { Known } from "../../engine/recipes/outcomes.ts";
import type { Reception as Receptions, SignalType } from "../../records/types/records.d.ts";
import { asProjector } from "../acting.ts";
import { call } from "../router.ts";
import type { WorkflowEngine, WorkflowInstance } from "effect/workflow/WorkflowEngine";
import { nowMs } from "../../core/clock.ts";

type Reply = { ok: boolean; error?: string; result?: unknown };
type Venture = { id: string; phase?: string };
const load = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const iso = (t: number | string) => new Date(t).toISOString().replace(/\.\d+Z$/, "Z");

/** Everything a pull, explain or replay reads first: libraries, types, listeners and the types heard. */
async function context(dir: string) {
  const v = load(join(dir, "venture.json")) as Venture;
  const libs = await S.libraries(dir);
  const typeSets = await Promise.all(libs.map((l) => S.typesIn(l)));
  const merged = S.mergeTypes(typeSets.map((t) => t.types));
  const { listeners, problems: lp } = S.listenersOf(dir);
  const heard = S.heardTypes(listeners, merged.types);
  const problems = [...libs.flatMap((l) => (l.problem ? [l.problem] : [])), ...typeSets.flatMap((t) => t.problems), ...merged.problems, ...lp];
  return { v, libs, types: merged.types, listeners, heard, problems };
}

const projector = (v: Venture, dir: string, route: string, action: string, extra: Record<string, unknown> = {}) =>
  call(asProjector({ venture: v.id, workspace: dir, route, action, via: "router", ...extra }) as Parameters<typeof call>[0]) as Promise<Reply>;

/** The facts the listeners read: each file#field read through the router as the projector, and each collection's ids. */
async function factsOf(dir: string, v: Venture, listeners: readonly Merged[]): Promise<{ facts: Facts; problems: string[] }> {
  const read: Record<string, unknown> = {};
  const problems: string[] = [];
  for (const ref of S.factRefs(listeners)) {
    const [file, field = ""] = ref.split("#");
    const route = S.routerRoute(file);
    if (!route) { problems.push(`the fact ${ref}: no record type lives at ${file}, so no predicate can read it`); continue; }
    const r = await projector(v, dir, route, "read");
    if (!r.ok) { problems.push(`the fact ${ref}: ${r.error}`); continue; }
    if (r.result !== null && r.result !== undefined) read[ref] = S.fieldOf(r.result, field);
  }
  const ids: Record<string, string[]> = {};
  for (const c of S.collectionsOf(listeners)) ids[c] = await S.idsIn(dir, c);
  return { facts: { read, ids }, problems };
}

/** Every signal of the heard types about these subjects, across the libraries; listeners that project to a route
 *  with no [id] need every subject of the types they hear. */
async function gather(libs: readonly Library[], heard: readonly string[], subjects: ReadonlySet<string>, types: readonly Typed[], listeners: readonly Merged[]) {
  const whole = S.heardTypes(listeners.filter((l) => l.then === "project" && l.consumer && "route" in l.consumer && !l.consumer.route.includes("[id]")), types);
  const sets = await Promise.all(libs.map(async (l) => {
    const some = await S.signalsOf(l, heard.filter((t) => !whole.includes(t)), subjects, types);
    const all = whole.length ? await S.signalsOf(l, whole, null, types) : { signals: [], problems: [] };
    return { signals: [...some.signals, ...all.signals], problems: [...some.problems, ...all.problems] };
  }));
  return { signals: S.dedupeSignals(sets.map((s) => s.signals)), problems: sets.flatMap((s) => s.problems) };
}

/** Rendered records against what the venture holds now, read through the router as the projector. */
async function current(dir: string, v: Venture, routes: readonly string[]) {
  const now: Record<string, unknown> = {};
  const where: Record<string, { file: string; route: string }> = {};
  const problems: string[] = [];
  for (const r of routes) {
    const file = S.recordFile(r);
    const route = S.routerRoute(file);
    if (!route) { problems.push(`${r}: no record type lives at ${file}; the projection names a route the data model does not have`); continue; }
    where[r] = { file, route };
    const got = await projector(v, dir, route, "read");
    if (!got.ok) { problems.push(`${route}: ${got.error}`); continue; }
    if (got.result !== null && got.result !== undefined) now[r] = got.result;
  }
  return { now, where, problems };
}

// ---- Recipes ----

type Store = { read(_p: string): Promise<{ content: string; version: string } | null>; write(_p: string, _content: string, _opts?: { base?: string | null; append?: boolean }): Promise<unknown> };
/** The venture's own store, through its connector, so a hosted venture's files are read and written the same way. */
async function ventureStore(dir: string): Promise<Store> {
  const venture = (sourcesOf(dir) as { sources: { id: string }[] }).sources.find((s) => s.id === LOCAL);
  return await connect(venture, dir) as Store;
}
const readText = (store: Store) => async (p: string) => (await store.read(p))?.content ?? null;

/** The facts a recipe names, each file#field read through the router as the projector, as of now. */
async function recipeFacts(dir: string, v: Venture, recipe: LiveRecipe): Promise<{ values: Record<string, unknown>; problems: string[] }> {
  const values: Record<string, unknown> = {};
  const problems: string[] = [];
  for (const [name, ref] of Object.entries(recipe.facts)) {
    const [file, field = ""] = ref.split("#");
    const route = S.routerRoute(file);
    values[name] = null;
    if (!route) { problems.push(`${recipe.file}: the fact ${name} reads ${file}, where no record type lives`); continue; }
    const r = await projector(v, dir, route, "read");
    if (!r.ok) { problems.push(`${recipe.file}: the fact ${name}: ${r.error}`); continue; }
    values[name] = r.result === null || r.result === undefined ? null : S.fieldOf(r.result, field) ?? null;
  }
  return { values, problems };
}

type ByRecipe = { recipe: LiveRecipe; render: SubjectRender };
type Through = { ok: true; records: Rendered[]; rendered: ByRecipe[]; noise: number; known: Known[]; types: SignalType[]; problems: string[]; error?: undefined } | { ok: false; error: string };

/**
 * The plain render's records with every route a live recipe owns replaced by what the recipe renders for each
 * subject as of now. The listeners' render still runs whole, so proposals, marks and the ids other listeners read do
 * not change; only the records at a recipe's pattern, and the receptions of the listeners that project there, are
 * the recipe's. A recipe that renders null for a subject writes nothing for it.
 */
async function throughRecipes(dir: string, v: Venture, listeners: readonly Merged[], recipes: readonly LiveRecipe[], subjects: readonly string[], plain: { records: readonly Rendered[]; receptions: readonly { kind: string; listener: string }[] }, types: readonly Typed[], now: string): Promise<Through> {
  const owned = (route: string) => recipes.some((r) => subjectIn(r.pattern, route) !== null);
  const replaced = new Set(listeners.filter((l) => l.then === "project" && l.consumer && "route" in l.consumer && recipes.some((r) => l.consumer && "route" in l.consumer && r.pattern === l.consumer.route)).map((l) => l.id));
  const plainNoise = plain.receptions.filter((x) => x.kind === "noise" && !replaced.has(x.listener)).length;
  if (!recipes.length) return { ok: true, records: [...plain.records], rendered: [], noise: plainNoise, known: [], types: [], problems: [] };
  const all = await loadSignals(dir);
  const rendered: ByRecipe[] = [];
  const problems: string[] = [];
  for (const recipe of recipes) {
    const f = await recipeFacts(dir, v, recipe);
    problems.push(...f.problems);
    const lint = await S.idsIn(dir, recipe.pattern.split("/[id]")[0]);
    const r = await renderSubjects(recipe, subjects, all.known, f.values, Date.parse(now), lint);
    if (!r.ok) return { ok: false, error: r.reason };
    for (const x of r.rendered) rendered.push({ recipe, render: x });
  }
  const once = (pattern: string) => types.some((t) => t.projects.some((p) => p.route === pattern && p.once));
  const records: Rendered[] = [...plain.records.filter((x) => !owned(x.route)), ...rendered.filter((x) => x.render.record !== null).map(({ recipe, render }) => ({
    route: render.route, record: render.record as Record<string, unknown>, once: once(recipe.pattern),
    cites: render.receptions.filter((x) => x.kind === "salient").map((x) => String(x.signal)).sort(), facts: Object.values(recipe.facts).sort(),
  }))].sort((a, b) => (a.route < b.route ? -1 : a.route > b.route ? 1 : 0));
  const noise = plainNoise + rendered.reduce((n, x) => n + x.render.receptions.filter((r) => r.kind === "noise").length, 0);
  return { ok: true, records, rendered, noise, known: all.known, types: all.types, problems };
}

/** A file only the projector writes, through the venture's store, logged in provenance as the projector's. */
async function writeProjected(dir: string, store: Store, file: string, value: unknown, base: string | null, entry: { route: string; derived_from?: string[]; note: string }) {
  const text = JSON.stringify(value, null, 2) + "\n";
  await store.write(file, text, { base });
  record(dir, { entity: file, route: entry.route, activity: base === null ? "create" : "write", agent: { ...S.PROJECTOR_AGENT }, derived_from: entry.derived_from, note: entry.note, content: text });
}

/** A receptions file the commit writes: the document, built when the pull plans, and how provenance names it. */
type ReceptionWrite = { file: string; doc: unknown; derived_from: string[]; note: string };

/** Each recipe record's receptions beside it: written with a new or changed record, and with an unchanged one only
 *  when what the receptions say changed. A record a person keeps gets none. Built before anything is written, so the
 *  commit only writes; a document that cannot be built stops the list there, as an error the commit reports after
 *  the records and the receptions before it are written. */
async function receptionsPlan(store: Store, t: Extract<Through, { ok: true }>, changes: readonly Change[], now: string): Promise<{ writes: ReceptionWrite[]; error?: string }> {
  const writes: ReceptionWrite[] = [];
  for (const { recipe, render } of t.rendered) {
    const ch = changes.find((c) => c.route === render.route);
    if (render.record === null || !ch || ch.kind === "kept") continue;
    const recordFile = S.recordFile(render.route);
    const file = receptionPath(recordFile);
    const built = receptionsDoc({ record: recordFile, recipe: recipe.sha256, asOf: Date.parse(now), rendered: render, known: t.known, types: t.types, horizon: recipe.type.settles ? durationMs(recipe.type.settles.horizon) : null });
    if (!built.ok) return { writes, error: `${file}: ${built.errors.join("; ")}` };
    const held = await store.read(file);
    if (held && ch.kind === "unchanged") { try { if (sameReceptions(JSON.parse(held.content) as Receptions, built.doc)) continue; } catch { /* rewrite a file that is not JSON */ } }
    writes.push({ file, doc: built.doc, derived_from: [recordFile], note: `signal pull: receptions of ${recipe.file} (${recipe.sha256.slice(0, 12)}) as of ${now}` });
  }
  return { writes };
}

/** A receptions file whose hindsight is due, by the recipe's index in the live recipes, or a file that cannot be read. */
type HindsightItem = { problem: string } | { recipe: number; id: string; file: string };
type Loaded = { known: Known[]; types: SignalType[] };

/** The receptions files of the live recipes' patterns whose render's horizon has passed, in the order they are labelled. */
async function hindsightList(dir: string, store: Store, recipes: readonly LiveRecipe[], now: string): Promise<HindsightItem[]> {
  const items: HindsightItem[] = [];
  for (const [i, recipe] of recipes.entries()) {
    const settles = recipe.type.settles;
    if (!settles) continue;
    const h = durationMs(settles.horizon);
    for (const id of await S.idsIn(dir, recipe.pattern.split("/[id]")[0])) {
      const file = receptionPath(S.recordFile(S.fill(recipe.pattern, id)));
      const held = await store.read(file);
      if (!held) continue;
      let doc: Receptions;
      try { doc = JSON.parse(held.content) as Receptions; } catch { items.push({ problem: `${file} is not JSON: no hindsight` }); continue; }
      if (hindsightDue(doc, h, Date.parse(now))) items.push({ recipe: i, id, file });
    }
  }
  return items;
}

/**
 * Hindsight for one receptions file: the recipe that rendered it (the live one, or its source from the blob store)
 * runs again at the render's as-of point with and without each signal, scored against the settled record. A file it
 * cannot label is named in problem and left as it is. On a durable run a file no longer due was labelled by this run
 * before a crash, so it counts as written and is not written again.
 */
async function labelHindsight(dir: string, store: Store, recipe: LiveRecipe, id: string, file: string, now: string, signals: () => Promise<Loaded>, durable: boolean): Promise<{ written: boolean; problem?: string }> {
  const settles = recipe.type.settles;
  const held = await store.read(file);
  if (!settles || !held) return { written: false };
  const recordFile = S.recordFile(S.fill(recipe.pattern, id));
  let doc: Receptions;
  try { doc = JSON.parse(held.content) as Receptions; } catch { return { written: false, problem: `${file} is not JSON: no hindsight` }; }
  if (!hindsightDue(doc, durationMs(settles.horizon), Date.parse(now))) return { written: durable };
  let source: string | null = null, ranges = recipe.ranges, facts = recipe.facts;
  if (doc.recipe === recipe.sha256) source = recipe.source;
  else {
    source = (readBlob(dir, doc.recipe) as Buffer | null)?.toString("utf8") ?? null;
    if (source !== null) {
      const ex = await recipeExports(source);
      if (!ex.ok) return { written: false, problem: `${file}: the recipe ${doc.recipe} that rendered it does not run (${ex.reason}): no hindsight` };
      ranges = ex.output.hears.signals as string[];
      facts = Object.fromEntries(Object.entries(ex.output.hears.facts ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"));
    }
  }
  if (source === null) return { written: false, problem: `${file}: the recipe ${doc.recipe} that rendered it is neither live nor in the blob store: no hindsight` };
  const all = await signals();
  const hd = await hindsightDoc({ doc, source, ranges, pattern: recipe.pattern, subject: id, schema: recipe.type.schema, known: all.known, types: all.types, settles, facts: factsAsOf(dir, facts, Date.parse(doc.as_of)), now: Date.parse(now) });
  if (!hd.ok) return { written: false, problem: `${file}: no hindsight: ${hd.reason}` };
  await writeProjected(dir, store, file, hd.doc, held.version, { route: "knowledge/reception", derived_from: [recordFile], note: `signal pull: hindsight for the receptions as of ${doc.as_of}` });
  return { written: true };
}

/**
 * Hindsight for every receptions file of a live recipe's pattern whose render's horizon has passed. The list is one
 * step and each file's labelling its own. A record type with no settles has no horizon, so its receptions get no
 * hindsight.
 */
async function fillHindsight(dir: string, store: Store, recipes: readonly LiveRecipe[], now: string, loaded: Loaded | null, step: Step, durable: boolean): Promise<{ written: string[]; problems: string[] }> {
  const written: string[] = [];
  const problems: string[] = [];
  let all = loaded;
  const signals = async () => (all ??= await loadSignals(dir));
  const items = await step("hindsight", () => hindsightList(dir, store, recipes, now));
  for (const x of items) {
    if ("problem" in x) { problems.push(x.problem); continue; }
    const r = await step(`hindsight/${x.file}`, () => labelHindsight(dir, store, recipes[x.recipe], x.id, x.file, now, signals, durable));
    if (r.problem) problems.push(r.problem); else if (r.written) written.push(x.file);
  }
  return { written, problems };
}

export type PullResult = {
  ok: boolean;
  status: "pulled" | "nothing new" | "raised" | "failed";
  touched: Record<string, string[]>;
  written: string[];
  verified: string[];
  kept: string[];
  proposed: string[];
  marked: string[];
  /** Receptions files written beside recipe records, and those given hindsight labels. */
  receptions: string[];
  hindsight: string[];
  noise: number;
  problems: string[];
  error?: string;
  why?: string;
};

/** One record the commit acts on: write a new or changed one, verify an unchanged one, or keep a person's. */
type Commit =
  | { kind: "write"; file: string; route: string; record: Record<string, unknown>; derived: string[]; note: string }
  | { kind: "verify"; file: string }
  | { kind: "kept"; file: string };
/** What a pull decided before writing anything, as JSON, so a resumed durable pull commits the same plan. */
type Plan =
  | { at: "done"; out: PullResult }
  | { at: "nothing"; out: PullResult; now: string; cursor: S.Cursor | null; recipes: LiveRecipe[] }
  | {
    at: "commit"; out: PullResult; now: string; v: Venture; commits: Commit[]; receptions: ReceptionWrite[]; receptionError?: string;
    proposals: { id: string; input: Record<string, unknown> }[]; marks: { file: string; listener: string; source: string; addr: string }[];
    libraries: S.Cursor["libraries"]; recipes: LiveRecipe[];
  };

/** Everything a pull reads and decides: new lines, touched subjects, the render, recipe renders and the diff against
 *  what the venture holds now. It writes nothing. keep is handed the loaded signals, for hindsight in this process. */
async function planPull(dir: string, store: Store, now: string, keep: (_l: Loaded) => void): Promise<Plan> {
  const c = await context(dir);
  const cursor = S.readCursor(dir);
  const out: PullResult = { ok: true, status: "pulled", touched: {}, written: [], verified: [], kept: [], proposed: [], marked: [], receptions: [], hindsight: [], noise: 0, problems: [...c.problems] };
  const live = await liveRecipes(readText(store));
  if (live.failures.length) return { at: "done", out: { ...out, ok: false, status: "failed", error: `a live recipe cannot be read, so its pattern is not rendered: ${live.failures.join("; ")}` } };
  const heard = [...new Set([...c.heard, ...live.recipes.flatMap((r) => rangeIds(r.ranges))])].sort();
  // New log lines per library, and the signals they name.
  const counts: Record<string, Record<string, number>> = {};
  const fresh: Pulled[] = [];
  for (const lib of c.libs.filter((l) => l.store)) {
    const n = await S.newLines(lib, heard, cursor.libraries[lib.id] ?? {});
    counts[lib.id] = n.counts;
    out.problems.push(...n.problems);
    for (const line of n.lines) {
      const r = await S.readSignal(lib, line.path, c.types);
      if (r.signal) fresh.push(r.signal); else if (r.problem) out.problems.push(r.problem);
    }
  }
  const log = entries(dir) as ProvLine[];
  const touched = S.touched({ fresh, log, since: cursor.provenance, collections: S.collectionsOf(c.listeners), facts: [...S.factRefs(c.listeners).map(S.factFile), ...live.recipes.flatMap((r) => Object.values(r.facts).map(S.factFile))] });
  out.touched = Object.fromEntries(touched);
  const next = { libraries: { ...cursor.libraries, ...counts }, provenance: log.at(-1)?.hash ?? null };
  const moved = JSON.stringify(next.libraries) !== JSON.stringify(cursor.libraries);
  // Nothing to render. The cursor moves only when a library published lines no listener could use.
  if (!touched.size) return { at: "nothing", out, now, cursor: moved ? { ...next, provenance: cursor.provenance, pulled_at: now } : null, recipes: live.recipes };
  const subjects = new Set(touched.keys());
  const g = await gather(c.libs, heard, subjects, c.types, c.listeners);
  out.problems.push(...g.problems);
  const f = await factsOf(dir, c.v, c.listeners);
  out.problems.push(...f.problems);
  const r = S.render({ signals: g.signals, types: c.types, listeners: c.listeners, facts: f.facts, now });
  out.problems.push(...r.problems, ...r.withdrawal.refused.map((x) => `${x.signal} may not withdraw ${x.target}: ${x.why}`));
  out.noise = r.receptions.filter((x) => x.kind === "noise").length;
  if (r.status === "raised") return { at: "done", out: { ...out, ok: false, status: "raised", why: r.why } };
  // Every pattern with a live recipe renders through it, before anything is written, so a recipe that fails writes nothing.
  const t = await throughRecipes(dir, c.v, c.listeners, live.recipes, [...subjects], r, c.types, now);
  if (!t.ok) return { at: "done", out: { ...out, ok: false, status: "failed", error: t.error } };
  if (live.recipes.length) keep({ known: t.known, types: t.types });
  out.problems.push(...t.problems);
  out.noise = t.noise;
  const have = await current(dir, c.v, t.records.map((x) => x.route));
  out.problems.push(...have.problems);
  const existing = new Set(r.proposals.filter((p) => decisionFile(dir, p.id)).map((p) => p.id));
  const d = S.diff(t.records.filter((x) => have.where[x.route]), have.now, r.proposals, existing);
  const bySignal = new Map(g.signals.map((s) => [s.signal.id, s]));
  const addresses = new Map(g.signals.map((s) => [s.signal.id, s.address]));
  const derived = (ch: Change) => [...ch.cites.map((id) => addresses.get(id) ?? id), ...ch.facts.filter((x) => !x.startsWith("ids:")).map(S.factFile)];
  // Records in route order, so a crash leaves the cursor where it was and the next pull redoes it.
  const commits: Commit[] = d.changes.map((ch) => {
    const { file, route } = have.where[ch.route];
    if (ch.kind === "kept" || ch.kind === "unchanged") return { kind: ch.kind === "kept" ? "kept" : "verify", file };
    return { kind: "write", file, route, record: ch.record, derived: derived(ch), note: `signal pull: ${ch.kind} from ${ch.cites.length} signal${ch.cites.length === 1 ? "" : "s"}` };
  });
  const rw = await receptionsPlan(store, t, d.changes, now);
  const proposals = d.proposals.map((p) => {
    const l = c.listeners.find((x) => x.id === p.listener);
    return { id: p.id, input: { id: p.id, question: `Signal ${p.view.id} (${p.view.type}@${p.view.version} about ${p.view.subject}, ${p.view.time}) is salient at listener ${p.listener}${l?.note ? `: ${l.note}` : ""}. What does it change?`,
      ...(c.v.phase ? { needed_in: c.v.phase } : {}), note: `Proposed by the signal pull from ${addresses.get(p.view.id) ?? p.view.id}${p.facts.length ? `, reading ${p.facts.join(", ")}` : ""}.` } };
  });
  const marked = markedAlready(dir);
  const marks: Extract<Plan, { at: "commit" }>["marks"] = [];
  for (const m of r.marks) {
    const file = S.recordFile(m.route);
    const addr = addresses.get(m.view.id) ?? m.view.id;
    if (!S.routerRoute(file)) { out.problems.push(`listener ${m.listener}: no record type lives at ${file} to mark stale`); continue; }
    if (marked.has(`${file} ${addr}`)) continue;
    marks.push({ file, listener: m.listener, source: bySignal.get(m.view.id)?.library ?? S.LOCAL_LIBRARY, addr });
  }
  return { at: "commit", out, now, v: c.v, commits, receptions: rw.writes, ...(rw.error ? { receptionError: rw.error } : {}), proposals, marks, libraries: next.libraries, recipes: live.recipes };
}

/** Whether the projector verified a file at or after a pull's now: a durable verify that ran before a crash. */
const verifiedSince = (dir: string, file: string, now: string) => (events(dir) as { event?: string; at?: string; target?: { kind?: string; value?: string }; by?: { id?: string } }[])
  .some((e) => e.event === "verify" && e.target?.kind === "path" && e.target.value === file && e.by?.id === S.PROJECTOR_AGENT.id && Date.parse(e.at ?? "") >= Date.parse(now));

/**
 * One pull. Writes nothing when nothing is new; moves the cursor only after every write succeeded. Every read that
 * can change goes through step: the plan (render, recipe renders and diff) is one step, and each write, verify,
 * reception write, proposal, stale mark, hindsight label and the cursor move is its own. The default step just runs,
 * so the memory path is one process as before; pullDurable passes the workflow's step. On a durable run each step
 * that writes first checks whether its write already landed, so a step repeated after a crash writes nothing twice.
 */
export async function pull(dir: string, { now: asked }: { now?: string } = {}, step: Step = plainStep): Promise<PullResult> {
  const durable = step !== plainStep;
  const store = await ventureStore(dir);
  let loaded: Loaded | null = null;
  const plan = await step("plan", () => planPull(dir, store, asked ?? iso(nowMs()), (l) => { loaded = l; }));
  if (plan.at === "done") return plan.out;
  const { out, now } = plan;
  if (plan.at === "nothing") {
    const moved = plan.cursor;
    if (moved) await step("cursor", async () => { saveCursor(dir, moved); return true; });
    const hs = await fillHindsight(dir, store, plan.recipes, now, null, step, durable);
    return { ...out, hindsight: hs.written, problems: [...out.problems, ...hs.problems], status: "nothing new" };
  }
  const v = plan.v;
  for (const c of plan.commits) {
    if (c.kind === "kept") { out.kept.push(c.file); continue; }
    if (c.kind === "verify") {
      const ver = await step(`verify/${c.file}`, async (): Promise<Reply> => {
        if (durable && verifiedSince(dir, c.file, now)) return { ok: true };
        const x = verify(dir, `path:${c.file}`, { by: { ...S.PROJECTOR_AGENT }, reason: "a signal pull rendered it again unchanged", now }) as Reply;
        return { ok: x.ok, ...(x.error ? { error: x.error } : {}) };
      });
      if (ver.ok) out.verified.push(c.file); else out.problems.push(`${c.file}: ${ver.error}`);
      continue;
    }
    const w = await step(`write/${c.route}`, async (): Promise<Reply> => {
      if (durable) {
        const held = await projector(v, dir, c.route, "read");
        if (held.ok && held.result !== null && held.result !== undefined && canonicalJson(held.result) === canonicalJson(c.record)) return { ok: true };
      }
      const x = await projector(v, dir, c.route, "write", { input: c.record, provenance: { derived_from: c.derived, note: c.note } });
      return { ok: x.ok, ...(x.error ? { error: x.error } : {}) };
    });
    if (!w.ok) return { ...out, ok: false, status: "failed", error: `${c.route}: ${w.error}` };
    out.written.push(c.file);
  }
  for (const x of plan.receptions) {
    await step(`reception/${x.file}`, async () => {
      const held = await store.read(x.file);
      if (durable && held?.content === JSON.stringify(x.doc, null, 2) + "\n") return true;
      await writeProjected(dir, store, x.file, x.doc, held?.version ?? null, { route: "knowledge/reception", derived_from: x.derived_from, note: x.note });
      return true;
    });
    out.receptions.push(x.file);
  }
  if (plan.receptionError) return { ...out, ok: false, status: "failed", error: plan.receptionError };
  for (const p of plan.proposals) {
    const res = await step(`propose/${p.id}`, async (): Promise<Reply> => {
      if (durable && decisionFile(dir, p.id)) return { ok: true };
      const x = propose(dir, p.input as Parameters<typeof propose>[1], { agentId: S.PROJECTOR_AGENT.id, via: "router" }) as Reply;
      return { ok: x.ok, ...(x.error ? { error: x.error } : {}) };
    });
    if (!res.ok) return { ...out, ok: false, status: "failed", error: `proposing ${p.id}: ${res.error}` };
    out.proposed.push(p.id);
  }
  for (const m of plan.marks) {
    await step(`mark/${m.file}#${m.addr}#${m.listener}`, async () => {
      if (durable && markedAlready(dir).has(`${m.file} ${m.addr}`)) return true;
      mark(dir, [m.file], { source: m.source, paths: [m.addr], reads: m.addr, via: "signals" });
      return true;
    });
    out.marked.push(m.file);
  }
  const hs = await fillHindsight(dir, store, plan.recipes, now, loaded, step, durable);
  out.hindsight = hs.written;
  out.problems.push(...hs.problems);
  await step("cursor", async () => { saveCursor(dir, { libraries: plan.libraries, provenance: (entries(dir) as ProvLine[]).at(-1)?.hash ?? null, pulled_at: now }); return true; });
  return out;
}

/**
 * The pull as a durable workflow (EE-161, phase 12b), when naive.config.json sets durable.engine: the plan and each
 * write after it are activities, so a pull that dies resumes with the plan it made and writes nothing twice. The run
 * stays open in .naive/durable-runs/ until the workflow finishes.
 */
export async function pullDurable(dir: string, o: { now?: string } = {}): Promise<PullResult> {
  const { Effect, Layer, Schema } = await import("effect");
  const Workflow = await import("effect/workflow/Workflow");
  const toStep = await activityStep();
  const run = openRun(dir, "signals", "pull");
  const Pull = Workflow.make("naive/signal-pull", {
    payload: { dir: Schema.String, run: Schema.String },
    success: Schema.String,
    idempotencyKey: (p) => `${p.dir}#pull#${p.run}`,
  });
  const PullLive = Pull.toLayer(Effect.fn(function* () {
    const context = yield* Effect.context<WorkflowEngine | WorkflowInstance>();
    const result = yield* Effect.promise(() => pull(dir, o, toStep(context)));
    return JSON.stringify(result);
  }));
  const out = await runDurable(PullLive.pipe(Layer.provideMerge(await engineLayer(dir, "signals"))), Pull.execute({ dir, run }));
  closeRun(dir, "signals", "pull");
  return JSON.parse(out) as PullResult;
}

/** The stale marks a pull already made, as "file address". */
function markedAlready(dir: string): Set<string> {
  const f = ventureFile(dir, ".naive/stale.json");
  if (!existsSync(f)) return new Set();
  try {
    const s = load(f) as { marks?: { file: string; reads?: string | null; because?: { via?: string } }[] };
    return new Set((s.marks ?? []).filter((m) => m.because?.via === "signals").map((m) => `${m.file} ${m.reads}`));
  } catch { return new Set(); }
}

function saveCursor(dir: string, c: S.Cursor) {
  mkdirSync(join(dir, ".naive"), { recursive: true });
  writeFileSync(ventureFile(dir, S.CURSOR), JSON.stringify(c, null, 2) + "\n");
}

/** One signal at every listener. */
export async function explainSignal(dir: string, id: string, { now = iso(nowMs()) }: { now?: string } = {}) {
  const c = await context(dir);
  const found = await S.findSignal(c.libs, id, c.types);
  if (!found.signal) return { ok: false, error: found.problem ?? `no signal ${id}`, problems: c.problems };
  const [typeId] = found.signal.signal.type.split("@");
  const g = await gather(c.libs, [...new Set([...c.heard, typeId])], new Set([found.signal.signal.subject]), c.types, []);
  const f = await factsOf(dir, c.v, c.listeners);
  return { ok: true, result: S.explain(found.signal, S.dedupeSignals([[found.signal], g.signals]), c.types, c.listeners, f.facts, now), problems: [...c.problems, ...g.problems, ...f.problems] };
}

/** Every projected record rendered again from what its subjects' signals say; drift is any that would change. */
export async function replay(dir: string, { now = iso(nowMs()) }: { now?: string } = {}) {
  const c = await context(dir);
  const live = await liveRecipes(readText(await ventureStore(dir)));
  if (live.failures.length) return { ok: false, error: `a live recipe cannot be read: ${live.failures.join("; ")}`, problems: c.problems };
  const heard = [...new Set([...c.heard, ...live.recipes.flatMap((x) => rangeIds(x.ranges))])].sort();
  const subjects = new Set(S.projectedSubjects(entries(dir) as ProvLine[]));
  const g = await gather(c.libs, heard, subjects, c.types, c.listeners);
  const f = await factsOf(dir, c.v, c.listeners);
  const r = S.render({ signals: g.signals, types: c.types, listeners: c.listeners, facts: f.facts, now });
  if (r.status === "raised") return { ok: false, error: r.why, problems: [...c.problems, ...r.problems] };
  const t = await throughRecipes(dir, c.v, c.listeners, live.recipes, [...subjects], r, c.types, now);
  if (!t.ok) return { ok: false, error: t.error, problems: c.problems };
  const have = await current(dir, c.v, t.records.map((x) => x.route));
  const d = S.diff(t.records.filter((x) => have.where[x.route]), have.now);
  const drift = d.changes.filter((x) => x.kind === "new" || x.kind === "changed").map((x) => ({ file: have.where[x.route].file, kind: x.kind, rendered: x.record, held: x.before ?? null }));
  return { ok: true, result: { subjects: [...subjects], records: d.changes.length, drift }, problems: [...c.problems, ...g.problems, ...f.problems, ...t.problems, ...have.problems, ...r.problems] };
}

export type EmitOptions = { props?: Record<string, unknown>; subject?: string; time?: string; rating?: string; by?: string; cites?: string[]; supersedes?: string; retracts?: string; now?: string };

/** A person records a signal in the venture's local library: the signal file and its log line, both logged in
 *  provenance as the person's. The same signal emitted twice has the same address and is written once. */
export async function emit(dir: string, typeRef: string, o: EmitOptions) {
  const c = await context(dir);
  const [id, range] = typeRef.includes("@") ? typeRef.split("@") : [typeRef, undefined];
  const type = S.newest(c.types, id, range);
  if (!type) return { ok: false, error: `no signal type ${typeRef} in the libraries this venture reads (${[...new Set(c.types.map((t) => t.id))].join(", ") || "none"})` };
  const target = o.supersedes ?? o.retracts;
  let subject = o.subject;
  if (target) {
    if (!/^[0-9a-f]{24}$/.test(target)) return { ok: false, error: `${target} is not a signal address (24 hex characters)` };
    const found = await S.findSignal(c.libs, target, c.types);
    if (!found.signal) return { ok: false, error: `${target}: ${found.problem}` };
    subject ??= found.signal.signal.subject;
  }
  const rating = /^([A-F])([1-6])$/.exec(o.rating ?? "C3");
  if (!rating) return { ok: false, error: `--rating is an Admiralty code, a letter A to F and a digit 1 to 6 (B2), not ${o.rating}` };
  const now = o.now ?? iso(nowMs());
  const person = o.by ?? process.env.MENTURA_PERSON ?? "person";
  const built = S.buildSignal(type, {
    props: o.props ?? {}, subject, time: o.time ?? now.slice(0, 10), observed: now, producer: `local/${S.slug(person) || "person"}`,
    rating: { reliability: rating[1] as "A", credibility: Number(rating[2]) },
    cites: (o.cites ?? []).map((u) => (/^https?:\/\//.test(u) ? { url: u, accessed: now.slice(0, 10) } : { ref: u })),
    ...(o.supersedes ? { supersedes: o.supersedes } : {}), ...(o.retracts ? { retracts: o.retracts } : {}),
  });
  if (!built.ok) return built;
  const venture = (sourcesOf(dir) as { sources: { id: string }[] }).sources.find((s) => s.id === LOCAL);
  const store = await connect(venture, dir) as { read(_p: string): Promise<unknown>; write(_p: string, _content: string, _opts?: { base?: null; append?: boolean }): Promise<unknown> };
  const file = `${S.LOCAL_ROOT}/${built.path}`;
  if (await store.read(file)) return { ok: true, result: { signal: built.signal.id, file, already: true } };
  const agent = { kind: "person", via: "cli", id: person };
  await store.write(file, JSON.stringify(built.signal, null, 2) + "\n", { base: null });
  record(dir, { entity: file, route: "knowledge/signal", activity: "write", agent, note: `emitted signal ${built.signal.id} (${built.signal.type} about ${built.signal.subject})` });
  const logFile = `${S.LOCAL_ROOT}/log/${type.id}/${now.slice(0, 10)}.jsonl`;
  await store.write(logFile, JSON.stringify({ id: built.signal.id, subject: built.signal.subject, path: built.path, published: now }) + "\n", { append: true });
  record(dir, { entity: logFile, route: "knowledge/signal-log", activity: "write", agent, note: `published signal ${built.signal.id} in the local library` });
  return { ok: true, result: { signal: built.signal.id, file, subject: built.signal.subject, type: built.signal.type } };
}

// ---- The command ----

function print(what: string, r: { ok: boolean; error?: string; result?: unknown; problems?: string[] } & Record<string, unknown>) {
  if (!r.ok) console.error(r.error ?? r.why ?? "failed");
  if (what === "pull" && r.ok) {
    const p = r as unknown as PullResult;
    console.log(p.status === "nothing new" ? "nothing new: no record to render again" : `pulled: ${Object.keys(p.touched).length} subject(s) rendered; wrote ${p.written.length}, verified ${p.verified.length}, kept ${p.kept.length}, proposed ${p.proposed.length}, marked ${p.marked.length}; ${p.noise} reception(s) were noise`);
    for (const f of p.written) console.log(`  wrote     ${f}`);
    for (const f of p.verified) console.log(`  verified  ${f}`);
    for (const x of p.proposed) console.log(`  proposed  ${x}`);
    for (const f of p.marked) console.log(`  marked    ${f}`);
    for (const f of p.receptions) console.log(`  received  ${f}`);
    for (const f of p.hindsight) console.log(`  hindsight ${f}`);
  } else if (what === "explain" && r.ok) {
    const e = r.result as ReturnType<typeof S.explain>;
    console.log(`${e.signal} (${e.library})${e.withdrawn_by ? `, withdrawn by ${e.withdrawn_by}` : ""}`);
    for (const l of e.lines) console.log(`  ${l.kind.padEnd(7)} at ${l.listener} (${l.then}, ${l.view})${l.kind === "noise" ? `: ${(l.failed ?? []).map((x) => `${x.predicate}: ${x.why}`).join("; ")}` : ""}`);
    for (const id of e.deaf) console.log(`  deaf    at ${id}: it hears none of this signal's types`);
  } else if (what === "replay" && r.ok) {
    const x = r.result as { records: number; drift: { file: string; kind: string }[] };
    console.log(x.drift.length ? `${x.drift.length} of ${x.records} projected record(s) drifted:` : `no drift: ${x.records} projected record(s) render as they are held`);
    for (const d of x.drift) console.log(`  ${d.kind.padEnd(7)} ${d.file}`);
  } else if (what === "emit" && r.ok) {
    const x = r.result as { signal: string; file: string; already?: boolean };
    console.log(x.already ? `already emitted: ${x.signal} at ${x.file}` : `emitted ${x.signal} at ${x.file}; run naive signals pull to render it`);
  }
  for (const p of r.problems ?? []) console.log(`  problem: ${p}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, ...a] = process.argv.slice(2);
  const opt = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const all = (n: string) => a.flatMap((x, i) => (x === `--${n}` ? [a[i + 1]] : []));
  const json = a.includes("--json");
  const usage = "usage: node packages/naive/src/router/orchestration/signals.ts <venture dir> pull | explain <signal id> | replay | emit <type> --props '<json>' [--subject <id>] [--supersedes|--retracts <signal id>]";
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error(usage); process.exit(2); }
  const what = opt("explain") ? "explain" : a[0];
  const now = opt("now");
  let r: { ok: boolean; error?: string; result?: unknown; problems?: string[] } & Record<string, unknown>;
  if (what === "pull") r = isDurable(dir) ? await pullDurable(dir, { now }) : await pull(dir, { now });
  else if (what === "explain") { const id = opt("explain") ?? a[1]; if (!id) { console.error(usage); process.exit(2); } r = await explainSignal(dir, id, { now }); }
  else if (what === "replay") r = await replay(dir, { now });
  else if (what === "emit") {
    let props: Record<string, unknown> | undefined;
    try { props = opt("props") ? JSON.parse(opt("props") as string) as Record<string, unknown> : undefined; } catch { console.error("--props is not JSON"); process.exit(2); }
    r = await emit(dir, a[1], { props, subject: opt("subject"), time: opt("time"), rating: opt("rating"), by: opt("by"), cites: all("cite"), supersedes: opt("supersedes"), retracts: opt("retracts"), now });
  } else { console.error(usage); process.exit(2); }
  if (json) console.log(JSON.stringify(r, null, 2)); else print(what, r);
  process.exit(r.ok ? 0 : 1);
}
