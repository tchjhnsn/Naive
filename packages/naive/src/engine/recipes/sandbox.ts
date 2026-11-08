// The recipe sandbox host: lint a recipe, strip its types, turn its exports into a script, and run a batch of
// calls in one child process under Node's permission model. Design: everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The recipe" and "The sandbox (Naive)" (build plan item 4).
//
// A recipe is one TypeScript module that exports `hears`, `knobs` and a synchronous default function
// `(input, knobs) => { record, receptions }`. This module runs it and answers `{ ok: true, output }` or
// `{ ok: false, reason }`; a throw, a timeout, a crash or an output that breaks the contract all fail.
//
// The layers, outermost first:
//   1. Lint: a size bound, no import of any kind, no name that starts with __naive, only the export forms
//      below, and no string, template or regular expression literal that holds a subject id or signal address
//      passed in the options.
//   2. One child process per batch: `node --permission` with no file system, child process, worker or addon
//      grant, an environment of only TZ=UTC, a heap cap, a wall-time kill and an output cap. JSON crosses on
//      stdin and stdout. The child's own code arrives with -e, so it needs no read grant.
//   3. A fresh vm realm per call: an ordinary global object (vm.constants.DONT_CONTEXTIFY), string and wasm
//      code generation off, microtasks drained inside the call's timeout. A prelude makes the clock and
//      Math.random throw and removes Intl, the locale methods, WeakRef, FinalizationRegistry,
//      SharedArrayBuffer, Atomics, WebAssembly, console and eval. Values cross only as strings.
//   4. The output check: JSON with exactly `record` (an object or null) and `receptions`, one reception per
//      heard signal, then the caller's record hook (schema validation is the caller's job).
// Node's docs say vm is not a security boundary, so this is layered defence. QuickJS compiled to wasm behind
// the same interface is the hardening path (not built).
//
// Imports nothing in the repository.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import * as nodeModule from "node:module";

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type JsonObject = { [k: string]: Json };
// `reason` and `output` are on both arms so the non-strict type pass can read them; strict mode narrows on `ok`.
export type Result<T> = { ok: true; output: T; reason?: undefined } | { ok: false; reason: string; output?: undefined };

/** What a recipe call returns once it passed every check. Record and reception types come from their schemas. */
export interface RecipeOutput { record: JsonObject | null; receptions: JsonObject[] }
/** A recipe's two data exports, read in the sandbox. */
export interface RecipeExports { hears: JsonObject; knobs: JsonObject }
/** One call in a batch: the input, and the knobs to run with (null runs the recipe's own `knobs`). */
export interface RecipeCall { input: unknown; knobs: JsonObject | null }

export interface SandboxOptions {
  /** Subject ids no literal in the recipe may hold. */
  subjects?: readonly string[];
  /** Signal addresses no literal in the recipe may hold. */
  signals?: readonly string[];
  /** Largest source in bytes (UTF-8). Default 65536. */
  maxSourceBytes?: number;
  /** Wall time for one call, in milliseconds, enforced inside the child. Default 1000. */
  callMs?: number;
  /** Wall time for the whole child process; past it the host kills the child. Default 60000. */
  wallMs?: number;
  /** The child's V8 heap cap in megabytes. Default 128. */
  memoryMb?: number;
  /** Largest reply the child may write, in bytes. Default 64 MiB. */
  maxOutputBytes?: number;
  /** The caller's check of the record (its schema): a reason to fail the call, or null to pass it. */
  validateRecord?: (_record: JsonObject | null, _input: unknown) => string | null;
}

/** The child's whole environment: only TZ=UTC. An app may add required keys to NodeJS.ProcessEnv (Next.js makes
 *  NODE_ENV required), and then this literal would not type-check in the app that imports Naive. The child must not
 *  get those keys, so the type is asserted through unknown instead of filling them in. */
const SANDBOX_ENV = { TZ: "UTC" } as unknown as NodeJS.ProcessEnv;

export const DEFAULTS = Object.freeze({ maxSourceBytes: 65536, callMs: 1000, wallMs: 60000, memoryMb: 128, maxOutputBytes: 64 * 1024 * 1024 });

