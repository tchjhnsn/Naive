// Fails the suite when a symbolic check bypasses the EE-095 term engine and the Lean proofs.
//
//   node schema/terms/bypass-guard-test.ts
//
// A symbolic check decides membership (does a thing fall under a term), relation (how two terms relate) or
// label (which term names a thing). It must reach EE-095 in one of three ways: import schema/terms/engine.ts
// at runtime, directly or through a module it imports by a relative path; run schema/terms/admit.ts, by
// passing its path to spawn, execFile, fork or exec (as a literal or through a variable set from one) or by
// importing it; or name a Lean theorem (the text `theorem <name>`) that lean/Naive/*.lean declares at the
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
  "schema/beta-gate.mjs": plain("unlocks beta capabilities in order from feedback records; it decides access, not a term"),
  "schema/check-artifacts.mjs": plain("artifacts name records that exist, and a changed source hash marks one stale"),
  "schema/check-assets.mjs": plain("each public asset has a source, a license, a credit and alt text"),
  "schema/check-boundary.mjs": plain("import paths: nothing outside platform/ imports from it"),
  "schema/check-brand.mjs": plain("brand records: colors, licensed typefaces, marks and voice rules against fixed lists"),
  "schema/check-config.mjs": plain("naive.config.json: shape, route patterns that match the route table, and pins"),
  "schema/check-data-model.mjs": plain("every JSON file maps to a declared record type by path; record types are schema types, not glossary terms"),
  "schema/check-data-packages.mjs": plain("data package layout, append-only streams and immutable raw sources"),
  "schema/check-delegation.mjs": plain("grant chains, scopes and expiry between roles named in templates"),
  "schema/check-departments.mjs": plain("department ids are in the catalog and their folders match"),
  "schema/check-docs-claims.mjs": plain("the commands, paths and routes the docs name exist"),
  "schema/check-execution.mjs": plain("handoffs carry only classes their role owns, with criteria and evidence"),
  "schema/check-frameworks.mjs": plain("a framework's maps_to targets are canonical record routes"),
  "schema/check-governance.mjs": { kind: "unwired", reason: "decides who is a founder from the holder label (h.kind === \"founder\") to require and match the founder agreement, the same pattern as check-people.mjs; the rest is reference and arithmetic" },
  "schema/check-integrations.mjs": plain("integration ids are unique and an interface reaches three other layers"),
  "schema/check-leaks.mjs": plain("matches internal-term patterns in public text; it finds words and does not decide what a thing is"),
  "schema/check-nextjs-status.mjs": plain("status ledger rows cite files and pages that exist"),
  "schema/check-nouns.mjs": symbolic,
  "schema/check-people.mjs": { kind: "unwired", reason: "decides who is a founder from the role label (role.founder), and EE-095 records that founder records are not yet checked against the founder term" },
  "schema/check-private.mjs": plain("private records never reach a use_model step"),
  "schema/check-provenance.mjs": plain("the hash chain of the provenance log"),
  "schema/check-publication.mjs": plain("publication policy references, channels and approvals"),
  "schema/check-publications.mjs": plain("manifest entries match built outputs by sha256 and carry a person as approver"),
  "schema/check-ready.mjs": plain("a handoff's definition of ready: objective fields present"),
  "schema/check-reasons.mjs": plain("cited files still match the hash frozen at approval"),
  "schema/check-roadmap.mjs": plain("roadmap steps form no cycle and name known frames and roles"),
  "schema/check-sdlc-catalog.ts": plain("catalog ids, decision classes and task references are unique and known"),
  "schema/check-sources.mjs": plain("the source map names known connectors and write modes"),
  "schema/check-team.mjs": plain("team plan tasks cite known capabilities and keep escalate classes with a person"),
  "schema/check-telos.mjs": plain("every exit criterion traces to a known measure"),
  "schema/check-types-test.ts": plain("proves the type gate catches what it must"),
  "schema/check-types.ts": plain("runs tsc over the code"),
  "schema/check-validation-study.mjs": plain("interviews, feedback and bugs reference records that exist"),
  "schema/check-validation.mjs": plain("grades evidence by GRADE arithmetic"),
  "schema/check-ventures.mjs": plain("venture ids, parents and links resolve, and no venture is its own ancestor"),
  "schema/check-visibility.mjs": plain("each public fact came through the visibility gate"),
  "schema/check-where-used.mjs": plain("each live child shows its parent's value"),
  "schema/gate-drafts.mjs": plain("stores held writes and their variants"),
  "schema/gate-test.mjs": plain("tests the write gate"),
  "schema/gate.mjs": plain("the write gate: route rules, pins and role access decide what happens to a write, not a term"),
  "schema/ontology-gate-test.ts": plain("tests the membership gate, which is registered as symbolic"),
  "schema/ontology-gate.ts": symbolic,
  "scripts/reconcile-ideas.ts": symbolic,
};

