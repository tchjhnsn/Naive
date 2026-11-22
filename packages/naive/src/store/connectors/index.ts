// Sources and connectors (EE-037). The knowledge layer federates: records stay in the sources a
// venture already uses, and the router reaches each through a connector with one contract
// (contract.ts). Nothing is copied.
//
//   The registry   packages/naive/src/records/layers/knowledge/tooling/integrations.json: an integration with a `connector` names
//                  the module that implements the contract for it.
//   A source map   <venture>/knowledge/sources.json (optional): the venture's sources, and which
//                  record types live in which source. A record type it does not name, and every
//                  record of a venture without a map, lives in the venture's own folder (the
//                  `venture` source). The venture folder itself (venture.json, the provenance log,
//                  drafts) always stays on the file system.
//
// A record keeps its route's file path inside whatever source holds it: products/kettle.json is
// products/kettle.json under the source's root.

// Written as Effects over VentureFs (EE-125): each exported function `name` that reads files or can fail
// has an Effect version `nameEffect` with the same arguments, and `name` runs it with runSync or
// runPromise, keeping its old shape.

import { isAbsolute, join, resolve } from "node:path";
import { Effect } from "effect";
import { conformance } from "./contract.ts";
import { ANY, resolve as resolveRule } from "./resolve.ts";
import { CannotRun, Refused } from "../../core/effect/errors.ts";
import { VentureFs, readJson } from "../../core/effect/fs.ts";
import { runPromise, runSync } from "../../core/effect/run.ts";
import { ventureFile } from "../../core/venture-paths.ts";

/** @typedef {import("../../core/effect/errors.ts").NaiveError} NaiveError */
/** @typedef {{ id: string, connector?: string, root?: string, writes?: string, implicit?: boolean, [k: string]: unknown }} Source */
/** @typedef {Record<string, string>} Rule */
/** @typedef {{ sources: Source[], records: Record<string, string>, rules: Rule[], mapped: boolean }} SourceMap */
/** @typedef {{ id: string, name: string, module: string, writes: string[], options?: string[] }} Registered */

const repo = new URL("../../../../..", import.meta.url).pathname;
const INTEGRATIONS = "packages/naive/src/records/layers/knowledge/tooling/integrations.json";
export const MAP = "knowledge/sources.json";
export const LOCAL = "venture";

/** @type {((input: string | URL | Request, init?: RequestInit) => Promise<Response>) | null} */
let fetchImpl = null;
/** Points every GitHub-style connector at another fetch (the evals' fake GitHub); null restores the real one. @param {typeof fetchImpl} f */
export const useFetch = (f) => { fetchImpl = f; };

// Connectors an app that hosts Naive registers in its own process (EE-041): a vendor connector, such as
// GitHub's, reaches the network, so it lives in the app and Naive never names its module.
/** @type {Map<string, Registered>} */
const registered = new Map();

/**
 * Registers an app's connector, failing with Refused for an entry without an absolute module or a write mode.
 * @param {string} id
 * @param {{ module: string, writes: string[], options?: string[], name?: string }} entry
 * @returns {Effect.Effect<void, Refused>}
 */
export const registerConnectorEffect = (id, entry) => Effect.suspend(() => {
  if (!entry || !isAbsolute(entry.module ?? "") || !Array.isArray(entry.writes) || !entry.writes.length) {
    return Effect.fail(new Refused({ rule: "register-connector", message: `registerConnector(${id}): name an absolute module path and at least one write mode` }));
  }
  registered.set(id, { id, name: entry.name ?? id, ...entry });
  return Effect.void;
});

/**
 * Registers an app's connector: id -> { module (an absolute path to a module that exports connect(options)),
 * writes, options, name }. A registered id replaces the framework's entry of the same id.
 * @param {string} id
 * @param {{ module: string, writes: string[], options?: string[], name?: string }} entry
 */
export function registerConnector(id, entry) { runSync(registerConnectorEffect(id, entry)); }

