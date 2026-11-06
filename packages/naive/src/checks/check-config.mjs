#!/usr/bin/env node
// Checks a venture's naive.config.json (P-2) and explains its gate. Rules: the file matches
// packages/naive/src/records/naive-config.schema.json; rule ids are unique; every route pattern in fail_closed and the
// rules matches at least one route in the router's table (X-6); every check named in checks exists;
// every package pinned is installed at that version (U-4); every owner is a role in the team plan
// when the venture has one; every question setting names a framework that asks System 1 questions.
//
//   node packages/naive/src/checks/check-config.mjs <venture dir> [--json]        check; exit 1 on a problem
//   node packages/naive/src/checks/check-config.mjs <venture dir> --resolved      the config with the defaults filled in
//   node packages/naive/src/checks/check-config.mjs <venture dir> --rules         every rule the gate applies, and where it comes from
//   node packages/naive/src/checks/check-config.mjs <venture dir> --explain <route> [--as person] [--role <id>] [--confidence <n>]
//                                                              what the gate would do with a write, without writing
//   node packages/naive/src/checks/check-config.mjs <venture dir> --pin [<package,...>]
//                                                              pin packages at their installed versions: the ones
//                                                              named, else the ones already pinned, else every one

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve as resolvePath } from "node:path";
import { CONFIG, configFor, installed, pinProblems, rawConfig } from "../engine/naive-config.mjs";
import { evaluate, patternRe, rulesFor } from "../engine/gate.mjs";
import { teamPlan } from "../engine/access.mjs";
import { gateOf, repo, resolve, routes } from "../records/routes/routes.mjs";
import { agentFromEnv, record } from "../core/provenance.mjs";
import { ventureFile } from "../core/venture-paths.mjs";

const FRAMEWORKS = ["idea-map"];

/** Problems with a venture's naive.config.json: { errors, warnings }. */
export function check(dir) {
  const errors = [], warnings = [];
  const f = ventureFile(dir, CONFIG);
  if (!existsSync(f)) return { errors, warnings, note: `no ${CONFIG}: every default applies` };
  let raw;
  try { raw = rawConfig(dir); } catch (e) { return { errors: [e.message], warnings }; }
  const scratch = mkdtempSync(join(tmpdir(), "naive-config-"));
  writeFileSync(join(scratch, CONFIG), JSON.stringify(raw));
  const v = spawnSync("python3", [join(repo, "packages/naive/src/records/validate.py"), "--schema", "naive-config.schema.json", "--file", join(scratch, CONFIG)], { encoding: "utf8" });
  rmSync(scratch, { recursive: true, force: true });
  if (v.status !== 0) errors.push(`${CONFIG} does not match packages/naive/src/records/naive-config.schema.json:\n${(v.stdout + v.stderr).trim()}`);
  const config = configFor(dir);
  const table = routes();
  const known = (p) => !!resolve(p).r || table.some((r) => patternRe(p).test(r.route) || patternRe(p).test(r.route.replace(/\[id\]/g, "x")));
  const ids = new Set();
  for (const r of rulesFor(config).filter((x) => x.source === "naive.config.json" && !x.fail_closed)) {
    if (ids.has(r.id)) errors.push(`gate rule ${r.id}: duplicate id`);
    ids.add(r.id);
  }
  for (const p of config.gate.fail_closed ?? []) if (!known(p) && !known(`${p}/**`)) errors.push(`gate.fail_closed ${p}: matches no route (see node packages/naive/src/router/router.mjs --md)`);
  for (const r of config.gate.rules ?? []) for (const p of r.routes ?? []) if (!known(p)) errors.push(`gate rule ${r.id}: ${p} matches no route`);
  for (const c of [...(config.checks.off ?? []), ...(config.checks.warn ?? [])]) if (!existsSync(join(repo, c))) errors.push(`checks: ${c} does not exist`);
  for (const p of pinProblems(config)) errors.push(p.installed ? `packages: ${p.package} is pinned to ${p.pinned} but ${p.installed} is installed` : `packages: ${p.package} is not an installed package`);
  const plan = teamPlan(dir);
  for (const [fn, role] of Object.entries(config.owners ?? {})) {
    if (plan && !(plan.roles ?? []).some((r) => r.id === role)) errors.push(`owners: ${fn} names ${role}, which is not a role in the team plan`);
    if (!plan) warnings.push(`owners: ${fn} names ${role}, and there is no team plan to check it against`);
  }
  for (const fw of Object.keys(config.questions ?? {})) if (!FRAMEWORKS.includes(fw)) errors.push(`questions: ${fw} asks no System 1 questions (one of ${FRAMEWORKS.join(", ")})`);
  return { errors, warnings };
}

