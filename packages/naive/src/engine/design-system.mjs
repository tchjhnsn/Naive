#!/usr/bin/env node
// The design system's inputs and its check. The marketing function does not keep its own copy of the
// mission, the ICPs or the market: it inherits them from the records other functions own, here, in code.
//
//   node packages/naive/src/engine/design-system.mjs <venture dir> inputs [--json]   what the brand kit reads, by key
//   node packages/naive/src/engine/design-system.mjs <venture dir> check [--json]    every choice rests on inputs that exist
//
// Input keys: mission, promised-to, problem, segment, icp:<id>, alignment:<id>, market:<product>,
// founder:<id>. A choice's `from` names these keys; a key that no longer exists fails the check, so a
// change upstream (a retired ICP, a new mission) shows which brand choices to revisit.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";

const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const read = (dir, rel) => (existsSync(ventureFile(dir, rel)) ? load(ventureFile(dir, rel)) : null);
const list = (dir, rel) => (existsSync(ventureFile(dir, rel)) ? readdirSync(ventureFile(dir, rel)).filter((f) => f.endsWith(".json")).sort() : []);
export const DESIGN_SYSTEM = "marketing/design-system.json";

// The latest decided mission wording, else the venture's core promise.
function mission(dir) {
  const decided = list(dir, "marketing/decisions").map((f) => read(dir, `marketing/decisions/${f}`))
    .filter((d) => d && /^mission/.test(d.id) && d.status === "decided" && d.answer)
    .sort((a, b) => String(a.provenance?.approved_at).localeCompare(String(b.provenance?.approved_at)));
  if (decided.length) return { value: decided.at(-1).answer, route: `marketing/decisions/${decided.at(-1).id}`, confirmed: true };
  const core = read(dir, "venture.json")?.core;
  return core?.promise ? { value: core.promise, route: "venture", confirmed: null } : null;
}

/** Everything the design system reads from other functions, keyed for a choice's `from`. */
export function inputs(dir) {
  const out = {};
  const m = mission(dir);
  if (m) out.mission = m;
  const core = read(dir, "venture.json")?.core;
  if (core?.promised_to) out["promised-to"] = { value: core.promised_to, route: "venture" };
  const problem = read(dir, "foundation/problem.json");
  if (problem?.statement) out.problem = { value: problem.statement, route: "foundation/problem" };
  if (problem?.segment) out.segment = { value: problem.segment, route: "foundation/problem" };
  // One record per ICP profile; the older single file still answers until it is migrated.
  const profiles = list(dir, "foundation/icp").length
    ? list(dir, "foundation/icp").map((f) => read(dir, `foundation/icp/${f}`))
    : read(dir, "foundation/icp.json")?.profiles ?? [];
  for (const p of profiles.filter((x) => x?.id && x.status !== "retired")) {
    out[`icp:${p.id}`] = { value: { who: p.who, short: p.short, primary: !!p.primary, traits: p.traits ?? [], jobs: p.jobs ?? [] }, route: `foundation/icp/${p.id}` };
  }
  for (const a of read(dir, "foundation/alignment.json")?.principles ?? []) out[`alignment:${a.id}`] = { value: a.statement, route: "foundation/alignment" };
  for (const f of list(dir, "product")) {
    const p = read(dir, `product/${f}`);
    if (p?.market) out[`market:${p.id ?? f.replace(".json", "")}`] = { value: p.market, route: `product/${p.id ?? f.replace(".json", "")}` };
  }
  for (const f of list(dir, "people/founders")) {
    const p = read(dir, `people/founders/${f}`);
    if (p) out[`founder:${p.id ?? f.replace(".json", "")}`] = { value: { name: p.name, background: p.background ?? p.bio ?? null, values: p.values ?? null }, route: `people/founders/${p.id ?? f.replace(".json", "")}` };
  }
  return out;
}

/** Problems with the design system: a choice resting on an input that is gone, or no primary audience. */
export function check(dir) {
  const ds = read(dir, DESIGN_SYSTEM);
  if (!ds) return [];
  const have = inputs(dir);
  const known = (k) => k in have || k.startsWith("competitor:");
  const out = [];
  for (const k of ds.ethos?.from ?? []) if (!known(k)) out.push(`ethos rests on ${k}, which no record answers now`);
  for (const c of ds.choices ?? []) for (const k of c.from ?? []) if (!known(k)) out.push(`${c.area} choice "${c.choice}" rests on ${k}, which no record answers now: revisit it`);
  for (const a of ds.audiences ?? []) if (!(`icp:${a}` in have)) out.push(`audience ${a} is not an ICP profile`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, mode = "inputs"] = process.argv.slice(2);
  const json = process.argv.includes("--json");
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/engine/design-system.mjs <venture dir> inputs|check [--json]"); process.exit(2); }
  if (mode === "check") {
    const errs = check(dir);
    if (json) console.log(JSON.stringify({ ok: !errs.length, problems: errs }, null, 2));
    else for (const e of errs) console.error(`FAIL  ${e}`);
    process.exit(errs.length ? 1 : 0);
  }
  const x = inputs(dir);
  console.log(json ? JSON.stringify(x, null, 2) : Object.entries(x).map(([k, v]) => `${k.padEnd(28)} ${typeof v.value === "string" ? v.value : JSON.stringify(v.value)}`.slice(0, 160)).join("\n"));
}