const fail = (reason: string): { ok: false; reason: string; output?: undefined } => ({ ok: false, reason });
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

// ---------------------------------------------------------------------------------------------------------
// Types: Node's own stripper. It replaces every annotation with whitespace, so positions and line numbers
// stay, and refuses syntax that is not erasable (enum, namespace, parameter properties).
// ---------------------------------------------------------------------------------------------------------

type Strip = (_code: string, _options?: { mode?: "strip" | "transform" }) => string;
const stripper = (nodeModule as unknown as { stripTypeScriptTypes?: Strip }).stripTypeScriptTypes;

/** Strips a recipe's types. Without `stripTypeScriptTypes` (Node before 22.13) every recipe fails closed. */
export function stripTypes(source: string): Result<string> {
  if (typeof stripper !== "function") return fail("this Node has no module.stripTypeScriptTypes (Node 22.13 or later), so no recipe can run");
  // The stripper warns that it is experimental once per process; that warning is not news to a caller.
  const emit = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]): void => {
    const text = typeof warning === "string" ? warning : warning.message;
    if (/stripTypeScriptTypes/.test(text)) return;
    (emit as (_w: string | Error, ..._r: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try {
    return { ok: true, output: stripper(source, { mode: "strip" }) };
  } catch (e) {
    return fail(`the types cannot be stripped: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    process.emitWarning = emit;
  }
}

// ---------------------------------------------------------------------------------------------------------
// The scanner: enough of JavaScript's lexical grammar to tell code from strings, templates, regular
// expressions and comments. Anything it cannot place (an unterminated literal, a backslash outside a
// literal) fails the lint, so a confusing source is refused, never let through.
// ---------------------------------------------------------------------------------------------------------

export type Token =
  | { kind: "word"; text: string; at: number }
  | { kind: "number"; text: string; at: number }
  | { kind: "punct"; text: string; at: number }
  | { kind: "literal"; text: string; at: number; end: number };

const BEFORE_EXPRESSION = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"]);
const isWordStart = (c: string): boolean => /[A-Za-z_$]/.test(c) || c.charCodeAt(0) >= 0x80;
const isWordPart = (c: string): boolean => /[\w$]/.test(c) || c.charCodeAt(0) >= 0x80;

/** Cooks the escapes of a string or template literal's raw text. */
export function cook(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== "\\") { out += c; continue; }
    const d = raw[++i] ?? "";
    const hex = (n: number): string | null => { const h = raw.slice(i + 1, i + 1 + n); return /^[0-9a-fA-F]+$/.test(h) && h.length === n ? h : null; };
    if (d === "n") out += "\n";
    else if (d === "t") out += "\t";
    else if (d === "r") out += "\r";
    else if (d === "b") out += "\b";
    else if (d === "f") out += "\f";
    else if (d === "v") out += "\v";
    else if (d === "0" && !/[0-9]/.test(raw[i + 1] ?? "")) out += "\0";
    else if (d === "x" && hex(2)) { out += String.fromCharCode(parseInt(hex(2) as string, 16)); i += 2; }
    else if (d === "u" && raw[i + 1] === "{") {
      const close = raw.indexOf("}", i);
      const h = close > 0 ? raw.slice(i + 2, close) : "";
      if (/^[0-9a-fA-F]{1,6}$/.test(h) && parseInt(h, 16) <= 0x10ffff) { out += String.fromCodePoint(parseInt(h, 16)); i = close; } else out += d;
    } else if (d === "u" && hex(4)) { out += String.fromCharCode(parseInt(hex(4) as string, 16)); i += 4; }
    else if (d === "\r") { if (raw[i + 1] === "\n") i++; }
    else if (d === "\n" || d === " " || d === " ") { /* a line continuation */ }
    else out += d;
  }
  return out;
}

/** Splits code into tokens, or says where it could not. */
export function scan(code: string): Result<Token[]> {
  const tokens: Token[] = [];
  const opened: number[] = []; // brace depth at which each open template substitution started
  let depth = 0;
  let i = 0;
  const n = code.length;
  const where = (at: number): string => `line ${code.slice(0, at).split("\n").length}`;
  const regexAllowed = (): boolean => {
    const t = tokens.at(-1);
    if (!t) return true;
    if (t.kind === "punct") return t.text !== ")" && t.text !== "]" && t.text !== "}";
    if (t.kind === "word") return BEFORE_EXPRESSION.has(t.text);
    return false;
  };
  // Reads template text from i (just past a backtick or a substitution's closing brace).
  const template = (): string | null => {
    const start = i;
    while (i < n) {
      const c = code[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { tokens.push({ kind: "literal", text: cook(code.slice(start, i)), at: start, end: i }); i++; return null; }
      if (c === "$" && code[i + 1] === "{") {
        tokens.push({ kind: "literal", text: cook(code.slice(start, i)), at: start, end: i });
        opened.push(depth); depth++; i += 2; return null;
      }
      i++;
    }
    return `an unterminated template literal at ${where(start)}`;
  };
  while (i < n) {
    const c = code[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "/" && code[i + 1] === "/") { while (i < n && code[i] !== "\n") i++; continue; }
    if (c === "/" && code[i + 1] === "*") {
      const close = code.indexOf("*/", i + 2);
      if (close < 0) return fail(`an unterminated comment at ${where(i)}`);
      i = close + 2; continue;
    }
    if (c === "'" || c === "\"") {
      const start = i++;
      while (i < n && code[i] !== c) {
        if (code[i] === "\n" || code[i] === "\r") return fail(`an unterminated string at ${where(start)}`);
        i += code[i] === "\\" ? 2 : 1;
      }
      if (i >= n) return fail(`an unterminated string at ${where(start)}`);
      tokens.push({ kind: "literal", text: cook(code.slice(start + 1, i)), at: start, end: i + 1 });
      i++; continue;
    }
    if (c === "`") { i++; const bad = template(); if (bad) return fail(bad); continue; }
    if (c === "/" && regexAllowed()) {
      const start = i++;
      let inClass = false;
      while (i < n) {
        const d = code[i];
        if (d === "\n" || d === "\r") return fail(`an unterminated regular expression at ${where(start)}`);
        if (d === "\\") { i += 2; continue; }
        if (d === "[") inClass = true;
        else if (d === "]") inClass = false;
        else if (d === "/" && !inClass) break;
        i++;
      }
      if (i >= n) return fail(`an unterminated regular expression at ${where(start)}`);
      const body = code.slice(start + 1, i);
      i++;
      while (i < n && /[a-z]/.test(code[i])) i++;
      tokens.push({ kind: "literal", text: body, at: start, end: i });
      continue;
    }
    if (c === "\\") return fail(`a backslash outside a literal at ${where(i)}: write names without escapes`);
    if (isWordStart(c)) {
      const start = i;
      while (i < n && isWordPart(code[i])) i++;
      tokens.push({ kind: "word", text: code.slice(start, i), at: start });
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(code[i + 1] ?? ""))) {
      const start = i;
      while (i < n && /[\w.]/.test(code[i])) i++;
      tokens.push({ kind: "number", text: code.slice(start, i), at: start });
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      if (opened.length > 0 && opened[opened.length - 1] === depth - 1) {
        opened.pop(); depth--; i++;
        const bad = template(); if (bad) return fail(bad);
        continue;
      }
      depth--;
    }
    tokens.push({ kind: "punct", text: c, at: i });
    i++;
  }
  if (opened.length > 0) return fail("an unterminated template substitution");
  return { ok: true, output: tokens };
}

// ---------------------------------------------------------------------------------------------------------
// Lint and the export transform.
// ---------------------------------------------------------------------------------------------------------

/** Whether `needle` occurs in `text` with no letter, digit, underscore or hyphen on either side. */
export function holdsToken(text: string, needle: string): boolean {
  if (needle.length === 0) return false;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) {
    const before = text[at - 1] ?? "", after = text[at + needle.length] ?? "";
    if (!/[A-Za-z0-9_-]/.test(before) && !/[A-Za-z0-9_-]/.test(after)) return true;
  }
  return false;
}

const DECLARATION = new Set(["const", "let", "var", "function", "class", "async"]);
const DEFAULT_NAME = "__naive_default";

type Edit = { from: number; to: number; text: string };
const blank = (code: string, from: number, to: number): Edit => ({ from, to, text: code.slice(from, to).replace(/[^\n]/g, " ") });

/** A prepared recipe: the stripped, transformed code and the name its default function has in it. */
export interface Prepared { code: string; defaultName: string }

/**
 * Lints a recipe and turns its exports into plain declarations. Every problem is reported, not only the first.
 * Accepted exports: `export const|let|var|function|class|async function`, `export default function`,
 * `export default <expression>` and `export { a, b }`. Anything else, and every import, is refused.
 */
export function prepare(source: string, opts: SandboxOptions = {}): { ok: true; output: Prepared; reason?: undefined; problems?: undefined } | { ok: false; reason: string; problems: string[]; output?: undefined } {
  const refuse = (problems: string[]) => ({ ok: false as const, reason: problems.join("; "), problems });
  const max = opts.maxSourceBytes ?? DEFAULTS.maxSourceBytes;
  const bytes = Buffer.byteLength(source, "utf8");
  if (bytes > max) return refuse([`the source is ${bytes} bytes, over the bound of ${max}`]);
  const stripped = stripTypes(source);
  if (!stripped.ok) return refuse([stripped.reason]);
  const code = stripped.output;
  const scanned = scan(code);
  if (!scanned.ok) return refuse([`the source does not scan: ${scanned.reason}`]);
  const tokens = scanned.output;
  const line = (at: number): number => code.slice(0, at).split("\n").length;
  const problems: string[] = [];
  const forbidden = [...(opts.subjects ?? []).map((v) => ["subject id", v]), ...(opts.signals ?? []).map((v) => ["signal address", v])].filter(([, v]) => v.length > 0);
  const edits: Edit[] = [];
  let defaultName: string | null = null;
  const afterDot = (k: number): boolean => { const p = tokens[k - 1]; return p !== undefined && p.kind === "punct" && p.text === "."; };
  const isWord = (t: Token | undefined, text?: string): boolean => t !== undefined && t.kind === "word" && (text === undefined || t.text === text);
  const isPunct = (t: Token | undefined, text: string): boolean => t !== undefined && t.kind === "punct" && t.text === text;

  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.kind === "literal") {
      for (const [what, value] of forbidden) if (holdsToken(t.text, value)) problems.push(`a literal on line ${line(t.at)} holds the ${what} ${JSON.stringify(value)}: a recipe is generic over subjects and signals`);
      continue;
    }
    if (t.kind !== "word" || afterDot(k)) continue;
    if (t.text.startsWith("__naive")) { problems.push(`line ${line(t.at)} uses ${t.text}: names that start with __naive belong to the sandbox`); continue; }
    if (t.text === "import") { problems.push(`line ${line(t.at)} imports: a recipe imports nothing (a type-only import is erased with the types)`); continue; }
    if (t.text !== "export") continue;
    const next = tokens[k + 1];
    if (isWord(next, "default")) {
      const a = tokens[k + 2];
      const fn = isWord(a, "function") ? k + 2 : isWord(a, "async") && isWord(tokens[k + 3], "function") ? k + 3 : -1;
      if (defaultName !== null) { problems.push(`line ${line(t.at)} is a second default export`); continue; }
      if (fn > 0) {
        edits.push(blank(code, t.at, (a as Token).at));
        let nameAt = fn + 1;
        if (isPunct(tokens[nameAt], "*")) nameAt++;
        const name = tokens[nameAt];
        if (isWord(name)) defaultName = (name as Token).text;
        else { const end = tokens[fn].at + "function".length; edits.push({ from: end, to: end, text: ` ${DEFAULT_NAME}` }); defaultName = DEFAULT_NAME; }
      } else if (isWord(a, "class")) {
        problems.push(`line ${line(t.at)} exports a class as default: the default export is the render function`);
      } else {
        edits.push({ from: t.at, to: (next as Token).at + "default".length, text: `const ${DEFAULT_NAME} =` });
        defaultName = DEFAULT_NAME;
      }
    } else if (isWord(next) && DECLARATION.has((next as Token).text)) {
      edits.push(blank(code, t.at, t.at + "export".length));
    } else if (isPunct(next, "{")) {
      let j = k + 2;
      let ok = true;
      while (j < tokens.length && !isPunct(tokens[j], "}")) {
        const u = tokens[j];
        if (!(isPunct(u, ",") || (isWord(u) && (u as Token).text !== "as"))) ok = false;
        j++;
      }
      const close = tokens[j];
      if (!ok || close === undefined) { problems.push(`line ${line(t.at)}: an export list names plain bindings only, with no "as"`); continue; }
      if (isWord(tokens[j + 1], "from")) { problems.push(`line ${line(t.at)} re-exports from another module: a recipe imports nothing`); continue; }
      const end = isPunct(tokens[j + 1], ";") ? (tokens[j + 1] as Token).at + 1 : close.at + 1;
      edits.push(blank(code, t.at, end));
    } else {
      problems.push(`line ${line(t.at)}: "export ${next && "text" in next ? next.text : ""}" is not a form a recipe may use`);
    }
  }
  if (problems.length > 0) return refuse(problems);
  if (defaultName === null) return refuse(["the recipe has no default export: it exports hears, knobs and a default function"]);
  let out = code;
  for (const e of edits.sort((x, y) => y.from - x.from)) out = out.slice(0, e.from) + e.text + out.slice(e.to);
  return { ok: true, output: { code: out, defaultName } };
}

