// The preload for check-write-scope.ts. Loaded with `node --import`, it wraps the node:fs calls that write,
// move or remove a file (open too, when its flags write) and appends one JSON line to the log for each path outside the allowed roots.
// It never blocks a write: the check reads the log after the tests end and decides.
//
// NAIVE_WRITE_SCOPE holds its settings as JSON: { log, repo, roots, exceptions }, all absolute paths. A path
// is allowed when it is an exception or under one, or when it is under a root and not under the repository.
// The repository is never scratch space, even when it sits inside the temp dir. Unset, the preload does nothing.

import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

interface Scope { log: string, repo: string, roots: string[], exceptions: string[] }

// Each call that changes the file system, with the positions of its arguments that name a path it changes.
// copyFile and cp only read their source, so only the destination counts.
const CALLS: Record<string, number[]> = {
  writeFile: [0], appendFile: [0], mkdir: [0], mkdtemp: [0], rename: [0, 1], rm: [0], rmdir: [0], unlink: [0],
  copyFile: [1], cp: [1], symlink: [1], link: [1], truncate: [0], utimes: [0],
};

const raw = process.env.NAIVE_WRITE_SCOPE;
if (raw) install(JSON.parse(raw) as Scope);

function install(scope: Scope): void {
  const appendLine = fs.appendFileSync;
  const under = (p: string, dirs: string[]) => dirs.some((d) => p === d || p.startsWith(d.endsWith(sep) ? d : d + sep));
  const inside = (p: string) => p === scope.log || under(p, scope.exceptions) || (under(p, scope.roots) && !under(p, [scope.repo]));

  const record = (call: string, target: unknown) => {
    const p = toPath(target);
    if (p === null || inside(p)) return;
    appendLine(scope.log, JSON.stringify({ call, path: p, script: process.argv[1] ?? "" }) + "\n");
  };

  const wrap = (owner: Record<string, unknown>, name: string, positions: number[]) => {
    const original = owner[name];
    if (typeof original !== "function") return;
    owner[name] = function (this: unknown, ...args: unknown[]) {
      for (const i of positions) record(name, args[i]);
      return original.apply(this, args);
    };
  };

  const callbacks = fs as unknown as Record<string, unknown>;
  const promises = fs.promises as unknown as Record<string, unknown>;
  for (const [name, positions] of Object.entries(CALLS)) {
    wrap(callbacks, `${name}Sync`, positions);
    wrap(callbacks, name, positions);
    wrap(promises, name, positions);
  }
  wrap(callbacks, "createWriteStream", [0]);
  for (const owner of [callbacks, promises]) for (const name of owner === callbacks ? ["open", "openSync"] : ["open"]) {
    const original = owner[name];
    if (typeof original !== "function") continue;
    owner[name] = function (this: unknown, ...args: unknown[]) {
      if (writes(args[1])) record(name, args[0]);
      return original.apply(this, args);
    };
  }
  syncBuiltinESMExports();
}

const WRITE_BITS = fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_APPEND;

// Whether open's flags can change the file: any of w, a or + in a string, or a write bit in a number. Unset is "r".
function writes(flags: unknown): boolean {
  if (typeof flags === "string") return /[wa+]/.test(flags);
  if (typeof flags === "number") return (flags & WRITE_BITS) !== 0;
  return false;
}

// A path argument as an absolute path, or null for a file descriptor or a handle.
function toPath(target: unknown): string | null {
  if (typeof target === "string") return resolve(target);
  if (target instanceof URL) return resolve(fileURLToPath(target));
  if (Buffer.isBuffer(target)) return resolve(target.toString());
  return null;
}
