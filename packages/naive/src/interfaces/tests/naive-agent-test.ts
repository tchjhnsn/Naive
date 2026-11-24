// naive agent: list the roles, print a brief, and run a role on a task through NAIVE_AGENT_CMD (a stand-in harness here).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../cli/naive.ts", import.meta.url));
const root = realpathSync(mkdtempSync(join(tmpdir(), "naive-agent-")));
const env = (extra: Record<string, string> = {}) => {
  const e: Record<string, string | undefined> = { ...process.env, MENTURA_WORKSPACE: "", ...extra };
  if (!("NAIVE_AGENT_CMD" in extra)) delete e.NAIVE_AGENT_CMD;
  return e;
};
const naive = (cwd: string, args: string[], extra: Record<string, string> = {}) => spawnSync("node", [cli, ...args], { cwd, encoding: "utf8", env: env(extra) });
let pass = 0; const t = (n: string, f: () => void) => { f(); pass++; console.log(`pass  ${n}`); };

const dir = join(root, "kettle");
assert.equal(naive(root, ["new", "kettle", "--yes", "--skip-install", "--no-git", "--no-workspace"]).status, 0);

// The stand-in harness reports what it was given: the acting role, its folder, and whether the prompt held the task.
const harness = join(root, "harness.mjs");
writeFileSync(harness, `let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => console.log(JSON.stringify({ actor: process.env.MENTURA_ACTOR_ID, cwd: process.cwd(), task: s.includes("Draft the pricing page"), writes: s.includes("## What you may write") })));\n`);

t("naive agent lists every function agent and lead, staffed or not in this venture", () => {
  const r = naive(dir, ["agent"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^finance-agent +function-agent +(staffed|not staffed)$/m);
  assert.match(r.stdout, /^finance-lead +lead/m);
});

t("naive agent brief --json is the brief the MCP server gives", () => {
  const r = naive(dir, ["agent", "brief", "finance-agent", "--json"]);
  assert.equal(r.status, 0, r.stderr);
  const b = JSON.parse(r.stdout);
  assert.equal(b.kind, "function-agent");
  assert.equal(b.env.MENTURA_ACTOR_ID, "finance-agent");
});

t("naive agent run with no harness prints the prompt and says how to run it", () => {
  const r = naive(dir, ["agent", "run", "finance-agent", "Draft the pricing page"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^You are finance-agent/);
  assert.match(r.stdout, /## Task\n\nDraft the pricing page/);
  assert.match(r.stderr, /NAIVE_AGENT_CMD/);
});

t("naive agent run hands the prompt to NAIVE_AGENT_CMD as the role, in the venture", () => {
  const r = naive(join(dir, "src"), ["agent", "run", "finance-agent", "Draft", "the", "pricing", "page"], { NAIVE_AGENT_CMD: `node ${harness}` });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(JSON.parse(r.stdout), { actor: "finance-agent", cwd: dir, task: true, writes: true });
});

t("in hosted mode NAIVE_AGENT_CMD is ignored and the prompt is printed", () => {
  const r = naive(dir, ["agent", "run", "finance-lead", "Draft the pricing page"], { NAIVE_AGENT_CMD: `node ${harness}`, NAIVE_RUNTIME: "hosted" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^You are finance-lead/);
});

t("an unknown role fails and names the roles", () => {
  const r = naive(dir, ["agent", "brief", "no-such-agent"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /the roles are .*finance-agent/);
});

console.log(`naive-agent: ${pass} passed`);
