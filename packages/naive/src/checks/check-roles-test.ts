// Breaks check-roles on copies of the role library (EE-229). Each case copies packages/naive/src/roles/ into a temp
// root, breaks one rule, and expects the check to name it; the library passes, and so does a venture whose own role
// overlays a library role by id. Naive's own roles under agents/ (EE-238) are broken on copies too: extends, shipped agents,
// artifacts, the kinds only one role makes and standards.
//
//   node packages/naive/src/checks/check-roles-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  // A role.ts imports Naive by relative path, so it cannot load from a copy: role-program-test.ts checks role programs.
  cpSync(join(repo, LIBRARY), join(root, LIBRARY), { recursive: true, filter: (f) => !/\/role\.(ts|mjs)$/.test(f) });
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
// A copy of the library without the role accountable for process group 1.1 (EE-239), so the gap stays whatever other
// process groups gain roles.
const withoutRole = (id: string): string => { const root = join(tmp, `r-${++n}`); cpSync(join(repo, LIBRARY), join(root, LIBRARY), { recursive: true, filter: (f) => !/\/role\.(ts|mjs)$/.test(f) }); rmSync(join(root, LIBRARY, id), { recursive: true }); return root; };
const today = complete(withoutRole("business-intelligence-analyst"));
t("--complete fails on a library with a process group no role covers, naming each one with no responsible or accountable role", today.status === 1 && /GAP {3}PCF 1\.1 Define the business concept and long-term vision \(strategy\): no role is responsible or accountable/.test(today.out) && !/GAP {3}PCF 1\.0 /.test(today.out) && !/GAP {3}PCF 2\.3 /.test(today.out), today.out);
t("--complete suggests O*NET occupations for a gap", /GAP {3}PCF 9\.5 Process payroll \(finance\): .*O\*NET 31\.0 suggests 43-3051\.00 Payroll and Timekeeping Clerks/.test(today.out), today.out);
t("--complete never suggests an All Other occupation", !/All Other/.test(today.out));
const strategyOnly = join(tmp, "strategy-only");
mkdirSync(strategyOnly, { recursive: true });
writeFileSync(join(strategyOnly, "venture.json"), JSON.stringify({ departments: ["strategy"] }));
writeRole(join(strategyOnly, "governance/roles"), "strategy-desk", { id: "strategy-desk", name: "Strategy desk", kind: "agent", function: "strategy", description: "Keeps the strategy records.", grantable_classes: [], default_tier: "workhorse", lint_suites: [], verified_by: "strategy-lead", skill: "packages/naive/src/interfaces/skills/lead/SKILL.md", pcf: ["1.1", "1.2", "1.3", "1.4"].map((id) => ({ id, raci: "responsible" })) });
const covered = complete(repo, strategyOnly);
t("--complete passes for a venture that runs only strategy and has a role for each of its process groups", covered.status === 0 && /every PCF element of levels 1 to 2 under 1 function\(s\)/.test(covered.out), covered.out);
const deeper = complete(repo, strategyOnly, ["--level", "3"]);
t("--complete --level 3 also asks for each process", deeper.status === 1 && /GAP {3}PCF 1\.1\.1 Assess the external environment/.test(deeper.out), deeper.out);
const noSuggest = (() => { const root = withoutRole("business-intelligence-analyst"); emptyOnet(join(root, LIBRARY), root); return complete(root); })();
t("--complete with an empty O*NET reference reports gaps without suggestions", noSuggest.status === 1 && /GAP {3}PCF 1\.1 Define the business concept and long-term vision \(strategy\): no role is responsible or accountable\n/.test(noSuggest.out), noSuggest.out);