/** The connector registry as an Effect. @returns {Effect.Effect<Map<string, Registered>, NaiveError, "naive/VentureFs">} */
export const registryEffect = () => Effect.gen(function* () {
  const tools = /** @type {{ id: string, name: string, connector?: object }[]} */ (yield* readJson(join(repo, INTEGRATIONS)));
  /** @type {[string, Registered][]} */
  const own = tools.filter((t) => t.connector).map((t) => [t.id, /** @type {Registered} */ ({ id: t.id, name: t.name, ...t.connector })]);
  return new Map([...own, ...registered]);
});

/** The connector registry: integration id -> { module, writes, ... } from packages/naive/src/records/layers/knowledge/tooling/integrations.json,
 *  then the connectors an app registered. */
export function registry() { return runSync(registryEffect()); }

/** A venture's source map, with the implicit venture source first. @param {string} dir @returns {Effect.Effect<SourceMap, NaiveError, "naive/VentureFs">} */
export const sourcesOfEffect = (dir) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const mapped = yield* fs.exists(ventureFile(dir, MAP));
  const own = /** @type {{ sources?: Source[], records?: Record<string, string>, rules?: Rule[] }} */ (mapped ? yield* readJson(ventureFile(dir, MAP)) : { sources: [], records: {} });
  return { sources: [{ id: LOCAL, connector: "filesystem", root: ".", writes: "direct", implicit: true }, ...(own.sources ?? [])], records: own.records ?? {}, rules: own.rules ?? [], mapped };
});

/** A venture's source map, with the implicit venture source first. @param {string} dir */
export function sourcesOf(dir) { return runSync(sourcesOfEffect(dir)); }

/** The venture's phase from venture.json, or undefined when it cannot be read. @param {string} dir */
const phaseOf = (dir) => readJson(join(dir, "venture.json")).pipe(
  Effect.map((v) => /** @type {{ phase?: string } | null} */ (v)?.phase),
  Effect.orElseSucceed(() => undefined),
);

/** @param {string} message */
const badMap = (message) => new CannotRun({ message });

/**
 * The source a record type lives in, for a context (EE-042), as an Effect. Fails with CannotRun when
 * rules tie or name a source the map does not have.
 * @param {string} dir @param {string} recordType @param {Record<string, string>} [context]
 * @returns {Effect.Effect<Source, NaiveError, "naive/VentureFs">}
 */
export const sourceForEffect = (dir, recordType, context = {}) => Effect.gen(function* () {
  const m = yield* sourcesOfEffect(dir);
  const phase = yield* phaseOf(dir);
  const hit = resolveRule(m, { record: recordType, ...(phase ? { phase } : {}), ...context });
  if (hit?.ties.length) return yield* Effect.fail(badMap(`${MAP}: ${hit.ties.length} rules for ${recordType} tie at the same specificity; make one more specific`));
  const id = hit?.rule.system_of_record ?? LOCAL;
  const s = m.sources.find((x) => x.id === id);
  if (!s) return yield* Effect.fail(badMap(`${MAP} puts ${recordType} in ${id}, which is not one of its sources`));
  return s;
});

/**
 * The source a record type lives in, for a context (EE-042): the system of record of the most
 * specific rule that holds (resolve.ts). The venture's phase comes from venture.json; product,
 * account and actor come from the caller. With no rule, the venture's own folder.
 * @param {string} dir @param {string} recordType @param {Record<string, string>} [context]
 */
export function sourceFor(dir, recordType, context = {}) { return runSync(sourceForEffect(dir, recordType, context)); }

/**
 * attributeSources as an Effect.
 * @param {string} dir @param {string} recordType @param {Record<string, string>} [context]
 * @returns {Effect.Effect<{ attribute: string, source: Source }[], NaiveError, "naive/VentureFs">}
 */
