#!/usr/bin/env node
// The venture folder's structure (Next.js translation P-3, P-22, P-32): what venture.json declares,
// which folders are private, and which names Naive reserves.
//
//   node schema/structure.mjs <venture dir> [--json]      check the structure; exit 1 on an error
//   node schema/structure.mjs manifest <venture dir>      print the manifest venture.json declares
//
// P-3 venture.json is Naive's package.json: identity, phase, governance, the function owners, and the
//      packages and kits the venture uses (EE-071). packages and kits are declared the way
//      package.json lists dependencies; when venture.json does not list packages, the manifest
//      derives them (the core packages that fit the phase now, plus any package that holds records).
// P-22 A folder whose name starts with _ is private: no route reaches a file under it unless the
//      data model names that folder in a record's path (customers/_streams/*/stream.json). _drafts/
//      holds writes waiting for a person, _private/ never reaches a model, _notes/ holds notes,
//      _streams/ holds a data package's append-only activity.
// P-32 Names reserved for Naive's own conventions, now and later. A venture that uses one for
//      something else gets an error (the name already means something) or a warning (it will).
//
// Never calls a model. Reads the venture folder only.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(f, "utf8"));

/** The private folders Naive knows, and what each holds (P-22). Any other _folder is private too. */
export const PRIVATE = {
  _drafts: "writes held for a person to accept; Naive writes it, at the venture root only",
  _private: "never sent to a model and never released",
  _notes: "the founder's working notes beside a package; never routed",
  _streams: "a data package's append-only activity (customers, investors, money)",
};

/** Names reserved for Naive conventions (P-32). in_use: Naive gives them a meaning today; future: kept free for a convention to come. */
export const RESERVED = {
  in_use: {
    "AGENTS.md": "a layout: instructions for agents in this folder and below",
    "venture.json": "a venture's manifest; a folder holding one is a nested venture",
    "naive.config.json": "the venture's overrides, at the venture root",
    "operating-rules.json": "the venture's operating-rules module, at the venture root (meta/ when the layout is structured)",
    "provenance.jsonl": "the venture's provenance log, at the venture root",
    _drafts: PRIVATE._drafts,
    _streams: PRIVATE._streams,
    ".release": "release plans and output",
  },
  future: {
    "layout.md": "a folder's own layout file (L-5)",
    "template.md": "context recomputed on every action (P-12)",
    "error.md": "a package's own error answer (P-15)",
    "loading.md": "a package's own pending state (P-37)",
    "not-found.md": "a package's own missing-record answer (P-14)",
    "default.md": "what a slot shows for a package with nothing in it (P-17)",
    "page.md": "a record's people-facing page (P-10)",
    ".naive": "generated framework files",
  },
  // Folder shapes that mean something to the router: (group) shares a layout (P-36); @slot and [param] are kept for later.
  shapes: [
    { re: /^\(.+\)$/, name: "(group)", rule: "a route group: it holds only its AGENTS.md, the layout its packages share (P-36)" },
    { re: /^@.+/, name: "@slot", rule: "reserved for named slots (P-21)" },
    { re: /^\[.+\]$/, name: "[param]", rule: "reserved for dynamic segments (P-19); collections are declared by the data model, not by folder names" },
  ],
};

const DATA_PACKAGES = ["customers", "investors", "money"];

/** Whether a segment is private (P-22). */
export const isPrivate = (segment) => segment.startsWith("_");

/** Whether a route's file pattern may reach a venture file: every private segment of the file is named, as it is, in the pattern (P-22). */
export function routable(file, pattern) {
  const ps = pattern.split("/");
  return file.split("/").every((s, i) => !isPrivate(s) || ps[i] === s);
}

// Every entry under a folder, as venture-relative paths, stopping at nested ventures and dot folders other than reserved ones.
function walk(dir, sub = "") {
  const d = ventureFile(dir, sub);
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === ".git" || e.name === "node_modules") return [];
      if (existsSync(join(d, e.name, "venture.json"))) return [{ path: rel, dir: true, venture: true }];
      return [{ path: rel, dir: true }, ...walk(dir, rel)];
    }
    return [{ path: rel, dir: false }];
  });
}

/** Checks a venture folder's private folders and reserved names. { errors, warnings, private } */
export function structure(dir) {
  const errors = [], warnings = [], privateFolders = [];
  if (!existsSync(join(dir, "venture.json"))) return { errors: [`${dir} has no venture.json`], warnings, private: privateFolders };
  for (const e of walk(dir)) {
    const segs = e.path.split("/");
    const name = segs.at(-1), parent = segs.slice(0, -1).join("/");
    if (e.venture) continue;
    if (e.dir && isPrivate(name)) privateFolders.push({ folder: `${e.path}/`, holds: PRIVATE[name] ?? "private: never routed, never released (P-22)" });
    if (e.dir && name === "_drafts" && parent) errors.push(`${e.path}/: _drafts/ is reserved for the venture root, where Naive writes held drafts (P-32)`);
    if (!e.dir && segs[0] === "_drafts" && segs.length === 2 && !name.endsWith(".draft") && name !== ".gitkeep") errors.push(`${e.path}: only Naive's .draft files belong in _drafts/ (P-32)`);
    if (e.dir && name === "_streams" && !DATA_PACKAGES.includes(parent)) errors.push(`${e.path}/: _streams/ belongs directly under a data package (${DATA_PACKAGES.join(", ")}) (P-32)`);
    if (!e.dir && ["naive.config.json", "provenance.jsonl", "operating-rules.json"].includes(name) && parent) errors.push(`${e.path}: ${name} is read only at the venture root; move it or rename it (P-32)`);
    if (e.dir && name === ".release" && parent) errors.push(`${e.path}/: .release/ is reserved for the venture root (P-32)`);
    if (RESERVED.future[name] && !segs.some(isPrivate)) warnings.push(`${e.path}: ${name} is reserved for ${RESERVED.future[name]}; rename it so a later Naive does not read it as that (P-32)`);
    if (e.dir) for (const s of RESERVED.shapes) {
      if (!s.re.test(name)) continue;
      if (s.name === "(group)") {
        if (parent) errors.push(`${e.path}/: a route group folder sits at the venture root (P-36)`);
        const inside = readdirSync(ventureFile(dir, e.path)).filter((f) => f !== "AGENTS.md" && f !== ".gitkeep");
        if (inside.length) errors.push(`${e.path}/: ${s.rule}; move ${inside.join(", ")} into its package`);
      } else warnings.push(`${e.path}/: ${s.name} is ${s.rule} (P-32)`);
    }
  }
  return { errors, warnings, private: privateFolders };
}

