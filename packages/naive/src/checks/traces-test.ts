// Tests traces in the venture's files (EE-121): spans chain, nest and link from provenance; content stays
// out unless turned on; check-traces catches an edited line and a dangling link; naive trace append and
// show work from the command line; router calls become spans; traces off writes nothing.
//
//   node packages/naive/src/checks/traces-test.ts

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { emit, sessions, span, spans, withSpan } from "../core/instrumentation.mjs";
import { entries, record } from "../core/provenance.mjs";
import { checkVenture } from "./check-traces.ts";
import { append, tree } from "../engine/trace-cli.ts";

const repo = fileURLToPath(new URL("../../../..", import.meta.url));
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => { console.log(`${cond ? "ok  " : "FAIL"}  ${name}${cond || !detail ? "" : `: ${detail}`}`); if (!cond) failed++; };

const venture = (config: Record<string, unknown>): string => {
  const dir = mkdtempSync(join(tmpdir(), "naive-traces-"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "discovery" }));
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify(config));
  return dir;
};

delete process.env.NAIVE_TRACES; delete process.env.MENTURA_TRACE_ID; delete process.env.MENTURA_SPAN_ID; delete process.env.MENTURA_SESSION;

// Off by default: nothing is written, and withSpan still runs its function.
{
  const dir = venture({});
  const out = await withSpan(dir, { name: "invoke_agent strategy", kind: "agent" }, () => 42);
  ok("traces off: withSpan still returns, nothing is written", out === 42 && sessions(dir).length === 0);
  ok("traces off: span() writes nothing", span(dir, { name: "x", kind: "model" }) === null);
}

// On: nesting, the chain, the provenance link, content kept out.
{
  const dir = venture({ traces: true });
  writeFileSync(join(dir, "note.md"), "hello\n");
  let traceId = "", agentSpan = "", toolSpan = "";
  await withSpan(dir, { name: "invoke_agent strategy", kind: "agent", attributes: { "gen_ai.agent.name": "strategy", "gen_ai.input.messages": "secret" } }, async (a) => {
    traceId = a.trace_id; agentSpan = a.span_id;
    span(dir, { name: "chat claude", kind: "model", attributes: { "gen_ai.request.model": "claude", "gen_ai.usage.input_tokens": 12, "gen_ai.output.messages": "secret" } });
    await withSpan(dir, { name: "execute_tool naive_write", kind: "tool" }, (t) => {
      toolSpan = t.span_id;
      record(dir, { entity: "note.md", activity: "write", agent: { kind: "agent", via: "router" } });
    });
  });
  const [session] = sessions(dir);
  const list = spans(dir, session);
  ok("one session file for one run", sessions(dir).length === 1 && session === traceId);
  ok("three spans: model, tool, agent", list.length === 3 && list.map((s: { kind: string }) => s.kind).sort().join() === "agent,model,tool");
  const byId = new Map(list.map((s: { span_id: string }) => [s.span_id, s]));
  ok("the tool span's parent is the agent span", (byId.get(toolSpan) as { parent_span_id?: string })?.parent_span_id === agentSpan);
  ok("the model span's parent is the agent span", list.find((s: { kind: string }) => s.kind === "model")?.parent_span_id === agentSpan);
  ok("content attributes are dropped when traces.content is off", !readFileSync(join(dir, "traces", `${session}.jsonl`), "utf8").includes("secret"));
  ok("other attributes are kept", list.find((s: { kind: string }) => s.kind === "model")?.attributes?.["gen_ai.usage.input_tokens"] === 12);
  const line = entries(dir).at(-1);
  ok("the provenance line names the tool span", line?.span?.span_id === toolSpan && line?.span?.trace_id === traceId);
  const r = checkVenture(dir);
  ok("check-traces passes a clean venture", r.errors.length === 0 && r.spans === 3, r.errors.join("; "));
  ok("show prints the tree with the agent at the top", tree(list)[0].startsWith("agent") && tree(list).some((l) => l.startsWith("  tool")));

  // An edited line breaks the chain.
  const f = join(dir, "traces", `${session}.jsonl`);
  const text = readFileSync(f, "utf8");
  writeFileSync(f, text.replace("chat claude", "chat other"));
  ok("check-traces catches an edited line", checkVenture(dir).errors.some((e) => e.includes("hash does not match")));
  writeFileSync(f, text);

  // A provenance line naming a span no file holds is an error.
  record(dir, { entity: "note.md", activity: "write", agent: { kind: "agent", via: "router" } });
  process.env.MENTURA_TRACE_ID = "elsewhere"; process.env.MENTURA_SPAN_ID = "missing";
  record(dir, { entity: "note.md", activity: "write", agent: { kind: "agent", via: "router" } });
  delete process.env.MENTURA_TRACE_ID; delete process.env.MENTURA_SPAN_ID;
  const r2 = checkVenture(dir);
  ok("a span handed down by a parent process is named in provenance", entries(dir).at(-1)?.span?.span_id === "missing");
  ok("check-traces errors on a link to a span no trace file holds", r2.errors.some((e) => e.includes("names span missing")));
  ok("check-traces warns on an agent's write with no span", r2.warnings.some((w) => w.includes("an agent's write with no span")));
}

