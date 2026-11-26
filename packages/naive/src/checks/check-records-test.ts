#!/usr/bin/env node
// Tests check-records.ts: a new business validates, a broken record in it fails, a held draft is not a record, and a
// handoff's done criterion records-valid, run through runCriterion, checks the business named by NAIVE_VENTURE rather
// than Naive's own records. Every business lives in a temporary folder.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCriterion } from "../engine/run-handoff.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${String(detail)}`}`); if (!ok) failed++; };
const check = (dir: string) => spawnSync("node", [join(repo, "packages/naive/src/checks/check-records.ts"), dir], { encoding: "utf8" });
const ws = mkdtempSync(join(tmpdir(), "check-records-"));

try {
  const dir = join(ws, "kettle");
  const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.ts"), dir, "kettle"], { encoding: "utf8" });
  expect("a business to check", init.status === 0, init.stderr);
  const fresh = check(dir);
  expect("a new business's records are all valid", fresh.status === 0 && /all valid/.test(fresh.stdout), fresh.stdout + fresh.stderr);

  const criterion = { id: "records-valid", kind: "conformance" as const, check: "node packages/naive/src/checks/check-records.ts \"$NAIVE_VENTURE\"" };
  const good = await runCriterion(dir, criterion, undefined);
  expect("records-valid passes on the valid business it names", good.passed, good.output);

  mkdirSync(join(dir, "_drafts"), { recursive: true });
  writeFileSync(join(dir, "_drafts/product__kettle.json.draft"), "not json");
  expect("a held draft is not a record", check(dir).status === 0);

  writeFileSync(join(dir, "product/kettle.json"), JSON.stringify({ id: 7 }));
  const broken = check(dir);
  expect("a broken record fails, naming the file and its schema", broken.status === 1 && /product\/kettle\.json \(product\.schema\.json\)/.test(broken.stdout), broken.stdout + broken.stderr);
  const bad = await runCriterion(dir, criterion, undefined);
  expect("records-valid fails on the broken business, not on Naive's own records", !bad.passed && /kettle/.test(bad.output ?? ""), bad.output);

  const none = check(join(ws, "nothing"));
  expect("a folder with no venture.json cannot be checked (exit 2)", none.status === 2, none.stdout + none.stderr);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("check-records: all passed");
