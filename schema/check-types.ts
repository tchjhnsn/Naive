// Type-checks the code with tsc (allowJs and checkJs, tsconfig.json), phase 1 of the move to
// TypeScript. Every error fails the run, except in folders listed in PENDING, which are counted and
// reported until their own PR fixes them and removes them here. When PENDING is empty it goes.
//
// A syntax error fails the run wherever it is: tsc reports syntax errors and then skips type
// checking, so a syntax error in a pending folder would otherwise hide every other error.
//
//   node schema/check-types.ts            (needs npm install for typescript and @types/node)

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PENDING: readonly string[] = [
  "platform/",
  "schema/",
  "scripts/",
];

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

const r = spawnSync(tsc, ["-p", root, "--pretty", "false"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const errors = r.stdout.split("\n").filter((l) => / error TS\d+:/.test(l));
const pending = (l: string) => PENDING.some((p) => l.startsWith(p));
const failing = errors.filter((l) => !pending(l));
const later = errors.length - failing.length;

for (const l of failing) console.log(`FAIL  ${l}`);
console.log(`${failing.length} errors outside pending folders; ${later} in pending folders; ${syntax.length} syntax errors`);
process.exit(syntax.length || failing.length || (r.status !== 0 && errors.length === 0) ? 1 : 0);
