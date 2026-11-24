// Tests the compiled package's build (scripts/build.ts, EE-159): which files are compiled, the renaming of string
// literals that name a compiled .ts file, and the refusal of a relative import that names no file. The packed
// install tests (packages/naive/src/engine/workspace-init-test.ts, packages/create-venture/test.ts) prove that the
// result runs from node_modules.
//
//   node scripts/build-test.ts
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isCode, outPath, rewrite, rewriteJson, unredact } from "./build.ts";

let failed = 0;
const t = (name: string, fn: () => void): void => {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e instanceof Error ? e.message : String(e)}`); }
};
const eq = (a: unknown, b: unknown): void => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} != ${JSON.stringify(b)}`); };

t("code is .ts and .mjs outside fixtures, less declarations and recipes, which Naive reads as data", () => {
  eq(["a/x.ts", "a/x.mjs", "a/x.d.ts", "a/p.recipe.ts", "a/fixtures/f.ts", "a/x.json", "a/x.md"].filter(isCode), ["a/x.ts", "a/x.mjs"]);
  eq([outPath("a/x.ts"), outPath("a/x.mjs")], ["a/x.mjs", "a/x.mjs"]);
});

t("a path npm 11 lists with a UUID redacted as *** is matched to the real file in its folder", () => {
  const root = mkdtempSync(join(tmpdir(), "naive-build-test-"));
  const id = ["2b1f4c0e", "8a8d", "4f0e", "9c55", "5d1d8f3a7e21"].join("-");
  mkdirSync(join(root, "events"));
  writeFileSync(join(root, "events", `${id}.json`), "{}");
  writeFileSync(join(root, "events", "note.json"), "{}");
  eq(unredact(root, "events/***.json"), [`events/${id}.json`]);
  eq(unredact(root, "events/note.json"), ["events/note.json"]);
  eq(unredact(root, "gone/***.json"), ["gone/***.json"]);
});

const compiled = new Set(["packages/naive/src/engine/trace-cli.ts", "packages/naive/src/terms/admit.ts"]);
const outputs = new Set(["packages/naive/src/engine/trace-cli.mjs", "packages/naive/src/terms/admit.mjs", "packages/naive/src/terms/engine.mjs"]);
const file = "packages/naive/src/terms/run.mjs";

t("a string that names a compiled .ts file, from the package root or from the file, is renamed to .mjs", () => {
  const r = rewrite(file, `run("packages/naive/src/engine/trace-cli.ts"); spawn(new URL('./admit.ts', import.meta.url));\n`, compiled, outputs);
  eq(r.text, `run("packages/naive/src/engine/trace-cli.mjs"); spawn(new URL('./admit.mjs', import.meta.url));\n`);
  eq(r.missing, []);
});

t("a JSON string that names a compiled .ts file from the package root is renamed, and nothing else changes", () => {
  const json = '{\n  "module": "packages/naive/src/engine/trace-cli.ts",\n  "other": "packages/naive/src/engine/missing.ts",\n  "note": "see trace-cli.ts"\n}\n';
  eq(rewriteJson(json, compiled), '{\n  "module": "packages/naive/src/engine/trace-cli.mjs",\n  "other": "packages/naive/src/engine/missing.ts",\n  "note": "see trace-cli.ts"\n}\n');
});

t("a .ts string that names no compiled file is left: a suffix, a recipe, a declaration, an escaped or a template one", () => {
  const text = "a.endsWith(\".recipe.ts\"); b(\"signals.recipe.ts\"); c(\"./types/x.d.ts\"); d(\"./adm\\x69t.ts\"); e(`${x}/admit.ts`); f(\"usage: node admit.ts\");\n";
  eq(rewrite(file, text, compiled, outputs).text, text);
});

t("a relative import, export, import() or require() that names no file in the output is reported", () => {
  const text = `import a from "./engine.mjs"; export * from "./gone.mjs"; await import("./admit.ts"); require("../nope.js"); import "node:fs";\n`;
  eq(rewrite(file, text, compiled, outputs).missing, [`${file}: ./gone.mjs`, `${file}: ../nope.js`]);
});

t("an import of a compiled .ts module is renamed to .mjs, the name every compiled file has", () => {
  eq(rewrite(file, `import { run } from "./admit.ts";\nexport * from "../engine/trace-cli.ts";\n`, compiled, outputs).text, `import { run } from "./admit.mjs";\nexport * from "../engine/trace-cli.mjs";\n`);
});

process.exit(failed ? 1 : 0);
