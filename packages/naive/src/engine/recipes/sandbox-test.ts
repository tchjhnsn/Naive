// Tests the recipe sandbox (packages/naive/src/engine/recipes/sandbox.ts): the design's example recipe renders,
// and the clock, randomness, eval, imports, an endless loop, state between calls, the file system and the
// environment each fail closed. Ends with 1,000 calls of 40 signals in one child and prints the time.
//
//   node packages/naive/src/engine/recipes/sandbox-test.ts

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { checkReceptions, childArgs, lintRecipe, recipeExports, runRecipe, runRecipes, scan } from "./sandbox.ts";
import type { Result, RecipeOutput } from "./sandbox.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const show = (r: unknown): string => String(JSON.stringify(r)).slice(0, 400);
const failsWith = (r: Result<RecipeOutput>, pattern: RegExp): boolean => !r.ok && pattern.test(r.reason);

const example = readFileSync(new URL("./fixtures/signals.recipe.ts", import.meta.url), "utf8");
const DAY = 86_400_000, t0 = Date.parse("2026-06-01T00:00:00Z");
type Sig = { id: string; type: string; producer: string; subject: string; time: number; observed: number; rating: { reliability: string; credibility: number }; props: Record<string, unknown>; withdrawn: boolean };
const sig = (id: string, type: string, props: Record<string, unknown>, rating: [string, number], days: number, withdrawn = false): Sig =>
  ({ id, type, producer: "mentura/research", subject: "acme", time: t0 + days * DAY, observed: t0 + days * DAY + DAY, rating: { reliability: rating[0], credibility: rating[1] }, props, withdrawn });
const input = {
  route: "competitors/acme/signals", id: "acme", asOf: t0 + 120 * DAY, facts: { markets: ["us-smb"] },
  signals: [
    sig("5f1d2a9c0b7e4d3a8c6b1e2f", "organization@1.0", { name: "Acme" }, ["A", 1], 0),
    sig("0a4c6e8f1b3d5a7c9e2f4b6d", "competitor-funding@1.1", { round: { stage: "seed", amount: 3000000 } }, ["B", 2], 10),
    sig("9e8d7c6b5a4f3e2d1c0b9a8f", "competitor-funding@1.1", { round: { stage: "series-a", amount: 9000000 } }, ["D", 4], 20),
    sig("1a2b3c4d5e6f7a8b9c0d1e2f", "job-posting@1.0", { title: "AE" }, ["B", 2], 100),
    sig("2b3c4d5e6f7a8b9c0d1e2f3a", "product-launch@1.0", { name: "Acme Flow", market: "eu-ent" }, ["B", 2], 110),
    sig("3c4d5e6f7a8b9c0d1e2f3a4b", "competitor-funding@1.1", { round: { stage: "seed" } }, ["A", 1], 30, true),
  ],
};
const quick = { callMs: 1000, wallMs: 20000 };
// A recipe that returns a record with the value of an expression, receptions for nothing heard.
const probe = (expr: string, prefix = ""): string => `${prefix}\nexport const hears = { signals: [] };\nexport const knobs = {};\nexport default function render() { return { record: { v: ${expr} }, receptions: [] }; }\n`;
const empty = { signals: [] };

// ---------------------------------------------------------------------------------------------------------
// The example recipe renders.
// ---------------------------------------------------------------------------------------------------------

const rendered = await runRecipe(example, input, null, quick);
expect("the design's example recipe renders with its own knobs", rendered.ok, show(rendered));
if (rendered.ok) {
  const rec = rendered.output.record as { funding: { stage: string }[]; launches: unknown[]; first_seen: string; last_seen: string; p_raise_90d: number } | null;
  expect("it keeps the B2 seed round and drops the D4 series A", rec !== null && rec.funding.length === 1 && rec.funding[0].stage === "seed", show(rec));
  expect("a launch outside the venture's markets is noise, a withdrawn round is noise", rec !== null && rec.launches.length === 0
    && rendered.output.receptions.filter((r) => r.kind === "noise").length === 3, show(rendered.output.receptions));
  expect("dates are UTC and the forecast is a probability", rec !== null && rec.first_seen === "2026-06-01" && rec.last_seen === "2026-09-09" && rec.p_raise_90d > 0 && rec.p_raise_90d < 1, show(rec));
  expect("one reception per heard signal", checkReceptions(input, rendered.output.receptions) === null);
}
const loose = await runRecipe(example, input, { min_rating: "D4", recent_days: 90, launch_weight: 0.5 }, quick);
expect("knobs passed in replace the recipe's own: D4 keeps both rounds", loose.ok && (loose.output.record as { funding: unknown[] }).funding.length === 2, show(loose));
const exportsOf = await recipeExports(example, quick);
expect("hears and knobs are read in the sandbox", exportsOf.ok && (exportsOf.output.hears.signals as string[]).length === 4 && exportsOf.output.knobs.recent_days === 90, show(exportsOf));
const twice = await runRecipes(example, [{ input, knobs: null }, { input, knobs: null }], quick);
expect("two calls of one recipe give identical outputs", twice.length === 2 && twice[0].ok && JSON.stringify(twice[0]) === JSON.stringify(twice[1]));
const typeOnly = await runRecipe(`import type { X } from "./types.ts";\n${probe("1 as number")}`, empty, null, quick);
expect("a type-only import is erased with the types", typeOnly.ok, show(typeOnly));
const listed = await runRecipe(`const hears = { signals: [] };\nconst knobs = {};\nexport { hears, knobs };\nexport default (i: unknown, k: object) => ({ record: null, receptions: [] });\n`, empty, null, quick);
expect("export lists and a default arrow are accepted", listed.ok, show(listed));

