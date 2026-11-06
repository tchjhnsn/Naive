#!/usr/bin/env node
// Tests for the gate group (EE-073): naive.config.json overrides (P-2), check settings (P-7),
// pinned package versions (U-4), the gate's rules over the router's path patterns (X-6), package
// rules imported into one gate per venture (X-5), writes sent to the function owner and drafts kept
// side by side (X-2), a gate that is fast and never calls a model, with access checked again at the
// record (X-4, F-5), and who is acting carried and re-checked on every action (M-18). Every venture
// lives in a temporary workspace; nothing is written into the repository.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.mjs";
import { handle } from "../mcp/server.mjs";
import { DEFAULTS, configFor, installed, packagesOf } from "../../engine/naive-config.mjs";
import { evaluate, matches, packageRules, patternRe, rulesFor } from "../../engine/gate.mjs";
import { inbox, variantsDecision } from "../../engine/gate-drafts.mjs";
import { decisions } from "../../engine/decisions.mjs";
import { entries } from "../../core/provenance.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "gate-test-"));
const env = /** @type {NodeJS.ProcessEnv} */ ({ ...process.env, MENTURA_WORKSPACE: ws });
delete env.MENTURA_ACTOR_ID;
delete process.env.MENTURA_ACTOR_ID;
const cli = (...a) => spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a], { encoding: "utf8", env });
const node = (script, ...a) => spawnSync("node", [join(repo, script), ...a], { encoding: "utf8", env });
const json = (o) => JSON.stringify(o, null, 2) + "\n";
const read = (f) => JSON.parse(readFileSync(f, "utf8"));

// A venture to work in.
const init = cli("init", join(ws, "ventures/gt"), "--id", "gt", "--layers", "purpose");
expect("a venture to test in", init.status === 0, init.stderr);
const dir = join(ws, "ventures/gt");
const cfgFile = join(dir, "naive.config.json");
const setConfig = (c) => writeFileSync(cfgFile, json(c));
const write = (route, input, extra = {}) => call({ venture: "gt", route, action: "write", input, workspace: ws, ...extra });
const solution = (statement) => ({ venture: "gt", statement, alternatives: ["a receptionist"], evidence: [] });
const product = (id, name) => ({ id, name, description: `${name}, for testing the gate` });
const validRecord = (file, schema) => spawnSync("python3", [join(repo, "packages/naive/src/records/validate.py"), "--schema", schema, "--file", file], { encoding: "utf8" });

// P-2: naive.config.json overrides the defaults.
{
  expect("P-2: without naive.config.json every default holds", JSON.stringify(configFor(dir)) === JSON.stringify(DEFAULTS));
  setConfig({ thresholds: { confidence: 0.4 }, gate: { fail_closed: ["validation"] } });
  const c = configFor(dir);
  expect("P-2: an override replaces one default and keeps the rest", c.thresholds.confidence === 0.4 && c.thresholds["idea-map"] === DEFAULTS.thresholds["idea-map"] && c.gate.packages === true && c.acting.unknown_roles === "allow");
  expect("P-2: check-config passes a valid config", node("packages/naive/src/checks/check-config.mjs", dir).status === 0);
  setConfig({ gate: { fail_closed: ["validaton"] }, colour: "blue" });
  const bad = node("packages/naive/src/checks/check-config.mjs", dir);
  expect("P-2: check-config fails a key the schema does not know and a route that matches nothing", bad.status === 1 && /colour/.test(bad.stdout) && /validaton: matches no route/.test(bad.stdout), bad.stdout);
  writeFileSync(cfgFile, "{ not json");
  const broken = await write("validation/solution", solution("broken config"));
  expect("P-2: a naive.config.json that is not JSON fails closed: an agent's write is held", broken.ok && broken.result.draft && /not valid JSON/.test(broken.result.note), JSON.stringify(broken));
  rmSync(join(dir, "_drafts"), { recursive: true, force: true }); mkdirSync(join(dir, "_drafts"));
  // Which System 1 questions run, and the threshold an answer must reach.
  rmSync(cfgFile);
  mkdirSync(join(dir, "purpose/ideas"), { recursive: true });
  writeFileSync(join(dir, "purpose/ideas/dump.md"), "- Physios lose an hour a day to the phone\n- We could sell booking to gyms later\n");
  const all = JSON.parse(node("purpose/frameworks/idea-map/ideamap.mjs", "request", dir).stdout);
  setConfig({ questions: { "idea-map": { off: ["exists", "rec.*"] } }, thresholds: { "idea-map": 0.5 } });
  const some = JSON.parse(node("purpose/frameworks/idea-map/ideamap.mjs", "request", dir).stdout);
  const keys = Object.keys(some.questions);
  expect("P-2: questions off leaves those System 1 questions out of the request", Object.keys(all.questions).some((k) => k.startsWith("exists:")) && keys.length && !keys.some((k) => k.startsWith("exists:") || k.startsWith("rec.")) && some.questions_off > 0);
  const answers = join(ws, "answers.json");
  writeFileSync(answers, json({ "dept.products:i-01": { noul: 0.6 }, "exists:i-01": { noul: 0.9 } }));
  const tags = JSON.parse(node("purpose/frameworks/idea-map/ideamap.mjs", "answers", dir, answers).stdout);
  expect("P-2: the idea-map threshold comes from naive.config.json, and answers to questions off are ignored", tags["i-01"].departments.includes("products") && !tags["i-01"].tentative && tags["i-01"].exists === false, JSON.stringify(tags));
  rmSync(cfgFile);
  const dflt = JSON.parse(node("purpose/frameworks/idea-map/ideamap.mjs", "answers", dir, answers).stdout);
  expect("P-2: without the override the default threshold (0.8) holds", dflt["i-01"].tentative === true && dflt["i-01"].exists === true, JSON.stringify(dflt));
}

