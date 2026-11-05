#!/usr/bin/env node
// Tests for upgrades and the concepts built with them (the Next.js translation's U-1, U-2, U-3, U-5,
// U-6, M-12, E-7, V-9 and Z-4): naive upgrade and its migrations, pins, channels and early packages,
// version guides, a staged upgrade, updating the installed framework, triggers and their failures,
// stale summaries, and adapters. Everything runs in temporary folders; the repository is never written to.
// The agent-run upgrade and kits' automations are tested in platform/kits/test.mjs, the webhook in
// platform/webhooks/test.mjs.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries } from "../packages/core/provenance.mjs";
import { cmp, registry, snapshot, updateFramework } from "./upgrades.mjs";
import { rewriteRoute } from "./migrations/kit-to-package.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "upgrades-test-"));
const run = (script, args, env = {}) => spawnSync("node", [join(repo, script), ...args], { cwd: repo, encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: ws, ...env } });
const naive = (args, env) => run("interface/cli/naive.mjs", args, env);
const mentura = (args, env) => run("interface/cli/mentura.mjs", args, env);
const make = (id, extra = []) => { const d = join(ws, id); const r = run("schema/init-venture.mjs", [d, id, ...extra]); if (r.status !== 0) throw new Error(r.stderr); return d; };
const json = (f) => JSON.parse(readFileSync(f, "utf8"));
const put = (venture, route, rec, extra = []) => { const f = join(ws, `${venture}-${route.replace(/\//g, "-")}.json`); writeFileSync(f, JSON.stringify(rec)); return mentura([route, "write", "--venture", venture, "--input", f, "--as", "person", ...extra]); };
const reg = registry();

// U-1 and U-2: naive upgrade, the migrations, the pins.
const a = make("alpha");
const team = { venture: "alpha", roles: [{ id: "researcher", occupant: "agent", status: "planned", routes: { read: ["purpose/**"], write: ["purpose/validation/solution", "purpose/product/*"] } }] };
mkdirSync(join(a, "operations"), { recursive: true });
writeFileSync(join(a, "operations/team-plan.json"), JSON.stringify(team, null, 2));
mkdirSync(join(a, "knowledge"), { recursive: true });
writeFileSync(join(a, "knowledge/where-used.json"), JSON.stringify({ facts: [{ id: "price", parent: { route: "purpose/product/alpha-app", pointer: "/price" }, children: [{ source: "venture", path: "public/pricing.md", match: { kind: "text", template: "${value}/month" }, status: "live", deliver: "manual" }] }] }, null, 2));
writeFileSync(join(a, "naive.config.json"), JSON.stringify({ kits: ["validation", "agent-upgrade", "made-up"], gate: { fail_closed: [] } }, null, 2));
const before = snapshot(a);
const dry = naive(["upgrade", a, "--check"]);
expect("upgrade --check says what it would do and changes nothing", dry.status === 0 && /would upgrade alpha from Naive 0\.1\.0 to 0\.3\.0/.test(dry.stdout) && JSON.stringify(snapshot(a)) === JSON.stringify(before), dry.stdout + dry.stderr);
const up = naive(["upgrade", a]);
expect("naive upgrade moves the venture from 0.1.0 to the installed framework", up.status === 0 && /upgraded alpha from Naive 0\.1\.0 to 0\.3\.0/.test(up.stdout), up.stdout + up.stderr);
const cfg = json(join(a, "naive.config.json"));
expect("the framework and its channel are pinned in naive.config.json", cfg.naive?.version === reg.framework && cfg.naive.channel === "stable");
expect("every package the venture uses is pinned to its installed version", ["foundation", "validation", "product", "raw", "decisions"].every((p) => cfg.packages?.[p]?.version === reg.packages[p].version), JSON.stringify(cfg.packages));
expect("other config is kept (the gate)", Array.isArray(cfg.gate?.fail_closed));
expect("package-layout moved records into package folders", existsSync(join(a, "people/team-plan.json")) && existsSync(join(a, "marketing/brand.md")) && !existsSync(join(a, "pillars/brand.md")));
expect("what has no package home is archived and escalated, never guessed", existsSync(join(a, "_private/pillars/product.md")) && /escalate .*product pillar/.test(up.stdout));
expect("kit-to-package: a kit that is a Naive package moves to packages; a Mentura kit stays in kits; another name is escalated", cfg.kits?.join() === "agent-upgrade,made-up" && cfg.packages.validation && /made-up, which is neither/.test(up.stdout), JSON.stringify(cfg.kits) + up.stdout);
const exists = json(join(a, "products/decisions/product.exists.decision.json"));
expect("kit-to-package rewrites the routes a decision unlocks to package routes", exists.unlocks[0].routes[0] === "product/*", JSON.stringify(exists.unlocks));
const plan2 = json(join(a, "people/team-plan.json"));
expect("kit-to-package rewrites team-plan access to package routes", plan2.roles[0].routes.write.join() === "validation/solution,product/*", JSON.stringify(plan2.roles[0].routes));
expect("a route glob that spans several packages is escalated, not rewritten", plan2.roles[0].routes.read[0] === "purpose/**" && /purpose\/\*\* spans routes/.test(up.stdout));
expect("kit-to-package rewrites the where-used parent route", json(join(a, "knowledge/where-used.json")).facts[0].parent.route === "product/alpha-app");
const rel = json(join(a, `.release/upgrade-${reg.framework}.json`));
expect("the release record lists each migration, the packages pinned and the guides", rel.from === "0.1.0" && rel.migrations.map((m) => m.id).join() === "package-layout,kit-to-package,icp-profiles,telos-to-goals" && rel.guides.length === 2 && rel.packages.length > 5);
const log = entries(a);
expect("each move, rewrite and pin is a provenance line, and the chain holds", log.some((e) => e.activity === "move" && e.entity === "people/team-plan.json") && log.some((e) => e.activity === "write" && e.entity === "people/team-plan.json" && e.agent.id === "naive-upgrade") && log.some((e) => e.entity === "naive.config.json") && run("schema/check-provenance.mjs", [a]).status === 0);
const read = mentura(["purpose/validation/problem", "read", "--venture", "alpha"]);
expect("an old route still resolves through its alias, with a deprecation note", read.status === 0 && /purpose\/validation\/problem is now foundation\/problem/.test(read.stderr), read.stderr);
const again = naive(["upgrade", a]);
expect("a second upgrade has nothing to do", again.status === 0 && /nothing to upgrade/.test(again.stdout) && entries(a).length === log.length, again.stdout);
expect("rewriteRoute leaves routes no alias covers alone", rewriteRoute("governance/founder-agreement") === null && rewriteRoute("**") === null && rewriteRoute("purpose/icp").to === "foundation/icp");
expect("versions compare numerically", cmp("0.10.0", "0.9.1") > 0 && cmp("0.3.0", "0.3.0") === 0);

