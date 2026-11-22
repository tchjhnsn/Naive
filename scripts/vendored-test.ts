// Breaks scripts/vendored.ts on copies: a vendored version that differs from the pin, and a missing copy.
//
//   node scripts/vendored-test.ts
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { check } from "./vendored.ts";

const copy = (pin: string, vendored: string | null): string => {
  const root = mkdtempSync(join(tmpdir(), "vendored-"));
  writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { effect: pin } }));
  if (vendored) {
    mkdirSync(join(root, "repos/effect/packages/effect"), { recursive: true });
    writeFileSync(join(root, "repos/effect/packages/effect/package.json"), JSON.stringify({ version: vendored }));
  }
  return root;
};

const cases: [string, string, string | null, RegExp | null][] = [
  ["matching version passes", "4.1.5", "4.1.5", null],
  ["a newer vendored copy fails", "4.1.5", "4.2.0", /repos\/effect is 4\.2\.0 but package\.json pins effect 4\.1\.5/],
  ["a missing copy fails", "4.1.5", null, /missing packages\/effect\/package\.json/],
];
for (const [name, pin, vendored, expected] of cases) {
  const root = copy(pin, vendored);
  try {
    const errors = check(root);
    if (expected) assert.match(errors.join("\n"), expected, name);
    else assert.deepEqual(errors, [], name);
    console.log(`ok    ${name}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
}
console.log("pass  vendored check breaks on copies");
