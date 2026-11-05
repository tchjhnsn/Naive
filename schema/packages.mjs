#!/usr/bin/env node
// Venture packages (EE-067, EE-069): the venture's business source of truth, and the gate between
// idea and automation. Core packages are where the records live, one per department plus the
// foundation; each record has one home and other packages read it. Handoff packages hold no records:
// each is a snapshot of core packages for one receiver (investors, partners, a cofounder, engineering,
// counsel). A package is complete when a person has confirmed its required records and every record it
// reads; then MAD's automation tier may run the work that depends on it (schema/packages.json unlocks).
// Which packages fit depends on the phase and the venture's situation: priors per phase, raised or
// lowered by facts (the need-now form, EE-028); facts come from the records first, and the question
// matrix asks a reasoning model only what the records do not settle. Inside a package, a record moves
// on its own once everything it reads first is confirmed, and waits otherwise (records.after): that is
// what Route shows. Agents never come in a package: an agent working a package is an enhancement.
//
// A record carries its route (where the founder's ideas for it stand and the one step that moves it,
// purpose/ideas/routes, EE-061) when the idea map's routing is passed in. The command line, which
// passes it, is interface/orchestration/venture-package.mjs (route system/package).
//
// write() renders a readable view of the venture package into <venture>/package/: venture-package.json
// (the manifest, with its versions), README.md (the index) and one Markdown document per open package.
// The records themselves stay where they are; the view is regenerated. The documents are internal:
// anything public goes through its public variant (EE-064).

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { factsOf as needFacts, probability } from "./need-now.mjs";
import { confirmedIn, filesOf, icpProfiles } from "./foundation.mjs";

import { loadPackages } from "./load-packages.mjs";
// Upgrades hook (U-5): packages a venture adopted early in naive.config.json open now.
import { adopted } from "./naive-config.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";
import { scale } from "./canonical.mjs";
import { readDataModel } from "../packages/records/index.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const PACKAGES = loadPackages(repo);
export const OUT = "package";
const MODEL = readDataModel();
const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const r2 = (x) => Math.round(x * 100) / 100;
const json = (dir, f) => existsSync(ventureFile(dir, f)) ? load(ventureFile(dir, f)) : null;

/**
 * The facts the packages test: need-now's, the founder's flags, and the question matrix's answers.
 * @param {string} dir
 * @param {{ flags?: Record<string, *>, answers?: Record<string, *> | null }} [opts]
 */
export function situation(dir, { flags = {}, answers = null } = {}) {
  const f = needFacts(dir);
  const phase = PHASES.includes(f.phase) ? f.phase : "discovery";
  const profiles = icpProfiles(dir);
  const products = filesOf(dir, "product").map((p) => json(dir, p)).filter(Boolean);
  // What the records settle, by question; undefined means they do not.
  const settled = {
    raising: flags.raising != null ? !!flags.raising : f.funding === "bootstrapped" ? false : undefined,
    // A site read by site presence; a planned sitemap does not count, since the pipeline plans one for every venture.
    site: existsSync(join(ventureFile(dir, "operations/marketing/site-presence.json"))) || undefined,
    partner_led: profiles.some((p) => p.reached_through?.length) || products.some((p) => (p.offered_to ?? []).some((id) => profiles.some((y) => y.reached_through?.includes(id)))) || undefined,
    hiring: flags.hiring != null ? !!flags.hiring : f.team === "looking" ? true : undefined,
    regulated: undefined,
    exit_intent: json(dir, "governance/exit.json") ? true : undefined,
  };
  const Q = PACKAGES.questions;
  // Jev's answers from the last written package stand, unless new answers replace them.
  const last = existsSync(join(ventureFile(dir, OUT), "venture-package.json")) ? Object.fromEntries(load(join(ventureFile(dir, OUT), "venture-package.json")).situation.questions.filter((q) => q.p != null).map((q) => [`q:${q.id}`, { noul: q.p }])) : {};
  answers = { ...last, ...(answers ?? {}) };
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
  const dumpFile = ["raw/dump.md", "purpose/ideas/dump.md"].find((f) => existsSync(ventureFile(dir, f)));
  const dump = dumpFile ? readFileSync(ventureFile(dir, dumpFile), "utf8").slice(0, 2500) : null;
  const problem = json(dir, "foundation/problem.json") ?? json(dir, "purpose/validation/problem.json");
  const icpRec = icpProfiles(dir).map(({ file, ...p }) => p);
  return { state: { venture: say({ name: v.name, phase: v.phase, ambition: scale(dir, v), form: v.form, core: v.core }), problem: say(problem), icp: say(icpRec.length ? { profiles: icpRec } : null),
    products: say(filesOf(dir, "product").map((p) => json(dir, p)).filter(Boolean).map((p) => ({ name: p.name, offering: p.offering, description: p.description }))), ideas: dump,
    guidelines: "These are one venture's own records and its founder's idea dump. Answer only from what they say; when they do not say, answer low." },
    model: "jev-latest", questions: Object.fromEntries(questions.filter((q) => q.by === "open").map((q) => [`q:${q.id}`, { type: "noul", instructions: q.ask, criteria: { true: "Yes, the records say or clearly imply it", false: "No, or the records do not say" } }])) };
}

