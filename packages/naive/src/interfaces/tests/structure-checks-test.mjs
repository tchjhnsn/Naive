// The structure checks read a venture where its files sit: check-telos reads a migrated venture's
// canonical goals and exit criteria (no venture goal means no telos yet), a telos write after migration is refused, check-departments finds
// department folders inside k-base/, and the migration and venture-paths.mjs agree on what stays at the top.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { context } from "../../engine/upgrades.mjs";
import * as telosToGoals from "../../engine/migrations/telos-to-goals.mjs";
import * as structured from "../../engine/migrations/structured-layout.mjs";
import { physical } from "../../core/venture-paths.mjs";
import { call } from "../../router/router.mjs";
import { naiveScript } from "../../core/scripts.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "structure-checks-"));
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n      ${detail}`}`); if (!ok) failed++; };
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const save = (f, x) => writeFileSync(f, JSON.stringify(x, null, 2) + "\n");
const run = (script, dir) => spawnSync("node", [naiveScript(script), dir], { encoding: "utf8" });
const copy = (ws, venture) => { const d = join(tmp, ws, "ventures", venture); cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures", venture), d, { recursive: true }); return d; };
const migrate = (dir, m) => m.apply(dir, context(dir, { dry: false, git: false, cfg: {}, at: new Date().toISOString(), onConfig() {} }));

const tel = copy("telos", "tandem");
migrate(tel, telosToGoals);
const migrated = run("check-telos.mjs", tel);
expect("check-telos checks a migrated venture's canonical records", migrated.status === 0 && /^1 ventures with a telos/m.test(migrated.stdout), migrated.stdout + migrated.stderr);
const ec = join(tel, "foundation/exit-criteria/validation.json");
save(ec, { ...load(ec), criteria: load(ec).criteria.map((c, i) => i ? c : { ...c, serves: ["no-such-measure"] }) });
const broken = run("check-telos.mjs", tel);
expect("check-telos fails a migrated exit criterion that serves no known measure", broken.status === 1 && /validation\/\S+ serves unknown measure no-such-measure/.test(broken.stderr), broken.stdout + broken.stderr);

const w = await call({ venture: "tandem", route: "foundation/telos", action: "write", actor: "person", input: load(join(tel, "_private/archive/telos.json")), workspace: join(tmp, "telos") });
expect("a telos write after migration is refused", !w.ok && /foundation\/exit-criteria/.test(w.error), JSON.stringify(w));
expect("the refused write leaves no second telos record", !existsSync(join(tel, "foundation/telos.json")) && !existsSync(join(tel, "purpose/telos.json")));

// Canonical records with no venture goal are no telos yet: the lifecycle gate asks for exit criteria in Discovery.
const criteria = { phase: "discovery", criteria: [{ id: "problem-is-real", statement: "Ten people describe the problem unprompted", met: null }] };
const withCriteria = (ws, phase) => {
  const d = copy(ws, "tandem");
  rmSync(join(d, "purpose/telos.json"));
  save(join(d, "venture.json"), { ...load(join(d, "venture.json")), phase });
  mkdirSync(join(d, "foundation/exit-criteria"), { recursive: true });
  save(join(d, "foundation/exit-criteria/discovery.json"), criteria);
  return d;
};
const fresh = run("check-telos.mjs", withCriteria("fresh", "discovery"));
expect("a fresh discovery venture with exit criteria and no venture goal passes", fresh.status === 0 && /^0 ventures with a telos/m.test(fresh.stdout), fresh.stdout + fresh.stderr);
const past = run("check-telos.mjs", withCriteria("past", "validation"));
expect("past Discovery, exit criteria with no venture goal warn that the telos is missing", past.status === 0 && /past Discovery with no telos/.test(past.stderr), past.stdout + past.stderr);

const unmigrated = copy("unmigrated", "tandem");
mkdirSync(join(unmigrated, "foundation/exit-criteria"), { recursive: true });
save(join(unmigrated, "foundation/exit-criteria/discovery.json"), criteria);
const kept = run("check-telos.mjs", unmigrated);
expect("a valid unmigrated telos plus one canonical record still checks the telos", kept.status === 0 && /^1 ventures with a telos/m.test(kept.stdout), kept.stdout + kept.stderr);
const tf = join(unmigrated, "purpose/telos.json");
save(tf, { ...load(tf), measures: load(tf).measures.map((m) => ({ ...m, primary: false })) });
const keptBroken = run("check-telos.mjs", unmigrated);
expect("that unmigrated telos still fails its own rules", keptBroken.status === 1 && /purpose\/telos.json: exactly one measure is primary/.test(keptBroken.stderr), keptBroken.stdout + keptBroken.stderr);

const bare = withCriteria("bare", "discovery");
mkdirSync(join(bare, "foundation/goals"));
save(join(bare, "foundation/goals/telos.json"), { id: "telos", statement: "Every household keeps its own books", kind: "venture" });
const noMeasures = run("check-telos.mjs", bare);
expect("a venture goal with no measures warns", noMeasures.status === 0 && /the venture goal has no measures yet/.test(noMeasures.stderr), noMeasures.stdout + noMeasures.stderr);

// Ambition is the canonical scale goal, so venture.json's stale tier must not answer for it.
const amb = copy("ambition", "tandem");
migrate(amb, telosToGoals);
rmSync(join(amb, "governance/exit.json"), { force: true });
save(join(amb, "venture.json"), { ...load(join(amb, "venture.json")), ambition: "lifestyle" });
save(join(amb, "foundation/goals/scale.json"), { id: "scale", statement: "The venture means to grow fast", kind: "scale", value: "aggressive-growth" });
save(join(amb, "foundation/goals/owner-outcome.json"), { id: "owner-outcome", statement: "The owners intend to hold", kind: "owner", value: "hold" });
const ambition = run("check-telos.mjs", amb);
expect("ambition comes from canonical.scale, not venture.json", ambition.status === 0 && /aggressive growth usually means investors/.test(ambition.stderr), ambition.stdout + ambition.stderr);

const dep = copy("departments", "acme-labs");
mkdirSync(join(dep, ".vscode"));
writeFileSync(join(dep, ".vscode/settings.json"), "{}\n");
for (const f of ["pnpm-lock.yaml", "yarn.lock", "bun.lock"]) writeFileSync(join(dep, f), "\n");
migrate(dep, structured);
expect("the migration keeps lockfiles and .vscode/ at the top", ["pnpm-lock.yaml", "yarn.lock", "bun.lock", ".vscode/settings.json"].every((f) => existsSync(join(dep, f)) && !existsSync(join(dep, "k-base", f))));
expect("venture-paths resolves lockfiles and .vscode/ at the top, as the migration left them", ["pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb", ".vscode/settings.json"].every((f) => physical(dep, f) === f));
expect("department folders moved into k-base/", existsSync(join(dep, "k-base/operations/departments")) && !existsSync(join(dep, "operations")));
const ok = run("check-departments.mjs", dep);
expect("check-departments passes a structured venture", ok.status === 0 && /[1-9]\d* folder/.test(ok.stdout), ok.stdout + ok.stderr);
const vj = load(join(dep, "venture.json"));
save(join(dep, "venture.json"), { ...vj, departments: [...vj.departments, "risk-and-compliance"] });
const missing = run("check-departments.mjs", dep);
expect("check-departments still finds what is wrong in a structured venture", missing.status === 1 && /risk-and-compliance is listed but has no folder/.test(missing.stderr) && !/is not in venture.json departments/.test(missing.stderr), missing.stderr);

const before = readdirSync(dep).sort().join();
const add = (...args) => spawnSync("node", [join(repo, "packages/naive/src/engine/add-department.mjs"), dep, ...args], { encoding: "utf8" });
const added = add("supply-chain"), grouped = add("assets", "--group");
expect("add-department puts the folder in k-base/ on a structured venture and nothing at the top", added.status === 0 && existsSync(join(dep, "k-base/operations/departments/supply-chain/department.json")) && readdirSync(dep).sort().join() === before, added.stdout + added.stderr);
expect("add-department --group does the same", grouped.status === 0 && existsSync(join(dep, "k-base/operations/departments/support/assets/department.json")) && readdirSync(dep).sort().join() === before, grouped.stdout + grouped.stderr);

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
