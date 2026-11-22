// Departments (EE-047): the catalog, and the department folders a venture holds. A department
// folder is any folder under <layer>/departments/ that holds a department.json; it may sit under
// an optional grouping folder named for its place in the value chain (primary/ or support/).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import type { Department, DepartmentCatalog } from "../records/types/records.d.ts";

const root = new URL("../../../..", import.meta.url).pathname;
export const LAYERS = ["governance", "operations"];
export const GROUPS = ["primary", "support"];

export const catalog = (): DepartmentCatalog["departments"] => JSON.parse(readFileSync(join(root, "packages/naive/src/functions/departments.json"), "utf8")).departments;

/** One department folder in a venture: path is its logical path, tag its department.json when it has one. */
export type DepartmentFolder = { layer: string; path: string; folder: string; group: string | null; tag: Department | null };

/** Every department folder in a venture. */
export function foldersOf(dir: string): DepartmentFolder[] {
  const out: DepartmentFolder[] = [];
  for (const layer of LAYERS) {
    const base = ventureFile(dir, `${layer}/departments`);
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory())) {
      const inside: [string | null, string][] = GROUPS.includes(e.name) && !existsSync(join(base, e.name, "department.json"))
        ? readdirSync(join(base, e.name), { withFileTypes: true }).filter((x) => x.isDirectory()).map((x): [string, string] => [e.name, x.name])
        : [[null, e.name]];
      for (const [group, folder] of inside) {
        const rel = [layer, "departments", ...(group ? [group] : []), folder].join("/");
        const file = join(base, ...(group ? [group] : []), folder, "department.json");
        out.push({ layer, path: rel, folder, group, tag: existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null });
      }
    }
  }
  return out;
}