const ENGINE = "schema/terms/engine.ts";
const ADMIT = "schema/terms/admit.ts";
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
  const dir = join(root, "lean/Naive");
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

function discover(root: string): string[] {
  const dir = join(root, "schema");
  return readdirSync(dir)
    .filter((f) => (f.startsWith("check-") || f.includes("gate")) && /\.[cm]?[jt]s$/.test(f) && isFile(join(dir, f)))
    .map((f) => `schema/${f}`);
}

const BYPASS = `neither imports ${ENGINE} nor runs ${ADMIT}, and names no Lean theorem in lean/Naive`;

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
    put("lean/Naive/Fixture.lean", "/- a theorem answers for every x -/\ntheorem fixture_holds : True := trivial\n");
    const byLabel = "export const member = (x) => x.label === \"founder\";\n";
    put("schema/check-wired.mjs", `import { run } from "./terms/engine.ts";\nexport const member = (t, x) => run(t, x);\n`);
    put("schema/check-bare.mjs", byLabel);
    put("schema/member-lib.mjs", `export { run } from "./terms/engine.ts";\n`);
    put("schema/check-via.mjs", `import { run } from "./member-lib.mjs";\nexport const member = (t, x) => run(t, x);\n`);
    put("schema/check-admit.mjs", `import { spawnSync } from "node:child_process";\nspawnSync("node", ["schema/terms/admit.ts", "--check"]);\n`);
    put("schema/check-lean.mjs", `// Proved for every case by theorem fixture_holds.\n${byLabel}`);
    put("schema/check-fake-lean.mjs", `// a theorem answers for every x\n${byLabel}`);
    put("schema/check-commented.mjs", `// import { run } from "./terms/engine.ts";\n${byLabel}`);
    put("schema/check-shape.mjs", byLabel);
    put("schema/check-debt.mjs", byLabel);
    put("schema/check-paid.mjs", `import { run } from "./terms/engine.ts";\nexport { run };\n`);
    put("schema/check-new.mjs", `import { run } from "./terms/engine.ts";\nexport { run };\n`);
    put("schema/role-gate.mjs", byLabel);
    const engineImport = `import { run } from "./terms/engine.ts";`;
    put("schema/check-single-quote.mjs", `import { run } from './terms/engine.ts';\nexport { run };\n`);
    put("schema/check-mixed-type.ts", `import { run, type Term } from "./terms/engine.ts";\nexport { run };\nexport type { Term };\n`);
    put("schema/check-dynamic.mjs", `const quote = /["'\`]/;\nexport const load = () => quote && import("./terms/engine.ts");\n`);
    put("schema/check-admit-var.mjs", `import { execFileSync } from "node:child_process";\nconst script = new URL("./terms/admit.ts", import.meta.url).pathname;\nexecFileSync(process.execPath, [script, "--check"]);\n`);
    put("schema/check-trailing-comment.mjs", `const x = 1; // ${engineImport}\n${byLabel}`);
    put("schema/check-block-comment.mjs", `const x = 1; /* ${engineImport} */\n${byLabel}`);
    put("schema/check-in-string.mjs", `const text = '${engineImport}';\n${byLabel}`);
    put("schema/check-in-template.mjs", `const text = \`${engineImport}\`;\n${byLabel}`);
    put("schema/check-admit-message.mjs", `export const hint = () => { throw new Error("run node schema/terms/admit.ts --check first"); };\n${byLabel}`);
    put("schema/check-type-import.ts", `import type { Term } from "./terms/engine.ts";\nexport type T = Term;\n${byLabel}`);
    put("schema/check-type-names.ts", `import { type Term, type Base } from "./terms/engine.ts";\nexport type T = [Term, Base];\n${byLabel}`);
    put("schema/type-lib.ts", `export type { Term } from "./terms/engine.ts";\n${byLabel}`);
    put("schema/check-type-via.ts", `import { member } from "./type-lib.ts";\nexport { member };\n`);
    put("schema/check-common.cjs", byLabel);
    const registry: Registry = {
      "schema/check-wired.mjs": symbolic, "schema/check-bare.mjs": symbolic, "schema/check-via.mjs": symbolic,
      "schema/check-admit.mjs": symbolic, "schema/check-lean.mjs": symbolic, "schema/check-fake-lean.mjs": symbolic,
      "schema/check-commented.mjs": symbolic, "schema/check-gone.mjs": symbolic,
      "schema/check-single-quote.mjs": symbolic, "schema/check-mixed-type.ts": symbolic, "schema/check-dynamic.mjs": symbolic,
      "schema/check-admit-var.mjs": symbolic, "schema/check-trailing-comment.mjs": symbolic, "schema/check-block-comment.mjs": symbolic,
      "schema/check-in-string.mjs": symbolic, "schema/check-in-template.mjs": symbolic, "schema/check-admit-message.mjs": symbolic,
      "schema/check-type-import.ts": symbolic, "schema/check-type-names.ts": symbolic, "schema/check-type-via.ts": symbolic,
      "schema/check-shape.mjs": plain("fixture: decides shape"),
      "schema/check-debt.mjs": { kind: "unwired", reason: "fixture debt" },
      "schema/check-paid.mjs": { kind: "unwired", reason: "fixture debt, since paid" },
    };
    const findings = audit(root, registry);
    const fails = findings.filter((f) => f.fail).map((f) => f.file);
    const named = (file: string): boolean => fails.includes(file);
    expect("fixture: a check wired through the engine passes", !named("schema/check-wired.mjs"));
    expect("fixture: a check that decides membership without the engine fails, named", named("schema/check-bare.mjs"));
    expect("fixture: an engine import through a module the check imports counts", !named("schema/check-via.mjs"));
    expect("fixture: running schema/terms/admit.ts counts", !named("schema/check-admit.mjs"));
    expect("fixture: naming a theorem lean/Naive declares counts", !named("schema/check-lean.mjs"));
    expect("fixture: a theorem name lean/Naive does not declare does not count", named("schema/check-fake-lean.mjs"));
    expect("fixture: a commented-out engine import does not count", named("schema/check-commented.mjs"));
    expect("fixture: an unregistered check fails even when wired", named("schema/check-new.mjs"));
    expect("fixture: an unregistered gate that skips the engine fails", named("schema/role-gate.mjs"));
    expect("fixture: a registered path that is gone fails", named("schema/check-gone.mjs"));
    expect("fixture: an unwired entry that now reaches the engine fails", named("schema/check-paid.mjs"));
    expect("fixture: a not-symbolic check passes", !named("schema/check-shape.mjs"));
    expect("fixture: a single-quoted engine import counts", !named("schema/check-single-quote.mjs"));
    expect("fixture: an engine import that also names a type counts", !named("schema/check-mixed-type.ts"));
    expect("fixture: a dynamic engine import after a regex holding quotes counts", !named("schema/check-dynamic.mjs"));
    expect("fixture: admit's path passed to execFile through a variable counts", !named("schema/check-admit-var.mjs"));
    expect("fixture: an engine import in a trailing // comment does not count", named("schema/check-trailing-comment.mjs"));
    expect("fixture: an engine import in a mid-line block comment does not count", named("schema/check-block-comment.mjs"));
    expect("fixture: an engine import inside a single-quoted string does not count", named("schema/check-in-string.mjs"));
    expect("fixture: an engine import inside a template literal does not count", named("schema/check-in-template.mjs"));
    expect("fixture: a message that mentions admit.ts does not count as running it", named("schema/check-admit-message.mjs"));
    expect("fixture: an import type of the engine does not count", named("schema/check-type-import.ts"));
    expect("fixture: an import of only type names from the engine does not count", named("schema/check-type-names.ts"));
    expect("fixture: reaching the engine only through a type-only re-export does not count", named("schema/check-type-via.ts"));
    expect("fixture: an unregistered .cjs check fails", named("schema/check-common.cjs"));
    expect("fixture: an unwired entry is reported, not failed", !named("schema/check-debt.mjs") && findings.some((f) => f.file === "schema/check-debt.mjs" && !f.fail));
    const want = [
      "schema/check-admit-message.mjs", "schema/check-bare.mjs", "schema/check-block-comment.mjs", "schema/check-commented.mjs",
      "schema/check-common.cjs", "schema/check-fake-lean.mjs", "schema/check-gone.mjs", "schema/check-in-string.mjs",
      "schema/check-in-template.mjs", "schema/check-new.mjs", "schema/check-paid.mjs", "schema/check-trailing-comment.mjs",
      "schema/check-type-import.ts", "schema/check-type-names.ts", "schema/check-type-via.ts", "schema/role-gate.mjs",
    ];
    expect("fixture: exactly the bypassing and unregistered files fail", JSON.stringify(fails) === JSON.stringify(want), fails.join(", "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixtureCases();
  const repo = join(dirname(new URL(import.meta.url).pathname), "../..");
  const findings = audit(repo, REGISTRY);
  for (const f of findings) console.log(`${f.fail ? "FAIL" : "note"}  ${f.file} ${f.says}`);
  expect("no symbolic check in the repository bypasses EE-095", !findings.some((f) => f.fail));
  console.log(failed ? `${failed} failed` : "EE-095 bypass guard: all pass");
  process.exit(failed ? 1 : 0);
}
