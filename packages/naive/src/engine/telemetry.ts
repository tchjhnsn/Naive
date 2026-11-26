// Telemetry for the plugin beta and Mentura, one schema for both (packages/naive/src/records/telemetry.schema.json).
//
//   import { record, flush } from "./telemetry.ts"
//   record(dir, { name, capability, session, duration_ms, outcome })   appends one event to .naive/telemetry.jsonl
//   flush(dir, { send })                                                 sends what is waiting, only when allowed
//
// Opt-in only: nothing is written unless naive.config.json has telemetry.enabled true. Nothing leaves the
// machine unless telemetry.send is true and telemetry.set_by names the person who turned it on. An event
// carries no record contents and no _private path: any field outside the schema is refused, and so is any
// value that names a _private path. The venture id is hashed with a random salt kept in .naive/, so a list of
// guessed ids cannot be matched against the hash. Sending is injected; no sender is built yet.

import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { namedPerson, rawConfig } from "./naive-config.ts";
import type { NaiveConfig } from "../records/types/records.d.ts";
import { now as clockNow } from "../core/clock.ts";

// An event before it is checked: a caller's input or a line read back from the file.
type Unchecked = Record<string, unknown>;

export const FILE = ".naive/telemetry.jsonl";
const SENT = ".naive/telemetry-sent.json";
const SALT = ".naive/telemetry-salt";
const FIELDS = ["name", "capability", "at", "venture", "session", "duration_ms", "outcome", "source"];
const OUTCOMES = ["ok", "error", "refused", "cancelled"];
const SOURCES = ["plugin-beta", "mentura"];
// RegExp.test and Date.parse turn their argument into text; this does the same for an unchecked value.
const asText = (v: unknown): string => `${v ?? ""}`;
const oneOf = (list: string[], v: unknown) => typeof v === "string" && list.includes(v);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function salt(dir: string) {
  const f = join(dir, SALT);
  if (!existsSync(f)) { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, randomBytes(32).toString("hex") + "\n", { flag: "wx" }); }
  return readFileSync(f, "utf8").trim();
}

export const ventureHash = (dir: string, id: string) => createHash("sha256").update(`${salt(dir)}:${id}`).digest("hex").slice(0, 16);

/** The venture's telemetry setting: { enabled, send, set_by }. Off unless the config turns it on. */
export function settings(dir: string) {
  let t: NonNullable<NaiveConfig["telemetry"]> = {};
  try { t = rawConfig(dir).telemetry ?? {}; } catch { t = {}; }
  const setBy = namedPerson(t.set_by) ? t.set_by : null;
  return { enabled: t.enabled === true, send: t.send === true && !!setBy, set_by: setBy };
}

/** Why an event is refused, or null: unknown fields, contents, _private paths, a bad outcome. */
export function refuse(event: Unchecked): string | null {
  const extra = Object.keys(event).filter((k) => !FIELDS.includes(k));
  if (extra.length) return `telemetry carries no record contents: unknown field ${extra.join(", ")}`;
  for (const [k, v] of Object.entries(event)) {
    if (typeof v === "object" && v !== null) return `telemetry field ${k} must be a plain value`;
    if (typeof v === "string" && /(^|\/)_private(\/|$)/.test(v)) return `telemetry never names a _private path (${k})`;
  }
  if (!/^[a-z][a-z0-9_.-]{0,31}$/.test(asText(event.name))) return "telemetry needs a name (route.write, beta.unlock)";
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(asText(event.capability))) return "telemetry needs a capability id";
  if (!ISO.test(asText(event.at)) || Number.isNaN(Date.parse(asText(event.at)))) return "at is an ISO date-time";
  if (event.source !== undefined && !oneOf(SOURCES, event.source)) return `source must be one of ${SOURCES.join(", ")}`;
  if (!oneOf(OUTCOMES, event.outcome)) return `outcome must be one of ${OUTCOMES.join(", ")}`;
  if (!/^[A-Za-z0-9-]{4,64}$/.test(asText(event.session))) return "telemetry needs a session id";
  if (!/^[0-9a-f]{16}$/.test(asText(event.venture))) return "venture is the salted hash";
  if (event.duration_ms !== undefined && !(typeof event.duration_ms === "number" && Number.isInteger(event.duration_ms) && event.duration_ms >= 0)) return "duration_ms is a whole number of milliseconds";
  return null;
}

/** Appends one event when telemetry is on. Returns { written, event } or { written: false, why }. */
export function record(dir: string, input: Unchecked, { now = clockNow() }: { now?: Date } = {}) {
  if (!settings(dir).enabled) return { written: false, why: "telemetry is off (opt in with telemetry.enabled in naive.config.json)" };
  let id = "";
  try { id = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id ?? ""; } catch {}
  const event = { name: input.name, capability: input.capability, at: input.at ?? now.toISOString(), venture: ventureHash(dir, id), session: input.session,
    ...(input.duration_ms !== undefined ? { duration_ms: input.duration_ms } : {}), outcome: input.outcome, ...(input.source ? { source: input.source } : {}) };
  const extra = Object.keys(input).filter((k) => !FIELDS.includes(k));
  const why = extra.length ? `telemetry carries no record contents: unknown field ${extra.join(", ")}` : refuse(event);
  if (why) return { written: false, why };
  const f = join(dir, FILE);
  mkdirSync(dirname(f), { recursive: true });
  appendFileSync(f, JSON.stringify(event) + "\n");
  return { written: true, event };
}

export const events = (dir: string) => existsSync(join(dir, FILE)) ? readFileSync(join(dir, FILE), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

const parseLine = (l: string) => { try { return JSON.parse(l); } catch { return null; } };

/**
 *  Sends the events not yet sent, re-checking each line so a hand-edited one is skipped, through the injected send(events); only when a person turned sending on.
 */
export async function flush(dir: string, { send }: { send?: (_events: unknown[]) => unknown } = {}) {
  const s = settings(dir);
  if (!s.send) return { sent: 0, why: "sending is off: it needs telemetry.send true and telemetry.set_by naming the person who set it" };
  if (typeof send !== "function") return { sent: 0, why: "no sender: sending telemetry is not built yet" };
  const all = existsSync(join(dir, FILE)) ? readFileSync(join(dir, FILE), "utf8").split("\n").filter(Boolean).map(parseLine) : [];
  const f = join(dir, SENT);
  const done = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).sent ?? 0 : 0;
  const waiting = all.slice(done);
  const batch = waiting.filter((e) => e && !refuse(e));
  if (batch.length) await send(batch);
  if (waiting.length) writeFileSync(f, JSON.stringify({ sent: all.length }) + "\n");
  return { sent: batch.length, ...(batch.length < waiting.length ? { skipped: waiting.length - batch.length } : {}) };
}
