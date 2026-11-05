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
// Imports nothing in the repository.

import { spawnSync } from "node:child_process";

/** The environment variable that names a system's sync command. @param {string} system */
export const syncVariable = (system) => `NAIVE_SYNC_${String(system).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;

/** The sync command named for a system, or null. @param {string} system @param {NodeJS.ProcessEnv} [env] */
export function syncCommand(system, env = process.env) {
  const c = env[syncVariable(system)];
  return c && c.trim() ? c.trim() : null;
}

/**
 * Runs a system's sync command for a venture. `ran` is false when no command is named.
 * @param {string} system @param {string} dir
 * @param {{ env?: NodeJS.ProcessEnv }} [opts]
 * @returns {{ ran: false } | { ran: true, ok: boolean, address?: string, fixture?: boolean, said?: string, error?: string }}
 */
export function sync(system, dir, { env = process.env } = {}) {
  const command = syncCommand(system, env);
  if (!command) return { ran: false };
  const r = spawnSync(`${command} --venture ${JSON.stringify(dir)}`, { shell: true, encoding: "utf8", env });
  if (r.status !== 0) return { ran: true, ok: false, error: (r.stderr || r.stdout || r.error?.message || "the sync command failed").trim().split("\n").at(-1) };
  /** @type {{ address?: string, fixture?: boolean, said?: string }} */
  let said = {};
  try {
    const last = String(r.stdout).trim().split("\n").at(-1) ?? "";
    const j = last.startsWith("{") ? JSON.parse(last) : null;
    if (j && typeof j === "object") said = { ...(typeof j.address === "string" ? { address: j.address } : {}), ...(j.fixture === true ? { fixture: true } : {}), ...(typeof j.said === "string" ? { said: j.said } : {}) };
  } catch { /* a command that prints no JSON said nothing more */ }
  return { ran: true, ok: true, ...said };
}
