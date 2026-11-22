// The file system as an Effect service (EE-125). Naive code that reads or writes files asks for
// VentureFs instead of importing node:fs, so a test can provide an in-memory one (MemoryFs) and a
// host can provide its own. NodeFs is the default, backed by node:fs.
// A .mjs file because router and store modules import it and Node does not strip types under node_modules.
import { Context, Effect, Layer } from "effect";
import { appendFileSync, closeSync, existsSync, linkSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { IoError, NotFound, ParseError } from "./errors.mjs";

/**
 * @typedef {{
 *   readonly exists: (path: string) => Effect.Effect<boolean>,
 *   readonly readText: (path: string) => Effect.Effect<string, IoError | NotFound>,
 *   readonly writeText: (path: string, text: string | Buffer) => Effect.Effect<void, IoError>,
 *   readonly readBytes: (path: string) => Effect.Effect<Buffer, IoError | NotFound>,
 *   readonly append: (path: string, text: string | Buffer) => Effect.Effect<void, IoError>,
 *   readonly createExclusive: (path: string) => Effect.Effect<boolean, IoError>,
 *   readonly stat: (path: string) => Effect.Effect<{ ino: number, mtimeMs: number, isDirectory: boolean } | null>,
 *   readonly list: (dir: string) => Effect.Effect<string[], IoError>,
 *   readonly isDirectory: (path: string) => Effect.Effect<boolean>,
 *   readonly rename: (from: string, to: string) => Effect.Effect<void, IoError>,
 *   readonly remove: (path: string) => Effect.Effect<void, IoError>,
 *   readonly link: (from: string, to: string) => Effect.Effect<void, IoError>,
 * }} VentureFsShape
 */

/** The file system service. Yield it inside Effect.gen: `const fs = yield* VentureFs`. */
export const VentureFs = /** @type {Context.Service<"naive/VentureFs", VentureFsShape>} */ (Context.Service("naive/VentureFs"));

/** @param {string} path @param {string} op */
const io = (path, op) => /** @param {unknown} cause */ (cause) => new IoError({ path, op, cause });

/** @type {VentureFsShape} */
export const nodeFs = {
  exists: (path) => Effect.sync(() => existsSync(path)),
  readText: (path) => Effect.suspend(() => /** @type {Effect.Effect<string, IoError | NotFound>} */ (existsSync(path)
    ? Effect.try({ try: () => readFileSync(path, "utf8"), catch: io(path, "read") })
    : Effect.fail(new NotFound({ what: "file", path })))),
  writeText: (path, text) => Effect.try({ try: () => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); }, catch: io(path, "write") }),
  readBytes: (path) => Effect.suspend(() => /** @type {Effect.Effect<Buffer, IoError | NotFound>} */ (existsSync(path)
    ? Effect.try({ try: () => readFileSync(path), catch: io(path, "read") })
    : Effect.fail(new NotFound({ what: "file", path })))),
  append: (path, text) => Effect.try({ try: () => { mkdirSync(dirname(path), { recursive: true }); appendFileSync(path, text); }, catch: io(path, "append") }),
  createExclusive: (path) => Effect.try({
    try: () => { mkdirSync(dirname(path), { recursive: true }); try { closeSync(openSync(path, "wx")); return true; } catch (e) { if (/** @type {{ code?: string }} */ (e).code === "EEXIST") return false; throw e; } },
    catch: io(path, "create"),
  }),
  stat: (path) => Effect.sync(() => { try { const s = statSync(path); return { ino: s.ino, mtimeMs: s.mtimeMs, isDirectory: s.isDirectory() }; } catch { return null; } }),
  list: (dir) => Effect.try({ try: () => (existsSync(dir) ? readdirSync(dir).sort() : []), catch: io(dir, "list") }),
  isDirectory: (path) => Effect.sync(() => existsSync(path) && statSync(path).isDirectory()),
  rename: (from, to) => Effect.try({ try: () => { mkdirSync(dirname(to), { recursive: true }); renameSync(from, to); }, catch: io(from, "rename") }),
  remove: (path) => Effect.try({ try: () => rmSync(path, { recursive: true, force: true }), catch: io(path, "remove") }),
  link: (from, to) => Effect.try({ try: () => linkSync(from, to), catch: io(from, "link") }),
};

