// Tests transcript diagnosis on fixture transcripts: only the human's words, secrets redacted, a cursor, one raw
// source per run, matches against known frameworks, and the model pass off unless asked for.
import assert from "node:assert/strict";
import { utimesSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { diagnose, heuristicCandidates, humanText, isDue, sha256 } from "./diagnose-transcripts.mjs";
import { redact } from "../schema/redact.mjs";

const fixtures = new URL("./fixtures/transcripts", import.meta.url).pathname;
const root = mkdtempSync(join(tmpdir(), "naive-diag-"));
writeFileSync(join(root, "venture.json"), "{}");
const dir = join(root, "..", `${root.split("/").pop()}-transcripts`);
cpSync(fixtures, dir, { recursive: true });
const FAKE = "lsv2_pt_0123456789abcdef0123456789abcdef_ab12cd34ef";

// redaction covers the shapes named
for (const s of [FAKE, "sk-" + "x".repeat(30), "ghp_" + "y".repeat(36), "AKIA" + "ABCDEFGHIJKLMNOP", "a".repeat(48), "f00d".repeat(10), "me@example.com"]) assert.ok(!redact(`x ${s} y`).includes(s), s);

// lowercase and quoted names, Stripe keys and Authorization headers (all values fake)
for (const [t, gone] of [
  ["api_key = fake-key-not-real-123", "fake-key-not-real-123"],
  ['{"password": "fake pass phrase"}', "fake pass phrase"],
  ["sk_live_" + "FAKE0".repeat(5), "FAKE0FAKE0"],
  ["Authorization: token fakeTokenNotReal42", "fakeTokenNotReal42"],
]) { const out = redact(t); assert.ok(!out.includes(gone) && out.includes("[REDACTED"), `${t} -> ${out}`); }
assert.equal(redact('{"password": "fake"}'), '{"password": "[REDACTED:secret]"}', "a JSON value stays a JSON string");
assert.equal(redact(redact("api_key = fake-1")), redact("api_key = fake-1"), "redacting twice changes nothing");
assert.equal(redact("the compass: north"), "the compass: north", "an ordinary word before a colon is kept");
// shell lines the founder ran are not the founder's words
assert.equal(humanText({ type: "user", message: { role: "user", content: "<bash-input>ls -la</bash-input><bash-stdout>secret.txt</bash-stdout><bash-stderr>warn</bash-stderr>keep the ledger" } }), "keep the ledger");
assert.equal(humanText({ type: "user", message: { role: "user", content: "<bash-stdout>only output</bash-stdout>" } }), null);

const r = await diagnose({ root, dir, now: new Date("2026-10-30T02:00:00Z"), env: {}, tz: "UTC" });
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
const again = await diagnose({ root, dir, now: new Date("2026-10-30T03:00:00Z"), env: {}, tz: "UTC" });
assert.equal(again.messages, 0);
assert.ok(existsSync(join(root, "raw/sources/diagnosis-2026-10-30-2")));

// the model pass runs only with the flag, on redacted text
const mod = join(root, "..", `${root.split("/").pop()}-model.mjs`);
writeFileSync(mod, `export default async (ms) => { globalThis.__seen = ms; return [{ kind: "decision", quote: "decide on " + ${JSON.stringify(FAKE)} }]; };`);
await assert.rejects(diagnose({ root, dir, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL: "1" } }), /MODULE/);
const m = await diagnose({ root, dir, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL: "1", NAIVE_DIAGNOSE_MODEL_MODULE: mod }, tz: "UTC" });
assert.ok(globalThis.__seen.every((x) => !x.text.includes(FAKE)), "the model sees redacted text only");
assert.ok(m.candidates.some((c) => c.by === "model" && !c.quote.includes(FAKE)));
delete globalThis.__seen;
const off = await diagnose({ root, dir, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL_MODULE: mod } });
assert.ok(!off.candidates.some((c) => c.by === "model") && globalThis.__seen === undefined, "off by default");

