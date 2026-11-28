// The plugin beta's gate: capabilities unlock in order, each after the tester gives feedback on the one before.
//
//   node packages/naive/src/engine/beta-gate.ts <venture dir> status [--json]
//   node packages/naive/src/engine/beta-gate.ts <venture dir> feedback <capability> --answer <question>=<answer>...
//   node packages/naive/src/engine/beta-gate.ts <venture dir> unlock
//   (naive beta status | feedback <capability> | unlock)
//
// The manifest is beta/capabilities.json. Core capabilities (creating the venture, the docket, the foundation
// records) start unlocked. A later capability unlocks only once a feedback record (validation/feedback/<id>.json)
// exists for the capability before it, from the same tester. Unlock state lives in the venture's
// .naive/beta.json, per tester. The gate is on only when naive.config.json has beta.enabled true; off, it
// changes nothing. The router asks blocked() before every action and refuses a locked capability's routes,
// naming the feedback to give.
//
// The tester is one id for the CLI and the router: NAIVE_BETA_TESTER, default "tester". An agent's role is
// not the tester. The id is anonymous (TESTER) because it lands in a committed file name. Feedback reaches
// Jev only when beta.jev.send is true and beta.jev.set_by names the person who turned it on; a key is not consent.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { namedPerson, rawConfig } from "./naive-config.ts";
import { patternRe } from "./gate.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { route as routeFeedback } from "./feedback-route.ts";
import type { BetaCapabilities, ValidationFeedback } from "../records/types/records.d.ts";
import { writeRecord, writerFromEnv } from "../store/record-write.ts";

/** One capability in the manifest. */
export type Capability = BetaCapabilities["capabilities"][number];
/** .naive/beta.json: each tester's unlocked capabilities and when each opened. */
export type BetaState = { testers: Record<string, { unlocked: string[]; at?: Record<string, string> }> };
/** A tester's answers, by question id. */
export type Answers = ValidationFeedback["answers"];
/** The next capability to unlock, after which one, and whether its feedback exists. */
export type Next = { capability: string; after: string; checkpoint: string; ready: boolean } | null;

const repo = new URL("../../../..", import.meta.url).pathname;
export const STATE = ".naive/beta.json";

export const manifest = (file = join(repo, "beta/capabilities.json")): BetaCapabilities => JSON.parse(readFileSync(file, "utf8"));

/** Whether the venture runs the beta gate: naive.config.json beta.enabled, off by default. */
export function enabled(dir: string): boolean {
  try { return rawConfig(dir).beta?.enabled === true; } catch { return false; }
}

export const TESTER = /^[a-z0-9][a-z0-9-]{0,63}$/;
const badTester = (t: string) => `tester ${JSON.stringify(t)} must be an anonymous id: lowercase letters, digits and hyphens, at most 64 characters, no name or email`;

export const testerOf = (t?: string): string => t || process.env.NAIVE_BETA_TESTER || "tester";

/** Whether this venture lets feedback text go to Jev: a person turned it on, by name. */
function jevConsented(dir: string): boolean {
  try { const j = rawConfig(dir).beta?.jev; return j?.send === true && namedPerson(j.set_by); } catch { return false; }
}

export function state(dir: string): BetaState {
  const f = join(dir, STATE);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : { testers: {} };
}

function save(dir: string, s: BetaState) {
  const f = join(dir, STATE);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(s, null, 2) + "\n");
}

/** Every feedback record in the venture. */
export function feedback(dir: string): ValidationFeedback[] {
  const d = ventureFile(dir, "validation/feedback");
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(d, f), "utf8"))) : [];
}

const given = (dir: string, tester: string, cap: Capability) => feedback(dir).find((f) => f.tester === tester && f.capability === cap.id && f.checkpoint === cap.checkpoint.id);

/** The capability ids open to a tester: core, plus those unlocked in .naive/beta.json. */
export function unlocked(dir: string, tester: string | undefined, m = manifest()): string[] {
  const id = testerOf(tester), testers = state(dir).testers;
  const t = Object.hasOwn(testers, id) ? testers[id] : { unlocked: [] };
  return m.capabilities.filter((c) => c.core || t.unlocked.includes(c.id)).map((c) => c.id);
}

const covers = (patterns: string[], route: string, table?: string) => patterns.some((p) => patternRe(p).test(route) || (table && patternRe(p).test(table)));

/**
 * Whether a route is closed to a tester: null when the gate is off or the route is open; otherwise
 * { capability, needs: { capability, checkpoint }, message }. A route covered by any unlocked capability,
 * or by always_open, is open; one no capability covers is open too.
 */
