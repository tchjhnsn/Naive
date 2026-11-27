// Tests the pure visibility scorer (EE-222, packages/naive/src/engine/visibility-rubric.ts) against the shipped
// rubric and against fixtures: the weighted total, a gate and a must-have that no weighted sum buys back, a criterion
// weighted 0, the tie band, a blind spot that is flagged and still ranked, the channel read from an activity's words,
// and the problems channelProblems finds. No I/O, no model.
//
//   node packages/naive/src/engine/visibility-rubric-test.ts

import { readFileSync } from "node:fs";
import { candidatesFor, channelOf, channelProblems, scoreTools, wordsOf, type Candidate } from "./visibility-rubric.ts";
import type { VisibilityRubric } from "../records/types/records.d.ts";

let failed = 0;
const ok = (cond: boolean, name: string, detail: unknown = ""): void => { console.log(`${cond ? "ok  " : "FAIL"}  ${name}${cond ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!cond) failed++; };

const repo = new URL("../../../../", import.meta.url).pathname;
const rubric = JSON.parse(readFileSync(`${repo}packages/naive/src/functions/it/visibility-rubric.json`, "utf8")) as VisibilityRubric;
const kind = (id: string): Candidate => {
  const t = rubric.tool_kinds.find((x) => x.id === id);
  if (!t) throw new Error(`no tool kind ${id}`);
  return { id: t.id, kind: t.kind, scores: t.scores };
};
const status = (id: string, r: ReturnType<typeof scoreTools>) => r.results.find((x) => x.id === id);

// The weighted total, on the shipped weights: 0.3 record, 0.25 ownership, 0.2 export, 0.15 events, 0.1 consent.
const conversation = rubric.channels.find((c) => c.id === "conversation")!;
const meeting = scoreTools(rubric, candidatesFor(rubric, conversation));
const self = status("self-hosted-recorder", meeting);
ok(self?.status === "ranked" && Math.abs(self.total - (4 * 0.3 + 4 * 0.25 + 4 * 0.2 + 3 * 0.15 + 3 * 0.1) / 4) < 1e-12, "the total is the weighted sum of score over 4, with the weights summing to 1", self);
ok(meeting.results[0].id === "self-hosted-recorder" && meeting.results[1].id === "hosted-recorder", "the tool the venture runs itself outranks the hosted one on the same record", meeting.results.map((r) => r.id));
ok(meeting.decides === "person" && /never decides/.test(meeting.note), "the result says a person decides");

// A blind spot is flagged and still ranked: only a person rules a tool out.
const plain = status("plain-meeting-tool", meeting);
ok(plain?.blind_spot === true && plain.status === "ranked" && meeting.blind_spots.join() === "plain-meeting-tool", "a candidate that records nothing is flagged, listed in blind_spots and still ranked", plain);
ok(meeting.results.filter((r) => r.status === "ranked").at(-1)?.id === "plain-meeting-tool", "and it ranks last, because a high consent score buys back nothing", meeting.results.map((r) => r.id));

// A must-have and a gate rule a candidate out whatever the rest.
const must = scoreTools(rubric, candidatesFor(rubric, conversation), { must: { "activity-record": 3 } });
const ruled = must.results.filter((r) => r.status === "ruled-out").map((r) => r.id);
ok(ruled.join() === "plain-meeting-tool,notes-by-hand", "a must-have rules out every candidate below it", ruled);
ok(status("plain-meeting-tool", must)?.blind_spot === true && must.blind_spots.includes("plain-meeting-tool"), "a ruled-out candidate is still flagged as a blind spot");
const gated: Candidate = { id: "unlawful", kind: "a recorder nobody consented to", scores: { "activity-record": 4, ownership: 4, "export-and-api": 4, events: 4, "consent-and-retention": 0 } };
const gate = scoreTools(rubric, [gated, kind("notes-by-hand")]);
ok(status("unlawful", gate)?.status === "ruled-out" && gate.results[0].id === "notes-by-hand", "a 0 on the consent gate rules a candidate out although it scores 4 on everything else", gate.results);

// A criterion weighted 0 is left out of the score and never out of the blind spot.
const noEvents = scoreTools(rubric, [kind("self-hosted-recorder")], { weights: { events: 0 } });
ok(noEvents.results[0].parts.every((p) => p.criterion !== "events") && noEvents.weights.events === 0, "a criterion weighted 0 contributes no part", noEvents.results[0]);
const hidden = scoreTools(rubric, [kind("plain-meeting-tool")], { weights: { "activity-record": 0 } });
ok(hidden.results[0].blind_spot === true, "weighting activity-record 0 hides the points and not the blind spot");

// The tie band.
const message = rubric.channels.find((c) => c.id === "message")!;
const tied = scoreTools(rubric, candidatesFor(rubric, message));
/** Whether a result is ranked and inside the tie band, which only a ranked result can be. */
const isTied = (r: ReturnType<typeof status>) => r?.status === "ranked" && r.tied;
ok(isTied(tied.results[0]) && isTied(tied.results[1]) && status("personal-mailbox", tied)?.status === "ranked" && !isTied(status("personal-mailbox", tied)), "totals inside the band are tied and the one outside it is not", tied.results);
ok(!isTied(scoreTools(rubric, [kind("notes-by-hand")]).results[0]), "one candidate alone is never tied");

// An incomplete candidate is reported, not ranked, and a bad score throws.
const partial = scoreTools(rubric, [{ id: "half", kind: "half scored", scores: { "activity-record": 2 } }]);
ok(partial.results[0].status === "incomplete" && partial.results[0].unscored.length === 4, "a candidate that leaves a weighted criterion unscored is incomplete", partial.results[0]);
const throws = (f: () => unknown, says: RegExp) => { try { f(); return false; } catch (e) { return says.test((e as Error).message); } };
ok(throws(() => scoreTools(rubric, [{ id: "x", kind: "x", scores: { "activity-record": 5 } }]), /scores 5 on activity-record/), "a score outside 0 to 4 throws");
ok(throws(() => scoreTools(rubric, [{ id: "x", kind: "x", scores: { speed: 2 } }]), /no criterion for/), "a score on a criterion the rubric lacks throws");
ok(throws(() => scoreTools(rubric, [kind("notes-by-hand")], { must: { speed: 2 } }), /no criterion speed/), "a must-have on a criterion the rubric lacks throws");
ok(throws(() => scoreTools(rubric, [kind("notes-by-hand")], { weights: Object.fromEntries(rubric.criteria.map((c) => [c.id, 0])) }), /weighted 0/), "every criterion weighted 0 throws");

// The channel, read from the words of the activity's name.
ok(channelOf(rubric, "Negotiate service-level agreements")?.id === "conversation", "a verb of talking reaches the conversation channel");
ok(channelOf(rubric, "Approve payments")?.id === "decision", "a verb of deciding reaches the decision channel before the transaction one");
ok(channelOf(rubric, "Communicate mission")?.id === "message", "a verb of writing to someone outside reaches the message channel");
ok(channelOf(rubric, "Define the strategic vision")?.id === "document", "a verb of writing something down reaches the document channel");
ok(channelOf(rubric, "Reconcile payroll")?.id === "transaction", "a verb of moving money reaches the transaction channel");
ok(channelOf(rubric, "Monitor performance")?.id === "observation", "a verb of looking at how something is going reaches the observation channel");
ok(channelOf(rubric, "Manage customer relationships")?.id === "work-in-a-tool" && channelOf(rubric, "")?.id === "work-in-a-tool", "words that meet no clause, and no words at all, reach the default channel");
ok(wordsOf("Approve/Change credit limits!").join() === "approve,change,credit,limits", "the words are lower case, with the punctuation dropped");
ok(candidatesFor(rubric, conversation).map((c) => c.id).join() === conversation.tool_kinds.join(), "the candidates come back in the channel's order");
ok(candidatesFor(rubric, { ...conversation, tool_kinds: ["no-such-kind"] }).length === 0, "a tool kind the rubric lacks is skipped");

// channelProblems.
const channels = rubric.channels;
ok(channelProblems(channels).length === 0, "the shipped channels have no problem", channelProblems(channels));
const problem = (chs: VisibilityRubric["channels"], says: RegExp) => says.test(channelProblems(chs).join("\n"));
ok(problem(channels.filter((c) => !c.default), /no channel is the default/), "no default channel is a problem");
ok(problem([...channels, { ...channels[0], id: "second-default", default: true }], /are all marked default/), "two default channels are a problem");
ok(problem(channels.map((c) => (c.default ? { ...c, when: [{ verbs: ["x"] }] } : c)), /is the default and also names clauses/), "a default channel with clauses is a problem");
ok(problem(channels.map((c) => (c.id === "message" ? { ...c, when: undefined } : c)), /names no clauses and is not the default/), "a channel with no clauses that is not the default is a problem");
ok(problem([...channels, channels[1]], /channel message is listed twice/), "a channel listed twice is a problem");
ok(problem([{ id: "a", title: "a", means: "a", record: "a", when: [{ verbs: ["meet"] }], tool_kinds: ["notes-by-hand"] }, { id: "b", title: "b", means: "b", record: "b", when: [{ verbs: ["meet"] }], tool_kinds: ["notes-by-hand"] }, ...channels.filter((c) => c.default)], /channel b names the verb meet, which channel a already takes/), "a verb an earlier verb-only clause already takes is a problem");

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("visibility-rubric: all passed");
