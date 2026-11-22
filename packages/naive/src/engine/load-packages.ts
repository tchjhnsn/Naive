// Loads the venture package catalog (EE-071). Each package is packages/naive/library/packages/<name>/package.json.
// packages/naive/library/packages/catalog.json holds the shared fit rules, the record dependency graph and the question
// matrix. packages/naive/src/engine/packages.json is the alias stub for one release; loaders do not read it.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Prior } from "./need-now.ts";

type Fields = Record<string, unknown>;
/** One question of the question matrix: the fact it sets, when it is asked, and the packages it moves. */
export type Question = { id: string; ask: string; phases: string[]; moves: string[]; from?: string };
/** A core package: where records live, with its need-now priors. */
export type CorePackage = Prior & {
  title: string; department?: string; function?: string; purpose: string; required: string[]; optional: string[]; refs: string[]; planned: string[];
  why: string; unlocks: string[]; not_modeled?: string;
};
/** A handoff package: a snapshot of core packages for one receiver. */
export type HandoffPackage = Prior & { title: string; for: string; from: string[]; why: string; unlocks: string[]; not_modeled?: string };
/** The venture package catalog: catalog.json's shared rules with every package definition, by kind. */
export type Catalog = {
  version: string; fit: number; assumes: { note: string; phases: string[]; [key: string]: unknown }; records: Record<string, { after: string[] } | undefined>;
  questions: { set_at: number; clear_at: number; items: Question[] }; enhancements: { agents: string };
  core: Record<string, CorePackage>; handoff: Record<string, HandoffPackage>; [key: string]: unknown;
};

const CORE = ["title", "department", "departments", "purpose", "required", "optional", "refs", "planned", "base", "when", "why", "unlocks", "not_modeled"];
const HANDOFF = ["title", "for", "from", "base", "when", "why", "unlocks", "not_modeled"];

/** The catalog in the shape packages/naive/src/engine/packages.ts and the idea routes expect. */
export function loadPackages(repo: string): Catalog {
  const catalog: { order: { core: string[]; handoff: string[] }; note_split?: unknown; [key: string]: unknown } = JSON.parse(readFileSync(join(repo, "packages/naive/library/packages/catalog.json"), "utf8"));
  const { order, note_split, ...rest } = catalog;
  const take = (names: string[], fields: string[]): Record<string, Fields> => Object.fromEntries(names.map((n) => {
    const p = join(repo, "packages/naive/library", "packages", n, "package.json");
    if (!existsSync(p)) throw new Error(`missing packages/naive/library/packages/${n}/package.json`);
    const pkg: Fields = JSON.parse(readFileSync(p, "utf8"));
    const o: Fields = {};
    for (const k of fields) if (pkg[k] !== undefined) o[k] = pkg[k];
    if (o.department && !o.function) o.function = o.department;
    if (o.function && !o.department) o.department = o.function;
    return [n, o];
  }));
  // The package definitions are framework files in the shapes above; packages-test.ts checks them.
  return { ...rest, core: take(order.core, CORE), handoff: take(order.handoff, HANDOFF) } as Catalog;
}
