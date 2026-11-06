// The canonical core and frameworks for thinking (Torian, 2026-10-30): the telos-to-goals migration
// round-trips, the lifecycle reads canonical exit criteria and falls back to an unmigrated telos, the
// telos route still reads after migration, and check-frameworks catches a framework mapping off the core.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { context } from "../../engine/upgrades.mjs";
import * as mig from "../../engine/migrations/telos-to-goals.mjs";
import { lifecycle, meet } from "../../engine/lifecycle.mjs";
import { exitCriteria, scale } from "../../engine/canonical.mjs";
import { check } from "../../engine/check-frameworks.mjs";
import { telosView } from "../../../../../frameworks/telos/adapter.mjs";
import { call } from "../../router/router.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "canonical-"));
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const person = { kind: "person", via: "cli", id: "maya" };
const copy = (ws) => { const d = join(tmp, ws, "ventures", "tandem"); cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures/tandem"), d, { recursive: true }); return d; };
const migrate = (dir) => { const ctx = context(dir, { dry: false, git: false, cfg: {}, at: new Date().toISOString(), onConfig() {} }); mig.apply(dir, ctx); return ctx; };

// Fallback: an unmigrated venture's gate reads its telos.
const un = copy("unmigrated");
const l0 = lifecycle(un);
expect("unmigrated: the lifecycle falls back to the telos's exit criteria", l0.source === "telos" && l0.exit_criteria.map((c) => c.id).join() === "retention,time-saved", JSON.stringify(l0));
const tandemVenture = load(join(un, "venture.json"));
expect("unmigrated: scale falls back to venture.json's ambition", scale(un) === (tandemVenture.ambition ?? null));

// Migration: telos split into goals and exit criteria, old file archived, ambition a goal of kind scale.
const telosBefore = load(join(un, "purpose/telos.json"));
const dir = copy("migrated");
const v0 = load(join(dir, "venture.json"));
if (!v0.ambition) { v0.ambition = "aggressive-growth"; writeFileSync(join(dir, "venture.json"), JSON.stringify(v0, null, 2)); }
const ctx = migrate(dir);
expect("migration escalates nothing", ctx.escalated.length === 0, ctx.escalated.join("; "));
expect("migration writes the venture goal, the owner goal and the scale goal", ["telos", "owner-outcome", "scale"].every((g) => existsSync(join(dir, `foundation/goals/${g}.json`))));
expect("migration writes one exit-criteria record per telos phase", ["validation", "beachhead"].every((p) => load(join(dir, `foundation/exit-criteria/${p}.json`)).phase === p));
expect("the old telos is archived, never deleted", !existsSync(join(dir, "purpose/telos.json")) && existsSync(join(dir, "_private/archive/telos.json")));
expect("ambition leaves venture.json and becomes a goal of kind scale", load(join(dir, "venture.json")).ambition === undefined && load(join(dir, "foundation/goals/scale.json")).value === v0.ambition && scale(dir) === v0.ambition);
const view = telosView(dir);
const strip = (t) => JSON.stringify({ statement: t.statement, end_state: t.end_state, horizon: t.horizon, measures: t.measures, owner_outcome: t.owner_outcome, phases: t.phases });
expect("round trip: the telos view rendered from canonical records matches the telos it came from", strip(view) === strip(telosBefore), `${strip(view)}\n${strip(telosBefore)}`);
expect("a second run finds nothing left to migrate", (() => { const c = migrate(dir); return c.writes.length === 0 && c.escalated.length === 0; })());
const clash = copy("clash");
mkdirSync(join(clash, "foundation/goals"), { recursive: true });
writeFileSync(join(clash, "foundation/goals/telos.json"), "{}");
expect("a canonical record already there is escalated, never overwritten", migrate(clash).escalated.length === 1 && existsSync(join(clash, "purpose/telos.json")) && readFileSync(join(clash, "foundation/goals/telos.json"), "utf8") === "{}");

// The lifecycle reads canonical exit criteria.
const l1 = lifecycle(dir);
expect("migrated: the lifecycle reads foundation/exit-criteria", l1.source === "canonical" && l1.file === "foundation/exit-criteria/validation.json" && l1.exit_criteria.length === 2 && !l1.ready);
expect("migrated: a person meets a canonical criterion", meet(dir, "retention", { by: person, evidence: "cohort" }).ok && load(join(dir, "foundation/exit-criteria/validation.json")).criteria[0].met?.by === "maya");
meet(dir, "time-saved", { by: person });
expect("migrated: with every canonical criterion met the gate is ready", lifecycle(dir).ready);
expect("exitCriteria for a phase with none is empty, not the archived telos", exitCriteria(dir, "scale").criteria.length === 0);

// The telos route still reads, as a view.
const r = await call({ venture: "tandem", route: "foundation/telos", action: "read", workspace: join(tmp, "migrated") });
expect("the foundation/telos route reads after migration, rendered from canonical records", r.ok && r.result?.statement === telosBefore.statement && r.view?.framework === "telos", JSON.stringify(r).slice(0, 300));
const g = await call({ venture: "tandem", route: "foundation/goals/telos", action: "read", workspace: join(tmp, "migrated") });
expect("canonical goals are routes", g.ok && g.result?.kind === "venture", JSON.stringify(g).slice(0, 300));

// check-frameworks.
expect("check-frameworks passes on the repo", check(repo).errors.length === 0, check(repo).errors.join("\n"));
const bad = join(tmp, "repo");
mkdirSync(join(bad, "schema"), { recursive: true });
cpSync(join(repo, "frameworks"), join(bad, "frameworks"), { recursive: true });
for (const p of ["purpose/templates/telos-based-smart.md", "purpose/skills/telos/SKILL.md", "purpose/skills/ambition-tier/SKILL.md", "packages/naive/src/checks/check-telos.mjs"]) { mkdirSync(join(bad, p, ".."), { recursive: true }); cpSync(join(repo, p), join(bad, p)); }
const fw = load(join(bad, "frameworks/telos/framework.json"));
fw.maps_to.push({ framework_field: "statement", canonical_route: "foundation/telos", canonical_field: "statement" });
writeFileSync(join(bad, "frameworks/telos/framework.json"), JSON.stringify(fw));
expect("check-frameworks catches a maps_to onto a non-canonical route", check(bad).errors.some((e) => /foundation\/telos, which is not a canonical route/.test(e)), check(bad).errors.join("\n"));
writeFileSync(join(bad, "schema/core.mjs"), 'const a = v.ambition;\nconst t = "foundation/telos.json";\n');
expect("check-frameworks catches core code reading framework-only fields", check(bad).errors.filter((e) => e.startsWith("schema/core.mjs")).length === 2, check(bad).errors.join("\n"));

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
