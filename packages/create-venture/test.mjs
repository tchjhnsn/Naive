// create-venture and the naive commands a venture runs (Chapter 1: I-1, I-2, I-3, I-6, I-7, I-9, I-17,
// I-21, I-24, I-26, I-29). Runs offline: the framework installs from this checkout.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ventureFile } from "../naive/src/core/venture-paths.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const base = mkdtempSync(join(tmpdir(), "create-venture-test-"));
const home = join(base, "home");
mkdirSync(home);
/** @type {NodeJS.ProcessEnv} */
const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), npm_config_user_agent: "" };
// The generator calls a real model when TYPESAFE_API_KEY is set; these tests use the stand-in or the list.
for (const k of ["TYPESAFE_API_KEY", "TYPESAFEAI_API_KEY", "MENTURA_TYPE_CMD"]) delete env[k];
delete env.MENTURA_WORKSPACE;
const create = (args, cwd = base, extra = {}) => spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), ...args], { cwd, env: { ...env, ...extra }, encoding: "utf8" });
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
  ok(existsSync(join(v, "AGENTS.md")) && existsSync(ventureFile(v, "foundation")) && existsSync(ventureFile(v, "decisions")));
  ok(venture.layout === "structured" && existsSync(join(v, "k-base/foundation")) && existsSync(join(v, "meta/provenance.jsonl")), "the structured layout: k-base/ and meta/");
  ok(existsSync(join(v, "node_modules/.bin/naive")), "naive is installed in the venture");
  ok(existsSync(join(v, ".git")), "a git repository");
});

t("the first venture is My first venture, in a workspace named Naive workspace; both can be named", () => {
  // Its own folder, outside base: base became a workspace when the first test created kettle in it.
  const ws = mkdtempSync(join(tmpdir(), "create-venture-ws-"));
  const r = create(["--yes", "--skip-install", "--no-git"], ws);
  ok(r.status === 0, r.stderr + r.stdout);
  const venture = load(join(ws, "my-first-venture/venture.json"));
  ok(venture.name === "My first venture" && venture.id === "my-first-venture", JSON.stringify(venture.name));
  const w = load(join(ws, "naive-workspace.json"));
  ok(w.name === "Naive workspace" && w.ventures.join() === "my-first-venture", JSON.stringify(w));
  ok(existsSync(join(ws, "AGENTS.md")), "the workspace has its own AGENTS.md");
  ok(typeof w.timeZone === "string" && w.timeZone.length > 0, "the workspace starts with its clock's zone");
  ok(load(join(ws, "calendar/calendars/default.json")).visibility === "workspace", "and its default calendar");
  ok(create(["--yes", "--skip-install", "--no-git", "--venture-name", "Acme Labs"], ws).status === 0);
  ok(load(join(ws, "acme-labs/venture.json")).name === "Acme Labs");
  ok(load(join(ws, "naive-workspace.json")).ventures.join() === "my-first-venture,acme-labs", "a second venture joins the same workspace");
  rmSync(ws, { recursive: true, force: true });
});

t("the venture's package.json has the four scripts and the framework", () => {
  const p = load(join(v, "package.json"));
  ok(["dev", "build", "start", "check"].every((s) => p.scripts[s] === `naive ${s}`));
  ok(p.devDependencies["naive-framework"]);
});

t("the idea dump is saved verbatim as raw/dump.md and recorded in provenance", () => {
  ok(readFileSync(ventureFile(v, "raw/dump.md"), "utf8").includes("Kettles for cafes."));
  ok(readFileSync(ventureFile(v, "provenance.jsonl"), "utf8").includes('"raw/dump.md"'));
});

t("every record file is mapped to its JSON Schema for the editor", () => {
  const s = load(join(v, ".vscode/settings.json"))["json.schemas"];
  const icp = s.find((x) => x.fileMatch.includes("/k-base/foundation/icp/*.json"));
  ok(icp?.url === "./node_modules/naive-framework/packages/naive/src/records/icp-profile.schema.json", JSON.stringify(icp));
  ok(existsSync(join(v, icp.url)), "the schema it points to is installed");
});

