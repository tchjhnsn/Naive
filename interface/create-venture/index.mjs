#!/usr/bin/env node
// create-venture: Naive's generator, the way create-next-app is Next.js's (I-1, I-3, I-7, EE-082). Before
// anything is scaffolded it asks what you are building (described in a few words and classified by a
// model, or picked from the list) and what role you hold, then who else is founding it, the phase, and
// which functions (hats) each person owns. The venture type decides the packages and first decisions:
// a VC fund starts with a thesis and terms, a software startup with its product questions.
//
//   npx create-venture [dir] [--yes] [--type <type> | --describe "<a few words>"] [--role <role>]
//                      [--name "<your name>"] [--team "<name>, <name>"] [--phase <phase>]
//                      [--source <function>=<system>[:<address>],... ...] [--rho-fixture]
//                      [--layers a,b] [--legal-form <form>] [--dump <file>]
//                      [--use-npm | --use-pnpm | --use-yarn | --use-bun] [--skip-install] [--no-git]
//                      [--framework <spec>] [--reset-preferences] [--venture-name "<name>"] [--no-workspace]
//                      [--door <door>] [--account <id>]
//
// --door names the interface when it is not the CLI. Without --account the founder's name is a claim
// and the provenance log says unverified; --account names the account that door checked.
// --source says where a function keeps its truth (schema/systems-catalog.json), recorded as pointers in
// knowledge/sources.json: --source products=local-repo:../app,github:acme/app,vercel:acme/app
// --source finance=rho. Rho is synced at setup: its sandbox, the founder's own with RHO_API_TOKEN, or a
// saved answer with --rho-fixture (offline; recorded as a fixture).
//
// --yes takes the recommended defaults: a software startup, you as its solo founder wearing every hat,
// the discovery phase, the type's packages, checks on, and AGENTS.md. --describe classifies only when
// TYPESAFE_API_KEY is set; otherwise pick with --type. Answers are kept in
// ~/.config/naive/create-venture.json, so the next venture can reuse them.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// The framework: the checkout this package sits in, or the installed naive-framework package.
const framework = (() => {
  const checkout = resolve(here, "../..");
  if (existsSync(join(checkout, "schema/init-venture.mjs"))) return checkout;
  try { return dirname(fileURLToPath(import.meta.resolve("naive-framework/package.json"))); } catch { return null; }
})();
if (!framework) { console.error("create-venture could not find the Naive framework (naive-framework) to create the venture with"); process.exit(1); }
const fw = JSON.parse(readFileSync(join(framework, "package.json"), "utf8"));
const { layers: PHASE_LAYERS } = JSON.parse(readFileSync(join(framework, "schema/scaffold/defaults.json"), "utf8"));
const PHASES = Object.keys(PHASE_LAYERS);
const LAYERS = ["purpose", "knowledge", "operations", "evidence", "governance", "interface"];
// The legal forms venture.json accepts, from its schema, so the question can only offer valid answers. The schema is
// found through the framework's record types resolver, which knows where the record types sit in that version.
const { readSchema } = await import(join(framework, "packages/records/index.mjs"));
const FORMS = readSchema("venture").properties.form.properties.legal_form.enum;

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n) => argv.includes(`--${n}`);
const valued = new Set(["phase", "layers", "legal-form", "dump", "framework", "type", "describe", "role", "name", "team", "layout", "venture-name", "door", "account"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(argv[i - 1].slice(2))));
const bold = (s) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[22m` : s);
const cyan = (s) => (process.stdout.isTTY ? `\x1b[36m${s}\x1b[39m` : s);
const fail = (m) => { console.error(m); process.exit(1); };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Preferences, so a second venture can reuse the first one's answers (create-next-app's "reuse previous settings").
const prefsFile = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "naive", "create-venture.json");
if (flag("reset-preferences")) { rmSync(prefsFile, { force: true }); console.log("Preferences reset."); if (!positional.length) process.exit(0); }
const prefs = (() => { try { return JSON.parse(readFileSync(prefsFile, "utf8")); } catch { return null; } })();

// CREATE_VENTURE_PROMPTS=1 asks the questions with piped input, so tests can answer them.
const interactive = ((process.stdin.isTTY && process.stdout.isTTY) || process.env.CREATE_VENTURE_PROMPTS === "1") && !flag("yes");
// At a terminal, readline asks; with piped answers (CREATE_VENTURE_PROMPTS=1), each line answers the next question.
const piped = interactive && !process.stdin.isTTY ? readFileSync(0, "utf8").split("\n") : null;
const rl = interactive && !piped ? createInterface({ input: process.stdin, output: process.stdout }) : null;
const ask = async (q, fallback) => {
  const prompt = `${cyan("?")} ${bold(q)} ${fallback ? `(${fallback}) ` : ""}`;
  const a = piped ? (process.stdout.write(prompt + "\n"), (piped.shift() ?? "")) : await rl.question(prompt);
  return a.trim() || fallback;
};
const choose = async (q, options, fallback) => {
  const a = await ask(`${q} ${options.join(" / ")}`, fallback);
  if (!options.includes(a)) { console.log(`  choose one of: ${options.join(", ")}`); if (piped && !piped.length) fail("no answer left to choose with"); return choose(q, options, fallback); }
  return a;
};

// 1. The name and the directory. The defaults are "My first venture" in my-first-venture/, and either can
// be renamed later; a directory given on the command line names the venture unless --venture-name does.
const FIRST = "My first venture";
const WORKSPACE_FILE = "naive-workspace.json";
let target = positional[0];
let ventureName = opt("venture-name");
if (!target) {
  ventureName ??= interactive ? await ask("What is your venture named?", FIRST) : FIRST;
  target = slug(ventureName);
}
const dir = resolve(target);
ventureName ??= basename(dir);
const id = slug(basename(dir));
if (!id) fail(`${basename(dir)} has no letters or digits to make a venture id from`);
if (existsSync(dir) && readdirSync(dir).length) fail(`${dir} already exists and is not empty. create-venture only creates new ventures; to bring an existing project in, create one here and run naive port or naive migrate.`);
// A workspace file that does not parse stops here, before the venture folder is made.
const { ensureWorkspace, addVenture, findWorkspace, loadWorkspace } = await import(join(framework, "schema/workspace.mjs"));
let ownWorkspace = null;
if (!flag("no-workspace")) try { ownWorkspace = findWorkspace(dirname(dir)); if (ownWorkspace) loadWorkspace(ownWorkspace); } catch (e) { fail(e.message); }

// The framework's registries: venture types, roles and functions (EE-082).
const { types: TYPES, roles: ROLES, classify, canClassify } = await import(join(framework, "schema/venture-type.mjs")).then((m) => ({ types: m.types(), roles: m.roles(), classify: m.classify, canClassify: m.canClassify }));
const DEPARTMENTS = JSON.parse(readFileSync(join(framework, "operations/departments.json"), "utf8")).departments;
const deptLabel = (d) => DEPARTMENTS.find((x) => x.id === d)?.label ?? d;
const roleOf = (r) => ROLES.find((x) => x.id === r);
const gitName = () => spawnSync("git", ["config", "user.name"], { encoding: "utf8" }).stdout?.trim() || null;

// 2. What you are building: in a few words for the model, or from the list. Nothing is scaffolded until it is set.
let vtype = opt("type") ? TYPES.find((t) => t.id === opt("type")) : null;
if (opt("type") && !vtype) fail(`unknown venture type ${opt("type")}: one of ${TYPES.map((t) => t.id).join(", ")}`);
const pickFromList = async () => {
  TYPES.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.label}: ${t.description}`));
  const a = await ask("Which kind of venture is it? (number or id)", "1");
  const t = TYPES[Number(a) - 1] ?? TYPES.find((x) => x.id === a);
  if (!t) { console.log("  choose a number from the list"); if (piped && !piped.length) fail("no answer left to choose with"); return pickFromList(); }
  return t;
};
const classified = async (words) => {
  if (!canClassify()) { console.log("  (no TYPESAFE_API_KEY, so pick from the list)"); return null; }
  try {
    const c = classify(words);
    if (c.uncertain) { console.log(`  not sure what kind of venture that is (best guess ${c.ranked[0].label}, ${Math.round(c.ranked[0].p * 100)}%), so pick from the list`); return null; }
    return TYPES.find((t) => t.id === c.best.id);
  } catch (e) { console.log(`  ${e.message}; pick from the list`); return null; }
};
if (!vtype && opt("describe")) {
  vtype = await classified(opt("describe"));
  if (!vtype && !interactive) fail(`could not classify "${opt("describe")}": pass --type, one of ${TYPES.map((t) => t.id).join(", ")}`);
  if (vtype) console.log(`  ${opt("describe")}: a ${vtype.label.toLowerCase()}`);
}
if (!vtype && interactive) {
  const words = await ask("What are you building? Describe it in a few words, or press Enter to pick from the list", "");
  if (words) {
    const t = await classified(words);
    if (t && (await choose(`That sounds like a ${t.label.toLowerCase()}. Is that right?`, ["yes", "no"], "yes")) === "yes") vtype = t;
  }
  if (!vtype) vtype = await pickFromList();
}
// --yes with no type: the recommended default, a software startup.
if (!vtype) vtype = TYPES.find((t) => t.id === "software-startup");

