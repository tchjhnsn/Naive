// The catalog (EE-037): one index over every item in every source of a venture, so a person or an
// agent can find a record without knowing where it lives. For each item it keeps the address,
// source, path, version, route and record type (when the item is a record), a title and the set
// of words in it. It keeps no content: the words are a sorted set, not the text, and reading an
// item always goes back to its source. A rebuild reads only items whose version changed.
//
//   node packages/naive/src/store/connectors/catalog.ts <venture dir> [--json]             build or refresh
//   node packages/naive/src/store/connectors/catalog.ts <venture dir> --search <q> [--json] [--live]
//          search the catalog (built first if there is none); --live asks each source instead
//
// The catalog is written to <venture>/_catalog/catalog.json. It is derived, so a venture may
// ignore it in git; the router never routes _ folders.

// Written as Effects (EE-125): loadEffect, buildEffect and searchLiveEffect are the Effect versions of
// load, build and searchLive; search is pure and stays a plain function. Connectors are the contract's,
// with Promise methods, so their calls are wrapped with Effect.tryPromise.

import { Effect } from "effect";
import { address, isText, words } from "./contract.ts";
import { connectAllEffect } from "./index.ts";
import { CannotRun } from "../../core/effect/errors.ts";
import { VentureFs, readJson } from "../../core/effect/fs.ts";
import { runMain, runPromise, runSync } from "../../core/effect/run.ts";
import { ventureFile } from "../../core/venture-paths.ts";

/** @typedef {import("../../core/effect/errors.ts").NaiveError} NaiveError */
/** @typedef {{ address: string, source: string, path: string, version: string, route: string | null, record: string | null, title: string, terms: string[] }} CatalogItem */
/** @typedef {{ built_at: string, sources: { id: string, connector: string }[], items: CatalogItem[] }} Catalog */

export const FILE = "_catalog/catalog.json";
const MAX_BYTES = 1_000_000;

/** @param {string} path @param {string} content */
function title(path, content) {
  if (path.endsWith(".json")) {
    try { const j = JSON.parse(content); const t = j && typeof j === "object" && !Array.isArray(j) ? j.name ?? j.title ?? j.statement ?? j.id : null; if (typeof t === "string") return t.slice(0, 160); } catch {}
  }
  const fm = content.match(/^---\n[\s\S]*?\ntitle:\s*["']?(.+?)["']?\n[\s\S]*?\n---/);
  if (fm) return fm[1];
  const h = content.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : path.split("/").at(-1);
}

/** A connector call as an Effect: a tagged error passes through, anything else is CannotRun with its message. @template A @param {() => Promise<A>} f */
const call = (f) => Effect.tryPromise({
  try: f,
  catch: (e) => (e && typeof e === "object" && "_tag" in e ? /** @type {NaiveError} */ (e) : new CannotRun({ message: e instanceof Error ? e.message : String(e), cause: e })),
});

// Which route a file in a source belongs to, from the route table (lazy, so the catalog works
// without the router for a plain folder).
/** @type {{ r: { route: string, record: string, collection: string, files: string[] }, res: RegExp[] }[] | null} */
let table = null;
/** @param {string} path @returns {Effect.Effect<{ route: string | null, record: string | null }>} */
const routeOf = (path) => Effect.gen(function* () {
  if (!table) {
    const { routes, glob } = yield* Effect.promise(() => import("../../records/routes/routes.ts"));
    table = routes().filter((/** @type {{ kind: string, collection: string }} */ r) => r.kind === "record" && r.collection !== "list").map((/** @type {{ route: string, record: string, collection: string, files: string[] }} */ r) => ({ r, res: r.files.map((g) => glob(g)) }));
  }
  for (const { r, res } of table ?? []) {
    if (!res.some((re) => re.test(path))) continue;
    if (r.collection !== "item") return { route: r.route, record: r.record };
    for (const g of r.files) {
      if (!g.includes("*")) continue;
      const m = path.match(new RegExp("^" + g.split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$"));
      if (m) return { route: r.route.replace("[id]", m[1]), record: r.record };
    }
    return { route: r.route, record: r.record };
  }
  return { route: null, record: null };
});

/** The venture's catalog, or null when it has none, as an Effect. @param {string} dir @returns {Effect.Effect<Catalog | null, NaiveError, "naive/VentureFs">} */
export const loadEffect = (dir) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const f = ventureFile(dir, FILE);
  return (yield* fs.exists(f)) ? /** @type {Catalog} */ (yield* readJson(f)) : null;
});

/** The venture's catalog, or null when it has none. @param {string} dir */
export const load = (dir) => runSync(loadEffect(dir));

/**
 * build as an Effect.
 * @param {string} dir @param {{ write?: boolean, sources?: { source: { id: string, connector: string }, connector: { list: Function, read: Function } }[] }} [opts]
 */
export const buildEffect = (dir, { write = true, sources } = {}) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const prior = new Map(((yield* loadEffect(dir))?.items ?? []).map((x) => [x.address, x]));
  const conns = sources ?? (yield* connectAllEffect(dir));
  /** @type {CatalogItem[]} */
  const items = [];
  const stats = { sources: conns.length, items: 0, read: 0, reused: 0, skipped: 0, errors: /** @type {string[]} */ ([]) };
  for (const { source, connector } of conns) {
    const got = yield* Effect.result(call(() => /** @type {Promise<{ path: string, version: string }[]>} */ (connector.list())));
    if (got._tag === "Failure") { stats.errors.push(`${source.id}: ${got.failure.message}`); continue; }
    for (const { path, version } of got.success) {
      const at = address(source.id, path);
      const old = prior.get(at);
      const where = yield* routeOf(path);
      if (old && old.version === version) { items.push({ ...old, ...where }); stats.reused++; continue; }
      const bare = { address: at, source: source.id, path, version, ...where, title: String(path.split("/").at(-1)), terms: words(path) };
      if (!isText(path)) { items.push(bare); stats.skipped++; continue; }
      const item = /** @type {{ content: string, version: string } | null} */ (yield* call(() => connector.read(path)));
      stats.read++;
      if (!item || item.content.length > MAX_BYTES || !isText(path, item.content)) { items.push(bare); continue; }
      items.push({ address: at, source: source.id, path, version: item.version, ...where, title: String(title(path, item.content)), terms: [...new Set(words(`${path}\n${item.content}`))].sort() });
    }
  }
  stats.items = items.length;
  /** @type {Catalog} */
  const catalog = { built_at: new Date().toISOString(), sources: conns.map(({ source }) => ({ id: source.id, connector: source.connector })), items };
  if (write) yield* fs.writeText(ventureFile(dir, FILE), JSON.stringify(catalog) + "\n");
  return { catalog, stats };
});

