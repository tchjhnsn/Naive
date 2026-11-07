// As-of reads (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "As-of reads (Naive)", build plan
// item 2): a record as it was at transaction time t, from the provenance log and the blob store.
//
// readAsOf(dir, routeOrPath, t) takes the last provenance line for that path whose `at` is at or before t, and
// returns the blob its sha256 names. It never reads the record's current file, so nothing written after t can
// leak into the answer. It answers null when:
//   - no line for the path is at or before t (the record did not exist yet, as far as the log knows);
//   - that line has no blob: it was written before the blob store existed (nothing is backfilled), or by a
//     caller that stores none (a log route's append, a publish; packages/naive/src/core/provenance.mjs record);
//   - a move line at or before t moved the path away and nothing wrote it again.
// Draft lines are skipped: a held draft is not the record until a person accepts it, and a draft pull request to
// another source is not in that source until it is merged.
//
// pathsAsOf(dir, t) lists every path readAsOf would answer for at t.
//
// A .mjs file, not .ts, because the router will read through it (the researcher's read clamp, build plan item 7),
// and Node does not strip types under node_modules, where an app that installs Naive keeps it.

import { entries } from "../core/provenance.mjs";
import { hasBlob, readBlob } from "../core/blobs.mjs";

/** @typedef {{ at: string, entity: string, route?: string, activity: string, sha256: string, derived_from?: string[] }} Line */

/** Milliseconds since the epoch for t: a Date, an ISO 8601 string or a number of milliseconds. */
function cutOf(/** @type {Date | string | number} */ t) {
  const ms = t instanceof Date ? t.getTime() : typeof t === "number" ? t : Date.parse(t);
  if (!Number.isFinite(ms)) throw new Error(`${String(t)} is not a time: pass a Date, an ISO 8601 string or milliseconds`);
  return ms;
}

/** The lines at or before the cut, in log order, without drafts. */
function linesTo(/** @type {string} */ dir, /** @type {number} */ cut) {
  return /** @type {Line[]} */ (entries(dir)).filter((l) => l.activity !== "draft" && Date.parse(l.at) <= cut);
}

/** The path a route or path names as of the cut: the path itself when a line names it, else the entity of the last line through that route. */
function entityOf(/** @type {Line[]} */ lines, /** @type {string} */ routeOrPath) {
  const p = String(routeOrPath).replace(/^\.\//, "");
  if (lines.some((l) => l.entity === p)) return p;
  return lines.findLast((l) => l.route === p && !l.entity.includes("#"))?.entity ?? p;
}

/** The line that holds a path's version at the end of these lines, or null when there is none or it was moved away. */
function versionOf(/** @type {Line[]} */ lines, /** @type {string} */ entity) {
  /** @type {Line | null} */
  let found = null;
  for (const l of lines) {
    if (l.entity === entity) found = l;
    else if (l.activity === "move" && (l.derived_from ?? []).includes(entity)) found = null;
  }
  return found;
}

/**
 * A record's content as of transaction time t, or null (see the header for when).
 * @param {string} dir the venture folder
 * @param {string} routeOrPath a logical path (foundation/problem.json), an address in another source
 *   (<source>://<path>), or a concrete route the record was written through (validation/solution, products/teapot)
 * @param {Date | string | number} t
 * @returns {{ entity: string, at: string, activity: string, sha256: string, content: string } | null}
 */
export function readAsOf(dir, routeOrPath, t) {
  const lines = linesTo(dir, cutOf(t));
  const entity = entityOf(lines, routeOrPath);
  const line = versionOf(lines, entity);
  if (!line) return null;
  const bytes = readBlob(dir, line.sha256);
  return bytes ? { entity, at: line.at, activity: line.activity, sha256: line.sha256, content: bytes.toString("utf8") } : null;
}

/**
 * Every path readAsOf answers for at transaction time t, sorted.
 * @param {string} dir
 * @param {Date | string | number} t
 * @returns {string[]}
 */
export function pathsAsOf(dir, t) {
  /** @type {Map<string, Line>} */
  const at = new Map();
  for (const l of linesTo(dir, cutOf(t))) {
    if (l.activity === "move") for (const from of l.derived_from ?? []) at.delete(from);
    at.set(l.entity, l);
  }
  return [...at].filter(([, l]) => hasBlob(dir, l.sha256)).map(([e]) => e).sort();
}
