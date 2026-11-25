// Tests re-chaining a working copy's provenance onto a business store's chain (packages/naive/src/core/rechain.ts,
// EE-177): what a re-chained line keeps, what rechain refuses, and what check-provenance refuses once the lines
// are in a store's log. The breaking copies all keep the store chain itself holding, so each failure is the
// rechained_from block's and not the chain check's.
//
//   node packages/naive/src/core/rechain-test.ts

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries, lineHash, LOG, record, type Entry } from "./provenance.ts";
import { isRechained, originalHash, rechain, rechainProblem } from "./rechain.ts";
import { naiveScript } from "./scripts.ts";
import { ventureFile } from "./venture-paths.ts";

let failed = 0, n = 0;
const expect = (name: string, ok: unknown, detail: unknown = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const throws = (name: string, f: () => unknown, pattern: RegExp) => {
  try { f(); expect(name, false, "nothing was thrown"); }
  catch (e) { const m = e instanceof Error ? e.message : String(e); expect(name, pattern.test(m), m); }
};

const tmp = mkdtempSync(join(tmpdir(), "naive-rechain-test-"));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

// A venture folder with a record in it, so a provenance line has a file to name.
function venture(name: string, files: Record<string, string>): string {
  const dir = join(tmp, name);
  mkdirSync(join(dir, "finance"), { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: name, name, parent: null, phase: "discovery", owner: "Torian" }, null, 2));
  for (const [path, text] of Object.entries(files)) writeFileSync(join(dir, path), text);
  return dir;
}

// One line of a log, built the way provenance.ts builds one. The working copy's log is written by hand so that
// its times are days before the store's, which is what an offline working copy looks like.
const line = (prev: string, fields: Omit<Entry, "hash" | "prev">): Entry => {
  const f: Omit<Entry, "hash"> = { ...fields, prev };
  return { ...f, hash: lineHash(prev, f) };
};
/** A line's hash computed again for its current content, so an edit does not break the chain check as well. */
const rehash = (e: Entry): Entry => { const { hash: _h, ...rest } = e; return { ...rest, hash: lineHash(e.prev, rest) }; };

const SPEND = JSON.stringify({ id: "q4", amount: 1200, currency: "USD" }, null, 2);
const TOOLS = JSON.stringify({ id: "tools", amount: 300, currency: "USD" }, null, 2);
const person = { kind: "person", via: "cli", id: "Torian" };

// The working copy: two writes made offline, on 2026-11-20.
const localLines: Entry[] = [];
{
  const first = line("genesis", { at: "2026-11-20T09:00:00.000Z", entity: "finance/spend.json", route: "finance/spend", activity: "write", agent: person, sha256: sha(SPEND) });
  localLines.push(first, line(first.hash, { at: "2026-11-20T09:05:00.000Z", entity: "finance/tools.json", route: "finance/spend", activity: "write", agent: person, sha256: sha(TOOLS) }));
}

// The store: one write of its own, made later, through record(), so the chain under the re-chained lines is real.
const store = venture("store", { "finance/budget.json": JSON.stringify({ id: "2027", amount: 50000 }, null, 2) });
record(store, { entity: "finance/budget.json", route: "finance/budget", activity: "write", agent: { kind: "person", via: "cli", id: "Ada" } });
const storeLines = entries(store);
const tip = storeLines.at(-1)?.hash ?? "genesis";

const re = rechain(tip, localLines, "laptop");

expect("the first re-chained line chains onto the store tip, and the rest onto each other", re.length === 2 && re[0]?.prev === tip && re[1]?.prev === re[0]?.hash, re.map((e) => e.prev));
expect("every re-chained line's hash matches its content, so the store chain holds", re.every((e) => e.hash === lineHash(e.prev, e)), re.map((e) => e.hash));
expect("a re-chained line keeps the write as the working copy wrote it", re.every((e, i) => {
  const { hash: _h, prev: _p, rechained_from: _r, ...kept } = e;
  const { hash: _h2, prev: _p2, ...was } = localLines[i] as Entry;
  return JSON.stringify(kept) === JSON.stringify(was);
}), re[0]);
expect("rechained_from names the original hash, the original prev and the working copy", re.every((e, i) => e.rechained_from.hash === localLines[i]?.hash && e.rechained_from.prev === localLines[i]?.prev && e.rechained_from.working_copy === "laptop"), re.map((e) => e.rechained_from));
expect("the original hash is recomputed from the re-chained line alone", re.every((e, i) => originalHash(e) === localLines[i]?.hash));
expect("a well formed re-chained line has nothing wrong with it", re.every((e) => rechainProblem(e) === null && isRechained(e)));
expect("a line that was never re-chained has nothing wrong with it either", localLines.every((e) => rechainProblem(e) === null && !isRechained(e)));
expect("re-chaining the same lines onto the same tip gives the same hashes", JSON.stringify(rechain(tip, localLines, "laptop")) === JSON.stringify(re));
expect("re-chaining onto a different tip gives different hashes, so a line belongs to one chain", rechain("genesis", localLines, "laptop")[0]?.hash !== re[0]?.hash);