// 3. Your role in it, from the roles this type has. Investors are a role too: a general partner runs a fund.
let role = opt("role") ?? (interactive ? await choose("What is your role in it?", vtype.roles, vtype.default_role) : vtype.default_role);
if (!vtype.roles.includes(role)) fail(`a ${vtype.label.toLowerCase()} has no ${role} role: one of ${vtype.roles.join(", ")}`);

// 4. You, and whether you are building it solo or with a team.
const me = opt("name") ?? (interactive ? await ask("What is your name?", gitName() ?? "Founder") : gitName() ?? "Founder");
let others = opt("team") ? opt("team").split(",").map((x) => x.trim()).filter(Boolean) : [];
if (!opt("team") && interactive && (await choose("Are you building it solo or with a team?", ["solo", "team"], prefs?.mode ?? "solo")) === "team") {
  others = (await ask("Who else is founding it? (names, comma separated)", "")).split(",").map((x) => x.trim()).filter(Boolean);
  if (!others.length) console.log("  no other names, so you are building it solo");
}
const mode = others.length ? "team" : "solo";
const coRole = vtype.id === "vc-fund" ? "general-partner" : "co-founder";
const people = [{ id: slug(me) || "founder", name: me, role }, ...others.map((n) => ({ id: slug(n), name: n, role: coRole }))];
if (new Set(people.map((p) => p.id)).size !== people.length) fail("two people would have the same id; give each a distinct name");

