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
import { conformance, isConnector, type Connector } from "./contract.ts";
import { ANY, resolve as resolveRule, type SourceRule } from "./resolve.ts";
import { CannotRun, Refused, type NaiveError } from "../../core/effect/errors.ts";
import { VentureFs, readJson } from "../../core/effect/fs.ts";
import { runPromise, runSync } from "../../core/effect/run.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import type { Integration, KnowledgeSources, Venture } from "../../records/types/records.d.ts";

/** A source in a venture's source map; the venture's own folder is the implicit one. */
export type Source = KnowledgeSources["sources"][number] & { implicit?: boolean };
/** A venture's source map as the router reads it: the implicit venture source first, and whether a map file exists. */
export type SourceMap = { sources: Source[]; records: Record<string, string>; rules: SourceRule[]; mapped: boolean };
/** What connecting a source reads: its id, its connector and folder, and the options the connector takes. */
export type ConnectSource = { id: string; connector?: string; root?: string; [key: string]: unknown };
/** A connector in the registry: an integration's connector entry, or one an app registered. */
export type Registered = { id: string; name: string; module: string; writes: string[]; options?: string[]; eval?: string };
/** An app's connector entry for registerConnector. */
export type ConnectorEntry = { module: string; writes: string[]; options?: string[]; name?: string };
/** A source of a venture with its connected connector. */
export type Connected = { source: Source; connector: Connector };

/**
 * A JSON file Naive ships or a venture keeps, read as the type its schema gives it. The file is trusted here, as
 * Naive's other readers trust a schema-governed file; check-sources and validate.ts are what check it.
 */
export const readTyped = <T>(path: string): Effect.Effect<T, NaiveError, "naive/VentureFs"> => Effect.map(readJson(path), (v): T => v as T);

const repo = new URL("../../../../..", import.meta.url).pathname;
const INTEGRATIONS = "packages/naive/src/records/layers/knowledge/tooling/integrations.json";
export const MAP = "knowledge/sources.json";
export const LOCAL = "venture";

/** A fetch, as the GitHub-style connectors take one. */
export type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
let fetchImpl: Fetch | null = null;
/** Points every GitHub-style connector at another fetch (the evals' fake GitHub); null restores the real one. */
export const useFetch = (f: Fetch | null): void => { fetchImpl = f; };

// Connectors an app that hosts Naive registers in its own process (EE-041): a vendor connector, such as
// GitHub's, reaches the network, so it lives in the app and Naive never names its module.
const registered = new Map<string, Registered>();

/** Registers an app's connector, failing with Refused for an entry without an absolute module or a write mode. */
export const registerConnectorEffect = (id: string, entry: ConnectorEntry): Effect.Effect<void, Refused> => Effect.suspend(() => {
  if (!entry || !isAbsolute(entry.module ?? "") || !Array.isArray(entry.writes) || !entry.writes.length) {
    return Effect.fail(new Refused({ rule: "register-connector", message: `registerConnector(${id}): name an absolute module path and at least one write mode` }));
  }
  registered.set(id, { id, name: entry.name ?? id, ...entry });
  return Effect.void;
});

/**
 * Registers an app's connector: id -> { module (an absolute path to a module that exports connect(options)),
 * writes, options, name }. A registered id replaces the framework's entry of the same id.
 */
export function registerConnector(id: string, entry: ConnectorEntry): void { runSync(registerConnectorEffect(id, entry)); }

/** The connector registry as an Effect. */
export const registryEffect = (): Effect.Effect<Map<string, Registered>, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const tools = yield* readTyped<Integration[]>(join(repo, INTEGRATIONS));
  const own = tools.flatMap((t): [string, Registered][] => (t.connector ? [[t.id, { id: t.id, name: t.name, ...t.connector }]] : []));
  return new Map([...own, ...registered]);
});

/** The connector registry: integration id -> { module, writes, ... } from packages/naive/src/records/layers/knowledge/tooling/integrations.json,
 *  then the connectors an app registered. */
export function registry(): Map<string, Registered> { return runSync(registryEffect()); }

/** A venture's source map, with the implicit venture source first. */
export const sourcesOfEffect = (dir: string): Effect.Effect<SourceMap, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const mapped = yield* fs.exists(ventureFile(dir, MAP));
  const own: Partial<KnowledgeSources> = mapped ? yield* readTyped<Partial<KnowledgeSources>>(ventureFile(dir, MAP)) : { sources: [], records: {} };
  return { sources: [{ id: LOCAL, connector: "filesystem", root: ".", writes: "direct", implicit: true }, ...(own.sources ?? [])], records: own.records ?? {}, rules: own.rules ?? [], mapped };
});

/** A venture's source map, with the implicit venture source first. */
export function sourcesOf(dir: string): SourceMap { return runSync(sourcesOfEffect(dir)); }

