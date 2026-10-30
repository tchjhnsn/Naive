// The clock: what time it is for a workspace or venture (Torian, 2026-10-30: the clock and the calendar
// exist from the moment a workspace is initiated). "Now" comes from the system clock; the zone is the
// IANA time zone in naive-workspace.json or venture.json (timeZone), else the nearest workspace's, else
// the system's. Dates a person reads are local dates in that zone, never UTC slices.
//
//   now()                         the current instant (a Date); NAIVE_NOW (ISO) pins it for tests
//   zoneOf(dir)                   the IANA zone for a venture or workspace folder
//   systemZone()                  the machine's zone
//   localDate(instant, zone)      "YYYY-MM-DD" in that zone
//   localDateTime(instant, zone)  "YYYY-MM-DDTHH:MM:SS" in that zone (a JSCalendar LocalDateTime)
//   toInstant(local, zone)        the instant a local date-time names in that zone
//   inDays(when, zone, from)      whole calendar days from today to when, in that zone (negative: past)
//   due(when, zone, from)         true when when is today or past; overdue(...) when strictly past

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

export const now = () => (process.env.NAIVE_NOW ? new Date(process.env.NAIVE_NOW) : new Date());
export const systemZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

/** Whether zone is a time zone this runtime knows. */
export function validZone(zone) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return typeof zone === "string" && zone.length > 0; } catch { return false; }
}

/** The zone of a venture or workspace: its own timeZone, else the nearest workspace's above it, else the system's. */
export function zoneOf(dir) {
  let up = resolve(dir ?? process.cwd());
  for (;;) {
    for (const f of ["venture.json", "naive-workspace.json", "workspace.json"]) {
      const z = existsSync(join(up, f)) ? read(join(up, f))?.timeZone : null;
      if (z && validZone(z)) return z;
    }
    if (dirname(up) === up) return systemZone();
    up = dirname(up);
  }
}

const parts = (instant, zone) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(instant)).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
  return p;
};
export function localDate(instant, zone = systemZone()) { const p = parts(instant, zone); return `${p.year}-${p.month}-${p.day}`; }
export function localDateTime(instant, zone = systemZone()) { const p = parts(instant, zone); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`; }

/** The instant a local date-time ("YYYY-MM-DD" or "YYYY-MM-DDTHH:MM[:SS]") names in zone. */
export function toInstant(local, zone = systemZone()) {
  const [d, t = "00:00:00"] = String(local).split("T");
  const guess = Date.parse(`${d}T${t.length === 5 ? `${t}:00` : t}Z`);
  // Two passes of offset correction settle DST edges.
  let ms = guess;
  for (let i = 0; i < 2; i++) { const shown = Date.parse(`${localDateTime(ms, zone)}Z`); ms += guess - shown; }
  return new Date(ms);
}

// A value with an offset or Z is an instant; a bare date or local date-time is read in the zone.
const asInstant = (when, zone) => (when instanceof Date ? when : /([zZ]|[+-]\d\d:?\d\d)$/.test(String(when)) ? new Date(when) : toInstant(when, zone));
const dayNumber = (ymd) => Math.round(Date.parse(`${ymd}T00:00:00Z`) / 864e5);

export function inDays(when, zone = systemZone(), from = now()) {
  return dayNumber(localDate(asInstant(when, zone), zone)) - dayNumber(localDate(from, zone));
}
export const due = (when, zone = systemZone(), from = now()) => asInstant(when, zone).getTime() <= from.getTime() || inDays(when, zone, from) <= 0;
export const overdue = (when, zone = systemZone(), from = now()) => asInstant(when, zone).getTime() < from.getTime() && (String(when).length > 10 || inDays(when, zone, from) < 0);
