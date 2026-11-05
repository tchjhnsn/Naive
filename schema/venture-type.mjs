// Venture types (EE-082): the registry, and a classifier that reads a founder's few words and says
// which type the venture is. The classifier asks a judge one yes-or-no question per type (Noul) and ranks
// the answers; below the threshold it is uncertain, and the founder picks from the list instead. Without a
// judge command there is no model call at all: the list is the way to choose.
//
//   node schema/venture-type.mjs list
//   node schema/venture-type.mjs classify "<a few words about the venture>"
//
// The judge is MENTURA_TYPE_CMD, else NAIVE_JUDGE_CMD: a command the app that hosts Naive names (such as
// its Jev client), which reads the request on stdin and prints {answers}. Tests use a stand-in.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = new URL("..", import.meta.url).pathname;
export const THRESHOLD = 0.5;

export function types() {
  return JSON.parse(readFileSync(join(repo, "schema/venture-types.json"), "utf8")).types;
}
export const typeOf = (id) => types().find((t) => t.id === id) ?? null;

export function roles() {
  return JSON.parse(readFileSync(join(repo, "governance/venture-template/roles/venture-roles.json"), "utf8")).roles;
}

/** The judge command, or null: MENTURA_TYPE_CMD, else NAIVE_JUDGE_CMD. */
const typeCmd = () => process.env.MENTURA_TYPE_CMD || process.env.NAIVE_JUDGE_CMD || null;

/** Whether a model can classify: a judge command is set. */
export const canClassify = () => Boolean(typeCmd());

/** The typed request: for each type, is the venture described this kind of venture? */
export function request(description) {
  const ts = types();
  const questions = Object.fromEntries(ts.map((t) => [`type:${t.id}`, {
    type: "noul",
    instructions: `Is the venture described in \`venture.description\` a ${t.label.toLowerCase()} (${t.description} Founders call it things like: ${t.examples.join(", ")})?`,
    criteria: { true: `Yes: it is mainly a ${t.label.toLowerCase()}`, false: "No: it is mainly something else" },
  }]));
  return { state: { venture: { description } }, model: "jev-latest", questions };
}

/** Ranked types for a description, most likely first, with uncertain set when none reaches the threshold. */
export function classify(description) {
  if (!typeCmd()) throw new Error("no judge: set MENTURA_TYPE_CMD or NAIVE_JUDGE_CMD, or pick a type from the list");
  const cmd = String(typeCmd()).trim().split(/\s+/);
  const p = spawnSync(cmd[0], cmd.slice(1), { input: JSON.stringify(request(description)), encoding: "utf8", env: process.env });
  if (p.status !== 0) throw new Error(`the type classifier stopped: ${(p.stderr || p.stdout).trim().slice(0, 300)}`);
  const { answers = {}, model = null } = JSON.parse(p.stdout);
  const ranked = types().map((t) => {
    const a = answers[`type:${t.id}`]?.noul;
    return { id: t.id, label: t.label, p: typeof a === "number" ? a : a === true ? 1 : 0 };
  }).sort((a, b) => b.p - a.p);
  return { model, ranked, best: ranked[0].p >= THRESHOLD ? ranked[0] : null, uncertain: ranked[0].p < THRESHOLD };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...words] = process.argv.slice(2);
  if (cmd === "list") for (const t of types()) console.log(`${t.id.padEnd(18)} ${t.label}: ${t.description}`);
  else if (cmd === "classify" && words.length) {
    try { console.log(JSON.stringify(classify(words.join(" ")), null, 2)); } catch (e) { console.error(e.message); process.exit(1); }
  } else { console.error('usage: node schema/venture-type.mjs list | classify "<a few words>"'); process.exit(2); }
}