// P-7: check settings live in naive.config.json.
{
  setConfig({ gate: { fail_closed: ["nowhere"] } });
  const failing = await call({ venture: "gt", route: "system/naive-config", action: "check", workspace: ws });
  expect("P-7: a route's check runs and fails as written", !failing.ok && failing.result[0].check === "packages/naive/src/checks/check-config.mjs" && failing.result[0].passed === false, JSON.stringify(failing.result));
  setConfig({ gate: { fail_closed: ["nowhere"] }, checks: { warn: ["packages/naive/src/checks/check-config.mjs"] } });
  const warned = await call({ venture: "gt", route: "system/naive-config", action: "check", workspace: ws });
  expect("P-7: checks.warn runs the check but does not fail the route", warned.ok && warned.result[0].passed === false && warned.result[0].warn_only === true);
  setConfig({ gate: { fail_closed: ["nowhere"] }, checks: { off: ["packages/naive/src/checks/check-config.mjs"] } });
  const off = await call({ venture: "gt", route: "system/naive-config", action: "check", workspace: ws });
  expect("P-7: checks.off does not run the check and says so", off.ok && off.result[0].off === true && off.result[0].passed === null);
  setConfig({ checks: { off: ["schema/check-nothing.mjs"] } });
  expect("P-7: check-config refuses a check that does not exist", /check-nothing.mjs does not exist/.test(node("packages/naive/src/checks/check-config.mjs", dir).stdout));
  rmSync(cfgFile);
}

// U-4: package versions are pinned in naive.config.json.
{
  const have = installed();
  const catalog = read(join(repo, "library/packages/catalog.json")).version;
  expect("U-4: a package without its own version is versioned with the catalog", have.validation === catalog && have.money === catalog);
  setConfig({ packages: { validation: "0.0.1" } });
  const fails = node("packages/naive/src/checks/check-config.mjs", dir);
  expect("U-4: check-config fails a pin that differs from what is installed", fails.status === 1 && /validation is pinned to 0.0.1/.test(fails.stdout));
  const agent = await write("validation/solution", solution("pinned"));
  const person = await write("validation/solution", solution("pinned"), { actor: "person" });
  expect("U-4: a write to a package pinned to another version is refused, for agents and people", !agent.ok && agent.gate_rule === "pinned-version" && !person.ok && /pinned to 0.0.1 but/.test(person.error), JSON.stringify(person));
  expect("U-4: a write to a package not pinned is not affected", (await write("product/kettle", product("kettle", "Kettle"), { actor: "person" })).ok);
  const pin = node("packages/naive/src/checks/check-config.mjs", dir, "--pin");
  expect("U-4: --pin re-pins the pinned packages at their installed versions and logs it", pin.status === 0 && read(cfgFile).packages.validation === catalog && entries(dir).some((e) => e.entity === "naive.config.json" && /pinned validation/.test(e.note)), pin.stderr);
  expect("U-4: after re-pinning the write goes through", (await write("validation/solution", solution("pinned"), { actor: "person" })).ok);
  setConfig({ packages: { nonesuch: "1.0.0" } });
  expect("U-4: pinning a package that is not installed fails the check", /nonesuch is not an installed package/.test(node("packages/naive/src/checks/check-config.mjs", dir).stdout));
  expect("U-4: --pin of an unknown package fails", node("packages/naive/src/checks/check-config.mjs", dir, "--pin", "nonesuch").status === 1);
  rmSync(cfgFile);
}

