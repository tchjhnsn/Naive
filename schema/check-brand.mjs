#!/usr/bin/env node
// Checks each venture's brand (schema/brand.mjs): colors, licensed and self-hosted typefaces (T-1),
// font roles and scopes (T-2, Y-5), marks of the right type and size (P-24), design systems linked
// and not copied (Y-4), package glossaries (Y-2), and marketing content held to the voice rules (Y-3).
// A venture with no brand record passes.
//
//   node schema/check-brand.mjs <workspace or venture dir>

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { checkBrand } from "./brand.mjs";

const dir = process.argv[2];
if (!dir || !existsSync(dir)) { console.error("usage: node schema/check-brand.mjs <workspace or venture dir>"); process.exit(2); }
const walk = (d) => existsSync(join(d, "venture.json")) ? [d] : readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules" ? walk(join(d, e.name)) : []);
let failed = 0;
for (const v of walk(dir)) {
  const r = checkBrand(v);
  for (const e of r.errors) console.log(`error  ${v}: ${e}`);
  for (const w of r.warnings) console.log(`warn   ${v}: ${w}`);
  if (!r.ok) failed++;
}
console.log(failed ? `brand: ${failed} ventures fail` : "brand: ok");
process.exit(failed ? 1 : 0);
