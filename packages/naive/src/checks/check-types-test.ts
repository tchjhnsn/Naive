// Proves the type gate fails on what it must catch, in a throwaway copy of the gate.
//
//   node packages/naive/src/checks/check-types-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../../..", import.meta.url));
const BAD_JS = "/** @type {number} */\nconst n = 'x';\nexport default n;\n";
const BAD_TYPE = "const n: number = 'x';\nexport default n;\n";

function gateExit(files: Record<string, string>): number {
  const dir = mkdtempSync(join(tmpdir(), "check-types-"));
  try {
    mkdirSync(join(dir, "schema"));
    cpSync(join(repo, "packages/naive/src/checks/check-types.ts"), join(dir, "packages/naive/src/checks/check-types.ts"));
    cpSync(join(repo, "tsconfig.json"), join(dir, "tsconfig.json"));
    cpSync(join(repo, "tsconfig.strict.json"), join(dir, "tsconfig.strict.json"));
    writeFileSync(join(dir, "package.json"), '{ "type": "module" }\n');
    symlinkSync(join(repo, "node_modules"), join(dir, "node_modules"));
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(join(dir, rel, ".."), { recursive: true });
      writeFileSync(join(dir, rel), text);
    }
    return spawnSync("node", ["packages/naive/src/checks/check-types.ts"], { cwd: dir, encoding: "utf8" }).status ?? -1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const cases: [string, Record<string, string>, number][] = [
  ["a clean tree passes", { "brand-new/ok.ts": "export const n = 1;\n" }, 0],
  ["a type error in JavaScript fails", { "scripts/bad.mjs": BAD_JS }, 1],
  ["a type error in a new top-level folder fails", { "brand-new/bad.ts": BAD_TYPE }, 1],
  ["a type error in a root file fails", { "bad.ts": BAD_TYPE }, 1],
  ["a syntax error fails", { "scripts/broken.mjs": "const = ;\n" }, 1],
];

let failed = 0;
for (const [name, files, want] of cases) {
  const got = gateExit(files);
  if (got !== want) failed++;
  console.log(`${got === want ? "PASS" : "FAIL"}  ${name} (exit ${got})`);
}
process.exit(failed ? 1 : 0);
