// The compiled package (EE-159). Node does not strip types under node_modules, where a venture installs Naive, so
// the package ships dist/: a mirror of the source files npm ships, at the same relative paths, with every code file
// compiled to JavaScript (.ts to .mjs, .mjs stays .mjs) and every other file copied unchanged. A module that finds a
// JSON file, a template or a script by its place in the tree (new URL("../../../..", import.meta.url)) finds it in
// dist/ too. The package's exports and bin point into dist/; the repository's own tests and CLIs run the source.
//
//   node scripts/build.ts            (npm run build; npm runs it as prepare, so a git dependency builds on install)
//
// The mirror is what `npm pack` lists from the package.json files field, less dist/ itself and packages/naive/test/
// (verification fixtures, not runtime). Code is every .ts and .mjs outside fixtures/, except declaration files and
// recipes (*.recipe.ts), which are data that Naive reads as text.
//
// Compiling: tsc with noCheck (type checking is check-types.ts's job). Every compiled file is .mjs, so a module
// converted from .mjs to .ts keeps the path an app already imports it by. After tsc, a string literal that names a
// compiled .ts file by its path from the file or from the package root (import "./x.ts", or
// "packages/naive/src/engine/trace-cli.ts", a script to spawn) is renamed to .mjs, found by parsing each output
// file, never by a text search. The build then fails if a relative import in
// dist/ names a file that is not there.
//
// It is safe to rerun: a build whose inputs match dist/.build-stamp does nothing, and a new build is written beside
// dist/ and renamed into place, so parallel runs (npm pack from several tests) never see a half-written tree.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIST = "dist";
const STAMP = ".build-stamp";

/** One file of the mirror: its path from the package root, and whether it is compiled or copied. */
type Entry = { path: string; kind: "compile" | "copy" };

/** Whether a shipped file is code to compile. */
export const isCode = (path: string): boolean =>
  /\.(ts|mjs)$/.test(path) && !path.endsWith(".d.ts") && !path.endsWith(".recipe.ts") && !path.split("/").includes("fixtures");

/**
 * The compiled file's path: .ts becomes .mjs, .mjs stays. Every compiled file is .mjs, so a module converted from
 * .mjs to .ts keeps the path an app imports it by, and a .ts name resolves through exports to the same file.
 */
export const outPath = (path: string): string => path.replace(/\.ts$/, ".mjs");

/** Set in the listing's environment: npm 10 runs prepare even for `npm pack --dry-run --ignore-scripts`. */
const LISTING = "NAIVE_BUILD_LISTING";

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/**
 * The real paths behind one path from npm's listing. npm 11 redacts anything shaped like a UUID as `***`, because a
 * legacy npm token is one, and it does so in `--json` output too, so a record named by its id
 * (calendar/events/<uuid>.json) comes back as `***.json`. A listed path that exists is itself; one that holds `***`
 * is matched against its folder with a UUID in each `***`. Anything else is returned as listed, and reading it fails.
 */
export function unredact(root: string, path: string): string[] {
  if (!path.includes("***") || existsSync(join(root, path))) return [path];
  const dir = posix.dirname(path);
  const name = posix.basename(path);
  if (dir.includes("***")) return [path];
  const pattern = new RegExp(`^${name.split("***").map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(UUID)}$`);
  const found = existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => pattern.test(f)).sort() : [];
  return found.length ? found.map((f) => (dir === "." ? f : `${dir}/${f}`)) : [path];
}

