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
fails("a merged role naming a role that does not exist fails", edit("builder", (r) => { r.merged_from = ["architect", "wizard"]; }), /builder\/role.json: merged_from names wizard, which is not a known role/);
fails("a merged role naming a person role fails", edit("builder", (r) => { r.merged_from = ["architect", "advisor"]; }), /builder\/role.json: merged_from names advisor, a person role/);
fails("a temporary role that names no one who proposed it fails the schema", edit("builder", (r) => { r.status = "temporary"; }), /roles\/builder\/role.json: does not match role.schema.json/);
t("a temporary role with who proposed it and when passes", broken(edit("builder", (r) => { Object.assign(r, { status: "temporary", proposed_by: "products-lead", created_at: "2026-11-28T00:00:00.000Z" }); })).status === 0);
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

// The links to APQC's framework and to O*NET (EE-232).
fails("a pcf id that is no hierarchy id fails", edit("builder", (r) => { r.pcf = [{ id: "2.99", raci: "responsible" }]; }), /builder\/role.json: pcf 2.99 is not a hierarchy id in packages\/naive\/src\/functions\/pcf.json/);
fails("a pcf id named twice in one role fails", edit("builder", (r) => { r.pcf = [{ id: "2.3", raci: "responsible" }, { id: "2.3", raci: "consulted" }]; }), /builder\/role.json: pcf 2.3 is named twice/);
fails("a raci value outside RACI fails the schema", edit("builder", (r) => { Object.assign(r, { pcf: [{ id: "2.3", raci: "owner" }] }); }), /builder\/role.json: does not match role.schema.json/);
fails("a second accountable role for one element fails", edit("architect", (r) => { r.pcf = [{ id: "2.0", raci: "accountable" }]; }), /PCF 2\.0: architect and product-lead are each accountable for it; RACI allows one accountable role per element/);
fails("an accountable role outside the element's function and portfolio fails", edit("marketing-lead", (r) => { r.pcf = [{ id: "9.1", raci: "accountable" }]; }), /marketing-lead is accountable for PCF 9.1, which is under finance, but the role is neither in finance nor a lead whose portfolio covers it/);
t("an accountable role in the element's function passes", broken(edit("marketing-lead", (r) => { r.pcf = [{ id: "3.2", raci: "accountable" }]; })).status === 0);
t("a lead accountable for a process group its portfolio covers passes", broken(edit("growth-lead", (r) => { r.pcf = [...(r.pcf ?? []), { id: "6.2", raci: "accountable" }]; })).status === 0);
fails("an O*NET code in the wrong format fails the schema", edit("builder", (r) => { r.onet = [{ code: "151252", title: "Software Developers", basis: "x", by: "y" }]; }), /builder\/role.json: does not match role.schema.json/);
fails("an O*NET entry with no basis fails the schema", edit("builder", (r) => { Object.assign(r, { onet: [{ code: "15-1252.00", title: "Software Developers", by: "y" }] }); }), /builder\/role.json: does not match role.schema.json/);
fails("an O*NET code the reference lacks fails", edit("builder", (r) => { r.onet = [{ code: "99-9999.00", title: "Nobody", basis: "x", by: "y" }]; }), /builder\/role.json: onet 99-9999.00 is not an occupation in packages\/naive\/src\/functions\/onet.json/);
fails("an O*NET title that differs from the reference's fails", edit("builder", (r) => { r.onet = [{ code: "15-1252.00", title: "Coders", basis: "x", by: "y" }]; }), /builder\/role.json: onet 15-1252.00 is "Software Developers" in O\*NET 31.0, not "Coders"/);
const emptyOnet = (lib: string, root: string) => { mkdirSync(join(root, "packages/naive/src/functions"), { recursive: true }); writeFileSync(join(root, "packages/naive/src/functions/onet.json"), JSON.stringify({ release: "31.0", source: "onet-database", attribution: "O*NET", dwas: [], occupations: [] })); void lib; };
t("with an empty O*NET reference any well-formed code passes", broken((lib, root) => { emptyOnet(lib, root); edit("builder", (r) => { r.onet = [{ code: "99-9999.00", title: "Nobody", basis: "x", by: "y" }]; })(lib, root); }).status === 0);
const overlap = join(tmp, "overlap");
writeRole(join(overlap, "governance/roles"), "sales-desk", { id: "sales-desk", name: "Sales desk", kind: "agent", function: "marketing-and-sales", description: "Answers inbound sales questions.", grantable_classes: [], default_tier: "workhorse", lint_suites: [], verified_by: "growth-lead", skill: "packages/naive/src/interfaces/skills/lead/SKILL.md", pcf: [{ id: "3.0", raci: "accountable" }] });
const twice = run(repo, overlap);
t("a venture role accountable for an element a library role is accountable for fails", twice.status === 1 && /PCF 3\.0: growth-lead and sales-desk are each accountable for it/.test(twice.out), twice.out);

// --complete: every element of levels 1 to 2 the business runs needs a responsible or accountable role.
const complete = (root: string, venture?: string, extra: string[] = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...(venture ? [venture] : []), "--complete", ...extra, "--root", root], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
};
const today = complete(repo);
t("--complete fails on the library today, naming each process group with no responsible or accountable role", today.status === 1 && /GAP   PCF 1\.1 Define the business concept and long-term vision \(strategy\): no role is responsible or accountable/.test(today.out) && !/GAP   PCF 1\.0 /.test(today.out) && !/GAP   PCF 2\.3 /.test(today.out), today.out);
t("--complete suggests O*NET occupations for a gap", /GAP   PCF 9\.5 Process payroll \(finance\): .*O\*NET 31\.0 suggests 43-3051\.00 Payroll and Timekeeping Clerks/.test(today.out), today.out);
t("--complete never suggests an All Other occupation", !/All Other/.test(today.out));
const strategyOnly = join(tmp, "strategy-only");
mkdirSync(strategyOnly, { recursive: true });
writeFileSync(join(strategyOnly, "venture.json"), JSON.stringify({ departments: ["strategy"] }));
writeRole(join(strategyOnly, "governance/roles"), "strategy-desk", { id: "strategy-desk", name: "Strategy desk", kind: "agent", function: "strategy", description: "Keeps the strategy records.", grantable_classes: [], default_tier: "workhorse", lint_suites: [], verified_by: "strategy-lead", skill: "packages/naive/src/interfaces/skills/lead/SKILL.md", pcf: ["1.1", "1.2", "1.3", "1.4"].map((id) => ({ id, raci: "responsible" })) });
const covered = complete(repo, strategyOnly);
t("--complete passes for a venture that runs only strategy and has a role for each of its process groups", covered.status === 0 && /every PCF element of levels 1 to 2 under 1 function\(s\)/.test(covered.out), covered.out);
const deeper = complete(repo, strategyOnly, ["--level", "3"]);
t("--complete --level 3 also asks for each process", deeper.status === 1 && /GAP   PCF 1\.1\.1 Assess the external environment/.test(deeper.out), deeper.out);
const noSuggest = (() => { const root = join(tmp, `r-${++n}`); cpSync(join(repo, LIBRARY), join(root, LIBRARY), { recursive: true }); emptyOnet(join(root, LIBRARY), root); return complete(root); })();
t("--complete with an empty O*NET reference reports gaps without suggestions", noSuggest.status === 1 && /GAP   PCF 1\.1 Define the business concept and long-term vision \(strategy\): no role is responsible or accountable\n/.test(noSuggest.out), noSuggest.out);

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passed");
process.exit(failed ? 1 : 0);
