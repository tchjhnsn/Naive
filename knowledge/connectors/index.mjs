// Sources and connectors (EE-037). The knowledge layer federates: records stay in the sources a
// venture already uses, and the router reaches each through a connector with one contract
// (contract.mjs). Nothing is copied.
//
//   The registry   knowledge/tooling/integrations.json: an integration with a `connector` names
//                  the module that implements the contract for it.
//   A source map   <venture>/knowledge/sources.json (optional): the venture's sources, and which
//                  record types live in which source. A record type it does not name, and every
//                  record of a venture without a map, lives in the venture's own folder (the
//                  `venture` source). The venture folder itself (venture.json, the provenance log,
//                  drafts) always stays on the file system.
//
// A record keeps its route's file path inside whatever source holds it: products/kettle.json is
// products/kettle.json under the source's root.

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { conformance } from "./contract.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const MAP = "knowledge/sources.json";
export const LOCAL = "venture";

let fetchImpl = null;
/** Points every GitHub-style connector at another fetch (the evals' fake GitHub); null restores the real one. */
export const useFetch = (f) => { fetchImpl = f; };

/** The connector registry: integration id -> { module, writes, ... } from knowledge/tooling/integrations.json. */
export function registry() {
  return new Map(load(join(repo, "knowledge/tooling/integrations.json")).filter((t) => t.connector).map((t) => [t.id, { id: t.id, name: t.name, ...t.connector }]));
}

/** A venture's source map, with the implicit venture source first. */
export function sourcesOf(dir) {
  const own = existsSync(join(dir, MAP)) ? load(join(dir, MAP)) : { sources: [], records: {} };
  return { sources: [{ id: LOCAL, connector: "filesystem", root: ".", writes: "direct", implicit: true }, ...(own.sources ?? [])], records: own.records ?? {}, mapped: existsSync(join(dir, MAP)) };
}

/** The source a record type lives in. */
export function sourceFor(dir, recordType) {
  const m = sourcesOf(dir);
  const id = m.records[recordType] ?? LOCAL;
  const s = m.sources.find((x) => x.id === id);
  if (!s) throw new Error(`${MAP} puts ${recordType} in ${id}, which is not one of its sources`);
  return s;
}

const cache = new Map();
/** A connected connector for one source of one venture. */
export async function connect(source, dir) {
  const reg = registry().get(source.connector);
  if (!reg) throw new Error(`no connector ${source.connector}: knowledge/tooling/integrations.json has ${[...registry().keys()].join(", ")}`);
  const mod = cache.get(reg.module) ?? await import(join(repo, reg.module));
  cache.set(reg.module, mod);
  const opts = { ...source };
  delete opts.connector; delete opts.implicit;
  if (source.connector === "filesystem") {
    opts.root = isAbsolute(source.root ?? ".") ? source.root : resolve(dir, source.root ?? ".");
    opts.venture = source.id === LOCAL;
  } else if (fetchImpl) opts.fetch = fetchImpl;
  const c = mod.connect(opts);
  const problems = conformance(c);
  if (problems.length) throw new Error(`${reg.module} does not meet the connector contract: ${problems.join("; ")}`);
  return c;
}

/** Every source of a venture, connected. */
export async function connectAll(dir) {
  return Promise.all(sourcesOf(dir).sources.map(async (s) => ({ source: s, connector: await connect(s, dir) })));
}
