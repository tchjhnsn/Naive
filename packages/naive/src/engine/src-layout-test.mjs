// Tests naive upgrade --layout src (EE-118 step 8): a copy of the example workspace moves onto the src
// layout, from flat and from structured, every logical path still resolves, and the venture checks still pass.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries } from "../core/provenance.mjs";
import { FUNCTIONS, layoutOf, logical, physical, ventureFile } from "../core/venture-paths.mjs";
import { naiveScript } from "../core/scripts.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`); if (!ok) failed++; };

const base = mkdtempSync(join(tmpdir(), "src-layout-"));
const ws = join(base, "workspace");
cpSync(join(repo, "packages/naive/src/records/examples/workspace"), ws, { recursive: true });
const naive = (...a) => spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/naive.mjs"), ...a], { encoding: "utf8", env: { ...process.env, NAIVE_CEILING_DIRECTORIES: base } });
const dir = join(ws, "ventures/acme-labs");
const before = entries(dir).length;

const check = naive("upgrade", dir, "--layout", "src", "--check");
expect("--check says what would move and moves nothing", check.status === 0 && /would: moved \d+ entries from the flat layout/.test(check.stdout) && existsSync(join(dir, "people")) && layoutOf(dir) === "flat", check.stdout + check.stderr);

// One venture goes structured first, so the move from structured is tested too.
const viaStructured = join(ws, "ventures/northstar");
const s = naive("upgrade", viaStructured, "--layout", "structured");
expect("a venture moves onto the structured layout first", s.status === 0 && layoutOf(viaStructured) === "structured", s.stderr);

for (const v of readdirSync(join(ws, "ventures"))) {
  const r = naive("upgrade", join(ws, "ventures", v), "--layout", "src");
  if (r.status !== 0) expect(`${v} moves`, false, r.stderr);
}
expect("the venture is on the src layout: src/<function>/ for each of the 13, public/, and package folders under their function",
  layoutOf(dir) === "src" && FUNCTIONS.every((f) => existsSync(join(dir, "src", f))) && existsSync(join(dir, "public"))
  && existsSync(join(dir, "src/human-capital/people")) && !existsSync(join(dir, "people")) && existsSync(join(dir, "decisions")) && existsSync(join(dir, "provenance.jsonl")));
expect("logical paths resolve where the files went", ventureFile(dir, "foundation/problem.json") === join(dir, "src/strategy/foundation/problem.json") && existsSync(ventureFile(dir, "people/people.json"))
  && existsSync(ventureFile(dir, "decisions/statement-problem.decision.json")) && logical(dir, physical(dir, "people/people.json")) === "people/people.json");
expect("a structured venture's k-base/ and meta/ empty into src/ and the top", layoutOf(viaStructured) === "src" && !existsSync(join(viaStructured, "k-base")) && !existsSync(join(viaStructured, "meta"))
  && existsSync(join(viaStructured, "provenance.jsonl")) && existsSync(join(viaStructured, "README.md")));
expect("the provenance log keeps its chain and records the move", entries(dir).length === before + 1 && /src layout/.test(entries(dir).at(-1).note));
const again = naive("upgrade", dir, "--layout", "src");
expect("a venture on the src layout is left alone", again.status === 0 && /already on the src layout/.test(again.stdout));
const back = naive("upgrade", dir, "--layout", "structured");
expect("a src venture is not moved back onto the structured layout", back.status === 0 && /replaces the structured one/.test(back.stdout) && layoutOf(dir) === "src", back.stdout + back.stderr);
for (const c of ["check-ventures", "check-provenance", "check-people", "check-governance", "check-telos", "check-validation", "check-publication"]) {
  const r = spawnSync("node", [naiveScript(c), ws], { encoding: "utf8" });
  expect(`${c} passes on the moved workspace`, r.status === 0, (r.stdout + r.stderr).trim().split("\n").slice(-3).join("\n      "));
}

// init-venture --layout src makes a new venture on the src layout from packages/naive/template/.
const fresh = join(base, "fresh");
const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.mjs"), join(fresh, "v"), "fresh", "--type", "software-startup", "--layout", "src"], { encoding: "utf8" });
expect("init-venture --layout src copies the template's src/ and public/ and puts package folders under their function",
  init.status === 0 && layoutOf(join(fresh, "v")) === "src" && FUNCTIONS.every((f) => existsSync(join(fresh, "v/src", f))) && existsSync(join(fresh, "v/public"))
  && existsSync(join(fresh, "v/src/strategy/foundation")) && !existsSync(join(fresh, "v/foundation")), init.stderr);
const fc = spawnSync("node", [naiveScript("check-ventures"), fresh], { encoding: "utf8" });
expect("a new src venture passes check-ventures", fc.status === 0, fc.stdout + fc.stderr);

rmSync(base, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
