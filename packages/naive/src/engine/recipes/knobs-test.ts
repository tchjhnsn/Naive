// Tests packages/naive/src/engine/recipes/knobs.ts: reading a recipe's knobs from its source, replacing one value with
// every other byte unchanged, and the steps a knob search tries (autoresearch build plan item 10). Pure: no venture.
//
//   node packages/naive/src/engine/recipes/knobs-test.ts

import { readFileSync } from "node:fs";
import { formatKnob, knobsIn, setKnob, stepsOf } from "./knobs.ts";
import { recipeExports } from "./sandbox.ts";

let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const example = readFileSync(new URL("../../records/examples/signals/competitors/[id]/signals.recipe.ts", import.meta.url), "utf8");

// Reading.
const ex = knobsIn(example);
t("the example recipe's knobs read in source order with their values", ex.ok && eq(ex.knobs.map((k) => [k.name, k.value]), [["min_rating", "B2"], ["raise_base", 0.05], ["raise_per_month", 0.02]]), ex);
t("each knob's span is exactly its value's text", ex.ok && ex.knobs.every((k) => example.slice(k.at, k.end) === formatKnob(k.value)), ex);
const typed = `type K = { a: number };\nexport const knobs: K & { b: string } = { a: -2, "b": 'x', c: [1, "y", false], d: 90 * 2, e: true, f: \`t\`, g: SOME } as const;\nexport const hears = { signals: ["x@^1"] };\n`;
const ty = knobsIn(typed);
t("a type annotation and as const read the same", ty.ok && eq(ty.knobs.map((k) => [k.name, k.value]), [["a", -2], ["b", "x"], ["c", [1, "y", false]], ["e", true]]), ty);
t("a knob that is not a literal is skipped, with why", ty.ok && eq(ty.skipped.map((s) => s.name), ["d", "f", "g"]) && ty.skipped.every((s) => /not a literal/.test(s.why)), ty);
t("refused: no export const knobs", !knobsIn("export const hears = { signals: [] };\n").ok);
t("refused: a spread in the knobs literal", !knobsIn("const base = { a: 1 };\nexport const knobs = { ...base, b: 2 };\n").ok);
t("refused: a shorthand in the knobs literal", !knobsIn("const a = 1;\nexport const knobs = { a };\n").ok);
t("a comment inside the literal is not a knob", (() => { const k = knobsIn("export const knobs = { /* floor */ a: 1, // weight\n b: 0.5 };\n"); return k.ok && eq(k.knobs.map((x) => x.name), ["a", "b"]); })());

// Writing one knob back.
const set = setKnob(example, "raise_per_month", 0.04);
t("setKnob changes that value and nothing else", set.ok && set.source === example.replace("raise_per_month: 0.02", "raise_per_month: 0.04"), set);
const back = set.ok ? setKnob(set.source, "raise_per_month", 0.02) : set;
t("setting it back gives the source byte for byte", back.ok && back.source === example);
t("setKnob refuses a knob the recipe does not have", !setKnob(example, "nope", 1).ok);
t("a number is written to six significant digits", formatKnob(0.1 + 0.2) === "0.3" && formatKnob(Math.SQRT2 * 0.05) === "0.0707107" && formatKnob(["a", 1, true]) === `["a", 1, true]`);
const read = set.ok ? await recipeExports(set.source) : null;
t("the sandbox reads the written source back with the new value", read?.ok === true && eq(read.output.knobs, { min_rating: "B2", raise_base: 0.05, raise_per_month: 0.04 }), read);

// Steps.
t("a fraction doubles and halves", eq(stepsOf(0.02), [0.04, 0.01]));
t("a fraction stays within 0 and 1", eq(stepsOf(0.6), [1, 0.3]));
t("an integer stays an integer and moves by at least 1", eq(stepsOf(90), [180, 45]) && eq(stepsOf(1), [2, 0]) && eq(stepsOf(1, Math.SQRT2), [2, 0]));
t("zero steps to 1 and -1, and a negative number grows and shrinks in size", eq(stepsOf(0), [1, -1]) && eq(stepsOf(-3), [-6, -1]));
t("a smaller factor takes smaller steps", eq(stepsOf(0.04, Math.SQRT2), [0.0565685, 0.0282843]));
t("a boolean has one step", eq(stepsOf(false), [true]) && eq(stepsOf(true), [false]));
t("a rating floor steps one grade looser and one stricter, within A1 and F6", eq(stepsOf("B2"), ["C3", "A1"]) && eq(stepsOf("A1"), ["B2"]) && eq(stepsOf("F6"), ["E5"]));
t("another string and a list have no step", eq(stepsOf("weekly"), []) && eq(stepsOf([1, 2]), []));
let threw = false;
try { stepsOf(1, 1); } catch { threw = true; }
t("a factor that is not above 1 throws", threw);

console.log(failed === 0 ? "knobs: all pass" : `knobs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