// U-1 in git: files move with git mv, so history follows them.
const g = make("gamma");
const git = (...x) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...x], { cwd: g, encoding: "utf8" });
git("init", "-q"); git("add", "-A"); git("commit", "-qm", "before");
naive(["upgrade", g]);
expect("in a git repository, moves are git renames", /^R\s+pillars\/brand\.md -> marketing\/brand\.md/m.test(git("status", "--porcelain")), git("status", "--porcelain"));

// U-2: a package migration, from a registry with a newer package version.
const testReg = structuredClone(reg);
const mig = join(ws, "rename-problem-field.mjs");
writeFileSync(mig, `import { existsSync, readFileSync } from "node:fs";\nimport { join } from "node:path";\nexport const describe = "test: renames customers to segment in the solution record";\nexport function apply(dir, ctx) {\n  const f = "validation/solution.json";\n  if (!existsSync(join(dir, f))) return;\n  const r = JSON.parse(readFileSync(join(dir, f), "utf8"));\n  if (!("customers" in r)) return;\n  r.segment = r.customers; delete r.customers;\n  ctx.write(f, JSON.stringify(r, null, 2) + "\\n", { note: "customers is segment now" });\n}\n`);
testReg.packages.validation.version = "0.4.0";
testReg.migrations.push({ id: "solution-segment", module: mig, package: "validation", from: "0.3.0", to: "0.4.0" });
writeFileSync(join(ws, "registry.json"), JSON.stringify(testReg, null, 2));
mkdirSync(join(a, "validation"), { recursive: true });
writeFileSync(join(a, "validation/solution.json"), JSON.stringify({ customers: "solo clinics" }, null, 2));
const pkgUp = naive(["upgrade", a], { NAIVE_UPGRADES: join(ws, "registry.json") });
const pinned = json(join(a, "naive.config.json")).packages.validation.version;
expect("a package migration runs when the venture's pin is older than the package", pkgUp.status === 0 && json(join(a, "validation/solution.json")).segment === "solo clinics" && pinned === "0.4.0", pkgUp.stdout + pkgUp.stderr);
const pkgAgain = naive(["upgrade", a], { NAIVE_UPGRADES: join(ws, "registry.json") });
expect("it runs once: the pin moved past it", /nothing to upgrade/.test(pkgAgain.stdout), pkgAgain.stdout);
const c = make("conflict");
mkdirSync(join(c, "foundation"), { recursive: true });
writeFileSync(join(c, "foundation/problem.json"), "{}\n");
mkdirSync(join(c, "purpose/validation"), { recursive: true });
writeFileSync(join(c, "purpose/validation/problem.json"), "{}\n");
const cBefore = snapshot(c);
const clash = naive(["upgrade", c]);
expect("a move onto a file that exists stops the upgrade before anything moves", clash.status === 1 && /already exists/.test(clash.stderr) && JSON.stringify(snapshot(c)) === JSON.stringify(cBefore), clash.stderr);

