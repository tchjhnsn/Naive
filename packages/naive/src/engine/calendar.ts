#!/usr/bin/env node
// The workspace calendar (Torian, 2026-10-30): created the moment a workspace is initiated, beside its
// clock (packages/naive/src/engine/clock.ts). Events are JSCalendar-shaped records (RFC 8984), one per file, in
// <workspace>/calendar/events/<uid>.json; each names its calendar, and calendar/calendars/<id>.json
// names that calendar's owner, members and visibility. The default calendar is "default" (named Venture).
//
// Derived events are a view, never copies: an open decision with a due time and a venture's latest
// release are read from the records that carry their dates each time the calendar is listed.
//
//   node packages/naive/src/engine/calendar.ts list <workspace> [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--json]
//   node packages/naive/src/engine/calendar.ts add <workspace> --title "<title>" --start <local date-time> [--duration PT1H] [--calendar default]
//   node packages/naive/src/engine/calendar.ts export <workspace> --ics <file> [--from] [--to]
//
// list defaults to the 30 days from today in the workspace's zone.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { localDate, localDateTime, now, toInstant, zoneOf } from "./clock.ts";
import type { Calendar, CalendarEvent, Venture, Workspace } from "../records/types/records.d.ts";

/** An event the calendar lists: a stored one, or one derived from a record, which names where it came from. */
export type ListedEvent = CalendarEvent & { derived?: { from: "decision" | "release"; venture: string; id?: string; file?: string; render?: string; release?: string | null } };
/** What toICS reads from an event. */
export type IcsEvent = Pick<CalendarEvent, "uid" | "title" | "start" | "timeZone"> & Partial<Pick<CalendarEvent, "duration" | "description" | "calendar">>;

export const CALENDAR_DIR = "calendar";
// Not "venture": a file named venture.json marks a venture folder to every walker in the framework.
export const DEFAULT_CALENDAR = "default";
const read = (f: string) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const write = (f: string, o: unknown) => writeFileSync(f, JSON.stringify(o, null, 2) + "\n");
const stamp = () => now().toISOString().replace(/\.\d+Z$/, "Z");

/** Make the calendar folder and the default calendar, if they are not there yet. Returns the calendar file. */
export function initCalendar(root: string, { owner, id = DEFAULT_CALENDAR, name = "Venture" }: { owner?: string | null; id?: string; name?: string } = {}): string {
  const who = owner === undefined ? "founder" : owner;
  mkdirSync(join(root, CALENDAR_DIR, "calendars"), { recursive: true });
  mkdirSync(join(root, CALENDAR_DIR, "events"), { recursive: true });
  const ev = join(root, CALENDAR_DIR, "events", ".gitkeep");
  if (!readdirSync(join(root, CALENDAR_DIR, "events")).length) writeFileSync(ev, "");
  const f = join(root, CALENDAR_DIR, "calendars", `${id}.json`);
  if (!existsSync(f)) write(f, { id, name, owner: who, members: who === null ? [] : [who], visibility: "workspace", created: stamp() });
  return f;
}

export function calendars(root: string): Calendar[] {
  const d = join(root, CALENDAR_DIR, "calendars");
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => read(join(d, f))).filter(Boolean) : [];
}

/** Store one event. start is a local date-time in timeZone (the workspace's unless given). */
export function addEvent(root: string, { title, start, duration = "PT1H", timeZone, calendar = DEFAULT_CALENDAR, description, recurrenceRules, uid = randomUUID() }: { title?: string; start?: string; duration?: string; timeZone?: string; calendar?: string; description?: string; recurrenceRules?: CalendarEvent["recurrenceRules"]; uid?: string }): CalendarEvent {
  if (!title || !start) throw new Error("an event needs a title and a start");
  if (!calendars(root).some((c) => c.id === calendar)) throw new Error(`no calendar ${calendar} in ${join(root, CALENDAR_DIR, "calendars")}`);
  const e: CalendarEvent = { "@type": "Event", uid, title, start: start.length === 10 ? `${start}T00:00:00` : start.length === 16 ? `${start}:00` : start, timeZone: timeZone ?? zoneOf(root), duration, calendar,
    ...(description ? { description } : {}), ...(recurrenceRules ? { recurrenceRules } : {}), created: stamp() };
  write(join(root, CALENDAR_DIR, "events", `${uid}.json`), e);
  return e;
}

