// Telemetry for the plugin beta and Mentura, one schema for both (schema/telemetry.schema.json).
//
//   import { record, flush } from "./telemetry.mjs"
//   record(dir, { name, capability, session, duration_ms, outcome })   appends one event to .naive/telemetry.jsonl
//   flush(dir, { send })                                                 sends what is waiting, only when allowed
//
// Opt-in only: nothing is written unless naive.config.json has telemetry.enabled true. Nothing leaves the
// machine unless telemetry.send is true and telemetry.set_by names the person who turned it on. An event
// carries no record contents and no _private path: any field outside the schema is refused, and so is any
// value that names a _private path. The venture id is hashed. Sending is injected; no sender is built yet.

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { rawConfig } from "./naive-config.mjs";

export const FILE = ".naive/telemetry.jsonl";
const SENT = ".naive/telemetry-sent.json";
const FIELDS = ["name", "capability", "at", "venture", "session", "duration_ms", "outcome", "source"];
const OUTCOMES = ["ok", "error", "refused", "cancelled"];

export const ventureHash = (id) => createHash("sha256").update(String(id)).digest("hex").slice(0, 16);

/** The venture's telemetry setting: { enabled, send, set_by }. Off unless the config turns it on. */
export function settings(dir) {
  let t = {};
  try { t = rawConfig(dir).telemetry ?? {}; } catch { t = {}; }
  const setBy = t.set_by && typeof t.set_by === "object" && t.set_by.person ? t.set_by : null;
  return { enabled: t.enabled === true, send: t.send === true && !!setBy, set_by: setBy };
}

/** Why an event is refused, or null: unknown fields, contents, _private paths, a bad outcome. */
export function refuse(event) {
  const extra = Object.keys(event).filter((k) => !FIELDS.includes(k));
  if (extra.length) return `telemetry carries no record contents: unknown field ${extra.join(", ")}`;
  for (const [k, v] of Object.entries(event)) {
    if (typeof v === "object" && v !== null) return `telemetry field ${k} must be a plain value`;
    if (typeof v === "string" && /(^|\/)_private(\/|$)/.test(v)) return `telemetry never names a _private path (${k})`;
  }
  if (!/^[a-z][a-z0-9_.-]*$/.test(event.name ?? "")) return "telemetry needs a name (route.write, beta.unlock)";
  if (!/^[a-z][a-z0-9-]*$/.test(event.capability ?? "")) return "telemetry needs a capability id";
  if (!OUTCOMES.includes(event.outcome)) return `outcome must be one of ${OUTCOMES.join(", ")}`;
  if (!/^[A-Za-z0-9-]{4,64}$/.test(event.session ?? "")) return "telemetry needs a session id";
  if (event.duration_ms !== undefined && !(Number.isInteger(event.duration_ms) && event.duration_ms >= 0)) return "duration_ms is a whole number of milliseconds";
  return null;
}

/** Appends one event when telemetry is on. Returns { written, event } or { written: false, why }. */
export function record(dir, input, { now = new Date() } = {}) {
  if (!settings(dir).enabled) return { written: false, why: "telemetry is off (opt in with telemetry.enabled in naive.config.json)" };
  let id = "";
  try { id = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id ?? ""; } catch {}
  const event = { name: input.name, capability: input.capability, at: input.at ?? now.toISOString(), venture: ventureHash(id || dir), session: input.session,
    ...(input.duration_ms !== undefined ? { duration_ms: input.duration_ms } : {}), outcome: input.outcome, ...(input.source ? { source: input.source } : {}) };
  const extra = Object.keys(input).filter((k) => !FIELDS.includes(k));
  const why = extra.length ? `telemetry carries no record contents: unknown field ${extra.join(", ")}` : refuse(event);
  if (why) return { written: false, why };
  const f = join(dir, FILE);
  mkdirSync(dirname(f), { recursive: true });
  appendFileSync(f, JSON.stringify(event) + "\n");
  return { written: true, event };
}

export const events = (dir) => existsSync(join(dir, FILE)) ? readFileSync(join(dir, FILE), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

/** Sends the events not yet sent, through the injected send(events); only when a person turned sending on. */
export async function flush(dir, { send } = {}) {
  const s = settings(dir);
  if (!s.send) return { sent: 0, why: "sending is off: it needs telemetry.send true and telemetry.set_by naming the person who set it" };
  if (typeof send !== "function") return { sent: 0, why: "no sender: sending telemetry is not built yet" };
  const all = events(dir);
  const f = join(dir, SENT);
  const done = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).sent ?? 0 : 0;
  const batch = all.slice(done);
  if (!batch.length) return { sent: 0 };
  await send(batch);
  writeFileSync(f, JSON.stringify({ sent: all.length }) + "\n");
  return { sent: batch.length };
}
