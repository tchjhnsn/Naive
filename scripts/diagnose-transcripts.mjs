#!/usr/bin/env node
// Transcript diagnosis: find what the founder said they want (frameworks, playbooks, ideas, decisions) in their
// own words in agent session transcripts, so items the model missed when answering can be picked up later.
//
//   naive diagnose [--since <iso>] [--dir <transcripts dir>] [--venture <dir>] [--all] [--json] [--if-due]
//   node scripts/diagnose-transcripts.mjs [same flags]
//
// Reads Claude Code transcripts (*.jsonl under ~/.claude/projects unless --dir). Only sessions that ran in this
// venture count: records never cross ventures, so reading every project needs --all. Keeps only the human's own
// messages after the cursor (.naive/diagnose-cursor.json in the venture, else the workspace), REDACTS secrets and
// emails before anything else touches the text, then finds candidates with heuristics and writes one raw source
// draft per run: raw/sources/diagnosis-<date>/{source.json, text.md}. Each candidate says whether a matching
// framework or decision record already exists, so the missed ones stand out.
//
// Offline by default. NAIVE_DIAGNOSE_MODEL=1 with NAIVE_DIAGNOSE_MODEL_MODULE=<path to a module whose default export
// is async (messages) => candidates> adds a model pass over the redacted messages; nothing is sent anywhere otherwise.
// It installs no schedule: run it by hand, or schedule it yourself.
//
// v2 (TRANSCRIPT_DIAGNOSIS_V2): --if-due runs a cheap size check first (characters / 4 since the cursor against
// naive.config.json diagnose.threshold, default 20000, or a new session that started over 24 hours ago) and exits 0
// quietly when there is nothing to read. Catches are typed pattern rules per kind (CATCHES), each matched against the
// records that would hold it and marked recorded or missed. Every catch cites {file, timestamp, sha256} of the
// redacted message, and the day's redacted messages are kept as a raw source that is only ever redacted further,
// raw/sources/conversations-<date>/ (internal, never published), which records made from a catch can cite.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { redact } from "../schema/redact.mjs";
import { listFrameworks } from "../schema/user-frameworks.mjs";
import { findWorkspace } from "../schema/workspace.mjs";
import { localDate, zoneOf } from "../schema/clock.mjs";
import { ventureFile } from "../schema/venture-paths.mjs";

