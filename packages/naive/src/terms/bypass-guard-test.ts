// Fails the suite when a symbolic check bypasses the EE-095 term engine and the Lean proofs.
//
//   node packages/naive/src/terms/bypass-guard-test.ts
//
// A symbolic check decides membership (does a thing fall under a term), relation (how two terms relate) or
// label (which term names a thing). It must reach EE-095 in one of three ways: import packages/naive/src/terms/engine.ts
// at runtime, directly or through a module it imports by a relative path; run packages/naive/src/terms/admit.ts, by
// passing its path to spawn, execFile, fork or exec (as a literal or through a variable set from one) or by
// importing it; or name a Lean theorem (the text `theorem <name>`) that packages/naive/lean/Naive/*.lean declares at the
// start of a line. Imports and admit paths are read from the code alone: comments and the contents of string
// and template literals are dropped first, and a type-only import is erased at runtime, so it does not count.
//
// The checks are found by scanning schema/ for check-* files and for files whose name holds "gate", ending
// .js, .mjs, .cjs, .ts, .mts or .cts, and every file found must be in REGISTRY below. A file found but not
// registered fails, so a new check cannot slip past by not being listed. A registered path that no longer
// exists fails too.
//
// The rule for the checks that predate this guard. Each existing file was read and given one of three kinds.
//   symbolic       it decides membership, relation or label, and it must reach EE-095.
//   not-symbolic   it decides shape, references, hashes, arithmetic, graph structure or access. No term is
//                  decided, so the engine has nothing to say. The reason names what it does decide.
//   unwired        it decides membership, relation or label but does not reach EE-095 yet. This is reviewed
//                  debt: it is printed on every run, and it fails once the file reaches the engine, so the
//                  entry moves to symbolic and the list only shrinks. Adding an entry here needs a reason a
//                  reviewer accepts, the same as any change to this file.
//
// What this does not prove: that an import of the engine is used for the decision, or that a named theorem
// proves what the check does. It is a tripwire on the wiring, not a proof of it.

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

type Entry =
  | { kind: "symbolic" }
  | { kind: "not-symbolic"; reason: string }
  | { kind: "unwired"; reason: string };
type Registry = Readonly<Record<string, Entry>>;
type Wiring = { via: "engine"; chain: string[] } | { via: "admit" } | { via: "lean"; theorem: string };
type Finding = { file: string; fail: boolean; says: string };

const symbolic: Entry = { kind: "symbolic" };
const plain = (reason: string): Entry => ({ kind: "not-symbolic", reason });