/** The source files npm ships, from `npm pack --dry-run`, less dist/ and the verification fixtures. */
function shipped(root: string): Entry[] {
  // npm's own CLI when npm runs this as prepare; pnpm and yarn set npm_execpath to theirs, whose pack lists differently.
  const npm = /npm-cli\.js$/.test(process.env.npm_execpath ?? "") ? process.env.npm_execpath : undefined;
  const args = ["pack", "--dry-run", "--json", "--ignore-scripts", "--loglevel", "silent"];
  const opts = { cwd: root, encoding: "utf8" as const, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, [LISTING]: "1" } };
  const r = npm ? spawnSync(process.execPath, [npm, ...args], opts) : spawnSync("npm", args, opts);
  if (r.status !== 0) throw new Error(`npm pack --dry-run failed: ${r.stderr}`);
  const listing = JSON.parse(r.stdout) as Array<{ files: Array<{ path: string }> }>;
  const paths = [...new Set((listing[0]?.files ?? []).flatMap((f) => unredact(root, f.path)))]
    .filter((p) => !p.startsWith(`${DIST}/`) && !p.startsWith("packages/naive/test/"));
  return paths.sort().map((path) => ({ path, kind: isCode(path) ? "compile" : "copy" }));
}

/** The hash of everything a build reads: each input's path and bytes, this script and the compiler's version. */
function stampOf(root: string, entries: Entry[]): string {
  const h = createHash("sha256").update(ts.version).update(readFileSync(fileURLToPath(import.meta.url)));
  for (const e of entries) h.update(e.path).update("\0").update(readFileSync(join(root, e.path))).update("\0");
  return h.digest("hex");
}

/** A replacement of the text between two offsets. */
type Splice = { start: number; end: number; text: string };

/** The specifier of an import, export, import() or require() call, when it is a string literal. */
function moduleSpecifier(node: ts.Node): ts.StringLiteralLike | null {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) return node.moduleSpecifier;
  if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
    const callee = node.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(callee) && callee.text === "require")) return node.arguments[0];
  }
  return null;
}

/**
 * Renames string literals that name a compiled .ts file to .mjs, and lists relative module specifiers that name
 * no file in the output. `file` is the output path from the package root; `compiled` holds source .ts paths and
 * `outputs` every path in the output.
 */
