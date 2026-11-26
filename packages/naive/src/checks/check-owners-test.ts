// Breaks check-owners on venture folders made here (EE-187). A venture with no owners record passes, one with good
// owners passes, and each broken record fails with the rule named. A venture role template counts as a role.
//
//   node packages/naive/src/checks/check-owners-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHECK = new URL("./check-owners.ts", import.meta.url).pathname;
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-owners-test-"));
let n = 0;

/** A venture listing marketing-and-sales and finance, with the owners record given (none when undefined), run through the check. */
function venture(owners?: unknown, files: Record<string, unknown> = {}, args: string[] = []) {
  const dir = join(tmp, `v-${++n}`);
  mkdirSync(join(dir, "operations"), { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "discovery", departments: ["marketing-and-sales", "finance"] }));
  if (owners !== undefined) writeFileSync(join(dir, "operations", "element-owners.json"), JSON.stringify(owners));
  for (const [rel, value] of Object.entries(files)) { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), JSON.stringify(value)); }
  const r = spawnSync(process.execPath, [CHECK, dir, ...args], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
}

try {
  const none = venture();
  t("a venture with no owners record passes: every element it runs is owned by default", none.status === 0 && /ok {2}\d+ elements, each with one accountable owner/.test(none.out), none);
  const good = venture({ owners: { "3.5": { role: "growth-lead" }, "9.0": { person: "Ana Ruiz" }, "3.1": { role: "founder" } } });
  t("good owners pass: a lead in its portfolio, a named person, the founder anywhere", good.status === 0, good);
  const json = venture({ owners: {} }, {}, ["--json"]);
  const parsed = JSON.parse(json.out || "{}");
  t("--json prints ok, errors and how many elements are owned", json.status === 0 && parsed.ok === true && parsed.errors.length === 0 && parsed.owned > 0, json.out.slice(0, 200));

  const noRole = venture({ owners: { "3.5": { role: "growth-agent" } } });
  t("an owner naming a role that does not exist fails", noRole.status === 1 && noRole.out.includes("growth-agent, which is not a role"), noRole);
  const reach = venture({ owners: { "9.1": { role: "growth-lead" } } });
  t("a lead outside its portfolio fails", reach.status === 1 && reach.out.includes("answers only for marketing-and-sales"), reach);
  const unlisted = venture({ owners: { "1.1": { role: "founder" } } });
  t("an owner for an element under a function the venture does not list fails", unlisted.status === 1 && unlisted.out.includes("1.1 is under strategy"), unlisted);
  const both = venture({ owners: { "3.5": { role: "growth-lead", person: "Ana" } } });
  t("an owner that is both a role and a person fails the schema", both.status === 1 && both.out.includes("element-owners.json"), both);
  const badId = venture({ owners: { "three": { role: "founder" } } });
  t("a key that is not an APQC hierarchy id fails the schema", badId.status === 1, badId);
  const own = venture({ owners: { "3.5": { role: "sales-desk" } } }, { "governance/roles/sales-desk.json": { id: "sales-desk", name: "Sales desk", function: "marketing-and-sales", default_tier: "workhorse" } });
  t("a role template the venture keeps in governance/roles/ counts as a role", own.status === 0, own);
  const root = venture(undefined, { "governance/delegation.json": { root: "owner-in-chief", grants: [] } });
  t("a delegation root that is not a role fails, since the activities a person performs need it", root.status === 1 && root.out.includes("delegation root owner-in-chief is not a role"), root);
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