/** What the gate would do with a write to a route, without writing. @param {string} dir @param {string} route @param {{ actor?: string, role?: string, confidence?: number }} [opts] */
export function explain(dir, route, { actor = "agent", role, confidence } = {}) {
  const { r, params } = resolve(route);
  if (!r || r.kind !== "record" || !r.actions.includes("write")) throw new Error(`${route} is not a writable record route`);
  const concrete = r.collection === "item" ? r.route.replace("[id]", params.id) : r.route;
  const cls = gateOf(r, dir);
  const files = (r.collection === "item" ? r.files.map((x) => x.replace("*", params.id)) : r.files);
  const exists = files.some((x) => existsSync(ventureFile(dir, x)));
  const verdict = evaluate(/** @type {Parameters<typeof evaluate>[0]} */ ({ config: configFor(dir), dir, route: concrete, table: r.route, record: r.record, actor, role, confidence, exists, decisionOwner: cls?.owner ?? undefined }));
  return { route: concrete, record: r.record, actor, role: role ?? null, confidence: confidence ?? null, decision_class: cls ? { class: cls.class, level: cls.level, drafts: cls.drafts && actor !== "person" } : null, gate: verdict };
}

/** Pins packages at their installed versions and logs the change. Returns the new pins. */
export function pin(dir, names) {
  const raw = rawConfig(dir), have = installed();
  const chosen = names?.length ? names : Object.keys(raw.packages ?? {}).length ? Object.keys(raw.packages) : Object.keys(have);
  const unknown = chosen.filter((n) => !have[n]);
  if (unknown.length) throw new Error(`not installed: ${unknown.join(", ")}`);
  raw.packages = { ...(raw.packages ?? {}), ...Object.fromEntries(chosen.map((n) => [n, have[n]])) };
  writeFileSync(ventureFile(dir, CONFIG), JSON.stringify(raw, null, 2) + "\n");
  record(dir, /** @type {Parameters<typeof record>[1]} */ ({ entity: CONFIG, route: "system/naive-config", activity: "write", agent: agentFromEnv("person", "cli"), note: `pinned ${chosen.join(", ")} at the installed versions` }));
  return raw.packages;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : undefined; };
  const dir = argv[0] && resolvePath(argv[0]);
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/checks/check-config.mjs <venture dir> [--json | --resolved | --rules | --explain <route> | --pin [<packages>]]"); process.exit(2); }
  const out = (x) => console.log(JSON.stringify(x, null, 2));
  try {
    if (argv.includes("--resolved")) { out(configFor(dir)); process.exit(0); }
    if (argv.includes("--rules")) { out(rulesFor(configFor(dir)).map((r) => ({ id: r.id, source: r.source, routes: r.routes, then: r.then, ...(r.when ? { when: r.when } : {}), actors: r.actors ?? ["agent"] }))); process.exit(0); }
    if (argv.includes("--explain")) {
      const c = opt("confidence");
      out(explain(dir, opt("explain"), { actor: opt("as") === "person" ? "person" : "agent", role: opt("role") ?? process.env.MENTURA_ACTOR_ID, confidence: c === undefined ? undefined : Number(c) }));
      process.exit(0);
    }
    if (argv.includes("--pin")) { out({ pinned: pin(dir, opt("pin")?.split(",").filter(Boolean)) }); process.exit(0); }
  } catch (e) { console.error(String(e.message ?? e)); process.exit(1); }
  const r = check(dir);
  if (argv.includes("--json")) out(r);
  else {
    for (const w of r.warnings) console.log(`warn  ${w}`);
    for (const e of r.errors) console.log(`FAIL  ${e}`);
    if (!r.errors.length) console.log(r.note ?? `${CONFIG} is valid`);
  }
  process.exit(r.errors.length ? 1 : 0);
}
