#!/usr/bin/env node
// Activity: time spent in each venture, from transcript timestamps alone, with no extra tracking
// (TRANSCRIPT_DIAGNOSIS_V2 section 2).
//
//   naive activity [--from <date>] [--to <date>] [--write] [--dir <transcripts>] [--venture <dir>] [--json]
//   node packages/naive/src/engine/activity.mjs [same flags]
//
// Per day and venture: sessions (transcript files with a founder message that day), active minutes (gaps of 10
// minutes or less between the founder's own messages, summed), the founder's messages, and tokens in (characters / 4).
// A session belongs to the venture its working directory is in, else to a venture whose path the founder mentions.
// Days are the venture's IANA time zone's (packages/naive/src/engine/clock.mjs), so "today" is the founder's today.
// --write writes operations/activity/<date>.json per day (packages/naive/src/records/activity.schema.json, internal) and
// operations/activity/_summary.json (days since last touch, streak; packages/naive/src/records/activity-summary.schema.json) in each
// venture. Reads transcripts only: nothing is sent anywhere, and nothing is scheduled.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { humanText, transcriptFiles } from "./transcripts.mjs";
import { addDays, localDate, daysBetween, zoneOf } from "./clock.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import { findWorkspace } from "./workspace.mjs";
import { HostedRefusal, isHosted } from "../core/runtime.mjs";

export const GAP_MINUTES = 10;
export const NUDGE_DAYS = 7;

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };

/** The ventures under a root: the root itself when it is one, else every venture.json below it. */
export function venturesUnder(root) {
  if (existsSync(join(root, "venture.json"))) return [ventureAt(root)];
  const out = [];
  const visit = (d, depth) => {
    if (depth > 5 || !existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory() || [".git", "node_modules", ".naive", "raw", "codebase", "repo"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (existsSync(join(p, "venture.json"))) out.push(ventureAt(p));
      visit(p, depth + 1);
    }
  };
  visit(root, 0);
  return out;
}
function ventureAt(dir) {
  const v = readJson(join(dir, "venture.json")) ?? {};
  return { id: v.id ?? basename(dir), dir: resolve(dir), tz: zoneOf(dir) };
}

/** Each transcript as a session: its file, working directories, and the founder's messages (timestamp, characters). */
export function readSessions(dir) {
  const out = [];
  for (const file of transcriptFiles(dir)) {
    const s = { file: relative(dir, file), cwds: new Set(), messages: [], text: "" };
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      let e;
      try { e = JSON.parse(line); } catch { continue; }
      if (typeof e.cwd === "string") s.cwds.add(resolve(e.cwd));
      const t = humanText(e);
      if (!t || !e.timestamp || Number.isNaN(Date.parse(e.timestamp))) continue;
      s.messages.push({ timestamp: e.timestamp, chars: t.length });
      s.text += `\n${t}`;
    }
    if (s.messages.length) out.push(s);
  }
  return out;
}

const inside = (child, parent) => child === parent || child.startsWith(parent + sep);

/** Which venture a session belongs to, and how: the deepest venture holding its cwd, else one whose path it names. */
export function matchVenture(session, ventures, root) {
  let best = null;
  for (const v of ventures) for (const c of session.cwds) if (inside(c, v.dir) && (!best || v.dir.length > best.v.dir.length)) best = { v, by: "cwd" };
  if (best) return best;
  for (const v of [...ventures].sort((a, b) => b.dir.length - a.dir.length)) {
    const rel = relative(root, v.dir);
    const names = [v.dir, rel.includes(sep) ? rel : null, `ventures/${basename(v.dir)}`].filter(Boolean);
    if (names.some((n) => session.text.includes(n))) return { v, by: "mention" };
  }
  return null;
}

/** Sum of gaps of GAP_MINUTES or less between sorted instants, in minutes. */
export function activeMinutes(timestamps) {
  const t = timestamps.map((x) => Date.parse(x)).sort((a, b) => a - b);
  let ms = 0;
  for (let i = 1; i < t.length; i++) { const gap = t[i] - t[i - 1]; if (gap <= GAP_MINUTES * 60000) ms += gap; }
  return Math.round(ms / 60000 * 10) / 10;
}

/** Per venture, per day: sessions, active minutes, messages, tokens in.
 *  @param {{ root: string, dir?: string, from?: string, to?: string }} opts */
