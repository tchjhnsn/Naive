#!/usr/bin/env node
// Runs every sh block on the Get Started pages, in the order the pages are listed, as one script in a
// fresh home directory, so the docs never show a command that does not run (EE-076). The pages are written for
// a reader in a checkout of Naive, so each block starts at the root of a copy of the installed naive-framework
// package (a copy, because some commands write into the checkout, such as typegen's .naive/types/).
// A line ending in "# exits 1" must fail; every other command must succeed.
//
//   node site/scripts/docs-commands-test.mjs

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, symlinkSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { naiveRoot } from "./naive.ts";

const dir = new URL("../content/docs/get-started", import.meta.url).pathname;
const pages = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")).pages;
const home = mkdtempSync(join(tmpdir(), "docs-commands-"));
const repo = join(home, "naive");
cpSync(naiveRoot, repo, { recursive: true });
// A reader's checkout has its dependencies installed (effect among them); the copy borrows this repository's.
if (!existsSync(join(repo, "node_modules"))) symlinkSync(new URL("../../node_modules", import.meta.url).pathname, join(repo, "node_modules"), "dir");
const script = ["set -e", `cd ${JSON.stringify(repo)}`];
let blocks = 0;
let skipped = 0;
for (const p of pages) {
  const text = readFileSync(join(dir, `${p}.mdx`), "utf8");
  for (const [, body] of text.matchAll(/^```sh\n([\s\S]*?)^```$/gm)) {
    // A block that runs one of Mentura's kits runs only when MENTURA_DIR names a Mentura checkout.
    if (body.includes("$MENTURA_DIR") && !process.env.MENTURA_DIR) { skipped++; continue; }
    blocks++;
    // Each block starts at Naive's root, as a reader copying it would; a block that goes into a venture says cd itself.
    script.push(`echo "--- ${p} block ${blocks}" >&2`, `cd ${JSON.stringify(repo)}`);
    for (const line of body.split("\n")) {
      const fail = line.match(/^(.*\S)\s+# exits 1$/);
      script.push(fail ? `if ${fail[1]} >/dev/null 2>&1; then echo "expected to fail: ${fail[1].replace(/["$`\\]/g, "\\$&")}" >&2; exit 1; fi` : line);
    }
  }
}
const env = /** @type {NodeJS.ProcessEnv} */ ({ ...process.env, HOME: home, PYTHONUSERBASE: process.env.PYTHONUSERBASE ?? join(homedir(), ".local") });
delete env.MENTURA_WORKSPACE; delete env.MENTURA_AGENT_CMD;
const r = spawnSync("bash", ["-c", script.join("\n")], { env, encoding: "utf8" });
const ok = r.status === 0;
console.log(`${ok ? "pass" : "FAIL"}  ${blocks} sh blocks on ${pages.length} Get Started pages run as written${skipped ? `, ${skipped} skipped (they run Mentura kits; set MENTURA_DIR to a Mentura checkout)` : ""}`);
if (!ok) console.log(r.stderr.split("\n").slice(-25).join("\n"));
console.log(ok ? "\nall passing" : "\n1 failing");
process.exit(ok ? 0 : 1);