/** The lint alone: every problem with a recipe, or none. */
export const lintRecipe = (source: string, opts: SandboxOptions = {}): string[] => { const p = prepare(source, opts); return p.ok ? [] : p.problems; };

// ---------------------------------------------------------------------------------------------------------
// The realm: the prelude, run first in each fresh realm, and the script that wraps the recipe.
// ---------------------------------------------------------------------------------------------------------

/**
 * Runs as its own script before the recipe, so nothing the recipe declares can shadow what it captures. A Date
 * with arguments stays (parsing a given time is deterministic, and TZ is UTC); `Date()`, `new Date()` and
 * `Date.now()` throw. The original constructor is unreachable: `Date.prototype.constructor` is replaced too.
 */
export const PRELUDE = `"use strict";
(() => {
  const g = globalThis, D = g.Date, construct = Reflect.construct, define = Object.defineProperty;
  const clock = (what) => { throw new TypeError(what + " reads the clock, and a recipe has none: use input.asOf"); };
  const Date = function Date(...a) {
    if (new.target === undefined) clock("Date()");
    if (a.length === 0) clock("new Date()");
    return construct(D, a, new.target);
  };
  Date.prototype = D.prototype;
  Date.UTC = D.UTC;
  Date.parse = D.parse;
  Date.now = () => clock("Date.now()");
  define(D.prototype, "constructor", { value: Date, writable: true, configurable: true, enumerable: false });
  g.Date = Date;
  Math.random = () => { throw new TypeError("Math.random() is not deterministic, and a recipe has no randomness"); };
  for (const k of ["Intl", "WeakRef", "FinalizationRegistry", "SharedArrayBuffer", "Atomics", "WebAssembly", "console", "eval"]) delete g[k];
  const locale = [[D.prototype, ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]], [Number.prototype, ["toLocaleString"]],
    [BigInt.prototype, ["toLocaleString"]], [Array.prototype, ["toLocaleString"]], [String.prototype, ["localeCompare", "toLocaleLowerCase", "toLocaleUpperCase"]]];
  for (const [o, ks] of locale) for (const k of ks) delete o[k];
})();
`;