/** A record's state in this venture: confirmed by a person, written by an agent, waiting as a draft, or missing. */
function stateOf(dir, type) {
  const files = filesOf(dir, type).filter((f) => existsSync(ventureFile(dir, f)) && !(f.endsWith(".json") && ["retired", "archived"].includes(json(dir, f)?.status)));
  const drafts = (filesOf(dir, type).length ? filesOf(dir, type) : [MODEL.records.find((r) => r.id === type)?.paths?.find((p) => p.startsWith("instance/**/"))?.slice(12)].filter(Boolean))
    .filter((f) => !f.includes("*") && existsSync(ventureFile(dir, `_drafts/${f.replace(/\//g, "__")}.draft`)));
  if (!files.length) return { status: drafts.length ? "draft" : "missing", files: [], drafts };
  const confirmed = files.every((f) => confirmedIn(dir, f, null));
  return { status: drafts.length ? "draft" : confirmed ? "confirmed" : "agent", files, drafts };
}

export const TITLES = { "venture-profile": "Venture profile", "validation-product-market-fit": "Product-market fit", "validation-operations-readiness": "Operations readiness", "marketing-sitemap": "The planned site (sitemap)",
  "marketing-content": "Public content variants", "site-presence": "Site presence", "team-plan": "Team plan", "decision-rights": "Decision rights", "founder-agreement": "Founder agreement", "publication-policy": "Publication policy",
  department: "Departments", handoff: "Handoffs", evidence: "Evidence", ownership: "Ownership", board: "Board", exit: "Exit", account: "Accounts" };
const STATUS = { confirmed: 1, agent: 0.5, draft: 0.5, missing: 0 };

/** Which core package each record lives in. */
export const HOME = Object.fromEntries(Object.entries(PACKAGES.core).flatMap(([id, p]) => [...p.required, ...p.optional].map((r) => [r, id])));

/**
 * The venture package. `routes` is the idea map's routing for the venture (route() in
 * purpose/frameworks/idea-map/route.mjs), passed in by interface/orchestration/venture-package.mjs:
 * with it, each record gets the idea map's title and where the founder's ideas for it stand. This
 * module does not import the idea map, because the idea map reads schema/ itself (router inversion,
 * step 4c).
 * @param {string} dir
 * @param {{ flags?: Record<string, boolean>, answers?: * , routes?: * }} [opts]
 */