// v1's coarse rules, kept: what the founder said about frameworks, playbooks, decisions and ideas.
export const RULES = [
  ["framework", /\b(?:thinking )?frameworks?\b|\bmental models?\b/i],
  ["playbook", /\bplaybooks?\b|\btemplates?\b|\bchecklists?\b/i],
  ["decision", /\bdecisions?\b|\bwe decided\b|\bI(?:'ve| have)? decided\b|\blet'?s go with\b/i],
  ["idea", /\bwe (?:should|need to|could)\b|\bI want\b|\bwhat if\b|\bidea\b/i],
];

// Typed catch rules (v2). Each kind has its patterns and the record types that would already hold it. A rule may
// also need something about the message (a reply to options, an unanswered question). Order is priority: a
// sentence's kind is the first rule that matches, the rest are listed under also.
const Q = /\?\s*$/;
export const CATCHES = [
  { kind: "correction", against: ["decision"], re: /\byou (?:missed|forgot|skipped|left out|ignored)\b|\bthat'?s (?:not (?:true|right|correct|what I (?:said|meant|asked))|wrong|incorrect)\b|\bnot what I (?:said|meant|asked)\b|\bI (?:said|meant|asked for) .{0,40}\bnot\b/i },
  { kind: "constraint", against: ["constraint"], re: /\bnever\b|\bmust not\b|\bmustn'?t\b|\bshould not ever\b|\bdo not ever\b|\bdon'?t ever\b|\bunder no circumstances\b|\bnot allowed to\b/i },
  { kind: "commitment", against: ["decision", "goal"], re: /\b(?:by|before|on|until|due)\s+(?:(?:next |this )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month|quarter|year)|tomorrow|tonight|today|end of (?:the )?(?:day|week|month|quarter|year)|eo[dwmq]|\d{4}-\d{2}-\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2}|\d{1,2}(?:st|nd|rd|th)?(?: of)? (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b/i },
  { kind: "decision", against: ["decision"], re: /\blet'?s (?:do|go|use|ship|build|keep|drop|make|pick|try)\b|\bgo with\b|\bwe(?:'ll| will)? go with\b|\bwe decided\b|\bI(?:'ve| have)? decided\b|\bdecision is\b|\bsettled on\b/i },
  { kind: "decision", against: ["decision"], re: /^(?:yes|yep|yeah|ok(?:ay)?|sure|agreed|option [a-z0-9]+|the (?:first|second|third) one)\b/i, needs: (m) => m.after_options },
  { kind: "requirement", against: ["requirement"], re: /\bmust (?!not)\b|\bhas to\b|\bhave to\b|\bneeds? to\b|\brequire[sd]?\b|\brequirement\b|\bshould always\b/i },
  { kind: "goal", against: ["goal"], re: /\b(?:my|our|the) (?:goal|aim|target|objective|north star)\b|\bI want (?:to|us to|it to)\b|\bwe want to\b|\bwe(?:'re| are) aiming\b|\bsucceed(?:s|ed)? (?:if|when)\b/i },
  { kind: "promise", against: ["icp", "goal"], re: /\bwe promise\b|\bwe guarantee\b|\bour promise\b|\bpositioning\b|\bposition (?:it|us|ourselves) as\b|\bunlike (?:other|most|the)\b|\bthe only (?:one|tool|product|platform)\b|\bfor people who\b|\bwe(?:'re| are) the\b.{0,40}\bfor\b/i },
  { kind: "person", against: ["icp", "decision"], re: /\b[A-Z][a-z]+ (?:is|will be|as) (?:our|the|my) (?:co-?founder|cto|ceo|coo|cfo|advisor|adviser|designer|engineer|developer|lawyer|accountant|investor|lead|head of [a-z]+|first hire|contractor)\b|\b(?:hire|hiring|recruit|bring on) (?:a|an|our) [a-z]+(?: [a-z]+)?\b|\b(?:my|our) (?:co-?founder|cto|advisor|adviser|designer|lawyer|accountant|investor)\b/ },
  { kind: "open-question", against: ["decision"], re: Q, needs: (m) => !m.answered },
  { kind: "framework", against: ["framework"], re: RULES[0][1] },
  { kind: "playbook", against: ["framework"], re: RULES[1][1] },
  { kind: "decision", against: ["decision"], re: RULES[2][1] },
  { kind: "idea", against: null, re: RULES[3][1] },
];
export const KINDS = [...new Set([...CATCHES.map((c) => c.kind), "frame"])];

const STOP = new Set("about after also because being could every from have into just like make more need only other really should some that their them then there these they thing things think this those through want what when where which while will with would your youre its were been does dont".split(" "));
const words = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter((w) => w.length > 3 && !STOP.has(w)));
export const sha256 = (text) => createHash("sha256").update(String(text)).digest("hex");

function* walk(dir, depth = 0) {
  if (depth > 6 || !existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".naive", "raw"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p, depth + 1);
    else yield p;
  }
}
export function* transcriptFiles(dir) {
  for (const p of [...walk(dir)].filter((p) => p.endsWith(".jsonl")).sort()) yield p;
}

// The human's own words in one transcript line, or null: no tool results, meta lines, commands or reminders.
export function humanText(entry) {
  if (entry?.type !== "user" || entry.isMeta || entry.isSidechain || entry.isCompactSummary || entry.isVisibleInTranscriptOnly || entry.message?.role !== "user") return null;
  const c = entry.message.content;
  const parts = typeof c === "string" ? [c] : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text) : [];
  const text = parts.join("\n")
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<(command-[a-z-]+|local-command-[a-z-]+|bash-[a-z-]+|task-notification|user-prompt-submit-hook|ide_[a-z_]+)>[\s\S]*?<\/\1>/g, "")
    .trim();
  return text || null;
}

// The assistant's visible text in one line, or null: used only to tell whether a question was answered and whether
// the founder's "yes" replied to options. It is never kept or written.
export function assistantText(entry) {
  if (entry?.type !== "assistant" || entry.isSidechain) return null;
  const c = entry.message?.content;
  const parts = typeof c === "string" ? [c] : Array.isArray(c) ? c.filter((b) => b?.type === "text").map((b) => b.text) : [];
  return parts.join("\n").trim() || null;
}
const offersOptions = (t) => /\?/.test(t) && /\boption|\bor\b|\bwhich\b|^\s*(?:[-*]|\d+[.)]|[A-C][.)])\s/im.test(t);

const parseLines = (file) => readFileSync(file, "utf8").split("\n").flatMap((line) => {
  if (!line.trim()) return [];
  try { return [JSON.parse(line)]; } catch { return []; }
});

const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };

