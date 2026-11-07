// Renames the snake_case relation names in a workspace's idea records to kebab-case (Torian, 2026-11-07:
// relation names are kebab-case, like Naive's ids). builds_on becomes builds-on, appends_to appends-to and
// derives_from derives-from, in each idea's `relations[].relation` and `scope.via`. Nothing else changes.
//
//   node packages/naive/src/engine/rename-relations.ts <workspace dir>           lists what would change
//   node packages/naive/src/engine/rename-relations.ts <workspace dir> --apply   rewrites those records
//
// Ideas live at the workspace level (people/<id>/ideas/, founders/<handle>/ideas/), outside any venture, so
// this is not a `naive upgrade` migration. A tenant's ideas in a store are renamed on an exported folder,
// then imported back.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const RENAMED: Record<string, string> = { builds_on: "builds-on", appends_to: "appends-to", derives_from: "derives-from" };

type Change = { file: string, from: string, to: string, at: string };

function ideaFiles(dir: string): string[] {
  const out: string[] = [];
  for (const top of ["people", "founders"]) {
    const base = join(dir, top);
    if (!existsSync(base)) continue;
    for (const who of readdirSync(base, { withFileTypes: true })) {
      if (!who.isDirectory()) continue;
      const ideas = join(base, who.name, "ideas");
      if (!existsSync(ideas)) continue;
      for (const f of readdirSync(ideas)) if (f.endsWith(".json")) out.push(join(top, who.name, "ideas", f));
    }
  }
  return out.sort();
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Renames in place and returns the changes; writes only with apply. */
export function renameRelations(dir: string, { apply = false } = {}): Change[] {
  const changes: Change[] = [];
  for (const file of ideaFiles(dir)) {
    const rec: unknown = JSON.parse(readFileSync(join(dir, file), "utf8"));
    if (!isObject(rec)) continue;
    const before = changes.length;
    if (Array.isArray(rec.relations)) rec.relations.forEach((r: unknown, i: number) => {
      if (isObject(r) && typeof r.relation === "string" && RENAMED[r.relation]) {
        changes.push({ file, from: r.relation, to: RENAMED[r.relation], at: `relations[${i}].relation` });
        r.relation = RENAMED[r.relation];
      }
    });
    if (isObject(rec.scope) && typeof rec.scope.via === "string" && RENAMED[rec.scope.via]) {
      changes.push({ file, from: rec.scope.via, to: RENAMED[rec.scope.via], at: "scope.via" });
      rec.scope.via = RENAMED[rec.scope.via];
    }
    if (apply && changes.length > before) writeFileSync(join(dir, file), JSON.stringify(rec, null, 2) + "\n");
  }
  return changes;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: rename-relations.ts <workspace dir> [--apply]"); process.exit(2); }
  const apply = process.argv.includes("--apply");
  const changes = renameRelations(dir, { apply });
  for (const c of changes) console.log(`${c.file} ${c.at}: ${c.from} -> ${c.to}`);
  console.log(`${changes.length} relation name(s) ${apply ? "renamed" : "to rename (run with --apply)"}`);
}
