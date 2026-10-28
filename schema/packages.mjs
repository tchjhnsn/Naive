#!/usr/bin/env node
// Venture packages (EE-067): what a founder walks away with at the end of the pipeline, from the idea
// dump onward. A package is a set of records for one receiver (the founder, investors, a cofounder,
// engineering, partners, counsel, the team); it is complete, and ready to hand off, when every
// required record is confirmed by a person. Which packages fit depends on the phase and the venture's
// situation: priors per phase in schema/packages.json, raised or lowered by facts (the need-now form,
// EE-028). Facts come from the records first; the question matrix asks a reasoning model only what the
// records do not settle, and leaves the rest open for the founder. Agents never come in a package:
// an agent working a package is a package enhancement (packages.json enhancements).
//
// Each record in a package carries its route: where the founder's ideas for it stand and the one step
// that moves it (purpose/ideas/routes, EE-061), so an unfinished package says what to do next.
//
//   node schema/packages.mjs <venture> [--raising] [--hiring] [--answers <jev.json>] [--write] [--json]
//   node schema/packages.mjs request <venture>       the Jev request for the questions the records leave open
//
// --write renders the venture package into <venture>/package/: venture-package.json (the manifest),
// README.md (the index) and one Markdown document per fitting package, each record rendered in full.
// The documents are internal: anything public goes through its public variant (EE-064).

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { factsOf as needFacts, probability } from "./need-now.mjs";
import { confirmedIn, filesOf } from "./foundation.mjs";
import { route } from "../purpose/frameworks/idea-map/route.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const PACKAGES = load(join(repo, "schema/packages.json"));
export const OUT = "package";
const MODEL = load(join(repo, "schema/data-model.json"));
const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const r2 = (x) => Math.round(x * 100) / 100;
const json = (dir, f) => existsSync(join(dir, f)) ? load(join(dir, f)) : null;

/** The facts the packages test: need-now's, the founder's flags, and the question matrix's answers. */
export function situation(dir, { flags = {}, answers = null } = {}) {
  const f = needFacts(dir);
  const phase = PHASES.includes(f.phase) ? f.phase : "discovery";
  const icp = json(dir, "purpose/icp.json");
  const profiles = icp?.profiles ?? [];
  const products = filesOf(dir, "product").map((p) => json(dir, p)).filter(Boolean);
  // What the records settle, by question; undefined means they do not.
  const settled = {
    raising: flags.raising != null ? !!flags.raising : f.funding === "bootstrapped" ? false : undefined,
    site: existsSync(join(dir, "operations/marketing/site-presence.json")) || existsSync(join(dir, "operations/marketing/sitemap.json")) || undefined,
    partner_led: profiles.some((p) => p.reached_through?.length) || products.some((p) => (p.offered_to ?? []).some((id) => profiles.some((y) => y.reached_through?.includes(id)))) || undefined,
    hiring: flags.hiring != null ? !!flags.hiring : f.team === "looking" ? true : undefined,
    regulated: undefined,
    exit_intent: json(dir, "governance/exit.json") ? true : undefined,
  };
  const Q = PACKAGES.questions;
  // Without new answers, Jev's answers from the last written package stand.
  if (!answers && existsSync(join(dir, OUT, "venture-package.json"))) answers = Object.fromEntries(load(join(dir, OUT, "venture-package.json")).situation.questions.filter((q) => q.p != null).map((q) => [`q:${q.id}`, { noul: q.p }]));
  const questions = Q.items.filter((q) => q.phases.includes(phase)).map((q) => {
    if (settled[q.id] !== undefined) return { ...q, value: settled[q.id], by: "records" };
    const a = answers?.[`q:${q.id}`]?.noul;
    if (a == null) return { ...q, value: null, by: "open" };
    return { ...q, p: r2(a), value: a >= Q.set_at ? true : a <= Q.clear_at ? false : null, by: a >= Q.set_at || a <= Q.clear_at ? "jev" : "open" };
  });
  for (const q of questions) if (q.value != null) f[q.id] = q.value;
  return { phase, facts: f, questions };
}

