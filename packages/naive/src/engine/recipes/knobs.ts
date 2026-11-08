// Knobs: finding a recipe's knobs in its source, stepping one, and writing the step back (everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "With no model (graft: knob search)", build plan item 10). Pure: no
// I/O and no sandbox. The search that writes each step through the router is router/orchestration/recipe-search.ts.
//
//   knobsIn(source)                 the `export const knobs = { ... }` literal: each knob's name, value and where it sits
//   setKnob(source, name, value)    the source with that one knob's value replaced, and nothing else changed
//   stepsOf(value, factor)          the values one step each way from a knob's value, in the order a search tries them
//
// A knob is stepped only when its value is written as a literal: a number (a leading minus allowed), a quoted string,
// true or false, or a list of those. A knob written any other way (a name, a call, a template, arithmetic) is named,
// with why, and not stepped, so a search never rewrites code it cannot read back.
import { scan, stripTypes } from "./sandbox.ts";
import type { Token } from "./sandbox.ts";

type Scalar = number | string | boolean;
export type KnobValue = Scalar | Scalar[];
/** One knob as written: its value, and the span of source text that holds the value. */
export type Knob = { name: string; value: KnobValue; at: number; end: number };
export type Knobs = { ok: true; knobs: Knob[]; skipped: { name: string; why: string }[]; reason?: undefined } | { ok: false; reason: string; knobs?: undefined; skipped?: undefined };

// A quoted string, not template text or a regular expression: it opens and closes with the same quote, and is not
// text that follows a backtick or a substitution's closing brace.
const isQuote = (source: string, t: Token): boolean => t.kind === "literal" && (source[t.at] === "\"" || source[t.at] === "'")
  && t.end - t.at >= 2 && source[t.end - 1] === source[t.at] && source[t.at - 1] !== "`" && source[t.at - 1] !== "}";
const tokenEnd = (t: Token): number => (t.kind === "literal" ? t.end : t.at + t.text.length);

/** One literal value from tokens[i]: a scalar, or a list of scalars. Null when it is anything else. */
function literalAt(source: string, tokens: readonly Token[], i: number): { value: KnobValue; at: number; end: number; next: number } | null {
  const scalar = (j: number): { value: Scalar; end: number; next: number } | null => {
    const t = tokens[j];
    if (!t) return null;
    if (t.kind === "number" && Number.isFinite(Number(t.text))) return { value: Number(t.text), end: tokenEnd(t), next: j + 1 };
    if (t.kind === "punct" && t.text === "-" && tokens[j + 1]?.kind === "number" && Number.isFinite(Number(tokens[j + 1].text))) {
      return { value: -Number(tokens[j + 1].text), end: tokenEnd(tokens[j + 1]), next: j + 2 };
    }
    if (isQuote(source, t)) return { value: t.text, end: tokenEnd(t), next: j + 1 };
    if (t.kind === "word" && (t.text === "true" || t.text === "false")) return { value: t.text === "true", end: tokenEnd(t), next: j + 1 };
    return null;
  };
  const t = tokens[i];
  if (!t) return null;
  if (t.kind === "punct" && t.text === "[") {
    const items: Scalar[] = [];
    let j = i + 1;
    for (;;) {
      const close = tokens[j];
      if (close?.kind === "punct" && close.text === "]") return { value: items, at: t.at, end: tokenEnd(close), next: j + 1 };
      const s = scalar(j);
      if (!s) return null;
      items.push(s.value);
      j = s.next;
      const sep = tokens[j];
      if (sep?.kind === "punct" && sep.text === ",") j++;
      else if (!(sep?.kind === "punct" && sep.text === "]")) return null;
    }
  }
  const s = scalar(i);
  return s ? { value: s.value, at: t.at, end: s.end, next: s.next } : null;
}

/**
 * The knobs of a recipe, read from its source. Types are stripped first (Node's stripper keeps every position), so
 * `export const knobs: Knobs = { ... }` and `{ ... } as const` read the same. Refused when the source has no
 * `export const knobs = {` or cannot be scanned; a knob that is not a literal is listed in skipped.
 */