export const REGISTRY: Registry = {
  "packages/naive/src/engine/beta-gate.mjs": plain("unlocks beta capabilities in order from feedback records; it decides access, not a term"),
  "packages/naive/src/engine/check-artifacts.mjs": plain("artifacts name records that exist, and a changed source hash marks one stale"),
  "packages/naive/src/checks/check-assets.mjs": plain("each public asset has a source, a license, a credit and alt text"),
  "packages/naive/src/checks/check-boundary.mjs": plain("path text: no code names a module of an app that uses Naive, and registered connectors work offline"),
  "packages/naive/src/checks/check-brand.mjs": plain("brand records: colors, licensed typefaces, marks and voice rules against fixed lists"),
  "packages/naive/src/checks/check-config.mjs": plain("naive.config.json: shape, route patterns that match the route table, and pins"),
  "packages/naive/src/checks/check-data-model.mjs": plain("every JSON file maps to a declared record type by path; record types are schema types, not glossary terms"),
  "packages/naive/src/checks/check-data-packages.mjs": plain("data package layout, append-only streams and immutable raw sources"),
  "packages/naive/src/checks/check-delegation.mjs": plain("grant chains, scopes and expiry between roles named in templates"),
  "packages/naive/src/checks/check-detectors.ts": plain("detector records and detection ledgers: schema shape, hash chains, references to trials, sources, roles and record types, and arithmetic on resolved trials"),
  "packages/naive/src/checks/check-detectors-test.ts": plain("proves the detectors check breaks on each structural rule and proposes a criterion once"),
  "packages/naive/src/checks/check-departments.mjs": plain("department ids are in the catalog and their folders match"),
  "packages/naive/src/checks/check-docs-claims.mjs": plain("the commands, paths and routes the docs name exist"),
  "packages/naive/src/checks/check-execution.mjs": plain("handoffs carry only classes their role owns, with criteria and evidence"),
  "packages/naive/src/engine/check-frameworks.mjs": plain("a framework's maps_to targets are canonical record routes"),
  "packages/naive/src/checks/check-governance.mjs": { kind: "unwired", reason: "decides who is a founder from the holder label (h.kind === \"founder\") to require and match the founder agreement, the same pattern as check-people.mjs; the rest is reference and arithmetic" },
  "packages/naive/src/checks/check-integrations.mjs": plain("integration ids are unique and an interface reaches three other layers"),
  "packages/naive/src/engine/check-leaks.mjs": plain("matches internal-term patterns in public text; it finds words and does not decide what a thing is"),
  "packages/naive/src/checks/check-nextjs-status.mjs": plain("status ledger rows cite files and pages that exist"),
  "packages/naive/src/checks/check-nouns.mjs": symbolic,
  "packages/naive/src/checks/check-people.mjs": { kind: "unwired", reason: "decides who is a founder from the role label (role.founder), and EE-095 records that founder records are not yet checked against the founder term" },
  "packages/naive/src/checks/check-private.mjs": plain("private records never reach a use_model step"),
  "packages/naive/src/checks/check-provenance.mjs": plain("the hash chain of the provenance log"),
  "packages/naive/src/checks/check-traces.ts": plain("the hash chain, fields and span links of the trace files, and that provenance names spans that exist"),
  "packages/naive/src/engine/check-public.mjs": plain("marketing content names its source record, audience and approver, and shares no ten-word run with that record; it compares text and does not decide what a thing is"),
  "packages/naive/src/checks/check-publication.mjs": plain("publication policy references, channels and approvals"),
  "packages/naive/src/engine/check-publications.mjs": plain("manifest entries match built outputs by sha256 and carry a person as approver"),
  "packages/naive/src/checks/check-ready.mjs": plain("a handoff's definition of ready: objective fields present"),
  "packages/naive/src/checks/check-reasons.mjs": plain("cited files still match the hash frozen at approval"),
  "packages/naive/src/checks/check-recipes.ts": plain("recipes across files: schema shape, sha addresses, hash chains, window order, budget counts, references to plans, recipes, record types and library signals, and that the sandbox renders the same record again, with and without each noise signal; it compares canonical JSON and checks the projector's labels by ablation, it does not decide what a thing is"),
  "packages/naive/src/checks/check-recipes-test.ts": plain("proves the recipes check breaks on each rule on copies of the example venture"),
  "packages/naive/src/checks/check-record-paths-test.ts": plain("proves the record paths check catches what it must"),
  "packages/naive/src/checks/check-record-paths.ts": plain("code reads schema files and the data model through packages/naive/src/records; it matches path text"),
  "packages/naive/src/engine/check-roadmap.mjs": plain("roadmap steps form no cycle and name known frames and roles"),
  "packages/naive/src/checks/check-sdlc-catalog.ts": plain("catalog ids, decision classes and task references are unique and known"),
  "packages/naive/src/checks/check-signals-test.ts": plain("proves the signals check breaks on each rule on copies"),
  "packages/naive/src/checks/check-signals.ts": plain("signal types, signals and listeners: schema shape, one owner and one reducer per field, worked cases render, content hashes and paths, withdrawal rights, log completeness and listener references"),
  "packages/naive/src/checks/check-sources.mjs": plain("the source map names known connectors and write modes"),
  "packages/naive/src/checks/check-team.mjs": plain("team plan tasks cite known capabilities and keep escalate classes with a person"),
  "packages/naive/src/checks/check-telos.mjs": plain("every exit criterion traces to a known measure"),
  "packages/naive/src/checks/check-types-test.ts": plain("proves the type gate catches what it must"),
  "packages/naive/src/checks/check-types.ts": plain("runs tsc over the code"),
  "packages/naive/src/checks/check-validation-study.mjs": plain("interviews, feedback and bugs reference records that exist"),
  "packages/naive/src/checks/check-validation.mjs": plain("grades evidence by GRADE arithmetic"),
  "packages/naive/src/checks/check-ventures.mjs": plain("venture ids, parents and links resolve, and no venture is its own ancestor"),
  "packages/naive/src/checks/check-visibility.mjs": plain("each public fact came through the visibility gate"),
  "packages/naive/src/checks/check-where-used.mjs": plain("each live child shows its parent's value"),
  "packages/naive/src/checks/check-write-scope.ts": plain("each path the tests write lies under an allowed root (a path prefix)"),
  "packages/naive/src/checks/check-write-scope-test.ts": plain("proves the write-scope check fails a write outside the venture"),
  "packages/naive/src/engine/gate-drafts.mjs": plain("stores held writes and their variants"),
  "packages/naive/src/interfaces/tests/gate-test.mjs": plain("tests the write gate"),
  "packages/naive/src/engine/gate.mjs": plain("the write gate: route rules, pins and role access decide what happens to a write, not a term"),
  "packages/naive/src/terms/ontology-gate-test.ts": plain("tests the membership gate, which is registered as symbolic"),
  "packages/naive/src/terms/ontology-gate.ts": symbolic,
};