// 5. The phase, the hats, and the rest of the defaults (I-3, I-7).
const recommended = { phase: "discovery", layers: null, legalForm: null, dump: null };
let answers = { ...recommended };
const given = opt("phase") || opt("layers") || opt("legal-form") || opt("dump");
if (given) answers = { phase: opt("phase") ?? "discovery", layers: opt("layers") ?? null, legalForm: opt("legal-form") ?? null, dump: opt("dump") ?? null };
else if (interactive) answers.phase = await choose("Which phase is the venture in?", PHASES, prefs?.phase ?? "discovery");
// The layout (EE-086): structured (knowledge/, meta/, the org chart in venture.json) unless --layout flat.
const layout = opt("layout") ?? "structured";
if (!["flat", "structured"].includes(layout)) fail(`unknown layout ${layout}: structured or flat`);
const structured = layout === "structured";
// A solo founder owns every function; on a team, each function is asked once. In the structured layout the
// functions are the org chart's (one per package, flat) and ownership goes in venture.json; in the flat one,
// the catalog's departments, worn as hats in people/.
const fnIds = structured ? vtype.packages : vtype.departments;
const fnLabel = (f) => (structured ? f : deptLabel(f));
const owners = people.filter((p) => roleOf(p.role)?.owns_when_solo);
const ownerOf = {};
for (const p of people) p.hats = [];
if (owners.length === 1 || !interactive) for (const f of fnIds) { ownerOf[f] = owners[0]?.id ?? null; owners[0]?.hats.push(f); }
else for (const f of fnIds) {
  const who = await choose(`Who owns ${fnLabel(f)}?`, owners.map((p) => p.id), owners[0].id);
  ownerOf[f] = who;
  owners.find((p) => p.id === who).hats.push(f);
}
// 6. Where each function keeps its truth (EE-083): pointers to its systems of record, in the founder's words when none fits.
const CATALOG = JSON.parse(readFileSync(join(framework, "schema/systems-catalog.json"), "utf8"));
const asked = [...vtype.departments.filter((d) => CATALOG.functions[d]), "legal"];
const parseSystems = (text) => {
  const items = text.split(",").map((x) => x.trim()).filter(Boolean);
  const systems = items.map((x) => { const i = x.indexOf(":"); const sys = i < 0 ? x : x.slice(0, i); return CATALOG.systems[sys] ? { system: sys, ...(i < 0 ? {} : { address: x.slice(i + 1) }) } : null; });
  return systems.every(Boolean) ? { systems } : { systems: [], note: text.trim() };
};
const functions = {};
const sourceFlags = argv.flatMap((a, i) => (a === "--source" ? [argv[i + 1]] : []));
for (const f of sourceFlags) {
  const [fn, ...rest] = f.split("=");
  if (!CATALOG.functions[fn]) fail(`--source ${f}: ${fn} is not a function systems are kept for (${Object.keys(CATALOG.functions).join(", ")})`);
  functions[fn] = parseSystems(rest.join("="));
  for (const s of functions[fn].systems) if (!CATALOG.functions[fn].includes(s.system)) fail(`--source ${f}: ${s.system} is not offered for ${fn} (${CATALOG.functions[fn].join(", ")})`);
}
if (interactive && !sourceFlags.length) {
  console.log("\nNow point Naive at where each function keeps its truth. Name systems (comma separated, add :address if you know it), type none, or say it in your own words.");
  for (const fn of asked) {
    const options = CATALOG.functions[fn];
    const a = await ask(`Where is the source of truth for ${fn === "legal" ? "legal documents" : deptLabel(fn)}? ${options.join(" / ")} / none`, "none");
    if (a.toLowerCase() === "none") continue;
    functions[fn] = parseSystems(a);
  }
}

