// Loads the venture package catalog (EE-071). Each package is library/packages/<name>/package.json.
// library/packages/catalog.json holds the shared fit rules, the record dependency graph and the question
// matrix. schema/packages.json is the alias stub for one release; loaders do not read it.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CORE = ["title", "department", "departments", "purpose", "required", "optional", "refs", "planned", "base", "when", "why", "unlocks", "not_modeled"];
const HANDOFF = ["title", "for", "from", "base", "when", "why", "unlocks", "not_modeled"];

/** The catalog in the shape schema/packages.mjs and the idea routes expect. */
export function loadPackages(repo) {
  const catalog = JSON.parse(readFileSync(join(repo, "library/packages/catalog.json"), "utf8"));
  const { order, note_split, ...rest } = catalog;
  const take = (names, fields) => Object.fromEntries(names.map((n) => {
    const p = join(repo, "library", "packages", n, "package.json");
    if (!existsSync(p)) throw new Error(`missing library/packages/${n}/package.json`);
    const pkg = JSON.parse(readFileSync(p, "utf8"));
    const o = {};
    for (const k of fields) if (pkg[k] !== undefined) o[k] = pkg[k];
    if (o.department && !o.function) o.function = o.department;
    if (o.function && !o.department) o.department = o.function;
    return [n, o];
  }));
  return { ...rest, core: take(order.core, CORE), handoff: take(order.handoff, HANDOFF) };
}