// U-6: a guide for each framework version, bundled with the installed copy.
expect("every version after the first has a guide that exists, with a by-hand section", reg.versions.slice(1).every((v) => v.guide && existsSync(join(repo, v.guide)) && /## By hand/.test(readFileSync(join(repo, v.guide), "utf8"))));
const b = make("beta");
const guides = naive(["upgrade", b, "--guide"]);
expect("--guide prints the guide of every version the upgrade crosses", guides.status === 0 && /Upgrading to Naive 0\.2\.0/.test(guides.stdout) && /Upgrading to Naive 0\.3\.0/.test(guides.stdout) && !/^---/m.test(guides.stdout));
const one = naive(["upgrade", b, "--guide", "0.3.0"]);
expect("--guide <version> prints one version's guide", /Upgrading to Naive 0\.3\.0/.test(one.stdout) && !/Upgrading to Naive 0\.2\.0/.test(one.stdout));
expect("--guide for a version Naive never had fails", naive(["upgrade", b, "--guide", "9.9.9"]).status === 1);

// U-5: channels and early packages.
const early0 = naive(["upgrade", b, "--adopt", "finance"]);
expect("adopting a package needs the venture on the installed framework first", early0.status === 1 && /upgrade it to/.test(early0.stderr));
naive(["upgrade", b]);
const fin = naive(["upgrade", b, "--adopt", "finance"]);
const pk = JSON.parse(run("schema/packages.mjs", [b, "--json"]).stdout);
expect("a later phase's package adopted early opens now in the venture package", fin.status === 0 && pk.core.find((p) => p.id === "finance")?.in === "now" && pk.core.find((p) => p.id === "finance").early === true && json(join(b, "naive.config.json")).packages.finance.early === true, fin.stdout + fin.stderr);
expect("a package that already fits the phase needs no adoption", /already fits this phase/.test(naive(["upgrade", b, "--adopt", "foundation"]).stdout));
const legal = naive(["upgrade", b, "--adopt", "legal"]);
expect("an experimental package needs the canary channel", legal.status === 1 && /experimental/.test(legal.stderr) && /--canary/.test(legal.stderr));
naive(["upgrade", b, "--canary"]);
const legal2 = naive(["upgrade", b, "--adopt", "legal"]);
const pk2 = JSON.parse(run("schema/packages.mjs", [b, "--json"]).stdout);
expect("on canary an experimental package Naive does not model can be adopted, and opens", legal2.status === 0 && pk2.core.some((p) => p.id === "legal" && p.in === "now") && !pk2.not_modeled.some((p) => p.id === "legal"));
expect("the stable channel is refused while an experimental package is adopted", naive(["upgrade", b, "--stable"]).status === 1);
naive(["upgrade", b, "--drop", "legal"]);
const stable = naive(["upgrade", b, "--stable"]);
expect("after dropping it, the venture goes back to stable and the package is held again", stable.status === 0 && !JSON.parse(run("schema/packages.mjs", [b, "--json"]).stdout).core.some((p) => p.id === "legal"));

// U-3, the framework part: a staged upgrade lands only when its checks pass and a person confirms.
const s = make("staged");
const sBefore = snapshot(s);
const st = naive(["upgrade", s, "--stage"]);
expect("--stage upgrades a copy and runs the checks; the venture is untouched", st.status === 0 && /: ready/.test(st.stdout) && JSON.stringify(snapshot(s)) === JSON.stringify(sBefore), st.stdout + st.stderr);
expect("accepting needs the typed confirmation", naive(["upgrade", s, "--accept", "--confirm", "yes"]).status === 1 && JSON.stringify(snapshot(s)) === JSON.stringify(sBefore));
const acc = naive(["upgrade", s, "--accept", "--confirm", "upgrade"]);
expect("a confirmed staged upgrade lands, and the chain holds", acc.status === 0 && json(join(s, "naive.config.json")).naive.version === reg.framework && run("schema/check-provenance.mjs", [s]).status === 0, acc.stdout + acc.stderr);
expect("--stage on a venture with nothing to upgrade is refused", naive(["upgrade", s, "--stage"]).status === 1);

// U-1: updating the installed framework is a fast-forward of its checkout.
const up1 = join(ws, "naive-upstream"), inst = join(ws, "naive-installed");
const gitIn = (d, ...x) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...x], { cwd: d, encoding: "utf8" });
mkdirSync(join(up1, "schema"), { recursive: true });
writeFileSync(join(up1, "schema/upgrades.json"), JSON.stringify({ ...reg, framework: "0.3.0" }));
gitIn(up1, "init", "-q"); gitIn(up1, "add", "-A"); gitIn(up1, "commit", "-qm", "0.3.0");
gitIn(ws, "clone", "-q", up1, inst);
writeFileSync(join(up1, "schema/upgrades.json"), JSON.stringify({ ...reg, framework: "0.4.0" }));
gitIn(up1, "commit", "-qam", "0.4.0");
const fw = updateFramework(inst);
expect("the installed framework updates by fast-forward and reports its new version", fw.ok && fw.from === "0.3.0" && fw.to === "0.4.0" && fw.commits === 1, JSON.stringify(fw));
expect("an up-to-date framework has nothing to pull", updateFramework(inst).commits === 0);
writeFileSync(join(inst, "schema/upgrades.json"), "{}");
expect("a framework checkout with local changes is left alone", !updateFramework(inst).ok);
expect("a framework that is not a git checkout says how to reinstall", /not a git checkout/.test(updateFramework(join(ws, "beta")).error ?? ""));

