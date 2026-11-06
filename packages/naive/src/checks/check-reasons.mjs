#!/usr/bin/env node
// The check for reasons with citations (packages/naive/src/engine/reasons.mjs): for each decided decision, any cited
// local file whose sha256 differs from the one frozen at approval is reported as "the reason you
// decided <id> changed: <ref>"; the decision renders stale in packages/naive/src/engine/decisions.mjs.
//
//   node packages/naive/src/checks/check-reasons.mjs <venture or workspace dir> [--json]
//
// Exit 1 when any decided decision's reasons changed.

import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { decisions } from "../engine/decisions.mjs";

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) { console.error("usage: node packages/naive/src/checks/check-reasons.mjs <venture or workspace dir> [--json]"); process.exit(2); }
  const walk = (d) => existsSync(join(d, "venture.json")) ? [d] : readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_")).flatMap((e) => walk(join(d, e.name)));
  const found = walk(arg).flatMap((dir) => decisions(dir).decisions.filter((d) => d.reasons_changed?.length).flatMap((d) => d.reasons_changed.map((c) => ({ dir: relative(process.cwd(), dir) || ".", id: d.id, ...c }))));
  if (process.argv.includes("--json")) console.log(JSON.stringify(found, null, 2));
  else for (const f of found) console.log(`STALE  ${f.dir}: the reason you decided ${f.id} changed: ${f.ref}`);
  if (!found.length && !process.argv.includes("--json")) console.log("no decided decision's reasons changed");
  process.exit(found.length ? 1 : 0);
}
