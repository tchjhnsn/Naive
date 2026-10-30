// naive bugs: the venture's bug records (product/bugs/<id>.json) and the stable measure.
//
//   node schema/bugs.mjs <venture dir> [--all] [--json]
//
// Lists open P0 and P1 bugs (status open or in-progress). The venture is stable for the validation study
// when there are none. --all lists every bug. Exits 0 either way; the answer is in the output.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ventureFile } from "./venture-paths.mjs";

export function bugs(dir) {
  const d = ventureFile(dir, "product/bugs");
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(`${d}/${f}`, "utf8"))) : [];
}

export const isOpen = (b) => b.status === "open" || b.status === "in-progress";

export function summary(dir) {
  const all = bugs(dir);
  const blocking = all.filter((b) => isOpen(b) && (b.severity === "P0" || b.severity === "P1"));
  const count = (s) => all.filter((b) => isOpen(b) && b.severity === s).length;
  return { stable: blocking.length === 0, open: { P0: count("P0"), P1: count("P1"), P2: count("P2"), P3: count("P3") }, blocking, total: all.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node schema/bugs.mjs <venture dir> [--all] [--json]"); process.exit(2); }
  const s = summary(dir);
  const out = process.argv.includes("--all") ? { ...s, bugs: bugs(dir) } : s;
  if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(s.stable ? "stable: no open P0 or P1" : `not stable: ${s.blocking.length} open P0/P1`);
    for (const b of s.blocking) console.log(`  ${b.severity}  ${b.id}  ${b.title}  (found in ${b.found_in}, ${b.status})`);
    console.log(`open: P0 ${s.open.P0}, P1 ${s.open.P1}, P2 ${s.open.P2}, P3 ${s.open.P3}; ${s.total} bug records`);
  }
}
