// Feedback routing: where a beta tester's feedback goes.
//
//   import { route } from "./feedback-route.mjs"
//   await route(feedback, { jev, send, fallback, env, dir })  ->  { destination, confidence, model }
//
// Jev (TypeSafe) decides when send is true, TYPESAFE_API_KEY is set and a jev client is injected, and its answer is
// accepted at confidence 0.95 or more. Otherwise, or below that, the injected fallback decides. The line is the
// feedback-accept detector's: an accept option, else the venture's governance/detectors/feedback-accept.json (dir),
// else Naive's shipped default, else ACCEPT. The default fallback is keyword rules that call no model. No Jev client is built here: the caller injects one, so
// tests use stubs and never reach the network. send is the venture's explicit opt-in (beta.jev in
// naive.config.json, read by packages/naive/src/engine/beta-gate.mjs): feedback text stays on the machine without it, key or no key.

import { line } from "./detectors.mjs";

export const DESTINATIONS = ["product/bugs", "validation/feedback", "decisions", "foundation", "inbox"];
export const ACCEPT = 0.95;

/** @type {[RegExp, string, number][]} */
const RULES = [
  [/\b(crash\w*|errors?|broke|broken|bugs?|fails?|failed|exception|stack ?trace|lost (my|the) data)\b/i, "product/bugs", 0.8],
  [/\b(should we|decide|decision|choose between|which option)\b/i, "decisions", 0.7],
  [/\b(problem|customer|icp|telos|mission|who (it|this) is for)\b/i, "foundation", 0.6],
];

const textOf = (fb) => [fb.text, ...Object.values(fb.answers ?? {})].filter((x) => typeof x === "string").join("\n");

/** The default fallback: keyword rules, no model. Unmatched feedback stays as feedback. */
export function keywordFallback(fb) {
  const t = textOf(fb);
  for (const [re, destination, confidence] of RULES) if (re.test(t)) return { destination, confidence };
  return { destination: "validation/feedback", confidence: 0.5 };
}

/** @param {*} feedback @param {{ jev?: *, send?: boolean, fallback?: (fb: *) => *, env?: *, accept?: number, dir?: string }} [opts] */
export async function route(feedback, { jev, send = false, fallback = keywordFallback, env = process.env, dir, accept = line(dir, "feedback-accept", ACCEPT) } = {}) {
  if (send === true && env.TYPESAFE_API_KEY && typeof jev === "function") {
    try {
      const j = await jev({ text: textOf(feedback), options: DESTINATIONS, capability: feedback.capability });
      if (j && DESTINATIONS.includes(j.destination) && typeof j.confidence === "number" && j.confidence >= accept)
        return { destination: j.destination, confidence: j.confidence, model: "jev", fallback: false };
    } catch { /* fall through to the fallback */ }
  }
  const f = await fallback(feedback);
  return { destination: DESTINATIONS.includes(f.destination) ? f.destination : "inbox", confidence: f.confidence ?? 0, model: f.model ?? "fallback", fallback: true };
}
