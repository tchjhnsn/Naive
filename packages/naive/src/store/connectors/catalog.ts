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
import { address, isText, words, type Connector, type Listed } from "./contract.ts";
import { asNaive, connectAllEffect, readTyped } from "./index.ts";
import type { NaiveError } from "../../core/effect/errors.ts";
import { VentureFs } from "../../core/effect/fs.ts";
import { runMain, runPromise, runSync } from "../../core/effect/run.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import type { RecordRoute } from "../../records/routes/routes.ts";
import { now } from "../../core/clock.ts";

/** Where an item sits in the route table, when it is a record. */
export type RouteOf = { route: string | null; record: string | null };
export type CatalogItem = { address: string; source: string; path: string; version: string; title: string; terms: string[] } & RouteOf;
export type Catalog = { built_at: string; sources: { id: string; connector: string }[]; items: CatalogItem[] };
/** A connected source the catalog reads: its id and connector name, and the connector's list and read. */
export type CatalogSource = { source: { id: string; connector: string }; connector: Pick<Connector, "list" | "read"> };
export type BuildStats = { sources: number; items: number; read: number; reused: number; skipped: number; errors: string[] };
/** A catalog search hit: the item without its words, with its score. */
export type SearchHit = Omit<CatalogItem, "terms"> & { score: number };
/** A live search hit, or a source whose search failed (source and error only). */
export type LiveHit = { source: string; address?: string; path?: string; version?: string; route?: string | null; record?: string | null; error?: string };

export const FILE = "_catalog/catalog.json";
const MAX_BYTES = 1_000_000;

