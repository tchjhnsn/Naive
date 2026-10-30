// Type-checks the code with tsc (allowJs and checkJs, tsconfig.json), phase 1 of the move to
// TypeScript. tsc checks every file, but only folders listed in CHECKED fail the run; the rest are
// counted and reported until their own PR fixes them and adds them here. When every folder is
// listed, CHECKED goes and any error fails.
//
//   node schema/check-types.ts            (needs npm install for typescript and @types/node)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const CHECKED: readonly string[] = [
  "evidence/", "frameworks/", "governance/", "knowledge/", "operations/", "purpose/", "schema/", "test.mjs",
];

const tsc = join(root, "node_modules/.bin/tsc");
if (!existsSync(tsc)) {
  console.error("FAIL  typescript is not installed: run npm install");
  process.exit(1);
}

const r = spawnSync(tsc, ["-p", root, "--pretty", "false"], { cwd: root, encoding: "utf8" });
const errors = r.stdout.split("\n").filter((l) => / error TS\d+:/.test(l));
const counted = (l: string) => CHECKED.some((c) => l.startsWith(c));
const failing = errors.filter(counted);
const later = errors.length - failing.length;

for (const l of failing) console.log(`FAIL  ${l}`);
console.log(`${failing.length} errors in checked folders; ${later} in folders not yet checked`);
process.exit(failing.length || (r.status !== 0 && errors.length === 0) ? 1 : 0);