// X-6: a rule declares the routes it covers with the router's own path patterns.
{
  expect("X-6: [id] and * are one segment", matches("product/[id]", "product/kettle", "product/[id]") && matches("product/*", "product/kettle") && !matches("product/[id]", "product/kettle/x"));
  expect("X-6: a trailing /** covers the route and everything under it; ** in the middle any depth", patternRe("validation/**").test("validation") && patternRe("validation/**").test("validation/pricing") && patternRe("a/**/b").test("a/x/y/b") && patternRe("**/pricing").test("validation/pricing"));
  expect("X-6: a plain route covers itself only", matches("validation/pricing", "validation/pricing") && !matches("validation/pricing", "validation/solution") && !matches("validation", "validation/solution"));
  setConfig({ gate: { rules: [{ id: "products-held", routes: ["product/[id]"], then: "draft" }] } });
  const held = await write("product/toaster", product("toaster", "Toaster"));
  const other = await write("validation/solution", solution("not covered"));
  expect("X-6: a rule over product/[id] holds an agent's write to product/toaster, and nothing else", held.ok && held.result.draft && held.result.gate_rule === "products-held" && other.ok && !other.result.draft, JSON.stringify([held, other]));
  expect("X-6: a person's write is never held by a draft rule", !(await write("product/toaster", product("toaster", "Toaster"), { actor: "person" })).result.draft);
  rmSync(join(dir, "_drafts"), { recursive: true, force: true }); mkdirSync(join(dir, "_drafts"));
  rmSync(cfgFile);
}

// X-5: one gate per venture, with each package's rules imported from its package definition.
{
  const ids = packageRules(DEFAULTS).map((r) => `${r.package}:${r.id}`);
  expect("X-5: the gate imports gate_rules from the package definitions", ids.includes("money:money-to-finance") && ids.includes("validation:validation-low-confidence"), ids.join(", "));
  expect("X-5: naive.config.json can leave one package's rules out, or all of them", !packageRules({ gate: { packages: { money: false } } }).some((r) => r.package === "money") && packageRules({ gate: { packages: false } }).length === 0);
  const order = rulesFor({ gate: { fail_closed: ["validation"], rules: [{ id: "x", routes: ["product"], then: "draft" }] } }).map((r) => r.source);
  expect("X-5: one rule list per venture: fail_closed, then the config's rules, then the packages'", order[0] === "naive.config.json" && order[1] === "naive.config.json" && order.slice(2).every((s) => s.startsWith("package ")));
  const money = await write("money/checking", { id: "checking", name: "Checking" });
  expect("X-5: the money package's rule sends an agent's money record to its owner", money.ok && money.result.draft && money.result.gate_rule === "money-to-finance" && money.result.owner === "founder", JSON.stringify(money));
  setConfig({ gate: { packages: { money: false } } });
  expect("X-5: with the package left out, the same write is not held", !(await write("money/savings", { id: "savings", name: "Savings" })).result.draft);
  rmSync(cfgFile);
  rmSync(join(dir, "_drafts"), { recursive: true, force: true }); mkdirSync(join(dir, "_drafts"));
}

