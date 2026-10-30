// Tests for reasons with citations (dynamic decision index, item 4): propose and approve take reasons,
// approval freezes them with each cited file's sha256 into provenance, a changed cited file makes the
// decision stale ("the reason you decided <id> changed"), and rank carries the cites. Also the CLI.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  expect("a new version keeps the old frozen reasons in versions and freezes fresh shas", a2.ok && d2.versions[0].provenance.reasons.length === 3 && d2.provenance.reasons[0].citations[0].version === shaOf(v, "evidence/interviews.json") && fresh("mission").render === "done", d2);

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
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\ndecision reasons hold");
