// One CLI: naive new starts a venture, and every record command of mentura runs through naive in it.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
