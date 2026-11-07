// The researcher's read clamp (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The eval plan"
// and "program.md per function", build plan item 7). A role named <function>-researcher reads the venture only as
// it was at a cut, its reads_as_of: each record from the blob store as of that instant (readAsOf in
// packages/naive/src/store/as-of.mjs), every list as of it (pathsAsOf), and no signal observed after it. It never
// reads the live files. Any caller may pass reads_as_of to read the same as-of view; a researcher must.
//
//   - A researcher's read with no cut is refused, never served live. The cut is the earliest read_cut among the
//     researcher's eval plans; computing it is a later build item, so for now the caller passes it.
//   - An as-of call may read (and view a record), write, append and take a template. Writes are not clamped. Every
//     other action (layout, navigate, head, run, check, a command's view, package and venture routes) reads the
//     venture live, so an as-of call is refused it.
//   - Nothing under _eval/ is read or written by any agent, as-of or not: the eval set is the plan's, and a person's.
//   - One read is live: a researcher's read (or view) of its own function's research program,
//     operations/research-program/<function> (programs/<function>.md). The program is the person's instructions as
//     they stand now and holds no outcome, and a cut in the past would hide the program the person just wrote.
//   - A signal (record type signal) whose observed time is after the cut is left out, even when its file was
//     written before it. A log written by append stores no blob, so an as-of read finds no version of it; the
//     signal library's day index is such a log, and a pull applies the same cut when it reads it (not built).
//
// A .mjs file, not .ts, because router.mjs imports it, and Node does not strip types under node_modules, where an
// app that installs Naive keeps it.

import { pathsAsOf, readAsOf } from "../store/as-of.mjs";
import { address } from "../store/connectors/contract.mjs";

/** A researcher role: <function>-researcher. */
export const RESEARCHER = /^[a-z0-9][a-z0-9-]*-researcher$/;

/** What an as-of call may do. Writes are not clamped; everything else reads the venture live. */
export const AS_OF_ACTIONS = ["read", "view", "write", "append", "template"];

/** Whether a role is a researcher. */
export const isResearcher = (/** @type {unknown} */ role) => typeof role === "string" && RESEARCHER.test(role);

/** Whether a path or an address (<source>://<path>) is in the eval set: a folder _eval at any depth. */
export const inEval = (/** @type {unknown} */ path) => /(^|\/)_eval(\/|$)/.test(String(path ?? "").replace(/^[a-z0-9][a-z0-9-]*:\/\//, ""));

/**
 * Whether a call is a researcher reading its own function's research program, which reads live.
 * @param {{ action?: string, actor_id?: string | null, route?: string }} a
 */
export const ownProgram = (a) => isResearcher(a.actor_id) && (a.action === "read" || a.action === "view")
  && a.route === `operations/research-program/${String(a.actor_id).replace(/-researcher$/, "")}`;

/**
 * The cut for one call, in milliseconds, or null when it reads live; or a refusal.
 * @param {{ action?: string, actor_id?: string | null, reads_as_of?: unknown, route?: string }} a
 * @returns {{ ok: true, cut: number | null } | { ok: false, error: string, fix?: Record<string, unknown> }}
 */
export function cutFor(a) {
  if (ownProgram(a)) return { ok: true, cut: null };
  const researcher = isResearcher(a.actor_id);
  const given = a.reads_as_of;
  if (given === undefined || given === null || given === "") {
    if (!researcher) return { ok: true, cut: null };
    if (a.action === "write" || a.action === "append" || a.action === "template") return { ok: true, cut: null };
    return { ok: false, error: `${a.actor_id} is a researcher: it reads only as of a cut, and a read with no reads_as_of is refused, never served live`,
      fix: { pass: "reads_as_of: the earliest read_cut among the researcher's eval plans, as an ISO 8601 time" } };
  }
  const ms = given instanceof Date ? given.getTime() : typeof given === "number" ? given : Date.parse(String(given));
  if (!Number.isFinite(ms)) return { ok: false, error: `reads_as_of ${String(given)} is not a time: pass an ISO 8601 time` };
  return { ok: true, cut: ms };
}

/**
 * Refuses what an as-of call may not do, before anything reads the venture. Null when the call may go on.
 * @param {{ action?: string, actor_id?: string | null, reads_as_of?: unknown, route?: string }} a
 */
export function refusal(a) {
  const c = cutFor(a);
  if ("error" in c) return { ok: false, error: c.error, ...(c.fix ? { fix: c.fix } : {}) };
  if (c.cut === null || AS_OF_ACTIONS.includes(String(a.action))) return null;
  return { ok: false, error: `${a.action} reads the venture live, so a call that reads as of ${new Date(c.cut).toISOString()} may not ${a.action}; it may ${AS_OF_ACTIONS.join(", ")}` };
}

/**
 * A store that answers as of the cut, for the source a record type lives in: list() is pathsAsOf, read() is readAsOf,
 * and neither touches the live files or the source itself. Another source's records are found by their address in the
 * provenance log, so only what was written through the router is there.
 * @param {string} dir
 * @param {{ id: string }} src
 * @param {string} local the venture's own source id
 * @param {number} cut
 */
export function asOfStore(dir, src, local, cut) {
  const own = src.id === local;
  const prefix = `${src.id}://`;
  return {
    async list() {
      return pathsAsOf(dir, cut).filter((e) => own ? !e.includes("://") : e.startsWith(prefix)).map((e) => ({ path: own ? e : e.slice(prefix.length) }));
    },
    async read(/** @type {string} */ path) {
      const got = readAsOf(dir, own ? path : address(src.id, path), cut);
      return got ? { path, content: got.content, version: got.sha256, as_of: got.at } : null;
    },
  };
}

/**
 * Whether an item read as of the cut may be shown: a signal observed after the cut is not.
 * @param {string} record the record type
 * @param {{ content: string }} item
 * @param {number} cut
 */
export function observedBy(record, item, cut) {
  if (record !== "signal") return true;
  try {
    const observed = Date.parse(JSON.parse(item.content).observed);
    return Number.isFinite(observed) && observed <= cut;
  } catch {
    return false;
  }
}