// X-2: route an agent's write to its function owner; an A/B rewrite is two drafts of one decision.
{
  const plan = join(dir, "people/team-plan.json");
  mkdirSync(join(dir, "people"), { recursive: true });
  writeFileSync(plan, json({ venture: "gt", updated: "2026-10-29", roles: [
    { id: "founder", name: "Founder", occupant: "person", needed_by: "discovery", status: "filled" },
    { id: "product-lead", name: "Product lead", occupant: "person", needed_by: "discovery", status: "filled" },
    { id: "builder", name: "Builder", occupant: "agent", needed_by: "discovery", status: "filled" }] }));
  setConfig({ owners: { products: "product-lead" }, gate: { rules: [{ id: "products-to-owner", routes: ["product/[id]"], then: "owner", variants: true }] } });
  expect("X-2: check-config accepts owners that are roles in the team plan", node("packages/naive/src/checks/check-config.mjs", dir).status === 0, node("packages/naive/src/checks/check-config.mjs", dir).stdout);
  const a = await write("product/lamp", product("lamp", "Lamp"), { actor_id: "builder" });
  expect("X-2: an agent's write goes to the function owner from naive.config.json owners", a.ok && a.result.draft && a.result.owner === "product-lead" && /function owner, product-lead/.test(a.result.note), JSON.stringify(a));
  const box = inbox(dir, "product-lead");
  expect("X-2: the owner's inbox lists the draft, its rule and its route", box.length === 1 && box[0].route === "product/lamp" && box[0].rule === "products-to-owner");
  const cliBox = node("packages/naive/src/engine/gate-drafts.mjs", dir, "--owner", "product-lead", "--json");
  expect("X-2: node packages/naive/src/engine/gate-drafts.mjs lists the drafts waiting for an owner", cliBox.status === 0 && JSON.parse(cliBox.stdout)[0].owner === "product-lead");
  const b = await write("product/lamp", product("lamp", "Desk lamp"), { actor_id: "builder" });
  expect("X-2: a differing second draft is kept beside the first, not over it", b.ok && b.result.variant === "b" && b.result.written.endsWith(".draft.b") && read(join(dir, "_drafts/product__lamp.json.draft")).name === "Lamp", JSON.stringify(b));
  const again = await write("product/lamp", product("lamp", "Desk lamp"), { actor_id: "builder" });
  expect("X-2: a draft equal to one already held is that draft", again.result.variant === "b" && again.result.variants.length === 2);
  const dec = variantsDecision("product/lamp.json");
  expect("X-2: one open decision asks the founder which draft to accept, and matches its schema", existsSync(join(dir, dec.path)) && validRecord(join(dir, dec.path), "decision-record.schema.json").status === 0 && read(join(dir, dec.path)).options.length === 2);
  const live = decisions(dir).decisions.find((d) => d.id === dec.id);
  expect("X-2: the decision is in the venture's decision matrix", live && live.status === "open", JSON.stringify(live));
  const noPick = cli("accept", "product/lamp", "--venture", "gt");
  expect("X-2: accepting without picking a draft is refused", noPick.status === 1 && /--pick/.test(noPick.stderr), noPick.stderr);
  const picked = cli("accept", "product/lamp", "--venture", "gt", "--pick", "b", "--by", "Torian", "--confirm", "product/lamp");
  const now = read(join(dir, "product/lamp.json"));
  expect("X-2: accepting draft b writes it as the record and decides the decision", picked.status === 0 && now.name === "Desk lamp" && read(join(dir, dec.path)).status === "decided" && read(join(dir, dec.path)).answer === "b" && read(join(dir, dec.path)).provenance.approved_by === "Torian", picked.stdout + picked.stderr);
  expect("X-2: accepting removes every variant and the sidecar", !readdirSync(join(dir, "_drafts")).length, readdirSync(join(dir, "_drafts")).join(", "));
  const single = await write("product/lamp", product("lamp", "Floor lamp"), { actor_id: "builder" });
  const acc = cli("accept", "product/lamp", "--venture", "gt", "--confirm", "product/lamp");
  expect("X-2: a single held draft is accepted as before", single.result.draft && acc.status === 0 && read(join(dir, "product/lamp.json")).name === "Floor lamp", acc.stderr);
  rmSync(plan); rmSync(cfgFile);
}

