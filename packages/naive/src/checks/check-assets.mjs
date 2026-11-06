#!/usr/bin/env node
// Checks each venture's public/ assets (packages/naive/src/engine/assets.mjs): every file has a source, a license and a
// credit (J-2), facts read by code match the file (J-4), images have alt text and an agent's alt text
// is listed until a person confirms it (J-4), and remote images are links with a note in raw/ whose
// full copies need a license that allows them (J-3).
//
//   node packages/naive/src/checks/check-assets.mjs <workspace or venture dir>

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { checkAssets } from "../engine/assets.mjs";

const dir = process.argv[2];
if (!dir || !existsSync(dir)) { console.error("usage: node packages/naive/src/checks/check-assets.mjs <workspace or venture dir>"); process.exit(2); }
const walk = (d) => existsSync(join(d, "venture.json")) ? [d] : readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" ? walk(join(d, e.name)) : []);
let failed = 0;
for (const v of walk(dir)) {
  const r = checkAssets(v);
  for (const e of r.errors) console.log(`error    ${v}: ${e}`);
  for (const p of r.pending) console.log(`pending  ${v}: ${p.path}: alt text by ${p.by}, not yet confirmed by a person`);
  if (!r.ok) failed++;
}
console.log(failed ? `assets: ${failed} ventures fail` : "assets: ok");
process.exit(failed ? 1 : 0);
