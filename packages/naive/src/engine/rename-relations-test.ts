// Tests rename-relations.ts on a temporary workspace: old names are renamed in relations and scope,
// other fields and new names are left alone, and a dry run writes nothing.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renameRelations } from "./rename-relations.ts";

let failed = 0;
const ok = (cond: boolean, name: string) => { console.log(`${cond ? "ok  " : "FAIL"} ${name}`); if (!cond) failed++; };

const dir = mkdtempSync(join(tmpdir(), "naive-rename-relations-"));
try {
  const ideas = join(dir, "people/p-1/ideas");
  mkdirSync(ideas, { recursive: true });
  const old = { id: "a", builds_on: ["kept"], relations: [{ relation: "builds_on", to: "b" }, { relation: "contradicts", to: "c" }], scope: { scope: "naive@products", via: "derives_from" } };
  writeFileSync(join(ideas, "a.json"), JSON.stringify(old, null, 2) + "\n");
  writeFileSync(join(ideas, "b.json"), JSON.stringify({ id: "b", relations: [{ relation: "builds-on", to: "a" }], scope: { scope: "x", via: "appends-to" } }, null, 2) + "\n");
  const before = readFileSync(join(ideas, "a.json"), "utf8");

  const dry = renameRelations(dir);
  ok(dry.length === 2 && readFileSync(join(ideas, "a.json"), "utf8") === before, "a dry run lists two changes and writes nothing");

  const done = renameRelations(dir, { apply: true });
  const a = JSON.parse(readFileSync(join(ideas, "a.json"), "utf8"));
  ok(done.length === 2 && a.relations[0].relation === "builds-on" && a.scope.via === "derives-from", "old names become kebab-case in relations and scope");
  ok(a.relations[1].relation === "contradicts" && JSON.stringify(a.builds_on) === JSON.stringify(["kept"]), "other relations and the builds_on field are left alone");
  ok(renameRelations(dir, { apply: true }).length === 0, "a second run changes nothing");
} finally { rmSync(dir, { recursive: true, force: true }); }

if (failed) { console.log(`${failed} failing`); process.exit(1); }
console.log("all passing");
