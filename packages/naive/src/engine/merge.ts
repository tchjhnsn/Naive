// The field merge for offline sync (EE-174, docs/design/OFFLINE_SYNC_2026-11-25.md). A working copy that was
// away from the business store comes back with records changed on both sides. For each record, this module takes
// three copies, the base (the version the working copy last pulled), the local copy and the store copy, and
// returns the merged record and the conflicts: paths where both sides changed the same field to different values.
//
// Rules, in the order they are tried at each path:
//   1. local and store are equal: take it (both made the same change, or neither changed it).
//   2. only one side differs from the base: take that side.
//   3. both changed and both are objects: merge key by key.
//   4. both changed and both are arrays whose items are objects with unique string ids: merge item by item, by id.
//   5. otherwise it is a conflict: the merged record keeps the store's value, and the conflict carries all three.
//
// Undefined means absent: a key that is missing, a record not yet created or a record removed. A removal on one
// side and an edit on the other is a conflict like any other. The module is pure: no I/O, no clock, no model.
// The caller files each conflict as a decision for a person (not built: build item 2 of the design).

/** A JSON value as a record holds it. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** One path both sides changed to different values. `undefined` means absent on that side. */
export type Conflict = {
  /** The path from the record's root: object keys, and `[id=<id>]` for an item of an array merged by id. */
  path: string[];
  base: Json | undefined;
  local: Json | undefined;
  store: Json | undefined;
};

export type MergeResult = {
  /** The merged record: undefined when the merge removes it. Every conflict keeps the store's value here. */
  merged: Json | undefined;
  conflicts: Conflict[];
};

type Obj = { [key: string]: Json };

const isObj = (v: Json | undefined): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Canonical JSON: object keys sorted, so two values that mean the same compare equal. */
function canonical(v: Json | undefined): string {
  if (v === undefined) return "\u0000absent";
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (isObj(v)) return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

const same = (a: Json | undefined, b: Json | undefined): boolean => canonical(a) === canonical(b);

/** The ids of an array whose items are all objects with a unique non-empty string `id`, or null. */
function ids(v: Json | undefined): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    if (!isObj(item) || typeof item.id !== "string" || item.id === "" || out.includes(item.id)) return null;
    out.push(item.id);
  }
  return out;
}

function byId(v: Json[]): Map<string, Json> {
  const m = new Map<string, Json>();
  for (const item of v) if (isObj(item) && typeof item.id === "string") m.set(item.id, item);
  return m;
}

function at(path: string[], base: Json | undefined, local: Json | undefined, store: Json | undefined, conflicts: Conflict[]): Json | undefined {
  if (same(local, store)) return store; // rule 1
  if (same(local, base)) return store; // rule 2: only the store changed
  if (same(store, base)) return local; // rule 2: only the working copy changed
  if (isObj(local) && isObj(store) && (base === undefined || isObj(base))) { // rule 3
    const out: Obj = {};
    const keys = [...Object.keys(store), ...Object.keys(local).filter((k) => !(k in store))];
    for (const k of keys) {
      const v = at([...path, k], base?.[k], local[k], store[k], conflicts);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  const localIds = ids(local), storeIds = ids(store), baseIds = base === undefined ? [] : ids(base);
  if (localIds && storeIds && baseIds && Array.isArray(local) && Array.isArray(store)) { // rule 4
    const b = Array.isArray(base) ? byId(base) : new Map<string, Json>(), l = byId(local), s = byId(store);
    const order = [...storeIds, ...localIds.filter((id) => !storeIds.includes(id))];
    const out: Json[] = [];
    for (const id of order) {
      const v = at([...path, `[id=${id}]`], b.get(id), l.get(id), s.get(id), conflicts);
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  conflicts.push({ path, base, local, store }); // rule 5
  return store;
}

/** Merges one record from its base, local and store copies. */
export function mergeRecord(base: Json | undefined, local: Json | undefined, store: Json | undefined): MergeResult {
  const conflicts: Conflict[] = [];
  const merged = at([], base, local, store, conflicts);
  return { merged, conflicts };
}

/** A conflict's path as one string: `price.amount`, `owners[id=o2].name`, or `(record)` for the whole record. */
export const pathText = (path: string[]): string => path.length === 0 ? "(record)" : path.map((p, i) => (p.startsWith("[id=") || i === 0 ? p : `.${p}`)).join("");