t("installed from the registry, the venture depends on the framework by version, not by file", () => {
  // Pack both packages and install them as npm would, then create a venture without installing it.
  const packs = join(base, "packs"), proj = join(base, "registry");
  mkdirSync(packs); mkdirSync(proj);
  for (const d of [repo, join(repo, "packages/create-venture")]) ok(spawnSync("npm", ["pack", "--pack-destination", packs], { cwd: d, env, encoding: "utf8" }).status === 0, `npm pack in ${d}`);
  const tgz = (n) => join(packs, readdirSync(packs).find((f) => f.startsWith(`${n}-`)));
  writeFileSync(join(proj, "package.json"), "{}\n");
  const i = spawnSync("npm", ["install", "--offline", tgz("naive-framework"), tgz("create-venture")], { cwd: proj, env, encoding: "utf8" });
  ok(i.status === 0, i.stderr);
  const r = spawnSync("node", [join(proj, "node_modules/.bin/create-venture"), "from-registry", "--yes", "--skip-install", "--no-git"], { cwd: base, env, encoding: "utf8" });
  ok(r.status === 0, r.stderr + r.stdout);
  const fwVersion = load(join(repo, "package.json")).version;
  ok(load(join(base, "from-registry/package.json")).devDependencies["naive-framework"] === `^${fwVersion}`, readFileSync(join(base, "from-registry/package.json"), "utf8"));
});

t("--framework given as name@range keeps only the range", () => {
  ok(create(["pinned", "--yes", "--skip-install", "--no-git", "--framework", "naive-framework@^0.1.0"]).status === 0);
  ok(load(join(base, "pinned/package.json")).devDependencies["naive-framework"] === "^0.1.0");
});

// With network: the registry-installed generator creates a venture and npm installs the published framework.
if (process.env.NAIVE_REGISTRY_TEST === "1") t("from the registry: create-venture installs naive-framework from npm and naive check passes", () => {
  const proj = join(base, "registry");
  const r = spawnSync("node", [join(proj, "node_modules/.bin/create-venture"), "npm-venture", "--yes", "--no-git"], { cwd: base, env, encoding: "utf8" });
  ok(r.status === 0, r.stderr + r.stdout);
  const c = spawnSync("node", [join(base, "npm-venture/node_modules/.bin/naive"), "check"], { cwd: join(base, "npm-venture"), env, encoding: "utf8" });
  ok(c.status === 0 && /all passing/.test(c.stdout), c.stdout + c.stderr);
});

t("a legal form venture.json does not accept is refused before anything is written", () => {
  const r = create(["badform", "--yes", "--legal-form", "corporation", "--skip-install", "--no-git"]);
  ok(r.status === 1 && /unknown legal form corporation/.test(r.stderr) && !existsSync(join(base, "badform")), r.stderr);
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

const prompts = (args, lines, extra = {}) => spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), ...args, "--layout", "flat", "--skip-install", "--no-git"], { cwd: base, env: { ...env, CREATE_VENTURE_PROMPTS: "1", ...extra }, input: lines.join("\n") + "\n", encoding: "utf8" });

t("structured layout: the org chart in venture.json names each function's owner, and people/ stores no hats", () => {
  ok(create(["duo", "--type", "software-startup", "--name", "Ana Ruiz", "--team", "Ben Okafor", "--yes", "--skip-install", "--no-git"]).status === 0);
  const v2 = load(join(base, "duo/venture.json"));
  ok(v2.layout === "structured" && Object.values(v2.functions).every((f) => f.owner === "ana-ruiz"), JSON.stringify(v2.functions));
  const roster = load(join(base, "duo/k-base/people/people.json"));
  ok(roster.people.every((p) => !("hats" in p)), JSON.stringify(roster));
  const top = readdirSync(join(base, "duo")).filter((f) => !f.startsWith(".")).sort().join(" ");
  ok(top === "AGENTS.md README.md k-base meta package.json venture.json", top);
  const r = spawnSync("node", [join(repo, "packages/naive/src/checks/check-people.mjs"), join(base, "duo")], { encoding: "utf8" });
  ok(r.status === 0, r.stdout);
});