// ---------------------------------------------------------------------------------------------------------
// Each way out fails closed.
// ---------------------------------------------------------------------------------------------------------

const cases: [string, string, RegExp][] = [
  ["clock: Date.now()", probe("Date.now()"), /reads the clock/],
  ["clock: new Date()", probe("new Date().getTime()"), /reads the clock/],
  ["clock: Date()", probe("Date()"), /reads the clock/],
  ["clock: the original constructor through a date's prototype", probe("new (new Date(0).constructor)().getTime()"), /reads the clock/],
  ["clock: Date.prototype.constructor.now()", probe("Date.prototype.constructor.now()"), /reads the clock/],
  ["random: Math.random()", probe("Math.random()"), /not deterministic/],
  ["eval: new Function", probe(`new Function("return 1")()`), /Code generation from strings disallowed/],
  ["eval: eval is gone", probe(`eval("1")`), /eval is not defined/],
  ["eval: the global's constructor.constructor", probe(`globalThis.constructor.constructor("return process")()`), /Code generation from strings disallowed/],
  ["eval: an async function's constructor", probe(`(async () => 1).constructor("return 1")`), /Code generation from strings disallowed/],
  ["import: dynamic import()", probe(`import("node:fs")`), /lint: .*imports/],
  ["import: static import", probe("1", `import fs from "node:fs";`), /lint: .*imports/],
  ["import: import.meta", probe("import.meta.url"), /lint: .*imports/],
  ["import: re-export from a module", `export * from "node:fs";\n${probe("1")}`, /lint: .*not a form/],
  ["import: an escaped keyword", probe("1", `\\u0069mport("node:fs");`), /lint: .*backslash/],
  ["fs: require", probe(`require("node:fs").readFileSync("/etc/passwd", "utf8")`), /require is not defined/],
  ["fs: process.binding", probe(`process.binding("fs")`), /process is not defined/],
  ["env: process.env", probe("process.env.HOME"), /process is not defined/],
  ["env: globalThis.process", probe("globalThis.process.env"), /Cannot read properties of undefined/],
  ["env: Intl reads the host locale, and is gone", probe(`new Intl.DateTimeFormat().resolvedOptions().timeZone`), /Intl is not defined/],
  ["env: locale methods are gone", probe(`"a".localeCompare("b")`), /localeCompare is not a function/],
  ["realm: console is gone", probe(`console.log("x")`), /console is not defined/],
  ["output: an async default function returns a promise, not the contract", `export const hears = { signals: [] };\nexport const knobs = {};\nexport default async function render() { return { record: null, receptions: [] }; }\n`, /exactly record and receptions/],
  ["output: a throw is reported", probe(`(() => { throw new RangeError("boom"); })()`), /RangeError: boom/],
  ["output: a thrown non-error is reported without calling it", probe(`(() => { throw { toString() { while (true) {} } }; })()`), /threw a object/],
  ["types: an enum is not erasable", probe("1", "enum E { A }"), /types cannot be stripped/],
  ["contract: no knobs export", `export const hears = { signals: [] };\nexport default function render() { return { record: null, receptions: [] }; }\n`, /exports hears, knobs and a default function/],
  ["contract: no default export", `export const hears = { signals: [] };\nexport const knobs = {};\n`, /no default export/],
  ["contract: a default class", `export const hears = { signals: [] };\nexport const knobs = {};\nexport default class R {}\n`, /exports a class/],
  ["names: __naive is reserved", probe("__naive_io"), /belong to the sandbox/],
];
for (const [name, source, pattern] of cases) {
  const r = await runRecipe(source, empty, null, quick);
  expect(`fails closed, ${name}`, failsWith(r, pattern), show(r));
}

