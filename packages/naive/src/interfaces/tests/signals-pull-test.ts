// The signal pull end to end (everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md, build plan item 5): two
// ventures read one shared filesystem library and keep their own local libraries. Each renders what the signals say
// through its own listeners: salient at one venture and noise at the other; a person's competitor record admits the
// signals that were noise; a local superseding signal corrects one venture and never the other; a library that
// publishes more changes both; a duplicate report renders unchanged and is verified, not rewritten. A pull after a
// pull writes nothing, not a byte. The cursor moves only after the commit, explain names every failed predicate,
// replay reports drift, and a library that is not a folder is not read until a person confirms it by name. Every
// venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/signals-pull-test.ts

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { call } from "../../router/router.mjs";
import { emit, explainSignal, pull, replay } from "../../router/orchestration/signals.ts";
import type { PullResult } from "../../router/orchestration/signals.ts";
import { CURSOR, libraries, listenersOf, routerRoute } from "../../engine/signals.ts";
import { signalId } from "../../core/signal-id.ts";
import { entries } from "../../core/provenance.mjs";
import { validateValue } from "../../records/validate.mjs";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const show = (r: unknown): string => String(JSON.stringify(r)).slice(0, 600);
const ws = mkdtempSync(join(tmpdir(), "signals-pull-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_PERSON"]) { delete env[k]; delete process.env[k]; }
process.env.MENTURA_WORKSPACE = ws;
const node = (script: string, ...a: string[]) => spawnSync(process.execPath, [join(repo, script), ...a], { encoding: "utf8", env });
const naive = (...a: string[]) => node("packages/naive/src/interfaces/cli/naive.mjs", ...a);
const read = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));

// Every file under a folder with a hash of its bytes: "writes nothing" means this does not change.
function snapshot(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => { for (const e of readdirSync(d)) { const f = join(d, e); if (statSync(f).isDirectory()) walk(f); else out[relative(dir, f)] = createHash("sha1").update(readFileSync(f)).digest("hex"); } };
  walk(dir);
  return out;
}
const sameFiles = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(a) === JSON.stringify(b);

const NOW = "2026-11-07T00:00:00Z";
const ORIGINAL = "3a50ad6dfb3a46b0f160cc36";
const TRACK = { id: "track-competitors", hears: "competitor-funding@^1", consumer: { route: "competitors/[id]/signals" },
  criterion: { rating: { reliability: "C", credibility: 3 }, predicates: [{ id: "known-competitor", field: "subject", op: "in", value: { ids: "competitors" }, why: "Only companies already made competitors" }] }, then: "project" };
const sources = { sources: [{ id: "market", connector: "filesystem", root: "../../library", writes: "none", carries: "signals", note: "The shared library, read in place" }], records: {} };

// A library publishes one signal: the file and its log line, the way a publisher does.
function publish(body: Record<string, unknown>, day: string): string {
  const id = signalId(body);
  const s = body as { subject: string; time: string; type: string };
  const path = `signals/${s.type.split("@")[0]}/${s.subject}/${s.time.slice(0, 10)}-${id}.json`;
  mkdirSync(join(ws, "library", path, ".."), { recursive: true });
  writeFileSync(join(ws, "library", path), JSON.stringify({ id, ...body }, null, 2) + "\n");
  mkdirSync(join(ws, "library/log/competitor-funding"), { recursive: true });
  appendFileSync(join(ws, "library/log/competitor-funding", `${day}.jsonl`), JSON.stringify({ id, subject: s.subject, path, published: `${day}T10:00:00Z` }) + "\n");
  return id;
}
const funding = (producer: string, series: string, amount: number, time: string) => ({ type: "competitor-funding@1.0", producer, subject: "acme-robotics", time, observed: `${time}T12:00:00Z`,
  props: { org: { name: "Acme Robotics", domain: "acme.example" }, round: { series, amount, currency: "USD" } }, rating: { reliability: "B", credibility: 2 }, cites: [{ url: "https://acme.example/news", accessed: time }] });

