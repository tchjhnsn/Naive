// Derives MAD's answers that a venture's own records already settle, so MAD reads them
// instead of asking again (EE-023). Each answer names the record it came from; a question
// whose record is missing or does not settle it is listed under still_ask.
//
//   node operations/skills/methodology-selection/derive-answers.mjs <venture dir> [--json]
//
// Sources: purpose/telos.json (success measure), governance/ownership.json and board.json
// (who decides), venture.json form.funding (funding), members and decision rights (agent
// autonomy). Question ids are MAD's governance tier (MAD repo layers/governance/layer.json).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node operations/skills/methodology-selection/derive-answers.mjs <venture dir> [--json]"); process.exit(2); }
const load = (p) => existsSync(join(dir, p)) ? JSON.parse(readFileSync(join(dir, p), "utf8")) : null;
const v = load("venture.json"), telos = load("purpose/telos.json"), own = load("governance/ownership.json"), boards = load("governance/board.json");

const rules = {
  "governance.who_decides": () => {
    if (boards?.boards.some((b) => b.kind === "formal" && b.seats.length > 1)) return ["board_or_committee", "governance/board.json: a formal board with more than one seat"];
    const founders = own?.holders.filter((h) => h.kind === "founder").length ?? 0;
    if (founders >= 2) return ["small_group", `governance/ownership.json: ${founders} founders`];
    if (v.owner === "self" && founders <= 1) return ["sole_owner", "venture.json: owner self"];
    return null;
  },
  "governance.funding": () => {
    const map = { bootstrapped: "self_funded", "venture-capital": "external_investment", angel: "external_investment" };
    const f = v.form?.funding;
    return map[f] ? [map[f], `venture.json: form.funding ${f}`] : null;
  },
  "governance.agent_autonomy": () => {
    const agents = (v.members ?? []).some((m) => typeof m === "object" && m.kind === "agent");
    if (!agents) return v.members ? ["not_applicable", "venture.json: no agent members"] : null;
    return v.layers?.governance ? ["by_decision_class", "decision rights: the template and governance/decision-rights.json"] : null;
  },
  "governance.success_measure": () => {
    const m = telos?.measures.find((x) => x.primary);
    if (!m) return null;
    return [m.kind === "impact" ? "none_of_these" : m.kind, `purpose/telos.json: primary measure ${m.id}`];
  },
};

const derived = {}, still_ask = [];
for (const [q, rule] of Object.entries(rules)) {
  const r = rule();
  if (r) derived[q] = { answer: r[0], from: r[1] }; else still_ask.push(q);
}
const out = { venture: v.id, derived, still_ask };
if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 2));
else {
  for (const [q, d] of Object.entries(derived)) console.log(`${q.padEnd(28)} ${d.answer.padEnd(22)} from ${d.from}`);
  if (still_ask.length) console.log(`still ask: ${still_ask.join(", ")}`);
}
