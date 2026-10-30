// Tests transcript diagnosis on fixture transcripts: only the human's words, secrets redacted, a cursor, one raw
// source per run, matches against known frameworks, and the model pass off unless asked for.
import assert from "node:assert/strict";
import { utimesSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { diagnose, heuristicCandidates, humanText, isDue, reredactSources, sha256 } from "./diagnose-transcripts.mjs";
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
// every shape the review found surviving (all values fake)
for (const [t, gone] of [
  ['{"clientSecret": "fakeVal9Qz"}', "fakeVal9Qz"], ['accessToken: "fakeVal9Qz"', "fakeVal9Qz"], ["dbPassword=fakeVal9Qz", "fakeVal9Qz"],
  ["PGPASSWORD=fakeVal9Qz psql", "fakeVal9Qz"], ["AUTHTOKEN=fakeVal9Qz", "fakeVal9Qz"], ["passphrase: fakeVal9Qz", "fakeVal9Qz"], ["pass=fakeVal9Qz", "fakeVal9Qz"],
  ["DATABASE_URL=postgres://admin:fakeVal9Qz@localhost:5432/app", "fakeVal9Qz"], ["redis://:fakeVal9Qz@cache.internal:6379", "fakeVal9Qz"],
  ['{"Authorization": "Basic ZmFrZTpmYWtl"}', "ZmFrZTpmYWtl"], ["headers: { Authorization: 'Basic ZmFrZTpmYWtl' }", "ZmFrZTpmYWtl"],
  ["Cookie: session=fakeVal9Qz", "fakeVal9Qz"], ["Set-Cookie: sid=fakeVal9Qz; Path=/", "fakeVal9Qz"],
  ["mysql --password fakeVal9Qz", "fakeVal9Qz"], ["gh api --token fakeVal9Qz", "fakeVal9Qz"], ["curl -u admin:fakeVal9Qz https://x.example", "fakeVal9Qz"],
  ["the password is fakeVal9Qz for now", "fakeVal9Qz"], ["password: fake horse battery staple", "battery"],
  ["key AIza" + "A".repeat(35), "AIza"], ["glpat-" + "a".repeat(20), "glpat-"], ["hf_" + "a".repeat(34), "hf_"], ["whsec_" + "a".repeat(32), "whsec_"],
  ["https://hooks.slack.com/services/TFAKE0000/BFAKE0000/" + "a".repeat(24), "TFAKE0000"], ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0." + "a".repeat(30), "eyJzdWIiOiIxIn0"],
  ["-----BEGIN PGP PRIVATE KEY BLOCK-----\nfakebody\n-----END PGP PRIVATE KEY BLOCK-----", "fakebody"], ['{\\"password\\": \\"fake Val9Qz\\"}', "Val9Qz"],
]) { const once = redact(t); assert.ok(!once.includes(gone) && once.includes("[REDACTED"), `${t} -> ${once}`); assert.equal(redact(once), once, `redacting twice: ${t}`); }
for (const [t, want] of [
  ["SECRET_KEY_BASE=fake-base-1", "SECRET_KEY_BASE=[REDACTED:secret]"],
  ["export secret_key_base: fake-base-2", "export secret_key_base: [REDACTED:secret]"],
  ["mysql -pfake-pw-3 app", "mysql -p[REDACTED:secret] app"],
  ["mysql -u root -h db.local -pfake-pw-4 app", "mysql -u root -h db.local -p[REDACTED:secret] app"],
  ["mysqldump -uroot -p'fake pw 5' app", "mysqldump -uroot -p[REDACTED:secret] app"],
  ["sshpass -p fake-pw-6 ssh me.local", "sshpass -p [REDACTED:secret] ssh me.local"],
  ["sshpass -pfake-pw-7 ssh me.local", "sshpass -p[REDACTED:secret] ssh me.local"],
  ['sshpass -p "fake pw 8" ssh me.local', "sshpass -p [REDACTED:secret] ssh me.local"],
]) { assert.equal(redact(t), want); assert.equal(redact(want), want, `redacting twice: ${t}`); }
for (const plain of ["mysql -p app", "mysql -u root -p", "mysql -P 3306 app", "mkdir -p src/app"]) assert.equal(redact(plain), plain);
for (const plain of ["tokens_in: 120", "secretary: Jane", "pass the salt", "our token is expired"]) assert.equal(redact(plain), plain);
// shell lines the founder ran are not the founder's words
assert.equal(humanText({ type: "user", message: { role: "user", content: "<bash-input>ls -la</bash-input><bash-stdout>secret.txt</bash-stdout><bash-stderr>warn</bash-stderr>keep the ledger" } }), "keep the ledger");
assert.equal(humanText({ type: "user", message: { role: "user", content: "<bash-stdout>only output</bash-stdout>" } }), null);
// nor is what an agent wrote: subagent reports and compact summaries arrive as user lines
assert.equal(humanText({ type: "user", message: { role: "user", content: "<task-notification><result>agent output</result></task-notification>keep this" } }), "keep this");
assert.equal(humanText({ type: "user", isCompactSummary: true, message: { role: "user", content: "This session is being continued" } }), null);
assert.equal(humanText({ type: "user", isVisibleInTranscriptOnly: true, message: { role: "user", content: "a summary" } }), null);
assert.equal(humanText({ type: "user", message: { role: "user", content: "<ide_selection>code</ide_selection><user-prompt-submit-hook>hook</user-prompt-submit-hook>mine" } }), "mine");

const r = await diagnose({ root, dir, all: true, now: new Date("2026-10-30T02:00:00Z"), env: {}, tz: "UTC" });
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
const again = await diagnose({ root, dir, all: true, now: new Date("2026-10-30T03:00:00Z"), env: {}, tz: "UTC" });
assert.equal(again.messages, 0);
assert.ok(existsSync(join(root, "raw/sources/diagnosis-2026-10-30-2")));

// the model pass runs only with the flag, on redacted text
const mod = join(root, "..", `${root.split("/").pop()}-model.mjs`);
writeFileSync(mod, `export default async (ms) => { globalThis.__seen = ms; return [{ kind: "decision", quote: "decide on " + ${JSON.stringify(FAKE)} }]; };`);
await assert.rejects(diagnose({ root, dir, all: true, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL: "1" } }), /MODULE/);
const m = await diagnose({ root, dir, all: true, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL: "1", NAIVE_DIAGNOSE_MODEL_MODULE: mod }, tz: "UTC" });
assert.ok(globalThis.__seen.every((x) => !x.text.includes(FAKE)), "the model sees redacted text only");
assert.ok(m.candidates.some((c) => c.by === "model" && !c.quote.includes(FAKE)));
delete globalThis.__seen;
const off = await diagnose({ root, dir, all: true, since: "2026-10-01T00:00:00Z", env: { NAIVE_DIAGNOSE_MODEL_MODULE: mod } });
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

