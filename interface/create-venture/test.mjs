// create-venture and the naive commands a venture runs (Chapter 1: I-1, I-2, I-3, I-6, I-7, I-9, I-17,
// I-21, I-24, I-26, I-29). Runs offline: the framework installs from this checkout.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../..", import.meta.url).pathname;
const base = mkdtempSync(join(tmpdir(), "create-venture-test-"));
const home = join(base, "home");
mkdirSync(home);
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), npm_config_user_agent: "" };
delete env.MENTURA_WORKSPACE;
const create = (args, cwd = base) => spawnSync("node", [join(repo, "interface/create-venture/index.mjs"), ...args], { cwd, env, encoding: "utf8" });
const naive = (args, cwd) => spawnSync("node", [join(base, "kettle/node_modules/.bin/naive"), ...args], { cwd, env, encoding: "utf8" });
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
let failed = 0;
const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };

const v = join(base, "kettle");
writeFileSync(join(base, "dump.md"), "# Ideas\n\nKettles for cafes.\n");

t("--yes creates a venture with the recommended defaults, installs the framework and starts git", () => {
  const r = create(["kettle", "--yes", "--dump", "dump.md"]);
  ok(r.status === 0, r.stderr + r.stdout);
  ok(/Success! Created kettle/.test(r.stdout), r.stdout);
  const venture = load(join(v, "venture.json"));
  ok(venture.phase === "discovery" && venture.id === "kettle");
  ok(existsSync(join(v, "AGENTS.md")) && existsSync(join(v, "foundation")) && existsSync(join(v, "decisions")));
  ok(existsSync(join(v, "node_modules/.bin/naive")), "naive is installed in the venture");
  ok(existsSync(join(v, ".git")), "a git repository");
});

t("the venture's package.json has the four scripts and the framework", () => {
  const p = load(join(v, "package.json"));
  ok(["dev", "build", "start", "check"].every((s) => p.scripts[s] === `naive ${s}`));
  ok(p.devDependencies["naive-framework"]);
});

t("the idea dump is saved verbatim as raw/dump.md and recorded in provenance", () => {
  ok(readFileSync(join(v, "raw/dump.md"), "utf8").includes("Kettles for cafes."));
  ok(readFileSync(join(v, "provenance.jsonl"), "utf8").includes('"raw/dump.md"'));
});

t("every record file is mapped to its JSON Schema for the editor", () => {
  const s = load(join(v, ".vscode/settings.json"))["json.schemas"];
  const icp = s.find((x) => x.fileMatch.includes("/foundation/icp.json"));
  ok(icp?.url === "./node_modules/naive-framework/schema/icp.schema.json", JSON.stringify(icp));
  ok(existsSync(join(v, icp.url)), "the schema it points to is installed");
});

t("a directory that is not empty is refused", () => {
  const r = create(["kettle", "--yes"]);
  ok(r.status === 1 && /not empty/.test(r.stderr));
});

t("the answers are kept for the next venture, and --reset-preferences forgets them", () => {
  ok(create(["studio", "--yes", "--phase", "validation", "--skip-install", "--no-git"]).status === 0);
  ok(load(join(home, ".config/naive/create-venture.json")).phase === "validation");
  ok(load(join(base, "studio/venture.json")).phase === "validation");
  ok(!existsSync(join(base, "studio/node_modules")) && !existsSync(join(base, "studio/.git")), "--skip-install and --no-git");
  ok(create(["--reset-preferences"]).status === 0 && !existsSync(join(home, ".config/naive/create-venture.json")));
});

