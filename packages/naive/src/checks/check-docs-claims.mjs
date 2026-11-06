#!/usr/bin/env node
// Checks that the docs describe only what is built. Scans docs/master/*.md,
// packages/naive/library/packages/*/playbooks/*.md, every SKILL.md and every README.md for claims in backticks and code blocks, and fails on any that the code does not have:
//
//   naive <cmd> / mentura <cmd>   the command is dispatched by packages/naive/src/interfaces/cli/naive.mjs or mentura.mjs
//   --flag after a naive command  the command (or the script it runs) reads that flag
//   schema/..., interface/..., purpose/..., packages/naive/library/packages/..., docs/...   the repository path exists
//   foundation/problem            a record route in the route table (packages/naive/src/records/routes/routes.mjs routes())
//   [text](../other/README.md)    a relative Markdown link, inline or reference-style, resolves to a file or folder
//                                 next to the doc (HTML href and src are not checked)
//
// Venture-relative paths (k-base/, meta/, codebase/, artifacts/, ...) and placeholders (<id>) are allowed.
// A line describing something not built says "not built", or carries <!-- claim-ok: reason -->.
//
//   node packages/naive/src/checks/check-docs-claims.mjs [--root <dir>] [files...]
//   node packages/naive/src/checks/check-docs-claims.mjs --scanned < paths   prints the repo-relative paths this linter scans
//   node packages/naive/src/checks/check-docs-claims.mjs --code < paths      prints the changed paths the docs-required check counts as code
//   node packages/naive/src/checks/check-docs-claims.mjs --readmes < paths   prints the README.md nearest each changed code file that
//                                                         the change leaves untouched (docs next to the code)
// Prints each failure as file:line: claim: why. Exit 1 if any.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const argv = process.argv.slice(2);
const ri = argv.indexOf("--root");
const repo = ri >= 0 ? argv[ri + 1] : new URL("../../../..", import.meta.url).pathname;
const only = argv.filter((a, i) => a !== "--root" && argv[i - 1] !== "--root");
const read = (p) => readFileSync(join(repo, p), "utf8");

const walk = (d) => !existsSync(d) ? [] : readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.name === "node_modules" || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
// The docs this linter scans. The docs-required CI check counts a change as docs only when it touches one of these.
const scanned = (r) => !r.split("/").some((p) => p === "node_modules" || p.startsWith(".")) && (/^docs\/master\/[^/]+\.md$/.test(r) || /(^|\/)(SKILL|README)\.md$/.test(r) || /^packages\/naive\/library\/packages\/[^/]+\/playbooks\/[^/]+\.md$/.test(r));
const stdinPaths = () => readFileSync(0, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
if (argv[0] === "--scanned") {
  for (const r of stdinPaths()) if (scanned(r)) console.log(r);
  process.exit(0);
}
// The README.md nearest a code file, searched up to its top-level folder (never the repo root README).
// Anything under a playbooks/ folder is content, not code (Torian's decision for now).
const CODE = /^(schema|interface|packages|purpose)\/(?!(?:.*\/)?playbooks\/).*(?<!\.mdx?)$/;
const nearestReadme = (r) => {
  for (let d = r.split("/").slice(0, -1); d.length; d.pop()) if (existsSync(join(repo, ...d, "README.md"))) return [...d, "README.md"].join("/");
  return null;
};
if (argv[0] === "--code") {
  for (const r of stdinPaths()) if (CODE.test(r)) console.log(r);
  process.exit(0);
}
if (argv[0] === "--readmes") {
  const changed = stdinPaths();
  const owed = new Set(changed.filter((r) => CODE.test(r)).map(nearestReadme).filter((r) => r && !changed.includes(r)));
  for (const r of [...owed].sort()) console.log(r);
  process.exit(0);
}
const docs = only.length ? only.map((f) => f.startsWith("/") ? f : join(repo, f)) : walk(repo).filter((f) => scanned(relative(repo, f)));

// --- What the code has ---
const naiveSrc = read("packages/naive/src/interfaces/cli/naive.mjs");
const menturaSrc = read("packages/naive/src/interfaces/cli/mentura.mjs");
const literals = (src) => new Set([...src.matchAll(/cmd === "([a-z-]+)"/g)].map((m) => m[1])
  .concat([...src.matchAll(/\[((?:"[a-z-]+",?\s*)+)\]\.includes\(cmd\)/g)].flatMap((m) => [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]))));
