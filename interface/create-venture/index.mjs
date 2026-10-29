#!/usr/bin/env node
// create-venture: Naive's generator, the way create-next-app is Next.js's (I-1, I-3, I-7). It asks for a
// name, offers the recommended defaults or lets you customize them, creates the venture in a new or
// empty directory, installs the framework with your package manager, and initializes git.
//
//   npx create-venture [dir] [--yes] [--phase <phase>] [--layers a,b] [--legal-form <form>] [--dump <file>]
//                      [--use-npm | --use-pnpm | --use-yarn | --use-bun] [--skip-install] [--no-git]
//                      [--framework <spec>] [--reset-preferences]
//
// --yes takes the recommended defaults: the discovery phase, the phase's packages, checks on, and
// AGENTS.md. Answers to the setup questions are kept
// in ~/.config/naive/create-venture.json, so the next venture can reuse them.

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
// The legal forms venture.json accepts, from its schema, so the question can only offer valid answers.
const FORMS = JSON.parse(readFileSync(join(framework, "schema/venture.schema.json"), "utf8")).properties.form.properties.legal_form.enum;

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n) => argv.includes(`--${n}`);
const valued = new Set(["phase", "layers", "legal-form", "dump", "framework"]);
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

// 1. The name and the directory.
let target = positional[0];
if (!target) {
  if (!interactive) fail("usage: create-venture <dir> [--yes]: name the directory for the new venture");
  target = await ask("What is your venture named?", "my-venture");
}
const dir = resolve(target);
const id = slug(basename(dir));
if (!id) fail(`${basename(dir)} has no letters or digits to make a venture id from`);
if (existsSync(dir) && readdirSync(dir).length) fail(`${dir} already exists and is not empty. create-venture only creates new ventures; to bring an existing project in, create one here and run naive port or naive migrate.`);

// 2. Defaults, the last venture's answers, or your own (I-3, I-7).
const recommended = { phase: "discovery", layers: null, legalForm: null, dump: null };
let answers = { ...recommended };
const given = opt("phase") || opt("layers") || opt("legal-form") || opt("dump");
if (given) answers = { phase: opt("phase") ?? "discovery", layers: opt("layers") ?? null, legalForm: opt("legal-form") ?? null, dump: opt("dump") ?? null };
else if (interactive) {
  const modes = prefs ? ["recommended", "previous", "customize"] : ["recommended", "customize"];
  const mode = await choose("Would you like to use the recommended Naive defaults?", modes, "recommended");
  if (mode === "previous") answers = { ...recommended, ...prefs };
  if (mode === "customize") {
    answers.phase = await choose("Which phase is the venture in?", PHASES, "discovery");
    const l = await ask(`Which layers should be on? (comma separated, from ${LAYERS.join(", ")}; empty for the phase's defaults: ${PHASE_LAYERS[answers.phase].join(", ")})`, "");
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
console.log(`\nCreating a new Naive venture in ${bold(dir)}.\n`);
const init = spawnSync("node", [join(framework, "schema/init-venture.mjs"), dir, id, "--phase", answers.phase,
  ...(answers.layers ? ["--layers", answers.layers] : []), ...(answers.legalForm ? ["--legal-form", answers.legalForm] : [])], { encoding: "utf8" });
if (init.status !== 0) fail((init.stderr || init.stdout).trim());
const vfile = join(dir, "venture.json");
const venture = JSON.parse(readFileSync(vfile, "utf8"));
venture.name = basename(dir);
writeFileSync(vfile, JSON.stringify(venture, null, 2) + "\n");

const { agentFromEnv, record } = await import(join(framework, "interface/provenance.mjs"));
if (answers.dump) {
  mkdirSync(join(dir, "raw"), { recursive: true });
  copyFileSync(resolve(answers.dump), join(dir, "raw/dump.md"));
  record(dir, { entity: "raw/dump.md", route: "raw/dump", activity: "create", agent: agentFromEnv("person", "create-venture"), note: `the founder's idea dump, verbatim, from ${resolve(answers.dump)}` });
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
writeFileSync(join(dir, ".gitignore"), "node_modules/\n.naive/\n.DS_Store\n# Founder-supplied originals stay out of git (EE-070).\n**/raw/**/original.*\n");

// Editor completion for records (I-26): every record file is mapped to its JSON Schema in the installed framework.
const { routes } = await import(join(framework, "interface/router.mjs"));
const schemas = new Map();
for (const r of routes()) if (r.kind === "record" && r.schema && r.form !== "md") for (const f of r.files ?? []) if (f.endsWith(".json")) schemas.set(r.schema, [...(schemas.get(r.schema) ?? []), `/${f}`]);
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

try { mkdirSync(dirname(prefsFile), { recursive: true }); writeFileSync(prefsFile, JSON.stringify({ phase: answers.phase, layers: answers.layers, legalForm: answers.legalForm }, null, 2) + "\n"); } catch {}

const runScript = (s) => (manager === "npm" ? `npm run ${s}` : `${manager} ${s}`);
const cd = relative(process.cwd(), dir) || ".";
console.log(`
${bold("Success!")} Created ${basename(dir)} at ${dir}
Git: ${git}

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