try {
  cpSync(join(repo, "packages/naive/src/records/examples/signals/library"), join(ws, "library"), { recursive: true });
  // The shared library publishes the competitors package's types as they are, so one type id and version means one
  // content wherever the venture reads it.
  rmSync(join(ws, "library/types"), { recursive: true });
  cpSync(join(repo, "packages/naive/library/packages/competitors/signals/types"), join(ws, "library/types"), { recursive: true });
  const venture = (id: string, listeners: unknown[], off: string[] = []) => {
    const made = node("packages/naive/src/interfaces/cli/mentura.mjs", "init", join(ws, "ventures", id), "--id", id, "--layers", "purpose");
    if (made.status !== 0) throw new Error(made.stderr);
    const dir = join(ws, "ventures", id);
    const cfg = existsSync(join(dir, "naive.config.json")) ? read(join(dir, "naive.config.json")) as Record<string, unknown> : {};
    writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ ...cfg, listeners, ...(off.length ? { listeners_off: off } : {}) }, null, 2) + "\n");
    mkdirSync(join(dir, "knowledge"), { recursive: true });
    writeFileSync(join(dir, "knowledge/sources.json"), JSON.stringify(sources, null, 2) + "\n");
    return dir;
  };
  // The competitors package's listeners apply to every venture unless it turns them off. alpha replaces
  // track-competitors and rival-raised with its own, and turns off the rest: it creates competitors from signals,
  // tracks their rounds, proposes a decision on a well-rated rival raise, and marks a competitor stale on a round of
  // ten million or more.
  const alpha = venture("alpha", [
    { id: "competitor-master", hears: "organization@^1", consumer: { route: "competitors/[id]" }, then: "project", note: "Every company a market signal names is a competitor" },
    TRACK,
    { id: "rival-raised", hears: "competitor-funding@^1", consumer: { decision: "rival-raised" }, criterion: { rating: { reliability: "B", credibility: 2 }, predicates: [{ id: "in-our-markets", field: "props.org.domain", op: "exists" }] }, then: "propose", max_age: "14d", note: "Bears on when to raise" },
    { id: "big-rounds", hears: "funding-event@^1", consumer: { route: "competitors/[id]" }, criterion: { predicates: [{ id: "ten-million-or-more", field: "props.amount", op: "gte", value: 10000000, why: "Only rounds that move the market" }] }, then: "revalidate" },
  ], ["name-competitors", "track-launches", "launch-revalidates-stance"]);
  // beta tracks only companies a person already made competitors: it turns off every other package listener.
  const beta = venture("beta", [TRACK], ["name-competitors", "rival-raised", "track-launches", "launch-revalidates-stance"]);
  const signalsFile = (dir: string) => join(dir, "competitors/acme-robotics/signals.json");
  const masterFile = (dir: string) => join(dir, "competitors/acme-robotics.json");
  const projectorLines = (dir: string, file: string) => (entries(dir) as { entity: string; agent?: { kind?: string; id?: string }; derived_from?: string[] }[]).filter((e) => e.entity === file && e.agent?.id === "projector");

  expect("the router route of a rendered record comes from the data model", routerRoute("competitors/acme-robotics/signals.json") === "purpose/competitor-signals/acme-robotics" && routerRoute("competitors/acme-robotics.json") === "purpose/competitor/acme-robotics");
  expect("naive.config.json listeners replace the package's of the same id, and listeners_off turns the rest off", listenersOf(alpha).listeners.map((l) => `${l.id}:${l.from}`).join() === "big-rounds:naive.config.json,competitor-master:naive.config.json,rival-raised:naive.config.json,track-competitors:naive.config.json", show(listenersOf(alpha)));
  expect("beta hears only its own track-competitors", listenersOf(beta).listeners.map((l) => l.id).join() === "track-competitors", show(listenersOf(beta)));

  // ---- alpha's first pull ----
  const a1 = await pull(alpha, { now: NOW });
  expect("alpha's first pull writes the master record and the projected record", a1.ok && a1.written.join() === "competitors/acme-robotics.json,competitors/acme-robotics/signals.json", show(a1));
  expect("the library's types and the package's are one content: no conflict is reported", !a1.problems.some((x) => /differs between the libraries/.test(x)), show(a1.problems));
  const rendered = read(signalsFile(alpha)) as { competitor: string; funding: { amount: number; signal: string; support: string }[]; first_seen: string; last_seen: string };
  expect("the projected record says what the signal says", rendered.competitor === "acme-robotics" && rendered.first_seen === "2026-11-05" && rendered.funding.length === 1 && rendered.funding[0].signal === ORIGINAL && rendered.funding[0].support === "supported", show(rendered));
  expect("the master record is created from the organization part", (read(masterFile(alpha)) as { name?: string }).name === "Acme Robotics");
  const line = projectorLines(alpha, "competitors/acme-robotics/signals.json").at(-1);
  expect("the write is the projector's, derived from the signal's address in the library", line?.agent?.kind === "agent" && (line?.derived_from ?? []).includes(`market://signals/competitor-funding/acme-robotics/2026-11-05-${ORIGINAL}.json`), show(line));
  expect("a well-rated rival raise proposes a decision", a1.proposed.join() === "rival-raised-acme-robotics" && existsSync(join(alpha, "decisions/rival-raised-acme-robotics.decision.json")), show(a1.proposed));
  expect("a three million round is noise at big-rounds: nothing is marked", a1.marked.length === 0 && a1.noise >= 1, show(a1));
  expect("no library signal is copied into the venture", !existsSync(join(alpha, "raw/signals")));
  expect("the cursor is written after the commit", existsSync(join(alpha, CURSOR)));

  const before = snapshot(alpha);
  const a2 = await pull(alpha, { now: NOW });
  expect("alpha's second pull writes nothing, not a byte", a2.ok && a2.status === "nothing new" && sameFiles(before, snapshot(alpha)), show(a2));

  // ---- beta: the same signal is noise until a person makes acme-robotics a competitor ----
  const b1 = await pull(beta, { now: NOW });
  expect("at beta the same signal is noise: nothing is written", b1.ok && b1.written.length === 0 && b1.noise === 1 && !existsSync(signalsFile(beta)), show(b1));
  const bSnap = snapshot(beta);
  const b2 = await pull(beta, { now: NOW });
  expect("beta's second pull writes nothing", b2.status === "nothing new" && sameFiles(bSnap, snapshot(beta)), show(b2));
  const own = await call({ venture: "beta", workspace: ws, route: "purpose/competitor/acme-robotics", action: "write", input: { id: "acme-robotics", name: "Acme Robotics", stance: "Watch" }, actor: "person" }) as { ok: boolean };
  expect("a person writes beta's competitor record", own.ok, show(own));
  const b3 = await pull(beta, { now: NOW });
  expect("the person's record admits the signal: beta's next pull renders it", b3.ok && b3.written.join() === "competitors/acme-robotics/signals.json" && (b3.touched["acme-robotics"] ?? []).some((w) => /competitors\/acme-robotics\.json was written/.test(w)), show(b3));
  expect("the person's record is never touched by the projector", (read(masterFile(beta)) as { stance?: string }).stance === "Watch" && projectorLines(beta, "competitors/acme-robotics.json").length === 0);
  const bSnap2 = snapshot(beta);
  expect("and a pull after it writes nothing", (await pull(beta, { now: NOW })).status === "nothing new" && sameFiles(bSnap2, snapshot(beta)));

  // ---- beta corrects the round with a local superseding signal; alpha never sees it ----
  const emitted = naive("signals", "emit", "competitor-funding", "--venture", beta, "--props", JSON.stringify({ org: { name: "Acme Robotics", domain: "acme.example" }, round: { series: "seed", amount: 3500000, currency: "USD" } }),
    "--supersedes", ORIGINAL, "--time", "2026-11-05", "--rating", "A1", "--by", "Dana Founder", "--now", NOW);
  expect("naive signals emit writes to beta's local library as a person", emitted.status === 0 && /emitted [0-9a-f]{24} at raw\/signals\/signals\/competitor-funding\/acme-robotics\//.test(emitted.stdout), emitted.stdout + emitted.stderr);
  const local = (entries(beta) as { entity: string; agent?: { kind?: string; id?: string } }[]).filter((e) => e.entity.startsWith("raw/signals/"));
  expect("its provenance lines are the person's", local.length === 2 && local.every((e) => e.agent?.kind === "person" && e.agent?.id === "Dana Founder"), show(local));
  const correction = /emitted ([0-9a-f]{24})/.exec(emitted.stdout)?.[1] ?? "";
  const again = await emit(beta, "competitor-funding", { props: { org: { name: "Acme Robotics", domain: "acme.example" }, round: { series: "seed", amount: 3500000, currency: "USD" } }, supersedes: ORIGINAL, time: "2026-11-05", rating: "A1", by: "Dana Founder", now: NOW }) as { ok: boolean; result?: { already?: boolean; signal?: string } };
  expect("the same signal emitted twice has the same address and is written once", again.ok && again.result?.already === true && again.result?.signal === correction, show(again));
  const bad = await emit(beta, "competitor-funding", { props: { org: { name: "Acme Robotics" } }, now: NOW });
  expect("emit refuses props that do not match the type", !bad.ok && /props do not match competitor-funding@1\.0\.0/.test((bad as { error?: string }).error ?? ""), show(bad));
  const bp = naive("signals", "pull", "--venture", beta, "--now", NOW);
  const corrected = read(signalsFile(beta)) as { funding: { amount: number; signal: string; support: string }[] };
  expect("naive signals pull renders the correction: the round is listed once, from the superseding signal", bp.status === 0 && corrected.funding.length === 1 && corrected.funding[0].amount === 3500000 && corrected.funding[0].signal === correction, bp.stdout + show(corrected));
  const aSnap = snapshot(alpha);
  expect("alpha does not read beta's local library: its pull writes nothing", (await pull(alpha, { now: NOW })).status === "nothing new" && sameFiles(aSnap, snapshot(alpha)));
  const ex = naive("signals", "explain", ORIGINAL, "--venture", beta, "--now", NOW);
  expect("explain at beta says the original is withdrawn and salient at track-competitors", ex.status === 0 && ex.stdout.includes(`withdrawn by ${correction}`) && /salient at track-competitors/.test(ex.stdout), ex.stdout + ex.stderr);

  // ---- the library publishes more ----
  const seriesA = publish(funding("market-example/research", "series-a", 12000000, "2026-11-06"), "2026-11-07");
  const a3 = await pull(alpha, { now: NOW });
  const two = read(signalsFile(alpha)) as { funding: { signal: string }[]; last_seen: string };
  expect("a new library signal changes alpha's projected record", a3.ok && a3.written.join() === "competitors/acme-robotics/signals.json" && two.funding.length === 2 && two.last_seen === "2026-11-06", show(a3) + show(two));
  expect("the master record a person now owns is kept, not rewritten", a3.kept.includes("competitors/acme-robotics.json") && projectorLines(alpha, "competitors/acme-robotics.json").length === 1, show(a3));
  expect("the proposal that exists is not proposed again", a3.proposed.length === 0, show(a3.proposed));
  expect("a twelve million round marks the competitor stale", a3.marked.join() === "competitors/acme-robotics.json", show(a3.marked));
  const b5 = await pull(beta, { now: NOW });
  expect("and changes beta's too", b5.ok && b5.written.join() === "competitors/acme-robotics/signals.json", show(b5));

  // ---- a duplicate report renders unchanged: verified, not rewritten ----
  publish(funding("other-desk/wire", "series-a", 12000000, "2026-11-06"), "2026-11-07");
  const held = readFileSync(signalsFile(alpha), "utf8");
  const a4 = await pull(alpha, { now: NOW });
  expect("a second report of the same round renders the record unchanged: it is verified, not rewritten", a4.ok && a4.written.length === 0 && a4.verified.join() === "competitors/acme-robotics/signals.json" && readFileSync(signalsFile(alpha), "utf8") === held, show(a4));
  const fresh = readFileSync(join(alpha, "knowledge/freshness.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { event: string; target: { value: string }; by: { id?: string } }).at(-1);
  expect("the verification is the projector's, in the freshness log", fresh?.event === "verify" && fresh.target.value === "competitors/acme-robotics/signals.json" && fresh.by.id === "projector", show(fresh));
  const aSnap2 = snapshot(alpha);
  expect("a pull after it writes nothing", (await pull(alpha, { now: NOW })).status === "nothing new" && sameFiles(aSnap2, snapshot(alpha)));

  // ---- explain, replay ----
  const e = await explainSignal(alpha, ORIGINAL, { now: NOW }) as { ok: boolean; result?: { lines: { listener: string; kind: string; failed?: { predicate: string }[] }[] } };
  const at = (id: string) => e.result?.lines.find((l) => l.listener === id);
  expect("explain: salient at track-competitors, rival-raised and competitor-master", at("track-competitors")?.kind === "salient" && at("rival-raised")?.kind === "salient" && at("competitor-master")?.kind === "salient", show(e));
  expect("explain: noise at big-rounds, naming the failed predicate", at("big-rounds")?.kind === "noise" && at("big-rounds")?.failed?.[0]?.predicate === "ten-million-or-more", show(at("big-rounds")));
  const late = await explainSignal(alpha, ORIGINAL, { now: "2026-12-31T00:00:00Z" }) as typeof e;
  expect("explain: an edge listener judges age against now; a level listener never does", late.result?.lines.find((l) => l.listener === "rival-raised")?.failed?.[0]?.predicate === "max_age" && late.result?.lines.find((l) => l.listener === "track-competitors")?.kind === "salient", show(late));
  const r1 = await replay(alpha, { now: NOW }) as { ok: boolean; result?: { drift: unknown[]; records: number } };
  expect("replay: no drift", r1.ok && r1.result?.drift.length === 0 && (r1.result?.records ?? 0) >= 2, show(r1));
  writeFileSync(signalsFile(alpha), held.replace('"2026-11-06"', '"2026-11-30"'));
  const r2 = await replay(alpha, { now: NOW }) as typeof r1 & { result?: { drift: { file: string; kind: string }[] } };
  expect("replay reports a record edited outside the router as drift", r2.ok && r2.result?.drift.length === 1 && r2.result?.drift[0].file === "competitors/acme-robotics/signals.json", show(r2));
  writeFileSync(signalsFile(alpha), held);

  // ---- the route ----
  const routed = await call({ venture: "alpha", workspace: ws, route: "system/signals", action: "run" }) as { ok: boolean; result?: PullResult };
  expect("the route system/signals runs a pull", routed.ok && routed.result?.status === "nothing new", show(routed));
  const routedEx = await call({ venture: "alpha", workspace: ws, route: "system/signals/explain", action: "run", input: { value: seriesA } }) as { ok: boolean; result?: { result?: { signal?: string } } };
  expect("the route system/signals/explain explains one signal", routedEx.ok && routedEx.result?.result?.signal === seriesA, show(routedEx));

  // ---- the cursor moves only after the commit ----
  const gamma = venture("gamma", [TRACK]);
  expect("a venture that turns nothing off hears the competitors package's listeners", ["name-competitors", "rival-raised", "track-launches", "launch-revalidates-stance"].every((id) => listenersOf(gamma).listeners.some((l) => l.id === id && l.from === "package competitors")), show(listenersOf(gamma)));
  await call({ venture: "gamma", workspace: ws, route: "purpose/competitor/acme-robotics", action: "write", input: { id: "acme-robotics", name: "Acme Robotics" }, actor: "person" });
  mkdirSync(signalsFile(gamma), { recursive: true }); // a folder where the record goes: the write fails
  let crashed: PullResult | string;
  try { crashed = await pull(gamma, { now: NOW }); } catch (err) { crashed = String(err); }
  expect("a pull whose write fails leaves no cursor", !existsSync(join(gamma, CURSOR)) && (typeof crashed === "string" || !crashed.ok), show(crashed));
  rmSync(signalsFile(gamma), { recursive: true });
  const g2 = await pull(gamma, { now: NOW });
  expect("the next pull redoes it", g2.ok && g2.written.join() === "competitors/acme-robotics/signals.json" && existsSync(join(gamma, CURSOR)), show(g2));

  // ---- a library that is not a folder is read only once a person confirms it by name ----
  const paid = { id: "paid", connector: "github", repo: "example/signals", carries: "signals", writes: "none" };
  writeFileSync(join(gamma, "knowledge/sources.json"), JSON.stringify({ ...sources, sources: [...sources.sources, paid] }, null, 2) + "\n");
  const libs = await libraries(gamma);
  const p = libs.find((l) => l.id === "paid");
  expect("an unconfirmed paid library is not connected, and says why", p?.store === null && /confirmed_by/.test(p?.problem ?? ""), show(p));
  const g3 = await pull(gamma, { now: NOW });
  expect("the pull names the unconfirmed library and reads the others", g3.ok && g3.problems.some((x) => /paid is not read/.test(x)), show(g3));
  const confirmed = { ...sources, sources: [...sources.sources, { ...paid, confirmed_by: { person: "Dana Founder", at: "2026-11-07T00:00:00Z" } }] };
  expect("confirmed_by is in the source map's schema", validateValue("knowledge-sources.schema.json", confirmed).status === 0 && validateValue("knowledge-sources.schema.json", { ...sources, sources: [{ ...paid, confirmed_by: { person: "" , at: NOW } }] }).status !== 0);
} catch (err) {
  expect("the test ran", false, String((err as Error)?.stack ?? err));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