/**
 * The script one call runs: it takes the call's strings off the global object, evaluates the recipe in its own
 * function scope (strict, like a module), checks the exports and returns one string, "ok:<json>" or
 * "err:<reason>". The header sits on the recipe's first line, so line numbers in errors match the source.
 */
export function realmScript(p: Prepared): string {
  const header = `(function () { "use strict"; const __naive_g = globalThis; const __naive_io = [__naive_g.__naive_input, __naive_g.__naive_knobs, __naive_g.__naive_mode]; delete __naive_g.__naive_input; delete __naive_g.__naive_knobs; delete __naive_g.__naive_mode; const __naive_stringify = JSON.stringify, __naive_parse = JSON.parse, __naive_isArray = Array.isArray, __naive_Error = Error; try { const __naive_m = (function () { "use strict"; `;
  const name = p.defaultName;
  const footer = `
;return { hears: typeof hears === "undefined" ? undefined : hears, knobs: typeof knobs === "undefined" ? undefined : knobs, render: typeof ${name} === "undefined" ? undefined : ${name} }; })();
const __naive_obj = (v) => typeof v === "object" && v !== null && !__naive_isArray(v);
if (!__naive_obj(__naive_m.hears) || !__naive_obj(__naive_m.knobs) || typeof __naive_m.render !== "function") return "err:the recipe exports hears, knobs and a default function";
if (__naive_io[2] === "exports") return "ok:" + __naive_stringify({ hears: __naive_m.hears, knobs: __naive_m.knobs });
const __naive_k = __naive_io[1] === "null" ? __naive_parse(__naive_stringify(__naive_m.knobs)) : __naive_parse(__naive_io[1]);
const __naive_s = __naive_stringify(__naive_m.render(__naive_parse(__naive_io[0]), __naive_k));
return typeof __naive_s === "string" ? "ok:" + __naive_s : "err:the output is not JSON";
} catch (__naive_e) { let __naive_why = "the recipe threw"; try { const __naive_w = __naive_e instanceof __naive_Error ? __naive_e.name + ": " + __naive_e.message : "the recipe threw a " + typeof __naive_e; if (typeof __naive_w === "string") __naive_why = __naive_w; } catch {} return "err:" + __naive_why; }
})()`;
  return header + p.code + footer;
}

