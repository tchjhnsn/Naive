// The catalog (EE-037): one index over every item in every source of a venture, so a person or an
// agent can find a record without knowing where it lives. For each item it keeps the address,
// source, path, version, route and record type (when the item is a record), a title and the set
// of words in it. It keeps no content: the words are a sorted set, not the text, and reading an
// item always goes back to its source. A rebuild reads only items whose version changed.
//
//   node knowledge/connectors/catalog.mjs <venture dir> [--json]             build or refresh
//   node knowledge/connectors/catalog.mjs <venture dir> --search <q> [--json] [--live]
//          search the catalog (built first if there is none); --live asks each source instead
//
// The catalog is written to <venture>/_catalog/catalog.json. It is derived, so a venture may
// ignore it in git; the router never routes _ folders.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { address, isText, words } from "./contract.mjs";
import { connectAll } from "./index.mjs";

export const FILE = "_catalog/catalog.json";
const MAX_BYTES = 1_000_000;

function title(path, content) {
  if (path.endsWith(".json")) {
    try { const j = JSON.parse(content); const t = j && typeof j === "object" && !Array.isArray(j) ? j.name ?? j.title ?? j.statement ?? j.id : null; if (typeof t === "string") return t.slice(0, 160); } catch {}
  }
  const fm = content.match(/^---\n[\s\S]*?\ntitle:\s*["']?(.+?)["']?\n[\s\S]*?\n---/);
  if (fm) return fm[1];
  const h = content.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : path.split("/").at(-1);
}

// Which route a file in a source belongs to, from the route table (lazy, so the catalog works
// without the router for a plain folder).
let table = null;
async function routeOf(path) {
  if (!table) {
    const { routes, glob } = await import("../../interface/router.mjs");
    table = routes().filter((r) => r.kind === "record" && r.collection !== "list").map((r) => ({ r, res: r.files.map((g) => glob(g)) }));
  }
  for (const { r, res } of table) {
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
}

export const load = (dir) => existsSync(join(dir, FILE)) ? JSON.parse(readFileSync(join(dir, FILE), "utf8")) : null;

/** Builds or refreshes the catalog. Returns it with stats: items, read (items fetched), reused. */
export async function build(dir, { write = true, sources } = {}) {
  const prior = new Map((load(dir)?.items ?? []).map((x) => [x.address, x]));
  const conns = sources ?? await connectAll(dir);
  const items = [];
  const stats = { sources: conns.length, items: 0, read: 0, reused: 0, skipped: 0, errors: [] };
  for (const { source, connector } of conns) {
    let listed;
    try { listed = await connector.list(); } catch (e) { stats.errors.push(`${source.id}: ${e.message}`); continue; }
    for (const { path, version } of listed) {
      const at = address(source.id, path);
      const old = prior.get(at);
      const where = await routeOf(path);
      if (old && old.version === version) { items.push({ ...old, ...where }); stats.reused++; continue; }
      if (!isText(path)) { items.push({ address: at, source: source.id, path, version, ...where, title: path.split("/").at(-1), terms: words(path) }); stats.skipped++; continue; }
      const got = await connector.read(path);
      stats.read++;
      if (!got || got.content.length > MAX_BYTES || !isText(path, got.content)) { items.push({ address: at, source: source.id, path, version, ...where, title: path.split("/").at(-1), terms: words(path) }); continue; }
      items.push({ address: at, source: source.id, path, version: got.version, ...where, title: title(path, got.content), terms: [...new Set(words(`${path}\n${got.content}`))].sort() });
    }
  }
  stats.items = items.length;
  const catalog = { built_at: new Date().toISOString(), sources: conns.map(({ source }) => ({ id: source.id, connector: source.connector })), items };
  if (write) { mkdirSync(join(dir, "_catalog"), { recursive: true }); writeFileSync(join(dir, FILE), JSON.stringify(catalog) + "\n"); }
  return { catalog, stats };
}

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

/** Asks each source's own search instead of the catalog. */
export async function searchLive(dir, query, { limit = 20 } = {}) {
  const out = [];
  for (const { source, connector } of await connectAll(dir)) {
    try { for (const x of await connector.search(query, { limit })) out.push({ address: address(source.id, x.path), source: source.id, path: x.path, version: x.version, ...(await routeOf(x.path)) }); }
    catch (e) { out.push({ source: source.id, error: e.message }); }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--search");
  const i = process.argv.indexOf("--search");
  const json = process.argv.includes("--json");
  if (!dir) { console.error("usage: node knowledge/connectors/catalog.mjs <venture dir> [--search <q>] [--live] [--json]"); process.exit(2); }
  if (i >= 0) {
    const q = process.argv[i + 1] ?? "";
    const hits = process.argv.includes("--live") ? await searchLive(dir, q) : search(load(dir) ?? (await build(dir)).catalog, q);
    console.log(json ? JSON.stringify({ query: q, hits }, null, 2) : hits.map((h) => `${h.address}  ${h.title ?? ""}${h.route ? `  (${h.route})` : ""}`).join("\n") || "no items match");
  } else {
    const { stats } = await build(dir);
    console.log(json ? JSON.stringify(stats, null, 2) : `catalog: ${stats.items} items from ${stats.sources} sources (${stats.read} read, ${stats.reused} unchanged)${stats.errors.length ? `\n${stats.errors.join("\n")}` : ""}`);
    if (stats.errors.length) process.exitCode = 1;
  }
}