export function knobsIn(source: string): Knobs {
  const js = stripTypes(source);
  if (!js.ok) return { ok: false, reason: js.reason };
  const scanned = scan(js.output);
  if (!scanned.ok) return { ok: false, reason: scanned.reason };
  const tokens = scanned.output;
  const word = (j: number, text: string) => tokens[j]?.kind === "word" && tokens[j].text === text;
  const punct = (j: number, text: string) => tokens[j]?.kind === "punct" && tokens[j].text === text;
  const start = tokens.findIndex((_, j) => word(j, "export") && word(j + 1, "const") && word(j + 2, "knobs") && punct(j + 3, "=") && punct(j + 4, "{"));
  if (start < 0) return { ok: false, reason: "the recipe has no `export const knobs = { ... }`, so a search has nothing to step" };
  const knobs: Knob[] = [];
  const skipped: { name: string; why: string }[] = [];
  let i = start + 5;
  for (;;) {
    if (punct(i, "}")) return { ok: true, knobs, skipped };
    const key = tokens[i];
    const name = key?.kind === "word" ? key.text : key && isQuote(source, key) ? key.text : null;
    if (name === null || !punct(i + 1, ":")) return { ok: false, reason: `the knobs literal holds something other than name: value pairs near offset ${key?.at ?? source.length} (a spread, a computed name or a shorthand)` };
    const lit = literalAt(source, tokens, i + 2);
    let j: number;
    if (lit && (punct(lit.next, ",") || punct(lit.next, "}"))) {
      knobs.push({ name, value: lit.value, at: lit.at, end: lit.end });
      j = lit.next;
    } else {
      // Not a literal: skip to the comma or brace that ends this entry, at this depth.
      skipped.push({ name, why: "its value is not a literal number, string, boolean or list of them" });
      let depth = 0;
      j = i + 2;
      for (; j < tokens.length; j++) {
        const t = tokens[j];
        if (t.kind !== "punct") continue;
        if (t.text === "(" || t.text === "[" || t.text === "{") depth++;
        else if (t.text === ")" || t.text === "]" || t.text === "}") { if (depth === 0) break; depth--; } else if (t.text === "," && depth === 0) break;
      }
      if (j >= tokens.length) return { ok: false, reason: "the knobs literal does not close" };
    }
    if (punct(j, ",")) j++;
    i = j;
  }
}

/** A knob value as source text: JSON, with a number kept to six significant digits so steps do not drift in binary. */
export function formatKnob(value: KnobValue): string {
  const one = (v: Scalar): string => (typeof v === "number" ? String(Number(v.toPrecision(6))) : JSON.stringify(v));
  return Array.isArray(value) ? `[${value.map(one).join(", ")}]` : one(value);
}

/** The source with one knob's value replaced. Every other byte stays as it was. */
export function setKnob(source: string, name: string, value: KnobValue): { ok: true; source: string; reason?: undefined } | { ok: false; reason: string; source?: undefined } {
  const found = knobsIn(source);
  if (!found.ok) return { ok: false, reason: found.reason };
  const k = found.knobs.find((x) => x.name === name);
  if (!k) return { ok: false, reason: `the recipe has no literal knob ${name}` };
  return { ok: true, source: source.slice(0, k.at) + formatKnob(value) + source.slice(k.end) };
}

const RATING = /^([A-F])([1-6])$/;
const round6 = (x: number): number => Number(x.toPrecision(6));

/**
 * The values one step each way from a knob's value, the first the one a search tries first. factor is the step's size
 * (2 doubles and halves). Empty when the knob has no step.
 * - A number is multiplied and divided by factor. An integer stays an integer and moves by at least 1, and 0 steps to
 *   1 and -1. A fraction strictly between 0 and 1 stays within 0 and 1, as weights and probabilities do.
 * - A boolean has one step: the other value.
 * - An Admiralty rating floor (B2) steps one grade on both scales: looser (C3) and stricter (A1), within A1 and F6.
 * - Any other string, and a list, has no step (a model edit can change them; a search does not guess an order).
 */
export function stepsOf(value: KnobValue, factor = 2): KnobValue[] {
  if (!(factor > 1)) throw new Error("a step factor is a number above 1");
  if (typeof value === "boolean") return [!value];
  if (typeof value === "string") {
    const m = RATING.exec(value);
    if (!m) return [];
    const grade = (d: number): string | null => {
      const r = m[1].charCodeAt(0) + d, c = Number(m[2]) + d;
      return r >= 65 && r <= 70 && c >= 1 && c <= 6 ? `${String.fromCharCode(r)}${c}` : null;
    };
    return [grade(1), grade(-1)].filter((g): g is string => g !== null);
  }
  if (Array.isArray(value)) return [];
  if (value === 0) return [1, -1];
  let up = value * factor, down = value / factor;
  if (Number.isInteger(value)) {
    up = Math.round(up); down = Math.round(down);
    if (up === value) up = value + Math.sign(value);
    if (down === value) down = value - Math.sign(value);
  } else if (value > 0 && value < 1) {
    up = Math.min(1, up); down = Math.max(0, down);
  }
  return [...new Set([round6(up), round6(down)])].filter((v) => v !== value);
}
