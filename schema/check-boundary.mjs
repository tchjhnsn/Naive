// The framework/platform boundary (EE-041). Mentura is a framework (conventions that work offline,
// with no account and no named vendor, like Next.js) and a platform that hosts, connects and
// integrates (like Vercel). Both live in this repository; platform code lives in platform/.
//
//   1. Nothing outside platform/ imports from it. The platform builds on the framework, never the
//      other way round. The framework may still load a platform connector by the module path the
//      registry names (knowledge/tooling/integrations.json): that is inversion of control, like a
//      Next.js adapter, and it never fails when the platform is absent from a copy.
//   2. A connector the framework ships (its module outside platform/) works offline and names no
//      vendor: no fetch, no node:http, node:https or node:net, and no credentials.
//   3. Every registered connector module exists.
//
//   node schema/check-boundary.mjs        (EE_ROOT=<dir> checks another copy)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.env.EE_ROOT ?? new URL("..", import.meta.url).pathname;
const PLATFORM = "platform";
const SKIP = /^(\.git|node_modules|\.next|_pagefind|out|generated)$/;
const CODE = /\.(mjs|cjs|js|jsx|ts|tsx)$/;
const errors = [];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => SKIP.test(e.name) ? []
  : e.isDirectory() ? walk(join(d, e.name)) : CODE.test(e.name) ? [join(d, e.name)] : []);
const inPlatform = (abs) => { const r = relative(root, abs); return r === PLATFORM || r.startsWith(PLATFORM + "/"); };

// 1. Imports: static, dynamic with a literal, and require.
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)(["'`])([^"'`]+)\1/gm;
let files = 0;
for (const f of walk(root).filter((f) => !inPlatform(f))) {
  files++;
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(SPEC)) {
    const spec = m[2];
    const target = spec.startsWith(".") ? resolve(dirname(f), spec) : spec.startsWith("/") ? spec : null;
    if (target && inPlatform(target)) errors.push(`${relative(root, f)} imports ${spec}: framework code never imports platform code`);
  }
}

// 2 and 3. Connectors in the registry.
const regFile = join(root, "knowledge/tooling/integrations.json");
const reg = existsSync(regFile) ? JSON.parse(readFileSync(regFile, "utf8")).filter((t) => t.connector) : [];
const NET = /\bfetch\s*\(|["']node:(https?|net|tls|dgram)["']/;
for (const t of reg) {
  const abs = join(root, t.connector.module);
  if (!existsSync(abs)) { errors.push(`integration ${t.id}: connector module ${t.connector.module} does not exist`); continue; }
  if (inPlatform(abs)) continue;
  if (NET.test(readFileSync(abs, "utf8"))) errors.push(`integration ${t.id}: ${t.connector.module} reaches the network, so it belongs in ${PLATFORM}/`);
  if (t.credentials?.length) errors.push(`integration ${t.id}: a framework connector needs no credentials (it names ${t.credentials.join(", ")}), so it belongs in ${PLATFORM}/`);
}

if (errors.length) { for (const e of errors) console.error(e); process.exit(1); }
console.log(`${files} framework code files import nothing from ${PLATFORM}/; ${reg.filter((t) => !inPlatform(join(root, t.connector.module))).length} framework connector(s) work offline.`);