export function packages(dir, { flags = {}, answers = null, routes = null } = {}) {
  const v = load(join(dir, "venture.json"));
  const { phase, facts, questions } = situation(dir, { flags, answers });
  const next = PHASES[PHASES.indexOf(phase) + 1];
  // Upgrades hook (U-5): a package adopted early opens now, even an experimental one Naive does not model.
  const early = adopted(dir);
  const adopt = (id, f) => (early.has(id) && f.in !== "now" ? { ...f, in: "now", early: true, why: `${f.why}; adopted early in naive.config.json` } : f);
  const dest = new Map((routes?.destinations ?? []).map((d) => [d.id, d]));
  const titleOf = (type) => dest.get(type)?.title ?? TITLES[type] ?? type.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  const states = new Map();
  const st = (type) => (states.has(type) || states.set(type, stateOf(dir, type)), states.get(type));
  const fitOf = (p) => {
    const fit = r2(probability(p, phase, facts)), later = next ? r2(probability(p, next, facts)) : null;
    const moved = (p.when ?? []).filter((w) => (!w.phase || w.phase === phase) && probability({ base: { [phase]: p.base[phase] }, when: [w] }, phase, facts) !== p.base[phase]).map((w) => w.if);
    return { fit, next_phase: later, in: fit >= PACKAGES.fit ? "now" : later != null && later >= PACKAGES.fit ? "next" : "held", why: moved.length ? `${p.why}; here: ${moved.join(", ")}` : p.why };
  };
  // A record moves on its own once everything it reads first is confirmed; otherwise it waits on those.
  const row = (type, role) => {
    const s = st(type), d = dest.get(type);
    const waits = (PACKAGES.records[type]?.after ?? []).filter((a) => st(a).status !== "confirmed");
    return { record: type, title: titleOf(type), role, home: HOME[type], status: s.status, files: s.files,
      moves: s.status === "confirmed" ? "done" : waits.length ? "waits" : "now", ...(waits.length && s.status !== "confirmed" ? { waits_on: waits, waits_on_titles: waits.map(titleOf) } : {}),
      ...(d ? { route: { stage: d.stage, ideas: d.ideas.length, next: d.next ? { by: d.next.by, do: d.next.do, command: d.next.command } : null } } : {}) };
  };
  const core = Object.entries(PACKAGES.core).filter(([id, p]) => !p.not_modeled || early.has(id)).map(([id, p]) => {
    const records = [...p.required.map((t) => row(t, "required")), ...p.optional.map((t) => row(t, "optional")), ...p.refs.map((t) => row(t, "reads"))];
    const gate = records.filter((r) => r.role !== "optional");
    const weight = (r) => (r.role === "optional" ? 0.5 : 1);
    const progress = r2(records.reduce((s, r) => s + STATUS[r.status] * weight(r), 0) / records.reduce((s, r) => s + weight(r), 0));
    const state = gate.every((r) => r.status === "confirmed") ? "complete" : gate.every((r) => r.status !== "missing") ? "review" : "building";
    return { kind: "core", id, title: p.title, department: p.department, purpose: p.purpose, ...adopt(id, fitOf(p)), state, progress, records, planned: p.planned, unlocks: p.unlocks,
      missing: gate.filter((r) => r.status === "missing").map((r) => r.record), to_review: gate.filter((r) => r.status === "agent" || r.status === "draft").map((r) => r.record),
      moving: records.filter((r) => r.moves === "now" && r.role !== "reads").map((r) => r.record) };
  });
  const byId = Object.fromEntries(core.map((p) => [p.id, p]));
  const handoff = Object.entries(PACKAGES.handoff).filter(([id, p]) => !p.not_modeled || early.has(id)).map(([id, p]) => {
    const from = p.from.map((c) => byId[c]).filter(Boolean);
    return { kind: "handoff", id, title: p.title, for: p.for, from: p.from, ...adopt(id, fitOf(p)), state: from.every((c) => c.state === "complete") ? "complete" : "building",
      progress: r2(from.reduce((s, c) => s + c.progress, 0) / from.length), waits_on: from.filter((c) => c.state !== "complete").map((c) => c.id), unlocks: p.unlocks };
  });
  const order = (a, b) => ({ now: 0, next: 1, held: 2 }[a.in] - { now: 0, next: 1, held: 2 }[b.in]) || b.fit - a.fit;
  core.sort(order); handoff.sort(order);
  const open = core.filter((p) => p.in === "now");
  return { version: PACKAGES.version, venture: v.id, name: v.name, phase, built_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    situation: { facts: Object.fromEntries(questions.map((q) => [q.id, q.value])), questions: questions.map((q) => ({ id: q.id, ask: q.ask, value: q.value, by: q.by, ...(q.p != null ? { p: q.p } : {}), moves: q.moves })) },
    progress: open.length ? r2(open.reduce((s, p) => s + p.progress, 0) / open.length) : 0,
    complete: [...core, ...handoff].filter((p) => p.in === "now" && p.state === "complete").map((p) => p.id),
    core, handoff, assumes: PACKAGES.assumes, not_modeled: [...Object.entries(PACKAGES.core), ...Object.entries(PACKAGES.handoff)].filter(([id, p]) => p.not_modeled && !early.has(id)).map(([id, p]) => ({ id, title: p.title, why: p.not_modeled })),
    enhancements: PACKAGES.enhancements,
    routing: routes ? { included: true, note: "Hackathon demo: each record shows where the founder's ideas for it stand and the one step that moves it (EE-061).", loose: routes.loose?.length ?? 0 } : { included: false } };
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
  const t = readFileSync(ventureFile(dir, f), "utf8");
  if (f.endsWith(".json")) return md(JSON.parse(t));
  return t.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^#\s.*\n/, "").trim();
};
const MARK = { confirmed: "confirmed", agent: "drafted by an agent, not yet reviewed", draft: "a draft waiting for you", missing: "not written yet" };
const STATE = { complete: "complete: its automation may run", review: "every record is written; some wait for your review", building: "still being written" };

/** A new version each time a package completes or the phase changes; earlier versions are kept. */
export function versions(dir, r) {
  const f = join(ventureFile(dir, OUT), "venture-package.json");
  const before = existsSync(f) ? load(f) : null;
  const list = before?.versions ?? [];
  const last = list.at(-1);
  const done = r.complete.slice().sort();
  const changed = !last || last.phase !== r.phase || done.some((id) => !last.complete.includes(id));
  if (!changed) return list;
  const n = list.length + 1;
  return [...list, { version: n, at: r.built_at, phase: r.phase, complete: done, why: !last ? "first package" : last.phase !== r.phase ? `phase changed to ${r.phase}` : `completed: ${done.filter((id) => !last.complete.includes(id)).join(", ")}`, tag: `package/${r.venture}/v${n}` }];
}