/** Builds or refreshes the catalog. Returns it with stats: items, read (items fetched), reused.
 * @param {string} dir @param {{ write?: boolean, sources?: { source: { id: string, connector: string }, connector: { list: Function, read: Function } }[] }} [opts] */
export async function build(dir, opts = {}) { return runPromise(buildEffect(dir, opts)); }

/** Items holding every word of the query, best first: words in the title count double. */
export function search(catalog, query, { limit = 20 } = {}) {
  const q = words(query);
  if (!q.length) return [];
  return catalog.items.map((x) => {
    const terms = new Set(x.terms), t = words(x.title).join(" ");
    if (!q.every((w) => terms.has(w) || x.terms.some((y) => y.startsWith(w)))) return null;
    return { score: q.reduce((s, w) => s + (terms.has(w) ? 2 : 1) + (t.includes(w) ? 2 : 0), 0), ...x };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.address.localeCompare(b.address)).slice(0, limit)
    .map(({ terms, ...x }) => x);
}

/** searchLive as an Effect: a source whose search fails gives an entry with its error. @param {string} dir @param {string} query @param {{ limit?: number }} [opts] */
export const searchLiveEffect = (dir, query, { limit = 20 } = {}) => Effect.gen(function* () {
  /** @type {object[]} */
  const out = [];
  for (const { source, connector } of yield* connectAllEffect(dir)) {
    const got = yield* Effect.result(call(() => /** @type {Promise<{ path: string, version: string }[]>} */ (connector.search(query, { limit }))));
    if (got._tag === "Failure") { out.push({ source: source.id, error: got.failure.message }); continue; }
    for (const x of got.success) out.push({ address: address(source.id, x.path), source: source.id, path: x.path, version: x.version, ...(yield* routeOf(x.path)) });
  }
  return out;
});

/** Asks each source's own search instead of the catalog. @param {string} dir @param {string} query @param {{ limit?: number }} [opts] */
export async function searchLive(dir, query, opts = {}) { return runPromise(searchLiveEffect(dir, query, opts)); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--search");
  const i = process.argv.indexOf("--search");
  const json = process.argv.includes("--json");
  if (!dir) { console.error("usage: node packages/naive/src/store/connectors/catalog.ts <venture dir> [--search <q>] [--live] [--json]"); process.exit(2); }
  await runMain(Effect.gen(function* () {
    if (i >= 0) {
      const q = process.argv[i + 1] ?? "";
      /** @type {{ address?: string, title?: string, route?: string | null }[]} */
      const hits = process.argv.includes("--live") ? yield* searchLiveEffect(dir, q) : search((yield* loadEffect(dir)) ?? (yield* buildEffect(dir)).catalog, q);
      console.log(json ? JSON.stringify({ query: q, hits }, null, 2) : hits.map((h) => `${h.address}  ${h.title ?? ""}${h.route ? `  (${h.route})` : ""}`).join("\n") || "no items match");
    } else {
      const { stats } = yield* buildEffect(dir);
      console.log(json ? JSON.stringify(stats, null, 2) : `catalog: ${stats.items} items from ${stats.sources} sources (${stats.read} read, ${stats.reused} unchanged)${stats.errors.length ? `\n${stats.errors.join("\n")}` : ""}`);
      if (stats.errors.length) process.exitCode = 1;
    }
  }));
}