const naiveCmds = literals(naiveSrc);
const menturaCmds = literals(menturaSrc);
const { routes, resolve } = await import(join(repo, "packages/naive/src/records/routes/routes.mjs"));
const table = routes();
const routeTop = new Set(table.map((r) => r.route.split("/")[0]));
// packages/<name> is a route alias for a venture package (packages/naive/src/router/package-routes.mjs), not a folder: the
// packages live at packages/naive/library/packages/<name> (EE-116).
const packageAlias = (c) => /^packages\/[a-z0-9-]+$/.test(c) && existsSync(join(repo, "packages/naive/library", c, "package.json"));
const isRoute = (c) => !!resolve(c.replace(/<[^>]+>/g, "x")).r || table.some((r) => r.route === c.replace(/<[^>]+>/g, "[id]")) || packageAlias(c);

// The flags a naive command reads: in naive.mjs's branch for it and in the scripts that branch runs.
// Only flag definitions count: a literal --name, or a name passed to a flag reader. Any other string is not a flag.
const flagWords = (src) => new Set([...src.matchAll(/--([a-z][a-z-]*)/g), ...src.matchAll(/(?<![\w.])(?:opt|flag|has|pass)\(\s*"([a-z][a-z-]*)"/g)].map((m) => m[1]));
const branchOf = (cmd) => {
  const lines = naiveSrc.split("\n");
  const start = lines.findIndex((l) => new RegExp(`cmd === "${cmd}"`).test(l) && /if \(/.test(l));
  if (start < 0) return "";
  let end = lines.findIndex((l, i) => i > start && /^(\} )?else|^\}/.test(l));
  return lines.slice(start, end < 0 ? undefined : end).join("\n").replaceAll("${cmd}", cmd);
};
const fnSrc = (name) => { const m = naiveSrc.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}`)); return m ? m[0] : ""; };
const flagCache = {};
function flagsOf(cmd) {
  if (flagCache[cmd]) return flagCache[cmd];
  const branch = branchOf(cmd);
  let src = branch + [...branch.matchAll(/\b([a-zA-Z]+)\(here\(\)\)|\b(dev|check|info)\(/g)].map((m) => fnSrc(m[1] ?? m[2])).join("\n") + fnSrc("here");
  for (const [, s] of branch.matchAll(/"((?:schema|interface|packages\/naive\/src\/[a-z]+)\/[^"]+\.mjs)"/g)) if (existsSync(join(repo, s))) src += read(s);
  for (const [, s] of branch.matchAll(/`((?:schema|packages\/naive\/src\/[a-z]+)\/[^`]+\.mjs)`/g)) if (existsSync(join(repo, s))) src += read(s);
  return (flagCache[cmd] = flagWords(src));
}

// --- The claims ---
const REPO_DIRS = ["schema", "interface", "purpose", "packages", "docs"];
const VENTURE = /^(k-base|meta|codebase|artifacts|raw|inbox|founder|_drafts|_private|my-|\.release|\.naive|operations|evidence)\b/;
const failures = [];
let claims = 0;
const fail = (f, n, claim, why) => failures.push(`${relative(repo, f)}:${n}: ${claim}: ${why}`);