function title(path: string, content: string): string | undefined {
  if (path.endsWith(".json")) {
    try { const j = JSON.parse(content); const t = j && typeof j === "object" && !Array.isArray(j) ? j.name ?? j.title ?? j.statement ?? j.id : null; if (typeof t === "string") return t.slice(0, 160); } catch {}
  }
  const fm = content.match(/^---\n[\s\S]*?\ntitle:\s*["']?(.+?)["']?\n[\s\S]*?\n---/);
  if (fm) return fm[1];
  const h = content.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : path.split("/").at(-1);
}

/** A connector call as an Effect: a tagged error passes through, anything else is CannotRun with its message. */
const call = <A>(f: () => Promise<A>): Effect.Effect<A, NaiveError> => Effect.tryPromise({ try: f, catch: asNaive });

// Which route a file in a source belongs to, from the route table (lazy, so the catalog works
// without the router for a plain folder).
let table: { r: RecordRoute; res: RegExp[] }[] | null = null;
const routeOf = (path: string): Effect.Effect<RouteOf> => Effect.gen(function* () {
  if (!table) {
    const { routes, glob } = yield* Effect.promise(() => import("../../records/routes/routes.ts"));
    table = routes().flatMap((r) => (r.kind === "record" && r.collection !== "list" ? [{ r, res: r.files.map((g) => glob(g)) }] : []));
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

/** The venture's catalog, or null when it has none, as an Effect. The catalog is the file this module wrote. */
export const loadEffect = (dir: string): Effect.Effect<Catalog | null, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const f = ventureFile(dir, FILE);
  return (yield* fs.exists(f)) ? yield* readTyped<Catalog>(f) : null;
});

/** The venture's catalog, or null when it has none. */
export const load = (dir: string): Catalog | null => runSync(loadEffect(dir));

/** What build takes: whether to write the catalog, and the connected sources to read instead of the venture's own. */
export type BuildOptions = { write?: boolean; sources?: CatalogSource[] };

/** build as an Effect. */
export const buildEffect = (dir: string, { write = true, sources }: BuildOptions = {}): Effect.Effect<{ catalog: Catalog; stats: BuildStats }, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const prior = new Map(((yield* loadEffect(dir))?.items ?? []).map((x) => [x.address, x]));
  const conns: CatalogSource[] = sources ?? (yield* connectAllEffect(dir));
  const items: CatalogItem[] = [];
  const stats: BuildStats = { sources: conns.length, items: 0, read: 0, reused: 0, skipped: 0, errors: [] };
  for (const { source, connector } of conns) {
    const got = yield* Effect.result(call((): Promise<Listed[]> => connector.list()));
    if (got._tag === "Failure") { stats.errors.push(`${source.id}: ${got.failure.message}`); continue; }
    for (const { path, version } of got.success) {
      const at = address(source.id, path);
      const old = prior.get(at);
      const where = yield* routeOf(path);
      if (old && old.version === version) { items.push({ ...old, ...where }); stats.reused++; continue; }
      const bare = { address: at, source: source.id, path, version, ...where, title: String(path.split("/").at(-1)), terms: words(path) };
      if (!isText(path)) { items.push(bare); stats.skipped++; continue; }
      const item = yield* call(() => connector.read(path));
      stats.read++;
      if (!item || item.content.length > MAX_BYTES || !isText(path, item.content)) { items.push(bare); continue; }
      items.push({ address: at, source: source.id, path, version: item.version, ...where, title: String(title(path, item.content)), terms: [...new Set(words(`${path}\n${item.content}`))].sort() });
    }
  }
  stats.items = items.length;
  const catalog: Catalog = { built_at: now().toISOString(), sources: conns.map(({ source }) => ({ id: source.id, connector: source.connector })), items };
  if (write) yield* fs.writeText(ventureFile(dir, FILE), JSON.stringify(catalog) + "\n");
  return { catalog, stats };
});

/** Builds or refreshes the catalog. Returns it with stats: items, read (items fetched), reused. */
export async function build(dir: string, opts: BuildOptions = {}): Promise<{ catalog: Catalog; stats: BuildStats }> { return runPromise(buildEffect(dir, opts)); }

/** Items holding every word of the query, best first: words in the title count double. */
export function search(catalog: Catalog, query: string, { limit = 20 }: { limit?: number } = {}): SearchHit[] {
  const q = words(query);
  if (!q.length) return [];
  return catalog.items.map((x): (CatalogItem & { score: number }) | null => {
    const terms = new Set(x.terms), t = words(x.title).join(" ");
    if (!q.every((w) => terms.has(w) || x.terms.some((y) => y.startsWith(w)))) return null;
    return { score: q.reduce((s, w) => s + (terms.has(w) ? 2 : 1) + (t.includes(w) ? 2 : 0), 0), ...x };
  }).filter((x): x is CatalogItem & { score: number } => x !== null).sort((a, b) => b.score - a.score || a.address.localeCompare(b.address)).slice(0, limit)
    .map(({ terms, ...x }) => x);
}

/** searchLive as an Effect: a source whose search fails gives an entry with its error. */
export const searchLiveEffect = (dir: string, query: string, { limit = 20 }: { limit?: number } = {}): Effect.Effect<LiveHit[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const out: LiveHit[] = [];
  for (const { source, connector } of yield* connectAllEffect(dir)) {
    const got = yield* Effect.result(call(() => connector.search(query, { limit })));
    if (got._tag === "Failure") { out.push({ source: source.id, error: got.failure.message }); continue; }
    for (const x of got.success) out.push({ address: address(source.id, x.path), source: source.id, path: x.path, version: x.version, ...(yield* routeOf(x.path)) });
  }
  return out;
});

/** Asks each source's own search instead of the catalog. */
export async function searchLive(dir: string, query: string, opts: { limit?: number } = {}): Promise<LiveHit[]> { return runPromise(searchLiveEffect(dir, query, opts)); }

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--search");
  const i = process.argv.indexOf("--search");
  const json = process.argv.includes("--json");
  if (!dir) { console.error("usage: node packages/naive/src/store/connectors/catalog.ts <venture dir> [--search <q>] [--live] [--json]"); process.exit(2); }
  await runMain(Effect.gen(function* () {
    if (i >= 0) {
      const q = process.argv[i + 1] ?? "";
      const hits: { address?: string; title?: string; route?: string | null }[] = process.argv.includes("--live") ? yield* searchLiveEffect(dir, q) : search((yield* loadEffect(dir)) ?? (yield* buildEffect(dir)).catalog, q);
      console.log(json ? JSON.stringify({ query: q, hits }, null, 2) : hits.map((h) => `${h.address}  ${h.title ?? ""}${h.route ? `  (${h.route})` : ""}`).join("\n") || "no items match");
    } else {
      const { stats } = yield* buildEffect(dir);
      console.log(json ? JSON.stringify(stats, null, 2) : `catalog: ${stats.items} items from ${stats.sources} sources (${stats.read} read, ${stats.reused} unchanged)${stats.errors.length ? `\n${stats.errors.join("\n")}` : ""}`);
      if (stats.errors.length) process.exitCode = 1;
    }
  }));
}