if (interactive && !given) {
  const modes = prefs ? ["recommended", "previous", "customize"] : ["recommended", "customize"];
  const pick = await choose("Would you like to use the recommended Naive defaults for the rest?", modes, "recommended");
  if (pick === "previous") answers = { ...answers, layers: prefs.layers ?? null, legalForm: prefs.legalForm ?? null };
  if (pick === "customize") {
    const l = await ask(`Which layers should be on? (comma separated, from ${LAYERS.join(", ")}; empty for the defaults)`, "");
    answers.layers = l || null;
    const f = await choose("Is the venture a legal entity yet?", FORMS, "none");
    answers.legalForm = f === "none" ? null : f;
    const d = await ask("Paste the path of an idea dump to start from (optional)", "");
    answers.dump = d || null;
  }
}
if (!PHASES.includes(answers.phase)) fail(`unknown phase ${answers.phase}: one of ${PHASES.join(", ")}`);
if (answers.dump && !existsSync(resolve(answers.dump))) fail(`no idea dump at ${answers.dump}`);
if (answers.legalForm && !FORMS.includes(answers.legalForm)) fail(`unknown legal form ${answers.legalForm}: one of ${FORMS.join(", ")}`);

// 3. The package manager: the flag, else whichever ran this (npm_config_user_agent), else npm.
const pm = ["npm", "pnpm", "yarn", "bun"].find((p) => flag(`use-${p}`)) ?? (process.env.npm_config_user_agent ?? "").split("/")[0].replace(/^npx$/, "npm") ?? "npm";
const manager = ["npm", "pnpm", "yarn", "bun"].includes(pm) ? pm : "npm";
rl?.close();

