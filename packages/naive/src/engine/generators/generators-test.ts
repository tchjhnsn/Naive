// Record generators (EE-099): each pilot describes its questions and drafts a record that passes its schema.
//   node packages/naive/src/engine/generators/generators-test.ts
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import * as bug from "./bug.ts";
import { validate } from "./generate.ts";
import * as glossary from "./glossary.ts";
import * as publishTerms from "./publish-terms.ts";
import * as reference from "./reference.ts";
import * as traceSpan from "./trace-span.ts";
import * as detector from "./detector.ts";
import * as detectorTrial from "./detector-trial.ts";
import * as connection from "./connection.ts";
import * as capabilityCluster from "./capability-cluster.ts";
import * as standard from "./standard.ts";
import * as activityCatalog from "./activity-catalog.ts";
import * as activityAssignments from "./activity-assignments.ts";
import * as elementOwners from "./element-owners.ts";
import * as pcf from "./pcf.ts";
import * as toolCatalog from "./tool-catalog.ts";
import * as languageRubric from "./language-rubric.ts";
import * as leadPlan from "./lead-plan.ts";
import * as timeBox from "./time-box.ts";
import * as meeting from "./meeting.ts";
import * as productCapability from "./product-capability.ts";
import * as rawDump from "./raw-dump.ts";
import * as triage from "./triage.ts";
import * as opportunity from "./opportunity.ts";
import * as supportPolicy from "./support-policy.ts";
import * as supportCase from "./support-case.ts";
import * as validationPlan from "./validation-plan.ts";
import * as gatePolicies from "./phase-gate-policies.ts";
import * as gateCalibration from "./gate-calibration.ts";
import * as marketAnatomy from "./market-anatomy.ts";
import * as industryAnatomy from "./industry-anatomy.ts";
import * as ventureAnatomy from "./venture-anatomy.ts";
import * as risk from "./risk.ts";
import * as marketingMessage from "./marketing-message.ts";
import * as problemPriority from "./problem-priority.ts";
import { readFileSync } from "node:fs";

