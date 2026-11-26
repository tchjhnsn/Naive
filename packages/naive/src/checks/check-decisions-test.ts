// The decision-id check passes the schema log and fails a copy whose first id is repeated.
//
//   node packages/naive/src/checks/check-decisions-test.ts

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const check = join(root, "packages/naive/src/checks/check-decisions.ts");
const real = join(root, "docs/decisions/decisions.json");

const run = (file: string): { status: number | null; stderr: string } => {
  const child = spawnSync(process.execPath, [check, file], { encoding: "utf8" });
  return { status: child.status, stderr: child.stderr };
};

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`);
  if (!ok) failed++;
};

const clean = run(real);
expect("the schema decision log has unique ids", clean.status === 0, clean.stderr);

const log = JSON.parse(readFileSync(real, "utf8")) as { decisions: { id: string }[] };
const id = log.decisions[0]?.id ?? "";
log.decisions.push(log.decisions[0]);
const copy = join(mkdtempSync(join(tmpdir(), "decisions-")), "decisions.json");
writeFileSync(copy, JSON.stringify(log));
const dup = run(copy);
expect("a duplicated id fails", dup.status === 1, String(dup.status));
expect("the failure names the id", id.length > 0 && dup.stderr.includes(id), dup.stderr);

if (failed > 0) process.exit(1);
