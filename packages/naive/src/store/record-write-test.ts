// Tests the shared record writer (packages/naive/src/store/record-write.ts): a record that matches its schema is
// written where the venture's layout puts it and logged with its bytes; one that does not match is refused and
// nothing is written or logged; a text file is written and logged without a schema; an as-of read returns each version.
//
//   node packages/naive/src/store/record-write-test.ts

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { readAsOf } from "./as-of.ts";
import { recordTypeAt, writeRecord, writerFromEnv } from "./record-write.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const dir = mkdtempSync(join(tmpdir(), "record-write-test-"));
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const person = { kind: "person", via: "test", id: "ada" };

// The record type a path belongs to.
expect("an artifact path belongs to the artifact type", recordTypeAt("artifacts/pitch-reading-copy.json")?.schema === "artifact.schema.json", JSON.stringify(recordTypeAt("artifacts/pitch-reading-copy.json")));
expect("a handoff path belongs to the handoff type", recordTypeAt("operations/handoffs/h1.json")?.id === "handoff");
expect("a named file beats the folder pattern around it", recordTypeAt("operations/activity/_summary.json")?.id === "activity-summary" && recordTypeAt("operations/activity/2026-11-27.json")?.id === "activity");
expect("a path no record type claims has none", recordTypeAt("notes/anything.txt") === null);

// A record that matches its schema.
const artifact = { id: "pitch-reading-copy", kind: "document", title: "Pitch", audience: "investors", format: "md", built_at: "2026-11-27T00:00:00Z", built_from: [{ record: "venture.json" }], output: { path: "artifacts/out/pitch.md", sha256: "a".repeat(64) } };
const FILE = "artifacts/pitch-reading-copy.json";
let first: ReturnType<typeof writeRecord> | null = null;
try { first = writeRecord(dir, FILE, artifact, { agent: person, activity: "create", note: "first" }); } catch (e) { expect("a valid record is written", false, String(e)); }
const text = `${JSON.stringify(artifact, null, 2)}\n`;
expect("a valid record is written as JSON with a trailing newline", existsSync(ventureFile(dir, FILE)) && readFileSync(ventureFile(dir, FILE), "utf8") === text);
const lines = entries(dir);
expect("the write is logged once, with who and what", lines.length === 1 && lines[0].entity === FILE && lines[0].activity === "create" && lines[0].agent?.id === "ada" && lines[0].note === "first", JSON.stringify(lines));
expect("the returned line is the logged line", first?.hash === lines[0]?.hash);

// A record that does not match its schema.
let refused: unknown = null;
try { writeRecord(dir, "artifacts/bad.json", { id: "bad" }, { agent: person }); } catch (e) { refused = e; }
const tag = refused && typeof refused === "object" && "_tag" in refused ? refused._tag : null;
expect("a record its schema refuses fails with SchemaInvalid", tag === "SchemaInvalid", String(refused));
expect("and nothing is written", !existsSync(ventureFile(dir, "artifacts/bad.json")));
expect("and nothing is logged", entries(dir).length === 1);

// A second version, and as-of reads of both.
await pause(15);
const cut = new Date().toISOString();
await pause(15);
writeRecord(dir, FILE, { ...artifact, title: "Pitch, second" }, { agent: person });
expect("activity is write when the caller names none", entries(dir).at(-1)?.activity === "write");
const titleAsOf = (t: string): string | null => { const v = readAsOf(dir, FILE, t); return v ? (JSON.parse(String(v.content)) as { title: string }).title : null; };
const before = titleAsOf(cut);
const now = titleAsOf(new Date().toISOString());
expect("an as-of read before the second write returns the first", before === "Pitch", String(before));
expect("an as-of read now returns the second", now === "Pitch, second", String(now));

// A text file: written and logged, with no schema.
writeRecord(dir, "artifacts/out/pitch.md", "# Pitch\n", { agent: person, activity: "create" });
expect("a text file is written as given", readFileSync(ventureFile(dir, "artifacts/out/pitch.md"), "utf8") === "# Pitch\n");
expect("and logged", entries(dir).at(-1)?.entity === "artifacts/out/pitch.md");

// Who is writing, from the environment.
const saved = { actor: process.env.MENTURA_ACTOR, id: process.env.MENTURA_ACTOR_ID, model: process.env.MENTURA_MODEL };
delete process.env.MENTURA_ACTOR; delete process.env.MENTURA_ACTOR_ID; delete process.env.MENTURA_MODEL;
expect("with no acting agent the writer is a person, named when the caller knows the name", writerFromEnv("cli", "ada").kind === "person" && writerFromEnv("cli", "ada").id === "ada");
process.env.MENTURA_ACTOR = "agent"; process.env.MENTURA_ACTOR_ID = "finance-agent";
expect("with an acting agent the writer is that agent, whatever name the caller passes", writerFromEnv("cli", "ada").kind === "agent" && writerFromEnv("cli", "ada").id === "finance-agent");
for (const [k, v] of [["MENTURA_ACTOR", saved.actor], ["MENTURA_ACTOR_ID", saved.id], ["MENTURA_MODEL", saved.model]] as const) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }

rmSync(dir, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("record writer: a valid record is written and logged, an invalid one is refused, and each version reads back as of its time");
