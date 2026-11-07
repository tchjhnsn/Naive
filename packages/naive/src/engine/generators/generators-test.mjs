// Record generators (EE-099): each pilot describes its questions and drafts a record that passes its schema.
//   node packages/naive/src/engine/generators/generators-test.mjs
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as bug from "./bug.mjs";
import { validate } from "./generate.mjs";
import * as glossary from "./glossary.mjs";
import * as reference from "./reference.mjs";
import * as traceSpan from "./trace-span.mjs";
import * as detector from "./detector.ts";
import * as detectorTrial from "./detector-trial.ts";

let fails = 0;
const t = (name, ok) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}`); if (!ok) fails++; };
const v = mkdtempSync(join(tmpdir(), "gen-test-"));
writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "kettle" }));
mkdirSync(join(v, "product/bugs"), { recursive: true });
writeFileSync(join(v, "product/bugs/save-loses-draft.json"), "{}");

for (const g of [bug, glossary, reference, traceSpan, detector, detectorTrial]) t(`${g.record}: describe asks at least one required field`, g.describe().ask.some((q) => q.required));

const b = bug.draft({ title: "Save loses draft", severity: "P1", found_in: "0.6.0", repro: "open, type, save" }, { venture: v });
t("bug: draft passes the schema", b.ok);

const sp = traceSpan.draft({ name: "invoke_agent strategy", kind: "agent" });
t("trace-span: draft passes the schema", sp.ok && sp.draft.prev === "genesis");
t("trace-span: a span with no kind is refused", !traceSpan.draft({ name: "x" }).ok);
t("bug: id is unique among the venture's bugs", b.draft.id === "save-loses-draft-2");
t("bug: opens with no fix", b.draft.status === "open" && b.draft.fixed_in === null);
t("bug: a bad severity fails the schema", !bug.draft({ title: "x", severity: "P9", found_in: "1" }).ok);
t("bug: no title is refused before the schema", !bug.draft({ severity: "P1" }).ok);

mkdirSync(join(v, "glossary"), { recursive: true });
writeFileSync(join(v, "glossary/brand.json"), JSON.stringify({ package: "brand", terms: [{ term: "kettle", meaning: "the product" }] }));
const g1 = glossary.draft({ package: "brand", term: "pour", meaning: "one use" }, { venture: v });
t("glossary: adds a term to the current file", g1.ok && g1.draft.terms.length === 2);
t("glossary: a second meaning for a defined term is refused", !glossary.draft({ package: "brand", term: "Kettle", meaning: "a pot" }, { venture: v }).ok);
t("glossary: the same meaning again adds nothing", glossary.draft({ package: "brand", term: "kettle", meaning: "the product" }, { venture: v }).added === false);

mkdirSync(join(v, "packages/naive/src/records/layers/purpose/references"), { recursive: true });
writeFileSync(join(v, "packages/naive/src/records/layers/purpose/references/references.json"), JSON.stringify({ layer: "purpose", references: [{ id: "minsky-1974-framework", title: "x", authors: ["M"], year: 1974, kind: "paper", summary: "s", informs: [], stance: { is: "adopted", why: "w" } }] }));
const r = reference.draft({ layer: "purpose", title: "A Framework for Representing Knowledge", authors: ["Marvin Minsky"], year: 1974, kind: "paper", summary: "frames", stance: { is: "adapted", why: "Naive's frame record" } }, { root: v });
t("reference: draft passes the schema", r.ok);
t("reference: id is unique in the file", r.added === "minsky-1974-framework-2");
t("reference: checked without a url is dropped", !("checked" in r.draft.references[1]));

const det = detector.draft({ id: "recipe-ready", tier: "low", question: { verb: "publish", noun: "publication", asking_function: "marketing-and-sales" },
  evidence: { kind: "person", sensor: "reviewer", sources: [{ source: "venture", records: "decisions/[id]" }], scale: { min: 1, max: 5 } }, criterion: { yes: { value: 4, set_by: "founder" }, no: { value: 2, set_by: "founder" } },
  resolution: { resolver: { kind: "person", id: "founder" }, time_to_detect: "2w" } });
t("detector: draft passes the schema", det.ok);
t("detector: low tier costs a miss the same as a false alarm", det.ok && det.draft.costs?.miss === 1 && det.draft.costs.false_alarm === 1 && det.draft.costs.set_by === "tier");
const costly = detector.draft({ ...det.draft, costs: undefined, tier: "costly" });
t("detector: costly tier makes a miss cost three times a false alarm", costly.ok && costly.draft.costs?.miss === 3 && costly.draft.costs.false_alarm === 1);
const door = detector.draft({ ...det.draft, costs: undefined, criterion: undefined, tier: "one_way_door" });
t("detector: one_way_door routes every call to a person and has no costs", door.ok && door.draft.criterion.route === "person" && door.draft.costs === undefined);
t("detector: one_way_door with a line fails the schema", !validate("detector", { ...door.draft, criterion: { yes: { value: 0.5, set_by: "founder" } } }).ok);
t("detector: one_way_door with costs fails the schema", !validate("detector", { ...door.draft, costs: det.draft.costs }).ok);
t("detector: a low detector routed to a person fails the schema", !validate("detector", { ...det.draft, criterion: { route: "person" } }).ok);
t("detector: a criterion with both a line and route person fails the schema", !validate("detector", { ...det.draft, criterion: { ...det.draft.criterion, route: "person" } }).ok);
t("detector: no tier is refused before the schema", !detector.draft({ ...det.draft, tier: undefined }).ok);
t("detector: base rate comes from the ledger unless stated", det.ok && det.draft.base_rate.source === "ledger");
t("detector: a stated base rate with no one stating it fails the schema", !detector.draft({ ...det.draft, base_rate: { source: "stated", value: 0.3 } }).ok);
t("detector: a criterion that names no one fails the schema", !validate("detector", { ...det.draft, criterion: { yes: { value: 4 } } }).ok);
t("detector: no criterion is refused before the schema", !detector.draft({ ...det.draft, criterion: undefined }).ok);
t("detector: evidence that names no source fails the schema", !validate("detector", { ...det.draft, evidence: { ...det.draft.evidence, sources: undefined } }).ok);
t("detector: a source that names no records fails the schema", !validate("detector", { ...det.draft, evidence: { ...det.draft.evidence, sources: [{ source: "venture" }] } }).ok);

const band = { yes: 4, no: 2 };
t("detector-trial: the call follows the band", detectorTrial.call(4, band) === "yes" && detectorTrial.call(3, band) === "unsure" && detectorTrial.call(2, band) === "no" && detectorTrial.call(3, { yes: 4 }) === "no" && detectorTrial.call(3, { route: "person" }) === "unsure");
const below = { yes: 0.7, yes_when: /** @type {const} */ ("below") };
t("detector-trial: under yes_when below the yes line is strict", detectorTrial.call(0.69, below) === "yes" && detectorTrial.call(0.7, below) === "no" && detectorTrial.call(0.7, { yes: 0.7, yes_when: "above" }) === "yes");
const bt = detectorTrial.draft({ detector: "gate-confidence", score: 0.7, criterion: below });
t("detector-trial: a trial copies yes_when and passes the schema", bt.ok && bt.draft.call === "no" && bt.draft.criterion?.yes_when === "below");
const pt = detectorTrial.draft({ detector: "breaking-release", score: 0.9, criterion: { route: "person" }, call: "yes" });
t("detector-trial: under route person the person's call is kept", pt.ok && pt.draft.call === "yes");
const tr = detectorTrial.draft({ detector: "recipe-ready", score: 3, criterion: band });
t("detector-trial: a trial passes the schema and chains from genesis", tr.ok && tr.draft.call === "unsure" && tr.draft.prev === "genesis");
const rs = detectorTrial.draft({ detector: "recipe-ready", trial: "t-1", outcome: "false-alarm", by: { kind: "person", id: "founder" } });
t("detector-trial: a resolution passes the schema", rs.ok && rs.draft.kind === "resolution");
t("detector-trial: a resolution with no one settling it is refused", !detectorTrial.draft({ detector: "recipe-ready", trial: "t-1", outcome: "hit" }).ok);
t("detector-trial: a trial line may not carry an outcome", tr.ok && !validate("detector-trial", { ...tr.draft, outcome: "hit" }).ok);
t("detector-trial: a resolution line may not carry a score", rs.ok && !validate("detector-trial", { ...rs.draft, score: 1 }).ok);

console.log(fails ? `${fails} failed` : "record generators: all pass");
process.exitCode = fails ? 1 : 0;