const removed = await runRecipe(probe(`[typeof WeakRef, typeof FinalizationRegistry, typeof SharedArrayBuffer, typeof Atomics, typeof WebAssembly, typeof Intl, typeof process, typeof require, typeof fetch, typeof setTimeout].join()`), empty, null, quick);
expect("WeakRef, FinalizationRegistry, SharedArrayBuffer, Atomics, WebAssembly, Intl, process, require, fetch and timers are absent",
  removed.ok && (removed.output.record as { v: string }).v === Array(10).fill("undefined").join(), show(removed));
const tz = await runRecipe(probe(`[new Date(0).getTimezoneOffset(), new Date(0).getHours(), new Date(Date.UTC(2026, 0, 1)).toISOString()].join()`), empty, null, quick);
expect("a given time still parses, and the zone is UTC", tz.ok && (tz.output.record as { v: string }).v === "0,0,2026-01-01T00:00:00.000Z", show(tz));

// An endless loop: with the per-call limit above the wall time, the host kills the child.
let t = Date.now();
const endless = await runRecipe(probe("(() => { while (true) {} })()"), empty, null, { callMs: 60000, wallMs: 1500 });
expect("loop: an endless loop is killed at the wall time", failsWith(endless, /wall time of 1500 ms/) && Date.now() - t < 10000, `${show(endless)} after ${Date.now() - t} ms`);
const perCall = await runRecipe(probe("(() => { while (true) {} })()"), empty, null, { callMs: 200, wallMs: 20000 });
expect("loop: the per-call limit stops a loop inside the child", failsWith(perCall, /timed out after 200ms/), show(perCall));
const micro = await runRecipe(probe(`(Promise.resolve().then(() => { while (true) {} }), 1)`), empty, null, { callMs: 200, wallMs: 20000 });
expect("loop: a loop in a microtask is inside the per-call limit too", failsWith(micro, /timed out after 200ms/), show(micro));
const memory = await runRecipe(probe("(() => { const a = []; for (;;) a.push(new Array(1e5).fill(a.length)); })()"), empty, null, { callMs: 60000, wallMs: 30000, memoryMb: 32 });
expect("memory: past the heap cap the child dies and the call fails", !memory.ok && !/wall time/.test(memory.reason), show(memory));
const flood = await runRecipe(probe(`"x".repeat(1e6)`), empty, null, { ...quick, maxOutputBytes: 100000 });
expect("output: a reply past the output cap is killed", failsWith(flood, /more than 100000 bytes/), show(flood));

// State: module state, globals and prototypes do not carry from one call to the next in the same child.
const stateful = `let n = 0;\nexport const hears = { signals: [] };\nexport const knobs = {};\nexport default function render() {\n  n += 1;\n  const g = globalThis as unknown as { seen?: number };\n  g.seen = (g.seen ?? 0) + 1;\n  const p = Object.prototype as unknown as { mark?: number };\n  p.mark = (p.mark ?? 0) + 1;\n  return { record: { n, seen: g.seen, mark: p.mark }, receptions: [] };\n}\n`;
const states = await runRecipes(stateful, [{ input: empty, knobs: null }, { input: empty, knobs: null }, { input: empty, knobs: null }], quick);
expect("state: three calls in one child each start from nothing", states.every((s) => s.ok && JSON.stringify(s.output.record) === `{"n":1,"seen":1,"mark":1}`), show(states));

// The child itself runs with no grant.
const granted = spawnSync(process.execPath, [...childArgs(64), "-e", `process.stdout.write(JSON.stringify(["fs.read", "fs.write", "child", "worker"].map((s) => process.permission.has(s))) + Object.keys(process.env).join())`], { env: { TZ: "UTC" }, encoding: "utf8" });
expect("the child has no file system, child process or worker grant, and only TZ in its environment", granted.stdout === "[false,false,false,false]TZ", `${granted.stdout} ${granted.stderr}`);
expect("the child's command line grants nothing", childArgs(64).every((a) => !a.startsWith("--allow-")));

// ---------------------------------------------------------------------------------------------------------
// Lint.
// ---------------------------------------------------------------------------------------------------------

