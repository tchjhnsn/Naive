// The record types' paths go through one resolver (monorepo rebuild step 5a-1,
// design docs/design/MONOREPO_RECORDS_PACKAGE_2026-11-05.md in PR #243). Code that reads a framework schema file or the data model
// asks packages/naive/src/records/index.mjs where it is, so the record types can move in one change. This check fails when
// code outside the resolver builds such a path from the folder name.
//
//   node packages/naive/src/checks/check-record-paths.ts     check the tracked code, exit 1 on a finding
//
// What counts as building a record path (comment lines are skipped):
//   folder argument   the folder name as its own argument next to a schema name: join(root, "schema", name)
//   path literal      a whole string or template that is a path to a schema file or the data model, passed as an
//                     argument or listed in an array: join(root, "schema/x.schema.json"), "../schema/data-model.json",
//                     `schema/${name}.schema.json`, new URL("../records/data-model.json", import.meta.url)
//   concatenation     the folder joined with +: "schema/" + name + ".schema.json"
//   stored prefix     a stored path read by its prefix instead of through recordRelative or schemaNameOf:
//                     schema.replace(/^schema\//, ""), schema.startsWith("schema/"), "schema/".length, and in
//                     Python startswith("schema/")
//   python path       pathlib division by the folder: root / "schema" or root / "packages/naive/src/records/data-model.json"
// A bare name ("venture.schema.json") is not a path: packages/naive/src/records/validate.mjs and the resolver look names up.
// A message that mentions a path inside a sentence is not an argument by itself, so it is not a finding.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export type Finding = { readonly file: string; readonly line: number; readonly kind: string; readonly text: string };

/** The resolver itself: the one file that may name the folder. */
export const RESOLVER = "packages/naive/src/records/index.mjs";

/** Files that name the folder on purpose, each with its reason. A fixture or a venture's own file belongs here. */
export const ALLOW: Readonly<Record<string, string>> = {
  "packages/naive/src/checks/check-record-paths-test.ts": "the check's test: it writes copies whose code builds record paths, to prove the check fails on them",
  "packages/naive/src/checks/docs-claims-test.mjs": "a test of the docs-claims checker: it passes packages/naive/src/records/playbook.schema.json as a changed file name, not to read it",
};

const CODE = /\.(mjs|cjs|js|ts|tsx|py)$/;
const SKIP = /(^|\/)(node_modules|\.next|out|_pagefind)\//;
const PRESERVED = "docs/design/preserved/";
const COMMENT = /^\s*(\/\/|\/\*|\*|#)/;

const Q = "[\"'`]";
/** The record types' folder as code may name it: today's, and the one it had before EE-118 step 5. */
const F = "(?:packages/naive/src/records|schema)";
const FE = "(?:packages\\/naive\\/src\\/records|schema)";
const PATTERNS: readonly { readonly kind: string; readonly re: RegExp; readonly py?: boolean }[] = [
  { kind: "folder argument", re: new RegExp(`[(,]\\s*${Q}${F}${Q}\\s*,\\s*([\\w.]*(schema|data-?model)\\w*\\s*[,)]|${Q}[^"'\`]*(\\.schema\\.json|data-model\\.json)${Q})`, "i") },
  { kind: "path literal", re: new RegExp(`[(,[]\\s*(${Q})(\\.{1,2}/)*${F}/[^"'\`\\s]*?(\\.schema\\.json|data-model\\.json)\\1`) },
  { kind: "path literal", re: new RegExp(`[(,[]\\s*(${Q})\\.{1,2}/([\\w.-]+/)*([\\w.\${}-]+\\.schema\\.json|data-model\\.json)\\1`) },
  { kind: "concatenation", re: new RegExp(`${Q}(\\.{1,2}/)*${F}/${Q}\\s*\\+|\\+\\s*${Q}(\\.{1,2}/)*${F}/${Q}`) },
  { kind: "stored prefix", re: new RegExp(`replace\\(\\s*/\\^${FE}\\\\/\\/|[sS]chema\\??\\.startsWith\\(\\s*${Q}${F}/${Q}|${Q}${F}/${Q}\\.length`) },
  { kind: "python path", re: new RegExp(`\\/\\s*["']${F}(\\/[^"']*)?["']`), py: true },
  { kind: "stored prefix", re: new RegExp(`startswith\\(\\s*["']${F}\\/["']\\s*\\)`), py: true },
];

function tracked(root: string): string[] {
  const out = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  if (out.status !== 0) throw new Error(`git ls-files failed: ${out.stderr}`);
  return out.stdout.split("\n").filter(Boolean);
}

/** The findings in the given repository files (default: every tracked code file). */
export function scan(root: string, files: readonly string[] = tracked(root), allow: Readonly<Record<string, string>> = ALLOW): Finding[] {
  const out: Finding[] = [];
  for (const file of files) {
    if (!CODE.test(file) || SKIP.test(file) || file.startsWith(PRESERVED) || file === RESOLVER || allow[file]) continue;
    const full = join(root, file);
    if (!existsSync(full)) continue;
    const py = file.endsWith(".py");
    readFileSync(full, "utf8").split("\n").forEach((text, i) => {
      if (COMMENT.test(text)) return;
      const hit = PATTERNS.find((p) => (p.py ?? false) === py && p.re.test(text));
      if (hit) out.push({ file, line: i + 1, kind: hit.kind, text: text.trim().slice(0, 160) });
    });
  }
  return out;
}

/** Allowlist entries that no longer name a tracked file, so the list only holds live reasons. */
export function staleAllow(root: string, files: readonly string[] = tracked(root), allow: Readonly<Record<string, string>> = ALLOW): string[] {
  const have = new Set(files);
  return Object.keys(allow).filter((f) => !have.has(f));
}

export function check(root: string, files: readonly string[] = tracked(root)): string[] {
  return [
    ...scan(root, files).map((f) => `${f.file}:${f.line}: builds a record path from the folder name (${f.kind}); use ${RESOLVER}: ${f.text}`),
    ...staleAllow(root, files).map((f) => `${f}: is allowlisted in packages/naive/src/checks/check-record-paths.ts but is not tracked; remove its entry`),
  ];
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === "") {
  const root = fileURLToPath(new URL("../../../..", import.meta.url));
  const problems = check(root);
  for (const p of problems) console.error(`FAIL  ${p}`);
  if (problems.length) process.exit(1);
  console.log(`pass  record paths: no code outside ${RESOLVER} builds a schema or data-model path from the folder name`);
}
