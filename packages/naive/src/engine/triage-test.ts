// Tests for raw triage (packages/naive/src/engine/triage.ts): the request asks the questions the design lists and sends a
// source's full text only when allowed; decide files sure labels, holds unsure ones and sends a possible one-way door
// to a person. Fixed answers only: no model and no network.
//   node packages/naive/src/engine/triage-test.ts

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACCEPT, candidates, decide, lineFor, request, type Answers, type Context, type Entry } from "./triage.ts";

let fails = 0;
const ok = (name: string, cond: boolean, detail?: unknown) => { console.log(`${cond ? "pass" : "FAIL"}  ${name}`); if (!cond) { fails++; if (detail !== undefined) console.log(JSON.stringify(detail, null, 2)); } };

const FUNCTIONS = ["strategy", "products", "marketing-and-sales", "supply-chain", "service-delivery", "customer-service", "human-capital", "it", "finance", "assets", "risk-and-compliance", "external-relationships", "capabilities"];
const context: Context = {
  ventures: [{ id: "acme-labs", about: "Reorder drafts for independent cafes" }, { id: "kettle", about: "A tea subscription" }],
  functions: FUNCTIONS,
  ideas: [
    { id: "i-weekend", text: "Cafes reorder differently for the weekend rush." },
    { id: "i-pricing", text: "Charge per location per month." },
  ],
};
const dump: Entry = { path: "raw/dump/c1.md", text: "Owners keep a second paper list for the weekend rush, so the reorder draft should learn weekends separately.\n\nWe should sign the distributor contract this week." };

// --- request ---
const req = request(dump, context);
const keys = Object.keys(req.questions);
ok("the request names the Jev model and carries state and questions", req.model === "jev-latest" && typeof req.state === "object");
ok("it asks the two kind Nouls, the one-way door Noul and the urgency Score", ["kind:idea", "kind:reference", "door:one-way"].every((k) => req.questions[k]?.type === "noul") && req.questions.urgency?.type === "score");
ok("one venture Noul per fragment and venture", keys.filter((k) => k.startsWith("venture:")).length === 2 * 2, keys.filter((k) => k.startsWith("venture:")));
ok("one function Noul per fragment and each of the 13 functions", keys.filter((k) => k.startsWith("function:f1:")).length === 13 && keys.filter((k) => k.startsWith("function:f2:")).length === 13);
ok("duplicate Nouls only for ideas that share terms with the fragment", keys.includes("duplicate:f1:i-weekend") && !keys.includes("duplicate:f1:i-pricing"), keys.filter((k) => k.startsWith("duplicate:")));
const many = Array.from({ length: 9 }, (_, i) => ({ id: `i-${i}`, text: `weekend reorder draft number ${i}` }));
ok("at most five duplicate candidates", candidates("weekend reorder draft", many).length === 5);
const source: Entry = { path: "raw/sources/oat/text.md", text: "The full article text about distributors capping winter orders.", source: { title: "Why cafes run out of oat milk", origin: "a newsletter", note: "distributors cap small accounts in winter" } };
const closed = JSON.stringify(request(source, context).state);
const open = JSON.stringify(request(source, { ...context, send: true }).state);
ok("a source's full text is not sent without send, only its title, origin and note", !closed.includes("full article text") && closed.includes("cap small accounts"));
ok("with send on, the source's full text is sent", open.includes("full article text"));

// --- decide ---
const sureAnswers = (over: Record<string, number> = {}): Answers => {
  const a: Answers = {};
  for (const k of keys) a[k] = { noul: 0.01 };
  Object.assign(a, { "kind:idea": { noul: 0.99 }, "kind:reference": { noul: 0.02 }, "door:one-way": { noul: 0.01 }, urgency: { score: 0.4 },
    "venture:f1:acme-labs": { noul: 0.98 }, "venture:f2:acme-labs": { noul: 0.97 }, "function:f1:products": { noul: 0.99 }, "function:f2:supply-chain": { noul: 0.96 } });
  for (const [k, v] of Object.entries(over)) a[k] = { noul: v };
  return a;
};

const filed = decide(dump, sureAnswers(), ACCEPT, context);
ok("every label sure: nothing held and one idea filed per fragment", filed.held.length === 0 && filed.filings.filter((f) => f.kind === "idea").length === 2, filed);
ok("the filed idea carries its venture and functions", filed.filings[0]?.venture === "acme-labs" && filed.filings[0]?.functions?.join() === "products");
ok("a sure two-way entry does not go to a person", filed.toPerson === false);
ok("the urgency Score is kept and never held", filed.urgency === 0.4 && filed.labels.find((l) => l.key === "urgency")?.sure === true);

const unsure = decide(dump, sureAnswers({ "function:f2:finance": 0.6 }), ACCEPT, context);
ok("an unsure label is held and nothing is filed", unsure.held.join() === "function:f2:finance" && unsure.filings.length === 0, unsure.held);

const door = decide(dump, sureAnswers({ "door:one-way": 0.3 }), ACCEPT, context);
ok("a possible one-way door goes to a person and is held", door.toPerson === true && door.held.includes("door:one-way"));
const sureDoor = decide(dump, sureAnswers({ "door:one-way": 0.97 }), ACCEPT, context);
ok("a sure one-way door files but the routed work still goes to a person", sureDoor.toPerson === true && sureDoor.held.length === 0 && sureDoor.filings.length > 0);
const noDoor = sureAnswers(); delete noDoor["door:one-way"];
const missing = decide(dump, noDoor, ACCEPT, context);
ok("no one-way door answer: held and to a person", missing.toPerson && missing.held.includes("door:one-way"));

const dup = decide(dump, sureAnswers({ "duplicate:f1:i-weekend": 0.99 }), ACCEPT, context);
ok("a sure duplicate files as an idea that builds on the existing one", dup.filings[0]?.builds_on === "i-weekend");
const ref = decide(source, { "kind:idea": 0.01, "kind:reference": 0.99, "door:one-way": 0.01, urgency: 0.1, "venture:f1:acme-labs": 0.99, "venture:f1:kettle": 0.01 }, ACCEPT, context);
ok("a sure reference files as a reference and no idea", ref.filings.map((f) => f.kind).join() === "reference", ref.filings);
ok("a lower line files what 0.95 held", decide(dump, sureAnswers({ "function:f2:finance": 0.92 }), 0.9, context).held.length === 0);

// --- the line ---
ok("with no detector the line is 0.95 (the shipped template)", lineFor(mkdtempSync(join(tmpdir(), "triage-"))) === 0.95);
const v = mkdtempSync(join(tmpdir(), "triage-"));
mkdirSync(join(v, "governance/detectors"), { recursive: true });
writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "v" }));
writeFileSync(join(v, "governance/detectors/triage-accept.json"), JSON.stringify({ id: "triage-accept", evidence: { scale: { yes_when: "above" } }, criterion: { yes: { value: 0.9, set_by: "founder" } } }));
ok("a venture's own triage-accept detector sets the line", lineFor(v) === 0.9, lineFor(v));

if (fails) { console.log(`${fails} failed`); process.exit(1); }
console.log("triage: all pass");