export const attributeSourcesEffect = (dir, recordType, context = {}) => Effect.gen(function* () {
  const m = yield* sourcesOfEffect(dir);
  const whole = yield* sourceForEffect(dir, recordType, context);
  const phase = yield* phaseOf(dir);
  /** @type {string[]} */
  const names = [...new Set((m.rules ?? []).filter((r) => r.record === recordType && r.attribute !== ANY).map((r) => r.attribute))];
  /** @type {{ attribute: string, source: Source }[]} */
  const out = [];
  for (const attribute of names) {
    const hit = resolveRule(m, { record: recordType, attribute, ...(phase ? { phase } : {}), ...context });
    if (!hit || hit.rule.attribute === ANY) continue;
    if (hit.ties.length) return yield* Effect.fail(badMap(`${MAP}: ${hit.ties.length} rules for ${recordType}.${attribute} tie at the same specificity; make one more specific`));
    const source = m.sources.find((x) => x.id === hit.rule.system_of_record);
    if (!source) return yield* Effect.fail(badMap(`${MAP} masters ${recordType}.${attribute} in ${hit.rule.system_of_record}, which is not one of its sources`));
    if (source.id !== whole.id) out.push({ attribute, source });
  }
  return out;
});

/**
 * The attributes of a record type mastered somewhere other than the record itself, for a context
 * (EE-042): [{ attribute, source }]. Such an attribute is kept in its source at the record's own
 * path, as a JSON object holding only that attribute ({ "price": 12 }); a vendor's connector maps
 * that onto its own system. The router reads each one from there and writes it there.
 * @param {string} dir @param {string} recordType @param {Record<string, string>} [context]
 */
export function attributeSources(dir, recordType, context = {}) { return runSync(attributeSourcesEffect(dir, recordType, context)); }

/** @param {unknown} e @returns {NaiveError} */
const asNaive = (e) => (e && typeof e === "object" && "_tag" in e ? /** @type {NaiveError} */ (e) : new CannotRun({ message: e instanceof Error ? e.message : String(e), cause: e }));

// A connector module is loaded by path, so its type is not known here: what connect gives is whatever
// object the module's connect(options) returns, checked against the contract by conformance().
const cache = new Map();

/**
 * A connected connector for one source of one venture, as an Effect. The connector it gives is the
 * contract's, with Promise methods, whichever module made it.
 * @param {Source} source @param {string} dir
 */
export const connectEffect = (source, dir) => Effect.gen(function* () {
  const reg = (yield* registryEffect()).get(String(source.connector));
  if (!reg) return yield* Effect.fail(new CannotRun({ message: `no connector ${source.connector}: ${INTEGRATIONS} has ${[...(yield* registryEffect()).keys()].join(", ")}` }));
  const mod = cache.get(reg.module) ?? (yield* Effect.tryPromise({
    try: () => import(isAbsolute(reg.module) ? reg.module : join(repo, reg.module)),
    catch: (cause) => new CannotRun({ message: `cannot load connector module ${reg.module}`, cause }),
  }));
  cache.set(reg.module, mod);
  /** @type {Record<string, unknown>} */
  const opts = { ...source };
  delete opts.connector; delete opts.implicit;
  if (source.connector === "filesystem") {
    opts.root = isAbsolute(source.root ?? ".") ? source.root : resolve(dir, source.root ?? ".");
    opts.venture = source.id === LOCAL;
  } else if (fetchImpl) opts.fetch = fetchImpl;
  const c = yield* Effect.try({ try: () => mod.connect(opts), catch: asNaive });
  const problems = conformance(c);
  if (problems.length) return yield* Effect.fail(new CannotRun({ message: `${reg.module} does not meet the connector contract: ${problems.join("; ")}` }));
  return c;
});

/** A connected connector for one source of one venture. The parameters are left untyped, as they were, so callers keep their types. */
export async function connect(source, dir) { return runPromise(connectEffect(source, dir)); }

/** Every source of a venture, connected, as an Effect. @param {string} dir */
export const connectAllEffect = (dir) => Effect.gen(function* () {
  const { sources } = yield* sourcesOfEffect(dir);
  return yield* Effect.forEach(sources, (s) => Effect.map(connectEffect(s, dir), (connector) => ({ source: s, connector })), { concurrency: "unbounded" });
});

/** Every source of a venture, connected. @param {string} dir */
export async function connectAll(dir) { return runPromise(connectAllEffect(dir)); }