let fails = 0;
/** An answer the schema refuses, passed as the generator's input to show the schema refuses it. */
const invalid = <T,>(answer: unknown): T => answer as T;
const t = (name: string, ok: unknown) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}`); if (!ok) fails++; };
const v = mkdtempSync(join(tmpdir(), "gen-test-"));
writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "kettle" }));
mkdirSync(join(v, "product/bugs"), { recursive: true });
writeFileSync(join(v, "product/bugs/save-loses-draft.json"), "{}");

for (const g of [bug, glossary, publishTerms, reference, traceSpan, detector, detectorTrial, connection, capabilityCluster, languageRubric, leadPlan, timeBox, meeting, productCapability, rawDump, triage, opportunity, supportPolicy, supportCase, validationPlan, gatePolicies, marketAnatomy, industryAnatomy, ventureAnatomy, marketingMessage, problemPriority]) t(`${g.record}: describe asks at least one required field`, g.describe().ask.some((q) => q.required));

const b = bug.draft({ title: "Save loses draft", severity: "P1", found_in: "0.6.0", repro: "open, type, save" }, { venture: v });
t("bug: draft passes the schema", b.ok);

const sp = traceSpan.draft({ name: "invoke_agent strategy", kind: "agent" });
t("trace-span: draft passes the schema", sp.ok && sp.draft?.prev === "genesis");
t("trace-span: a span with no kind is refused", !traceSpan.draft({ name: "x" }).ok);
t("bug: id is unique among the venture's bugs", b.draft?.id === "save-loses-draft-2");
t("bug: opens with no fix", b.draft?.status === "open" && b.draft?.fixed_in === null);
t("bug: a bad severity fails the schema", !bug.draft(invalid({ title: "x", severity: "P9", found_in: "1" })).ok);
t("bug: no title is refused before the schema", !bug.draft({ severity: "P1" }).ok);

mkdirSync(join(v, "glossary"), { recursive: true });
writeFileSync(join(v, "glossary/brand.json"), JSON.stringify({ package: "brand", terms: [{ term: "kettle", meaning: "the product" }] }));
const g1 = glossary.draft({ package: "brand", term: "pour", meaning: "one use" }, { venture: v });
t("glossary: adds a term to the current file", g1.ok && g1.draft?.terms.length === 2);
t("glossary: a second meaning for a defined term is refused", !glossary.draft({ package: "brand", term: "Kettle", meaning: "a pot" }, { venture: v }).ok);
t("glossary: the same meaning again adds nothing", glossary.draft({ package: "brand", term: "kettle", meaning: "the product" }, { venture: v }).added === false);

mkdirSync(join(v, "marketing"), { recursive: true });
writeFileSync(join(v, "marketing/publish-terms.json"), JSON.stringify({ marks: [{ name: "Nike" }] }));
const terms = publishTerms.draft({ name: "Nightjar", private: true, why: "the product is unannounced" }, { venture: v });
t("publish-terms: adds a name to the current file", terms.ok && terms.draft?.marks.length === 2 && terms.draft.marks[1].private === true);
t("publish-terms: a private name with no why is refused before the schema", !publishTerms.draft({ name: "Kestrel", private: true }, { venture: v }).ok);
t("publish-terms: the same name again adds nothing", publishTerms.draft({ name: "Nike" }, { venture: v }).added === false);
t("publish-terms: listing a public mark as private is refused", !publishTerms.draft({ name: "nike", private: true, why: "no" }, { venture: v }).ok);

mkdirSync(join(v, "packages/naive/src/records/layers/purpose/references"), { recursive: true });
writeFileSync(join(v, "packages/naive/src/records/layers/purpose/references/references.json"), JSON.stringify({ layer: "purpose", references: [{ id: "minsky-1974-framework", title: "x", authors: ["M"], year: 1974, kind: "paper", method: "scientific", summary: "s", informs: [], stance: { is: "adopted", why: "w" } }] }));
const r = reference.draft({ layer: "purpose", title: "A Framework for Representing Knowledge", authors: ["Marvin Minsky"], year: 1974, kind: "paper", method: "scientific", summary: "frames", stance: { is: "adapted", why: "Naive's frame record" } }, { root: v });
t("reference: draft passes the schema", r.ok);
t("reference: id is unique in the file", r.added === "minsky-1974-framework-2");
const second = r.draft?.references[1];
t("reference: checked without a url is dropped", second !== undefined && !("checked" in second));
t("reference: the research method is asked as a choice of the five (EE-233)", reference.describe().ask.some((q) => q.field === "references[].method" && q.required && q.choices?.join() === "standards,scientific,organizational,practitioner,stakeholder"));
t("reference: a draft with no research method is refused", !reference.draft({ layer: "purpose", title: "Society of Mind", authors: ["Marvin Minsky"], year: 1986, kind: "book", summary: "agents", stance: { is: "alternative", why: "w" } }, { root: v }).ok);

const det = detector.draft({ id: "recipe-ready", tier: "low", question: { verb: "publish", noun: "publication", asking_function: "marketing-and-sales" },
  evidence: { kind: "person", sensor: "reviewer", sources: [{ source: "venture", records: "decisions/[id]" }], scale: { min: 1, max: 5 } }, criterion: { yes: { value: 4, set_by: "founder" }, no: { value: 2, set_by: "founder" } },
  resolution: { resolver: { kind: "person", id: "founder" }, time_to_detect: "2w" } });
t("detector: draft passes the schema", det.ok);
t("detector: low tier costs a miss the same as a false alarm", det.ok && det.draft?.costs?.miss === 1 && det.draft?.costs.false_alarm === 1 && det.draft?.costs.set_by === "tier");
const costly = detector.draft({ ...det.draft, costs: undefined, tier: "costly" });
t("detector: costly tier makes a miss cost three times a false alarm", costly.ok && costly.draft?.costs?.miss === 3 && costly.draft?.costs.false_alarm === 1);
const door = detector.draft({ ...det.draft, costs: undefined, criterion: undefined, tier: "one_way_door" });
t("detector: one_way_door routes every call to a person and has no costs", door.ok && door.draft?.criterion.route === "person" && door.draft?.costs === undefined);
t("detector: one_way_door with a line fails the schema", !validate("detector", { ...door.draft, criterion: { yes: { value: 0.5, set_by: "founder" } } }).ok);
t("detector: one_way_door with costs fails the schema", !validate("detector", { ...door.draft, costs: det.draft?.costs }).ok);
t("detector: a low detector routed to a person fails the schema", !validate("detector", { ...det.draft, criterion: { route: "person" } }).ok);
t("detector: a criterion with both a line and route person fails the schema", !validate("detector", { ...det.draft, criterion: { ...det.draft?.criterion, route: "person" } }).ok);
t("detector: no tier is refused before the schema", !detector.draft({ ...det.draft, tier: undefined }).ok);
t("detector: base rate comes from the ledger unless stated", det.ok && det.draft?.base_rate.source === "ledger");
t("detector: a stated base rate with no one stating it fails the schema", !detector.draft({ ...det.draft, base_rate: { source: "stated", value: 0.3 } }).ok);
t("detector: a criterion that names no one fails the schema", !validate("detector", { ...det.draft, criterion: { yes: { value: 4 } } }).ok);
t("detector: no criterion is refused before the schema", !detector.draft({ ...det.draft, criterion: undefined }).ok);
t("detector: evidence that names no source fails the schema", !validate("detector", { ...det.draft, evidence: { ...det.draft?.evidence, sources: undefined } }).ok);
t("detector: a source that names no records fails the schema", !validate("detector", { ...det.draft, evidence: { ...det.draft?.evidence, sources: [{ source: "venture" }] } }).ok);

const band = { yes: 4, no: 2 };
t("detector-trial: the call follows the band", detectorTrial.call(4, band) === "yes" && detectorTrial.call(3, band) === "unsure" && detectorTrial.call(2, band) === "no" && detectorTrial.call(3, { yes: 4 }) === "no" && detectorTrial.call(3, { route: "person" }) === "unsure");
const below = { yes: 0.7, yes_when: "below" as const };
t("detector-trial: under yes_when below the yes line is strict", detectorTrial.call(0.69, below) === "yes" && detectorTrial.call(0.7, below) === "no" && detectorTrial.call(0.7, { yes: 0.7, yes_when: "above" }) === "yes");
const bt = detectorTrial.draft({ detector: "gate-confidence", score: 0.7, criterion: below });
t("detector-trial: a trial copies yes_when and passes the schema", bt.ok && bt.draft?.call === "no" && bt.draft?.criterion?.yes_when === "below");
const pt = detectorTrial.draft({ detector: "breaking-release", score: 0.9, criterion: { route: "person" }, call: "yes" });
t("detector-trial: under route person the person's call is kept", pt.ok && pt.draft?.call === "yes");
const tr = detectorTrial.draft({ detector: "recipe-ready", score: 3, criterion: band });
t("detector-trial: a trial passes the schema and chains from genesis", tr.ok && tr.draft?.call === "unsure" && tr.draft?.prev === "genesis");
const rs = detectorTrial.draft({ detector: "recipe-ready", trial: "t-1", outcome: "false-alarm", by: { kind: "person", id: "founder" } });
t("detector-trial: a resolution passes the schema", rs.ok && rs.draft?.kind === "resolution");
t("detector-trial: a resolution with no one settling it is refused", !detectorTrial.draft({ detector: "recipe-ready", trial: "t-1", outcome: "hit" }).ok);
t("detector-trial: a trial line may not carry an outcome", tr.ok && !validate("detector-trial", { ...tr.draft, outcome: "hit" }).ok);
t("detector-trial: a resolution line may not carry a score", rs.ok && !validate("detector-trial", { ...rs.draft, score: 1 }).ok);

const conn = connection.draft({ id: "Product Email", cluster: "messaging-delivery", access: { reads: [], writes: [{ what: "send", scope: "messages:send" }] },
  external_id: { field: "message_id" }, actions: [{ id: "send-update", kind: "send" }, { id: "pay", kind: "payment" }, { id: "sign", kind: "signature", approval: "spend-money" }, { id: "add", kind: "create" }],
  idempotency: { key: "route and version", retries: { max: 3 }, reconciliation: { compares: "sent against the outbox" } },
  exit: { deletion: "d", export: "e", disconnect: "x" }, failure: { stale: [], blocks: ["sending"], degrades: [] } });
t("connection: draft passes the schema with the thesis's defaults", conn.ok && conn.route === "it/connections/product-email" && conn.draft?.sync.direction === "tool-to-repo"
  && conn.draft?.sync.references_only === true && conn.draft?.external_id.provenance === true && conn.draft?.external_id.last_synced === null && conn.draft?.idempotency.reconciliation.cadence === "daily" && conn.draft?.status === "planned");
t("connection: a send and a payment with no approval get public-commitment and spend-money", conn.ok && conn.draft?.actions[0].approval === "public-commitment" && conn.draft?.actions[1].approval === "spend-money");
t("connection: an approval a person gave is never changed, and other actions get none", conn.ok && conn.draft?.actions[2].approval === "spend-money" && conn.draft !== undefined && !("approval" in conn.draft.actions[3]));
t("connection: no exit plan is refused before the schema", !connection.draft({ ...conn.draft, exit: undefined }).ok);
const tb = timeBox.draft({ kind: "sprint", title: "Launch week", goal: "Ship the beta", starts: "2026-06-01T00:00:00.000Z", ends: "2026-06-08T00:00:00.000Z", functions: ["products"] });
t("time-box: draft takes its id from the title, starts active and goes to operations/time-box/<id>", tb.ok && tb.route === "operations/time-box/launch-week" && tb.draft?.status === "active");
t("time-box: one that ends before it starts, or covers nothing, is refused", !timeBox.draft({ kind: "sprint", title: "x", goal: "y", starts: "2026-06-08T00:00:00.000Z", ends: "2026-06-01T00:00:00.000Z", functions: ["products"] }).ok && !timeBox.draft({ kind: "campaign", title: "x", goal: "y", starts: "2026-06-01T00:00:00.000Z", ends: "2026-06-08T00:00:00.000Z" }).ok);
t("time-box: a loop mode with no person who set it fails the schema", !timeBox.draft({ kind: "sprint", title: "x", goal: "y", starts: "2026-06-01T00:00:00.000Z", ends: "2026-06-08T00:00:00.000Z", functions: ["products"], loop_mode: "auto" }).ok);
const mt = meeting.draft({ title: "Strategy intake", goal: "Draft the telos and the problem", outcome_expected: ["a draft telos", "a draft problem"], called_by: "torian",
  attendees: [{ id: "torian", kind: "person" }, { id: "strategy-agent", kind: "agent" }], workflow: "strategy/intake", agenda: [{ title: "Ask telos", step: "ask-telos", ask: true }] });
t("meeting: draft takes its id from the title, starts planned with each item pending, and goes to operations/meeting/<id>", mt.ok && mt.route === "operations/meeting/strategy-intake"
  && mt.draft?.status === "planned" && mt.draft?.agenda[0].id === "ask-telos" && mt.draft?.agenda[0].status === "pending");
t("meeting: one with no goal, no expected outcome or neither agenda nor workflow is refused", !meeting.draft({ ...mt.draft, goal: undefined }).ok
  && !meeting.draft({ ...mt.draft, outcome_expected: [] }).ok && !meeting.draft({ ...mt.draft, agenda: [], workflow: undefined }).ok);
const closedBad = { ...mt.draft, status: "closed", opened_at: "2026-11-26T19:00:00.000Z", closed_at: "2026-11-26T20:00:00.000Z", outcome: { reached: "yes", summary: "Done" } };
t("meeting: the schema refuses a closed meeting with a pending item, or with no outcome", !validate("meeting", closedBad).ok
  && !validate("meeting", { ...closedBad, agenda: [{ ...mt.draft?.agenda[0], status: "done" }], outcome: undefined }).ok
  && validate("meeting", { ...closedBad, agenda: [{ ...mt.draft?.agenda[0], status: "done" }] }).ok);
t("meeting: the schema refuses an open meeting with no opened_at", !validate("meeting", { ...mt.draft, status: "open" }).ok);
const cap = productCapability.draft({ name: "Time travel", product: "kettle", kind: "capability", parent: "history", owner: "time-travel-agent" });
t("product-capability: draft takes its id from the name, starts building, and goes to product/capabilities/<id>", cap.ok && cap.route === "product/capabilities/time-travel" && cap.draft?.status === "building");
t("product-capability: a category may sit directly under the products function", productCapability.draft({ name: "History", product: "kettle", kind: "category", owner: "history-agent" }).draft?.parent === null);
t("product-capability: a capability with no category, or no owner, is refused", !productCapability.draft({ ...cap.draft, parent: null }).ok && !productCapability.draft({ ...cap.draft, owner: undefined }).ok);
t("product-capability: the schema refuses a capability whose parent is null, and an unknown status", !validate("product-capability", { ...cap.draft, parent: null }).ok && !validate("product-capability", { ...cap.draft, status: "paused" }).ok);
const lp = leadPlan.draft({ lead: "growth-lead", measures: ["paying-teams"] });
t("lead-plan: draft takes the portfolio from the library role, no bets and a monthly review", lp.ok && lp.route === "operations/lead/growth-lead"
  && lp.draft.portfolio.join() === "marketing-and-sales,customer-service" && lp.draft.bets.length === 0 && lp.draft.review_cadence === "monthly");
const rd = rawDump.draft({ text: "Weekend lists differ.", captured: "2026-11-09T00:30:00Z", suffix: "k4p2", channel: "naive capture" });
t("raw-dump: draft keeps the text verbatim under frontmatter, at raw/dump/<capture id>.md", rd.ok && rd.file === "raw/dump/20261109-003000-k4p2.md" && rd.draft.text.endsWith("\n\nWeekend lists differ.\n"));
t("raw-dump: an empty capture is refused", !rawDump.draft({ text: "  " }).ok);
const tri = triage.draft({ id: "r1", entry: "raw/dump/r1.md", model: "jev-latest", line: 0.95, labels: [{ key: "kind:idea", kind: "noul", p: 0.98 }, { key: "door:one-way", kind: "noul", p: 0.03 }, { key: "function:f1:it", kind: "noul", p: 0.6 }, { key: "urgency", kind: "score", p: 0.5 }] });
t("triage: sure at or above the line or at or below one minus it, a score always sure, the rest held", tri.ok && tri.draft?.held?.join() === "function:f1:it" && tri.draft?.status === "held" && tri.route === "raw/triage/r1");
t("lead-plan: a role with no portfolio is refused", !leadPlan.draft({ lead: "builder", measures: ["paying-teams"] }).ok);
t("lead-plan: a plan bound to no measure is refused", !leadPlan.draft({ lead: "growth-lead", measures: [] }).ok);
const cc = capabilityCluster.draft({ title: "Physical logistics", functions: ["supply-chain"], gaps: ["network-or-money-rail"], why: "carriers and customs" });
t("capability-cluster: a new cluster is added to the catalog and passes the schema", cc.ok && cc.added === "physical-logistics" && cc.draft?.clusters.length === 7);
t("capability-cluster: a cluster already in the catalog is refused", !capabilityCluster.draft({ title: "Messaging delivery", functions: ["products"], gaps: ["runtime"], why: "x" }).ok);
t("capability-cluster: a vendor field fails the schema", cc.ok && !validate("capability-cluster", { ...cc.draft, clusters: [{ ...cc.draft?.clusters[0], vendor: "Acme" }] }).ok);
const st = standard.draft({ name: "Unified Modeling Language", issuer: "Object Management Group", url: "https://www.omg.org/spec/UML", status: "considered", copyright: "open", uses: "Class and state diagrams.", checked: "2026-11-19" });
t("standard: a new standard is drafted as its own file and passes the schema", st.ok && st.file === "packages/naive/src/terms/standards/unified-modeling-language.json" && st.draft?.checked === "2026-11-19" && st.draft?.gaps.length === 0);
t("standard: a standard already in the catalog is refused", !standard.draft({ id: "bfo", name: "BFO", issuer: "ISO", url: "https://basic-formal-ontology.org/", status: "adopted", copyright: "restricted", uses: "x", checked: "2026-11-19" }).ok);
t("standard: an unconfirmed standard with no note is refused", !standard.draft({ name: "Some standard", issuer: "X", url: "https://example.org/", status: "considered", copyright: "open", uses: "x" }).ok);
const lrCandidate = { id: "go", language: "Go", scores: { "runtime-fit": 4 }, why: { "runtime-fit": "a fixture" } };
const lrRated = { by: "generators-test", on: "2026-11-26", basis: "a fixture" };
const lr = languageRubric.draft({ system: "A webhook relay", target: "server", candidates: [lrCandidate], chosen: "go", decided_by: ["EE-189"], rated: lrRated });
t("language-rubric: a new worked example is added and passes the schema", lr.ok && lr.added === "a-webhook-relay" && lr.draft?.examples.at(-1)?.chosen === "go");
t("language-rubric: an example already in the rubric is refused", !languageRubric.draft({ id: "naive-framework", system: "x", target: "server", candidates: [lrCandidate], chosen: "go", decided_by: ["EE-189"], rated: lrRated }).ok);
t("language-rubric: a score on a criterion the rubric lacks is refused", !languageRubric.draft({ system: "y", target: "server", candidates: [{ ...lrCandidate, scores: { speed: 4 } }], chosen: "go", decided_by: ["EE-189"], rated: lrRated }).ok);
t("language-rubric: a score outside 0 to 4 fails the schema", !languageRubric.draft({ system: "z", target: "server", candidates: [{ ...lrCandidate, scores: { licence: 7 } }], chosen: "go", decided_by: ["EE-189"], rated: lrRated }).ok);
const tc = toolCatalog.draft({ title: "Grants", function: "finance", kind: "workflow", phase: "validation", about: "Grants applied for and won", process_groups: ["9.7"], proposes: ["grant"] });
t("tool-catalog: a new tool is added to the catalog and passes the schema", tc.ok && tc.added === "grants" && tc.draft?.tools.at(-1)?.function === "finance");
t("tool-catalog: a tool already in the catalog is refused", !toolCatalog.draft({ title: "Books", kind: "view", phase: "validation", about: "x" }).ok);
t("tool-catalog: a tool with no kind is refused", !toolCatalog.draft({ title: "Ledger", phase: "validation", about: "x" }).ok);
const ac = activityCatalog.draft({ id: "interview-customers", process_group: "3.1", statement: "Interview prospective customers to learn how they solve the problem today.", ratings: { importance: 4 }, rated: { by: "generators-test", on: "2026-11-25", basis: "a fixture" } });
t("activity-catalog: a new activity is added cross-industry and passes the schema", ac.ok && ac.added === "interview-customers" && ac.draft?.activities.at(-1)?.scope.kind === "cross-industry");
const acRoot = mkdtempSync(join(tmpdir(), "activity-catalog-"));
mkdirSync(join(acRoot, "packages/naive/src/functions"), { recursive: true });
writeFileSync(join(acRoot, activityCatalog.FILE), JSON.stringify(ac.draft));
t("activity-catalog: an activity already in the catalog is refused", !activityCatalog.draft({ id: "interview-customers", process_group: "3.1", statement: "Interview customers again." }, { root: acRoot }).ok);
t("activity-catalog: ratings with no rated fail the schema", !activityCatalog.draft({ process_group: "3.1", statement: "Survey customers about the problem.", ratings: { importance: 4 } }).ok);
t("activity-catalog: an activity with no process group is refused", !activityCatalog.draft({ statement: "Survey customers about the problem." }).ok);
t("activity-assignments: a known activity with a performer passes, and an unknown activity or value is refused", activityAssignments.draft({ activities: { "interview-customers": { performer: "agent" } } }, { root: acRoot }).ok && !activityAssignments.draft({ activities: { "no-such-activity": { performer: "agent" } } }, { root: acRoot }).ok && !activityAssignments.draft({ activities: { "interview-customers": { performer: "robot" as "agent" } } }, { root: acRoot }).ok && activityAssignments.draft({}).ok);
t("activity-assignments: an APQC level 4 activity passes, and one APQC lacks or of another level is refused", activityAssignments.draft({ activities: { "3.5.1.6": { approval: "person" } } }).ok && !activityAssignments.draft({ activities: { "99.9.9.9": { approval: "person" } } }).ok && !activityAssignments.draft({ activities: { "3.5.1": { approval: "person" } } }).ok);
t("element-owners: a role or a person for a known element passes, and an unknown element or an owner that is both is refused", elementOwners.draft({ owners: { "3.0": { role: "growth-lead" }, "3.5.1.6": { person: "Ana Ruiz" } } }).ok && !elementOwners.draft({ owners: { "99.9": { role: "founder" } } }).ok && !elementOwners.draft({ owners: { "3.0": { role: "growth-lead", person: "Ana" } } }).ok && elementOwners.draft({}).ok);
const pc = pcf.draft({ elements: [{ id: "1.1", name: "Define the business concept and long-term vision", pcf: 17040, level: 2 }, { id: "1.0", name: "Develop Vision and Strategy", pcf: 10002, level: 1 }] });
t("pcf: the hierarchy replaces the elements, sorted, under the file's header, and passes the schema", pc.ok && pc.draft?.elements.map((e) => e.id).join(" ") === "1.0 1.1" && pc.draft?.version === "8.0" && pc.draft?.attribution.includes("APQC"));
t("pcf: format writes one element per line", pc.ok && !!pc.draft && pcf.format(pc.draft).includes('\n    {"id": "1.0", "name": "Develop Vision and Strategy", "pcf": 10002, "level": 1},\n'));
t("pcf: no elements is refused", !pcf.draft({ elements: [] }).ok);
t("pcf: a root with no pcf.json is refused", !pcf.draft({ elements: [{ id: "1.0", name: "Develop Vision and Strategy", pcf: 10002, level: 1 }] }, { root: mkdtempSync(join(tmpdir(), "pcf-")) }).ok);

const op = opportunity.draft({ title: "Corner Bakery POS", source: "inbound", created: "2026-11-20T15:00:00Z", value: { amount: 600, currency: "USD", cadence: "annual" } });
t("opportunity: draft starts at lead with no reply yet and passes the schema", op.ok && op.route === "sales/opportunities/corner-bakery-pos" && op.draft.pipeline_stage === "lead" && op.draft.first_response === null);
t("opportunity: a lost opportunity with no outcome is refused", !opportunity.draft({ ...op.draft, pipeline_stage: "lost" }).ok);
t("opportunity: a lost opportunity with the buyer's reason passes", opportunity.draft({ ...op.draft, pipeline_stage: "lost", outcome: { reason: "Chose to keep the spreadsheet", category: "no-decision", from: "buyer" } }).ok);
const pol = supportPolicy.draft({ channels: [{ channel: "email", hours: "weekdays" }], targets: [{ first_response_hours: 24, business_hours: true }], refunds: { rule: "Full refund within 30 days of purchase" } });
t("support-policy: draft fills the starting escalations and passes the schema", pol.ok && pol.route === "support/policy" && pol.draft.escalate_when.includes("legal-threat"));
t("support-policy: escalations a person gave are kept", supportPolicy.draft({ ...pol.draft, escalate_when: ["safety"] }).draft?.escalate_when.join() === "safety");
const sc = supportCase.draft({ opened: "2026-11-21T09:30:00Z", channel: "email", kind: "complaint", summary: "Charged twice this month" });
t("support-case: draft starts at new with its id from the date and passes the schema", sc.ok && sc.route === "support/cases/2026-11-21-charged-twice-this-month" && sc.draft.status === "new" && sc.draft.resolved === null);
t("support-case: a refund with no decision fails the schema", !validate("support-case", { ...sc.draft, refund: { amount: 20, currency: "USD" } }).ok);

const plan = validationPlan.draft({ assumptions: [{ statement: "Clinic owners pay for scheduling", item: "economic-signal", test: "Ask five owners for a deposit", pass: "Two of five pay", by: "2026-12-31" }] }, { venture: v });
t("validation-plan: draft takes the venture id, opens each assumption and passes the schema", plan.ok && plan.draft?.venture === "kettle" && plan.draft?.assumptions[0].status === "open" && plan.draft?.assumptions[0].id === "clinic-owners-pay-for-scheduling");
t("validation-plan: an item no phase gate names is refused", !validationPlan.draft({ assumptions: [{ ...plan.draft?.assumptions[0], item: "vibes" }] }).ok);
t("validation-plan: uncovered lists the scored discovery items the plan does not name", plan.ok && plan.draft !== undefined && !validationPlan.uncovered(plan.draft).includes("economic-signal") && validationPlan.uncovered(plan.draft).includes("problem") && !validationPlan.uncovered(plan.draft).includes("decision"));
const shipped = JSON.parse(readFileSync(new URL("../../phases/gate-policies.json", import.meta.url), "utf8"));
const gp = gatePolicies.draft(shipped);
t("phase-gate-policies: the shipped policies redraft and pass", gp.ok);
const presets = shipped.phases.discovery.presets;
t("phase-gate-policies: strictness ranks lenient below standard below strict", gatePolicies.strictness(presets.lenient) < gatePolicies.strictness(presets.standard) && gatePolicies.strictness(presets.standard) < gatePolicies.strictness(presets.strict));
const { decision: _d, ...short } = presets.standard;
t("phase-gate-policies: a preset missing an item is refused", !gatePolicies.draft({ ...shipped, phases: { discovery: { ...shipped.phases.discovery, presets: { standard: short } } } }).ok);
t("phase-gate-policies: an item naming an unknown record type is refused", !gatePolicies.draft({ ...shipped, phases: { discovery: { ...shipped.phases.discovery, items: [{ ...shipped.phases.discovery.items[0], record: "nope" }, ...shipped.phases.discovery.items.slice(1)] } } }).ok);
const shippedCal = JSON.parse(readFileSync(new URL("../../phases/gate-calibration.json", import.meta.url), "utf8"));
const { version: _calVersion, ...calRest } = shippedCal;
t("gate-calibration: the shipped rules redraft and pass", gateCalibration.draft(calRest).ok);
t("gate-calibration: a draft with no rules is refused", !gateCalibration.draft({ ...calRest, rules: [] }).ok);

const mk = marketAnatomy.draft({}, { venture: v });
t("market-anatomy: an empty draft is the whole sub-matrix, every cell unknown, at markets/primary", mk.ok && mk.route === "markets/primary" && mk.draft.venture === "kettle" && Object.values(mk.draft.cells).length === 11 && Object.values(mk.draft.cells).every((c) => c.status === "unknown"));
t("market-anatomy: a given cell is kept and a null status is refused", marketAnatomy.draft({ cells: { deal_size_usd: { status: "estimated", value: 900 } } }).draft?.cells.deal_size_usd?.value === 900 && !marketAnatomy.draft(invalid({ cells: { deal_size_usd: { status: null } } })).ok);
const ind = industryAnatomy.draft({ naics: "541511", name: "Custom Computer Programming Services" });
t("industry-anatomy: a NAICS code names the id, and every cell starts unknown", ind.ok && ind.route === "industries/naics-541511" && Object.values(ind.draft.cells).length === 10 && Object.values(ind.draft.cells).every((c) => c.status === "unknown"));
const shippedVam = JSON.parse(readFileSync(new URL("../../functions/strategy/venture-anatomy.json", import.meta.url), "utf8"));
t("venture-anatomy: the shipped matrix redrafts and passes", ventureAnatomy.draft(shippedVam).ok);
t("venture-anatomy: a viewpoint reading a sub-matrix the matrix lacks is refused", !ventureAnatomy.draft({ ...shippedVam, viewpoints: [{ id: "x", label: "X", concerns: "?", kind: "submatrices", reads: ["nope"] }] }).ok);

// Risk (EE-212): the impact range cites a source or is marked an estimate, and expected loss carries the same label.
const riskBase = { title: "A former employer claims the code", cause: "A founder wrote early code while employed", consequence: "An injunction stops sales",
  category: "legal" as const, owner: "ana-ruiz", likelihood: { low: 0.02, high: 0.1 }, treatment: "reduce" as const, review_date: "2027-03-01" };
const sourced = risk.draft({ ...riskBase, impact: { low: 20000, high: 150000, currency: "USD", source: "legal/obligations/ip-assignment" } });
t("risk: an impact that cites a source passes, and expected loss carries the source", sourced.ok && sourced.draft !== undefined
  && JSON.stringify(risk.expectedLoss(sourced.draft)) === JSON.stringify({ low: 400, high: 15000, currency: "USD", source: "legal/obligations/ip-assignment" }));
const estimated = risk.draft({ ...riskBase, impact: { low: 20000, high: 150000, currency: "USD", estimate: { basis: "Counsel's fees for a demand letter to a short trial", by: "risk-and-compliance-agent" } } });
t("risk: an impact marked an estimate passes, and expected loss carries the estimate", estimated.ok && estimated.draft !== undefined
  && JSON.stringify(risk.expectedLoss(estimated.draft).estimate) === JSON.stringify({ basis: "Counsel's fees for a demand letter to a short trial", by: "risk-and-compliance-agent" }) && !("source" in risk.expectedLoss(estimated.draft)));
const bare = risk.draft(invalid({ ...riskBase, impact: { low: 20000, high: 150000, currency: "USD" } }));
t("risk: an impact with neither a source nor an estimate is refused", !bare.ok && bare.errors.some((e) => /exactly one of source/.test(e)));
const both = risk.draft(invalid({ ...riskBase, impact: { low: 1, high: 2, currency: "USD", source: "finance/spend/counsel", estimate: { basis: "x", by: "ana-ruiz" } } }));
t("risk: an impact with both a source and an estimate is refused", !both.ok);
t("risk: an estimate with no one named as estimating it is refused", !risk.draft(invalid({ ...riskBase, impact: { low: 1, high: 2, currency: "USD", estimate: { basis: "a guess" } } })).ok);
t("risk: a guess written into source as an assumption is refused, so it goes in estimate", !risk.draft({ ...riskBase, impact: { low: 1, high: 2, currency: "USD", source: "assumption: about what counsel charges" } }).ok);

const msg = marketingMessage.draft({ kind: "headline", page: "/", item: "what", text: "Keep what the venture knows in one place.",
  cites: [{ record: "foundation/problem", why: "the problem in the founder's words" }] });
t("marketing-message: a drafted element passes, at the id the gap report names", msg.ok && msg.route === "marketing/message/home-what" && msg.draft?.id === "home-what");
t("marketing-message: words no record stands behind are refused", !marketingMessage.draft({ kind: "headline", text: "The best tool ever" }).ok);
t("marketing-message: a call to action with nowhere named is refused, and none is an answer", !marketingMessage.draft({ kind: "cta-primary", item: "next-step", text: "Start a venture", cites: [{ record: "foundation/core" }] }).ok
  && marketingMessage.draft({ kind: "cta-primary", item: "next-step", text: "Start a venture", destination: { kind: "none", note: "the founder decides where it leads" }, cites: [{ record: "foundation/core" }] }).ok);

const shippedPriority = JSON.parse(readFileSync(new URL("../../functions/strategy/problem-priority.json", import.meta.url), "utf8"));
t("problem-priority: the shipped weights redraft and pass", problemPriority.draft(shippedPriority).ok);
t("problem-priority: a draft with no weights is refused, since the ranking has nothing to weigh", !problemPriority.draft({ ...shippedPriority, weights: undefined }).ok);
t("problem-priority: a negative weight is refused", !problemPriority.draft({ ...shippedPriority, weights: { ...shippedPriority.weights, ranked_first: -1 } }).ok);

console.log(fails ? `${fails} failed` : "record generators: all pass");
process.exitCode = fails ? 1 : 0;
