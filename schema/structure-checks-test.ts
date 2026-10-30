// The structure checks read a venture where its files sit: check-telos reads a migrated venture's
// canonical goals and exit criteria, a telos write after migration is refused, check-departments finds
// department folders inside k-base/, and the migration and venture-paths.mjs agree on what stays at the top.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { context } from "./upgrades.mjs";
import * as telosToGoals from "./migrations/telos-to-goals.mjs";
import * as structured from "./migrations/structured-layout.mjs";
import { physical } from "./venture-paths.mjs";
import { call } from "../interface/router.mjs";

const repo = new URL("..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "structure-checks-"));
let failed = 0;
const expect = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n      ${detail}`}`); if (!ok) failed++; };
const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const save = (f: string, x: unknown) => writeFileSync(f, JSON.stringify(x, null, 2) + "\n");
const run = (script: string, dir: string) => spawnSync("node", [join(repo, "schema", script), dir], { encoding: "utf8" });
const copy = (ws: string, venture: string) => { const d = join(tmp, ws, "ventures", venture); cpSync(join(repo, "schema/examples/workspace/ventures", venture), d, { recursive: true }); return d; };
const migrate = (dir: string, m: { apply: (dir: string, ctx: unknown) => void }) => m.apply(dir, context(dir, { dry: false, git: false, cfg: {}, at: new Date().toISOString(), onConfig() {} }));

const tel = copy("telos", "tandem");
migrate(tel, telosToGoals);
const migrated = run("check-telos.mjs", tel);
expect("check-telos checks a migrated venture's canonical records", migrated.status === 0 && /^1 ventures with a telos/m.test(migrated.stdout), migrated.stdout + migrated.stderr);
const ec = join(tel, "foundation/exit-criteria/validation.json");
save(ec, { ...load(ec), criteria: load(ec).criteria.map((c: { serves?: string[] }, i: number) => i ? c : { ...c, serves: ["no-such-measure"] }) });
const broken = run("check-telos.mjs", tel);
expect("check-telos fails a migrated exit criterion that serves no known measure", broken.status === 1 && /validation\/\S+ serves unknown measure no-such-measure/.test(broken.stderr), broken.stdout + broken.stderr);

const w = await call({ venture: "tandem", route: "foundation/telos", action: "write", actor: "person", input: load(join(tel, "_private/archive/telos.json")), workspace: join(tmp, "telos") });
expect("a telos write after migration is refused", !w.ok && /foundation\/exit-criteria/.test(w.error), JSON.stringify(w));
expect("the refused write leaves no second telos record", !existsSync(join(tel, "foundation/telos.json")) && !existsSync(join(tel, "purpose/telos.json")));

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

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
