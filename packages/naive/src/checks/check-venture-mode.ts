// Whether a venture record says agents are modeling it or a person is running it (EE-193).
// Absence passes as unknown. observed and run pass their conduct terms. Any other present value is illegal.
//
//   node packages/naive/src/checks/check-venture-mode.ts <venture dir>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { judgeConduct } from "../terms/conduct.ts";

const dir = process.argv[2];
if (!dir) { console.error("usage: node packages/naive/src/checks/check-venture-mode.ts <venture dir>"); process.exit(2); }

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
} catch {
  console.error(`no venture.json in ${dir}`);
  process.exit(2);
}

const judgment = judgeConduct(raw);
if (judgment.verdict === "unknown") { console.log("unknown"); process.exit(0); }
if (judgment.verdict === "illegal") { console.error(`illegal ${JSON.stringify(judgment.value)}`); process.exit(1); }
if (!judgment.result.pass) { console.error(judgment.result.failed.join(", ") || judgment.verdict); process.exit(1); }
console.log(judgment.verdict);
