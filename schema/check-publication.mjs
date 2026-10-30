// Checks each venture's publication policy (governance/publication-policy.json, EE-025) and the
// handoffs that publish. Every publication passes the gate. Rules:
//   policy: channel, guideline and team ids unique; a team's members are known roles; a channel's
//     guidelines are known; a guideline or channel config named by path exists (paths are
//     relative to the venture folder); an outside guideline with a URL states when it was
//     checked (warning); a channel following no brand or editorial guideline is a warning.
//   platforms: a channel on a platform cites a platform guideline; a social, newsletter or
//     app-store channel names its platform.
//   replies: a social, newsletter or blog channel says how replies and comments are handled;
//     delegated replies go to known roles or teams that include a person, never to agents alone.
//   rights: drafters and approvers are known roles or teams; no agent approves, and a team
//     approves only if a person is among its members; every rule has a person approving.
//   handoffs: a handoff that publishes (public-commitment in its decision classes or its
//     escalations) names a channel and a content rule the policy holds; a venture with such a
//     handoff and no policy fails.
//
//   node schema/check-publication.mjs <workspace or venture dir>

import { ventureFile } from "./venture-paths.mjs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-publication.mjs <workspace or venture dir>"); process.exit(2); }
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const roles = new Map(load(new URL("../governance/venture-template/roles/agent-roles.json", import.meta.url)).roles.map((r) => [r.id, r]));
const errors = [], warnings = [];
let checked = 0;

for (const root of walk(dir)) {
  const v = load(ventureFile(root, "venture.json"));
  const pPath = ventureFile(root, "governance/publication-policy.json");
  const policy = existsSync(pPath) ? load(pPath) : null;
  const at = `${v.id}/governance/publication-policy.json`;
  const hDir = ventureFile(root, "operations/handoffs");
  const handoffs = existsSync(hDir) ? readdirSync(hDir).filter((f) => f.endsWith(".json")).map((f) => [f, load(join(hDir, f))]) : [];

  for (const [f, h] of handoffs) {
    const publishes = (h.decision_classes ?? []).includes("public-commitment") || (h.escalations ?? []).some((e) => e.class === "public-commitment");
    const where = `${v.id}/operations/handoffs/${f}`;
    if (!publishes) { if (h.publication) warnings.push(`${where}: names a publication but has no public-commitment class`); continue; }
    if (!policy) { errors.push(`${where}: publishes, but the venture has no governance/publication-policy.json`); continue; }
    if (!h.publication) { errors.push(`${where}: publishes, so it names its channel and content (publication)`); continue; }
    const ch = policy.channels.find((c) => c.id === h.publication.channel);
    if (!ch) errors.push(`${where}: unknown channel ${h.publication.channel}`);
    else if (!ch.rules.some((r) => r.content === h.publication.content)) errors.push(`${where}: channel ${ch.id} has no rule for "${h.publication.content}"`);
  }
  if (!policy) continue;
  checked++;

  const dup = (xs, what) => { const ids = xs.map((x) => x.id); if (new Set(ids).size !== ids.length) errors.push(`${at}: duplicate ${what} ids`); };
  dup(policy.channels, "channel"); dup(policy.guidelines ?? [], "guideline"); dup(policy.teams ?? [], "team");
  const teams = new Map((policy.teams ?? []).map((t) => [t.id, t]));
  for (const t of teams.values()) {
    if (roles.has(t.id)) errors.push(`${at}: team ${t.id} has the same id as a role`);
    for (const m of t.members) if (!roles.has(m)) errors.push(`${at}: team ${t.id} has unknown role ${m}`);
  }
  const guidelines = new Map((policy.guidelines ?? []).map((g) => [g.id, g]));
  for (const g of guidelines.values()) {
    if (g.path && !existsSync(ventureFile(root, g.path))) errors.push(`${at}: guideline ${g.id} not found at ${g.path} (paths are relative to the venture folder)`);
    if (!g.path && !g.url) errors.push(`${at}: guideline ${g.id} needs a path or a url`);
    if (g.url && !g.checked) warnings.push(`${at}: guideline ${g.id} has a url but no checked date`);
  }

  const person = (id) => roles.get(id)?.occupant === "person";
  for (const c of policy.channels) {
    for (const g of c.guidelines ?? []) if (!guidelines.has(g)) errors.push(`${at}: channel ${c.id} follows unknown guideline ${g}`);
    if (!(c.guidelines ?? []).some((g) => ["brand", "editorial"].includes(guidelines.get(g)?.kind))) warnings.push(`${at}: channel ${c.id} follows no brand or editorial guideline`);
    const onPlatform = ["social", "newsletter", "app-store"].includes(c.kind);
    if (onPlatform && !c.platform) errors.push(`${at}: channel ${c.id} is ${c.kind}, so it names its platform`);
    if (c.platform && !(c.guidelines ?? []).some((g) => guidelines.get(g)?.kind === "platform")) errors.push(`${at}: channel ${c.id} runs on ${c.platform} but cites none of its rules (a guideline of kind platform)`);
    if (["social", "newsletter", "blog"].includes(c.kind) && !c.replies) errors.push(`${at}: channel ${c.id} says how replies and comments are handled (replies: gated, delegated or none)`);
    if (c.replies?.mode === "delegated") {
      const ds = c.replies.delegates ?? [];
      if (!ds.length) errors.push(`${at}: channel ${c.id} delegates replies to no one`);
      for (const id of ds) if (!roles.has(id) && !teams.has(id)) errors.push(`${at}: channel ${c.id} delegates replies to unknown role or team ${id}`);
      if (ds.length && !ds.some((id) => person(id) || teams.get(id)?.members.some(person))) errors.push(`${at}: channel ${c.id} delegates replies to agents only; a person answers for the venture`);
    }
    if (c.config && !existsSync(ventureFile(root, c.config))) errors.push(`${at}: channel ${c.id} config not found at ${c.config}`);
    for (const r of c.rules) {
      const rule = `${at}: ${c.id} "${r.content}"`;
      for (const id of [...(r.drafters ?? []), ...r.approvers]) if (!roles.has(id) && !teams.has(id)) errors.push(`${rule}: unknown role or team ${id}`);
      for (const id of r.approvers) {
        if (roles.has(id) && !person(id)) errors.push(`${rule}: ${id} is an agent role; agents draft and check, a person approves`);
        if (teams.has(id) && !teams.get(id).members.some(person)) errors.push(`${rule}: team ${id} has no person, so it cannot approve`);
      }
      if (!r.approvers.some((id) => person(id) || teams.get(id)?.members.some(person))) errors.push(`${rule}: no person approves`);
      for (const l of r.from_layers ?? []) if (v.layers && v.layers[l] === false) warnings.push(`${rule}: publishes from ${l}, which this venture has turned off`);
    }
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${checked} ventures with a publication policy: every publication passes the gate.`);