// Whether a session's working directory is the root's own: inside it, and not in a venture nested under it.
export function sessionScope(root) {
  const top = real(root), seen = new Map();
  const own = (cwd) => { for (let d = resolve(cwd); ; d = dirname(d)) { if (real(d) === top) return true; if (existsSync(join(d, "venture.json")) || dirname(d) === d) return false; } };
  return (cwd) => { if (typeof cwd !== "string") return false; if (!seen.has(cwd)) seen.set(cwd, own(cwd)); return seen.get(cwd); };
}

export function readMessages(dir, since, inScope = () => true) {
  const out = [];
  for (const file of transcriptFiles(dir)) {
    if (since && statSync(file).mtime.toISOString() < since) continue;
    let lastAssistant = null, previous = null;
    for (const entry of parseLines(file)) {
      const said = assistantText(entry);
      if (said) { lastAssistant = said; if (previous) previous.answered = true; continue; }
      const raw = humanText(entry);
      if (!raw || !inScope(entry.cwd)) continue;
      const afterOptions = Boolean(lastAssistant && offersOptions(lastAssistant));
      lastAssistant = null;
      if (since && (entry.timestamp ?? "") <= since) { previous = null; continue; }
      // Redaction comes first: nothing below sees the raw text.
      const text = redact(raw);
      previous = { text, file: relative(dir, file), timestamp: entry.timestamp ?? null, sha256: sha256(text), cwd: entry.cwd ?? null, after_options: afterOptions, answered: false };
      out.push(previous);
    }
  }
  return out;
}

const sentencesOf = (text) => text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const cite = (m) => ({ file: m.file, timestamp: m.timestamp, sha256: m.sha256 });

// Typed pattern rules over each sentence, then frames: a question the founder asks again in another message.
export function heuristicCandidates(messages) {
  const out = [];
  const questions = [];
  for (const m of messages) {
    for (const s of sentencesOf(m.text)) {
      if (Q.test(s) && s.length >= 12) questions.push({ s, m, w: words(s) });
      const hits = CATCHES.filter((c) => c.re.test(s) && (!c.needs || c.needs(m)));
      const kinds = [...new Set(hits.map((c) => c.kind))];
      if (!kinds.length || (s.length < 12 && kinds[0] !== "decision")) continue;
      out.push({ kind: kinds[0], also: kinds.slice(1), quote: s.slice(0, 400), file: m.file, timestamp: m.timestamp, source: cite(m), by: "heuristic" });
    }
  }
  const seen = new Set();
  for (let i = 0; i < questions.length; i++) {
    if (seen.has(i)) continue;
    const group = [questions[i]];
    for (let j = i + 1; j < questions.length; j++) {
      if (seen.has(j) || questions[j].m === questions[i].m) continue;
      const a = questions[i].w, b = questions[j].w;
      const overlap = [...a].filter((x) => b.has(x)).length;
      if (overlap >= Math.max(2, Math.ceil(Math.min(a.size, b.size) * 0.6))) { group.push(questions[j]); seen.add(j); }
    }
    if (group.length < 2) continue;
    const first = group[0];
    out.push({ kind: "frame", also: [], quote: first.s.slice(0, 400), asked: group.length, file: first.m.file, timestamp: first.m.timestamp, source: cite(first.m), sources: group.map((g) => cite(g.m)), by: "heuristic" });
  }
  return out;
}

// Which record types would hold a catch of this kind (null: any).
export function recordTypesFor(kind) {
  if (kind === "frame") return ["framework", "frame", "decision"];
  const rule = CATCHES.find((c) => c.kind === kind);
  return rule ? rule.against : null;
}

const readJson = (p) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } };
const textOf = (o, fields) => fields.map((f) => o?.[f]).filter((x) => typeof x === "string").join(" ");