// M-12 and E-7: triggers, and failures raised for the founder.
const t = make("tick", ["--layers", "purpose"]);
naive(["upgrade", t]);
const tc = json(join(t, "naive.config.json"));
tc.triggers = [
  { id: "assess", on: { activity: "write", route: "foundation/problem" }, run: { route: "purpose/validation/assess", action: "run", input: { as_is: true } } },
  { id: "broken", on: { activity: "write", route: "foundation/icp/bakers" }, run: { route: "nowhere/at-all", action: "read" } },
  { id: "throws", on: { activity: "write", route: "foundation/icp/bakers" }, run: { action: "read" } },
];
writeFileSync(join(t, "naive.config.json"), JSON.stringify(tc, null, 2));
await new Promise((r) => setTimeout(r, 20));
put("tick", "foundation/problem", { venture: "tick", statement: "Bakeries throw away a fifth of their bread", segment: "Neighbourhood bakeries", evidence: [] });
let rep = JSON.parse(mentura(["triggers", "--venture", "tick", "--json"]).stdout);
expect("an event (a record written) starts its trigger's next step", rep.runs.some((r) => r.trigger === "assess" && r.outcome === "ran" && r.entity === "foundation/problem.json"), JSON.stringify(rep.runs));
expect("only events after the trigger was configured start it", !rep.runs.some((r) => r.activity === "move"));
put("tick", "foundation/icp/bakers", { venture: "tick", id: "bakers", who: "Bakery owners" });
rep = JSON.parse(mentura(["triggers", "--venture", "tick", "--json"]).stdout);
const broken = rep.runs.find((r) => r.trigger === "broken"), thrown = rep.runs.find((r) => r.trigger === "throws");
expect("a failed run is recorded with its error", broken?.outcome === "failed" && /no route nowhere/.test(broken.error), JSON.stringify(broken));
expect("a run that throws is recorded as uncaught, not lost", thrown?.outcome === "uncaught" && thrown.status === "raised", JSON.stringify(thrown));
const dfile = join(t, `decisions/${broken.decision}.decision.json`);
const dec = existsSync(dfile) ? json(dfile) : {};
expect("each failure is raised as an open decision for the founder, failing open", dec.status === "open" && dec.boundary === "fail-open" && dec.options.join() === "Retry,Skip this event,Turn the trigger off");
const held = JSON.parse(run("schema/decisions.mjs", [t, "--json"]).stdout).decisions.find((x) => x.id === broken.decision);
expect("the failure holds nothing else: it fails open and nothing waits on it", held?.boundary === "fail-open" && held.render === "now" && !JSON.parse(run("schema/decisions.mjs", [t, "--json"]).stdout).decisions.some((x) => x.held_by === broken.decision));
tc.triggers[1].run.route = "purpose/validation/assess"; tc.triggers[1].run.action = "run"; tc.triggers[1].run.input = { as_is: true };
writeFileSync(join(t, "naive.config.json"), JSON.stringify(tc, null, 2));
const retry = mentura(["decide", broken.decision, "--venture", "tick", "--by", "Founder", "--answer", "Retry", "--confirm", broken.decision]);
rep = JSON.parse(mentura(["triggers", "--venture", "tick", "--json"]).stdout);
const retried = json(join(t, ".naive/triggers.json")).runs.find((r) => r.retry_of === broken.n);
expect("deciding Retry reruns the failed step on the same event", retry.status === 0 && retried?.outcome === "ran" && retried.event === broken.event, JSON.stringify(retried));
expect("the settled failure says how it was settled", json(join(t, ".naive/triggers.json")).runs.find((r) => r.n === broken.n).status === "retried");
mentura(["decide", thrown.decision, "--venture", "tick", "--by", "Founder", "--answer", "Turn the trigger off", "--confirm", thrown.decision]);
expect("deciding to turn it off turns that trigger off", json(join(t, "naive.config.json")).triggers_off?.includes("throws"));
put("tick", "foundation/icp", { venture: "tick", profiles: [{ id: "bakers", who: "Bakery owners in towns" }] });
rep = JSON.parse(mentura(["triggers", "--venture", "tick", "--json"]).stdout);
expect("a trigger turned off no longer runs", rep.runs.filter((r) => r.trigger === "throws").length === 1 && rep.triggers.find((x) => x.id === "throws").enabled === false);
expect("no failure is left open", rep.open.length === 0, JSON.stringify(rep.open));
// A crash of the runner itself (here a kit manifest that is not JSON) is kept by the hook and raised next time.
const badKits = join(ws, "bad-kits");
mkdirSync(join(badKits, "oops"), { recursive: true });
writeFileSync(join(badKits, "oops/kit.json"), "not json");
const tc2 = json(join(t, "naive.config.json"));
writeFileSync(join(t, "naive.config.json"), JSON.stringify({ ...tc2, kits: ["oops"] }, null, 2));
put("tick", "foundation/problem", { venture: "tick", statement: "Bakeries throw away a fifth of their bread daily", segment: "Neighbourhood bakeries", evidence: [] }, []);
const crash = spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), "foundation/problem", "write", "--venture", "tick", "--input", join(ws, "tick-foundation-problem.json"), "--as", "person"], { cwd: repo, encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: ws, NAIVE_KITS: badKits } });
expect("the write itself lands even when the trigger runner crashes", crash.status === 0, crash.stderr);
expect("the crash is kept for the next run", existsSync(join(t, ".naive/trigger-errors.jsonl")) && /JSON/.test(readFileSync(join(t, ".naive/trigger-errors.jsonl"), "utf8")));
writeFileSync(join(t, "naive.config.json"), JSON.stringify(tc2, null, 2));
run("interface/orchestration/triggers.mjs", [t, "--fire"]);
rep = JSON.parse(mentura(["triggers", "--venture", "tick", "--json"]).stdout);
expect("the next run raises the crash as a decision", rep.open.some((o) => o.trigger === "runner" && /JSON/.test(o.error)), JSON.stringify(rep.open));
writeFileSync(join(t, ".naive/triggers.json"), "{ not json");
run("interface/orchestration/triggers.mjs", [t, "--fire"]);
rep = JSON.parse(mentura(["triggers", "--venture", "tick", "--json"]).stdout);
expect("an unreadable trigger state is kept aside and raised, not silently reset", rep.open.some((o) => /could not be read; it is kept at/.test(o.error)), JSON.stringify(rep.open));

