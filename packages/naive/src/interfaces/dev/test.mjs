// The setup page (EE-083): served by naive dev at /setup; each answer is an approved decision or a pointer in
// knowledge/sources.json, written with provenance, and the page says when the structure is established.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handle } from "./setup.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
const base = mkdtempSync(join(tmpdir(), "setup-test-"));
const dir = join(base, "acme");
let failed = 0;
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
/** @type {NodeJS.ProcessEnv} */
// finance=rho syncs through the app's command (packages/naive/src/core/sync.mjs); the test names a stand-in.
const env = { ...process.env, HOME: base, NAIVE_SYNC_RHO: `node ${join(repo, "packages/naive/src/records/examples/money-sync/sync.ts")}` };
delete env.MENTURA_WORKSPACE;
const made = spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), dir, "--type", "software-startup", "--name", "Pat Doe", "--source", "finance=rho", "--yes", "--skip-install", "--no-git"], { env, encoding: "utf8" });
if (made.status !== 0) { console.log(`FAIL create-venture: ${made.stderr}`); process.exit(1); }

const server = createServer(async (req, res) => { if (!(await handle(req, res, dir))) { res.writeHead(404); res.end(); } }).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const at = `http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}`;
/** @param {string} p @returns {Promise<*>} */
const get = (p) => fetch(at + p).then((r) => r.json());
const post = (p, b) => fetch(at + p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, .../** @type {*} */ (await r.json()) }));
const t = async (name, fn) => { try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };

await t("the page and its state answer; people and the Rho source of truth from create-venture are there", async () => {
  ok((await fetch(at + "/setup")).status === 200);
  const s = await get("/setup/state");
  ok(s.steps.people && s.steps.truth && !s.steps.docket && !s.done, JSON.stringify(s.steps));
  ok(s.functions.finance.systems[0].status === "connected" && s.functions.finance.systems[0].fixture === true, JSON.stringify(s.functions));
  ok(!s.docket.some((d) => ["venture", "foundation"].includes(d.id)), "the roots are not questions");
});

await t("pointing a function at a system writes knowledge/sources.json through the router, with provenance", async () => {
  const r = await post("/setup/point", { fn: "legal", system: "local-folder", address: "~/acme-legal" });
  ok(r.ok && r.result.status === "pointed", JSON.stringify(r));
  ok(JSON.parse(readFileSync(ventureFile(dir, "knowledge/sources.json"), "utf8")).functions.legal.systems[0].address === "~/acme-legal");
  ok(readFileSync(ventureFile(dir, "provenance.jsonl"), "utf8").includes("legal: local-folder"));
  ok((await post("/setup/point", { fn: "legal", system: "stripe" })).status === 400, "a system not offered for the function is refused");
});

await t("answering every first decision and the discovery goal establishes the structure", async () => {
  let s = await get("/setup/state");
  for (const d of s.docket.filter((x) => x.status !== "decided")) {
    const r = await post("/setup/decide", { id: d.id, answer: d.options[0] ?? `Our answer to: ${d.question}` });
    ok(r.ok, `${d.id}: ${r.error}`);
  }
  s = await get("/setup/state");
  // Settling the first decisions can bring the next ones forward; answer until the docket is clear.
  for (let i = 0; i < 5 && !s.steps.docket; i++) {
    for (const d of s.docket.filter((x) => x.status !== "decided")) ok((await post("/setup/decide", { id: d.id, answer: d.options[0] ?? "Answered" })).ok);
    s = await get("/setup/state");
  }
  ok(s.steps.docket, `${s.counts.settled}/${s.counts.of}`);
  ok((await post("/setup/decide", { id: "discovery-goal", answer: "" })).status === 400, "an empty answer is refused");
  ok((await post("/setup/decide", { id: "discovery-goal", answer: "Ten cafe owners confirm the problem by December." })).ok);
  s = await get("/setup/state");
  ok(s.done && s.goal.status === "decided", JSON.stringify(s.steps));
  const decided = JSON.parse(readFileSync(ventureFile(dir, "decisions/statement-problem.decision.json"), "utf8"));
  ok(decided.status === "decided" && decided.statement === "problem" && decided.provenance.approved_by === "Pat Doe", JSON.stringify(decided));
});

await t("the venture still passes its checks", async () => {
  for (const c of ["check-ventures", "check-people", "check-provenance", "check-sources"]) {
    const r = spawnSync("node", [join(repo, `schema/${c}.mjs`), base], { encoding: "utf8" });
    ok(r.status === 0, `${c}: ${r.stdout}${r.stderr}`);
  }
});

server.close();
process.exit(failed ? 1 : 0);
