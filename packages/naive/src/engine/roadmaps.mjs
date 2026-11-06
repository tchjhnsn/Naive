#!/usr/bin/env node
// Installing a decision roadmap (packages/naive/src/engine/check-roadmap.mjs): each step's frame proposes its decisions,
// open, in the roadmap's order. Nothing is decided: the docket and cross-function ranking decide what
// the founder sees first. A decision already made is kept, so switching roadmaps mid-way re-orders only
// what remains. Steps are proposed from the frame itself; judging a frame's premises is naive frame's job.
//
//   node packages/naive/src/engine/roadmaps.mjs list
//   node packages/naive/src/engine/roadmaps.mjs install <venture dir> <roadmap id>

import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { check, ordered, roadmapOf, roadmaps } from "./check-roadmap.mjs";
import { frameOf } from "./frames.mjs";

/** Propose every step's decisions, open, with the step's place in the roadmap in the note.
 *  @param {string} dir @param {string} id @param {{ agentId?: string, harness?: string, model?: string }} [opts] */
export async function install(dir, id, { agentId = "roadmaps", harness, model } = {}) {
  const r = roadmapOf(id);
  if (!r) return { ok: false, error: `no roadmap ${id}; node packages/naive/src/engine/roadmaps.mjs list shows them` };
  const bad = check(r);
  if (bad.length) return { ok: false, error: bad.join("\n") };
  const { propose, decisions } = await import("./decisions.mjs");
  const proposed = [], kept = [];
  for (const [i, s] of ordered(r).entries()) {
    const f = frameOf(s.frame);
    for (const e of f.emits) {
      const existing = decisions(dir).decisions.find((d) => d.id === e.id);
      if (existing?.status === "decided") { kept.push({ step: s.id, id: e.id, why: "decided already" }); continue; }
      const after = (s.depends_on ?? []).length ? ` After: ${s.depends_on.join(", ")}.` : "";
      const note = `Step ${i + 1} of ${r.steps.length} in the ${r.id} roadmap (${r.version}), from the frame ${f.id}. A ${s.door} door, decided by ${s.decided_by}${s.merged_by ? `, merged by ${s.merged_by}` : ""}.${after}${s.requires?.length ? ` Requires: ${s.requires.join(", ")}.` : ""}`;
      const needed = s.needed_in ?? e.needed_in;
      const res = propose(dir, { id: e.id, question: e.question, ...(e.options?.length ? { options: e.options } : {}), ...(e.layer ? { layer: e.layer } : {}), ...(needed ? { needed_in: needed } : {}), note }, { agentId, via: "cli", harness, model });
      if (!res.ok) return { ok: false, error: res.error };
      proposed.push({ step: s.id, id: e.id, question: e.question, door: s.door, decided_by: s.decided_by, awaiting: "the founder" });
    }
  }
  return { ok: true, result: { roadmap: r.id, version: r.version, proposed, kept } };
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const [cmd, a, b] = process.argv.slice(2);
  const show = (r) => { console.log(JSON.stringify(r.ok === undefined ? r : r.ok ? r.result : { error: r.error }, null, 2)); process.exit(r.ok === false ? 1 : 0); };
  if (cmd === "list") show(roadmaps().map((r) => ({ id: r.id, title: r.title, package: r.package, version: r.version, steps: r.steps.length })));
  else if (cmd === "install") {
    if (!a || !existsSync(join(a, "venture.json")) || !b) { console.error("usage: node packages/naive/src/engine/roadmaps.mjs install <venture dir> <roadmap id>"); process.exit(2); }
    show(await install(resolve(a), b));
  } else { console.error("usage: node packages/naive/src/engine/roadmaps.mjs list|install"); process.exit(2); }
}