// What exists already: frameworks (built-in and the workspace's), decision records, foundation goals,
// requirements, constraints and ICPs, and frames, under the root.
export function knownRecords(root) {
  const known = listFrameworks(root).frameworks.map((f) => ({ type: "framework", ref: `framework ${f.id}`, name: f.id.replace(/-/g, " "), words: words(`${f.id} ${f.title}`) }));
  const add = (type, ref, text) => { if (text) known.push({ type, ref, words: words(text) }); };
  for (const p of walk(root)) {
    if (!p.endsWith(".json")) continue;
    const rel = relative(root, p);
    if (/(^|\/)foundation\/goals\/[^/]+\.json$/.test(rel)) { const g = readJson(p); add("goal", `goal ${g?.id ?? basename(p)} (${rel})`, textOf(g, ["statement", "end_state", "why"])); continue; }
    if (/(^|\/)foundation\/requirements\/[^/]+\.json$/.test(rel)) { const r = readJson(p); add("requirement", `requirement ${r?.id ?? basename(p)} (${rel})`, textOf(r, ["statement"])); continue; }
    if (/(^|\/)foundation\/constraints\.json$/.test(rel)) { for (const c of readJson(p)?.must_not ?? []) add("constraint", `constraint ${c.id} (${rel})`, textOf(c, ["statement", "why"])); continue; }
    if (/(^|\/)foundation\/icp\/[^/]+\.json$/.test(rel)) { const i = readJson(p); add("icp", `icp ${i?.id ?? basename(p)} (${rel})`, [textOf(i, ["who", "short"]), ...(i?.traits ?? []).filter((t) => typeof t === "string")].join(" ")); continue; }
    if (/\.frame\.json$/.test(rel)) { const f = readJson(p); add("frame", `frame ${f?.id ?? basename(p)} (${rel})`, textOf(f, ["id", "title", "goal", "question"])); continue; }
    if (!/decision/i.test(rel)) continue;
    const data = readJson(p);
    const items = Array.isArray(data) ? data : Array.isArray(data?.decisions) ? data.decisions : [data];
    for (const d of items) add("decision", `decision ${d?.id ?? basename(p)} (${rel})`, textOf(d, ["title", "question", "statement", "decision", "summary"]));
  }
  return known;
}

export function matchKnown(candidate, known) {
  const types = recordTypesFor(candidate.kind);
  const pool = types ? known.filter((k) => types.includes(k.type)) : known;
  const w = words(candidate.quote);
  const q = candidate.quote.toLowerCase().replace(/-/g, " ");
  const named = pool.find((k) => k.name && new RegExp(`\\b${k.name}\\b`).test(q));
  if (named) return named.ref;
  let best = null;
  for (const k of pool) {
    const overlap = [...k.words].filter((x) => w.has(x)).length;
    const need = Math.min(2, k.words.size);
    if (overlap >= need && (!best || overlap > best.overlap)) best = { ref: k.ref, overlap };
  }
  return best?.ref ?? null;
}

export function render(run) {
  const { candidates, date, since, dir, conversations = [] } = run;
  const missed = candidates.filter((c) => !c.matches);
  const lines = [
    "---", "type: raw-source", "source: generated", `created: ${date}`, "tags: [naive, diagnosis, transcripts]", "status: draft", "---", "",
    `# Transcript diagnosis, ${date}`, "",
    `The founder's own messages ${since ? `since ${since}` : "(first run)"} in ${dir}, redacted before reading. ${candidates.length} candidates, ${missed.length} with no matching record. A draft: nothing here is decided.`, "",
  ];
  if (conversations.length) lines.push(`Each catch cites its message by file, timestamp and the sha256 of the redacted text; the messages are kept in ${conversations.map((c) => `raw/sources/${c}`).join(", ")}.`, "");
  const counts = KINDS.map((k) => [k, candidates.filter((c) => c.kind === k)]).filter(([, l]) => l.length);
  if (counts.length) lines.push("| Kind | Missed | Recorded |", "|---|---|---|", ...counts.map(([k, l]) => `| ${k} | ${l.filter((c) => !c.matches).length} | ${l.filter((c) => c.matches).length} |`), "");
  for (const [title, list] of [["Missed: no matching record", missed], ["Already recorded", candidates.filter((c) => c.matches)]]) {
    lines.push(`## ${title}`, "");
    if (!list.length) lines.push("None.", "");
    for (const c of list) lines.push(`- **${c.kind}**${c.also?.length ? ` (also ${c.also.join(", ")})` : ""}${c.asked ? ` (asked ${c.asked} times)` : ""}: "${c.quote.replace(/"/g, "'")}"`, `  - ${c.file}, ${c.timestamp ?? "no timestamp"}, ${c.by}${c.source?.sha256 ? `, sha256 ${c.source.sha256.slice(0, 12)}` : ""}${c.matches ? `; matches ${c.matches}` : ""}`);
    lines.push("");
  }
  return lines.join("\n");
}