// One record with a bad date must not take the whole calendar down: it is skipped, and the warning names it.
const dated = <T>(record: string, fn: () => T): T | null => { try { return fn(); } catch (e) { console.warn(`skipped ${record}: ${(e as Error).message}`); return null; } };

export function storedEvents(root: string): CalendarEvent[] {
  const d = join(root, CALENDAR_DIR, "events");
  if (!existsSync(d)) return [];
  const zone = zoneOf(root);
  return readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => {
    const e: CalendarEvent | null = read(join(d, f));
    return e && dated(join(d, f), () => (localDate(toInstant(e.start, e.timeZone ?? zone), zone), e));
  }).filter((e): e is CalendarEvent => Boolean(e));
}

// The workspace's ventures: every venture.json under the folders the workspace lists.
function ventureDirs(root: string): string[] {
  const ws: Partial<Workspace> = read(join(root, "naive-workspace.json")) ?? read(join(root, "workspace.json")) ?? { ventures: [] };
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    if (!existsSync(d) || depth > 4) return;
    if (existsSync(join(d, "venture.json"))) out.push(d);
    for (const e of readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && !/^(node_modules|\.|_|raw|inbox|meta|calendar|codebase)/.test(e.name)) walk(join(d, e.name), depth + 1);
  };
  for (const v of ws.ventures ?? []) walk(join(root, v), 0);
  return [...new Set(out)];
}

/** Events derived from records that carry dates: open decisions with a due time, and each venture's latest release. */
export async function derivedEvents(root: string): Promise<ListedEvent[]> {
  // Loaded here, not at the top, so the workspace (which makes the calendar) never pulls in the router.
  const { decisions } = await import("./decisions.ts");
  const zone = zoneOf(root);
  const out: ListedEvent[] = [];
  for (const dir of ventureDirs(root)) {
    const v: Partial<Venture> = read(join(dir, "venture.json")) ?? {};
    const vid = v.id ?? basename(dir);
    const vz = zoneOf(dir);
    const r = decisions(dir, now().getTime());
    for (const d of r.decisions ?? []) if (d.due && !["done", "withdrawn", "deferred"].includes(d.render)) {
      const due = d.due;
      const start = dated(d.file ?? `decision ${d.id} in ${dir}`, () => localDateTime(new Date(due), vz));
      if (start) out.push({ "@type": "Event", uid: `decision:${vid}:${d.id}`, title: `Decide: ${d.question ?? d.id}`, start, timeZone: vz, duration: "PT0S", calendar: DEFAULT_CALENDAR,
        derived: { from: "decision", venture: vid, id: d.id, ...(d.file ? { file: d.file } : {}), render: d.render } });
    }
    // The release record names its built_at and release; it has no schema of its own here.
    const m: { built_at?: string; release?: string } | null = read(join(dir, ".release/release.json")) ?? read(join(dir, "meta/releases/release.json"));
    const builtAt = m?.built_at;
    const released = builtAt && dated(`the release record in ${dir}`, () => localDateTime(new Date(builtAt), vz));
    if (m && released) out.push({ "@type": "Event", uid: `release:${vid}:${m.release ?? builtAt}`, title: `Release ${m.release ?? ""} of ${v.name ?? vid}`.replace("  ", " "), start: released, timeZone: vz, duration: "PT0S", calendar: DEFAULT_CALENDAR,
      derived: { from: "release", venture: vid, release: m.release ?? null } });
  }
  return out.map((e) => ({ ...e, timeZone: e.timeZone ?? zone }));
}

/** Stored and derived events whose start falls on a local date in [from, to] (inclusive), in start order.
 */
export async function events(root: string, { from, to }: { from?: string; to?: string } = {}): Promise<ListedEvent[]> {
  const zone = zoneOf(root);
  const today = localDate(now(), zone);
  from ??= today;
  to ??= localDate(new Date(toInstant(today, zone).getTime() + 30 * 864e5), zone);
  const lo = from, hi = to;
  const inRange = (e: ListedEvent) => { const d = localDate(toInstant(e.start, e.timeZone ?? zone), zone); return d >= lo && d <= hi; };
  return [...storedEvents(root), ...(await derivedEvents(root))].filter(inRange)
    .sort((a, b) => toInstant(a.start, a.timeZone ?? zone).getTime() - toInstant(b.start, b.timeZone ?? zone).getTime());
}

// --- iCalendar (RFC 5545) ---

