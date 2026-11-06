// Finds a Naive script by its file name across the src units, for code that runs a checker or tool by name
// (spawnSync("node", [naiveScript("check-ventures.mjs"), dir])). Before EE-118 step 5 every such script sat in schema/;
// now each sits in the unit that owns it (packages/naive/src/<unit>/).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The src folder: packages/naive/src. */
export const SRC = fileURLToPath(new URL("..", import.meta.url));
/** The units, in dependency order (a unit imports only units before it). */
export const UNITS = Object.freeze(["core", "records", "terms", "store", "engine", "checks", "router", "interfaces"]);

/**
 * The absolute path of a script, by file name ("check-ventures.mjs") or by name without the extension.
 * @param {string} name
 */
export function naiveScript(name) {
  const file = /\.(mjs|ts|py)$/.test(name) ? name : `${name}.mjs`;
  for (const unit of UNITS) {
    const p = join(SRC, unit, file);
    if (existsSync(p)) return p;
  }
  throw new Error(`${file}: no Naive script by that name in ${UNITS.join(", ")}`);
}
