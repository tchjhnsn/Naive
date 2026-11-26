#!/usr/bin/env node
// A time box write through the router (EE-186): the end must be after the start, or the write is refused.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 400)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "time-box-write-"));
const dir = join(ws, "v");
const box = { kind: "sprint", title: "Launch", goal: "Ship it", status: "active", functions: ["strategy"] };

try {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", departments: ["strategy"] }));
  const bad = await call({ venture: "v", workspace: ws, route: "operations/time-box/bad", action: "write", actor: "person", input: { ...box, id: "bad", starts: "tomorrow", ends: "2026-06-01T00:00:00.000Z" } });
  expect("a time box whose end is not after its start is refused", !bad.ok && /end after it starts/.test(bad.ok ? "" : (bad.error ?? "")), bad);
  const early = await call({ venture: "v", workspace: ws, route: "operations/time-box/early", action: "write", actor: "person", input: { ...box, id: "early", starts: "2026-06-02T00:00:00.000Z", ends: "2026-06-01T00:00:00.000Z" } });
  expect("an end on or before the start is refused", !early.ok, early);
  const good = await call({ venture: "v", workspace: ws, route: "operations/time-box/good", action: "write", actor: "person", input: { ...box, id: "good", starts: "2026-06-01T00:00:00.000Z", ends: "2026-06-20T00:00:00.000Z" } });
  const wrote = good.ok && (good.result as { draft?: boolean }).draft === false;
  expect("a time box that ends after it starts is written", wrote && readFileSync(join(dir, "operations/time-boxes/good.json"), "utf8").includes("\"good\""), good);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("time box write: all passed");