// 4. The venture itself, by the framework's own scaffold.
console.log(`\nCreating a new ${vtype.label.toLowerCase()} in ${bold(dir)}, with ${mode === "solo" ? `${me} as its ${role}, wearing every hat` : `${people.length} founders`}.\n`);
const init = spawnSync("node", [join(framework, "schema/init-venture.mjs"), dir, id, "--phase", answers.phase, "--type", vtype.id, "--layout", layout,
  ...(answers.layers ? ["--layers", answers.layers] : []), ...(answers.legalForm ? ["--legal-form", answers.legalForm] : [])], { encoding: "utf8" });
if (init.status !== 0) fail((init.stderr || init.stdout).trim());
const vfile = join(dir, "venture.json");
const venture = JSON.parse(readFileSync(vfile, "utf8"));
venture.name = ventureName;
if (mode === "team") venture.members = people.slice(1).map((p) => ({ role: p.role === "general-partner" ? "partner" : p.role, kind: "person" }));
// The org chart (EE-086): each function's owner. Hats are read from here, never stored twice.
if (structured) for (const f of Object.keys(venture.functions ?? {})) venture.functions[f].owner = ownerOf[f] ?? null;
writeFileSync(vfile, JSON.stringify(venture, null, 2) + "\n");
// Where each logical file sits in this venture's layout (schema/venture-paths.mjs).
const { ventureFile: vf, physical } = await import(join(framework, "schema/venture-paths.mjs"));

// people/: the roster and one file per founder, the venture.json of human capital (EE-082).
const { agentFromEnv, record } = await import(join(framework, "interface/provenance.mjs"));
const today = new Date().toISOString().slice(0, 10);
mkdirSync(vf(dir, "people/founders"), { recursive: true });
const door = opt("door") ?? "cli";
const account = opt("account");
const founderKind = door === "cli" || account ? "person" : "unverified";
const asPerson = agentFromEnv(founderKind, door, { id: people[0].id, account });
for (const p of people.filter((x) => roleOf(x.role)?.founder)) {
  p.founder_file = `people/founders/${p.id}.json`;
  writeFileSync(vf(dir, p.founder_file), JSON.stringify({ id: p.id, name: p.name, role: p.role, ...(structured ? {} : { hats: p.hats }), joined: today }, null, 2) + "\n");
  record(dir, { entity: p.founder_file, route: `people/founders/${p.id}`, activity: "write", agent: asPerson, note: `${p.name}, ${p.role}, as answered at create-venture` });
}
writeFileSync(vf(dir, "people/people.json"), JSON.stringify({ venture: id, mode, people: people.map(({ id: pid, name, role: r, hats, founder_file }) => ({ id: pid, name, role: r, ...(structured ? {} : { hats }), ...(founder_file ? { founder_file } : {}) })), updated: today }, null, 2) + "\n");
record(dir, { entity: "people/people.json", route: "people", activity: "write", agent: asPerson, note: `${mode}: ${people.map((p) => `${p.name} (${p.role})`).join(", ")}` });
if (answers.dump) {
  mkdirSync(vf(dir, "raw"), { recursive: true });
  copyFileSync(resolve(answers.dump), vf(dir, "raw/dump.md"));
  record(dir, { entity: "raw/dump.md", route: "raw/dump", activity: "write", agent: agentFromEnv(founderKind, door, { account }), note: `the founder's idea dump, verbatim${door === "cli" ? `, from ${resolve(answers.dump)}` : ""}` });
}

