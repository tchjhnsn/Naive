// Cases for scripts/to-ts.ts: which references to a renamed module are rewritten and which are left.
//
//   node scripts/to-ts-test.ts
import assert from "node:assert/strict";
import { plan, rewrite } from "./to-ts.ts";

let failed = 0;
const t = (name: string, fn: () => void): void => {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}\n     ${e instanceof Error ? e.message : String(e)}`); }
};

const tracked = new Set([
  "packages/naive/src/engine/phase-gate.mjs",
  "packages/naive/src/engine/foundation.mjs",
  "packages/naive/src/checks/foundation.mjs",
  "packages/naive/src/router/routes.mjs",
  "AGENTS.md",
]);
const renames = plan(["packages/naive/src/engine/phase-gate.mjs", "packages/naive/src/engine/foundation.mjs"], tracked);

t("plan renames .mjs to .ts and refuses what is not a tracked .mjs", () => {
  assert.deepEqual(renames[0], { from: "packages/naive/src/engine/phase-gate.mjs", to: "packages/naive/src/engine/phase-gate.ts" });
  assert.throws(() => plan(["AGENTS.md"], tracked), /not a \.mjs file/);
  assert.throws(() => plan(["packages/naive/src/engine/nope.mjs"], tracked), /not a tracked file/);
});

t("relative, root and package paths to the module are rewritten", () => {
  const file = "packages/naive/src/router/routes.mjs";
  const text = `import { a } from "../engine/phase-gate.mjs";\ncmd("packages/naive/src/engine/phase-gate.mjs");\nimport("naive-framework/src/engine/foundation.mjs");\n`;
  assert.equal(rewrite(file, text, renames, tracked), `import { a } from "../engine/phase-gate.ts";\ncmd("packages/naive/src/engine/phase-gate.ts");\nimport("naive-framework/src/engine/foundation.ts");\n`);
});

t("a path to another file with the same name is left, and so is a bare name two files share", () => {
  const file = "packages/naive/src/router/routes.mjs";
  const text = `import "../checks/foundation.mjs"; // foundation.mjs\n`;
  assert.equal(rewrite(file, text, renames, tracked), text);
});

t("a bare name only one file has is rewritten, and a longer name is left", () => {
  const text = "`phase-gate.mjs` grades items; phase-gate.mjsx and my-phase-gate.mjs are other names.\n";
  assert.equal(rewrite("AGENTS.md", text, renames, tracked), "`phase-gate.ts` grades items; phase-gate.mjsx and my-phase-gate.mjs are other names.\n");
});

t("a glob is a pattern, not a reference, and is left", () => {
  const r = plan(["packages/naive/src/router/routes.mjs"], tracked);
  const text = `"!**/routes.mjs", "!**/*-routes.mjs"`;
  assert.equal(rewrite("package.json", text, r, tracked), text);
});

process.exit(failed ? 1 : 0);
