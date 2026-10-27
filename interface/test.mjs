// Tests for the router and the three interfaces over it (EE-030): the CLI, the MCP server and the
// HTTP API. They run on a copy of the example workspace in a temp folder.
//
//   node interface/test.mjs

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "./router.mjs";
import { handle, TOOLS } from "./mcp/server.mjs";
import { route as http } from "./api/server.mjs";
import { entries } from "./provenance.mjs";

const root = new URL("..", import.meta.url).pathname;
const ws = join(mkdtempSync(join(tmpdir(), "mentura-test-")), "workspace");
cpSync(join(root, "schema/examples/workspace"), ws, { recursive: true });
process.env.MENTURA_WORKSPACE = ws;
const tandem = join(ws, "ventures/tandem");
let failed = 0;
const expect = (name, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };
const own = JSON.parse(readFileSync(join(tandem, "governance/ownership.json"), "utf8"));

// Router.
const table = routes();
const problem = table.find((r) => r.route === "purpose/validation/problem");
expect("a kit record gets a nested route with all four actions", problem && ["read", "write", "check", "template"].every((a) => problem.actions.includes(a)));
expect("ownership is gated as an ownership-or-control decision", table.find((r) => r.route === "governance/ownership")?.gate === "ownership-or-control");
expect("routes are unique", new Set(table.map((r) => r.route)).size === table.length);
expect("every route's template exists", table.every((r) => !r.template || existsSync(join(root, r.template))));
expect("read returns the record", call({ venture: "tandem", route: "purpose/validation/problem", action: "read" }).result?.evidence?.length > 0);
expect("read of a missing record says so", call({ venture: "woodworking", route: "purpose/telos", action: "read" }).result === null);
expect("an unknown venture is refused", !call({ venture: "nobody", route: "purpose/telos", action: "read" }).ok);
expect("an action a route lacks is refused", /has no action/.test(call({ venture: "tandem", route: "system/need-now", action: "write", input: {} }).error));
const bad = call({ venture: "tandem", route: "governance/ownership", action: "write", input: { nope: true }, actor: "person" });
expect("a write that does not match the schema is refused and changes nothing", !bad.ok && /does not match/.test(bad.error)
  && JSON.stringify(JSON.parse(readFileSync(join(tandem, "governance/ownership.json"), "utf8"))) === JSON.stringify(own));
const drafted = call({ venture: "tandem", route: "governance/ownership", action: "write", input: own });
expect("an agent's write to a gated record lands as a draft", drafted.ok && drafted.result.draft && existsSync(join(tandem, "_drafts/governance__ownership.json.draft")));
const direct = call({ venture: "tandem", route: "purpose/validation/problem", action: "write", input: call({ venture: "tandem", route: "purpose/validation/problem", action: "read" }).result });
expect("an agent's write to an ungated record is written in place", direct.ok && !direct.result.draft && direct.result.written === "purpose/validation/problem.json");
expect("a person's write to a gated record is written in place", call({ venture: "tandem", route: "governance/ownership", action: "write", input: own, actor: "person" }).result?.written === "governance/ownership.json");
expect("check runs the record's checks", call({ venture: "tandem", route: "purpose/validation/problem", action: "check" }).ok);
expect("need-now runs", call({ venture: "tandem", route: "system/need-now", action: "run" }).result?.rows?.length > 0);
expect("time-to-ready runs", call({ venture: "tandem", route: "system/time-to-ready", action: "run" }).result?.venture === "tandem");
expect("payouts at a given value", call({ venture: "tandem", route: "governance/payouts", action: "run", input: { value: 5e6 } }).result?.[0]?.value === 5e6);
expect("a command missing its record says which", /needs governance\/ownership.json/.test(call({ venture: "woodworking", route: "governance/payouts", action: "run" }).error));

// MCP server.
const init = handle({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
expect("MCP initialize names the server and its tools capability", init.result.serverInfo.name === "mentura" && init.result.capabilities.tools);
expect("MCP lists the seven tools", handle({ jsonrpc: "2.0", id: 2, method: "tools/list" }).result.tools.length === TOOLS.length && TOOLS.length === 7);
const w = handle({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "mentura_write", arguments: { venture: "tandem", route: "governance/ownership", record: own } } });
expect("MCP writes are always an agent's, so a gated record becomes a draft", !w.result.isError && /"draft": true/.test(w.result.content[0].text));
expect("MCP tool errors come back as isError", handle({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "mentura_read", arguments: { venture: "nobody", route: "purpose/telos" } } }).result.isError);
expect("MCP reads a record as a resource", JSON.parse(handle({ jsonrpc: "2.0", id: 5, method: "resources/read", params: { uri: "mentura://tandem/purpose/validation/problem" } }).result.contents[0].text).evidence.length > 0);
expect("MCP ignores notifications", handle({ jsonrpc: "2.0", method: "notifications/initialized" }) === null);
expect("MCP refuses an unknown method", handle({ jsonrpc: "2.0", id: 6, method: "nope" }).error.code === -32601);
const stdio = spawnSync("node", [join(root, "interface/mcp/server.mjs")], { input: '{"jsonrpc":"2.0","id":1,"method":"ping"}\nnot json\n', encoding: "utf8", env: process.env });
const lines = stdio.stdout.trim().split("\n").map((l) => JSON.parse(l));
expect("MCP over stdio answers each line, and a parse error as -32700", lines[0].id === 1 && lines[1].error?.code === -32700);

