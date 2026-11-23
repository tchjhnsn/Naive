// Writes the venture's strategic foundation as a one-page artifact, artifact/foundation.html: the Five Ws and
// How plus whether, each statement marked as confirmed by the founder, drafted, or missing. NAIVE_VENTURE
// names the venture, as a venture folder or an id in the workspace (MENTURA_WORKSPACE, passed through), and is
// required: the company venture's records live in the tenant's store, not in this repository (EE-118 step 9c).
// naive publish build sets NAIVE_VENTURE when it runs this as a channel builder. NAIVE_PUBLISH_OUT moves the output (default site/).
// The page goes through the publishing gate (EE-064): the structure and each statement's status come from
// naive-framework/src/engine/foundation.mjs, but a statement's words reach the page only through naive-framework/src/engine/visibility.mjs
// publicValue, the one public-field function: the field itself when a person approved its wording as
// public, or its approved public variant. Every other statement shows as written but not yet public.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { filesOf, foundation as statements } from "naive-framework/src/engine/foundation.mjs";
import { publicValue } from "naive-framework/src/engine/visibility.mjs";
import { ventureDir } from "naive-framework/src/records/routes/routes.mjs";
import { fonts, style } from "./artifact-style.mjs";

const site = new URL("../", import.meta.url).pathname;
const out = process.env.NAIVE_PUBLISH_OUT ? resolve(process.env.NAIVE_PUBLISH_OUT) : site;
const named = process.env.NAIVE_VENTURE;
if (!named) throw new Error("set NAIVE_VENTURE to the venture folder (or workspace id) whose foundation to write");
const dir = existsSync(join(resolve(named), "venture.json")) ? resolve(named) : ventureDir(named);
if (!dir) throw new Error(`no venture ${named}`);
const venture = basename(dir);

