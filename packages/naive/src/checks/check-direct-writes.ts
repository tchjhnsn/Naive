// Code outside the router writes a venture's records through one writer (the direct-writes design of 2026-11-27,
// shape A). packages/naive/src/store/record-write.ts checks the record against its schema, writes it and appends the
// provenance line with its bytes. This check fails when code writes a file any other way and is not on the list.
//
//   node packages/naive/src/checks/check-direct-writes.ts          check the tracked code, exit 1 on a finding
//   node packages/naive/src/checks/check-direct-writes.ts --list   print every file that writes directly, with its count
//
// What it reads: every tracked .ts file under the units in SCOPE, tests and fixtures left out. In each it counts the
// calls that put bytes on disk: writeFileSync, appendFileSync, renameSync, cpSync, copyFileSync, and the VentureFs
// calls writeText, append and rename. Comment lines are skipped.
//
// What it allows: a file named in packages/naive/src/checks/direct-writes.json with the number of such calls it makes
// and the reason each is not a record write (a cache under .naive/, an append to a log, a moved file, a file outside
// any venture) or cannot move yet. The list may only shrink:
//   a file not on the list that writes directly fails;
//   a listed file that makes more calls than its entry says fails;
//   a listed file that makes fewer fails until its entry is lowered, and one that makes none until its entry is removed;
//   an entry with no reason fails.
//
// What it does not read: packages/naive/src/core (the primitives the writer is made of: the file system service, the
// provenance log, the blob store), packages/naive/src/store/connectors (what the router writes through) and
// packages/naive/src/router (the door itself). It counts calls by name, so a write hidden behind another name
// (a child process, a helper in core) is not seen. It proves nothing about the gate: only the router runs the gate.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export type Entry = { readonly writes: number; readonly why: string };
export type List = { readonly says?: string; readonly files: Readonly<Record<string, Entry>> };

/** The one writer. */
export const WRITER = "packages/naive/src/store/record-write.ts";
/** The list of files that still write directly, each with its reason. */
export const LIST = "packages/naive/src/checks/direct-writes.json";
/** The units whose code must use the writer. */
export const SCOPE: readonly string[] = ["engine", "checks", "functions", "terms", "records", "store", "interfaces"].map((u) => `packages/naive/src/${u}/`);

const SKIP = /(-test\.ts$|\/test\.ts$|\/tests\/|\.steps\.ts$|\/fixtures\/|\/examples\/|\.d\.ts$|^packages\/naive\/src\/store\/connectors\/)/;
const COMMENT = /^\s*(\/\/|\/\*|\*)/;
const CALL = /\b(?:writeFileSync|appendFileSync|renameSync|cpSync|copyFileSync)\s*\(|\.(?:writeText|append|rename)\s*\(/g;
/** Calls named append that put nothing on disk. */
const NOT_A_FILE = /\b(?:searchParams|params|headers|form|formData|body|parent|el|node|list)\.append\s*\(/g;

function tracked(root: string): string[] {
  const out = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  if (out.status !== 0) throw new Error(`git ls-files failed: ${out.stderr}`);
  return out.stdout.split("\n").filter(Boolean);
}

/** True for a file the check reads. */
export const inScope = (file: string): boolean => file.endsWith(".ts") && SCOPE.some((s) => file.startsWith(s)) && !SKIP.test(file) && file !== WRITER;

/** The number of direct write calls in one file's text. */
export function countWrites(text: string): number {
  let n = 0;
  for (const line of text.split("\n")) {
    if (COMMENT.test(line)) continue;
    n += (line.match(CALL)?.length ?? 0) - (line.match(NOT_A_FILE)?.length ?? 0);
  }
  return Math.max(n, 0);
}

/** Every file in scope that writes directly, with its count. */
export function scan(root: string, files: readonly string[] = tracked(root)): Record<string, number> {
  const out: Record<string, number> = {};
  for (const file of files) {
    if (!inScope(file)) continue;
    const full = join(root, file);
    if (!existsSync(full)) continue;
    const n = countWrites(readFileSync(full, "utf8"));
    if (n) out[file] = n;
  }
  return out;
}

export function readList(root: string): List {
  const parsed: unknown = JSON.parse(readFileSync(join(root, LIST), "utf8"));
  if (!parsed || typeof parsed !== "object" || !("files" in parsed) || !parsed.files || typeof parsed.files !== "object") throw new Error(`${LIST} has no files`);
  return parsed as List;
}

export function check(root: string, files: readonly string[] = tracked(root), list: List = readList(root)): string[] {
  const found = scan(root, files);
  const problems: string[] = [];
  for (const [file, n] of Object.entries(found)) {
    const entry = list.files[file];
    if (!entry) problems.push(`${file}: writes a file directly (${n} call${n === 1 ? "" : "s"}); write a venture's record with ${WRITER}, or move the write to the router`);
    else if (n > entry.writes) problems.push(`${file}: makes ${n} direct write calls and ${LIST} allows ${entry.writes}; the new one goes through ${WRITER}`);
    else if (n < entry.writes) problems.push(`${file}: makes ${n} direct write calls and ${LIST} says ${entry.writes}; lower its entry, the list only shrinks`);
  }
  for (const [file, entry] of Object.entries(list.files)) {
    if (!found[file]) problems.push(`${file}: is in ${LIST} but writes nothing directly; remove its entry`);
    if (typeof entry.why !== "string" || entry.why.trim().length < 12) problems.push(`${file}: its entry in ${LIST} gives no reason`);
    if (!Number.isInteger(entry.writes) || entry.writes < 1) problems.push(`${file}: its entry in ${LIST} needs writes, a whole number of 1 or more`);
  }
  return problems;
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === "") {
  const root = fileURLToPath(new URL("../../../..", import.meta.url));
  if (process.argv.includes("--list")) {
    for (const [file, n] of Object.entries(scan(root))) console.log(`${String(n).padStart(3)}  ${file}`);
    process.exit(0);
  }
  const problems = check(root);
  for (const p of problems) console.error(`FAIL  ${p}`);
  if (problems.length) process.exit(1);
  const list = readList(root);
  const files = Object.keys(list.files).length;
  const calls = Object.values(list.files).reduce((a, e) => a + e.writes, 0);
  console.log(`pass  direct writes: no code outside the router writes a file except through ${WRITER} or as one of the ${calls} calls in ${files} files that ${LIST} names`);
}
