// Writes Nextra `_meta.js` files from each folder's `meta.json`, so sidebar order stays
// the content contract's `pages` array. Generated, and gitignored.
//
//   node scripts/nextra-meta.mjs

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const content = new URL("../content/", import.meta.url).pathname;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let written = 0;
for (const metaPath of walk(content).filter((file) => file.endsWith("meta.json"))) {
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (!Array.isArray(meta.pages)) throw new Error(`${metaPath} has no pages array`);
  const dir = dirname(metaPath);
  const entries = {};
  for (const page of meta.pages) {
    if (typeof page !== "string" || page.startsWith("---")) throw new Error(`${metaPath} has a bad pages entry`);
    const folder = join(dir, page);
    if (statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
      const nested = JSON.parse(readFileSync(join(folder, "meta.json"), "utf8"));
      entries[page] = { title: nested.title };
    } else {
      entries[page] = {};
    }
  }
  writeFileSync(join(dir, "_meta.js"), `export default ${JSON.stringify(entries, null, 2)}\n`);
  written++;
}
console.log(`nextra sidebar meta written (${written} folders)`);