// The config's threshold (estimated tokens) and stale-session age; defaults 20000 and 24 hours.
export function diagnoseConfig(root) {
  const p = existsSync(join(root, "venture.json")) ? ventureFile(root, "naive.config.json") : join(root, "naive.config.json");
  const d = (existsSync(p) ? readJson(p) : null)?.diagnose ?? {};
  return { threshold: d.threshold ?? 20000, stale_hours: d.stale_hours ?? 24 };
}
const cursorOf = (root) => { const f = join(root, ".naive/diagnose-cursor.json"); return existsSync(f) ? readJson(f)?.last_timestamp ?? null : null; };

// The cheap check: no redaction, no writes. Due when the founder's text since the cursor, at characters / 4, reaches
// the threshold, or when a session that is new since the cursor started more than stale_hours ago.
export function isDue({ root, dir, now = new Date(), since, all = false }) {
  const inScope = all ? () => true : sessionScope(root);
  const { threshold, stale_hours } = diagnoseConfig(root);
  const cursor = since ?? cursorOf(root);
  let chars = 0, stale = null;
  for (const file of transcriptFiles(dir)) {
    if (cursor && statSync(file).mtime.toISOString() < cursor) continue;
    let first = null;
    for (const entry of parseLines(file)) {
      const t = humanText(entry);
      if (!t || !inScope(entry.cwd)) continue;
      first ??= entry.timestamp ?? null;
      if (!cursor || (entry.timestamp ?? "") > cursor) chars += t.length;
    }
    if (first && (!cursor || first > cursor) && now.getTime() - Date.parse(first) >= stale_hours * 3600000) stale ??= relative(dir, file);
  }
  const tokens = Math.ceil(chars / 4);
  const due = tokens >= threshold || Boolean(stale);
  return { due, tokens, threshold, stale_session: stale, reason: tokens >= threshold ? `about ${tokens} tokens since the cursor (threshold ${threshold})` : stale ? `a new session older than ${stale_hours} hours: ${stale}` : `about ${tokens} tokens since the cursor, under ${threshold}` };
}

// Redaction rewrites what is already kept: each run re-redacts raw/sources/conversations-*/ and diagnosis-*/ with
// today's patterns, so a secret an older pattern missed does not stay on disk. A message whose text changes gets
// the sha256 of its new text, and every catch and text.md that cited the old hash is moved to the new one.
export function reredactSources(root) {
  const dir = sourcesDir(root);
  if (!existsSync(dir)) return [];
  const kept = readdirSync(dir).filter((d) => /^(?:conversations|diagnosis)-/.test(d)).map((d) => join(dir, d));
  const moved = new Map();
  const changed = new Set();
  const rewrite = (file, fn) => { if (!existsSync(file)) return false; const was = readFileSync(file, "utf8"); const next = fn(was); if (next === was) return false; writeAtomic(file, next); return true; };
  const jsonl = (fn) => (text) => text.split("\n").map((line) => { const o = line.trim() && readJson0(line); return o ? JSON.stringify(fn(o)) : line; }).join("\n");
  const redactMessage = (m) => {
    const text = redact(m.text ?? "");
    if (text === m.text) return m;
    moved.set(m.sha256, sha256(text));
    return { ...m, text, sha256: sha256(text) };
  };
  // messages.jsonl is the only record of which hash became which, so it is written last: a run that stops
  // earlier leaves it as it was, and the next run works out the same moves and finishes the citations.
  const messages = kept.map((d) => join(d, "messages.jsonl")).filter(existsSync).map((file) => [file, readFileSync(file, "utf8")]).map(([file, was]) => [file, jsonl(redactMessage)(was)]);
  const remap = (ref) => (ref?.sha256 && moved.has(ref.sha256) ? { ...ref, sha256: moved.get(ref.sha256) } : ref);
  const rehash = (text) => [...moved].reduce((t, [a, b]) => t.split(a).join(b).split(a.slice(0, 12)).join(b.slice(0, 12)), text);
  for (const d of kept) {
    if (rewrite(join(d, "catches.jsonl"), jsonl((c) => ({ ...c, quote: redact(c.quote ?? ""), source: remap(c.source), ...(c.sources ? { sources: c.sources.map(remap) } : {}) })))) changed.add(d);
    if (rewrite(join(d, "text.md"), (t) => rehash(redactKeepingCitations(t)))) changed.add(d);
  }
  if (moved.size) {
    const move = (o) => Array.isArray(o) ? o.map(move) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === "conversation" && Array.isArray(v) ? v.map(remap) : move(v)])) : o;
    for (const f of walk(root)) if (f.endsWith(".json")) rewrite(f, (t) => ([...moved.keys()].some((h) => t.includes(h)) ? JSON.stringify(move(JSON.parse(t)), null, 2) + "\n" : t));
  }
  for (const [file, next] of messages) if (rewrite(file, () => next)) changed.add(dirname(file));
  return [...changed].map((d) => relative(root, d));
}