export const NodeFs = Layer.succeed(VentureFs, nodeFs);

/**
 * An in-memory file system for tests: paths are keys, folders are implied by prefixes.
 * @param {Record<string, string>} [files]
 * @returns {VentureFsShape & { files: Map<string, string> }}
 */
export const memoryFs = (files = {}) => {
  const map = new Map(Object.entries(files));
  /** @type {Map<string, number>} */
  const mtimes = new Map();
  let inode = 0;
  /** @type {Map<string, number>} */
  const inodes = new Map();
  /** @param {string} path */
  const touch = (path) => { mtimes.set(path, Date.now()); if (!inodes.has(path)) inodes.set(path, ++inode); };
  /** @param {string} dir */
  const under = (dir) => [...map.keys()].filter((k) => k.startsWith(dir.endsWith("/") ? dir : `${dir}/`));
  return {
    files: map,
    exists: (path) => Effect.sync(() => map.has(path) || under(path).length > 0),
    readText: (path) => Effect.suspend(() => { const t = map.get(path); return t === undefined ? Effect.fail(new NotFound({ what: "file", path })) : Effect.succeed(t); }),
    writeText: (path, text) => Effect.sync(() => { map.set(path, String(text)); touch(path); }),
    readBytes: (path) => Effect.suspend(() => { const t = map.get(path); return t === undefined ? Effect.fail(new NotFound({ what: "file", path })) : Effect.succeed(Buffer.from(t, "utf8")); }),
    append: (path, text) => Effect.sync(() => { map.set(path, (map.get(path) ?? "") + String(text)); touch(path); }),
    createExclusive: (path) => Effect.sync(() => { if (map.has(path)) return false; map.set(path, ""); touch(path); return true; }),
    stat: (path) => Effect.sync(() => (map.has(path)
      ? { ino: inodes.get(path) ?? 0, mtimeMs: mtimes.get(path) ?? 0, isDirectory: false }
      : under(path).length > 0 ? { ino: 0, mtimeMs: 0, isDirectory: true } : null)),
    list: (dir) => Effect.sync(() => [...new Set(under(dir).map((k) => k.slice(dir.replace(/\/$/, "").length + 1).split("/")[0]))].sort()),
    isDirectory: (path) => Effect.sync(() => under(path).length > 0),
    rename: (from, to) => Effect.sync(() => { const t = map.get(from); if (t !== undefined) { map.delete(from); map.set(to, t); } }),
    remove: (path) => Effect.sync(() => { map.delete(path); mtimes.delete(path); inodes.delete(path); for (const k of under(path)) map.delete(k); }),
    link: (from, to) => Effect.suspend(() => {
      const t = map.get(from);
      if (t === undefined || map.has(to)) return Effect.fail(new IoError({ path: from, op: "link", cause: t === undefined ? "missing" : "exists" }));
      map.set(to, t); inodes.set(to, inodes.get(from) ?? ++inode); mtimes.set(to, mtimes.get(from) ?? Date.now());
      return Effect.void;
    }),
  };
};

/** @param {Record<string, string>} [files] */
export const MemoryFs = (files = {}) => Layer.succeed(VentureFs, memoryFs(files));

/**
 * Read and parse a JSON file through VentureFs.
 * @param {string} path
 * @returns {Effect.Effect<unknown, IoError | NotFound | ParseError, "naive/VentureFs">}
 */
export const readJson = (path) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const text = yield* fs.readText(path);
  return yield* Effect.try({ try: () => /** @type {unknown} */ (JSON.parse(text)), catch: (cause) => new ParseError({ path, cause }) });
});

/**
 * Write a value as JSON with a trailing newline, the way every Naive record is written.
 * @param {string} path
 * @param {unknown} value
 * @returns {Effect.Effect<void, IoError, "naive/VentureFs">}
 */
export const writeJson = (path, value) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  yield* fs.writeText(path, `${JSON.stringify(value, null, 2)}\n`);
});