// v2: typed catches, matched against records, with conversation provenance and a threshold
const v2 = mkdtempSync(join(tmpdir(), "naive-diag2-"));
writeFileSync(join(v2, "venture.json"), JSON.stringify({ timeZone: "America/Chicago" }));
mkdirSync(join(v2, "foundation/goals"), { recursive: true });
writeFileSync(join(v2, "foundation/goals/revenue.json"), JSON.stringify({ id: "revenue", statement: "Reach ten paying studios this year", kind: "outcome" }));
writeFileSync(join(v2, "foundation/constraints.json"), JSON.stringify({ must_not: [{ id: "no-ads", statement: "Never sell advertising against founder data" }] }));
const tdir = mkdtempSync(join(tmpdir(), "naive-diag2-t-"));
const line = (o) => JSON.stringify(o);
const H = (ts, text, cwd = v2) => line({ type: "user", timestamp: ts, cwd, message: { role: "user", content: text } });
const A = (ts, text) => line({ type: "assistant", timestamp: ts, message: { role: "assistant", content: [{ type: "text", text }] } });
writeFileSync(join(tdir, "s1.jsonl"), [
  H("2026-10-29T03:00:00Z", "Our goal is to reach ten paying studios this year. We must never sell advertising against founder data."),
  A("2026-10-29T03:00:30Z", "Should we use Postgres or SQLite? Option A or option B."),
  H("2026-10-29T03:01:00Z", "Yes, A."),
  A("2026-10-29T03:01:30Z", "Done."),
  H("2026-10-29T03:02:00Z", "Let's go with weekly billing. I'll ship the pricing page by Friday. Maria is our designer."),
  A("2026-10-29T03:02:30Z", "Noted."),
  H("2026-10-29T03:03:00Z", "You missed the onboarding step, that's not true. The app has to work offline. We promise founders their data stays local."),
  A("2026-10-29T03:03:30Z", "Fixed."),
  H("2026-10-29T03:04:00Z", "How should we price the studio plan for teams?"),
  A("2026-10-29T03:04:30Z", "Per seat."),
  H("2026-10-29T03:05:00Z", "What happens to churn after the first month of usage?"),
].join("\n") + "\n");
writeFileSync(join(tdir, "s2.jsonl"), [
  H("2026-10-30T15:00:00Z", "Again, how should we price the studio plan for small teams?"),
  A("2026-10-30T15:00:10Z", "Per seat, as before."),
].join("\n") + "\n");

// the threshold: under it, not due; over it, due; a new session older than 24 hours is due
const before = new Date("2026-10-29T04:00:00Z");
assert.equal(isDue({ root: v2, dir: tdir, now: before }).due, false, "a quiet day is not due");
writeFileSync(join(v2, "naive.config.json"), JSON.stringify({ diagnose: { threshold: 50 } }));
assert.equal(isDue({ root: v2, dir: tdir, now: before }).due, true, "over the threshold is due");
writeFileSync(join(v2, "naive.config.json"), JSON.stringify({ diagnose: { threshold: 1000000 } }));
const stale = isDue({ root: v2, dir: tdir, now: new Date("2026-10-30T05:00:00Z") });
assert.ok(stale.due && stale.stale_session === "s1.jsonl", "a new session older than 24 hours is due");
assert.ok(!existsSync(join(v2, ".naive")) && !existsSync(join(v2, "raw")), "the check writes nothing");