// Fresh ventures for the checks below: one structured venture, with a sibling whose session must never be read.
const fresh = () => {
  const home = mkdtempSync(join(tmpdir(), "naive-diag3-"));
  const v = join(home, "kettle"), other = join(home, "other"), t = join(home, "transcripts/-Users-fake-Documents-kettle");
  mkdirSync(v); mkdirSync(other); mkdirSync(t, { recursive: true });
  writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "kettle", layout: "structured" }));
  writeFileSync(join(other, "venture.json"), JSON.stringify({ id: "other" }));
  return { home, v, other, t, dir: join(home, "transcripts") };
};
const says = (ts, text, cwd) => JSON.stringify({ type: "user", timestamp: ts, cwd, message: { role: "user", content: text } });
const uuid = "e087c27d-08ac-4948-ad1a-b23d923db95e";

// the venture it runs in, and every project only with all
{
  const { v, other, t, dir } = fresh();
  writeFileSync(join(t, `${uuid}.jsonl`), [says("2026-10-28T15:00:00Z", "Let's go with the kettle plan today.", join(v, "codebase")), says("2026-10-28T15:01:00Z", "Let's go with the other venture's secret plan.", other)].join("\n") + "\n");
  const scoped = await diagnose({ root: v, dir, now: new Date("2026-10-29T00:00:00Z"), env: {}, tz: "UTC" });
  assert.equal(scoped.messages, 1, "a session from another venture is not read");
  const sources = join(v, "k-base/raw/sources");
  assert.ok(existsSync(join(sources, "conversations-2026-10-28/messages.jsonl")) && !existsSync(join(v, "raw")), "the structured layout: sources sit in k-base/raw/sources");
  assert.ok(!readFileSync(join(sources, "conversations-2026-10-28/messages.jsonl"), "utf8").includes("secret plan"));
  assert.equal(isDue({ root: v, dir, since: "2026-10-01T00:00:00Z", now: new Date("2026-10-28T15:02:00Z") }).tokens, 9, "the size check counts this venture only");
  const wide = await diagnose({ root: v, dir, all: true, since: "2026-10-01T00:00:00Z", now: new Date("2026-10-29T01:00:00Z"), env: {}, tz: "UTC" });
  assert.equal(wide.messages, 2, "all reads every project");
}

