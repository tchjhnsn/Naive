// Tests naive upgrade --layout structured (EE-086): a copy of the example workspace moves onto the
// structured layout, every logical path still resolves, and the venture checks still pass.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries } from "../packages/core/provenance.mjs";
import { layoutOf, ventureFile } from "../packages/core/venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`); if (!ok) failed++; };

const base = mkdtempSync(join(tmpdir(), "structured-layout-"));
const ws = join(base, "workspace");
cpSync(join(repo, "schema/examples/workspace"), ws, { recursive: true });
const naive = (...a) => spawnSync("node", [join(repo, "interface/cli/naive.mjs"), ...a], { encoding: "utf8", env: { ...process.env, NAIVE_CEILING_DIRECTORIES: base } });
const dir = join(ws, "ventures/acme-labs");
const before = entries(dir).length;

const check = naive("upgrade", dir, "--layout", "structured", "--check");
expect("--check says what would move and moves nothing", check.status === 0 && /would: moved/.test(check.stdout) && existsSync(join(dir, "provenance.jsonl")) && layoutOf(dir) === "flat", check.stderr);

for (const v of readdirSync(join(ws, "ventures"))) {
  const r = naive("upgrade", join(ws, "ventures", v), "--layout", "structured");
  if (r.status !== 0) expect(`${v} moves`, false, r.stderr);
}
expect("the venture is structured: k-base/, meta/ and README.md", layoutOf(dir) === "structured" && existsSync(join(dir, "k-base/decisions")) && existsSync(join(dir, "meta/provenance.jsonl")) && existsSync(join(dir, "README.md")) && !existsSync(join(dir, "profile.md")));
expect("logical paths resolve where the files went", ventureFile(dir, "provenance.jsonl") === join(dir, "meta/provenance.jsonl") && existsSync(ventureFile(dir, "decisions/statement-problem.decision.json")));
expect("the provenance log keeps its chain and records the move", entries(dir).length === before + 1 && /structured layout/.test(entries(dir).at(-1).note));
expect("hats leave people/ for venture.json functions", !readdirSync(join(ws, "ventures/northstar/k-base/people/founders")).some((f) => "hats" in JSON.parse(readFileSync(join(ws, "ventures/northstar/k-base/people/founders", f), "utf8"))));
const again = naive("upgrade", dir, "--layout", "structured");
expect("a structured venture is left alone", again.status === 0 && /already on the structured layout/.test(again.stdout));
for (const c of ["check-ventures", "check-provenance", "check-people", "check-governance", "check-telos", "check-validation", "check-publication"]) {
  const r = spawnSync("node", [join(repo, `schema/${c}.mjs`), ws], { encoding: "utf8" });
  expect(`${c} passes on the moved workspace`, r.status === 0, (r.stdout + r.stderr).trim().split("\n").slice(-3).join("\n      "));
}

rmSync(base, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