function checkCommand(f, n, line) {
  for (const m of line.matchAll(/(?:^|[\s`(|;&$])(?:npx )?(naive|mentura) ([a-z][a-z-]*)((?:\s+(?:"[^"]*"|'[^']*'|<[^>]+>|\[[^\]]*\]|[^\s`|;&#]+))*)/g)) {
    const [, bin, cmd, tail] = m;
    claims++;
    if (bin === "naive") {
      if (!naiveCmds.has(cmd)) { fail(f, n, `naive ${cmd}`, "packages/naive/src/interfaces/cli/naive.mjs has no such command"); continue; }
      const known = flagsOf(cmd);
      for (const [, fl] of (tail ?? "").replace(/"[^"]*"|'[^']*'|\[[^\]]*\]/g, (s) => s.startsWith("[") ? s.slice(1, -1) : "").matchAll(/(?:^|\s)--([a-z][a-z-]*)/g)) {
        claims++;
        if (!known.has(fl)) fail(f, n, `naive ${cmd} --${fl}`, `naive ${cmd} never reads --${fl}`);
      }
    } else if (!menturaCmds.has(cmd) && !routeTop.has(cmd) && !isRoute(cmd) && cmd !== "venture") fail(f, n, `mentura ${cmd}`, "packages/naive/src/interfaces/cli/mentura.mjs has no such command or route");
  }
}

const INLINE_LINK = /\]\(\s*(?:<([^>\n]+)>|((?:[^()\s]|\([^()\s]*\))+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const LINK_DEFINITION = /^ {0,3}\[(?!\^)[^\]]+\]:\s*(?:<([^>\n]+)>|(\S+))/g;

function checkLink(f, n, t) {
  if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(t)) return;
  claims++;
  let path;
  try { path = decodeURIComponent(t.split(/[?#]/)[0]); } catch { return fail(f, n, t, "the link has malformed percent-encoding"); }
  const to = join(f, "..", path);
  const targets = f.endsWith(".mdx") ? [to, `${to}.mdx`, join(to, "index.mdx")] : [to];
  if (!targets.some((x) => existsSync(x))) fail(f, n, t, "the link points at nothing");
}

function checkInline(f, n, c) {
  c = c.trim();
  if (/^(naive|mentura|npx) /.test(c)) return checkCommand(f, n, c);
  const top = c.split("/")[0];
  if (REPO_DIRS.includes(top) && c.includes("/") && !/[<*{$\s]/.test(c)) {
    claims++;
    if (!existsSync(join(repo, c.replace(/[#:].*$/, ""))) && !isRoute(c.replace(/\.(json|md)$/, ""))) fail(f, n, c, "no such file in the repository, and not a route");
    return;
  }
  if (VENTURE.test(c) || /[<\s.@:]/.test(c)) return;
  if (/^[a-z][a-z0-9-]*(\/[a-z0-9-]+|\/\[id\])+$/.test(c) && routeTop.has(top)) {
    claims++;
    if (!isRoute(c)) fail(f, n, c, "not a route in the route table (packages/naive/src/records/routes/routes.mjs)");
  }
}

for (const f of docs) {
  const lines = readFileSync(f, "utf8").split("\n");
  let fence = null;
  lines.forEach((line, i) => {
    const n = i + 1;
    if (/^\s*(```|~~~)/.test(line)) { fence = fence ? null : line.trim().slice(3) || "text"; return; }
    if (/claim-ok:|not built/i.test(line)) return;
    if (fence) { if (!/^(json|ts|js|tsx|jsx|yaml|mermaid)$/.test(fence)) checkCommand(f, n, line); return; }
    for (const [, c] of line.matchAll(/`([^`\n]+)`/g)) checkInline(f, n, c);
    const prose = line.replace(/`[^`\n]+`/g, "");
    for (const [, angled, bare] of [...prose.matchAll(INLINE_LINK), ...prose.matchAll(LINK_DEFINITION)]) checkLink(f, n, angled ?? bare);
  });
}

for (const x of failures) console.log(x);
console.log(`${failures.length ? "FAIL" : "pass"}  ${claims} claims in ${docs.length} docs checked against the code${failures.length ? `, ${failures.length} not built` : ""}`);
process.exit(failures.length ? 1 : 0);