// A citation's path, or the transcripts folder in the header, is long enough to look like a base64 secret and its hash like a hex one, so those lines keep both.
const CITATION = /^(?:The founder's own messages .+ redacted before reading\. .+|## \S+ \(.+\.jsonl, sha256 [0-9a-f]{64}\)| {2}- .+\.jsonl, \S+(?: timestamp)?, (?:heuristic|model)(?:, sha256 [0-9a-f]{12})?(?:; matches .*)?)$/;
const redactKeepingCitations = (text) => text.split("\n").map((line) => (CITATION.test(line) ? line : redact(line))).join("\n");

// The day's redacted founder messages as a raw source: raw/sources/conversations-<date>/. An existing folder gets no
// new messages (they go in a new conversations-<date>-<n>); it changes only when reredactSources redacts it further.
const sourcesDir = (root) => (existsSync(join(root, "venture.json")) ? ventureFile(root, "raw/sources") : join(root, "raw/sources"));
const writeAtomic = (file, text) => { writeFileSync(`${file}.tmp`, text); renameSync(`${file}.tmp`, file); };

// A raw source appears whole or not at all: it is built in a temporary folder and renamed into place, so a run
// that stops partway leaves nothing that a later run would trip on.
function writeSource(root, id, files) {
  const out = join(sourcesDir(root), id), tmp = join(sourcesDir(root), `.tmp-${id}`);
  if (!resolve(out).startsWith(resolve(root) + "/")) throw new Error("refusing to write outside the venture");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(join(tmp, name), text);
  renameSync(tmp, out);
  return out;
}

export function writeConversations(root, messages, tz) {
  const byDay = new Map();
  for (const m of messages) {
    const day = Number.isNaN(Date.parse(m.timestamp)) ? null : localDate(m.timestamp, tz);
    if (!day) continue;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(m);
  }
  const sources = sourcesDir(root);
  const written = [];
  for (const [day, list] of [...byDay].sort()) {
    const kept = new Set();
    let id = `conversations-${day}`;
    for (let n = 2; existsSync(join(sources, id)); n++) {
      const file = join(sources, id, "messages.jsonl");
      for (const line of existsSync(file) ? readFileSync(file, "utf8").split("\n") : []) if (line.trim()) kept.add(`${readJson0(line)?.sha256}|${readJson0(line)?.timestamp}`);
      id = `conversations-${day}-${n}`;
    }
    const fresh = list.filter((m) => !kept.has(`${m.sha256}|${m.timestamp}`)).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
    if (!fresh.length) continue;
    writeSource(root, id, {
      "source.json": JSON.stringify({ id, origin: "the founder's own messages in agent transcripts, redacted before writing (naive diagnose); internal, never published", title: `Founder conversations, ${day} (${tz})`, fetched: day }, null, 2) + "\n",
      "messages.jsonl": fresh.map((m) => JSON.stringify({ file: m.file, timestamp: m.timestamp, sha256: m.sha256, text: m.text })).join("\n") + "\n",
      "text.md": ["---", "type: raw-source", "source: generated", `created: ${day}`, "visibility: internal", "tags: [naive, conversations, transcripts]", "---", "", `# Founder conversations, ${day}`, "", "Redacted. Never edited except to redact further; never published.", "",
      ...fresh.flatMap((m) => [`## ${m.timestamp} (${m.file}, sha256 ${m.sha256})`, "", m.text, ""])].join("\n"),
    });
    written.push(id);
  }
  return written;
}
const readJson0 = (line) => { try { return JSON.parse(line); } catch { return null; } };

export async function diagnose({ root, dir, since, now = new Date(), env = process.env, tz = zoneOf(root), all = false }) {
  const cursorFile = join(root, ".naive/diagnose-cursor.json");
  const cursor = since ?? cursorOf(root);
  const reredacted = reredactSources(root);
  const messages = readMessages(dir, cursor, all ? undefined : sessionScope(root));
  let candidates = heuristicCandidates(messages);
  if (env.NAIVE_DIAGNOSE_MODEL === "1") {
    if (!env.NAIVE_DIAGNOSE_MODEL_MODULE) throw new Error("NAIVE_DIAGNOSE_MODEL=1 needs NAIVE_DIAGNOSE_MODEL_MODULE, a module that takes the redacted messages");
    const model = (await import(pathToFileURL(resolve(env.NAIVE_DIAGNOSE_MODEL_MODULE)).href)).default;
    const more = (await model(messages)) ?? [];
    candidates = candidates.concat(more.map((c) => {
      const m = messages.find((x) => x.file === c.file && x.timestamp === c.timestamp);
      return { kind: KINDS.includes(c.kind) ? c.kind : "idea", also: [], quote: redact(c.quote ?? ""), file: c.file ?? null, timestamp: c.timestamp ?? null, source: m ? cite(m) : null, by: "model" };
    }));
  }
  const known = knownRecords(root);
  for (const c of candidates) { c.matches = matchKnown(c, known); c.status = c.matches ? "recorded" : "missed"; }
  const date = localDate(now, tz);
  const conversations = writeConversations(root, messages, tz);
  let id = `diagnosis-${date}`;
  for (let n = 2; existsSync(join(sourcesDir(root), id)); n++) id = `diagnosis-${date}-${n}`;
  const out = writeSource(root, id, {
    "source.json": JSON.stringify({ id, origin: "transcript diagnosis (naive diagnose): the founder's own messages, redacted", title: `Transcript diagnosis, ${date}`, fetched: date }, null, 2) + "\n",
    "text.md": render({ candidates, date, since: cursor, dir, conversations }),
    "catches.jsonl": candidates.map(({ kind, also, quote, status, matches, source, sources, asked, by }) => JSON.stringify({ kind, also, quote, status, matches, source, sources, asked, by })).join("\n") + (candidates.length ? "\n" : ""),
  });
  const last = messages.map((m) => m.timestamp).filter(Boolean).sort().at(-1) ?? cursor ?? now.toISOString();
  mkdirSync(dirname(cursorFile), { recursive: true });
  writeFileSync(cursorFile, JSON.stringify({ last_run: now.toISOString(), last_timestamp: last }, null, 2) + "\n");
  return { out, messages: messages.length, candidates, conversations, reredacted };
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
  const dir = resolve(opt("dir") ?? join(homedir(), ".claude/projects"));
  if (args.includes("--if-due")) {
    const d = isDue({ root, dir, since: opt("since"), all: args.includes("--all") });
    if (!d.due) { if (args.includes("--json")) console.log(JSON.stringify(d)); process.exit(0); }
  }
  try {
    const r = await diagnose({ root, dir, since: opt("since"), all: args.includes("--all") });
    if (args.includes("--json")) console.log(JSON.stringify({ out: r.out, messages: r.messages, candidates: r.candidates }, null, 2));
    else console.log(`read ${r.messages} of the founder's messages; ${r.candidates.length} candidates, ${r.candidates.filter((c) => !c.matches).length} with no record; wrote ${relative(root, r.out)}/{source.json, text.md, catches.jsonl}${r.conversations.length ? ` and ${r.conversations.map((c) => `raw/sources/${c}`).join(", ")}` : ""}`);
  } catch (e) { console.error(e.message); process.exit(1); }
}