// ---------------------------------------------------------------------------------------------------------
// The child process.
// ---------------------------------------------------------------------------------------------------------

let childJs: string | null = null;
/** The child's code, stripped of its types once per process. */
function childCode(): Result<string> {
  if (childJs !== null) return { ok: true, output: childJs };
  const r = stripTypes(readFileSync(new URL("./sandbox-child.ts", import.meta.url), "utf8"));
  if (r.ok) childJs = r.output;
  return r;
}

/** The permission flag this Node knows: `--permission` from Node 22, `--experimental-permission` before. */
const permissionFlag = (): string => (process.allowedNodeEnvironmentFlags.has("--permission") ? "--permission" : "--experimental-permission");

/** The child's command line, without its code. Exported so a test can show what it grants: nothing. */
export function childArgs(memoryMb: number): string[] {
  const wanted = ["--no-addons", "--no-experimental-fetch", "--no-experimental-websocket", "--disallow-code-generation-from-strings", "--no-warnings"];
  return [permissionFlag(), `--max-old-space-size=${memoryMb}`, ...wanted.filter((f) => process.allowedNodeEnvironmentFlags.has(f)), "--input-type=module"];
}

type ChildCall = { input: string; knobs: string; mode: "run" | "exports" };
type ChildResult = { ok: true; value: string; reason?: undefined } | { ok: false; reason: string; value?: undefined };

