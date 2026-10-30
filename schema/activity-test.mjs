// Tests naive activity on generated transcripts: active minutes from gaps of 10 minutes or less, days in the venture's
// time zone, venture matching by cwd and by path mention, the written records against their schemas, the streak and
// days since last touch, and the clock.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activeMinutes, activity, summarize, writeActivity } from "./activity.mjs";
import { dayIn, zoneFor } from "./clock.mjs";

const repo = new URL("..", import.meta.url).pathname;
const ws = mkdtempSync(join(tmpdir(), "naive-activity-"));
writeFileSync(join(ws, "naive-workspace.json"), JSON.stringify({ name: "ws", timeZone: "Asia/Tokyo" }));
const studio = join(ws, "ventures/studio"), tandem = join(ws, "ventures/tandem"), quiet = join(ws, "ventures/quiet");
for (const [d, v] of [[studio, { id: "studio", timeZone: "America/Chicago" }], [tandem, { id: "tandem" }], [quiet, { id: "quiet" }]]) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, "venture.json"), JSON.stringify(v)); }

// the clock: the venture's zone, else the workspace's
assert.equal(zoneFor(studio), "America/Chicago");
assert.equal(zoneFor(tandem), "Asia/Tokyo");
assert.equal(dayIn("2026-10-29T03:00:00Z", "America/Chicago"), "2026-10-28");
assert.equal(dayIn("2026-10-29T20:00:00Z", "Asia/Tokyo"), "2026-10-30");

// active minutes: gaps over 10 minutes do not count
assert.equal(activeMinutes(["2026-10-29T10:00:00Z", "2026-10-29T10:05:00Z", "2026-10-29T10:15:00Z", "2026-10-29T10:40:00Z", "2026-10-29T10:42:00Z"]), 17);
assert.equal(activeMinutes(["2026-10-29T10:00:00Z"]), 0);

const tdir = mkdtempSync(join(tmpdir(), "naive-activity-t-"));
const H = (ts, text, cwd) => JSON.stringify({ type: "user", timestamp: ts, ...(cwd ? { cwd } : {}), message: { role: "user", content: text } });
const A = (ts) => JSON.stringify({ type: "assistant", timestamp: ts, message: { role: "assistant", content: [{ type: "text", text: "x".repeat(4000) }] } });
writeFileSync(join(tdir, "a.jsonl"), [
  H("2026-10-28T15:00:00Z", "abcd".repeat(10), join(studio, "sub")), A("2026-10-28T15:01:00Z"),
  H("2026-10-28T15:06:00Z", "abcd", join(studio, "sub")),
  H("2026-10-28T16:00:00Z", "abcd", join(studio, "sub")),
  // 03:00Z on the 29th is still the 28th in Chicago
  H("2026-10-29T03:00:00Z", "abcd", join(studio, "sub")),
].join("\n") + "\n");
writeFileSync(join(tdir, "b.jsonl"), [
  H("2026-10-28T15:08:00Z", "late night in the studio", studio),
  JSON.stringify({ type: "user", isMeta: true, timestamp: "2026-10-28T15:09:00Z", cwd: studio, message: { role: "user", content: "meta" } }),
].join("\n") + "\n");
// matched by mention: run from elsewhere but names the venture's path
writeFileSync(join(tdir, "c.jsonl"), [H("2026-10-29T20:00:00Z", "look at ventures/tandem please", "/somewhere/else"), H("2026-10-29T20:03:00Z", "and again", "/somewhere/else")].join("\n") + "\n");
// unmatched
writeFileSync(join(tdir, "d.jsonl"), H("2026-10-29T20:00:00Z", "nothing to do with any venture", "/elsewhere") + "\n");