// a second run leaves citations on real-length paths alone
{
  const { v, t, dir } = fresh();
  writeFileSync(join(t, `${uuid}.jsonl`), says("2026-10-28T15:00:00Z", "Let's go with the kettle plan today.", v) + "\n");
  const first = await diagnose({ root: v, dir, now: new Date("2026-10-29T00:00:00Z"), env: {}, tz: "UTC" });
  const conv = join(v, "k-base/raw/sources/conversations-2026-10-28/text.md");
  const before = [readFileSync(conv, "utf8"), readFileSync(join(first.out, "text.md"), "utf8")];
  assert.ok(before[0].includes(`${uuid}.jsonl`) && before[1].includes(`${uuid}.jsonl`));
  const second = await diagnose({ root: v, dir, now: new Date("2026-10-29T01:00:00Z"), env: {}, tz: "UTC" });
  assert.deepEqual(second.reredacted, [], "nothing to redact, so nothing changes");
  assert.equal(readFileSync(conv, "utf8"), before[0]);
  assert.equal(readFileSync(join(first.out, "text.md"), "utf8"), before[1]);
}

// a run that stops before the last write heals, and records' conversation citations move with the hash
{
  const { v } = fresh();
  const src = join(v, "k-base/raw/sources/conversations-2026-10-28");
  mkdirSync(src, { recursive: true });
  const old = "we set api_key = fake-kept-too-long today", hash = sha256(old);
  const record = join(v, "k-base/foundation/goals/launch.json");
  mkdirSync(join(v, "k-base/foundation/goals"), { recursive: true });
  writeFileSync(join(src, "messages.jsonl"), JSON.stringify({ file: `p/${uuid}.jsonl`, timestamp: "2026-10-28T09:00:00Z", sha256: hash, text: old }) + "\n");
  writeFileSync(join(src, "catches.jsonl"), JSON.stringify({ kind: "idea", quote: "x", source: { file: "p", timestamp: "t", sha256: hash } }) + "\n");
  writeFileSync(join(src, "text.md"), `## 2026-10-28T09:00:00Z (p/${uuid}.jsonl, sha256 ${hash})\n\n${old}\n`);
  writeFileSync(record, JSON.stringify({ id: "launch", conversation: [{ file: "p", timestamp: "t", sha256: hash }] }, null, 2) + "\n");
  mkdirSync(join(src, "messages.jsonl.tmp"));
  assert.throws(() => reredactSources(v), "the last write fails");
  rmSync(join(src, "messages.jsonl.tmp"), { recursive: true });
  assert.ok(!readFileSync(join(src, "text.md"), "utf8").includes("fake-kept-too-long"));
  reredactSources(v);
  const kept = JSON.parse(readFileSync(join(src, "messages.jsonl"), "utf8"));
  assert.ok(kept.sha256 !== hash && kept.sha256 === sha256(kept.text), "the message carries its new hash");
  assert.equal(JSON.parse(readFileSync(join(src, "catches.jsonl"), "utf8")).source.sha256, kept.sha256, "the catch follows after the rerun");
  assert.equal(JSON.parse(readFileSync(record, "utf8")).conversation[0].sha256, kept.sha256, "a record's citation follows");
}

