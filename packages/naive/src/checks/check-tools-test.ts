// Breaks check-tools on copies (venture console spec, 2026-11-24, phase 3). Each case copies the tool catalog and the
// files it refers to into a small EE_ROOT, breaks one rule, and expects the check to name it. The repository passes.
//
//   node packages/naive/src/checks/check-tools-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ToolCatalog } from "../records/types/records.d.ts";
import { DATA_MODEL, FOLDER } from "../records/index.ts";
import { statusOf } from "./check-tools.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-tools.ts");
const CATALOG = "packages/naive/src/functions/tools.json";
const COPIED = [CATALOG, "packages/naive/src/engine/need-now.json", "packages/naive/src/functions/departments.json", `${FOLDER}/${DATA_MODEL}`, "packages/naive/src/functions/it/capability-clusters.json"];
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-tools-test-"));
const run = (env: Record<string, string> = {}, args: string[] = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
const original = JSON.parse(readFileSync(join(repo, CATALOG), "utf8")) as ToolCatalog;

let n = 0;
/** A copy of the repository's files with the catalog changed, run through the check. */
function broken(change: (_c: ToolCatalog) => void) {
  const root = join(tmp, `r-${++n}`);
  for (const f of COPIED) { mkdirSync(dirname(join(root, f)), { recursive: true }); cpSync(join(repo, f), join(root, f)); }
  const c = structuredClone(original); change(c);
  writeFileSync(join(root, CATALOG), JSON.stringify(c, null, 2) + "\n");
  return run({ EE_ROOT: root });
}
const tool = (c: ToolCatalog, id: string) => {
  const x = c.tools.find((y) => y.id === id);
  if (!x) throw new Error(`no tool ${id} in the catalog`);
  return x;
};
const fails = (name: string, change: (_c: ToolCatalog) => void, says: RegExp) => {
  const r = broken(change);
  t(name, r.status === 1 && says.test(r.out), r);
};

const clean = run();
t("the repository's catalog passes", clean.status === 0, clean);
t("an unchanged copy passes", broken(() => {}).status === 0);

fails("a vendor field fails the schema", (c) => { Object.assign(tool(c, "books"), { vendor: "Acme" }); }, /additional|vendor/i);
fails("a tool listed twice", (c) => { c.tools.push(structuredClone(tool(c, "books"))); }, /tool books is listed twice/);
fails("two tools with one title", (c) => { tool(c, "cash").title = "Books"; }, /tool title Books is listed twice/);
fails("a process group under a function that does not exist", (c) => { c.process_groups[0].function = "astrology"; }, /names function astrology/);
fails("a process group whose id is not its function's APQC number", (c) => { c.process_groups[0].function = "finance"; }, /process group 1\.1 is under finance, whose APQC id is 9\.0/);
fails("a tool that names a function that does not exist", (c) => { tool(c, "books").function = "astrology"; }, /tool books names function astrology/);
fails("a tool that names another function's process group", (c) => { tool(c, "books").process_groups.push("3.5"); }, /tool books serves finance but names process group 3\.5, which belongs to marketing-and-sales/);
fails("a tool that names a process group not in the catalog", (c) => { tool(c, "books").process_groups.push("9.99"); }, /process group 9\.99, which is not in the catalog/);
fails("a universal tool with a process group", (c) => { tool(c, "files").process_groups.push("8.4"); }, /tool files is universal/);
fails("a tool that reads a record type the data model lacks", (c) => { tool(c, "books").reads.push("ledger-entry"); }, /tool books reads ledger-entry/);
fails("a tool that writes a record type the data model lacks", (c) => { tool(c, "books").writes.push("ledger-entry"); }, /tool books writes ledger-entry/);
fails("a tool that proposes a record type the data model has", (c) => { tool(c, "invoices").proposes = ["customer"]; }, /tool invoices proposes customer, which the data model already has/);
fails("a tool that touches nothing", (c) => { Object.assign(tool(c, "deployments"), { reads: [], writes: [] }); }, /tool deployments reads, writes, keeps and proposes nothing/);
fails("a tool that names an unknown cluster", (c) => { tool(c, "books").cluster = "crystal-balls"; }, /names cluster crystal-balls/);
fails("a tool that shows before any record type it writes can be suggested", (c) => { tool(c, "spend").phase = "discovery"; }, /tool spend shows in discovery, but no record type it writes can be suggested before beachhead \(spend-register from beachhead/);
fails("a tool whose record types a condition lifts earlier may show then, but not before", (c) => { tool(c, "cap-table").phase = "discovery"; tool(c, "asset-register").phase = "validation"; }, /tool asset-register shows in validation, but no record type it writes can be suggested before scale/);
t("a tool whose writes need-now lifts by a condition may show in that phase", broken((c) => { tool(c, "cap-table").phase = "discovery"; }).status === 0);
t("a tool that writes only master data need-now never suggests may show in any phase", broken((c) => { tool(c, "investors").phase = "discovery"; }).status === 0);
fails("a function with no tool", (c) => { c.tools = c.tools.filter((x) => x.function !== "assets"); }, /function assets has no tool/);
fails("a process group with no tool", (c) => { c.tools = c.tools.filter((x) => x.id !== "payroll"); }, /process group 9\.5 \(finance\) has no tool/);

// Status is derived, never written.
t("status: a tool that proposes nothing is ready", statusOf(tool(original, "books")) === "ready");
t("status: a tool that reads and proposes is partial", statusOf(tool(original, "invoices")) === "partial");
t("status: a tool that only proposes is proposed", statusOf(tool(original, "production")) === "proposed");
t("status: storage that keeps a path and proposes nothing is ready", statusOf(tool(original, "files")) === "ready");

const j = run({}, ["--json"]);
const parsed = (() => { try { return JSON.parse(j.out) as { ok: boolean; coverage: { function: string | null; tools: unknown[] }[] }; } catch { return null; } })();
t("--json gives coverage for the universal tools and each of the 13 functions", j.status === 0 && parsed?.ok === true && parsed.coverage.length === 14 && parsed.coverage.every((x) => x.tools.length > 0), j.out.slice(0, 300));

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("check-tools: every rule fails on a copy that breaks it");
