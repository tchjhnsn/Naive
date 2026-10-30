#!/usr/bin/env node
// Transcript diagnosis: find what the founder said they want (frameworks, playbooks, ideas, decisions) in their
// own words in agent session transcripts, so items the model missed when answering can be picked up later.
//
//   naive diagnose [--since <iso>] [--dir <transcripts dir>] [--venture <dir>] [--json]
//   node scripts/diagnose-transcripts.mjs [same flags]
//
// Reads Claude Code transcripts (*.jsonl under ~/.claude/projects unless --dir), keeps only the human's own
// messages after the cursor (.naive/diagnose-cursor.json in the venture, else the workspace), REDACTS secrets and
// emails before anything else touches the text, then finds candidates with heuristics and writes one raw source
// draft per run: raw/sources/diagnosis-<date>/{source.json, text.md}. Each candidate says whether a matching
// framework or decision record already exists, so the missed ones stand out.
//
// Offline by default. NAIVE_DIAGNOSE_MODEL=1 with NAIVE_DIAGNOSE_MODEL_MODULE=<path to a module whose default export
// is async (messages) => candidates> adds a model pass over the redacted messages; nothing is sent anywhere otherwise.
// It installs no schedule: run it by hand, or schedule it yourself.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { redact } from "../schema/redact.mjs";
import { listFrameworks } from "../schema/user-frameworks.mjs";
import { findWorkspace } from "../schema/workspace.mjs";

export const RULES = [
  ["framework", /\b(?:thinking )?frameworks?\b|\bmental models?\b/i],
  ["playbook", /\bplaybooks?\b|\btemplates?\b|\bchecklists?\b/i],
  ["decision", /\bdecisions?\b|\bwe decided\b|\bI(?:'ve| have)? decided\b|\blet'?s go with\b/i],
  ["idea", /\bwe (?:should|need to|could)\b|\bI want\b|\bwhat if\b|\bidea\b/i],
];

const STOP = new Set("about after also because being could every from have into just like make more need only other really should some that their them then there these they thing things think this those through want what when where which while will with would your youre its were been does dont".split(" "));
const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter((w) => w.length > 3 && !STOP.has(w)));

function* walk(dir, depth = 0) {
  if (depth > 4 || !existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".naive"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, depth + 1);
    else yield p;
  }
}

// The human's own words in one transcript line, or null: no tool results, meta lines, commands or reminders.
export function humanText(entry) {
  if (entry?.type !== "user" || entry.isMeta || entry.isSidechain || entry.message?.role !== "user") return null;
  const c = entry.message.content;
  const parts = typeof c === "string" ? [c] : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text) : [];
  const text = parts.join("\n")
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<(command-[a-z-]+|local-command-[a-z-]+)>[\s\S]*?<\/\1>/g, "")
    .trim();
  return text || null;
}

export function readMessages(dir, since) {
  const out = [];
  const files = [...walk(dir)].filter((p) => p.endsWith(".jsonl")).sort();
  for (const file of files) {
    if (since && statSync(file).mtime.toISOString() < since) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }
      const raw = humanText(entry);
      if (!raw || (since && (entry.timestamp ?? "") <= since)) continue;
      // Redaction comes first: nothing below sees the raw text.
      out.push({ text: redact(raw), file: relative(dir, file), timestamp: entry.timestamp ?? null });
    }
  }
  return out;
}

export function heuristicCandidates(messages) {
  const out = [];
  for (const m of messages) {
    const sentences = m.text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const kinds = RULES.filter(([, re]) => re.test(s)).map(([k]) => k);
      if (!kinds.length || s.length < 12) continue;
      out.push({ kind: kinds[0], also: kinds.slice(1), quote: s.trim().slice(0, 400), file: m.file, timestamp: m.timestamp, by: "heuristic" });
    }
  }
  return out;
}

// What exists already: frameworks (built-in and the workspace's) and decision records under the root.
export function knownRecords(root) {
  const known = listFrameworks(root).frameworks.map((f) => ({ ref: `framework ${f.id}`, name: f.id.replace(/-/g, " "), words: words(`${f.id} ${f.title}`) }));
  for (const p of walk(root)) {
    if (!p.endsWith(".json") || !/decision/i.test(relative(root, p))) continue;
    let data;
    try { data = JSON.parse(readFileSync(p, "utf8")); } catch { continue; }
    const items = Array.isArray(data) ? data : Array.isArray(data?.decisions) ? data.decisions : [data];
    for (const d of items) {
      const text = [d?.title, d?.question, d?.statement, d?.decision, d?.summary].filter((x) => typeof x === "string").join(" ");
      if (text) known.push({ ref: `decision ${d.id ?? basename(p)} (${relative(root, p)})`, words: words(text) });
    }
  }
  return known;
}