const esc = (s: unknown) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const unesc = (s: string) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
const icsLocal = (s: string) => s.replace(/[-:]/g, "").slice(0, 15);
const fromIcsLocal = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11) || "00"}:${s.slice(11, 13) || "00"}:${s.slice(13, 15) || "00"}`;
const fold = (line: string) => { const out: string[] = []; for (let i = 0; i < line.length; i += 74) out.push((i ? " " : "") + line.slice(i, i + 74)); return out.join("\r\n"); };

export function toICS(list: IcsEvent[], { name = "Naive workspace" }: { name?: string } = {}): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Naive//calendar//EN", `X-WR-CALNAME:${esc(name)}`];
  const dtstamp = now().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  for (const e of list) {
    lines.push("BEGIN:VEVENT", `UID:${esc(e.uid)}`, `DTSTAMP:${dtstamp}`, `DTSTART;TZID=${e.timeZone}:${icsLocal(e.start)}`);
    if (e.duration && e.duration !== "PT0S") lines.push(`DURATION:${e.duration}`);
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    if (e.calendar) lines.push(`CATEGORIES:${esc(e.calendar)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Parse the VEVENTs of an iCalendar text back into JSCalendar-shaped events (the fields toICS writes). */
// An END:VEVENT with no BEGIN:VEVENT before it gives null, as it always has.
export function fromICS(text: string): (Partial<CalendarEvent> | null)[] {
  const lines = text.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const out: (Partial<CalendarEvent> | null)[] = [];
  let e: Partial<CalendarEvent> | null = null;
  for (const l of lines) {
    if (l === "BEGIN:VEVENT") { e = { "@type": "Event", duration: "PT0S" }; continue; }
    if (l === "END:VEVENT") { out.push(e); e = null; continue; }
    if (!e) continue;
    const i = l.indexOf(":");
    const [key, ...params] = l.slice(0, i).split(";");
    const val = l.slice(i + 1);
    if (key === "UID") e.uid = unesc(val);
    else if (key === "SUMMARY") e.title = unesc(val);
    else if (key === "DESCRIPTION") e.description = unesc(val);
    else if (key === "CATEGORIES") e.calendar = unesc(val);
    else if (key === "DURATION") e.duration = val;
    else if (key === "DTSTART") { e.start = fromIcsLocal(val); const tz = params.find((p) => p.startsWith("TZID=")); if (tz) e.timeZone = tz.slice(5); else if (val.endsWith("Z")) e.timeZone = "Etc/UTC"; }
  }
  return out;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [cmd, root, ...rest] = process.argv.slice(2);
  const opt = (n: string) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
  if (!root || !["list", "add", "export"].includes(cmd)) { console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   node")).map((l) => l.slice(3)).join("\n")); process.exit(2); }
  if (!existsSync(join(root, CALENDAR_DIR, "calendars"))) { console.error(`${root} has no calendar yet: run naive calendar in it to add one, or naive workspace init to make a workspace`); process.exit(1); }
  try {
    if (cmd === "add") {
      const e = addEvent(root, { title: opt("title"), start: opt("start"), duration: opt("duration") ?? "PT1H", calendar: opt("calendar") ?? DEFAULT_CALENDAR, timeZone: opt("time-zone") });
      console.log(`added ${e.uid}: ${e.title} at ${e.start} ${e.timeZone}`);
    } else {
      const list = await events(root, { from: opt("from"), to: opt("to") });
      if (cmd === "export") {
        const f = opt("ics");
        if (!f) { console.error("naive calendar export needs --ics <file>"); process.exit(2); }
        const ws: Partial<Workspace> = read(join(root, "naive-workspace.json")) ?? {};
        writeFileSync(f, toICS(list, { name: ws.name ?? "Naive workspace" }));
        console.log(`wrote ${list.length} event${list.length === 1 ? "" : "s"} to ${f}`);
      } else if (rest.includes("--json")) console.log(JSON.stringify(list, null, 2));
      else console.log(list.length ? list.map((e) => `${e.start.replace("T", " ").slice(0, 16)} ${e.timeZone.padEnd(20)} ${e.title}${e.derived ? ` [from ${e.derived.from} in ${e.derived.venture}]` : ""}`).join("\n") : `no events in ${zoneOf(root)} for that range`);
    }
  } catch (err) { console.error((err as Error).message); process.exit(1); }
}