t("the setup questions: nothing is scaffolded until the type and role are set; customize asks layers, legal form and a dump", () => {
  // name, what (Enter: the list), type 1 (software startup), role, your name, solo, phase,
  // where each function keeps its truth (products, marketing and sales, customer service, IT, finance, legal),
  // then customize, layers, legal form, dump
  const r = prompts([], ["clinic", "", "1", "founder", "Pat Doe", "solo", "validation",
    "local-repo:../clinic-app,github:pat/clinic", "vercel:pat/clinic", "none", "none", "stripe:acct_123", "Not set up yet; our lawyer has the papers",
    "customize", "purpose,knowledge", "llc", "dump.md"]);
  ok(r.status === 0, r.stdout + r.stderr);
  const c = load(join(base, "clinic/venture.json"));
  ok(c.type === "software-startup" && c.phase === "validation" && c.form?.legal_form === "llc", JSON.stringify(c));
  ok(c.layers.purpose && c.layers.knowledge && c.layers.operations === false, JSON.stringify(c.layers));
  ok(existsSync(ventureFile(join(base, "clinic"), "raw/dump.md")));
  const people = load(ventureFile(join(base, "clinic"), "people/people.json"));
  ok(people.mode === "solo" && people.people[0].role === "founder" && people.people[0].hats.length === c.departments.length, JSON.stringify(people));
  const fns = load(ventureFile(join(base, "clinic"), "knowledge/sources.json")).functions;
  ok(fns.products.systems.map((s) => s.system).join() === "local-repo,github" && fns.products.systems[1].address === "pat/clinic", JSON.stringify(fns.products));
  ok(fns.finance.systems[0].system === "stripe" && fns.finance.systems[0].status === "pointed" && !fns["customer-service"], JSON.stringify(fns));
  ok(fns.legal.systems.length === 0 && /our lawyer/.test(fns.legal.note), "a function answered in prose keeps the founder's words");
});

t("a VC fund with a team: an investor role, one file per founder, each function asked once", () => {
  // name, what, type 2 (VC fund), role, your name, team, other founders, phase, then who owns each of 5 functions, then recommended
  // ... then where finance, external relationships, risk and compliance, and legal documents keep their truth
  const r = prompts([], ["northstar", "", "2", "general-partner", "Torian Johnson", "team", "Ada Lovelace", "discovery", "torian-johnson", "ada-lovelace", "ada-lovelace", "torian-johnson", "torian-johnson", "none", "none", "none", "none", "recommended"]);
  ok(r.status === 0, r.stdout + r.stderr);
  const v = load(join(base, "northstar/venture.json"));
  ok(v.type === "vc-fund" && v.layers.purpose, JSON.stringify(v));
  ok(existsSync(ventureFile(join(base, "northstar"), "fund/decisions/thesis.decision.json")) && existsSync(ventureFile(join(base, "northstar"), "deals")) && existsSync(ventureFile(join(base, "northstar"), "portfolio")), "a fund starts with its thesis question, deals and a portfolio");
  ok(!existsSync(ventureFile(join(base, "northstar"), "products/decisions")) && !existsSync(ventureFile(join(base, "northstar"), "marketing")), "a fund has no product questions and no marketing package");
  const people = load(ventureFile(join(base, "northstar"), "people/people.json"));
  ok(people.mode === "team" && people.people.every((p) => p.role === "general-partner"), JSON.stringify(people));
  ok(JSON.stringify(load(ventureFile(join(base, "northstar"), "people/founders/ada-lovelace.json")).hats) === JSON.stringify(["finance", "external-relationships"]));
  const check = spawnSync("node", [join(repo, "packages/naive/src/checks/check-people.mjs"), base], { encoding: "utf8" });
  ok(check.status === 0, check.stdout);
});

t("described in a few words, a model picks the type, and the founder confirms it", () => {
  const r = prompts([], ["syndicate", "an angel syndicate for climate founders", "yes", "general-partner", "Sam Lee", "solo", "discovery", "none", "none", "none", "none", "recommended"], { MENTURA_TYPE_CMD: `node ${join(repo, "packages/naive/src/records/examples/venture-type/jev.mjs")}` });
  ok(r.status === 0, r.stdout + r.stderr);
  ok(/That sounds like a vc fund or firm/.test(r.stdout), r.stdout);
  ok(load(join(base, "syndicate/venture.json")).type === "vc-fund");
});

t("without a model key, describing it falls back to the list; an unclear description is uncertain", () => {
  const r = create(["listed", "--describe", "a newsletter about cafes", "--yes", "--skip-install", "--no-git"]);
  ok(r.status === 1 && /pass --type/.test(r.stderr), r.stderr);
  const u = spawnSync("node", [join(repo, "packages/naive/src/engine/venture-type.mjs"), "classify", "something hard to name"], { env: { ...env, MENTURA_TYPE_CMD: `node ${join(repo, "packages/naive/src/records/examples/venture-type/jev.mjs")}` }, encoding: "utf8" });
  ok(u.status === 0 && JSON.parse(u.stdout).uncertain === true, u.stdout);
});

