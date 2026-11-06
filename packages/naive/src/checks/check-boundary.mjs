// The boundary between Naive and the apps that use it (EE-041, EE-118). Naive is the framework: it
// works offline, with no account and no named vendor, like Next.js. Mentura's console and platform
// (hosting, vendor connectors, integrations) live in another repository and depend on Naive by version,
// never the other way round.
//
//   1. No code names an app's module. An import (static, dynamic or require) or a string literal in
//      code that names a path under one of APP_FOLDERS fails, and so does a relative import that leaves
//      the repository. Comments are not code. An app hands Naive its modules by configuration instead:
//      an environment variable such as NAIVE_JUDGE_CMD, or a hook it calls such as registerConnector
//      (packages/naive/src/store/connectors/index.mjs).
//   2. Every connector the registry names (knowledge/tooling/integrations.json) is a module in this
//      repository that works offline and names no vendor: no fetch, no node:http, node:https or
//      node:net, and no credentials. A vendor connector is the app's, registered at run time.
//
//   node packages/naive/src/checks/check-boundary.mjs        (EE_ROOT=<dir> checks another copy)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(process.env.EE_ROOT ?? new URL("../../../..", import.meta.url).pathname);
/** Folders of the apps that depend on Naive; none of them is in this repository. */
export const APP_FOLDERS = ["platform", "console"];
const SKIP = /^(\.git|node_modules|\.next|_pagefind|out|generated|preserved)$/;
const CODE = /\.(mjs|cjs|js|jsx|ts|tsx|mts|cts)$/;
const errors = [];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => SKIP.test(e.name) ? []
  : e.isDirectory() ? walk(join(d, e.name)) : CODE.test(e.name) ? [join(d, e.name)] : []);

// Comments dropped, line by line: a line that starts a comment (//, /* or a block comment's *), and a
// trailing comment after whitespace. A URL in a string keeps its // because a colon comes before it.
const code = (src) => src.split("\n").map((l) => /^\s*(\/\/|\/\*|\*)/.test(l) ? "" : l.replace(/\s\/\/\s.*$/, "")).join("\n");

const app = APP_FOLDERS.join("|");
// A literal that is an app path: optional ./ or ../ segments, then the app folder and a slash.
const LITERAL = new RegExp(`(["'\`])((?:\\.{1,2}/)*(?:${app})/[^"'\`\\s]*)\\1`, "g");
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(["'`])([^"'`]+)\1/gm;
let files = 0;
for (const f of walk(root)) {
  files++;
  const rel = relative(root, f);
  const src = code(readFileSync(f, "utf8"));
  for (const m of src.matchAll(LITERAL)) errors.push(`${rel} names ${m[2]}: Naive never names an app's module; take it by configuration`);
  for (const m of src.matchAll(SPEC)) {
    const spec = m[2];
    if (!spec.startsWith(".")) continue;
    const out = relative(root, resolve(dirname(f), spec));
    if (out.startsWith("..")) errors.push(`${rel} imports ${spec}, outside the repository: Naive never imports an app's code`);
  }
}

// 2. Connectors in the registry.
const regFile = join(root, "knowledge/tooling/integrations.json");
const reg = existsSync(regFile) ? JSON.parse(readFileSync(regFile, "utf8")).filter((t) => t.connector) : [];
const NET = /\bfetch\s*\(|["']node:(https?|net|tls|dgram)["']/;
for (const t of reg) {
  const abs = resolve(root, t.connector.module);
  if (relative(root, abs).startsWith("..") || !existsSync(abs)) { errors.push(`integration ${t.id}: connector module ${t.connector.module} is not in this repository`); continue; }
  if (NET.test(readFileSync(abs, "utf8"))) errors.push(`integration ${t.id}: ${t.connector.module} reaches the network, so it belongs to the app, which registers it`);
  if (t.credentials?.length) errors.push(`integration ${t.id}: a Naive connector needs no credentials (it names ${t.credentials.join(", ")}), so it belongs to the app, which registers it`);
}

if (errors.length) { for (const e of errors) console.error(e); process.exit(1); }
console.log(`${files} code files name no app module (${APP_FOLDERS.join(", ")}); ${reg.length} connector(s) in the registry work offline.`);