// V-9: a system of record notifies, and the summaries that read it are stale until written again.
const v = make("vee", ["--layers", "purpose"]);
mkdirSync(join(ws, "crm/customers"), { recursive: true });
writeFileSync(join(ws, "crm/customers/acme.json"), "{}\n");
mkdirSync(join(v, "knowledge"), { recursive: true });
writeFileSync(join(v, "knowledge/sources.json"), JSON.stringify({ sources: [{ id: "crm", connector: "filesystem", root: join(ws, "crm"), writes: "none" }], records: {} }));
mentura(["decide", "product-exists", "--venture", "vee", "--by", "Founder", "--answer", "No: it is still an idea", "--confirm", "product-exists"]);
put("vee", "product/vee-app", { id: "vee-app", name: "Vee", description: "For Acme" }, ["--derived-from", "crm://customers/acme.json"]);
put("vee", "product/other", { id: "other", name: "Other", description: "Reads nothing from the CRM" });
writeFileSync(join(v, "knowledge/where-used.json"), JSON.stringify({ facts: [{ id: "acme-name", parent: { route: "customers/acme", pointer: "/name" }, children: [{ source: "venture", path: "public/customers.md", match: { kind: "text", template: "{value}" }, status: "live", deliver: "manual" }] }] }));
const fresh = mentura(["product/vee-app", "read", "--venture", "vee"]);
expect("before any notification, a read says nothing about staleness", fresh.status === 0 && !/"stale"/.test(fresh.stdout));
const n = mentura(["notify", "--venture", "vee", "--source", "crm", "--path", "customers/acme.json", "--json"]);
const nr = JSON.parse(n.stdout);
expect("a notification marks the summary derived from the changed item stale", nr.stale.includes("product/vee-app.json") && !nr.stale.includes("product/other.json"), n.stdout + n.stderr);
expect("and every where-used child of a fact mastered in the changed record", nr.stale.includes("public/customers.md"));
const sr = mentura(["product/vee-app", "read", "--venture", "vee"]);
expect("a read of a stale summary says it is stale, since when and why", /"stale"/.test(sr.stdout) && /"source": "crm"/.test(sr.stdout), sr.stdout);
expect("mentura stale lists what is stale", /stale\s+product\/vee-app\.json/.test(mentura(["stale", "--venture", "vee"]).stdout));
await new Promise((r) => setTimeout(r, 5));
put("vee", "product/vee-app", { id: "vee-app", name: "Vee", description: "For Acme, renamed" }, ["--derived-from", "crm://customers/acme.json"]);
expect("writing the summary again makes it fresh", !/"stale"/.test(mentura(["product/vee-app", "read", "--venture", "vee"]).stdout) && !JSON.parse(mentura(["stale", "--venture", "vee", "--json"]).stdout).some((x) => x.file === "product/vee-app.json"));
expect("a source the venture does not have is refused", mentura(["notify", "--venture", "vee", "--source", "ramp", "--path", "x.json"]).status === 1);
expect("a change nothing reads marks nothing", /nothing reads what changed/.test(mentura(["notify", "--venture", "vee", "--source", "crm", "--path", "customers/zed.json"]).stdout));