// knowledge/sources.json: each function's systems of record, as pointers (EE-083). Rho is read by code, so it is synced now.
const rhoScript = join(framework, "platform/integrations/rho.mjs");
let rhoNote = null;
for (const f of Object.values(functions)) for (const s of f.systems) {
  s.status = "pointed";
  if (s.system !== "rho") continue;
  if (!existsSync(rhoScript)) { rhoNote = "Rho: recorded as pointed; this copy of Naive has no Rho integration"; continue; }
  const fixture = flag("rho-fixture") ? join(framework, "platform/integrations/fixtures/rho-sandbox.json") : null;
  const live = !fixture && process.env.RHO_API_TOKEN;
  const r = spawnSync("node", [rhoScript, "sync", "--venture", dir, ...(fixture ? ["--fixture", fixture] : live ? ["--live"] : [])], { encoding: "utf8", env: process.env });
  if (r.status === 0) {
    Object.assign(s, { status: "connected", synced: new Date().toISOString().replace(/\.\d+Z$/, "Z"), ...(fixture ? { fixture: true } : {}), address: s.address ?? (fixture ? "saved sandbox answer" : live ? "live" : "sandbox") });
    rhoNote = `Rho: synced ${fixture ? "from a saved sandbox answer (a fixture, not a live account)" : live ? "from your Rho account" : "from Rho's sandbox (a fictional company)"} into money/`;
  } else rhoNote = `Rho: could not sync (${(r.stderr || r.stdout).trim().split("\n").at(-1)}); recorded as pointed`;
}
if (Object.keys(functions).length) {
  const map = vf(dir, "knowledge/sources.json");
  mkdirSync(dirname(map), { recursive: true });
  writeFileSync(map, JSON.stringify({ sources: [], records: {}, truth: "local", functions }, null, 2) + "\n");
  record(dir, { entity: "knowledge/sources.json", route: "knowledge/knowledge-sources", activity: "write", agent: asPerson,
    note: `systems of record: ${Object.entries(functions).map(([fn, f]) => `${fn} ${f.systems.map((s) => `${s.system} (${s.status})`).join(", ") || "in the founder's words"}`).join("; ")}` });
}

// The venture's package.json: the framework as a dev dependency and the four scripts (I-17).
const fromClone = existsSync(join(framework, "test.mjs")) && !framework.split("/").includes("node_modules");
// A dependency value is a range or a location, never name@range: --framework naive-framework@^0.2 keeps ^0.2.
const spec = opt("framework")?.replace(new RegExp(`^${fw.name}@`), "") ?? (fromClone ? `file:${framework}` : `^${fw.version}`);
writeFileSync(join(dir, "package.json"), JSON.stringify({
  name: id, private: true, type: "module",
  scripts: { dev: "naive dev", build: "naive build", start: "naive start", check: "naive check" },
  devDependencies: { [fw.name]: spec },
}, null, 2) + "\n");
writeFileSync(join(dir, ".gitignore"), "node_modules/\n.naive/\n.DS_Store\n# Founder conversations and what is caught in them stay local, in case a redaction misses something.\n**/raw/sources/conversations-*/\n**/raw/sources/diagnosis-*/\n# Founder-supplied originals stay out of git (EE-070).\n**/raw/**/original.*\n# A data stream's activity (bank transactions, CRM events) stays out of git; only its stream.json and summary.md are versioned.\n/*/_streams/*/*\n!/*/_streams/*/stream.json\n!/*/_streams/*/summary.md\n/k-base/*/_streams/*/*\n!/k-base/*/_streams/*/stream.json\n!/k-base/*/_streams/*/summary.md\n");

