// Finds a Naive script by its file name across the src units, for code that runs a checker or tool by name
// (spawnSync("node", [naiveScript("check-ventures.mjs"), dir])). Before EE-118 step 5 every such script sat in schema/;
// now each sits in the unit that owns it (packages/naive/src/<unit>/).
import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The src folder: packages/naive/src. */
export const SRC = fileURLToPath(new URL("..", import.meta.url));
/**
 * The framework package's root, the folder whose package.json a venture installs. It is the folder that holds
 * packages/naive/src, or that folder's parent when this code runs from the compiled copy, dist/ (EE-159).
 */
export const PACKAGE_ROOT = (() => {
  const code = join(SRC, "../../..");
  const up = dirname(code);
  return basename(code) === "dist" && existsSync(join(up, "package.json")) && existsSync(join(up, "packages/naive/src")) ? up : code;
})();
/** The units, in dependency order (a unit imports only units before it). */
export const UNITS = Object.freeze(["core", "records", "terms", "store", "engine", "checks", "router", "interfaces"]);

/**
 * The absolute path of a script, by file name ("check-ventures.mjs") or by name without the extension. A `.ts` name
 * also finds its `.js`, which is what the compiled package (dist/, EE-159) holds in its place.
 * @param {string} name
 */
export function naiveScript(name) {
  const file = /\.(mjs|ts|py)$/.test(name) ? name : `${name}.mjs`;
  const names = file.endsWith(".ts") ? [file, file.replace(/\.ts$/, ".js")] : [file];
  for (const unit of UNITS) for (const n of names) {
    const p = join(SRC, unit, n);
    if (existsSync(p)) return p;
  }
  throw new Error(`${file}: no Naive script by that name in ${UNITS.join(", ")}`);
}
