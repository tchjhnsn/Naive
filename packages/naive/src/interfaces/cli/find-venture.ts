// The venture a command runs on when none is named: the nearest venture.json in the current
// directory or its parents, the way next finds the project it runs in (I-2).

import { existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

export function findVenture(from = process.cwd()) {
  for (let d = resolve(from); ; d = dirname(d)) {
    if (existsSync(join(d, "venture.json"))) return d;
    if (dirname(d) === d) return null;
  }
}

/** The router's view of a venture directory: its workspace is the folder that holds it. */
export const asRouted = (dir) => ({ workspace: dirname(dir), venture: basename(dir) });
