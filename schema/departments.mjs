// Departments (EE-047): the catalog, and the department folders a venture holds. A department
// folder is any folder under <layer>/departments/ that holds a department.json; it may sit under
// an optional grouping folder named for its place in the value chain (primary/ or support/).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
export const LAYERS = ["governance", "operations"];
export const GROUPS = ["primary", "support"];

export const catalog = () => JSON.parse(readFileSync(join(root, "operations/departments.json"), "utf8")).departments;

/** Every department folder in a venture: { layer, path (relative to the venture), folder, group, tag }. */
export function foldersOf(dir) {
  const out = [];
  for (const layer of LAYERS) {
    const base = join(dir, layer, "departments");
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const inside = GROUPS.includes(e.name) && !existsSync(join(base, e.name, "department.json"))
        ? readdirSync(join(base, e.name), { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => [e.name, x.name])
        : [[null, e.name]];
      for (const [group, folder] of inside) {
        const rel = join(layer, "departments", ...(group ? [group] : []), folder);
        const file = join(dir, rel, "department.json");
        out.push({ layer, path: rel, folder, group, tag: existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null });
      }
    }
  }
  return out;
}