// Z-4: adapters, verified by the framework's tests.
const list = JSON.parse(mentura(["adapters", "--json"]).stdout);
expect("Mentura is listed as the platform adapter beside the harness adapters", list[0]?.name === "mentura" && list[0].kind === "platform" && ["claude-code", "codex", "cursor"].every((x) => list.some((l) => l.name === x && l.kind === "harness")));
const h = make("harnessed");
naive(["upgrade", h]);
const ad = mentura(["adapt", "claude-code", "--venture", "harnessed"]);
expect("mentura adapt writes Claude Code's entry file and copies the open packages' skills", ad.status === 0 && readFileSync(join(h, "CLAUDE.md"), "utf8") === "@AGENTS.md\n" && existsSync(join(h, ".claude/skills/problem-validation/SKILL.md")), ad.stdout + ad.stderr);
expect("adapting the platform adapter into a venture is refused", mentura(["adapt", "mentura", "--venture", "harnessed"]).status === 1);
for (const name of ["claude-code", "codex", "cursor"]) {
  const r = JSON.parse(mentura(["adapters", "verify", name, "--json"]).stdout)[0];
  expect(`the ${name} adapter is verified: it passes the framework's adapter tests`, r.verified, JSON.stringify(r.results.filter((x) => !x.passed)));
}
if (!process.env.NAIVE_SKIP_PLATFORM_VERIFY) {
  const m = mentura(["adapters", "verify", "mentura", "--json"]);
  const mr = JSON.parse(m.stdout)[0];
  expect("the Mentura adapter is verified: it passes the framework's tests it names (connector contract, webhooks, kits)", mr.verified && mr.results.length === 3, JSON.stringify(mr.results.filter((x) => !x.passed)));
}

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
