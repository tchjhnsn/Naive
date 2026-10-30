// Tests for reasons with citations (dynamic decision index, item 4): propose and approve take reasons,
// approval freezes them with each cited file's sha256 into provenance, a changed cited file makes the
// decision stale ("the reason you decided <id> changed"), and rank carries the cites. Also the CLI.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../interface/router.mjs";
import { approve, decisions, propose } from "./decisions.mjs";
import { changedReasons, reasonsFromArgs, shaOf } from "./reasons.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "reasons-"));
const v = join(ws, "rsn");
const json = (rel) => JSON.parse(readFileSync(join(v, rel), "utf8"));
mkdirSync(join(v, "marketing/decisions"), { recursive: true });
mkdirSync(join(v, "evidence"), { recursive: true });
writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "rsn", name: "Rsn", type: "software-startup", phase: "discovery" }, null, 2));
writeFileSync(join(v, "evidence/interviews.json"), JSON.stringify({ quotes: ["solo founders drown in decisions"] }, null, 2));
const F = "marketing/decisions/mission.decision.json";
const fresh = (id) => decisions(v, Date.now()).decisions.find((d) => d.id === id);

try {
  const p = propose(v, { at: "marketing", id: "mission", question: "What is the mission?", answer: "We help solo founders.",
    reasons: [{ claim: "Interviews say solo founders drown in decisions", kind: "for", citations: [{ ref: "evidence/interviews.json", locator: "quotes[0]" }, { ref: "EV-12" }] },
      { claim: "Teams are a bigger market", kind: "against" }] }, { agentId: "cos" });
  const d0 = json(F);
  expect("propose accepts reasons and stamps a local citation's sha256", p.ok && d0.reasons[0].citations[0].version === shaOf(v, "evidence/interviews.json"), p.ok ? d0 : p);
  expect("a non-file citation (an evidence id) gets no version", p.ok && !d0.reasons[0].citations[1].version);
  const open = fresh("mission");
  const w = open.why_cites?.find((c) => c.cites.includes("evidence/interviews.json"));
  expect("an open decision's why carries cites from its reasons", w && open.why.includes(w.why) && w.cites.includes("EV-12"), open);

  const bad = propose(v, { id: "mission", question: "What is the mission?", reasons: [{ claim: "x", kind: "maybe" }] }, { agentId: "cos" });
  expect("a reason with an unknown kind fails the schema", !bad.ok, bad);

  const a = approve(v, "mission", { by: "Founder", reasons: [{ claim: "The founder lived it", kind: "context", citations: [{ ref: "venture.json" }] }] });
  const d1 = json(F);
  expect("approve accepts more reasons and freezes them all into provenance", a.ok && d1.provenance.reasons?.length === 3 && d1.provenance.reasons[2].citations[0].version === shaOf(v, "venture.json"), a.ok ? d1 : a);
  expect("approve reports the cites it froze", a.result?.cites?.includes("evidence/interviews.json"), a.result);
  expect("nothing changed yet: the decision is done", fresh("mission").render === "done" && !changedReasons(v, d1).length);

  writeFileSync(join(v, "evidence/interviews.json"), JSON.stringify({ quotes: ["actually, teams drown too"] }, null, 2));
  const s = fresh("mission");
  expect("a changed cited file makes the decided decision stale", s.render === "stale" && s.stale_because === "reasons", s);
  expect("why says the reason you decided it changed, with the ref as cites", s.why?.includes("the reason you decided mission changed: evidence/interviews.json") && s.why_cites?.some((c) => c.cites[0] === "evidence/interviews.json") && s.rank >= 30, s);
  expect("it does not claim the parent changed", !s.why.some((x) => /parent changed/.test(x)), s.why);

  const a2 = approve(v, "mission", { by: "Founder", answer: "We help solo founders and small teams." });
  const d2 = json(F);
  expect("a new version keeps the old frozen reasons in versions", a2.ok && d2.versions[0].provenance.reasons.length === 3, d2);
  expect("an inherited reason keeps its old hash, so the new version stays stale", d2.provenance.reasons[0].citations[0].version === d2.versions[0].provenance.reasons[0].citations[0].version && d2.provenance.reasons[0].citations[0].version !== shaOf(v, "evidence/interviews.json") && fresh("mission").render === "stale", d2);
  approve(v, "mission", { by: "Founder", answer: "We help founders who drown in decisions.", reasons: [{ claim: "Interviews say solo founders drown in decisions", kind: "for", citations: [{ ref: "evidence/interviews.json", locator: "quotes[0]" }] }] });
  expect("restating the reason from the changed file freezes it fresh and clears the staleness", json(F).provenance.reasons.filter((r) => r.claim.startsWith("Interviews")).length === 1 && json(F).provenance.reasons.find((r) => r.claim.startsWith("Interviews")).citations[0].version === shaOf(v, "evidence/interviews.json") && fresh("mission").render === "done", json(F));

  // An inherited reason keeps its hash even when its stored JSON differs from the frozen copy (a hand edit).
  const inherited = () => json(F).reasons.find((r) => r.claim.startsWith("Interviews"));
  writeFileSync(join(v, "evidence/interviews.json"), JSON.stringify({ quotes: ["changed again"] }, null, 2));
  const reordered = json(F);
  reordered.reasons = reordered.reasons.map(({ claim, kind, ...r }) => ({ kind, claim, ...r }));
  writeFileSync(join(v, F), JSON.stringify(reordered, null, 2));
  const hash = inherited().citations[0].version;
  approve(v, "mission", { by: "Founder", answer: "We help founders with too many decisions." });
  expect("an inherited reason whose key order differs is not re-frozen at today's hash", inherited().citations[0].version === hash && fresh("mission").render === "stale", json(F));
  approve(v, "mission", { by: "Founder", answer: "We help founders with too many open decisions.", reasons: [{ claim: inherited().claim, kind: "for", citations: [{ ref: "evidence/interviews.json" }] }] });

  expect("reasonsFromArgs pairs each --cite with the reason before it", JSON.stringify(reasonsFromArgs(["x", "--reason", "A", "--cite", "a.json", "--locator", "f", "--cite", "D-1", "--against", "B"])) === JSON.stringify([{ claim: "A", kind: "for", citations: [{ ref: "a.json", locator: "f" }, { ref: "D-1" }] }, { claim: "B", kind: "against" }]));

  // The CLI: decide --reason/--cite, then decisions --why.
  propose(v, { at: "marketing", id: "channel", question: "Which channel first?", answer: "Founder communities." }, { agentId: "cos" });
  const env = { ...process.env, MENTURA_WORKSPACE: ws };
  const cli = (...args) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...args], { env, encoding: "utf8" });
  const c = cli("decide", "channel", "--venture", "rsn", "--by", "Founder", "--confirm", "channel", "--reason", "Interviews came from communities", "--cite", "evidence/interviews.json");
  expect("mentura decide --reason --cite freezes the reason", c.status === 0 && json("marketing/decisions/channel.decision.json").provenance.reasons?.[0]?.citations?.[0]?.version === shaOf(v, "evidence/interviews.json"), c.stderr || c.stdout);
  const y = cli("decisions", "--venture", "rsn", "--why", "channel");
  expect("mentura decisions --why prints reasons with citations", y.status === 0 && /\[for\] Interviews came from communities/.test(y.stdout) && /cites evidence\/interviews\.json @[0-9a-f]{12} \(unchanged\)/.test(y.stdout), y.stderr || y.stdout);
  const chk = spawnSync("node", [join(repo, "schema/check-reasons.mjs"), v], { encoding: "utf8" });
  expect("check-reasons passes while nothing changed", chk.status === 0, chk.stdout);
  writeFileSync(join(v, "evidence/interviews.json"), "{}\n");
  const chk2 = spawnSync("node", [join(repo, "schema/check-reasons.mjs"), v], { encoding: "utf8" });
  expect("check-reasons reports the changed reason and exits 1", chk2.status === 1 && /the reason you decided channel changed: evidence\/interviews\.json/.test(chk2.stdout), chk2.stdout);

  // A stale decision stays stale: a stranger cannot clear it, and an agent's raw write cannot reopen it.
  const o = join(ws, "rop");
  mkdirSync(join(o, "decisions"), { recursive: true });
  mkdirSync(join(o, "evidence"));
  mkdirSync(join(o, "governance"));
  writeFileSync(join(o, "venture.json"), JSON.stringify({ id: "rop", name: "Rop", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery" }));
  writeFileSync(join(o, "governance/delegation.json"), JSON.stringify({ register: "delegation", root: "founder", founder: ["Torian"], grants: [] }));
  writeFileSync(join(o, "evidence/e.json"), "{\"v\":1}\n");
  const claim = "The evidence says so";
  const cited = [{ claim, kind: "for", citations: [{ ref: "evidence/e.json" }] }];
  propose(o, { id: "pick", question: "Which?", answer: "this", boundary: "fail-open", reasons: cited }, { agentId: "cos" });
  approve(o, "pick", { by: "Torian" });
  writeFileSync(join(o, "evidence/e.json"), "{\"v\":2}\n");
  const rendered = () => decisions(o, Date.now()).decisions.find((d) => d.id === "pick").render;
  expect("a changed citation makes the decision stale", rendered() === "stale", rendered());
  const stranger = approve(o, "pick", { by: "Mallory", answer: "that", reasons: cited });
  expect("a name that is no person cannot clear staleness by restating the claim", !stranger.ok && rendered() === "stale", stranger);
  const recordPath = join(o, "decisions/pick.decision.json");
  const before = readFileSync(recordPath, "utf8");
  const raw = await call({ venture: "rop", route: "decisions/pick", action: "write", actor: "agent", actor_id: "builder", workspace: ws, input: { id: "pick", question: "Which?", answer: "this", status: "open", reasons: cited } });
  expect("an agent's raw write that reopens a decided decision is only a draft", raw.ok && raw.result.draft === true && readFileSync(recordPath, "utf8") === before, raw);
  expect("so the decision stays stale and nothing re-freezes", rendered() === "stale", rendered());
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\ndecision reasons hold");
