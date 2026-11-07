// Tests that the Markdown renders test.mjs compares with committed docs reach a slow reader whole. Stdout to a pipe
// is asynchronous, so a generator that calls process.exit right after printing drops whatever the reader has not
// taken yet; the ontology.md check in test.mjs failed at random that way. Each generator here runs eight at a time,
// some with their reader paused for a moment, and every output must equal the committed render. The listener is
// attached at once and only paused: a child_process stream nobody listens to is drained and dropped when the
// child exits, which would test Node instead of the generator.
//
//   node packages/naive/src/checks/md-render-flush-test.ts

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
let failed = 0;

/** Run a generator and read all of its stdout, with the reader paused for the first `delay` ms. */
function slowRead(args: string[], delay: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
    let out = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => { out += d; });
    if (delay > 0) { child.stdout.pause(); setTimeout(() => child.stdout.resume(), delay); }
    child.on("error", reject);
    child.on("close", () => resolve(out));
  });
}

const RENDERS: [string, string[], string, string][] = [
  ["check-nouns --md", ["packages/naive/src/checks/check-nouns.mjs", "--md"], "packages/naive/src/terms/ontology.md", "\n### System"],
  ["check-data-model --md", ["packages/naive/src/checks/check-data-model.mjs", "--md"], "docs/design/LAYERS_AND_KITS_2026-10-27.md", "### Layer relationships"],
];

for (const [name, args, path, marker] of RENDERS) {
  const doc = readFileSync(join(root, path), "utf8");
  const want = doc.slice(doc.indexOf(marker)).trim();
  const outs = await Promise.all([0, 0, 0, 0, 100, 100, 300, 300].map((delay) => slowRead(args, delay)));
  const whole = outs.every((o) => o.trim() === want);
  console.log(`${whole ? "ok" : "FAIL"}  ${name} reaches a reader that waits, whole (${outs.map((o) => o.trim().length).join(", ")} of ${want.length} characters)`);
  if (!whole) failed++;
}

console.log(failed ? `${failed} failed` : "Markdown renders: all pass");
process.exit(failed ? 1 : 0);