// Content kept when turned on.
{
  const dir = venture({ traces: { spans: true, content: true } });
  span(dir, { name: "chat claude", kind: "model", attributes: { "gen_ai.input.messages": "kept" } });
  const [s] = sessions(dir);
  ok("traces.content keeps inputs", spans(dir, s)[0].attributes["gen_ai.input.messages"] === "kept");
  ok("check-traces accepts content when it is on", checkVenture(dir).errors.length === 0);
}

// Router calls and judgments become spans.
{
  const dir = venture({ traces: true });
  emit(dir, { kind: "call", route: "purpose/foundation", action: "read", ok: true, ms: 5, venture: "t" });
  emit(dir, { kind: "judgment", question: "fits?", score: 0.9, outcome: "admit", model: "jev" });
  const all = sessions(dir).flatMap((s) => spans(dir, s));
  ok("a router call event is a call span", all.some((s: { kind: string, attributes?: Record<string, unknown> }) => s.kind === "call" && s.attributes?.["naive.route"] === "purpose/foundation"));
  ok("a judgment event is a judgment span", all.some((s: { kind: string }) => s.kind === "judgment"));
}

// append: any harness pipes span lines in.
{
  const dir = venture({ traces: true });
  const n = append(dir, [
    JSON.stringify({ name: "invoke_agent grokbot", kind: "agent", span_id: "a1", trace_id: "run1" }),
    JSON.stringify({ name: "execute_tool strategy", kind: "tool", span_id: "t1", trace_id: "run1", parent_span_id: "a1" }),
  ].join("\n"), "grok-1");
  ok("append writes each line to the named session", n === 2 && sessions(dir).join() === "grok-1" && spans(dir, "grok-1")[1].parent_span_id === "a1");
  let threw = false;
  try { append(dir, "{nope", "grok-1"); } catch { threw = true; }
  ok("append refuses a line that is not JSON", threw);
  const off = venture({});
  let code = 0;
  try { append(off, JSON.stringify({ name: "x", kind: "agent" })); } catch (e) { code = (e as { code?: number }).code ?? 0; }
  ok("append refuses when traces are off (exit 3)", code === 3);

  const cli = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/naive.mjs"), "trace", "show", "grok-1", "--venture", dir], { encoding: "utf8" });
  ok("naive trace show prints a session as a tree", cli.status === 0 && cli.stdout.includes("agent") && cli.stdout.includes("  tool"), cli.stderr);
  const check = spawnSync("node", [join(repo, "packages/naive/src/checks/check-traces.ts"), dir], { encoding: "utf8" });
  ok("check-traces passes from the command line", check.status === 0, check.stderr);
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("traces: all passing");