const ENGINE = "packages/naive/src/terms/engine.ts";
const ADMIT = "packages/naive/src/terms/admit.ts";
const posix = (root: string, abs: string): string => relative(root, abs).split(sep).join("/");
const isFile = (p: string): boolean => existsSync(p) && statSync(p).isFile();

const LEAN_DECL = /^\s*(?:private\s+|protected\s+)?theorem\s+([^\s(:{[]+)/gm;
const NAMED_THEOREM = /\btheorem\s+([A-Za-z_][\w']*(?:\.[A-Za-z_][\w']*)*)/g;

// A file's code with comments and regex literals dropped and each string or template literal replaced by
// "<n>", its index in literals. Imports are then matched on code, so text inside a comment or a string
// cannot pass for one.
type Lexed = { code: string; literals: string[] };
const REGEX_AFTER = /(?:^|[(,=:[!&|?{};+\-*%<>~^]|\b(?:return|typeof|case|do|else|in|of|void|yield|await|delete|new|throw))$/;

function lex(src: string): Lexed {
  const literals: string[] = [];
  let i = src.startsWith("#!") ? src.indexOf("\n") : 0;
  if (i < 0) i = src.length;
  const quoted = (q: string): string => {
    let v = "";
    for (i++; i < src.length && src[i] !== q && src[i] !== "\n"; i++) v += src[i] === "\\" ? src[++i] : src[i];
    i++;
    return v;
  };
  const template = (): string => {
    let v = "";
    for (i++; i < src.length && src[i] !== "`"; i++) {
      if (src[i] === "\\") v += src[++i];
      else if (src.startsWith("${", i)) { i += 2; scan(true); i--; v += "${}"; }
      else v += src[i];
    }
    i++;
    return v;
  };
  const regex = (): void => {
    i++;
    for (let cls = false; i < src.length && src[i] !== "\n" && (cls || src[i] !== "/"); i++) {
      if (src[i] === "\\") i++;
      else if (src[i] === "[") cls = true;
      else if (src[i] === "]") cls = false;
    }
    if (src[i] === "/") for (i++; /[a-z]/i.test(src[i] ?? ""); i++);
  };
  const scan = (inTemplate: boolean): string => {
    let out = "", tail = "", depth = 0;
    const emit = (s: string): void => { out += s; tail = (tail + s).replace(/\s+/g, " ").slice(-12); };
    while (i < src.length) {
      const c = src[i];
      if (src.startsWith("//", i)) { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (src.startsWith("/*", i)) { const end = src.indexOf("*/", i + 2); i = end < 0 ? src.length : end + 2; emit(" "); continue; }
      if (c === '"' || c === "'" || c === "`") { emit(`"${literals.push(c === "`" ? template() : quoted(c)) - 1}"`); continue; }
      if (c === "/" && REGEX_AFTER.test(tail.trimEnd())) { regex(); emit(" "); continue; }
      if (inTemplate && c === "{") depth++;
      if (inTemplate && c === "}" && depth-- === 0) { i++; return out; }
      emit(c);
      i++;
    }
    return out;
  };
  return { code: scan(false), literals };
}

const IMPORT = /^[ \t]*(?:import|export)\s+([\w$\s{},*]*?)\s*\bfrom\s*"(\d+)"|^[ \t]*import\s*"(\d+)"|\bimport\s*\(\s*"(\d+)"/gm;
const typeOnly = (clause: string): boolean => {
  if (/^type\s/.test(clause)) return true;
  const named = /^\{([^}]*)\}$/.exec(clause)?.[1].split(",").map((s) => s.trim()).filter(Boolean);
  return !!named?.length && named.every((s) => /^type\s/.test(s));
};

function runtimeImports({ code, literals }: Lexed): string[] {
  return [...code.matchAll(IMPORT)].filter((m) => m[1] === undefined || !typeOnly(m[1].trim())).map((m) => literals[Number(m[2] ?? m[3] ?? m[4])]);
}

const SPAWN = /\b(?:spawn|spawnSync|execFile|execFileSync|exec|execSync|fork)\s*\(/g;
const callArgs = (code: string, from: number): string => {
  let depth = 1, i = from;
  for (; i < code.length && depth; i++) depth += code[i] === "(" ? 1 : code[i] === ")" ? -1 : 0;
  return code.slice(from, i);
};

function runsAdmit(root: string, abs: string): boolean {
  const lexed = lex(readFileSync(abs, "utf8"));
  if (runtimeImports(lexed).some((s) => s.startsWith(".") && resolve(dirname(abs), s) === join(root, ADMIT))) return true;
  const mentionsAdmit = (text: string): boolean => [...text.matchAll(/"(\d+)"/g)].some((m) => lexed.literals[Number(m[1])].includes("terms/admit.ts"));
  const bound = [...lexed.code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_]\w*)\s*=([^;]*)/g)].filter((m) => mentionsAdmit(m[2])).map((m) => m[1]);
  return [...lexed.code.matchAll(SPAWN)].some((m) => {
    const args = callArgs(lexed.code, (m.index ?? 0) + m[0].length);
    return mentionsAdmit(args) || bound.some((b) => new RegExp(`\\b${b}\\b`).test(args));
  });
}

function leanTheorems(root: string): Set<string> {
  const dir = join(root, "packages/naive/lean/Naive");
  if (!existsSync(dir)) return new Set();
  const src = readdirSync(dir).filter((f) => f.endsWith(".lean")).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
  return new Set([...src.matchAll(LEAN_DECL)].map((m) => m[1]));
}

function relativeImports(abs: string): string[] {
  return runtimeImports(lex(readFileSync(abs, "utf8")))
    .filter((s) => s.startsWith(".")).map((s) => resolve(dirname(abs), s)).filter(isFile);
}

function engineChain(root: string, start: string): string[] | null {
  const engine = join(root, ENGINE);
  const parent = new Map<string, string>([[start, start]]);
  const queue = [start];
  while (queue.length) {
    const at = queue.shift()!;
    if (at === engine) {
      const chain = [posix(root, at)];
      for (let p = parent.get(at)!; p !== start; p = parent.get(p)!) chain.unshift(posix(root, p));
      return chain;
    }
    for (const next of relativeImports(at)) if (!parent.has(next)) { parent.set(next, at); queue.push(next); }
  }
  return null;
}

function wiring(root: string, file: string, theorems: Set<string>): Wiring | null {
  const abs = join(root, file);
  const chain = engineChain(root, abs);
  if (chain) return { via: "engine", chain };
  if (runsAdmit(root, abs)) return { via: "admit" };
  const src = readFileSync(abs, "utf8");
  const theorem = [...src.matchAll(NAMED_THEOREM)].map((m) => m[1]).find((t) => theorems.has(t) || theorems.has(t.split(".").pop() ?? ""));
  return theorem ? { via: "lean", theorem } : null;
}

// The units that held schema/ before EE-118 step 5, the folder this guard scanned.
const UNITS = ["engine", "checks", "terms", "records"].map((u) => `packages/naive/src/${u}`);

function discover(root: string): string[] {
  return UNITS.flatMap((unit) => {
    const dir = join(root, unit);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => (f.startsWith("check-") || f.includes("gate")) && /\.[cm]?[jt]s$/.test(f) && isFile(join(dir, f)))
      .map((f) => `${unit}/${f}`);
  });
}

const BYPASS = `neither imports ${ENGINE} nor runs ${ADMIT}, and names no Lean theorem in packages/naive/lean/Naive`;

export function audit(root: string, registry: Registry): Finding[] {
  const theorems = leanTheorems(root);
  const files = [...new Set([...discover(root), ...Object.keys(registry)])].sort();
  return files.flatMap((file): Finding[] => {
    const entry = registry[file];
    if (!isFile(join(root, file))) return [{ file, fail: true, says: "is in the registry but does not exist; remove its entry" }];
    if (entry?.kind === "not-symbolic") return [];
    const wired = wiring(root, file, theorems);
    if (!entry) return [{ file, fail: true, says: wired
      ? `is not in the registry; it reaches EE-095 (${wired.via}), so register it as symbolic`
      : `is not in the registry, and it ${BYPASS}. Wire it through the engine, or register it with a reason` }];
    if (entry.kind === "unwired") return [wired
      ? { file, fail: true, says: `now reaches EE-095 (${wired.via}); register it as symbolic` }
      : { file, fail: false, says: `unwired, reviewed: ${entry.reason}` }];
    return wired ? [] : [{ file, fail: true, says: `decides membership, relation or label, but it ${BYPASS}` }];
  });
}

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };

function fixtureCases(): void {
  const root = mkdtempSync(join(tmpdir(), "bypass-guard-"));
  const put = (path: string, text: string): void => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  try {
    put(ENGINE, "export const run = (term, facts) => term.props.every((p) => p.check(facts));\n");
    put(ADMIT, "export {};\n");
    put("packages/naive/lean/Naive/Fixture.lean", "/- a theorem answers for every x -/\ntheorem fixture_holds : True := trivial\n");
    const byLabel = "export const member = (x) => x.label === \"founder\";\n";
    put("packages/naive/src/checks/check-wired.mjs", `import { run } from "../terms/engine.ts";\nexport const member = (t, x) => run(t, x);\n`);
    put("packages/naive/src/checks/check-bare.mjs", byLabel);
    put("packages/naive/src/checks/member-lib.mjs", `export { run } from "../terms/engine.ts";\n`);
    put("packages/naive/src/checks/check-via.mjs", `import { run } from "./member-lib.mjs";\nexport const member = (t, x) => run(t, x);\n`);
    put("packages/naive/src/checks/check-admit.mjs", `import { spawnSync } from "node:child_process";\nspawnSync("node", ["packages/naive/src/terms/admit.ts", "--check"]);\n`);
    put("packages/naive/src/checks/check-lean.mjs", `// Proved for every case by theorem fixture_holds.\n${byLabel}`);
    put("packages/naive/src/checks/check-fake-lean.mjs", `// a theorem answers for every x\n${byLabel}`);
    put("packages/naive/src/checks/check-commented.mjs", `// import { run } from "../terms/engine.ts";\n${byLabel}`);
    put("packages/naive/src/checks/check-shape.mjs", byLabel);
    put("packages/naive/src/checks/check-debt.mjs", byLabel);
    put("packages/naive/src/checks/check-paid.mjs", `import { run } from "../terms/engine.ts";\nexport { run };\n`);
    put("packages/naive/src/checks/check-new.mjs", `import { run } from "../terms/engine.ts";\nexport { run };\n`);
    put("packages/naive/src/checks/role-gate.mjs", byLabel);
    const engineImport = `import { run } from "../terms/engine.ts";`;
    put("packages/naive/src/checks/check-single-quote.mjs", `import { run } from '../terms/engine.ts';\nexport { run };\n`);
    put("packages/naive/src/checks/check-mixed-type.ts", `import { run, type Term } from "../terms/engine.ts";\nexport { run };\nexport type { Term };\n`);
    put("packages/naive/src/checks/check-dynamic.mjs", `const quote = /["'\`]/;\nexport const load = () => quote && import("../terms/engine.ts");\n`);
    put("packages/naive/src/checks/check-admit-var.mjs", `import { execFileSync } from "node:child_process";\nconst script = new URL("../terms/admit.ts", import.meta.url).pathname;\nexecFileSync(process.execPath, [script, "--check"]);\n`);
    put("packages/naive/src/checks/check-trailing-comment.mjs", `const x = 1; // ${engineImport}\n${byLabel}`);
    put("packages/naive/src/checks/check-block-comment.mjs", `const x = 1; /* ${engineImport} */\n${byLabel}`);
    put("packages/naive/src/checks/check-in-string.mjs", `const text = '${engineImport}';\n${byLabel}`);
    put("packages/naive/src/checks/check-in-template.mjs", `const text = \`${engineImport}\`;\n${byLabel}`);
    put("packages/naive/src/checks/check-admit-message.mjs", `export const hint = () => { throw new Error("run node packages/naive/src/terms/admit.ts --check first"); };\n${byLabel}`);
    put("packages/naive/src/checks/check-type-import.ts", `import type { Term } from "../terms/engine.ts";\nexport type T = Term;\n${byLabel}`);
    put("packages/naive/src/checks/check-type-names.ts", `import { type Term, type Base } from "../terms/engine.ts";\nexport type T = [Term, Base];\n${byLabel}`);
    put("packages/naive/src/checks/type-lib.ts", `export type { Term } from "../terms/engine.ts";\n${byLabel}`);
    put("packages/naive/src/checks/check-type-via.ts", `import { member } from "./type-lib.ts";\nexport { member };\n`);
    put("packages/naive/src/checks/check-common.cjs", byLabel);
    const registry: Registry = {
      "packages/naive/src/checks/check-wired.mjs": symbolic, "packages/naive/src/checks/check-bare.mjs": symbolic, "packages/naive/src/checks/check-via.mjs": symbolic,
      "packages/naive/src/checks/check-admit.mjs": symbolic, "packages/naive/src/checks/check-lean.mjs": symbolic, "packages/naive/src/checks/check-fake-lean.mjs": symbolic,
      "packages/naive/src/checks/check-commented.mjs": symbolic, "packages/naive/src/checks/check-gone.mjs": symbolic,
      "packages/naive/src/checks/check-single-quote.mjs": symbolic, "packages/naive/src/checks/check-mixed-type.ts": symbolic, "packages/naive/src/checks/check-dynamic.mjs": symbolic,
      "packages/naive/src/checks/check-admit-var.mjs": symbolic, "packages/naive/src/checks/check-trailing-comment.mjs": symbolic, "packages/naive/src/checks/check-block-comment.mjs": symbolic,
      "packages/naive/src/checks/check-in-string.mjs": symbolic, "packages/naive/src/checks/check-in-template.mjs": symbolic, "packages/naive/src/checks/check-admit-message.mjs": symbolic,
      "packages/naive/src/checks/check-type-import.ts": symbolic, "packages/naive/src/checks/check-type-names.ts": symbolic, "packages/naive/src/checks/check-type-via.ts": symbolic,
      "packages/naive/src/checks/check-shape.mjs": plain("fixture: decides shape"),
      "packages/naive/src/checks/check-debt.mjs": { kind: "unwired", reason: "fixture debt" },
      "packages/naive/src/checks/check-paid.mjs": { kind: "unwired", reason: "fixture debt, since paid" },
    };
    const findings = audit(root, registry);
    const fails = findings.filter((f) => f.fail).map((f) => f.file);
    const named = (file: string): boolean => fails.includes(file);
    expect("fixture: a check wired through the engine passes", !named("packages/naive/src/checks/check-wired.mjs"));
    expect("fixture: a check that decides membership without the engine fails, named", named("packages/naive/src/checks/check-bare.mjs"));
    expect("fixture: an engine import through a module the check imports counts", !named("packages/naive/src/checks/check-via.mjs"));
    expect("fixture: running packages/naive/src/terms/admit.ts counts", !named("packages/naive/src/checks/check-admit.mjs"));
    expect("fixture: naming a theorem packages/naive/lean/Naive declares counts", !named("packages/naive/src/checks/check-lean.mjs"));
    expect("fixture: a theorem name packages/naive/lean/Naive does not declare does not count", named("packages/naive/src/checks/check-fake-lean.mjs"));
    expect("fixture: a commented-out engine import does not count", named("packages/naive/src/checks/check-commented.mjs"));
    expect("fixture: an unregistered check fails even when wired", named("packages/naive/src/checks/check-new.mjs"));
    expect("fixture: an unregistered gate that skips the engine fails", named("packages/naive/src/checks/role-gate.mjs"));
    expect("fixture: a registered path that is gone fails", named("packages/naive/src/checks/check-gone.mjs"));
    expect("fixture: an unwired entry that now reaches the engine fails", named("packages/naive/src/checks/check-paid.mjs"));
    expect("fixture: a not-symbolic check passes", !named("packages/naive/src/checks/check-shape.mjs"));
    expect("fixture: a single-quoted engine import counts", !named("packages/naive/src/checks/check-single-quote.mjs"));
    expect("fixture: an engine import that also names a type counts", !named("packages/naive/src/checks/check-mixed-type.ts"));
    expect("fixture: a dynamic engine import after a regex holding quotes counts", !named("packages/naive/src/checks/check-dynamic.mjs"));
    expect("fixture: admit's path passed to execFile through a variable counts", !named("packages/naive/src/checks/check-admit-var.mjs"));
    expect("fixture: an engine import in a trailing // comment does not count", named("packages/naive/src/checks/check-trailing-comment.mjs"));
    expect("fixture: an engine import in a mid-line block comment does not count", named("packages/naive/src/checks/check-block-comment.mjs"));
    expect("fixture: an engine import inside a single-quoted string does not count", named("packages/naive/src/checks/check-in-string.mjs"));
    expect("fixture: an engine import inside a template literal does not count", named("packages/naive/src/checks/check-in-template.mjs"));
    expect("fixture: a message that mentions admit.ts does not count as running it", named("packages/naive/src/checks/check-admit-message.mjs"));
    expect("fixture: an import type of the engine does not count", named("packages/naive/src/checks/check-type-import.ts"));
    expect("fixture: an import of only type names from the engine does not count", named("packages/naive/src/checks/check-type-names.ts"));
    expect("fixture: reaching the engine only through a type-only re-export does not count", named("packages/naive/src/checks/check-type-via.ts"));
    expect("fixture: an unregistered .cjs check fails", named("packages/naive/src/checks/check-common.cjs"));
    expect("fixture: an unwired entry is reported, not failed", !named("packages/naive/src/checks/check-debt.mjs") && findings.some((f) => f.file === "packages/naive/src/checks/check-debt.mjs" && !f.fail));
    const want = [
      "packages/naive/src/checks/check-admit-message.mjs", "packages/naive/src/checks/check-bare.mjs", "packages/naive/src/checks/check-block-comment.mjs", "packages/naive/src/checks/check-commented.mjs",
      "packages/naive/src/checks/check-common.cjs", "packages/naive/src/checks/check-fake-lean.mjs", "packages/naive/src/checks/check-gone.mjs", "packages/naive/src/checks/check-in-string.mjs",
      "packages/naive/src/checks/check-in-template.mjs", "packages/naive/src/checks/check-new.mjs", "packages/naive/src/checks/check-paid.mjs", "packages/naive/src/checks/check-trailing-comment.mjs",
      "packages/naive/src/checks/check-type-import.ts", "packages/naive/src/checks/check-type-names.ts", "packages/naive/src/checks/check-type-via.ts", "packages/naive/src/checks/role-gate.mjs",
    ];
    expect("fixture: exactly the bypassing and unregistered files fail", JSON.stringify(fails) === JSON.stringify(want), fails.join(", "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixtureCases();
  const repo = join(dirname(new URL(import.meta.url).pathname), "../../../..");
  const findings = audit(repo, REGISTRY);
  for (const f of findings) console.log(`${f.fail ? "FAIL" : "note"}  ${f.file} ${f.says}`);
  expect("no symbolic check in the repository bypasses EE-095", !findings.some((f) => f.fail));
  console.log(failed ? `${failed} failed` : "EE-095 bypass guard: all pass");
  process.exit(failed ? 1 : 0);
}