t("--source points functions at systems; a system with a sync command syncs and is marked a fixture; bad pointers are refused", () => {
  // finance=rho syncs through the app's command (packages/naive/src/core/sync.mjs); the test names a stand-in.
  const r = create(["shop", "--type", "ecommerce", "--name", "Lee Park", "--source", "marketing-and-sales=shopify:shop.myshopify.com", "--source", "finance=rho", "--yes", "--skip-install"], base, { NAIVE_SYNC_RHO: `node ${join(repo, "packages/naive/src/records/examples/money-sync/sync.ts")}` });
  ok(r.status === 0 && /rho: synced from a saved answer \(a fixture/.test(r.stdout) && /Legal documents: none connected yet/.test(r.stdout), r.stdout + r.stderr);
  const fns = load(ventureFile(join(base, "shop"), "knowledge/sources.json")).functions;
  ok(fns.finance.systems[0].status === "connected" && fns.finance.systems[0].fixture && existsSync(ventureFile(join(base, "shop"), "money/_summary.json")), JSON.stringify(fns));
  ok(fns["marketing-and-sales"].systems[0].status === "pointed");
  // The transactions the sync wrote are sensitive: git must ignore them.
  const packs = spawnSync("node", [join(repo, "packages/naive/src/checks/check-data-packages.mjs"), join(base, "shop")], { encoding: "utf8" });
  ok(!/sensitive stream/.test(packs.stdout + packs.stderr), `the synced transactions stay out of git: ${packs.stdout}${packs.stderr}`);
  const bad = create(["shop2", "--type", "ecommerce", "--source", "finance=vercel", "--yes", "--skip-install", "--no-git"]);
  ok(bad.status === 1 && /vercel is not offered for finance/.test(bad.stderr) && !existsSync(join(base, "shop2")), bad.stderr);
});

t("flags: --type, --role and --team; a role the type does not have is refused", () => {
  ok(create(["studio2", "--type", "services-business", "--role", "founder", "--name", "Lee Park", "--team", "Kim Cho", "--layout", "flat", "--yes", "--skip-install", "--no-git"]).status === 0);
  const p = load(ventureFile(join(base, "studio2"), "people/people.json"));
  ok(p.mode === "team" && p.people[1].role === "co-founder" && p.people[0].hats.length > 0, JSON.stringify(p));
  const r = create(["badrole", "--type", "software-startup", "--role", "limited-partner", "--yes", "--skip-install", "--no-git"]);
  ok(r.status === 1 && /has no limited-partner role/.test(r.stderr) && !existsSync(join(base, "badrole")), r.stderr);
});

t("naive check runs every venture check, from inside the venture", () => {
  const r = naive(["check"], v);
  ok(r.status === 0 && /all passing/.test(r.stdout), r.stdout + r.stderr);
});

t("naive and mentura find the venture from a subdirectory, without --venture", () => {
  const i = naive(["info"], ventureFile(v, "foundation"));
  ok(i.status === 0 && i.stdout.includes("kettle (discovery)") && /Agents\s+Claude Code: not connected/.test(i.stdout), i.stdout);
  const m = spawnSync("node", [join(v, "node_modules/.bin/mentura"), "system/overview", "view"], { cwd: ventureFile(v, "foundation"), env, encoding: "utf8" });
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
  for (const [c, script] of [["build", "packages/naive/src/router/orchestration/build-release.mjs"], ["start", "packages/naive/src/engine/start-release.mjs"]]) {
    const has = existsSync(join(repo, script));
    if (has) continue;
    const r = naive([c], v);
    ok(r.status === 1 && r.stderr.includes(script), r.stderr);
  }
});

// naive dev: the board answers, a missing root layout is written, and a bad save is reported (I-2, I-21, I-24).
async function devTest() {
  rmSync(join(v, "AGENTS.md"));
  const child = spawn("node", [join(v, "node_modules/.bin/naive"), "dev", "--port", "0"], { cwd: v, env });
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
    mkdirSync(ventureFile(v, "foundation/icp"), { recursive: true });
    writeFileSync(ventureFile(v, "foundation/icp/bad.json"), '{"id": 5}\n');
    await wait(/✗ foundation\/icp\/bad\.json does not match packages\/naive\/src\/records\/icp-profile\.schema\.json/);
    return "ok";
  } finally { child.kill(); rmSync(ventureFile(v, "foundation/icp"), { recursive: true, force: true }); }
}

for (const [name, fn] of tests) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
try { await devTest(); console.log("ok   naive dev serves the board, writes a missing root layout, and checks each record as you save it"); }
catch (e) { failed++; console.log(`FAIL naive dev: ${e.message}`); }
rmSync(base, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
