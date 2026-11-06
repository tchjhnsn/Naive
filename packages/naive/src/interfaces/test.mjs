// Tests for the router and the three interfaces over it (EE-030): the CLI, the MCP server and the
// HTTP API. They run on a copy of the example workspace in a temp folder.
//
//   node packages/naive/src/interfaces/test.mjs

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { call, capture, groups, judge, routes } from "../router/router.mjs";
import { handle, TOOLS } from "./mcp/server.mjs";
import { route as http } from "./api/server.mjs";
import { entries } from "../core/provenance.mjs";

const root = new URL("../../../..", import.meta.url).pathname;
const ws = join(mkdtempSync(join(tmpdir(), "mentura-test-")), "workspace");
cpSync(join(root, "packages/naive/src/records/examples/workspace"), ws, { recursive: true });
process.env.MENTURA_WORKSPACE = ws;
const tandem = join(ws, "ventures/tandem");
let failed = 0;
const expect = (name, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };
const own = JSON.parse(readFileSync(join(tandem, "governance/ownership.json"), "utf8"));

// Router.
const table = routes();
const problem = table.find((r) => r.route === "foundation/problem");
expect("a kit record gets a nested route with all four actions", problem && ["read", "write", "check", "template"].every((a) => problem.actions.includes(a)));
expect("ownership's decision class comes from the data model", table.find((r) => r.route === "governance/ownership")?.decision_class === "ownership-or-control");
expect("routes are unique", new Set(table.map((r) => r.route)).size === table.length);
expect("every route's template exists", table.every((r) => !r.template || existsSync(join(root, r.template))));
expect("read returns the record", (await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" })).result?.evidence?.length > 0);
const missing = (await call({ venture: "woodworking", route: "purpose/telos", action: "read" }));
expect("not-found: a missing record answers with its template, schema, skills and need-now", missing.result === null && missing.not_found.template === "purpose/templates/telos-based-smart.md"
  && missing.not_found.need_now?.status && missing.not_found.skills.includes("purpose/skills/telos/SKILL.md"));
expect("an unknown venture is refused", !(await call({ venture: "nobody", route: "purpose/telos", action: "read" })).ok);
expect("an action a route lacks is refused", /has no action/.test((await call({ venture: "tandem", route: "system/need-now", action: "write", input: {} })).error));
const bad = (await call({ venture: "tandem", route: "governance/ownership", action: "write", input: { nope: true }, actor: "person" }));
expect("a write that does not match the schema is refused and changes nothing", !bad.ok && /does not match/.test(bad.error)
  && JSON.stringify(JSON.parse(readFileSync(join(tandem, "governance/ownership.json"), "utf8"))) === JSON.stringify(own));
const drafted = (await call({ venture: "tandem", route: "governance/ownership", action: "write", input: own }));
expect("an agent's write to a gated record lands as a draft", drafted.ok && drafted.result.draft && existsSync(join(tandem, "_drafts/governance__ownership.json.draft")));
const direct = (await call({ venture: "tandem", route: "purpose/validation/solution", action: "write", input: (await call({ venture: "tandem", route: "purpose/validation/solution", action: "read" })).result }));
expect("an agent's write to an ungated record is written in place", direct.ok && !direct.result.draft && direct.result.written === "purpose/validation/solution.json");
const gatedProblem = await call({ venture: "tandem", route: "purpose/validation/problem", action: "write", input: (await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" })).result });
expect("an agent's write to the problem record is a draft for the founder to accept (EE-050)", gatedProblem.ok && gatedProblem.result.draft === true);
rmSync(join(tandem, "_drafts/purpose__validation__problem.json.draft"), { force: true });
const identityBefore = readFileSync(join(tandem, "venture.json"), "utf8");
const coreAsAgent = await call({ venture: "tandem", route: "foundation/core", action: "write", input: { tagline: "Ride together" } });
expect("an agent cannot write foundation/core, and leaves no draft", !coreAsAgent.ok && !existsSync(join(tandem, "_drafts/venture.json.draft")) && readFileSync(join(tandem, "venture.json"), "utf8") === identityBefore);
const coreIdentity = await call({ venture: "tandem", route: "foundation/core", action: "write", actor: "person", input: { tagline: "Ride together", phase: "scale" } });
expect("foundation/core refuses any field but its own", !coreIdentity.ok && /does not match/.test(coreIdentity.error) && readFileSync(join(tandem, "venture.json"), "utf8") === identityBefore);
expect("foundation/core refuses an empty value", !(await call({ venture: "tandem", route: "foundation/core", action: "write", actor: "person", input: { tagline: "" } })).ok);
const coreWritten = await call({ venture: "tandem", route: "foundation/core", action: "write", actor: "person", input: { tagline: "Ride together" } });
const coreRead = await call({ venture: "tandem", route: "foundation/core", action: "read", actor: "person" });
expect("foundation/core writes its field and reads only its view", coreWritten.ok && coreRead.result.tagline === "Ride together" && !("id" in coreRead.result) && !("phase" in coreRead.result));
const envAgent = spawnSync("node", [join(root, "packages/naive/src/interfaces/cli/mentura.mjs"), "foundation/core", "write", "--as", "person", "--venture", "tandem", "--input", '{"tagline":"Signed by a model"}'], { env: { ...process.env, MENTURA_WORKSPACE: process.env.MENTURA_WORKSPACE, MENTURA_ACTOR: "agent", MENTURA_MODEL: "m" }, encoding: "utf8" });
expect("a declared agent saying --as person cannot write foundation/core", envAgent.status !== 0 && !readFileSync(join(tandem, "venture.json"), "utf8").includes("Signed by a model"));
expect("no route claims venture.json as its file", !routes().some((r) => r.files?.includes("venture.json")));
writeFileSync(join(tandem, "_drafts/venture.json.draft"), '{"tagline":"planted"}');
const plantedAccept = spawnSync("node", [join(root, "packages/naive/src/interfaces/cli/mentura.mjs"), "accept", "foundation/core", "--venture", "tandem"], { env: process.env, encoding: "utf8" });
expect("foundation/core takes no accept, so a planted draft signs nothing", plantedAccept.status !== 0 && readFileSync(join(tandem, "venture.json"), "utf8").includes('"id"'));
rmSync(join(tandem, "_drafts/venture.json.draft"), { force: true });
writeFileSync(join(tandem, "venture.json"), identityBefore);
// The venture's naive.config.json gate (EE-073): a fail-closed route holds an agent's write, never a person's.
writeFileSync(join(tandem, "naive.config.json"), JSON.stringify({ gate: { fail_closed: ["validation"] } }));
const solution = (await call({ venture: "tandem", route: "purpose/validation/solution", action: "read" })).result;
const cfgHeld = await call({ venture: "tandem", route: "purpose/validation/solution", action: "write", input: solution });
expect("naive.config.json fail_closed turns an agent's write into a draft, naming the rule", cfgHeld.ok && cfgHeld.result.draft && cfgHeld.result.gate_rule === "validation" && /naive.config.json/.test(cfgHeld.result.note));
const cfgPerson = await call({ venture: "tandem", route: "purpose/validation/solution", action: "write", input: solution, actor: "person" });
expect("naive.config.json fail_closed never holds a person's write", cfgPerson.ok && !cfgPerson.result.draft && !cfgPerson.result.gate_rule);
const cfgAccept = spawnSync("node", [join(root, "packages/naive/src/interfaces/cli/mentura.mjs"), "accept", "validation/solution", "--venture", "tandem"], { env: { ...process.env, MENTURA_WORKSPACE: ws }, encoding: "utf8" });
expect("a person accepts a draft the naive.config.json gate held", cfgAccept.status === 0 && !existsSync(join(tandem, "_drafts/validation__solution.json.draft")));
rmSync(join(tandem, "naive.config.json"));
expect("a person's write to a gated record is written in place", (await call({ venture: "tandem", route: "governance/ownership", action: "write", input: own, actor: "person" })).result?.written === "governance/ownership.json");
expect("check runs the record's checks", (await call({ venture: "tandem", route: "purpose/validation/problem", action: "check" })).ok);
expect("need-now runs", (await call({ venture: "tandem", route: "system/need-now", action: "run" })).result?.rows?.length > 0);
expect("time-to-ready runs", (await call({ venture: "tandem", route: "system/time-to-ready", action: "run" })).result?.venture === "tandem");
expect("payouts at a given value", (await call({ venture: "tandem", route: "governance/payouts", action: "run", input: { value: 5e6 } })).result?.[0]?.value === 5e6);
expect("a command missing its record says which", /needs governance\/ownership.json/.test((await call({ venture: "woodworking", route: "governance/payouts", action: "run" })).error));

// Route types (EE-032).
const kettle = { ...(await call({ venture: "tandem", route: "purpose/product", action: "read" })).result[Object.keys((await call({ venture: "tandem", route: "purpose/product", action: "read" })).result)[0]], id: "kettle", name: "Kettle" };
expect("[id]: a collection lists its items by id", Object.keys((await call({ venture: "tandem", route: "purpose/product", action: "read" })).result).length > 0);
expect("[id]: an item route writes one item", (await call({ venture: "tandem", route: "purpose/product/kettle", action: "write", input: kettle, actor: "person" })).result?.written === "products/kettle.json");
expect("[id]: an item route reads one item", (await call({ venture: "tandem", route: "purpose/product/kettle", action: "read" })).result?.name === "Kettle");
expect("[id]: an id with a path in it is refused", !(await call({ venture: "tandem", route: "purpose/product/a/b", action: "read" })).ok
  && !(await call({ venture: "tandem", route: "purpose/product/..", action: "write", input: kettle, actor: "person" })).ok);
expect("[...venture]: a nested venture is reached by its folder path", (await call({ venture: "studio/print", route: "system/need-now", action: "run" })).ok
  && !(await call({ venture: "studio/nothing", route: "system/need-now", action: "run" })).ok);
const lay = (await call({ venture: "tandem", route: "purpose/validation/problem", action: "layout" })).result;
expect("layout: the system layer, the record's layer and its package, in that order", lay.stack.map((k) => k.name).join() === "system,purpose,validation" && lay.stack[2].skills.length > 0);
writeFileSync(join(tandem, "AGENTS.md"), "tone: plain\n");
mkdirSync(join(tandem, "foundation"), { recursive: true });
writeFileSync(join(tandem, "foundation/AGENTS.md"), "tone: warm\n");
const nested = (await call({ venture: "tandem", route: "foundation/problem", action: "layout" })).result;
expect("layout: AGENTS.md chain, nearest last, and the nearer file wins", nested.chain.map((f) => f.path).join() === "AGENTS.md,foundation/AGENTS.md" && nested.instructions.tone === "warm" && nested.package.gates.length > 0);
expect("three outcomes: expected error, uncaught error, uncertain", (await call({ route: "no/such", action: "read" })).outcome === "error" && capture(() => { throw new Error("boom"); }).outcome === "uncaught" && judge(0.2, 0.7, "founder").outcome === "uncertain" && judge(0.2, 0.7, "founder").result === null);
expect("layout: names the template and need-now status", lay.template === "purpose/kits/validation/templates/problem.md" && lay.need_now?.status === "held");
expect("layout: works without a venture", (await call({ route: "governance/ownership", action: "layout" })).result.gate.class === "ownership-or-control");
expect("loading: a read says when an agent's draft is waiting", (await call({ venture: "tandem", route: "governance/ownership", action: "read" })).pending_draft?.file === "_drafts/governance__ownership.json.draft");
const badCheck = await (async () => { const d = join(ws, "ventures/tandem/purpose/validation/problem.json"); const keep = readFileSync(d, "utf8"); const j = JSON.parse(keep); j.evidence[0].source = { url: "https://example.com" }; writeFileSync(d, JSON.stringify(j)); const r = (await call({ venture: "tandem", route: "purpose/validation/problem", action: "check" })); writeFileSync(d, keep); return r; })();
expect("error: a failed check answers with the kit's skills and the template", !badCheck.ok && badCheck.fix?.skills.length > 0 && badCheck.fix.template);
expect("error: a write that does not match answers with how to fix it", (await call({ venture: "tandem", route: "purpose/validation/problem", action: "write", input: { nope: 1 } })).fix?.schema === "packages/naive/src/records/validation-problem.schema.json");
expect("view: a record renders as a Markdown page", /^# foundation\/problem\n/.test((await call({ venture: "tandem", route: "purpose/validation/problem", action: "view" })).result));
const ov = (await call({ venture: "tandem", route: "system/overview", action: "run" })).result;
expect("@slot: the overview has its eight slots", ov.slots.map((x) => x.slot).join() === "@venture,@telos,@validation,@need-now,@ready,@team,@packages,@provenance"); // @packages: P-17 (wf/writes)
const woodOk = (await call({ venture: "woodworking", route: "system/overview", action: "run" })).result;
expect("@validation: a venture with no problem record shows every assumption unknown, not an error (EE-050)", /exists: unknown/.test(woodOk.slots.find((x) => x.slot === "@validation").data?.assumptions ?? ""));
const woodProblem = join(ws, "ventures/woodworking/purpose/validation/problem.json");
mkdirSync(dirname(woodProblem), { recursive: true }); writeFileSync(woodProblem, "not json");
const wood = (await call({ venture: "woodworking", route: "system/overview", action: "run" })).result;
rmSync(dirname(woodProblem), { recursive: true });
expect("@slot: a slot that cannot render shows its error and the rest still render", wood.slots.find((x) => x.slot === "@validation").error && wood.slots.find((x) => x.slot === "@need-now").data);
expect("(group): each phase groups the routes need-now suggests in it", groups().find((g) => g.group === "(discovery)").routes.includes("foundation/problem")
  && !groups().find((g) => g.group === "(discovery)").routes.includes("governance/ownership"));
const planPath = join(tandem, "operations/team-plan.json");
mkdirSync(dirname(planPath), { recursive: true });
writeFileSync(planPath, JSON.stringify({ venture: "tandem", updated: "2026-10-27", roles: [{ id: "scout", name: "Scout", occupant: "agent", needed_by: "validation", status: "filled", routes: { read: ["purpose/**"], write: ["purpose/validation/*"] } }] }));
expect("robots: a role may write the routes it lists", (await call({ venture: "tandem", route: "purpose/validation/problem", action: "write", actor_id: "scout", input: (await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" })).result })).ok);
expect("robots: a role may not write a route it does not list", / may not write /.test((await call({ venture: "tandem", route: "purpose/product/kettle", action: "write", actor_id: "scout", input: kettle })).error));
expect("robots: a role may not read outside its read list", / may not read /.test((await call({ venture: "tandem", route: "system/need-now", action: "run", actor_id: "scout" })).error));
expect("robots: system/robots lists each role's routes", (await call({ venture: "tandem", route: "system/robots", action: "run" })).result.roles[0].write === "purpose/validation/*");
expect("robots: a role with no routes may reach everything", (await call({ venture: "tandem", route: "system/need-now", action: "run", actor_id: "nobody" })).ok);
rmSync(planPath);
const aliasFile = join(ws, "aliases.json");
writeFileSync(aliasFile, JSON.stringify({ aliases: [{ from: "purpose/problem", to: "foundation/problem", since: "2026-10-27", note: "EE-026" }] }));
process.env.MENTURA_ROUTE_ALIASES = aliasFile;
const aliased = (await call({ venture: "tandem", route: "purpose/problem", action: "read" }));
expect("aliases: an old route reads the new one and says it moved", aliased.ok && aliased.result?.evidence && /is now foundation\/problem/.test(aliased.deprecated));
delete process.env.MENTURA_ROUTE_ALIASES;
expect("aliases: every alias in the repository points at a route that exists", JSON.parse(readFileSync(join(root, "packages/naive/src/router/route-aliases.json"), "utf8")).aliases.every((a) => table.some((r) => r.route === a.to)));
expect("gates: a venture's decision rights decide; ownership drafts under the template", (await call({ venture: "tandem", route: "governance/ownership", action: "layout" })).result.gate.drafts === true);

// MCP server.
const init = (await handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }));
expect("MCP initialize names the server and its tools capability", init.result.serverInfo.name === "mentura" && init.result.capabilities.tools);
expect("MCP lists its fifteen tools, three of them for setup and one for the decision library", (await handle({ jsonrpc: "2.0", id: 2, method: "tools/list" })).result.tools.length === TOOLS.length && TOOLS.length === 15 && ["mentura_setup", "mentura_setup_answer", "mentura_setup_point", "mentura_frame"].every((n) => TOOLS.some((t) => t.name === n)));
const mcp = async (name, args) => (await handle({ jsonrpc: "2.0", id: 9, method: "tools/call", params: { name, arguments: args } })).result;
const pd = await mcp("mentura_propose_decision", { venture: "tandem", decision: { id: "mcp-demo", question: "Demo?", answer: "Yes", at: "operations" }, agent_id: "builder" });
expect("MCP: an agent proposes a decision and it awaits approval (EE-058)", !pd.isError && /"awaiting": "approval"/.test(pd.content[0].text));
const pdd = await mcp("mentura_propose_decision", { venture: "tandem", decision: { id: "mcp-demo-2", question: "Demo?", status: "decided" } });
expect("MCP: an agent cannot propose a decision as decided", pdd.isError);
const dl = await mcp("mentura_decisions", { venture: "tandem", render: ["now"] });
expect("MCP: the decisions tool lists what renders now", !dl.isError && JSON.parse(dl.content[0].text).decisions.some((d) => d.id === "mcp-demo"));
const w = (await handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "mentura_write", arguments: { venture: "tandem", route: "governance/ownership", record: own } } }));
expect("MCP writes are always an agent's, so a gated record becomes a draft", !w.result.isError && /"draft": true/.test(w.result.content[0].text));
expect("MCP tool errors come back as isError", (await handle({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "mentura_read", arguments: { venture: "nobody", route: "purpose/telos" } } })).result.isError);
expect("MCP reads a record as a resource", JSON.parse((await handle({ jsonrpc: "2.0", id: 5, method: "resources/read", params: { uri: "mentura://tandem/purpose/validation/problem" } })).result.contents[0].text).evidence.length > 0);
expect("MCP ignores notifications", (await handle({ jsonrpc: "2.0", method: "notifications/initialized" })) === null);
expect("MCP refuses an unknown method", (await handle({ jsonrpc: "2.0", id: 6, method: "nope" })).error.code === -32601);
const stdio = spawnSync("node", [join(root, "packages/naive/src/interfaces/mcp/server.mjs")], { input: '{"jsonrpc":"2.0","id":1,"method":"ping"}\nnot json\n', encoding: "utf8", env: process.env });
const lines = stdio.stdout.trim().split("\n").map((l) => JSON.parse(l));
expect("MCP over stdio answers each line, and a parse error as -32700", lines[0].id === 1 && lines[1].error?.code === -32700);

// HTTP API.
expect("API GET /routes", (await http("GET", "/routes"))[0] === 200);
expect("API GET a record", (await http("GET", "/ventures/tandem/purpose/validation/problem"))[1].result?.evidence?.length > 0);
expect("API 404 for an unknown venture", (await http("GET", "/ventures/nobody/purpose/telos"))[0] === 404);
expect("API PUT to a gated record is a draft", (await http("PUT", "/ventures/tandem/governance/ownership", own))[1].result?.draft === true);
expect("API 422 for a record that does not match", (await http("PUT", "/ventures/tandem/governance/ownership", { nope: 1 }))[0] === 422);
expect("API POST run", (await http("POST", "/ventures/tandem/system/need-now/run"))[0] === 200);
expect("API GET a venture is its overview", (await http("GET", "/ventures/tandem"))[1].result?.slots?.length === 8); // @packages added (wf/writes)
expect("API reaches a nested venture by its path", (await http("GET", "/ventures/studio/print/system/robots"))[0] === 405 && (await http("POST", "/ventures/studio/print/system/robots/run"))[0] === 200);
expect("API GET view and layout", typeof (await http("GET", "/ventures/tandem/purpose/validation/problem/view"))[1].result === "string" && (await http("GET", "/ventures/tandem/purpose/validation/problem/layout"))[1].result.stack.length === 3);
expect("API GET a collection item", (await http("GET", "/ventures/tandem/purpose/product/kettle"))[1].result?.name === "Kettle");
expect("API 405 for GET on run", (await http("GET", "/ventures/tandem/system/need-now/run"))[0] === 405);

// CLI.
const cli = (...a) => spawnSync("node", [join(root, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a], { encoding: "utf8", env: process.env });
expect("CLI lists ventures", /tandem/.test(cli("ventures").stdout));
expect("CLI reads a record", (({ result, ...r }) => (result ?? r).evidence.length > 0)(JSON.parse(cli("purpose/validation/problem", "read", "--venture", "tandem").stdout)));
expect("CLI fails with a message for an unknown route", cli("nope/nope", "read", "--venture", "tandem").status === 1);
cli("governance/ownership", "write", "--venture", "tandem", "--input", join(tandem, "governance/ownership.json"));
expect("CLI accept moves a draft into place", cli("accept", "governance/ownership", "--venture", "tandem").status === 0 && !existsSync(join(tandem, "_drafts/governance__ownership.json.draft")));
expect("CLI accept without a draft fails", cli("accept", "governance/ownership", "--venture", "tandem").status === 1);
const fresh = join(ws, "ventures/fresh");
expect("CLI init with --layers turns on only those layers", cli("init", fresh, "--id", "fresh", "--layers", "purpose").status === 0
  && JSON.parse(readFileSync(join(fresh, "venture.json"), "utf8")).layers.governance === false);
expect("a part-adopted venture's need-now marks other layers off", (await call({ venture: "fresh", route: "system/need-now", action: "run" })).result.rows.find((r) => r.type === "ownership").status === "layer off");

// Provenance (EE-031).
const log = entries(tandem);
const by = (pred) => log.filter(pred).at(-1);
expect("the log route reads and checks the log, and has no write", !table.find((r) => r.route === "system/provenance")?.actions.includes("write")
  && Array.isArray((await call({ venture: "tandem", route: "system/provenance", action: "read" })).result));
expect("a router write is logged with its gate as the decision", by((e) => e.activity === "draft" && e.agent.via === "router" && /ownership/.test(e.entity))?.decision === "ownership-or-control");
expect("an MCP write logs the harness that connected", (await handle({ jsonrpc: "2.0", id: 9, method: "initialize", params: { clientInfo: { name: "test-harness", version: "1" } } }))
  && !(await handle({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "mentura_write", arguments: { venture: "tandem", route: "purpose/validation/problem",
    record: (await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" })).result, derived_from: ["purpose/validation/problem.json"], decision: "EE-026", model: "m" } } })).result.isError
  && (() => { const e = entries(tandem).at(-1); return e.agent.harness === "test-harness 1" && e.agent.model === "m" && e.decision === "EE-026" && e.derived_from[0] === "purpose/validation/problem.json"; })());
(await http("PUT", "/ventures/tandem/purpose/validation/problem", (await call({ venture: "tandem", route: "purpose/validation/problem", action: "read" })).result, { "x-mentura-derived-from": "https://example.com/a, EE-026" }));
expect("an API write logs derived_from from its header", entries(tandem).at(-1).derived_from?.join() === "https://example.com/a,EE-026" && entries(tandem).at(-1).agent.via === "api");
expect("an accepted draft is logged as a person's accept", log.some((e) => e.activity === "accept" && e.agent.kind === "person" && e.entity === "governance/ownership.json"));
const check = () => spawnSync("node", [join(root, "packages/naive/src/checks/check-provenance.mjs"), ws], { encoding: "utf8" });
expect("check-provenance passes on the logs the tests wrote", check().status === 0);
const lf = join(tandem, "provenance.jsonl"), logLines = readFileSync(lf, "utf8").split("\n");
writeFileSync(lf, logLines.filter((_, i) => i !== 1).join("\n"));
expect("check-provenance fails when a line is removed", /chain broken/.test(check().stderr));
writeFileSync(lf, logLines.map((l, i) => i === 1 ? l.replace('"at":"2', '"at":"1') : l).join("\n"));
expect("check-provenance fails when a line is edited", /hash does not match/.test(check().stderr));

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