const r2 = await diagnose({ root: v2, dir: tdir, now: new Date("2026-10-31T12:00:00Z"), env: {} });
const by = (k) => r2.candidates.filter((c) => c.kind === k);
const has = (k, re) => by(k).find((c) => re.test(c.quote));
assert.equal(has("goal", /ten paying studios/)?.status, "recorded", "a goal with a record is recorded");
assert.equal(has("constraint", /never sell advertising/)?.status, "recorded", "a constraint with a record is recorded");
assert.ok(has("decision", /^Yes, A/), "a yes in reply to options is a decision");
assert.equal(has("decision", /weekly billing/)?.status, "missed", "a decision with no record is missed");
assert.ok(has("commitment", /by Friday/), "a dated commitment");
assert.ok(has("person", /Maria is our designer/), "a person and role");
assert.ok(has("correction", /You missed/), "a correction");
assert.ok(has("requirement", /has to work offline/), "a requirement");
assert.ok(has("promise", /We promise/), "a promise");
assert.ok(has("open-question", /churn/), "an unanswered question is open");
assert.ok(!has("open-question", /price the studio plan for teams/), "an answered question is not open");
const frame = has("frame", /price the studio plan/);
assert.ok(frame && frame.asked === 2 && frame.sources.length === 2, "a question asked again is a frame");
// provenance: every heuristic catch cites file, timestamp and the sha256 of the redacted message
for (const c of r2.candidates) assert.ok(c.source.file && c.source.timestamp && /^[0-9a-f]{64}$/.test(c.source.sha256), c.quote);
const g = has("goal", /ten paying studios/);
const convDir = join(v2, "raw/sources/conversations-2026-10-28");
assert.deepEqual(r2.conversations, ["conversations-2026-10-28", "conversations-2026-10-30"], "days in the venture's zone (03:00Z is the 28th in Chicago)");
const kept = readFileSync(join(convDir, "messages.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const cited = kept.find((m) => m.sha256 === g.source.sha256);
assert.ok(cited && sha256(cited.text) === cited.sha256 && cited.timestamp === g.source.timestamp, "a catch's citation resolves to the kept message");
assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(convDir, "source.json"), "utf8"))).sort(), ["fetched", "id", "origin", "title"]);
assert.match(readFileSync(join(convDir, "text.md"), "utf8"), /visibility: internal/);
const catches = readFileSync(join(r2.out, "catches.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
assert.equal(catches.length, r2.candidates.length);
assert.match(readFileSync(join(r2.out, "text.md"), "utf8"), /\| decision \| \d+ \| \d+ \|/);
// a rerun over the same messages leaves the folder as it was and adds nothing
const snapshot = readFileSync(join(convDir, "messages.jsonl"), "utf8");
const r3 = await diagnose({ root: v2, dir: tdir, since: "2026-10-01T00:00:00Z", now: new Date("2026-10-31T13:00:00Z"), env: {} });
assert.deepEqual(r3.conversations, []);
assert.equal(readFileSync(join(convDir, "messages.jsonl"), "utf8"), snapshot);
// a secret never reaches the kept conversations
writeFileSync(join(tdir, "s3.jsonl"), H("2026-10-31T15:00:00Z", `My token is ${FAKE}, let's go with it.`) + "\n");
utimesSync(join(tdir, "s3.jsonl"), new Date("2026-10-31T15:00:00Z"), new Date("2026-10-31T15:00:00Z"));
const r4 = await diagnose({ root: v2, dir: tdir, since: "2026-10-31T00:00:00Z", now: new Date("2026-10-31T16:00:00Z"), env: {} });
assert.ok(!readFileSync(join(v2, "raw/sources", r4.conversations[0], "messages.jsonl"), "utf8").includes(FAKE));
// a secret an older pattern missed is redacted in the kept source on the next run, and citations follow the new hash
const missed = "api_key = fake-missed-by-old-rules-77";
const leakedSha = sha256(`we set ${missed} today`);
writeFileSync(join(convDir, "messages.jsonl"), snapshot + JSON.stringify({ file: "old.jsonl", timestamp: "2026-10-28T09:00:00Z", sha256: leakedSha, text: `we set ${missed} today` }) + "\n");
writeFileSync(join(convDir, "text.md"), readFileSync(join(convDir, "text.md"), "utf8") + `## 2026-10-28T09:00:00Z (old.jsonl, sha256 ${leakedSha})\n\nwe set ${missed} today\n`);
writeFileSync(join(r2.out, "catches.jsonl"), readFileSync(join(r2.out, "catches.jsonl"), "utf8") + JSON.stringify({ kind: "idea", quote: `we set ${missed}`, source: { file: "old.jsonl", timestamp: "2026-10-28T09:00:00Z", sha256: leakedSha } }) + "\n");
const r5 = await diagnose({ root: v2, dir: tdir, since: "2026-11-01T00:00:00Z", now: new Date("2026-11-01T16:00:00Z"), env: {} });
assert.ok(r5.reredacted.includes("raw/sources/conversations-2026-10-28") && r5.reredacted.includes(relative(v2, r2.out)), JSON.stringify(r5.reredacted));
for (const f of [join(convDir, "messages.jsonl"), join(convDir, "text.md"), join(r2.out, "catches.jsonl")]) assert.ok(!readFileSync(f, "utf8").includes("fake-missed-by-old-rules-77"), `${f} is redacted in place`);
const fixed = readFileSync(join(convDir, "messages.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).find((m) => m.file === "old.jsonl");
assert.ok(fixed.sha256 !== leakedSha && fixed.sha256 === sha256(fixed.text), "the rewritten message carries the hash of its new text");
const recited = readFileSync(join(r2.out, "catches.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).find((c) => c.source?.file === "old.jsonl");
assert.equal(recited.source.sha256, fixed.sha256, "the catch cites the new hash");
assert.ok(readFileSync(join(convDir, "text.md"), "utf8").includes(fixed.sha256) && !readFileSync(join(convDir, "text.md"), "utf8").includes(leakedSha), "text.md cites the new hash");
assert.equal(readFileSync(join(convDir, "messages.jsonl"), "utf8").split(snapshot.trim())[0], "", "messages that needed nothing more are untouched");
// short decisions in reply to options only: a bare yes with no options before it is not one
assert.equal(heuristicCandidates([{ text: "Yes, A.", file: "x", timestamp: "t", sha256: "0", after_options: false, answered: true }]).length, 0);
console.log("transcript diagnosis: human words only, redacted first, cursor, one draft per run, model pass off by default; v2 catches, threshold, conversation provenance");