export function activity({ root, dir, from, to }) {
  // Hosted, transcripts reach a venture as records: no folder outside the tenant (~/.claude/projects) is read.
  if (isHosted() && !(dir && (resolve(dir) === resolve(root) || resolve(dir).startsWith(resolve(root) + sep)))) {
    throw new HostedRefusal("reading harness transcripts", `${dir ?? "the transcript folder"} is outside the venture, and a hosted run reads nothing outside the tenant (such as ~/.claude/projects)`);
  }
  const ventures = venturesUnder(root);
  const sessions = readSessions(dir);
  const rows = new Map(); // venture id -> day -> {files, stamps, chars, by}
  for (const s of sessions) {
    const m = matchVenture(s, ventures, root);
    if (!m) continue;
    const { v, by } = m;
    if (!rows.has(v.id)) rows.set(v.id, { venture: v, days: new Map() });
    const days = rows.get(v.id).days;
    for (const msg of s.messages) {
      const day = localDate(msg.timestamp, v.tz);
      if ((from && day < from) || (to && day > to)) continue;
      if (!days.has(day)) days.set(day, { files: new Set(), stamps: [], chars: 0, by: new Set() });
      const d = days.get(day);
      d.files.add(s.file); d.stamps.push(msg.timestamp); d.chars += msg.chars; d.by.add(by);
    }
  }
  return [...rows.values()].map(({ venture, days }) => ({
    venture: venture.id, dir: venture.dir, time_zone: venture.tz,
    days: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      venture: venture.id, date, time_zone: venture.tz, visibility: "internal",
      sessions: d.files.size, active_minutes: activeMinutes(d.stamps), messages: d.stamps.length, tokens_in: Math.ceil(d.chars / 4),
      session_files: [...d.files].sort(), matched_by: [...d.by].sort(),
    })),
  }));
}

/** Days since last touch, streak and active days in the last 30, from the active dates, as of a day. */
export function summarize(venture, tz, activeDates, today) {
  const set = new Set(activeDates.filter((d) => d <= today));
  const last = [...set].sort().at(-1) ?? null;
  let streak = 0;
  for (let d = set.has(today) ? today : addDays(today, -1); set.has(d); d = addDays(d, -1)) streak++;
  const since = last ? daysBetween(last, today) : null;
  const out = { venture, as_of: today, time_zone: tz, visibility: "internal", last_touch: last, days_since_last_touch: since, streak, active_days_30: [...set].filter((d) => daysBetween(d, today) < 30).length };
  if (since !== null && since >= NUDGE_DAYS) out.nudge = `${since} days since you last worked on ${venture}. Pick it up when you are ready.`;
  return out;
}

/** Writes each day's record and the summary into each venture's operations/activity/. */
export function writeActivity(result, now = new Date()) {
  const written = [];
  for (const v of result) {
    const folder = ventureFile(v.dir, "operations/activity");
    if (!resolve(folder).startsWith(v.dir + sep)) throw new Error("refusing to write outside the venture");
    mkdirSync(folder, { recursive: true });
    for (const d of v.days) {
      const p = join(folder, `${d.date}.json`);
      writeFileSync(p, JSON.stringify({ ...d, computed: now.toISOString() }, null, 2) + "\n");
      written.push(p);
    }
    const dates = readdirSync(folder).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(0, 10))
      .filter((d) => (readJson(join(folder, `${d}.json`))?.messages ?? 0) > 0);
    const p = join(folder, "_summary.json");
    writeFileSync(p, JSON.stringify(summarize(v.venture, v.time_zone, dates, localDate(now, v.time_zone)), null, 2) + "\n");
    written.push(p);
  }
  return written;
}

function findRoot(from) {
  for (let d = resolve(from); ; d = dirname(d)) {
    if (existsSync(join(d, "venture.json"))) return d;
    if (dirname(d) === d) break;
  }
  return findWorkspace(resolve(from));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const root = opt("venture") ? resolve(opt("venture")) : findRoot(process.cwd());
  if (!root) { console.error("no venture.json or workspace here or above: run naive activity inside a venture or workspace, or pass --venture <dir>"); process.exit(1); }
  for (const d of [opt("from"), opt("to")]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) { console.error(`--from and --to take a date, YYYY-MM-DD: ${d}`); process.exit(2); }
  let result;
  try { result = activity({ root, dir: resolve(opt("dir") ?? join(homedir(), ".claude/projects")), from: opt("from"), to: opt("to") }); }
  catch (e) { if (!(e instanceof HostedRefusal)) throw e; console.error(e.message); process.exit(2); }
  const written = args.includes("--write") ? writeActivity(result) : [];
  if (args.includes("--json")) { console.log(JSON.stringify({ ventures: result, written }, null, 2)); process.exit(0); }
  if (!result.length) console.log("no sessions matched a venture here");
  for (const v of result) {
    console.log(`${v.venture} (${v.time_zone})`);
    for (const d of v.days) console.log(`  ${d.date}  ${String(d.sessions).padStart(2)} sessions  ${String(d.active_minutes).padStart(6)} active min  ${String(d.messages).padStart(4)} messages  ~${d.tokens_in} tokens in`);
  }
  if (written.length) console.log(`wrote ${written.map((p) => relative(root, p)).join(", ")}`);
}
