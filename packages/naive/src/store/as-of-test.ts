// Tests for the blob store and as-of reads (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md,
// "As-of reads (Naive)", build plan item 2): a record written three times through the router reads back, as of each
// write's transaction time, as that write and nothing later; a time before the first write reads null; the same
// content twice is one blob; a version with no blob (written before the store existed) reads null and never an older
// version; a damaged blob is never served; a move ends the old path. Every venture lives in a temporary workspace.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../router/router.mjs";
import { entries, record } from "../core/provenance.mjs";
import { BLOBS, blobFile, blobHash, readBlob } from "../core/blobs.mjs";
import { pathsAsOf, readAsOf } from "./as-of.mjs";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "as-of-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
const cli = (...a: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a], { encoding: "utf8", env });
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const text = (o: unknown): string => JSON.stringify(o, null, 2) + "\n";
const solution = (statement: string) => ({ venture: "asof", statement, alternatives: ["a receptionist"], evidence: [] });
const FILE = "validation/solution.json";
const ROUTE = "validation/solution";

interface Line { at: string, entity: string, activity: string, sha256: string }
interface Reply { ok: boolean, error?: string, result?: { written?: string, draft?: boolean } }

try {
  const made = cli("init", join(ws, "ventures/asof"), "--id", "asof", "--layers", "purpose");
  if (made.status !== 0) throw new Error(made.stderr);
  const dir = join(ws, "ventures/asof");
  const blobs = (): string[] => existsSync(join(dir, BLOBS)) ? readdirSync(join(dir, BLOBS), { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name) : [];
  const write = async (input: unknown): Promise<Reply> => await call({ venture: "asof", route: ROUTE, action: "write", input, workspace: ws, actor: "person" }) as Reply;
  const linesFor = (entity: string): Line[] => (entries(dir) as Line[]).filter((l) => l.entity === entity);
  const ms = (iso: string) => Date.parse(iso);

  // Three writes through the router, a few milliseconds apart so each has its own transaction time.
  const versions = [solution("first"), solution("second"), solution("third")];
  for (const v of versions) {
    const r = await write(v);
    if (!r.ok || r.result?.draft) throw new Error(`write failed: ${JSON.stringify(r)}`);
    await pause(5);
  }
  const lines = linesFor(FILE);
  expect("each write through the router is a provenance line", lines.length === 3, JSON.stringify(lines));
  const [t1, t2, t3] = lines.map((l) => l.at);
  expect("each line's blob holds the bytes its sha256 names", lines.every((l, i) => readBlob(dir, l.sha256)?.toString("utf8") === text(versions[i]) && blobHash(text(versions[i])) === l.sha256));

  const read = (t: string | number, what = FILE) => readAsOf(dir, what, t)?.content ?? null;
  expect("as of the first write's time, the first content", read(t1) === text(versions[0]), String(read(t1)));
  expect("as of a moment before the second write, still the first content and nothing later", read(ms(t2) - 1) === text(versions[0]));
  expect("as of the second write's time, the second content", read(t2) === text(versions[1]));
  expect("as of the third write's time, the third content", read(t3) === text(versions[2]));
  expect("as of now, the third content", read(Date.now()) === text(versions[2]));
  expect("a time before the first write reads null", readAsOf(dir, FILE, ms(t1) - 1) === null);
  expect("a route reads the record it was written to", read(t2, ROUTE) === text(versions[1]));
  expect("an as-of read answers with the line it came from", JSON.stringify(readAsOf(dir, FILE, t2) && { ...readAsOf(dir, FILE, t2), content: undefined }) === JSON.stringify({ entity: FILE, at: t2, activity: "write", sha256: lines[1].sha256 }));
  expect("a time is a Date, an ISO string or milliseconds", readAsOf(dir, FILE, new Date(t1))?.content === text(versions[0]) && readAsOf(dir, FILE, ms(t1))?.content === text(versions[0]));
  let threw = false;
  try { readAsOf(dir, FILE, "not a time"); } catch { threw = true; }
  expect("a value that is not a time is refused", threw);
  expect("a path never written reads null", readAsOf(dir, "validation/nothing.json", Date.now()) === null);
  expect("the record's paths as of a time before the first write leave it out, and as of the first write hold it",
    !pathsAsOf(dir, ms(t1) - 1).includes(FILE) && pathsAsOf(dir, t1).includes(FILE), JSON.stringify(pathsAsOf(dir, t1)));

  // The current file is never read: a change outside the router does not reach an as-of read.
  writeFileSync(join(dir, FILE), text(solution("edited by hand")));
  expect("an edit outside the router does not change what as of now reads", read(Date.now()) === text(versions[2]));

  // The same content twice stores one blob.
  const before = blobs().length;
  await pause(5);
  const again = await write(versions[0]);
  const fourth = linesFor(FILE)[3];
  expect("writing the first content again is a fourth line with the first line's sha256", again.ok && fourth?.sha256 === lines[0].sha256, JSON.stringify(fourth));
  expect("the same content twice stores one blob", blobs().length === before, `${before} then ${blobs().length}`);
  expect("as of the fourth write, the first content; as of the third, still the third", read(fourth.at) === text(versions[0]) && read(t3) === text(versions[2]));

  // A version with no blob, as for a line written before the store existed, reads null and never an older version.
  const second = blobFile(dir, lines[1].sha256);
  const kept = readFileSync(second);
  rmSync(second);
  expect("a version whose blob is missing reads null", readAsOf(dir, FILE, t2) === null);
  expect("the version before it still reads", read(t1) === text(versions[0]));
  expect("a path whose version has no blob is not listed", !pathsAsOf(dir, t2).includes(FILE));
  writeFileSync(second, "not the bytes this name promises\n");
  expect("a damaged blob is never served", readAsOf(dir, FILE, t2) === null);
  writeFileSync(second, kept);

  // A draft line is not the record: as of it, the record reads as before.
  await pause(5);
  const held = record(dir, { entity: FILE, activity: "draft", agent: { kind: "agent", via: "cli" }, content: text(solution("held")), sha256: blobHash(text(solution("held"))), note: "test draft" }) as Line;
  expect("a draft line stores its blob", readBlob(dir, held.sha256)?.toString("utf8") === text(solution("held")));
  expect("as of a draft line, the record reads as it was before it", read(held.at) === text(versions[0]));

  // A move ends the old path: as of the move it reads null, and the new path reads the content.
  await pause(5);
  renameSync(join(dir, "validation/solution.json"), join(dir, "validation/moved.json"));
  const move = record(dir, { entity: "validation/moved.json", activity: "move", agent: { kind: "person", via: "cli" }, derived_from: [FILE], note: "test move" }) as Line;
  expect("as of a move, the old path reads null", readAsOf(dir, FILE, move.at) === null);
  expect("as of a move, the new path reads the moved content", read(move.at, "validation/moved.json") === text(versions[0]));
  expect("as of a move, the paths hold the new path and not the old one", pathsAsOf(dir, move.at).includes("validation/moved.json") && !pathsAsOf(dir, move.at).includes(FILE));
  expect("as of a time before the move, the old path still reads", read(t3) === text(versions[2]));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.error(`${failed} as-of check(s) failed`); process.exit(1); }
console.log("as-of reads: ok");