/** Runs one batch in one child. Every call fails with the same reason when the child does not answer. */
function runChild(script: string, calls: ChildCall[], opts: SandboxOptions): Promise<ChildResult[]> {
  const all = (reason: string): ChildResult[] => calls.map(() => ({ ok: false, reason }));
  const code = childCode();
  if (!code.ok) return Promise.resolve(all(code.reason));
  const callMs = opts.callMs ?? DEFAULTS.callMs, wallMs = opts.wallMs ?? DEFAULTS.wallMs;
  const memoryMb = opts.memoryMb ?? DEFAULTS.memoryMb, maxOut = opts.maxOutputBytes ?? DEFAULTS.maxOutputBytes;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...childArgs(memoryMb), "-e", code.output], { env: SANDBOX_ENV, stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let outBytes = 0, err = "", why: string | null = null;
    const stop = (reason: string): void => { if (why === null) why = reason; child.kill("SIGKILL"); };
    const timer = setTimeout(() => stop(`the sandbox ran past its wall time of ${wallMs} ms and was killed`), wallMs);
    child.stdout.on("data", (b: Buffer) => { outBytes += b.length; if (outBytes > maxOut) stop(`the sandbox wrote more than ${maxOut} bytes and was killed`); else out.push(b); });
    child.stderr.on("data", (b: Buffer) => { if (err.length < 4096) err += b.toString("utf8"); });
    child.stdin.on("error", () => {}); // the child may die before it reads the job; close reports that
    child.on("error", (e) => stop(`the sandbox did not start: ${e.message}`));
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      if (why !== null) { resolve(all(why)); return; }
      if (status !== 0) { resolve(all(`the sandbox exited with ${signal ?? `status ${status}`}${err ? `: ${err.trim().split("\n").slice(-3).join(" ").slice(0, 300)}` : ""}`)); return; }
      let reply: unknown;
      try { reply = JSON.parse(Buffer.concat(out).toString("utf8")); } catch { resolve(all("the sandbox reply is not JSON")); return; }
      if (isObject(reply) && typeof reply.error === "string") { resolve(all(`the sandbox refused the job: ${reply.error}`)); return; }
      if (!isObject(reply) || !Array.isArray(reply.results) || reply.results.length !== calls.length) { resolve(all("the sandbox reply does not have one result per call")); return; }
      resolve(reply.results.map((r): ChildResult => {
        if (isObject(r) && r.ok === true && typeof r.value === "string") return { ok: true, value: r.value };
        if (isObject(r) && r.ok === false && typeof r.reason === "string") return { ok: false, reason: r.reason };
        return { ok: false, reason: "the sandbox result is malformed" };
      }));
    });
    child.stdin.end(JSON.stringify({ prelude: PRELUDE, script, callMs, calls }));
  });
}