// What rechain refuses.
throws("re-chaining with no working copy named is refused", () => rechain(tip, localLines, "  "), /names the working copy/);
throws("a store tip that is not a line hash is refused", () => rechain("nope", localLines, "laptop"), /store tip is a line hash or genesis/);
throws("a local line edited after it was written is refused", () => rechain(tip, [{ ...(localLines[0] as Entry), entity: "finance/other.json" }], "laptop"), /hash does not match the line's content/);
throws("lines that are not one run of a log are refused", () => rechain(tip, [localLines[0] as Entry, rehash({ ...(localLines[1] as Entry), prev: "genesis" })], "laptop"), /not one run of a log/);
throws("a line that was already re-chained is refused", () => rechain(tip, re, "other-laptop"), /re-chaining a re-chained line is not built/);

// What rechainProblem refuses. Each copy keeps the line's own hash right, so the store chain still holds.
const block = (e: Entry) => (e as { rechained_from: { hash: string; prev: string; working_copy: string } }).rechained_from;
const bad = (name: string, change: (e: Entry) => Entry, pattern: RegExp) => {
  const e = change(structuredClone(re[1]) as Entry);
  const problem = rechainProblem(e);
  expect(name, problem !== null && pattern.test(problem), problem);
};
bad("a tampered original hash is refused", (e) => { block(e).hash = sha("not this line"); return rehash(e); }, /not this line as the working copy wrote it/);
bad("a tampered original prev is refused", (e) => { block(e).prev = "genesis"; return rehash(e); }, /not this line as the working copy wrote it/);
bad("an edited field is refused even when the chain was rewritten around it", (e) => { e.note = "someone else's note"; return rehash(e); }, /not this line as the working copy wrote it/);
bad("an original hash that is not a hash is refused", (e) => { block(e).hash = "nope"; return rehash(e); }, /names no original hash/);
bad("an original prev that is not a chain point is refused", (e) => { block(e).prev = "nope"; return rehash(e); }, /names no original prev/);
bad("a block with no working copy is refused", (e) => { Reflect.deleteProperty(block(e), "working_copy"); return rehash(e); }, /names no working copy/);
bad("a blank working copy is refused", (e) => { block(e).working_copy = " "; return rehash(e); }, /names no working copy/);
bad("a block that is not a block is refused", (e) => rehash({ ...e, rechained_from: "laptop" } as unknown as Entry), /not a block/);

// The schema and rechain agree: a line rechain writes passes provenance-entry.schema.json, which allows this
// block and nothing else in it. validate.ts runs as a child process, so core imports no other unit.
let wrote = 0;
const validate = (value: unknown) => {
  const file = join(tmp, `line${++wrote}.json`);
  writeFileSync(file, JSON.stringify(value));
  return spawnSync("node", [naiveScript("validate.ts"), "--schema", "provenance-entry.schema.json", "--file", file], { encoding: "utf8" });
};
const schemaPass = validate(re[0]);
expect("a re-chained line passes the provenance line schema", schemaPass.status === 0, schemaPass.stdout + schemaPass.stderr);
expect("the schema refuses a block with no working copy", validate({ ...(re[0] as Entry), rechained_from: { hash: (re[0] as Entry).rechained_from?.hash, prev: "genesis" } }).status === 1);
expect("the schema refuses a field the block does not have", validate({ ...(re[0] as Entry), rechained_from: { ...block(structuredClone(re[0]) as Entry), pushed_at: "2026-11-25T00:00:00.000Z" } }).status === 1);

// check-provenance on a store log that holds the re-chained lines. The files they name are in the store too,
// so the last line for each record matches the content there, as it does after a push.
writeFileSync(join(store, "finance/spend.json"), SPEND);
writeFileSync(join(store, "finance/tools.json"), TOOLS);
appendFileSync(ventureFile(store, LOG), re.map((e) => JSON.stringify(e)).join("\n") + "\n");

const check = (dir: string) => spawnSync("node", [naiveScript("check-provenance.ts"), dir], { encoding: "utf8" });
const passed = check(store);
expect("check-provenance passes on a store chain with re-chained lines in it", passed.status === 0, passed.stdout + passed.stderr);
expect("a re-chained line's older time is not time going backwards", !/time goes backwards/.test(passed.stderr), passed.stderr);

// Each broken copy edits the last line, the second re-chained one, and keeps that line's own hash right.
const brokenStore = (name: string, change: (e: Entry) => Entry, pattern: RegExp) => {
  const dir = join(tmp, `broken${++n}`);
  cpSync(store, dir, { recursive: true });
  const log = ventureFile(dir, LOG);
  const lines = readFileSync(log, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Entry);
  lines[lines.length - 1] = change(lines[lines.length - 1] as Entry);
  writeFileSync(log, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  const r = check(dir);
  expect(name, r.status === 1 && pattern.test(r.stderr), r.stderr);
};
brokenStore("check-provenance refuses a tampered original hash", (e) => { block(e).hash = sha("not this line"); return rehash(e); }, /not this line as the working copy wrote it/);
brokenStore("check-provenance refuses a re-chained line whose prev no longer names the line before", (e) => rehash({ ...e, prev: "genesis" }), /chain broken/);
brokenStore("check-provenance refuses a block with no working copy", (e) => { Reflect.deleteProperty(block(e), "working_copy"); return rehash(e); }, /names no working copy/);
brokenStore("check-provenance refuses a re-chained line edited after the push", (e) => { e.entity = "finance/budget.json"; return rehash(e); }, /not this line as the working copy wrote it/);

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("all passed");
