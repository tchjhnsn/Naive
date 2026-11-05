// Type-checks the code with tsc (EE-087). tsconfig.json checks every file (allowJs and checkJs),
// tsconfig.strict.json holds .ts files to strict mode, and no file may suppress an error.
//
//   node schema/check-types.ts            (needs npm install for typescript and @types/node)

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SUPPRESS = "@ts-" + "(?:ignore|nocheck|expect-error)";

const tsc = join(root, "node_modules/.bin/tsc");
if (!existsSync(tsc)) {
  console.error("FAIL  typescript is not installed: run npm install");
  process.exit(1);
}

const run = (config: string) => {
  const r = spawnSync(tsc, ["-p", join(root, config), "--pretty", "false"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, errors: r.stdout.split("\n").filter((l) => / error TS\d+:/.test(l)) };
};

const all = run("tsconfig.json");
const strict = run("tsconfig.strict.json");
const failing = [...all.errors, ...strict.errors];

const tracked = spawnSync("git", ["ls-files", "*.mjs", "*.ts"], { cwd: root, encoding: "utf8" }).stdout.split("\n");
const suppressed = tracked.filter((f) => f && existsSync(join(root, f))
  && new RegExp(SUPPRESS).test(readFileSync(join(root, f), "utf8")));

for (const l of failing) console.log(`FAIL  ${l}`);
for (const f of suppressed) console.log(`FAIL  ${f}: suppresses a type error`);
console.log(`${failing.length} type errors`);
const broken = (all.status !== 0 && all.errors.length === 0) || (strict.status !== 0 && strict.errors.length === 0);
process.exit(failing.length || suppressed.length || broken ? 1 : 0);