/** The Jev request: one typed question per fact the records leave open, over what the venture's records say. */
export function request(dir) {
  const { questions } = situation(dir);
  const v = load(join(dir, "venture.json"));
  const say = (o) => o ? JSON.stringify(o).slice(0, 1200) : null;
  const dump = existsSync(join(dir, "purpose/ideas/dump.md")) ? readFileSync(join(dir, "purpose/ideas/dump.md"), "utf8").slice(0, 2500) : null;
  return { state: { venture: say({ name: v.name, phase: v.phase, ambition: v.ambition, form: v.form, core: v.core }), problem: say(json(dir, "purpose/validation/problem.json")), icp: say(json(dir, "purpose/icp.json")),
    products: say(filesOf(dir, "product").map((p) => json(dir, p)).filter(Boolean).map((p) => ({ name: p.name, offering: p.offering, description: p.description }))), ideas: dump,
    guidelines: "These are one venture's own records and its founder's idea dump. Answer only from what they say; when they do not say, answer low." },
    model: "jev-latest", questions: Object.fromEntries(questions.filter((q) => q.by === "open").map((q) => [`q:${q.id}`, { type: "noul", instructions: q.ask, criteria: { true: "Yes, the records say or clearly imply it", false: "No, or the records do not say" } }])) };
}

/** A record's state in this venture: confirmed by a person, written by an agent, waiting as a draft, or missing. */
function stateOf(dir, type) {
  const files = filesOf(dir, type).filter((f) => existsSync(join(dir, f)) && !(f.endsWith(".json") && ["retired", "archived"].includes(json(dir, f)?.status)));
  const drafts = (filesOf(dir, type).length ? filesOf(dir, type) : [MODEL.records.find((r) => r.id === type)?.paths?.find((p) => p.startsWith("instance/**/"))?.slice(12)].filter(Boolean))
    .filter((f) => !f.includes("*") && existsSync(join(dir, `_drafts/${f.replace(/\//g, "__")}.draft`)));
  if (!files.length) return { status: drafts.length ? "draft" : "missing", files: [], drafts };
  const confirmed = files.every((f) => confirmedIn(dir, f, null));
  return { status: drafts.length ? "draft" : confirmed ? "confirmed" : "agent", files, drafts };
}

const TITLES = { "venture-profile": "Venture profile", "validation-product-market-fit": "Product-market fit", "validation-operations-readiness": "Operations readiness", "marketing-sitemap": "The planned site (sitemap)",
  "marketing-content": "Public content variants", "site-presence": "Site presence", "team-plan": "Team plan", "decision-rights": "Decision rights", "founder-agreement": "Founder agreement", "publication-policy": "Publication policy",
  department: "Departments", handoff: "Handoffs", evidence: "Evidence", ownership: "Ownership", board: "Board", exit: "Exit", account: "Accounts" };
const STATUS = { confirmed: 1, agent: 0.5, draft: 0.5, missing: 0 };