export function blocked(dir: string, route: string, { tester, table, m: given_m }: { tester?: string; table?: string; m?: BetaCapabilities } = {}) {
  if (!dir || !enabled(dir)) return null;
  const m = given_m ?? manifest();
  if (covers(m.always_open ?? [], route, table)) return null;
  const open = unlocked(dir, tester, m);
  const caps = m.capabilities.filter((c) => covers(c.routes, route, table));
  if (!caps.length || caps.some((c) => open.includes(c.id))) return null;
  const cap = caps[0];
  const i = m.capabilities.findIndex((c) => c.id === cap.id);
  const prev: Capability | undefined = m.capabilities[i - 1];
  const has = prev && given(dir, testerOf(tester), prev);
  const message = has
    ? `${route} is in the beta capability ${cap.id}, not unlocked yet: run naive beta unlock`
    : `${route} is in the beta capability ${cap.id}, locked until you give feedback on ${prev?.id}: run naive beta feedback ${prev?.id} (checkpoint ${prev?.checkpoint.id})`;
  return { capability: cap.id, needs: { capability: prev?.id ?? null, checkpoint: prev?.checkpoint.id ?? null, given: !!has }, message };
}

/** The next capability to unlock and whether its prerequisite feedback exists. */
export function next(dir: string, tester: string | undefined, m = manifest()): Next {
  const open = unlocked(dir, tester, m);
  const i = m.capabilities.findIndex((c) => !open.includes(c.id));
  if (i < 0) return null;
  // Core capabilities come first and start open, so a locked one always has one before it.
  const prev = m.capabilities[i - 1] as Capability;
  return { capability: m.capabilities[i].id, after: prev.id, checkpoint: prev.checkpoint.id, ready: !!given(dir, testerOf(tester), prev) };
}

export function status(dir: string, tester: string | undefined, m = manifest()) {
  const t = testerOf(tester);
  const open = unlocked(dir, t, m);
  return {
    enabled: enabled(dir), tester: t,
    capabilities: m.capabilities.map((c) => ({ id: c.id, title: c.title, core: !!c.core, unlocked: open.includes(c.id), feedback_given: !!given(dir, t, c), checkpoint: c.checkpoint.id })),
    next: next(dir, t, m),
  };
}

/**
 * Records a tester's checkpoint answers as validation/feedback/<id>.json, routed with the feedback router.
 * Refuses a locked capability, an unknown question and a missing required answer.
 */
export async function giveFeedback(dir: string, capId: string, answers: Answers, { tester, m = manifest(), now = new Date(), routing = {} }: { tester?: string; m?: BetaCapabilities; now?: Date; routing?: Parameters<typeof routeFeedback>[1] } = {}): Promise<{ ok: false; error: string; questions?: Capability["checkpoint"]["questions"]; written?: undefined; record?: undefined; next?: undefined } | { ok: true; written: string; record: ValidationFeedback; next: Next; error?: undefined; questions?: undefined }> {
  const t = testerOf(tester);
  if (!TESTER.test(t)) return { ok: false, error: badTester(t) };
  const cap = m.capabilities.find((c) => c.id === capId);
  if (!cap) return { ok: false, error: `no beta capability ${capId} (${m.capabilities.map((c) => c.id).join(", ")})` };
  if (!unlocked(dir, t, m).includes(capId)) return { ok: false, error: `${capId} is locked; give feedback on the capability before it first` };
  const qs = cap.checkpoint.questions;
  const unknown = Object.keys(answers).filter((k) => !qs.some((q) => q.id === k));
  if (unknown.length) return { ok: false, error: `${cap.checkpoint.id} has no question ${unknown.join(", ")}`, questions: qs };
  const missing = qs.filter((q) => q.required && (answers[q.id] === undefined || answers[q.id] === ""));
  if (missing.length) return { ok: false, error: `answer ${missing.map((q) => `${q.id} (${q.ask})`).join("; ")}`, questions: qs };
  const bad = qs.filter((q) => answers[q.id] !== undefined && ((q.kind === "scale-1-5" && !(["1", "2", "3", "4", "5", 1, 2, 3, 4, 5] as unknown[]).includes(answers[q.id])) || (q.kind === "yes-no" && !(["yes", "no", true, false] as unknown[]).includes(answers[q.id]))));
  if (bad.length) return { ok: false, error: `${bad.map((q) => `${q.id} is ${q.kind}`).join("; ")}` };
  const clean = Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, qs.find((q) => q.id === k)?.kind === "scale-1-5" ? Number(v) : v]));
  const id = `${capId}-${t}-${now.toISOString().slice(0, 19).replace(/[^0-9]/g, "")}`;
  const r = await routeFeedback({ capability: capId, answers: clean }, { dir, ...routing, send: jevConsented(dir) });
  const rec: ValidationFeedback = { id, at: now.toISOString(), tester: t, capability: capId, checkpoint: cap.checkpoint.id, answers: clean, routed_to: r.destination, routing: { model: r.model, confidence: r.confidence, fallback: r.fallback } };
  const f = ventureFile(dir, `validation/feedback/${id}.json`);
  writeRecord(dir, `validation/feedback/${id}.json`, rec, { agent: writerFromEnv("cli"), activity: "create", note: `beta feedback on ${capId} from tester ${t}` });
  return { ok: true, written: f, record: rec, next: next(dir, t, m) };
}