// X-4: the gate is fast and never calls a model; confidence routing reads a score already computed.
{
  for (const f of ["packages/naive/src/engine/gate.mjs", "packages/naive/src/engine/access.mjs", "packages/naive/src/engine/naive-config.mjs"]) {
    const src = readFileSync(join(repo, f), "utf8");
    expect(`X-4: ${f} has no network, process or model call`, !/\bfetch\s*\(|https?:\/\/|child_process|node:http|node:https|node:net|use-model|spawn/.test(src));
  }
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("the gate called the network"); };
  const config = configFor(dir);
  const t0 = performance.now();
  let v;
  for (let i = 0; i < 2000; i++) v = evaluate({ config, dir, route: "validation/pricing", table: "validation/pricing", record: "validation-pricing", actor: "agent", confidence: 0.2 });
  const ms = performance.now() - t0;
  globalThis.fetch = realFetch;
  expect("X-4: 2000 gate decisions take well under a second, with the network unavailable", ms < 1000 && v.then === "owner", `${ms.toFixed(0)} ms`);
  const noScore = await write("validation/solution", solution("no score"));
  const low = await write("validation/solution", solution("low score"), { provenance: { confidence: 0.4 } });
  const high = await write("validation/solution", solution("high score"), { provenance: { confidence: 0.9 } });
  expect("X-4: a write with no score is never held for confidence", noScore.ok && !noScore.result.draft);
  expect("X-4: a score below the threshold sends the write to its function owner", low.ok && low.result.draft && low.result.gate_rule === "validation-low-confidence" && low.result.owner === "founder", JSON.stringify(low));
  expect("X-4: a score at or above the threshold passes", high.ok && !high.result.draft);
  setConfig({ thresholds: { confidence: 0.3 } });
  expect("X-4: the threshold is an override in naive.config.json", !(await write("validation/solution", solution("low score"), { provenance: { confidence: 0.4 } })).result.draft);
  rmSync(cfgFile);
  rmSync(join(dir, "_drafts"), { recursive: true, force: true }); mkdirSync(join(dir, "_drafts"));
  const tmpIn = join(ws, "solution.json"); writeFileSync(tmpIn, json(solution("from the CLI")));
  const c = cli("validation/solution", "write", "--venture", "gt", "--input", tmpIn, "--confidence", "0.1");
  expect("X-4: the CLI carries --confidence to the gate", c.status === 0 && /validation-low-confidence/.test(c.stdout), c.stdout + c.stderr);
  rmSync(join(dir, "_drafts"), { recursive: true, force: true }); mkdirSync(join(dir, "_drafts"));
}

// F-5 and X-4: access is checked at the gate and again at the record, on every read.
{
  const plan = join(dir, "people/team-plan.json");
  mkdirSync(join(dir, "people"), { recursive: true });
  writeFileSync(plan, json({ venture: "gt", updated: "2026-10-29", roles: [
    { id: "founder", name: "Founder", occupant: "person", needed_by: "discovery", status: "filled" },
    { id: "scout", name: "Scout", occupant: "agent", needed_by: "discovery", status: "filled", routes: { read: ["product/kettle"], write: [] } }] }));
  const gateSays = evaluate({ config: configFor(dir), dir, route: "product/kettle", table: "product/[id]", record: "product", actor: "agent", role: "scout" });
  expect("X-4: the gate itself refuses a write the role may not make", gateSays.then === "refuse" && gateSays.rule === "access");
  const list = await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor_id: "scout" });
  expect("F-5: a list read returns only the items the role may read", list.ok && Object.keys(list.result).join(",") === "kettle", JSON.stringify(list.result && Object.keys(list.result)));
  const full = await call({ venture: "gt", route: "product", action: "read", workspace: ws });
  expect("F-5: without a role the list is whole", Object.keys(full.result).length >= 3, Object.keys(full.result).join(","));
  const item = await call({ venture: "gt", route: "product/lamp", action: "read", workspace: ws, actor_id: "scout" });
  expect("F-5: reading an item outside the role's routes is refused", !item.ok && / may not read /.test(item.error));
  const w = await write("product/kettle", product("kettle", "Kettle"), { actor_id: "scout" });
  expect("F-5: writing outside the role's routes is refused at the record", !w.ok && / may not write /.test(w.error));
  const one = await call({ venture: "gt", route: "product/kettle", action: "read", workspace: ws, actor_id: "scout" });
  expect("F-5: a read says where it came from and carries no credential", one.ok && Object.keys(one.source).every((k) => ["source", "address", "version", "commit", "permalink", "attributes"].includes(k)));
  process.env.MENTURA_WORKSPACE = ws;
  const mcp2 = await handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "mentura_read", arguments: { venture: "gt", route: "product", agent_id: "scout" } } });
  delete process.env.MENTURA_WORKSPACE;
  const body = JSON.stringify(mcp2?.result ?? mcp2);
  expect("F-5: the MCP server's read carries the agent's role, so the list is filtered there too", /kettle/.test(body) && !/toaster/.test(body), body.slice(0, 300));
  rmSync(plan);
}

