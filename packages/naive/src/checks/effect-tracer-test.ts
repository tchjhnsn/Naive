// Tests NaiveTracer (phase 5 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md): an Effect.fn run in a
// venture runtime writes chained spans that check-traces.ts accepts, nested under their Effect parent and under an
// instrumentation span the run started inside, with a failure as status error, and nothing with traces off.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { asKind, inSession } from "../core/effect/tracer.ts";
import { ventureRuntime } from "../core/effect/runtime.ts";
import { sessions, spans, withSpan } from "../core/instrumentation.ts";
import { recordProvenance } from "../core/effect/provenance.ts";
import { entries } from "../core/provenance.ts";
import { checkVenture } from "./check-traces.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
delete process.env.NAIVE_TRACES;
delete process.env.MENTURA_SESSION;
const venture = (traces: boolean) => {
  const dir = mkdtempSync(join(tmpdir(), "naive-tracer-"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t" }));
  if (traces) writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ traces: true }));
  return dir;
};

const child = Effect.fn("child step")(function* (n: number) { yield* Effect.annotateCurrentSpan("naive.n", n); return n * 2; });
const parent = Effect.fn("parent step")(function* () { return yield* child(21); });

await test("an Effect.fn run writes chained spans that check-traces accepts", async () => {
  const dir = venture(true);
  const rt = ventureRuntime(dir);
  assert.equal(await rt.runPromise(parent().pipe(Effect.withSpan("run", { attributes: { ...inSession("s1"), ...asKind("agent") } }))), 42);
  await rt.dispose();
  assert.deepEqual(sessions(dir), ["s1"]);
  const lines = spans(dir, "s1");
  assert.deepEqual(lines.map((l) => l.name), ["child step", "parent step", "run"]);
  const [c, p, r] = lines;
  assert.equal(c.parent_span_id, p.span_id);
  assert.equal(p.parent_span_id, r.span_id);
  assert.equal(r.parent_span_id, undefined);
  assert.equal(new Set(lines.map((l) => l.trace_id)).size, 1);
  assert.equal(r.kind, "agent");
  assert.equal(c.kind, "call");
  assert.equal(c.attributes?.["naive.n"], 21);
  assert.equal(r.attributes?.["naive.session"], undefined);
  assert.ok(lines.every((l) => l.status === "ok"));
  const report = checkVenture(dir);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.spans, 3);
  rmSync(dir, { recursive: true });
});

await test("a failure is status error with its message", async () => {
  const dir = venture(true);
  const rt = ventureRuntime(dir);
  const failing = Effect.fn("failing step")(function* () { return yield* Effect.fail(new Error("no record")); });
  await assert.rejects(rt.runPromise(failing().pipe(Effect.withSpan("run", { attributes: inSession("s2") }))));
  await rt.dispose();
  const [f, r] = spans(dir, "s2");
  assert.equal(f.status, "error");
  assert.match(String(f.error), /no record/);
  assert.equal(r.status, "error");
  assert.deepEqual(checkVenture(dir).errors, []);
  rmSync(dir, { recursive: true });
});

await test("an Effect run inside withSpan nests under it and shares its session", async () => {
  const dir = venture(true);
  const rt = ventureRuntime(dir);
  await withSpan(dir, { name: "agent run", kind: "agent", session: "s3" }, () => rt.runPromise(parent()));
  await rt.dispose();
  const lines = spans(dir, "s3");
  assert.deepEqual(lines.map((l) => l.name), ["child step", "parent step", "agent run"]);
  assert.equal(lines[1].parent_span_id, lines[2].span_id);
  assert.equal(lines[1].trace_id, lines[2].trace_id);
  const report = checkVenture(dir);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  rmSync(dir, { recursive: true });
});

await test("with traces off nothing is written and the run still answers", async () => {
  const dir = venture(false);
  const rt = ventureRuntime(dir);
  assert.equal(await rt.runPromise(parent()), 42);
  await rt.dispose();
  assert.deepEqual(sessions(dir), []);
  rmSync(dir, { recursive: true });
});

await test("a provenance line written inside an Effect span names it, and none is named with traces off", async () => {
  for (const on of [true, false]) {
    const dir = venture(on);
    writeFileSync(join(dir, "a.json"), "{}");
    const rt = ventureRuntime(dir);
    await rt.runPromise(recordProvenance(dir, { entity: "a.json", activity: "write", agent: { kind: "agent", via: "cli" } }).pipe(Effect.withSpan("write a", { attributes: inSession("s5") })));
    await rt.dispose();
    const [line] = entries(dir);
    if (on) {
      const [s] = spans(dir, "s5");
      assert.equal(line.span?.span_id, s.span_id);
      assert.equal(line.span?.session, "s5");
    } else assert.equal(line.span, undefined);
    const report = checkVenture(dir);
    assert.deepEqual(report.errors, []);
    rmSync(dir, { recursive: true });
  }
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