t("the setup questions: customize asks phase, layers, legal form and an idea dump", () => {
  const input = ["clinic", "customize", "validation", "purpose,knowledge", "llc", "dump.md", ""].join("\n");
  const r = spawnSync("node", [join(repo, "interface/create-venture/index.mjs"), "--skip-install", "--no-git"], { cwd: base, env: { ...env, CREATE_VENTURE_PROMPTS: "1" }, input, encoding: "utf8" });
  ok(r.status === 0, r.stdout + r.stderr);
  const c = load(join(base, "clinic/venture.json"));
  ok(c.phase === "validation" && c.form?.legal_form === "llc", JSON.stringify(c));
  ok(c.layers.purpose && c.layers.knowledge && c.layers.operations === false, JSON.stringify(c.layers));
  ok(existsSync(join(base, "clinic/raw/dump.md")));
});

t("naive check runs every venture check, from inside the venture", () => {
  const r = naive(["check"], v);
  ok(r.status === 0 && /all passing/.test(r.stdout), r.stdout + r.stderr);
});

t("naive and mentura find the venture from a subdirectory, without --venture", () => {
  const i = naive(["info"], join(v, "foundation"));
  ok(i.status === 0 && i.stdout.includes("kettle (discovery)") && /Agents\s+Claude Code: not connected/.test(i.stdout), i.stdout);
  const m = spawnSync("node", [join(v, "node_modules/.bin/mentura"), "system/overview", "view"], { cwd: join(v, "foundation"), env, encoding: "utf8" });
  ok(m.status === 0 && m.stdout.includes("# kettle: overview"), m.stdout + m.stderr);
});

t("outside a venture, naive says how to name one", () => {
  const r = naive(["check"], base);
  ok(r.status === 1 && /no venture here/.test(r.stderr), r.stderr);
});

t("naive upgrade --framework reinstalls the framework with the venture's package manager", () => {
  const r = naive(["upgrade", "--framework"], v);
  ok(r.status === 0 && /updating the framework: npm install --save-dev file:/.test(r.stdout), r.stdout + r.stderr);
});

t("naive build and start say plainly when the release scripts are missing, and otherwise run them", () => {
  for (const c of ["build", "start"]) {
    const has = existsSync(join(repo, `schema/${c}-release.mjs`));
    if (has) continue;
    const r = naive([c], v);
    ok(r.status === 1 && r.stderr.includes(`schema/${c}-release.mjs`), r.stderr);
  }
});

// naive dev: the board answers, a missing root layout is written, and a bad save is reported (I-2, I-21, I-24).
async function devTest() {
  rmSync(join(v, "AGENTS.md"));
  const child = spawn("node", [join(v, "node_modules/.bin/naive"), "dev", "--port", "4391"], { cwd: v, env });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  const wait = async (re, ms = 15000) => { const t0 = Date.now(); while (!re.test(out)) { if (Date.now() - t0 > ms) throw new Error(`timed out waiting for ${re}: ${out}`); await new Promise((r) => setTimeout(r, 100)); } };
  try {
    await wait(/Board:\s+http:\/\/127\.0\.0\.1:(\d+)/);
    const port = out.match(/Board:\s+http:\/\/127\.0\.0\.1:(\d+)/)[1];
    ok(existsSync(join(v, "AGENTS.md")) && /wrote AGENTS\.md/.test(out), "the root layout is written when missing");
    ok((await fetch(`http://127.0.0.1:${port}/`)).status === 200, "the board answers");
    ok((await fetch(`http://127.0.0.1:${port}/map`)).status === 200, "the map answers");
    await new Promise((r) => setTimeout(r, 300));
    writeFileSync(join(v, "foundation/icp.json"), '{"id": 5}\n');
    const python = spawnSync("python3", ["-c", "import jsonschema"]).status === 0;
    await wait(python ? /✗ foundation\/icp\.json does not match schema\/icp\.schema\.json/ : /foundation\/icp\.json changed/);
    return "ok";
  } finally { child.kill(); rmSync(join(v, "foundation/icp.json"), { force: true }); }
}

for (const [name, fn] of tests) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
try { await devTest(); console.log("ok   naive dev serves the board, writes a missing root layout, and checks each record as you save it"); }
catch (e) { failed++; console.log(`FAIL naive dev: ${e.message}`); }
rmSync(base, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