/** Decodes the realm's answer: "ok:<json>" or "err:<reason>". */
function decode(r: ChildResult): Result<unknown> {
  if (!r.ok) return fail(r.reason);
  if (r.value.startsWith("err:")) return fail(r.value.slice(4));
  if (!r.value.startsWith("ok:")) return fail("the realm answered in no known form");
  try { return { ok: true, output: JSON.parse(r.value.slice(3)) as unknown }; } catch { return fail("the realm's answer is not JSON"); }
}

// ---------------------------------------------------------------------------------------------------------
// The output check.
// ---------------------------------------------------------------------------------------------------------

/**
 * Checks that the receptions cover each heard signal (input.signals, each with a string id) exactly once,
 * and name no other. Each reception is an object with a string `signal` and a `kind` of salient or noise.
 * Returns the reason it fails, or null.
 */
export function checkReceptions(input: unknown, receptions: unknown): string | null {
  const signals = isObject(input) ? input.signals : undefined;
  if (!Array.isArray(signals) || !signals.every((s) => isObject(s) && typeof s.id === "string")) return "input.signals is not a list of signals with string ids";
  if (!Array.isArray(receptions)) return "receptions is not a list";
  const heard = new Map<string, number>();
  for (const s of signals as { id: string }[]) heard.set(s.id, 0);
  for (const r of receptions) {
    if (!isObject(r) || typeof r.signal !== "string") return "a reception is not an object with a string signal";
    if (r.kind !== "salient" && r.kind !== "noise") return `the reception for ${r.signal} has kind ${JSON.stringify(r.kind)}, not salient or noise`;
    const seen = heard.get(r.signal);
    if (seen === undefined) return `a reception names ${r.signal}, which was not heard`;
    if (seen > 0) return `${r.signal} has more than one reception`;
    heard.set(r.signal, 1);
  }
  const missing = [...heard].filter(([, c]) => c === 0).map(([id]) => id);
  return missing.length > 0 ? `no reception for ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? ` and ${missing.length - 5} more` : ""}` : null;
}

