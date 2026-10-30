// The small core clock: which day an instant falls on in the venture's IANA time zone, so "today" is the founder's
// today and not UTC's. The zone comes from venture.json's timeZone, else the workspace's (naive-workspace.json or
// workspace.json), else the system's.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const systemZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function validZone(tz) {
  try { new Intl.DateTimeFormat("en-CA", { timeZone: tz }); return true; } catch { return false; }
}

/** The IANA zone for a venture or workspace directory: its own, the nearest workspace's above it, else the system's. */
export function zoneFor(dir) {
  for (let d = resolve(dir); ; d = dirname(d)) {
    for (const f of ["venture.json", "naive-workspace.json", "workspace.json"]) {
      const p = join(d, f);
      if (!existsSync(p)) continue;
      try { const tz = JSON.parse(readFileSync(p, "utf8")).timeZone; if (tz && validZone(tz)) return tz; } catch {}
    }
    if (dirname(d) === d) return systemZone();
  }
}

/** YYYY-MM-DD for an instant in a zone. */
export function dayIn(instant, tz) {
  const d = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Whole days from day a to day b (YYYY-MM-DD strings, calendar days). */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export function addDays(day, n) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
}
