// One CLI: naive new starts a venture, and every record command of mentura runs through naive in it.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ventureFile } from "../../core/venture-paths.ts";

const cli = fileURLToPath(new URL("../cli/naive.ts", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "naive-cli-"));
const naive = (cwd: string, ...args: string[]) => spawnSync("node", [cli, ...args], { cwd, encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: "" } });
let pass = 0; const t = (n: string, f: () => void) => { f(); pass++; console.log(`pass  ${n}`); };
const dir = join(root, "kettle");

t("naive new scaffolds a venture with create-venture's defaults", () => {
  const r = naive(root, "new", "kettle", "--yes", "--skip-install", "--no-git", "--no-workspace");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync(join(dir, "venture.json")));
  assert.equal(JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id, "kettle");
});

t("a route command runs through naive inside the venture, as mentura <route> <action>", () => {
  const r = naive(dir, "venture", "read");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).identity.id, "kettle");
});

t("the decision queue runs through naive", () => {
  const r = naive(dir, "decisions", "--json");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(Array.isArray(JSON.parse(r.stdout).decisions));
});

t("naive help lists naive's commands and the record commands, named naive", () => {
  const r = naive(root, "help");
  assert.equal(r.status, 0);
  assert.match(r.stderr, /^naive new /m);
  assert.match(r.stderr, /^Record commands/m);
  assert.match(r.stderr, /^naive decide /m);
  assert.doesNotMatch(r.stderr, /^mentura /m);
  assert.doesNotMatch(r.stderr, /naive naive/);
});

t("naive check runs every checker that reads a venture, and honours checks.off and checks.warn", () => {
  const checks = fileURLToPath(new URL("../../checks/", import.meta.url));
  // The checkers of Naive's own files, and the ones that need an argument a venture folder does not give.
  const notVenture = new Set(["check-activities", "check-boundary", "check-canary", "check-data-model", "check-docs-claims", "check-evals", "check-functions", "check-integrations",
    "check-language-rubric", "check-nextjs-status", "check-nouns", "check-pcf", "check-pcf-coverage", "check-phases", "check-ready", "check-record-paths", "check-sdlc-catalog", "check-seams", "check-tools",
    "check-types", "check-visibility-rubric", "check-visibility", "check-write-scope"]);
  const all = readdirSync(checks).filter((f) => /^(check|lint)-[a-z-]+\.ts$/.test(f) && !f.endsWith("-test.ts")).map((f) => f.replace(/\.ts$/, ""));
  const r = naive(dir, "check");
  const ran = new Set([...r.stdout.matchAll(/^(?:pass|FAIL|warn|off )\s+([a-z-]+):/gm)].map((m) => m[1]));
  const missed = all.filter((c) => !notVenture.has(c) && !ran.has(c.replace(/^check-/, "")));
  assert.deepEqual(missed, [], `naive check leaves out: ${missed.join(", ")}`);
  assert.equal(r.status, 0, r.stdout);
  const cfg = ventureFile(dir, "naive.config.json");
  writeFileSync(cfg, JSON.stringify({ ...(existsSync(cfg) ? JSON.parse(readFileSync(cfg, "utf8")) : {}), checks: { off: ["packages/naive/src/checks/check-telos.ts"], warn: [] } }, null, 2));
  const off = naive(dir, "check");
  assert.match(off.stdout, /^off\s+telos: turned off/m, off.stdout + off.stderr);
  assert.doesNotMatch(off.stdout, /^(pass|FAIL)\s+telos:/m);
});

t("an unknown command still fails with usage", () => {
  const r = naive(root, "no-such-command");
  assert.notEqual(r.status, 0);
});

// Output larger than a pipe's buffer reaches a slow reader whole: naive routes was cut at 65,536 bytes before.
const slowRead = (...args: string[]): Promise<string> => new Promise((done, fail) => {
  const p = spawn("node", [cli, ...args], { cwd: root, env: { ...process.env, MENTURA_WORKSPACE: "" } });
  const chunks: Buffer[] = [];
  p.stdout.on("data", (c: Buffer) => chunks.push(c));
  p.stdout.pause();
  setTimeout(() => p.stdout.resume(), 500);
  p.on("error", fail);
  p.on("close", (code) => (code === 0 ? done(Buffer.concat(chunks).toString("utf8")) : fail(new Error(`exit ${code}`))));
});
const routes = await slowRead("routes", "--json");
assert.ok(routes.length > 65_536, `only ${routes.length} bytes`);
assert.ok((JSON.parse(routes) as { route: string }[]).some((r) => r.route === "validation/interviews"));
pass++; console.log("pass  naive routes reaches a slow reader whole, past one pipe buffer");

console.log(`naive-cli: ${pass} passed`);