const res = activity({ root: ws, dir: tdir });
const s = res.find((v) => v.venture === "studio");
assert.deepEqual(s.days.map((d) => d.date), ["2026-10-28"], "every studio message is on the 28th in Chicago");
const d28 = s.days[0];
assert.equal(d28.sessions, 2);
assert.equal(d28.messages, 5, "the founder's own messages only: no assistant or meta lines");
assert.equal(d28.active_minutes, 8, "15:00, 15:06, 15:08 count; 16:00 and 03:00 are after long gaps");
assert.equal(d28.tokens_in, Math.ceil((40 + 4 + 4 + 4 + 24) / 4), "tokens in estimate the founder's characters only");
assert.deepEqual(d28.matched_by, ["cwd"]);
const t = res.find((v) => v.venture === "tandem");
assert.deepEqual(t.days.map((d) => [d.date, d.matched_by[0], d.active_minutes]), [["2026-10-30", "mention", 3]], "Tokyo day, matched by mention");
assert.ok(!res.find((v) => v.venture === "quiet"), "no sessions, no rows");
assert.deepEqual(activity({ root: ws, dir: tdir, from: "2026-10-29" }).find((v) => v.venture === "studio")?.days ?? [], [], "--from filters by the venture's day");
assert.equal(activity({ root: studio, dir: tdir }).length, 1, "inside a venture, only that venture");

// --write: one record per day and a summary, valid against their schemas, internal by default
const written = writeActivity(res, new Date("2026-10-30T18:00:00Z"));
const rec = join(studio, "operations/activity/2026-10-28.json");
const sum = join(studio, "operations/activity/_summary.json");
assert.ok(written.includes(rec) && written.includes(sum));
assert.equal(JSON.parse(readFileSync(rec, "utf8")).visibility, "internal");
const validate = (schema, file) => spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", schema, "--file", file], { encoding: "utf8" });
for (const [schema, file] of [["activity.schema.json", rec], ["activity-summary.schema.json", sum]]) {
  const v = validate(schema, file);
  if (/needs jsonschema/.test(v.stderr)) { console.log("activity: python jsonschema missing, schema checks skipped"); break; }
  assert.equal(v.status, 0, `${file}: ${v.stdout}${v.stderr}`);
}
const summary = JSON.parse(readFileSync(sum, "utf8"));
assert.deepEqual([summary.as_of, summary.last_touch, summary.days_since_last_touch, summary.streak], ["2026-10-30", "2026-10-28", 2, 0]);
assert.ok(!summary.nudge, "two days is not a silence");
assert.ok(!existsSync(join(quiet, "operations")), "a venture with no sessions gets nothing written");

// streak and nudge
assert.equal(summarize("v", "UTC", ["2026-10-27", "2026-10-28", "2026-10-29"], "2026-10-30").streak, 3, "a streak ending yesterday still counts");
assert.equal(summarize("v", "UTC", ["2026-10-28", "2026-10-29", "2026-10-30"], "2026-10-30").streak, 3);
assert.equal(summarize("v", "UTC", ["2026-10-26", "2026-10-28"], "2026-10-28").streak, 1);
const old = summarize("v", "UTC", ["2026-10-01"], "2026-10-30");
assert.equal(old.days_since_last_touch, 29);
assert.match(old.nudge, /29 days since you last worked on v\. Pick it up when you are ready/, "a gentle nudge, never an alarm");
assert.equal(summarize("v", "UTC", [], "2026-10-30").last_touch, null);

// the CLI
const cli = spawnSync("node", [join(repo, "interface/cli/naive.mjs"), "activity", "--venture", studio, "--dir", tdir, "--json"], { encoding: "utf8" });
assert.equal(cli.status, 0, cli.stderr);
assert.equal(JSON.parse(cli.stdout).ventures[0].days[0].messages, 5);
assert.equal(spawnSync("node", [join(repo, "schema/activity.mjs"), "--venture", studio, "--dir", tdir, "--from", "yesterday"]).status, 2);
console.log("activity: active minutes, days in the venture's zone, matched by cwd or mention, records and summary valid, streak and a gentle nudge");
