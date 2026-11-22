// Syncing a system of record into a venture (EE-083). Naive keeps pointers to the systems a venture's
// functions keep their truth in (knowledge/sources.json `functions`). Reaching a system is an app's job:
// the app names a sync command for the system, and Naive runs it. Naive ships no sync command, so with
// none named a system stays recorded as pointed.
//
//   NAIVE_SYNC_<SYSTEM>   the command line for one system: the system id upper-cased, each - as _
//                         (NAIVE_SYNC_RHO for rho, NAIVE_SYNC_GOOGLE_DRIVE for google-drive)
//
// The command is run as `<command> --venture <dir>`. It writes into the venture (a money source writes
// money/_summary.json and its streams) and exits 0. Its last stdout line may be JSON saying what it did:
//   { "address": "sandbox", "fixture": true, "said": "from a saved answer (a fixture, not a live account)" }
// Hosted (packages/naive/src/core/runtime.ts), the variable is ignored and every system stays pointed.
// Imports runtime.ts only.

import { spawnSync } from "node:child_process";
import { isHosted } from "./runtime.ts";

/** What a sync command's last stdout line said it did. */
export type SyncSaid = { address?: string; fixture?: boolean; said?: string };
export type SyncResult = { ran: false } | ({ ran: true; ok: true } & SyncSaid) | { ran: true; ok: false; error?: string };

/** The environment variable that names a system's sync command. */
export const syncVariable = (system: string): string => `NAIVE_SYNC_${String(system).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

/** The sync command named for a system, or null. */
export function syncCommand(system: string, env: NodeJS.ProcessEnv = process.env): string | null {
  if (isHosted()) return null; // hosted, NAIVE_SYNC_* is ignored: reaching a system is the host's own work
  const c = env[syncVariable(system)];
  return c && c.trim() ? c.trim() : null;
}

/**
 * Runs a system's sync command for a venture. `ran` is false when no command is named.
 */
export function sync(system: string, dir: string, { env = process.env }: { env?: NodeJS.ProcessEnv } = {}): SyncResult {
  const command = syncCommand(system, env);
  if (!command) return { ran: false };
  const r = spawnSync(`${command} --venture ${JSON.stringify(dir)}`, { shell: true, encoding: "utf8", env });
  if (r.status !== 0) return { ran: true, ok: false, error: (r.stderr || r.stdout || r.error?.message || "the sync command failed").trim().split("\n").at(-1) };
  let said: SyncSaid = {};
  try {
    const last = String(r.stdout).trim().split("\n").at(-1) ?? "";
    const j = last.startsWith("{") ? JSON.parse(last) : null;
    if (j && typeof j === "object") said = { ...(typeof j.address === "string" ? { address: j.address } : {}), ...(j.fixture === true ? { fixture: true } : {}), ...(typeof j.said === "string" ? { said: j.said } : {}) };
  } catch { /* a command that prints no JSON said nothing more */ }
  return { ran: true, ok: true, ...said };
}
