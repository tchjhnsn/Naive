// Tests the pcf-roles generator and scripts/pcf-roles.ts (EE-232) on copies of the role library: the committed pcf-roles.json is what the
// library generates; a role's new link shows on the element side once regenerated, and --check fails until it is;
// roles are ordered accountable, responsible, consulted, informed and then by id; and a role naming an element
// pcf.json lacks is refused.
//
//   node packages/naive/src/engine/generators/pcf-roles-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { draft, FILE, format } from "./pcf-roles.ts";
import type { PcfRoles, Role } from "../../records/types/records.d.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
const GEN = join(repo, "scripts/pcf-roles.ts");
const LIBRARY = "packages/naive/src/roles";
const PCF = "packages/naive/src/functions/pcf.json";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "pcf-roles-test-"));
let n = 0;

/** A copy of the repository's library, pcf.json and pcf-roles.json. */
function copy(): string {
  const root = join(tmp, `r-${++n}`);
  for (const p of [LIBRARY, PCF, FILE]) cpSync(join(repo, p), join(root, p), { recursive: true });
  return root;
}
const gen = (root: string, ...args: string[]) => { const r = spawnSync(process.execPath, [GEN, ...args, "--root", root], { encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };
const editRole = (root: string, id: string, f: (r: Role) => void) => { const file = join(root, LIBRARY, id, "role.json"); const r = JSON.parse(readFileSync(file, "utf8")) as Role; f(r); writeFileSync(file, JSON.stringify(r, null, 2)); };

const own = draft();
t("the committed pcf-roles.json is what the role library generates, byte for byte", own.ok && !!own.draft && format(own.draft) === readFileSync(join(repo, FILE), "utf8"), own.errors);
t("--check passes on the repository", gen(repo, "--check").status === 0);

const root = copy();
editRole(root, "architect", (r) => { r.pcf = [...(r.pcf ?? []), { id: "8.5", raci: "consulted" }, { id: "2.1", raci: "informed" }]; });
const stale = gen(root, "--check");
t("a role's new link makes --check fail until the file is regenerated", stale.status === 1 && /pcf-roles.json is stale/.test(stale.out), stale.out);
const wrote = gen(root);
const file = JSON.parse(readFileSync(join(root, FILE), "utf8")) as PcfRoles;
t("regenerating writes the link on the element side", wrote.status === 0 && file.elements.some((e) => e.id === "8.5" && e.roles.some((r) => r.role === "architect" && r.raci === "consulted")), file.elements);
t("--check passes once regenerated", gen(root, "--check").status === 0);
t("elements are in hierarchy order, 2.1 before 2.2 and 9.0 before 10.0", (() => { const ids = file.elements.map((e) => e.id); return ids.indexOf("2.1") < ids.indexOf("2.2") && ids.indexOf("9.0") < ids.indexOf("10.0") && ids.indexOf("8.0") < ids.indexOf("8.5"); })(), file.elements.map((e) => e.id));
const two = file.elements.find((e) => e.id === "2.0")?.roles.map((r) => `${r.raci}:${r.role}`).join(" ");
t("roles are ordered accountable, responsible, consulted, informed, then by id", two === "accountable:product-lead responsible:architect responsible:builder responsible:product-design-lead", two);
t("the file carries APQC's attribution and the PCF version", file.attribution.includes("APQC") && file.pcf_version === "8.0");

const unknown = copy();
editRole(unknown, "builder", (r) => { r.pcf = [{ id: "2.99", raci: "responsible" }]; });
const refused = gen(unknown);
t("a role naming an element pcf.json lacks is refused", refused.status === 1 && /builder names PCF 2.99, which packages\/naive\/src\/functions\/pcf.json does not have/.test(refused.out), refused.out);

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passed");
process.exit(failed ? 1 : 0);
