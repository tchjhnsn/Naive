// The signal library's record types (signal library design, build item 2; everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md): the examples validate, a signal's id is the address of its content, the
// schemas refuse what the design forbids, and each generator drafts a record that passes its schema.
//   node packages/naive/src/engine/generators/signals-test.ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { validate } from "./generate.mjs";
import { validateFile, validateValue } from "../../records/validate.mjs";
import { readDataModel } from "../../records/index.mjs";
import { canonicalJson, idHolds, signalId } from "../../core/signal-id.ts";
import * as signal from "./signal.ts";
import * as signalType from "./signal-type.ts";
import * as signalLibrary from "./signal-library.ts";
import * as signalLog from "./signal-log.ts";
import * as competitor from "./competitor.ts";
import * as competitorSignals from "./competitor-signals.ts";
import type { NaiveConfig, Signal, SignalType } from "../../records/types/records.d.ts";

let fails = 0;
const t = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}`); if (!ok) fails++; };
const ex = new URL("../../records/examples/signals/", import.meta.url).pathname;
const load = <T>(rel: string): T => JSON.parse(readFileSync(join(ex, rel), "utf8")) as T;
const files = (d: string): string[] => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? files(join(d, n)) : [join(d, n)]);
const valid = (name: string, value: unknown) => validateValue(name, value).status === 0;

// Every example file validates against the schema of its record type.
const SCHEMA: [RegExp, string][] = [
  [/^library\/library\.json$/, "signal-library.schema.json"],
  [/^library\/types\/[^/]+\/[^/]+\.signal\.json$/, "signal-type.schema.json"],
  [/^library\/signals\/[^/]+\/[^/]+\/[^/]+\.json$/, "signal.schema.json"],
  [/^library\/log\/[^/]+\/[^/]+\.jsonl$/, "signal-log.schema.json"],
  [/^competitors\/[^/]+\.json$/, "competitor.schema.json"],
  [/^competitors\/[^/]+\/signals\.json$/, "competitor-signals.schema.json"],
  [/^naive\.config\.json$/, "naive-config.schema.json"],
  [/^knowledge\/sources\.json$/, "knowledge-sources.schema.json"],
];
for (const f of files(ex)) {
  const rel = relative(ex, f), schema = SCHEMA.find(([re]) => re.test(rel))?.[1];
  if (!schema) { t(`${rel}: a record type covers it`, false); continue; }
  const ok = rel.endsWith(".jsonl")
    ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).every((l) => valid(schema, JSON.parse(l)))
    : validateFile(schema, f).status === 0;
  t(`${rel} passes ${schema}`, ok);
}

// The id rule.
const sigFile = files(join(ex, "library/signals"))[0];
const sig = JSON.parse(readFileSync(sigFile, "utf8")) as Signal;
t("the example signal's id is the address of its other fields", idHolds(sig) && sig.id === signalId(sig));
t("the example signal sits at signals/<type>/<subject>/<yyyy-mm-dd>-<id>.json", relative(join(ex, "library"), sigFile) === signal.signalPath(sig));
t("the address ignores key order", signalId({ ...sig, props: { round: sig.props.round, org: sig.props.org } }) === sig.id);
t("canonical JSON sorts keys at every level and has no whitespace", canonicalJson({ b: [{ d: 1, c: 2 }], a: null }) === '{"a":null,"b":[{"c":2,"d":1}]}');
t("changing any field changes the address", signalId({ ...sig, time: "2026-11-04" }) !== sig.id && signalId({ ...sig, rating: { reliability: "C", credibility: 2 } }) !== sig.id);
t("the id itself is left out of the hash", signalId({ ...sig, id: "000000000000000000000000" }) === sig.id);
const line = JSON.parse(readFileSync(files(join(ex, "library/log"))[0], "utf8").trim()) as { id: string; path: string };
t("the day index names the signal by its address and path", line.id === sig.id && line.path === signal.signalPath(sig));

// What the schemas refuse.
const { id: _id, ...noId } = sig;
t("signal: no id fails", !valid("signal.schema.json", noId));
t("signal: an id that is not 24 lowercase hex fails", !valid("signal.schema.json", { ...sig, id: sig.id.toUpperCase() }) && !valid("signal.schema.json", { ...sig, id: sig.id.slice(1) }));
t("signal: both retracts and supersedes fails", !valid("signal.schema.json", { ...sig, retracts: sig.id, supersedes: sig.id }));
t("signal: retracts alone passes", valid("signal.schema.json", { ...sig, retracts: sig.id }));
t("signal: reliability outside A to F fails", !valid("signal.schema.json", { ...sig, rating: { reliability: "G", credibility: 2 } }));
t("signal: credibility outside 1 to 6 fails", !valid("signal.schema.json", { ...sig, rating: { reliability: "B", credibility: 7 } }) && !valid("signal.schema.json", { ...sig, rating: { reliability: "B", credibility: 0 } }));
t("signal: a type without major.minor fails", !valid("signal.schema.json", { ...sig, type: "competitor-funding" }) && !valid("signal.schema.json", { ...sig, type: "competitor-funding@1.0.0" }));
t("signal: CloudEvents source and data are named producer and props", !valid("signal.schema.json", { ...sig, source: "x" }) && !valid("signal.schema.json", { ...sig, data: {} }));
t("signal: a citation needs a url or a ref", !valid("signal.schema.json", { ...sig, cites: [{ title: "a page" }] }) && valid("signal.schema.json", { ...sig, cites: [{ ref: "SEC Form D 0001234" }] }));

const ty = load<SignalType>("library/types/competitor-funding/1.0.0.signal.json");
const fold = ty.projects[0].fields;
t("signal type: a version that is not semver fails", !valid("signal-type.schema.json", { ...ty, version: "1.0" }));
t("signal type: a reducer outside the six fails", !valid("signal-type.schema.json", { ...ty, projects: [{ ...ty.projects[0], fields: { ...fold, last_seen: { reducer: "sum", value: "time" } } }] }));
t("signal type: append without unique_by fails", !valid("signal-type.schema.json", { ...ty, projects: [{ ...ty.projects[0], fields: { ...fold, funding: { reducer: "append", value: "props.round" } } }] }));
t("signal type: unique_by on a reducer other than append fails", !valid("signal-type.schema.json", { ...ty, projects: [{ ...ty.projects[0], fields: { ...fold, last_seen: { reducer: "max", value: "time", unique_by: ["id"] } } }] }));
t("signal type: a fold that reads outside the view fails", !valid("signal-type.schema.json", { ...ty, projects: [{ ...ty.projects[0], fields: { ...fold, last_seen: { reducer: "max", value: "now" } } }] }));
t("signal type: no worked case fails", !valid("signal-type.schema.json", { ...ty, cases: [] }));
t("signal type: props that are not an object schema fail", !valid("signal-type.schema.json", { ...ty, props: { type: "string" } }));
t("signal type: a projection may not run code", !valid("signal-type.schema.json", { ...ty, projects: [{ ...ty.projects[0], code: "render.js" }] }));

const cfg = load<NaiveConfig>("naive.config.json");
const [project, propose] = cfg.listeners ?? [];
const withListener = (l: unknown) => valid("naive-config.schema.json", { listeners: [l] });
t("listener: the three examples differ in what happens (project, propose, revalidate)", (cfg.listeners ?? []).map((l) => l.then).join() === "project,propose,revalidate");
t("listener: a project listener with max_age fails (projection reads no clock)", !withListener({ ...project, max_age: "30d" }));
t("listener: a propose listener may carry max_age", withListener(propose));
t("listener: a project listener must name a route", !withListener({ ...project, consumer: { decision: "x" } }));
t("listener: a listener in naive.config.json must name its consumer", !withListener({ ...propose, consumer: undefined }));
t("listener: an operand reads one field of one file, or the ids of projected records", withListener({ ...propose, criterion: { predicates: [{ id: "p", field: "subject", op: "in", value: { ids: "competitors" } }] } })
  && !withListener({ ...propose, criterion: { predicates: [{ id: "p", field: "subject", op: "in", value: { read: "foundation/icp.json" } }] } })
  && !withListener({ ...propose, criterion: { predicates: [{ id: "p", field: "subject", op: "in", value: { query: "x" } }] } }));
t("listener: exists takes no value, every other op needs one", !withListener({ ...propose, criterion: { predicates: [{ id: "p", field: "subject", op: "exists", value: 1 }] } })
  && !withListener({ ...propose, criterion: { predicates: [{ id: "p", field: "subject", op: "eq" }] } }));
t("listener: a criterion has no score, only bounds and predicates", !withListener({ ...propose, criterion: { salience_below: 0.5 } }));
t("listener: listeners_off holds listener ids", valid("naive-config.schema.json", { listeners_off: ["rival-raised"] }) && !valid("naive-config.schema.json", { listeners_off: ["Rival Raised"] }));

const frame = JSON.parse(readFileSync(new URL("../../../library/packages/finance/frames/fund-without-ceding-control.frame.json", import.meta.url), "utf8")) as Record<string, unknown>;
const { consumer: _c, ...frameListener } = propose;
t("frame: a frame may listen, with no consumer (it is the consumer)", valid("frame.schema.json", { ...frame, listens: [frameListener] }));
t("frame: a frame's listener never projects", !valid("frame.schema.json", { ...frame, listens: [{ ...frameListener, then: "project" }] }));
t("frame: a frame's listener names no other consumer", !valid("frame.schema.json", { ...frame, listens: [propose] }));

const src = load<Record<string, unknown> & { sources: Record<string, unknown>[] }>("knowledge/sources.json");
t("source map: carries is records or signals", !valid("knowledge-sources.schema.json", { ...src, sources: [{ ...src.sources[0], carries: "events" }] }));
t("signal library: the contract is naive-signal-library@1", !valid("signal-library.schema.json", { ...load<object>("library/library.json"), contract: "naive-signal-library@2" }));
t("signal library: naive and local are reserved ids", !valid("signal-library.schema.json", { ...load<object>("library/library.json"), id: "local" }));

const model = readDataModel() as { records: { id: string; writer?: string; kind?: string }[] };
const writer = (id: string) => model.records.find((r) => r.id === id)?.writer;
t("data model: only the projector writes competitors/<id>/signals.json", writer("competitor-signals") === "projection" && writer("competitor") === undefined);
t("data model: the day index is a log", model.records.find((r) => r.id === "signal-log")?.kind === "log");

// Generators.
const s = signal.draft({ type: sig.type, subject: sig.subject, time: sig.time, observed: sig.observed, producer: sig.producer, props: sig.props, rating: sig.rating, cites: sig.cites });
t("signal: the generator computes the same address as the example", s.ok && s.draft?.id === sig.id);
t("signal: the generator drafts for the local library", s.ok && s.file === `raw/signals/${signal.signalPath(sig)}`);
const local = signal.draft({ type: sig.type, subject: sig.subject, time: sig.time, props: sig.props, rating: { reliability: "A", credibility: 1 }, supersedes: sig.id });
t("signal: a person's superseding signal passes, from local/founder", local.ok && local.draft?.producer === "local/founder" && idHolds(local.draft as unknown as Record<string, unknown>));
t("signal: both retracts and supersedes is refused by the schema", !signal.draft({ ...local.draft, retracts: sig.id }).ok);
t("signal: no rating is refused before the schema", !signal.draft({ type: sig.type, subject: sig.subject, time: sig.time, props: sig.props }).ok);
t("signal type: the generator drafts a type that passes", signalType.draft(ty).ok && signalType.draft(ty).file === "types/competitor-funding/1.0.0.signal.json");
t("signal type: no case is refused", !signalType.draft({ ...ty, cases: [] }).ok);
const lib = signalLibrary.draft({ id: "market-example", title: "x", publisher: "y", license: "CC0-1.0" });
t("signal library: the generator fills the contract", lib.ok && lib.draft?.contract === "naive-signal-library@1");
const lg = signalLog.draft({ signal: sig, published: "2026-11-06T09:31:00Z" });
t("signal log: the generator indexes the signal by its day", lg.ok && lg.file === "log/competitor-funding/2026-11-06.jsonl" && canonicalJson(lg.draft) === canonicalJson(line));
const c = competitor.draft({ name: "Acme Robotics", domain: "acme.example" });
t("competitor: the generator slugs the name", c.ok && c.draft?.id === "acme-robotics");
const cs = competitorSignals.draft({ competitor: "acme-robotics", first_seen: "2026-11-05" });
t("competitor signals: the generator drafts the projector's starting record", cs.ok && cs.writer === "projection" && validate("competitor-signals", cs.draft).ok);
for (const g of [signal, signalType, signalLibrary, signalLog, competitor, competitorSignals]) t(`${g.record}: describe asks at least one required field`, g.describe().ask.some((q: { required?: boolean }) => q.required));

console.log(fails ? `${fails} failed` : "signal record types: all pass");
process.exitCode = fails ? 1 : 0;
