// The pure signal render (signal library design, build item 3): every worked case of the example signal types renders
// to its expected records, and receive, withdraw, the fold, the fixpoint, edge listeners and the diff each behave as
// the design says.
//   node packages/naive/src/engine/signals/render-test.ts
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson, signalId } from "../../core/signal-id.ts";
import { caseSignal, diff, fold, receive, render, renderCase, satisfies, viewsOf, withdraw } from "./render.ts";
import type { Contribution, Received, Rendered, View } from "./render.ts";
import type { Listener, NaiveConfig, Signal, SignalType } from "../../records/types/records.d.ts";

let fails = 0;
const t = (name: string, ok: boolean, detail?: unknown) => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}`); if (!ok) { fails++; if (detail !== undefined) console.log(`      ${JSON.stringify(detail)}`); } };
const ex = new URL("../../records/examples/signals/", import.meta.url).pathname;
const files = (d: string): string[] => readdirSync(d).flatMap((n) => statSync(join(d, n)).isDirectory() ? files(join(d, n)) : [join(d, n)]);
const json = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
const types = files(join(ex, "library/types")).map((f) => json<SignalType>(f));
const type = (id: string) => types.find((x) => x.id === id) as SignalType;
const sig = json<Signal>(files(join(ex, "library/signals"))[0]);
const cfg = json<NaiveConfig>(join(ex, "naive.config.json"));
const listener = (id: string) => (cfg.listeners ?? []).find((l) => l.id === id) as Listener;
const local = (s: Signal): Received => ({ signal: s, library: "market-example" });
/** A signal with its address recomputed after a change. */
const make = (s: Omit<Signal, "id"> & { id?: string }): Signal => { const rest: Record<string, unknown> = { ...s }; delete rest.id; return { ...rest, id: signalId(rest) } as Signal; };

// ---- Worked cases ----

/** An expected entry that leaves signal out matches a rendered entry with any signal. */
const strip = (expected: unknown, actual: unknown): unknown => {
  if (Array.isArray(expected) && Array.isArray(actual)) return actual.map((a, i) => strip(expected[i], a));
  if (expected && actual && typeof expected === "object" && typeof actual === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(actual)) if (k !== "signal" || "signal" in (expected as object)) out[k] = strip((expected as Record<string, unknown>)[k], v);
    return out;
  }
  return actual;
};
let cases = 0;
for (const ty of types) for (const c of ty.cases) {
  cases++;
  const { signals, result } = renderCase(ty, types, c);
  const got = result.status === "rendered" ? Object.fromEntries(result.records.map((r) => [r.route, r.record])) : { raised: result.why };
  t(`case ${ty.id}/${c.id} renders to its expected records`, canonicalJson(strip(c.expect, got)) === canonicalJson(c.expect), { got, expect: c.expect });
  if (ty.id === "competitor-funding" && result.status === "rendered") {
    const entry = (result.records[0].record.funding as { signal: string }[])[0];
    t(`case ${ty.id}/${c.id}: the entry names the earliest signal that reported the round`, entry.signal === signals.find((s) => s.time === "2026-11-05")?.id);
  }
}
t("every example signal type has a worked case, and each ran", cases >= types.length && types.every((x) => x.cases.length > 0));

// The competitors package's open types (signal library build item 6), each case rendered through the real render.
const pkg = files(new URL("../../../library/packages/competitors/signals/types/", import.meta.url).pathname).map((f) => json<SignalType>(f));
let pkgCases = 0;
for (const ty of pkg) for (const c of ty.cases) {
  pkgCases++;
  const { result } = renderCase(ty, pkg, c);
  const got = result.status === "rendered" ? Object.fromEntries(result.records.map((r) => [r.route, r.record])) : { raised: result.why };
  t(`competitors package case ${ty.id}/${c.id} renders to its expected records`, canonicalJson(strip(c.expect, got)) === canonicalJson(c.expect), { got, expect: c.expect });
}
t("every competitors package type has a worked case, and each ran", pkg.length === 4 && pkg.every((x) => x.cases.length > 0) && pkgCases >= pkg.length);
t("a case's signals get fixed addresses", caseSignal(type("organization"), type("organization").cases[0].given[0]).id === caseSignal(type("organization"), type("organization").cases[0].given[0]).id);

// ---- Versions and views ----

t("ranges: ^1 takes every 1.x, ^1.2 from 1.2, ~1.2 only 1.2, exact pins major and minor",
  satisfies("1.0", "^1") && satisfies("1.9.3", "^1") && !satisfies("2.0", "^1") && satisfies("1.3", "^1.2") && !satisfies("1.1", "^1.2")
  && satisfies("1.2.7", "~1.2") && !satisfies("1.3.0", "~1.2") && satisfies("1.0", "1.0.0") && !satisfies("1.0.1", "1.0.0") && satisfies("0.2.5", "^0.2") && !satisfies("0.3.0", "^0.2"));
const views = viewsOf(sig, types);
t("a composite has a whole view and one view per part, each with its part's type and props",
  views.map((v) => `${v.type}@${v.version}:${v.part ?? "-"}`).join() === "competitor-funding@1.0:-,organization@1.0:org,funding-event@1.0:round"
  && views[1].props.name === "Acme Robotics" && views[2].props.amount === 3000000 && views.every((v) => v.id === sig.id && v.subject === sig.subject));
t("a retraction has no view", viewsOf(make({ ...sig, retracts: sig.id }), types).length === 0);
t("a signal whose type is not in the catalog has only its whole view", viewsOf(make({ ...sig, type: "product-launch@1.0" }), types).length === 1);

// ---- Receive ----

const [whole, , round] = views;
const track = listener("track-competitors"), rival = listener("rival-raised"), large = listener("large-rounds-in-market");
const facts = { read: { "foundation/icp.json#currencies": ["USD", "EUR"] }, ids: { competitors: ["acme-robotics"] } };
const now = "2026-11-10T00:00:00Z";
const r1 = receive(whole, track, facts);
t("salient at track-competitors once the subject is a competitor, citing the ids it read", r1.kind === "salient" && canonicalJson(r1.facts) === '["ids:competitors"]', r1);
const r0 = receive(whole, track, { ids: { competitors: [] } });
t("noise at track-competitors before it is, naming the failed predicate", r0.kind === "noise" && r0.failed.map((f) => f.predicate).join() === "known-competitor", r0);
const r2 = receive(whole, rival, facts, now, type("competitor-funding"));
t("salient at rival-raised within its age bound, citing the fact it read", r2.kind === "salient" && canonicalJson(r2.facts) === '["foundation/icp.json#currencies"]', r2);
const r3 = receive(whole, rival, facts, "2026-12-31T00:00:00Z", type("competitor-funding"));
t("noise at rival-raised once older than its max_age", r3.kind === "noise" && r3.failed.some((f) => f.predicate === "max_age"), r3);
const r4 = receive(round, large, facts, now, type("funding-event"));
t("the round part is heard at large-rounds-in-market, and a three million round is noise there", r4.kind === "noise" && r4.failed[0].predicate === "ten-million-or-more", r4);
t("noise belongs to the pair: one signal is salient at one listener and noise at another", r1.kind === "salient" && r4.kind === "noise" && r4.view.id === r1.view.id);
const weak = { ...whole, rating: { reliability: "D" as const, credibility: 4 }, producer: "elsewhere/x" };
const r5 = receive(weak, { ...rival, criterion: { ...rival.criterion, producers: ["market-example/"] } }, { read: {} }, now, type("competitor-funding"));
t("every failure is reported, in order: rating, producers, then each predicate", r5.kind === "noise" && r5.failed.map((f) => f.predicate).join() === "rating,rating,producers,same-currency", r5);
t("a fact not given fails its predicate, it is never assumed", r5.kind === "noise" && r5.failed.at(-1)?.why.includes("was not given") === true);
let threw = false;
try { receive(whole, rival, facts, undefined, type("competitor-funding")); } catch { threw = true; }
t("an edge listener with an age bound needs now; a level listener never reads it", threw && receive(whole, track, facts).kind === "salient");
t("the type's freshness.max_age bounds an edge listener with no max_age of its own", receive(round, { ...large, criterion: {} }, facts, "2027-01-01T00:00:00Z", type("funding-event")).kind === "noise"
  && receive(round, { ...large, criterion: {} }, facts, "2026-11-20T00:00:00Z", type("funding-event")).kind === "salient");
const op = (p: object, v: View = whole) => receive(v, { id: "p", hears: "competitor-funding@^1", consumer: { route: "x" }, then: "project", criterion: { predicates: [{ id: "p", ...p } as never] } }, facts).kind;
t("predicate ops: eq, ne, lt, gte, in, not-in, contains, exists", op({ field: "subject", op: "eq", value: "acme-robotics" }) === "salient" && op({ field: "subject", op: "ne", value: "acme-robotics" }) === "noise"
  && op({ field: "props.round.amount", op: "lt", value: 5000000 }) === "salient" && op({ field: "props.round.amount", op: "gte", value: 5000000 }) === "noise"
  && op({ field: "props.round.series", op: "in", value: ["seed", "pre-seed"] }) === "salient" && op({ field: "props.round.series", op: "not-in", value: ["seed"] }) === "noise"
  && op({ field: "props.org.name", op: "contains", value: "Robot" }) === "salient" && op({ field: "props.org.ticker", op: "exists" }) === "noise"
  && op({ field: "props.round.amount", op: "gt", value: "big" }) === "noise");

// ---- Withdrawal ----

const fix = make({ ...sig, observed: "2026-11-07T10:00:00Z", supersedes: sig.id, props: { ...sig.props, round: { series: "seed", amount: 3500000, currency: "USD" } } });
const w1 = withdraw([local(sig), local(fix)]);
t("a supersession from the same producer withdraws the earlier signal", w1.withdrawn.get(sig.id) === fix.id && !w1.withdrawn.has(fix.id) && w1.refused.length === 0);
const foreign = make({ ...sig, producer: "other/research", retracts: sig.id });
const w2 = withdraw([local(sig), local(foreign)]);
t("a retraction from another producer is refused and withdraws nothing", !w2.withdrawn.has(sig.id) && w2.refused[0]?.signal === foreign.id);
const person = make({ ...sig, producer: "local/founder", retracts: sig.id });
t("a person in the local library may withdraw any signal", withdraw([local(sig), { signal: person, library: "local" }]).withdrawn.get(sig.id) === person.id);
const undo = make({ ...sig, observed: "2026-11-08T00:00:00Z", retracts: fix.id });
const w3 = withdraw([local(sig), local(fix), local(undo)]);
t("withdrawing a correction restores what it corrected", w3.withdrawn.get(fix.id) === undo.id && !w3.withdrawn.has(sig.id));

// ---- The fold ----

const v = (id: string, time: string, props: Record<string, unknown>): View => ({ ...whole, id, time, part: null, props });
const c = (view: View, reducer: Contribution["fold"]["reducer"], value: string, standing = true, unique_by?: string[]): Contribution => ({ view, standing, fold: { reducer, value, ...(unique_by ? { unique_by } : {}) } as Contribution["fold"] });
const a = v("a".repeat(24), "2026-01-02", { n: 5, tags: ["x", "y"], r: { k: "seed", n: 1 } });
const b = v("b".repeat(24), "2026-01-01", { n: 9, tags: ["y", "z"], r: { k: "seed", n: 2 } });
const d = v("d".repeat(24), "2026-01-03", { n: 1, tags: ["w"], r: { k: "series-a", n: 3 } });
const all = (r: Contribution["fold"]["reducer"], value: string, standing = [true, true, true], u?: string[]) => fold(r, [c(a, r, value, standing[0], u), c(b, r, value, standing[1], u), c(d, r, value, standing[2], u)]);
t("set takes the latest in (time, id) order, first the earliest", all("set", "props.n") === 1 && all("first", "props.n") === 9);
t("max and min", all("max", "props.n") === 9 && all("min", "props.n") === 1 && all("max", "time") === "2026-01-03");
t("union is every value once, sorted", canonicalJson(all("union", "props.tags")) === '["w","x","y","z"]');
t("withdrawn signals leave set, first, max, min and union", all("set", "props.n", [true, true, false]) === 5 && all("max", "props.n", [true, false, true]) === 5 && canonicalJson(all("union", "props.tags", [false, false, true])) === '["w"]');
const ap = all("append", "props.r", [true, true, true], ["props.r.k"]) as Record<string, unknown>[];
t("append lists one entry per key in (time, id) order, from the earliest signal with it", canonicalJson(ap) === canonicalJson([{ k: "seed", n: 2, signal: b.id, support: "supported" }, { k: "series-a", n: 3, signal: d.id, support: "supported" }]), ap);
const apw = all("append", "props.r", [true, false, false], ["props.r.k"]) as Record<string, unknown>[];
t("append keeps a key whose signals are all withdrawn, marked withdrawn, and takes a standing signal's value first", canonicalJson(apw) === canonicalJson([{ k: "seed", n: 1, signal: a.id, support: "supported" }, { k: "series-a", n: 3, signal: d.id, support: "withdrawn" }]), apw);
t("a scalar appended sits at value", canonicalJson(fold("append", [c(a, "append", "props.n", true, ["props.n"])])) === canonicalJson([{ value: 5, signal: a.id, support: "supported" }]));
t("nothing to fold gives nothing", fold("set", [c(a, "set", "props.missing")]) === undefined && fold("max", [c(a, "max", "props.n", false)]) === undefined);

// ---- Render to a fixpoint ----

const orgOnce: Listener = { id: "master-records", hears: "organization@^1", consumer: { route: "competitors/[id]" }, then: "project" };
const input = { signals: [local(sig)], types, listeners: [orgOnce, track, rival, large], facts: { read: facts.read }, now };
const out = render(input);
const routes = out.status === "rendered" ? out.records.map((r) => r.route) : [];
t("the master record is created, which makes the subject a competitor, which admits its signals: three rounds", out.status === "rendered" && out.rounds === 3
  && canonicalJson(routes) === '["competitors/acme-robotics","competitors/acme-robotics/signals"]', out.status === "rendered" ? { rounds: out.rounds, routes, problems: out.problems } : out);
const signalsRec = out.status === "rendered" ? out.records[1] : undefined;
t("a projected record cites the signals and facts it came from", signalsRec?.cites.join() === sig.id && signalsRec.facts.join() === "ids:competitors" && signalsRec.record.competitor === "acme-robotics");
t("the edge listener proposes once, with an id from the decision and the subject", out.status === "rendered" && out.proposals.length === 1 && out.proposals[0].id === "rival-raised-acme-robotics");
t("a three million round marks nothing stale at large-rounds-in-market", out.status === "rendered" && out.marks.length === 0);
const big = make({ ...sig, subject: "globex", props: { org: { name: "Globex" }, round: { series: "series-b", amount: 40000000, currency: "USD" } } });
const out2 = render({ ...input, signals: [local(sig), local(big)] });
t("a forty million round marks market/rounds stale", out2.status === "rendered" && out2.marks.map((m) => m.route).join() === "market/rounds");
t("render is deterministic whatever the order signals arrive in", canonicalJson(render({ ...input, signals: [local(big), local(sig)] })) === canonicalJson(out2));
t("receptions explain every listener: salient or noise at each, with the failed predicate", out.status === "rendered" && out.receptions.some((r) => r.listener === "large-rounds-in-market" && r.kind === "noise"));
const flip: Listener = { id: "flip", hears: "organization@^1", consumer: { route: "competitors/[id]" }, then: "project", criterion: { predicates: [{ id: "new-only", field: "subject", op: "not-in", value: { ids: "competitors" } }] } };
const raised = render({ ...input, listeners: [flip] });
t("a criterion that is not monotone never settles and is raised after five rounds", raised.status === "raised" && raised.rounds === 5, raised.status);
const corrected = render({ ...input, signals: [local(sig), local(fix)] });
const funding = corrected.status === "rendered" ? corrected.records.find((r) => r.route.endsWith("/signals"))?.record.funding as Record<string, unknown>[] : [];
t("a superseding signal corrects the round in place", canonicalJson(funding) === canonicalJson([{ series: "seed", amount: 3500000, currency: "USD", signal: fix.id, support: "supported" }]), funding);
const projectless = render({ ...input, listeners: [{ ...track, consumer: { route: "market/rounds" }, criterion: {} }] });
t("a project listener whose type has no projection to its route is a problem, not a crash", projectless.status === "rendered" && projectless.problems.some((p) => p.includes("has no projection to market/rounds")));

// ---- Diff ----

const rendered = out.status === "rendered" ? out.records : [];
const asCurrent = (rs: readonly Rendered[]) => Object.fromEntries(rs.map((r) => [r.route, r.record]));
t("against an empty venture every record is new", diff(rendered, {}).changes.every((x) => x.kind === "new"));
const again = diff(rendered, asCurrent(rendered));
t("a diff taken after its own commit writes nothing: unchanged (verified) and kept", again.changes.map((x) => x.kind).join() === "kept,unchanged");
const edited = { ...asCurrent(rendered), "competitors/acme-robotics": { id: "acme-robotics", name: "Acme", notes: "a person's words" }, "competitors/acme-robotics/signals": { competitor: "acme-robotics" } };
t("a person's master record is kept whatever it holds; a projected record that differs is changed", diff(rendered, edited).changes.map((x) => x.kind).join() === "kept,changed");
t("a proposal whose id exists is left out", out.status === "rendered" && diff(rendered, {}, out.proposals, new Set(["rival-raised-acme-robotics"])).proposals.length === 0 && diff(rendered, {}, out.proposals).proposals.length === 1);

// ---- Pure ----

const src = readFileSync(new URL("./render.ts", import.meta.url), "utf8");
const imports = [...src.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1]);
t("render.ts reads no file, no clock and no randomness", !/node:fs|node:child_process|Date\.now|new Date\(|Math\.random|process\./.test(src));
t("render.ts imports only the signal id and the record types", canonicalJson(imports) === canonicalJson(["../../core/signal-id.ts", "../../records/types/records.d.ts"]), imports);

console.log(fails ? `${fails} failed` : "signal render: all pass");
process.exitCode = fails ? 1 : 0;