const PACKAGE_NAMES = () => existsSync(join(repo, "library", "packages")) ? readdirSync(join(repo, "library", "packages")).filter((n) => existsSync(join(repo, "library", "packages", n, "package.json"))) : [];
const pkgOf = (n) => load(join(repo, "library", "packages", n, "package.json"));
const FUNCTIONS = () => load(join(repo, "operations/departments.json")).departments.map((d) => d.id);

/**
 * The manifest venture.json declares (P-3), with what is derived when it does not declare it:
 * identity, phase, governance, function owners, and the packages and kits in use.
 */
export async function manifest(dir) {
  const v = load(join(dir, "venture.json"));
  const names = PACKAGE_NAMES();
  let derived = null;
  if (!v.packages) {
    // The packages that fit the phase now, plus every package that already holds a record.
    const { packages } = await import("./packages.mjs");
    const p = packages(dir);
    const holding = names.filter((n) => { const k = pkgOf(n); return (k.records ?? []).length && existsSync(ventureFile(dir, n)) && readdirSync(ventureFile(dir, n)).some((f) => /\.(json|md|mdx)$/.test(f)); });
    derived = [...new Set([...p.core.filter((x) => x.in === "now").map((x) => x.id), ...holding])];
  }
  const used = v.packages ?? derived;
  const owners = v.functions ?? {};
  const fnOf = (n) => { const k = names.includes(n) ? pkgOf(n) : {}; return k.function ?? k.department ?? null; };
  const solo = !(v.members?.length);
  const functions = [...new Set(used.map(fnOf).filter(Boolean))].map((f) => ({ function: f, owner: owners[f]?.owner ?? (solo ? "the founder" : null), declared: !!owners[f], packages: used.filter((n) => fnOf(n) === f) }));
  for (const [f, o] of Object.entries(owners)) if (!functions.some((x) => x.function === f)) functions.push({ function: f, owner: o.owner, declared: true, packages: [] });
  return {
    identity: { id: v.id, name: v.name, kind: v.kind ?? "venture", parent: v.parent, owner: v.owner, status: v.status },
    phase: v.phase,
    governance: { governed_by: v.governed_by ?? null, legal_form: v.form?.legal_form ?? "none", members: v.members ?? [], decision_rights: existsSync(join(ventureFile(dir, "governance/decision-rights.json"))) ? "governance/decision-rights.json" : "the framework's template" },
    functions,
    packages: { declared: !!v.packages, list: used.map((n) => ({ name: n, kind: names.includes(n) ? pkgOf(n).kind : null, known: names.includes(n) })) },
    kits: (v.kits ?? []).map((k) => ({ ...k, note: "a kit is Mentura's; the framework checks only that it names a package the venture uses" })),
  };
}

/** Errors in what venture.json declares (P-3): unknown packages and functions, kits extending a package not in use, an owner missing. */
export function checkManifest(dir) {
  const v = load(join(dir, "venture.json"));
  const names = PACKAGE_NAMES(), fns = FUNCTIONS();
  const errors = [];
  for (const n of v.packages ?? []) if (!names.includes(n)) errors.push(`venture.json packages: ${n} is not a Naive package (one of ${names.join(", ")})`);
  for (const [f, o] of Object.entries(v.functions ?? {})) {
    if (!fns.includes(f)) errors.push(`venture.json functions: ${f} is not a function (one of ${fns.join(", ")})`);
    if (!o?.owner) errors.push(`venture.json functions: ${f} has no owner; every function has one accountable owner`);
  }
  for (const k of v.kits ?? []) {
    if (!names.includes(k.extends)) errors.push(`venture.json kits: ${k.id} extends ${k.extends}, which is not a Naive package`);
    else if (v.packages && !v.packages.includes(k.extends)) errors.push(`venture.json kits: ${k.id} extends ${k.extends}, which the venture does not list in packages`);
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args[0] === "manifest") {
    if (!args[1] || !existsSync(join(args[1], "venture.json"))) { console.error("usage: node schema/structure.mjs manifest <venture dir>"); process.exit(2); }
    console.log(JSON.stringify(await manifest(args[1]), null, 2));
    process.exit(0);
  }
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir || !existsSync(dir) || !statSync(dir).isDirectory()) { console.error("usage: node schema/structure.mjs <venture dir> [--json] | manifest <venture dir>"); process.exit(2); }
  const s = structure(dir);
  if (existsSync(join(dir, "venture.json"))) s.errors.push(...checkManifest(dir));
  if (args.includes("--json")) console.log(JSON.stringify(s, null, 2));
  else {
    for (const w of s.warnings) console.warn(`warning: ${w}`);
    if (s.errors.length) console.error(s.errors.join("\n"));
    else console.log(`structure holds: ${s.private.length} private folders, no reserved name misused`);
  }
  process.exit(s.errors.length ? 1 : 0);
}
