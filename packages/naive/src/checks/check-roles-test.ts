// Breaks check-roles on copies of the role library (EE-229). Each case copies packages/naive/src/roles/ into a temp
// root, breaks one rule, and expects the check to name it; the library passes, and so does a venture whose own role
// overlays a library role by id.
//
//   node packages/naive/src/checks/check-roles-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Role } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-roles.ts");
const LIBRARY = "packages/naive/src/roles";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-roles-test-"));
let n = 0;

const run = (root: string, venture?: string) => {
  const r = spawnSync(process.execPath, [CHECK, ...(venture ? [venture] : []), "--root", root], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
};
const readRole = (root: string, id: string): Role => JSON.parse(readFileSync(join(root, LIBRARY, id, "role.json"), "utf8")) as Role;
const writeRole = (dir: string, id: string, r: unknown): void => { mkdirSync(join(dir, id), { recursive: true }); writeFileSync(join(dir, id, "role.json"), JSON.stringify(r, null, 2)); };

/** A copy of the library with one change, run through the check. */
function broken(change: (lib: string, root: string) => void) {
  const root = join(tmp, `r-${++n}`);
  cpSync(join(repo, LIBRARY), join(root, LIBRARY), { recursive: true });
  change(join(root, LIBRARY), root);
  return run(root);
}
const edit = (id: string, f: (r: Role) => void) => (lib: string, root: string) => { const r = readRole(root, id); f(r); writeRole(lib, id, r); };
const fails = (name: string, change: (lib: string, root: string) => void, re: RegExp) => { const r = broken(change); t(name, r.status === 1 && re.test(r.out), r.out); };

const clean = run(repo);
t("the role library passes", clean.status === 0, clean.out);
t("a copy of the library passes", broken(() => {}).status === 0);

fails("a role file that is not JSON fails", (lib) => writeFileSync(join(lib, "builder", "role.json"), "{ not json"), /roles\/builder\/role.json: missing or not JSON/);
fails("a folder with no role.json fails", (lib) => mkdirSync(join(lib, "ghost")), /roles\/ghost\/role.json: missing or not JSON/);
fails("a role that does not match the schema fails", edit("builder", (r) => { Object.assign(r, { tier: "frontier" }); }), /roles\/builder\/role.json: does not match role.schema.json/);
fails("a role with no kind fails the schema", edit("builder", (r) => { delete (r as Partial<Role>).kind; }), /roles\/builder\/role.json: does not match role.schema.json/);
fails("an agent role missing what delegation needs fails the schema", edit("builder", (r) => { delete r.verified_by; }), /roles\/builder\/role.json: does not match role.schema.json/);
fails("an id that does not match its folder fails", edit("builder", (r) => { r.id = "maker"; }), /roles\/builder\/role.json: id maker does not match its folder builder/);
fails("a verifier that is no role fails", edit("builder", (r) => { r.verified_by = "wizard"; }), /builder\/role.json: verifier wizard is not a known role/);
fails("a role that verifies itself fails", edit("builder", (r) => { r.verified_by = "builder"; }), /builder\/role.json: builder may not verify its own work/);
fails("an also_verified_by that is the role itself fails", edit("finance-agent", (r) => { r.also_verified_by = ["finance-agent"]; }), /finance-agent\/role.json: finance-agent may not verify its own work/);
fails("an alias that is another role's id fails", edit("builder", (r) => { r.aliases = ["architect"]; }), /builder\/role.json: alias architect is already a role id/);
fails("an alias two roles share fails", edit("builder", (r) => { r.aliases = ["cto"]; }), /builder\/role.json: alias cto is already an alias of architect/);
fails("a person role with an agent tier fails", edit("advisor", (r) => { r.default_tier = "frontier"; }), /advisor\/role.json: a person role grants no agent tier, but its default_tier is frontier/);
t("a function agent counts as a verifier", broken(edit("builder", (r) => { r.verified_by = "products-agent"; })).status === 0);

// A venture's own roles overlay the library by id, and meet the same rules.
const venture = join(tmp, "venture"), own = join(venture, "governance/roles");
writeRole(own, "builder", { ...readRole(repo, "builder"), description: "The venture's own builder." });
writeRole(own, "sales-desk", { id: "sales-desk", name: "Sales desk", kind: "agent", function: "marketing-and-sales", description: "Answers inbound sales questions.", grantable_classes: [], default_tier: "workhorse", lint_suites: [], verified_by: "growth-lead", skill: "packages/naive/src/interfaces/skills/lead/SKILL.md" });
const overlay = run(repo, venture);
t("a venture role that overlays a library role, and one of its own, pass", overlay.status === 0, overlay.out);
writeRole(own, "sales-desk", { id: "sales-desk", name: "Sales desk", kind: "agent", aliases: ["cto"], function: "marketing-and-sales", description: "Answers inbound sales questions.", grantable_classes: [], default_tier: "workhorse", lint_suites: [], verified_by: "sales-desk", skill: "packages/naive/src/interfaces/skills/lead/SKILL.md" });
const bad = run(repo, venture);
t("a venture role is held to the same rules", bad.status === 1 && /governance\/roles\/sales-desk\/role.json: sales-desk may not verify its own work/.test(bad.out) && /alias cto is already an alias of architect/.test(bad.out), bad.out);

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passed");
process.exit(failed ? 1 : 0);
