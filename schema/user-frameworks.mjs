#!/usr/bin/env node
// A founder's own frameworks for thinking and their playbooks, kept in the workspace beside the built-in ones.
//
//   node schema/user-frameworks.mjs list    [<from dir>] [--json]
//   node schema/user-frameworks.mjs new     <id> [<from dir>] [--title <t>] [--owner <who>]
//   node schema/user-frameworks.mjs check   [<id>] [<from dir>]
//   node schema/user-frameworks.mjs publish <id> [<from dir>] --dry-run
//
// A workspace keeps them at frameworks/<id>/{framework.json, template.md, playbook.md}, next to naive-workspace.json
// (or workspace.json). Each has the shape of schema/framework.schema.json, and maps_to must target canonical routes,
// so a venture uses a workspace framework the same way it uses a built-in one (resolveFramework). Publishing packs
// the folder into .naive/publish/frameworks/<id>.json; where it goes is not decided yet, so only --dry-run runs.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { check as checkFrameworks } from "./check-frameworks.mjs";
import { findWorkspace } from "./workspace.mjs";
import { leaks } from "./check-leaks.mjs";
import { findSecrets } from "./redact.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const ID = /^[a-z0-9-]+$/;

const inRoot = (root, source) => {
  const dir = join(root, "frameworks");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(dir, e.name, "framework.json")))
    .map((e) => {
      const f = load(join(dir, e.name, "framework.json"));
      return { id: f.id, title: f.title, source, root, dir: join(dir, e.name), framework: f,
        playbook: f.playbook ?? (existsSync(join(dir, e.name, "playbook.md")) ? `frameworks/${e.name}/playbook.md` : null) };
    });
};

// Every framework a venture or workspace can use: the built-in ones and the workspace's own.
// A workspace framework with a built-in's id is listed as shadowing it and does not replace it.
/** @returns {{ workspace: string | null, frameworks: *[] }} */
export function listFrameworks(from = process.cwd()) {
  const ws = findWorkspace(resolve(from));
  const builtin = inRoot(repo, "built-in");
  const own = ws && resolve(ws) !== resolve(repo) ? inRoot(ws, "workspace") : [];
  const ids = new Set(builtin.map((f) => f.id));
  return { workspace: ws, frameworks: [...builtin, ...own.map((f) => (ids.has(f.id) ? { ...f, shadows: true } : f))] };
}

// The framework with this id, wherever it lives: a built-in one first, then the workspace's.
export function resolveFramework(id, from = process.cwd()) {
  const all = listFrameworks(from).frameworks;
  return all.find((f) => f.id === id && f.source === "built-in") ?? all.find((f) => f.id === id) ?? null;
}

/** @param {string} id @param {string} [from] @param {{ title?: string, owner?: string }} [opts] */
export function newFramework(id, from = process.cwd(), { title, owner } = {}) {
  if (!ID.test(id ?? "")) throw new Error(`framework id must be lowercase letters, digits and dashes: ${id}`);
  const ws = findWorkspace(resolve(from));
  if (!ws) throw new Error("no naive-workspace.json or workspace.json here or above: a founder's frameworks live in the workspace");
  if (resolveFramework(id, from)) throw new Error(`a framework ${id} already exists`);
  const dir = join(ws, "frameworks", id);
  mkdirSync(dir, { recursive: true });
  const name = title ?? id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const today = new Date().toISOString().slice(0, 10);
  const fw = {
    id, title: name,
    purpose: "What this framework helps you think through, in one or two sentences.",
    vocabulary: {},
    frames: [{ id: "first", question: "The first question the framework asks.", answers: "first" }],
    maps_to: [{ framework_field: "first", canonical_route: "foundation/goals/[id]", canonical_field: "statement", note: "where the answer lands; change it to the canonical record it fills" }],
    template: `frameworks/${id}/template.md`,
    playbook: `frameworks/${id}/playbook.md`,
    skill: null, adapter: null, checks: [],
    owner: owner ?? "founder", visibility: "internal", status: "draft",
  };
  writeFileSync(join(dir, "framework.json"), JSON.stringify(fw, null, 2) + "\n");
  const front = (type) => `---\ntype: ${type}\nsource: human\ncreated: ${today}\ntags: [naive, framework, ${id}]\nstatus: draft\n---\n\n`;
  writeFileSync(join(dir, "template.md"), `${front("template")}# ${name}\n\nFill one section per frame.\n\n## The first question the framework asks.\n\n<answer>\n`);
  writeFileSync(join(dir, "playbook.md"), `${front("playbook")}# ${name}: playbook\n\nWhen to run it, and the steps.\n\n## When\n\n## Steps\n\n1. \n\n## Example\n`);
  return { dir, framework: fw };
}

// Schema and maps_to: python jsonschema when available, then check-frameworks over the workspace.
export function checkUserFrameworks(id, from = process.cwd()) {
  const { workspace: ws, frameworks } = listFrameworks(from);
  const own = frameworks.filter((f) => f.source === "workspace" && (!id || f.id === id));
  const errors = [];
  if (id && !frameworks.some((f) => f.id === id)) errors.push(`no framework ${id}`);
  if (!ws || !own.length) return { checked: [], errors };
  const schema = join(repo, "schema/framework.schema.json");
  const py = `import json,sys\nfrom jsonschema import Draft202012Validator as V\ns=json.load(open(sys.argv[1]))\nfor p in sys.argv[2:]:\n  for e in V(s).iter_errors(json.load(open(p))): print(p+': '+e.message)`;
  const r = spawnSync("python3", ["-I", "-c", py, schema, ...own.map((f) => join(f.dir, "framework.json"))], { encoding: "utf8" });
  if (r.status === 0) errors.push(...r.stdout.split("\n").filter(Boolean).map((l) => l.replace(ws + "/", "")));
  else errors.push(...own.flatMap((f) => basicSchema(f.framework).map((e) => `frameworks/${f.id}/framework.json: ${e}`)));
  const ids = new Set(own.map((f) => f.id));
  errors.push(...checkFrameworks(ws).errors.filter((e) => [...ids].some((i) => e.startsWith(`frameworks/${i}`))));
  for (const f of own) {
    if (!f.playbook) errors.push(`frameworks/${f.id}: no playbook (playbook.md or a playbook path)`);
    else if (!existsSync(join(ws, f.playbook))) errors.push(`frameworks/${f.id}: ${f.playbook} not found`);
  }
  return { checked: [...ids], errors: [...new Set(errors)] };
}