export function matchKnown(candidate, known) {
  const w = words(candidate.quote);
  const q = candidate.quote.toLowerCase().replace(/-/g, " ");
  const named = known.find((k) => k.name && new RegExp(`\\b${k.name}\\b`).test(q));
  if (named) return named.ref;
  let best = null;
  for (const k of known) {
    const overlap = [...k.words].filter((x) => w.has(x)).length;
    const need = Math.min(2, k.words.size);
    if (overlap >= need && (!best || overlap > best.overlap)) best = { ref: k.ref, overlap };
  }
  return best?.ref ?? null;
}

export function render(run) {
  const { candidates, date, since, dir } = run;
  const missed = candidates.filter((c) => !c.matches);
  const lines = [
    "---", "type: raw-source", "source: generated", `created: ${date}`, "tags: [naive, diagnosis, transcripts]", "status: draft", "---", "",
    `# Transcript diagnosis, ${date}`, "",
    `The founder's own messages ${since ? `since ${since}` : "(first run)"} in ${dir}, redacted before reading. ${candidates.length} candidates, ${missed.length} with no matching record. A draft: nothing here is decided.`, "",
  ];
  for (const [title, list] of [["Missed: no framework or decision record matches", missed], ["Already recorded", candidates.filter((c) => c.matches)]]) {
    lines.push(`## ${title}`, "");
    if (!list.length) lines.push("None.", "");
    for (const c of list) lines.push(`- **${c.kind}**${c.also?.length ? ` (also ${c.also.join(", ")})` : ""}: "${c.quote.replace(/"/g, "'")}"`, `  - ${c.file}, ${c.timestamp ?? "no timestamp"}, ${c.by}${c.matches ? `; matches ${c.matches}` : ""}`);
    lines.push("");
  }
  return lines.join("\n");
}

export async function diagnose({ root, dir, since, now = new Date(), env = process.env }) {
  const cursorFile = join(root, ".naive/diagnose-cursor.json");
  const cursor = since ?? (existsSync(cursorFile) ? JSON.parse(readFileSync(cursorFile, "utf8")).last_timestamp : null);
  const messages = readMessages(dir, cursor);
  let candidates = heuristicCandidates(messages);
  if (env.NAIVE_DIAGNOSE_MODEL === "1") {
    if (!env.NAIVE_DIAGNOSE_MODEL_MODULE) throw new Error("NAIVE_DIAGNOSE_MODEL=1 needs NAIVE_DIAGNOSE_MODEL_MODULE, a module that takes the redacted messages");
    const model = (await import(pathToFileURL(resolve(env.NAIVE_DIAGNOSE_MODEL_MODULE)).href)).default;
    const more = (await model(messages)) ?? [];
    candidates = candidates.concat(more.map((c) => ({ kind: c.kind ?? "idea", also: [], quote: redact(c.quote ?? ""), file: c.file ?? null, timestamp: c.timestamp ?? null, by: "model" })));
  }
  const known = knownRecords(root);
  for (const c of candidates) c.matches = matchKnown(c, known);
  const date = now.toISOString().slice(0, 10);
  let id = `diagnosis-${date}`;
  for (let n = 2; existsSync(join(root, "raw/sources", id)); n++) id = `diagnosis-${date}-${n}`;
  const out = join(root, "raw/sources", id);
  if (!resolve(out).startsWith(resolve(root) + "/")) throw new Error("refusing to write outside the venture");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "source.json"), JSON.stringify({ id, origin: "transcript diagnosis (naive diagnose): the founder's own messages, redacted", title: `Transcript diagnosis, ${date}`, fetched: date }, null, 2) + "\n");
  writeFileSync(join(out, "text.md"), render({ candidates, date, since: cursor, dir }));
  const last = messages.map((m) => m.timestamp).filter(Boolean).sort().at(-1) ?? cursor ?? now.toISOString();
  mkdirSync(dirname(cursorFile), { recursive: true });
  writeFileSync(cursorFile, JSON.stringify({ last_run: now.toISOString(), last_timestamp: last }, null, 2) + "\n");
  return { out, messages: messages.length, candidates };
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
  if (!root) { console.error("no venture.json or workspace here or above: run naive diagnose inside a venture or workspace, or pass --venture <dir>"); process.exit(1); }
  try {
    const r = await diagnose({ root, dir: resolve(opt("dir") ?? join(homedir(), ".claude/projects")), since: opt("since") });
    if (args.includes("--json")) console.log(JSON.stringify({ out: r.out, messages: r.messages, candidates: r.candidates }, null, 2));
    else console.log(`read ${r.messages} of the founder's messages; ${r.candidates.length} candidates, ${r.candidates.filter((c) => !c.matches).length} with no record; wrote ${relative(root, r.out)}/{source.json, text.md}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