export function rewrite(file: string, text: string, compiled: Set<string>, outputs: Set<string>): { text: string; missing: string[] } {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const splices: Splice[] = [];
  const missing: string[] = [];
  const dir = posix.dirname(file);
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteralLike(node) && node.text.endsWith(".ts") && !node.text.endsWith(".d.ts")) {
      const raw = text.slice(node.getStart(source) + 1, node.getEnd() - 1);
      const named = [posix.normalize(posix.join(dir, node.text)), posix.normalize(node.text)];
      if (raw === node.text && named.some((p) => compiled.has(p))) splices.push({ start: node.getStart(source) + 1, end: node.getEnd() - 1, text: outPath(node.text) });
    }
    const spec = moduleSpecifier(node);
    if (spec && /^\.\.?\//.test(spec.text)) {
      const target = posix.normalize(posix.join(dir, outPath(spec.text)));
      if (!outputs.has(target)) missing.push(`${file}: ${spec.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  let out = text;
  for (const s of splices.sort((a, b) => b.start - a.start)) out = out.slice(0, s.start) + s.text + out.slice(s.end);
  return { text: out, missing };
}

/**
 * Renames JSON string values that name a compiled .ts file from the package root to .mjs, so data that points at a
 * module (a connector's `module`, a migration's `module`) names the file the compiled package holds. Only whole
 * strings change; every other byte is kept.
 */
export function rewriteJson(text: string, compiled: Set<string>): string {
  return text.replace(/"((?:[^"\\]|\\.)+\.ts)"/g, (m: string, s: string) => (compiled.has(posix.normalize(s)) ? `"${outPath(s)}"` : m));
}

/** Compiles the code entries into `out` with tsc. */
function compile(root: string, out: string, code: Entry[]): void {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowJs: true,
    checkJs: false,
    noCheck: true,
    noResolve: true,
    types: [],
    erasableSyntaxOnly: true,
    verbatimModuleSyntax: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    rootDir: root,
    outDir: out,
    newLine: ts.NewLineKind.LineFeed,
  };
  const program = ts.createProgram(code.map((e) => join(root, e.path)), options);
  const result = program.emit();
  const errors = [...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics(), ...result.diagnostics]
    .filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(ts.formatDiagnostics(errors, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => "\n" }));
}

/** dist/package.json: the root manifest without what makes it a second entry point (exports, bin, scripts, files). */
function manifest(root: string): string {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as Record<string, unknown>;
  for (const k of ["exports", "bin", "scripts", "files"]) delete pkg[k];
  return JSON.stringify(pkg, null, 2) + "\n";
}

/** Builds dist/ under `root` unless it is current. Returns what it did. */
export function build(root: string = ROOT): { built: boolean; files: number } {
  const entries = shipped(root);
  const stamp = stampOf(root, entries);
  const dist = join(root, DIST);
  const current = (): boolean => existsSync(join(dist, STAMP)) && readFileSync(join(dist, STAMP), "utf8").trim() === stamp;
  if (current()) return { built: false, files: entries.length };

  const tmp = join(root, `.dist-tmp-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  try {
    const code = entries.filter((e) => e.kind === "compile");
    const clash = code.filter((e) => e.path.endsWith(".ts") && code.some((o) => o.path === outPath(e.path)));
    if (clash.length) throw new Error(`a .ts and a .mjs file share a name, so both would compile to one file:\n${clash.map((e) => e.path).join("\n")}`);
    compile(root, tmp, code);
    // tsc writes x.ts as x.js; the compiled package names it x.mjs (outPath).
    for (const e of code.filter((x) => x.path.endsWith(".ts"))) {
      const js = join(tmp, e.path.replace(/\.ts$/, ".js"));
      if (existsSync(js)) renameSync(js, join(tmp, outPath(e.path)));
    }
    // Data after code: tsc also writes the JSON files that code imports, and the copy keeps their bytes exact.
    const compiled = new Set(code.filter((e) => e.path.endsWith(".ts")).map((e) => e.path));
    for (const e of entries.filter((x) => x.kind === "copy")) {
      mkdirSync(dirname(join(tmp, e.path)), { recursive: true });
      if (e.path.endsWith(".json")) writeFileSync(join(tmp, e.path), rewriteJson(readFileSync(join(root, e.path), "utf8"), compiled));
      else copyFileSync(join(root, e.path), join(tmp, e.path));
    }
    const outputs = new Set(entries.map((e) => (e.kind === "compile" ? outPath(e.path) : e.path)));
    const missing: string[] = [];
    for (const e of code) {
      const file = join(tmp, outPath(e.path));
      if (!existsSync(file)) { missing.push(`${outPath(e.path)}: tsc wrote nothing`); continue; }
      const r = rewrite(outPath(e.path), readFileSync(file, "utf8"), compiled, outputs);
      missing.push(...r.missing);
      writeFileSync(file, r.text);
    }
    if (missing.length) throw new Error(`relative imports that name no file in ${DIST}/:\n${missing.join("\n")}`);
    writeFileSync(join(tmp, "package.json"), manifest(root));
    writeFileSync(join(tmp, STAMP), stamp + "\n");
    // Into place: a parallel build that finished first with the same inputs wins, and a stale dist/ is replaced.
    if (current()) return { built: false, files: entries.length };
    if (existsSync(dist)) {
      const old = join(root, `.dist-old-${process.pid}`);
      renameSync(dist, old);
      renameSync(tmp, dist);
      rmSync(old, { recursive: true, force: true });
    } else {
      try { renameSync(tmp, dist); } catch (e) { if (!current()) throw e; }
    }
    return { built: true, files: entries.length };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url) && !process.env[LISTING]) {
  try {
    const r = build();
    // stderr only: npm pack prints the tarball's name on stdout, and callers read it.
    console.error(r.built ? `built ${DIST}/ from ${r.files} files` : `${DIST}/ is current (${r.files} files)`);
  } catch (e) {
    console.error(`build failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