// M-18: who is acting, and in which role, is carried with every action and re-checked when it changes.
{
  const plan = join(dir, "people/team-plan.json");
  const roles = (scoutWrite) => [
    { id: "founder", name: "Founder", occupant: "person", needed_by: "discovery", status: "filled" },
    { id: "scout", name: "Scout", occupant: "agent", needed_by: "discovery", status: "filled", routes: { read: ["**"], write: scoutWrite } }];
  writeFileSync(plan, json({ venture: "gt", updated: "2026-10-29", roles: roles(["product/*"]) }));
  const r = await call({ venture: "gt", route: "product/kettle", action: "read", workspace: ws, actor_id: "scout" });
  expect("M-18: every answer carries who is acting and in which role", r.ok && r.acting.kind === "agent" && r.acting.role === "scout");
  const imp = await write("product/kettle", product("kettle", "Kettle"), { actor_id: "founder" });
  expect("M-18: an agent may not act in a role a person holds", !imp.ok && /person's role/.test(imp.error) && imp.acting.role === "founder");
  const odd = await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor: "robot" });
  expect("M-18: the actor is a person or an agent", !odd.ok && /person or an agent/.test(odd.error));
  expect("M-18: a role the team plan does not list may act by default", (await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor_id: "visitor" })).ok);
  setConfig({ acting: { unknown_roles: "refuse" } });
  const refused = await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor_id: "visitor" });
  expect("M-18: naive.config.json can refuse role ids the team plan does not list", !refused.ok && /not a role in the team plan/.test(refused.error));
  rmSync(cfgFile);
  const via = "gate-test";
  const first = await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor_id: "scout", via });
  const same = await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor_id: "scout", via });
  const asPerson = await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor: "person", via });
  expect("M-18: the same identity twice is not a change", !first.acting_changed && !same.acting_changed);
  expect("M-18: a change of who is acting is re-checked and answered with the new reach", asPerson.acting_changed?.from.role === "scout" && asPerson.acting_changed.to.kind === "person" && asPerson.acting_changed.may.write[0] === "**", JSON.stringify(asPerson.acting_changed));
  await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor_id: "scout", via });
  writeFileSync(plan, json({ venture: "gt", updated: "2026-10-29", roles: roles([]) }));
  const narrowed = await call({ venture: "gt", route: "product", action: "read", workspace: ws, actor_id: "scout", via });
  expect("M-18: a change to the role's entry in the team plan counts as a change", narrowed.acting_changed && narrowed.acting_changed.may.write.length === 0, JSON.stringify(narrowed.acting_changed));
  const blocked = await write("product/kettle", product("kettle", "Kettle"), { actor_id: "scout", via });
  expect("M-18: the narrowed role is checked on the next write", !blocked.ok && / may not write /.test(blocked.error));
  const view = await call({ venture: "gt", route: "product/kettle", action: "view", workspace: ws, actor_id: "scout" });
  expect("M-18: actions a route makes inside another (a view's read) are checked too", view.ok && view.acting.role === "scout");
  const prov = entries(dir).filter((e) => e.activity === "draft" && e.agent?.id === "builder");
  expect("M-18: the provenance log names the role an agent acted in", prov.length > 0);
  rmSync(plan);
}

rmSync(ws, { recursive: true, force: true });
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