// leftovers from a stopped run do not stop the next one
{
  const { v, t, dir } = fresh();
  const sources = join(v, "k-base/raw/sources");
  mkdirSync(join(sources, "conversations-2026-10-28"), { recursive: true });
  writeFileSync(join(sources, "conversations-2026-10-28/source.json"), "{}");
  mkdirSync(join(sources, ".tmp-conversations-2026-10-28-2"), { recursive: true });
  writeFileSync(join(sources, ".tmp-conversations-2026-10-28-2/stale"), "x");
  writeFileSync(join(t, `${uuid}.jsonl`), says("2026-10-28T15:00:00Z", "Let's go with the kettle plan today.", v) + "\n");
  const r = await diagnose({ root: v, dir, now: new Date("2026-10-29T00:00:00Z"), env: {}, tz: "UTC" });
  assert.deepEqual(r.conversations, ["conversations-2026-10-28-2"]);
  assert.deepEqual(readdirSync(join(sources, "conversations-2026-10-28-2")).sort(), ["messages.jsonl", "source.json", "text.md"]);
  assert.ok(!readdirSync(sources).some((d) => d.startsWith(".tmp-")), "no temporary folder is left");
}

// from a packed npm install, in a generated venture whose .gitignore keeps these sources out of git
{
  const repo = new URL("..", import.meta.url).pathname;
  const pack = mkdtempSync(join(tmpdir(), "naive-diag-pack-"));
  const env = { ...process.env, XDG_CONFIG_HOME: join(pack, ".config"), CREATE_VENTURE_PROMPTS: "" };
  const p = spawnSync("npm", ["pack", "--silent", "--pack-destination", pack], { cwd: repo, encoding: "utf8" });
  assert.equal(p.status, 0, p.stderr);
  writeFileSync(join(pack, "package.json"), "{}");
  const i = spawnSync("npm", ["install", "--offline", "--no-audit", "--no-fund", join(pack, p.stdout.trim())], { cwd: pack, encoding: "utf8" });
  assert.equal(i.status, 0, i.stderr);
  const naive = join(pack, "node_modules/.bin/naive");
  const w = spawnSync(naive, ["workspace", "init", "ws", "--venture", "Kettle", "--skip-install"], { cwd: pack, env, encoding: "utf8" });
  assert.equal(w.status, 0, w.stderr + w.stdout);
  const venture = join(pack, "ws/kettle");
  const log = join(pack, "logs");
  mkdirSync(log);
  writeFileSync(join(log, `${uuid}.jsonl`), says("2026-10-28T15:00:00Z", "Let's go with the kettle plan today.", venture) + "\n");
  const d = spawnSync(naive, ["diagnose", "--dir", log], { cwd: venture, env, encoding: "utf8" });
  assert.equal(d.status, 0, d.stderr + d.stdout);
  assert.match(d.stdout, /read 1 of the founder's messages/);
  const a = spawnSync(naive, ["activity", "--dir", log, "--json"], { cwd: venture, env, encoding: "utf8" });
  assert.equal(a.status, 0, a.stderr + a.stdout);
  const kept = readdirSync(join(venture, "k-base/raw/sources")).filter((f) => /^(?:conversations|diagnosis)-/.test(f));
  assert.equal(kept.length, 2);
  for (const f of kept) assert.equal(spawnSync("git", ["check-ignore", "-q", `k-base/raw/sources/${f}/text.md`], { cwd: venture }).status, 0, `${f} is ignored by git`);
}
console.log("transcript diagnosis: human words only, redacted first, cursor, one draft per run, model pass off by default; v2 catches, threshold, conversation provenance");