// Naive's own roles at agents/<id>/ (EE-238): a scope that overlays the library for Naive, with extends, shipped agents,
// artifacts and the kinds only one role makes.
const naive = (r: Record<string, unknown>) => (lib: string, root: string) => { void lib; writeRole(join(root, "agents"), String(r.id), r); };
const writer = { id: "technical-writer", name: "Technical writer", kind: "agent", function: "capabilities", description: "Writes the docs site.", grantable_classes: [], default_tier: "workhorse", lint_suites: [], verified_by: "founder", skill: "agents/technical-writer/SKILL.md", artifacts: [{ document_kind: "docs-page" }, { document_kind: "release-note" }, { document_kind: "changelog-entry" }] };
const naiveScope = run(repo);
const roleFiles = readdirSync(join(repo, LIBRARY)).filter((d) => existsSync(join(repo, LIBRARY, d, "role.json"))).length + readdirSync(join(repo, "agents")).filter((d) => existsSync(join(repo, "agents", d, "role.json"))).length;
t("Naive's own roles under agents/ pass, product-manager beside the library alias it extends", naiveScope.status === 0 && new RegExp(`${roleFiles} role files`).test(naiveScope.out), naiveScope.out);
t("a Naive role that extends a library role may leave out what it inherits", broken(naive({ id: "pm", name: "PM", kind: "agent", extends: "product-design-lead", description: "Naive's PM." })).status === 0);
t("a Naive role whose id is the alias of the role it extends passes", broken(naive({ id: "product-manager", name: "PM", kind: "agent", extends: "product-design-lead", description: "Naive's PM." })).status === 0);
fails("a Naive role whose id is another role's alias, without extending it, fails", naive({ id: "product-manager", name: "PM", kind: "agent", extends: "builder", description: "Naive's PM." }), /alias product-manager is already a role id/);
fails("extending a role the library lacks fails", naive({ id: "pm", name: "PM", kind: "agent", extends: "wizard", description: "x" }), /agents\/pm\/role.json: extends wizard, which is not a library role/);
fails("a Naive agent role with no extends must carry what delegation needs", naive({ id: "pm", name: "PM", kind: "agent", description: "x" }), /agents\/pm\/role.json: does not match role.schema.json/);
fails("a library role that extends another fails", edit("builder", (r) => { r.extends = "architect"; }), /roles\/builder\/role.json: a library role extends nothing, but it extends architect/);
t("a folder under agents/ with only an AGENTS.md names a library role", broken((lib, root) => { void lib; mkdirSync(join(root, "agents/chief-of-staff"), { recursive: true }); writeFileSync(join(root, "agents/chief-of-staff/AGENTS.md"), "# chief of staff\n"); }).status === 0);
fails("a folder under agents/ with only an AGENTS.md that names no library role fails", (lib, root) => { void lib; mkdirSync(join(root, "agents/ghost"), { recursive: true }); writeFileSync(join(root, "agents/ghost/AGENTS.md"), "# ghost\n"); }, /agents\/ghost\/AGENTS.md: a folder with no role.json is a shipped agent of a library role, but ghost is not one/);
fails("an artifact that is no record type fails", edit("builder", (r) => { r.artifacts = [{ record_type: "memo" }]; }), /builder\/role.json: artifact no record type memo in packages\/naive\/src\/records\/data-model.json/);
fails("an artifact that is no document kind fails", edit("builder", (r) => { r.artifacts = [{ document_kind: "poem" }]; }), /builder\/role.json: artifact no document kind poem in packages\/naive\/src\/functions\/documents.json/);
t("a record type and a document kind no one role makes pass as artifacts", broken(edit("architect", (r) => { r.artifacts = [{ document_kind: "adr" }, { record_type: "design-document" }]; })).status === 0);
fails("a library role that names a site page kind fails", edit("marketing-lead", (r) => { r.artifacts = [{ document_kind: "docs-page" }]; }), /marketing-lead\/role.json: marketing-lead names document kind docs-page, which only technical-writer makes/);
fails("a Naive role other than the technical writer that names a release note fails", naive({ id: "release-desk", name: "Release desk", kind: "agent", extends: "builder", description: "x", artifacts: [{ document_kind: "release-note" }] }), /agents\/release-desk\/role.json: release-desk names document kind release-note, which only technical-writer makes/);
t("the technical writer naming the three site page kinds passes", broken(naive(writer)).status === 0);
fails("a technical writer that leaves a site page kind out fails", naive({ ...writer, artifacts: [{ document_kind: "docs-page" }, { document_kind: "release-note" }] }), /agents\/technical-writer\/role.json: technical-writer makes document kind changelog-entry, but does not name it among its artifacts/);
fails("a standard that is no reference id fails", edit("builder", (r) => { r.standards = ["iso-9999"]; }), /builder\/role.json: standard iso-9999 is not a reference id/);
t("a standard that is a reference id passes", broken(edit("architect", (r) => { r.standards = ["iso-42010-2022-architecture-description"]; })).status === 0);
const ventureOnly = run(repo, strategyOnly);
t("a venture's check leaves Naive's own roles out", ventureOnly.status === 0 && !/agents\//.test(ventureOnly.out), ventureOnly.out);

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passed");
process.exit(failed ? 1 : 0);