const lintOpts = { subjects: ["acme"], signals: ["0a4c6e8f1b3d5a7c9e2f4b6d"] };
expect("lint: the example recipe passes with the input's subject and signals", lintRecipe(example, { subjects: ["acme"], signals: input.signals.map((s) => s.id) }).length === 0, lintRecipe(example, lintOpts).join("; "));
expect("lint: a string literal holding the subject id is refused", lintRecipe(probe(`"acme"`), lintOpts).some((p) => /subject id "acme"/.test(p)));
expect("lint: a route in a template literal is refused", lintRecipe(probe("`competitors/acme/${1}`"), lintOpts).length === 1);
expect("lint: a literal inside a template substitution is refused", lintRecipe(probe("`x${'acme'}y`"), lintOpts).length === 1);
expect("lint: a regular expression literal is refused", lintRecipe(probe("/^acme$/.test('')"), lintOpts).length === 1);
expect("lint: a signal address literal is refused", lintRecipe(probe(`"0a4c6e8f1b3d5a7c9e2f4b6d"`), lintOpts).some((p) => /signal address/.test(p)));
expect("lint: an escaped literal is cooked before it is compared", lintRecipe(probe(`"\\u0061cme"`), lintOpts).length === 1);
expect("lint: another slug that contains the id is not the id", lintRecipe(probe(`"acme-labs"`), lintOpts).length === 0);
expect("lint: the id in a comment or a name is not a literal", lintRecipe(probe("1", "// acme\nconst acme = 1;"), lintOpts).length === 0);
expect("lint: a source over the bound is refused", lintRecipe(probe("1"), { maxSourceBytes: 50 }).some((p) => /over the bound of 50/.test(p)));
const lintRun = await runRecipe(probe(`"acme"`), empty, null, { ...quick, ...lintOpts });
expect("lint: a run refuses before it starts a child", failsWith(lintRun, /^lint: /), show(lintRun));
expect("scan: a string that says import is a literal, not an import", lintRecipe(probe(`"import x from 'y'"`)).length === 0);
expect("scan: division is not a regular expression", lintRecipe(probe(`(4 / 2) / 1`)).length === 0);
expect("scan: an unterminated string fails the scan", !scan(`const a = "x;\n`).ok);

// ---------------------------------------------------------------------------------------------------------
// The output check.
// ---------------------------------------------------------------------------------------------------------

const two = { signals: [{ id: "s1" }, { id: "s2" }] };
const returning = (receptions: string, extra = ""): string => `export const hears = { signals: ["x@^1"] };\nexport const knobs = {};\nexport default function render(input: { signals: { id: string }[] }) { return { record: {}, receptions: ${receptions}${extra} }; }\n`;
const covered = await runRecipe(returning(`input.signals.map((s) => ({ kind: "noise", signal: s.id, why: "test" }))`), two, null, quick);
expect("receptions: one per heard signal passes", covered.ok, show(covered));
for (const [name, receptions, extra, pattern] of [
  ["a missing reception", `[{ kind: "salient", signal: input.signals[0].id, fields: [] }]`, "", /no reception for s2/],
  ["a repeated reception", `[...input.signals, input.signals[0]].map((s) => ({ kind: "noise", signal: s.id, why: "" }))`, "", /more than one reception/],
  ["a reception for a signal not heard", `[...input.signals.map((s) => s.id), "zz"].map((id) => ({ kind: "noise", signal: id, why: "" }))`, "", /not heard/],
  ["a reception of another kind", `input.signals.map((s) => ({ kind: "maybe", signal: s.id }))`, "", /not salient or noise/],
  ["an extra output key", `input.signals.map((s) => ({ kind: "noise", signal: s.id, why: "" }))`, ", extra: 1", /exactly record and receptions/],
] as const) {
  const r = await runRecipe(returning(receptions, extra), two, null, quick);
  expect(`receptions: ${name} fails`, failsWith(r, pattern), show(r));
}
const hooked = await runRecipe(returning(`input.signals.map((s) => ({ kind: "noise", signal: s.id, why: "" }))`), two, null, { ...quick, validateRecord: (rec) => (rec && "name" in rec ? null : "name is required") });
expect("record hook: the caller's schema check fails the call", failsWith(hooked, /fails its check: name is required/), show(hooked));
const hookThrows = await runRecipe(returning(`input.signals.map((s) => ({ kind: "noise", signal: s.id, why: "" }))`), two, null, { ...quick, validateRecord: () => { throw new Error("no schema"); } });
expect("record hook: a hook that throws fails the call", failsWith(hookThrows, /record check threw: no schema/), show(hookThrows));

// ---------------------------------------------------------------------------------------------------------
// Speed: 1,000 calls with 40 signals each, in one child.
// ---------------------------------------------------------------------------------------------------------

const forty = { ...input, signals: Array.from({ length: 40 }, (_, i) => sig(i.toString(16).padStart(24, "0"), ["competitor-funding@1.1", "job-posting@1.0", "product-launch@1.0", "organization@1.0"][i % 4], { round: { stage: `s${i}`, amount: i * 1000 }, name: `n${i}`, market: "us-smb" }, ["B", 2], i * 3)) };
t = Date.now();
const many = await runRecipes(example, Array.from({ length: 1000 }, () => ({ input: forty, knobs: null })), { callMs: 1000, wallMs: 60000 });
const ms = Date.now() - t;
expect(`speed: 1,000 calls with 40 signals each in one child take ${ms} ms, under 10 s`, many.every((r) => r.ok) && ms < 10000, show(many.find((r) => !r.ok)));

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
