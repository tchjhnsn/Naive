// Tests the one clock (packages/naive/src/core/clock.ts, EE-224): NAIVE_NOW pins business time for every reader,
// an unreadable NAIVE_NOW refuses instead of falling back, a hosted run ignores it, Effect's Clock agrees, a
// provenance line written under it carries the pinned time, and check-clock fails on a module that reads the
// system clock directly.
//
//   node packages/naive/src/checks/check-clock-test.ts

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Clock, Effect } from "effect";
import { findings } from "./check-clock.ts";
import { now as engineNow } from "../engine/clock.ts";
import { naiveClock, now, nowIso, nowMs, pinned, wallClock, withNaiveClock } from "../core/clock.ts";
import { record } from "../core/provenance.ts";

let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const AT = "2027-03-01T09:00:00.000Z";
delete process.env.NAIVE_RUNTIME;
delete process.env.NAIVE_NOW;

const before = wallClock();
expect("unpinned, now() follows the system clock", Math.abs(nowMs() - before) < 5_000 && pinned() === null, { nowMs: nowMs(), before });

process.env.NAIVE_NOW = AT;
expect("NAIVE_NOW pins now(), nowMs() and nowIso()", now().toISOString() === AT && nowMs() === Date.parse(AT) && nowIso() === AT, nowIso());
expect("the engine clock reads the same instant", engineNow().toISOString() === AT, engineNow().toISOString());
expect("wallClock() is never pinned", Math.abs(wallClock() - before) < 5_000, wallClock());
expect("Effect's Clock reads business time under withNaiveClock", Effect.runSync(withNaiveClock(Clock.currentTimeMillis)) === Date.parse(AT));
expect("naiveClock gives nanoseconds of the same instant", naiveClock.currentTimeNanosUnsafe() === BigInt(Date.parse(AT)) * 1_000_000n);
const t0 = wallClock();
await Effect.runPromise(withNaiveClock(Effect.sleep("20 millis")));
expect("sleeping under the naive clock waits in real time", wallClock() - t0 >= 15, wallClock() - t0);

const dir = mkdtempSync(join(tmpdir(), "naive-clock-test-"));
writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "clock", name: "clock", parent: null, phase: "discovery", owner: "Ada" }, null, 2));
mkdirSync(join(dir, "finance"), { recursive: true });
writeFileSync(join(dir, "finance/budget.json"), "{}\n");
const line = record(dir, { entity: "finance/budget.json", route: "finance/budget", activity: "write", agent: { kind: "person", via: "cli", id: "Ada" } });
expect("a provenance line written under NAIVE_NOW carries the pinned time", line.at === AT, line.at);

process.env.NAIVE_NOW = "the first of March";
let refused = "";
try { now(); } catch (e) { refused = String(e); }
expect("an unreadable NAIVE_NOW refuses instead of falling back to the system clock", /NAIVE_NOW is not a date/.test(refused), refused);

process.env.NAIVE_RUNTIME = "hosted";
process.env.NAIVE_NOW = AT;
expect("a hosted run ignores NAIVE_NOW", pinned() === null && Math.abs(nowMs() - wallClock()) < 5_000, nowIso());
delete process.env.NAIVE_RUNTIME;
delete process.env.NAIVE_NOW;

const bad = findings("packages/naive/src/engine/x.ts", "const a = 1;\nconst at = new Date().toISOString();\n// Date.now() in a comment\nconst t = Date.now();\nconst d = new Date(at);\n");
expect("check-clock finds new Date() and Date.now() and skips comments and dated constructors", bad.length === 2 && bad[0].line === 2 && bad[1].line === 4, bad);
expect("check-clock leaves the clock itself and tests alone", findings("packages/naive/src/core/clock.ts", "Date.now()").length === 0 && findings("packages/naive/src/engine/x-test.ts", "new Date()").length === 0);

console.log(failed ? `\n${failed} failed` : "\nclock: all pass");
process.exit(failed ? 1 : 0);