// A statement's public words, or null: one record file, one named field, through the gate.
function publicOf(s) {
  if (!s.record || !s.attribute || s.attribute === ".") return null;
  const files = filesOf(dir, s.record).filter((f) => existsSync(join(dir, f)));
  if (files.length !== 1) return null;
  return publicValue(dir, files[0], s.attribute);
}
const foundation = statements(dir).map((q) => ({ ...q, statements: q.statements.map((s) => {
  const p = publicOf(s);
  const { value, note, ...rest } = s;
  return p ? { ...rest, value: p.value, public: true } : { ...rest, written: value !== undefined };
}) }));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const labels = { confirmed: "Confirmed", agent: "Agent-drafted", draft: "Draft", missing: "Missing", planned: "Planned" };
const names = {
  problem: "Problem", vision: "Vision", mission: "Mission", products: "Products", icp: "Ideal customer",
  "promised-to": "Promised to", competence: "Competence", "business-models": "Business models", phase: "Phase",
  "exit-criteria": "Exit criteria", markets: "Markets", channels: "Channels", alignment: "Principles",
  "whether-review": "Whether review", tagline: "Tagline",
};
const tidy = (s) => String(s).replace(/^product\//, "").replace(/\.json$/, "").replaceAll("-", " ");

// Each statement's value, in the plainest form its shape allows.
function value(s) {
  const v = s.value;
  if (v == null) return `<p class="none">${s.written ? "Written, not yet approved for publishing." : "Not yet written."}</p>`;
  if (typeof v === "string") return `<p>${esc(s.id === "phase" ? v[0].toUpperCase() + v.slice(1) : v)}</p>`;
  // The record enumerates its profiles, each with its own id, so the page does too.
  if (s.id === "icp") return `<ol class="profiles">${v.map((p) => `<li id="icp-${esc(p.id)}">
<div class="pid"><code>${esc(p.id)}</code>${p.primary ? ' <span class="status confirmed">Primary</span>' : ""}${p.customer ? ` <span class="kind">${esc(p.customer.toUpperCase())}</span>` : ""}${p.phases ? ` <span class="kind">${esc(p.phases.join(", "))}</span>` : ""}</div>
${p.short ? `<p><b>${esc(p.short)}</b></p>` : ""}<p>${esc(p.who)}</p>
${p.jobs?.length ? `<p class="kind">Jobs</p><ul>${p.jobs.map((j) => `<li>${esc(j)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ol>`;
  if (s.id === "alignment") return `<ul>${v.map((p) => `<li>${esc(p.statement)}</li>`).join("")}</ul>`;
  if (s.id === "channels") return `<ul>${v.map((c) => `<li>${esc(tidy(c.id))} <span class="kind">${esc(c.kind)}</span></li>`).join("")}</ul>`;
  if (Array.isArray(v)) return `<ul>${v.map((x) => `<li>${esc(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("")}</ul>`;
  return `<ul>${Object.entries(v).map(([k, x]) => `<li><b>${esc(tidy(k))}</b>: ${esc(Array.isArray(x) ? x.join(", ") : x)}</li>`).join("")}</ul>`;
}

const counts = {};
for (const q of foundation) for (const s of q.statements) counts[s.status] = (counts[s.status] ?? 0) + 1;

const page = `<title>Naive Strategic Foundation</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>${style}
.wrap{max-width:60rem}
.summary{display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0 0}
.q{display:grid;grid-template-columns:9rem 1fr;gap:1.25rem;border-top:1px solid var(--line);padding-block:1.5rem}
.q h2{margin:0;font-size:1.1rem}.q .ask{color:var(--muted);font-size:.9rem;margin:.2rem 0 0}
.items{display:grid;gap:1.25rem;min-width:0}
.item h3{margin:0 0 .25rem;font-size:.95rem;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.item p,.item ul{margin:.2rem 0}.item ul{padding-left:1.1rem}
.profiles{list-style:none;padding:0;display:grid;gap:.75rem;counter-reset:icp}
.profiles>li{border:1px solid var(--line);border-radius:6px;padding:.8rem 1rem;background:var(--surface);counter-increment:icp}
.pid{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}.pid::before{content:counter(icp) ".";font:500 .85rem var(--mono);color:var(--muted)}
.none{color:var(--muted);font-style:italic}.kind{color:var(--muted);font-size:.85rem}
.status{font:500 .68rem/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;border-radius:3px;padding:.25rem .4rem;border:1px solid var(--line);color:var(--muted)}
.status.confirmed{color:var(--accent);border-color:var(--accent)}
.status.missing{border-style:dashed}
@media (max-width:40rem){.q{grid-template-columns:1fr;gap:.5rem}}</style>
<div class="wrap">
<h1>Strategic foundation</h1>
<p class="lede">What Naive is, for whom, and why, by the Five Ws and How plus whether. Built by Naive from the ${esc(venture)} venture's public variants.</p>
<div class="summary">${Object.entries(counts).map(([k, n]) => `<span class="status ${k}">${n} ${esc(labels[k] ?? k)}</span>`).join("")}</div>
${foundation.map((q) => `<section class="q" id="${esc(q.question)}">
<div><h2>${esc(q.question[0].toUpperCase() + q.question.slice(1))}</h2><p class="ask">${esc(q.ask)}</p></div>
<div class="items">${q.statements.map((s) => `<div class="item"><h3>${esc(names[s.id] ?? s.id)} <span class="status ${s.status}">${esc(labels[s.status] ?? s.status)}</span></h3>${value(s)}</div>`).join("")}</div>
</section>`).join("\n")}
<footer>Confirmed means the founder confirmed the statement as theirs. A statement's words show only once a person approves them for publishing. Everything else is a draft or a gap for the founder to settle.</footer>
</div>
`;

mkdirSync(join(out, "artifact"), { recursive: true });
writeFileSync(join(out, "artifact/foundation.html"), page);
console.log(`foundation one-pager written for ${venture}`);
