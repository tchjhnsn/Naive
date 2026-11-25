// Conflict decisions for offline sync (EE-174, docs/design/OFFLINE_SYNC_2026-11-25.md, build item 2). When the
// field merge (merge.ts) finds the same field changed on both sides, the record keeps the store's value and the
// conflict is filed here as an open decision holding both values, so nothing is lost and a person decides.
//
// The decision goes through Naive's one decision door: an agent proposes it (propose in decisions.ts), a person
// approves an answer, and merging the decided version writes the chosen value back into the record (merge in
// decisions.ts, through applySyncConflict in sync-apply.ts). The answer is `store`, `local`, or a person's own value written as
// JSON. A rerun of the same conflict on the same values leaves the decision as it is.

import { createHash } from "node:crypto";
import type { Conflict, Json } from "./merge.ts";
import { pathText } from "./merge.ts";
import { decisionFile, propose } from "./decisions.ts";
import type { ConflictMeta, SyncConflict } from "./sync-apply.ts";

/** The agent id conflicts are proposed under. */
export const SYNC_AGENT = "sync";

const shown = (v: Json | undefined): string => v === undefined ? "nothing (removed)" : JSON.stringify(v);

/** A conflict's decision id: stable for one file, path and pair of values, so a rerun finds the same decision. */
export function conflictId(file: string, c: Conflict): string {
  const h = createHash("sha256").update(JSON.stringify([file, c.path, c.local ?? null, c.store ?? null])).digest("hex").slice(0, 10);
  return `sync-conflict-${h}`;
}

/** The decision a conflict becomes: question, the two options, a note naming who wrote each, and the conflict itself. */
export function conflictDecision(file: string, c: Conflict, meta: ConflictMeta = {}) {
  const where = `${file} ${pathText(c.path)}`;
  const sync_conflict: SyncConflict = {
    file, path: c.path,
    ...(c.base !== undefined ? { base: c.base } : {}), ...(c.local !== undefined ? { local: c.local } : {}), ...(c.store !== undefined ? { store: c.store } : {}),
    ...meta,
  };
  return {
    id: conflictId(file, c),
    question: `Which value should ${where} keep? It was changed offline and in the business store.`,
    options: ["store", "local"],
    note: `The business store has ${shown(c.store)}${meta.store_by ? ` (${meta.store_by})` : ""}. The working copy${meta.working_copy ? ` ${meta.working_copy}` : ""} has ${shown(c.local)}${meta.local_by ? ` (${meta.local_by})` : ""}. Before both it was ${shown(c.base)}. The record keeps the store's value until this is decided. Answer store, local, or your own value as JSON.`,
    decides: { path: file },
    sync_conflict,
  };
}

/** Files each conflict as an open decision. A decision already filed for the same conflict is kept as it is. */
export function fileConflicts(dir: string, file: string, conflicts: Conflict[], meta: ConflictMeta = {}) {
  return conflicts.map((c) => {
    const input = conflictDecision(file, c, meta);
    const kept = decisionFile(dir, input.id);
    if (kept) return { id: input.id, path: pathText(c.path), file: kept, kept: true };
    const r = propose(dir, input, { agentId: SYNC_AGENT, via: "sync" });
    return { id: input.id, path: pathText(c.path), ...(r.ok ? { file: r.result.file } : { error: r.error }) };
  });
}