export function packages(dir, { flags = {}, answers = null } = {}) {
  const v = load(join(dir, "venture.json"));
  const { phase, facts, questions } = situation(dir, { flags, answers });
  const next = PHASES[PHASES.indexOf(phase) + 1];
  let routes = null;
  try { routes = route(dir); } catch { routes = null; }
  const dest = new Map((routes?.destinations ?? []).map((d) => [d.id, d]));
  const titleOf = (type) => dest.get(type)?.title ?? TITLES[type] ?? type.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  const list = Object.entries(PACKAGES.packages).map(([id, p]) => {
    const fit = r2(probability(p, phase, facts)), later = next ? r2(probability(p, next, facts)) : null;
    const records = [...p.required.map((t) => [t, true]), ...p.optional.map((t) => [t, false])].map(([type, required]) => {
      const s = stateOf(dir, type), d = dest.get(type);
      return { record: type, title: titleOf(type), required, status: s.status, files: s.files,
        ...(d ? { route: { stage: d.stage, ideas: d.ideas.length, next: d.next ? { by: d.next.by, do: d.next.do, command: d.next.command } : null } } : {}) };
    });
    const req = records.filter((r) => r.required);
    const progress = r2(records.reduce((s, r) => s + STATUS[r.status] * (r.required ? 1 : 0.5), 0) / records.reduce((s, r) => s + (r.required ? 1 : 0.5), 0));
    const state = req.every((r) => r.status === "confirmed") ? "ready" : req.every((r) => r.status !== "missing") ? "review" : "building";
    // Why it fits: the prior, and each condition that moved it.
    const moved = (p.when ?? []).filter((w) => (!w.phase || w.phase === phase) && probability({ base: { [phase]: p.base[phase] }, when: [w] }, phase, facts) !== p.base[phase]).map((w) => w.if);
    return { id, title: p.title, for: p.for, purpose: p.purpose, fit, next_phase: later, in: fit >= PACKAGES.fit ? "now" : later != null && later >= PACKAGES.fit ? "next" : "held",
      why: moved.length ? `${p.why}; here: ${moved.join(", ")}` : p.why, state, progress, records,
      missing: req.filter((r) => r.status === "missing").map((r) => r.record), to_review: req.filter((r) => r.status === "agent" || r.status === "draft").map((r) => r.record) };
  }).sort((a, b) => (a.in === b.in ? 0 : a.in === "now" ? -1 : b.in === "now" ? 1 : a.in === "next" ? -1 : 1) || b.fit - a.fit);
  const now = list.filter((p) => p.in === "now");
  return { version: PACKAGES.version, venture: v.id, name: v.name, phase, built_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    situation: { facts: Object.fromEntries(questions.map((q) => [q.id, q.value])), questions: questions.map((q) => ({ id: q.id, ask: q.ask, value: q.value, by: q.by, ...(q.p != null ? { p: q.p } : {}), moves: q.moves })) },
    progress: now.length ? r2(now.reduce((s, p) => s + p.progress, 0) / now.length) : 0, ready: now.filter((p) => p.state === "ready").map((p) => p.id),
    packages: list, enhancements: PACKAGES.enhancements, routing: routes ? { included: true, note: "Hackathon demo: each record shows where the founder's ideas for it stand and the one step that moves it (EE-061).", loose: routes.loose?.length ?? 0 } : { included: false } };
}

// Render a record as readable Markdown, whatever its shape: the package documents are for people.
const HIDE = new Set(["$schema", "version", "venture"]);
const label = (k) => k.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
function md(x, depth = 0) {
  const pad = "  ".repeat(depth);
  if (x == null || x === "") return "";
  if (typeof x !== "object") return String(x);
  if (Array.isArray(x)) return x.map((e) => typeof e === "object" && e ? `${pad}- ${md(lead(e), 0)}\n${md(rest(e), depth + 1)}` : `${pad}- ${e}`).join("\n").replace(/\n+$/, "");
  return Object.entries(x).filter(([k, v]) => !HIDE.has(k) && v != null && v !== "" && !(Array.isArray(v) && !v.length)).map(([k, v]) =>
    typeof v === "object" ? `${pad}- **${label(k)}**\n${md(v, depth + 1)}` : `${pad}- **${label(k)}**: ${v}`).join("\n");
}
const LEAD = ["name", "title", "who", "statement", "question", "label", "id"];
const lead = (o) => { const k = LEAD.find((k) => typeof o[k] === "string"); return k ? o[k] : ""; };
const rest = (o) => { const k = LEAD.find((k) => typeof o[k] === "string"); return Object.fromEntries(Object.entries(o).filter(([x]) => x !== k)); };
const body = (dir, f) => {
  const t = readFileSync(join(dir, f), "utf8");
  if (f.endsWith(".json")) return md(JSON.parse(t));
  return t.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^#\s.*\n/, "").trim();
};
const MARK = { confirmed: "confirmed", agent: "drafted by an agent, not yet reviewed", draft: "a draft waiting for you", missing: "not written yet" };

