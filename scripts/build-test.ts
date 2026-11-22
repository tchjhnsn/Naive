// Tests the compiled package's build (scripts/build.ts, EE-159): which files are compiled, the renaming of string
// literals that name a compiled .ts file, and the refusal of a relative import that names no file. The packed
// install tests (packages/naive/src/engine/workspace-init-test.mjs, packages/create-venture/test.mjs) prove that the
// result runs from node_modules.
//
//   node scripts/build-test.ts
import { isCode, outPath, rewrite } from "./build.ts";

let failed = 0;
const t = (name: string, fn: () => void): void => {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e instanceof Error ? e.message : String(e)}`); }
};
const eq = (a: unknown, b: unknown): void => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

t("code is .ts and .mjs outside fixtures, less declarations and recipes, which Naive reads as data", () => {
  eq(["a/x.ts", "a/x.mjs", "a/x.d.ts", "a/p.recipe.ts", "a/fixtures/f.ts", "a/x.json", "a/x.md"].filter(isCode), ["a/x.ts", "a/x.mjs"]);
  eq([outPath("a/x.ts"), outPath("a/x.mjs")], ["a/x.js", "a/x.mjs"]);
});

const compiled = new Set(["packages/naive/src/engine/trace-cli.ts", "packages/naive/src/terms/admit.ts"]);
const outputs = new Set(["packages/naive/src/engine/trace-cli.js", "packages/naive/src/terms/admit.js", "packages/naive/src/terms/engine.mjs"]);
const file = "packages/naive/src/terms/run.mjs";

t("a string that names a compiled .ts file, from the package root or from the file, is renamed to .js", () => {
  const r = rewrite(file, `run("packages/naive/src/engine/trace-cli.ts"); spawn(new URL('./admit.ts', import.meta.url));\n`, compiled, outputs);
  eq(r.text, `run("packages/naive/src/engine/trace-cli.js"); spawn(new URL('./admit.js', import.meta.url));\n`);
  eq(r.missing, []);
});

t("a .ts string that names no compiled file is left: a suffix, a recipe, a declaration, an escaped or a template one", () => {
  const text = "a.endsWith(\".recipe.ts\"); b(\"signals.recipe.ts\"); c(\"./types/x.d.ts\"); d(\"./adm\\x69t.ts\"); e(`${x}/admit.ts`); f(\"usage: node admit.ts\");\n";
  eq(rewrite(file, text, compiled, outputs).text, text);
});

t("a relative import, export, import() or require() that names no file in the output is reported", () => {
  const text = `import a from "./engine.mjs"; export * from "./gone.mjs"; await import("./admit.ts"); require("../nope.js"); import "node:fs";\n`;
  eq(rewrite(file, text, compiled, outputs).missing, [`${file}: ./gone.mjs`, `${file}: ../nope.js`]);
});

process.exit(failed ? 1 : 0);
