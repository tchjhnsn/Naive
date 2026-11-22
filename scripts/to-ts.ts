// Converts modules from .mjs to .ts by name: renames each file with git mv and rewrites every reference to it in the
// repository, so the TypeScript migration (EE-087, EE-159) can move many files at once without hand edits.
//
//   node scripts/to-ts.ts <file.mjs>... [--dry-run]
//
// A reference is a path that ends in the file's name and names that file: relative to the referring file
// ("../engine/x.mjs"), from the repository root ("packages/naive/src/engine/x.mjs"), through the package's exports
// ("naive-framework/src/engine/x.mjs"), or the bare name ("x.mjs", "`x.mjs`") when no other tracked file has it.
// References are rewritten in every tracked text file outside repos/ and dist/, except lockfiles; a glob
// ("!**/test.mjs") is a pattern, not a reference, and is left. The compiled package names every
// module .mjs (scripts/build.ts), so an app that imports the old name keeps working.
//
// It renames and rewrites only. Typing the converted file under tsconfig.strict.json is the converter's work, and
// node packages/naive/src/checks/check-types.ts says what is left.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";

const SKIP = /^(repos|dist|node_modules)\/|(^|\/)package-lock\.json$/;
const TEXT = /\.(mjs|cjs|js|ts|tsx|mts|cts|json|jsonl|md|mdx|yml|yaml|feature|sh|txt|toml)$/;
const PATHCHAR = /[A-Za-z0-9_.\-/[\]@]/;

/** One rename: the old path and the new one, both from the repository root. */
export type Rename = { from: string; to: string };

/** The renames for the given .mjs paths. A path that is not .mjs, or whose .ts already exists, is refused. */
export function plan(files: string[], tracked: Set<string>): Rename[] {
  return files.map((f) => {
    const from = posix.normalize(f);
    if (!from.endsWith(".mjs")) throw new Error(`${f}: not a .mjs file`);
    if (!tracked.has(from)) throw new Error(`${f}: not a tracked file`);
    const to = from.replace(/\.mjs$/, ".ts");
    if (tracked.has(to)) throw new Error(`${to} already exists`);
    return { from, to };
  });
}

/** The repository paths that `path`, written in `file`, may name. */
function resolveFrom(file: string, path: string): string[] {
  const out: string[] = [];
  if (path.startsWith("./") || path.startsWith("../")) out.push(posix.normalize(posix.join(posix.dirname(file), path)));
  const pkg = /^naive-framework\/(src|template|lean|library)\/(.*)$/.exec(path);
  if (pkg) out.push({ src: "packages/naive/src/", template: "packages/naive/template/", lean: "packages/naive/lean/", library: "packages/naive/library/" }[pkg[1] as "src"] + pkg[2]);
  else if (path.startsWith("naive-framework/packages/")) out.push(path.slice("naive-framework/".length));
  else out.push(posix.normalize(path));
  return out;
}

/** `text` of `file` with every reference to a renamed module rewritten. */
export function rewrite(file: string, text: string, renames: Rename[], tracked: Set<string>): string {
  const byName = new Map<string, Rename[]>();
  for (const r of renames) byName.set(posix.basename(r.from), [...(byName.get(posix.basename(r.from)) ?? []), r]);
  const owners = new Map<string, number>();
  for (const t of tracked) owners.set(posix.basename(t), (owners.get(posix.basename(t)) ?? 0) + 1);
  let out = "";
  let i = 0;
  const re = /[A-Za-z0-9_.\-[\]@]+\.mjs/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].length;
    if (end < text.length && /[A-Za-z0-9_-]/.test(text[end])) continue;
    const name = m[0];
    const hits = byName.get(name);
    if (!hits) continue;
    let start = m.index;
    while (start > 0 && PATHCHAR.test(text[start - 1])) start--;
    const path = text.slice(start, end);
    const bare = !path.includes("/");
    const target = bare
      ? (owners.get(name) === 1 ? hits[0] : undefined)
      : path.includes("*") ? undefined : hits.find((r) => resolveFrom(file, path).includes(r.from));
    if (!target) continue;
    out += text.slice(i, end - ".mjs".length) + ".ts";
    i = end;
  }
  return out + text.slice(i);
}

function main(argv: string[]): void {
  const dry = argv.includes("--dry-run");
  const files = argv.filter((a) => a !== "--dry-run");
  if (!files.length) { console.error("usage: node scripts/to-ts.ts <file.mjs>... [--dry-run]"); process.exit(2); }
  const root = fileURLToPath(new URL("..", import.meta.url));
  const tracked = new Set(execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean));
  const renames = plan(files, tracked);
  let changed = 0;
  for (const f of tracked) {
    if (SKIP.test(f) || !TEXT.test(f) || !existsSync(posix.join(root, f))) continue;
    const text = readFileSync(posix.join(root, f), "utf8");
    const next = rewrite(f, text, renames, tracked);
    if (next === text) continue;
    changed++;
    if (!dry) writeFileSync(posix.join(root, f), next);
    else console.log(`would rewrite ${f}`);
  }
  for (const r of renames) {
    if (!dry) execFileSync("git", ["mv", r.from, r.to], { cwd: root });
    console.log(`${dry ? "would rename" : "renamed"} ${r.from} -> ${r.to}`);
  }
  console.log(`${renames.length} module(s), ${changed} file(s) with references ${dry ? "to rewrite" : "rewritten"}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