/** Write the venture package: the manifest, the index, and one document per package that fits now. */
export function write(dir, r) {
  const out = join(dir, OUT);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "venture-package.json"), JSON.stringify(r, null, 2) + "\n");
  const now = r.packages.filter((p) => p.in === "now");
  for (const p of now) {
    const doc = [`# ${r.name}: ${p.title} package`, "", `For ${p.for}. ${p.purpose}`, "",
      `Internal: these are the venture's own records. Anything public is a separate variant that passes the public gate (EE-064).`, "",
      `State: ${p.state === "ready" ? "ready to hand off" : p.state === "review" ? "every record is written; some wait for your review" : `${p.missing.length} required record${p.missing.length === 1 ? "" : "s"} still to write`} (${Math.round(p.progress * 100)}%).`, ""];
    for (const x of p.records) {
      doc.push(`## ${x.title}${x.required ? "" : " (optional)"}`, "", `*${MARK[x.status]}*${x.route?.next ? `. Next: ${x.route.next.do}` : ""}`, "");
      for (const f of x.files) { if (x.files.length > 1) doc.push(`### ${f}`, ""); doc.push(body(dir, f) || "(empty)", ""); }
    }
    writeFileSync(join(out, `${p.id}.md`), doc.join("\n").replace(/\n{3,}/g, "\n\n"));
  }
  const fm = ["---", "type: venture-package", "source: generated", `created: ${r.built_at}`, "ai-model: none", `tags: [venture-package, ${r.venture}, ${r.phase}]`, `description: "${r.name}'s venture package in ${r.phase}: ${now.length} packages fit now (EE-067)."`, "---", ""];
  const idx = [...fm, `# ${r.name}: venture package`, "", `Phase: ${r.phase}. ${Math.round(r.progress * 100)}% complete across the packages that fit now. Ready to hand off: ${r.ready.length ? r.ready.join(", ") : "none yet"}.`, "",
    "| Package | For | Fit now | State | Progress | Still to write | To review |", "|---|---|---|---|---|---|---|",
    ...now.map((p) => `| [${p.title}](${p.id}.md) | ${p.for} | ${p.fit} | ${p.state} | ${Math.round(p.progress * 100)}% | ${p.missing.join(", ") || "none"} | ${p.to_review.join(", ") || "none"} |`), "",
    `Coming next phase: ${r.packages.filter((p) => p.in === "next").map((p) => p.title).join(", ") || "none"}. Held: ${r.packages.filter((p) => p.in === "held").map((p) => p.title).join(", ") || "none"}.`, "",
    "## What decided this", "", ...r.situation.questions.map((q) => `- ${q.ask} **${q.value == null ? "open: yours to answer" : q.value ? "yes" : "no"}** (${q.by === "records" ? "from the records" : q.by === "jev" ? `Jev, ${q.p}` : "the records do not say"})`), "",
    "## Not included", "", `- Agents. ${r.enhancements.agents}`, ""];
  writeFileSync(join(out, "README.md"), idx.join("\n"));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
  const has = (n) => args.includes(`--${n}`);
  if (args[0] === "request") { console.log(JSON.stringify(request(args[1]))); process.exit(0); }
  const dir = args[0];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/packages.mjs <venture> [--raising] [--hiring] [--answers <jev.json>] [--write] [--json] | request <venture>"); process.exit(2); }
  const answers = opt("answers") ? load(opt("answers")).answers : null;
  const r = packages(dir, { flags: Object.fromEntries(["raising", "hiring"].filter(has).map((k) => [k, true])), answers });
  if (has("write")) console.error(`wrote ${write(dir, r)}`);
  if (has("json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.name} (${r.phase}): venture package ${Math.round(r.progress * 100)}%, ready to hand off: ${r.ready.join(", ") || "none yet"}`);
    for (const p of r.packages) console.log(`${p.in.padEnd(5)} ${p.title.padEnd(26)} fit ${String(p.fit).padEnd(5)} ${p.in === "now" ? `${p.state.padEnd(9)} ${Math.round(p.progress * 100)}%${p.missing.length ? `  to write: ${p.missing.join(", ")}` : ""}` : p.why}`);
    const open = r.situation.questions.filter((q) => q.value == null);
    if (open.length) console.log(`Open: ${open.map((q) => q.ask).join(" ")}`);
  }
}