/** The venture's phase from venture.json, or undefined when it cannot be read. */
const phaseOf = (dir: string): Effect.Effect<string | undefined, never, "naive/VentureFs"> => readTyped<Partial<Venture> | null>(join(dir, "venture.json")).pipe(
  Effect.map((v) => v?.phase),
  Effect.orElseSucceed(() => undefined),
);

const badMap = (message: string) => new CannotRun({ message });

/**
 * The source a record type lives in, for a context (EE-042), as an Effect. Fails with CannotRun when
 * rules tie or name a source the map does not have.
 */
export const sourceForEffect = (dir: string, recordType: string, context: Record<string, string> = {}): Effect.Effect<Source, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
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
 */
export function sourceFor(dir: string, recordType: string, context: Record<string, string> = {}): Source { return runSync(sourceForEffect(dir, recordType, context)); }

/** attributeSources as an Effect. */
export const attributeSourcesEffect = (dir: string, recordType: string, context: Record<string, string> = {}): Effect.Effect<{ attribute: string; source: Source }[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const m = yield* sourcesOfEffect(dir);
  const whole = yield* sourceForEffect(dir, recordType, context);
  const phase = yield* phaseOf(dir);
  const names = [...new Set((m.rules ?? []).filter((r) => r.record === recordType && r.attribute !== ANY).map((r) => r.attribute))];
  const out: { attribute: string; source: Source }[] = [];
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
 */
export function attributeSources(dir: string, recordType: string, context: Record<string, string> = {}): { attribute: string; source: Source }[] { return runSync(attributeSourcesEffect(dir, recordType, context)); }

// A thrown value a connector raised: a Naive tagged error as it is, else wrapped as CannotRun.
const NAIVE_TAGS = new Set(["IoError", "ParseError", "NotFound", "SchemaInvalid", "Refused", "CannotRun", "VersionConflict"]);
const isNaiveError = (e: unknown): e is NaiveError => typeof e === "object" && e !== null && "_tag" in e && NAIVE_TAGS.has(String(e._tag));
export const asNaive = (e: unknown): NaiveError => (isNaiveError(e) ? e : new CannotRun({ message: e instanceof Error ? e.message : String(e), cause: e }));

// A connector module is loaded by path, so its type is not known here: what connect gives is whatever
// object the module's connect(options) returns, checked against the contract by conformance().
type ConnectorModule = { connect: (options: Record<string, unknown>) => unknown };
const isConnectorModule = (m: unknown): m is ConnectorModule => typeof m === "object" && m !== null && "connect" in m && typeof m.connect === "function";
const cache = new Map<string, unknown>();

/**
 * A connected connector for one source of one venture, as an Effect. The connector it gives is the
 * contract's, with Promise methods, whichever module made it.
 */
export const connectEffect = (source: ConnectSource, dir: string): Effect.Effect<Connector, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const reg = (yield* registryEffect()).get(String(source.connector));
  if (!reg) return yield* Effect.fail(new CannotRun({ message: `no connector ${source.connector}: ${INTEGRATIONS} has ${[...(yield* registryEffect()).keys()].join(", ")}` }));
  const mod: unknown = cache.get(reg.module) ?? (yield* Effect.tryPromise({
    try: (): Promise<unknown> => import(isAbsolute(reg.module) ? reg.module : join(repo, reg.module)),
    catch: (cause) => new CannotRun({ message: `cannot load connector module ${reg.module}`, cause }),
  }));
  cache.set(reg.module, mod);
  const opts: Record<string, unknown> = { ...source };
  delete opts.connector; delete opts.implicit;
  if (source.connector === "filesystem") {
    opts.root = isAbsolute(source.root ?? ".") ? source.root : resolve(dir, source.root ?? ".");
    opts.venture = source.id === LOCAL;
  } else if (fetchImpl) opts.fetch = fetchImpl;
  const c = yield* Effect.try({
    try: () => { if (!isConnectorModule(mod)) throw new TypeError("mod.connect is not a function"); return mod.connect(opts); },
    catch: asNaive,
  });
  if (!isConnector(c)) return yield* Effect.fail(new CannotRun({ message: `${reg.module} does not meet the connector contract: ${conformance(c).join("; ")}` }));
  return c;
});

/** A connected connector for one source of one venture. A source a caller looked up and did not find is refused. */
export async function connect(source: ConnectSource | undefined, dir: string): Promise<Connector> {
  if (!source) throw new TypeError("connect: no source to connect");
  return runPromise(connectEffect(source, dir));
}

/** Every source of a venture, connected, as an Effect. */
export const connectAllEffect = (dir: string): Effect.Effect<Connected[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const { sources } = yield* sourcesOfEffect(dir);
  return yield* Effect.forEach(sources, (s) => Effect.map(connectEffect(s, dir), (connector) => ({ source: s, connector })), { concurrency: "unbounded" });
});

/** Every source of a venture, connected. */
export async function connectAll(dir: string): Promise<Connected[]> { return runPromise(connectAllEffect(dir)); }