/** Unlocks the next capability when the feedback on the one before exists. */
export function unlock(dir: string, tester: string | undefined, { m = manifest(), now = new Date() }: { m?: BetaCapabilities; now?: Date } = {}): { ok: false; error: string; unlocked?: undefined; note?: undefined; next?: undefined } | { ok: true; unlocked: string | null; note?: string; next?: Next; error?: undefined } {
  const t = testerOf(tester);
  if (!TESTER.test(t)) return { ok: false, error: badTester(t) };
  const n = next(dir, t, m);
  if (!n) return { ok: true, unlocked: null, note: "every capability is unlocked" };
  if (!n.ready) return { ok: false, error: `${n.capability} unlocks after feedback on ${n.after}: run naive beta feedback ${n.after}` };
  const s = state(dir);
  const mine = s.testers[t] ?? { unlocked: [], at: {} };
  mine.unlocked = [...new Set([...mine.unlocked, n.capability])];
  mine.at = { ...(mine.at ?? {}), [n.capability]: now.toISOString() };
  s.testers[t] = mine;
  save(dir, s);
  return { ok: true, unlocked: n.capability, next: next(dir, t, m) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, sub = "status", ...rest] = process.argv.slice(2);
  const opt = (n: string) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
  const json = rest.includes("--json");
  if (!dir) { console.error("usage: node packages/naive/src/engine/beta-gate.ts <venture dir> status|feedback <capability>|unlock"); process.exit(2); }
  if (rest.includes("--tester")) { console.error("set the tester with NAIVE_BETA_TESTER, so the CLI and the router agree"); process.exit(2); }
  const tester = undefined;
  const say = (o: unknown, text: string | undefined) => { console.log(json ? JSON.stringify(o, null, 2) : text); };
  if (sub === "status") {
    const s = status(dir, tester);
    say(s, [`beta gate ${s.enabled ? "on" : "off (beta.enabled in naive.config.json)"}; tester ${s.tester}`,
      ...s.capabilities.map((c) => `  ${c.unlocked ? "open  " : "locked"}  ${c.id.padEnd(12)} ${c.title}${c.feedback_given ? "  (feedback given)" : ""}`),
      s.next ? `next: ${s.next.capability}, ${s.next.ready ? "ready: run naive beta unlock" : `after feedback on ${s.next.after}: naive beta feedback ${s.next.after}`}` : "every capability is unlocked"].join("\n"));
  } else if (sub === "feedback") {
    const cap = rest[0];
    const answers: Answers = {};
    rest.forEach((a, i) => { if (rest[i - 1] === "--answer") { const k = a.indexOf("="); if (k > 0) answers[a.slice(0, k)] = a.slice(k + 1); } });
    const c = manifest().capabilities.find((x) => x.id === cap);
    if (c && !Object.keys(answers).length) {
      say({ capability: c.id, checkpoint: c.checkpoint }, [`${c.checkpoint.id}: answer with --answer <question>=<answer>`, ...c.checkpoint.questions.map((q) => `  ${q.id}${q.required ? " (required)" : ""} [${q.kind}]: ${q.ask}`)].join("\n"));
      process.exit(0);
    }
    const r = await giveFeedback(dir, cap, answers, { tester });
    say(r, r.ok ? `recorded ${r.record.id}, routed to ${r.record.routed_to}${r.next?.ready ? `; ${r.next.capability} can unlock: naive beta unlock` : ""}` : r.error);
    process.exit(r.ok ? 0 : 1);
  } else if (sub === "unlock") {
    const r = unlock(dir, tester);
    say(r, r.ok ? (r.unlocked ? `unlocked ${r.unlocked}` : r.note) : r.error);
    process.exit(r.ok ? 0 : 1);
  } else { console.error(`no beta command ${sub}`); process.exit(2); }
}
