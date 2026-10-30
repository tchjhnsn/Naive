// Type-checks the code with tsc, phase 1 of the move to TypeScript (EE-087). tsconfig.json checks
// every file (allowJs and checkJs); folders in PENDING are counted and reported until their own PR
// fixes them, and every other path fails. tsconfig.strict.json holds .ts files to strict mode, and
// no file may suppress an error. When PENDING is empty it goes and any error fails.
//
//   node schema/check-types.ts            (needs npm install for typescript and @types/node)

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const PENDING: readonly string[] = ["interface/", "platform/", "schema/", "scripts/"];
const SUPPRESS = "@ts-" + "(?:ignore|nocheck|expect-error)";

const tsc = join(root, "node_modules/.bin/tsc");
if (!existsSync(tsc)) {
  console.error("FAIL  typescript is not installed: run npm install");
  process.exit(1);
}

const run = (config: string) => {
  const r = spawnSync(tsc, ["-p", join(root, config), "--pretty", "false"], { cwd: root, encoding: "utf8" });
  return { status: r.status, errors: r.stdout.split("\n").filter((l) => / error TS\d+:/.test(l)) };
};

const all = run("tsconfig.json");
const strict = run("tsconfig.strict.json");
const pending = (l: string) => PENDING.some((p) => l.startsWith(p));
const failing = [...all.errors.filter((l) => !pending(l)), ...strict.errors];
const later = all.errors.length - all.errors.filter((l) => !pending(l)).length;

const tracked = spawnSync("git", ["ls-files", "*.mjs", "*.ts"], { cwd: root, encoding: "utf8" }).stdout.split("\n");
const suppressed = tracked.filter((f) => f && !f.startsWith("site/") && existsSync(join(root, f))
  && new RegExp(SUPPRESS).test(readFileSync(join(root, f), "utf8")));

for (const l of failing) console.log(`FAIL  ${l}`);
for (const f of suppressed) console.log(`FAIL  ${f}: suppresses a type error`);
console.log(`${failing.length} errors in checked folders; ${later} in folders not yet checked`);
const broken = (all.status !== 0 && all.errors.length === 0) || (strict.status !== 0 && strict.errors.length === 0);
process.exit(failing.length || suppressed.length || broken ? 1 : 0);
