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
import { ANY, resolve as resolveRule } from "./resolve.mjs";
import { ventureFile } from "../../packages/core/venture-paths.mjs";

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
  const own = existsSync(ventureFile(dir, MAP)) ? load(ventureFile(dir, MAP)) : { sources: [], records: {} };
  return { sources: [{ id: LOCAL, connector: "filesystem", root: ".", writes: "direct", implicit: true }, ...(own.sources ?? [])], records: own.records ?? {}, rules: own.rules ?? [], mapped: existsSync(ventureFile(dir, MAP)) };
}

/**
 * The source a record type lives in, for a context (EE-042): the system of record of the most
 * specific rule that holds (resolve.mjs). The venture's phase comes from venture.json; product,
 * account and actor come from the caller. With no rule, the venture's own folder.
 */
export function sourceFor(dir, recordType, context = {}) {
  const m = sourcesOf(dir);
  let phase;
  try { phase = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).phase; } catch {}
  const hit = resolveRule(m, { record: recordType, ...(phase ? { phase } : {}), ...context });
  if (hit?.ties.length) throw new Error(`${MAP}: ${hit.ties.length} rules for ${recordType} tie at the same specificity; make one more specific`);
  const id = hit?.rule.system_of_record ?? LOCAL;
  const s = m.sources.find((x) => x.id === id);
  if (!s) throw new Error(`${MAP} puts ${recordType} in ${id}, which is not one of its sources`);
  return s;
}

/**
 * The attributes of a record type mastered somewhere other than the record itself, for a context
 * (EE-042): [{ attribute, source }]. Such an attribute is kept in its source at the record's own
 * path, as a JSON object holding only that attribute ({ "price": 12 }); a vendor's connector maps
 * that onto its own system. The router reads each one from there and writes it there.
 */
export function attributeSources(dir, recordType, context = {}) {
  const m = sourcesOf(dir);
  const whole = sourceFor(dir, recordType, context);
  let phase;
  try { phase = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).phase; } catch {}
  const names = [...new Set((m.rules ?? []).filter((r) => r.record === recordType && r.attribute !== ANY).map((r) => r.attribute))];
  return names.flatMap((attribute) => {
    const hit = resolveRule(m, { record: recordType, attribute, ...(phase ? { phase } : {}), ...context });
    if (!hit || hit.rule.attribute === ANY) return [];
    if (hit.ties.length) throw new Error(`${MAP}: ${hit.ties.length} rules for ${recordType}.${attribute} tie at the same specificity; make one more specific`);
    const source = m.sources.find((x) => x.id === hit.rule.system_of_record);
    if (!source) throw new Error(`${MAP} masters ${recordType}.${attribute} in ${hit.rule.system_of_record}, which is not one of its sources`);
    return source.id === whole.id ? [] : [{ attribute, source }];
  });
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
