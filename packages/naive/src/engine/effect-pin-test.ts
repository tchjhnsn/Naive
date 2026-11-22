// Tests one Effect, shared (phase 9 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md): Naive's peer pin,
// aligning a venture's pin, the effect-pin migration through an upgrade, and the one-copy check.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { alignPin, checkCopies, venturePin, wantedPin } from "./effect-pin.ts";
import { PACKAGE_ROOT } from "../core/scripts.ts";
import { upgrade } from "./upgrades.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const want = wantedPin();
const venture = (pkg?: unknown) => {
  const dir = mkdtempSync(join(tmpdir(), "naive-effect-pin-"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "kettle", name: "Kettle", phase: "discovery" }));
  if (pkg !== undefined) writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  return dir;
};
const pkgOf = (dir: string) => JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));

await test("Naive declares effect as an exact peer dependency, matching its dev copy", () => {
  const root = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
  assert.match(want, /^\d+\.\d+\.\d+$/);
  assert.equal(root.peerDependencies.effect, want);
  assert.equal(root.devDependencies.effect, want);
  assert.equal(root.dependencies?.effect, undefined);
});

await test("alignPin writes the pin, moves one out of devDependencies, and leaves an aligned venture and one with no package.json alone", () => {
  const a = venture({ name: "kettle", devDependencies: { effect: "4.0.0", "naive-framework": "^0.6.0" } });
  assert.deepEqual(alignPin(a), { from: "4.0.0", to: want });
  assert.equal(pkgOf(a).dependencies.effect, want);
  assert.equal(pkgOf(a).devDependencies.effect, undefined);
  assert.equal(pkgOf(a).devDependencies["naive-framework"], "^0.6.0");
  assert.equal(alignPin(a), null);
  const b = venture();
  assert.equal(alignPin(b), null);
  assert.equal(venturePin(b), undefined);
  for (const d of [a, b]) rmSync(d, { recursive: true });
});

await test("the one-copy check passes a pinned venture, fails a wrong pin, fails a second version and passes a second install at the same version", () => {
  const none = venture();
  assert.ok(checkCopies(none).ok);
  const wrong = venture({ dependencies: { effect: "4.0.0" } });
  const w = checkCopies(wrong);
  assert.ok(!w.ok && /pins effect 4\.0\.0, but Naive needs exactly/.test(w.message), w.message);
  const pinned = venture({ dependencies: { effect: want } });
  assert.ok(checkCopies(pinned).ok, checkCopies(pinned).message);
  // A second copy: a venture whose node_modules holds its own effect package.
  mkdirSync(join(pinned, "node_modules/effect"), { recursive: true });
  writeFileSync(join(pinned, "node_modules/effect/package.json"), JSON.stringify({ name: "effect", version: want }));
  const two = checkCopies(pinned);
  assert.ok(two.ok && /installed twice at the same version/.test(two.message), two.message);
  writeFileSync(join(pinned, "node_modules/effect/package.json"), JSON.stringify({ name: "effect", version: "4.0.0" }));
  const other = checkCopies(pinned);
  assert.ok(!other.ok && /two versions of effect/.test(other.message), other.message);
  // The same copy, linked: one copy resolves.
  rmSync(join(pinned, "node_modules/effect"), { recursive: true });
  symlinkSync(join(PACKAGE_ROOT, "node_modules/effect"), join(pinned, "node_modules/effect"));
  assert.ok(checkCopies(pinned).ok, checkCopies(pinned).message);
  for (const d of [none, wrong, pinned]) rmSync(d, { recursive: true });
});

await test("naive upgrade runs the effect-pin migration and logs it", async () => {
  const dir = venture({ name: "kettle", devDependencies: { "naive-framework": "^0.6.0" } });
  const r = await upgrade(dir, { git: false });
  assert.ok(r.release.migrations.some((m) => m.id === "effect-pin" && m.rewrote.includes("package.json")), JSON.stringify(r.release.migrations));
  assert.equal(pkgOf(dir).dependencies.effect, want);
  const log = readFileSync(join(dir, "provenance.jsonl"), "utf8");
  assert.match(log, /effect-pin: pinned effect/);
  rmSync(dir, { recursive: true });
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
