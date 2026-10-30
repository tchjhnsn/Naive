// Type-checks the code with tsc, phase 1 of the move to TypeScript (EE-087). tsconfig.json checks
// every file (allowJs and checkJs); folders in PENDING are counted and reported until their own PR
// fixes them, and every other path fails. tsconfig.strict.json holds .ts files to strict mode, and
// no file may suppress an error. When PENDING is empty it goes and any error fails.
//
// A syntax error fails the run wherever it is: tsc reports syntax errors and then skips type
// checking, so a syntax error in a pending folder would otherwise hide every other error.
//
//   node schema/check-types.ts            (needs npm install for typescript and @types/node)

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PENDING: readonly string[] = [
  "schema/",
  "scripts/",
];
const SUPPRESS = "@ts-" + "(?:ignore|nocheck|expect-error)";

const tsc = join(root, "node_modules/.bin/tsc");
if (!existsSync(tsc)) {
  console.error("FAIL  typescript is not installed: run npm install");
  process.exit(1);
}

const { default: ts } = await import("typescript");
const config = ts.getParsedCommandLineOfConfigFile(join(root, "tsconfig.json"), {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (d) => { throw new Error(String(d.messageText)); },
});
if (!config) process.exit(1);
const syntax = ts.createProgram(config.fileNames, config.options).getSyntacticDiagnostics();
for (const d of syntax) {
  const at = d.file ? `${d.file.fileName.slice(root.length)}: ` : "";
  console.log(`FAIL  ${at}${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}

const run = (config: string) => {
  const r = spawnSync(tsc, ["-p", join(root, config), "--pretty", "false"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, errors: r.stdout.split("\n").filter((l) => / error TS\d+:/.test(l)) };
};

const all = run("tsconfig.json");
const strict = run("tsconfig.strict.json");
const pending = (l: string) => PENDING.some((p) => l.startsWith(p));
const failing = [...all.errors.filter((l) => !pending(l)), ...strict.errors];
const later = all.errors.filter(pending).length;

const tracked = spawnSync("git", ["ls-files", "*.mjs", "*.ts"], { cwd: root, encoding: "utf8" }).stdout.split("\n");
const suppressed = tracked.filter((f) => f && !f.startsWith("site/") && existsSync(join(root, f))
  && new RegExp(SUPPRESS).test(readFileSync(join(root, f), "utf8")));

for (const l of failing) console.log(`FAIL  ${l}`);
for (const f of suppressed) console.log(`FAIL  ${f}: suppresses a type error`);
console.log(`${failing.length} errors outside pending folders; ${later} in pending folders; ${syntax.length} syntax errors`);
const broken = (all.status !== 0 && all.errors.length === 0) || (strict.status !== 0 && strict.errors.length === 0);
process.exit(syntax.length || failing.length || suppressed.length || broken ? 1 : 0);