// HTTP API.
expect("API GET /routes", http("GET", "/routes")[0] === 200);
expect("API GET a record", http("GET", "/ventures/tandem/purpose/validation/problem")[1].result?.evidence?.length > 0);
expect("API 404 for an unknown venture", http("GET", "/ventures/nobody/purpose/telos")[0] === 404);
expect("API PUT to a gated record is a draft", http("PUT", "/ventures/tandem/governance/ownership", own)[1].result?.draft === true);
expect("API 422 for a record that does not match", http("PUT", "/ventures/tandem/governance/ownership", { nope: 1 })[0] === 422);
expect("API POST run", http("POST", "/ventures/tandem/system/need-now/run")[0] === 200);
expect("API 405 for GET on run", http("GET", "/ventures/tandem/system/need-now/run")[0] === 405);

// CLI.
const cli = (...a) => spawnSync("node", [join(root, "interface/cli/mentura.mjs"), ...a], { encoding: "utf8", env: process.env });
expect("CLI lists ventures", /tandem/.test(cli("ventures").stdout));
expect("CLI reads a record", JSON.parse(cli("purpose/validation/problem", "read", "--venture", "tandem").stdout).evidence.length > 0);
expect("CLI fails with a message for an unknown route", cli("nope/nope", "read", "--venture", "tandem").status === 1);
cli("governance/ownership", "write", "--venture", "tandem", "--input", join(tandem, "governance/ownership.json"));
expect("CLI accept moves a draft into place", cli("accept", "governance/ownership", "--venture", "tandem").status === 0 && !existsSync(join(tandem, "_drafts/governance__ownership.json.draft")));
expect("CLI accept without a draft fails", cli("accept", "governance/ownership", "--venture", "tandem").status === 1);
const fresh = join(ws, "ventures/fresh");
expect("CLI init with --layers turns on only those layers", cli("init", fresh, "--id", "fresh", "--layers", "purpose").status === 0
  && JSON.parse(readFileSync(join(fresh, "venture.json"), "utf8")).layers.governance === false);
expect("a part-adopted venture's need-now marks other layers off", call({ venture: "fresh", route: "system/need-now", action: "run" }).result.rows.find((r) => r.type === "ownership").status === "layer off");

// Provenance (EE-031).
const log = entries(tandem);
const by = (pred) => log.filter(pred).at(-1);
expect("the log route reads and checks the log, and has no write", table.find((r) => r.route === "system/provenance")?.actions.join() === "read,check"
  && Array.isArray(call({ venture: "tandem", route: "system/provenance", action: "read" }).result));
expect("a router write is logged with its gate as the decision", by((e) => e.activity === "draft" && e.agent.via === "router")?.decision === "ownership-or-control");
expect("an MCP write logs the harness that connected", handle({ jsonrpc: "2.0", id: 9, method: "initialize", params: { clientInfo: { name: "test-harness", version: "1" } } })
  && !handle({ jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "mentura_write", arguments: { venture: "tandem", route: "purpose/validation/problem",
    record: call({ venture: "tandem", route: "purpose/validation/problem", action: "read" }).result, derived_from: ["purpose/validation/problem.json"], decision: "EE-026", model: "m" } } }).result.isError
  && (() => { const e = entries(tandem).at(-1); return e.agent.harness === "test-harness 1" && e.agent.model === "m" && e.decision === "EE-026" && e.derived_from[0] === "purpose/validation/problem.json"; })());
http("PUT", "/ventures/tandem/purpose/validation/problem", call({ venture: "tandem", route: "purpose/validation/problem", action: "read" }).result, { "x-mentura-derived-from": "https://example.com/a, EE-026" });
expect("an API write logs derived_from from its header", entries(tandem).at(-1).derived_from?.join() === "https://example.com/a,EE-026" && entries(tandem).at(-1).agent.via === "api");
expect("an accepted draft is logged as a person's accept", log.some((e) => e.activity === "accept" && e.agent.kind === "person" && e.entity === "governance/ownership.json"));
const check = () => spawnSync("node", [join(root, "schema/check-provenance.mjs"), ws], { encoding: "utf8" });
expect("check-provenance passes on the logs the tests wrote", check().status === 0);
const lf = join(tandem, "provenance.jsonl"), logLines = readFileSync(lf, "utf8").split("\n");
writeFileSync(lf, logLines.filter((_, i) => i !== 1).join("\n"));
expect("check-provenance fails when a line is removed", /chain broken/.test(check().stderr));
writeFileSync(lf, logLines.map((l, i) => i === 1 ? l.replace('"at":"2', '"at":"1') : l).join("\n"));
expect("check-provenance fails when a line is edited", /hash does not match/.test(check().stderr));

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
