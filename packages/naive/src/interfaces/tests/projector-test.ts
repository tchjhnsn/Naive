// Tests one writer per file (everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md, "Records people own and
// records the projector owns", build plan item 4): a record type with writer projection in the data model
// (competitors/<id>/signals.json) is written only by the signal projector. A person, an ordinary agent, the MCP
// server, the agent filesystem and the CLI are refused with the hint to emit a superseding signal; the role id
// projector cannot be claimed without the in-process symbol; the projector's write is never held as a draft; reads
// are unaffected; and competitors/<id>.json stays the person's, which the projector only creates when it is missing.
// Every venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/projector-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.mjs";
import { PROJECTOR, asProjector } from "../../router/acting.mjs";
import { write as writeFile } from "../../router/agent-files.ts";
import { handle } from "../mcp/server.mjs";
import { EMIT_HINT, evaluate, writerRule } from "../../engine/gate.mjs";
import { entries } from "../../core/provenance.mjs";
import { routes } from "../../records/routes/routes.mjs";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const show = (r: unknown): string => String(JSON.stringify(r)).slice(0, 400);
const ws = mkdtempSync(join(tmpdir(), "projector-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
delete env.MENTURA_ACTOR_ID;
delete process.env.MENTURA_ACTOR_ID;
process.env.MENTURA_WORKSPACE = ws; // the MCP server finds ventures there
const cli = (...a: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a], { encoding: "utf8", env });

interface Reply { ok: boolean, error?: string, gate_rule?: string, refused_by?: string, fix?: { command?: string, built?: boolean }, result?: { written?: string, draft?: boolean, note?: string } }
type Args = Record<string | symbol, unknown>;

const SIGNALS = "purpose/competitor-signals/acme-robotics";
const MASTER = "purpose/competitor/acme-robotics";
const signals = (last: string) => ({ competitor: "acme-robotics", first_seen: "2026-11-05", last_seen: last,
  funding: [{ series: "seed", amount: 3000000, currency: "USD", signal: "3a50ad6dfb3a46b0f160cc36", support: "supported" }] });
const master = (stance: string, id = "acme-robotics") => ({ id, name: "Acme Robotics", domain: "acme.example", stance });

try {
  const made = cli("init", join(ws, "ventures/pj"), "--id", "pj", "--layers", "purpose");
  if (made.status !== 0) throw new Error(made.stderr);
  const dir = join(ws, "ventures/pj");
  const signalsFile = join(dir, "competitors/acme-robotics/signals.json");
  const masterFile = join(dir, "competitors/acme-robotics.json");
  const run = async (args: Args): Promise<Reply> => await call({ venture: "pj", workspace: ws, ...args } as Parameters<typeof call>[0]) as Reply;
  const write = (route: string, input: unknown, extra: Args = {}) => run({ route, action: "write", input, ...extra });
  const refusedWithHint = (r: Reply): boolean => !r.ok && r.gate_rule === "projector-only" && r.refused_by === "data model" && (r.error ?? "").includes(EMIT_HINT) && r.fix?.built === false;
  const linesFor = (file: string) => (entries(dir) as { entity: string }[]).filter((e) => e.entity === file);

  expect("the route table carries writer projection on the projected type only",
    routes().some((r: { route: string, writer?: string }) => r.route === "purpose/competitor-signals/[id]" && r.writer === "projection")
    && routes().every((r: { route: string, writer?: string }) => !r.route.startsWith("purpose/competitor/") || r.writer === undefined));

  // Everyone but the projector is refused, before anything is written or logged.
  const person = await write(SIGNALS, signals("2026-11-05"), { actor: "person" });
  expect("a person's write to competitors/<id>/signals.json is refused with the emit hint", refusedWithHint(person), show(person));
  expect("the refusal names naive signals emit and says it is not built yet", /naive signals emit .*--supersedes/.test(person.error ?? "") && /not built yet/.test(person.error ?? ""), person.error);
  expect("nothing is written and nothing is logged", !existsSync(signalsFile) && linesFor("competitors/acme-robotics/signals.json").length === 0);
  const agent = await write(SIGNALS, signals("2026-11-05"));
  expect("an ordinary agent's write is refused the same way", refusedWithHint(agent), show(agent));
  const role = await write(SIGNALS, signals("2026-11-05"), { actor_id: "researcher" });
  expect("an agent in a team-plan role is refused", refusedWithHint(role), show(role));
  const invalid = await write(SIGNALS, { nonsense: true }, { actor: "person" });
  expect("the rule comes before the schema: an invalid record is refused as projector-only too", refusedWithHint(invalid), show(invalid));
  const files = await writeFile({ venture: "pj", workspace: ws }, "/purpose/competitor-signals/acme-robotics", JSON.stringify(signals("2026-11-05")));
  expect("the agent filesystem's write is refused with the hint", !files.ok && (files.error ?? "").includes(EMIT_HINT), show(files));
  const mcp = await handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "mentura_write", arguments: { venture: "pj", route: SIGNALS, record: signals("2026-11-05") } } }) as { result?: { content?: { text: string }[] } };
  expect("the MCP server's write is refused with the hint", (mcp.result?.content?.[0]?.text ?? "").includes("naive signals emit"), show(mcp));
  const input = join(ws, "signals.json");
  writeFileSync(input, JSON.stringify(signals("2026-11-05")));
  const byCli = cli(SIGNALS, "write", "--venture", "pj", "--as", "person", "--input", input);
  expect("the CLI's write as a person is refused with the hint", byCli.status !== 0 && (byCli.stdout + byCli.stderr).includes("naive signals emit"), byCli.stdout + byCli.stderr);

  // The id projector cannot be claimed without the symbol.
  const claimed = await write(SIGNALS, signals("2026-11-05"), { actor_id: "projector" });
  expect("actor_id projector without the symbol is refused", !claimed.ok && /only Naive's own code acts as it/.test(claimed.error ?? ""), show(claimed));
  const viaJson = await run(JSON.parse(JSON.stringify(asProjector({ route: SIGNALS, action: "write", input: signals("2026-11-05") }))) as Args);
  expect("the projector's call sent through JSON loses the symbol and is refused", !viaJson.ok && /only Naive's own code/.test(viaJson.error ?? ""), show(viaJson));
  process.env.MENTURA_ACTOR_ID = "projector";
  const byEnv = await write(SIGNALS, signals("2026-11-05"));
  delete process.env.MENTURA_ACTOR_ID;
  expect("MENTURA_ACTOR_ID=projector is refused", !byEnv.ok && /only Naive's own code/.test(byEnv.error ?? ""), show(byEnv));
  const cliClaim = spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), SIGNALS, "write", "--venture", "pj", "--input", input], { encoding: "utf8", env: { ...env, MENTURA_ACTOR_ID: "projector" } });
  expect("the CLI with MENTURA_ACTOR_ID=projector is refused", cliClaim.status !== 0 && /only Naive's own code/.test(cliClaim.stdout + cliClaim.stderr), cliClaim.stdout + cliClaim.stderr);
  const asPerson = await run({ route: SIGNALS, action: "write", input: signals("2026-11-05"), actor: "person", actor_id: "projector", [PROJECTOR]: true });
  expect("the symbol on a person's call is refused: the projector is an agent", !asPerson.ok && /acts as an agent with actor_id projector/.test(asPerson.error ?? ""), show(asPerson));

  // The projector writes, and its write is never held, even where the venture holds agent writes.
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ gate: { fail_closed: ["purpose"] } }, null, 2) + "\n");
  const projected = await run(asProjector({ route: SIGNALS, action: "write", input: signals("2026-11-05"), provenance: { derived_from: ["3a50ad6dfb3a46b0f160cc36"] } }));
  expect("the projector writes competitors/<id>/signals.json", projected.ok && projected.result?.written === "competitors/acme-robotics/signals.json" && existsSync(signalsFile), show(projected));
  expect("the projector's write is not a draft where fail_closed holds agent writes", projected.ok && projected.result?.draft === false, show(projected));
  const line = linesFor("competitors/acme-robotics/signals.json").at(-1) as { agent?: { kind?: string, id?: string } } | undefined;
  expect("its provenance line names the projector as an agent", line?.agent?.kind === "agent" && line?.agent?.id === "projector", show(line));
  const again = await write(SIGNALS, signals("2026-11-06"), { actor: "person" });
  expect("a person still cannot overwrite what the projector wrote", refusedWithHint(again), show(again));
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ gate: { rules: [{ id: "no-competitors", routes: ["purpose/competitor-signals/**"], then: "refuse", actors: ["agent"] }] } }, null, 2) + "\n");
  const venturRefuses = await run(asProjector({ route: SIGNALS, action: "write", input: signals("2026-11-07") }));
  expect("a venture's own refuse rule still applies to the projector", !venturRefuses.ok && venturRefuses.gate_rule === "no-competitors", show(venturRefuses));
  rmSync(join(dir, "naive.config.json"));

  // Reads are unaffected.
  for (const [who, extra] of [["a person", { actor: "person" }], ["an agent", {}], ["the projector", asProjector({})]] as [string, Args][]) {
    const r = await run({ route: SIGNALS, action: "read", ...extra }) as Reply & { result?: { last_seen?: string } };
    expect(`${who} reads competitors/<id>/signals.json`, r.ok && r.result?.last_seen === "2026-11-05", show(r));
  }
  const list = await run({ route: "purpose/competitor-signals", action: "read", actor: "person" });
  expect("the collection reads too", list.ok, show(list));

  // The person's master record stays theirs.
  const own = await write(MASTER, master("Watch"), { actor: "person" });
  expect("a person writes competitors/<id>.json", own.ok && own.result?.draft === false && existsSync(masterFile), show(own));
  const own2 = await write(MASTER, master("Compete on price"), { actor: "person" });
  expect("a person writes it again", own2.ok && own2.result?.draft === false, show(own2));
  const agentMaster = await write(MASTER, master("Ignore"));
  expect("an agent's write to it meets the ordinary gate, not the projector rule", agentMaster.ok, show(agentMaster));
  const overwrite = await run(asProjector({ route: MASTER, action: "write", input: master("from a signal") }));
  expect("the projector never writes a person's record that exists", !overwrite.ok && overwrite.gate_rule === "projector-only" && /creates one only when it is missing/.test(overwrite.error ?? ""), show(overwrite));
  const created = await run(asProjector({ route: "purpose/competitor/globex", action: "write", input: master("from a signal", "globex") }));
  expect("the projector creates a person's record that is missing", created.ok && existsSync(join(dir, "competitors/globex.json")), show(created));
  const twice = await run(asProjector({ route: "purpose/competitor/globex", action: "write", input: master("again", "globex") }));
  expect("and never writes it again", !twice.ok && twice.gate_rule === "projector-only", show(twice));
  const personAfter = await write("purpose/competitor/globex", master("Mine now", "globex"), { actor: "person" });
  expect("the person edits the record the projector created", personAfter.ok, show(personAfter));

  // The gate's own verdict says the same, so check-config and the gate agree.
  const v = evaluate({ config: {}, route: SIGNALS, actor: "person", writer: "projection" });
  expect("evaluate refuses a person's write to a projection record", v.then === "refuse" && v.rule === "projector-only");
  expect("evaluate passes the projector", evaluate({ config: {}, route: SIGNALS, actor: "agent", writer: "projection", projector: true }).then === "pass");
  expect("writerRule passes any writer on an ordinary record", writerRule({ route: MASTER, writer: "any" }) === null && writerRule({ route: MASTER }) === null);
} catch (e) {
  expect("the test ran", false, String((e as Error)?.stack ?? e));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
