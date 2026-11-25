// Applying a decided sync conflict (EE-174, docs/design/OFFLINE_SYNC_2026-11-25.md). merge() in decisions.ts calls
// these when a decision carries sync_conflict; sync-conflicts.ts files those decisions. Pure: no I/O.

import { pathText } from "./merge.ts";

/** Who wrote each side, for the person deciding. */
export type ConflictMeta = { local_by?: string; store_by?: string; working_copy?: string; found_at?: string };

/** The stored conflict on a decision record (`sync_conflict` in decision-record.schema.json). */
export type SyncConflict = { file: string; path: string[]; base?: unknown; local?: unknown; store?: unknown } & ConflictMeta;

/** The value a decided answer picks: the store's, the working copy's, or a person's own value as JSON. */
export function chosenValue(answer: string | null | undefined, sc: SyncConflict): { ok: true; value: unknown; error?: undefined } | { ok: false; error: string; value?: undefined } {
  const a = (answer ?? "").trim();
  if (a === "store") return { ok: true, value: sc.store };
  if (a === "local") return { ok: true, value: sc.local };
  if (!a) return { ok: false, error: "a sync conflict needs an answer: store, local, or a value as JSON" };
  try { return { ok: true, value: JSON.parse(a) }; } catch { return { ok: true, value: a }; }
}

type Obj = { [key: string]: unknown };
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const itemId = (seg: string): string | null => { const m = /^\[id=(.*)\]$/.exec(seg); return m ? (m[1] as string) : null; };

/**
 * Writes `value` at `path` in a copy of `record` and returns it; `undefined` removes the key or item. A missing
 * object on the way is created; a missing item of an array by id is appended. The whole record (an empty path)
 * is refused, because removing or replacing a whole record from a decision is not built.
 */
export function applySyncConflict(record: unknown, path: string[], value: unknown): { ok: true; record: Obj; error?: undefined } | { ok: false; error: string; record?: undefined } {
  if (path.length === 0) return { ok: false, error: "resolving a conflict over a whole record is not built; edit the record and sync again" };
  const root: unknown = structuredClone(isObj(record) ? record : {});
  let x: unknown = root;
  for (let i = 0; i < path.length; i++) {
    const seg = path[i] as string, last = i === path.length - 1, id = itemId(seg);
    if (id !== null) {
      if (!Array.isArray(x)) return { ok: false, error: `${pathText(path.slice(0, i))} is not a list` };
      const n = x.findIndex((it) => isObj(it) && it.id === id);
      if (last) {
        if (value === undefined) { if (n >= 0) x.splice(n, 1); }
        else if (n >= 0) x[n] = value; else x.push(value);
        break;
      }
      if (n < 0) { x.push({ id }); x = x.at(-1); } else x = x.at(n);
    } else {
      if (!isObj(x)) return { ok: false, error: `${pathText(path.slice(0, i)) || "the record"} is not an object` };
      if (last) { if (value === undefined) delete x[seg]; else x[seg] = value; break; }
      const next = path[i + 1] as string;
      if (x[seg] === undefined) x[seg] = itemId(next) !== null ? [] : {};
      x = x[seg];
    }
  }
  return { ok: true, record: root as Obj };
}