// Editor completion for records (I-26): every record file is mapped to its JSON Schema in the installed framework.
const { routes } = await import(join(framework, "interface/router.mjs"));
const schemas = new Map();
for (const r of routes()) if (r.kind === "record" && r.schema && r.form !== "md") for (const f of r.files ?? []) if (f.endsWith(".json")) schemas.set(r.schema, [...(schemas.get(r.schema) ?? []), `/${physical(dir, f)}`]);
mkdirSync(join(dir, ".vscode"), { recursive: true });
writeFileSync(join(dir, ".vscode/settings.json"), JSON.stringify({
  "json.schemas": [...schemas].map(([schema, fileMatch]) => ({ fileMatch: [...new Set(fileMatch)], url: `./node_modules/${fw.name}/${schema}` })),
}, null, 2) + "\n");

// 5. Install, then git, as create-next-app does.
if (!flag("skip-install")) {
  console.log(`Installing the framework with ${manager}:\n- ${fw.name}\n`);
  const r = spawnSync(manager, ["install"], { cwd: dir, stdio: "inherit" });
  if (r.status !== 0) fail(`${manager} install failed in ${dir}. Fix the error above, then run ${manager} install there.`);
}
let git = "skipped (--no-git)";
if (!flag("no-git") && spawnSync("git", ["--version"]).status === 0 && spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dirname(dir) }).status !== 0) {
  spawnSync("git", ["init", "-q"], { cwd: dir });
  spawnSync("git", ["add", "-A"], { cwd: dir });
  const c = spawnSync("git", ["commit", "-q", "-m", "Initial commit from create-venture"], { cwd: dir, encoding: "utf8" });
  git = c.status === 0 ? "initialized, with a first commit" : "initialized; the first commit was skipped because git has no user.name and user.email";
} else if (!flag("no-git")) git = "skipped (already inside a git repository)";

// The workspace (the folder holding the founder's ventures, like a monorepo root): the nearest
// naive-workspace.json above the venture lists it; with none, the venture's parent folder becomes the
// workspace, named "Naive workspace" until the founder renames it, with an AGENTS.md for rules that hold
// across every venture. --no-workspace leaves the parent folder as it is.
// The workspace's file, AGENTS.md, folders, clock (its timeZone) and calendar come from schema/workspace.mjs,
// the same code naive workspace init runs, so both ways in make the same workspace.
let workspace = null;
if (!flag("no-workspace")) {
  const root = ownWorkspace ?? dirname(dir);
  const { ws } = ensureWorkspace(root, { owner: people[0].id });
  addVenture(root, dir);
  workspace = { root, name: ws.name, timeZone: ws.timeZone };
}

try { mkdirSync(dirname(prefsFile), { recursive: true }); writeFileSync(prefsFile, JSON.stringify({ type: vtype.id, role, mode, phase: answers.phase, layers: answers.layers, legalForm: answers.legalForm }, null, 2) + "\n"); } catch {}

const runScript = (s) => (manager === "npm" ? `npm run ${s}` : `${manager} ${s}`);
const cd = relative(process.cwd(), dir) || ".";
const legal = functions.legal?.systems.length ? null : "Legal documents: none connected yet. Point Naive at them later with --source legal=google-drive:<folder> (or docusign, local-folder), and draft the founder agreement with the founding-agreement kit.";
console.log(`
${bold("Success!")} Created ${basename(dir)} at ${dir}
Workspace: ${workspace ? `${workspace.name} at ${workspace.root} (${WORKSPACE_FILE}), clock in ${workspace.timeZone}, calendar in calendar/` : "none (--no-workspace)"}
Git: ${git}${rhoNote ? `\n${rhoNote}` : ""}${legal ? `\n${legal}` : ""}

Inside that directory, you can run:

  ${cyan(runScript("dev"))}
    Opens the board at http://127.0.0.1:4331 and checks each record as you save it.

  ${cyan(runScript("check"))}
    Runs every check that applies to the venture.

  ${cyan(runScript("build"))}
    Checks every package and writes a release.

We suggest that you begin by typing:

  ${cyan(`cd ${cd}`)}
  ${cyan(runScript("dev"))}
`);