/** Write the readable view: the manifest, the index, and one document per open core package. */
export function write(dir, r) {
  const out = ventureFile(dir, OUT);
  mkdirSync(out, { recursive: true });
  r.versions = versions(dir, r);
  writeFileSync(join(out, "venture-package.json"), JSON.stringify(r, null, 2) + "\n");
  const open = r.core.filter((p) => p.in === "now");
  for (const p of open) {
    const doc = [`# ${r.name}: ${p.title}`, "", p.purpose, "",
      `Internal: these are the venture's own records. Anything public is a separate variant that passes the public gate (EE-064).`, "",
      `State: ${STATE[p.state]} (${Math.round(p.progress * 100)}%). Unlocks: ${p.unlocks.join(", ")}.`, ""];
    for (const x of p.records) {
      doc.push(`## ${x.title}${x.role === "optional" ? " (optional)" : x.role === "reads" ? ` (read from ${PACKAGES.core[x.home]?.title ?? x.home})` : ""}`, "",
        `*${MARK[x.status]}*${x.waits_on ? `. Waits on: ${x.waits_on.map(titleOf0).join(", ")}` : ""}${x.route?.next && x.status !== "confirmed" ? `. Next: ${x.route.next.do}` : ""}`, "");
      if (x.role === "reads") continue;
      for (const f of x.files) { if (x.files.length > 1) doc.push(`### ${f}`, ""); doc.push(body(dir, f) || "(empty)", ""); }
    }
    if (p.planned.length) doc.push("## Not in Naive yet", "", ...p.planned.map((x) => `- ${x}`), "");
    writeFileSync(join(out, `${p.id}.md`), doc.join("\n").replace(/\n{3,}/g, "\n\n"));
  }
  const pct = (x) => `${Math.round(x * 100)}%`;
  const fm = ["---", "type: venture-package", "source: generated", `created: ${r.built_at}`, "ai-model: none", `tags: [venture-package, ${r.venture}, ${r.phase}]`, `description: "${r.name}'s venture package in ${r.phase}, version ${r.versions.at(-1)?.version ?? 1} (EE-067, EE-069)."`, "---", ""];
  const idx = [...fm, `# ${r.name}: venture package`, "", `Phase: ${r.phase}. ${pct(r.progress)} across the core packages open now. Complete, so their automation may run: ${r.complete.length ? r.complete.join(", ") : "none yet"}.`, "",
    "## Core packages", "", "| Package | Fit now | State | Progress | Moving now | Still to write | To review |", "|---|---|---|---|---|---|---|",
    ...r.core.filter((p) => p.in !== "held").map((p) => `| ${p.in === "now" ? `[${p.title}](${p.id}.md)` : `${p.title} (next phase)`} | ${p.fit} | ${p.state} | ${pct(p.progress)} | ${p.moving.join(", ") || "none"} | ${p.missing.join(", ") || "none"} | ${p.to_review.join(", ") || "none"} |`), "",
    `Held: ${r.core.filter((p) => p.in === "held").map((p) => p.title).join(", ") || "none"}.`, "",
    "## Handoff packages", "", "| Package | For | Fit now | Draws on | Waits on |", "|---|---|---|---|---|",
    ...r.handoff.filter((p) => p.in !== "held").map((p) => `| ${p.title} | ${p.for} | ${p.fit} | ${p.from.join(", ")} | ${p.waits_on.join(", ") || "nothing: ready"} |`), "",
    `Held: ${r.handoff.filter((p) => p.in === "held").map((p) => p.title).join(", ") || "none"}.`, "",
    "## What decided this", "", ...r.situation.questions.map((q) => `- ${q.ask} **${q.value == null ? "open: yours to answer" : q.value ? "yes" : "no"}** (${q.by === "records" ? "from the records" : q.by === "jev" ? `Jev, ${q.p}` : "the records do not say"})`), "",
    "## Versions", "", ...r.versions.map((x) => `- v${x.version}, ${x.at}, ${x.phase}: ${x.why}. Tag: \`${x.tag}\``), "",
    "## Assumed", "", `- ${r.assumes.note}`, "", "## Not included", "", `- Agents. ${r.enhancements.agents}`, ...r.not_modeled.map((x) => `- ${x.title}. ${x.why}`), ""];
  writeFileSync(join(out, "README.md"), idx.join("\n"));
  return out;
}
const titleOf0 = (t) => TITLES[t] ?? t.replace(/-/g, " ");
