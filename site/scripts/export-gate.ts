#!/usr/bin/env node
// Freezes what the page gate looks for, so the gate needs no venture folder (EE-118 step 9c: the venture's
// records live in the tenant's store, not in this repository). From a venture folder, such as one exported from
// the store, it writes into site/gate/:
//
//   governance/internal-terms.json   the founder's internal-terms list, copied as it is, so check-leaks.mjs
//                                    reads site/gate as it reads a venture (patterns(dir))
//   internal-wording.json            every non-public string a record holds (publish-build.mjs internalWording)
//
// Rerun it when the founder's list or the venture's records change. The gate fails closed when either file is
// missing or empty, so a deleted file stops the build instead of letting a leak through.
//
//   node site/scripts/export-gate.ts <venture dir> [--out <dir>]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { internalWording } from "naive-framework/src/functions/marketing-and-sales/marketing/publish-build.mjs";

export const GATE = new URL("../gate/", import.meta.url).pathname;

export function exportGate(venture: string, out = GATE): { terms: number, wording: number } {
  const termsFile = join(venture, "governance/internal-terms.json");
  if (!existsSync(join(venture, "venture.json"))) throw new Error(`${venture} has no venture.json`);
  if (!existsSync(termsFile)) throw new Error(`${venture} has no governance/internal-terms.json`);
  const terms: unknown = JSON.parse(readFileSync(termsFile, "utf8"));
  const list = terms && typeof terms === "object" && "patterns" in terms && Array.isArray(terms.patterns) ? terms.patterns : null;
  if (!list?.length) throw new Error(`${termsFile} holds no patterns`);
  const wording = (internalWording(venture) as { text: string, rel: string, field: string }[])
    .map(({ rel, field, text }) => ({ rel, field, text }))
    .sort((a, b) => a.rel.localeCompare(b.rel) || a.field.localeCompare(b.field));
  if (!wording.length) throw new Error(`${venture} holds no internal wording; is it the right folder?`);
  mkdirSync(join(out, "governance"), { recursive: true });
  writeFileSync(join(out, "governance/internal-terms.json"), JSON.stringify(terms, null, 2) + "\n");
  writeFileSync(join(out, "internal-wording.json"), JSON.stringify(wording, null, 2) + "\n");
  return { terms: list.length, wording: wording.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const oi = args.indexOf("--out");
  const out = oi >= 0 ? resolve(args[oi + 1] ?? "") : GATE;
  const venture = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--out");
  if (!venture) { console.error("usage: node site/scripts/export-gate.ts <venture dir> [--out <dir>]"); process.exit(2); }
  const n = exportGate(resolve(venture), out);
  console.log(`wrote ${n.terms} internal term(s) and ${n.wording} internal string(s) to ${out}`);
}