// Without python jsonschema: the required fields and the enums.
function basicSchema(f) {
  const e = [];
  for (const k of ["id", "title", "frames", "maps_to"]) if (f[k] === undefined) e.push(`'${k}' is a required property`);
  if (f.visibility && !["internal", "public"].includes(f.visibility)) e.push(`visibility ${f.visibility} is not internal or public`);
  if (f.status && !["draft", "stable"].includes(f.status)) e.push(`status ${f.status} is not draft or stable`);
  return e;
}

export function publishFramework(id, from = process.cwd(), { dryRun = false } = {}) {
  const f = listFrameworks(from).frameworks.find((x) => x.id === id && x.source === "workspace");
  if (!f) return { code: 1, message: `no framework ${id} in the workspace's frameworks/` };
  if (!dryRun) return { code: 2, message: "where frameworks are published is not decided yet; run with --dry-run to pack and check the bundle" };
  const { errors } = checkUserFrameworks(id, from);
  if (errors.length) return { code: 1, message: `fix these before publishing:\n${errors.join("\n")}` };
  const files = {};
  for (const name of readdirSync(f.dir).filter((n) => !n.startsWith("."))) files[name] = readFileSync(join(f.dir, name), "utf8");
  const bundle = { kind: "naive-framework", id, version: 1, owner: f.framework.owner ?? null, visibility: f.framework.visibility ?? "internal", status: f.framework.status ?? "draft", files };
  const out = join(f.root, ".naive/publish/frameworks", `${id}.json`);
  mkdirSync(dirname(out), { recursive: true });
  const text = JSON.stringify(bundle, null, 2) + "\n";
  writeFileSync(out, text);
  const problems = findSecrets(text).map((s) => `looks like a secret (${s.kind}) in the bundle`);
  // The leak check, except for the canonical routes the framework maps to: those are its contract, not a venture's records.
  const routes = (f.framework.maps_to ?? []).map((m) => m.canonical_route).filter(Boolean);
  const found = leaks([out]).filter((l) => l.severity !== "warn" && !routes.some((r) => r === l.text || r.startsWith(`${l.text}/`)));
  const leakRun = found.length ? "failed" : "passed";
  for (const l of found) problems.push(`schema/check-leaks.mjs: ${l.pattern} "${l.text}" (${l.why})`);
  if (f.framework.visibility !== "public") problems.push(`visibility is ${f.framework.visibility ?? "internal"}: set it to public before publishing for real`);
  return { code: problems.some((p) => !p.startsWith("visibility")) ? 1 : 0, out, leakRun, problems,
    message: `dry run: packed ${Object.keys(files).length} files into ${out}; leak check ${leakRun}; nothing was sent` };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [sub, ...args] = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const pos = args.filter((a, i) => !a.startsWith("--") && !["--title", "--owner"].includes(args[i - 1]));
  try {
    if (sub === "list") {
      const from = pos[0] ?? process.cwd();
      const r = listFrameworks(from);
      if (args.includes("--json")) console.log(JSON.stringify(r.frameworks.map(({ id, title, source, playbook, shadows, framework }) => ({ id, title, source, playbook, shadows: !!shadows, owner: framework.owner, visibility: framework.visibility, status: framework.status })), null, 2));
      else for (const f of r.frameworks) console.log(`${f.source === "built-in" ? "[built-in] " : "[workspace]"} ${f.id.padEnd(26)} ${f.title}${f.framework.status ? ` (${f.framework.status})` : ""}${f.shadows ? "  shadowed by the built-in" : ""}`);
    } else if (sub === "new") {
      const r = newFramework(pos[0], pos[1] ?? process.cwd(), { title: opt("title"), owner: opt("owner") });
      console.log(`created ${r.dir}/{framework.json, template.md, playbook.md}; change maps_to, then run naive framework check ${pos[0]}`);
    } else if (sub === "check") {
      const id = pos[0] && ID.test(pos[0]) && !existsSync(pos[0]) ? pos[0] : undefined;
      const r = checkUserFrameworks(id, (id ? pos[1] : pos[0]) ?? process.cwd());
      for (const e of r.errors) console.error(`error: ${e}`);
      if (r.errors.length) process.exit(1);
      console.log(r.checked.length ? `${r.checked.length} workspace frameworks (${r.checked.join(", ")}) are valid and map onto canonical records only.` : "no workspace frameworks to check");
    } else if (sub === "publish") {
      const r = publishFramework(pos[0], pos[1] ?? process.cwd(), { dryRun: args.includes("--dry-run") });
      for (const p of r.problems ?? []) console.error(`warning: ${p}`);
      (r.code === 0 ? console.log : console.error)(r.message);
      process.exit(r.code);
    } else {
      console.error("usage: user-frameworks.mjs list|new <id>|check [<id>]|publish <id> --dry-run");
      process.exit(2);
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
