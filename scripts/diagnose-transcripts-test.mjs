// Tests transcript diagnosis on fixture transcripts: only the human's words, secrets redacted, a cursor, one raw
// source per run, matches against known frameworks, and the model pass off unless asked for.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diagnose } from "./diagnose-transcripts.mjs";
import { redact } from "../schema/redact.mjs";

const fixtures = new URL("./fixtures/transcripts", import.meta.url).pathname;
const root = mkdtempSync(join(tmpdir(), "naive-diag-"));
writeFileSync(join(root, "venture.json"), "{}");
const dir = join(root, "..", `${root.split("/").pop()}-transcripts`);
cpSync(fixtures, dir, { recursive: true });
const FAKE = "lsv2_pt_0123456789abcdef0123456789abcdef_ab12cd34ef";

// redaction covers the shapes named
for (const s of [FAKE, "sk-" + "x".repeat(30), "ghp_" + "y".repeat(36), "AKIA" + "ABCDEFGHIJKLMNOP", "a".repeat(48), "f00d".repeat(10), "me@example.com"]) assert.ok(!redact(`x ${s} y`).includes(s), s);

const r = await diagnose({ root, dir, now: new Date("2026-10-30T02:00:00Z"), env: {} });
assert.equal(r.messages, 2, "only the human's own messages: no assistant, tool result or meta lines");
const out = join(root, "raw/sources/diagnosis-2026-10-30");
const text = readFileSync(join(out, "text.md"), "utf8");
const source = JSON.parse(readFileSync(join(out, "source.json"), "utf8"));
assert.deepEqual(Object.keys(source).sort(), ["fetched", "id", "origin", "title"], "source.json keeps to raw-source.schema.json");
assert.ok(!text.includes(FAKE) && !text.includes("lsv2_pt_0123"), "the planted secret is redacted");
assert.ok(!text.includes("someone@example.com"), "emails are redacted");
assert.match(text, /thinking framework called the ledger lens/);
assert.match(text, /playbook for weekly reviews/);
assert.ok(!/ignore reminders|tool output ignored|meta ignored|build a playbook for everything/.test(text));
assert.match(text, /session-a\.jsonl, 2026-10-29T10:00:00Z/);
assert.match(text, /matches framework telos/, "an item with a record is marked as matched");
assert.match(text, /## Missed[\s\S]*ledger lens[\s\S]*## Already recorded/, "the missed items stand out first");
// nothing written outside the venture besides reading the transcripts
assert.deepEqual(readdirSync(root).sort(), [".naive", "raw", "venture.json"]);
assert.equal(JSON.parse(readFileSync(join(root, ".naive/diagnose-cursor.json"), "utf8")).last_timestamp, "2026-10-29T10:02:00Z");

// a second run reads nothing new and writes a separate draft
const again = await diagnose({ root, dir, now: new Date("2026-10-30T03:00:00Z"), env: {} });
assert.equal(again.messages, 0);
assert.ok(existsSync(join(root, "raw/sources/diagnosis-2026-10-30-2")));

// the model pass runs only with the flag, on redacted text
const mod = join(root, "..", `${root.split("/").pop()}-model.mjs`);
writeFileSync(mod, `export default async (ms) => { globalThis.__seen = ms; return [{ kind: "decision", quote: "decide on " + ${JSON.stringify(FAKE)} }]; };`);
await assert.rejects(diagnose({ root, dir, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL: "1" } }), /MODULE/);
const m = await diagnose({ root, dir, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL: "1", NAIVE_DIAGNOSE_MODEL_MODULE: mod } });
assert.ok(globalThis.__seen.every((x) => !x.text.includes(FAKE)), "the model sees redacted text only");
assert.ok(m.candidates.some((c) => c.by === "model" && !c.quote.includes(FAKE)));
delete globalThis.__seen;
const off = await diagnose({ root, dir, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL_MODULE: mod } });
assert.ok(!off.candidates.some((c) => c.by === "model") && globalThis.__seen === undefined, "off by default");
console.log("transcript diagnosis: human words only, redacted first, cursor, one draft per run, model pass off by default");