/** Checks one call's output against the contract and the caller's record hook. */
export function checkOutput(input: unknown, output: unknown, validateRecord?: SandboxOptions["validateRecord"]): Result<RecipeOutput> {
  if (!isObject(output)) return fail("the output is not an object with record and receptions");
  const extra = Object.keys(output).filter((k) => k !== "record" && k !== "receptions");
  if (extra.length > 0 || !("record" in output) || !("receptions" in output)) return fail(`the output has exactly record and receptions${extra.length ? `, not ${extra.join(", ")}` : ""}`);
  const record = output.record;
  if (record !== null && !isObject(record)) return fail("the record is not an object or null");
  const bad = checkReceptions(input, output.receptions);
  if (bad) return fail(bad);
  const typed: RecipeOutput = { record: record as JsonObject | null, receptions: output.receptions as JsonObject[] };
  if (validateRecord) {
    let why: string | null;
    try { why = validateRecord(typed.record, input); } catch (e) { return fail(`the record check threw: ${e instanceof Error ? e.message : String(e)}`); }
    if (why) return fail(`the record fails its check: ${why}`);
  }
  return { ok: true, output: typed };
}

// ---------------------------------------------------------------------------------------------------------
// The public calls.
// ---------------------------------------------------------------------------------------------------------

/**
 * Runs a batch of calls of one recipe in one child process, each call in its own fresh realm. The answer has
 * one result per call, in order. A lint failure or a dead child fails every call with the same reason.
 */
export async function runRecipes(source: string, calls: readonly RecipeCall[], opts: SandboxOptions = {}): Promise<Result<RecipeOutput>[]> {
  const prepared = prepare(source, opts);
  if (!prepared.ok) return calls.map(() => fail(`lint: ${prepared.reason}`));
  const encoded: (ChildCall | string)[] = calls.map((c) => {
    let input: string | undefined;
    try { input = JSON.stringify(c.input); } catch { input = undefined; }
    if (typeof input !== "string") return "the input is not JSON";
    return { input, knobs: c.knobs === null ? "null" : JSON.stringify(c.knobs), mode: "run" };
  });
  const sendable = encoded.filter((e): e is ChildCall => typeof e !== "string");
  const results = sendable.length > 0 ? await runChild(realmScript(prepared.output), sendable, opts) : [];
  let next = 0;
  return encoded.map((e, i) => {
    if (typeof e === "string") return fail(e);
    const r = decode(results[next++]);
    return r.ok ? checkOutput(calls[i].input, r.output, opts.validateRecord) : fail(r.reason);
  });
}

/** Runs one call: `knobs` null runs the recipe's own knobs. */
export async function runRecipe(source: string, input: unknown, knobs: JsonObject | null, opts: SandboxOptions = {}): Promise<Result<RecipeOutput>> {
  const [r] = await runRecipes(source, [{ input, knobs }], opts);
  return r;
}

/** Reads a recipe's `hears` and `knobs` in the sandbox, without calling its default function. */
export async function recipeExports(source: string, opts: SandboxOptions = {}): Promise<Result<RecipeExports>> {
  const prepared = prepare(source, opts);
  if (!prepared.ok) return fail(`lint: ${prepared.reason}`);
  const [r] = await runChild(realmScript(prepared.output), [{ input: "null", knobs: "null", mode: "exports" }], opts);
  const d = decode(r);
  if (!d.ok) return fail(d.reason);
  const o = d.output;
  if (!isObject(o) || !isObject(o.hears) || !isObject(o.knobs)) return fail("the exports are not objects");
  const hears = o.hears;
  if (!Array.isArray(hears.signals) || !hears.signals.every((s) => typeof s === "string")) return fail("hears.signals is not a list of signal type ranges");
  return { ok: true, output: { hears: hears as JsonObject, knobs: o.knobs as JsonObject } };
}
